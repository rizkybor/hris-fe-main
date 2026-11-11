<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";
import {
  Landmark,
  Plus,
  Pencil,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Link2,
  Settings2,
  Eye,
  EyeOff,
  Paperclip,
  FileText,
  Upload,
  ExternalLink,
  Search,
  RotateCcw,
  History,
  Wallet,
  UserRound,
} from "lucide-vue-next";
import { useCompanyCashTransactionStore } from "@/stores/companyCashTransaction";
import { useProjectStore } from "@/stores/project";
import { formatRupiah } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import Pagination from "@/components/common/Pagination.vue";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiSelect, UiTable, UiEmpty, UiModal, UiConfirmDialog, UiAlert } from "@/components/ui";

const store = useCompanyCashTransactionStore();
const {
  transactions,
  openingBalance,
  openingBalanceUpdatedAt,
  openingBalanceUpdatedBy,
  totalDebit,
  totalCredit,
  totalSpending,
  closingBalance,
  spendingByEmployee,
  employeeOptions,
  meta,
  loading,
  saving,
} = storeToRefs(store);

const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);

const canManage = computed(() => can("company-cash-book-create"));

// ===== Tabs: every transaction, or Spending (on behalf of an employee) =====
const activeTab = ref("all");
const isSpendingTab = computed(() => activeTab.value === "spending");
const switchTab = (tab) => {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  // Filters that don't apply to the other tab are cleared; dates/search stay.
  filters.value = { ...filters.value, project_id: "", type: "", source: "", employee_id: "" };
};

// ===== Filters =====
const emptyFilters = () => ({ search: "", project_id: "", type: "", source: "", employee_id: "", start_date: "", end_date: "" });
const filters = ref(emptyFilters());
const hasFilters = computed(() => Object.values(filters.value).some(Boolean));
const resetFilters = () => (filters.value = emptyFilters());

// Quick ranges for the date filter (WIB calendar days).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const PERIODS = [
  { key: "this_month", label: "This month", range: (n) => [new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)] },
  { key: "last_month", label: "Last month", range: (n) => [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)] },
  { key: "this_year", label: "This year", range: (n) => [new Date(n.getFullYear(), 0, 1), new Date(n.getFullYear(), 11, 31)] },
];
const activePeriod = computed(() => {
  const now = new Date();
  return PERIODS.find((p) => {
    const [a, b] = p.range(now).map(ymd);
    return filters.value.start_date === a && filters.value.end_date === b;
  })?.key;
});
const applyPeriod = (p) => {
  if (activePeriod.value === p.key) {
    filters.value = { ...filters.value, start_date: "", end_date: "" };
    return;
  }
  const [a, b] = p.range(new Date()).map(ymd);
  filters.value = { ...filters.value, start_date: a, end_date: b };
};

const fetchData = (page = 1, rowPerPage = null) => {
  const f = filters.value;
  const spending = isSpendingTab.value;
  store.fetchAll({
    search: f.search.trim() || undefined,
    category: spending ? "spending" : undefined,
    employee_id: spending ? f.employee_id || undefined : undefined,
    project_id: spending ? undefined : f.project_id || undefined,
    type: spending ? undefined : f.type || undefined,
    source: spending ? undefined : f.source || undefined,
    start_date: f.start_date || undefined,
    end_date: f.end_date && (!f.start_date || f.end_date >= f.start_date) ? f.end_date : undefined,
    page,
    row_per_page: rowPerPage || meta.value.per_page || 15,
  });
};

const refetch = debounce(() => fetchData(1), 300);
watch(filters, refetch, { deep: true });
watch(activeTab, () => fetchData(1));

// Spending summary card: click a person to show only their spending.
const filterByEmployee = (employeeId) => {
  filters.value = { ...filters.value, employee_id: filters.value.employee_id === employeeId ? "" : employeeId };
};
// Debit without spending, and Debit including it (= totalDebit).
const debitOnly = computed(() => Number(totalDebit.value || 0) - Number(totalSpending.value || 0));
const spendingTotal = computed(() => spendingByEmployee.value.reduce((sum, row) => sum + Number(row.total || 0), 0));

const handlePerPageChange = (rowPerPage) => {
  fetchData(1, rowPerPage);
};

const isFormModalOpen = ref(false);
const editingId = ref(null);
const isDeleteModalOpen = ref(false);
const transactionToDelete = ref(null);
const isDeleting = ref(false);
const formError = ref("");

const emptyForm = (spending = false) => ({
  // Spending is always recorded as a Debit, on behalf of an employee.
  category: spending ? "spending" : "",
  employee_id: "",
  type: "debit",
  description: "",
  amount: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  notes: "",
  proof: null, // new File to upload
  remove_proof: false,
});

