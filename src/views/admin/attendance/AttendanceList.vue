<script>
import { reactive } from "vue";
// Kept for the whole session (module scope), so coming back to the summary
// shows the last numbers at once and refreshes them quietly.
const summaryCache = reactive({
  owner: null,
  loaded: false,
  stats: null,
  pending: [],
  pendingTotal: 0,
  latest: [],
  today: [],
});
</script>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
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
  ChevronDown,
} from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useLeaveRequestStore } from "@/stores/leaveRequest";
import { useAuthStore } from "@/stores/auth";
import {
  formatDateShort,
  formatTime as formatTimeUtil,
} from "@/utils/dateUtils.js";
import { capitalize } from "@/utils/formatUtils.js";
import { can } from "@/helpers/permissionHelper";
import { useStaleFetch } from "@/composables/useStaleFetch";

// Second row of KPI tiles: hidden by default, the choice is remembered.
const MORE_STATS_KEY = "hris-attendance-more-stats";
const readMoreStats = () => {
  try {
    return localStorage.getItem(MORE_STATS_KEY) === "1";
  } catch {
    return false;
  }
};
const showMoreStats = ref(readMoreStats());
const toggleMoreStats = () => {
  showMoreStats.value = !showMoreStats.value;
  try {
    localStorage.setItem(MORE_STATS_KEY, showMoreStats.value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
};
import { optimistic } from "@/utils/optimistic";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import Avatar from "@/components/common/Avatar.vue";
import { UiPageHeader, UiStat, UiBadge, UiButton, UiEmpty, UiConfirmDialog, UiSpinner } from "@/components/ui";

const { t, te } = useI18n();
// Display labels for API values (the values themselves stay unchanged).
const leaveTypeLabel = (type) => (type && te(`attendance.leaveType.${type.toLowerCase()}`) ? t(`attendance.leaveType.${type.toLowerCase()}`) : capitalize(type));
const leaveStatusLabel = (status) => (status && te(`attendance.leaveStatus.${status.toLowerCase()}`) ? t(`attendance.leaveStatus.${status.toLowerCase()}`) : capitalize(status));

const attendanceStore = useAttendanceStore();
const leaveRequestStore = useLeaveRequestStore();
const authStore = useAuthStore();
const myUserId = computed(() => authStore.user?.id ?? null);

const PENDING_LIMIT = 5;
const RECENT_LIMIT = 5;
const STAT_DEFAULTS = {
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
};

const cache = summaryCache;
const statistics = computed(() => ({ ...STAT_DEFAULTS, ...(cache.stats || {}) }));

const loadStatistics = async () => {
  try {
    cache.stats = (await attendanceStore.fetchAdminStatistics()) || {};
  } catch (error) {
    console.error("Error loading statistics:", error);
  }
};
const loadPending = async () => {
  try {
    const { items, total } = await leaveRequestStore.fetchPendingLeaveRequests(PENDING_LIMIT);
    cache.pending = items;
    cache.pendingTotal = total;
  } catch (error) {
    console.error("Error loading pending leave requests:", error);
  }
};

// Stats, pending requests (newest first, with the total), the latest
// requests and today's check-ins -- all in parallel.
const loadAll = async () => {
  if (cache.owner !== myUserId.value) {
    Object.assign(cache, { owner: myUserId.value, loaded: false, stats: null, pending: [], pendingTotal: 0, latest: [], today: [] });
  }
  await Promise.all([
    loadStatistics(),
    loadPending(),
    leaveRequestStore
      .fetchLatestLeaveRequests(RECENT_LIMIT)
      .then((rows) => (cache.latest = rows || []))
      .catch((error) => console.error("Error loading leave requests:", error)),
    attendanceStore
      .fetchTodayAttendances(5)
      .then((rows) => (cache.today = rows || []))
      .catch((error) => console.error("Error loading attendances:", error)),
  ]);
  cache.loaded = true;
};

// Revisits within a minute make no request; returning to the browser tab
// refreshes quietly.
const { loading, refreshing } = useStaleFetch(loadAll, {
  key: () => ["ws-attendance-summary", myUserId.value],
  hasData: () => cache.loaded && cache.owner === myUserId.value,
  maxAge: 60_000,
});
const showSkeleton = computed(() => loading.value && !cache.loaded);

// Pending first (actionable), then the most recent decisions.
const pendingRequests = computed(() => cache.pending);
const pendingTotal = computed(() => Math.max(cache.pendingTotal, cache.pending.length));
const morePending = computed(() => Math.max(0, pendingTotal.value - cache.pending.length));
const recentDecided = computed(() => {
  const pendingIds = new Set(cache.pending.map((r) => r.id));
  return cache.latest.filter((r) => r.status !== "pending" && !pendingIds.has(r.id)).slice(0, RECENT_LIMIT);
});
const todayAttendances = computed(() => cache.today);
const canApprove = computed(() => can("leave-request-approve"));

// Tiles open the matching filtered list (records/leave pages read these
// query keys). Today's date in the browser's local time, YYYY-MM-DD.
const todayIso = () => new Date().toLocaleDateString("en-CA");
const recordsFor = (status) => ({ name: "admin.attendances.records", query: { status, from: todayIso(), to: todayIso() } });

const formatDate = (date) => (date ? formatDateShort(date) : "N/A");
const formatTime = (time) => (time ? formatTimeUtil(time) : "N/A");

// Presentation only: status / leave type -> badge tone.
const LEAVE_STATUS_TONE = { pending: "warn", approved: "ok", rejected: "bad" };
const LEAVE_TYPE_TONE = { annual: "info", sick: "bad", personal: "accent", emergency: "warn", maternity: "accent" };
const leaveStatusTone = (status) => LEAVE_STATUS_TONE[status?.toLowerCase()] || "neutral";
const leaveTypeTone = (type) => LEAVE_TYPE_TONE[type?.toLowerCase()] || "neutral";
const signed = (n) => `${n >= 0 ? "+" : ""}${n || 0}`;

const busyIds = ref(new Set());
const decide = async (request, action) => {
  if (busyIds.value.has(request.id)) return;
  busyIds.value.add(request.id);
  const status = action === "approve" ? "approved" : "rejected";
  const name = request.employee?.user?.name || "";
  const { ok, result } = await optimistic({
    apply: () => {
      const before = { pending: [...cache.pending], latest: [...cache.latest], pendingTotal: cache.pendingTotal, stats: cache.stats && { ...cache.stats } };
      cache.pending = cache.pending.filter((r) => r.id !== request.id);
      cache.pendingTotal = Math.max(0, cache.pendingTotal - 1);
      cache.latest = [{ ...request, status }, ...cache.latest.filter((r) => r.id !== request.id)];
      if (cache.stats) cache.stats = { ...cache.stats, pending_requests: Math.max(0, (cache.stats.pending_requests || 0) - 1) };
      return () => Object.assign(cache, before);
    },
    request: () =>
      action === "approve" ? leaveRequestStore.approveLeaveRequest(request.id) : leaveRequestStore.rejectLeaveRequest(request.id),
    success: t(action === "approve" ? "attendance.summary.approvedToast" : "attendance.summary.rejectedToast", { name }),
  });
  busyIds.value.delete(request.id);
  if (!ok) return;
  if (result?.id) cache.latest = cache.latest.map((r) => (r.id === result.id ? { ...r, ...result, employee: result.employee || r.employee } : r));
  loadStatistics();
  if (cache.pendingTotal > cache.pending.length) loadPending();
};
const approve = (request) => decide(request, "approve");

const showRejectModalState = ref(false);
const selectedLeaveRequest = ref(null);
const showRejectModal = (request) => {
  selectedLeaveRequest.value = request;
  showRejectModalState.value = true;
};
const closeRejectModal = () => {
  showRejectModalState.value = false;
  selectedLeaveRequest.value = null;
};
const confirmReject = () => {
  const request = selectedLeaveRequest.value;
  closeRejectModal();
  if (request) decide(request, "reject");
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('attendance.summary.title')" :subtitle="$t('attendance.summary.subtitle')" class="ui-anim-fade-up">
      <template #actions>
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted" role="status">
          <UiSpinner size="14px" />{{ $t("attendance.summary.refreshing") }}
        </span>
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
        :to="recordsFor('absent')"
      />
      <UiStat
        :label="$t('attendance.summary.stats.lateArrivals')"
        :value="statistics.late_today || 0"
        :icon="Clock"
        :tone="statistics.late_today ? 'warn' : ''"
        :hint="$t('attendance.summary.stats.after9')"
        :to="recordsFor('late')"
      />
    </div>

    <div class="-mt-2 space-y-3">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 -ml-1 px-1 rounded-ui-control text-ui-cap font-medium text-ui-muted hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
        :aria-expanded="showMoreStats"
        aria-controls="attendance-more-stats"
        @click="toggleMoreStats"
      >
        {{ showMoreStats ? $t("attendance.summary.stats.hideMore") : $t("attendance.summary.stats.showMore") }}
        <ChevronDown class="w-3.5 h-3.5 transition-transform duration-ui-fast" :class="{ 'rotate-180': showMoreStats }" />
      </button>
      <div v-if="showMoreStats" id="attendance-more-stats" class="ui-anim-fade grid grid-cols-2 md:grid-cols-4 gap-3 ui-stagger">
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
        :to="{ name: 'admin.leave-requests.dashboard', query: { status: 'pending' } }"
      />
      </div>
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <!-- Leave requests: pending first (actionable in place), then recent decisions -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
        <header class="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-ui-line">
          <div class="flex-1 min-w-0">
            <h2 class="text-ui-h2 text-ui-ink flex items-center gap-2">
              {{ $t("attendance.summary.needsApproval") }}
              <UiBadge v-if="pendingTotal" tone="warn">{{ pendingTotal }}</UiBadge>
            </h2>
            <p class="text-ui-cap text-ui-muted">{{ $t("attendance.summary.needsApprovalHint") }}</p>
          </div>
          <UiButton variant="ghost" size="sm" :icon-right="ArrowRight" :to="{ name: 'admin.leave-requests.dashboard' }">{{ $t('common.actions.viewAll') }}</UiButton>
        </header>

        <div v-if="showSkeleton" class="p-4 sm:p-5"><SkeletonList :rows="3" /></div>
        <template v-else>
          <TransitionGroup tag="ul" name="ui-fade" class="divide-y divide-ui-line">
            <li v-for="request in pendingRequests" :key="request.id" class="px-4 sm:px-5 py-3.5">
              <div class="flex items-center gap-3">
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
                  <p v-if="request.reason" class="text-ui-cap text-ui-muted mt-1 line-clamp-1" :title="request.reason">{{ request.reason }}</p>
                </div>
                <div v-if="canApprove" class="hidden sm:flex gap-1.5 shrink-0">
                  <UiButton variant="secondary" size="sm" :icon="Check" :disabled="busyIds.has(request.id)" @click="approve(request)">{{ $t("common.actions.approve") }}</UiButton>
                  <UiButton variant="danger" size="sm" :icon="X" :disabled="busyIds.has(request.id)" @click="showRejectModal(request)">{{ $t("common.actions.reject") }}</UiButton>
                </div>
                <UiBadge v-else :tone="leaveStatusTone(request.status)" dot class="shrink-0">{{ leaveStatusLabel(request.status) }}</UiBadge>
              </div>
              <!-- Phones: full-width tap targets under the row -->
              <div v-if="canApprove" class="grid grid-cols-2 gap-2 mt-3 sm:hidden">
                <UiButton variant="secondary" :icon="Check" :disabled="busyIds.has(request.id)" @click="approve(request)">{{ $t("common.actions.approve") }}</UiButton>
                <UiButton variant="danger" :icon="X" :disabled="busyIds.has(request.id)" @click="showRejectModal(request)">{{ $t("common.actions.reject") }}</UiButton>
              </div>
            </li>
          </TransitionGroup>
          <RouterLink
            v-if="morePending"
            :to="{ name: 'admin.leave-requests.dashboard', query: { status: 'pending' } }"
            class="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-ui-line text-ui-small font-medium text-ui-accent hover:bg-ui-hover"
          >
            {{ $t("attendance.summary.morePending", { n: morePending }, morePending) }}
            <ArrowRight class="w-4 h-4" />
          </RouterLink>
          <div v-if="!pendingRequests.length" class="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 text-ui-small text-ui-muted">
            <CheckCircle class="w-4 h-4 text-ui-ok shrink-0" />{{ $t("attendance.summary.allCaughtUp") }}
          </div>

          <template v-if="recentDecided.length">
            <p class="px-4 sm:px-5 pt-3 pb-1.5 border-t border-ui-line text-ui-over uppercase text-ui-muted">{{ $t("attendance.summary.recentDecisions") }}</p>
            <ul class="divide-y divide-ui-line">
              <li v-for="request in recentDecided" :key="request.id" class="flex items-center gap-3 px-4 sm:px-5 py-3">
                <Avatar
                  :src="request.employee?.user?.profile_photo"
                  :alt="request.employee?.user?.name"
                  size="w-8 h-8"
                  icon-size="w-4 h-4"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-ui-body font-medium text-ui-ink truncate">{{ request.employee?.user?.name }}</p>
                  <p class="text-ui-cap text-ui-muted truncate tabular-nums">
                    {{ leaveTypeLabel(request.type) }} · {{ formatDate(request.start_date) }} - {{ formatDate(request.end_date) }}
                  </p>
                </div>
                <UiBadge :tone="leaveStatusTone(request.status)" dot class="shrink-0">{{ leaveStatusLabel(request.status) }}</UiBadge>
              </li>
            </ul>
          </template>
        </template>
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

        <div v-if="showSkeleton" class="p-4 sm:p-5"><SkeletonList :rows="3" /></div>
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
          <li v-if="todayAttendances.length === 0">
            <UiEmpty compact :icon="Users" :title="$t('attendance.records.empty')" />
          </li>
        </ul>
      </section>
    </div>

    <!-- Reject keeps a confirm (approve is one click) -->
    <UiConfirmDialog
      v-model:open="showRejectModalState"
      type="danger"
      :title="$t('attendance.leave.rejectTitle')"
      :message="$t('attendance.leave.rejectMessage')"
      :confirm-text="$t('common.actions.reject')"
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
