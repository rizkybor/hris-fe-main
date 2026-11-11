<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import {
  RefreshCw,
  Plus,
  Search,
  SearchX,
  Inbox,
  Edit,
  Trash2,
  Receipt,
  Building2,
  FolderKanban,
  MailCheck,
  CalendarClock,
} from "lucide-vue-next";
import { useSubscriptionStore } from "@/stores/subscription";
import { useLookupStore } from "@/stores/lookups";
import { useAlertModalStore } from "@/stores/alertModal";
import { useToastStore } from "@/stores/toast";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import { formatDateLong as formatDate, formatDate as formatDateMedium } from "@/utils/dateUtils";
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

// Configurable via Settings -> Dropdown Options (category
// "subscription_service_type"). The page needs it for the row labels and
// the type filter; the modal's other pickers load when it opens.
const SERVICE_TYPE_CATEGORY = "subscription_service_type";
lookups.ensure("options", SERVICE_TYPE_CATEGORY).catch(() => {});
const serviceTypeOptions = computed(() => lookups.optionsFor(SERVICE_TYPE_CATEGORY).filter((opt) => opt.is_active));
const serviceTypeLabel = computed(() =>
  serviceTypeOptions.value.reduce((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {})
);

// Search, status (incl. the "due" / "overdue" views), type and page live
// in the URL and are remembered; the list shows what the store has and
// refreshes quietly.
const list = useListState("subscriptions", { q: "", status: "", type: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));
const statusFilter = computed({ get: () => list.status, set: (v) => (list.status = v) });
const serviceTypeFilter = computed({ get: () => list.type, set: (v) => (list.type = v) });

// "Due in 30 days" / "Overdue" aren't API filters, but the API sorts by
// next_due_date, so the first rows of the active list are exactly the ones
// due soonest: fetch one large page of active rows and keep the due ones.
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

// "cancelled" is still the stored value (matches the backend enum and
// existing data) -- only the displayed label changed. "Expired" was
// dropped as a separate status since it behaved identically to
// "cancelled"/Not Active everywhere (both just block invoice generation),
// so keeping both only added confusion with no functional difference.
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

// H-30: highlights the whole card once a subscription is within 30 days
// of (or past) its next due date -- a wider heads-up than dueBadge's 7-day
// badge, which stays as-is for the tighter "about to renew" callout.
const isNearDue = (subscription) => subscription.status === "active" && daysUntil(subscription) <= 30;

// The backend's daily H-30 job records which due date it already emailed
// contact@ about; once that matches the current next_due_date, this cycle's
// reminder has gone out.
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
  { key: "actions", label: "", align: "right" },
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

// The API returns the new invoice, not the subscription: the row follows
// the same rule the backend applies (next due date moves one cycle on,
// one more invoice), and the recap refreshes quietly.
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
      <!-- Toolbar -->
      <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <div class="flex flex-col sm:flex-row gap-2 lg:contents">
          <UiInput v-model="search" :icon="Search" :placeholder="$t('subscriptions.list.searchPlaceholder')" class="flex-1 lg:flex-none lg:w-[300px]" :aria-label="$t('subscriptions.list.searchAria')" />
          <UiSelect v-model="serviceTypeFilter" :options="typeFilterOptions" class="sm:w-[200px] lg:order-last lg:ml-auto" :aria-label="$t('subscriptions.list.serviceType')" />
        </div>
        <UiChips v-model="statusFilter" :options="STATUS_CHIPS" class="min-w-0" />
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
          <div class="min-w-0 max-w-[420px] py-2">
            <p class="text-ui-ink font-medium truncate" :title="row.name">{{ row.name }}</p>
            <div class="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1 text-ui-cap text-ui-muted">
              <span v-for="service in row.services" :key="service.id" class="inline-flex items-center px-1.5 h-5 rounded bg-ui-subtle text-ui-text max-w-full truncate">
                {{ serviceTypeLabel[service.service_type] || service.service_type }}{{ service.product_name ? ` · ${service.product_name}` : "" }}
              </span>
              <span class="inline-flex items-center gap-1 min-w-0 max-w-full">
                <Building2 class="w-3 h-3 shrink-0 text-ui-faint" /><span class="truncate">{{ row.client?.name || "-" }}</span>
              </span>
              <span v-if="row.project" class="inline-flex items-center gap-1 min-w-0 max-w-full">
                <FolderKanban class="w-3 h-3 shrink-0 text-ui-faint" /><span class="truncate">{{ row.project.name }}</span>
              </span>
            </div>
          </div>
        </template>
        <template #cell-status="{ row }">
          <div class="flex flex-col items-start gap-1">
            <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot>{{ STATUS_LABEL[row.status] || row.status }}</UiBadge>
            <UiBadge v-if="dueBadge(row)" :tone="dueBadge(row).tone">{{ dueBadge(row).label }}</UiBadge>
          </div>
        </template>
        <template #cell-amount="{ row }">
          <p class="text-ui-ink font-medium tabular-nums whitespace-nowrap">{{ formatRupiah(row.amount) }}</p>
          <p class="text-ui-cap text-ui-muted capitalize">{{ cycleLabel(row.billing_cycle) }}</p>
        </template>
        <template #cell-next_due_date="{ row }">
          <p class="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums" :class="isNearDue(row) ? 'text-ui-warn font-medium' : 'text-ui-ink'">
            <CalendarClock v-if="isNearDue(row)" class="w-3.5 h-3.5 shrink-0" />{{ formatDate(row.next_due_date) }}
          </p>
          <p
            v-if="reminderSent(row)"
            class="text-ui-cap text-ui-ok font-medium flex items-center gap-1"
            :title="$t('subscriptions.list.reminderTitle', { date: formatDate(row.next_due_date) })"
          >
            <MailCheck class="w-3.5 h-3.5 shrink-0" /> {{ $t("subscriptions.list.reminderEmailed") }}
          </p>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1" @click.stop>
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
            <UiButton v-if="can('subscription-edit')" variant="ghost" size="sm" :icon="Edit" :title="$t('common.actions.edit')" :aria-label="$t('subscriptions.list.editSubscription')" @click="openEdit(row)" />
            <UiButton v-if="can('subscription-delete')" variant="ghost" size="sm" :icon="Trash2" class="hover:!text-ui-bad" :title="$t('common.actions.delete')" :aria-label="$t('subscriptions.list.deleteSubscription')" @click="handleDelete(row)" />
          </div>
        </template>

        <!-- Phones: stacked row cards -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5" :class="isNearDue(row) ? 'bg-ui-warn-soft/60' : ''">
            <div class="flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink line-clamp-2 break-words">{{ row.name }}</p>
                <p class="text-ui-cap text-ui-muted truncate mt-0.5">
                  {{ row.client?.name || "-" }}<template v-if="row.project"> · {{ row.project.name }}</template>
                </p>
                <div class="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot>{{ STATUS_LABEL[row.status] || row.status }}</UiBadge>
                  <UiBadge v-if="dueBadge(row)" :tone="dueBadge(row).tone">{{ dueBadge(row).label }}</UiBadge>
                  <span v-for="service in row.services" :key="service.id" class="inline-flex items-center px-1.5 h-5 rounded bg-ui-subtle text-ui-cap text-ui-text max-w-full truncate">
                    {{ serviceTypeLabel[service.service_type] || service.service_type }}{{ service.product_name ? ` · ${service.product_name}` : "" }}
                  </span>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class="text-ui-body font-medium text-ui-ink tabular-nums">{{ formatRupiah(row.amount) }}</p>
                <p class="text-ui-cap text-ui-muted capitalize">{{ cycleLabel(row.billing_cycle) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2.5 pl-8" @click.stop>
              <div class="flex-1 min-w-0">
                <p class="text-ui-cap tabular-nums" :class="isNearDue(row) ? 'text-ui-warn font-medium' : 'text-ui-muted'">{{ $t("subscriptions.list.nextDueOn", { date: formatDateMedium(row.next_due_date) }) }}</p>
                <p v-if="reminderSent(row)" class="text-ui-cap text-ui-ok font-medium flex items-center gap-1">
                  <MailCheck class="w-3.5 h-3.5 shrink-0" /> {{ $t("subscriptions.list.reminderEmailed") }}
                </p>
              </div>
              <UiButton
                v-if="can('subscription-generate-invoice') && row.status === 'active'"
                variant="secondary"
                size="sm"
                :icon="Receipt"
                :loading="generatingId === row.id"
                :aria-label="$t('subscriptions.list.generateInvoice')"
                @click="handleGenerateInvoice(row)"
              />
              <UiButton v-if="can('subscription-edit')" variant="secondary" size="sm" :icon="Edit" :aria-label="$t('subscriptions.list.editSubscription')" @click="openEdit(row)" />
              <UiButton v-if="can('subscription-delete')" variant="danger" size="sm" :icon="Trash2" :aria-label="$t('subscriptions.list.deleteSubscription')" @click="handleDelete(row)" />
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
