<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter, useRoute } from "vue-router";
import { useTaskStore } from "@/stores/task";
import { useStaffTaskStore } from "@/stores/staffTask";
import { formatDateLong as formatDate } from "@/utils/dateUtils.js";
import {
  Search,
  Calendar,
  Folder,
  ListChecks,
  SearchX,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  X,
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  CircleDot,
  CheckCircle2,
  Inbox,
} from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { getPriorityColor } from "@/utils/styleHelpers";
import StaffTaskComments from "@/components/admin/documents/StaffTaskComments.vue";

const router = useRouter();
const route = useRoute();

// Two sources in one list: Project Tasks (from a project's board) and
// Assigned Tasks (daily tasks handed out via Business Documents > Staff
// Tasks). Both are shown together, grouped by how urgent they are.
const taskStore = useTaskStore();
const { myTasks, loading } = storeToRefs(taskStore);
const staffTaskStore = useStaffTaskStore();
const { myStaffTasks, loading: staffTasksLoading } = storeToRefs(staffTaskStore);

// Same 5 statuses/labels as the Kanban board's columns (TaskBoard.vue);
// Assigned Tasks only use To Do / In Progress / Done.
const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];
const STAFF_TASK_STATUS_OPTIONS = STATUS_OPTIONS.filter((o) => ["todo", "in_progress", "done"].includes(o.value));

const STATUS_CLASS = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-[#FEF3C7] text-[#D97706]",
  review: "bg-[#EBF8FF] text-[#1E40AF]",
  done: "bg-[#F0FDF4] text-[#166534]",
  cancelled: "bg-slate-100 text-slate-600",
};
const STATUS_DOT = {
  todo: "bg-gray-400",
  in_progress: "bg-amber-500",
  review: "bg-blue-500",
  done: "bg-green-500",
  cancelled: "bg-slate-400",
};
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

// Card previews show plain text -- raw HTML inside a clamped line looks broken.
const stripHtml = (html) =>
  (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = localDate();
const inAWeek = localDate(new Date(Date.now() + 7 * 86400000));

const items = computed(() => [
  ...myTasks.value.map((t) => ({
    uid: `p-${t.id}`,
    source: "project",
    id: t.id,
    title: t.name,
    description: stripHtml(t.description),
    status: t.status,
    due: t.due_date ? String(t.due_date).slice(0, 10) : null,
    projectId: t.project?.id ?? null,
    projectName: t.project?.name ?? "No Project",
    priority: t.priority,
    raw: t,
  })),
  ...myStaffTasks.value.map((t) => ({
    uid: `a-${t.id}`,
    source: "assigned",
    id: t.id,
    title: t.title,
    description: stripHtml(t.description),
    status: t.my_assignment?.status ?? "todo",
    due: t.due_date ? String(t.due_date).slice(0, 10) : null,
    projectId: null,
    projectName: null,
    priority: null,
    creatorName: t.creator?.name,
    raw: t,
  })),
]);

const isClosed = (item) => ["done", "cancelled"].includes(item.status);
const bucketOf = (item) => {
  if (isClosed(item)) return "completed";
  if (!item.due) return "nodate";
  if (item.due < today) return "overdue";
  if (item.due === today) return "today";
  if (item.due <= inAWeek) return "week";
  return "later";
};

const BUCKETS = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, tone: "text-red-600" },
  { key: "today", label: "Due today", icon: CalendarClock, tone: "text-amber-600" },
  { key: "week", label: "Next 7 days", icon: CalendarRange, tone: "text-[#0C51D9]" },
  { key: "later", label: "Later", icon: Calendar, tone: "text-brand-light" },
  { key: "nodate", label: "No due date", icon: CircleDot, tone: "text-brand-light" },
  { key: "completed", label: "Completed", icon: CheckCircle2, tone: "text-green-600" },
];

// ----- Filters -----
const sourceTab = ref("all");
const searchQuery = ref("");
const statusFilter = ref("");
const projectFilter = ref("");

const projects = computed(() => {
  const map = new Map();
  items.value.filter((i) => i.source === "project").forEach((i) => map.set(i.projectId ?? "none", { id: i.projectId, name: i.projectName }));
  return Array.from(map.values());
});

const counts = computed(() => ({
  all: items.value.length,
  assigned: items.value.filter((i) => i.source === "assigned").length,
  project: items.value.filter((i) => i.source === "project").length,
}));

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return items.value.filter((i) => {
    if (sourceTab.value !== "all" && i.source !== sourceTab.value) return false;
    if (statusFilter.value && i.status !== statusFilter.value) return false;
    if (projectFilter.value && (i.source !== "project" || String(i.projectId) !== projectFilter.value)) return false;
    if (q && ![i.title, i.description, i.projectName, i.creatorName].some((v) => v?.toLowerCase().includes(q))) return false;
    return true;
  });
});

