<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { FileCheck2, Plus, Download, Ban, Trash2, Search } from "lucide-vue-next";
import { usePaymentReceiptStore } from "@/stores/paymentReceipt";
import { formatRupiah } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { useAlertModalStore } from "@/stores/alertModal";

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

const handleCancel = async (receipt) => {
  if (
    !(await alertModal.confirm(`Cancel Payment Receipt "${receipt.receipt_number}"?`, {
      type: "warning",
      confirmText: "Cancel",
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

const statusClass = (status) =>
  status === "cancelled" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700";

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <FileCheck2 class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Payment Receipt</h3>
          <p class="text-brand-light text-sm">Manage payment receipts</p>
        </div>
      </div>

      <router-link
        v-if="can('payment-receipt-create')"
        :to="{ name: 'admin.payment-receipts.create' }"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Create Receipt</span>
      </router-link>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <div class="relative max-w-sm w-full">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-gray-400" />
          </div>
          <input
            v-model="search"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Search receipt number, recipient..."
            class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <select
          v-model="statusFilter"
          @change="handleFilterChange"
          class="px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <SkeletonTable v-if="loading" :rows="6" :cols="7" />

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">No</th>
              <th class="py-3 pr-4 font-semibold">Receipt No.</th>
              <th class="py-3 pr-4 font-semibold">Received From</th>
              <th class="py-3 pr-4 font-semibold">Date</th>
              <th class="py-3 pr-4 font-semibold">Amount</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
              <th class="py-3 pr-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(receipt, index) in receipts"
              :key="receipt.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4 font-mono text-xs">{{ receipt.receipt_number }}</td>
              <td class="py-3 pr-4">{{ receipt.received_from }}</td>
              <td class="py-3 pr-4">{{ formatDate(receipt.date) }}</td>
              <td class="py-3 pr-4">{{ formatRupiah(receipt.amount) }}</td>
              <td class="py-3 pr-4">
                <span class="px-2 py-1 rounded-md text-xs font-semibold" :class="statusClass(receipt.status)">
                  {{ receipt.status === "cancelled" ? "Cancelled" : "Active" }}
                </span>
              </td>
              <td class="py-3 pr-4">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="handleDownload(receipt)"
                    :disabled="downloadingId === receipt.id"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-[#0C51D9] disabled:opacity-50"
                    title="Download PDF"
                  >
                    <Download class="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    v-if="can('payment-receipt-edit') && receipt.status !== 'cancelled'"
                    @click="handleCancel(receipt)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-orange-500 hover:bg-orange-50 group"
                    title="Cancel"
                  >
                    <Ban class="w-4 h-4 text-gray-600 group-hover:text-orange-600" />
                  </button>
                  <button
                    v-if="can('payment-receipt-delete')"
                    @click="confirmDelete(receipt)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group"
                    title="Delete"
                  >
                    <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!loading && receipts.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg font-semibold">No Payment Receipts yet</p>
        </div>
      </div>

      <Pagination :meta="meta" :loading="loading" item-label="receipt" @page-change="load" />
    </div>

    <Transition name="fade">
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="isDeleteModalOpen = false"></div>
        <div class="bg-white rounded-[24px] p-6 w-full max-w-sm relative z-10 shadow-2xl">
          <h3 class="text-xl font-bold text-brand-dark mb-2">Delete Payment Receipt?</h3>
          <p class="text-gray-500 text-sm mb-6">
            "{{ receiptToDelete?.receipt_number }}" will be permanently deleted.
          </p>
          <div class="grid grid-cols-2 gap-3">
            <button @click="isDeleteModalOpen = false" class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50">
              Cancel
            </button>
            <button @click="handleDelete" class="px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600">
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
