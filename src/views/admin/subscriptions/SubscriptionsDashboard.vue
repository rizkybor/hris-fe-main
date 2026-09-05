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
  ChevronDown,
  Building2,
  FolderKanban,
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
import { formatDateLong as formatDate } from "@/utils/dateUtils";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import Pagination from "@/components/common/Pagination.vue";
import SubscriptionFormModal from "@/components/admin/subscription/SubscriptionFormModal.vue";

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

const STATUS_CLASS = {
  active: "bg-green-50 text-green-700",
  postponed: "bg-amber-50 text-amber-700",
  cancelled: "bg-gray-100 text-gray-500",
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
  if (diffDays < 0) return { label: `Overdue ${Math.abs(diffDays)}d`, class: "bg-red-50 text-red-600" };
  if (diffDays <= 7) return { label: diffDays === 0 ? "Due today" : `Due in ${diffDays}d`, class: "bg-amber-50 text-amber-700" };
  return null;
};

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
  } catch (err) {
    await alertModal.alert("Failed to delete subscription.", { type: "danger" });
  }
};

const handleGenerateInvoice = async (subscription) => {
  const periodLabel = subscription.billing_cycle === "yearly"
    ? new Date(subscription.next_due_date).getFullYear()
    : new Date(subscription.next_due_date).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const ok = await alertModal.confirm(
    `Generate invoice for "${subscription.name}" — ${periodLabel}, ${formatRupiah(subscription.amount)}?`,
    { confirmText: "Generate" }
  );
  if (!ok) return;

  try {
    await store.generateInvoice(subscription.id);
    // next_due_date/last_invoiced_at/invoices_count all changed on the
    // backend -- reload this page to reflect them on the row.
    await fetchData();
    await alertModal.alert("Invoice generated successfully.", { type: "success" });
  } catch (err) {
    await alertModal.alert(err?.response?.data?.message || "Failed to generate invoice.", { type: "danger" });
  }
};
</script>

<template>
  <div class="px-4 py-4">
    <!-- Header -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 bg-indigo-50 rounded-[12px] flex items-center justify-center shrink-0">
            <RefreshCw class="w-6 h-6 text-indigo-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold">Subscriptions</h3>
            <p class="text-brand-light text-xs font-normal">
              Recurring billing -- maintenance, domain renewal, SaaS subscriptions
            </p>
          </div>
        </div>

        <div v-if="can('subscription-create')" class="flex items-center gap-3.5">
          <button
            type="button"
            @click="openAdd"
            class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Add Subscription</span>
          </button>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            v-model="search"
            class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
            placeholder="Search by name..."
          />
        </div>
        <div class="relative w-full sm:w-auto">
          <select v-model="serviceTypeFilter" class="select-soft">
            <option value="">All Types</option>
            <option v-for="opt in serviceTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div class="relative w-full sm:w-auto">
          <select v-model="statusFilter" class="select-soft">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="postponed">Postponed</option>
            <option value="cancelled">Not Active</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>

    <Alert type="success" :title="success" :show="!!success" />
    <Alert type="error" :title="typeof error === 'string' ? error : ''" :show="!!error && typeof error === 'string'" />

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 4" :key="i" height="90px" rounded="12px" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="subscriptions.length === 0"
      class="flex flex-col items-center justify-center text-center py-16 rounded-[14px] border border-dashed border-[#DCDEDD] bg-gray-50/60"
    >
      <template v-if="search || statusFilter || serviceTypeFilter">
        <SearchX class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No subscriptions match your filters</h4>
        <p class="text-brand-light text-xs">Try a different name, type, or status</p>
      </template>
      <template v-else>
        <Inbox class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No subscriptions yet</h4>
        <p class="text-brand-light text-xs mb-4">
          Add a maintenance, domain renewal, or SaaS subscription to start tracking recurring billing here.
        </p>
        <button
          v-if="can('subscription-create')"
          type="button"
          @click="openAdd"
          class="px-4 py-2.5 rounded-[8px] border border-[#DCDEDD] text-sm font-semibold text-brand-dark hover:border-[#0C51D9] hover:bg-white transition-colors duration-200"
        >
          Add your first subscription
        </button>
      </template>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
      <div
        v-for="(subscription, index) in subscriptions"
        :key="subscription.id"
        class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 hover:border-[#0C51D9] transition-all duration-300"
      >
        <div class="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1.5">
              <span class="text-gray-400 text-xs font-semibold shrink-0">
                {{ (meta.current_page - 1) * meta.per_page + index + 1 }}.
              </span>
              <h4 class="text-brand-dark text-sm font-bold truncate">{{ subscription.name }}</h4>
              <span class="px-2 py-0.5 rounded-md text-xs font-semibold" :class="STATUS_CLASS[subscription.status] || 'bg-gray-100 text-gray-500'">
                {{ STATUS_LABEL[subscription.status] || subscription.status }}
              </span>
              <span v-if="dueBadge(subscription)" class="px-2 py-0.5 rounded-md text-xs font-semibold" :class="dueBadge(subscription).class">
                {{ dueBadge(subscription).label }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-medium">
                {{ serviceTypeLabel[subscription.service_type] || subscription.service_type }}
              </span>
              <span v-if="subscription.product_name" class="inline-flex items-center gap-1">&middot; {{ subscription.product_name }}</span>
              <span class="inline-flex items-center gap-1">
                <Building2 class="w-3 h-3" /> {{ subscription.client?.name || "-" }}
              </span>
              <span v-if="subscription.project" class="inline-flex items-center gap-1">
                <FolderKanban class="w-3 h-3" /> {{ subscription.project.name }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-4 lg:gap-6 shrink-0">
            <div class="text-left lg:text-right">
              <p class="text-brand-dark text-sm font-bold">{{ formatRupiah(subscription.amount) }}</p>
              <p class="text-gray-400 text-xs capitalize">{{ subscription.billing_cycle }}</p>
            </div>
            <div class="text-left lg:text-right">
              <p class="text-brand-dark text-xs font-semibold">{{ formatDate(subscription.next_due_date) }}</p>
              <p class="text-gray-400 text-xs">Next due</p>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                v-if="can('subscription-generate-invoice') && subscription.status === 'active'"
                type="button"
                @click="handleGenerateInvoice(subscription)"
                :disabled="generatingId === subscription.id"
                title="Generate Invoice"
                class="w-9 h-9 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300 disabled:opacity-50"
              >
                <Receipt class="w-4 h-4 text-gray-600" />
              </button>
              <button
                v-if="can('subscription-edit')"
                type="button"
                @click="openEdit(subscription)"
                title="Edit"
                class="w-9 h-9 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300"
              >
                <Edit class="w-3.5 h-3.5 text-gray-600" />
              </button>
              <button
                v-if="can('subscription-delete')"
                type="button"
                @click="handleDelete(subscription)"
                title="Delete"
                class="w-9 h-9 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-red-400 hover:bg-red-50 group/delete transition-all duration-300"
              >
                <Trash2 class="w-3.5 h-3.5 text-gray-500 group-hover/delete:text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Pagination :meta="meta" :loading="loading" item-label="subscription" @page-change="fetchData" />

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
