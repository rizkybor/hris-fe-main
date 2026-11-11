<script setup>
import { computed, onMounted, ref, watch } from "vue";
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
import { useClientStore } from "@/stores/client";
import { useProjectStore } from "@/stores/project";
import { useBankAccountStore } from "@/stores/bankAccount";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { useConfigurableOptionStore } from "@/stores/configurableOption";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import { formatDateLong as formatDate, formatDate as formatDateMedium } from "@/utils/dateUtils";
import Alert from "@/components/common/Alert.vue";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiSelect, UiChips, UiTable, UiEmpty } from "@/components/ui";
import Pagination from "@/components/common/Pagination.vue";
import SubscriptionFormModal from "@/components/admin/subscription/SubscriptionFormModal.vue";
import SubscriptionsRecap from "@/components/admin/subscription/SubscriptionsRecap.vue";

const store = useSubscriptionStore();
const { subscriptions, meta, loading, error, success, generatingId } = storeToRefs(store);
const clientStore = useClientStore();
const { clients } = storeToRefs(clientStore);
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);
const bankAccountStore = useBankAccountStore();
const { bankAccounts } = storeToRefs(bankAccountStore);
const calculatorStore = useProjectCalculatorStore();
const { pphTypes } = storeToRefs(calculatorStore);
const configurableOptionStore = useConfigurableOptionStore();
const alertModal = useAlertModalStore();

// Configurable via Settings -> Dropdown Options (category
// "subscription_service_type") instead of a fixed list -- copied out of
// the shared configurableOption store's single `options` slot right after
// fetching so it isn't clobbered if that store is used for another
// category elsewhere.
const serviceTypeOptions = ref([]);
const serviceTypeLabel = computed(() =>
  serviceTypeOptions.value.reduce((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {})
);

const search = ref("");
const statusFilter = ref("");
const serviceTypeFilter = ref("");

const fetchData = (page = meta.value.current_page || 1) =>
  store.fetchSubscriptions({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    service_type: serviceTypeFilter.value || undefined,
    page,
  });

onMounted(async () => {
  fetchData(1);
  if (clients.value.length === 0) await clientStore.fetchAllClient();
  if (projects.value.length === 0) await projectStore.fetchProjectsPaginated({ row_per_page: 100 });
  if (bankAccounts.value.length === 0) await bankAccountStore.fetchBankAccounts();
  if (pphTypes.value.length === 0) await calculatorStore.fetchPphTypes();
  await configurableOptionStore.fetchByCategory("subscription_service_type");
  serviceTypeOptions.value = configurableOptionStore.options.filter((opt) => opt.is_active);
});

// A filter change always starts back at page 1 -- otherwise a narrower
// result set can leave the view on a page number that no longer exists.
watch([search, statusFilter, serviceTypeFilter], debounce(() => fetchData(1), 300));

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
const STATUS_LABEL = {
  active: "Active",
  postponed: "Postponed",
  cancelled: "Not Active",
};

const dueBadge = (subscription) => {
  if (subscription.status !== "active") return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(subscription.next_due_date);
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `Overdue ${Math.abs(diffDays)}d`, tone: "bad" };
  if (diffDays <= 7) return { label: diffDays === 0 ? "Due today" : `Due in ${diffDays}d`, tone: "warn" };
  return null;
};

// H-30: highlights the whole card once a subscription is within 30 days
// of (or past) its next due date -- a wider heads-up than dueBadge's 7-day
// badge, which stays as-is for the tighter "about to renew" callout.
const isNearDue = (subscription) => {
  if (subscription.status !== "active") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(subscription.next_due_date);
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
  return diffDays <= 30;
};

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
const STATUS_CHIPS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Not Active" },
];
const typeFilterOptions = computed(() => [{ value: "", label: "All Types" }, ...serviceTypeOptions.value]);
const COLUMNS = [
  { key: "name", label: "Subscription" },
  { key: "status", label: "Status" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "next_due_date", label: "Next due" },
  { key: "actions", label: "", align: "right" },
];

// ===== Add / Edit modal =====
const showModal = ref(false);
const modalMode = ref("add");
const editingSubscription = ref({});
const modalLoading = ref(false);
const formErrors = ref({});

const openAdd = () => {
  modalMode.value = "add";
  editingSubscription.value = {};
  formErrors.value = {};
  showModal.value = true;
};

const openEdit = (subscription) => {
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
      await store.updateSubscription(id, payload);
    } else {
      await store.createSubscription(payload);
      // A new row can land on any page once the list re-sorts by
      // next_due_date, so start back at page 1 rather than guessing.
      await fetchData(1);
    }
    recapKey.value++;
    showModal.value = false;
  } catch (err) {
    formErrors.value = err?.response?.data?.errors || {};
  } finally {
    modalLoading.value = false;
  }
};

const handleDelete = async (subscription) => {
  const ok = await alertModal.confirm(`Delete subscription "${subscription.name}"? This action cannot be undone.`, {
    type: "danger",
    confirmText: "Delete",
  });
  if (!ok) return;

  try {
    await store.deleteSubscription(subscription.id);
    recapKey.value++;
  } catch (err) {
    await alertModal.alert("Failed to delete subscription.", { type: "danger" });
  }
};

