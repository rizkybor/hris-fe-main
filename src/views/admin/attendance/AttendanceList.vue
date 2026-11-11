<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import {
  TrendingUp,
  CheckCircle,
  ArrowRight,
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
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import Avatar from "@/components/common/Avatar.vue";
import { UiPageHeader, UiStat, UiBadge, UiButton, UiEmpty, UiConfirmDialog } from "@/components/ui";

const { t, te } = useI18n();
// Display labels for API values (the values themselves stay unchanged).
const leaveTypeLabel = (type) => (type && te(`attendance.leaveType.${type.toLowerCase()}`) ? t(`attendance.leaveType.${type.toLowerCase()}`) : capitalize(type));
const leaveStatusLabel = (status) => (status && te(`attendance.leaveStatus.${status.toLowerCase()}`) ? t(`attendance.leaveStatus.${status.toLowerCase()}`) : capitalize(status));

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

// Presentation only: status / leave type -> badge tone.
const LEAVE_STATUS_TONE = { pending: "warn", approved: "ok", rejected: "bad" };
const LEAVE_TYPE_TONE = { annual: "info", sick: "bad", personal: "accent", emergency: "warn", maternity: "accent" };
const leaveStatusTone = (status) => LEAVE_STATUS_TONE[status?.toLowerCase()] || "neutral";
const leaveTypeTone = (type) => LEAVE_TYPE_TONE[type?.toLowerCase()] || "neutral";
const signed = (n) => `${n >= 0 ? "+" : ""}${n || 0}`;

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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('attendance.summary.title')" :subtitle="$t('attendance.summary.subtitle')" class="ui-anim-fade-up">
      <template #actions>
        <UiButton variant="secondary" :icon="CalendarClock" :to="{ name: 'admin.leave-requests.dashboard' }">{{ $t('attendance.leave.title') }}</UiButton>
        <UiButton :icon="Users" :to="{ name: 'admin.attendances.records' }">{{ $t('attendance.records.title') }}</UiButton>
      </template>
    </UiPageHeader>

    <!-- KPI tiles -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 ui-stagger">
      <UiStat class="col-span-2" :label="$t('attendance.summary.stats.presentToday')" :value="statistics.present_today || 0" :icon="CheckCircle" tone="ok">
        <template #hint>
          <span class="tabular-nums">{{ $t("attendance.summary.stats.fromYesterday", { n: "+" + (statistics.present_change || 0) }) }}</span>
          <span class="text-ui-faint"> · {{ $t("attendance.summary.stats.activeEmployees") }} · {{ $t("attendance.summary.stats.realTime") }}</span>
        </template>
      </UiStat>
      <UiStat
        :label="$t('attendance.summary.stats.absentToday')"
        :value="statistics.absent_today || 0"
        :icon="XCircle"
        :tone="statistics.absent_today ? 'bad' : ''"
        :hint="$t('attendance.summary.stats.fromYesterday', { n: signed(statistics.absent_change) })"
      />
      <UiStat
        :label="$t('attendance.summary.stats.lateArrivals')"
        :value="statistics.late_today || 0"
        :icon="Clock"
        :tone="statistics.late_today ? 'warn' : ''"
        :hint="$t('attendance.summary.stats.after9')"
      />
      <UiStat :label="$t('attendance.summary.stats.onLeave')" :value="statistics.on_leave_today || 0" :icon="CalendarX" :hint="$t('attendance.summary.stats.approvedRequests')" />
      <UiStat :label="$t('attendance.summary.stats.remoteWorkers')" :value="statistics.remote_today || 0" :icon="Laptop" :hint="$t('attendance.summary.stats.workingFromHome')" />
      <UiStat
        :label="$t('attendance.summary.stats.attendanceRate')"
        :value="`${statistics.attendance_rate || 0}%`"
        :icon="TrendingUp"
        :hint="$t('attendance.summary.stats.fromLastWeek', { n: signed(statistics.rate_change) + '%' })"
      />
      <UiStat
        :label="$t('attendance.summary.stats.pendingRequests')"
        :value="statistics.pending_requests || 0"
        :icon="Clock4"
        :tone="statistics.pending_requests ? 'warn' : ''"
        :hint="$t('attendance.summary.stats.awaitingApproval')"
        :to="{ name: 'admin.leave-requests.dashboard' }"
      />
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <!-- Latest Leave Requests -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
        <header class="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-ui-line">
          <div class="flex-1 min-w-0">
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("attendance.summary.latestLeave") }}</h2>
            <p class="text-ui-cap text-ui-muted">{{ $t("attendance.summary.latestLeaveHint") }}</p>
          </div>
          <UiButton variant="ghost" size="sm" :icon-right="ArrowRight" :to="{ name: 'admin.leave-requests.dashboard' }">{{ $t('common.actions.viewAll') }}</UiButton>
        </header>

        <div v-if="loadingLeaveRequests" class="p-4 sm:p-5"><SkeletonList :rows="3" /></div>
        <ul v-else class="divide-y divide-ui-line ui-stagger">
          <li v-for="request in leaveRequests" :key="request.id" class="flex items-center gap-3 px-4 sm:px-5 py-3.5">
            <Avatar
              :src="request.employee?.user?.profile_photo"
              :alt="request.employee?.user?.name"
              size="w-9 h-9"
              icon-size="w-4 h-4"
            />
            <div class="flex-1 min-w-0">
              <p class="text-ui-h3 text-ui-ink truncate">{{ request.employee?.user?.name }}</p>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <UiBadge :tone="leaveTypeTone(request.type)">{{ leaveTypeLabel(request.type) }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">
                  {{ formatDate(request.start_date) }} - {{ formatDate(request.end_date) }} ({{ $t("attendance.leave.days", { n: request.days }, Number(request.days) || 0) }})
                </span>
              </div>
            </div>
            <div
              v-if="request.status === 'pending' && can('leave-request-approve')"
              class="flex flex-col sm:flex-row gap-1.5 shrink-0"
            >
              <UiButton variant="secondary" size="sm" :icon="Check" @click="showApproveModal(request)">{{ $t("common.actions.approve") }}</UiButton>
              <UiButton variant="danger" size="sm" :icon="X" @click="showRejectModal(request)">{{ $t("common.actions.reject") }}</UiButton>
            </div>
            <UiBadge v-else :tone="leaveStatusTone(request.status)" dot class="shrink-0">{{ leaveStatusLabel(request.status) }}</UiBadge>
          </li>

          <!-- Empty State -->
          <li v-if="!loadingLeaveRequests && leaveRequests.length === 0">
            <UiEmpty compact :icon="CalendarClock" :title="$t('attendance.leave.empty')" />
          </li>
        </ul>
      </section>

      <!-- Today's Attendance -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
        <header class="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-ui-line">
          <div class="flex-1 min-w-0">
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("attendance.summary.today") }}</h2>
            <p class="text-ui-cap text-ui-muted">{{ $t("attendance.summary.todayHint") }}</p>
          </div>
          <UiButton variant="ghost" size="sm" :icon-right="ArrowRight" :to="{ name: 'admin.attendances.records' }">{{ $t('common.actions.viewAll') }}</UiButton>
        </header>

        <div v-if="loadingAttendances" class="p-4 sm:p-5"><SkeletonList :rows="3" /></div>
        <ul v-else class="divide-y divide-ui-line ui-stagger">
          <li v-for="attendance in todayAttendances" :key="attendance.id" class="flex items-center gap-3 px-4 sm:px-5 py-3.5">
            <Avatar
              :src="attendance.employee?.user?.profile_photo"
              :alt="attendance.employee?.user?.name"
              size="w-9 h-9"
              icon-size="w-4 h-4"
            />
            <div class="flex-1 min-w-0">
              <p class="text-ui-h3 text-ui-ink truncate">{{ attendance.employee?.user?.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate mt-0.5">
                {{ attendance.employee?.job_information?.job_title }}
                <span class="text-ui-faint">·</span>
                {{ $t("attendance.summary.teamName", { name: attendance.employee?.job_information?.team?.name || "N/A" }) }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-ink tabular-nums">
                <Clock class="w-3.5 h-3.5 text-ui-faint" />{{ formatTime(attendance.check_in) }}
              </p>
              <p class="text-ui-cap text-ui-muted">{{ $t("attendance.summary.checkInTime") }}</p>
            </div>
            <UiBadge tone="ok" dot class="shrink-0 hidden sm:inline-flex">{{ $t("attendance.status.present") }}</UiBadge>
          </li>

          <!-- Empty State -->
          <li v-if="!loadingAttendances && todayAttendances.length === 0">
            <UiEmpty compact :icon="Users" :title="$t('attendance.records.empty')" />
          </li>
        </ul>
      </section>
    </div>

    <!-- Approve Modal -->
    <UiConfirmDialog
      v-model:open="showApproveModalState"
      type="success"
      :title="$t('attendance.leave.approveTitle')"
      :message="$t('attendance.leave.approveMessage')"
      :confirm-text="processingAction ? $t('attendance.leave.approving') : $t('common.actions.approve')"
      :loading="processingAction"
      @cancel="closeApproveModal"
      @confirm="confirmApprove"
    >
      <div v-if="selectedLeaveRequest" class="border border-ui-line rounded-ui-card p-3.5 space-y-1.5">
        <p class="text-ui-h3 text-ui-ink">{{ selectedLeaveRequest.employee?.user?.name }}</p>
        <UiBadge :tone="leaveTypeTone(selectedLeaveRequest.type)">{{ leaveTypeLabel(selectedLeaveRequest.type) }}</UiBadge>
        <p class="text-ui-small text-ui-text tabular-nums">
          {{ formatDate(selectedLeaveRequest.start_date) }} - {{ formatDate(selectedLeaveRequest.end_date) }} ({{ $t("attendance.leave.days", { n: selectedLeaveRequest.days }, Number(selectedLeaveRequest.days) || 0) }})
        </p>
        <p class="text-ui-small text-ui-muted">{{ selectedLeaveRequest.reason }}</p>
      </div>
    </UiConfirmDialog>

    <!-- Reject Modal -->
    <UiConfirmDialog
      v-model:open="showRejectModalState"
      type="danger"
      :title="$t('attendance.leave.rejectTitle')"
      :message="$t('attendance.leave.rejectMessage')"
      :confirm-text="processingAction ? $t('attendance.leave.rejecting') : $t('common.actions.reject')"
      :loading="processingAction"
      @cancel="closeRejectModal"
      @confirm="confirmReject"
    >
      <div v-if="selectedLeaveRequest" class="border border-ui-line rounded-ui-card p-3.5 space-y-1.5">
        <p class="text-ui-h3 text-ui-ink">{{ selectedLeaveRequest.employee?.user?.name }}</p>
        <UiBadge :tone="leaveTypeTone(selectedLeaveRequest.type)">{{ leaveTypeLabel(selectedLeaveRequest.type) }}</UiBadge>
        <p class="text-ui-small text-ui-text tabular-nums">
          {{ formatDate(selectedLeaveRequest.start_date) }} - {{ formatDate(selectedLeaveRequest.end_date) }} ({{ $t("attendance.leave.days", { n: selectedLeaveRequest.days }, Number(selectedLeaveRequest.days) || 0) }})
        </p>
        <p class="text-ui-small text-ui-muted">{{ selectedLeaveRequest.reason }}</p>
      </div>
    </UiConfirmDialog>
  </div>
</template>
