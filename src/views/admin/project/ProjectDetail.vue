<script setup>
import { useProjectStore } from "@/stores/project";
import { useTaskStore } from "@/stores/task";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import {
  Briefcase,
  Crown,
  Target,
  DollarSign,
  CalendarCheck,
  Clock,
  Calendar,
  User,
  Users,
  UsersRound,
  UserX,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertOctagon,
  TriangleAlert,
  CheckCircle2,
  Download,
  Building2,
  ShieldCheck,
  Lock,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  KanbanSquare,
  FileText,
  ReceiptText,
  Wrench,
  Link2,
  Flag,
} from "lucide-vue-next";
import { useRoute } from "vue-router";
import router from "@/router";
import { onMounted, ref, computed } from "vue";
import { formatDate, calculateDuration } from "@/utils/dateUtils";
import { formatRupiah } from "@/utils/formatUtils";
import {
  getPriorityColor,
  getProjectStatusColor,
  getProgressColor,
} from "@/utils/badgeUtils";
import { getProjectHealth } from "@/utils/projectHealth";
import { can } from "@/helpers/permissionHelper";
import { capitalize } from "lodash-es";
import TaskBoard from "@/components/admin/project/detail/TaskBoard.vue";
import ProjectDocuments from "@/components/admin/project/detail/ProjectDocuments.vue";
import ProjectInvoices from "@/components/admin/project/detail/ProjectInvoices.vue";
import ProjectInspect from "@/components/admin/project/detail/ProjectInspect.vue";
import ProjectAccess from "@/components/admin/project/detail/ProjectAccess.vue";
import ProjectBilling from "@/components/admin/project/detail/ProjectBilling.vue";
import MaintenancePanel from "@/components/admin/maintenance/MaintenancePanel.vue";
import Avatar from "@/components/common/Avatar.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiBadge, UiButton, UiCard, UiEmpty } from "@/components/ui";
import { useScrollFade } from "@/composables/useScrollFade";

const route = useRoute();
const id = route.params.id;

const projectStore = useProjectStore();
const { fetchProject, downloadProgressReport } = projectStore;

const authStore = useAuthStore();
const isProjectLeader = computed(() => {
  const myEmployeeId = authStore.user?.employee_profile?.id;
  return !!myEmployeeId && myEmployeeId === project.value.leader?.id;
});
const handleInspectNoteUpdated = (note) => {
  project.value.inspect_note = note;
};

const exporting = ref(false);
const handleExportProgress = async () => {
  exporting.value = true;
  try {
    await downloadProgressReport(id, project.value.name);
  } catch (error) {
    console.error("Error exporting project progress:", error);
  } finally {
    exporting.value = false;
  }
};

// TaskBoard shares this same Pinia store instance and fetches/mutates
// `tasks` as cards are dragged between columns, so deriving progress from
// it here keeps the progress card and deadline-risk banner live without a
// page refresh.
const taskStore = useTaskStore();
const { tasks: projectTasks } = storeToRefs(taskStore);

const project = ref({});

// Hidden by default -- budget is sensitive, revealed only on demand.
const isBudgetVisible = ref(false);
const toggleBudgetVisibility = () => {
  isBudgetVisible.value = !isBudgetVisible.value;
};

const handleFetchProject = async () => {
  try {
    const response = await fetchProject(id);

    if (response) {
      project.value = response;
    } else {
      router.push({ name: "admin.projects" });
    }
  } catch (error) {
    console.error("Error fetching project:", error);
    project.value = {};
  }
};

const aboutParagraphs = computed(() => {
  if (!project.value.description) return [];
  return project.value.description.split("\n\n").map((p) => p.trim());
});

// ProjectResource only returns a precomputed `progress` percentage, not the
// raw `tasks` array, so once the Task Board has loaded this project's tasks
// into the shared task store, progress is recomputed live from there -
// updating instantly as cards move between To Do/In Progress/Review/Done.
// Until then (or if there are no tasks), fall back to the API's `progress`.
const currentProjectTasks = computed(() =>
  projectTasks.value.filter((task) => String(task.project_id) === String(id))
);

const projectProgress = computed(() => {
  const tasks = currentProjectTasks.value;
  if (tasks.length === 0) return project.value.progress ?? 0;

  const completed = tasks.filter((task) => task.status === "done").length;
  return Math.round((completed / tasks.length) * 100);
});

