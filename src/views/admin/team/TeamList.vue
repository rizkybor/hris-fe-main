<script setup>
import Statistic from "@/components/admin/team/Statistic.vue";
import CardList from "@/components/admin/team/CardList.vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import { useTeamStore } from "@/stores/team";
import { useLookupStore } from "@/stores/lookups";
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { debounce } from "lodash-es";
import { useI18n } from "vue-i18n";
import { Upload, Plus, SearchIcon, Users2 } from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import { UiPageHeader, UiButton, UiInput, UiChips, UiSelect, UiEmpty, UiSpinner } from "@/components/ui";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";

const teamStore = useTeamStore();
const { teams, meta, success } = storeToRefs(teamStore);

// Filter options come from the shared lookup cache, loaded alongside the
// list instead of before it.
const lookups = useLookupStore();
lookups.ensure("systemOptions", "departments").catch(() => {});

// Search, filters and page live in the URL (and are remembered), so coming
// back from a team restores the same view.
const list = useListState("teams", { search: "", status: "", department: "", page: 1, per_page: 10 });

const params = computed(() => ({
  page: list.page,
  row_per_page: list.per_page,
  search: list.search || null,
  status: list.status,
  department: list.department,
}));

// Show what the store already has for these params; refresh quietly.
const { loading, refreshing } = useStaleFetch(() => teamStore.fetchTeamsPaginated(params.value), {
  key: () => ["teams", params.value],
  hasData: () => teamStore.teamsListKey !== null,
});

// The input updates instantly; the list (and URL) follow after a pause.
const searchInput = ref(list.search);
const applySearch = debounce((v) => (list.search = v || ""), 300);
watch(searchInput, (v) => applySearch(v));
watch(() => list.search, (v) => { if (v !== (searchInput.value || "")) searchInput.value = v; });

const handlePageChange = (page) => {
  list.page = page;
};

const handlePerPageChange = (perPage) => {
  list.per_page = perPage; // resets page to 1
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
  ...lookups.systemOptionsFor("departments").map((d) => ({ value: d.value, label: d.label })),
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
    <!-- One card (toolbar, cards on a tray, pagination), same as Projects and Employees -->
    <section class="sm:bg-ui-surface sm:border sm:border-ui-line sm:rounded-ui-card">
      <!-- Toolbar -->
      <div class="flex flex-col lg:flex-row lg:items-center gap-3 sm:p-4 sm:px-5 sm:border-b sm:border-ui-line">
        <UiInput
          v-model="searchInput"
          :icon="SearchIcon"
          :placeholder="$t('teams.list.searchPlaceholder')"
          class="lg:w-80"
        />
        <UiChips v-model="list.status" :options="statusOptions" class="flex-1" />
        <UiSelect v-model="list.department" :options="departmentOptions" class="lg:w-56" />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("teams.list.refreshing") }}
        </span>
      </div>

      <div class="pt-4 sm:p-5 sm:ui-tray">
      <!-- Teams Grid -->
      <SkeletonCardGrid v-if="loading" :count="6" cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />

      <div
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 ui-stagger transition-opacity"
        :class="refreshing ? 'opacity-60' : ''"
        :aria-busy="refreshing || undefined"
        v-else-if="teams.length > 0"
      >
        <CardList v-for="team in teams" :key="team.id" :data="team" />
      </div>

      <!-- Empty State -->
      <UiEmpty v-else :icon="Users2" :title="$t('teams.list.empty')" />
      </div>

      <!-- Pagination -->
      <div class="pt-4 sm:py-3.5 sm:px-5 sm:border-t sm:border-ui-line">
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
