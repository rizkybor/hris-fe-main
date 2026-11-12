<script>
// Which search/page each list in the store was loaded for (store state
// outlives the page; this tells a revisit whether it still matches).
const shownKey = {};
</script>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { debounce } from "lodash-es";
import Alert from "@/components/common/Alert.vue";
import { can } from "@/helpers/permissionHelper";
import Statistics from "@/components/admin/company-finance/list/Statistic.vue";
import FixedCostsModal from "@/components/admin/company-finance/modals/FixedCostsModal.vue";
import SdmResourcesModal from "@/components/admin/company-finance/modals/SdmResourcesModal.vue";
import InfraToolsModal from "@/components/admin/company-finance/modals/InfraToolsModal.vue";
import DeleteConfirmationModal from "@/components/common/ConfirmationModal.vue";
import { Eye, Edit, Trash2, Wallet, Users, Server, Search, Plus } from "lucide-vue-next";
import { UiPageHeader, UiInput, UiButton, UiBadge, UiTable } from "@/components/ui";
import { useCompanyFinanceStore } from "@/stores/companyFinance";
import { useSdmFieldStore } from "@/stores/sdmField";
import { useListState } from "@/composables/useListState";
import { useStaleFetch, invalidate } from "@/composables/useStaleFetch";
import { useVisitedTabs } from "@/composables/useVisitedTabs";
import Pagination from "@/components/common/Pagination.vue";
import { operationalCostStatusLabel, expiryState } from "@/utils/operationalCostStatus";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const store = useCompanyFinanceStore();

const tabs = computed(() => [
  { key: "fixed", label: t("finance.categories.fixedCost"), icon: Wallet },
  { key: "sdm", label: t("finance.categories.sdmResource"), icon: Users },
  { key: "infra", label: t("finance.categories.infraTools"), icon: Server },
]);
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
const sdmFieldStore = useSdmFieldStore();

// ----- Presentation only -----
const statusTone = (status) => (status === "active" ? "ok" : "neutral");
// expiryState() returns a legacy colour class; map it onto tokens.
const expiryTextClass = (state) => (state?.class?.includes("red") ? "text-ui-bad" : "text-ui-warn");
const inactiveTitle = (item) => (item.status !== "active" ? t("finance.table.inactiveHint") : "");
const fixedColumns = computed(() => [
  { key: "financial_items", label: t("finance.table.item") },
  { key: "actual", label: t("finance.table.actual"), align: "right" },
  { key: "expired_date", label: t("finance.table.expired") },
  { key: "status", label: t("common.labels.status") },
  { key: "notes", label: t("common.labels.notes") },
  { key: "actions", label: t("common.labels.actions"), align: "right" },
]);
const sdmColumns = computed(() => [
  { key: "field", label: t("finance.table.field") },
  { key: "productive_hours_per_month", label: t("finance.table.hoursPerMonth"), align: "right" },
  { key: "actual", label: t("finance.table.actual"), align: "right" },
  { key: "expired_date", label: t("finance.table.expired") },
  { key: "status", label: t("common.labels.status") },
  { key: "notes", label: t("common.labels.notes") },
  { key: "actions", label: t("common.labels.actions"), align: "right" },
]);
const infraColumns = computed(() => [
  { key: "tech_stack_component", label: t("finance.table.techStack") },
  { key: "vendor", label: t("finance.table.vendor") },
  { key: "monthly_fee", label: t("finance.table.monthly"), align: "right" },
  { key: "annual_fee", label: t("finance.table.annual"), align: "right" },
  { key: "expired_date", label: t("finance.table.expired") },
  { key: "status", label: t("common.labels.status") },
  { key: "actions", label: t("common.labels.actions"), align: "right" },
]);

const showSectionAlert = (section, type, title, message) => {
  section.value = {
    show: true,
    type,
    title,
    message,
  };

  setTimeout(() => {
    section.value.show = false;
  }, 3000);
};

