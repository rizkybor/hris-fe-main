<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Landmark, Plus, Trash2 } from "lucide-vue-next";
import { useBankAccountStore } from "@/stores/bankAccount";
import { useAlertModalStore } from "@/stores/alertModal";
import Pagination from "@/components/common/Pagination.vue";

const PER_PAGE = 10;

const store = useBankAccountStore();
const alertModal = useAlertModalStore();
const { bankAccounts } = storeToRefs(store);

const newBankAccount = ref({ bank_name: "", bank_code: "", account_number: "", swift_code: "" });
const errorMessage = ref("");

// Short enough to fetch in full (also needed in full by the Invoice form's
// Bank Name dropdown), so paginate client-side rather than add a second
// paginated endpoint -- same approach as Letter & Division Codes.
const page = ref(1);

const paginate = (items, p) => ({
  items: items.slice((p - 1) * PER_PAGE, p * PER_PAGE),
  meta: {
    current_page: p,
    last_page: Math.max(1, Math.ceil(items.length / PER_PAGE)),
    per_page: PER_PAGE,
    total: items.length,
    from: items.length === 0 ? 0 : (p - 1) * PER_PAGE + 1,
    to: Math.min(p * PER_PAGE, items.length),
  },
});

const paginatedBankAccounts = computed(() => paginate(bankAccounts.value, page.value));

onMounted(() => store.fetchBankAccounts());

const handleAdd = async () => {
  errorMessage.value = "";
  if (!newBankAccount.value.bank_name || !newBankAccount.value.account_number) return;
  try {
    await store.createBankAccount({
      bank_name: newBankAccount.value.bank_name,
      bank_code: newBankAccount.value.bank_code || null,
      account_number: newBankAccount.value.account_number,
      swift_code: newBankAccount.value.swift_code || null,
    });
    newBankAccount.value = { bank_name: "", bank_code: "", account_number: "", swift_code: "" };
    // New entries are appended at the end of the list, so jump forward to
    // wherever it actually landed instead of back to page 1.
    page.value = paginatedBankAccounts.value.meta.last_page;
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Failed to add bank account.";
  }
};

const handleDelete = async (id) => {
  if (!(await alertModal.confirm("Delete this bank account?"))) return;
  await store.deleteBankAccount(id);
  if (page.value > paginatedBankAccounts.value.meta.last_page) {
    page.value = paginatedBankAccounts.value.meta.last_page;
  }
};
</script>

<template>
  <div class="px-4 py-4">
    <div class="bg-white mb-5">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Landmark class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Bank Accounts</h3>
          <p class="text-brand-light text-sm">Bank name and account number choices used in Invoice's Payment & Tax section</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-red-500 text-sm mb-4">{{ errorMessage }}</p>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 max-w-2xl">
      <form @submit.prevent="handleAdd" class="mb-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Bank Name</label>
            <input v-model="newBankAccount.bank_name" type="text" placeholder="e.g. BCA - Jendela Cakra Digital" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Bank Code (optional)</label>
            <input v-model="newBankAccount.bank_code" type="text" placeholder="e.g. 014" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Account Number</label>
            <input v-model="newBankAccount.account_number" type="text" placeholder="e.g. 1234567890" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Swift Code (optional)</label>
            <input v-model="newBankAccount.swift_code" type="text" placeholder="e.g. CENAIDJA" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
        </div>
        <button type="submit" class="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0C51D9] text-white rounded-lg text-sm font-semibold">
          <Plus class="w-4 h-4" /> Add Bank Account
        </button>
      </form>

      <div class="space-y-2">
        <div v-for="account in paginatedBankAccounts.items" :key="account.id" class="flex items-center justify-between p-3 border border-[#DCDEDD] rounded-lg">
          <div>
            <span class="font-semibold text-brand-dark text-sm">{{ account.bank_name }}</span>
            <span v-if="account.bank_code" class="text-brand-light text-xs ml-1.5">({{ account.bank_code }})</span>
            <span class="text-brand-light text-sm ml-2">{{ account.account_number }}</span>
            <span v-if="account.swift_code" class="text-brand-light text-xs ml-2">SWIFT: {{ account.swift_code }}</span>
          </div>
          <button @click="handleDelete(account.id)" class="text-gray-400 hover:text-red-600">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
        <div v-if="bankAccounts.length === 0" class="text-center py-6 text-sm text-gray-400">
          No bank accounts yet
        </div>
      </div>

      <Pagination
        :meta="paginatedBankAccounts.meta"
        item-label="bank accounts"
        @page-change="(p) => (page = p)"
      />
    </div>
  </div>
</template>
