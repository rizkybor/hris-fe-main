<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { FileCheck2, Plus, Download, FileText, Pencil, Ban, Trash2, Search, ArrowLeft, Wallet } from "lucide-vue-next";
import { usePaymentReceiptStore } from "@/stores/paymentReceipt";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import { UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiPageHeader, UiPagination, UiChips, UiTable } from "@/components/ui";
import { useAlertModalStore } from "@/stores/alertModal";

const { t } = useI18n();
const store = usePaymentReceiptStore();
const alertModal = useAlertModalStore();
const { receipts, meta, loading } = storeToRefs(store);

const search = ref("");
const statusFilter = ref("");
const isDeleteModalOpen = ref(false);
const receiptToDelete = ref(null);
const downloadingId = ref(null);

const load = (page = 1) => {
  store.fetchReceipts({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    page,
  });
};

onMounted(() => load());

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const handleDownload = async (receipt) => {
  downloadingId.value = receipt.id;
  try {
    await store.downloadPdf(receipt.id, receipt.receipt_number);
  } finally {
    downloadingId.value = null;
  }
};

const viewingId = ref(null);
const handleViewPdf = async (receipt) => {
  viewingId.value = receipt.id;
  try {
    await store.viewPdf(receipt.id);
  } finally {
    viewingId.value = null;
  }
};

const handleCancel = async (receipt) => {
  if (
    !(await alertModal.confirm(t("documents.receipt.list.cancelConfirm", { number: receipt.receipt_number }), {
      type: "warning",
      confirmText: t("documents.receipt.list.cancelReceipt"),
    }))
  )
    return;
  await store.cancelReceipt(receipt.id);
};

const confirmDelete = (receipt) => {
  receiptToDelete.value = receipt;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!receiptToDelete.value) return;
  await store.deleteReceipt(receiptToDelete.value.id);
  isDeleteModalOpen.value = false;
  receiptToDelete.value = null;
};

// Presentation only: status -> badge tone (always shown with its label).
const statusTone = (status) => (status === "cancelled" ? "neutral" : "ok");
const statusLabel = (status) => (status === "cancelled" ? t("documents.shared.status.cancelled") : t("common.labels.active"));

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString(localeTag(), { year: "numeric", month: "short", day: "numeric" }) : "-";

