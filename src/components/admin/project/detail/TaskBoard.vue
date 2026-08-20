<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from "vue";
import { ListChecks, Plus, Search, ChevronDown, Inbox, Filter, X } from "lucide-vue-next";
import { VueDraggableNext } from "vue-draggable-next";
import { useTaskStore } from "@/stores/task";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { can } from "@/helpers/permissionHelper";
import TaskCard from "./TaskCard.vue";
import TaskDetailModal from "./TaskDetailModal.vue";
import TaskCreateModal from "./TaskCreateModal.vue";

const route = useRoute();
const router = useRouter();
const taskStore = useTaskStore();
const { tasks: allTasks, loading } = storeToRefs(taskStore);
const { fetchProjectTasks, moveTask, createTask, deleteTask } = taskStore;

// Kanban columns are data-driven (not one hand-copied block per status)
// so a 250+ task board only ever changes the number of items filtered per
// column, never the amount of markup. "cancelled" is a real, selectable
// TaskStatus value that previously had no column at all -- tasks set to
// it just vanished from the board.
const COLUMNS = [
  { status: "todo", label: "To Do", bg: "bg-gray-50/70", border: "border-gray-200", bar: "bg-gray-400", dot: "bg-gray-400", countBg: "bg-gray-200", countText: "text-gray-700", emptyText: "text-gray-400" },
  { status: "in_progress", label: "In Progress", bg: "bg-blue-50/60", border: "border-blue-100", bar: "bg-blue-500", dot: "bg-blue-500", countBg: "bg-blue-200", countText: "text-blue-700", emptyText: "text-blue-300" },
  { status: "review", label: "Review", bg: "bg-amber-50/60", border: "border-amber-100", bar: "bg-amber-500", dot: "bg-amber-500", countBg: "bg-amber-200", countText: "text-amber-700", emptyText: "text-amber-300" },
  { status: "done", label: "Done", bg: "bg-green-50/60", border: "border-green-100", bar: "bg-green-500", dot: "bg-green-500", countBg: "bg-green-200", countText: "text-green-700", emptyText: "text-green-300" },
  { status: "cancelled", label: "Cancelled", bg: "bg-slate-100/70", border: "border-slate-200", bar: "bg-slate-500", dot: "bg-slate-500", countBg: "bg-slate-300", countText: "text-slate-700", emptyText: "text-slate-400" },
];

// Cards actually rendered per column, at any one time -- capped and grown
// in pages, so a column with 100+ tasks never mounts more than a few dozen
// TaskCard components at once. Reset to the page size whenever the filter
// (search) changes, so a narrowed search doesn't stay oddly capped.
const PAGE_SIZE = 40;
const visibleCounts = reactive(Object.fromEntries(COLUMNS.map((c) => [c.status, PAGE_SIZE])));

const searchQuery = ref("");
const debouncedSearch = ref("");
let searchDebounceTimer = null;
watch(searchQuery, (value) => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = value;
  }, 200);
});

// Priority/Type filters, applied alongside the search text -- "All" (empty
// string) means no restriction on that field.
const priorityFilter = ref("");
const typeFilter = ref("");

const filteredTasks = computed(() => {
  let tasks = allTasks.value;

  if (priorityFilter.value) {
    tasks = tasks.filter((task) => task.priority === priorityFilter.value);
  }
  if (typeFilter.value) {
    tasks = tasks.filter((task) => task.type === typeFilter.value);
  }
  if (debouncedSearch.value.trim()) {
    const query = debouncedSearch.value.trim().toLowerCase();
    tasks = tasks.filter(
      (task) =>
        task.name?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.type?.toLowerCase().includes(query) ||
        task.assignee?.user?.name?.toLowerCase().includes(query)
    );
  }

  return tasks;
});

// Sorted by position explicitly (not just "whatever order the fetch
// returned") -- a drag mutates a task's `.position` value in place without
// moving it within the underlying `tasks` array, so anything that re-reads
// this array later (search, a resync after a failed move, Load More) needs
// a real sort to still reflect the true order, not just the original
// fetch's order.
const columnTasks = (status) =>
  filteredTasks.value.filter((task) => task.status === status).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

