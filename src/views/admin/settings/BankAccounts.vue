<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Landmark, Plus, Trash2, ArrowLeft } from "lucide-vue-next";
import { useBankAccountStore } from "@/stores/bankAccount";
import { useAlertModalStore } from "@/stores/alertModal";
import Pagination from "@/components/common/Pagination.vue";
import { UiButton, UiEmpty, UiInput, UiPageHeader, UiTable } from "@/components/ui";

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

// Presentation only.
const accountColumns = [
  { key: "bank_name", label: "Bank" },
  { key: "account_number", label: "Account number" },
  { key: "swift_code", label: "SWIFT" },
  { key: "actions", label: "", align: "right", width: 64 },
];

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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Bank Accounts" subtitle="Bank name and account number choices used in Invoice's Payment & Tax section">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" aria-label="Back to Settings" title="Back to Settings">
          <ArrowLeft class="w-4 h-4" /> Settings
        </router-link>
      </template>
    </UiPageHeader>

    <p v-if="errorMessage" class="text-ui-small text-ui-bad">{{ errorMessage }}</p>

    <div class="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
      <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 ui-anim-fade-up">
        <h2 class="text-ui-h2 text-ui-ink">Add bank account</h2>
        <p class="text-ui-cap text-ui-muted mt-0.5 mb-4">Shown in the Invoice form's Bank Name dropdown.</p>
        <form @submit.prevent="handleAdd" class="space-y-3">
          <UiInput v-model="newBankAccount.bank_name" label="Bank Name" placeholder="e.g. BCA - Jendela Cakra Digital" />
          <div class="grid grid-cols-2 gap-3">
            <UiInput v-model="newBankAccount.bank_code" label="Bank Code (optional)" placeholder="e.g. 014" />
            <UiInput v-model="newBankAccount.swift_code" label="Swift Code (optional)" placeholder="e.g. CENAIDJA" />
          </div>
          <UiInput v-model="newBankAccount.account_number" label="Account Number" placeholder="e.g. 1234567890" />
          <UiButton type="submit" :icon="Plus" block>Add Bank Account</UiButton>
        </form>
      </section>

      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
        <div class="px-4 sm:px-5 pt-4 pb-3 border-b border-ui-line">
          <h2 class="text-ui-h2 text-ui-ink">Accounts</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">{{ bankAccounts.length }} bank accounts</p>
        </div>

        <UiTable :columns="accountColumns" :rows="paginatedBankAccounts.items" :meta="paginatedBankAccounts.meta">
          <template #cell-bank_name="{ row }">
            <span class="text-ui-ink font-medium">{{ row.bank_name }}</span>
            <span v-if="row.bank_code" class="text-ui-cap text-ui-muted ml-1.5 tabular-nums">({{ row.bank_code }})</span>
          </template>
          <template #cell-account_number="{ row }">
            <span class="tabular-nums text-ui-ink">{{ row.account_number }}</span>
          </template>
          <template #cell-swift_code="{ row }">
            <code v-if="row.swift_code" class="font-mono text-ui-cap text-ui-muted">{{ row.swift_code }}</code>
            <span v-else class="text-ui-faint">—</span>
          </template>
          <template #cell-actions="{ row }">
            <UiButton variant="ghost" size="sm" :icon="Trash2" aria-label="Delete bank account" @click="handleDelete(row.id)" />
          </template>

          <template #mobile="{ row, number }">
            <div class="flex items-center gap-3 px-4 py-3.5">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink truncate">
                  {{ row.bank_name }}<span v-if="row.bank_code" class="text-ui-cap text-ui-muted ml-1">({{ row.bank_code }})</span>
                </p>
                <p class="text-ui-cap text-ui-muted tabular-nums truncate">
                  {{ row.account_number }}<span v-if="row.swift_code"> · SWIFT: {{ row.swift_code }}</span>
                </p>
              </div>
              <UiButton variant="ghost" size="sm" :icon="Trash2" aria-label="Delete bank account" @click="handleDelete(row.id)" />
            </div>
          </template>

          <template #empty>
            <UiEmpty :icon="Landmark" title="No bank accounts yet" compact />
          </template>
        </UiTable>

        <div v-if="paginatedBankAccounts.meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
          <Pagination
            :meta="paginatedBankAccounts.meta"
            item-label="bank accounts"
            @page-change="(p) => (page = p)"
          />
        </div>
      </section>
    </div>
  </div>
</template>
