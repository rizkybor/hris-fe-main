<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { FileCheck2, Wallet, ChevronDown } from "lucide-vue-next";
import { usePaymentReceiptStore } from "@/stores/paymentReceipt";
import { useInvoiceStore } from "@/stores/invoice";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";

const store = usePaymentReceiptStore();
const invoiceStore = useInvoiceStore();
const { invoices } = storeToRefs(invoiceStore);
const calculatorStore = useProjectCalculatorStore();
const { pphTypes } = storeToRefs(calculatorStore);
const router = useRouter();
const route = useRoute();

const editingId = computed(() => route.params.id || null);
const isEditMode = computed(() => !!editingId.value);
const existingReceiptNumber = ref("");

const form = ref({
  numbering_mode: "automatic",
  client_code: "",
  receipt_number: "",
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  pph23_type: null,
  pph23_percent: null,
  pph23_amount: null,
  received_from: "",
  for_payment_of: "",
  invoice_id: "",
  payment_status: "paid",
  recipient_name: "",
});

// The amount before any PPh 23 withholding -- `form.amount` (what the DB
// stores) always means "amount actually received", so when PPh 23 applies
// this is the base the withholding is computed from, kept separately so
// toggling PPh 23 on/off doesn't lose the original figure.
const grossAmount = ref(0);
const applyPph23 = ref(false);

const submitting = ref(false);
const errorMessage = ref("");

onMounted(async () => {
  await Promise.all([
    invoiceStore.fetchInvoices({ row_per_page: 100 }),
    calculatorStore.fetchPphTypes(),
  ]);

  if (isEditMode.value) {
    try {
      const receipt = await store.fetchReceipt(editingId.value);
      existingReceiptNumber.value = receipt.receipt_number;
      form.value.client_code = receipt.client_code || "";
      form.value.date = receipt.date;
      form.value.amount = receipt.amount;
      form.value.pph23_type = receipt.pph23_type;
      form.value.pph23_percent = receipt.pph23_percent;
      form.value.pph23_amount = receipt.pph23_amount;
      form.value.received_from = receipt.received_from || "";
      form.value.for_payment_of = receipt.for_payment_of || "";
      form.value.invoice_id = receipt.invoice_id || "";
      form.value.payment_status = receipt.payment_status || "paid";
      form.value.recipient_name = receipt.recipient_name || "";

      if (receipt.pph23_amount) {
        applyPph23.value = true;
        grossAmount.value = Number(receipt.amount) + Number(receipt.pph23_amount);
      } else {
        grossAmount.value = Number(receipt.amount);
      }
    } catch (error) {
      errorMessage.value = "Failed to load payment receipt.";
    }
  }
});

const recomputePph23 = () => {
  if (!applyPph23.value) {
    form.value.pph23_type = null;
    form.value.pph23_percent = null;
    form.value.pph23_amount = null;
    form.value.amount = grossAmount.value;
    return;
  }
  const percent = Number(form.value.pph23_percent) || 0;
  const pphAmount = Math.round((grossAmount.value * percent) / 100);
  form.value.pph23_amount = pphAmount;
  form.value.amount = grossAmount.value - pphAmount;
};

const toggleApplyPph23 = () => {
  if (applyPph23.value && !form.value.pph23_type) {
    form.value.pph23_type = "pph23_npwp";
    form.value.pph23_percent = 2;
  }
  recomputePph23();
};

const handlePph23TypeChange = () => {
  const type = pphTypes.value.find((t) => t.value === form.value.pph23_type);
  if (type?.default_rate != null) {
    form.value.pph23_percent = type.default_rate;
  }
  recomputePph23();
};

