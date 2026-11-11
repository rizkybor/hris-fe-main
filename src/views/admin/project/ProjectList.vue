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
import { UiPageHeader, UiButton, UiChips, UiEmpty } from "@/components/ui";

// Same status values the old select sent.
const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "on-hold", label: "On Hold" },
  { value: "overdue", label: "Overdue" },
];

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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="All Projects" subtitle="View and manage all project information">
      <template #actions>
        <UiButton
          v-if="can('project-create')"
          :icon="Plus"
          :to="{ name: 'admin.projects.create' }"
          class="w-full sm:w-auto"
        >
          Add Project
        </UiButton>
      </template>
    </UiPageHeader>

    <template v-if="can('project-statistic')">
      <Statistics />
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 ui-stagger">
        <ProjectProgressChart />
        <BudgetChart compact />
        <RealizedChart compact />
      </div>
    </template>

    <Alert type="success" :title="success" :show="success" @close="projectStore.clearMessages()" />

    <!-- Projects Grid Section -->
    <section class="sm:bg-ui-surface sm:border sm:border-ui-line sm:rounded-ui-card">
      <!-- Toolbar: search, status chips, clear -->
      <div class="flex flex-col lg:flex-row lg:items-center gap-3 sm:p-4 sm:px-5 sm:border-b border-ui-line">
        <div class="relative w-full lg:w-72 shrink-0">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
          <input
            type="text"
            class="w-full h-[38px] pl-9 pr-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow"
            placeholder="Search projects..."
            aria-label="Search projects"
            v-model="filters.search"
          />
        </div>
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <UiChips v-model="filters.status" :options="STATUS_OPTIONS" class="min-w-0 flex-1" />
          <UiButton v-if="hasActiveFilters" variant="ghost" size="sm" :icon="X" class="shrink-0" @click="clearFilters">
            Clear
          </UiButton>
        </div>
      </div>

      <div class="pt-4 sm:p-5">
        <SkeletonCardGrid
          v-if="loading"
          :count="6"
          cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        />

        <div
          v-else-if="projects.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 ui-stagger"
        >
          <CardList
            v-for="project in projects"
            :key="project.id"
            :data="project"
            @delete="handleDelete"
          />
        </div>

        <!-- Empty state: distinguishes "nothing matches the current filter" (with a way out) from "no projects exist yet" (with a way in) -->
        <template v-else>
          <UiEmpty
            v-if="hasActiveFilters"
            :icon="SearchX"
            title="No projects match your filters"
            message="Try adjusting your search terms or status filter"
          >
            <UiButton variant="secondary" size="sm" :icon="X" @click="clearFilters">Clear filters</UiButton>
          </UiEmpty>
          <UiEmpty
            v-else
            :icon="FolderPlus"
            title="No projects yet"
            message="Create your first project to start tracking tasks and progress"
          >
            <UiButton
              v-if="can('project-create')"
              size="sm"
              :icon="Plus"
              :to="{ name: 'admin.projects.create' }"
            >
              Add Project
            </UiButton>
          </UiEmpty>
        </template>
      </div>

      <div class="pt-4 sm:pt-0 sm:px-5 sm:pb-5">
        <Pagination
          :meta="meta"
          :loading="loading"
          @page-change="handlePageChange"
          @per-page-change="handlePerPageChange"
        />
      </div>
    </section>
  </div>
</template>
