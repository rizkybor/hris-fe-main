<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { CalendarClock, Search, Check, X, ArrowLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useLeaveRequestStore } from "@/stores/leaveRequest";
import {
  getLeaveTypeBadgeClass,
  getLeaveRequestStatusBadgeClass,
} from "@/utils/styleHelpers.js";
import { formatDateShort } from "@/utils/dateUtils.js";
import { capitalize } from "@/utils/formatUtils.js";
import { can } from "@/helpers/permissionHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";

const router = useRouter();
const store = useLeaveRequestStore();
const { leaveRequests, meta, loading } = storeToRefs(store);

const search = ref("");
const showApproveModalState = ref(false);
const showRejectModalState = ref(false);
const selectedLeaveRequest = ref(null);
const processingAction = ref(false);

const load = (page = 1) => {
  store.fetchAllPaginated({ search: search.value || undefined, page });
};

onMounted(() => load());

const handleSearch = () => load(1);

const formatDate = (date) => (date ? formatDateShort(date) : "N/A");

const showApproveModal = (request) => {
  selectedLeaveRequest.value = request;
  showApproveModalState.value = true;
};
const showRejectModal = (request) => {
  selectedLeaveRequest.value = request;
  showRejectModalState.value = true;
};
const closeApproveModal = () => {
  showApproveModalState.value = false;
  selectedLeaveRequest.value = null;
};
const closeRejectModal = () => {
  showRejectModalState.value = false;
  selectedLeaveRequest.value = null;
};

const confirmApprove = async () => {
  if (!selectedLeaveRequest.value) return;
  processingAction.value = true;
  try {
    await store.approveLeaveRequest(selectedLeaveRequest.value.id);
    await load(meta.value.current_page);
    closeApproveModal();
  } finally {
    processingAction.value = false;
  }
};

