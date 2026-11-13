<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { Plus, Search, SearchX, Inbox, Trash2, Receipt, MailCheck } from "lucide-vue-next";
import { useSubscriptionStore } from "@/stores/subscription";
import { useLookupStore } from "@/stores/lookups";
import { useAlertModalStore } from "@/stores/alertModal";
import { useToastStore } from "@/stores/toast";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import { formatDate } from "@/utils/dateUtils";
import Alert from "@/components/common/Alert.vue";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiSelect, UiChips, UiTable, UiEmpty } from "@/components/ui";
import Pagination from "@/components/common/Pagination.vue";
import SubscriptionFormModal from "@/components/admin/subscription/SubscriptionFormModal.vue";
import SubscriptionsRecap from "@/components/admin/subscription/SubscriptionsRecap.vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t, te } = useI18n();

const store = useSubscriptionStore();
const { subscriptions, meta, loading, error, generatingId } = storeToRefs(store);
const lookups = useLookupStore();
const alertModal = useAlertModalStore();
const toast = useToastStore();

const SERVICE_TYPE_CATEGORY = "subscription_service_type";
lookups.ensure("options", SERVICE_TYPE_CATEGORY).catch(() => {});
const serviceTypeOptions = computed(() => lookups.optionsFor(SERVICE_TYPE_CATEGORY).filter((opt) => opt.is_active));
const serviceTypeLabel = computed(() =>
  serviceTypeOptions.value.reduce((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {})
);

const list = useListState("subscriptions", { q: "", status: "", type: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));
const statusFilter = computed({ get: () => list.status, set: (v) => (list.status = v) });
const serviceTypeFilter = computed({ get: () => list.type, set: (v) => (list.type = v) });

const DUE_VIEWS = ["due", "overdue"];
const dueView = computed(() => (DUE_VIEWS.includes(list.status) ? list.status : ""));
const params = computed(() =>
  dueView.value
    ? { search: list.q || undefined, status: "active", service_type: list.type || undefined, page: 1, row_per_page: 100 }
    : { search: list.q || undefined, status: list.status || undefined, service_type: list.type || undefined, page: list.page }
);
const { refreshing, refresh } = useStaleFetch(() => store.fetchSubscriptions(params.value), {
  key: () => ["subscriptions-list", params.value],
  hasData: () => subscriptions.value.length > 0,
});
const fetchData = (page = list.page) => {
  if (page !== list.page) list.page = page;
  else refresh({ force: true });
};

const daysUntil = (subscription) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(subscription.next_due_date);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
};
const rows = computed(() => {
  if (dueView.value === "overdue") return subscriptions.value.filter((s) => s.status === "active" && daysUntil(s) < 0);
  if (dueView.value === "due") return subscriptions.value.filter((s) => s.status === "active" && daysUntil(s) <= 30);
  return subscriptions.value;
});

// Counts for the due chips come from the recap above the list.
const summary = ref(null);

const STATUS_TONE = {
  active: "ok",
  postponed: "warn",
  cancelled: "neutral",
};

const STATUS_LABEL = computed(() => ({
  active: t("subscriptions.status.active"),
  postponed: t("subscriptions.status.postponed"),
  cancelled: t("subscriptions.status.cancelled"),
}));
const cycleLabel = (cycle) => (te(`subscriptions.cycle.${cycle}`) ? t(`subscriptions.cycle.${cycle}`) : cycle);

const dueBadge = (subscription) => {
  if (subscription.status !== "active") return null;
  const diffDays = daysUntil(subscription);
  if (diffDays < 0) return { label: t("subscriptions.list.overdueDays", { n: Math.abs(diffDays) }), tone: "bad" };
  if (diffDays <= 7) return { label: diffDays === 0 ? t("subscriptions.list.dueToday") : t("subscriptions.list.dueInDays", { n: diffDays }), tone: "warn" };
  return null;
};

const rowBadge = (subscription) =>
  dueBadge(subscription) || {
    label: STATUS_LABEL.value[subscription.status] || subscription.status,
    tone: STATUS_TONE[subscription.status] || "neutral",
  };

// H-30: the due date turns amber once a subscription is within 30 days of
// (or past) it -- a wider heads-up than dueBadge's 7-day callout.
const isNearDue = (subscription) => subscription.status === "active" && daysUntil(subscription) <= 30;

const serviceName = (service) => serviceTypeLabel.value[service.service_type] || service.service_type;
const rowContext = (subscription) => {
  const services = subscription.services || [];
  return {
    client: subscription.client?.name || "-",
    service: services.length ? serviceName(services[0]) : "",
    more: Math.max(0, services.length - 1),
  };
};
const rowContextTitle = (subscription) =>
  [
    subscription.client?.name,
    subscription.project?.name,
    ...(subscription.services || []).map((s) => (s.product_name ? `${serviceName(s)} · ${s.product_name}` : serviceName(s))),
  ]
    .filter(Boolean)
    .join("\n");

