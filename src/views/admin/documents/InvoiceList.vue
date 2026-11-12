<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { Receipt, Plus, Download, FileText, CheckCircle2, Ban, Trash2, Search, SearchX, ArrowLeft } from "lucide-vue-next";
import { useInvoiceStore } from "@/stores/invoice";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { formatRupiah } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import { UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiPageHeader, UiPagination, UiChips, UiTable, UiSpinner } from "@/components/ui";
import { useAlertModalStore } from "@/stores/alertModal";
import { useToastStore } from "@/stores/toast";

const { t } = useI18n();
const router = useRouter();
const store = useInvoiceStore();
const alertModal = useAlertModalStore();
const toast = useToastStore();
const { invoices, meta } = storeToRefs(store);

// Search, status and page live in the URL and are remembered, so coming
// back from an invoice restores the same view; the list shows what the
// store already has and refreshes quietly.
const list = useListState("invoices", { q: "", status: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));

const params = computed(() => ({ search: list.q || undefined, status: list.status || undefined, page: list.page }));
const { loading, refreshing, refresh } = useStaleFetch(() => store.fetchInvoices(params.value), {
  key: () => ["invoices-list", params.value],
  hasData: () => store.listKey !== null,
});

const failed = (error) => toast.error(t("common.toast.error"), error?.response?.data?.message || "");

const downloadingId = ref(null);
const handleDownload = async (invoice) => {
  downloadingId.value = invoice.id;
  try {
    await store.downloadPdf(invoice.id, invoice.invoice_number);
  } catch (error) {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    downloadingId.value = null;
  }
};

// store.viewPdf opens the tab synchronously, inside this click.
const viewingId = ref(null);
const handleViewPdf = async (invoice) => {
  viewingId.value = invoice.id;
  try {
    await store.viewPdf(invoice.id);
  } catch (error) {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    viewingId.value = null;
  }
};

const handleMarkPaid = async (invoice) => {
  try {
    await store.markAsPaid(invoice.id);
    toast.success(t("documents.invoice.list.toast.markedPaid"), invoice.invoice_number);
  } catch (error) {
    failed(error);
  }
};

const handleCancel = async (invoice) => {
  if (
    !(await alertModal.confirm(t("documents.invoice.list.cancelConfirm", { number: invoice.invoice_number }), {
      type: "warning",
      confirmText: t("documents.invoice.list.cancelInvoice"),
    }))
  )
    return;
  try {
    await store.cancelInvoice(invoice.id);
    toast.success(t("documents.invoice.list.toast.cancelled"), invoice.invoice_number);
  } catch (error) {
    failed(error);
  }
};

const isDeleteModalOpen = ref(false);
const invoiceToDelete = ref(null);
const confirmDelete = (invoice) => {
  invoiceToDelete.value = invoice;
  isDeleteModalOpen.value = true;
};

// The row leaves the page in place (no reload); an emptied later page
// steps back one.
const handleDelete = async () => {
  if (!invoiceToDelete.value) return;
  try {
    await store.deleteInvoice(invoiceToDelete.value.id);
    toast.success(t("documents.invoice.list.toast.deleted"), invoiceToDelete.value.invoice_number);
    if (!invoices.value.length) {
      if (list.page > 1) list.page -= 1;
      else if (meta.value.total) refresh({ force: true });
    }
  } catch (error) {
    failed(error);
  } finally {
    isDeleteModalOpen.value = false;
    invoiceToDelete.value = null;
  }
};

// The row opens it for editing; without that right, its PDF.
const openInvoice = (invoice) => (can("invoice-edit") ? router.push({ name: "admin.invoices.edit", params: { id: invoice.id } }) : handleViewPdf(invoice));

