<script setup>
import { ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { debounce } from "lodash-es";
import { useTaskStore } from "@/stores/task";
import { useStaffTaskStore } from "@/stores/staffTask";
import { formatDateLong as formatDate } from "@/utils/dateUtils.js";
import {
  Search,
  Calendar,
  Folder,
  ListChecks,
  SearchX,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  CircleDot,
  CheckCircle2,
  Inbox,
  ExternalLink,
  User,
} from "lucide-vue-next";
import { UiBadge, UiButton, UiChips, UiDrawer, UiEmpty, UiInput, UiPageHeader, UiSelect, UiStat, UiStatusSelect } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import StaffTaskComments from "@/components/admin/documents/StaffTaskComments.vue";
import TaskComments from "@/components/admin/project/detail/TaskComments.vue";
import MyTasksRecap from "@/components/employee/MyTasksRecap.vue";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { optimistic } from "@/utils/optimistic";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const taskStore = useTaskStore();
const staffTaskStore = useStaffTaskStore();
const { myStaffTasks } = storeToRefs(staffTaskStore);
// This page's own cached result (the dashboard widget and profile load
// smaller lists into taskStore.myTasks).
const MY_TASKS_KEY = "200:true";
const myProjectTasks = computed(() => taskStore.myTasksCache[MY_TASKS_KEY] ?? []);

// Shows what the stores already hold right away and refreshes quietly.
const { loading: initialLoading, refreshing } = useStaleFetch(
  () => Promise.all([taskStore.fetchMyTasks(200, true), staffTaskStore.fetchMyStaffTasks()]),
  { key: () => "my-tasks-page", hasData: () => Boolean(taskStore.myTasksCache[MY_TASKS_KEY]) }
);

// Same 5 statuses/labels as the Kanban board's columns (TaskBoard.vue);
// Assigned Tasks only use To Do / In Progress / Done.
const STATUS_TONE = { todo: "neutral", in_progress: "warn", review: "info", done: "ok", cancelled: "neutral" };
const STATUS_OPTIONS = computed(() =>
  ["todo", "in_progress", "review", "done", "cancelled"].map((value) => ({ value, label: t(`myTasks.status.${value}`), tone: STATUS_TONE[value] }))
);
const STAFF_TASK_STATUS_OPTIONS = computed(() =>
  STATUS_OPTIONS.value.filter((o) => ["todo", "in_progress", "done"].includes(o.value))
);
const statusOptionsFor = (item) => (item.source === "assigned" ? STAFF_TASK_STATUS_OPTIONS.value : STATUS_OPTIONS.value);

// Presentation only: status -> dot colour.
const STATUS_DOT = {
  todo: "bg-ui-faint",
  in_progress: "bg-ui-warn",
  review: "bg-ui-info",
  done: "bg-ui-ok",
  cancelled: "bg-ui-line-strong",
};
const PRIORITY_TONE = { urgent: "bad", high: "warn", medium: "info", low: "neutral" };
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };
const priorityLabel = (p) => (["urgent", "high", "medium", "low"].includes(p) ? t(`myTasks.priority.${p}`) : p);

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
  ...myProjectTasks.value.map((task) => ({
    uid: `p-${task.id}`,
    source: "project",
    id: task.id,
    title: task.name,
    description: stripHtml(task.description),
    status: task.status,
    due: task.due_date ? String(task.due_date).slice(0, 10) : null,
    projectId: task.project?.id ?? task.project_id ?? null,
    projectName: task.project?.name ?? t("myTasks.noProject"),
    priority: task.priority,
    raw: task,
  })),
  ...myStaffTasks.value.map((task) => ({
    uid: `a-${task.id}`,
    source: "assigned",
    id: task.id,
    title: task.title,
    description: stripHtml(task.description),
    status: task.my_assignment?.status ?? "todo",
    due: task.due_date ? String(task.due_date).slice(0, 10) : null,
    projectId: null,
    projectName: null,
    priority: null,
    creatorName: task.creator?.name,
    raw: task,
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

// Group labels come from myTasks.buckets.<key>.
const BUCKETS = [
  { key: "overdue", icon: AlertTriangle, tone: "text-ui-bad" },
  { key: "today", icon: CalendarClock, tone: "text-ui-warn" },
  { key: "week", icon: CalendarRange, tone: "text-ui-accent" },
  { key: "later", icon: Calendar, tone: "text-ui-muted" },
  { key: "nodate", icon: CircleDot, tone: "text-ui-muted" },
  { key: "completed", icon: CheckCircle2, tone: "text-ui-ok" },
];

// ----- Filters (URL + remembered per browser) -----
// `due` is set by the summary tiles: overdue | today | week | open | completed.
const list = useListState("my-tasks", { source: "all", q: "", status: "", project: "", due: "" });

// Search typed into its own box, applied ~300ms after typing stops.
const searchInput = ref(list.q);
const applySearch = debounce((value) => (list.q = value), 300);
watch(searchInput, (value) => applySearch(value));
watch(
  () => list.q,
  (value) => {
    if (value !== searchInput.value) searchInput.value = value;
  }
);

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

const matchesDue = (item) => {
  if (!list.due) return true;
  if (list.due === "open") return !isClosed(item);
  return bucketOf(item) === list.due;
};

const filtered = computed(() => {
  const q = list.q.trim().toLowerCase();
  return items.value.filter((i) => {
    if (list.source !== "all" && i.source !== list.source) return false;
    if (list.status && i.status !== list.status) return false;
    if (list.project && (i.source !== "project" || String(i.projectId) !== list.project)) return false;
    if (!matchesDue(i)) return false;
    if (q && ![i.title, i.description, i.projectName, i.creatorName].some((v) => v?.toLowerCase().includes(q))) return false;
    return true;
  });
});

const hasActiveFilters = computed(() => Boolean(list.q || list.status || list.project || list.due));
const clearFilters = () => {
  searchInput.value = "";
  list.q = "";
  list.status = "";
  list.project = "";
  list.due = "";
};
const showAll = () => {
  clearFilters();
  list.source = "all";
};

const groups = computed(() =>
  BUCKETS.map((b) => ({
    ...b,
    label: t(`myTasks.buckets.${b.key}`),
    items: filtered.value
      .filter((i) => bucketOf(i) === b.key)
      .sort(
        (x, y) =>
          (x.due ?? "9999").localeCompare(y.due ?? "9999") ||
          (PRIORITY_RANK[x.priority] ?? 9) - (PRIORITY_RANK[y.priority] ?? 9)
      ),
  })).filter((g) => g.items.length)
);

// Summary across everything (ignores filters); a tile filters the list.
const summary = computed(() => {
  const by = (key) => items.value.filter((i) => bucketOf(i) === key).length;
  return [
    { key: "overdue", label: t("myTasks.buckets.overdue"), value: by("overdue"), icon: AlertTriangle, tone: "bad" },
    { key: "today", label: t("myTasks.buckets.today"), value: by("today"), icon: CalendarClock, tone: "warn" },
    { key: "week", label: t("myTasks.buckets.week"), value: by("week"), icon: CalendarRange, tone: "" },
    { key: "open", label: t("myTasks.summary.open"), value: items.value.filter((i) => !isClosed(i)).length, icon: ListChecks, tone: "" },
    { key: "completed", label: t("myTasks.buckets.completed"), value: by("completed"), icon: CheckCircle2, tone: "" },
  ];
});
const toggleDue = (key) => {
  list.due = list.due === key ? "" : key;
  if (key === "completed" && list.due) showCompleted.value = true;
};

// Presentation only: source tabs as filter chips with counts.
const sourceTabs = computed(() => [
  { value: "all", label: t("common.labels.all"), count: counts.value.all },
  { value: "assigned", label: t("myTasks.source.assigned"), count: counts.value.assigned },
  { value: "project", label: t("common.labels.project"), count: counts.value.project },
]);

const showCompleted = ref(list.due === "completed");

// ----- Status: instant, undone with an error toast if the save fails -----
const changeStatus = (item, value) => {
  if (!value || value === item.status) return;
  if (item.source === "assigned") {
    const task = item.raw;
    return optimistic({
      apply: () => {
        const before = task.my_assignment;
        task.my_assignment = { ...(before || {}), status: value };
        return () => (task.my_assignment = before);
      },
      request: () => staffTaskStore.updateMyStatus(item.id, value),
    });
  }
  const before = item.status;
  return optimistic({
    apply: () => {
      taskStore.patchMyTasks(item.id, { status: value });
      return () => taskStore.patchMyTasks(item.id, { status: before });
    },
    request: () => taskStore.updateTask(item.id, { status: value }),
  });
};

const dueLabel = (item) => {
  if (!item.due) return t("myTasks.buckets.nodate");
  if (item.due === today) return t("common.labels.today");
  return formatDate(item.due);
};

// ----- Detail drawer (both sources), with prev/next through the list -----
const openUid = ref(null);
const drawerOpen = computed({
  get: () => Boolean(openUid.value && current.value),
  set: (value) => {
    if (!value) closeDetail();
  },
});
const current = computed(() => items.value.find((i) => i.uid === openUid.value) || null);

// What is on screen, top to bottom (collapsed Completed group excluded).
const visibleList = computed(() => groups.value.flatMap((g) => (g.key === "completed" && !showCompleted.value ? [] : g.items)));
const currentIndex = computed(() => visibleList.value.findIndex((i) => i.uid === openUid.value));
// Where the open item was, so prev/next still work after it leaves the
// list (e.g. marked done while Completed is collapsed).
const lastIndex = ref(0);
watch(currentIndex, (i) => {
  if (i !== -1) lastIndex.value = i;
});
const hasPrev = computed(() => (currentIndex.value === -1 ? lastIndex.value > 0 : currentIndex.value > 0));
const hasNext = computed(() =>
  currentIndex.value === -1 ? lastIndex.value < visibleList.value.length : currentIndex.value < visibleList.value.length - 1
);
const goPrev = () => {
  const i = currentIndex.value === -1 ? lastIndex.value - 1 : currentIndex.value - 1;
  if (visibleList.value[i]) openUid.value = visibleList.value[i].uid;
};
const goNext = () => {
  const i = currentIndex.value === -1 ? lastIndex.value : currentIndex.value + 1;
  if (visibleList.value[i]) openUid.value = visibleList.value[i].uid;
};

const openItem = (item) => {
  openUid.value = item.uid;
};
const closeDetail = () => {
  openUid.value = null;
  // A notification deep link has done its job once the task is closed.
  if (route.query.staff_task || route.query.comment) {
    const { staff_task: _s, comment: _c, ...rest } = route.query;
    router.replace({ query: rest }).catch(() => {});
  }
};

const fullPageLink = computed(() =>
  current.value?.source === "project" && current.value.projectId
    ? { name: "admin.projects.detail", params: { id: current.value.projectId }, query: { task: current.value.id } }
    : null
);

const staffTaskCommentAssignees = computed(() => {
  const task = current.value?.source === "assigned" ? current.value.raw : null;
  if (!task) return [];
  const people = (task.assignees || []).map((a) => ({ id: a.employee_id, name: a.name }));
  const creatorEmployeeId = task.creator?.employee_profile?.id;
  if (creatorEmployeeId && !people.some((a) => a.id === creatorEmployeeId)) {
    people.push({ id: creatorEmployeeId, name: task.creator?.name });
  }
  return people;
});

let deepLinkDone = false;
watch(
  myStaffTasks,
  (tasks) => {
    const targetId = route.query.staff_task ? Number(route.query.staff_task) : null;
    if (deepLinkDone || !targetId) return;
    if (tasks.some((task) => task.id === targetId)) {
      deepLinkDone = true;
      openUid.value = `a-${targetId}`;
    }
  },
  { immediate: true }
);

let taskLinkDone = false;
watch(
  myProjectTasks,
  (tasks) => {
    const targetId = route.query.task ? Number(route.query.task) : null;
    if (taskLinkDone || !targetId) return;
    if (tasks.some((task) => task.id === targetId)) {
      taskLinkDone = true;
      openUid.value = `p-${targetId}`;
      const { task: _t, ...rest } = route.query;
      router.replace({ query: rest }).catch(() => {});
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('myTasks.title')" :subtitle="$t('myTasks.subtitle')" />

    <!-- Summary: scrolls sideways on phones, five across on desktop. A tile filters the list. -->
    <div class="flex gap-3 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none] lg:grid lg:grid-cols-5 ui-stagger">
      <UiStat
        v-for="s in summary"
        :key="s.key"
        class="w-[150px] shrink-0 lg:w-auto"
        :label="s.label"
        :value="s.value"
        :icon="s.icon"
        :tone="s.value ? s.tone : ''"
        :loading="initialLoading"
        selectable
        :active="list.due === s.key"
        @select="toggleDue(s.key)"
      />
    </div>

    <MyTasksRecap :items="items" :loading="initialLoading" />

    <!-- Toolbar -->
    <div class="bg-ui-surface border border-ui-line rounded-ui-card p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center gap-3">
      <div class="overflow-x-auto [scrollbar-width:none] -mx-1 px-1 shrink-0">
        <UiChips v-model="list.source" :options="sourceTabs" />
      </div>
      <UiInput v-model="searchInput" :icon="Search" :placeholder="$t('myTasks.searchPlaceholder')" class="flex-1" />
      <div class="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
        <UiSelect
          v-if="list.source !== 'assigned' && projects.length"
          v-model="list.project"
          :options="[{ value: '', label: $t('myTasks.allProjects') }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]"
          class="sm:w-[180px]"
          :aria-label="$t('common.labels.project')"
        />
        <UiSelect
          v-model="list.status"
          :options="[{ value: '', label: $t('common.labels.allStatuses') }, ...STATUS_OPTIONS]"
          :class="list.source === 'assigned' || !projects.length ? 'col-span-2 sm:w-[160px]' : 'sm:w-[160px]'"
          :aria-label="$t('common.labels.status')"
        />
        <UiButton v-if="hasActiveFilters" variant="ghost" size="sm" class="col-span-2 sm:col-span-1" @click="clearFilters">
          {{ $t("common.actions.clearFilters") }}
        </UiButton>
      </div>
    </div>

    <p v-if="refreshing" class="text-ui-cap text-ui-muted -mt-2" role="status">{{ $t("myTasks.refreshing") }}</p>

    <!-- Loading -->
    <SkeletonList v-if="initialLoading" :rows="4" />

    <!-- Empty -->
    <div v-else-if="!groups.length" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty
        v-if="hasActiveFilters || list.source !== 'all'"
        :icon="SearchX"
        :title="$t('myTasks.empty.filteredTitle')"
        :message="$t('myTasks.empty.filteredMessage')"
      >
        <UiButton variant="secondary" size="sm" @click="showAll">{{ $t("myTasks.empty.showAll") }}</UiButton>
      </UiEmpty>
      <UiEmpty v-else :icon="Inbox" :title="$t('myTasks.empty.title')" :message="$t('myTasks.empty.message')" />
    </div>

    <!-- Grouped by urgency -->
    <div v-else class="space-y-4 ui-stagger" :class="{ 'opacity-60 transition-opacity': refreshing }">
      <section v-for="group in groups" :key="group.key" class="bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center gap-2 px-4 h-12 text-left border-b border-ui-line"
          :class="{
            'cursor-pointer hover:bg-ui-hover': group.key === 'completed',
            'cursor-default': group.key !== 'completed',
            '!border-b-0': group.key === 'completed' && !showCompleted,
          }"
          :aria-expanded="group.key === 'completed' ? showCompleted : undefined"
          @click="group.key === 'completed' && (showCompleted = !showCompleted)"
        >
          <component :is="group.icon" class="w-4 h-4 shrink-0" :class="group.tone" />
          <h2 class="text-ui-h3 text-ui-ink">{{ group.label }}</h2>
          <span class="text-ui-cap text-ui-muted tabular-nums">{{ group.items.length }}</span>
          <ChevronRight
            v-if="group.key === 'completed'"
            class="w-4 h-4 text-ui-faint ml-auto transition-transform duration-ui-base"
            :class="{ 'rotate-90': showCompleted }"
          />
        </button>

        <ul v-if="group.key !== 'completed' || showCompleted" class="divide-y divide-ui-line">
          <li
            v-for="item in group.items"
            :key="item.uid"
            class="px-4 py-3.5 flex flex-wrap sm:flex-nowrap items-start gap-x-3 gap-y-2 transition-colors cursor-pointer hover:bg-ui-hover/60 active:bg-ui-hover"
            :class="{ 'bg-ui-hover/60': item.uid === openUid }"
            tabindex="0"
            @click="openItem(item)"
            @keydown.enter.self="openItem(item)"
          >
            <span class="mt-[7px] w-2 h-2 rounded-full shrink-0" :class="STATUS_DOT[item.status] || 'bg-ui-faint'" aria-hidden="true"></span>

            <div class="flex-1 min-w-0 basis-[calc(100%-1.25rem)] sm:basis-auto">
              <p class="text-ui-body font-medium leading-snug break-words" :class="isClosed(item) ? 'line-through text-ui-faint' : 'text-ui-ink'">
                {{ item.title }}
              </p>
              <p v-if="item.description" class="text-ui-cap text-ui-muted mt-0.5 line-clamp-1">{{ item.description }}</p>
              <div class="flex items-center gap-1.5 flex-wrap mt-2">
                <UiBadge v-if="item.source === 'project'" tone="outline" class="max-w-full sm:max-w-[240px]">
                  <Folder class="w-3 h-3 shrink-0" /><span class="truncate">{{ item.projectName }}</span>
                </UiBadge>
                <UiBadge v-else tone="neutral" class="max-w-full sm:max-w-[240px]">
                  <ClipboardList class="w-3 h-3 shrink-0" /><span class="truncate">{{ item.creatorName ? $t("myTasks.assignedBy", { name: item.creatorName }) : $t("myTasks.source.assigned") }}</span>
                </UiBadge>
                <UiBadge v-if="item.priority" :tone="PRIORITY_TONE[item.priority] || 'neutral'" class="capitalize">
                  {{ priorityLabel(item.priority) }}
                </UiBadge>
                <UiBadge :tone="group.key === 'overdue' ? 'bad' : group.key === 'today' ? 'warn' : 'outline'">
                  <AlertTriangle v-if="group.key === 'overdue'" class="w-3 h-3" />
                  <Calendar v-else class="w-3 h-3" />
                  {{ dueLabel(item) }}
                </UiBadge>
              </div>
            </div>

            <!-- Status: the badge is the control (instant, undone on error).
                 Below the title on phones so the title keeps the full width. -->
            <div class="shrink-0 ml-5 sm:ml-0 min-h-[32px] flex items-center" @click.stop>
              <UiStatusSelect
                :model-value="item.status"
                :options="statusOptionsFor(item)"
                :label="$t('myTasks.statusOf', { title: item.title })"
                @change="(value) => changeStatus(item, value)"
              />
            </div>
          </li>
        </ul>
      </section>
    </div>

    <!-- Detail drawer: project and assigned tasks, J/K or arrows to move through the list -->
    <UiDrawer
      v-model:open="drawerOpen"
      :title="current?.title || ''"
      size="lg"
      :has-prev="hasPrev"
      :has-next="hasNext"
      :to="fullPageLink"
      @prev="goPrev"
      @next="goNext"
    >
      <template #header>
        <div v-if="current" class="min-w-0">
          <h2 class="text-ui-h2 text-ui-ink break-words">{{ current.title }}</h2>
          <p class="text-ui-small text-ui-muted mt-0.5 flex items-center gap-1.5 min-w-0">
            <template v-if="current.source === 'project'">
              <Folder class="w-3.5 h-3.5 shrink-0" /><span class="truncate">{{ current.projectName }}</span>
            </template>
            <template v-else>
              <ClipboardList class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate">{{ current.creatorName ? $t("myTasks.assignedBy", { name: current.creatorName }) : $t("myTasks.source.assigned") }}</span>
            </template>
          </p>
        </div>
      </template>

      <div v-if="current" class="space-y-5">
        <!-- Key facts -->
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt class="text-ui-cap text-ui-muted mb-1">{{ current.source === "assigned" ? $t("myTasks.detail.yourStatus") : $t("common.labels.status") }}</dt>
            <dd>
              <UiStatusSelect
                :model-value="current.status"
                :options="statusOptionsFor(current)"
                :label="$t('myTasks.statusOf', { title: current.title })"
                @change="(value) => changeStatus(current, value)"
              />
            </dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted mb-1">{{ $t("myTasks.detail.due") }}</dt>
            <dd class="flex items-center gap-1.5 text-ui-small tabular-nums" :class="bucketOf(current) === 'overdue' ? 'text-ui-bad font-medium' : 'text-ui-ink'">
              <AlertTriangle v-if="bucketOf(current) === 'overdue'" class="w-3.5 h-3.5" />
              <Calendar v-else class="w-3.5 h-3.5 text-ui-faint" />
              {{ dueLabel(current) }}
            </dd>
          </div>
          <div v-if="current.priority">
            <dt class="text-ui-cap text-ui-muted mb-1">{{ $t("myTasks.detail.priority") }}</dt>
            <dd>
              <UiBadge :tone="PRIORITY_TONE[current.priority] || 'neutral'" dot>{{ priorityLabel(current.priority) }}</UiBadge>
            </dd>
          </div>
          <div v-if="current.source === 'project' && current.raw.type">
            <dt class="text-ui-cap text-ui-muted mb-1">{{ $t("myTasks.detail.type") }}</dt>
            <dd class="text-ui-small text-ui-ink">{{ current.raw.type }}</dd>
          </div>
          <div v-if="current.source === 'assigned' && current.creatorName">
            <dt class="text-ui-cap text-ui-muted mb-1">{{ $t("myTasks.detail.assignedByLabel") }}</dt>
            <dd class="flex items-center gap-1.5 text-ui-small text-ui-ink"><User class="w-3.5 h-3.5 text-ui-faint" />{{ current.creatorName }}</dd>
          </div>
        </dl>

        <!-- Description -->
        <div>
          <h3 class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("common.labels.description") }}</h3>
          <div
            v-if="current.source === 'assigned' && current.raw.description"
            class="rich-text-content text-ui-body text-ui-text"
            v-html="current.raw.description"
          ></div>
          <p v-else-if="current.source === 'project' && current.raw.description" class="text-ui-body text-ui-text leading-relaxed whitespace-pre-line break-words">
            {{ current.raw.description }}
          </p>
          <p v-else class="text-ui-small text-ui-faint">{{ $t("myTasks.detail.noDescription") }}</p>
        </div>

        <!-- Comments -->
        <TaskComments
          v-if="current.source === 'project'"
          :key="current.uid"
          :task-id="current.id"
          :project-id="current.projectId ?? ''"
          :can-comment="current.raw.can_comment !== false"
        />
        <StaffTaskComments v-else :key="current.uid" :staff-task-id="current.id" :assignees="staffTaskCommentAssignees" :can-comment="true" />
      </div>

      <template v-if="fullPageLink" #footer>
        <UiButton variant="secondary" :icon="ExternalLink" :to="fullPageLink" class="w-full sm:w-auto">
          {{ $t("myTasks.detail.openInProject") }}
        </UiButton>
      </template>
    </UiDrawer>
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
  font-size: 22px;
  line-height: 30px;
  font-weight: 600;
  margin: 0.5rem 0;
}
.rich-text-content :deep(h2) {
  font-size: 17px;
  line-height: 26px;
  font-weight: 600;
  margin: 0.5rem 0;
}
.rich-text-content :deep(h3) {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  margin: 0.5rem 0;
}
.rich-text-content :deep(blockquote) {
  border-left: 3px solid rgb(var(--ui-line-strong));
  padding-left: 0.75rem;
  color: rgb(var(--ui-muted));
  margin: 0.5rem 0;
}
.rich-text-content :deep(a) {
  color: rgb(var(--ui-accent));
  text-decoration: underline;
}
.rich-text-content :deep(hr) {
  border: none;
  border-top: 1px solid rgb(var(--ui-line));
  margin: 0.75rem 0;
}
</style>
