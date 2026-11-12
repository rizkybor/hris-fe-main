<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { FileCheck2, Plus, Download, FileText, Ban, Trash2, Search, SearchX, ArrowLeft } from "lucide-vue-next";
import { usePaymentReceiptStore } from "@/stores/paymentReceipt";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { formatRupiah } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import { UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiPageHeader, UiPagination, UiChips, UiTable, UiSpinner } from "@/components/ui";
import { useAlertModalStore } from "@/stores/alertModal";
import { useToastStore } from "@/stores/toast";

const { t } = useI18n();
const router = useRouter();
const store = usePaymentReceiptStore();
const alertModal = useAlertModalStore();
const toast = useToastStore();
const { receipts, meta } = storeToRefs(store);

// Search, status and page live in the URL and are remembered, so coming
// back from a receipt restores the same view; the list shows what the
// store already has and refreshes quietly.
const list = useListState("payment-receipts", { q: "", status: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));

const params = computed(() => ({ search: list.q || undefined, status: list.status || undefined, page: list.page }));
const { loading, refreshing, refresh } = useStaleFetch(() => store.fetchReceipts(params.value), {
  key: () => ["payment-receipts-list", params.value],
  hasData: () => store.listKey !== null,
});

const failed = (error) => toast.error(t("common.toast.error"), error?.response?.data?.message || "");

const downloadingId = ref(null);
const handleDownload = async (receipt) => {
  downloadingId.value = receipt.id;
  try {
    await store.downloadPdf(receipt.id, receipt.receipt_number);
  } catch (error) {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    downloadingId.value = null;
  }
};

