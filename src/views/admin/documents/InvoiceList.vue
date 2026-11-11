<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Receipt, Plus, Download, FileText, Pencil, CheckCircle2, Ban, Trash2, Search, ArrowLeft, Wallet, CircleCheck } from "lucide-vue-next";
import { useInvoiceStore } from "@/stores/invoice";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import { UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiPageHeader, UiPagination, UiChips, UiTable } from "@/components/ui";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useInvoiceStore();
const alertModal = useAlertModalStore();
const { invoices, meta, loading } = storeToRefs(store);

const search = ref("");
const statusFilter = ref("");
const isDeleteModalOpen = ref(false);
const invoiceToDelete = ref(null);
const downloadingId = ref(null);

const load = (page = 1) => {
  store.fetchInvoices({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    page,
  });
};

onMounted(() => load());

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const handleDownload = async (invoice) => {
  downloadingId.value = invoice.id;
  try {
    await store.downloadPdf(invoice.id, invoice.invoice_number);
  } finally {
    downloadingId.value = null;
  }
};

const viewingId = ref(null);
const handleViewPdf = async (invoice) => {
  viewingId.value = invoice.id;
  try {
    await store.viewPdf(invoice.id);
  } finally {
    viewingId.value = null;
  }
};

const handleMarkPaid = async (invoice) => {
  await store.markAsPaid(invoice.id);
};

const handleCancel = async (invoice) => {
  if (
    !(await alertModal.confirm(`Cancel Invoice "${invoice.invoice_number}"?`, {
      type: "warning",
      confirmText: "Cancel",
    }))
  )
    return;
  await store.cancelInvoice(invoice.id);
};

const confirmDelete = (invoice) => {
  invoiceToDelete.value = invoice;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!invoiceToDelete.value) return;
  await store.deleteInvoice(invoiceToDelete.value.id);
  isDeleteModalOpen.value = false;
  invoiceToDelete.value = null;
};

// Presentation only: status -> badge tone (always shown with its label).
const statusTone = (status) => {
  if (status === "paid") return "ok";
  if (status === "cancelled") return "neutral";
  return "warn";
};

const statusLabel = (status) => {
  if (status === "paid") return "Paid";
  if (status === "cancelled") return "Cancelled";
  return "Unpaid";
};

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "-";

