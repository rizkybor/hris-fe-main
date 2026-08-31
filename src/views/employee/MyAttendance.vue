<script setup>
import { ref, onMounted, computed } from "vue";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  Clock3,
  Plus,
  User,
  CalendarPlus,
  Eye,
  CalendarX,
  ChevronDown,
} from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useLeaveRequestStore } from "@/stores/leaveRequest";
import { useOptionStore } from "@/stores/option";
import { useAlertModalStore } from "@/stores/alertModal";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";

// Utils
import {
  formatDateShort,
  formatDateLong,
  formatRequestDate,
  formatRequestDateLong,
  getDayName,
  formatTime,
  calculateWorkingHours,
  calculateWorkingDays,
} from "@/utils/dateUtils";
import { getStatusConfig, formatLeaveType } from "@/utils/attendanceUtils";
import AttendanceStatsCards from "@/components/employee/attendance/AttendanceStatsCards.vue";
import LeaveRequestSuccessModal from "@/components/employee/attendance/LeaveRequestSuccessModal.vue";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";

const attendanceStore = useAttendanceStore();
const alertModal = useAlertModalStore();
const { loading: attendanceLoading, attendances, statistics } = storeToRefs(attendanceStore);
const { fetchAttendances, fetchStatistics } = attendanceStore;

const leaveRequestStore = useLeaveRequestStore();
const { loading: leaveLoading, myLeaveRequests, myLeaveBalance } = storeToRefs(leaveRequestStore);
const { fetchMyLeaveRequests, createLeaveRequest, fetchMyLeaveBalance } = leaveRequestStore;

const optionStore = useOptionStore();
const { leaveTypes } = storeToRefs(optionStore);
const { fetchLeaveTypes } = optionStore;

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

// Interns don't accrue an Annual Leave quota, so it isn't offered to them
// (backend rejects it too -- this just keeps the UI from showing a dead end).
const isIntern = computed(() => user.value?.employee_profile?.job_information?.employment_type === "intern");
const availableLeaveTypes = computed(() =>
  isIntern.value ? leaveTypes.value.filter((type) => type.value !== "annual_leave") : leaveTypes.value
);

// State
const showLeaveRequestModal = ref(false);
const showLeaveDetailsModal = ref(false);
const showSuccessModal = ref(false);
const selectedLeaveRequest = ref(null);
const submittedLeaveData = ref(null);
const leaveForm = ref({
  leave_type: "",
  start_date: "",
  end_date: "",
  reason: "",
  emergency_contact: "",
});

// Computed
const recentAttendances = computed(() => {
  return attendances.value.slice(0, 7);
});

const totalDaysCalculated = computed(() => {
  if (!leaveForm.value.start_date || !leaveForm.value.end_date) {
    return 0;
  }
  return calculateWorkingDays(
    leaveForm.value.start_date,
    leaveForm.value.end_date
  );
});

const pendingRequestsCount = computed(() => {
  return myLeaveRequests.value.filter((r) => r.status === "pending").length;
});

const openLeaveRequestModal = () => {
  showLeaveRequestModal.value = true;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  leaveForm.value.start_date = tomorrow.toISOString().split("T")[0];
  leaveForm.value.end_date = tomorrow.toISOString().split("T")[0];
};

const closeLeaveRequestModal = () => {
  showLeaveRequestModal.value = false;
  leaveForm.value = {
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
    emergency_contact: "",
  };
};

const submitLeaveRequest = async () => {
  const startDate = new Date(leaveForm.value.start_date);
  const endDate = new Date(leaveForm.value.end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate <= today) {
    await alertModal.alert("Start date must be at least tomorrow.", { type: "warning" });
    return;
  }

  if (endDate < startDate) {
    await alertModal.alert("End date must be after start date.", { type: "warning" });
    return;
  }

  const totalDays = totalDaysCalculated.value;

  try {
    await createLeaveRequest({
      ...leaveForm.value,
      total_days: totalDays,
    });

    submittedLeaveData.value = {
      leave_type: leaveForm.value.leave_type,
      start_date: leaveForm.value.start_date,
      end_date: leaveForm.value.end_date,
      total_days: totalDays,
    };
    showSuccessModal.value = true;

    closeLeaveRequestModal();
    await Promise.all([fetchMyLeaveRequests(), fetchMyLeaveBalance()]);
  } catch (error) {
    console.error("Failed to submit leave request:", error);
    await alertModal.alert(
      error?.response?.data?.message || "Failed to submit leave request. Please try again.",
      { type: "danger" }
    );
  }
};

