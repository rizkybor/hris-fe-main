<script setup lang="ts">
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiEmpty, UiStat } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import { ref, computed, onMounted } from "vue";
import {
  CalendarCheckIcon,
  CheckSquareIcon,
  FolderIcon,
  ClockIcon,
  TrendingUpIcon,
  StarIcon,
  BellIcon,
} from "lucide-vue-next";
import QuickActions from "./QuickActions.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { axiosInstance } from "@/plugins/axios";
import { useNotificationStore } from "@/stores/notification";
import { getTimeAgo } from "@/utils/dateUtils";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const statistics = ref({
  attendance_rate: 0,
  present_days: 0,
  absent_days: 0,
  sick_days: 0,
  late_days: 0,
  tasks_done: 0,
  tasks_done_yesterday: 0,
  tasks_in_progress: 0,
  tasks_todo: 0,
  tasks_review: 0,
  assigned_active_projects: 0,
  led_active_projects: 0,
  total_hours_worked: null,
  leave_balance: null,
});

const notificationStore = useNotificationStore();

const recentActivities = computed(() => {
  return notificationStore.notifications.map((n: any) => ({
    id: n.id,
    title: n.data?.title ?? n.data?.message ?? t("dashboard.myOverview.notification"),
    time: getTimeAgo(n.created_at),
    icon: BellIcon,
    color: n.read_at ? "text-gray-400" : "text-blue-600",
  }));
});

const activitiesLimit = ref(4);
const loadMoreActivities = async () => {
  activitiesLimit.value += 10;
  await notificationStore.fetchNotifications(activitiesLimit.value);
};

const loading = ref(false);
const currentDayOfMonth = computed(() => new Date().getDate());
const onTimePercentage = computed(() => {
  const present = statistics.value.present_days || 0;
  const late = statistics.value.late_days || 0;
  if (present <= 0) return 0;
  const ontime = Math.max(0, present - late);
  return Math.round((ontime / present) * 100 * 10) / 10;
});

const fetchMyStatistics = async () => {
  loading.value = true;
  try {
    const response = await axiosInstance.get("/dashboard/my-statistics");
    const data = response.data?.data || {};

    const attendance = data.attendance || {};
    const tasks = data.tasks || {};
    const projects = data.projects || {};

    statistics.value = {
      attendance_rate: attendance.rate ?? 0,
      present_days: attendance.present_days ?? 0,
      absent_days: attendance.absent_days ?? 0,
      sick_days: attendance.sick_days ?? 0,
      late_days: attendance.late_days ?? 0,
      tasks_done: tasks.done ?? 0,
      tasks_done_yesterday: tasks.done_yesterday ?? 0,
      tasks_in_progress: tasks.in_progress ?? 0,
      tasks_todo: tasks.todo ?? 0,
      tasks_review: tasks.review ?? 0,
      assigned_active_projects: projects.assigned_active ?? 0,
      led_active_projects: projects.led_active ?? 0,
      total_hours_worked: data.total_hours_worked ?? null,
      leave_balance: data.leave_balance ?? null,
    };
  } catch (error) {
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchMyStatistics();
  notificationStore.fetchNotifications(activitiesLimit.value);
});
</script>

<template>
  <div class="space-y-4">
    <div class="ui-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- Attendance rate: the one number staff check first -->
      <div class="lg:row-span-2 min-h-[196px] rounded-ui-card bg-ui-ink text-white p-5 flex flex-col">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <CalendarCheckIcon class="w-4 h-4 text-white/60" />
            <p class="text-ui-small font-medium text-white/75">{{ $t("dashboard.myOverview.attendanceRate") }}</p>
          </div>
          <span class="inline-flex items-center gap-1 h-5 px-1.5 rounded-md bg-white/10 text-ui-cap text-white/80">
            <TrendingUpIcon class="w-3 h-3" /> {{ $t("dashboard.myOverview.thisMonth") }}
          </span>
        </div>
        <div class="my-auto py-4">
          <Skeleton v-if="loading" dark width="110px" height="38px" rounded="8px" />
          <p v-else v-count-up class="text-ui-display tabular-nums">{{ statistics.attendance_rate }}%</p>
          <p class="text-ui-small text-white/65 mt-1">{{ $t("dashboard.myOverview.daysOf", { present: statistics.present_days, total: currentDayOfMonth }) }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui-cap text-white/65">
          <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[rgb(134_239_172)]"></span>{{ $t("dashboard.myOverview.onTime", { n: onTimePercentage }) }}</span>
          <span class="flex items-center gap-1"><StarIcon class="w-3 h-3" />{{ $t("dashboard.myOverview.greatPerformance") }}</span>
        </div>
      </div>

      <UiStat :label="$t('dashboard.myOverview.hoursWorked')" :value="$t('dashboard.myOverview.hoursValue', { n: statistics.total_hours_worked ?? '-' })" :hint="$t('dashboard.myOverview.thisMonthHint')" :icon="ClockIcon" :loading="loading" />
      <UiStat :label="$t('dashboard.myOverview.leaveBalance')" :value="statistics.leave_balance ?? '-'" :hint="$t('dashboard.myOverview.daysRemaining')" :icon="CalendarCheckIcon" :loading="loading" />

      <QuickActions />

      <UiStat :label="$t('dashboard.myOverview.tasksDone')" :value="statistics.tasks_done || 0" :hint="$t('dashboard.myOverview.yesterday', { n: statistics.tasks_done_yesterday || 0 })" :icon="CheckSquareIcon" :loading="loading" />
      <UiStat
        :label="$t('dashboard.myOverview.activeProjects')"
        :value="statistics.assigned_active_projects || 0"
        :hint="$t('dashboard.myOverview.assignedLeading', { n: statistics.led_active_projects || 0 })"
        :icon="FolderIcon"
        :loading="loading"
      />
    </div>

    <DashboardWidgetCard :title="$t('dashboard.myOverview.recentActivities')" flush>
      <template #actions>
        <button type="button" @click="loadMoreActivities" class="text-ui-small font-medium text-ui-accent hover:underline">{{ $t("common.actions.viewAll") }}</button>
      </template>
      <SkeletonList v-if="notificationStore.loading" :rows="4" class="p-3" />
      <UiEmpty v-else-if="recentActivities.length === 0" :icon="BellIcon" :title="$t('dashboard.myOverview.empty')" compact />
      <ul v-else class="divide-y divide-ui-line">
        <li v-for="activity in recentActivities" :key="activity.id" class="flex items-center gap-3 px-5 py-3">
          <span class="w-2 h-2 rounded-full shrink-0" :class="activity.color === 'text-gray-400' ? 'bg-ui-line-strong' : 'bg-ui-accent'" :aria-label="activity.color === 'text-gray-400' ? $t('dashboard.myOverview.read') : $t('dashboard.myOverview.unread')"></span>
          <p class="flex-1 min-w-0 text-ui-small text-ui-ink truncate">{{ activity.title }}</p>
          <span class="text-ui-cap text-ui-faint shrink-0">{{ activity.time }}</span>
        </li>
      </ul>
    </DashboardWidgetCard>
  </div>
</template>
