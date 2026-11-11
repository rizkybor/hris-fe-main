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
import { UiAlert, UiButton, UiInput, UiSelect } from "@/components/ui";

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

// Presentation only: column status dot (the label always sits next to it).
const COLUMN_DOT = { todo: "bg-ui-faint", in_progress: "bg-ui-accent", review: "bg-ui-warn", done: "bg-ui-ok", cancelled: "bg-ui-line-strong" };
const PRIORITY_FILTER_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
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
  <div class="space-y-4">
    <!-- Toolbar: search + filters + create -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-2.5">
      <UiInput
        v-model="searchQuery"
        :icon="Search"
        placeholder="Search tasks by name, description, type, or assignee..."
        class="flex-1 min-w-0 lg:max-w-md"
      />

      <div class="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] -mx-1 px-1">
        <UiSelect v-model="priorityFilter" :options="PRIORITY_FILTER_OPTIONS" class="w-40 shrink-0" />
        <UiSelect
          v-if="typeSuggestions.length"
          v-model="typeFilter"
          :options="[{ value: '', label: 'All Types' }, ...typeSuggestions.map((s) => ({ value: s.type, label: s.type }))]"
          class="w-40 shrink-0"
        />
        <UiButton v-if="hasActiveFilters" variant="ghost" :icon="X" class="shrink-0" @click="clearFilters">Clear</UiButton>
      </div>

      <UiButton v-if="can('task-create')" :icon="Plus" class="w-full lg:w-auto lg:ml-auto shrink-0" @click="openCreateModal">
        Create New Task
      </UiButton>
    </div>

    <div v-if="actionError" class="relative">
      <UiAlert tone="bad" :message="actionError" class="pr-10" />
      <button
        type="button"
        @click="actionError = ''"
        class="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-md text-ui-bad/70 hover:text-ui-bad hover:bg-ui-bad/10"
        aria-label="Dismiss"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Task Management Columns: side by side, snapping sideways on phones -->
    <div class="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1 scroll-px-1">
      <div
        v-for="column in COLUMNS"
        :key="column.status"
        class="flex-shrink-0 w-[85vw] sm:w-72 md:w-[300px] snap-start bg-ui-subtle border border-ui-line rounded-ui-card flex flex-col"
      >
        <div class="flex items-center gap-2 px-3.5 pt-3.5 pb-2.5">
          <span class="w-2 h-2 rounded-full shrink-0" :class="COLUMN_DOT[column.status]" aria-hidden="true"></span>
          <h4 class="text-ui-h3 text-ui-ink">{{ column.label }}</h4>
          <span class="text-ui-cap text-ui-muted tabular-nums">{{ columnTasks(column.status).length }}</span>
          <button
            v-if="can('task-create')"
            type="button"
            class="ml-auto w-7 h-7 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-hover hover:text-ui-ink"
            title="Create New Task"
            aria-label="Create New Task"
            @click="openCreateModal"
          >
            <Plus class="w-4 h-4" />
          </button>
        </div>

        <div v-if="loading && columnTasks(column.status).length === 0" class="px-2.5 pb-2.5 space-y-2" aria-hidden="true">
          <div v-for="i in 2" :key="i" class="h-[92px] rounded-ui-card bg-ui-surface/70 border border-ui-line animate-pulse"></div>
        </div>

        <VueDraggableNext
          v-model="columnVisible[column.status]"
          group="tasks"
          class="space-y-2 min-h-[120px] sm:min-h-[420px] max-h-[640px] overflow-y-auto px-2.5 pb-2.5"
          :animation="200"
          @change="(event) => onColumnChange(column.status, event)"
        >
          <TaskCard
            v-for="task in columnVisible[column.status]"
            :key="task.id"
            :task="task"
            @click="openTaskDetail(task)"
          />
          <div
            v-if="!loading && columnTasks(column.status).length === 0"
            class="flex flex-col items-center justify-center py-8 text-center rounded-ui-card border border-dashed border-ui-line-strong"
          >
            <Inbox class="w-5 h-5 mb-1.5 text-ui-faint" />
            <p class="text-ui-cap text-ui-muted">No tasks here</p>
          </div>

          <!-- Load-more sentinel + fallback button, only when this column has more than what's rendered -->
          <template v-if="visibleCounts[column.status] < columnTasks(column.status).length">
            <div :ref="(el) => setSentinelRef(el, column.status)" :data-status="column.status" class="h-1"></div>
            <button
              type="button"
              @click="loadMore(column.status)"
              class="ui-press w-full flex items-center justify-center gap-1.5 h-9 rounded-ui-control border border-dashed border-ui-line-strong bg-ui-surface/60 hover:bg-ui-surface text-ui-cap font-medium text-ui-muted hover:text-ui-ink tabular-nums"
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
