<script>
// Which search/page each list in the store was loaded for (store state
// outlives the page; this tells a revisit whether it still matches).
const shownKey = {};
</script>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { debounce } from "lodash-es";
import { can } from "@/helpers/permissionHelper";
import OperationalCostRecap from "@/components/admin/company-finance/OperationalCostRecap.vue";
import FixedCostsModal from "@/components/admin/company-finance/modals/FixedCostsModal.vue";
import SdmResourcesModal from "@/components/admin/company-finance/modals/SdmResourcesModal.vue";
import InfraToolsModal from "@/components/admin/company-finance/modals/InfraToolsModal.vue";
import DeleteConfirmationModal from "@/components/common/ConfirmationModal.vue";
import { Trash2, Wallet, Users, Server, Search, SearchX, Inbox, Plus } from "lucide-vue-next";
import { UiPageHeader, UiInput, UiButton, UiBadge, UiTable, UiEmpty } from "@/components/ui";
import { useCompanyFinanceStore } from "@/stores/companyFinance";
import { useSdmFieldStore } from "@/stores/sdmField";
import { useToastStore } from "@/stores/toast";
import { useListState } from "@/composables/useListState";
import { useStaleFetch, invalidate } from "@/composables/useStaleFetch";
import { useVisitedTabs } from "@/composables/useVisitedTabs";
import Pagination from "@/components/common/Pagination.vue";
import { operationalCostStatusLabel, expiryState } from "@/utils/operationalCostStatus";
import { formatRupiah } from "@/utils/formatUtils";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const store = useCompanyFinanceStore();
const sdmFieldStore = useSdmFieldStore();
const toast = useToastStore();

const TAB_KEYS = ["fixed", "sdm", "infra"];
// Tab, each tab's search and page, and the chart year survive leaving the
// page and a reload (URL query + remembered per browser).
const list = useListState("operational-costs", {
  tab: "fixed",
  fixedQ: "",
  sdmQ: "",
  infraQ: "",
  fixedPage: 1,
  sdmPage: 1,
  infraPage: 1,
  year: new Date().getFullYear(),
});
if (!TAB_KEYS.includes(list.tab)) list.tab = "fixed";
const activeTab = computed({
  get: () => list.tab,
  set: (tab) => (list.tab = tab),
});
// Only the tabs that have been opened load their list.
const visited = useVisitedTabs(() => list.tab);

/* =======================
   TABS -- the three lists share one table layout ("one idea per cell"):
   item + one muted line · status · amount · expiry · delete. A row click
   opens Edit (or the read-only view without edit rights).
======================= */
const hoursLabel = (row) => t("finance.table.hoursPerMonthValue", { n: row.productive_hours_per_month ?? "-" });
const TABS = {
  fixed: {
    icon: Wallet,
    kind: () => t("finance.categories.fixedCost"),
    search: () => t("finance.search.fixedCost"),
    add: () => t("finance.list.add.fixed"),
    perm: "fixed-cost",
    name: (row) => row.financial_items,
    sub: (row) => row.notes || row.description || "",
    amount: (row) => row.actual,
    amountSub: () => "",
    amountLabel: () => t("finance.table.actual"),
  },
  sdm: {
    icon: Users,
    kind: () => t("finance.categories.sdmResource"),
    search: () => t("finance.search.sdmResource"),
    add: () => t("finance.list.add.sdm"),
    perm: "sdm-resource",
    name: (row) => row.sdm_field_name ?? row.sdm_component,
    sub: (row) => [hoursLabel(row), row.notes].filter(Boolean).join(" · "),
    amount: (row) => row.actual,
    amountSub: () => "",
    amountLabel: () => t("finance.table.actual"),
  },
  infra: {
    icon: Server,
    kind: () => t("finance.categories.infraTool"),
    search: () => t("finance.search.infra"),
    add: () => t("finance.list.add.infra"),
    perm: "infrastructure-tool",
    name: (row) => row.tech_stack_component,
    sub: (row) => [row.vendor, row.notes].filter(Boolean).join(" · "),
    amount: (row) => row.monthly_fee,
    amountSub: (row) => t("finance.list.perYear", { amount: formatRupiah(row.annual_fee) }),
    amountLabel: () => t("finance.table.monthly"),
  },
};
const tabs = computed(() => [
  { key: "fixed", label: t("finance.categories.fixedCost"), icon: Wallet },
  { key: "sdm", label: t("finance.categories.sdmResource"), icon: Users },
  { key: "infra", label: t("finance.categories.infraTools"), icon: Server },
]);
const tab = computed(() => TABS[activeTab.value]);
const canDo = (action, key = activeTab.value) => can(`${TABS[key].perm}-${action}`);

