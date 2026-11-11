<script setup>
import { ref } from "vue";
import { Receipt, ReceiptText, Download } from "lucide-vue-next";
import { formatRupiah } from "@/utils/formatUtils";
import { useInvoiceStore } from "@/stores/invoice";
import { UiBadge, UiEmpty } from "@/components/ui";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

// Presentation only: invoice status -> badge tone (label from statusLabel).
const statusTone = (status) => (status === "paid" ? "ok" : status === "cancelled" ? "bad" : "warn");

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
  if (status === "paid") return t("projects.invoices.paid");
  if (status === "cancelled") return t("projects.invoices.cancelled");
  return t("projects.invoices.unpaid");
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString(localeTag(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";
</script>

<template>
  <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 h-full flex flex-col">
    <div class="mb-3 shrink-0">
      <h3 class="text-ui-h2 text-ui-ink">{{ $t("projects.invoices.title") }}</h3>
      <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.invoices.subtitle") }}</p>
    </div>

    <UiEmpty
      v-if="invoices.length === 0"
      compact
      :icon="ReceiptText"
      :title="$t('projects.invoices.emptyTitle')"
      :message="$t('projects.invoices.emptyMessage')"
      class="bg-ui-subtle rounded-ui-control"
    />

    <!-- Capped + scrollable so a project with many invoices stays compact. -->
    <ul v-else class="divide-y divide-ui-line overflow-y-auto max-h-[420px] -mx-1 px-1">
      <li v-for="invoice in invoices" :key="invoice.id" class="py-3">
        <div class="flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-ui-small font-mono text-ui-ink truncate">{{ invoice.invoice_number }}</p>
            <p class="text-ui-cap text-ui-muted mt-0.5 tabular-nums">
              {{ formatDate(invoice.date) }} &middot; {{ formatRupiah(invoice.total) }}
            </p>
          </div>
          <UiBadge :tone="statusTone(invoice.status)" dot>{{ statusLabel(invoice.status) }}</UiBadge>
          <button
            type="button"
            @click="handleDownload(invoice)"
            :disabled="downloadingId === invoice.id"
            class="w-8 h-8 -mr-1.5 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink disabled:opacity-50 shrink-0"
            :title="$t('common.actions.downloadPdf')"
            :aria-label="$t('common.actions.downloadPdf')"
          >
            <Download class="w-4 h-4" />
          </button>
        </div>

        <!-- Payment Receipts, if any -->
        <div v-if="invoice.receipts && invoice.receipts.length > 0" class="mt-2 space-y-1">
          <p class="text-ui-over uppercase text-ui-faint">{{ $t("projects.invoices.receipts") }}</p>
          <div
            v-for="receipt in invoice.receipts"
            :key="receipt.id"
            class="flex items-center gap-2 bg-ui-subtle rounded-md px-2.5 py-1.5 text-ui-cap"
          >
            <Receipt class="w-3.5 h-3.5 text-ui-faint shrink-0" />
            <span class="font-mono text-ui-text min-w-0 truncate">{{ receipt.receipt_number }}</span>
            <span class="text-ui-muted whitespace-nowrap">{{ formatDate(receipt.date) }}</span>
            <span class="ml-auto font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(receipt.amount) }}</span>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>
