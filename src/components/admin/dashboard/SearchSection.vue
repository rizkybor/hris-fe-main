<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiButton } from "@/components/ui";
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  SearchIcon,
  BuildingIcon,
  ChevronDownIcon,
  UserIcon,
  FolderIcon,
  ListChecksIcon,
  UsersIcon,
  XIcon,
} from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import Spinner from "@/components/common/skeleton/Spinner.vue";
import { useOptionStore } from "@/stores/option";

const router = useRouter();
const optionStore = useOptionStore();
const { departments } = storeToRefs(optionStore);

const query = ref("");
const departmentFilter = ref("");
const loading = ref(false);
const hasSearched = ref(false);
const results = ref({ employees: [], projects: [], teams: [], tasks: [] });

onMounted(() => {
  optionStore.fetchDepartments();
});

const filteredEmployees = computed(() => {
  if (!departmentFilter.value) return results.value.employees;
  return results.value.employees.filter((e) => e.department === departmentFilter.value);
});

const hasResults = computed(() => {
  return (
    filteredEmployees.value.length > 0 ||
    results.value.projects.length > 0 ||
    results.value.teams.length > 0 ||
    results.value.tasks.length > 0
  );
});

const handleSearch = async () => {
  if (!query.value || query.value.trim().length < 2) {
    results.value = { employees: [], projects: [], teams: [], tasks: [] };
    hasSearched.value = false;
    return;
  }

  loading.value = true;
  hasSearched.value = true;
  try {
    const { data } = await axiosInstance.get("/search", { params: { q: query.value.trim() } });
    results.value = data.data;
  } catch (error) {
    console.error("Search failed", error);
  } finally {
    loading.value = false;
  }
};

const clearSearch = () => {
  query.value = "";
  results.value = { employees: [], projects: [], teams: [], tasks: [] };
  hasSearched.value = false;
};

const goToEmployee = (id) => router.push({ name: "admin.employees.detail", params: { id } });
const goToProject = (id) => router.push({ name: "admin.projects.detail", params: { id } });
const goToTeam = (id) => router.push({ name: "admin.team.detail", params: { id } });
const goToProjectFromTask = (projectId) => router.push({ name: "admin.projects.detail", params: { id: projectId } });
</script>

<template>
  <DashboardWidgetCard :title="$t('dashboard.widgets.search')" :subtitle="$t('dashboard.search.subtitle')">
    <div class="flex flex-col sm:flex-row gap-2">
      <div class="flex-1 relative">
        <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
        <input
          v-model="query"
          type="text"
          class="w-full h-10 pl-9 pr-9 bg-ui-surface border border-ui-line-strong rounded-ui-control text-ui-body text-ui-ink placeholder:text-ui-faint focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow"
          :placeholder="$t('dashboard.search.placeholder')"
          @keyup.enter="handleSearch"
        />
        <button v-if="query" type="button" :aria-label="$t('dashboard.search.clear')" @click="clearSearch" class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-ui-faint hover:text-ui-ink hover:bg-ui-hover">
          <XIcon class="w-3.5 h-3.5" />
        </button>
      </div>
      <div class="relative sm:w-48">
        <BuildingIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
        <select v-model="departmentFilter" class="w-full h-10 pl-9 pr-8 appearance-none bg-ui-surface border border-ui-line-strong rounded-ui-control text-ui-body text-ui-ink focus:outline-none focus:border-ui-accent focus:shadow-ui-focus">
          <option value="">{{ $t("dashboard.search.allDepartments") }}</option>
          <option v-for="dept in departments" :key="dept.value" :value="dept.value">{{ dept.label }}</option>
        </select>
        <ChevronDownIcon class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
      </div>
      <UiButton :icon="SearchIcon" :loading="loading" @click="handleSearch">{{ loading ? $t("dashboard.search.searching") : $t("common.actions.search") }}</UiButton>
    </div>

    <div v-if="hasSearched" class="mt-4 pt-4 border-t border-ui-line">
      <Spinner v-if="loading" :label="$t('dashboard.search.searching')" />
      <p v-else-if="!hasResults" class="text-center py-6 text-ui-small text-ui-muted">{{ $t("dashboard.search.noResults", { query }) }}</p>

      <div v-else class="space-y-4">
        <div v-if="filteredEmployees.length > 0">
          <p class="text-ui-over uppercase text-ui-muted mb-1.5 px-2">{{ $t("dashboard.search.employees") }}</p>
          <button v-for="employee in filteredEmployees" :key="'emp-' + employee.id" type="button" @click="goToEmployee(employee.id)" class="w-full text-left flex items-center gap-3 h-9 px-2 rounded-ui-control hover:bg-ui-hover">
            <UserIcon class="w-4 h-4 text-ui-faint shrink-0" />
            <span class="text-ui-small font-medium text-ui-ink truncate">{{ employee.name }}</span>
            <span class="text-ui-cap text-ui-muted truncate">{{ employee.job_title }}</span>
          </button>
        </div>
        <div v-if="results.projects.length > 0">
          <p class="text-ui-over uppercase text-ui-muted mb-1.5 px-2">{{ $t("dashboard.search.projects") }}</p>
          <button v-for="project in results.projects" :key="'proj-' + project.id" type="button" @click="goToProject(project.id)" class="w-full text-left flex items-center gap-3 h-9 px-2 rounded-ui-control hover:bg-ui-hover">
            <FolderIcon class="w-4 h-4 text-ui-faint shrink-0" />
            <span class="text-ui-small font-medium text-ui-ink truncate">{{ project.name }}</span>
            <span class="text-ui-cap text-ui-muted capitalize">{{ project.status }}</span>
          </button>
        </div>
        <div v-if="results.tasks.length > 0">
          <p class="text-ui-over uppercase text-ui-muted mb-1.5 px-2">{{ $t("dashboard.search.tasks") }}</p>
          <button v-for="task in results.tasks" :key="'task-' + task.id" type="button" @click="goToProjectFromTask(task.project_id)" class="w-full text-left flex items-center gap-3 h-9 px-2 rounded-ui-control hover:bg-ui-hover">
            <ListChecksIcon class="w-4 h-4 text-ui-faint shrink-0" />
            <span class="text-ui-small font-medium text-ui-ink truncate">{{ task.name }}</span>
            <span class="text-ui-cap text-ui-muted truncate">{{ task.project_name }}</span>
          </button>
        </div>
        <div v-if="results.teams.length > 0">
          <p class="text-ui-over uppercase text-ui-muted mb-1.5 px-2">{{ $t("dashboard.search.teams") }}</p>
          <button v-for="team in results.teams" :key="'team-' + team.id" type="button" @click="goToTeam(team.id)" class="w-full text-left flex items-center gap-3 h-9 px-2 rounded-ui-control hover:bg-ui-hover">
            <UsersIcon class="w-4 h-4 text-ui-faint shrink-0" />
            <span class="text-ui-small font-medium text-ui-ink truncate">{{ team.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </DashboardWidgetCard>
</template>
