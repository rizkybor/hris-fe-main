<script setup>
import { ref, onMounted, computed } from "vue";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  Plus,
  Eye,
  CalendarX,
  Paperclip,
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
import { formatLeaveType } from "@/utils/attendanceUtils";
import AttendanceStatsCards from "@/components/employee/attendance/AttendanceStatsCards.vue";
import LeaveRequestSuccessModal from "@/components/employee/attendance/LeaveRequestSuccessModal.vue";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";
import { UiBadge, UiButton, UiCard, UiEmpty, UiInput, UiModal, UiPageHeader, UiSelect, UiSwitch, UiTable } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t, te } = useI18n();

// Display labels for API enum values (the values themselves are unchanged).
// Unknown statuses fall back to "Present", same as getStatusConfig().
const statusLabel = (status) =>
  te(`myAttendance.status.${status}`) ? t(`myAttendance.status.${status}`) : t("myAttendance.status.present");
const leaveTypeLabel = (type) =>
  type && te(`myAttendance.leaveTypes.${type}`) ? t(`myAttendance.leaveTypes.${type}`) : formatLeaveType(type);

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
  (isIntern.value ? leaveTypes.value.filter((type) => type.value !== "annual_leave") : leaveTypes.value).map(
    (type) => ({ ...type, label: te(`myAttendance.leaveTypes.${type.value}`) ? t(`myAttendance.leaveTypes.${type.value}`) : type.label })
  )
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
  is_half_day: false,
  reason: "",
  emergency_contact: "",
  attachment: null,
});
const attachmentInputRef = ref(null);

// Computed
const recentAttendances = computed(() => {
  return attendances.value.slice(0, 7);
});

const totalDaysCalculated = computed(() => {
  if (leaveForm.value.is_half_day) return 0.5;
  if (!leaveForm.value.start_date || !leaveForm.value.end_date) {
    return 0;
  }
  return calculateWorkingDays(
    leaveForm.value.start_date,
    leaveForm.value.end_date
  );
});

// Mirrors LeaveRequestStoreRequest's own rule server-side: a doctor's note
// is required for sick leave spanning more than one day.
const attachmentRequired = computed(
  () =>
    leaveForm.value.leave_type === "sick_leave" &&
    !leaveForm.value.is_half_day &&
    totalDaysCalculated.value > 1
);

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
    is_half_day: false,
    reason: "",
    emergency_contact: "",
    attachment: null,
  };
  if (attachmentInputRef.value) attachmentInputRef.value.value = "";
};

// Half-day only makes sense for a single day -- keep End Date locked to
// Start Date while it's checked, same rule the backend enforces.
const toggleHalfDay = () => {
  leaveForm.value.is_half_day = !leaveForm.value.is_half_day;
  if (leaveForm.value.is_half_day) {
    leaveForm.value.end_date = leaveForm.value.start_date;
  }
};

const handleAttachmentChange = (event) => {
  leaveForm.value.attachment = event.target.files?.[0] ?? null;
};

