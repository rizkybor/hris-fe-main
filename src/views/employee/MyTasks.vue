<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter, useRoute } from "vue-router";
import { useTaskStore } from "@/stores/task";
import { useStaffTaskStore } from "@/stores/staffTask";
import { formatDateLong as formatDate } from "@/utils/dateUtils.js";
import { Search, Calendar, Folder, ListChecks, FolderX, SearchX, ChevronDown, ClipboardList, X } from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { getPriorityColor } from "@/utils/styleHelpers";
import StaffTaskComments from "@/components/admin/documents/StaffTaskComments.vue";

const router = useRouter();
const route = useRoute();
const taskStore = useTaskStore();
const { myTasks, loading } = storeToRefs(taskStore);

// "Assigned Tasks" -- daily tasks handed out by Superadmin/Manager/Finance
// Manager/Operational Director via Document Letters > Staff Tasks, distinct
// from the Project Tasks below (which come from a Project's own board).
const staffTaskStore = useStaffTaskStore();
const { myStaffTasks, loading: staffTasksLoading } = storeToRefs(staffTaskStore);

const STAFF_TASK_STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const staffTaskStatusClasses = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-[#FEF3C7] text-[#D97706]",
  done: "bg-[#F0FDF4] text-[#166534]",
};

const staffTaskStatusAccent = {
  todo: "border-l-gray-400",
  in_progress: "border-l-blue-500",
  done: "border-l-green-500",
};

const updatingStaffTaskId = ref(null);
const handleStaffTaskStatusChange = async (task, event) => {
  const newStatus = event.target.value;
  if (newStatus === task.my_assignment?.status) return;
  updatingStaffTaskId.value = task.id;
  try {
    await staffTaskStore.updateMyStatus(task.id, newStatus);
  } catch (error) {
    console.error("Failed to update task status:", error);
  } finally {
    updatingStaffTaskId.value = null;
  }
};

const staffTaskOverdue = (task) => {
  if (!task.due_date || task.my_assignment?.status === "done") return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
};

// Card previews show a plain-text snippet -- rendering raw HTML tags inside
// a line-clamped card looks broken (stray "<p>" text, truncated mid-tag).
const stripHtml = (html) => (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const detailStaffTask = ref(null);
const showStaffTaskDetail = ref(false);
const openStaffTaskDetail = (task) => {
  detailStaffTask.value = task;
  showStaffTaskDetail.value = true;
};
const closeStaffTaskDetail = () => {
  showStaffTaskDetail.value = false;
  detailStaffTask.value = null;
};

const staffTaskCommentAssignees = computed(() => {
  if (!detailStaffTask.value) return [];
  const list = (detailStaffTask.value.assignees || []).map((a) => ({ id: a.employee_id, name: a.name }));
  const creatorEmployeeId = detailStaffTask.value.creator?.employee_profile?.id;
  if (creatorEmployeeId && !list.some((a) => a.id === creatorEmployeeId)) {
    list.push({ id: creatorEmployeeId, name: detailStaffTask.value.creator?.name });
  }
  return list;
});

// Same 5 statuses/labels as the Kanban board's columns (TaskBoard.vue's
// COLUMNS), so a task's status reads identically everywhere.
const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const updatingTaskId = ref(null);
const goToTask = (task) => {
  if (!task.projectId) return;
  router.push({
    name: "admin.projects.detail",
    params: { id: task.projectId },
    query: { task: task.id },
  });
};

const handleStatusChange = async (task, event) => {
  const newStatus = event.target.value;
  if (newStatus === task.status) return;
  updatingTaskId.value = task.id;
  try {
    await taskStore.updateTask(task.id, { status: newStatus });
    await taskStore.fetchMyTasks(200, true);
  } catch (error) {
    console.error("Failed to update task status:", error);
  } finally {
    updatingTaskId.value = null;
  }
};

const searchQuery = ref("");
const statusFilter = ref("");
const projectFilter = ref("");

const taskStatusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  cancelled: "Cancelled",
};

