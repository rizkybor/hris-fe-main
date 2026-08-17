<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Users, CalendarCheck, ClipboardList, Megaphone, ChevronRight } from "lucide-vue-next";
import { useLeaveRequestStore } from "@/stores/leaveRequest";
import { can } from "@/helpers/permissionHelper";
import { getTimeAgo } from "@/utils/dateUtils";
import { getStatusBadgeClass } from "@/utils/badgeUtils";
import Statistics from "./Statistics.vue";
import LatestEmployees from "./LatestEmployees.vue";
import DashboardQuickLinks from "./DashboardQuickLinks.vue";

const quickLinks = [
  { to: { name: "admin.employees" }, icon: Users, title: "Employees", permission: "employee-menu" },
  { to: { name: "admin.attendances" }, icon: CalendarCheck, title: "Attendance", permission: "attendance-menu" },
  {
    to: { name: "admin.leave-requests.dashboard" },
    icon: ClipboardList,
    title: "Leave Requests",
    permission: "leave-request-menu",
  },
  {
    to: { name: "admin.announcements.dashboard" },
    icon: Megaphone,
    title: "Announcements",
    permission: "announcement-menu",
  },
];

const canViewLeaveRequests = computed(() => can("leave-request-list"));
const canViewEmployees = computed(() => can("employee-list"));

const leaveRequestStore = useLeaveRequestStore();
const { leaveRequests: pendingLeaveRequests, meta: leaveMeta, loading: leaveLoading } =
  storeToRefs(leaveRequestStore);

onMounted(() => {
  if (canViewLeaveRequests.value) {
    leaveRequestStore.fetchAllPaginated({ status: "pending", row_per_page: 5 });
  }
});
</script>

<template>
  <div class="space-y-6">
    <Statistics />
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Pending Leave Requests -->
      <div v-if="canViewLeaveRequests" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-brand-dark text-lg font-bold">Pending Leave Requests</h3>
            <p class="text-brand-light text-sm">{{ leaveMeta.total }} awaiting your review</p>
          </div>
          <RouterLink
            :to="{ name: 'admin.leave-requests.dashboard' }"
            class="text-[#0C51D9] text-sm font-medium hover:underline shrink-0 flex items-center gap-0.5"
          >
            View All <ChevronRight class="w-4 h-4" />
          </RouterLink>
        </div>

        <div v-if="leaveLoading" class="text-center py-10 text-sm text-gray-400">Loading...</div>
        <div v-else-if="pendingLeaveRequests.length === 0" class="text-center py-10 text-sm text-gray-400">
          No pending leave requests.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="request in pendingLeaveRequests"
            :key="request.id"
            class="flex items-center justify-between gap-3 border border-[#DCDEDD] rounded-[12px] p-3"
          >
            <div class="min-w-0">
              <p class="text-brand-dark text-sm font-medium truncate">
                {{ request.employee?.user?.name || "Unknown" }}
              </p>
              <p class="text-brand-light text-xs mt-0.5">
                {{ request.leave_type || "Leave" }} &middot; {{ getTimeAgo(request.created_at) }}
              </p>
            </div>
            <span
              class="text-xs px-2 py-1 rounded-full font-semibold shrink-0"
              :class="getStatusBadgeClass(request.status)"
            >
              {{ request.status }}
            </span>
          </div>
        </div>
      </div>

      <DashboardQuickLinks title="People & Work" :links="quickLinks" class="lg:col-span-1" />
    </div>

    <LatestEmployees v-if="canViewEmployees" />
  </div>
</template>
