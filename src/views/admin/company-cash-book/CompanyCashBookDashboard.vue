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
  closingBalance,
  meta,
  loading,
  saving,
} = storeToRefs(store);

const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);

const canManage = computed(() => can("company-cash-book-create"));

// ===== Filters =====
const emptyFilters = () => ({ search: "", project_id: "", type: "", source: "", start_date: "", end_date: "" });
const filters = ref(emptyFilters());
const hasFilters = computed(() => Object.values(filters.value).some(Boolean));
const resetFilters = () => (filters.value = emptyFilters());

// Quick ranges for the date filter (WIB calendar days).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const PERIODS = [
  { key: "this_month", label: "Bulan ini", range: (n) => [new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)] },
  { key: "last_month", label: "Bulan lalu", range: (n) => [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)] },
  { key: "this_year", label: "Tahun ini", range: (n) => [new Date(n.getFullYear(), 0, 1), new Date(n.getFullYear(), 11, 31)] },
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
  store.fetchAll({
    search: f.search.trim() || undefined,
    project_id: f.project_id || undefined,
    type: f.type || undefined,
    source: f.source || undefined,
    start_date: f.start_date || undefined,
    end_date: f.end_date && (!f.start_date || f.end_date >= f.start_date) ? f.end_date : undefined,
    page,
    row_per_page: rowPerPage || meta.value.per_page || 15,
  });
};

const refetch = debounce(() => fetchData(1), 300);
watch(filters, refetch, { deep: true });

const handlePerPageChange = (rowPerPage) => {
  fetchData(1, rowPerPage);
};

const isFormModalOpen = ref(false);
const editingId = ref(null);
const isDeleteModalOpen = ref(false);
const transactionToDelete = ref(null);
const isDeleting = ref(false);
const formError = ref("");