const reminderSent = (subscription) =>
  !!subscription.due_reminder_sent_for &&
  !!subscription.next_due_date &&
  subscription.due_reminder_sent_for === String(subscription.next_due_date).slice(0, 10);

// Bumped after any change so the recap above the list reloads.
const recapKey = ref(0);

// Presentation only: filter options and table columns.
const STATUS_CHIPS = computed(() => [
  { value: "", label: t("common.labels.all") },
  { value: "active", label: t("subscriptions.status.active") },
  { value: "postponed", label: t("subscriptions.status.postponed") },
  { value: "cancelled", label: t("subscriptions.status.cancelled") },
  // From the recap: due in 30 days includes the overdue ones.
  { value: "due", label: t("subscriptions.list.chips.dueSoon"), count: summary.value?.due_soon?.count },
  { value: "overdue", label: t("subscriptions.list.chips.overdue"), count: summary.value?.overdue?.count },
]);
const typeFilterOptions = computed(() => [{ value: "", label: t("subscriptions.list.allTypes") }, ...serviceTypeOptions.value]);
const COLUMNS = computed(() => [
  { key: "name", label: t("subscriptions.list.columns.subscription") },
  { key: "status", label: t("common.labels.status") },
  { key: "amount", label: t("common.labels.amount"), align: "right" },
  { key: "next_due_date", label: t("subscriptions.list.columns.nextDue") },
  { key: "actions", label: "", align: "right", width: 96 },
]);

// ===== Add / Edit modal =====
const showModal = ref(false);
const modalMode = ref("add");
const editingSubscription = ref({});
const modalLoading = ref(false);
const formErrors = ref({});

// The modal's pickers load the first time it opens (then come from the
// shared cache), not with the page.
const ensurePickers = () => lookups.ensureAll(["clients", "projects", "bankAccounts", "pphTypes"]).catch(() => {});

const openAdd = () => {
  ensurePickers();
  modalMode.value = "add";
  editingSubscription.value = {};
  formErrors.value = {};
  showModal.value = true;
};

const openEdit = (subscription) => {
  ensurePickers();
  modalMode.value = "edit";
  editingSubscription.value = subscription;
  formErrors.value = {};
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const handleSubmit = async ({ mode, id, payload }) => {
  modalLoading.value = true;
  formErrors.value = {};
  try {
    if (mode === "edit") {
      // The store puts the saved row in place from the response.
      await store.updateSubscription(id, payload);
    } else {
      await store.createSubscription(payload);
      // A new row can land on any page once the list re-sorts by
      // next_due_date, so start back at page 1 rather than guessing.
      fetchData(1);
    }
    store.clearMessages();
    recapKey.value++;
    showModal.value = false;
    toast.success(mode === "edit" ? t("subscriptions.list.toast.updated") : t("subscriptions.list.toast.created"), payload.name);
  } catch (err) {
    formErrors.value = err?.response?.data?.errors || {};
    store.clearMessages();
    if (!err?.response?.data?.errors) toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  } finally {
    modalLoading.value = false;
  }
};

const handleDelete = async (subscription) => {
  const ok = await alertModal.confirm(t("subscriptions.list.deleteConfirm", { name: subscription.name }), {
    type: "danger",
    confirmText: t("common.actions.delete"),
  });
  if (!ok) return;

  try {
    // Removes the row and lowers the total in the store.
    await store.deleteSubscription(subscription.id);
    store.clearMessages();
    recapKey.value++;
    toast.success(t("subscriptions.list.toast.deleted"), subscription.name);
    // The last row of a later page: step back a page.
    if (!subscriptions.value.length && list.page > 1 && !dueView.value) list.page -= 1;
  } catch (err) {
    store.clearMessages();
    toast.error(t("subscriptions.list.deleteFailed"), err?.response?.data?.message || "");
  }
};

const advanceDueDate = (value, cycle) => {
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + (cycle === "yearly" ? 12 : 1), d));
  return next.toISOString().slice(0, 10);
};

