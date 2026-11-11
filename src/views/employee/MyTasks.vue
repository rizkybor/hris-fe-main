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
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  CircleDot,
  CheckCircle2,
  Inbox,
} from "lucide-vue-next";
import { UiBadge, UiButton, UiChips, UiEmpty, UiInput, UiModal, UiPageHeader, UiSelect, UiStat } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import StaffTaskComments from "@/components/admin/documents/StaffTaskComments.vue";
import MyTasksRecap from "@/components/employee/MyTasksRecap.vue";

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

// Presentation only: status -> token colours (the select always shows the label).
const STATUS_CLASS = {
  todo: "bg-ui-subtle text-ui-text",
  in_progress: "bg-ui-warn-soft text-ui-warn",
  review: "bg-ui-info-soft text-ui-info",
  done: "bg-ui-ok-soft text-ui-ok",
  cancelled: "bg-ui-subtle text-ui-muted",
};
const STATUS_DOT = {
  todo: "bg-ui-faint",
  in_progress: "bg-ui-warn",
  review: "bg-ui-info",
  done: "bg-ui-ok",
  cancelled: "bg-ui-line-strong",
};
const PRIORITY_TONE = { urgent: "bad", high: "warn", medium: "info", low: "neutral" };
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
  { key: "overdue", label: "Overdue", icon: AlertTriangle, tone: "text-ui-bad" },
  { key: "today", label: "Due today", icon: CalendarClock, tone: "text-ui-warn" },
  { key: "week", label: "Next 7 days", icon: CalendarRange, tone: "text-ui-accent" },
  { key: "later", label: "Later", icon: Calendar, tone: "text-ui-muted" },
  { key: "nodate", label: "No due date", icon: CircleDot, tone: "text-ui-muted" },
  { key: "completed", label: "Completed", icon: CheckCircle2, tone: "text-ui-ok" },
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
    { key: "overdue", label: "Overdue", short: "Overdue", value: by("overdue"), icon: AlertTriangle, tone: "bad" },
    { key: "today", label: "Due today", short: "Today", value: by("today"), icon: CalendarClock, tone: "warn" },
    { key: "week", label: "Next 7 days", short: "7 days", value: by("week"), icon: CalendarRange, tone: "" },
    { key: "open", label: "Open", short: "Open", value: items.value.filter((i) => !isClosed(i)).length, icon: ListChecks, tone: "" },
    { key: "completed", label: "Completed", short: "Done", value: by("completed"), icon: CheckCircle2, tone: "" },
  ];
});