// Presentation only.
const statusOptions = computed(() =>
  [
    { value: "", label: t("common.labels.all") },
    { value: "active", label: t("common.labels.active") },
    { value: "cancelled", label: t("documents.shared.status.cancelled") },
  ].map((o) => ({ ...o, count: o.value === statusFilter.value && !loading.value ? meta.value.total : undefined }))
);
const onStatusChip = (value) => {
  statusFilter.value = value;
  handleFilterChange();
};
const activeSum = computed(() => receipts.value.filter((r) => r.status !== "cancelled").reduce((sum, r) => sum + (Number(r.amount) || 0), 0));
const cancelledCount = computed(() => receipts.value.filter((r) => r.status === "cancelled").length);
const columns = computed(() => [
  { key: "receipt_number", label: t("documents.receipt.list.columns.number") },
  { key: "received_from", label: t("documents.receipt.fields.receivedFrom") },
  { key: "date", label: t("common.labels.date") },
  { key: "amount", label: t("common.labels.amount"), align: "right" },
  { key: "status", label: t("common.labels.status") },
  { key: "actions", label: "", align: "right" },
]);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('documents.receipt.list.title')" :subtitle="$t('documents.receipt.list.subtitle')">
      <template #eyebrow>
        <router-link
          :to="{ name: 'admin.documents.dashboard' }"
          class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
          :aria-label="$t('documents.shared.backToDocuments')"
          :title="$t('documents.shared.backToDocuments')"
        >
          <ArrowLeft class="w-4 h-4" />{{ $t("documents.shared.documents") }}
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('payment-receipt-create')" :to="{ name: 'admin.payment-receipts.create' }" :icon="Plus">{{ $t("documents.receipt.list.create") }}</UiButton>
      </template>
    </UiPageHeader>


    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-ui-line">
        <UiInput
          v-model="search"
          :icon="Search"
          :placeholder="$t('documents.receipt.list.searchPlaceholder')"
          class="w-full lg:w-[300px]"
          @keyup.enter="handleSearch"
        />
        <UiChips :model-value="statusFilter" :options="statusOptions" @update:model-value="onStatusChip" />
      </div>

      <UiTable :columns="columns" :rows="receipts" :meta="meta" :loading="loading" :skeleton-rows="6">
        <template #cell-receipt_number="{ row }">
          <span class="font-mono text-ui-cap text-ui-ink whitespace-nowrap">{{ row.receipt_number }}</span>
        </template>
        <template #cell-received_from="{ row }">
          <span class="text-ui-body text-ui-ink">{{ row.received_from }}</span>
        </template>
        <template #cell-date="{ row }">
          <span class="text-ui-small text-ui-text tabular-nums whitespace-nowrap">{{ formatDate(row.date) }}</span>
        </template>
        <template #cell-amount="{ row }">
          <span class="text-ui-body font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(row.amount) }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5">
            <UiButton variant="ghost" size="sm" class="w-[30px] !px-0" :icon="FileText" :loading="viewingId === row.id" :title="$t('documents.shared.viewPdf')" :aria-label="$t('documents.shared.viewPdf')" @click="handleViewPdf(row)" />
            <UiButton variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Download" :loading="downloadingId === row.id" :title="$t('common.actions.downloadPdf')" :aria-label="$t('common.actions.downloadPdf')" @click="handleDownload(row)" />
            <UiButton v-if="can('payment-receipt-edit')" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Pencil" :to="{ name: 'admin.payment-receipts.edit', params: { id: row.id } }" :title="$t('common.actions.edit')" :aria-label="$t('common.actions.edit')" />
            <UiButton v-if="can('payment-receipt-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-warn" :icon="Ban" :title="$t('documents.receipt.list.cancelReceipt')" :aria-label="$t('documents.receipt.list.cancelReceipt')" @click="handleCancel(row)" />
            <UiButton v-if="can('payment-receipt-delete')" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-bad" :icon="Trash2" :title="$t('common.actions.delete')" :aria-label="$t('common.actions.delete')" @click="confirmDelete(row)" />
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.received_from }}</p>
                  <p class="font-mono text-ui-cap text-ui-muted truncate">{{ row.receipt_number }}</p>
                </div>
                <p class="text-ui-body font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(row.amount) }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(row.date) }}</span>
              </div>
              <div class="flex items-center gap-0.5 mt-2 -ml-2">
                <UiButton variant="ghost" size="sm" :icon="FileText" :loading="viewingId === row.id" @click="handleViewPdf(row)">{{ $t("common.actions.view") }}</UiButton>
                <UiButton variant="ghost" size="sm" :icon="Download" :loading="downloadingId === row.id" @click="handleDownload(row)">PDF</UiButton>
                <UiButton v-if="can('payment-receipt-edit')" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Pencil" :to="{ name: 'admin.payment-receipts.edit', params: { id: row.id } }" :title="$t('common.actions.edit')" :aria-label="$t('common.actions.edit')" />
                <UiButton v-if="can('payment-receipt-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Ban" :title="$t('documents.receipt.list.cancelReceipt')" :aria-label="$t('documents.receipt.list.cancelReceipt')" @click="handleCancel(row)" />
                <UiButton v-if="can('payment-receipt-delete')" variant="ghost" size="sm" class="w-[30px] !px-0 text-ui-bad" :icon="Trash2" :title="$t('common.actions.delete')" :aria-label="$t('common.actions.delete')" @click="confirmDelete(row)" />
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="FileCheck2" :title="$t('documents.receipt.list.emptyTitle')" compact />
        </template>
      </UiTable>

      <UiPagination v-if="meta.total" :meta="meta" :item-label="$t('documents.receipt.list.itemLabel')" :disabled="loading" @change="load" />
    </section>

    <UiConfirmDialog
      :open="isDeleteModalOpen"
      :title="$t('documents.receipt.list.deleteTitle')"
      :message="$t('documents.shared.deleteMessage', { number: receiptToDelete?.receipt_number })"
      type="danger"
      :confirm-text="$t('documents.shared.yesDelete')"
      @cancel="isDeleteModalOpen = false"
      @confirm="handleDelete"
    />
  </div>
</template>
