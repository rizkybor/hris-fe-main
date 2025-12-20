<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import {
  TrendingUp,
  CheckCircle,
  Star,
  XCircle,
  Clock,
  CalendarX,
  Laptop,
  Clock4,
  CalendarClock,
  Users,
  Check,
  X,
} from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useLeaveRequestStore } from "@/stores/leaveRequest";
import {
  getLeaveTypeBadgeClass,
  getLeaveRequestStatusBadgeClass,
} from "@/utils/styleHelpers.js";
import {
  formatDateShort,
  formatTime as formatTimeUtil,
} from "@/utils/dateUtils.js";
import { capitalize } from "@/utils/formatUtils.js";
import { can } from "@/helpers/permissionHelper";

const attendanceStore = useAttendanceStore();
const leaveRequestStore = useLeaveRequestStore();

const statistics = ref({
  present_today: 0,
  present_change: 0,
  absent_today: 0,
  absent_change: 0,
  late_today: 0,
  on_leave_today: 0,
  remote_today: 0,
  attendance_rate: 0,
  rate_change: 0,
  pending_requests: 0,
});
const leaveRequests = ref([]);
const todayAttendances = ref([]);
const loadingLeaveRequests = ref(false);
const loadingAttendances = ref(false);

// Modal state
const showApproveModalState = ref(false);
const showRejectModalState = ref(false);
const selectedLeaveRequest = ref(null);
const processingAction = ref(false);

const loadStatistics = async () => {
  try {
    const data = await attendanceStore.fetchAdminStatistics();
    statistics.value = {
      present_today: data?.present_today || 0,
      present_change: data?.present_change || 0,
      absent_today: data?.absent_today || 0,
      absent_change: data?.absent_change || 0,
      late_today: data?.late_today || 0,
      on_leave_today: data?.on_leave_today || 0,
      remote_today: data?.remote_today || 0,
      attendance_rate: data?.attendance_rate || 0,
      rate_change: data?.rate_change || 0,
      pending_requests: data?.pending_requests || 0,
    };
  } catch (error) {
    console.error("Error loading statistics:", error);
    // Keep the default values from the initial ref
  }
};

const loadLeaveRequests = async () => {
  loadingLeaveRequests.value = true;
  try {
    leaveRequests.value = await leaveRequestStore.fetchLatestLeaveRequests(5);
  } catch (error) {
    console.error("Error loading leave requests:", error);
  } finally {
    loadingLeaveRequests.value = false;
  }
};

const loadTodayAttendances = async () => {
  loadingAttendances.value = true;
  try {
    todayAttendances.value = await attendanceStore.fetchTodayAttendances(5);
  } catch (error) {
    console.error("Error loading attendances:", error);
  } finally {
    loadingAttendances.value = false;
  }
};

const formatDate = (date) => (date ? formatDateShort(date) : "N/A");
const formatTime = (time) => (time ? formatTimeUtil(time) : "N/A");

// Use shared helpers

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
    await leaveRequestStore.approveLeaveRequest(selectedLeaveRequest.value.id);

    // Refresh data
    await loadLeaveRequests();
    await loadStatistics();

    closeApproveModal();
  } catch (error) {
    console.error("Error approving leave request:", error);
  } finally {
    processingAction.value = false;
  }
};

const confirmReject = async () => {
  if (!selectedLeaveRequest.value) return;

  processingAction.value = true;
  try {
    await leaveRequestStore.rejectLeaveRequest(selectedLeaveRequest.value.id);

    // Refresh data
    await loadLeaveRequests();
    await loadStatistics();

    closeRejectModal();
  } catch (error) {
    console.error("Error rejecting leave request:", error);
  } finally {
    processingAction.value = false;
  }
};

