<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Award, Plus, Download, Trash2, Search, Layers, CalendarDays, Settings } from "lucide-vue-next";
import { useCertificateStore } from "@/stores/certificate";
import { can } from "@/helpers/permissionHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useCertificateStore();
const alertModal = useAlertModalStore();
const { certificates, meta, statistics, loading } = storeToRefs(store);

const search = ref("");
const typeFilter = ref("");
const isDeleteModalOpen = ref(false);
const certificateToDelete = ref(null);
const downloadingId = ref(null);

const load = (page = 1) => {
  store.fetchCertificates({
    search: search.value || undefined,
    type: typeFilter.value || undefined,
    page,
  });
};

onMounted(() => {
  load();
  store.fetchStatistics();
});

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const handleDownload = async (certificate) => {
  downloadingId.value = certificate.id;
  try {
    await store.downloadCertificate(certificate.id, certificate.certificate_number);
  } finally {
    downloadingId.value = null;
  }
};

const confirmDelete = (certificate) => {
  certificateToDelete.value = certificate;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!certificateToDelete.value) return;
  await store.deleteCertificate(certificateToDelete.value.id);
  isDeleteModalOpen.value = false;
  certificateToDelete.value = null;
};

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-amber-50 rounded-[12px] flex items-center justify-center">
          <Award class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Certificate</h3>
          <p class="text-brand-light text-sm">History of issued certificates</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <router-link
          v-if="can('certificate-menu')"
          :to="{ name: 'admin.settings.certificate-settings' }"
          class="p-3 rounded-lg border border-[#DCDEDD] text-brand-dark hover:bg-gray-50"
          title="Settings & Templates"
        >
          <Settings class="w-4 h-4" />
        </router-link>
        <router-link
          v-if="can('certificate-create')"
          :to="{ name: 'admin.certificates.create' }"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Generate Certificate</span>
        </router-link>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Total Certificates</p>
          <p class="text-brand-dark text-2xl font-extrabold leading-tight my-1">{{ statistics.total_certificates }}</p>
        </div>
        <div class="w-11 h-11 bg-amber-50 rounded-[12px] flex items-center justify-center">
          <Award class="w-5 h-5 text-amber-600" />
        </div>
      </div>
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Total Bulk Batches</p>
          <p class="text-brand-dark text-2xl font-extrabold leading-tight my-1">{{ statistics.total_batches }}</p>
        </div>
        <div class="w-11 h-11 bg-indigo-50 rounded-[12px] flex items-center justify-center">
          <Layers class="w-5 h-5 text-indigo-600" />
        </div>
      </div>
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">This Month</p>
          <p class="text-brand-dark text-2xl font-extrabold leading-tight my-1">{{ statistics.this_month }}</p>
        </div>
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <CalendarDays class="w-5 h-5 text-blue-600" />
        </div>
      </div>
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
            placeholder="Search certificate number, title, recipient..."
            class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <select
          v-model="typeFilter"
          @change="handleFilterChange"
          class="px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        >
          <option value="">All Types</option>
          <option value="individual">Individual</option>
          <option value="batch">Batch</option>
        </select>
      </div>

      <SkeletonTable v-if="loading" :rows="6" :cols="7" />

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">No</th>
              <th class="py-3 pr-4 font-semibold">Certificate No.</th>
              <th class="py-3 pr-4 font-semibold">Title</th>
              <th class="py-3 pr-4 font-semibold">Recipient</th>
              <th class="py-3 pr-4 font-semibold">Date</th>
              <th class="py-3 pr-4 font-semibold">Created By</th>
              <th class="py-3 pr-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(certificate, index) in certificates"
              :key="certificate.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4 font-mono text-xs">
                {{ certificate.certificate_number }}
                <span v-if="certificate.batch_id" class="ml-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-semibold align-middle">
                  BATCH
                </span>
              </td>
              <td class="py-3 pr-4">{{ certificate.title }}</td>
              <td class="py-3 pr-4">{{ certificate.recipient_name }}</td>
              <td class="py-3 pr-4">{{ formatDate(certificate.created_at) }}</td>
              <td class="py-3 pr-4">{{ certificate.creator || "-" }}</td>
              <td class="py-3 pr-4">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="handleDownload(certificate)"
                    :disabled="downloadingId === certificate.id"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-[#0C51D9] disabled:opacity-50"
                    title="Download PDF"
                  >
                    <Download class="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    v-if="can('certificate-delete')"
                    @click="confirmDelete(certificate)"
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

        <div v-if="!loading && certificates.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg font-semibold">No Certificates yet</p>
        </div>
      </div>

      <Pagination :meta="meta" :loading="loading" item-label="certificates" @page-change="load" />
    </div>

    <Transition name="fade">
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="isDeleteModalOpen = false"></div>
        <div class="bg-white rounded-[24px] p-6 w-full max-w-sm relative z-10 shadow-2xl">
          <h3 class="text-xl font-bold text-brand-dark mb-2">Delete Certificate?</h3>
          <p class="text-gray-500 text-sm mb-6">
            "{{ certificateToDelete?.certificate_number }}" will be permanently deleted along with its PDF file.
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