// ===== Proof of transaction (optional) =====
const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const PROOF_MAX_BYTES = 5 * 1024 * 1024;
const existingProof = ref(null); // proof already saved on the row being edited
const proofPreviewUrl = ref("");
const proofInput = ref(null);

const resetProofPreview = () => {
  if (proofPreviewUrl.value) URL.revokeObjectURL(proofPreviewUrl.value);
  proofPreviewUrl.value = "";
};

const onProofSelected = (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!PROOF_TYPES.includes(file.type)) {
    formError.value = "The proof must be a JPG, PNG, WEBP or PDF file.";
    return;
  }
  if (file.size > PROOF_MAX_BYTES) {
    formError.value = "The proof may not be larger than 5 MB.";
    return;
  }
  formError.value = "";
  resetProofPreview();
  form.value.proof = file;
  form.value.remove_proof = false;
  if (file.type.startsWith("image/")) proofPreviewUrl.value = URL.createObjectURL(file);
};

const clearNewProof = () => {
  form.value.proof = null;
  resetProofPreview();
};

const removeExistingProof = () => {
  form.value.remove_proof = true;
};

// Small viewer for a saved proof (from the table or the edit form).
const viewingProof = ref(null);
const openProof = (proof) => (viewingProof.value = proof);

const form = ref(emptyForm());

const isSpendingForm = computed(() => form.value.category === "spending");

const openCreateModal = (spending = false) => {
  editingId.value = null;
  form.value = emptyForm(spending === true);
  existingProof.value = null;
  resetProofPreview();
  formError.value = "";
  isFormModalOpen.value = true;
};

const openEditModal = (transaction) => {
  editingId.value = transaction.id;
  form.value = {
    category: transaction.category || "",
    employee_id: transaction.employee?.id || "",
    type: transaction.type,
    description: transaction.description,
    amount: transaction.amount,
    transaction_date: transaction.transaction_date,
    notes: transaction.notes || "",
    proof: null,
    remove_proof: false,
  };
  existingProof.value = transaction.proof || null;
  resetProofPreview();
  formError.value = "";
  isFormModalOpen.value = true;
};

const closeFormModal = () => {
  isFormModalOpen.value = false;
  resetProofPreview();
};

const handleSubmit = async () => {
  formError.value = "";

  if (!form.value.description || !form.value.amount || !form.value.transaction_date) {
    formError.value = "Description, amount, and date are required.";
    return;
  }
  if (isSpendingForm.value && !form.value.employee_id) {
    formError.value = "Choose who this spending is on behalf of.";
    return;
  }

  // Only send proof fields that actually change something.
  const { proof, remove_proof, ...fields } = form.value;
  const payload = { ...fields, category: fields.category || null, employee_id: fields.category ? fields.employee_id : null };
  if (payload.category === "spending") payload.type = "debit";
  if (proof) payload.proof = proof;
  else if (editingId.value && remove_proof) payload.remove_proof = true;

  try {
    if (editingId.value) {
      await store.updateTransaction(editingId.value, payload);
    } else {
      await store.createTransaction(payload);
    }
    closeFormModal();
  } catch (err) {
    formError.value =
      typeof store.error === "string" ? store.error : "Failed to save the transaction.";
  }
};

const confirmDelete = (transaction) => {
  transactionToDelete.value = transaction;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!transactionToDelete.value) return;
  isDeleting.value = true;
  try {
    await store.deleteTransaction(transactionToDelete.value.id);
    isDeleteModalOpen.value = false;
    transactionToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};

// The backend already returns newest-first, paginated -- balances are
// computed server-side against the full chronological history before
// that reversal, so no re-sorting is needed here.
const displayedTransactions = computed(() => transactions.value);

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// "Updated 21 Oct 2026, 14:05 WIB · by Rina" under Opening Balance.
const openingBalanceStamp = computed(() => {
  if (!openingBalanceUpdatedAt.value) return null;
  const date = new Date(openingBalanceUpdatedAt.value);
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return { text: `${text} WIB`, by: openingBalanceUpdatedBy.value, full: date.toLocaleString("en-GB", { timeZone: "Asia/Jakarta" }) };
});

// --- Opening balance editor ---
const isBalanceModalOpen = ref(false);
const balanceDraft = ref(0);
const balanceError = ref("");

const openBalanceModal = () => {
  balanceDraft.value = openingBalance.value;
  balanceError.value = "";
  isBalanceModalOpen.value = true;
};