const columns = computed(() => [
  { key: "name", label: t("finance.table.item") },
  { key: "status", label: t("common.labels.status") },
  { key: "amount", label: tab.value.amountLabel(), align: "right" },
  { key: "expired_date", label: t("finance.table.expired") },
  { key: "actions", label: "", align: "right" },
]);

// ----- Presentation only -----
const statusTone = (status) => (status === "active" ? "ok" : "neutral");
const inactive = (row) => row.status !== "active";
const inactiveTitle = (row) => (inactive(row) ? t("finance.table.inactiveHint") : "");
const expiryClass = (row) => expiryState(row)?.class ?? "text-ui-text";
const formatDate = (date) => {
  if (!date) return "-";
  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" });
};

/* =======================
   LISTS (one stale-while-revalidate fetch per tab, own loading flags)
======================= */
const perPage = 5;
const LISTS = {
  fixed: { data: () => store.fixedCostData, store: "fixedCostData", fetch: (p) => store.fetchFixedCostPaginated(p), q: "fixedQ", page: "fixedPage" },
  sdm: { data: () => store.sdmResourceData, store: "sdmResourceData", fetch: (p) => store.fetchSdmResourcePaginated(p), q: "sdmQ", page: "sdmPage" },
  infra: { data: () => store.infraToolsData, store: "infraToolsData", fetch: (p) => store.fetchInfraToolsPaginated(p), q: "infraQ", page: "infraPage" },
};
const listParams = (key) => ({ page: list[LISTS[key].page], per_page: perPage, search: list[LISTS[key].q] });
const listKey = (key) => JSON.stringify(listParams(key));
const fetchTab = async (key) => {
  if (!visited.has(key)) return;
  const k = listKey(key);
  await LISTS[key].fetch(listParams(key));
  if (k === listKey(key)) shownKey[key] = k;
};
const useTabList = (key) =>
  useStaleFetch(() => fetchTab(key), {
    // Idle until the tab is first opened; then refetches on search/page.
    key: () => (visited.has(key) ? ["op-costs", key, listParams(key)] : `op-costs:${key}:idle`),
    hasData: () => visited.has(key) && (LISTS[key].data().items?.length ?? 0) > 0,
  });
const STATE = { fixed: useTabList("fixed"), sdm: useTabList("sdm"), infra: useTabList("infra") };
const REFRESH = (key, opts) => STATE[key].refresh(opts);
const BUSY = (key) => STATE[key].loading.value || STATE[key].refreshing.value;
// The store may hold another search/page for this tab (fresh by age):
// keep it on screen dimmed and load the right one.
onMounted(() => {
  const key = list.tab;
  if (!BUSY(key) && LISTS[key].data().items?.length && shownKey[key] !== listKey(key)) REFRESH(key, { force: true });
});

const tabData = computed(() => LISTS[activeTab.value].data());
const rows = computed(() => tabData.value.items || []);
const tabLoading = computed(() => STATE[activeTab.value].loading.value);
const tabRefreshing = computed(() => STATE[activeTab.value].refreshing.value);
const tabPage = computed(() => list[LISTS[activeTab.value].page]);
const goToPage = (key, page) => (list[LISTS[key].page] = page);

// After a mutation: other pages of this tab are stale; the current page is
// refreshed quietly (create) or only when the row couldn't be patched.
const afterSave = (key, { mode, patched }) => {
  invalidate(`"op-costs","${key}"`);
  if (mode === "add" || !patched) REFRESH(key, { force: true });
};
const afterDelete = (key) => {
  invalidate(`"op-costs","${key}"`);
  const data = LISTS[key].data();
  const page = list[LISTS[key].page];
  if (!data.items.length && page > 1) goToPage(key, page - 1);
  else if ((data.meta?.total ?? 0) > page * perPage - 1 && data.items.length < perPage) REFRESH(key, { force: true });
};
const hasRow = (key, id) => LISTS[key].data().items.some((item) => item.id === id);

