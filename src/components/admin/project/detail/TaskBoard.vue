<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from "vue";
import { Plus, Search, ChevronDown, Inbox, X, User, AlertTriangle, CornerDownLeft, KanbanSquare, List } from "lucide-vue-next";
import { VueDraggableNext } from "vue-draggable-next";
import { useTaskStore } from "@/stores/task";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { can } from "@/helpers/permissionHelper";
import TaskCard from "./TaskCard.vue";
import TaskDetailModal from "./TaskDetailModal.vue";
import TaskCreateModal from "./TaskCreateModal.vue";
import TaskListView from "./TaskListView.vue";
import { UiAlert, UiButton, UiInput, UiSelect } from "@/components/ui";
import { useListState } from "@/composables/useListState";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const taskStore = useTaskStore();
const authStore = useAuthStore();
const { tasks: allTasks, loading } = storeToRefs(taskStore);
const { fetchProjectTasks, moveTask, createTask, deleteTask } = taskStore;

const COLUMNS = [
  { status: "todo", labelKey: "projects.taskStatus.todo" },
  { status: "in_progress", labelKey: "projects.taskStatus.inProgress" },
  { status: "review", labelKey: "projects.taskStatus.review" },
  { status: "done", labelKey: "projects.taskStatus.done" },
  { status: "cancelled", labelKey: "projects.taskStatus.cancelled" },
];

const PAGE_SIZE = 40;

// Presentation only: column status dot (the label always sits next to it).
const COLUMN_DOT = { todo: "bg-ui-faint", in_progress: "bg-ui-accent", review: "bg-ui-warn", done: "bg-ui-ok", cancelled: "bg-ui-line-strong" };
const PRIORITY_FILTER_OPTIONS = computed(() => [
  { value: "", label: t("projects.tasks.allPriorities") },
  { value: "urgent", label: t("projects.priority.urgent") },
  { value: "high", label: t("projects.priority.high") },
  { value: "medium", label: t("projects.priority.medium") },
  { value: "low", label: t("projects.priority.low") },
]);
const visibleCounts = reactive(Object.fromEntries(COLUMNS.map((c) => [c.status, PAGE_SIZE])));

// Board filters live in the URL (back/forward and reload keep them); not
// remembered across projects since types/assignees differ per project.
const filters = useListState(
  "project-board",
  { q: "", priority: "", type: "", assignee: "", mine: false, overdue: false },
  { remember: false }
);

const view = useListState("project-tasks-view", { view: "board", sort: "position" });
const VIEW_OPTIONS = [
  { value: "board", icon: KanbanSquare, labelKey: "projects.tasks.view.board" },
  { value: "list", icon: List, labelKey: "projects.tasks.view.list" },
];

const searchQuery = ref(filters.q);
let searchDebounceTimer = null;
watch(searchQuery, (value) => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    filters.q = value;
  }, 250);
});

const myEmployeeId = computed(() => authStore.user?.employee_profile?.id ?? null);
const assigneeIdOf = (task) => task.assignee?.id ?? task.assignee_id ?? null;
const todayStr = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const isOverdue = (task) =>
  Boolean(task.due_date) && String(task.due_date).slice(0, 10) < todayStr && !["done", "cancelled"].includes(task.status);