const confirmReject = async () => {
  if (!selectedLeaveRequest.value) return;
  processingAction.value = true;
  try {
    await store.rejectLeaveRequest(selectedLeaveRequest.value.id);
    await load(meta.value.current_page);
    closeRejectModal();
  } finally {
    processingAction.value = false;
  }
};
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex items-center gap-3">
      <button
        @click="router.back()"
        class="w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all shrink-0"
        aria-label="Back"
      >
        <ArrowLeft class="w-5 h-5 text-gray-600" />
      </button>
      <div class="w-11 h-11 bg-orange-50 rounded-[12px] flex items-center justify-center shrink-0">
        <CalendarClock class="w-5 h-5 text-orange-600" />
      </div>
      <div>
        <h3 class="text-brand-dark text-lg font-bold">Leave Requests</h3>
        <p class="text-brand-light text-sm">All leave applications across the company</p>
      </div>
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
          placeholder="Cari nama karyawan..."
          class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        />
      </div>

      <SkeletonTable v-if="loading" :rows="6" :cols="6" />

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">Employee</th>
              <th class="py-3 pr-4 font-semibold">Type</th>
              <th class="py-3 pr-4 font-semibold">Period</th>
              <th class="py-3 pr-4 font-semibold">Reason</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
              <th class="py-3 pr-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="request in leaveRequests"
              :key="request.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4">
                <div class="flex items-center gap-3">
                  <img
                    :src="request.employee?.user?.profile_photo || 'https://via.placeholder.com/100'"
                    :alt="request.employee?.user?.name"
                    class="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <span class="font-semibold text-brand-dark">{{ request.employee?.user?.name || "-" }}</span>
                </div>
              </td>
              <td class="py-3 pr-4">
                <span class="px-2 py-1 rounded-md text-xs font-semibold" :class="getLeaveTypeBadgeClass(request.type)">
                  {{ capitalize(request.type) }}
                </span>
              </td>
              <td class="py-3 pr-4 whitespace-nowrap">
                {{ formatDate(request.start_date) }} - {{ formatDate(request.end_date) }}
                <span class="text-brand-light">({{ request.days }} days)</span>
              </td>
              <td class="py-3 pr-4 max-w-[240px] truncate" :title="request.reason">{{ request.reason || "-" }}</td>
              <td class="py-3 pr-4">
                <span class="px-2 py-1 rounded-md text-xs font-semibold" :class="getLeaveRequestStatusBadgeClass(request.status)">
                  {{ capitalize(request.status) }}
                </span>
              </td>
              <td class="py-3 pr-4">
                <div v-if="request.status === 'pending' && can('leave-request-approve')" class="flex items-center justify-end gap-1">
                  <button
                    @click="showApproveModal(request)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-green-500 hover:bg-green-50 group"
                    title="Approve"
                  >
                    <Check class="w-4 h-4 text-gray-600 group-hover:text-green-600" />
                  </button>
                  <button
                    @click="showRejectModal(request)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group"
                    title="Reject"
                  >
                    <X class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!loading && leaveRequests.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg font-semibold">Belum ada Leave Request</p>
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

    <!-- Approve Modal -->
    <div
      v-if="showApproveModalState"
      class="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="closeApproveModal"
    >
      <div class="bg-white rounded-[14px] p-8 max-w-md w-full shadow-2xl">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Check class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Approve Leave Request</h3>
            <p class="text-brand-light text-sm">Confirm approval for this leave request</p>
          </div>
        </div>

        <div v-if="selectedLeaveRequest" class="mb-6 space-y-3">
          <div class="border border-[#DCDEDD] rounded-[12px] p-4">
            <p class="text-brand-dark text-sm font-semibold mb-2">{{ selectedLeaveRequest.employee?.user?.name }}</p>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2 py-1 rounded-md text-xs font-semibold" :class="getLeaveTypeBadgeClass(selectedLeaveRequest.type)">
                {{ capitalize(selectedLeaveRequest.type) }}
              </span>
            </div>
            <p class="text-brand-dark text-sm">
              {{ formatDate(selectedLeaveRequest.start_date) }} - {{ formatDate(selectedLeaveRequest.end_date) }} ({{ selectedLeaveRequest.days }} days)
            </p>
            <p class="text-brand-light text-sm mt-2">{{ selectedLeaveRequest.reason }}</p>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="closeApproveModal"
            :disabled="processingAction"
            class="flex-1 px-4 py-3 border border-[#DCDEDD] rounded-[12px] text-brand-dark text-sm font-semibold hover:border-[#0C51D9] hover:border-2 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            @click="confirmApprove"
            :disabled="processingAction"
            class="flex-1 px-4 py-3 bg-green-600 text-white rounded-[12px] text-sm font-semibold hover:bg-green-700 transition-all duration-300 disabled:opacity-50"
          >
            {{ processingAction ? "Approving..." : "Approve" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div
      v-if="showRejectModalState"
      class="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="closeRejectModal"
    >
      <div class="bg-white rounded-[14px] p-8 max-w-md w-full shadow-2xl">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <X class="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Reject Leave Request</h3>
            <p class="text-brand-light text-sm">Confirm rejection for this leave request</p>
          </div>
        </div>

        <div v-if="selectedLeaveRequest" class="mb-6 space-y-3">
          <div class="border border-[#DCDEDD] rounded-[12px] p-4">
            <p class="text-brand-dark text-sm font-semibold mb-2">{{ selectedLeaveRequest.employee?.user?.name }}</p>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2 py-1 rounded-md text-xs font-semibold" :class="getLeaveTypeBadgeClass(selectedLeaveRequest.type)">
                {{ capitalize(selectedLeaveRequest.type) }}
              </span>
            </div>
            <p class="text-brand-dark text-sm">
              {{ formatDate(selectedLeaveRequest.start_date) }} - {{ formatDate(selectedLeaveRequest.end_date) }} ({{ selectedLeaveRequest.days }} days)
            </p>
            <p class="text-brand-light text-sm mt-2">{{ selectedLeaveRequest.reason }}</p>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="closeRejectModal"
            :disabled="processingAction"
            class="flex-1 px-4 py-3 border border-[#DCDEDD] rounded-[12px] text-brand-dark text-sm font-semibold hover:border-[#0C51D9] hover:border-2 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            @click="confirmReject"
            :disabled="processingAction"
            class="flex-1 px-4 py-3 bg-red-600 text-white rounded-[12px] text-sm font-semibold hover:bg-red-700 transition-all duration-300 disabled:opacity-50"
          >
            {{ processingAction ? "Rejecting..." : "Reject" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