const handleGenerateInvoice = async (subscription) => {
  const periodLabel = subscription.billing_cycle === "yearly"
    ? new Date(subscription.next_due_date).getFullYear()
    : new Date(subscription.next_due_date).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  let message = `Generate invoice for "${subscription.name}" — ${periodLabel}, ${formatRupiah(subscription.amount)}?`;
  if (subscription.duplicate_invoice_number) {
    message += `\n\nNote: An invoice for this exact period (${periodLabel}) already exists (No. ${subscription.duplicate_invoice_number}). Please review it before generating another.`;
  }

  const ok = await alertModal.confirm(message, { confirmText: "Generate" });
  if (!ok) return;

  try {
    await store.generateInvoice(subscription.id);
    // next_due_date/last_invoiced_at/invoices_count all changed on the
    // backend -- reload this page to reflect them on the row.
    await fetchData();
    recapKey.value++;
    await alertModal.alert("Invoice generated successfully.", { type: "success" });
  } catch (err) {
    await alertModal.alert(err?.response?.data?.message || "Failed to generate invoice.", { type: "danger" });
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Subscriptions" subtitle="Recurring billing -- maintenance, domain renewal, SaaS subscriptions">
      <template v-if="can('subscription-create')" #actions>
        <UiButton :icon="Plus" class="w-full sm:w-auto" @click="openAdd">Add Subscription</UiButton>
      </template>
    </UiPageHeader>

    <SubscriptionsRecap :service-type-options="serviceTypeOptions" :refresh-key="recapKey" />

    <Alert type="success" :title="success" :show="!!success" @close="store.clearMessages()" />
    <Alert type="danger" :title="typeof error === 'string' ? error : ''" :show="!!error && typeof error === 'string'" @close="store.clearMessages()" />

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Toolbar -->
      <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <div class="flex flex-col sm:flex-row gap-2 lg:contents">
          <UiInput v-model="search" :icon="Search" placeholder="Search by name..." class="flex-1 lg:flex-none lg:w-[300px]" aria-label="Search subscriptions" />
          <UiSelect v-model="serviceTypeFilter" :options="typeFilterOptions" class="sm:w-[200px] lg:order-last lg:ml-auto" aria-label="Service type" />
        </div>
        <UiChips v-model="statusFilter" :options="STATUS_CHIPS" class="min-w-0" />
      </div>

      <UiTable :columns="COLUMNS" :rows="subscriptions" :meta="meta" :loading="loading" :skeleton-rows="4">
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
          <p class="text-ui-cap text-ui-muted capitalize">{{ row.billing_cycle }}</p>
        </template>
        <template #cell-next_due_date="{ row }">
          <p class="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums" :class="isNearDue(row) ? 'text-ui-warn font-medium' : 'text-ui-ink'">
            <CalendarClock v-if="isNearDue(row)" class="w-3.5 h-3.5 shrink-0" />{{ formatDate(row.next_due_date) }}
          </p>
          <p
            v-if="reminderSent(row)"
            class="text-ui-cap text-ui-ok font-medium flex items-center gap-1"
            :title="`Reminder email sent for the ${formatDate(row.next_due_date)} due date`"
          >
            <MailCheck class="w-3.5 h-3.5 shrink-0" /> Reminder emailed
          </p>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UiButton
              v-if="can('subscription-generate-invoice') && row.status === 'active'"
              variant="secondary"
              size="sm"
              :icon="Receipt"
              :loading="generatingId === row.id"
              title="Generate Invoice"
              aria-label="Generate invoice"
              @click="handleGenerateInvoice(row)"
            />
            <UiButton v-if="can('subscription-edit')" variant="ghost" size="sm" :icon="Edit" title="Edit" aria-label="Edit subscription" @click="openEdit(row)" />
            <UiButton v-if="can('subscription-delete')" variant="ghost" size="sm" :icon="Trash2" class="hover:!text-ui-bad" title="Delete" aria-label="Delete subscription" @click="handleDelete(row)" />
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
                <p class="text-ui-cap text-ui-muted capitalize">{{ row.billing_cycle }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2.5 pl-8">
              <div class="flex-1 min-w-0">
                <p class="text-ui-cap tabular-nums" :class="isNearDue(row) ? 'text-ui-warn font-medium' : 'text-ui-muted'">Next due {{ formatDateMedium(row.next_due_date) }}</p>
                <p v-if="reminderSent(row)" class="text-ui-cap text-ui-ok font-medium flex items-center gap-1">
                  <MailCheck class="w-3.5 h-3.5 shrink-0" /> Reminder emailed
                </p>
              </div>
              <UiButton
                v-if="can('subscription-generate-invoice') && row.status === 'active'"
                variant="secondary"
                size="sm"
                :icon="Receipt"
                :loading="generatingId === row.id"
                aria-label="Generate invoice"
                @click="handleGenerateInvoice(row)"
              />
              <UiButton v-if="can('subscription-edit')" variant="secondary" size="sm" :icon="Edit" aria-label="Edit subscription" @click="openEdit(row)" />
              <UiButton v-if="can('subscription-delete')" variant="danger" size="sm" :icon="Trash2" aria-label="Delete subscription" @click="handleDelete(row)" />
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty
            v-if="search || statusFilter || serviceTypeFilter"
            :icon="SearchX"
            title="No subscriptions match your filters"
            message="Try a different name, type, or status"
            compact
          />
          <UiEmpty
            v-else
            :icon="Inbox"
            title="No subscriptions yet"
            message="Add a maintenance, domain renewal, or SaaS subscription to start tracking recurring billing here."
            compact
          >
            <UiButton v-if="can('subscription-create')" variant="secondary" :icon="Plus" @click="openAdd">Add your first subscription</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div v-if="meta.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" item-label="subscription" @page-change="fetchData" />
      </div>
    </section>

    <SubscriptionFormModal
      :show="showModal"
      :loading="modalLoading"
      :mode="modalMode"
      :data="editingSubscription"
      :clients="clients"
      :projects="projects"
      :bank-accounts="bankAccounts"
      :pph-types="pphTypes"
      :service-type-options="serviceTypeOptions"
      :errors="formErrors"
      @submit="handleSubmit"
      @close="closeModal"
    />
  </div>
</template>
