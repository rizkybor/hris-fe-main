<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  CalendarCheckIcon,
  CheckSquareIcon,
  FolderIcon,
  ClockIcon,
  TrendingUpIcon,
  StarIcon,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Calendar,
  Users,
  MessageSquare,
} from "lucide-vue-next";
import QuickActions from "./QuickActions.vue";
import { useAuthStore } from "@/stores/auth";
import { axiosInstance } from "@/plugins/axios";
import { useTaskStore } from "@/stores/task";
import { useEmployeeStore } from "@/stores/employee";

const authStore = useAuthStore();

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

const taskStore = useTaskStore();
const employeeStore = useEmployeeStore();
const upcomingTasks = computed(() => {
  return taskStore.tasks.map((t: any) => ({
    id: t.id,
    title: t.title || t.name || "Task",
    project: t.project?.name || t.project_name || "-",
    priority: t.priority || "medium",
    dueDate: t.due_date || t.deadline || "",
    status: t.status || "todo",
  }));
});

// Dummy recent activities
const recentActivities = ref([
  {
    id: 1,
    type: "task_completed",
    title: "Completed task: User Authentication Flow",
    time: "2 hours ago",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  {
    id: 2,
    type: "comment",
    title: "Commented on PR: Add dark mode support",
    time: "4 hours ago",
    icon: MessageSquare,
    color: "text-blue-600",
  },
  {
    id: 3,
    type: "check_in",
    title: "Checked in at 08:30 AM",
    time: "6 hours ago",
    icon: Clock3,
    color: "text-purple-600",
  },
  {
    id: 4,
    type: "meeting",
    title: "Attended Sprint Planning Meeting",
    time: "Yesterday",
    icon: Users,
    color: "text-orange-600",
  },
]);

const loading = ref(false);
const userName = computed(() => authStore.user?.name || "Employee");
const currentDayOfMonth = computed(() => new Date().getDate());
const onTimePercentage = computed(() => {
  const present = statistics.value.present_days || 0;
  const late = statistics.value.late_days || 0;
  if (present <= 0) return 0;
  const ontime = Math.max(0, present - late);
  return Math.round((ontime / present) * 100 * 10) / 10;
});

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-600";
    case "medium":
      return "bg-yellow-100 text-yellow-600";
    case "low":
      return "bg-green-100 text-green-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case "in_progress":
      return "bg-blue-100 text-blue-600";
    case "pending":
      return "bg-gray-100 text-gray-600";
    case "completed":
      return "bg-green-100 text-green-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

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
    };
  } catch (error) {
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchMyStatistics();
  employeeStore
    .fetchMyTeamProjects()
    .then((projects: any[]) => {
      const firstProjectId =
        Array.isArray(projects) && projects.length ? projects[0].id : null;
      if (firstProjectId) {
        return taskStore.fetchProjectTasks(firstProjectId);
      }
    })
    .catch(() => {});
});
</script>

<template>
  <!-- Employee Stats Layout -->
  <div class="mb-6">
    <!-- Welcome Message -->
    <div class="mb-4">
      <h2 class="text-brand-dark text-xl sm:text-2xl font-bold">
        Welcome back, {{ userName }}! 👋
      </h2>
      <p class="text-gray-600 text-xs sm:text-sm">
        Here's your performance overview
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- My Attendance Card (spans 2 rows on the left) -->
      <div
        class="main-card lg:row-span-2 rounded-[20px] border border-[#0B1042] relative overflow-hidden p-4 sm:p-5"
      >
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
              <p
                class="text-brand-white text-3xl sm:text-5xl font-extrabold leading-none my-4"
              >
                {{ loading ? "..." : statistics.attendance_rate }}%
              </p>
              <p class="text-brand-white-80 text-base font-normal">
                {{ statistics.present_days }} of {{ currentDayOfMonth }} days
              </p>
            </div>
            <div
              class="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-[20px] flex items-center justify-center"
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
        class="stats-card bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Hours Worked</p>
            <p
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2"
            >
              {{
                loading ? "..." : (statistics.total_hours_worked ?? "-") + "h"
              }}
            </p>
            <p class="text-success text-sm font-medium">This month</p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-[16px] flex items-center justify-center"
          >
            <ClockIcon class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <!-- Leave Balance -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Leave Balance</p>
            <p
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2"
            >
              {{ loading ? "..." : statistics.leave_balance ?? "-" }}
            </p>
            <p class="text-gray-500 text-sm font-medium">Days remaining</p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-[16px] flex items-center justify-center"
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
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Tasks Done</p>
            <p
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2"
            >
              {{ loading ? "..." : statistics.tasks_done || 0 }}
            </p>
            <p class="text-success text-sm font-medium">
              +{{ statistics.tasks_done_yesterday || 0 }} yesterday
            </p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-[16px] flex items-center justify-center"
          >
            <CheckSquareIcon class="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
          </div>
        </div>
      </div>

      <!-- Active Projects -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Active Projects</p>
            <p
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2"
            >
              {{ loading ? "..." : statistics.assigned_active_projects || 0 }}
            </p>
            <p class="text-gray-500 text-sm font-medium">
              Assigned to you • Leading:
              {{ statistics.led_active_projects || 0 }}
            </p>
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-[16px] flex items-center justify-center"
          >
            <FolderIcon class="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Additional Sections -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
    <!-- Upcoming Tasks -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-4 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-brand-dark text-base sm:text-lg font-bold">
          Upcoming Tasks
        </h3>
        <a
          href="#"
          class="text-[#0C51D9] text-xs sm:text-sm font-medium hover:underline"
          >View All</a
        >
      </div>

      <div class="space-y-3">
        <div
          v-for="task in upcomingTasks"
          :key="task.id"
          class="p-4 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] transition-all duration-300"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <h4 class="text-brand-dark text-sm font-semibold mb-1">
                {{ task.title }}
              </h4>
              <p class="text-gray-500 text-xs">{{ task.project }}</p>
            </div>
            <span
              :class="getPriorityClass(task.priority)"
              class="px-2 py-1 rounded-md text-xs font-semibold capitalize"
            >
              {{ task.priority }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <Calendar class="w-3.5 h-3.5" />
              <span>{{ formatDate(task.dueDate) }}</span>
            </div>
            <span
              :class="getStatusClass(task.status)"
              class="px-2 py-1 rounded-md text-xs font-medium capitalize"
            >
              {{ task.status.replace("_", " ") }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activities -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-4 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-brand-dark text-base sm:text-lg font-bold">
          Recent Activities
        </h3>
        <a
          href="#"
          class="text-[#0C51D9] text-xs sm:text-sm font-medium hover:underline"
          >View All</a
        >
      </div>

      <div class="space-y-4">
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
