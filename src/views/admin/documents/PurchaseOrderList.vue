<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ShoppingCart, Plus, Download, FileText, Pencil, Ban, Trash2, Search, ArrowLeft, Wallet } from "lucide-vue-next";
import { usePurchaseOrderStore } from "@/stores/purchaseOrder";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import { UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiPageHeader, UiPagination, UiChips, UiTable } from "@/components/ui";
import { useAlertModalStore } from "@/stores/alertModal";

const store = usePurchaseOrderStore();
const alertModal = useAlertModalStore();
const { orders, meta, loading } = storeToRefs(store);

const search = ref("");
const statusFilter = ref("");
const isDeleteModalOpen = ref(false);
const orderToDelete = ref(null);
const downloadingId = ref(null);

const load = (page = 1) => {
  store.fetchOrders({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    page,
  });
};

onMounted(() => load());

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const handleDownload = async (order) => {
  downloadingId.value = order.id;
  try {
    await store.downloadPdf(order.id, order.po_number);
  } catch (e) {
    console.error(e);
  } finally {
    downloadingId.value = null;
  }
};

const viewingId = ref(null);
const handleViewPdf = async (order) => {
  viewingId.value = order.id;
  try {
    await store.viewPdf(order.id);
  } finally {
    viewingId.value = null;
  }
};

const handleCancel = async (order) => {
  if (
    !(await alertModal.confirm(
      `Cancel PO "${order.po_number}"? The number stays recorded and cannot be reused.`,
      { type: "warning", confirmText: "Cancel" }
    ))
  )
    return;
  await store.cancelOrder(order.id);
};

const confirmDelete = (order) => {
  orderToDelete.value = order;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!orderToDelete.value) return;
  await store.deleteOrder(orderToDelete.value.id);
  isDeleteModalOpen.value = false;
  orderToDelete.value = null;
};

// Presentation only: status -> badge tone (always shown with its label).
const statusTone = (status) => (status === "cancelled" ? "neutral" : "ok");
const statusLabel = (status) => (status === "cancelled" ? "Cancelled" : "Active");

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "-";

// Presentation only.
const statusOptions = computed(() =>
  [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "cancelled", label: "Cancelled" },
  ].map((o) => ({ ...o, count: o.value === statusFilter.value && !loading.value ? meta.value.total : undefined }))
);
const onStatusChip = (value) => {
  statusFilter.value = value;
  handleFilterChange();
};
const activeSum = computed(() => orders.value.filter((r) => r.status !== "cancelled").reduce((sum, r) => sum + (Number(r.total) || 0), 0));
const cancelledCount = computed(() => orders.value.filter((r) => r.status === "cancelled").length);
const columns = [
  { key: "po_number", label: "PO No." },
  { key: "client_name", label: "Client" },
  { key: "title", label: "Title" },
  { key: "date", label: "Date" },
  { key: "total", label: "Total", align: "right" },
  { key: "status", label: "Status" },
  { key: "actions", label: "", align: "right" },
];
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Purchase Order" subtitle="Manage Purchase Order (PO) Documents">
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
        <UiButton v-if="can('purchase-order-create')" :to="{ name: 'admin.purchase-orders.create' }" :icon="Plus">Create New PO</UiButton>
      </template>
    </UiPageHeader>


    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-ui-line">
        <UiInput
          v-model="search"
          :icon="Search"
          placeholder="Search PO number, client, title..."
          class="w-full lg:w-[300px]"
          @keyup.enter="handleSearch"
        />
        <UiChips :model-value="statusFilter" :options="statusOptions" @update:model-value="onStatusChip" />
      </div>

      <UiTable :columns="columns" :rows="orders" :meta="meta" :loading="loading" :skeleton-rows="6">
        <template #cell-po_number="{ row }">
          <span class="font-mono text-ui-cap text-ui-ink whitespace-nowrap">{{ row.po_number }}</span>
        </template>
        <template #cell-client_name="{ row }">
          <span class="text-ui-body text-ui-ink">{{ row.client_name }}</span>
        </template>
        <template #cell-title="{ row }">
          <span class="text-ui-small text-ui-text">{{ row.title }}</span>
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
            <UiButton v-if="can('purchase-order-edit')" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Pencil" :to="{ name: 'admin.purchase-orders.edit', params: { id: row.id } }" title="Edit" aria-label="Edit" />
            <UiButton v-if="can('purchase-order-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-warn" :icon="Ban" title="Cancel" aria-label="Cancel" @click="handleCancel(row)" />
            <UiButton v-if="can('purchase-order-delete')" variant="ghost" size="sm" class="w-[30px] !px-0 hover:text-ui-bad" :icon="Trash2" title="Delete" aria-label="Delete" @click="confirmDelete(row)" />
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.client_name }}</p>
                  <p class="font-mono text-ui-cap text-ui-muted truncate">{{ row.po_number }}</p>
                </div>
                <p class="text-ui-body font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(row.total) }}</p>
              </div>
              <p v-if="row.title" class="mt-1 text-ui-cap text-ui-muted truncate">{{ row.title }}</p>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(row.date) }}</span>
              </div>
              <div class="flex items-center gap-0.5 mt-2 -ml-2">
                <UiButton variant="ghost" size="sm" :icon="FileText" :loading="viewingId === row.id" @click="handleViewPdf(row)">View</UiButton>
                <UiButton variant="ghost" size="sm" :icon="Download" :loading="downloadingId === row.id" @click="handleDownload(row)">PDF</UiButton>
                <UiButton v-if="can('purchase-order-edit')" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Pencil" :to="{ name: 'admin.purchase-orders.edit', params: { id: row.id } }" title="Edit" aria-label="Edit" />
                <UiButton v-if="can('purchase-order-edit') && row.status !== 'cancelled'" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Ban" title="Cancel" aria-label="Cancel" @click="handleCancel(row)" />
                <UiButton v-if="can('purchase-order-delete')" variant="ghost" size="sm" class="w-[30px] !px-0 text-ui-bad" :icon="Trash2" title="Delete" aria-label="Delete" @click="confirmDelete(row)" />
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="ShoppingCart" title="No purchase orders found." compact />
        </template>
      </UiTable>

      <UiPagination v-if="meta.total" :meta="meta" item-label="PO" :disabled="loading" @change="load" />
    </section>

    <UiConfirmDialog
      :open="isDeleteModalOpen"
      title="Delete Purchase Order?"
      :message="`&quot;${orderToDelete?.po_number}&quot; will be permanently deleted.`"
      type="danger"
      confirm-text="Yes, Delete"
      @cancel="isDeleteModalOpen = false"
      @confirm="handleDelete"
    />
  </div>
</template>