const submitLeaveRequest = async () => {
  const startDate = new Date(leaveForm.value.start_date);
  const endDate = new Date(leaveForm.value.end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate <= today) {
    await alertModal.alert(t("myAttendance.form.errors.startTomorrow"), { type: "warning" });
    return;
  }

  if (endDate < startDate) {
    await alertModal.alert(t("myAttendance.form.errors.endAfterStart"), { type: "warning" });
    return;
  }

  if (attachmentRequired.value && !leaveForm.value.attachment) {
    await alertModal.alert(
      t("myAttendance.form.errors.attachmentRequired"),
      { type: "warning" }
    );
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
      error?.response?.data?.message || t("myAttendance.form.errors.submitFailed"),
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
  if (leaveForm.value.is_half_day) {
    leaveForm.value.end_date = leaveForm.value.start_date;
    return;
  }

  if (leaveForm.value.start_date && leaveForm.value.end_date) {
    if (new Date(leaveForm.value.end_date) < new Date(leaveForm.value.start_date)) {
      leaveForm.value.end_date = leaveForm.value.start_date;
    }
  }
};

// Presentation only: badge tone per status, table columns and the shared
// field style for the native date / file inputs.
const STATUS_TONE = {
  present: "ok",
  approved: "ok",
  absent: "bad",
  rejected: "bad",
  sick_leave: "warn",
  pending: "warn",
  weekend: "neutral",
};
const statusTone = (status) => STATUS_TONE[status] || "ok"; // getStatusConfig falls back to "Present"
const attendanceColumns = computed(() => [
  { key: "date", label: t("common.labels.date") },
  { key: "status", label: t("common.labels.status") },
  { key: "check_in", label: t("myAttendance.recent.checkIn") },
  { key: "check_out", label: t("myAttendance.recent.checkOut") },
  { key: "total", label: t("myAttendance.recent.totalHours"), align: "right" },
]);
const fieldClass =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-muted disabled:cursor-not-allowed";

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
  <!-- Bottom padding below lg: main's own bottom padding (room for the tab
       bar) is lost once the page overflows its h-full wrapper. -->
  <div class="p-1 sm:p-3 lg:p-5 space-y-4 sm:space-y-5">
    <UiPageHeader
      :title="$t('myAttendance.title')"
      :subtitle="$t('myAttendance.subtitle')"
      class="ui-anim-fade-up"
    >
      <template #actions>
        <UiButton :icon="Plus" @click="openLeaveRequestModal">{{ $t("myAttendance.requestLeave") }}</UiButton>
      </template>
    </UiPageHeader>

    <!-- Stats Cards -->
    <SkeletonStatCards v-if="attendanceLoading" :count="4" cols="grid-cols-2 lg:grid-cols-4" />
    <AttendanceStatsCards
      v-else
      :statistics="statistics"
      :pending-requests-count="pendingRequestsCount"
      :leave-balance="myLeaveBalance"
    />

    <!-- Content Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 items-start">
      <!-- Recent Attendance -->
      <UiCard
        :title="$t('myAttendance.recent.title')"
        :subtitle="$t('myAttendance.recent.subtitle')"
        :padded="false"
        class="xl:col-span-2 ui-anim-fade-up overflow-hidden"
      >
        <template #actions>
          <CalendarCheck class="w-[18px] h-[18px] text-ui-faint" />
        </template>

        <UiTable
          :columns="attendanceColumns"
          :rows="recentAttendances"
          :loading="attendanceLoading"
          :skeleton-rows="5"
          class="border-t border-ui-line"
        >
          <template #cell-date="{ row }">
            <p class="text-ui-small font-medium text-ui-ink">{{ getDayName(row.date) }}</p>
            <p class="text-ui-cap text-ui-muted">{{ formatDateShort(row.date) }}</p>
          </template>
          <template #cell-status="{ row }">
            <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
          </template>
          <template #cell-check_in="{ row }">
            <span v-if="row.check_in" class="tabular-nums text-ui-ink font-medium">{{ formatTime(row.check_in) }}</span>
            <span v-else class="text-ui-muted italic">{{ $t("myAttendance.recent.noData") }}</span>
          </template>
          <template #cell-check_out="{ row }">
            <span v-if="row.check_in && row.check_out" class="tabular-nums text-ui-ink font-medium">{{ formatTime(row.check_out) }}</span>
            <UiBadge v-else-if="row.check_in" tone="info" dot>{{ $t("myAttendance.recent.working") }}</UiBadge>
            <span v-else class="text-ui-faint">—</span>
          </template>
          <template #cell-total="{ row }">
            <span v-if="row.check_in && row.check_out" class="tabular-nums text-ui-ink font-medium">
              {{ calculateWorkingHours(row.check_in, row.check_out) }}
            </span>
            <span v-else class="text-ui-faint">—</span>
          </template>

          <!-- Phones: one card per day -->
          <template #mobile="{ row, number }">
            <div class="px-4 py-3.5">
              <div class="flex items-center gap-3">
                <span class="w-5 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ number }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-ui-h3 text-ui-ink">{{ getDayName(row.date) }}</p>
                  <p class="text-ui-cap text-ui-muted">{{ formatDateShort(row.date) }}</p>
                </div>
                <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
              </div>
              <dl v-if="row.check_in" class="grid grid-cols-3 gap-2 mt-3 pl-8">
                <div>
                  <dt class="text-ui-cap text-ui-muted">{{ $t("myAttendance.recent.checkIn") }}</dt>
                  <dd class="text-ui-small font-medium text-ui-ink tabular-nums">{{ formatTime(row.check_in) }}</dd>
                </div>
                <template v-if="row.check_out">
                  <div>
                    <dt class="text-ui-cap text-ui-muted">{{ $t("myAttendance.recent.checkOut") }}</dt>
                    <dd class="text-ui-small font-medium text-ui-ink tabular-nums">{{ formatTime(row.check_out) }}</dd>
                  </div>
                  <div>
                    <dt class="text-ui-cap text-ui-muted">{{ $t("myAttendance.recent.totalHours") }}</dt>
                    <dd class="text-ui-small font-medium text-ui-ink tabular-nums">
                      {{ calculateWorkingHours(row.check_in, row.check_out) }}
                    </dd>
                  </div>
                </template>
                <div v-else class="col-span-2">
                  <dt class="text-ui-cap text-ui-muted">{{ $t("common.labels.status") }}</dt>
                  <dd><UiBadge tone="info" dot>{{ $t("myAttendance.recent.working") }}</UiBadge></dd>
                </div>
              </dl>
              <p v-else class="text-ui-small text-ui-muted italic mt-2 pl-8">{{ $t("myAttendance.recent.noData") }}</p>
            </div>
          </template>

          <template #empty>
            <UiEmpty :icon="CalendarCheck" :title="$t('myAttendance.recent.empty')" compact />
          </template>
        </UiTable>
      </UiCard>

      <div class="space-y-4 sm:space-y-5 min-w-0">
        <!-- Leave Balance -->
        <div
          v-if="myLeaveBalance"
          class="ui-anim-fade-up bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 flex items-center justify-between gap-4"
        >
          <div class="min-w-0">
            <p class="text-ui-small text-ui-muted">{{ $t("myAttendance.balance.title", { year: myLeaveBalance.year }) }}</p>
            <p class="text-ui-h1 text-ui-ink tabular-nums mt-1">
              {{ myLeaveBalance.remaining }}
              <span class="text-ui-body font-normal text-ui-muted">/ {{ $t("common.duration.day", { n: myLeaveBalance.quota }, myLeaveBalance.quota) }}</span>
            </p>
          </div>
          <div class="w-10 h-10 rounded-ui-control bg-ui-accent-soft text-ui-accent flex items-center justify-center shrink-0">
            <CalendarDays class="w-5 h-5" />
          </div>
        </div>

        <!-- Leave Requests -->
        <UiCard :title="$t('myAttendance.requests.title')" :subtitle="$t('myAttendance.requests.subtitle')" :padded="false" class="ui-anim-fade-up overflow-hidden">
          <template #actions>
            <CalendarX class="w-[18px] h-[18px] text-ui-faint" />
          </template>

          <div class="border-t border-ui-line">
            <div v-if="leaveLoading" class="p-3">
              <SkeletonList :rows="3" />
            </div>

            <ul v-else-if="myLeaveRequests.length" class="divide-y divide-ui-line ui-stagger">
              <li v-for="request in myLeaveRequests" :key="request.id" class="px-5 py-3.5">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-ui-h3 text-ui-ink truncate">{{ leaveTypeLabel(request.leave_type) }}</p>
                    <p class="text-ui-cap text-ui-muted mt-0.5">
                      {{ formatDateShort(request.start_date) }} – {{ formatDateShort(request.end_date) }}
                      &middot; {{ $t("common.duration.day", { n: request.total_days }, request.total_days) }}
                    </p>
                  </div>
                  <UiBadge :tone="statusTone(request.status)" dot>{{ statusLabel(request.status) }}</UiBadge>
                </div>
                <div class="flex items-center justify-between gap-3 mt-2">
                  <p class="text-ui-cap text-ui-faint truncate">{{ $t("myAttendance.requests.requested", { date: formatRequestDate(request.created_at) }) }}</p>
                  <UiButton variant="ghost" size="sm" :icon="Eye" class="-mr-2.5" @click="openLeaveDetailsModal(request.id)">
                    {{ $t("common.actions.viewDetails") }}
                  </UiButton>
                </div>
              </li>
            </ul>

            <UiEmpty v-else :icon="CalendarX" :title="$t('myAttendance.requests.empty')" compact />
          </div>
        </UiCard>
      </div>
    </div>

    <!-- Leave Request Modal -->
    <UiModal
      v-model:open="showLeaveRequestModal"
      :title="$t('myAttendance.form.title')"
      :description="$t('myAttendance.form.description')"
      size="lg"
      @close="closeLeaveRequestModal"
    >
      <form id="leaveRequestForm" @submit.prevent="submitLeaveRequest" class="space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Leave Type -->
          <UiSelect
            v-model="leaveForm.leave_type"
            class="md:col-span-2"
            :label="$t('myAttendance.form.leaveType')"
            :placeholder="$t('myAttendance.form.leaveTypePlaceholder')"
            :options="availableLeaveTypes"
            required
          />

          <!-- Start Date -->
          <div>
            <label for="leave-start-date" class="block text-ui-small font-medium text-ui-ink mb-1.5">
              {{ $t("myAttendance.form.startDate") }}<span class="text-ui-bad"> *</span>
            </label>
            <input
              id="leave-start-date"
              type="date"
              v-model="leaveForm.start_date"
              @change="updateEndDateMin"
              required
              :class="fieldClass"
            />
          </div>

          <!-- End Date -->
          <div>
            <label for="leave-end-date" class="block text-ui-small font-medium text-ui-ink mb-1.5">
              {{ $t("myAttendance.form.endDate") }}<span class="text-ui-bad"> *</span>
            </label>
            <input
              id="leave-end-date"
              type="date"
              v-model="leaveForm.end_date"
              :min="leaveForm.start_date"
              :disabled="leaveForm.is_half_day"
              required
              :class="fieldClass"
            />
          </div>

          <!-- Half Day -->
          <UiSwitch
            class="md:col-span-2"
            :label="$t('myAttendance.form.halfDay')"
            :model-value="leaveForm.is_half_day"
            @update:model-value="toggleHalfDay"
          />

          <!-- Total Days -->
          <div class="md:col-span-2 flex items-center gap-3 px-4 py-3 bg-ui-subtle rounded-ui-control">
            <div class="w-9 h-9 rounded-ui-control bg-ui-surface border border-ui-line text-ui-muted flex items-center justify-center shrink-0">
              <Clock class="w-[18px] h-[18px]" />
            </div>
            <div>
              <p class="text-ui-cap text-ui-muted">{{ $t("myAttendance.form.totalDays") }}</p>
              <p class="text-ui-h3 text-ui-ink">
                {{ $t("common.duration.day", { n: totalDaysCalculated }, totalDaysCalculated) }}
                <span class="text-ui-cap font-normal text-ui-muted">&middot; {{ $t("myAttendance.form.excludingWeekends") }}</span>
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-4 pt-5 border-t border-ui-line">
          <!-- Reason -->
          <UiInput
            v-model="leaveForm.reason"
            :label="$t('myAttendance.form.reason')"
            :rows="4"
            required
            :placeholder="$t('myAttendance.form.reasonPlaceholder')"
          />

          <!-- Emergency Contact -->
          <UiInput
            v-model="leaveForm.emergency_contact"
            type="tel"
            :label="$t('myAttendance.form.emergencyContact')"
            :placeholder="$t('myAttendance.form.emergencyContactPlaceholder')"
          />

          <!-- Attachment -->
          <div>
            <label for="leave-attachment" class="block text-ui-small font-medium text-ui-ink mb-1.5">
              {{ $t("myAttendance.form.attachment") }}
              <span v-if="attachmentRequired" class="text-ui-bad"> *</span>
              <span v-else class="text-ui-muted font-normal ml-1">({{ $t("common.states.optional") }})</span>
            </label>
            <input
              id="leave-attachment"
              ref="attachmentInputRef"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              @change="handleAttachmentChange"
              class="w-full text-ui-small text-ui-text bg-ui-surface border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus file:mr-3 file:h-[36px] file:px-3 file:border-0 file:border-r file:border-ui-line file:bg-ui-subtle file:text-ui-ink file:font-medium file:cursor-pointer"
            />
            <p v-if="attachmentRequired" class="text-ui-cap text-ui-bad mt-1.5 flex items-center gap-1">
              <Paperclip class="w-3.5 h-3.5" />
              {{ $t("myAttendance.form.attachmentRequiredHint") }}
            </p>
            <p v-else class="text-ui-cap text-ui-muted mt-1.5">{{ $t("myAttendance.form.attachmentHint") }}</p>
          </div>
        </div>
      </form>

      <template #footer="{ close }">
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="close">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="leaveRequestForm" class="flex-1 sm:flex-none">{{ $t("myAttendance.form.submit") }}</UiButton>
      </template>
    </UiModal>

    <!-- Leave Details Modal -->
    <UiModal
      v-model:open="showLeaveDetailsModal"
      :title="$t('myAttendance.details.title')"
      :description="$t('myAttendance.details.description')"
      @close="closeLeaveDetailsModal"
    >
      <div v-if="selectedLeaveRequest" class="space-y-5">
        <dl class="grid grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t("myAttendance.form.leaveType") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink mt-0.5">{{ leaveTypeLabel(selectedLeaveRequest.leave_type) }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t("common.labels.status") }}</dt>
            <dd class="mt-1">
              <UiBadge :tone="statusTone(selectedLeaveRequest.status)" dot>
                {{ statusLabel(selectedLeaveRequest.status) }}
              </UiBadge>
            </dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t("myAttendance.form.startDate") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink mt-0.5">{{ formatDateLong(selectedLeaveRequest.start_date) }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t("myAttendance.form.endDate") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink mt-0.5">{{ formatDateLong(selectedLeaveRequest.end_date) }}</dd>
          </div>
          <div class="col-span-2 flex items-center gap-3 px-4 py-3 bg-ui-subtle rounded-ui-control">
            <div class="w-9 h-9 rounded-ui-control bg-ui-surface border border-ui-line text-ui-muted flex items-center justify-center shrink-0">
              <Clock class="w-[18px] h-[18px]" />
            </div>
            <div>
              <p class="text-ui-cap text-ui-muted">{{ $t("myAttendance.details.totalDuration") }}</p>
              <p class="text-ui-h3 text-ui-ink">
                {{ $t("common.duration.day", { n: selectedLeaveRequest.total_days }, selectedLeaveRequest.total_days) }}
                <span v-if="selectedLeaveRequest.is_half_day" class="text-ui-accent">({{ $t("myAttendance.details.halfDay") }})</span>
                <span class="block text-ui-cap font-normal text-ui-muted">{{ $t("myAttendance.details.workingDays") }}</span>
              </p>
            </div>
          </div>
        </dl>

        <div class="pt-5 border-t border-ui-line space-y-4">
          <div>
            <p class="text-ui-cap text-ui-muted">{{ $t("myAttendance.form.reason") }}</p>
            <p class="text-ui-body text-ui-ink mt-1 whitespace-pre-line">{{ selectedLeaveRequest.reason }}</p>
          </div>
          <div>
            <p class="text-ui-cap text-ui-muted">{{ $t("myAttendance.details.submitted") }}</p>
            <p class="text-ui-body text-ui-ink mt-0.5">{{ formatRequestDateLong(selectedLeaveRequest.created_at) }}</p>
          </div>
          <div v-if="selectedLeaveRequest.attachment_url">
            <p class="text-ui-cap text-ui-muted mb-1.5">{{ $t("myAttendance.details.attachment") }}</p>
            <a
              :href="selectedLeaveRequest.attachment_url"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 px-3 py-2.5 border border-ui-line rounded-ui-control hover:bg-ui-subtle text-ui-accent transition-colors"
            >
              <Paperclip class="w-4 h-4 shrink-0" />
              <span class="text-ui-small font-medium truncate">{{
                selectedLeaveRequest.attachment_original_name || $t("myAttendance.details.viewAttachment")
              }}</span>
            </a>
          </div>
        </div>
      </div>

      <template #footer="{ close }">
        <UiButton variant="secondary" class="w-full sm:w-auto" @click="close">{{ $t("common.actions.close") }}</UiButton>
      </template>
    </UiModal>

    <!-- Success Modal -->
    <LeaveRequestSuccessModal
      :show="showSuccessModal"
      :leave-data="submittedLeaveData"
      @close="closeSuccessModal"
    />
  </div>
</template>