const handleGenerateInvoice = async (subscription) => {
  const periodLabel = subscription.billing_cycle === "yearly"
    ? new Date(subscription.next_due_date).getFullYear()
    : new Date(subscription.next_due_date).toLocaleDateString(localeTag(), { month: "long", year: "numeric" });

  let message = t("subscriptions.list.generateConfirm", { name: subscription.name, period: periodLabel, amount: formatRupiah(subscription.amount) });
  if (subscription.duplicate_invoice_number) {
    message += `\n\n${t("subscriptions.list.generateDuplicate", { period: periodLabel, number: subscription.duplicate_invoice_number })}`;
  }

  const ok = await alertModal.confirm(message, { confirmText: t("subscriptions.list.generateAction") });
  if (!ok) return;

  try {
    const invoice = await store.generateInvoice(subscription.id);
    store.clearMessages();
    store.patchRow(subscription.id, {
      next_due_date: advanceDueDate(subscription.next_due_date, subscription.billing_cycle),
      last_invoiced_at: new Date().toISOString(),
      invoices_count: (Number(subscription.invoices_count) || 0) + 1,
      duplicate_invoice_number: null,
    });
    recapKey.value++;
    toast.success(t("subscriptions.list.generated"), invoice?.invoice_number ? t("subscriptions.list.toast.invoiceNumber", { number: invoice.invoice_number }) : "");
  } catch (err) {
    store.clearMessages();
    toast.error(t("subscriptions.list.generateFailed"), err?.response?.data?.message || "");
  }
};

