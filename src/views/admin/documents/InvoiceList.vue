<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Receipt, Plus, Download, CheckCircle2, Ban, Trash2, Search } from "lucide-vue-next";
import { useInvoiceStore } from "@/stores/invoice";
import { formatRupiah } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useInvoiceStore();
const alertModal = useAlertModalStore();
const { invoices, meta, loading } = storeToRefs(store);

const search = ref("");
const isDeleteModalOpen = ref(false);
const invoiceToDelete = ref(null);
const downloadingId = ref(null);

const load = (page = 1) => {
  store.fetchInvoices({ search: search.value || undefined, page });
};

onMounted(() => load());

const handleSearch = () => load(1);

const handleDownload = async (invoice) => {
  downloadingId.value = invoice.id;
  try {
    await store.downloadPdf(invoice.id, invoice.invoice_number);
  } finally {
    downloadingId.value = null;
  }
};

const handleMarkPaid = async (invoice) => {
  await store.markAsPaid(invoice.id);
};

const handleCancel = async (invoice) => {
  if (
    !(await alertModal.confirm(`Batalkan Invoice "${invoice.invoice_number}"?`, {
      type: "warning",
      confirmText: "Batalkan",
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

const statusClass = (status) => {
  if (status === "paid") return "bg-green-50 text-green-700";
  if (status === "cancelled") return "bg-red-50 text-red-600";
  return "bg-yellow-50 text-yellow-700";
};

const statusLabel = (status) => {
  if (status === "paid") return "Lunas";
  if (status === "cancelled") return "Dibatalkan";
  return "Belum Lunas";
};

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Receipt class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Invoice</h3>
          <p class="text-brand-light text-sm">Kelola tagihan (invoice) untuk klien</p>
        </div>
      </div>

      <router-link
        v-if="can('invoice-create')"
        :to="{ name: 'admin.invoices.create' }"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Buat Invoice</span>
      </router-link>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="relative mb-4 max-w-sm">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search class="w-4 h-4 text-gray-400" />
        </div>
        <input
          v-model="search"
          @keyup.enter="handleSearch"
          type="text"
          placeholder="Cari nomor invoice, klien..."
          class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        />
      </div>

      <SkeletonTable v-if="loading" :rows="6" :cols="7" />

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">No Invoice</th>
              <th class="py-3 pr-4 font-semibold">Klien</th>
              <th class="py-3 pr-4 font-semibold">Tanggal</th>
              <th class="py-3 pr-4 font-semibold">Total</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
              <th class="py-3 pr-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="invoice in invoices"
              :key="invoice.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 font-mono text-xs">{{ invoice.invoice_number }}</td>
              <td class="py-3 pr-4">{{ invoice.client_name }}</td>
              <td class="py-3 pr-4">{{ formatDate(invoice.date) }}</td>
              <td class="py-3 pr-4">{{ formatRupiah(invoice.total) }}</td>
              <td class="py-3 pr-4">
                <span class="px-2 py-1 rounded-md text-xs font-semibold" :class="statusClass(invoice.status)">
                  {{ statusLabel(invoice.status) }}
                </span>
              </td>
              <td class="py-3 pr-4">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="handleDownload(invoice)"
                    :disabled="downloadingId === invoice.id"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-[#0C51D9] disabled:opacity-50"
                    title="Download PDF"
                  >
                    <Download class="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    v-if="can('invoice-edit') && invoice.status === 'unpaid'"
                    @click="handleMarkPaid(invoice)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-green-500 hover:bg-green-50 group"
                    title="Tandai Lunas"
                  >
                    <CheckCircle2 class="w-4 h-4 text-gray-600 group-hover:text-green-600" />
                  </button>
                  <button
                    v-if="can('invoice-edit') && invoice.status !== 'cancelled'"
                    @click="handleCancel(invoice)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-orange-500 hover:bg-orange-50 group"
                    title="Batalkan"
                  >
                    <Ban class="w-4 h-4 text-gray-600 group-hover:text-orange-600" />
                  </button>
                  <button
                    v-if="can('invoice-delete')"
                    @click="confirmDelete(invoice)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group"
                    title="Hapus"
                  >
                    <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!loading && invoices.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg font-semibold">Belum ada Invoice</p>
        </div>
      </div>

      <div v-if="meta.last_page > 1" class="flex items-center justify-center gap-2 mt-4">
        <button
          v-for="page in meta.last_page"
          :key="page"
          @click="load(page)"
          class="w-8 h-8 rounded-lg text-sm font-medium"
          :class="page === meta.current_page ? 'bg-[#0C51D9] text-white' : 'border border-[#DCDEDD] text-brand-dark'"
        >
          {{ page }}
        </button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="isDeleteModalOpen = false"></div>
        <div class="bg-white rounded-[24px] p-6 w-full max-w-sm relative z-10 shadow-2xl">
          <h3 class="text-xl font-bold text-brand-dark mb-2">Hapus Invoice?</h3>
          <p class="text-gray-500 text-sm mb-6">
            "{{ invoiceToDelete?.invoice_number }}" akan dihapus permanen.
          </p>
          <div class="grid grid-cols-2 gap-3">
            <button @click="isDeleteModalOpen = false" class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50">
              Batal
            </button>
            <button @click="handleDelete" class="px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600">
              Ya, Hapus
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