const handleInvoiceSelect = () => {
  const invoice = invoices.value.find((i) => i.id === Number(form.value.invoice_id));
  if (invoice) {
    form.value.client_code = invoice.client_code || "";
    grossAmount.value = Number(invoice.total);
    form.value.for_payment_of = `berdasarkan Invoice No. ${invoice.invoice_number}`;
    recomputePph23();
  }
};

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    if (isEditMode.value) {
      // Numbering mode / receipt_number aren't editable once issued -- only
      // the content fields PaymentReceiptUpdateRequest actually validates.
      const payload = {
        client_code: form.value.client_code,
        date: form.value.date,
        received_from: form.value.received_from,
        amount: form.value.amount,
        pph23_type: form.value.pph23_type,
        pph23_percent: form.value.pph23_percent,
        pph23_amount: form.value.pph23_amount,
        for_payment_of: form.value.for_payment_of,
        invoice_id: form.value.invoice_id || null,
        payment_status: form.value.payment_status,
        recipient_name: form.value.recipient_name,
      };
      await store.updateReceipt(editingId.value, payload);
      router.push({ name: "admin.payment-receipts.dashboard" });
      return;
    }

    const payload = { ...form.value, invoice_id: form.value.invoice_id || null };
    if (payload.numbering_mode === "manual") {
      delete payload.client_code;
    } else {
      delete payload.receipt_number;
    }
    await store.createReceipt(payload);
    router.push({ name: "admin.payment-receipts.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : `Failed to ${isEditMode.value ? "update" : "create"} Payment Receipt.`);
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
          <h3 class="text-brand-dark text-lg font-bold">{{ isEditMode ? "Edit Payment Receipt" : "Create Payment Receipt" }}</h3>
          <p class="text-brand-light text-sm">
            {{ isEditMode ? existingReceiptNumber : (form.numbering_mode === "manual" ? "Receipt number will be used exactly as entered" : "Receipt number will be generated automatically when saved") }}
          </p>
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
            <div class="relative w-full">
              <select v-model="form.invoice_id" @change="handleInvoiceSelect" class="select-soft">
                <option value="">- Not related to an invoice -</option>
                <option v-for="invoice in invoices" :key="invoice.id" :value="invoice.id">
                  {{ invoice.invoice_number }} - {{ invoice.client_name }}
                </option>
              </select>
              <ChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
          <template v-if="!isEditMode">
            <div class="md:col-span-2">
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Receipt Numbering</label>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-2 text-sm text-brand-dark">
                  <input type="radio" value="automatic" v-model="form.numbering_mode" />
                  Automatic
                </label>
                <label class="flex items-center gap-2 text-sm text-brand-dark">
                  <input type="radio" value="manual" v-model="form.numbering_mode" />
                  Manual
                </label>
              </div>
            </div>
            <div v-if="form.numbering_mode === 'automatic'">
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Client Code <span class="text-red-600">*</span></label>
              <input v-model="form.client_code" type="text" required placeholder="e.g. ZACO" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm uppercase" />
              <p class="text-xs text-gray-400 mt-1">A short code only (no "/") — used in the receipt number, e.g. RCP/JCD-ZACO/...</p>
            </div>
            <div v-else>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Receipt Number <span class="text-red-600">*</span></label>
              <input v-model="form.receipt_number" type="text" required placeholder="e.g. RCP/JCD-FASTTRACK/1805/26.001" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
              <p class="text-xs text-gray-400 mt-1">Used exactly as entered — must be unique.</p>
            </div>
          </template>
          <div v-else>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Client Code <span class="text-red-600">*</span></label>
            <input v-model="form.client_code" type="text" required placeholder="e.g. ZACO" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm uppercase" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Date <span class="text-red-600">*</span></label>
            <input v-model="form.date" type="date" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Received From <span class="text-red-600">*</span></label>
            <input v-model="form.received_from" type="text" required placeholder="e.g. Mr. Zakaria - Zaco Law Firm" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">{{ applyPph23 ? "Gross Amount (Rp)" : "Amount (Rp)" }} <span class="text-red-600">*</span></label>
            <input v-model.number="grossAmount" @input="recomputePph23" type="number" min="0" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Payment Status <span class="text-red-600">*</span></label>
            <div class="relative w-full">
              <select v-model="form.payment_status" class="select-soft">
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
              </select>
              <ChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="flex items-center gap-2 text-sm font-semibold text-brand-dark">
              <input type="checkbox" v-model="applyPph23" @change="toggleApplyPph23" />
              Dipotong PPh 23?
            </label>
            <p class="text-xs text-gray-400 mt-1">
              Centang jika klien memotong PPh 23 saat membayar (mis. jasa teknik/IT). Amount di atas akan otomatis dihitung ulang sebagai jumlah bersih yang diterima.
            </p>
          </div>
          <template v-if="applyPph23">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">PPh 23 Type</label>
              <div class="relative w-full">
                <select v-model="form.pph23_type" @change="handlePph23TypeChange" class="select-soft">
                  <option v-for="type in pphTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
                </select>
                <ChevronDown
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">PPh 23 (%)</label>
              <input v-model.number="form.pph23_percent" @input="recomputePph23" type="number" min="0" max="100" step="0.1" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">PPh 23 Amount</label>
              <input :value="form.pph23_amount" type="text" readonly class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Net Amount Received</label>
              <input :value="form.amount" type="text" readonly class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm bg-gray-50 text-gray-500 font-semibold" />
            </div>
          </template>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">For Payment Of <span class="text-red-600">*</span></label>
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
          <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Saving..." : (isEditMode ? "Update Payment Receipt" : "Save Payment Receipt") }}</span>
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
