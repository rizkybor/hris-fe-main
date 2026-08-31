<script setup>
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
  <!-- Search Section -->
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] mb-6 p-4">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
    >
      <!-- Search Bar -->
      <div class="flex-1 relative">
        <div
          class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
        >
          <SearchIcon class="h-5 w-5 text-gray-400" />
        </div>
        <input
          v-model="query"
          type="text"
          class="w-full pl-12 pr-10 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300"
          placeholder="Search employees, tasks, reports, projects..."
          @keyup.enter="handleSearch"
        />
        <button
          v-if="query"
          @click="clearSearch"
          class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
        >
          <XIcon class="h-4 w-4" />
        </button>
      </div>

      <!-- Filter and Action Buttons -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
        <!-- Department Filter -->
        <div class="relative w-full sm:w-auto">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <BuildingIcon class="h-4 w-4 text-gray-400" />
          </div>
          <select
            v-model="departmentFilter"
            class="select-soft select-soft-icon-pl"
          >
            <option value="">All Departments</option>
            <option v-for="dept in departments" :key="dept.value" :value="dept.value">
              {{ dept.label }}
            </option>
          </select>
          <div
            class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
          >
            <ChevronDownIcon class="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <!-- Search Button -->
        <button
          @click="handleSearch"
          :disabled="loading"
          class="btn-primary w-full sm:w-auto rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center sm:justify-start gap-2 disabled:opacity-50"
        >
          <SearchIcon class="w-4 h-4 text-white" />
          <span class="text-brand-white text-base font-semibold">
            {{ loading ? "Searching..." : "Search" }}
          </span>
        </button>
      </div>
    </div>

    <!-- Results -->
    <div v-if="hasSearched" class="mt-4 pt-4 border-t border-[#F1F1F1]">
      <Spinner v-if="loading" label="Searching..." />

      <div v-else-if="!hasResults" class="text-center py-6 text-sm text-gray-400">
        No results found for "{{ query }}"
      </div>

      <div v-else class="space-y-4">
        <div v-if="filteredEmployees.length > 0">
          <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Employees</p>
          <div class="space-y-1">
            <button
              v-for="employee in filteredEmployees"
              :key="'emp-' + employee.id"
              @click="goToEmployee(employee.id)"
              class="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <UserIcon class="w-4 h-4 text-gray-400 shrink-0" />
              <span class="text-sm text-brand-dark font-medium">{{ employee.name }}</span>
              <span class="text-xs text-gray-400">{{ employee.job_title }}</span>
            </button>
          </div>
        </div>

        <div v-if="results.projects.length > 0">
          <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Projects</p>
          <div class="space-y-1">
            <button
              v-for="project in results.projects"
              :key="'proj-' + project.id"
              @click="goToProject(project.id)"
              class="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <FolderIcon class="w-4 h-4 text-gray-400 shrink-0" />
              <span class="text-sm text-brand-dark font-medium">{{ project.name }}</span>
              <span class="text-xs text-gray-400 capitalize">{{ project.status }}</span>
            </button>
          </div>
        </div>

        <div v-if="results.tasks.length > 0">
          <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Tasks</p>
          <div class="space-y-1">
            <button
              v-for="task in results.tasks"
              :key="'task-' + task.id"
              @click="goToProjectFromTask(task.project_id)"
              class="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ListChecksIcon class="w-4 h-4 text-gray-400 shrink-0" />
              <span class="text-sm text-brand-dark font-medium">{{ task.name }}</span>
              <span class="text-xs text-gray-400">{{ task.project_name }}</span>
            </button>
          </div>
        </div>

        <div v-if="results.teams.length > 0">
          <p class="text-xs font-semibold text-gray-400 uppercase mb-2">Teams</p>
          <div class="space-y-1">
            <button
              v-for="team in results.teams"
              :key="'team-' + team.id"
              @click="goToTeam(team.id)"
              class="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <UsersIcon class="w-4 h-4 text-gray-400 shrink-0" />
              <span class="text-sm text-brand-dark font-medium">{{ team.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