const closeSuccessModal = () => {
  showSuccessModal.value = false;
  submittedLeaveData.value = null;
};

const openLeaveDetailsModal = (requestId) => {
  const request = myLeaveRequests.value.find((r) => r.id === requestId);
  if (!request) return;
  selectedLeaveRequest.value = request;
  showLeaveDetailsModal.value = true;
};

const closeLeaveDetailsModal = () => {
  showLeaveDetailsModal.value = false;
  selectedLeaveRequest.value = null;
};

const updateEndDateMin = () => {
  if (leaveForm.value.start_date && leaveForm.value.end_date) {
    if (new Date(leaveForm.value.end_date) < new Date(leaveForm.value.start_date)) {
      leaveForm.value.end_date = leaveForm.value.start_date;
    }
  }
};

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchAttendances(),
    fetchStatistics(),
    fetchMyLeaveRequests(),
    fetchLeaveTypes(),
    fetchMyLeaveBalance(),
  ]);
});
</script>

<template>
  <div class="p-5">
    <!-- Banner Section -->
    <div
      class="relative rounded-[14px] mb-6 overflow-hidden"
      style="
        background-image: url('https://images.unsplash.com/photo-1497366216548-37526070297c');
        background-size: cover;
        background-position: center;
      "
    >
      <!-- Dark Overlay -->
      <div class="absolute inset-0 bg-black/40"></div>

      <!-- Banner Content -->
      <div class="relative z-10 p-5 sm:p-6 flex flex-col gap-5 sm:gap-0 sm:flex-row sm:items-center sm:justify-between sm:min-h-[200px]">
        <div class="flex items-center gap-3 sm:gap-4">
          <div
            class="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-[12px] flex items-center justify-center shrink-0"
          >
            <CalendarCheck class="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div class="min-w-0">
            <h3 class="text-white text-lg sm:text-2xl font-bold">Attendance Overview</h3>
            <p class="text-white/90 text-sm sm:text-base font-normal">
              Track your daily presence and manage leave requests efficiently
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-[10px]">
          <button
            @click="openLeaveRequestModal"
            class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 sm:py-3 flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-white text-sm font-semibold">Request Leave</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <SkeletonStatCards v-if="attendanceLoading" :count="4" class="mb-6" />
    <AttendanceStatsCards
      v-else
      :statistics="statistics"
      :pending-requests-count="pendingRequestsCount"
      :leave-balance="myLeaveBalance"
    />

    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Attendance -->
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-green-50 rounded-[12px] flex items-center justify-center"
            >
              <CalendarCheck class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-lg font-bold">
                Recent Attendance
              </h3>
              <p class="text-brand-light text-sm">Last 7 days</p>
            </div>
          </div>
        </div>

        <SkeletonList v-if="attendanceLoading" :rows="3" />

        <div v-else class="space-y-3">
          <div
            v-for="record in recentAttendances"
            :key="record.id"
            class="border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-[12px] flex items-center justify-center"
                >
                  <User class="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 class="text-brand-dark text-sm font-semibold">
                    {{ getDayName(record.date) }}
                  </h4>
                  <p class="text-brand-light text-sm">
                    {{ formatDateShort(record.date) }}
                  </p>
                </div>
              </div>
              <span
                :class="getStatusConfig(record.status).class"
                class="px-2 py-1 rounded-md text-sm font-semibold"
              >
                {{ getStatusConfig(record.status).text }}
              </span>
            </div>

            <div class="border-b border-[#DCDEDD] mb-3"></div>

            <div v-if="record.check_in" class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-brand-dark text-sm font-medium"
                  >Check-in</span
                >
                <span class="text-brand-dark text-sm font-semibold">{{
                  formatTime(record.check_in)
                }}</span>
              </div>
              <div v-if="record.check_out">
                <div class="flex items-center justify-between">
                  <span class="text-brand-dark text-sm font-medium"
                    >Check-out</span
                  >
                  <span class="text-brand-dark text-sm font-semibold">{{
                    formatTime(record.check_out)
                  }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-brand-dark text-sm font-medium"
                    >Total Hours</span
                  >
                  <span class="text-brand-dark text-sm font-semibold">{{
                    calculateWorkingHours(record.check_in, record.check_out)
                  }}</span>
                </div>
              </div>
              <div v-else class="flex items-center justify-between">
                <span class="text-brand-dark text-sm font-medium">Status</span>
                <span
                  class="text-green-600 text-sm font-semibold flex items-center gap-1"
                >
                  <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Currently Working
                </span>
              </div>
            </div>
            <div v-else class="flex items-center justify-center py-2">
              <span class="text-brand-light text-sm italic"
                >No attendance data</span
              >
            </div>
          </div>

          <div
            v-if="!attendanceLoading && recentAttendances.length === 0"
            class="text-center py-8"
          >
            <p class="text-brand-light">No attendance records found</p>
          </div>
        </div>
      </div>

      <!-- Leave Balance -->
      <div
        v-if="myLeaveBalance"
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-6 flex items-center justify-between"
      >
        <div>
          <p class="text-brand-light text-sm">Sisa Cuti Tahunan {{ myLeaveBalance.year }}</p>
          <p class="text-brand-dark text-xl sm:text-2xl font-bold mt-1">
            {{ myLeaveBalance.remaining }} <span class="text-base font-medium text-brand-light">/ {{ myLeaveBalance.quota }} hari</span>
          </p>
        </div>
        <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <CalendarDays class="w-6 h-6 text-[#0C51D9]" />
        </div>
      </div>

      <!-- Leave Requests -->
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6"
      >
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-orange-50 rounded-[12px] flex items-center justify-center"
            >
              <CalendarX class="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-lg font-bold">
                My Leave Requests
              </h3>
              <p class="text-brand-light text-sm">Recent requests</p>
            </div>
          </div>
        </div>

        <SkeletonList v-if="leaveLoading" :rows="3" />

        <div v-else class="space-y-4">
          <div
            v-for="request in myLeaveRequests"
            :key="request.id"
            class="border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-[12px] flex items-center justify-center"
                >
                  <CalendarPlus class="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 class="text-brand-dark text-sm font-semibold">
                    {{ formatLeaveType(request.leave_type) }}
                  </h4>
                  <p class="text-brand-light text-sm">
                    {{ request.total_days }} {{ request.total_days === 1 ? "day" : "days" }}
                  </p>
                </div>
              </div>
              <span
                :class="getStatusConfig(request.status).class"
                class="px-2 py-1 rounded-md text-sm font-semibold"
              >
                {{ getStatusConfig(request.status).text }}
              </span>
            </div>

            <div class="border-b border-[#DCDEDD] mb-3"></div>

            <div class="space-y-2 mb-3">
              <div class="flex items-center justify-between">
                <span class="text-brand-dark text-sm font-medium"
                  >Start Date</span
                >
                <span class="text-brand-dark text-sm font-semibold">{{
                  formatDateShort(request.start_date)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-brand-dark text-sm font-medium"
                  >End Date</span
                >
                <span class="text-brand-dark text-sm font-semibold">{{
                  formatDateShort(request.end_date)
                }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-brand-dark text-sm font-medium"
                  >Requested</span
                >
                <span class="text-brand-light text-sm">{{
                  formatRequestDate(request.created_at)
                }}</span>
              </div>
            </div>

            <button
              @click="openLeaveDetailsModal(request.id)"
              class="w-full btn-view-soft"
            >
              <Eye class="w-4 h-4" />
              <span>View Details</span>
            </button>
          </div>

          <div
            v-if="!leaveLoading && myLeaveRequests.length === 0"
            class="text-center py-8"
          >
            <p class="text-brand-light">No leave requests found</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Leave Request Modal -->
    <Teleport to="body">
      <div
        v-if="showLeaveRequestModal"
        class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
        @click.self="closeLeaveRequestModal"
      >
        <div
          class="bg-slate-50 rounded-[14px] border border-[#DCDEDD] w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden"
        >
          <!-- Modal Header -->
          <div class="p-4 sm:p-6 border-b border-[#DCDEDD]">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0"
                >
                  <CalendarPlus class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div class="min-w-0">
                  <h3 class="text-brand-dark text-base sm:text-xl font-bold truncate">
                    Request New Leave
                  </h3>
                  <p class="text-brand-light text-xs sm:text-sm font-normal truncate">
                    Submit a leave request for approval
                  </p>
                </div>
              </div>
              <button
                type="button"
                @click="closeLeaveRequestModal"
                class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150 shrink-0"
              >
                <span class="text-gray-600 text-lg sm:text-xl">×</span>
              </button>
            </div>
          </div>

          <!-- Modal Content -->
          <div class="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <form @submit.prevent="submitLeaveRequest" class="space-y-6">
              <!-- Leave Information Section -->
              <div
                class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <!-- Leave Type -->
                  <div class="md:col-span-2">
                    <label
                      class="block text-brand-dark text-base font-semibold mb-1"
                      >Leave Type<span class="text-red-600 ml-1">*</span></label
                    >
                    <div class="relative w-full">
                      <select
                        v-model="leaveForm.leave_type"
                        required
                        class="select-soft"
                      >
                        <option value="">Select leave type</option>
                        <option
                          v-for="type in availableLeaveTypes"
                          :key="type.value"
                          :value="type.value"
                        >
                          {{ type.label }}
                        </option>
                      </select>
                      <ChevronDown
                        class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <!-- Start Date -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-1"
                      >Start Date <span class="text-red-600 ml-1">*</span></label
                    >
                    <input
                      type="date"
                      v-model="leaveForm.start_date"
                      @change="updateEndDateMin"
                      required
                      class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
                    />
                  </div>

                  <!-- End Date -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-1"
                      >End Date <span class="text-red-600 ml-1">*</span></label
                    >
                    <input
                      type="date"
                      v-model="leaveForm.end_date"
                      :min="leaveForm.start_date"
                      required
                      class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
                    />
                  </div>

                  <!-- Total Days -->
                  <div class="md:col-span-2">
                    <label
                      class="block text-brand-dark text-base font-semibold mb-1"
                      >Total Days</label
                    >
                    <div
                      class="p-4 bg-gray-50 rounded-[12px] border border-[#DCDEDD]"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="w-10 h-10 bg-blue-50 rounded-[12px] flex items-center justify-center"
                        >
                          <Clock class="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p class="text-brand-dark text-lg font-bold">
                            {{ totalDaysCalculated }}
                            {{ totalDaysCalculated === 1 ? "day" : "days" }}
                          </p>
                          <p class="text-brand-light text-sm">
                            Excluding weekends
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Reason Section -->
              <div
                class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6"
              >
                <div class="space-y-4">
                  <!-- Reason -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-1"
                      >Reason for Leave <span class="text-red-600 ml-1">*</span></label
                    >
                    <textarea
                      v-model="leaveForm.reason"
                      required
                      rows="4"
                      class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold resize-none"
                      placeholder="Please provide a detailed reason for your leave request..."
                    ></textarea>
                  </div>

                  <!-- Emergency Contact -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-1"
                      >Emergency Contact (Optional)</label
                    >
                    <input
                      type="tel"
                      v-model="leaveForm.emergency_contact"
                      class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
                      placeholder="Phone number for emergency contact"
                    />
                  </div>
                </div>
              </div>

              <!-- Form Actions -->
              <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  @click="closeLeaveRequestModal"
                  class="bg-white border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 flex items-center justify-center gap-2"
                >
                  <span class="text-brand-dark text-base font-semibold"
                    >Cancel</span
                  >
                </button>
                <button
                  type="submit"
                  class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2"
                >
                  <span class="text-brand-white text-base font-semibold"
                    >Submit Request</span
                  >
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Leave Details Modal -->
    <Teleport to="body">
      <div
        v-if="showLeaveDetailsModal && selectedLeaveRequest"
        class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
        @click.self="closeLeaveDetailsModal"
      >
        <div
          class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden"
        >
          <!-- Modal Header -->
          <div class="p-4 sm:p-6 border-b border-[#DCDEDD]">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0"
                >
                  <CalendarCheck class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div class="min-w-0">
                  <h3 class="text-brand-dark text-base sm:text-xl font-bold truncate">
                    Leave Request Details
                  </h3>
                  <p class="text-brand-light text-xs sm:text-sm font-normal truncate">
                    Complete information about this leave request
                  </p>
                </div>
              </div>
              <button
                type="button"
                @click="closeLeaveDetailsModal"
                class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150 shrink-0"
              >
                <span class="text-gray-600 text-lg sm:text-xl">×</span>
              </button>
            </div>
          </div>

          <!-- Modal Content -->
          <div class="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div class="space-y-6">
              <!-- Leave Information Section -->
              <div
                class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <!-- Leave Type -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-2"
                      >Leave Type</label
                    >
                    <div
                      class="p-3 bg-gray-50 rounded-[12px] border border-[#DCDEDD]"
                    >
                      <span class="text-brand-dark text-base font-medium">{{
                        formatLeaveType(selectedLeaveRequest.leave_type)
                      }}</span>
                    </div>
                  </div>

                  <!-- Status -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-2"
                      >Status</label
                    >
                    <div
                      class="p-3 bg-gray-50 rounded-[12px] border border-[#DCDEDD]"
                    >
                      <span
                        :class="
                          getStatusConfig(selectedLeaveRequest.status).class
                        "
                        class="text-base font-semibold"
                      >
                        {{
                          getStatusConfig(selectedLeaveRequest.status).text
                        }}
                      </span>
                    </div>
                  </div>

                  <!-- Start Date -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-2"
                      >Start Date</label
                    >
                    <div
                      class="p-3 bg-gray-50 rounded-[12px] border border-[#DCDEDD]"
                    >
                      <span class="text-brand-dark text-base font-medium">{{
                        formatDateLong(selectedLeaveRequest.start_date)
                      }}</span>
                    </div>
                  </div>

                  <!-- End Date -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-2"
                      >End Date</label
                    >
                    <div
                      class="p-3 bg-gray-50 rounded-[12px] border border-[#DCDEDD]"
                    >
                      <span class="text-brand-dark text-base font-medium">{{
                        formatDateLong(selectedLeaveRequest.end_date)
                      }}</span>
                    </div>
                  </div>

                  <!-- Total Days -->
                  <div class="md:col-span-2">
                    <label
                      class="block text-brand-dark text-base font-semibold mb-2"
                      >Total Duration</label
                    >
                    <div
                      class="p-4 bg-blue-50 rounded-[12px] border border-[#DCDEDD]"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="w-10 h-10 bg-blue-100 rounded-[12px] flex items-center justify-center"
                        >
                          <Clock class="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p class="text-brand-dark text-lg font-bold">
                            {{ selectedLeaveRequest.total_days }}
                            {{
                              selectedLeaveRequest.total_days === 1 ? "day" : "days"
                            }}
                          </p>
                          <p class="text-brand-light text-sm">
                            Working days (excluding weekends)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Reason Section -->
              <div
                class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6"
              >
                <div class="space-y-4">
                  <!-- Reason -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-2"
                      >Reason for Leave</label
                    >
                    <div
                      class="p-4 bg-gray-50 rounded-[12px] border border-[#DCDEDD] min-h-[100px]"
                    >
                      <p class="text-brand-dark text-base leading-relaxed">
                        {{ selectedLeaveRequest.reason }}
                      </p>
                    </div>
                  </div>

                  <!-- Request Date -->
                  <div>
                    <label
                      class="block text-brand-dark text-base font-semibold mb-2"
                      >Request Submitted</label
                    >
                    <div
                      class="p-3 bg-gray-50 rounded-[12px] border border-[#DCDEDD]"
                    >
                      <span class="text-brand-dark text-base font-medium">{{
                        formatRequestDateLong(selectedLeaveRequest.created_at)
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center justify-end gap-4">
                <button
                  type="button"
                  @click="closeLeaveDetailsModal"
                  class="w-full sm:w-auto border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 flex items-center justify-center gap-2"
                >
                  <span class="text-brand-dark text-base font-semibold"
                    >Close</span
                  >
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Success Modal -->
    <LeaveRequestSuccessModal
      :show="showSuccessModal"
      :leave-data="submittedLeaveData"
      @close="closeSuccessModal"
    />
  </div>
</template>