// ===== Presentation only =====
const statusTone = (status) => {
  if (status === "paid") return "ok";
  if (status === "cancelled") return "neutral";
  return "warn";
};
const statusLabel = (status) => {
  if (status === "paid") return t("documents.shared.status.paid");
  if (status === "cancelled") return t("documents.shared.status.cancelled");
  return t("documents.shared.status.unpaid");
};
const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString(localeTag(), { year: "numeric", month: "short", day: "numeric" }) : "-";
// One muted line under the client: invoice number · project.
const subline = (row) => [row.invoice_number, row.project?.name].filter(Boolean).join(" · ");
// One note under the status: the receipt it was paid with (+N more).
const receiptNote = (row) => {
  const receipts = row.receipts || [];
  if (!receipts.length) return "";
  return `${t("documents.invoice.list.receiptPrefix")} ${receipts[0].receipt_number}${receipts.length > 1 ? ` +${receipts.length - 1}` : ""}`;
};

const statusOptions = computed(() =>
  [
    { value: "", label: t("common.labels.all") },
    { value: "unpaid", label: t("documents.shared.status.unpaid") },
    { value: "paid", label: t("documents.shared.status.paid") },
    { value: "cancelled", label: t("documents.shared.status.cancelled") },
  ].map((o) => ({ ...o, count: o.value === list.status && !loading.value && !refreshing.value ? meta.value.total : undefined }))
);
const statusFilter = computed({ get: () => list.status, set: (v) => (list.status = v) });
const columns = computed(() => [
  { key: "client_name", label: t("documents.invoice.list.columns.client") },
  { key: "date", label: t("common.labels.date") },
  { key: "total", label: t("common.labels.total"), align: "right" },
  { key: "status", label: t("common.labels.status") },
  { key: "actions", label: "", align: "right" },
]);
const quietDelete = "!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('documents.invoice.list.title')" :subtitle="$t('documents.invoice.list.subtitle')">
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
        <UiButton v-if="can('invoice-create')" :to="{ name: 'admin.invoices.create' }" :icon="Plus" class="w-full sm:w-auto">{{ $t("documents.invoice.list.create") }}</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Toolbar: search · status chips, one line on desktop -->
      <div class="px-4 sm:px-5 py-3 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <UiInput
          v-model="search"
          type="search"
          :icon="Search"
          :placeholder="$t('documents.invoice.list.searchPlaceholder')"
          :aria-label="$t('documents.invoice.list.searchPlaceholder')"
          class="w-full lg:w-[280px] shrink-0"
        />
        <UiChips v-model="statusFilter" :options="statusOptions" size="sm" class="min-w-0 lg:flex-1" />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("documents.shared.refreshing") }}
        </span>
      </div>

      <UiTable
        :columns="columns"
        :rows="invoices"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        :clickable="true"
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        @row-click="openInvoice"
      >
        <template #cell-client_name="{ row }">
          <div class="min-w-0 max-w-[400px] py-2">
            <RouterLink
              v-if="can('invoice-edit')"
              :to="{ name: 'admin.invoices.edit', params: { id: row.id } }"
              class="block text-ui-ink font-medium truncate hover:underline underline-offset-2"
              :title="$t('documents.shared.editItem', { number: row.invoice_number })"
              @click.stop
            >{{ row.client_name }}</RouterLink>
            <p v-else class="text-ui-ink font-medium truncate">{{ row.client_name }}</p>
            <p class="mt-0.5 text-ui-cap text-ui-muted truncate" :title="subline(row)"><span class="font-mono">{{ row.invoice_number }}</span><template v-if="row.project"> · {{ row.project.name }}</template></p>
          </div>
        </template>
        <template #cell-date="{ row }">
          <span class="text-ui-small text-ui-text tabular-nums whitespace-nowrap">{{ formatDate(row.date) }}</span>
        </template>
        <template #cell-total="{ row }">
          <span class="text-ui-body font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(row.total) }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
          <p v-if="receiptNote(row)" class="mt-1 font-mono text-ui-cap text-ui-muted whitespace-nowrap">{{ receiptNote(row) }}</p>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <UiButton variant="secondary" size="sm" :icon="FileText" :loading="viewingId === row.id" :aria-label="$t('documents.shared.viewPdfItem', { number: row.invoice_number })" :title="$t('documents.shared.viewPdf')" @click="handleViewPdf(row)">{{ $t("common.actions.view") }}</UiButton>
            <UiButton variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Download" :loading="downloadingId === row.id" :title="$t('common.actions.downloadPdf')" :aria-label="$t('documents.shared.downloadPdfItem', { number: row.invoice_number })" @click="handleDownload(row)" />
            <UiButton v-if="can('invoice-edit') && row.status === 'unpaid'" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-ok" :icon="CheckCircle2" :title="$t('documents.invoice.list.markPaid')" :aria-label="$t('documents.invoice.list.markPaid')" @click="handleMarkPaid(row)" />
            <UiButton v-if="can('invoice-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-warn" :icon="Ban" :title="$t('documents.invoice.list.cancelInvoice')" :aria-label="$t('documents.shared.cancelItem', { number: row.invoice_number })" @click="handleCancel(row)" />
            <UiButton v-if="can('invoice-delete')" variant="ghost" size="sm" :class="['w-[30px] !px-0', quietDelete]" :icon="Trash2" :title="$t('common.actions.delete')" :aria-label="$t('documents.shared.deleteItem', { number: row.invoice_number })" @click="confirmDelete(row)" />
          </div>
        </template>

        <!-- Phones: the same row as a card -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5">
            <div class="flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink line-clamp-2 break-words">{{ row.client_name }}</p>
                <p class="text-ui-cap text-ui-muted truncate mt-0.5"><span class="font-mono">{{ row.invoice_number }}</span><template v-if="row.project"> · {{ row.project.name }}</template></p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-ui-body font-medium text-ui-ink tabular-nums">{{ formatRupiah(row.total) }}</p>
                <p class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(row.date) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 pl-8">
              <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
                <span v-if="receiptNote(row)" class="font-mono text-ui-cap text-ui-muted truncate">{{ receiptNote(row) }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1 mt-2 pl-8" @click.stop>
              <UiButton variant="secondary" size="sm" :icon="FileText" :loading="viewingId === row.id" :aria-label="$t('documents.shared.viewPdfItem', { number: row.invoice_number })" @click="handleViewPdf(row)">{{ $t("common.actions.view") }}</UiButton>
              <UiButton variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Download" :loading="downloadingId === row.id" :aria-label="$t('documents.shared.downloadPdfItem', { number: row.invoice_number })" @click="handleDownload(row)" />
              <UiButton v-if="can('invoice-edit') && row.status === 'unpaid'" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="CheckCircle2" :aria-label="$t('documents.invoice.list.markPaid')" @click="handleMarkPaid(row)" />
              <UiButton v-if="can('invoice-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Ban" :aria-label="$t('documents.shared.cancelItem', { number: row.invoice_number })" @click="handleCancel(row)" />
              <UiButton v-if="can('invoice-delete')" variant="ghost" size="sm" :class="['w-[30px] !px-0 ml-auto', quietDelete]" :icon="Trash2" :aria-label="$t('documents.shared.deleteItem', { number: row.invoice_number })" @click="confirmDelete(row)" />
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="list.isDirty" :icon="SearchX" :title="$t('documents.shared.noMatchTitle')" :message="$t('documents.shared.noMatchHint')" compact>
            <UiButton variant="secondary" @click="(search = ''), list.reset()">{{ $t("common.actions.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty v-else :icon="Receipt" :title="$t('documents.invoice.list.emptyTitle')" compact>
            <UiButton v-if="can('invoice-create')" variant="secondary" :icon="Plus" :to="{ name: 'admin.invoices.create' }">{{ $t("documents.invoice.list.create") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <UiPagination v-if="meta.total" :meta="meta" :item-label="$t('documents.invoice.list.itemLabel')" :disabled="loading" @change="(p) => (list.page = p)" />
    </section>

    <UiConfirmDialog
      :open="isDeleteModalOpen"
      :title="$t('documents.invoice.list.deleteTitle')"
      :message="$t('documents.shared.deleteMessage', { number: invoiceToDelete?.invoice_number })"
      type="danger"
      :confirm-text="$t('documents.shared.yesDelete')"
      @cancel="isDeleteModalOpen = false"
      @confirm="handleDelete"
    />
  </div>
</template>
