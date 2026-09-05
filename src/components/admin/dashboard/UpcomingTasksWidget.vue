<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { CalendarClock, Calendar, ClipboardList, FolderKanban } from "lucide-vue-next";
import { useTaskStore } from "@/stores/task";
import { useStaffTaskStore } from "@/stores/staffTask";
import { formatDateLong as formatDate } from "@/utils/dateUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const router = useRouter();
const taskStore = useTaskStore();
const staffTaskStore = useStaffTaskStore();

const PRIORITY_CLASS = {
  high: "bg-red-100 text-red-600",
  medium: "bg-yellow-100 text-yellow-600",
  low: "bg-green-100 text-green-600",
};

const STATUS_CLASS = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-[#FEF3C7] text-[#D97706]",
  review: "bg-[#EBF8FF] text-[#1E40AF]",
  done: "bg-[#F0FDF4] text-[#166534]",
  cancelled: "bg-slate-100 text-slate-600",
};

// Unifies the two independent task sources (Project Tasks and the daily
// Assigned Tasks a supervisor hands out via Business Documents) into one
// due-date-sorted list -- previously this widget only ever showed Project
// Tasks, silently hiding anything from the Assigned side.
const upcomingTasks = computed(() => {
  const projectTasks = taskStore.myTasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .map((t) => ({
      id: `project-${t.id}`,
      source: "project",
      title: t.name || "Task",
      subtitle: t.project?.name || "No Project",
      priority: t.priority || null,
      dueDate: t.due_date || null,
      status: t.status || "todo",
    }));

  const assignedTasks = staffTaskStore.myStaffTasks
    .filter((t) => t.my_assignment?.status !== "done")
    .map((t) => ({
      id: `assigned-${t.id}`,
      source: "assigned",
      title: t.title || "Task",
      subtitle: t.creator?.name ? `Assigned by ${t.creator.name}` : "Assigned task",
      priority: null,
      dueDate: t.due_date || null,
      status: t.my_assignment?.status || "todo",
    }));

  return [...projectTasks, ...assignedTasks]
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .slice(0, 6);
});

const loading = computed(() => taskStore.loading || staffTaskStore.loading);

const formatDueDate = (dateString) => {
  if (!dateString) return "No due date";
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return formatDate(dateString);
};

const goToAllTasks = () => router.push({ name: "employee.tasks" });

onMounted(() => {
  taskStore.fetchMyTasks(20, false);
  staffTaskStore.fetchMyStaffTasks();
});
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 bg-indigo-50 rounded-[10px] flex items-center justify-center shrink-0">
          <CalendarClock class="w-4 h-4 text-indigo-600" />
        </div>
        <h3 class="text-brand-dark text-base sm:text-lg font-bold">Upcoming Tasks</h3>
      </div>
      <button
        type="button"
        @click="goToAllTasks"
        class="text-[#0C51D9] text-xs sm:text-sm font-medium hover:underline shrink-0"
      >
        View All
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 3" :key="i" height="72px" rounded="12px" />
    </div>

    <div v-else-if="upcomingTasks.length === 0" class="text-center py-6 text-sm text-gray-400">
      No upcoming tasks
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="task in upcomingTasks"
        :key="task.id"
        class="p-4 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] transition-all duration-300"
      >
        <div class="flex items-start justify-between mb-2 gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 mb-1">
              <component :is="task.source === 'project' ? FolderKanban : ClipboardList" class="w-3 h-3 text-gray-400 shrink-0" />
              <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                {{ task.source === "project" ? "Project" : "Assigned" }}
              </span>
            </div>
            <h4 class="text-brand-dark text-sm font-semibold mb-1 truncate">
              {{ task.title }}
            </h4>
            <p class="text-gray-500 text-xs truncate">{{ task.subtitle }}</p>
          </div>
          <span
            v-if="task.priority"
            :class="PRIORITY_CLASS[task.priority] || PRIORITY_CLASS.medium"
            class="px-2 py-1 rounded-md text-xs font-semibold capitalize shrink-0"
          >
            {{ task.priority }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <Calendar class="w-3.5 h-3.5" />
            <span>{{ formatDueDate(task.dueDate) }}</span>
          </div>
          <span
            :class="STATUS_CLASS[task.status] || STATUS_CLASS.todo"
            class="px-2 py-1 rounded-md text-xs font-medium capitalize"
          >
            {{ task.status.replace("_", " ") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
