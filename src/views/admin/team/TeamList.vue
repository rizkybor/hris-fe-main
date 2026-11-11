<script setup>
import Statistic from "@/components/admin/team/Statistic.vue";
import CardList from "@/components/admin/team/CardList.vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import { useTeamStore } from "@/stores/team";
import { useOptionStore } from "@/stores/option";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";
import { debounce } from "lodash-es";
import { useI18n } from "vue-i18n";
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
const { t } = useI18n();
const statusOptions = computed(() => [
  { value: "", label: t("common.labels.allStatuses") },
  { value: "active", label: t("teams.status.active") },
  { value: "forming", label: t("teams.status.forming") },
  { value: "planning", label: t("teams.status.planning") },
  { value: "dormant", label: t("teams.status.dormant") },
]);
const departmentOptions = computed(() => [
  { value: "", label: t("teams.list.allDepartments") },
  ...(departments.value || []).map((d) => ({ value: d.value, label: d.label })),
]);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('teams.list.title')">
      <template #subtitle>
        {{ $t("common.pagination.showingItems", { from: meta.from, to: meta.to, total: meta.total, items: $t("teams.list.itemLabel") }) }}
      </template>
      <template #actions>
        <UiButton variant="secondary" :icon="Upload" class="flex-1 sm:flex-none">{{ $t("teams.list.importCsv") }}</UiButton>
        <UiButton :icon="Plus" :to="{ name: 'admin.team.create' }" class="flex-1 sm:flex-none">{{ $t("teams.list.addTeam") }}</UiButton>
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
          :placeholder="$t('teams.list.searchPlaceholder')"
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
        <UiEmpty :icon="Users2" :title="$t('teams.list.empty')" />
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
