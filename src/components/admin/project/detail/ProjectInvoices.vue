<script setup>
import { ref } from "vue";
import { Receipt, ReceiptText, Download } from "lucide-vue-next";
import { formatRupiah } from "@/utils/formatUtils";
import { useInvoiceStore } from "@/stores/invoice";

const props = defineProps({
  invoices: {
    // Comes straight off the already-fetched Project (ProjectResource's
    // `invoices`, each with nested `receipts`) -- optional, may be empty.
    type: Array,
    default: () => [],
  },
});

const invoiceStore = useInvoiceStore();

const downloadingId = ref(null);
const handleDownload = async (invoice) => {
  downloadingId.value = invoice.id;
  try {
    await invoiceStore.downloadPdf(invoice.id, invoice.invoice_number);
  } finally {
    downloadingId.value = null;
  }
};

const statusClass = (status) => {
  if (status === "paid") return "bg-green-50 text-green-700";
  if (status === "cancelled") return "bg-red-50 text-red-600";
  return "bg-yellow-50 text-yellow-700";
};

const statusLabel = (status) => {
  if (status === "paid") return "Paid";
  if (status === "cancelled") return "Cancelled";
  return "Unpaid";
};

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 sm:p-6 h-full">
    <div class="flex items-center gap-3 mb-5">
      <div class="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
        <Receipt class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
      </div>
      <div>
        <h3 class="text-brand-dark text-base sm:text-lg font-bold">Invoices</h3>
        <p class="text-brand-light text-xs font-normal">
          Optional — invoices billed against this project, if linked
        </p>
      </div>
    </div>

    <div
      v-if="invoices.length === 0"
      class="text-center py-10 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD]"
    >
      <ReceiptText class="w-9 h-9 text-gray-300 mx-auto mb-3" />
      <p class="text-sm font-semibold">No invoices linked yet</p>
      <p class="text-xs text-gray-400">
        Invoices are optional — link one to this project from the Invoice form to see it here.
      </p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="invoice in invoices"
        :key="invoice.id"
        class="border border-[#DCDEDD] rounded-[12px] p-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-brand-dark text-sm font-bold font-mono">{{ invoice.invoice_number }}</p>
            <p class="text-brand-light text-xs mt-0.5">{{ formatDate(invoice.date) }} &middot; {{ formatRupiah(invoice.total) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 rounded-md text-xs font-semibold" :class="statusClass(invoice.status)">
              {{ statusLabel(invoice.status) }}
            </span>
            <button
              @click="handleDownload(invoice)"
              :disabled="downloadingId === invoice.id"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-[#0C51D9] disabled:opacity-50"
              title="Download PDF"
            >
              <Download class="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
        </div>

        <!-- Payment Receipts, if any -->
        <div v-if="invoice.receipts && invoice.receipts.length > 0" class="mt-3.5 pt-3.5 border-t border-[#F1F1F1]">
          <p class="text-brand-light text-xs font-semibold uppercase tracking-wide mb-2">Payment Receipts</p>
          <div class="space-y-1.5">
            <div
              v-for="receipt in invoice.receipts"
              :key="receipt.id"
              class="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
            >
              <span class="font-mono text-brand-dark">{{ receipt.receipt_number }}</span>
              <span class="text-brand-light">{{ formatDate(receipt.date) }}</span>
              <span class="font-semibold text-brand-dark">{{ formatRupiah(receipt.amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
