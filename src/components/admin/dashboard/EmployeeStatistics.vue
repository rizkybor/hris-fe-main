<script setup lang="ts">
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
    title: n.data?.title ?? n.data?.message ?? "Notification",
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
  <!-- Employee Stats Layout -->
  <div class="mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- My Attendance Card (spans 2 rows on the left) -->
      <div
        class="main-card lg:row-span-2 rounded-[14px] border border-[#0B1042] relative overflow-hidden p-4 sm:p-5"
      >
        <!-- Decorative glow orbs -->
        <div
          class="pointer-events-none absolute -top-10 -right-8 w-40 h-40 rounded-full bg-blue-500/20 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-14 -left-6 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl"
        ></div>

        <div class="flex flex-col justify-center h-full relative z-10">
          <!-- Trending Badge -->
          <div class="flex items-center gap-2 mb-3">
            <div
              class="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm"
            >
              <TrendingUpIcon class="w-3 h-3 text-white" />
              <span class="text-brand-white text-xs font-semibold"
                >This Month</span
              >
            </div>
          </div>

          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3"
          >
            <div>
              <p class="text-brand-white-90 text-sm font-medium">
                Attendance Rate
              </p>
              <Skeleton v-if="loading" dark width="100px" height="2.5rem" rounded="8px" class="my-4" />
              <p
                v-else
                class="text-brand-white text-3xl sm:text-5xl font-extrabold leading-none my-4"
              >
                {{ statistics.attendance_rate }}%
              </p>
              <p class="text-brand-white-80 text-base font-normal">
                {{ statistics.present_days }} of {{ currentDayOfMonth }} days
              </p>
            </div>
            <div
              class="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-[14px] flex items-center justify-center"
            >
              <CalendarCheckIcon class="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <!-- Additional Info -->
          <div class="flex items-center gap-3 mt-auto">
            <div class="flex items-center gap-1">
              <div
                class="w-2 h-2 bg-green-400 rounded-full animate-pulse"
              ></div>
              <span class="text-brand-white-70 text-xs font-normal"
                >{{ onTimePercentage }}% On Time</span
              >
            </div>
            <div class="flex items-center gap-1">
              <StarIcon class="w-3 h-3 text-white opacity-70" />
              <span class="text-brand-white-70 text-xs font-normal"
                >Great Performance</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Row 1 Stats Cards -->
      <!-- Total Hours Worked -->
      <div
        class="stats-card bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4 sm:p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Hours Worked</p>
            <Skeleton v-if="loading" width="50px" height="1.75rem" rounded="6px" class="my-2" />
            <p
              v-else
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2"
            >
              {{ (statistics.total_hours_worked ?? "-") + "h" }}
            </p>
            <p class="text-success text-sm font-medium">This month</p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
          >
            <ClockIcon class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <!-- Leave Balance -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4 sm:p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Leave Balance</p>
            <Skeleton v-if="loading" width="50px" height="1.75rem" rounded="6px" class="my-2" />
            <p
              v-else
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2"
            >
              {{ statistics.leave_balance ?? "-" }}
            </p>
            <p class="text-gray-500 text-sm font-medium">Days remaining</p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-[12px] flex items-center justify-center"
          >
            <CalendarCheckIcon class="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Quick Actions Card (spans 2 rows on the right) -->
      <QuickActions />

      <!-- Row 2 Stats Cards -->
      <!-- Tasks Done -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4 sm:p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Tasks Done</p>
            <Skeleton v-if="loading" width="50px" height="1.75rem" rounded="6px" class="my-2" />
            <p
              v-else
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2"
            >
              {{ statistics.tasks_done || 0 }}
            </p>
            <p class="text-success text-sm font-medium">
              +{{ statistics.tasks_done_yesterday || 0 }} yesterday
            </p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-[12px] flex items-center justify-center"
          >
            <CheckSquareIcon class="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
          </div>
        </div>
      </div>

      <!-- Active Projects -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4 sm:p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Active Projects</p>
            <Skeleton v-if="loading" width="50px" height="1.75rem" rounded="6px" class="my-2" />
            <p
              v-else
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2"
            >
              {{ statistics.assigned_active_projects || 0 }}
            </p>
            <p class="text-gray-500 text-sm font-medium">
              Assigned to you • Leading:
              {{ statistics.led_active_projects || 0 }}
            </p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-[12px] flex items-center justify-center"
          >
            <FolderIcon class="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Recent Activities -->
  <div class="mb-6">
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-brand-dark text-base sm:text-lg font-bold">
          Recent Activities
        </h3>
        <button
          @click="loadMoreActivities"
          class="text-[#0C51D9] text-xs sm:text-sm font-medium hover:underline"
        >
          View All
        </button>
      </div>

      <div v-if="notificationStore.loading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="flex items-center gap-3">
          <Skeleton width="40px" height="40px" rounded="12px" />
          <div class="flex-1 space-y-2">
            <Skeleton width="70%" height="12px" />
            <Skeleton width="40%" height="10px" />
          </div>
        </div>
      </div>

      <div v-else-if="recentActivities.length === 0" class="text-center py-6 text-sm text-gray-400">
        No recent activity
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="activity in recentActivities"
          :key="activity.id"
          class="flex items-start gap-3"
        >
          <div
            :class="`${activity.color
              .replace('text-', 'bg-')
              .replace('600', '50')}`"
            class="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
          >
            <component
              :is="activity.icon"
              :class="activity.color"
              class="w-5 h-5"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-brand-dark text-sm font-medium">
              {{ activity.title }}
            </p>
            <p class="text-gray-500 text-xs">{{ activity.time }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