const projectHealth = computed(() =>
  getProjectHealth({
    start_date: project.value.start_date,
    end_date: project.value.end_date,
    status: project.value.status,
    progress: projectProgress.value,
  })
);

const healthBannerStyles = {
  overdue: {
    icon: AlertOctagon,
    wrapper: "bg-red-50 border-red-200",
    iconBox: "bg-red-100 text-red-600",
    title: "text-red-800",
    message: "text-red-700",
  },
  critical: {
    icon: AlertOctagon,
    wrapper: "bg-red-50 border-red-200",
    iconBox: "bg-red-100 text-red-600",
    title: "text-red-800",
    message: "text-red-700",
  },
  "at-risk": {
    icon: AlertTriangle,
    wrapper: "bg-orange-50 border-orange-200",
    iconBox: "bg-orange-100 text-orange-600",
    title: "text-orange-800",
    message: "text-orange-700",
  },
  behind: {
    icon: TriangleAlert,
    wrapper: "bg-yellow-50 border-yellow-200",
    iconBox: "bg-yellow-100 text-yellow-600",
    title: "text-yellow-800",
    message: "text-yellow-700",
  },
  "on-track": {
    icon: CheckCircle2,
    wrapper: "bg-green-50 border-green-200",
    iconBox: "bg-green-100 text-green-600",
    title: "text-green-800",
    message: "text-green-700",
  },
};

// ---- Presentation only (redesign): tabs, tone maps, small view helpers ----
const pageReady = ref(false);

const PROJECT_STATUS_TONES = { active: "accent", completed: "ok", cancelled: "bad", "on-hold": "warn", overdue: "bad" };
const HEALTH_TONES = {
  overdue: { box: "bg-ui-bad-soft border-ui-bad/20", ink: "text-ui-bad" },
  critical: { box: "bg-ui-bad-soft border-ui-bad/20", ink: "text-ui-bad" },
  "at-risk": { box: "bg-ui-warn-soft border-ui-warn/20", ink: "text-ui-warn" },
  behind: { box: "bg-ui-warn-soft border-ui-warn/20", ink: "text-ui-warn" },
  "on-track": { box: "bg-ui-ok-soft border-ui-ok/20", ink: "text-ui-ok" },
};
const TASK_STATUS_TILES = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
  { status: "cancelled", label: "Cancelled" },
];
const taskCount = (status) => currentProjectTasks.value.filter((task) => task.status === status).length;

const hasAccessLinks = computed(() => {
  const p = project.value;
  return (
    (p.access_project_name && p.access_project_url) ||
    (p.access_github_name && p.access_github_url) ||
    (p.access_figma_name && p.access_figma_url) ||
    (p.additional_access || []).some((link) => link?.name && link?.url)
  );
});

// A ?task=<id> deep link opens on the Board tab (the task modal opens on top).
const activeTab = ref(route.query.task ? "board" : "overview");
const { scrollRef: tabScrollRef, showRightFade: showTabRightFade, updateFade: updateTabFade } = useScrollFade();
const tabs = computed(() => {
  const list = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "board", label: "Board", icon: KanbanSquare },
    { id: "documents", label: "Documents", icon: FileText },
  ];
  if (can("project-expense-list")) list.push({ id: "billing", label: "Billing", icon: ReceiptText });
  if (can("maintenance-menu") || can("maintenance-list")) list.push({ id: "maintenance", label: "Maintenance", icon: Wrench });
  if (hasAccessLinks.value) list.push({ id: "access", label: "Access", icon: Link2 });
  return list;
});