const hasActiveFilters = computed(() => Boolean(searchQuery.value || statusFilter.value || projectFilter.value));
const clearFilters = () => {
  searchQuery.value = "";
  statusFilter.value = "";
  projectFilter.value = "";
};

const groups = computed(() =>
  BUCKETS.map((b) => ({
    ...b,
    items: filtered.value
      .filter((i) => bucketOf(i) === b.key)
      .sort(
        (x, y) =>
          (x.due ?? "9999").localeCompare(y.due ?? "9999") ||
          (PRIORITY_RANK[x.priority] ?? 9) - (PRIORITY_RANK[y.priority] ?? 9)
      ),
  })).filter((g) => g.items.length)
);

// Summary across everything (ignores filters) -- the "how am I doing" row.
const summary = computed(() => {
  const by = (key) => items.value.filter((i) => bucketOf(i) === key).length;
  return [
    { key: "overdue", label: "Overdue", value: by("overdue"), icon: AlertTriangle, class: "text-red-600 bg-red-50" },
    { key: "today", label: "Due today", value: by("today"), icon: CalendarClock, class: "text-amber-600 bg-amber-50" },
    { key: "week", label: "Next 7 days", value: by("week"), icon: CalendarRange, class: "text-[#0C51D9] bg-blue-50" },
    { key: "open", label: "Open", value: items.value.filter((i) => !isClosed(i)).length, icon: ListChecks, class: "text-indigo-600 bg-indigo-50" },
    { key: "completed", label: "Completed", value: by("completed"), icon: CheckCircle2, class: "text-green-600 bg-green-50" },
  ];
});

const showCompleted = ref(false);
const initialLoading = computed(
  () => (loading.value || staffTasksLoading.value) && items.value.length === 0
);

// ----- Actions -----
const updatingUid = ref(null);
const changeStatus = async (item, event) => {
  const newStatus = event.target.value;
  if (newStatus === item.status) return;
  updatingUid.value = item.uid;
  try {
    if (item.source === "assigned") {
      await staffTaskStore.updateMyStatus(item.id, newStatus);
    } else {
      await taskStore.updateTask(item.id, { status: newStatus });
      await taskStore.fetchMyTasks(200, true);
    }
  } catch (error) {
    console.error("Failed to update task status:", error);
  } finally {
    updatingUid.value = null;
  }
};

const openItem = (item) => {
  if (item.source === "assigned") return openStaffTaskDetail(item.raw);
  if (!item.projectId) return;
  router.push({ name: "admin.projects.detail", params: { id: item.projectId }, query: { task: item.id } });
};

const dueLabel = (item) => {
  if (!item.due) return "No due date";
  if (item.due === today) return "Today";
  return formatDate(item.due);
};

