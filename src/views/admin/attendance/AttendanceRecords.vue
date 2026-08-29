<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Users, Search, Clock, ArrowLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useAttendanceStore } from "@/stores/attendance";
import { formatDateShort, formatTime as formatTimeUtil } from "@/utils/dateUtils.js";
import { capitalize } from "@/utils/formatUtils.js";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import Avatar from "@/components/common/Avatar.vue";

const router = useRouter();
const store = useAttendanceStore();
const { attendances, meta, loading } = storeToRefs(store);

const search = ref("");
const statusFilter = ref("");

const load = (page = 1) => {
  store.fetchAllPaginated({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    page,
  });
};

onMounted(() => load());

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const formatDate = (date) => (date ? formatDateShort(date) : "N/A");
const formatTime = (time) => (time ? formatTimeUtil(time) : "-");

const statusBadgeClass = (status) => {
  switch (status) {
    case "present":
      return "bg-green-50 text-green-700";
    case "late":
      return "bg-amber-50 text-amber-700";
    case "absent":
      return "bg-red-50 text-red-700";
    case "remote":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};
</script>

<template>
  <div>
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex items-center gap-3">
      <button
        @click="router.back()"
        class="w-10 h-10 rounded-[12px] bg-white border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all shrink-0"
        aria-label="Back"
      >
        <ArrowLeft class="w-5 h-5 text-gray-600" />
      </button>
      <div class="w-11 h-11 bg-green-50 rounded-[12px] flex items-center justify-center shrink-0">
        <Users class="w-5 h-5 text-green-600" />
      </div>
      <div>
        <h3 class="text-brand-dark text-lg font-bold">Attendance Records</h3>
        <p class="text-brand-light text-sm">Full attendance history across the company</p>
      </div>
    </div>

    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <div class="relative max-w-sm w-full">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-gray-400" />
          </div>
          <input
            v-model="search"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Search employee name..."
            class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <select
          v-model="statusFilter"
          @change="handleFilterChange"
          class="px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        >
          <option value="">All Statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="remote">Remote</option>
        </select>
      </div>

      <SkeletonTable v-if="loading" :rows="6" :cols="7" />

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">No</th>
              <th class="py-3 pr-4 font-semibold">Employee</th>
              <th class="py-3 pr-4 font-semibold">Team</th>
              <th class="py-3 pr-4 font-semibold">Date</th>
              <th class="py-3 pr-4 font-semibold">Check-in</th>
              <th class="py-3 pr-4 font-semibold">Check-out</th>
              <th class="py-3 pr-4 font-semibold">Total Hours</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(attendance, index) in attendances"
              :key="attendance.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4">
                <div class="flex items-center gap-3">
                  <Avatar
                    :src="attendance.employee?.user?.profile_photo"
                    :alt="attendance.employee?.user?.name"
                    size="w-8 h-8"
                    icon-size="w-4 h-4"
                  />
                  <span class="font-semibold text-brand-dark">{{ attendance.employee?.user?.name || "-" }}</span>
                </div>
              </td>
              <td class="py-3 pr-4">{{ attendance.employee?.job_information?.team?.name || "N/A" }}</td>
              <td class="py-3 pr-4 whitespace-nowrap">{{ formatDate(attendance.date) }}</td>
              <td class="py-3 pr-4">
                <div class="flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5 text-gray-400" />
                  {{ formatTime(attendance.check_in) }}
                </div>
              </td>
              <td class="py-3 pr-4">
                <div class="flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5 text-gray-400" />
                  {{ formatTime(attendance.check_out) }}
                </div>
              </td>
              <td class="py-3 pr-4">{{ attendance.total_hours || "-" }}</td>
              <td class="py-3 pr-4">
                <span class="px-2 py-1 rounded-md text-xs font-semibold" :class="statusBadgeClass(attendance.status)">
                  {{ capitalize(attendance.status) || "-" }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!loading && attendances.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg font-semibold">No Attendance records yet</p>
        </div>
      </div>

      <Pagination :meta="meta" :loading="loading" item-label="records" @page-change="load" />
    </div>
  </div>
</template>