/* =======================
   LISTS (one stale-while-revalidate fetch per tab, own loading flags)
======================= */
const perPage = 5;
const LISTS = {
  fixed: { data: () => store.fixedCostData, fetch: (p) => store.fetchFixedCostPaginated(p), q: "fixedQ", page: "fixedPage" },
  sdm: { data: () => store.sdmResourceData, fetch: (p) => store.fetchSdmResourcePaginated(p), q: "sdmQ", page: "sdmPage" },
  infra: { data: () => store.infraToolsData, fetch: (p) => store.fetchInfraToolsPaginated(p), q: "infraQ", page: "infraPage" },
};
const listParams = (tab) => ({ page: list[LISTS[tab].page], per_page: perPage, search: list[LISTS[tab].q] });
const listKey = (tab) => JSON.stringify(listParams(tab));
const fetchTab = async (tab) => {
  if (!visited.has(tab)) return;
  const key = listKey(tab);
  await LISTS[tab].fetch(listParams(tab));
  if (key === listKey(tab)) shownKey[tab] = key;
};
const useTabList = (tab) =>
  useStaleFetch(() => fetchTab(tab), {
    // Idle until the tab is first opened; then refetches on search/page.
    key: () => (visited.has(tab) ? ["op-costs", tab, listParams(tab)] : `op-costs:${tab}:idle`),
    hasData: () => visited.has(tab) && (LISTS[tab].data().items?.length ?? 0) > 0,
  });
const { loading: fixedLoading, refreshing: fixedRefreshing, refresh: refreshFixed } = useTabList("fixed");
const { loading: sdmLoading, refreshing: sdmRefreshing, refresh: refreshSdm } = useTabList("sdm");
const { loading: infraLoading, refreshing: infraRefreshing, refresh: refreshInfra } = useTabList("infra");
const REFRESH = { fixed: refreshFixed, sdm: refreshSdm, infra: refreshInfra };
const BUSY = { fixed: () => fixedLoading.value || fixedRefreshing.value, sdm: () => sdmLoading.value || sdmRefreshing.value, infra: () => infraLoading.value || infraRefreshing.value };
// The store may hold another search/page for this tab (fresh by age):
// keep it on screen dimmed and load the right one.
onMounted(() => {
  const tab = list.tab;
  if (!BUSY[tab]() && LISTS[tab].data().items?.length && shownKey[tab] !== listKey(tab)) REFRESH[tab]({ force: true });
});

const goToPage = (tab, page) => (list[LISTS[tab].page] = page);

// After a mutation: other pages of this tab are stale; the current page is
// refreshed quietly (create) or only when the row couldn't be patched.
const afterSave = (tab, { mode, patched }) => {
  invalidate(`"op-costs","${tab}"`);
  if (mode === "add" || !patched) REFRESH[tab]({ force: true });
};
const afterDelete = (tab) => {
  invalidate(`"op-costs","${tab}"`);
  const data = LISTS[tab].data();
  const page = list[LISTS[tab].page];
  if (!data.items.length && page > 1) goToPage(tab, page - 1);
  else if ((data.meta?.total ?? 0) > page * perPage - 1 && data.items.length < perPage) REFRESH[tab]({ force: true });
};
const hasRow = (tab, id) => LISTS[tab].data().items.some((item) => item.id === id);

/* ================= FIX COST ACTION METHODS ================= */

const addFixedCost = () => {
  fixedCostMode.value = "add";
  selectedFixedCost.value = null;
  showAddFixedCost.value = true;
};

const submitFixedCost = async ({ mode, id, payload }) => {
  let patched = false;
  try {
    loading.value = true;

    if (mode === "add") {
      await store.createFixedCost(payload);
      showSectionAlert(
        fixedAlert,
        "success",
        t("finance.alerts.createdTitle", { kind: t("finance.categories.fixedCost") }),
        t("finance.alerts.createdMessage", { kind: t("finance.categories.fixedCost") })
      );
    }

    if (mode === "edit") {
      const row = await store.updateFixedCost(id, payload);
      patched = !!row && hasRow("fixed", id);
      showSectionAlert(
        fixedAlert,
        "success",
        t("finance.alerts.updatedTitle", { kind: t("finance.categories.fixedCost") }),
        t("finance.alerts.updatedMessage", { kind: t("finance.categories.fixedCost") })
      );
    }

    afterSave("fixed", { mode, patched });
    showAddFixedCost.value = false;
  } catch (error) {
    showSectionAlert(
      fixedAlert,
      "danger",
      t("finance.alerts.failed"),
      t("finance.alerts.saveFailed", { kind: t("finance.categories.fixedCost") })
    );
  } finally {
    loading.value = false;
  }
};