const handleBalanceSubmit = async () => {
  balanceError.value = "";
  try {
    await store.updateOpeningBalance(balanceDraft.value);
    isBalanceModalOpen.value = false;
  } catch (err) {
    balanceError.value =
      typeof store.error === "string" ? store.error : "Failed to update the opening balance.";
  }
};

onMounted(() => {
  fetchData();
  projectStore.fetchProjects({ limit: 200 });
  store.fetchEmployeeOptions();
});

// Hidden by default -- balance figures are sensitive, revealed only on demand.
const isBalanceVisible = ref(false);

// ----- Presentation only -----
const TABS = [
  { key: "all", label: "All Transactions", icon: Landmark },
  { key: "spending", label: "Spending", icon: Wallet },
];
const masked = (value) => (isBalanceVisible.value ? formatRupiah(value) : "Rp ••••••");
const filteredSuffix = computed(() => (hasFilters.value || isSpendingTab.value ? " · filtered" : ""));
const employeeFilterOptions = computed(() => [{ value: "", label: "Everyone" }, ...employeeOptions.value.map((e) => ({ value: e.id, label: e.name }))]);
const projectFilterOptions = computed(() => [{ value: "", label: "All projects" }, ...(projects.value || []).map((p) => ({ value: p.id, label: p.name }))]);
const TYPE_FILTER_OPTIONS = [
  { value: "", label: "Debit & Credit" },
  { value: "debit", label: "Debit (In)" },
  { value: "credit", label: "Credit (Out)" },
];
const SOURCE_FILTER_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "manual", label: "Manual" },
  { value: "project", label: "From projects" },
];
const employeeFormOptions = computed(() => employeeOptions.value.map((e) => ({ value: e.id, label: e.name })));
const tableColumns = computed(() => [
  { key: "transaction_date", label: "Date", width: 120 },
  { key: "description", label: "Description" },
  { key: "source", label: isSpendingTab.value ? "On behalf of" : "Source" },
  { key: "debit", label: "Debit", align: "right" },
  ...(isSpendingTab.value ? [] : [{ key: "credit", label: "Credit", align: "right" }]),
  { key: "balance", label: "Balance", align: "right" },
  ...(canManage.value ? [{ key: "actions", label: "Actions", align: "right" }] : []),
]);
const formTitle = computed(() =>
  isSpendingForm.value ? (editingId.value ? "Edit Spending" : "Add Spending") : editingId.value ? "Edit Transaction" : "Add Cash Transaction"
);
const deleteMessage = computed(
  () => `Are you sure you want to delete "${transactionToDelete.value?.description ?? ""}"? This action cannot be undone.`
);
const fieldClass =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink tabular-nums placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      title="Company Cash Book"
      subtitle="Real debit/credit transactions as they actually happen -- auto-synced from every project's own cash ledger, plus manual entries"
    >
      <template #actions>
        <UiButton
          variant="secondary"
          :icon="isBalanceVisible ? EyeOff : Eye"
          :title="isBalanceVisible ? 'Hide amounts' : 'Show amounts'"
          :aria-label="isBalanceVisible ? 'Hide amounts' : 'Show amounts'"
          class="!px-2.5"
          @click="isBalanceVisible = !isBalanceVisible"
        />
        <UiButton v-if="canManage" variant="secondary" :icon="Settings2" class="flex-1 sm:flex-none" @click="openBalanceModal">Set Opening Balance</UiButton>
        <UiButton v-if="canManage" variant="secondary" :icon="Wallet" class="flex-1 sm:flex-none" @click="openCreateModal(true)">Add Spending</UiButton>
        <UiButton v-if="canManage" :icon="Plus" class="w-full sm:w-auto" @click="openCreateModal">Add Transaction</UiButton>
      </template>
    </UiPageHeader>

    <!-- Balance summary -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 ui-stagger">
      <div class="col-span-2 lg:col-span-1 bg-ui-surface border border-ui-line rounded-ui-card px-4 py-3.5 min-w-0">
        <p class="text-ui-small text-ui-muted truncate">Opening Balance</p>
        <p class="text-ui-h2 text-ui-ink tabular-nums mt-1 truncate">{{ masked(openingBalance) }}</p>
        <p
          class="text-ui-cap text-ui-muted mt-1 flex items-start gap-1"
          :title="openingBalanceStamp ? `Last updated ${openingBalanceStamp.full}${openingBalanceStamp.by ? ' by ' + openingBalanceStamp.by : ''}` : ''"
        >
          <History class="w-3 h-3 shrink-0 mt-0.5 text-ui-faint" />
          <span v-if="openingBalanceStamp" class="min-w-0">
            Updated {{ openingBalanceStamp.text }}<span v-if="openingBalanceStamp.by" class="hidden sm:inline"> · {{ openingBalanceStamp.by }}</span>
          </span>
          <span v-else>Never set</span>
        </p>
      </div>
      <div class="bg-ui-surface border border-ui-line rounded-ui-card px-4 py-3.5 min-w-0">
        <p class="text-ui-small text-ui-muted truncate" :title="`Total Debit${filteredSuffix}`">Total Debit<span v-if="filteredSuffix" class="text-ui-faint">{{ filteredSuffix }}</span></p>
        <p class="text-ui-h2 text-ui-ok tabular-nums mt-1 truncate">{{ masked(debitOnly) }}</p>
        <p class="text-ui-cap text-ui-muted mt-1 truncate">Excluding spending</p>
      </div>
      <div class="bg-ui-surface border border-ui-line rounded-ui-card px-4 py-3.5 min-w-0">
        <p class="text-ui-small text-ui-muted truncate" :title="`Total Debit + Spending${filteredSuffix}`">Total Debit + Spending<span v-if="filteredSuffix" class="text-ui-faint">{{ filteredSuffix }}</span></p>
        <p class="text-ui-h2 text-ui-ok tabular-nums mt-1 truncate">{{ masked(totalDebit) }}</p>
        <p class="text-ui-cap text-ui-muted mt-1 truncate">Spending <span class="tabular-nums">{{ masked(totalSpending) }}</span></p>
      </div>
      <div class="bg-ui-surface border border-ui-line rounded-ui-card px-4 py-3.5 min-w-0">
        <p class="text-ui-small text-ui-muted truncate" :title="`Total Credit (Out)${filteredSuffix}`">Total Credit (Out)<span v-if="filteredSuffix" class="text-ui-faint">{{ filteredSuffix }}</span></p>
        <p class="text-ui-h2 text-ui-bad tabular-nums mt-1 truncate">{{ masked(totalCredit) }}</p>
      </div>
      <div class="bg-ui-surface border border-ui-line rounded-ui-card px-4 py-3.5 min-w-0">
        <p class="text-ui-small text-ui-muted truncate">Closing Balance</p>
        <p class="text-ui-h2 text-ui-ink tabular-nums mt-1 truncate">{{ masked(closingBalance) }}</p>
      </div>
    </div>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Tabs: underline on desktop, chips on phones -->
      <div class="px-4 sm:px-5 pt-4 sm:pt-3 sm:border-b sm:border-ui-line">
        <div class="flex items-center gap-1.5 sm:gap-6 overflow-x-auto [scrollbar-width:none]" role="tablist">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.key"
            @click="switchTab(tab.key)"
            :class="[
              'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:shadow-ui-focus',
              'h-8 px-3 rounded-full border text-ui-small',
              'sm:h-auto sm:px-0.5 sm:pt-2 sm:pb-3 sm:rounded-none sm:border-0 sm:border-b-2 sm:-mb-px sm:text-ui-body',
              activeTab === tab.key
                ? 'bg-ui-ink text-white border-ui-ink sm:bg-transparent sm:text-ui-ink sm:border-ui-ink'
                : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover sm:bg-transparent sm:text-ui-muted sm:border-transparent sm:hover:bg-transparent sm:hover:text-ui-ink',
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4 hidden sm:block" /> {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="px-4 sm:px-5 py-4 space-y-4 border-b border-ui-line">
        <!-- Spending per person: click a card to show only their spending. -->
        <div v-if="isSpendingTab">
          <div class="flex items-center justify-between gap-3 mb-2">
            <p class="text-ui-small font-medium text-ui-ink">Spending by person<span v-if="filters.start_date || filters.end_date || filters.search" class="text-ui-faint font-normal"> · filtered</span></p>
            <p class="text-ui-cap text-ui-muted">Total <span class="tabular-nums text-ui-ink font-medium">{{ masked(spendingTotal) }}</span></p>
          </div>
          <div v-if="spendingByEmployee.length" class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 ui-stagger">
            <button
              v-for="person in spendingByEmployee"
              :key="person.employee_id ?? 'none'"
              type="button"
              @click="filterByEmployee(person.employee_id)"
              class="ui-press text-left bg-ui-surface border rounded-ui-card px-3.5 py-3 transition-colors min-w-0 focus:outline-none focus-visible:shadow-ui-focus"
              :class="String(filters.employee_id) === String(person.employee_id) ? 'border-ui-accent bg-ui-accent-soft' : 'border-ui-line hover:border-ui-line-strong hover:bg-ui-subtle'"
              :aria-pressed="String(filters.employee_id) === String(person.employee_id)"
            >
              <p class="flex items-center gap-1.5 text-ui-cap font-medium text-ui-text truncate">
                <UserRound class="w-3.5 h-3.5 text-ui-faint shrink-0" /> {{ person.name }}
              </p>
              <p class="text-ui-h3 text-ui-ink tabular-nums mt-1 truncate">{{ masked(person.total) }}</p>
              <p class="text-ui-cap text-ui-muted tabular-nums">{{ person.count }} {{ person.count === 1 ? "entry" : "entries" }}</p>
            </button>
          </div>
        </div>

        <!-- Filters. The Balance column stays the company-wide running
             balance whatever is filtered. -->
        <div
          class="grid grid-cols-2 gap-2.5"
          :class="isSpendingTab ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]'"
        >
          <UiInput
            v-model="filters.search"
            :icon="Search"
            :placeholder="isSpendingTab ? 'Search description, notes, person...' : 'Search description, notes, project...'"
            class="col-span-2 lg:col-span-1"
          />
          <UiSelect v-if="isSpendingTab" v-model="filters.employee_id" :options="employeeFilterOptions" class="col-span-2 lg:col-span-1" aria-label="On behalf of" />
          <template v-else>
            <UiSelect v-model="filters.project_id" :options="projectFilterOptions" class="col-span-2 lg:col-span-1" aria-label="Project" />
            <UiSelect v-model="filters.type" :options="TYPE_FILTER_OPTIONS" aria-label="Type" />
            <UiSelect v-model="filters.source" :options="SOURCE_FILTER_OPTIONS" aria-label="Source" />
          </template>
        </div>

        <div class="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 lg:w-[340px]">
            <input v-model="filters.start_date" type="date" :class="fieldClass" aria-label="From date" />
            <span class="text-ui-cap text-ui-muted">to</span>
            <input v-model="filters.end_date" type="date" :min="filters.start_date || undefined" :class="fieldClass" aria-label="To date" />
          </div>
          <div class="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-1 px-1">
            <button
              v-for="p in PERIODS"
              :key="p.key"
              type="button"
              class="ui-press shrink-0 inline-flex items-center h-8 px-3 rounded-full border text-ui-small font-medium whitespace-nowrap"
              :class="activePeriod === p.key ? 'bg-ui-ink text-white border-ui-ink' : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover'"
              :aria-pressed="activePeriod === p.key"
              @click="applyPeriod(p)"
            >
              {{ p.label }}
            </button>
            <UiButton v-if="hasFilters" variant="ghost" size="sm" :icon="RotateCcw" class="shrink-0" @click="resetFilters">Reset</UiButton>
          </div>
          <p v-if="hasFilters && !loading" class="text-ui-cap text-ui-muted tabular-nums lg:ml-auto">{{ meta.total }} matching {{ meta.total === 1 ? "transaction" : "transactions" }}</p>
        </div>
      </div>

      <UiEmpty
        v-if="!loading && transactions.length === 0"
        :icon="Landmark"
        :title="hasFilters ? 'No transactions match the filters' : isSpendingTab ? 'No spending yet' : 'No cash transactions yet'"
        :message="hasFilters ? '' : isSpendingTab ? 'Record spending on behalf of an employee with Add Spending.' : 'Recording a transaction on any project\'s own Cash Ledger will automatically appear here too.'"
      >
        <UiButton v-if="hasFilters" variant="secondary" size="sm" :icon="RotateCcw" @click="resetFilters">Reset filters</UiButton>
      </UiEmpty>

      <UiTable v-else :columns="tableColumns" :rows="displayedTransactions" :meta="meta" :loading="loading" :skeleton-rows="6">
        <template #cell-transaction_date="{ row }">
          <span class="text-ui-muted whitespace-nowrap tabular-nums">{{ formatDate(row.transaction_date) }}</span>
        </template>
        <template #cell-description="{ row }">
          <div class="py-2 min-w-[180px]">
            <p class="text-ui-ink font-medium">{{ row.description }}</p>
            <p v-if="row.notes" class="text-ui-cap text-ui-muted mt-0.5">{{ row.notes }}</p>
            <button
              v-if="row.proof"
              type="button"
              class="mt-1 inline-flex items-center gap-1 text-ui-cap font-medium text-ui-accent hover:underline"
              @click="openProof(row.proof)"
            >
              <Paperclip class="w-3 h-3" /> View proof
            </button>
          </div>
        </template>
        <template #cell-source="{ row }">
          <UiBadge v-if="row.category === 'spending'" tone="warn" :title="`Spending on behalf of ${row.employee?.name || 'an employee'}`">
            <Wallet v-if="!isSpendingTab" class="w-3 h-3" />
            <UserRound v-else class="w-3 h-3" />
            {{ isSpendingTab ? row.employee?.name || "-" : `Spending · ${row.employee?.name || "-"}` }}
          </UiBadge>
          <UiBadge v-else-if="row.is_synced" tone="info" :title="`Auto-synced from ${row.project_name}'s cash ledger`">
            <Link2 class="w-3 h-3" /> {{ row.project_name }}
          </UiBadge>
          <UiBadge v-else tone="neutral">Manual</UiBadge>
        </template>
        <template #cell-debit="{ row }">
          <span v-if="row.type === 'debit'" class="inline-flex items-center gap-1 justify-end text-ui-ok tabular-nums whitespace-nowrap">
            <ArrowUpCircle class="w-3.5 h-3.5" />
            {{ masked(row.amount) }}
          </span>
          <span v-else class="text-ui-faint">—</span>
        </template>
        <template #cell-credit="{ row }">
          <span v-if="row.type === 'credit'" class="inline-flex items-center gap-1 justify-end text-ui-bad tabular-nums whitespace-nowrap">
            <ArrowDownCircle class="w-3.5 h-3.5" />
            {{ masked(row.amount) }}
          </span>
          <span v-else class="text-ui-faint">—</span>
        </template>
        <template #cell-balance="{ row }">
          <span class="font-semibold text-ui-ink tabular-nums whitespace-nowrap">{{ masked(row.balance) }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div v-if="!row.is_synced" class="flex justify-end gap-0.5">
            <button type="button" @click="openEditModal(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" title="Edit" aria-label="Edit">
              <Pencil class="w-4 h-4" />
            </button>
            <button type="button" @click="confirmDelete(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad" title="Delete" aria-label="Delete">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <p v-else class="text-right text-ui-cap text-ui-faint whitespace-nowrap" title="Edit this from the project's own Cash Ledger">via Project</p>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-ui-body font-medium text-ui-ink">{{ row.description }}</p>
                  <p class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(row.transaction_date) }}</p>
                </div>
                <div class="text-right shrink-0">
                  <p
                    class="inline-flex items-center gap-1 text-ui-body font-medium tabular-nums"
                    :class="row.type === 'debit' ? 'text-ui-ok' : 'text-ui-bad'"
                  >
                    <ArrowUpCircle v-if="row.type === 'debit'" class="w-3.5 h-3.5" />
                    <ArrowDownCircle v-else class="w-3.5 h-3.5" />
                    {{ masked(row.amount) }}
                  </p>
                  <p class="text-ui-cap text-ui-muted">{{ row.type === "debit" ? "Debit" : "Credit" }}</p>
                </div>
              </div>
              <p v-if="row.notes" class="text-ui-cap text-ui-muted mt-1">{{ row.notes }}</p>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <UiBadge v-if="row.category === 'spending'" tone="warn">
                  <UserRound class="w-3 h-3" />
                  {{ isSpendingTab ? row.employee?.name || "-" : `Spending · ${row.employee?.name || "-"}` }}
                </UiBadge>
                <UiBadge v-else-if="row.is_synced" tone="info"><Link2 class="w-3 h-3" /> {{ row.project_name }}</UiBadge>
                <UiBadge v-else tone="neutral">Manual</UiBadge>
                <span class="text-ui-cap text-ui-muted">Balance <span class="tabular-nums font-medium text-ui-ink">{{ masked(row.balance) }}</span></span>
              </div>
              <div v-if="row.proof || canManage" class="flex items-center gap-1 mt-2 -ml-2">
                <UiButton v-if="row.proof" variant="ghost" size="sm" :icon="Paperclip" @click="openProof(row.proof)">View proof</UiButton>
                <template v-if="canManage">
                  <template v-if="!row.is_synced">
                    <UiButton variant="ghost" size="sm" :icon="Pencil" @click="openEditModal(row)">Edit</UiButton>
                    <UiButton variant="ghost" size="sm" :icon="Trash2" class="!text-ui-bad" @click="confirmDelete(row)">Delete</UiButton>
                  </template>
                  <span v-else class="text-ui-cap text-ui-faint px-2" title="Edit this from the project's own Cash Ledger">via Project</span>
                </template>
              </div>
            </div>
          </div>
        </template>
      </UiTable>

      <div v-if="!loading && transactions.length > 0" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination
          :meta="meta"
          :loading="loading"
          item-label="transactions"
          @page-change="fetchData"
          @per-page-change="handlePerPageChange"
        />
      </div>
    </section>

    <!-- FORM MODAL -->
    <UiModal :open="isFormModalOpen" :title="formTitle" size="lg" @update:open="(v) => !v && closeFormModal()">
      <form id="cash-book-form" @submit.prevent="handleSubmit" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Spending: on whose behalf; always recorded as Debit -->
        <div v-if="isSpendingForm" class="sm:col-span-2">
          <!-- No native `required`: handleSubmit shows its own message. -->
          <label for="cb-employee" class="block text-ui-small font-medium text-ui-ink mb-1.5">On behalf of<span class="text-ui-bad"> *</span></label>
          <UiSelect
            id="cb-employee"
            v-model="form.employee_id"
            placeholder="Choose an employee"
            :options="employeeFormOptions"
          />
          <p class="text-ui-cap text-ui-muted mt-1.5 flex items-center gap-1">
            <ArrowUpCircle class="w-3 h-3 text-ui-ok" /> Recorded as Debit in the cash book.
          </p>
        </div>

        <div v-else class="sm:col-span-2">
          <p class="block text-ui-small font-medium text-ui-ink mb-1.5">Type</p>
          <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type">
            <button
              type="button"
              role="radio"
              :aria-checked="form.type === 'debit'"
              @click="form.type = 'debit'"
              class="ui-press h-[38px] inline-flex items-center justify-center gap-1.5 rounded-ui-control border text-ui-small font-medium transition-colors"
              :class="form.type === 'debit' ? 'border-ui-ok/40 bg-ui-ok-soft text-ui-ok' : 'border-ui-line-strong bg-ui-surface text-ui-muted hover:bg-ui-subtle'"
            >
              <ArrowUpCircle class="w-4 h-4" /> Debit (In)
            </button>
            <button
              type="button"
              role="radio"
              :aria-checked="form.type === 'credit'"
              @click="form.type = 'credit'"
              class="ui-press h-[38px] inline-flex items-center justify-center gap-1.5 rounded-ui-control border text-ui-small font-medium transition-colors"
              :class="form.type === 'credit' ? 'border-ui-bad/40 bg-ui-bad-soft text-ui-bad' : 'border-ui-line-strong bg-ui-surface text-ui-muted hover:bg-ui-subtle'"
            >
              <ArrowDownCircle class="w-4 h-4" /> Credit (Out)
            </button>
          </div>
        </div>

        <div class="sm:col-span-2 min-w-0">
          <label for="cb-description" class="block text-ui-small font-medium text-ui-ink mb-1.5">Description<span class="text-ui-bad"> *</span></label>
          <UiInput
            id="cb-description"
            v-model="form.description"
            :placeholder="isSpendingForm ? 'e.g. Taxi to client meeting' : 'e.g. Consulting income'"
          />
        </div>

        <div class="min-w-0">
          <label for="cb-amount" class="block text-ui-small font-medium text-ui-ink mb-1.5">Amount (Rp)<span class="text-ui-bad"> *</span></label>
          <input id="cb-amount" v-model.number="form.amount" type="number" min="0" placeholder="0" :class="[fieldClass, 'text-right']" />
        </div>
        <div class="min-w-0">
          <label for="cb-date" class="block text-ui-small font-medium text-ui-ink mb-1.5">Date<span class="text-ui-bad"> *</span></label>
          <UiInput id="cb-date" v-model="form.transaction_date" type="date" />
        </div>

        <UiInput v-model="form.notes" label="Notes" :rows="2" placeholder="Optional notes" class="sm:col-span-2" />

        <!-- Proof of transaction -->
        <div class="sm:col-span-2">
          <p class="block text-ui-small font-medium text-ui-ink mb-1.5">
            Proof of transaction <span class="text-ui-muted font-normal">(optional)</span>
          </p>

          <!-- New file picked -->
          <div v-if="form.proof" class="flex items-center gap-3 p-2.5 border border-ui-line rounded-ui-control">
            <img v-if="proofPreviewUrl" :src="proofPreviewUrl" alt="Preview" class="w-12 h-12 rounded-md object-cover border border-ui-line" />
            <div v-else class="w-12 h-12 rounded-md bg-ui-subtle flex items-center justify-center shrink-0"><FileText class="w-5 h-5 text-ui-muted" /></div>
            <div class="min-w-0 flex-1">
              <p class="text-ui-small text-ui-ink font-medium truncate">{{ form.proof.name }}</p>
              <p class="text-ui-cap text-ui-muted">Uploaded when you save</p>
            </div>
            <UiButton variant="ghost" size="sm" @click="clearNewProof">Cancel</UiButton>
          </div>

          <!-- Proof already saved on this transaction -->
          <div v-else-if="existingProof && !form.remove_proof" class="flex items-center gap-3 p-2.5 border border-ui-line rounded-ui-control">
            <img v-if="existingProof.is_image" :src="existingProof.url" alt="Proof" class="w-12 h-12 rounded-md object-cover border border-ui-line" />
            <div v-else class="w-12 h-12 rounded-md bg-ui-subtle flex items-center justify-center shrink-0"><FileText class="w-5 h-5 text-ui-muted" /></div>
            <div class="min-w-0 flex-1">
              <p class="text-ui-small text-ui-ink font-medium truncate">{{ existingProof.name || "Proof of transaction" }}</p>
              <button type="button" class="text-ui-cap font-medium text-ui-accent hover:underline" @click="openProof(existingProof)">View</button>
            </div>
            <UiButton variant="ghost" size="sm" @click="proofInput?.click()">Replace</UiButton>
            <UiButton variant="ghost" size="sm" class="!text-ui-bad" @click="removeExistingProof">Remove</UiButton>
          </div>

          <!-- Nothing attached -->
          <button
            v-else
            type="button"
            class="ui-press w-full flex items-center justify-center gap-2 px-3.5 py-3 border border-dashed border-ui-line-strong rounded-ui-control text-ui-small text-ui-muted hover:border-ui-accent hover:text-ui-accent transition-colors"
            @click="proofInput?.click()"
          >
            <Upload class="w-4 h-4" /> Upload proof (JPG, PNG, WEBP, PDF · max 5 MB)
          </button>
          <p v-if="existingProof && form.remove_proof && !form.proof" class="text-ui-cap text-ui-muted mt-1.5">
            The current proof will be removed when you save.
            <button type="button" class="font-medium text-ui-accent hover:underline" @click="form.remove_proof = false">Undo</button>
          </p>
          <input ref="proofInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="hidden" @change="onProofSelected" />
        </div>

        <UiAlert v-if="formError" tone="bad" :message="formError" class="sm:col-span-2" />
      </form>

      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="closeFormModal">Cancel</UiButton>
        <UiButton type="submit" form="cash-book-form" :loading="saving" :disabled="saving" class="flex-1 sm:flex-none">
          {{ saving ? "Saving..." : "Save" }}
        </UiButton>
      </template>
    </UiModal>

    <!-- PROOF VIEWER (kept small) -->
    <UiModal :open="!!viewingProof" title="Proof of transaction" :description="viewingProof?.name || ''" size="sm" :z-index="150" @update:open="(v) => !v && (viewingProof = null)">
      <div v-if="viewingProof?.is_image" class="bg-ui-subtle border border-ui-line rounded-ui-control flex items-center justify-center p-2">
        <img :src="viewingProof?.url" :alt="viewingProof?.name" class="max-w-full object-contain rounded" style="max-height: 320px" />
      </div>
      <div v-else class="bg-ui-subtle border border-ui-line rounded-ui-control flex flex-col items-center justify-center py-8">
        <FileText class="w-10 h-10 text-ui-muted mb-2" />
        <p class="text-ui-cap text-ui-muted">PDF document</p>
      </div>
      <template #footer>
        <UiButton variant="secondary" :href="viewingProof?.url" target="_blank" rel="noopener" :icon="ExternalLink" class="w-full">
          {{ viewingProof?.is_image ? "Open full size" : "Open PDF" }}
        </UiButton>
      </template>
    </UiModal>

    <!-- OPENING BALANCE MODAL -->
    <UiModal v-model:open="isBalanceModalOpen" title="Set Opening Balance" size="sm">
      <form id="cash-book-balance-form" @submit.prevent="handleBalanceSubmit" class="space-y-4">
        <div>
          <label for="cb-opening-balance" class="block text-ui-small font-medium text-ui-ink mb-1.5">Opening Balance (Rp)</label>
          <input id="cb-opening-balance" v-model.number="balanceDraft" type="number" min="0" :class="[fieldClass, 'text-right']" />
        </div>
        <UiAlert v-if="balanceError" tone="bad" :message="balanceError" />
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="isBalanceModalOpen = false">Cancel</UiButton>
        <UiButton type="submit" form="cash-book-balance-form" :loading="saving" :disabled="saving" class="flex-1 sm:flex-none">
          {{ saving ? "Saving..." : "Save" }}
        </UiButton>
      </template>
    </UiModal>

    <!-- DELETE MODAL -->
    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      type="danger"
      :title="transactionToDelete?.category === 'spending' ? 'Delete Spending?' : 'Delete Transaction?'"
      :message="deleteMessage"
      confirm-text="Yes, Delete"
      cancel-text="Cancel"
      :loading="isDeleting"
      @confirm="handleDelete"
    />
  </div>
</template>