// Presentation only: source tabs as filter chips with counts.
const sourceTabs = computed(() => [
  { value: "all", label: "All", count: counts.value.all },
  { value: "assigned", label: "Assigned", count: counts.value.assigned },
  { value: "project", label: "Project", count: counts.value.project },
]);

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
  <!-- The admin layout already pads the page, so phones get little extra. -->
  <div class="sm:px-3 sm:py-3 space-y-5 ui-anim-fade-up">
    <UiPageHeader
      title="Task Collection (Assigned/Project)"
      subtitle="Your project tasks and the tasks your supervisor assigned you, sorted by what's due first."
    />

    <!-- Summary: scrolls sideways on phones, five across on desktop. -->
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
      />
    </div>

    <MyTasksRecap :items="items" :loading="initialLoading" />

    <!-- Toolbar -->
    <div class="bg-ui-surface border border-ui-line rounded-ui-card p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center gap-3">
      <UiChips v-model="sourceTab" :options="sourceTabs" class="shrink-0" />
      <UiInput
        v-model="searchQuery"
        :icon="Search"
        placeholder="Search tasks, projects or who assigned it..."
        class="flex-1"
      />
      <div class="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
        <UiSelect
          v-if="sourceTab !== 'assigned' && projects.length"
          v-model="projectFilter"
          :options="[{ value: '', label: 'All Projects' }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]"
          class="sm:w-[180px]"
          aria-label="Project"
        />
        <UiSelect
          v-model="statusFilter"
          :options="[{ value: '', label: 'All Status' }, ...STATUS_OPTIONS]"
          :class="sourceTab === 'assigned' || !projects.length ? 'col-span-2 sm:w-[160px]' : 'sm:w-[160px]'"
          aria-label="Status"
        />
        <UiButton v-if="hasActiveFilters" variant="ghost" size="sm" class="col-span-2 sm:col-span-1" @click="clearFilters">
          Clear filters
        </UiButton>
      </div>
    </div>

    <!-- Loading -->
    <SkeletonList v-if="initialLoading" :rows="4" />

    <!-- Empty -->
    <div v-else-if="!groups.length" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty
        v-if="hasActiveFilters || sourceTab !== 'all'"
        :icon="SearchX"
        title="No tasks match your filters"
        message="Try another search, status, project or tab"
      >
        <UiButton variant="secondary" size="sm" @click="clearFilters(), (sourceTab = 'all')">Show all tasks</UiButton>
      </UiEmpty>
      <UiEmpty
        v-else
        :icon="Inbox"
        title="No tasks yet"
        message="Tasks from your projects and from your supervisor will show up here."
      />
    </div>

    <!-- Grouped by urgency -->
    <div v-else class="space-y-4 ui-stagger">
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
            class="px-4 py-3.5 flex flex-wrap sm:flex-nowrap items-start gap-x-3 gap-y-2 transition-colors hover:bg-ui-hover/60 active:bg-ui-hover"
            :class="item.source === 'project' && !item.projectId ? 'cursor-default' : 'cursor-pointer'"
            @click="openItem(item)"
          >
            <span class="mt-[7px] w-2 h-2 rounded-full shrink-0" :class="STATUS_DOT[item.status] || 'bg-ui-faint'" aria-hidden="true"></span>

            <div class="flex-1 min-w-0 basis-[calc(100%-1.25rem)] sm:basis-auto">
              <p
                class="text-ui-body font-medium leading-snug break-words"
                :class="isClosed(item) ? 'line-through text-ui-faint' : 'text-ui-ink'"
              >
                {{ item.title }}
              </p>
              <p v-if="item.description" class="text-ui-cap text-ui-muted mt-0.5 line-clamp-1">{{ item.description }}</p>
              <div class="flex items-center gap-1.5 flex-wrap mt-2">
                <UiBadge v-if="item.source === 'project'" tone="outline" class="max-w-full sm:max-w-[240px]">
                  <Folder class="w-3 h-3 shrink-0" /><span class="truncate">{{ item.projectName }}</span>
                </UiBadge>
                <UiBadge v-else tone="neutral" class="max-w-full sm:max-w-[240px]">
                  <ClipboardList class="w-3 h-3 shrink-0" /><span class="truncate">Assigned{{ item.creatorName ? ` by ${item.creatorName}` : "" }}</span>
                </UiBadge>
                <UiBadge v-if="item.priority" :tone="PRIORITY_TONE[item.priority] || 'neutral'" class="capitalize">
                  {{ item.priority }}
                </UiBadge>
                <UiBadge :tone="group.key === 'overdue' ? 'bad' : group.key === 'today' ? 'warn' : 'outline'">
                  <AlertTriangle v-if="group.key === 'overdue'" class="w-3 h-3" />
                  <Calendar v-else class="w-3 h-3" />
                  {{ dueLabel(item) }}
                </UiBadge>
              </div>
            </div>

            <!-- Status: compact select that doubles as the status badge.
                 Below the title on phones so the title keeps the full width. -->
            <div class="relative inline-block shrink-0 ml-5 sm:ml-0" @click.stop>
              <select
                :value="item.status"
                :disabled="updatingUid === item.uid"
                :class="STATUS_CLASS[item.status]"
                class="appearance-none h-7 pl-2.5 pr-7 rounded-full text-ui-cap font-medium border border-transparent cursor-pointer transition-shadow focus:outline-none focus:shadow-ui-focus disabled:opacity-50 disabled:cursor-wait"
                :aria-label="`Status of ${item.title}`"
                @change="changeStatus(item, $event)"
              >
                <option v-for="opt in item.source === 'assigned' ? STAFF_TASK_STATUS_OPTIONS : STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-current opacity-60 pointer-events-none" :class="STATUS_CLASS[item.status]?.split(' ')[1]" />
            </div>
          </li>
        </ul>
      </section>
    </div>

    <!-- Assigned task detail (with comments) -->
    <UiModal :open="showStaffTaskDetail" size="lg" @close="closeStaffTaskDetail">
      <template #header>
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink break-words">{{ detailStaffTask?.title }}</h2>
          <p class="text-ui-small text-ui-muted mt-0.5">
            Due {{ formatDate(detailStaffTask?.due_date) }} • by
            {{ detailStaffTask?.creator?.name }}
          </p>
        </div>
      </template>

      <div v-if="detailStaffTask" class="space-y-5">
        <div
          v-if="detailStaffTask.description"
          class="rich-text-content text-ui-body text-ui-text"
          v-html="detailStaffTask.description"
        ></div>

        <div class="sm:max-w-[240px]">
          <label for="my-task-detail-status" class="block text-ui-small font-medium text-ui-ink mb-1.5">Your Status</label>
          <div class="relative">
            <select
              id="my-task-detail-status"
              :value="detailStaffTask.my_assignment?.status"
              class="w-full h-[38px] pl-3 pr-9 appearance-none bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
              @change="handleStaffTaskStatusChange(detailStaffTask, $event)"
            >
              <option v-for="opt in STAFF_TASK_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <ChevronDown class="absolute right-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
          </div>
        </div>

        <StaffTaskComments
          :staff-task-id="detailStaffTask.id"
          :assignees="staffTaskCommentAssignees"
          :can-comment="true"
        />
      </div>
    </UiModal>
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