const emptyForm = () => ({
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
    formError.value = "Bukti transaksi harus berupa JPG, PNG, WEBP, atau PDF.";
    return;
  }
  if (file.size > PROOF_MAX_BYTES) {
    formError.value = "Ukuran bukti transaksi maksimal 5 MB.";
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

const openCreateModal = () => {
  editingId.value = null;
  form.value = emptyForm();
  existingProof.value = null;
  resetProofPreview();
  formError.value = "";
  isFormModalOpen.value = true;
};

const openEditModal = (transaction) => {
  editingId.value = transaction.id;
  form.value = {
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

  // Only send proof fields that actually change something.
  const { proof, remove_proof, ...fields } = form.value;
  const payload = { ...fields };
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
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// "Updated 21 Okt 2026, 14.05 WIB · by Rina" under Saldo Awal.
const openingBalanceStamp = computed(() => {
  if (!openingBalanceUpdatedAt.value) return null;
  const date = new Date(openingBalanceUpdatedAt.value);
  const text = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return { text: `${text} WIB`, by: openingBalanceUpdatedBy.value, full: date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) };
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
});

// Hidden by default -- balance figures are sensitive, revealed only on demand.
const isBalanceVisible = ref(false);
</script>

<template>
  <div class="px-0.5 py-1 sm:px-4 sm:py-4">
    <div class="bg-white mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
      <div class="flex items-center gap-2 w-full sm:w-auto">
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
          @click="openCreateModal"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center justify-center gap-2 flex-1 sm:flex-none"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-xs font-semibold">Add Transaction</span>
        </button>
      </div>
    </div>

    <!-- Saldo summary -->
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
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div class="bg-gray-50 border border-[#DCDEDD] rounded-[10px] p-3.5 min-w-0">
        <p class="text-brand-light text-xs">Saldo Awal</p>
        <p class="text-brand-dark text-xs sm:text-sm font-bold mt-1 truncate">
          {{ isBalanceVisible ? formatRupiah(openingBalance) : "Rp ••••••" }}
        </p>
        <p
          class="text-[10px] sm:text-[11px] text-gray-500 mt-1 flex items-start gap-1 leading-snug"
          :title="openingBalanceStamp ? `Terakhir diperbarui ${openingBalanceStamp.full}${openingBalanceStamp.by ? ' oleh ' + openingBalanceStamp.by : ''}` : ''"
        >
          <History class="w-3 h-3 shrink-0 mt-px" />
          <span v-if="openingBalanceStamp" class="min-w-0">
            Diperbarui {{ openingBalanceStamp.text }}<span v-if="openingBalanceStamp.by" class="hidden sm:inline"> · {{ openingBalanceStamp.by }}</span>
          </span>
          <span v-else>Belum pernah diatur</span>
        </p>
      </div>
      <div class="bg-emerald-50 border border-emerald-100 rounded-[10px] p-3.5">
        <p class="text-emerald-600 text-xs">Total Debit (Masuk)<span v-if="hasFilters" class="opacity-70"> · filtered</span></p>
        <p class="text-emerald-700 text-xs sm:text-sm font-bold mt-1 truncate">
          {{ isBalanceVisible ? formatRupiah(totalDebit) : "Rp ••••••" }}
        </p>
      </div>
      <div class="bg-red-50 border border-red-100 rounded-[10px] p-3.5">
        <p class="text-red-600 text-xs">Total Kredit (Keluar)<span v-if="hasFilters" class="opacity-70"> · filtered</span></p>
        <p class="text-red-700 text-xs sm:text-sm font-bold mt-1 truncate">
          {{ isBalanceVisible ? formatRupiah(totalCredit) : "Rp ••••••" }}
        </p>
      </div>
      <div class="bg-blue-50 border border-blue-100 rounded-[10px] p-3.5">
        <p class="text-blue-600 text-xs">Saldo Akhir</p>
        <p class="text-blue-700 text-xs sm:text-sm font-bold mt-1 truncate">
          {{ isBalanceVisible ? formatRupiah(closingBalance) : "Rp ••••••" }}
        </p>
      </div>
    </div>

    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 sm:p-6">
      <!-- Filters: one row on desktop, stacked on phones. The Saldo column
           stays the company-wide running balance whatever is filtered. -->
      <div class="mb-4 space-y-2.5">
        <div class="grid grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] gap-2.5">
          <div class="relative col-span-2 lg:col-span-1">
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input v-model="filters.search" type="text" placeholder="Cari keterangan, catatan, project..." class="cb-input" style="padding-left: 2.25rem" />
          </div>
          <div class="relative col-span-2 lg:col-span-1">
            <select v-model="filters.project_id" class="select-soft w-full" aria-label="Project">
              <option value="">Semua Project</option>
              <option v-for="proj in projects" :key="proj.id" :value="proj.id">{{ proj.name }}</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <div class="relative">
            <select v-model="filters.type" class="select-soft w-full" aria-label="Jenis">
              <option value="">Debit & Kredit</option>
              <option value="debit">Debit (Masuk)</option>
              <option value="credit">Kredit (Keluar)</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <div class="relative">
            <select v-model="filters.source" class="select-soft w-full" aria-label="Sumber">
              <option value="">Semua Sumber</option>
              <option value="manual">Manual</option>
              <option value="project">Dari Project</option>
            </select>
            <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div class="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 lg:w-[340px]">
            <input v-model="filters.start_date" type="date" class="cb-input" aria-label="Dari tanggal" />
            <span class="text-xs text-gray-400">s/d</span>
            <input v-model="filters.end_date" type="date" :min="filters.start_date || undefined" class="cb-input" aria-label="Sampai tanggal" />
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
          <p v-if="hasFilters && !loading" class="text-xs text-gray-500 lg:ml-auto">{{ meta.total }} transaksi cocok</p>
        </div>
      </div>

      <div v-if="loading" class="text-center py-8 text-xs text-gray-400">Loading transactions...</div>

      <div
        v-else-if="transactions.length === 0"
        class="text-center py-10 text-gray-500 bg-gray-100 rounded-[12px] border border-dashed border-[#DCDEDD]"
      >
        <Landmark class="w-9 h-9 text-gray-300 mx-auto mb-3" />
        <template v-if="hasFilters">
          <p class="text-sm font-semibold">Tidak ada transaksi yang cocok dengan filter</p>
          <button type="button" class="text-xs font-semibold text-[#0C51D9] hover:underline mt-1" @click="resetFilters">Reset filter</button>
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
              <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Tanggal</th>
              <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Keterangan</th>
              <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Sumber</th>
              <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Debit</th>
              <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Kredit</th>
              <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Saldo</th>
              <th v-if="canManage" class="px-3 py-2.5 text-center text-xs uppercase text-gray-500 font-semibold">Aksi</th>
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
                  <Paperclip class="w-3 h-3" /> Lihat bukti
                </button>
              </td>
              <td class="px-3 py-2.5">
                <span
                  v-if="transaction.is_synced"
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
              <td class="px-3 py-2.5 text-right text-red-600 text-xs sm:text-sm">
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
            {{ editingId ? "Edit Transaction" : "Add Cash Transaction" }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="text-xs font-semibold text-brand-dark mb-1.5 block">Type</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="form.type = 'debit'"
                  class="px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all"
                  :class="form.type === 'debit' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-[#DCDEDD] text-gray-500'"
                >
                  Debit (Masuk)
                </button>
                <button
                  type="button"
                  @click="form.type = 'credit'"
                  class="px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all"
                  :class="form.type === 'credit' ? 'border-red-400 bg-red-50 text-red-700' : 'border-[#DCDEDD] text-gray-500'"
                >
                  Kredit (Keluar)
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
                placeholder="e.g. Pendapatan konsultasi"
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
                Bukti Transaksi <span class="text-gray-400 font-normal">(opsional)</span>
              </label>

              <!-- New file picked -->
              <div v-if="form.proof" class="flex items-center gap-3 p-2.5 border border-[#DCDEDD] rounded-lg">
                <img v-if="proofPreviewUrl" :src="proofPreviewUrl" alt="Pratinjau" class="w-12 h-12 rounded-md object-cover border border-[#EEF0F2]" />
                <div v-else class="w-12 h-12 rounded-md bg-red-50 flex items-center justify-center shrink-0"><FileText class="w-5 h-5 text-red-600" /></div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-brand-dark font-medium truncate">{{ form.proof.name }}</p>
                  <p class="text-xs text-gray-400">Akan diunggah saat disimpan</p>
                </div>
                <button type="button" class="text-xs font-semibold text-gray-500 hover:text-red-600" @click="clearNewProof">Batal</button>
              </div>

              <!-- Proof already saved on this transaction -->
              <div v-else-if="existingProof && !form.remove_proof" class="flex items-center gap-3 p-2.5 border border-[#DCDEDD] rounded-lg">
                <img v-if="existingProof.is_image" :src="existingProof.url" alt="Bukti" class="w-12 h-12 rounded-md object-cover border border-[#EEF0F2]" />
                <div v-else class="w-12 h-12 rounded-md bg-red-50 flex items-center justify-center shrink-0"><FileText class="w-5 h-5 text-red-600" /></div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-brand-dark font-medium truncate">{{ existingProof.name || "Bukti transaksi" }}</p>
                  <button type="button" class="text-xs font-semibold text-[#0C51D9] hover:underline" @click="openProof(existingProof)">Lihat</button>
                </div>
                <button type="button" class="text-xs font-semibold text-gray-500 hover:text-[#0C51D9]" @click="proofInput?.click()">Ganti</button>
                <button type="button" class="text-xs font-semibold text-gray-500 hover:text-red-600" @click="removeExistingProof">Hapus</button>
              </div>

              <!-- Nothing attached -->
              <button
                v-else
                type="button"
                class="w-full flex items-center justify-center gap-2 px-3.5 py-3 border border-dashed border-[#DCDEDD] rounded-lg text-sm text-gray-500 hover:border-[#0C51D9] hover:text-[#0C51D9] transition"
                @click="proofInput?.click()"
              >
                <Upload class="w-4 h-4" /> Unggah bukti (JPG, PNG, WEBP, PDF · maks. 5 MB)
              </button>
              <p v-if="existingProof && form.remove_proof && !form.proof" class="text-xs text-gray-500 mt-1">
                Bukti lama akan dihapus saat disimpan.
                <button type="button" class="font-semibold text-[#0C51D9] hover:underline" @click="form.remove_proof = false">Urungkan</button>
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
          <p class="text-brand-dark text-sm font-bold mb-0.5">Bukti Transaksi</p>
          <p class="text-xs text-gray-400 truncate pr-6 mb-3">{{ viewingProof.name }}</p>

          <div v-if="viewingProof.is_image" class="bg-gray-50 border border-[#EEF0F2] rounded-lg flex items-center justify-center p-2">
            <img :src="viewingProof.url" :alt="viewingProof.name" class="max-w-full object-contain rounded" style="max-height: 320px" />
          </div>
          <div v-else class="bg-gray-50 border border-[#EEF0F2] rounded-lg flex flex-col items-center justify-center py-8">
            <FileText class="w-10 h-10 text-red-600 mb-2" />
            <p class="text-xs text-gray-500">Dokumen PDF</p>
          </div>

          <a
            :href="viewingProof.url"
            target="_blank"
            rel="noopener"
            class="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCDEDD] text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition"
          >
            <ExternalLink class="w-4 h-4" /> {{ viewingProof.is_image ? "Buka ukuran penuh" : "Buka PDF" }}
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

            <h3 class="text-base font-bold text-brand-dark mb-2">Delete Transaction?</h3>
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