onMounted(async () => {
  await Promise.all([
    loadStatistics(),
    loadLeaveRequests(),
    loadTodayAttendances(),
  ]);
});
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Main Content Area -->
    <!-- Stats Cards Layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Total Present Today - Highlighted Card -->
      <div
        class="main-card rounded-[20px] border border-[#0B1042] relative overflow-hidden p-5"
      >
        <div class="flex flex-col justify-center h-full relative z-10">
          <!-- Trending Badge -->
          <div class="flex items-center gap-2 mb-3">
            <div
              class="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm"
            >
              <TrendingUp class="w-3 h-3 text-white" />
              <span class="text-brand-white text-xs font-semibold"
                >+{{ statistics.present_change || 0 }} from yesterday</span
              >
            </div>
          </div>

          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-brand-white-90 text-sm font-medium">
                Present Today
              </p>
              <p
                class="text-brand-white text-5xl font-extrabold leading-none my-4"
              >
                {{ statistics.present_today || 0 }}
              </p>
              <p class="text-brand-white-80 text-base font-normal">
                Active employees
              </p>
            </div>
            <div
              class="w-16 h-16 bg-white/20 rounded-[20px] flex items-center justify-center"
            >
              <CheckCircle class="w-8 h-8 text-white" />
            </div>
          </div>

          <!-- Additional Info -->
          <div class="flex items-center gap-3 mt-auto">
            <div class="flex items-center gap-1">
              <div
                class="w-2 h-2 bg-green-400 rounded-full animate-pulse"
              ></div>
              <span class="text-brand-white-70 text-xs font-normal"
                >Real-time</span
              >
            </div>
            <div class="flex items-center gap-1">
              <Star class="w-3 h-3 text-white opacity-70" />
              <span class="text-brand-white-70 text-xs font-normal"
                >High Attendance</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Stacked Cards Column -->
      <div class="flex flex-col gap-4">
        <!-- Absent Today -->
        <div
          class="stats-card bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-brand-dark text-sm font-medium">Absent Today</p>
              <p
                class="text-brand-dark text-2xl font-extrabold leading-tight my-1"
              >
                {{ statistics.absent_today || 0 }}
              </p>
              <p class="text-danger text-xs font-medium">
                {{ statistics.absent_change >= 0 ? "+" : ""
                }}{{ statistics.absent_change || 0 }} from yesterday
              </p>
            </div>
            <div
              class="w-10 h-10 bg-red-50 rounded-[12px] flex items-center justify-center"
            >
              <XCircle class="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <!-- Late Arrivals -->
        <div
          class="stats-card bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-brand-dark text-sm font-medium">Late Arrivals</p>
              <p
                class="text-brand-dark text-2xl font-extrabold leading-tight my-1"
              >
                {{ statistics.late_today || 0 }}
              </p>
              <p class="text-warning text-xs font-medium">After 9:00 AM</p>
            </div>
            <div
              class="w-10 h-10 bg-orange-50 rounded-[12px] flex items-center justify-center"
            >
              <Clock class="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Stacked Cards Column 2 -->
      <div class="flex flex-col gap-4">
        <!-- On Leave -->
        <div
          class="stats-card bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-brand-dark text-sm font-medium">On Leave</p>
              <p
                class="text-brand-dark text-2xl font-extrabold leading-tight my-1"
              >
                {{ statistics.on_leave_today || 0 }}
              </p>
              <p class="text-brand-light text-xs font-medium">
                Approved requests
              </p>
            </div>
            <div
              class="w-10 h-10 bg-yellow-50 rounded-[12px] flex items-center justify-center"
            >
              <CalendarX class="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <!-- Remote Workers -->
        <div
          class="stats-card bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-brand-dark text-sm font-medium">Remote Workers</p>
              <p
                class="text-brand-dark text-2xl font-extrabold leading-tight my-1"
              >
                {{ statistics.remote_today || 0 }}
              </p>
              <p class="text-brand-light text-xs font-medium">
                Working from home
              </p>
            </div>
            <div
              class="w-10 h-10 bg-purple-50 rounded-[12px] flex items-center justify-center"
            >
              <Laptop class="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Stacked Cards Column 3 -->
      <div class="flex flex-col gap-4">
        <!-- Attendance Rate -->
        <div
          class="stats-card bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-brand-dark text-sm font-medium">Attendance Rate</p>
              <p
                class="text-brand-dark text-2xl font-extrabold leading-tight my-1"
              >
                {{ statistics.attendance_rate || 0 }}%
              </p>
              <p class="text-success text-xs font-medium">
                {{ statistics.rate_change >= 0 ? "+" : ""
                }}{{ statistics.rate_change || 0 }}% from last week
              </p>
            </div>
            <div
              class="w-10 h-10 bg-blue-50 rounded-[12px] flex items-center justify-center"
            >
              <TrendingUp class="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <!-- Pending Requests -->
        <div
          class="stats-card bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-brand-dark text-sm font-medium">
                Pending Requests
              </p>
              <p
                class="text-brand-dark text-2xl font-extrabold leading-tight my-1"
              >
                {{ statistics.pending_requests || 0 }}
              </p>
              <p class="text-warning text-xs font-medium">Awaiting approval</p>
            </div>
            <div
              class="w-10 h-10 bg-amber-50 rounded-[12px] flex items-center justify-center"
            >
              <Clock4 class="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Latest Leave Requests -->
      <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-orange-50 rounded-[12px] flex items-center justify-center"
            >
              <CalendarClock class="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-lg font-bold">
                Latest Leave Requests
              </h3>
              <p class="text-brand-light text-sm">
                Recent 5 leave applications
              </p>
            </div>
          </div>
          <a
            class="btn-secondary text-brand-dark text-sm font-semibold border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2"
          >
            View All
          </a>
        </div>

        <div v-if="loadingLeaveRequests" class="text-center py-12">
          <p class="text-gray-500 text-lg font-medium">Loading...</p>
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="request in leaveRequests"
            :key="request.id"
            class="flex items-center gap-4 p-4 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300"
          >
            <img
              :src="
                request.employee?.user?.profile_photo ||
                'https://via.placeholder.com/100'
              "
              :alt="request.employee?.user?.name"
              class="w-12 h-12 rounded-full object-cover"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h4 class="text-brand-dark text-sm font-semibold">
                  {{ request.employee?.user?.name }}
                </h4>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-1 rounded-md text-xs font-semibold"
                  :class="getLeaveTypeBadgeClass(request.type)"
                >
                  {{ capitalize(request.type) }}
                </span>
                <span class="text-brand-dark text-xs">
                  {{ formatDate(request.start_date) }} -
                  {{ formatDate(request.end_date) }} ({{ request.days }} days)
                </span>
              </div>
            </div>
            <div
              v-if="
                request.status === 'pending' && can('leave-request-approve')
              "
              class="flex flex-col gap-2"
            >
              <button
                @click="showApproveModal(request)"
                class="btn-secondary flex items-center justify-center gap-2 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2"
              >
                <Check class="w-4 h-4 text-green-600" />
                <span class="text-brand-dark text-xs font-semibold"
                  >Approve</span
                >
              </button>
              <button
                @click="showRejectModal(request)"
                class="btn-secondary flex items-center justify-center gap-2 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2"
              >
                <X class="w-4 h-4 text-red-600" />
                <span class="text-brand-dark text-xs font-semibold"
                  >Reject</span
                >
              </button>
            </div>
            <div v-else>
              <span
                class="px-2 py-1 rounded-md text-xs font-semibold"
                :class="getLeaveRequestStatusBadgeClass(request.status)"
              >
                {{ capitalize(request.status) }}
              </span>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="!loadingLeaveRequests && leaveRequests.length === 0"
            class="text-center py-12"
          >
            <CalendarClock class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500 text-lg font-medium">
              No leave requests found
            </p>
          </div>
        </div>
      </div>

      <!-- Today's Attendance -->
      <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-green-50 rounded-[12px] flex items-center justify-center"
            >
              <Users class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-lg font-bold">
                Today's Attendance
              </h3>
              <p class="text-brand-light text-sm">Who's in the office today</p>
            </div>
          </div>
          <RouterLink
            :to="{ name: 'admin.attendances' }"
            class="btn-secondary text-brand-dark text-sm font-semibold border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2"
          >
            View All
          </RouterLink>
        </div>

        <div v-if="loadingAttendances" class="text-center py-12">
          <p class="text-gray-500 text-lg font-medium">Loading...</p>
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="attendance in todayAttendances"
            :key="attendance.id"
            class="flex items-center gap-4 p-4 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300"
          >
            <img
              :src="
                attendance.employee?.user?.profile_photo ||
                'https://via.placeholder.com/100'
              "
              :alt="attendance.employee?.user?.name"
              class="w-12 h-12 rounded-full object-cover"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="text-brand-dark text-sm font-semibold">
                  {{ attendance.employee?.user?.name }}
                </h4>
              </div>
              <p class="text-brand-light text-sm">
                {{ attendance.employee?.jobInformation?.job_title }}
              </p>
              <p class="text-brand-light text-sm">
                Team
                {{ attendance.employee?.jobInformation?.team?.name || "N/A" }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold"
              >
                Present
              </span>
              <div class="text-right">
                <div
                  class="flex items-center gap-1 text-brand-dark text-sm font-medium"
                >
                  <Clock class="w-4 h-4 text-gray-500" />
                  {{ formatTime(attendance.check_in) }}
                </div>
                <p class="text-brand-light text-xs">Check-in time</p>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="!loadingAttendances && todayAttendances.length === 0"
            class="text-center py-12"
          >
            <Users class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500 text-lg font-medium">
              No attendance records yet
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Approve Modal -->
    <div
      v-if="showApproveModalState"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeApproveModal"
    >
      <div class="bg-white rounded-[20px] p-8 max-w-md w-full mx-4">
        <div class="flex items-center gap-4 mb-6">
          <div
            class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center"
          >
            <Check class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">
              Approve Leave Request
            </h3>
            <p class="text-brand-light text-sm">
              Confirm approval for this leave request
            </p>
          </div>
        </div>

        <div v-if="selectedLeaveRequest" class="mb-6 space-y-3">
          <div class="border border-[#DCDEDD] rounded-[12px] p-4">
            <p class="text-brand-dark text-sm font-semibold mb-2">
              {{ selectedLeaveRequest.employee?.user?.name }}
            </p>
            <div class="flex items-center gap-2 mb-2">
              <span
                class="px-2 py-1 rounded-md text-xs font-semibold"
                :class="getLeaveTypeBadgeClass(selectedLeaveRequest.type)"
              >
                {{ capitalize(selectedLeaveRequest.type) }}
              </span>
            </div>
            <p class="text-brand-dark text-sm">
              {{ formatDate(selectedLeaveRequest.start_date) }} -
              {{ formatDate(selectedLeaveRequest.end_date) }} ({{
                selectedLeaveRequest.days
              }}
              days)
            </p>
            <p class="text-brand-light text-sm mt-2">
              {{ selectedLeaveRequest.reason }}
            </p>
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
            class="flex-1 px-4 py-3 bg-green-600 text-white rounded-[12px] text-sm font-semibold hover:bg-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ processingAction ? "Approving..." : "Approve" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div
      v-if="showRejectModalState"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeRejectModal"
    >
      <div class="bg-white rounded-[20px] p-8 max-w-md w-full mx-4">
        <div class="flex items-center gap-4 mb-6">
          <div
            class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center"
          >
            <X class="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">
              Reject Leave Request
            </h3>
            <p class="text-brand-light text-sm">
              Confirm rejection for this leave request
            </p>
          </div>
        </div>

        <div v-if="selectedLeaveRequest" class="mb-6 space-y-3">
          <div class="border border-[#DCDEDD] rounded-[12px] p-4">
            <p class="text-brand-dark text-sm font-semibold mb-2">
              {{ selectedLeaveRequest.employee?.user?.name }}
            </p>
            <div class="flex items-center gap-2 mb-2">
              <span
                class="px-2 py-1 rounded-md text-xs font-semibold"
                :class="getLeaveTypeBadgeClass(selectedLeaveRequest.type)"
              >
                {{ selectedLeaveRequest.type }}
              </span>
            </div>
            <p class="text-brand-dark text-sm">
              {{ formatDate(selectedLeaveRequest.start_date) }} -
              {{ formatDate(selectedLeaveRequest.end_date) }} ({{
                selectedLeaveRequest.days
              }}
              days)
            </p>
            <p class="text-brand-light text-sm mt-2">
              {{ selectedLeaveRequest.reason }}
            </p>
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
            class="flex-1 px-4 py-3 bg-red-600 text-white rounded-[12px] text-sm font-semibold hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ processingAction ? "Rejecting..." : "Reject" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