// store.viewPdf opens the tab synchronously, inside this click.
const viewingId = ref(null);
const handleViewPdf = async (receipt) => {
  viewingId.value = receipt.id;
  try {
    await store.viewPdf(receipt.id);
  } catch (error) {
    toast.error(t("documents.shared.pdfFailed"));
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
  try {
    await store.cancelReceipt(receipt.id);
    toast.success(t("documents.receipt.list.toast.cancelled"), receipt.receipt_number);
  } catch (error) {
    failed(error);
  }
};

const isDeleteModalOpen = ref(false);
const receiptToDelete = ref(null);
const confirmDelete = (receipt) => {
  receiptToDelete.value = receipt;
  isDeleteModalOpen.value = true;
};

// The row leaves the page in place (no reload); an emptied later page
// steps back one.
const handleDelete = async () => {
  if (!receiptToDelete.value) return;
  try {
    await store.deleteReceipt(receiptToDelete.value.id);
    toast.success(t("documents.receipt.list.toast.deleted"), receiptToDelete.value.receipt_number);
    if (!receipts.value.length) {
      if (list.page > 1) list.page -= 1;
      else if (meta.value.total) refresh({ force: true });
    }
  } catch (error) {
    failed(error);
  } finally {
    isDeleteModalOpen.value = false;
    receiptToDelete.value = null;
  }
};

// The row opens it for editing; without that right, its PDF.
const openReceipt = (receipt) => (can("payment-receipt-edit") ? router.push({ name: "admin.payment-receipts.edit", params: { id: receipt.id } }) : handleViewPdf(receipt));

// ===== Presentation only =====
const statusTone = (status) => (status === "cancelled" ? "neutral" : "ok");
const statusLabel = (status) => (status === "cancelled" ? t("documents.shared.status.cancelled") : t("common.labels.active"));
const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString(localeTag(), { year: "numeric", month: "short", day: "numeric" }) : "-";
// One note under the status: the invoice it pays.
const invoiceNote = (row) => (row.invoice?.invoice_number ? t("documents.receipt.list.forInvoice", { number: row.invoice.invoice_number }) : "");

const statusOptions = computed(() =>
  [
    { value: "", label: t("common.labels.all") },
    { value: "active", label: t("common.labels.active") },
    { value: "cancelled", label: t("documents.shared.status.cancelled") },
  ].map((o) => ({ ...o, count: o.value === list.status && !loading.value && !refreshing.value ? meta.value.total : undefined }))
);
const statusFilter = computed({ get: () => list.status, set: (v) => (list.status = v) });
const columns = computed(() => [
  { key: "received_from", label: t("documents.receipt.fields.receivedFrom") },
  { key: "date", label: t("common.labels.date") },
  { key: "amount", label: t("common.labels.amount"), align: "right" },
  { key: "status", label: t("common.labels.status") },
  { key: "actions", label: "", align: "right" },
]);
const quietDelete = "!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft";
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
        <UiButton v-if="can('payment-receipt-create')" :to="{ name: 'admin.payment-receipts.create' }" :icon="Plus" class="w-full sm:w-auto">{{ $t("documents.receipt.list.create") }}</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Toolbar: search · status chips, one line on desktop -->
      <div class="px-4 sm:px-5 py-3 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <UiInput
          v-model="search"
          type="search"
          :icon="Search"
          :placeholder="$t('documents.receipt.list.searchPlaceholder')"
          :aria-label="$t('documents.receipt.list.searchPlaceholder')"
          class="w-full lg:w-[280px] shrink-0"
        />
        <UiChips v-model="statusFilter" :options="statusOptions" size="sm" class="min-w-0 lg:flex-1" />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("documents.shared.refreshing") }}
        </span>
      </div>

      <UiTable
        :columns="columns"
        :rows="receipts"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        :clickable="true"
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        @row-click="openReceipt"
      >
        <template #cell-received_from="{ row }">
          <div class="min-w-0 max-w-[400px] py-2">
            <RouterLink
              v-if="can('payment-receipt-edit')"
              :to="{ name: 'admin.payment-receipts.edit', params: { id: row.id } }"
              class="block text-ui-ink font-medium truncate hover:underline underline-offset-2"
              :title="$t('documents.shared.editItem', { number: row.receipt_number })"
              @click.stop
            >{{ row.received_from }}</RouterLink>
            <p v-else class="text-ui-ink font-medium truncate">{{ row.received_from }}</p>
            <p class="mt-0.5 font-mono text-ui-cap text-ui-muted truncate">{{ row.receipt_number }}</p>
          </div>
        </template>
        <template #cell-date="{ row }">
          <span class="text-ui-small text-ui-text tabular-nums whitespace-nowrap">{{ formatDate(row.date) }}</span>
        </template>
        <template #cell-amount="{ row }">
          <p class="text-ui-body font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(row.amount) }}</p>
          <p v-if="row.payment_status === 'partial'" class="text-ui-cap text-ui-warn">{{ $t("documents.receipt.form.partial") }}</p>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
          <p v-if="invoiceNote(row)" class="mt-1 text-ui-cap text-ui-muted whitespace-nowrap">{{ invoiceNote(row) }}</p>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <!-- Status actions first, so View and Delete line up on the right -->
            <UiButton v-if="can('payment-receipt-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-warn" :icon="Ban" :title="$t('documents.receipt.list.cancelReceipt')" :aria-label="$t('documents.shared.cancelItem', { number: row.receipt_number })" @click="handleCancel(row)" />
            <UiButton variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Download" :loading="downloadingId === row.id" :title="$t('common.actions.downloadPdf')" :aria-label="$t('documents.shared.downloadPdfItem', { number: row.receipt_number })" @click="handleDownload(row)" />
            <UiButton variant="secondary" size="sm" :icon="FileText" :loading="viewingId === row.id" :aria-label="$t('documents.shared.viewPdfItem', { number: row.receipt_number })" :title="$t('documents.shared.viewPdf')" @click="handleViewPdf(row)">{{ $t("documents.shared.pdf") }}</UiButton>
            <UiButton v-if="can('payment-receipt-delete')" variant="ghost" size="sm" :class="['w-[30px] !px-0', quietDelete]" :icon="Trash2" :title="$t('common.actions.delete')" :aria-label="$t('documents.shared.deleteItem', { number: row.receipt_number })" @click="confirmDelete(row)" />
          </div>
        </template>

        <!-- Phones: the same row as a card -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5">
            <div class="flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink line-clamp-2 break-words">{{ row.received_from }}</p>
                <p class="font-mono text-ui-cap text-ui-muted truncate mt-0.5">{{ row.receipt_number }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-ui-body font-medium text-ui-ink tabular-nums">{{ formatRupiah(row.amount) }}</p>
                <p class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(row.date) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 pl-8 flex-wrap">
              <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
              <span v-if="row.payment_status === 'partial'" class="text-ui-cap text-ui-warn">{{ $t("documents.receipt.form.partial") }}</span>
              <span v-if="invoiceNote(row)" class="text-ui-cap text-ui-muted truncate">{{ invoiceNote(row) }}</span>
            </div>
            <div class="flex items-center gap-1 mt-2 pl-8" @click.stop>
              <UiButton variant="secondary" size="sm" :icon="FileText" :loading="viewingId === row.id" :aria-label="$t('documents.shared.viewPdfItem', { number: row.receipt_number })" @click="handleViewPdf(row)">{{ $t("documents.shared.pdf") }}</UiButton>
              <UiButton variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Download" :loading="downloadingId === row.id" :aria-label="$t('documents.shared.downloadPdfItem', { number: row.receipt_number })" @click="handleDownload(row)" />
              <UiButton v-if="can('payment-receipt-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Ban" :aria-label="$t('documents.shared.cancelItem', { number: row.receipt_number })" @click="handleCancel(row)" />
              <UiButton v-if="can('payment-receipt-delete')" variant="ghost" size="sm" :class="['w-[30px] !px-0 ml-auto', quietDelete]" :icon="Trash2" :aria-label="$t('documents.shared.deleteItem', { number: row.receipt_number })" @click="confirmDelete(row)" />
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="list.isDirty" :icon="SearchX" :title="$t('documents.shared.noMatchTitle')" :message="$t('documents.shared.noMatchHint')" compact>
            <UiButton variant="secondary" @click="(search = ''), list.reset()">{{ $t("common.actions.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty v-else :icon="FileCheck2" :title="$t('documents.receipt.list.emptyTitle')" compact>
            <UiButton v-if="can('payment-receipt-create')" variant="secondary" :icon="Plus" :to="{ name: 'admin.payment-receipts.create' }">{{ $t("documents.receipt.list.create") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <UiPagination v-if="meta.total" :meta="meta" :item-label="$t('documents.receipt.list.itemLabel')" :disabled="loading" @change="(p) => (list.page = p)" />
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
