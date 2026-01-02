<script setup>
import CardList from "@/components/admin/project/list/CardList.vue";
import Statistics from "@/components/admin/project/list/Statistics.vue";
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";
import { Upload, Plus, Briefcase, Search, SearchX } from "lucide-vue-next";
import { ref } from "vue";
import { onMounted } from "vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import { watch } from "vue";
import { debounce } from "lodash";
import { can } from "@/helpers/permissionHelper";
import Alert from "@/components/common/Alert.vue";

const projectStore = useProjectStore();
const { projects, meta, loading, success } = storeToRefs(projectStore);
const { fetchProjectsPaginated } = projectStore;

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
  { deep: true }
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
</script>

<template>
  <Statistics v-if="can('project-statistic')" />

  <Alert type="success" :title="success" :show="success" />

  <!-- Projects Grid Section -->
  <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <Briefcase class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-xl font-bold">All Projects</h3>
          <p class="text-brand-light text-sm font-normal">
            View and manage all project information
          </p>
        </div>
      </div>
      <div class="flex items-center gap-4" v-if="can('project-create')">
        <button
          class="bg-white border border-[#DCDEDD] text-brand-dark py-3 px-4 rounded-[8px] font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Upload class="w-4 h-4" />
          <span class="text-sm font-semibold">Import CSV</span>
        </button>
        <RouterLink
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
          :to="{ name: 'admin.projects.create' }"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold"
            >Add Project</span
          >
        </RouterLink>
      </div>
    </div>

    <!-- Search and Filter Section -->
    <div class="mb-6">
      <div class="flex items-center gap-4">
        <div class="relative flex-1">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
            placeholder="Search projects..."
            v-model="filters.search"
          />
        </div>
        <select
          class="px-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on-hold">On Hold</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CardList v-for="project in projects" :key="project.id" :data="project" />
    </div>

    <div class="text-center py-12" v-if="projects.length === 0">
      <SearchX class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h4 class="text-brand-dark text-lg font-semibold mb-2">
        No projects found
      </h4>
      <p class="text-brand-light text-sm">
        Try adjusting your search terms or filters
      </p>
    </div>
  </div>

  <Pagination
    :meta="meta"
    :loading="loading"
    @page-change="handlePageChange"
    @per-page-change="handlePerPageChange"
  />
</template>
