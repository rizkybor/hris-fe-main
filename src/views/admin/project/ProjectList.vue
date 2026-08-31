<script setup>
import CardList from "@/components/admin/project/list/CardList.vue";
import Statistics from "@/components/admin/project/list/Statistics.vue";
import BudgetChart from "@/components/admin/project/list/BudgetChart.vue";
import RealizedChart from "@/components/admin/project/list/RealizedChart.vue";
import ProjectProgressChart from "@/components/admin/project/list/ProjectProgressChart.vue";
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";
import {
  Upload,
  Plus,
  Briefcase,
  Search,
  SearchX,
  X,
  FolderPlus,
  ChevronDown,
} from "lucide-vue-next";
import { computed } from "vue";
import { ref } from "vue";
import { onMounted } from "vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import { watch } from "vue";
import { debounce } from "lodash-es";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import Alert from "@/components/common/Alert.vue";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";

const projectStore = useProjectStore();
const { projects, meta, loading, success } = storeToRefs(projectStore);
const { fetchProjectsPaginated, deleteProject } = projectStore;
const alertModal = useAlertModalStore();

const serverOptions = ref({
  page: 1,
  row_per_page: 10,
});

const filters = ref({
  search: null,
  status: "",
});

const fetchData = async () => {
  await fetchProjectsPaginated({
    ...serverOptions.value,
    ...filters.value,
  });
};

onMounted(async () => {
  await fetchData();
});

watch(
  filters,
  debounce(() => {
    serverOptions.value.page = 1;
    fetchData();
  }, 300),
  { deep: true },
);

const handlePageChange = (page) => {
  serverOptions.value.page = page;
  fetchData();
};

const handlePerPageChange = (perPage) => {
  serverOptions.value.row_per_page = perPage;
  serverOptions.value.page = 1;
  fetchData();
};

const hasActiveFilters = computed(() =>
  Boolean(filters.value.search || filters.value.status),
);
const clearFilters = () => {
  filters.value.search = null;
  filters.value.status = "";
};

const handleDelete = async (project) => {
  const ok = await alertModal.confirm(
    `Delete project "${project.name}"? This action cannot be undone.`,
    {
      type: "danger",
      confirmText: "Delete",
    },
  );
  if (!ok) return;

  try {
    await deleteProject(project.id);
    await fetchData();
  } catch (error) {
    await alertModal.alert("Failed to delete project.", { type: "danger" });
  }
};
</script>

<template>
  <div class="px-4 py-4">
    <Statistics v-if="can('project-statistic')" />
    <div
      v-if="can('project-statistic')"
      class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5"
    >
      <ProjectProgressChart />
      <BudgetChart compact />
      <RealizedChart compact />
    </div>

    <Alert type="success" :title="success" :show="success" />

    <!-- Projects Grid Section -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="w-10 h-10 sm:w-11 sm:h-11 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0"
          >
            <Briefcase class="w-5 h-5 text-blue-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold">All Projects</h3>
            <p class="text-brand-light text-xs font-normal">
              View and manage all project information
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3" v-if="can('project-create')">
          <!-- <button
          class="bg-white border border-[#DCDEDD] text-brand-dark py-3 px-4 rounded-[8px] font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Upload class="w-4 h-4" />
          <span class="text-sm font-semibold">Import CSV</span>
        </button> -->
          <RouterLink
            class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-2 w-full sm:w-auto"
            :to="{ name: 'admin.projects.create' }"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-xs font-semibold"
              >Add Project</span
            >
          </RouterLink>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <div class="mb-5">
        <div
          class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div class="relative flex-1">
            <div
              class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
            >
              <Search class="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              class="w-full pl-10 pr-4 py-2.5 text-sm border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-medium"
              placeholder="Search projects..."
              v-model="filters.search"
            />
          </div>
          <div class="relative w-full sm:w-auto">
            <select
              v-model="filters.status"
              class="select-soft"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="overdue">Overdue</option>
            </select>
            <ChevronDown
              class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            />
          </div>
          <button
            v-if="hasActiveFilters"
            type="button"
            @click="clearFilters"
            class="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-xs font-semibold text-gray-500 hover:text-[#0C51D9] hover:bg-gray-50 transition-colors duration-200 shrink-0"
          >
            <X class="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      <SkeletonCardGrid
        v-if="loading"
        :count="6"
        cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      />

      <div
        v-else-if="projects.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-4"
      >
        <CardList
          v-for="project in projects"
          :key="project.id"
          :data="project"
          @delete="handleDelete"
        />
      </div>

      <!-- Empty state: distinguishes "nothing matches the current filter" (with a way out) from "no projects exist yet" (with a way in) -->
      <div
        v-else
        class="flex flex-col items-center justify-center text-center py-14 rounded-[12px] border border-dashed border-[#DCDEDD] bg-gray-50/60 mb-4"
      >
        <template v-if="hasActiveFilters">
          <SearchX class="w-10 h-10 text-gray-300 mb-3" />
          <h4 class="text-brand-dark text-sm font-semibold mb-1">
            No projects match your filters
          </h4>
          <p class="text-brand-light text-xs mb-4">
            Try adjusting your search terms or status filter
          </p>
          <button
            type="button"
            @click="clearFilters"
            class="flex items-center gap-1.5 px-4 py-2 rounded-[8px] border border-[#DCDEDD] text-xs font-semibold text-brand-dark hover:border-[#0C51D9] hover:bg-white transition-colors duration-200"
          >
            <X class="w-3.5 h-3.5" />
            Clear filters
          </button>
        </template>
        <template v-else>
          <FolderPlus class="w-10 h-10 text-gray-300 mb-3" />
          <h4 class="text-brand-dark text-sm font-semibold mb-1">
            No projects yet
          </h4>
          <p class="text-brand-light text-xs mb-4">
            Create your first project to start tracking tasks and progress
          </p>
          <RouterLink
            v-if="can('project-create')"
            :to="{ name: 'admin.projects.create' }"
            class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-4 py-2 flex items-center gap-1.5"
          >
            <Plus class="w-3.5 h-3.5 text-white" />
            <span class="text-brand-white text-xs font-semibold"
              >Add Project</span
            >
          </RouterLink>
        </template>
      </div>

      <Pagination
      :meta="meta"
      :loading="loading"
      @page-change="handlePageChange"
      @per-page-change="handlePerPageChange"
    />
    </div>
  </div>
</template>