// Presentation only.
const statusOptions = computed(() =>
  [
    { value: "", label: "All" },
    { value: "unpaid", label: "Unpaid" },
    { value: "paid", label: "Paid" },
    { value: "cancelled", label: "Cancelled" },
  ].map((o) => ({ ...o, count: o.value === statusFilter.value && !loading.value ? meta.value.total : undefined }))
);
const onStatusChip = (value) => {
  statusFilter.value = value;
  handleFilterChange();
};
const sumBy = (status) => invoices.value.filter((i) => i.status === status).reduce((sum, i) => sum + (Number(i.total) || 0), 0);
const columns = [
  { key: "invoice_number", label: "Invoice No. / Payment Receipt No." },
  { key: "client_name", label: "Client / Project" },
  { key: "date", label: "Date" },
  { key: "total", label: "Total", align: "right" },
  { key: "status", label: "Status" },
  { key: "actions", label: "", align: "right" },
];
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Invoice" subtitle="Manage client invoices">
      <template #eyebrow>
        <router-link
          :to="{ name: 'admin.documents.dashboard' }"
          class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
          aria-label="Back to Documents"
          title="Back to Documents"
        >
          <ArrowLeft class="w-4 h-4" />Documents
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('invoice-create')" :to="{ name: 'admin.invoices.create' }" :icon="Plus">Create Invoice</UiButton>
      </template>
    </UiPageHeader>


    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-ui-line">
        <UiInput
          v-model="search"
          :icon="Search"
          placeholder="Search invoice number, client..."
          class="w-full lg:w-[300px]"
          @keyup.enter="handleSearch"
        />
        <UiChips :model-value="statusFilter" :options="statusOptions" @update:model-value="onStatusChip" />
      </div>

      <UiTable :columns="columns" :rows="invoices" :meta="meta" :loading="loading" :skeleton-rows="6">
        <template #cell-invoice_number="{ row }">
          <p class="font-mono text-ui-cap text-ui-ink whitespace-nowrap">{{ row.invoice_number }}</p>
          <template v-if="row.receipts?.length">
            <p v-for="receipt in row.receipts" :key="receipt.id" class="font-mono text-ui-cap text-ui-muted whitespace-nowrap mt-0.5">{{ receipt.receipt_number }}</p>
          </template>
          <p v-else class="text-ui-cap text-ui-faint mt-0.5">&mdash;</p>
        </template>
        <template #cell-client_name="{ row }">
          <p class="text-ui-body text-ui-ink">{{ row.client_name }}</p>
          <p v-if="row.project" class="text-ui-cap text-ui-muted mt-0.5">{{ row.project.name }}</p>
          <p v-else class="text-ui-cap text-ui-faint mt-0.5">&mdash;</p>
        </template>
        <template #cell-date="{ row }">
          <span class="text-ui-small text-ui-text tabular-nums whitespace-nowrap">{{ formatDate(row.date) }}</span>
        </template>
        <template #cell-total="{ row }">
          <span class="text-ui-body font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(row.total) }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5">
            <UiButton variant="ghost" size="sm" class="w-[30px] !px-0" :icon="FileText" :loading="viewingId === row.id" title="View PDF" aria-label="View PDF" @click="handleViewPdf(row)" />
            <UiButton variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Download" :loading="downloadingId === row.id" title="Download PDF" aria-label="Download PDF" @click="handleDownload(row)" />
            <UiButton v-if="can('invoice-edit')" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Pencil" :to="{ name: 'admin.invoices.edit', params: { id: row.id } }" title="Edit" aria-label="Edit" />
            <UiButton v-if="can('invoice-edit') && row.status === 'unpaid'" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-ok" :icon="CheckCircle2" title="Mark as Paid" aria-label="Mark as Paid" @click="handleMarkPaid(row)" />
            <UiButton v-if="can('invoice-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-warn" :icon="Ban" title="Cancel" aria-label="Cancel" @click="handleCancel(row)" />
            <UiButton v-if="can('invoice-delete')" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-bad" :icon="Trash2" title="Delete" aria-label="Delete" @click="confirmDelete(row)" />
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.client_name }}</p>
                  <p class="font-mono text-ui-cap text-ui-muted truncate">{{ row.invoice_number }}</p>
                </div>
                <p class="text-ui-body font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(row.total) }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(row.date) }}</span>
                <span v-if="row.project" class="text-ui-cap text-ui-muted truncate">· {{ row.project.name }}</span>
              </div>
              <p v-if="row.receipts?.length" class="mt-1 text-ui-cap text-ui-muted truncate">
                Receipt: <span class="font-mono">{{ row.receipts.map((r) => r.receipt_number).join(", ") }}</span>
              </p>
              <div class="flex items-center gap-0.5 mt-2 -ml-2">
                <UiButton variant="ghost" size="sm" :icon="FileText" :loading="viewingId === row.id" @click="handleViewPdf(row)">View</UiButton>
                <UiButton variant="ghost" size="sm" :icon="Download" :loading="downloadingId === row.id" @click="handleDownload(row)">PDF</UiButton>
                <UiButton v-if="can('invoice-edit')" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Pencil" :to="{ name: 'admin.invoices.edit', params: { id: row.id } }" title="Edit" aria-label="Edit" />
                <UiButton v-if="can('invoice-edit') && row.status === 'unpaid'" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="CheckCircle2" title="Mark as Paid" aria-label="Mark as Paid" @click="handleMarkPaid(row)" />
                <UiButton v-if="can('invoice-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Ban" title="Cancel" aria-label="Cancel" @click="handleCancel(row)" />
                <UiButton v-if="can('invoice-delete')" variant="ghost" size="sm" class="w-[30px] !px-0 text-ui-bad" :icon="Trash2" title="Delete" aria-label="Delete" @click="confirmDelete(row)" />
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="Receipt" title="No Invoices yet" compact />
        </template>
      </UiTable>

      <UiPagination v-if="meta.total" :meta="meta" item-label="invoice" :disabled="loading" @change="load" />
    </section>

    <UiConfirmDialog
      :open="isDeleteModalOpen"
      title="Delete Invoice?"
      :message="`&quot;${invoiceToDelete?.invoice_number}&quot; will be permanently deleted.`"
      type="danger"
      confirm-text="Yes, Delete"
      @cancel="isDeleteModalOpen = false"
      @confirm="handleDelete"
    />
  </div>
</template>