onMounted(async () => {
  await handleFetchProject();
  pageReady.value = true;
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <!-- Loading -->
    <div v-if="!pageReady" role="status" aria-label="Loading project..." class="space-y-5">
      <div class="flex items-center gap-4">
        <Skeleton width="56px" height="56px" rounded="12px" />
        <div class="flex-1 space-y-2.5">
          <Skeleton width="240px" height="22px" />
          <Skeleton width="320px" height="14px" />
        </div>
      </div>
      <Skeleton width="100%" height="36px" />
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div class="lg:col-span-2 bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
          <Skeleton v-for="i in 5" :key="i" height="16px" />
        </div>
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
          <Skeleton v-for="i in 4" :key="i" height="16px" />
        </div>
      </div>
      <span class="sr-only">Loading project...</span>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="space-y-3 ui-anim-fade-up">
        <RouterLink
          :to="{ name: 'admin.projects' }"
          class="inline-flex items-center gap-1 text-ui-small text-ui-accent hover:underline"
        >
          <ChevronLeft class="w-4 h-4" /> Projects
        </RouterLink>

        <div class="flex flex-col md:flex-row md:items-center gap-4">
          <div class="flex items-center gap-3.5 flex-1 min-w-0">
            <img
              :src="project.photo || '/images/og-image.png'"
              alt="Project Image"
              class="w-12 h-12 sm:w-14 sm:h-14 rounded-ui-card object-cover border border-ui-line bg-ui-subtle shrink-0"
            />
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 class="text-ui-h1 text-ui-ink break-words">{{ project.name }}</h1>
                <UiBadge v-if="project.status" :tone="PROJECT_STATUS_TONES[project.status] || 'neutral'" dot>
                  {{ capitalize(project.status) }}
                </UiBadge>
                <UiBadge v-if="project.priority" tone="outline">
                  <Flag class="w-3 h-3 text-ui-faint" />{{ capitalize(project.priority) }}
                </UiBadge>
              </div>
              <p class="text-ui-small text-ui-muted mt-1 flex flex-wrap gap-x-1.5">
                <span v-if="project.client">{{ project.client.name }} ·</span>
                <span v-if="project.leader">Lead {{ project.leader?.user?.name }} ·</span>
                <span class="tabular-nums">{{ formatDate(project.start_date) || "N/A" }} – {{ formatDate(project.end_date) || "N/A" }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4 shrink-0">
            <!-- Progress (desktop; phones get the Progress card) -->
            <div class="hidden md:block w-48">
              <div class="flex items-center justify-between text-ui-cap">
                <span class="text-ui-muted">Progress</span>
                <span class="text-ui-ink font-medium tabular-nums">{{ projectProgress }}%</span>
              </div>
              <div class="h-1.5 rounded-full bg-ui-subtle mt-1.5 overflow-hidden">
                <div class="h-full rounded-full bg-ui-ink transition-all duration-300" :style="{ width: `${projectProgress}%` }"></div>
              </div>
              <p class="text-ui-cap text-ui-faint mt-1 truncate">
                {{ projectHealth ? `Expected ${projectHealth.expectedProgress}% by now` : "Project completion" }}
              </p>
            </div>
            <UiButton
              v-if="can('project-export')"
              variant="secondary"
              :icon="Download"
              :loading="exporting"
              class="w-full md:w-auto"
              @click="handleExportProgress"
            >
              {{ exporting ? "Exporting..." : "Export Progress" }}
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Deadline Risk Banner -->
      <div
        v-if="projectHealth && projectHealth.level !== 'on-track'"
        class="ui-anim-fade-up flex items-start gap-3 rounded-ui-card border px-4 py-3"
        :class="HEALTH_TONES[projectHealth.level].box"
        role="status"
      >
        <component :is="healthBannerStyles[projectHealth.level].icon" class="w-[18px] h-[18px] shrink-0 mt-px" :class="HEALTH_TONES[projectHealth.level].ink" />
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-ui-small font-semibold" :class="HEALTH_TONES[projectHealth.level].ink">{{ projectHealth.label }}</h4>
            <span class="px-1.5 rounded-md bg-ui-surface/70 text-ui-cap font-medium tabular-nums" :class="HEALTH_TONES[projectHealth.level].ink">
              {{ projectHealth.daysRemaining >= 0 ? `${projectHealth.daysRemaining}d left` : `${Math.abs(projectHealth.daysRemaining)}d overdue` }}
            </span>
            <span class="px-1.5 rounded-md bg-ui-surface/70 text-ui-cap font-medium tabular-nums" :class="HEALTH_TONES[projectHealth.level].ink">
              {{ projectHealth.actualProgress }}% done &middot; expected {{ projectHealth.expectedProgress }}%
            </span>
          </div>
          <p class="text-ui-small text-ui-text mt-1">{{ projectHealth.message }}</p>
        </div>
      </div>

      <!-- Tab Bar: underline on desktop, scrolling chips on phones -->
      <div class="relative">
        <div ref="tabScrollRef" @scroll="updateTabFade" class="overflow-x-auto [scrollbar-width:none] sm:border-b sm:border-ui-line">
          <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              @click="activeTab = tab.id"
              :class="[
                'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:shadow-ui-focus',
                'h-8 px-3 rounded-full border text-ui-small',
                'sm:h-auto sm:px-0.5 sm:pt-1 sm:pb-3 sm:rounded-none sm:border-0 sm:border-b-2 sm:-mb-px sm:text-ui-body',
                activeTab === tab.id
                  ? 'bg-ui-ink text-white border-ui-ink sm:bg-transparent sm:text-ui-ink sm:border-ui-ink'
                  : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover sm:bg-transparent sm:text-ui-muted sm:border-transparent sm:hover:bg-transparent sm:hover:text-ui-ink',
              ]"
            >
              <component :is="tab.icon" class="w-4 h-4 hidden sm:block" />
              {{ tab.label }}
              <span v-if="tab.id === 'board' && currentProjectTasks.length" class="tabular-nums text-ui-cap" :class="activeTab === tab.id ? 'text-white/70 sm:text-ui-muted' : 'text-ui-faint'">
                {{ currentProjectTasks.length }}
              </span>
            </button>
          </div>
        </div>
        <Transition name="ui-fade">
          <div v-if="showTabRightFade" class="sm:hidden pointer-events-none absolute inset-y-0 right-0 flex items-center">
            <span class="w-7 h-7 rounded-full bg-ui-surface border border-ui-line shadow-ui-raised flex items-center justify-center">
              <ChevronRight class="w-4 h-4 text-ui-accent scroll-hint-nudge" />
            </span>
          </div>
        </Transition>
      </div>

      <!-- Overview Tab -->
      <div v-show="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
        <div class="lg:col-span-2 flex flex-col gap-4 sm:gap-5 min-w-0 ui-stagger">
          <!-- Progress (phones) -->
          <div class="md:hidden bg-ui-surface border border-ui-line rounded-ui-card px-4 py-3.5">
            <div class="flex items-center justify-between">
              <span class="text-ui-small font-medium text-ui-ink">Progress</span>
              <span class="text-ui-small text-ui-ink tabular-nums">{{ projectProgress }}%</span>
            </div>
            <div class="h-1.5 rounded-full bg-ui-subtle mt-2 overflow-hidden">
              <div class="h-full rounded-full bg-ui-ink transition-all duration-300" :style="{ width: `${projectProgress}%` }"></div>
            </div>
            <p class="text-ui-cap text-ui-muted mt-1.5">
              {{ projectHealth ? `Expected ${projectHealth.expectedProgress}% by now` : "Project completion" }}
            </p>
          </div>

          <!-- Project Information -->
          <UiCard title="Project Information" subtitle="Complete project overview">
            <template #actions>
              <UiButton
                variant="ghost"
                size="sm"
                :icon="isBudgetVisible ? EyeOff : Eye"
                :title="isBudgetVisible ? 'Hide budget' : 'Show budget'"
                @click="toggleBudgetVisibility"
              >
                {{ isBudgetVisible ? "Hide budget" : "Show budget" }}
              </UiButton>
            </template>
            <dl class="grid grid-cols-1 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0">
              <div class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
                <dt class="text-ui-small text-ui-muted shrink-0">Budget</dt>
                <dd class="text-right sm:text-left sm:mt-1 min-w-0">
                  <span class="block text-ui-body font-medium text-ui-ink tabular-nums break-words">
                    {{ isBudgetVisible ? formatRupiah(project.budget) : "Rp ••••••••" }}
                  </span>
                  <span class="hidden sm:block text-ui-cap text-ui-muted mt-0.5">Project budget</span>
                </dd>
              </div>
              <div class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
                <dt class="text-ui-small text-ui-muted shrink-0">Start Date</dt>
                <dd class="text-right sm:text-left sm:mt-1 min-w-0">
                  <span class="block text-ui-body font-medium text-ui-ink tabular-nums">{{ formatDate(project.start_date) || "N/A" }}</span>
                  <span class="hidden sm:block text-ui-cap text-ui-muted mt-0.5">Project kickoff</span>
                </dd>
              </div>
              <div class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
                <dt class="text-ui-small text-ui-muted shrink-0">End Date</dt>
                <dd class="text-right sm:text-left sm:mt-1 min-w-0">
                  <span class="block text-ui-body font-medium text-ui-ink tabular-nums">{{ formatDate(project.end_date) || "N/A" }}</span>
                  <span class="hidden sm:block text-ui-cap text-ui-muted mt-0.5">Project deadline</span>
                </dd>
              </div>
              <div class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
                <dt class="text-ui-small text-ui-muted shrink-0">Duration</dt>
                <dd class="text-right sm:text-left sm:mt-1 min-w-0">
                  <span class="block text-ui-body font-medium text-ui-ink tabular-nums">{{ calculateDuration(project.start_date, project.end_date) }}</span>
                  <span class="hidden sm:block text-ui-cap text-ui-muted mt-0.5">Project timeline</span>
                </dd>
              </div>
              <div v-if="project.warranty_period_months" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
                <dt class="text-ui-small text-ui-muted shrink-0">Warranty Period</dt>
                <dd class="text-right sm:text-left sm:mt-1 min-w-0">
                  <span class="block text-ui-body font-medium text-ui-ink tabular-nums">{{ project.warranty_period_months }} months</span>
                  <span class="hidden sm:block text-ui-cap text-ui-muted mt-0.5">After project completion</span>
                </dd>
              </div>
              <div v-if="project.retention_period_months" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
                <dt class="text-ui-small text-ui-muted shrink-0">Retention Period</dt>
                <dd class="text-right sm:text-left sm:mt-1 min-w-0">
                  <span class="block text-ui-body font-medium text-ui-ink tabular-nums">{{ project.retention_period_months }} months</span>
                  <span class="hidden sm:block text-ui-cap text-ui-muted mt-0.5">Contract term</span>
                </dd>
              </div>
            </dl>

            <!-- About Project -->
            <div class="mt-5 pt-4 border-t border-ui-line">
              <h5 class="text-ui-h3 text-ui-ink mb-1.5">About Project</h5>
              <div v-if="aboutParagraphs.length" class="text-ui-body text-ui-text leading-relaxed space-y-3">
                <p v-for="(paragraph, index) in aboutParagraphs" :key="index">{{ paragraph }}</p>
              </div>
              <p v-else class="text-ui-small text-ui-faint">-</p>
            </div>
          </UiCard>

          <!-- Tasks summary -->
          <UiCard title="Tasks">
            <template #actions>
              <button type="button" class="text-ui-small font-medium text-ui-accent hover:underline mt-1" @click="activeTab = 'board'">Open board</button>
            </template>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              <button
                v-for="tile in TASK_STATUS_TILES"
                :key="tile.status"
                type="button"
                class="ui-press text-left border border-ui-line rounded-ui-control px-3 py-2.5 hover:bg-ui-subtle min-w-0"
                @click="activeTab = 'board'"
              >
                <p class="text-ui-cap text-ui-muted truncate">{{ tile.label }}</p>
                <p class="text-ui-h2 text-ui-ink tabular-nums mt-0.5">{{ taskCount(tile.status) }}</p>
              </button>
            </div>
          </UiCard>

          <!-- Project Inspect (optional, Project Leader-only note) -->
          <ProjectInspect
            :project-id="id"
            :note="project.inspect_note || ''"
            :is-leader="isProjectLeader"
            @updated="handleInspectNoteUpdated"
          />
        </div>

        <!-- Right column -->
        <div class="space-y-4 sm:space-y-5 min-w-0 ui-stagger">
          <!-- Team -->
          <UiCard title="Team">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <!-- Project Leader -->
              <div class="flex items-center gap-3 min-w-0">
                <template v-if="project.leader">
                  <Avatar :src="project.leader.user.profile_photo" :alt="project.leader.user.name" size="w-10 h-10" icon-size="w-4 h-4" />
                  <div class="flex-1 min-w-0">
                    <p class="text-ui-cap text-ui-muted">Project Leader</p>
                    <p class="text-ui-body font-medium text-ui-ink truncate">{{ project.leader?.user?.name }}</p>
                    <p class="text-ui-cap text-ui-muted truncate">{{ project.leader?.job_information?.job_title }}</p>
                  </div>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="User"
                    :to="{ name: 'admin.employees.detail', params: { id: project.leader.id } }"
                    class="shrink-0"
                  >Profile</UiButton>
                </template>
                <template v-else>
                  <span class="w-10 h-10 rounded-full bg-ui-subtle text-ui-faint flex items-center justify-center shrink-0"><UserX class="w-4 h-4" /></span>
                  <div class="min-w-0">
                    <p class="text-ui-cap text-ui-muted">Project Leader</p>
                    <p class="text-ui-small text-ui-faint">No leader assigned</p>
                  </div>
                </template>
              </div>

              <!-- Client -->
              <div class="flex items-center gap-3 min-w-0">
                <span class="w-10 h-10 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0"><Building2 class="w-4 h-4" /></span>
                <template v-if="project.client">
                  <div class="flex-1 min-w-0">
                    <p class="text-ui-cap text-ui-muted">Client</p>
                    <p class="text-ui-body font-medium text-ui-ink truncate">{{ project.client.name }}</p>
                    <p class="text-ui-cap text-ui-muted truncate">{{ project.client.pic_name || project.client.email || "-" }}</p>
                  </div>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    :to="{ name: 'admin.clients.detail', params: { id: project.client.id } }"
                    class="shrink-0"
                  >View</UiButton>
                </template>
                <div v-else class="min-w-0">
                  <p class="text-ui-cap text-ui-muted">Client</p>
                  <p class="text-ui-small text-ui-faint">No client linked</p>
                </div>
              </div>
            </div>

            <!-- Assigned Members Section (By Employee mode) -->
            <div v-if="project.team_assignment_mode === 'employee'" class="mt-5 pt-4 border-t border-ui-line">
              <h5 class="text-ui-h3 text-ui-ink mb-2.5">Project Members</h5>
              <UiEmpty v-if="!project.members || project.members.length === 0" compact :icon="Users" title="No members assigned" class="bg-ui-subtle rounded-ui-control" />
              <div v-else class="flex flex-wrap gap-2">
                <span
                  v-for="member in project.members"
                  :key="member.id"
                  class="inline-flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full bg-ui-subtle text-ui-small text-ui-text"
                >
                  <Avatar :alt="member.name" size="w-5 h-5" icon-size="w-3 h-3" />
                  {{ member.name }}
                </span>
              </div>
            </div>

            <!-- Assigned Teams Section (By Team mode) -->
            <div v-else class="mt-5 pt-4 border-t border-ui-line">
              <h5 class="text-ui-h3 text-ui-ink mb-2.5">Assigned Teams</h5>
              <UiEmpty v-if="!project.teams || project.teams.length === 0" compact :icon="UsersRound" title="No teams assigned" class="bg-ui-subtle rounded-ui-control" />
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                <div v-for="team in project.teams" :key="team.id" class="border border-ui-line rounded-ui-control p-3.5">
                  <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0">
                      <Briefcase class="w-4 h-4" />
                    </span>
                    <div class="flex-1 min-w-0">
                      <p class="text-ui-small font-medium text-ui-ink truncate">{{ team.name }}</p>
                      <p class="text-ui-cap text-ui-muted tabular-nums">{{ team.members_count }} Members</p>
                    </div>
                  </div>
                  <div class="mt-3 pt-3 border-t border-ui-line">
                    <div v-if="team.leader" class="flex items-center gap-2.5">
                      <Avatar :src="team.leader.profile_photo" :alt="team.leader.name" size="w-7 h-7" icon-size="w-3.5 h-3.5" />
                      <div class="flex-1 min-w-0">
                        <p class="text-ui-small font-medium text-ui-ink truncate">{{ team.leader.name }}</p>
                        <p class="text-ui-cap text-ui-muted">Team Leader</p>
                      </div>
                    </div>
                    <p v-else class="flex items-center gap-1.5 text-ui-cap text-ui-faint">
                      <UserX class="w-3.5 h-3.5" /> No Leader
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </UiCard>

          <!-- Invoices (optional, only meaningful if any invoice links back to this project) -->
          <ProjectInvoices :invoices="project.invoices || []" />
        </div>
      </div>

      <!-- Board Tab (kept mounted so progress stays live from the task store) -->
      <div v-show="activeTab === 'board'">
        <TaskBoard />
      </div>

      <!-- Documents Tab -->
      <div v-show="activeTab === 'documents'">
        <ProjectDocuments :project-id="id" />
      </div>

      <!-- Billing Tab: invoiced vs paid for this project -->
      <div v-if="can('project-expense-list')" v-show="activeTab === 'billing'">
        <ProjectBilling :project-id="id" />
      </div>

      <!-- Maintenance contracts tied to this project (optional) -->
      <div v-if="can('maintenance-menu') || can('maintenance-list')" v-show="activeTab === 'maintenance'">
        <MaintenancePanel :project-id="id" />
      </div>

      <!-- Project Access (optional quick links) -->
      <div v-show="activeTab === 'access'">
        <ProjectAccess
          :access-project-name="project.access_project_name || ''"
          :access-project-url="project.access_project_url || ''"
          :access-github-name="project.access_github_name || ''"
          :access-github-url="project.access_github_url || ''"
          :access-figma-name="project.access_figma_name || ''"
          :access-figma-url="project.access_figma_url || ''"
          :additional-access="project.additional_access || []"
        />
      </div>
    </template>
  </div>
</template>