// The array actually bound to each column's VueDraggableNext -- a stable
// reactive array vue-draggable-next mutates directly (splice) during a
// drag, not a fresh computed re-filter on every read. This matters: Sortable
// hands back a `newIndex` that only means anything relative to the exact
// array it was just dragging, so the neighbor lookup in onColumnChange has
// to read from this same array, not re-derive one from scratch (which
// would still show the pre-drop order and silently miscompute the new
// position). Explicitly (re)synced from columnTasks() on fetch, search
// change, and Load More -- never mutated mid-drag by anything but
// vue-draggable-next itself.
const columnVisible = reactive(Object.fromEntries(COLUMNS.map((c) => [c.status, []])));
const syncColumn = (status) => {
  columnVisible[status] = columnTasks(status).slice(0, visibleCounts[status]);
};
const syncAllColumns = () => COLUMNS.forEach((c) => syncColumn(c.status));

watch(allTasks, syncAllColumns);
watch(
  [debouncedSearch, priorityFilter, typeFilter],
  () => {
    COLUMNS.forEach((c) => {
      visibleCounts[c.status] = PAGE_SIZE;
    });
    syncAllColumns();
  }
);

const loadMore = (status) => {
  visibleCounts[status] += PAGE_SIZE;
  syncColumn(status);
};

const hasActiveFilters = computed(() => Boolean(priorityFilter.value || typeFilter.value));
const clearFilters = () => {
  priorityFilter.value = "";
  typeFilter.value = "";
};

// Every task type used anywhere in this project, most-recently-defined
// color first -- powers the Create/Edit forms' type suggestion list so
// naming stays consistent across a project's tasks without a separate
// "manage task types" screen.
const typeSuggestions = computed(() => {
  const seen = new Map();
  allTasks.value.forEach((task) => {
    if (task.type && !seen.has(task.type)) {
      seen.set(task.type, task.color || null);
    }
  });
  return Array.from(seen.entries()).map(([type, color]) => ({ type, color }));
});

const isModalOpen = ref(false);
const selectedTaskId = ref(null);
const isCreateModalOpen = ref(false);
const actionError = ref("");

const selectedTask = computed(() => {
  if (!selectedTaskId.value) return null;
  return allTasks.value.find((task) => task.id === selectedTaskId.value) || null;
});

const openTaskDetail = (task) => {
  selectedTaskId.value = task.id;
  isModalOpen.value = true;
};
const closeTaskDetail = () => {
  isModalOpen.value = false;
  selectedTaskId.value = null;
  if (route.query.task) {
    const { task: _discard, ...rest } = route.query;
    router.replace({ query: rest });
  }
};

// Deep-link support: My Tasks (and anywhere else) can link straight to a
// specific task's detail modal via ?task=<id> on the project detail route,
// instead of only being reachable by clicking its Kanban card.
const openTaskFromQuery = () => {
  const taskId = route.query.task ? Number(route.query.task) : null;
  if (!taskId) return;
  const task = allTasks.value.find((t) => t.id === taskId);
  if (task) openTaskDetail(task);
};
watch(allTasks, openTaskFromQuery);
const openCreateModal = () => {
  isCreateModalOpen.value = true;
};
const closeCreateModal = () => {
  isCreateModalOpen.value = false;
};

const handleCreateTask = async (taskData) => {
  actionError.value = "";
  try {
    await createTask(taskData);
    await fetchProjectTasks(route.params.id);
  } catch {
    actionError.value = typeof taskStore.error === "string" ? taskStore.error : "Failed to create task.";
  }
};

const handleDeleteTask = async (taskId) => {
  actionError.value = "";
  try {
    await deleteTask(taskId);
    await fetchProjectTasks(route.params.id);
  } catch {
    actionError.value = typeof taskStore.error === "string" ? taskStore.error : "Failed to delete task.";
  }
};