const filteredTasks = computed(() => {
  let tasks = allTasks.value;

  if (filters.priority) {
    tasks = tasks.filter((task) => task.priority === filters.priority);
  }
  if (filters.type) {
    tasks = tasks.filter((task) => task.type === filters.type);
  }
  if (filters.assignee) {
    tasks = tasks.filter((task) =>
      filters.assignee === "none" ? !assigneeIdOf(task) : String(assigneeIdOf(task)) === filters.assignee
    );
  }
  if (filters.mine && myEmployeeId.value) {
    tasks = tasks.filter((task) => assigneeIdOf(task) === myEmployeeId.value);
  }
  if (filters.overdue) {
    tasks = tasks.filter(isOverdue);
  }
  if (filters.q.trim()) {
    const query = filters.q.trim().toLowerCase();
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

const columnTasks = (status) =>
  filteredTasks.value.filter((task) => task.status === status).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

const columnVisible = reactive(Object.fromEntries(COLUMNS.map((c) => [c.status, []])));
const syncColumn = (status) => {
  columnVisible[status] = columnTasks(status).slice(0, visibleCounts[status]);
};
const syncAllColumns = () => COLUMNS.forEach((c) => syncColumn(c.status));

// Deep: edits patch tasks in place (no refetch), and the cards must follow.
watch(allTasks, syncAllColumns, { deep: true });
watch(
  () => [filters.q, filters.priority, filters.type, filters.assignee, filters.mine, filters.overdue],
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

const hasActiveFilters = computed(() =>
  Boolean(filters.q || filters.priority || filters.type || filters.assignee || filters.mine || filters.overdue)
);
const clearFilters = () => {
  searchQuery.value = "";
  filters.reset();
};

const typeSuggestions = computed(() => {
  const seen = new Map();
  allTasks.value.forEach((task) => {
    if (task.type && !seen.has(task.type)) {
      seen.set(task.type, task.color || null);
    }
  });
  return Array.from(seen.entries()).map(([type, color]) => ({ type, color }));
});

// People who have tasks on this board, for the assignee filter.
const assigneeOptions = computed(() => {
  const seen = new Map();
  allTasks.value.forEach((task) => {
    const id = assigneeIdOf(task);
    if (id && !seen.has(id)) seen.set(id, task.assignee?.user?.name || `#${id}`);
  });
  return [
    { value: "", label: t("projects.tasks.allAssignees") },
    { value: "none", label: t("projects.tasks.unassigned") },
    ...Array.from(seen.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ value: String(id), label: name })),
  ];
});
const overdueCount = computed(() => allTasks.value.filter(isOverdue).length);

const selectedTaskId = ref(null);
const isCreateModalOpen = ref(false);
// A side panel is open: the board/list has less room (toolbar wraps, list goes compact).
const panelOpen = computed(() => !!selectedTaskId.value || isCreateModalOpen.value);
const createStatus = ref("todo");
const actionError = ref("");

const selectedTask = computed(() => {
  if (!selectedTaskId.value) return null;
  return allTasks.value.find((task) => task.id === selectedTaskId.value) || null;
});

// One side panel at a time: opening a task closes the new-task form.
const openTaskDetail = (task) => {
  isCreateModalOpen.value = false;
  selectedTaskId.value = task.id;
};
const closeTaskDetail = () => {
  selectedTaskId.value = null;
  if (route.query.task) {
    const { task: _discard, ...rest } = route.query;
    router.replace({ query: rest });
  }
};

let deepLinkDone = false;
const openTaskFromQuery = () => {
  const taskId = route.query.task ? Number(route.query.task) : null;
  if (deepLinkDone || !taskId) return;
  const task = allTasks.value.find((t) => t.id === taskId);
  if (task) {
    deepLinkDone = true;
    openTaskDetail(task);
  }
};
watch(() => allTasks.value.length, openTaskFromQuery, { immediate: true });

// The column "+" opens the form with that column's status preset.
const openCreateModal = (status = "todo") => {
  if (selectedTaskId.value) closeTaskDetail();
  createStatus.value = status;
  isCreateModalOpen.value = true;
};

// List view: the status changed in a row -- same move as dropping the card
// into another column (placed by the server, put back if it fails).
const changeStatusFromList = async (task, status) => {
  if (task.status === status) return;
  const before = { status: task.status, position: task.position };
  actionError.value = "";
  try {
    await moveTask(task.id, { status });
  } catch {
    actionError.value = errorText("projects.tasks.moveFailed");
    task.status = before.status;
    task.position = before.position;
    taskStore.patchMyTasks(task.id, { status: before.status });
    syncAllColumns();
  }
};
const closeCreateModal = () => {
  isCreateModalOpen.value = false;
};

const errorText = (fallbackKey) => (typeof taskStore.error === "string" ? taskStore.error : t(fallbackKey));

// The store adds the created task to the board from the response.
const handleCreateTask = async (taskData) => {
  actionError.value = "";
  try {
    await createTask(taskData);
  } catch {
    actionError.value = errorText("projects.tasks.createFailed");
  }
};

// Quick add: a title + Enter at the top of a column (same create API,
// with that column's status and the default priority).
const quickAdd = reactive(Object.fromEntries(COLUMNS.map((c) => [c.status, ""])));
const quickAddBusy = reactive({});
const submitQuickAdd = async (status) => {
  const name = quickAdd[status].trim();
  if (!name || quickAddBusy[status]) return;
  quickAddBusy[status] = true;
  actionError.value = "";
  try {
    await createTask({ project_id: route.params.id, name, status, priority: "medium" });
    quickAdd[status] = "";
  } catch {
    actionError.value = errorText("projects.tasks.createFailed");
  } finally {
    quickAddBusy[status] = false;
  }
};

// The store removes the card; no refetch.
const handleDeleteTask = async (taskId) => {
  actionError.value = "";
  try {
    await deleteTask(taskId);
  } catch {
    actionError.value = errorText("projects.tasks.deleteFailed");
  }
};

const onColumnChange = async (status, event) => {
  const entry = event.added || event.moved;
  if (!entry) return; // "removed" alone is handled by the target column's "added"/"moved"

  const task = entry.element;
  const before = { status: task.status, position: task.position };
  const isCrossColumnMove = task.status !== status;
  if (isCrossColumnMove) task.status = status;

  actionError.value = "";
  const revert = () => {
    task.status = before.status;
    task.position = before.position;
    taskStore.patchMyTasks(task.id, { status: before.status });
    syncAllColumns();
  };

  if (isCrossColumnMove) {
    try {
      await moveTask(task.id, { status });
    } catch {
      actionError.value = errorText("projects.tasks.moveFailed");
      revert();
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
    actionError.value = errorText("projects.tasks.moveFailed");
    revert();
  }
};

const sentinelEls = {};
const setSentinelRef = (el, status) => {
  sentinelEls[status] = el;
};
let sentinelObserver = null;

// Shown while the board has nothing for this project yet.
const boardLoading = computed(() => loading.value && allTasks.value.length === 0);

onMounted(async () => {
  // ProjectDetail loads the tasks (its overview needs them too); only
  // fetch here when the store holds another project's board.
  const projectId = route.params.id;
  syncAllColumns();
  if (projectId && String(taskStore.tasksProjectId) !== String(projectId)) {
    await fetchProjectTasks(projectId);
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
  <!-- The board/list and, beside it, the task panel (new task / detail). -->
  <div class="flex items-start gap-4">
  <div class="flex-1 min-w-0 space-y-4">
    <!-- Toolbar: search + filters + view + create -->
    <div class="flex gap-2.5" :class="panelOpen ? 'flex-col lg:flex-row lg:flex-wrap lg:items-center' : 'flex-col lg:flex-row lg:items-center'">
      <UiInput
        v-model="searchQuery"
        :icon="Search"
        :placeholder="$t('projects.tasks.searchPlaceholder')"
        class="flex-1 min-w-0"
        :class="panelOpen ? 'lg:min-w-[200px]' : 'lg:max-w-sm'"
      />

      <div class="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] -mx-1 px-1" :class="panelOpen && 'lg:order-last lg:w-full'">
        <button
          v-if="myEmployeeId"
          type="button"
          :aria-pressed="filters.mine"
          class="ui-press shrink-0 inline-flex items-center gap-1.5 h-[38px] px-3 rounded-ui-control border text-ui-small font-medium whitespace-nowrap"
          :class="filters.mine ? 'bg-ui-ink text-white border-ui-ink' : 'bg-ui-surface text-ui-text border-ui-line-strong hover:bg-ui-hover'"
          @click="filters.mine = !filters.mine"
        >
          <User class="w-3.5 h-3.5" /> {{ $t("projects.tasks.mine") }}
        </button>
        <button
          type="button"
          :aria-pressed="filters.overdue"
          class="ui-press shrink-0 inline-flex items-center gap-1.5 h-[38px] px-3 rounded-ui-control border text-ui-small font-medium whitespace-nowrap"
          :class="filters.overdue ? 'bg-ui-bad text-white border-ui-bad' : 'bg-ui-surface text-ui-text border-ui-line-strong hover:bg-ui-hover'"
          @click="filters.overdue = !filters.overdue"
        >
          <AlertTriangle class="w-3.5 h-3.5" /> {{ $t("projects.tasks.overdue") }}
          <span class="tabular-nums" :class="filters.overdue ? 'text-white/80' : 'text-ui-faint'">{{ overdueCount }}</span>
        </button>
        <UiSelect v-model="filters.assignee" :options="assigneeOptions" class="w-44 shrink-0" :aria-label="$t('projects.tasks.detail.assignee')" />
        <UiSelect v-model="filters.priority" :options="PRIORITY_FILTER_OPTIONS" class="w-40 shrink-0" :aria-label="$t('projects.fields.priority')" />
        <UiSelect
          v-if="typeSuggestions.length"
          v-model="filters.type"
          :options="[{ value: '', label: $t('projects.tasks.allTypes') }, ...typeSuggestions.map((s) => ({ value: s.type, label: s.type }))]"
          class="w-40 shrink-0"
          :aria-label="$t('projects.tasks.form.type')"
        />
        <UiButton v-if="hasActiveFilters" variant="ghost" :icon="X" class="shrink-0" @click="clearFilters">{{ $t("common.actions.clear") }}</UiButton>
      </div>

      <div class="flex items-center gap-2 lg:ml-auto shrink-0">
        <!-- Board / List -->
        <div class="inline-flex items-center p-0.5 rounded-ui-control bg-ui-subtle border border-ui-line" role="group" :aria-label="$t('projects.tasks.view.label')">
          <button
            v-for="option in VIEW_OPTIONS"
            :key="option.value"
            type="button"
            :aria-pressed="view.view === option.value"
            class="ui-press inline-flex items-center gap-1.5 h-[32px] px-2.5 rounded-[7px] text-ui-small font-medium transition-colors focus:outline-none focus-visible:shadow-ui-focus"
            :class="view.view === option.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
            @click="view.view = option.value"
          >
            <component :is="option.icon" class="w-4 h-4" />{{ $t(option.labelKey) }}
          </button>
        </div>
        <UiButton v-if="can('task-create')" :icon="Plus" class="flex-1 lg:flex-none" @click="openCreateModal()">
          {{ $t("projects.tasks.createNew") }}
        </UiButton>
      </div>
    </div>

    <div v-if="actionError" class="relative">
      <UiAlert tone="bad" :message="actionError" class="pr-10" />
      <button
        type="button"
        @click="actionError = ''"
        class="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-md text-ui-bad/70 hover:text-ui-bad hover:bg-ui-bad/10"
        :aria-label="$t('projects.tasks.dismiss')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- List view -->
    <TaskListView
      v-if="view.view === 'list'"
      :tasks="filteredTasks"
      :columns="COLUMNS"
      :loading="boardLoading"
      :is-overdue="isOverdue"
      :sort="view.sort"
      :compact="panelOpen"
      :selected-id="selectedTaskId"
      @update:sort="(value) => (view.sort = value)"
      @open="openTaskDetail"
      @create="openCreateModal"
      @status="changeStatusFromList"
    />

    <!-- Board view: columns side by side, snapping sideways on phones -->
    <div v-else class="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1 scroll-px-1">
      <div
        v-for="column in COLUMNS"
        :key="column.status"
        class="flex-shrink-0 w-[85vw] sm:w-72 md:w-[300px] snap-start bg-ui-subtle border border-ui-line rounded-ui-card flex flex-col"
      >
        <div class="flex items-center gap-2 px-3.5 pt-3.5 pb-2.5">
          <span class="w-2 h-2 rounded-full shrink-0" :class="COLUMN_DOT[column.status]" aria-hidden="true"></span>
          <h4 class="text-ui-h3 text-ui-ink">{{ $t(column.labelKey) }}</h4>
          <span class="text-ui-cap text-ui-muted tabular-nums">{{ columnTasks(column.status).length }}</span>
          <button
            v-if="can('task-create')"
            type="button"
            class="ml-auto w-8 h-8 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-hover hover:text-ui-ink"
            :title="$t('projects.tasks.addToColumn', { column: $t(column.labelKey) })"
            :aria-label="$t('projects.tasks.addToColumn', { column: $t(column.labelKey) })"
            @click="openCreateModal(column.status)"
          >
            <Plus class="w-4 h-4" />
          </button>
        </div>

        <!-- Quick add: title + Enter (top of the column, always in view) -->
        <form v-if="can('task-create')" class="px-2.5 pb-2" @submit.prevent="submitQuickAdd(column.status)">
          <label class="relative block">
            <span class="sr-only">{{ $t("projects.tasks.quickAddLabel", { column: $t(column.labelKey) }) }}</span>
            <Plus class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ui-faint pointer-events-none" />
            <input
              v-model="quickAdd[column.status]"
              type="text"
              maxlength="255"
              :disabled="quickAddBusy[column.status]"
              :placeholder="$t('projects.tasks.quickAdd')"
              class="w-full h-10 pl-8 pr-9 bg-transparent hover:bg-ui-surface focus:bg-ui-surface text-ui-small text-ui-ink placeholder:text-ui-muted border border-transparent hover:border-ui-line focus:border-ui-accent rounded-ui-control focus:outline-none focus:shadow-ui-focus transition-colors disabled:opacity-60"
              @keydown.esc="quickAdd[column.status] = ''"
            />
            <CornerDownLeft
              v-if="quickAdd[column.status].trim()"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ui-faint pointer-events-none"
              aria-hidden="true"
            />
          </label>
        </form>
        <div v-if="boardLoading" class="px-2.5 pb-2.5 space-y-2" aria-hidden="true">
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
            v-if="!boardLoading && columnTasks(column.status).length === 0"
            class="flex flex-col items-center justify-center py-8 text-center rounded-ui-card border border-dashed border-ui-line-strong"
          >
            <Inbox class="w-5 h-5 mb-1.5 text-ui-faint" />
            <p class="text-ui-cap text-ui-muted">{{ $t("projects.tasks.emptyColumn") }}</p>
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
              {{ $t("projects.tasks.loadMore", { shown: visibleCounts[column.status], total: columnTasks(column.status).length }) }}
            </button>
          </template>
        </VueDraggableNext>

      </div>
    </div>

  </div>

    <!-- Task panel: detail / edit (only mounted while a task is open) -->
    <TaskDetailModal
      v-if="selectedTask"
      :task="selectedTask"
      :is-open="true"
      :project-id="parseInt(route.params.id)"
      :type-suggestions="typeSuggestions"
      @close="closeTaskDetail"
      @deleted="handleDeleteTask"
    />

    <!-- Task panel: new task -->
    <TaskCreateModal
      :is-open="isCreateModalOpen"
      :initial-status="createStatus"
      :project-id="route.params.id"
      :type-suggestions="typeSuggestions"
      @close="closeCreateModal"
      @created="handleCreateTask"
    />
  </div>
</template>
