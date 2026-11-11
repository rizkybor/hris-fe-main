<script setup>
import Statistic from "@/components/admin/team/Statistic.vue";
import CardList from "@/components/admin/team/CardList.vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import { useTeamStore } from "@/stores/team";
import { useOptionStore } from "@/stores/option";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";
import { debounce } from "lodash-es";
import { Upload, Plus, SearchIcon, Users2 } from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import { UiPageHeader, UiButton, UiInput, UiChips, UiSelect, UiEmpty } from "@/components/ui";

const teamStore = useTeamStore();
const { teams, meta, loading, success } = storeToRefs(teamStore);
const { fetchTeamsPaginated } = teamStore;

const optionStore = useOptionStore();
const { departments } = storeToRefs(optionStore);
const { fetchDepartments } = optionStore;

const serverOptions = ref({
  page: 1,
  row_per_page: 10,
});

const filters = ref({
  search: null,
  status: "",
  department: "",
});

const fetchData = async () => {
  await fetchTeamsPaginated({
    ...serverOptions.value,
    ...filters.value,
  });
};

onMounted(async () => {
  await fetchDepartments();
  fetchData();
});

watch(
  filters,
  debounce(() => {
    serverOptions.value.page = 1; // Reset to first page when filtering
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

// Presentation-only option lists for the filter controls.
const statusOptions = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "forming", label: "Forming" },
  { value: "planning", label: "Planning" },
  { value: "dormant", label: "Dormant" },
];
const departmentOptions = computed(() => [
  { value: "", label: "All Departments" },
  ...(departments.value || []).map((d) => ({ value: d.value, label: d.label })),
]);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="All Teams">
      <template #subtitle>
        Showing {{ meta.from }} - {{ meta.to }} of {{ meta.total }} teams
      </template>
      <template #actions>
        <UiButton variant="secondary" :icon="Upload" class="flex-1 sm:flex-none">Import CSV</UiButton>
        <UiButton :icon="Plus" :to="{ name: 'admin.team.create' }" class="flex-1 sm:flex-none">Add Team</UiButton>
      </template>
    </UiPageHeader>

    <Statistic />

    <Alert type="success" :title="success" :show="success" @close="teamStore.clearMessages()" />

    <!-- Team List Section -->
    <section class="space-y-4">
      <!-- Toolbar -->
      <div class="flex flex-col lg:flex-row lg:items-center gap-3">
        <UiInput
          v-model="filters.search"
          :icon="SearchIcon"
          placeholder="Search teams by name, lead, status..."
          class="lg:w-80"
        />
        <UiChips v-model="filters.status" :options="statusOptions" class="flex-1" />
        <UiSelect v-model="filters.department" :options="departmentOptions" class="lg:w-56" />
      </div>

      <!-- Teams Grid -->
      <SkeletonCardGrid v-if="loading" :count="6" cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />

      <div
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 ui-stagger"
        v-else-if="teams.length > 0"
      >
        <CardList v-for="team in teams" :key="team.id" :data="team" />
      </div>

      <!-- Empty State -->
      <div v-else class="bg-ui-surface border border-ui-line rounded-ui-card">
        <UiEmpty :icon="Users2" title="No teams found" />
      </div>

      <!-- Pagination -->
      <Pagination
        :meta="meta"
        :loading="loading"
        @page-change="handlePageChange"
        @per-page-change="handlePerPageChange"
      />
    </section>
  </div>
</template>