// ----- Assigned task detail (with comments) -----
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
const handleStaffTaskStatusChange = async (task, event) => {
  const newStatus = event.target.value;
  if (newStatus === task.my_assignment?.status) return;
  try {
    await staffTaskStore.updateMyStatus(task.id, newStatus);
  } catch (error) {
    console.error("Failed to update task status:", error);
  }
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

onMounted(async () => {
  taskStore.fetchMyTasks(200, true);
  await staffTaskStore.fetchMyStaffTasks();

  // Deep-link from a StaffTaskAssigned/StaffTaskCommentMention notification
  // (?staff_task=<id>, optionally &comment=<id>) -- open that task straight away.
  const targetId = route.query.staff_task ? Number(route.query.staff_task) : null;
  if (targetId) {
    const task = myStaffTasks.value.find((t) => t.id === targetId);
    if (task) openStaffTaskDetail(task);
  }
});
</script>

<template>
  <div class="px-4 py-4">
    <!-- Header + summary -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5 mb-4">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-orange-50 rounded-[10px] flex items-center justify-center shrink-0">
          <ListChecks class="w-5 h-5 text-orange-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">Task Collection (Assigned/Project)</h3>
          <p class="text-brand-light text-xs">Your project tasks and the tasks your supervisor assigned you, sorted by what's due first.</p>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div v-for="s in summary" :key="s.key" class="bg-white border border-[#DCDEDD] rounded-[12px] px-3.5 py-3 flex items-center gap-3">
          <div class="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" :class="s.class">
            <component :is="s.icon" class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-light text-xs font-medium truncate">{{ s.label }}</p>
            <Skeleton v-if="initialLoading" width="28px" height="20px" rounded="4px" />
            <p v-else class="text-brand-dark text-xl font-extrabold leading-tight">{{ s.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
      <div class="flex bg-gray-100 rounded-[10px] p-1 shrink-0 self-start">
        <button
          v-for="t in [
            { key: 'all', label: 'All', icon: ListChecks },
            { key: 'assigned', label: 'Assigned', icon: ClipboardList },
            { key: 'project', label: 'Project', icon: Folder },
          ]"
          :key="t.key"
          type="button"
          class="px-3 py-1.5 rounded-[8px] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
          :class="sourceTab === t.key ? 'bg-white text-brand-dark shadow-sm' : 'text-brand-light hover:text-brand-dark'"
          @click="sourceTab = t.key"
        >
          <component :is="t.icon" class="w-4 h-4" />
          {{ t.label }}
          <span class="text-xs font-semibold px-1.5 rounded-full" :class="sourceTab === t.key ? 'bg-blue-50 text-[#0C51D9]' : 'bg-gray-200 text-gray-500'">{{ counts[t.key] }}</span>
        </button>
      </div>

      <div class="relative flex-1 min-w-0">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tasks, projects or who assigned it..."
          class="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:outline-none transition-colors font-medium"
        />
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <div v-if="sourceTab !== 'assigned' && projects.length" class="relative">
          <select v-model="projectFilter" class="select-soft max-w-[180px]">
            <option value="">All Projects</option>
            <option v-for="p in projects" :key="p.id ?? 'none'" :value="String(p.id)">{{ p.name }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div class="relative">
          <select v-model="statusFilter" class="select-soft">
            <option value="">All Status</option>
            <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <button
          v-if="hasActiveFilters"
          type="button"
          @click="clearFilters"
          class="px-3 py-2.5 rounded-[10px] text-xs font-semibold text-gray-500 hover:text-[#0C51D9] hover:bg-gray-50 transition-colors shrink-0"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="initialLoading" class="space-y-3">
      <Skeleton v-for="i in 4" :key="i" height="72px" rounded="12px" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="!groups.length"
      class="flex flex-col items-center justify-center text-center py-14 rounded-[14px] border border-dashed border-[#DCDEDD] bg-gray-50/60"
    >
      <template v-if="hasActiveFilters || sourceTab !== 'all'">
        <SearchX class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No tasks match your filters</h4>
        <p class="text-brand-light text-xs mb-4">Try another search, status, project or tab</p>
        <button
          type="button"
          @click="clearFilters(), (sourceTab = 'all')"
          class="px-4 py-2 rounded-[8px] border border-[#DCDEDD] text-xs font-semibold text-brand-dark hover:border-[#0C51D9] hover:bg-white transition-colors"
        >
          Show all tasks
        </button>
      </template>
      <template v-else>
        <Inbox class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No tasks yet</h4>
        <p class="text-brand-light text-xs">Tasks from your projects and from your supervisor will show up here.</p>
      </template>
    </div>

    <!-- Grouped by urgency -->
    <div v-else class="space-y-4">
      <section v-for="group in groups" :key="group.key" class="bg-white border border-[#DCDEDD] rounded-[14px] overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-[#EEF1F5] text-left"
          :class="{ 'cursor-pointer hover:bg-slate-100': group.key === 'completed', 'cursor-default': group.key !== 'completed', '!border-b-0': group.key === 'completed' && !showCompleted }"
          @click="group.key === 'completed' && (showCompleted = !showCompleted)"
        >
          <component :is="group.icon" class="w-4 h-4 shrink-0" :class="group.tone" />
          <h4 class="text-brand-dark text-sm font-bold">{{ group.label }}</h4>
          <span class="text-xs font-semibold text-gray-500 bg-white border border-[#EEF1F5] rounded-full px-2">{{ group.items.length }}</span>
          <ChevronRight
            v-if="group.key === 'completed'"
            class="w-4 h-4 text-gray-400 ml-auto transition-transform"
            :class="{ 'rotate-90': showCompleted }"
          />
        </button>

        <ul v-if="group.key !== 'completed' || showCompleted" class="divide-y divide-[#F1F1F1]">
          <li
            v-for="item in group.items"
            :key="item.uid"
            class="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
            :class="item.source === 'project' && !item.projectId ? 'cursor-default' : 'cursor-pointer'"
            @click="openItem(item)"
          >
            <span class="mt-1.5 w-2 h-2 rounded-full shrink-0" :class="STATUS_DOT[item.status] || 'bg-gray-300'"></span>

            <div class="flex-1 min-w-0">
              <p class="text-brand-dark text-sm font-semibold leading-snug" :class="{ 'line-through text-gray-400': isClosed(item) }">
                {{ item.title }}
              </p>
              <p v-if="item.description" class="text-brand-light text-xs mt-0.5 line-clamp-1">{{ item.description }}</p>
              <div class="flex items-center gap-1.5 flex-wrap mt-1.5 text-xs">
                <span
                  v-if="item.source === 'project'"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium max-w-[220px]"
                >
                  <Folder class="w-3 h-3 shrink-0" /><span class="truncate">{{ item.projectName }}</span>
                </span>
                <span v-else class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium max-w-[220px]">
                  <ClipboardList class="w-3 h-3 shrink-0" /><span class="truncate">Assigned{{ item.creatorName ? ` by ${item.creatorName}` : "" }}</span>
                </span>
                <span v-if="item.priority" :class="getPriorityColor(item.priority)" class="px-2 py-0.5 rounded-md font-semibold capitalize">
                  {{ item.priority }}
                </span>
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium"
                  :class="group.key === 'overdue' ? 'bg-red-50 text-red-600' : group.key === 'today' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'"
                >
                  <AlertTriangle v-if="group.key === 'overdue'" class="w-3 h-3" />
                  <Calendar v-else class="w-3 h-3" />
                  {{ dueLabel(item) }}
                </span>
              </div>
            </div>

            <!-- Status: compact colored select, doubles as the status badge -->
            <div class="relative inline-block shrink-0" @click.stop>
              <select
                :value="item.status"
                :disabled="updatingUid === item.uid"
                :class="STATUS_CLASS[item.status]"
                class="status-select-badge"
                :aria-label="`Status of ${item.title}`"
                @change="changeStatus(item, $event)"
              >
                <option v-for="opt in item.source === 'assigned' ? STAFF_TASK_STATUS_OPTIONS : STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <ChevronDown class="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-current opacity-60 pointer-events-none" />
            </div>
          </li>
        </ul>
      </section>
    </div>

    <!-- ========================================================= -->
    <!-- ASSIGNED TASK DETAIL MODAL -->
    <!-- ========================================================= -->
    <div
      v-if="showStaffTaskDetail"
      class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="closeStaffTaskDetail"
    >
      <div
        class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <!-- Modal Header -->
        <div
          class="p-5 border-b border-[#DCDEDD] flex items-center justify-between"
        >
          <div class="min-w-0">
            <h3 class="text-brand-dark text-lg font-bold">
              {{ detailStaffTask?.title }}
            </h3>

            <p class="text-brand-light text-xs mt-0.5">
              Due {{ formatDate(detailStaffTask?.due_date) }} • by
              {{ detailStaffTask?.creator?.name }}
            </p>
          </div>

          <button
            @click="closeStaffTaskDetail"
            class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] shrink-0"
          >
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-5 space-y-5">
          <!-- Description -->
          <div
            v-if="detailStaffTask?.description"
            class="rich-text-content text-sm text-brand-dark leading-relaxed"
            v-html="detailStaffTask.description"
          ></div>

          <!-- Status -->
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1.5 block">
              Your Status
            </label>

            <div class="relative">
              <select
                :value="detailStaffTask?.my_assignment?.status"
                @change="handleStaffTaskStatusChange(detailStaffTask, $event)"
                class="select-soft"
              >
                <option
                  v-for="opt in STAFF_TASK_STATUS_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>

              <ChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <!-- Comments -->
          <StaffTaskComments
            :staff-task-id="detailStaffTask.id"
            :assignees="staffTaskCommentAssignees"
            :can-comment="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base .rich-text-content lives in src/assets/css/input.css -- these add
   the same supplementary tag styling MeetingNoteDetail.vue uses. */
.rich-text-content :deep(p) {
  margin-bottom: 0.75rem;
}
.rich-text-content :deep(ul) {
  list-style: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
.rich-text-content :deep(ol) {
  list-style: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
.rich-text-content :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0.5rem 0;
}
.rich-text-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0.5rem 0;
}
.rich-text-content :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.5rem 0;
}
.rich-text-content :deep(blockquote) {
  border-left: 3px solid #0c51d9;
  padding-left: 0.75rem;
  color: #6b7280;
  margin: 0.5rem 0;
}
.rich-text-content :deep(a) {
  color: #0c51d9;
  text-decoration: underline;
}
.rich-text-content :deep(hr) {
  border: none;
  border-top: 1px solid #dcdedd;
  margin: 0.75rem 0;
}
</style>