const viewFixedCost = (item) => {
  fixedCostMode.value = "view";
  selectedFixedCost.value = item;
  showAddFixedCost.value = true;
};

const editFixedCost = (item) => {
  fixedCostMode.value = "edit";
  selectedFixedCost.value = item;
  showAddFixedCost.value = true;
};

const deleteFixedCostHandler = (item) => {
  openDeleteModal({
    title: t("finance.delete.title", { kind: t("finance.categories.fixedCost") }),
    message: t("finance.delete.message", { name: item.financial_items }),
    type: "danger",
    onConfirm: async () => {
      try {
        await store.deleteFixedCost(item.id);
        afterDelete("fixed");

        showSectionAlert(
          fixedAlert,
          "success",
          t("finance.alerts.deleted"),
          t("finance.alerts.deletedMessage", { kind: t("finance.categories.fixedCost"), name: item.financial_items })
        );
      } catch (error) {
        showSectionAlert(
          fixedAlert,
          "danger",
          t("finance.alerts.failed"),
          t("finance.alerts.deleteFailed", { name: item.financial_items })
        );
        console.error(error);
      }
    },
  });
};

/* ================= SDM ACTION METHODS ================= */

const addSdm = () => {
  sdmResourceMode.value = "add";
  selectedSdmResource.value = null;
  showAddSdmResource.value = true;
};

const submitSdm = async ({ mode, id, payload }) => {
  let patched = false;
  try {
    loading.value = true;
    if (mode === "add") {
      await store.createSdmResource(payload);
      showSectionAlert(
        sdmAlert,
        "success",
        t("finance.alerts.createdTitle", { kind: t("finance.categories.sdmResource") }),
        t("finance.alerts.createdMessage", { kind: t("finance.categories.sdmResource") })
      );
    }

    if (mode === "edit") {
      const row = await store.updateSdmResource(id, payload);
      patched = !!row && hasRow("sdm", id);
      // The API may return the old field relation; name it from the picked field.
      const field = sdmFieldStore.fields.find((f) => f.id === payload.sdm_field_id);
      if (patched && field) store.patchRow("sdmResourceData", { id, sdm_field_name: field.name });
      showSectionAlert(
        sdmAlert,
        "success",
        t("finance.alerts.updatedTitle", { kind: t("finance.categories.sdmResource") }),
        t("finance.alerts.updatedMessage", { kind: t("finance.categories.sdmResource") })
      );
    }

    afterSave("sdm", { mode, patched });
    showAddSdmResource.value = false;
  } catch (error) {
    showSectionAlert(
      sdmAlert,
      "danger",
      t("finance.alerts.failed"),
      t("finance.alerts.saveFailed", { kind: t("finance.categories.sdmResource") })
    );
  } finally {
    loading.value = false;
  }
};

const viewSdm = (item) => {
  sdmResourceMode.value = "view";
  selectedSdmResource.value = item;
  showAddSdmResource.value = true;
};

const editSdm = (item) => {
  sdmResourceMode.value = "edit";
  selectedSdmResource.value = item;
  showAddSdmResource.value = true;
};

const deleteSdmHandler = (item) => {
  openDeleteModal({
    title: t("finance.delete.title", { kind: t("finance.categories.sdmResource") }),
    message: t("finance.delete.message", { name: item.sdm_component }),
    type: "danger",
    onConfirm: async () => {
      try {
        await store.deleteSdmResource(item.id);
        afterDelete("sdm");

        showSectionAlert(
          sdmAlert,
          "success",
          t("finance.alerts.deleted"),
          t("finance.alerts.deletedMessage", { kind: t("finance.categories.sdmResource"), name: item.sdm_component })
        );
      } catch (error) {
        showSectionAlert(
          sdmAlert,
          "danger",
          t("finance.alerts.failed"),
          t("finance.alerts.deleteFailed", { name: item.sdm_component })
        );
        console.error(error);
      }
    },
  });
};