// vue-draggable-next mutates columnVisible[status] in place (splice) during
// a drag -- no computed get/set wrapper involved, so what onColumnChange
// reads below is the exact post-drop array Sortable's newIndex indexes into.
const onColumnChange = async (status, event) => {
  const entry = event.added || event.moved;
  if (!entry) return; // "removed" alone is handled by the target column's "added"/"moved"

  const task = entry.element;
  const isCrossColumnMove = task.status !== status;
  if (isCrossColumnMove) task.status = status;

  actionError.value = "";

  // Dropping a card into a DIFFERENT column ignores the exact drop slot --
  // the backend places it by priority cluster within that column instead
  // (same rule the API already applies when a task's status changes via
  // the edit form), so e.g. an Urgent task dragged in always lands above
  // any Medium/Low task there, regardless of where it was visually dropped.
  // A same-column reorder still honors the exact drop position untouched.
  if (isCrossColumnMove) {
    try {
      await moveTask(task.id, { status });
      await fetchProjectTasks(route.params.id);
      syncAllColumns();
    } catch {
      actionError.value = typeof taskStore.error === "string" ? taskStore.error : "Failed to move task. Reverting.";
      await fetchProjectTasks(route.params.id);
      syncAllColumns();
    }
    return;
  }

  const newIndex = entry.newIndex;
  const neighbors = columnVisible[status];
  const prevTask = neighbors[newIndex - 1] ?? null;
  const nextTask = neighbors[newIndex + 1] ?? null;

  let position;
  if (prevTask && nextTask) {
    position = (prevTask.position + nextTask.position) / 2;
  } else if (prevTask) {
    position = prevTask.position + 1000;
  } else if (nextTask) {
    position = nextTask.position - 1000;
  } else {
    position = 1000;
  }

  try {
    await moveTask(task.id, { status, position });
  } catch {
    actionError.value = typeof taskStore.error === "string" ? taskStore.error : "Failed to move task. Reverting.";
    await fetchProjectTasks(route.params.id);
    syncAllColumns();
  }
};

// Auto-load the next page of a column once its "load more" sentinel
// scrolls into view, with the visible button below as a reliable fallback
// (same IntersectionObserver-driven pattern already used elsewhere in this
// app for a sticky header).
const sentinelEls = {};
const setSentinelRef = (el, status) => {
  sentinelEls[status] = el;
};
let sentinelObserver = null;

onMounted(async () => {
  const projectId = route.params.id;
  if (projectId) {
    await fetchProjectTasks(projectId);
    syncAllColumns();
  }

  sentinelObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const status = entry.target.dataset.status;
        if (status && visibleCounts[status] < columnTasks(status).length) {
          visibleCounts[status] += PAGE_SIZE;
          syncColumn(status);
        }
      });
    },
    { rootMargin: "200px" }
  );
  Object.values(sentinelEls).forEach((el) => el && sentinelObserver.observe(el));
});

