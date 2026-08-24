<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { FileCheck2, Wallet } from "lucide-vue-next";
import { usePaymentReceiptStore } from "@/stores/paymentReceipt";
import { useInvoiceStore } from "@/stores/invoice";

const store = usePaymentReceiptStore();
const invoiceStore = useInvoiceStore();
const { invoices } = storeToRefs(invoiceStore);
const router = useRouter();

const form = ref({
  client_code: "",
  date: new Date().toISOString().slice(0, 10),
  received_from: "",
  amount: 0,
  for_payment_of: "",
  invoice_id: "",
  payment_status: "paid",
  recipient_name: "",
});

const submitting = ref(false);
const errorMessage = ref("");

onMounted(() => {
  invoiceStore.fetchInvoices({ row_per_page: 100 });
});

const handleInvoiceSelect = () => {
  const invoice = invoices.value.find((i) => i.id === Number(form.value.invoice_id));
  if (invoice) {
    form.value.client_code = invoice.client_code;
    form.value.amount = Number(invoice.total);
  }
};

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    const payload = { ...form.value, invoice_id: form.value.invoice_id || null };
    await store.createReceipt(payload);
    router.push({ name: "admin.payment-receipts.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Failed to create Payment Receipt.");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <FileCheck2 class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Create Payment Receipt</h3>
          <p class="text-brand-light text-sm">Receipt number will be generated automatically when saved</p>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-emerald-50 rounded-[9px] flex items-center justify-center shrink-0">
            <Wallet class="w-4 h-4 text-emerald-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Payment Details</h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Related Invoice (optional)</label>
            <select v-model="form.invoice_id" @change="handleInvoiceSelect" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="">- Not related to an invoice -</option>
              <option v-for="invoice in invoices" :key="invoice.id" :value="invoice.id">
                {{ invoice.invoice_number }} - {{ invoice.client_name }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Client Code</label>
            <input v-model="form.client_code" type="text" required placeholder="e.g. ZACO" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm uppercase" />
            <p class="text-xs text-gray-400 mt-1">A short code only (no "/") — used in the receipt number, e.g. RCP/JCD-ZACO/...</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Date</label>
            <input v-model="form.date" type="date" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Received From</label>
            <input v-model="form.received_from" type="text" required placeholder="e.g. Mr. Zakaria - Zaco Law Firm" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Amount (Rp)</label>
            <input v-model.number="form.amount" type="number" min="0" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Payment Status</label>
            <select v-model="form.payment_status" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">For Payment Of</label>
            <textarea v-model="form.for_payment_of" rows="2" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Recipient Name (Signatory)</label>
            <input v-model="form.recipient_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          :disabled="submitting"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center gap-2 disabled:opacity-50"
        >
          <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Saving..." : "Save Payment Receipt" }}</span>
        </button>
        <router-link
          :to="{ name: 'admin.payment-receipts.dashboard' }"
          class="px-6 py-3 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Cancel
        </router-link>
      </div>
    </form>
  </div>
</template>