/* ================= INFRA ACTION METHODS ================= */

const addInfra = () => {
  infraMode.value = "add";
  selectedInfra.value = null;
  showAddInfra.value = true;
};

const submitInfra = async ({ mode, id, payload }) => {
  let patched = false;
  try {
    loading.value = true;

    if (mode === "add") {
      await store.createInfraTools(payload);
      showSectionAlert(
        infraAlert,
        "success",
        t("finance.alerts.createdTitle", { kind: t("finance.categories.infraTool") }),
        t("finance.alerts.createdMessage", { kind: t("finance.categories.infraTool") })
      );
    }

    if (mode === "edit") {
      const row = await store.updateInfraTools(id, payload);
      patched = !!row && hasRow("infra", id);
      showSectionAlert(
        infraAlert,
        "success",
        t("finance.alerts.updatedTitle", { kind: t("finance.categories.infraTool") }),
        t("finance.alerts.updatedMessage", { kind: t("finance.categories.infraTool") })
      );
    }

    afterSave("infra", { mode, patched });
    showAddInfra.value = false;
  } catch (error) {
    showSectionAlert(
      infraAlert,
      "danger",
      t("finance.alerts.failed"),
      t("finance.alerts.saveFailed", { kind: t("finance.categories.infraTool") })
    );
  } finally {
    loading.value = false;
  }
};

const viewInfra = (item) => {
  infraMode.value = "view";
  selectedInfra.value = item;
  showAddInfra.value = true;
};

const editInfra = (item) => {
  infraMode.value = "edit";
  selectedInfra.value = item;
  showAddInfra.value = true;
};

const deleteInfraHandler = (item) => {
  openDeleteModal({
    title: t("finance.delete.title", { kind: t("finance.categories.infraTool") }),
    message: t("finance.delete.message", { name: item.tech_stack_component }),
    type: "danger",
    onConfirm: async () => {
      try {
        await store.deleteInfraTools(item.id);
        afterDelete("infra");

        showSectionAlert(
          infraAlert,
          "success",
          t("finance.alerts.deleted"),
          t("finance.alerts.deletedMessage", { kind: t("finance.categories.infraTool"), name: item.tech_stack_component })
        );
      } catch (error) {
        showSectionAlert(
          infraAlert,
          "danger",
          t("finance.alerts.failed"),
          t("finance.alerts.deleteFailed", { name: item.tech_stack_component })
        );
        console.error(error);
      }
    },
  });
};

/* =======================
   STATE
======================= */
const loading = ref(false);
const showAddFixedCost = ref(false);
const fixedCostMode = ref("add");
const selectedFixedCost = ref(null);
const showAddSdmResource = ref(false);
const sdmResourceMode = ref("add");
const selectedSdmResource = ref(null);
const showAddInfra = ref(false);
const infraMode = ref("add");
const selectedInfra = ref(null);
const fixedAlert = ref({
  show: false,
  type: "success",
  title: "",
  message: "",
});

const sdmAlert = ref({
  show: false,
  type: "success",
  title: "",
  message: "",
});

const infraAlert = ref({
  show: false,
  type: "success",
  title: "",
  message: "",
});
const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const deletePayload = ref({
  title: "",
  message: "",
  type: "danger",
  onConfirm: null,
});

/* =======================
   SEARCH (debounced into the list state; resets that tab's page)
======================= */
const fixedSearch = ref(list.fixedQ);
const sdmSearch = ref(list.sdmQ);
const infraSearch = ref(list.infraQ);
const bindSearch = (input, tab) =>
  watch(
    input,
    debounce((value) => {
      if (value === list[LISTS[tab].q]) return;
      list[LISTS[tab].q] = value;
      list[LISTS[tab].page] = 1;
    }, 300)
  );