const taskStatusClasses = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-[#FEF3C7] text-[#D97706]",
  review: "bg-[#EBF8FF] text-[#1E40AF]",
  done: "bg-[#F0FDF4] text-[#166534]",
  cancelled: "bg-slate-100 text-slate-600",
};

// Left accent bar per status, matching the Kanban column colors so a task's
// status reads consistently whether viewed here or on the board.
const taskStatusAccent = {
  todo: "border-l-gray-400",
  in_progress: "border-l-blue-500",
  review: "border-l-amber-500",
  done: "border-l-green-500",
  cancelled: "border-l-slate-500",
};

const tasks = computed(() =>
  myTasks.value.map((task) => ({
    id: task.id,
    title: task.name,
    description: task.description,
    status: task.status,
    statusLabel: taskStatusLabels[task.status] ?? task.status,
    statusClass: taskStatusClasses[task.status] ?? "bg-gray-100 text-gray-600",
    statusAccent: taskStatusAccent[task.status] ?? "border-l-gray-300",
    dueDate: task.due_date ? formatDate(task.due_date) : "No due date",
    hasDueDate: Boolean(task.due_date),
    projectId: task.project?.id ?? null,
    project: task.project?.name ?? "No Project",
    priority: task.priority,
  }))
);

const projects = computed(() => {
  const map = new Map();
  tasks.value.forEach((task) => {
    const key = task.projectId ?? "none";
    if (!map.has(key)) {
      map.set(key, { id: task.projectId, name: task.project });
    }
  });
  return Array.from(map.values());
});

const filteredTasks = computed(() => {
  return tasks.value.filter((task) => {
    const matchesSearch = searchQuery.value
      ? task.title?.toLowerCase().includes(searchQuery.value.toLowerCase())
      : true;
    const matchesStatus = statusFilter.value ? task.status === statusFilter.value : true;
    const matchesProject = projectFilter.value
      ? String(task.projectId) === projectFilter.value
      : true;
    return matchesSearch && matchesStatus && matchesProject;
  });
});

const hasActiveFilters = computed(() => Boolean(searchQuery.value || statusFilter.value || projectFilter.value));
const clearFilters = () => {
  searchQuery.value = "";
  statusFilter.value = "";
  projectFilter.value = "";
};

const groupedTasks = computed(() => {
  const groups = new Map();
  filteredTasks.value.forEach((task) => {
    const key = task.projectId ?? "none";
    if (!groups.has(key)) {
      groups.set(key, { projectName: task.project, tasks: [] });
    }
    groups.get(key).tasks.push(task);
  });
  return Array.from(groups.values());
});

onMounted(async () => {
  taskStore.fetchMyTasks(200, true);
  await staffTaskStore.fetchMyStaffTasks();

  // Deep-link from a StaffTaskAssigned/StaffTaskCommentMention notification
  // (?staff_task=<id>, optionally &comment=<id>) -- open that task's detail
  // straight away.
  const targetId = route.query.staff_task ? Number(route.query.staff_task) : null;
  if (targetId) {
    const task = myStaffTasks.value.find((t) => t.id === targetId);
    if (task) openStaffTaskDetail(task);
  }
});
</script>