/* =======================
   SEARCH (one box for the active tab, debounced into that tab's list
   state; resets that tab's page)
======================= */
const searches = { fixed: ref(list.fixedQ), sdm: ref(list.sdmQ), infra: ref(list.infraQ) };
TAB_KEYS.forEach((key) =>
  watch(
    searches[key],
    debounce((value) => {
      const v = value.trim();
      if (v === list[LISTS[key].q]) return;
      list[LISTS[key].q] = v;
      list[LISTS[key].page] = 1;
    }, 300)
  )
);
const search = computed({
  get: () => searches[activeTab.value].value,
  set: (v) => (searches[activeTab.value].value = v),
});
const searching = computed(() => !!list[LISTS[activeTab.value].q]);

/* =======================
   ADD / VIEW / EDIT (one modal per category)
======================= */
const modal = ref({ tab: null, mode: "add", row: null });
const saving = ref(false);
const openModal = (key, mode, row = null) => (modal.value = { tab: key, mode, row });
const closeModal = () => (modal.value = { ...modal.value, tab: null });
const openRow = (row) => openModal(activeTab.value, canDo("edit") ? "edit" : "view", row);

const MUTATIONS = {
  fixed: { create: (p) => store.createFixedCost(p), update: (id, p) => store.updateFixedCost(id, p), remove: (id) => store.deleteFixedCost(id) },
  sdm: { create: (p) => store.createSdmResource(p), update: (id, p) => store.updateSdmResource(id, p), remove: (id) => store.deleteSdmResource(id) },
  infra: { create: (p) => store.createInfraTools(p), update: (id, p) => store.updateInfraTools(id, p), remove: (id) => store.deleteInfraTools(id) },
};

const submit = (key) => async ({ mode, id, payload }) => {
  const kind = TABS[key].kind();
  let patched = false;
  saving.value = true;
  try {
    if (mode === "add") {
      await MUTATIONS[key].create(payload);
      toast.success(t("finance.alerts.createdTitle", { kind }), t("finance.alerts.createdMessage", { kind }));
    } else {
      const row = await MUTATIONS[key].update(id, payload);
      patched = !!row && hasRow(key, id);
      if (key === "sdm") {
        // The API may return the old field relation; name it from the picked field.
        const field = sdmFieldStore.fields.find((f) => f.id === payload.sdm_field_id);
        if (patched && field) store.patchRow("sdmResourceData", { id, sdm_field_name: field.name });
      }
      toast.success(t("finance.alerts.updatedTitle", { kind }), t("finance.alerts.updatedMessage", { kind }));
    }
    afterSave(key, { mode, patched });
    closeModal();
  } catch {
    toast.error(t("finance.alerts.failed"), t("finance.alerts.saveFailed", { kind }));
  } finally {
    saving.value = false;
  }
};
const submitFixed = submit("fixed");
const submitSdm = submit("sdm");
const submitInfra = submit("infra");

