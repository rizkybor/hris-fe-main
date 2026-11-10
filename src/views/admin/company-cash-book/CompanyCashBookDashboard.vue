<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";
import {
  Landmark,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Link2,
  Settings2,
  Eye,
  EyeOff,
  ChevronDown,
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
</script>

<template>
  <div class="px-0.5 py-1 sm:px-4 sm:py-4">
    <!-- Buttons drop below the title until there is room for all three. -->
    <div class="bg-white mb-5 flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-11 h-11 bg-emerald-50 rounded-[12px] flex items-center justify-center shrink-0">
          <Landmark class="w-5 h-5 text-emerald-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">Company Cash Book</h3>
          <p class="text-brand-light text-xs">
            Real debit/credit transactions as they actually happen -- auto-synced from every project's own cash ledger, plus manual entries
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 w-full 2xl:w-auto 2xl:shrink-0">
        <button
          v-if="canManage"
          @click="openBalanceModal"
          class="rounded-lg border border-[#DCDEDD] hover:border-[#0C51D9] transition-all px-4 py-2.5 flex items-center justify-center gap-2 flex-1 sm:flex-none"
        >
          <Settings2 class="w-4 h-4 text-gray-600" />
          <span class="text-brand-dark text-xs font-semibold">Set Opening Balance</span>
        </button>
        <button
          v-if="canManage"
          @click="openCreateModal(true)"
          class="rounded-lg border border-[#DCDEDD] hover:border-[#0C51D9] transition-all px-4 py-2.5 flex items-center justify-center gap-2 flex-1 sm:flex-none"
        >
          <Wallet class="w-4 h-4 text-gray-600" />
          <span class="text-brand-dark text-xs font-semibold">Add Spending</span>
        </button>
        <button
          v-if="canManage"
          @click="openCreateModal"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center justify-center gap-2 flex-1 sm:flex-none"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-xs font-semibold">Add Transaction</span>
        </button>
      </div>
    </div>

    <!-- Balance summary -->
    <div class="flex items-center justify-end mb-2">
      <button
        type="button"
        @click="isBalanceVisible = !isBalanceVisible"
        class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        :title="isBalanceVisible ? 'Hide amounts' : 'Show amounts'"
      >
        <Eye v-if="!isBalanceVisible" class="w-4 h-4" />
        <EyeOff v-else class="w-4 h-4" />
      </button>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
      <div class="bg-gray-50 border border-[#DCDEDD] rounded-[10px] p-3.5 min-w-0">
        <p class="text-brand-light text-xs">Opening Balance</p>
        <p class="text-brand-dark text-xs sm:text-sm font-bold mt-1 truncate">
          {{ isBalanceVisible ? formatRupiah(openingBalance) : "Rp ••••••" }}
        </p>
        <p
          class="text-[10px] sm:text-[11px] text-gray-500 mt-1 flex items-start gap-1 leading-snug"
          :title="openingBalanceStamp ? `Last updated ${openingBalanceStamp.full}${openingBalanceStamp.by ? ' by ' + openingBalanceStamp.by : ''}` : ''"
        >
          <History class="w-3 h-3 shrink-0 mt-px" />
          <span v-if="openingBalanceStamp" class="min-w-0">
            Updated {{ openingBalanceStamp.text }}<span v-if="openingBalanceStamp.by" class="hidden sm:inline"> · {{ openingBalanceStamp.by }}</span>
          </span>
          <span v-else>Never set</span>
        </p>
      </div>
      <div class="bg-emerald-50 border border-emerald-100 rounded-[10px] p-3.5 min-w-0">
        <p class="text-emerald-600 text-xs">Total Debit<span v-if="hasFilters || isSpendingTab" class="opacity-70"> · filtered</span></p>
        <p class="text-emerald-700 text-xs sm:text-sm font-bold mt-1 truncate">
          {{ isBalanceVisible ? formatRupiah(debitOnly) : "Rp ••••••" }}
        </p>
        <p class="text-[10px] sm:text-[11px] text-emerald-600/80 mt-1">Excluding spending</p>
      </div>
      <div class="bg-teal-50 border border-teal-100 rounded-[10px] p-3.5 min-w-0">
        <p class="text-teal-700 text-xs">Total Debit + Spending<span v-if="hasFilters || isSpendingTab" class="opacity-70"> · filtered</span></p>
        <p class="text-teal-800 text-xs sm:text-sm font-bold mt-1 truncate">
          {{ isBalanceVisible ? formatRupiah(totalDebit) : "Rp ••••••" }}
        </p>
        <p class="text-[10px] sm:text-[11px] text-teal-700/80 mt-1 truncate">
          Spending {{ isBalanceVisible ? formatRupiah(totalSpending) : "Rp ••••••" }}
        </p>
      </div>
      <div class="bg-red-50 border border-red-100 rounded-[10px] p-3.5">
        <p class="text-red-600 text-xs">Total Credit (Out)<span v-if="hasFilters || isSpendingTab" class="opacity-70"> · filtered</span></p>
        <p class="text-red-700 text-xs sm:text-sm font-bold mt-1 truncate">
          {{ isBalanceVisible ? formatRupiah(totalCredit) : "Rp ••••••" }}
        </p>
      </div>
      <div class="bg-blue-50 border border-blue-100 rounded-[10px] p-3.5">
        <p class="text-blue-600 text-xs">Closing Balance</p>
        <p class="text-blue-700 text-xs sm:text-sm font-bold mt-1 truncate">
          {{ isBalanceVisible ? formatRupiah(closingBalance) : "Rp ••••••" }}
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-1 mb-3 border-b border-[#DCDEDD]">
      <button
        v-for="tab in [{ key: 'all', label: 'All Transactions', icon: Landmark }, { key: 'spending', label: 'Spending', icon: Wallet }]"
        :key="tab.key"
        type="button"
        @click="switchTab(tab.key)"
        class="px-4 py-2.5 -mb-px border-b-2 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
        :class="activeTab === tab.key ? 'border-[#0C51D9] text-[#0C51D9]' : 'border-transparent text-gray-500 hover:text-brand-dark'"
      >
        <component :is="tab.icon" class="w-4 h-4" /> {{ tab.label }}
      </button>
    </div>

    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 sm:p-6">
      <!-- Spending per person: click a card to show only their spending. -->
      <div v-if="isSpendingTab" class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-semibold text-brand-dark">Spending by person<span v-if="filters.start_date || filters.end_date || filters.search" class="text-gray-400 font-normal"> · filtered</span></p>
          <p class="text-xs text-gray-500">Total {{ isBalanceVisible ? formatRupiah(spendingTotal) : "Rp ••••••" }}</p>
        </div>
        <div v-if="spendingByEmployee.length" class="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            v-for="person in spendingByEmployee"
            :key="person.employee_id ?? 'none'"
            type="button"
            @click="filterByEmployee(person.employee_id)"
            class="text-left bg-white border rounded-[10px] p-3 transition-all min-w-0"
            :class="String(filters.employee_id) === String(person.employee_id) ? 'border-[#0C51D9] ring-1 ring-[#0C51D9]' : 'border-[#DCDEDD] hover:border-[#0C51D9]'"
          >
            <p class="flex items-center gap-1.5 text-xs font-semibold text-brand-dark truncate">
              <UserRound class="w-3.5 h-3.5 text-gray-400 shrink-0" /> {{ person.name }}
            </p>
            <p class="text-sm font-bold text-emerald-700 mt-1 truncate">{{ isBalanceVisible ? formatRupiah(person.total) : "Rp ••••••" }}</p>
            <p class="text-[11px] text-gray-400">{{ person.count }} {{ person.count === 1 ? "entry" : "entries" }}</p>
          </button>
        </div>
      </div>

      <!-- Filters: one row on desktop, stacked on phones. The Balance column
           stays the company-wide running balance whatever is filtered. -->
      <div class="mb-4 space-y-2.5">
        <div
          class="grid grid-cols-2 gap-2.5"
          :class="isSpendingTab ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]'"
        >
          <div class="relative col-span-2 lg:col-span-1">
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="filters.search"
              type="text"
              :placeholder="isSpendingTab ? 'Search description, notes, person...' : 'Search description, notes, project...'"
              class="cb-input"
              style="padding-left: 2.25rem"
            />
          </div>
          <div v-if="isSpendingTab" class="relative col-span-2 lg:col-span-1">
            <select v-model="filters.employee_id" class="select-soft w-full" aria-label="On behalf of">
              <option value="">Everyone</option>
              <option v-for="employee in employeeOptions" :key="employee.id" :value="employee.id">{{ employee.name }}</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <template v-else>
          <div class="relative col-span-2 lg:col-span-1">
            <select v-model="filters.project_id" class="select-soft w-full" aria-label="Project">
              <option value="">All projects</option>
              <option v-for="proj in projects" :key="proj.id" :value="proj.id">{{ proj.name }}</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <div class="relative">
            <select v-model="filters.type" class="select-soft w-full" aria-label="Type">
              <option value="">Debit & Credit</option>
              <option value="debit">Debit (In)</option>
              <option value="credit">Credit (Out)</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <div class="relative">
            <select v-model="filters.source" class="select-soft w-full" aria-label="Source">
              <option value="">All sources</option>
              <option value="manual">Manual</option>
              <option value="project">From projects</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          </template>
        </div>

        <div class="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 lg:w-[340px]">
            <input v-model="filters.start_date" type="date" class="cb-input" aria-label="From date" />
            <span class="text-xs text-gray-400">to</span>
            <input v-model="filters.end_date" type="date" :min="filters.start_date || undefined" class="cb-input" aria-label="To date" />
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="p in PERIODS"
              :key="p.key"
              type="button"
              class="px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              :class="activePeriod === p.key ? 'bg-blue-50 border-[#0C51D9] text-[#0C51D9]' : 'bg-white border-[#DCDEDD] text-gray-600 hover:border-[#0C51D9]'"
              @click="applyPeriod(p)"
            >
              {{ p.label }}
            </button>
            <button
              v-if="hasFilters"
              type="button"
              class="px-2.5 py-1.5 rounded-full text-xs font-semibold text-gray-500 hover:text-red-600 inline-flex items-center gap-1"
              @click="resetFilters"
            >
              <RotateCcw class="w-3 h-3" /> Reset
            </button>
          </div>
          <p v-if="hasFilters && !loading" class="text-xs text-gray-500 lg:ml-auto">{{ meta.total }} matching {{ meta.total === 1 ? "transaction" : "transactions" }}</p>
        </div>
      </div>

      <div v-if="loading" class="text-center py-8 text-xs text-gray-400">Loading transactions...</div>

      <div
        v-else-if="transactions.length === 0"
        class="text-center py-10 text-gray-500 bg-gray-100 rounded-[12px] border border-dashed border-[#DCDEDD]"
      >
        <Landmark class="w-9 h-9 text-gray-300 mx-auto mb-3" />
        <template v-if="hasFilters">
          <p class="text-sm font-semibold">No transactions match the filters</p>
          <button type="button" class="text-xs font-semibold text-[#0C51D9] hover:underline mt-1" @click="resetFilters">Reset filters</button>
        </template>
        <template v-else-if="isSpendingTab">
          <p class="text-sm font-semibold">No spending yet</p>
          <p class="text-xs text-gray-400">Record spending on behalf of an employee with Add Spending.</p>
        </template>
        <template v-else>
        <p class="text-sm font-semibold">No cash transactions yet</p>
        <p class="text-xs text-gray-400">
          Recording a transaction on any project's own Cash Ledger will automatically appear here too.
        </p>
        </template>
      </div>

      <div v-else class="overflow-x-auto rounded-[12px] border border-[#DCDEDD]">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">No</th>
              <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Date</th>
              <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Description</th>
              <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">{{ isSpendingTab ? "On behalf of" : "Source" }}</th>
              <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Debit</th>
              <th v-if="!isSpendingTab" class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Credit</th>
              <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Balance</th>
              <th v-if="canManage" class="px-3 py-2.5 text-center text-xs uppercase text-gray-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(transaction, index) in displayedTransactions"
              :key="transaction.id"
              class="border-t border-[#DCDEDD] hover:bg-gray-50/60"
            >
              <td class="px-3 py-2.5 text-gray-500">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</td>
              <td class="px-3 py-2.5 text-gray-500 whitespace-nowrap">{{ formatDate(transaction.transaction_date) }}</td>
              <td class="px-3 py-2.5">
                <p class="text-brand-dark font-medium">{{ transaction.description }}</p>
                <p v-if="transaction.notes" class="text-gray-400 text-xs mt-0.5">{{ transaction.notes }}</p>
                <button
                  v-if="transaction.proof"
                  type="button"
                  class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0C51D9] hover:underline"
                  @click="openProof(transaction.proof)"
                >
                  <Paperclip class="w-3 h-3" /> View proof
                </button>
              </td>
              <td class="px-3 py-2.5">
                <span
                  v-if="transaction.category === 'spending'"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 whitespace-nowrap"
                  :title="`Spending on behalf of ${transaction.employee?.name || 'an employee'}`"
                >
                  <Wallet v-if="!isSpendingTab" class="w-3 h-3" />
                  <UserRound v-else class="w-3 h-3" />
                  {{ isSpendingTab ? transaction.employee?.name || "-" : `Spending · ${transaction.employee?.name || "-"}` }}
                </span>
                <span
                  v-else-if="transaction.is_synced"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-600"
                  :title="`Auto-synced from ${transaction.project_name}'s cash ledger`"
                >
                  <Link2 class="w-3 h-3" />
                  {{ transaction.project_name }}
                </span>
                <span v-else class="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
                  Manual
                </span>
              </td>
              <td class="px-3 py-2.5 text-right text-emerald-600 text-xs sm:text-sm">
                <span v-if="transaction.type === 'debit'" class="inline-flex items-center gap-1 justify-end">
                  <ArrowUpCircle class="w-3.5 h-3.5" />
                  {{ isBalanceVisible ? formatRupiah(transaction.amount) : "Rp ••••••" }}
                </span>
              </td>
              <td v-if="!isSpendingTab" class="px-3 py-2.5 text-right text-red-600 text-xs sm:text-sm">
                <span v-if="transaction.type === 'credit'" class="inline-flex items-center gap-1 justify-end">
                  <ArrowDownCircle class="w-3.5 h-3.5" />
                  {{ isBalanceVisible ? formatRupiah(transaction.amount) : "Rp ••••••" }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-right font-semibold text-brand-dark whitespace-nowrap text-xs sm:text-sm">
                {{ isBalanceVisible ? formatRupiah(transaction.balance) : "Rp ••••••" }}
              </td>
              <td v-if="canManage" class="px-3 py-2.5">
                <div v-if="!transaction.is_synced" class="flex justify-center gap-1">
                  <button
                    @click="openEditModal(transaction)"
                    class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                    title="Edit"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    @click="confirmDelete(transaction)"
                    class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
                <p v-else class="text-center text-xs text-gray-400" title="Edit this from the project's own Cash Ledger">
                  via Project
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination
        v-if="!loading && transactions.length > 0"
        :meta="meta"
        :loading="loading"
        item-label="transactions"
        @page-change="fetchData"
        @per-page-change="handlePerPageChange"
      />
    </div>

    <!-- FORM MODAL -->
    <Transition name="fade">
      <div v-if="isFormModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-5">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="closeFormModal"></div>

        <div class="bg-white rounded-[14px] p-6 w-full max-w-md relative z-10 shadow-2xl">
          <button @click="closeFormModal" class="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600">
            <X class="w-4 h-4" />
          </button>

          <h3 class="text-base font-bold text-brand-dark mb-4">
            {{ isSpendingForm ? (editingId ? "Edit Spending" : "Add Spending") : editingId ? "Edit Transaction" : "Add Cash Transaction" }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Spending: on whose behalf; always recorded as Debit -->
            <div v-if="isSpendingForm">
              <label class="text-xs font-semibold text-brand-dark mb-1.5 block">
                On behalf of <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <select
                  v-model="form.employee_id"
                  class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-lg text-sm bg-white appearance-none focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
                >
                  <option value="" disabled>Choose an employee</option>
                  <option v-for="employee in employeeOptions" :key="employee.id" :value="employee.id">{{ employee.name }}</option>
                </select>
                <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              <p class="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                <ArrowUpCircle class="w-3 h-3 text-emerald-600" /> Recorded as Debit in the cash book.
              </p>
            </div>

            <div v-else>
              <label class="text-xs font-semibold text-brand-dark mb-1.5 block">Type</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="form.type = 'debit'"
                  class="px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all"
                  :class="form.type === 'debit' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-[#DCDEDD] text-gray-500'"
                >
                  Debit (In)
                </button>
                <button
                  type="button"
                  @click="form.type = 'credit'"
                  class="px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all"
                  :class="form.type === 'credit' ? 'border-red-400 bg-red-50 text-red-700' : 'border-[#DCDEDD] text-gray-500'"
                >
                  Credit (Out)
                </button>
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-brand-dark mb-1.5 block">
                Description <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.description"
                type="text"
:placeholder="isSpendingForm ? 'e.g. Taxi to client meeting' : 'e.g. Consulting income'"
                class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-semibold text-brand-dark mb-1.5 block">
                  Amount (Rp) <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="form.amount"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
                />
              </div>
              <div>
                <label class="text-xs font-semibold text-brand-dark mb-1.5 block">
                  Date <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.transaction_date"
                  type="date"
                  class="w-full h-[42px] px-3.5 py-2.5 border border-[#DCDEDD] rounded-lg text-base sm:text-sm appearance-none focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
                />
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-brand-dark mb-1.5 block">Notes</label>
              <textarea
                v-model="form.notes"
                rows="2"
                placeholder="Optional notes"
                class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none resize-none"
              ></textarea>
            </div>

            <!-- Proof of transaction -->
            <div>
              <label class="text-xs font-semibold text-brand-dark mb-1.5 block">
                Proof of transaction <span class="text-gray-400 font-normal">(optional)</span>
              </label>

              <!-- New file picked -->
              <div v-if="form.proof" class="flex items-center gap-3 p-2.5 border border-[#DCDEDD] rounded-lg">
                <img v-if="proofPreviewUrl" :src="proofPreviewUrl" alt="Preview" class="w-12 h-12 rounded-md object-cover border border-[#EEF0F2]" />
                <div v-else class="w-12 h-12 rounded-md bg-red-50 flex items-center justify-center shrink-0"><FileText class="w-5 h-5 text-red-600" /></div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-brand-dark font-medium truncate">{{ form.proof.name }}</p>
                  <p class="text-xs text-gray-400">Uploaded when you save</p>
                </div>
                <button type="button" class="text-xs font-semibold text-gray-500 hover:text-red-600" @click="clearNewProof">Cancel</button>
              </div>

              <!-- Proof already saved on this transaction -->
              <div v-else-if="existingProof && !form.remove_proof" class="flex items-center gap-3 p-2.5 border border-[#DCDEDD] rounded-lg">
                <img v-if="existingProof.is_image" :src="existingProof.url" alt="Proof" class="w-12 h-12 rounded-md object-cover border border-[#EEF0F2]" />
                <div v-else class="w-12 h-12 rounded-md bg-red-50 flex items-center justify-center shrink-0"><FileText class="w-5 h-5 text-red-600" /></div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-brand-dark font-medium truncate">{{ existingProof.name || "Proof of transaction" }}</p>
                  <button type="button" class="text-xs font-semibold text-[#0C51D9] hover:underline" @click="openProof(existingProof)">View</button>
                </div>
                <button type="button" class="text-xs font-semibold text-gray-500 hover:text-[#0C51D9]" @click="proofInput?.click()">Replace</button>
                <button type="button" class="text-xs font-semibold text-gray-500 hover:text-red-600" @click="removeExistingProof">Remove</button>
              </div>

              <!-- Nothing attached -->
              <button
                v-else
                type="button"
                class="w-full flex items-center justify-center gap-2 px-3.5 py-3 border border-dashed border-[#DCDEDD] rounded-lg text-sm text-gray-500 hover:border-[#0C51D9] hover:text-[#0C51D9] transition"
                @click="proofInput?.click()"
              >
                <Upload class="w-4 h-4" /> Upload proof (JPG, PNG, WEBP, PDF · max 5 MB)
              </button>
              <p v-if="existingProof && form.remove_proof && !form.proof" class="text-xs text-gray-500 mt-1">
                The current proof will be removed when you save.
                <button type="button" class="font-semibold text-[#0C51D9] hover:underline" @click="form.remove_proof = false">Undo</button>
              </p>
              <input ref="proofInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="hidden" @change="onProofSelected" />
            </div>

            <p v-if="formError" class="text-red-500 text-xs">{{ formError }}</p>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                @click="closeFormModal"
                class="px-4 py-3 rounded-lg border border-[#DCDEDD] text-sm font-semibold text-brand-dark hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-3 rounded-lg bg-[#0C51D9] text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {{ saving ? "Saving..." : "Save" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- PROOF VIEWER (kept small) -->
    <Transition name="fade">
      <div v-if="viewingProof" class="fixed inset-0 z-[100] flex items-center justify-center p-5">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="viewingProof = null"></div>
        <div class="relative bg-white rounded-[14px] w-full max-w-sm p-4 shadow-xl">
          <button @click="viewingProof = null" class="absolute right-3 top-3 text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
          <p class="text-brand-dark text-sm font-bold mb-0.5">Proof of transaction</p>
          <p class="text-xs text-gray-400 truncate pr-6 mb-3">{{ viewingProof.name }}</p>

          <div v-if="viewingProof.is_image" class="bg-gray-50 border border-[#EEF0F2] rounded-lg flex items-center justify-center p-2">
            <img :src="viewingProof.url" :alt="viewingProof.name" class="max-w-full object-contain rounded" style="max-height: 320px" />
          </div>
          <div v-else class="bg-gray-50 border border-[#EEF0F2] rounded-lg flex flex-col items-center justify-center py-8">
            <FileText class="w-10 h-10 text-red-600 mb-2" />
            <p class="text-xs text-gray-500">PDF document</p>
          </div>

          <a
            :href="viewingProof.url"
            target="_blank"
            rel="noopener"
            class="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCDEDD] text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition"
          >
            <ExternalLink class="w-4 h-4" /> {{ viewingProof.is_image ? "Open full size" : "Open PDF" }}
          </a>
        </div>
      </div>
    </Transition>

    <!-- OPENING BALANCE MODAL -->
    <Transition name="fade">
      <div v-if="isBalanceModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-5">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="isBalanceModalOpen = false"></div>

        <div class="bg-white rounded-[14px] p-6 w-full max-w-sm relative z-10 shadow-2xl">
          <button @click="isBalanceModalOpen = false" class="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600">
            <X class="w-4 h-4" />
          </button>

          <h3 class="text-base font-bold text-brand-dark mb-4">Set Opening Balance</h3>

          <form @submit.prevent="handleBalanceSubmit" class="space-y-4">
            <div>
              <label class="text-xs font-semibold text-brand-dark mb-1.5 block">Opening Balance (Rp)</label>
              <input
                v-model.number="balanceDraft"
                type="number"
                min="0"
                class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
              />
            </div>

            <p v-if="balanceError" class="text-red-500 text-xs">{{ balanceError }}</p>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                @click="isBalanceModalOpen = false"
                class="px-4 py-3 rounded-lg border border-[#DCDEDD] text-sm font-semibold text-brand-dark hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-3 rounded-lg bg-[#0C51D9] text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {{ saving ? "Saving..." : "Save" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- DELETE MODAL -->
    <Transition name="fade">
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-5">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="isDeleteModalOpen = false"></div>

        <div class="bg-white rounded-[18px] p-6 w-full max-w-sm relative z-10 shadow-2xl">
          <button @click="isDeleteModalOpen = false" class="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600">
            <X class="w-4 h-4" />
          </button>

          <div class="text-center">
            <div class="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle class="w-7 h-7 text-red-500" />
            </div>

            <h3 class="text-base font-bold text-brand-dark mb-2">{{ transactionToDelete?.category === 'spending' ? "Delete Spending?" : "Delete Transaction?" }}</h3>
            <p class="text-gray-500 text-sm mb-6">
              Are you sure you want to delete
              <span class="font-bold text-brand-dark">"{{ transactionToDelete?.description }}"</span>?
              This action cannot be undone.
            </p>

            <div class="grid grid-cols-2 gap-3">
              <button
                @click="isDeleteModalOpen = false"
                class="px-4 py-3 rounded-lg border border-[#DCDEDD] text-sm font-semibold text-brand-dark hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                @click="handleDelete"
                :disabled="isDeleting"
                class="px-4 py-3 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <Trash2 v-if="!isDeleting" class="w-3.5 h-3.5" />
                {{ isDeleting ? "Deleting..." : "Yes, Delete" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cb-input { width: 100%; border: 1px solid #dcdedd; border-radius: 8px; padding: 7px 12px; font-size: 13px; background: #fff; color: #0f172a; outline: none; min-height: 40px; }
.cb-input:hover { border-color: #93c5fd; }
.cb-input:focus { border-color: #0c51d9; }
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