const onRowClick = (subscription) => can("subscription-edit") && openEdit(subscription);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('subscriptions.list.title')" :subtitle="$t('subscriptions.list.subtitle')">
      <template v-if="can('subscription-create')" #actions>
        <UiButton :icon="Plus" class="w-full sm:w-auto" @click="openAdd">{{ $t("subscriptions.list.add") }}</UiButton>
      </template>
    </UiPageHeader>

    <SubscriptionsRecap :service-type-options="serviceTypeOptions" :refresh-key="recapKey" @loaded="summary = $event" />

    <Alert type="danger" :title="typeof error === 'string' ? error : ''" :show="!!error && typeof error === 'string'" @close="store.clearMessages()" />

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Toolbar: search · status chips · type, one line on desktop -->
      <div class="px-4 sm:px-5 py-3 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <div class="flex flex-col sm:flex-row gap-2 lg:contents">
          <UiInput v-model="search" :icon="Search" :placeholder="$t('subscriptions.list.searchPlaceholder')" class="flex-1 lg:flex-none lg:w-[240px]" :aria-label="$t('subscriptions.list.searchAria')" />
          <UiSelect v-model="serviceTypeFilter" :options="typeFilterOptions" class="sm:w-[180px] lg:order-last lg:ml-auto shrink-0" :aria-label="$t('subscriptions.list.serviceType')" />
        </div>
        <UiChips v-model="statusFilter" :options="STATUS_CHIPS" size="sm" class="min-w-0 lg:flex-1" />
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="rows"
        :meta="dueView ? null : meta"
        :loading="loading && !subscriptions.length"
        :skeleton-rows="4"
        :clickable="can('subscription-edit')"
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        @row-click="onRowClick"
      >
        <template #cell-name="{ row }">
          <div class="min-w-0 max-w-[420px] py-2.5">
            <!-- The name is the keyboard way into "edit" (rows open it on click). -->
            <button
              v-if="can('subscription-edit')"
              type="button"
              class="block max-w-full text-left text-ui-ink font-medium truncate rounded-sm hover:underline underline-offset-2 focus:outline-none focus-visible:shadow-ui-focus"
              :title="$t('subscriptions.list.editSubscription')"
              @click.stop="openEdit(row)"
            >{{ row.name }}</button>
            <p v-else class="text-ui-ink font-medium truncate" :title="row.name">{{ row.name }}</p>
            <p class="mt-0.5 text-ui-cap text-ui-muted truncate" :title="rowContextTitle(row)">
              {{ rowContext(row).client }}<template v-if="rowContext(row).service"> · {{ rowContext(row).service }}</template>
              <span v-if="rowContext(row).more" class="text-ui-faint">&nbsp;{{ $t("subscriptions.list.moreServices", { n: rowContext(row).more }) }}</span>
            </p>
          </div>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="rowBadge(row).tone" dot>{{ rowBadge(row).label }}</UiBadge>
        </template>
        <template #cell-amount="{ row }">
          <p class="text-ui-ink font-medium tabular-nums whitespace-nowrap">{{ formatRupiah(row.amount) }}</p>
          <p class="text-ui-cap text-ui-muted">{{ cycleLabel(row.billing_cycle) }}</p>
        </template>
        <template #cell-next_due_date="{ row }">
          <span class="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums" :class="isNearDue(row) ? 'text-ui-warn font-medium' : 'text-ui-text'">
            {{ formatDate(row.next_due_date) }}
            <MailCheck
              v-if="reminderSent(row)"
              class="w-3.5 h-3.5 shrink-0 text-ui-ok"
              role="img"
              :aria-label="$t('subscriptions.list.reminderEmailed')"
              :title="$t('subscriptions.list.reminderTitle', { date: formatDate(row.next_due_date) })"
            />
          </span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <UiButton
              v-if="can('subscription-generate-invoice') && row.status === 'active'"
              variant="secondary"
              size="sm"
              :icon="Receipt"
              :loading="generatingId === row.id"
              :title="$t('subscriptions.list.generateInvoice')"
              :aria-label="$t('subscriptions.list.generateInvoice')"
              @click="handleGenerateInvoice(row)"
            />
            <UiButton
              v-if="can('subscription-delete')"
              variant="ghost"
              size="sm"
              :icon="Trash2"
              class="!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft"
              :title="$t('common.actions.delete')"
              :aria-label="$t('subscriptions.list.deleteSubscription')"
              @click="handleDelete(row)"
            />
          </div>
        </template>

        <!-- Phones: the same simplified row as a card -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5">
            <div class="flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink line-clamp-2 break-words">{{ row.name }}</p>
                <p class="text-ui-cap text-ui-muted truncate mt-0.5">
                  {{ rowContext(row).client }}<template v-if="rowContext(row).service"> · {{ rowContext(row).service }}</template>
                  <span v-if="rowContext(row).more" class="text-ui-faint">&nbsp;{{ $t("subscriptions.list.moreServices", { n: rowContext(row).more }) }}</span>
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-ui-body font-medium text-ui-ink tabular-nums">{{ formatRupiah(row.amount) }}</p>
                <p class="text-ui-cap text-ui-muted">{{ cycleLabel(row.billing_cycle) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 pl-8">
              <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <UiBadge :tone="rowBadge(row).tone" dot>{{ rowBadge(row).label }}</UiBadge>
                <span class="inline-flex items-center gap-1 text-ui-cap tabular-nums" :class="isNearDue(row) ? 'text-ui-warn font-medium' : 'text-ui-muted'">
                  {{ $t("subscriptions.list.nextDueOn", { date: formatDate(row.next_due_date) }) }}
                  <MailCheck
                    v-if="reminderSent(row)"
                    class="w-3.5 h-3.5 shrink-0 text-ui-ok"
                    role="img"
                    :aria-label="$t('subscriptions.list.reminderEmailed')"
                    :title="$t('subscriptions.list.reminderTitle', { date: formatDate(row.next_due_date) })"
                  />
                </span>
              </div>
              <div class="flex items-center gap-1 shrink-0" @click.stop>
              <UiButton
                v-if="can('subscription-generate-invoice') && row.status === 'active'"
                variant="secondary"
                size="sm"
                :icon="Receipt"
                :loading="generatingId === row.id"
                :aria-label="$t('subscriptions.list.generateInvoice')"
                @click="handleGenerateInvoice(row)"
              />
              <UiButton
                v-if="can('subscription-delete')"
                variant="ghost"
                size="sm"
                :icon="Trash2"
                class="!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft"
                :aria-label="$t('subscriptions.list.deleteSubscription')"
                @click="handleDelete(row)"
              />
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty
            v-if="list.isDirty"
            :icon="SearchX"
            :title="$t('subscriptions.list.emptyFilteredTitle')"
            :message="dueView ? $t('subscriptions.list.emptyDueHint') : $t('subscriptions.list.emptyFilteredHint')"
            compact
          >
            <UiButton variant="secondary" @click="(search = ''), list.reset()">{{ $t("subscriptions.list.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty
            v-else
            :icon="Inbox"
            :title="$t('subscriptions.list.emptyTitle')"
            :message="$t('subscriptions.list.emptyHint')"
            compact
          >
            <UiButton v-if="can('subscription-create')" variant="secondary" :icon="Plus" @click="openAdd">{{ $t("subscriptions.list.addFirst") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <p v-if="dueView && rows.length" class="px-4 sm:px-5 py-3 border-t border-ui-line text-ui-cap text-ui-muted">
        {{ $t("subscriptions.list.dueCount", { n: rows.length }, rows.length) }}
      </p>
      <div v-else-if="!dueView && meta.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('subscriptions.list.itemLabel')" @page-change="fetchData" />
      </div>
    </section>

    <SubscriptionFormModal
      :show="showModal"
      :loading="modalLoading"
      :mode="modalMode"
      :data="editingSubscription"
      :clients="lookups.clients"
      :projects="lookups.projects"
      :bank-accounts="lookups.bankAccounts"
      :pph-types="lookups.pphTypes"
      :service-type-options="serviceTypeOptions"
      :errors="formErrors"
      @submit="handleSubmit"
      @close="closeModal"
    />
  </div>
</template>