/* =======================
   DELETE
======================= */
const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const deleteTarget = ref(null);
const askDelete = (row) => {
  deleteTarget.value = { key: activeTab.value, row };
  showDeleteModal.value = true;
};
const deleteTitle = computed(() => (deleteTarget.value ? t("finance.delete.title", { kind: TABS[deleteTarget.value.key].kind() }) : ""));
const deleteMessage = computed(() => (deleteTarget.value ? t("finance.delete.message", { name: TABS[deleteTarget.value.key].name(deleteTarget.value.row) }) : ""));
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  const { key, row } = deleteTarget.value;
  const name = TABS[key].name(row);
  deleteLoading.value = true;
  try {
    await MUTATIONS[key].remove(row.id);
    afterDelete(key);
    toast.success(t("finance.alerts.deleted"), t("finance.alerts.deletedMessage", { kind: TABS[key].kind(), name }));
  } catch (error) {
    toast.error(t("finance.alerts.failed"), t("finance.alerts.deleteFailed", { name }));
    console.error(error);
  } finally {
    deleteLoading.value = false;
    showDeleteModal.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('finance.page.title')" :subtitle="$t('finance.page.subtitle')">
      <template v-if="canDo('create')" #actions>
        <UiButton :icon="Plus" class="w-full sm:w-auto" @click="openModal(activeTab, 'add')">{{ tab.add() }}</UiButton>
      </template>
    </UiPageHeader>

    <OperationalCostRecap v-if="can('company-finance-statistic')" v-model:year="list.year" />

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Toolbar: tabs · search -- one line on desktop; tabs are chips on phones -->
      <div class="lg:flex lg:items-stretch lg:justify-between lg:gap-4 lg:px-5 lg:border-b lg:border-ui-line">
        <div class="px-4 sm:px-5 lg:px-0 pt-4 sm:pt-3 sm:border-b sm:border-ui-line lg:border-b-0">
          <div class="tabs-scroll overflow-x-auto -mx-1 px-1">
            <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
              <button
                v-for="item in tabs"
                :key="item.key"
                type="button"
                role="tab"
                :aria-selected="activeTab === item.key"
                @click="activeTab = item.key"
                :class="[
                  'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:shadow-ui-focus',
                  'h-8 px-3 rounded-full border text-ui-small',
                  'sm:h-auto sm:px-0.5 sm:pt-2 sm:pb-3 sm:rounded-none sm:border-0 sm:border-b-2 sm:-mb-px sm:text-ui-body',
                  activeTab === item.key
                    ? 'bg-ui-ink text-white border-ui-ink sm:bg-transparent sm:text-ui-ink sm:border-ui-ink'
                    : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover sm:bg-transparent sm:text-ui-muted sm:border-transparent sm:hover:bg-transparent sm:hover:text-ui-ink',
                ]"
              >
                <component :is="item.icon" class="w-4 h-4 hidden sm:block" />
                {{ item.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="px-4 sm:px-5 lg:px-0 py-3 lg:py-2 border-b border-ui-line lg:border-b-0 lg:self-center">
          <UiInput v-model="search" :icon="Search" :placeholder="tab.search()" :aria-label="tab.search()" class="w-full sm:w-[280px] lg:w-[260px]" />
        </div>
      </div>

      <UiTable
        :key="activeTab"
        :columns="columns"
        :rows="rows"
        :meta="{ current_page: tabPage, per_page: perPage }"
        :loading="tabLoading"
        :skeleton-rows="4"
        clickable
        :class="tabRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        @row-click="openRow"
      >
        <template #cell-name="{ row }">
          <div class="min-w-0 max-w-[460px] py-2" :title="inactiveTitle(row)">
            <!-- The name is the keyboard way into the row (rows open it on click). -->
            <button
              type="button"
              class="block max-w-full text-left font-medium truncate rounded-sm hover:underline underline-offset-2 focus:outline-none focus-visible:shadow-ui-focus"
              :class="inactive(row) ? 'text-ui-muted' : 'text-ui-ink'"
              :title="canDo('edit') ? $t('common.actions.edit') : $t('common.actions.view')"
              @click.stop="openRow(row)"
            >{{ tab.name(row) }}</button>
            <p v-if="tab.sub(row)" class="mt-0.5 text-ui-cap text-ui-muted truncate" :title="tab.sub(row)">{{ tab.sub(row) }}</p>
          </div>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
        </template>
        <template #cell-amount="{ row }">
          <p class="font-medium tabular-nums whitespace-nowrap" :class="inactive(row) ? 'text-ui-faint' : 'text-ui-ink'">{{ formatRupiah(tab.amount(row)) }}</p>
          <p v-if="tab.amountSub(row)" class="text-ui-cap text-ui-muted tabular-nums whitespace-nowrap">{{ tab.amountSub(row) }}</p>
        </template>
        <template #cell-expired_date="{ row }">
          <div class="whitespace-nowrap">
            <p class="tabular-nums" :class="[expiryClass(row), expiryState(row) ? 'font-medium' : '']">{{ formatDate(row.expired_date) }}</p>
            <p v-if="expiryState(row)" class="text-ui-cap" :class="expiryClass(row)">{{ expiryState(row).label }}</p>
          </div>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end" @click.stop>
            <UiButton
              v-if="canDo('delete')"
              variant="ghost"
              size="sm"
              :icon="Trash2"
              class="!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft"
              :title="$t('common.actions.delete')"
              :aria-label="`${$t('common.actions.delete')} ${tab.name(row)}`"
              @click="askDelete(row)"
            />
          </div>
        </template>

        <!-- Phones: the same simplified row as a card -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5" :title="inactiveTitle(row)">
            <div class="flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium line-clamp-2 break-words" :class="inactive(row) ? 'text-ui-muted' : 'text-ui-ink'">{{ tab.name(row) }}</p>
                <p v-if="tab.sub(row)" class="text-ui-cap text-ui-muted truncate mt-0.5">{{ tab.sub(row) }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-ui-body font-medium tabular-nums" :class="inactive(row) ? 'text-ui-faint' : 'text-ui-ink'">{{ formatRupiah(tab.amount(row)) }}</p>
                <p v-if="tab.amountSub(row)" class="text-ui-cap text-ui-muted tabular-nums">{{ tab.amountSub(row) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 pl-8">
              <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
                <span v-if="row.expired_date" class="text-ui-cap tabular-nums" :class="expiryState(row) ? [expiryClass(row), 'font-medium'] : 'text-ui-muted'">
                  {{ $t("finance.table.expShort", { date: formatDate(row.expired_date) }) }}<template v-if="expiryState(row)"> · {{ expiryState(row).label }}</template>
                </span>
              </div>
              <div class="shrink-0" @click.stop>
                <UiButton
                  v-if="canDo('delete')"
                  variant="ghost"
                  size="sm"
                  :icon="Trash2"
                  class="!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft"
                  :aria-label="`${$t('common.actions.delete')} ${tab.name(row)}`"
                  @click="askDelete(row)"
                />
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty
            v-if="searching"
            :icon="SearchX"
            :title="$t('finance.list.emptyFilteredTitle')"
            :message="$t('finance.list.emptyFilteredHint')"
            compact
          >
            <UiButton variant="secondary" @click="search = ''">{{ $t("finance.list.clearSearch") }}</UiButton>
          </UiEmpty>
          <UiEmpty
            v-else
            :icon="Inbox"
            :title="$t('finance.table.empty', { kind: tab.kind() })"
            :message="$t('finance.list.emptyHint')"
            compact
          >
            <UiButton v-if="canDo('create')" variant="secondary" :icon="Plus" @click="openModal(activeTab, 'add')">{{ tab.add() }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div v-if="tabData.meta?.total && rows.length" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="tabData.meta" :loading="tabLoading" :item-label="$t('finance.itemLabel')" @page-change="(page) => goToPage(activeTab, page)" />
      </div>
    </section>

    <FixedCostsModal
      :show="modal.tab === 'fixed'"
      :loading="saving"
      :mode="modal.mode"
      :data="modal.row"
      @close="closeModal"
      @submit="submitFixed"
    />

    <SdmResourcesModal
      :show="modal.tab === 'sdm'"
      :loading="saving"
      :mode="modal.mode"
      :data="modal.row"
      @close="closeModal"
      @submit="submitSdm"
    />

    <InfraToolsModal
      :show="modal.tab === 'infra'"
      :loading="saving"
      :mode="modal.mode"
      :data="modal.row"
      @close="closeModal"
      @submit="submitInfra"
    />

    <DeleteConfirmationModal
      :show="showDeleteModal"
      :title="deleteTitle"
      :message="deleteMessage"
      :loading="deleteLoading"
      type="danger"
      :confirmText="$t('common.actions.delete')"
      :cancelText="$t('common.actions.cancel')"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<style scoped>
/* The finance tabs scroll horizontally in one row on narrow screens,
   scrollbar hidden. */
.tabs-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tabs-scroll::-webkit-scrollbar {
  display: none;
}
</style>
