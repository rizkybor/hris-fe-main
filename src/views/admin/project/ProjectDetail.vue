<script setup>
import { useProjectStore } from "@/stores/project";
import { useTaskStore } from "@/stores/task";
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
import _ from "lodash";
import TaskBoard from "@/components/admin/project/detail/TaskBoard.vue";
import ProjectDocuments from "@/components/admin/project/detail/ProjectDocuments.vue";
import ProjectInvoices from "@/components/admin/project/detail/ProjectInvoices.vue";
import Avatar from "@/components/common/Avatar.vue";

const route = useRoute();
const id = route.params.id;

const projectStore = useProjectStore();
const { fetchProject, downloadProgressReport } = projectStore;

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

onMounted(async () => {
  await handleFetchProject();
});
</script>

<template>
  <!-- Deadline Risk Banner -->
  <div
    v-if="projectHealth && projectHealth.level !== 'on-track'"
    class="rounded-[12px] border p-3.5 sm:p-5 mb-6 flex items-start gap-3 sm:gap-3.5"
    :class="healthBannerStyles[projectHealth.level].wrapper"
  >
    <div
      class="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] flex items-center justify-center shrink-0"
      :class="healthBannerStyles[projectHealth.level].iconBox"
    >
      <component :is="healthBannerStyles[projectHealth.level].icon" class="w-4 h-4 sm:w-5 sm:h-5" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <h4 class="text-sm font-bold" :class="healthBannerStyles[projectHealth.level].title">
          {{ projectHealth.label }}
        </h4>
        <span
          class="px-2 py-0.5 rounded-md text-xs font-semibold bg-white/70"
          :class="healthBannerStyles[projectHealth.level].title"
        >
          {{ projectHealth.daysRemaining >= 0 ? `${projectHealth.daysRemaining}d left` : `${Math.abs(projectHealth.daysRemaining)}d overdue` }}
        </span>
        <span
          class="px-2 py-0.5 rounded-md text-xs font-semibold bg-white/70"
          :class="healthBannerStyles[projectHealth.level].title"
        >
          {{ projectHealth.actualProgress }}% done &middot; expected {{ projectHealth.expectedProgress }}%
        </span>
      </div>
      <p class="text-xs mt-1.5" :class="healthBannerStyles[projectHealth.level].message">
        {{ projectHealth.message }}
      </p>
    </div>
  </div>

  <!-- Project Information Section -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <!-- Project Details Card -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 sm:p-6"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 mb-6">
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0"
          >
            <Briefcase class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base sm:text-lg font-bold">
              Project Information
            </h3>
            <p class="text-brand-light text-xs font-normal">
              Complete project overview
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <div
            class="px-3 py-1.5 rounded-full text-xs font-semibold"
            :class="getProjectStatusColor(project.status)"
          >
            {{ _.capitalize(project.status) }}
          </div>
          <div
            class="px-3 py-1.5 rounded-full text-xs font-semibold"
            :class="getPriorityColor(project.priority)"
          >
            {{ _.capitalize(project.priority) }}
          </div>
          <button
            v-if="can('project-export')"
            @click="handleExportProgress"
            :disabled="exporting"
            class="border border-[#DCDEDD] text-brand-dark py-2 px-3.5 rounded-[8px] font-medium hover:bg-gray-50 hover:border-[#0C51D9] hover:border-2 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download class="w-3.5 h-3.5" />
            <span class="text-xs font-semibold">{{ exporting ? "Exporting..." : "Export Progress" }}</span>
          </button>
        </div>
      </div>

      <!-- Project Image -->
      <div
        class="w-full h-40 sm:h-52 md:h-56 bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden rounded-[12px] mb-6"
      >
        <img
          :src="project.photo"
          alt="Project Image"
          class="w-full h-full object-cover rounded-[12px]"
        />
      </div>

      <!-- Project Basic Info -->
      <div class="space-y-4">
        <div>
          <h4 class="text-brand-dark text-lg sm:text-xl font-bold mb-2">
            {{ project.name }}
          </h4>
        </div>

        <!-- About Project Section -->
        <div>
          <h5 class="text-brand-dark text-sm font-semibold mb-2.5">
            About Project
          </h5>
          <div class="text-brand-light text-sm leading-relaxed space-y-3">
            <p v-for="(paragraph, index) in aboutParagraphs" :key="index">
              {{ paragraph }}
            </p>
          </div>
        </div>

        <!-- Assigned Members Section (By Employee mode) -->
        <div v-if="project.team_assignment_mode === 'employee'">
          <h5 class="text-brand-dark text-sm font-semibold mb-2.5">
            Project Members
          </h5>
          <div
            v-if="!project.members || project.members.length === 0"
            class="flex flex-col items-center justify-center py-8 text-center rounded-[12px] border border-dashed border-[#DCDEDD] bg-gray-50/60"
          >
            <Users class="w-7 h-7 text-gray-300 mb-2.5" />
            <p class="text-gray-500 text-xs font-medium">No members assigned</p>
          </div>
          <div v-else class="flex flex-wrap gap-2.5">
            <span
              v-for="member in project.members"
              :key="member.id"
              class="px-3 py-1.5 rounded-full bg-blue-50 text-[#0C51D9] text-xs font-medium"
            >
              {{ member.name }}
            </span>
          </div>
        </div>

        <!-- Assigned Teams Section (By Team mode) -->
        <div v-else>
          <h5 class="text-brand-dark text-sm font-semibold mb-2.5">
            Assigned Teams
          </h5>
          <div
            v-if="!project.teams || project.teams.length === 0"
            class="flex flex-col items-center justify-center py-8 text-center rounded-[12px] border border-dashed border-[#DCDEDD] bg-gray-50/60"
          >
            <UsersRound class="w-7 h-7 text-gray-300 mb-2.5" />
            <p class="text-gray-500 text-xs font-medium">No teams assigned</p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div
              v-for="team in project.teams"
              :key="team.id"
              class="border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:shadow-md transition-all duration-300 p-4"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 relative flex items-center justify-center rounded-[10px] overflow-hidden flex-shrink-0"
                >
                  <div
                    class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-[10px]"
                  ></div>
                  <component
                    :is="Briefcase"
                    class="w-4 h-4 text-white relative z-10"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-brand-dark text-sm font-bold mb-0.5 truncate">
                    {{ team.name }}
                  </h4>
                  <div class="flex items-center gap-2">
                    <User class="w-3 h-3 text-brand-light" />
                    <p class="text-brand-light text-xs">
                      {{ team.members_count }} Members
                    </p>
                  </div>
                </div>
              </div>

              <div class="mt-3.5 pt-3.5 border-t border-[#DCDEDD]">
                <div v-if="team.leader" class="flex items-center gap-3">
                  <Avatar
                    :src="team.leader.profile_photo"
                    :alt="team.leader.name"
                    size="w-8 h-8"
                    icon-size="w-3.5 h-3.5"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-brand-dark text-xs font-semibold truncate">
                      {{ team.leader.name }}
                    </p>
                    <p class="text-brand-light text-xs">Team Leader</p>
                  </div>
                </div>
                <div
                  v-else
                  class="w-full h-9 rounded-md bg-gray-100 flex items-center justify-center gap-2 text-gray-400 text-xs"
                >
                  <UserX class="w-3.5 h-3.5" />
                  No Leader
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Sidebar -->
    <div class="space-y-4">
      <!-- Project Leader Card -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 h-fit">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-9 h-9 bg-green-50 rounded-[10px] flex items-center justify-center shrink-0"
          >
            <Crown class="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">Project Leader</h3>
            <p class="text-brand-light text-xs font-normal">
              Team leader information
            </p>
          </div>
        </div>

        <div v-if="project.leader" class="flex items-center gap-3">
          <Avatar
            :src="project.leader.user.profile_photo"
            :alt="project.leader.user.name"
            size="w-12 h-12"
            icon-size="w-5 h-5"
          />
          <div class="flex-1 min-w-0">
            <h4 class="text-brand-dark text-sm font-bold mb-0.5 truncate">
              {{ project.leader?.user?.name }}
            </h4>
            <p class="text-brand-light text-xs truncate">
              {{ project.leader?.job_information?.job_title }}
            </p>
          </div>
          <RouterLink
            :to="{
              name: 'admin.employees.detail',
              params: { id: project.leader.id },
            }"
            class="border border-[#DCDEDD] text-brand-dark py-2 px-3 rounded-[8px] font-medium hover:bg-gray-50 hover:border-[#0C51D9] hover:border-2 transition-all duration-300 flex items-center gap-1.5 shrink-0"
          >
            <User class="w-3.5 h-3.5" />
            <span class="text-xs font-semibold">Profile</span>
          </RouterLink>
        </div>
        <div v-else class="flex items-center gap-2 py-2 text-gray-400 text-xs">
          <UserX class="w-4 h-4" />
          No leader assigned
        </div>
      </div>

      <!-- Vendor Card (optional) -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 h-fit">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-9 h-9 bg-orange-50 rounded-[10px] flex items-center justify-center shrink-0"
          >
            <Building2 class="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">Vendor</h3>
            <p class="text-brand-light text-xs font-normal">
              Contracted vendor, if any
            </p>
          </div>
        </div>

        <div v-if="project.vendor" class="flex items-center gap-3">
          <div class="w-10 h-10 bg-orange-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Building2 class="w-4 h-4 text-orange-600" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-brand-dark text-sm font-bold mb-0.5 truncate">
              {{ project.vendor.name }}
            </h4>
            <p class="text-brand-light text-xs truncate">
              {{ project.vendor.pic_name || project.vendor.email || "-" }}
            </p>
          </div>
          <RouterLink
            :to="{ name: 'admin.vendors.detail', params: { id: project.vendor.id } }"
            class="border border-[#DCDEDD] text-brand-dark py-2 px-3 rounded-[8px] font-medium hover:bg-gray-50 hover:border-[#0C51D9] hover:border-2 transition-all duration-300 flex items-center gap-1.5 shrink-0"
          >
            <Building2 class="w-3.5 h-3.5" />
            <span class="text-xs font-semibold">View</span>
          </RouterLink>
        </div>
        <div v-else class="flex items-center gap-2 py-2 text-gray-400 text-xs">
          <Building2 class="w-4 h-4" />
          No vendor linked
        </div>
      </div>

      <!-- Progress + Budget (headline metrics, highlighted) -->
      <div class="grid grid-cols-2 gap-4">
        <div
          class="bg-gradient-to-br from-purple-50/70 to-white border border-purple-100 rounded-[14px] hover:shadow-sm transition-all duration-300 p-4 border-l-4 border-l-purple-400"
        >
          <div
            class="w-9 h-9 bg-purple-100 rounded-[10px] flex items-center justify-center mb-3"
          >
            <Target class="w-4 h-4 text-purple-600" />
          </div>
          <p class="text-brand-dark text-xs font-medium">Progress</p>
          <p class="text-brand-dark text-lg font-extrabold leading-none my-1.5">
            {{ projectProgress }}%
          </p>
          <p class="text-purple-600 text-xs font-medium mb-3 leading-snug">
            {{ projectHealth ? `Expected ${projectHealth.expectedProgress}% by now` : "Project completion" }}
          </p>
          <div class="w-full bg-purple-100/70 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all duration-300"
              :class="getProgressColor(projectProgress)"
              :style="{ width: `${projectProgress}%` }"
            ></div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-100 rounded-[14px] hover:shadow-sm transition-all duration-300 p-4 border-l-4 border-l-emerald-400"
        >
          <div class="flex items-center justify-between mb-3">
            <div
              class="w-9 h-9 bg-emerald-100 rounded-[10px] flex items-center justify-center"
            >
              <DollarSign class="w-4 h-4 text-green-600" />
            </div>
            <button
              type="button"
              @click="toggleBudgetVisibility"
              class="w-7 h-7 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"
              :title="isBudgetVisible ? 'Hide budget' : 'Show budget'"
            >
              <Eye v-if="!isBudgetVisible" class="w-3.5 h-3.5" />
              <EyeOff v-else class="w-3.5 h-3.5" />
            </button>
          </div>
          <p class="text-brand-dark text-xs font-medium">Budget</p>
          <p
            v-if="isBudgetVisible"
            class="text-brand-dark font-extrabold leading-snug my-1.5 break-words"
            :class="formatRupiah(project.budget).length > 14 ? 'text-sm' : 'text-lg'"
          >
            {{ formatRupiah(project.budget) }}
          </p>
          <p v-else class="text-brand-dark text-lg font-extrabold leading-none my-1.5 tracking-widest">
            Rp ••••••••
          </p>
          <p class="text-success text-xs font-medium">Project budget</p>
        </div>
      </div>

      <!-- Start Date + End Date -->
      <div class="grid grid-cols-2 gap-4">
        <div
          class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
        >
          <div
            class="w-9 h-9 bg-indigo-50 rounded-[10px] flex items-center justify-center mb-3"
          >
            <Calendar class="w-4 h-4 text-indigo-600" />
          </div>
          <p class="text-brand-dark text-xs font-medium">Start Date</p>
          <p class="text-brand-dark text-base font-extrabold leading-snug my-1.5">
            {{ formatDate(project.start_date) || "N/A" }}
          </p>
          <p class="text-indigo-600 text-xs font-medium">Project kickoff</p>
        </div>

        <div
          class="bg-gradient-to-br from-orange-50/70 to-white border border-orange-100 rounded-[14px] hover:shadow-sm transition-all duration-300 p-4 border-l-4 border-l-orange-400"
        >
          <div
            class="w-9 h-9 bg-orange-100 rounded-[10px] flex items-center justify-center mb-3"
          >
            <CalendarCheck class="w-4 h-4 text-orange-600" />
          </div>
          <p class="text-brand-dark text-xs font-medium">End Date</p>
          <p class="text-brand-dark text-base font-extrabold leading-snug my-1.5">
            {{ formatDate(project.end_date) || "N/A" }}
          </p>
          <p class="text-orange-600 text-xs font-medium">Project deadline</p>
        </div>
      </div>

      <!-- Duration Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-xs font-medium">Duration</p>
            <p class="text-brand-dark text-lg font-extrabold leading-none my-1.5">
              {{ calculateDuration(project.start_date, project.end_date) }}
            </p>
            <p class="text-blue-600 text-xs font-medium">Project timeline</p>
          </div>
          <div
            class="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0"
          >
            <Clock class="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Tasks Section -->
  <TaskBoard />

  <!-- Documents Section -->
  <ProjectDocuments :project-id="id" />

  <!-- Invoices Section (optional, only meaningful if any invoice links back to this project) -->
  <ProjectInvoices :invoices="project.invoices || []" />
</template>
