<script setup>
import { onMounted, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-vue-next";
import { useProjectCashTransactionStore } from "@/stores/projectCashTransaction";
import { formatRupiah } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";

const props = defineProps({
  projectId: {
    type: [String, Number],
    required: true,
  },
  // Recording/editing/deleting is restricted to the Project Leader (or a
  // manager/superadmin) -- the backend enforces the same rule independently
  // (see ProjectCashTransactionController::canManage()), this just keeps
  // the UI from offering controls that would be rejected anyway.
  canManage: {
    type: Boolean,
    default: false,
  },
});

const store = useProjectCashTransactionStore();
const {
  transactions,
  openingBalance,
  totalDebit,
  totalCredit,
  closingBalance,
  loading,
  saving,
} = storeToRefs(store);

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
});

const form = ref(emptyForm());

const openCreateModal = () => {
  editingId.value = null;
  form.value = emptyForm();
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
  };
  formError.value = "";
  isFormModalOpen.value = true;
};

const closeFormModal = () => {
  isFormModalOpen.value = false;
};

const handleSubmit = async () => {
  formError.value = "";

  if (!form.value.description || !form.value.amount || !form.value.transaction_date) {
    formError.value = "Description, amount, and date are required.";
    return;
  }

  try {
    if (editingId.value) {
      await store.updateTransaction(editingId.value, props.projectId, form.value);
    } else {
      await store.createTransaction({ ...form.value, project_id: props.projectId });
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
    await store.deleteTransaction(transactionToDelete.value.id, props.projectId);
    isDeleteModalOpen.value = false;
    transactionToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};

// Newest first for reading, even though the store returns them oldest
// first (chronological order is what the running-balance math needs).
const displayedTransactions = computed(() => [...transactions.value].reverse());

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

onMounted(() => {
  store.fetchByProject(props.projectId);
});
</script>

<template>
  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 mb-5">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 rounded-[10px] flex items-center justify-center shrink-0">
          <Wallet class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-base sm:text-lg font-bold">Project Cash Ledger</h3>
          <p class="text-brand-light text-xs font-normal">
            Debit/credit against the project's budget, only the Project Leader can record entries
          </p>
        </div>
      </div>

      <button
        v-if="can('project-expense-create') && canManage"
        @click="openCreateModal"
        class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-xs font-semibold">Add Transaction</span>
      </button>
    </div>

    <!-- Saldo summary -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div class="bg-gray-200 border border-[#DCDEDD] rounded-[10px] p-3.5">
        <p class="text-brand-light text-xs">Saldo Awal (Budget)</p>
        <p class="text-brand-dark text-sm font-bold mt-1 truncate">{{ formatRupiah(openingBalance) }}</p>
      </div>
      <div class="bg-emerald-50 border border-emerald-100 rounded-[10px] p-3.5">
        <p class="text-emerald-600 text-xs">Total Debit (Masuk)</p>
        <p class="text-emerald-700 text-sm font-bold mt-1 truncate">{{ formatRupiah(totalDebit) }}</p>
      </div>
      <div class="bg-red-50 border border-red-100 rounded-[10px] p-3.5">
        <p class="text-red-600 text-xs">Total Kredit (Keluar)</p>
        <p class="text-red-700 text-sm font-bold mt-1 truncate">{{ formatRupiah(totalCredit) }}</p>
      </div>
      <div class="bg-blue-50 border border-blue-100 rounded-[10px] p-3.5">
        <p class="text-blue-600 text-xs">Saldo Akhir</p>
        <p class="text-blue-700 text-sm font-bold mt-1 truncate">{{ formatRupiah(closingBalance) }}</p>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-xs text-gray-400">Loading transactions...</div>

    <div
      v-else-if="transactions.length === 0"
      class="text-center py-10 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD]"
    >
      <Wallet class="w-9 h-9 text-gray-300 mx-auto mb-3" />
      <p class="text-sm font-semibold">No cash transactions yet</p>
      <p class="text-xs text-gray-400">
        The ledger starts at the project's budget -- record debit (extra funding) or credit (spending) entries here.
      </p>
    </div>

    <div v-else class="overflow-x-auto rounded-[12px] border border-[#DCDEDD]">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Tanggal</th>
            <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Keterangan</th>
            <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Debit</th>
            <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Kredit</th>
            <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Saldo</th>
            <th v-if="canManage" class="px-3 py-2.5 text-center text-xs uppercase text-gray-500 font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="transaction in displayedTransactions"
            :key="transaction.id"
            class="border-t border-[#DCDEDD] hover:bg-gray-50/60"
          >
            <td class="px-3 py-2.5 text-gray-500 whitespace-nowrap">{{ formatDate(transaction.transaction_date) }}</td>
            <td class="px-3 py-2.5">
              <p class="text-brand-dark font-medium">{{ transaction.description }}</p>
              <p v-if="transaction.notes" class="text-gray-400 text-xs mt-0.5">{{ transaction.notes }}</p>
            </td>
            <td class="px-3 py-2.5 text-right text-emerald-600">
              <span v-if="transaction.type === 'debit'" class="inline-flex items-center gap-1 justify-end">
                <ArrowUpCircle class="w-3.5 h-3.5" />
                {{ formatRupiah(transaction.amount) }}
              </span>
            </td>
            <td class="px-3 py-2.5 text-right text-red-600">
              <span v-if="transaction.type === 'credit'" class="inline-flex items-center gap-1 justify-end">
                <ArrowDownCircle class="w-3.5 h-3.5" />
                {{ formatRupiah(transaction.amount) }}
              </span>
            </td>
            <td class="px-3 py-2.5 text-right font-semibold text-brand-dark whitespace-nowrap">
              {{ formatRupiah(transaction.balance) }}
            </td>
            <td v-if="canManage" class="px-3 py-2.5">
              <div class="flex justify-center gap-1">
                <button
                  v-if="can('project-expense-edit')"
                  @click="openEditModal(transaction)"
                  class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Edit"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <button
                  v-if="can('project-expense-delete')"
                  @click="confirmDelete(transaction)"
                  class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
                placeholder="e.g. Sewa server bulanan"
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