onUnmounted(() => sentinelObserver?.disconnect());
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 mb-5">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 sm:w-10 sm:h-10 bg-purple-50 rounded-[10px] flex items-center justify-center shrink-0">
          <ListChecks class="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base sm:text-lg font-bold">Project Tasks</h3>
          <p class="text-brand-light text-xs font-normal">
            Manage and track all project tasks with Kanban system.
          </p>
        </div>
      </div>
      <button
        v-if="can('task-create')"
        @click="openCreateModal"
        class="btn-primary w-full sm:w-auto rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center justify-center gap-2"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-xs font-semibold">Create New Task</span>
      </button>
    </div>

    <div
      v-if="actionError"
      class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center justify-between"
    >
      <span>{{ actionError }}</span>
      <button @click="actionError = ''" class="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
    </div>

    <!-- Tasks Filter -->
    <div class="mb-5 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1 min-w-0">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search class="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          class="w-full pl-10 pr-5 py-3 text-sm border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-medium"
          placeholder="Search tasks by name, description, type, or assignee..."
          v-model="searchQuery"
        />
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter class="h-3.5 w-3.5 text-gray-400" />
          </div>
          <select
            v-model="priorityFilter"
            class="pl-8 pr-8 py-3 text-sm border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-medium appearance-none bg-white"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <div v-if="typeSuggestions.length" class="relative">
          <select
            v-model="typeFilter"
            class="pl-3.5 pr-8 py-3 text-sm border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-medium appearance-none bg-white max-w-[160px]"
          >
            <option value="">All Types</option>
            <option v-for="s in typeSuggestions" :key="s.type" :value="s.type">{{ s.type }}</option>
          </select>
          <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <button
          v-if="hasActiveFilters"
          type="button"
          @click="clearFilters"
          class="flex items-center gap-1 px-3 py-3 rounded-[10px] text-xs font-semibold text-gray-500 hover:text-[#0C51D9] hover:bg-gray-50 transition-colors duration-200 shrink-0"
        >
          <X class="w-3.5 h-3.5" />
          Clear
        </button>
      </div>
    </div>

    <!-- Task Management Columns -->
    <div class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-5 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
      <div
        v-for="column in COLUMNS"
        :key="column.status"
        class="border rounded-[12px] flex-shrink-0 w-[85vw] sm:w-72 md:w-80 overflow-hidden snap-start"
        :class="[column.bg, column.border]"
      >
        <div class="h-1" :class="column.bar"></div>
        <div class="flex items-center justify-between px-4 pt-5 pb-5 mb-2">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full" :class="column.dot"></div>
            <h4 class="text-brand-dark text-xs font-bold">{{ column.label }}</h4>
          </div>
          <span
            class="min-w-[20px] px-2 py-0.5 rounded-full text-xs font-semibold text-center"
            :class="[column.countBg, column.countText]"
          >
            {{ columnTasks(column.status).length }}
          </span>
        </div>

        <VueDraggableNext
          v-model="columnVisible[column.status]"
          group="tasks"
          class="space-y-3 min-h-[480px] max-h-[640px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent px-4 pb-4"
          :animation="200"
          @change="(event) => onColumnChange(column.status, event)"
        >
          <TaskCard
            v-for="task in columnVisible[column.status]"
            :key="task.id"
            :task="task"
            @click="openTaskDetail(task)"
          />
          <div v-if="columnTasks(column.status).length === 0" class="flex flex-col items-center justify-center py-10 text-center">
            <Inbox class="w-7 h-7 mb-2 opacity-60" :class="column.emptyText" />
            <p class="text-xs font-medium" :class="column.emptyText">No tasks here</p>
          </div>

          <!-- Load-more sentinel + fallback button, only when this column has more than what's rendered -->
          <template v-if="visibleCounts[column.status] < columnTasks(column.status).length">
            <div :ref="(el) => setSentinelRef(el, column.status)" :data-status="column.status" class="h-1"></div>
            <button
              type="button"
              @click="loadMore(column.status)"
              class="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] border border-dashed border-gray-300 hover:border-[#0C51D9] hover:bg-white text-xs font-semibold text-gray-500 hover:text-[#0C51D9] transition-all duration-200"
            >
              <ChevronDown class="w-3.5 h-3.5" />
              Load more ({{ visibleCounts[column.status] }} of {{ columnTasks(column.status).length }})
            </button>
          </template>
        </VueDraggableNext>
      </div>
    </div>

    <!-- Task Detail Modal -->
    <TaskDetailModal
      :task="selectedTask"
      :is-open="isModalOpen"
      :project-id="parseInt(route.params.id)"
      :type-suggestions="typeSuggestions"
      @close="closeTaskDetail"
      @deleted="handleDeleteTask"
    />

    <!-- Task Create Modal -->
    <TaskCreateModal
      :is-open="isCreateModalOpen"
      :project-id="route.params.id"
      :type-suggestions="typeSuggestions"
      @close="closeCreateModal"
      @created="handleCreateTask"
    />
  </div>
</template>