<template>
  <div class="px-4 py-4">
    <!-- Assigned Tasks: daily tasks handed out via Document Letters > Staff
    Tasks (not tied to a Project), each with its own progress you verify. -->
    <div v-if="staffTasksLoading || myStaffTasks.length > 0" class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5 mb-4">
      <div class="flex items-center gap-2 mb-3.5">
        <div class="w-9 h-9 bg-emerald-50 rounded-[10px] flex items-center justify-center shrink-0">
          <ClipboardList class="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h4 class="text-brand-dark text-sm font-bold">Assigned Tasks</h4>
          <p class="text-brand-light text-xs">Daily tasks assigned to you -- verify your progress here</p>
        </div>
      </div>

      <div v-if="staffTasksLoading" class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Skeleton v-for="i in 2" :key="i" height="90px" rounded="12px" />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div
          v-for="task in myStaffTasks"
          :key="task.id"
          @click="openStaffTaskDetail(task)"
          class="bg-white border border-[#DCDEDD] rounded-[12px] p-3.5 hover:border-[#0C51D9] hover:border-2 hover:shadow-sm transition-all duration-300 cursor-pointer border-l-4"
          :class="staffTaskStatusAccent[task.my_assignment?.status] ?? 'border-l-gray-300'"
        >
          <div class="flex items-start justify-between gap-2 mb-2.5">
            <h4 class="text-brand-dark text-sm font-semibold flex-1 min-w-0">{{ task.title }}</h4>
            <span
              :class="staffTaskStatusClasses[task.my_assignment?.status]"
              class="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0"
              >{{ STAFF_TASK_STATUS_OPTIONS.find((o) => o.value === task.my_assignment?.status)?.label ?? task.my_assignment?.status }}</span
            >
          </div>

          <p v-if="task.description" class="text-brand-light text-xs mb-3 line-clamp-2">{{ stripHtml(task.description) }}</p>

          <div class="flex items-center gap-1.5 mb-3 flex-wrap">
            <span v-if="staffTaskOverdue(task)" class="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-700">Overdue</span>
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">
              <Calendar class="w-3 h-3" />
              <span class="text-xs font-medium">{{ formatDate(task.due_date) }}</span>
            </div>
            <span class="text-xs text-gray-400">by {{ task.creator?.name }}</span>
          </div>

          <div class="pt-3 border-t border-gray-100">
            <select
              :value="task.my_assignment?.status"
              @change="handleStaffTaskStatusChange(task, $event)"
              @click.stop
              :disabled="updatingStaffTaskId === task.id"
              class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-[8px] text-xs font-medium hover:border-[#0C51D9] focus:border-[#0C51D9] outline-none transition-all disabled:opacity-50 bg-white"
            >
              <option v-for="opt in STAFF_TASK_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Assigned Task Detail Modal -->
    <div v-if="showStaffTaskDetail" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closeStaffTaskDetail">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <div>
            <h3 class="text-brand-dark text-lg font-bold">{{ detailStaffTask?.title }}</h3>
            <p class="text-brand-light text-xs mt-0.5">Due {{ formatDate(detailStaffTask?.due_date) }} • by {{ detailStaffTask?.creator?.name }}</p>
          </div>
          <button @click="closeStaffTaskDetail" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] shrink-0">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div class="p-5 space-y-5">
          <div v-if="detailStaffTask?.description" class="rich-text-content text-sm text-brand-dark leading-relaxed" v-html="detailStaffTask.description"></div>

          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Your Status</label>
            <select
              :value="detailStaffTask?.my_assignment?.status"
              @change="handleStaffTaskStatusChange(detailStaffTask, $event)"
              class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm"
            >
              <option v-for="opt in STAFF_TASK_STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <StaffTaskComments
            :staff-task-id="detailStaffTask.id"
            :assignees="staffTaskCommentAssignees"
            :can-comment="true"
          />
        </div>
      </div>
    </div>

    <div class="bg-white sm:p-2 mb-3">
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 sm:w-11 sm:h-11 bg-orange-50 rounded-[10px] flex items-center justify-center shrink-0">
            <ListChecks class="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base font-bold">My Tasks</h3>
            <p class="text-brand-light text-xs">All tasks assigned to you, grouped by project</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="relative flex-1 min-w-0">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-gray-400" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search tasks..."
            class="w-full pl-10 pr-4 py-2.5 text-sm border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-medium"
          />
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <div class="relative">
            <select
              v-model="projectFilter"
              class="pl-3.5 pr-8 py-2.5 text-sm border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-medium appearance-none bg-white max-w-[160px]"
            >
              <option value="">All Projects</option>
              <option v-for="p in projects" :key="p.id ?? 'none'" :value="String(p.id)">
                {{ p.name }}
              </option>
            </select>
            <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <div class="relative">
            <select
              v-model="statusFilter"
              class="pl-3.5 pr-8 py-2.5 text-sm border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-medium appearance-none bg-white"
            >
              <option value="">All Status</option>
              <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <button
            v-if="hasActiveFilters"
            type="button"
            @click="clearFilters"
            class="px-3 py-2.5 rounded-[10px] text-xs font-semibold text-gray-500 hover:text-[#0C51D9] hover:bg-gray-50 transition-colors duration-200 shrink-0"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Skeleton v-for="i in 4" :key="i" height="110px" rounded="12px" />
      </div>
    </div>

    <div
      v-else-if="filteredTasks.length === 0"
      class="flex flex-col items-center justify-center text-center py-14 rounded-[14px] border border-dashed border-[#DCDEDD] bg-gray-50/60"
    >
      <template v-if="hasActiveFilters">
        <SearchX class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No tasks match your filters</h4>
        <p class="text-brand-light text-xs mb-4">Try adjusting your search, project, or status filter</p>
        <button
          type="button"
          @click="clearFilters"
          class="px-4 py-2 rounded-[8px] border border-[#DCDEDD] text-xs font-semibold text-brand-dark hover:border-[#0C51D9] hover:bg-white transition-colors duration-200"
        >
          Clear filters
        </button>
      </template>
      <template v-else>
        <FolderX class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No tasks assigned yet</h4>
        <p class="text-brand-light text-xs">Tasks assigned to you will show up here, grouped by project</p>
      </template>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="group in groupedTasks"
        :key="group.projectName"
        class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5"
      >
        <div class="flex items-center gap-2 mb-3.5">
          <Folder class="w-4 h-4 text-[#0C51D9]" />
          <h4 class="text-brand-dark text-sm font-bold">{{ group.projectName }}</h4>
          <span class="text-xs text-gray-400 font-medium">({{ group.tasks.length }})</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div
            v-for="task in group.tasks"
            :key="task.id"
            @click="goToTask(task)"
            class="bg-white border border-[#DCDEDD] rounded-[12px] p-3.5 hover:border-[#0C51D9] hover:border-2 hover:shadow-sm transition-all duration-300 cursor-pointer border-l-4"
            :class="[task.statusAccent, { 'cursor-default': !task.projectId }]"
          >
            <div class="flex items-start justify-between gap-2 mb-2.5">
              <h4 class="text-brand-dark text-sm font-semibold flex-1 min-w-0">{{ task.title }}</h4>
              <span
                :class="task.statusClass"
                class="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0"
                >{{ task.statusLabel }}</span
              >
            </div>

            <p v-if="task.description" class="text-brand-light text-xs mb-3 line-clamp-2">{{ task.description }}</p>

            <div class="flex items-center gap-1.5 mb-3 flex-wrap">
              <span
                :class="getPriorityColor(task.priority)"
                class="px-2 py-0.5 rounded-md text-xs font-semibold capitalize"
              >
                {{ task.priority }}
              </span>
              <div
                class="flex items-center gap-1 px-2 py-0.5 rounded-md"
                :class="task.hasDueDate ? 'bg-gray-50 text-gray-600' : 'bg-gray-50 text-gray-400'"
              >
                <Calendar class="w-3 h-3" />
                <span class="text-xs font-medium">{{ task.dueDate }}</span>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-100">
              <select
                :value="task.status"
                @change="handleStatusChange(task, $event)"
                @click.stop
                :disabled="updatingTaskId === task.id"
                class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-[8px] text-xs font-medium hover:border-[#0C51D9] focus:border-[#0C51D9] outline-none transition-all disabled:opacity-50 bg-white"
              >
                <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base .rich-text-content lives in src/assets/css/input.css -- these add
   the same supplementary tag styling MeetingNoteDetail.vue uses. */
.rich-text-content :deep(p) { margin-bottom: 0.75rem; }
.rich-text-content :deep(ul) { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(ol) { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(h1) { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
.rich-text-content :deep(h2) { font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0; }
.rich-text-content :deep(h3) { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0; }
.rich-text-content :deep(blockquote) { border-left: 3px solid #0c51d9; padding-left: 0.75rem; color: #6b7280; margin: 0.5rem 0; }
.rich-text-content :deep(a) { color: #0c51d9; text-decoration: underline; }
.rich-text-content :deep(hr) { border: none; border-top: 1px solid #dcdedd; margin: 0.75rem 0; }
</style>
