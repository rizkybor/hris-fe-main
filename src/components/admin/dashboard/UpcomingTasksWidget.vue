<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiBadge, UiEmpty } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { CalendarClock, ClipboardList, FolderKanban } from "lucide-vue-next";
import { useTaskStore } from "@/stores/task";
import { useStaffTaskStore } from "@/stores/staffTask";

const router = useRouter();
const taskStore = useTaskStore();
const staffTaskStore = useStaffTaskStore();

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
  // Short date so it fits the badge; the full date is in the task itself.
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

// Overdue and today stand out; later dates stay neutral.
const dueTone = (dateString) => {
  if (!dateString) return "neutral";
  const due = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "bad";
  if (due.getTime() === today.getTime()) return "warn";
  return "neutral";
};

const goToAllTasks = () => router.push({ name: "employee.tasks" });

onMounted(() => {
  taskStore.fetchMyTasks(20, false);
  staffTaskStore.fetchMyStaffTasks();
});
</script>

<template>
  <DashboardWidgetCard title="Upcoming Tasks" :meta="upcomingTasks.length ? `${upcomingTasks.length} open` : ''" :to="{ name: 'employee.tasks' }" flush>
    <SkeletonList v-if="loading" :rows="3" class="p-3" />
    <UiEmpty v-else-if="upcomingTasks.length === 0" :icon="CalendarClock" title="No upcoming tasks" compact />
    <ul v-else class="divide-y divide-ui-line">
      <li v-for="task in upcomingTasks" :key="task.id">
        <button type="button" class="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-ui-hover transition-colors" @click="goToAllTasks">
          <component :is="task.source === 'project' ? FolderKanban : ClipboardList" class="w-4 h-4 text-ui-faint shrink-0" :aria-label="task.source === 'project' ? 'Project task' : 'Assigned task'" />
          <div class="flex-1 min-w-0">
            <p class="text-ui-body font-medium text-ui-ink truncate">{{ task.title }}</p>
            <p class="text-ui-cap text-ui-muted truncate">
              {{ task.subtitle }}<span class="capitalize"> · {{ task.status.replace("_", " ") }}</span><span v-if="task.priority" class="capitalize"> · {{ task.priority }} priority</span>
            </p>
          </div>
          <UiBadge :tone="dueTone(task.dueDate)" class="shrink-0">{{ formatDueDate(task.dueDate) }}</UiBadge>
        </button>
      </li>
    </ul>
  </DashboardWidgetCard>
</template>