bindSearch(fixedSearch, "fixed");
bindSearch(sdmSearch, "sdm");
bindSearch(infraSearch, "infra");

/* =======================
   HELPERS
======================= */

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" });
};

const openDeleteModal = ({ title, message, type = "danger", onConfirm }) => {
  deletePayload.value = { title, message, type, onConfirm };
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!deletePayload.value.onConfirm) return;

  try {
    deleteLoading.value = true;
    await deletePayload.value.onConfirm();
  } finally {
    deleteLoading.value = false;
    showDeleteModal.value = false;
  }
};

/* =======================
   COMPUTED
======================= */
const fixedCostPaginated = computed(() => store.fixedCostData.items || []);
const sdmResourcePaginated = computed(() => store.sdmResourceData.items || []);
const infraPaginated = computed(() => store.infraToolsData.items || []);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('finance.page.title')" :subtitle="$t('finance.page.subtitle')" />

    <Statistics v-if="can('company-finance-statistic')" v-model:year="list.year" />

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Tabs: underline on desktop, scrolling chips on phones -->
      <div class="px-4 sm:px-5 pt-4 sm:pt-3 sm:border-b sm:border-ui-line">
        <div class="tabs-scroll overflow-x-auto -mx-1 px-1">
          <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.key"
              @click="activeTab = tab.key"
              :class="[
                'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:shadow-ui-focus',
                'h-8 px-3 rounded-full border text-ui-small',
                'sm:h-auto sm:px-0.5 sm:pt-2 sm:pb-3 sm:rounded-none sm:border-0 sm:border-b-2 sm:-mb-px sm:text-ui-body',
                activeTab === tab.key
                  ? 'bg-ui-ink text-white border-ui-ink sm:bg-transparent sm:text-ui-ink sm:border-ui-ink'
                  : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover sm:bg-transparent sm:text-ui-muted sm:border-transparent sm:hover:bg-transparent sm:hover:text-ui-ink',
              ]"
            >
              <component :is="tab.icon" class="w-4 h-4 hidden sm:block" />
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- ================= FIXED COST ================= -->
      <div v-if="activeTab === 'fixed'" class="ui-anim-fade-up">
        <div class="px-4 sm:px-5 py-3 space-y-3 border-b border-ui-line">
          <Alert
            v-if="fixedAlert.show"
            :type="fixedAlert.type"
            :title="fixedAlert.title"
            :message="fixedAlert.message"
            :show="fixedAlert.show"
          />
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <UiInput v-model="fixedSearch" :icon="Search" :placeholder="$t('finance.search.fixedCost')" class="w-full sm:w-[280px]" />
            <UiButton v-if="can('fixed-cost-create')" :icon="Plus" class="w-full sm:w-auto" @click="addFixedCost">{{ $t("finance.categories.fixedCost") }}</UiButton>
          </div>
        </div>

        <UiTable
          :columns="fixedColumns"
          :rows="fixedCostPaginated"
          :meta="{ current_page: list.fixedPage, per_page: perPage }"
          :loading="fixedLoading"
          :class="fixedRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
          :skeleton-rows="4"
          :empty-text="$t('finance.table.empty', { kind: $t('finance.categories.fixedCost') })"
        >
          <template #cell-financial_items="{ row }">
            <span class="font-medium" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'" :title="inactiveTitle(row)">{{ row.financial_items }}</span>
          </template>
          <template #cell-actual="{ row }">
            <span class="tabular-nums whitespace-nowrap" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.actual.toLocaleString() }}</span>
          </template>
          <template #cell-expired_date="{ row }">
            <div class="whitespace-nowrap">
              <p class="tabular-nums">{{ formatDate(row.expired_date) }}</p>
              <p v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</p>
            </div>
          </template>
          <template #cell-status="{ row }">
            <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
          </template>
          <template #cell-notes="{ row }">
            <span class="text-ui-muted">{{ row.notes }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-0.5">
              <button type="button" @click="viewFixedCost(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" :title="$t('common.actions.view')" :aria-label="$t('common.actions.view')"><Eye class="w-4 h-4" /></button>
              <button v-if="can('fixed-cost-edit')" type="button" @click="editFixedCost(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" :title="$t('common.actions.edit')" :aria-label="$t('common.actions.edit')"><Edit class="w-4 h-4" /></button>
              <button v-if="can('fixed-cost-delete')" type="button" @click="deleteFixedCostHandler(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad" :title="$t('common.actions.delete')" :aria-label="$t('common.actions.delete')"><Trash2 class="w-4 h-4" /></button>
            </div>
          </template>

          <template #mobile="{ row, number }">
            <div class="flex items-start gap-3 px-4 py-3.5" :title="inactiveTitle(row)">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-ui-body font-medium truncate" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'">{{ row.financial_items }}</p>
                  <p class="text-ui-body font-medium tabular-nums text-right shrink-0" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.actual.toLocaleString() }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
                  <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("finance.table.expShort", { date: formatDate(row.expired_date) }) }}</span>
                  <span v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</span>
                </div>
                <p v-if="row.notes" class="text-ui-cap text-ui-muted mt-1 line-clamp-2">{{ row.notes }}</p>
                <div class="flex items-center gap-1 mt-2 -ml-2">
                  <UiButton variant="ghost" size="sm" :icon="Eye" @click="viewFixedCost(row)">{{ $t("common.actions.view") }}</UiButton>
                  <UiButton v-if="can('fixed-cost-edit')" variant="ghost" size="sm" :icon="Edit" @click="editFixedCost(row)">{{ $t("common.actions.edit") }}</UiButton>
                  <UiButton v-if="can('fixed-cost-delete')" variant="ghost" size="sm" :icon="Trash2" class="!text-ui-bad" @click="deleteFixedCostHandler(row)">{{ $t("common.actions.delete") }}</UiButton>
                </div>
              </div>
            </div>
          </template>
        </UiTable>

        <div v-if="store.fixedCostData.meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
          <Pagination :meta="store.fixedCostData.meta" :loading="fixedLoading" :item-label="$t('finance.itemLabel')" @page-change="(page) => goToPage('fixed', page)" />
        </div>
      </div>

      <!-- ================= SDM ================= -->
      <div v-if="activeTab === 'sdm'" class="ui-anim-fade-up">
        <div class="px-4 sm:px-5 py-3 space-y-3 border-b border-ui-line">
          <Alert
            v-if="sdmAlert.show"
            :type="sdmAlert.type"
            :title="sdmAlert.title"
            :message="sdmAlert.message"
            :show="sdmAlert.show"
          />
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <UiInput v-model="sdmSearch" :icon="Search" :placeholder="$t('finance.search.sdmResource')" class="w-full sm:w-[280px]" />
            <UiButton v-if="can('sdm-resource-create')" :icon="Plus" class="w-full sm:w-auto" @click="addSdm">{{ $t("finance.categories.sdmResource") }}</UiButton>
          </div>
        </div>

        <UiTable
          :columns="sdmColumns"
          :rows="sdmResourcePaginated"
          :meta="{ current_page: list.sdmPage, per_page: perPage }"
          :loading="sdmLoading"
          :class="sdmRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
          :skeleton-rows="4"
          :empty-text="$t('finance.table.empty', { kind: $t('finance.categories.sdmResource') })"
        >
          <template #cell-field="{ row }">
            <span class="font-medium" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'" :title="inactiveTitle(row)">{{ row.sdm_field_name ?? row.sdm_component }}</span>
          </template>
          <template #cell-productive_hours_per_month="{ row }">
            <span class="tabular-nums">{{ row.productive_hours_per_month ?? "-" }}</span>
          </template>
          <template #cell-actual="{ row }">
            <span class="tabular-nums whitespace-nowrap" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.actual.toLocaleString() }}</span>
          </template>
          <template #cell-expired_date="{ row }">
            <div class="whitespace-nowrap">
              <p class="tabular-nums">{{ formatDate(row.expired_date) }}</p>
              <p v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</p>
            </div>
          </template>
          <template #cell-status="{ row }">
            <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
          </template>
          <template #cell-notes="{ row }">
            <span class="text-ui-muted">{{ row.notes }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-0.5">
              <button type="button" @click="viewSdm(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" :title="$t('common.actions.view')" :aria-label="$t('common.actions.view')"><Eye class="w-4 h-4" /></button>
              <button v-if="can('sdm-resource-edit')" type="button" @click="editSdm(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" :title="$t('common.actions.edit')" :aria-label="$t('common.actions.edit')"><Edit class="w-4 h-4" /></button>
              <button v-if="can('sdm-resource-delete')" type="button" @click="deleteSdmHandler(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad" :title="$t('common.actions.delete')" :aria-label="$t('common.actions.delete')"><Trash2 class="w-4 h-4" /></button>
            </div>
          </template>

          <template #mobile="{ row, number }">
            <div class="flex items-start gap-3 px-4 py-3.5" :title="inactiveTitle(row)">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-ui-body font-medium truncate" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'">{{ row.sdm_field_name ?? row.sdm_component }}</p>
                  <p class="text-ui-body font-medium tabular-nums text-right shrink-0" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.actual.toLocaleString() }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
                  <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("finance.table.hoursPerMonthValue", { n: row.productive_hours_per_month ?? "-" }) }}</span>
                  <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("finance.table.expShort", { date: formatDate(row.expired_date) }) }}</span>
                  <span v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</span>
                </div>
                <p v-if="row.notes" class="text-ui-cap text-ui-muted mt-1 line-clamp-2">{{ row.notes }}</p>
                <div class="flex items-center gap-1 mt-2 -ml-2">
                  <UiButton variant="ghost" size="sm" :icon="Eye" @click="viewSdm(row)">{{ $t("common.actions.view") }}</UiButton>
                  <UiButton v-if="can('sdm-resource-edit')" variant="ghost" size="sm" :icon="Edit" @click="editSdm(row)">{{ $t("common.actions.edit") }}</UiButton>
                  <UiButton v-if="can('sdm-resource-delete')" variant="ghost" size="sm" :icon="Trash2" class="!text-ui-bad" @click="deleteSdmHandler(row)">{{ $t("common.actions.delete") }}</UiButton>
                </div>
              </div>
            </div>
          </template>
        </UiTable>

        <div v-if="store.sdmResourceData.meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
          <Pagination :meta="store.sdmResourceData.meta" :loading="sdmLoading" :item-label="$t('finance.itemLabel')" @page-change="(page) => goToPage('sdm', page)" />
        </div>
      </div>

      <!-- ================= INFRA ================= -->
      <div v-if="activeTab === 'infra'" class="ui-anim-fade-up">
        <div class="px-4 sm:px-5 py-3 space-y-3 border-b border-ui-line">
          <Alert
            v-if="infraAlert.show"
            :type="infraAlert.type"
            :title="infraAlert.title"
            :message="infraAlert.message"
            :show="infraAlert.show"
          />
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <UiInput v-model="infraSearch" :icon="Search" :placeholder="$t('finance.search.infra')" class="w-full sm:w-[280px]" />
            <UiButton v-if="can('infrastructure-tool-create')" :icon="Plus" class="w-full sm:w-auto" @click="addInfra">{{ $t("finance.categories.infraTool") }}</UiButton>
          </div>
        </div>

        <UiTable
          :columns="infraColumns"
          :rows="infraPaginated"
          :meta="{ current_page: list.infraPage, per_page: perPage }"
          :loading="infraLoading"
          :class="infraRefreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
          :skeleton-rows="4"
          :empty-text="$t('finance.table.empty', { kind: $t('finance.categories.infraTools') })"
        >
          <template #cell-tech_stack_component="{ row }">
            <span class="font-medium" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'" :title="inactiveTitle(row)">{{ row.tech_stack_component }}</span>
          </template>
          <template #cell-monthly_fee="{ row }">
            <span class="tabular-nums whitespace-nowrap" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.monthly_fee.toLocaleString() }}</span>
          </template>
          <template #cell-annual_fee="{ row }">
            <span class="tabular-nums whitespace-nowrap" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.annual_fee.toLocaleString() }}</span>
          </template>
          <template #cell-expired_date="{ row }">
            <div class="whitespace-nowrap">
              <p class="tabular-nums">{{ formatDate(row.expired_date) }}</p>
              <p v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</p>
            </div>
          </template>
          <template #cell-status="{ row }">
            <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
          </template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-0.5">
              <button type="button" @click="viewInfra(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" :title="$t('common.actions.view')" :aria-label="$t('common.actions.view')"><Eye class="w-4 h-4" /></button>
              <button v-if="can('infrastructure-tool-edit')" type="button" @click="editInfra(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" :title="$t('common.actions.edit')" :aria-label="$t('common.actions.edit')"><Edit class="w-4 h-4" /></button>
              <button v-if="can('infrastructure-tool-delete')" type="button" @click="deleteInfraHandler(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad" :title="$t('common.actions.delete')" :aria-label="$t('common.actions.delete')"><Trash2 class="w-4 h-4" /></button>
            </div>
          </template>

          <template #mobile="{ row, number }">
            <div class="flex items-start gap-3 px-4 py-3.5" :title="inactiveTitle(row)">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-ui-body font-medium truncate" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'">{{ row.tech_stack_component }}</p>
                    <p class="text-ui-cap text-ui-muted truncate">{{ row.vendor }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-ui-body font-medium tabular-nums" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.monthly_fee.toLocaleString() }}</p>
                    <p class="text-ui-cap text-ui-muted tabular-nums">{{ $t("finance.table.annualValue", { amount: `Rp ${row.annual_fee.toLocaleString()}` }) }}</p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
                  <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("finance.table.expShort", { date: formatDate(row.expired_date) }) }}</span>
                  <span v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</span>
                </div>
                <div class="flex items-center gap-1 mt-2 -ml-2">
                  <UiButton variant="ghost" size="sm" :icon="Eye" @click="viewInfra(row)">{{ $t("common.actions.view") }}</UiButton>
                  <UiButton v-if="can('infrastructure-tool-edit')" variant="ghost" size="sm" :icon="Edit" @click="editInfra(row)">{{ $t("common.actions.edit") }}</UiButton>
                  <UiButton v-if="can('infrastructure-tool-delete')" variant="ghost" size="sm" :icon="Trash2" class="!text-ui-bad" @click="deleteInfraHandler(row)">{{ $t("common.actions.delete") }}</UiButton>
                </div>
              </div>
            </div>
          </template>
        </UiTable>

        <div v-if="store.infraToolsData.meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
          <Pagination :meta="store.infraToolsData.meta" :loading="infraLoading" :item-label="$t('finance.itemLabel')" @page-change="(page) => goToPage('infra', page)" />
        </div>
      </div>
    </section>

    <FixedCostsModal
      :show="showAddFixedCost"
      :loading="loading"
      :mode="fixedCostMode"
      :data="selectedFixedCost"
      @close="showAddFixedCost = false"
      @submit="submitFixedCost"
    />

    <SdmResourcesModal
      :show="showAddSdmResource"
      :loading="loading"
      :mode="sdmResourceMode"
      :data="selectedSdmResource"
      @close="showAddSdmResource = false"
      @submit="submitSdm"
    />

    <InfraToolsModal
      :show="showAddInfra"
      :loading="loading"
      :mode="infraMode"
      :data="selectedInfra"
      @close="showAddInfra = false"
      @submit="submitInfra"
    />

    <DeleteConfirmationModal
      :show="showDeleteModal"
      :title="deletePayload.title"
      :message="deletePayload.message"
      :loading="deleteLoading"
      :type="deletePayload.type"
      :confirmText="$t('common.actions.delete')"
      :cancelText="$t('common.actions.cancel')"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    >
    </DeleteConfirmationModal>
  </div>
</template>

<style scoped>
/* 3 finance tabs no longer risk overflowing the card on narrow screens --
   they scroll horizontally in one row instead, scrollbar hidden. */
.tabs-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tabs-scroll::-webkit-scrollbar {
  display: none;
}
</style>
