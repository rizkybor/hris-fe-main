<script setup>
import CardList from "@/components/admin/project/list/CardList.vue";
import Statistics from "@/components/admin/project/list/Statistics.vue";
import RecapSection from "@/components/common/RecapSection.vue";
import { useProjectStore } from "@/stores/project";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import { Plus, Search, SearchX, X, FolderPlus, ChartPie, ChevronDown } from "lucide-vue-next";
import { computed, defineAsyncComponent, ref, watch } from "vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import { debounce } from "lodash-es";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { useToastStore } from "@/stores/toast";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import { UiPageHeader, UiButton, UiChips, UiEmpty } from "@/components/ui";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// The charts sit behind "Show analysis" (closed by default). They load only
// once it is opened, so a closed analysis costs no chart code or apexcharts.
const ProjectProgressChart = defineAsyncComponent(() => import("@/components/admin/project/list/ProjectProgressChart.vue"));
const BudgetChart = defineAsyncComponent(() => import("@/components/admin/project/list/BudgetChart.vue"));
const RealizedChart = defineAsyncComponent(() => import("@/components/admin/project/list/RealizedChart.vue"));
// Open/closed is remembered per user on this browser.
const recapKey = `projects-recap:${useAuthStore().user?.id ?? "anon"}`;
const ANALYSIS_KEY = "projects-recap-analysis-open";
const analysisOpen = ref(false);
try {
  analysisOpen.value = localStorage.getItem(ANALYSIS_KEY) === "1";
} catch {
  /* storage unavailable */
}
const toggleAnalysis = () => {
  analysisOpen.value = !analysisOpen.value;
  try {
    localStorage.setItem(ANALYSIS_KEY, analysisOpen.value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
};

// Same status values the old select sent.
const STATUS_OPTIONS = computed(() => [
  { value: "", label: t("common.labels.allStatuses") },
  { value: "active", label: t("projects.status.active") },
  { value: "completed", label: t("projects.status.completed") },
  { value: "on-hold", label: t("projects.status.onHold") },
  { value: "overdue", label: t("projects.health.overdue") },
]);

const projectStore = useProjectStore();
const { projects, meta } = storeToRefs(projectStore);
const { fetchProjectsPaginated, deleteProject } = projectStore;
const alertModal = useAlertModalStore();
const toast = useToastStore();

// Search, status and page live in the URL and are remembered, so coming
// back from a project restores the same view.
const list = useListState("projects", { q: "", status: "", page: 1, perPage: 10 });

const searchInput = ref(list.q);
const applySearch = debounce((value) => (list.q = value), 300);
watch(searchInput, (value) => applySearch(value));
watch(
  () => list.q,
  (value) => {
    if (value !== searchInput.value) searchInput.value = value;
  }
);

const params = computed(() => ({
  page: list.page,
  row_per_page: list.perPage,
  search: list.q || null,
  status: list.status,
}));

// The store's list is also filled by other pages (with their own params),
// so only what this page loaded counts as something to show.
const { loading, refreshing, refresh } = useStaleFetch(
  () => fetchProjectsPaginated(params.value, { source: "list" }),
  { key: () => ["project-list", params.value], hasData: () => projectStore.projectsSource === "list" }
);

const handlePageChange = (page) => {
  list.page = page;
};

const handlePerPageChange = (perPage) => {
  list.perPage = perPage;
};

const hasActiveFilters = computed(() => Boolean(list.q || list.status));
const clearFilters = () => {
  searchInput.value = "";
  list.q = "";
  list.status = "";
};

const handleDelete = async (project) => {
  const ok = await alertModal.confirm(
    t("projects.list.deleteConfirm", { name: project.name }),
    {
      type: "danger",
      confirmText: t("common.actions.delete"),
    },
  );
  if (!ok) return;

  try {
    // The store drops the card; only refetch when paging needs it.
    await deleteProject(project.id);
    projectStore.clearMessages();
    toast.success(t("projects.list.deleted", { name: project.name }));
    if (meta.value) {
      meta.value.total = Math.max(0, (meta.value.total ?? 1) - 1);
      if (meta.value.to) meta.value.to -= 1;
    }
    if (!projects.value.length && list.page > 1) list.page -= 1;
    else if (meta.value && meta.value.current_page < meta.value.last_page) refresh({ force: true });
    if (can("project-statistic")) projectStore.fetchStatistics({ force: true });
  } catch (error) {
    toast.error(t("projects.list.deleteFailed"));
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('projects.list.title')" :subtitle="$t('projects.list.subtitle')">
      <template #actions>
        <UiButton
          v-if="can('project-create')"
          :icon="Plus"
          :to="{ name: 'admin.projects.create' }"
          class="w-full sm:w-auto"
        >
          {{ $t("projects.list.add") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <RecapSection v-if="can('project-statistic')" :storage-key="recapKey" :tiles="0" class="!mb-0">
      <Statistics />
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 -ml-1 px-1 rounded-ui-control text-ui-cap font-medium text-ui-muted hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
        :aria-expanded="analysisOpen"
        aria-controls="projects-recap-analysis"
        @click="toggleAnalysis"
      >
        <ChartPie class="w-3.5 h-3.5" />
        {{ analysisOpen ? $t("projects.list.hideAnalysis") : $t("projects.list.showAnalysis") }}
        <ChevronDown class="w-3.5 h-3.5 transition-transform duration-ui-fast" :class="{ 'rotate-180': analysisOpen }" />
      </button>
      <div v-if="analysisOpen" id="projects-recap-analysis" class="ui-anim-fade grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <ProjectProgressChart />
        <BudgetChart compact />
        <RealizedChart compact />
      </div>
    </RecapSection>

    <!-- Projects: toolbar, cards and pagination straight on the page -- no
         frame around them, so the cards are the only surface. -->
    <section class="space-y-4">
      <!-- Toolbar: search, status chips, clear -->
      <div class="flex flex-col lg:flex-row lg:items-center gap-3">
        <div class="relative w-full lg:w-72 shrink-0">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
          <input
            type="text"
            class="w-full h-[38px] pl-9 pr-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow"
            :placeholder="$t('projects.list.searchPlaceholder')"
            :aria-label="$t('projects.list.searchLabel')"
            v-model="searchInput"
          />
        </div>
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <UiChips v-model="list.status" :options="STATUS_OPTIONS" class="min-w-0 flex-1" />
          <UiButton v-if="hasActiveFilters" variant="ghost" size="sm" :icon="X" class="shrink-0" @click="clearFilters">
            {{ $t("common.actions.clear") }}
          </UiButton>
        </div>
      </div>

      <div>
        <p v-if="refreshing" class="sr-only" role="status">{{ $t("projects.list.refreshing") }}</p>
        <SkeletonCardGrid
          v-if="loading"
          :count="6"
          cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        />

        <div
          v-else-if="projects.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 ui-stagger transition-opacity"
          :class="{ 'opacity-60': refreshing }"
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
            :title="$t('projects.list.emptyFilteredTitle')"
            :message="$t('projects.list.emptyFilteredMessage')"
          >
            <UiButton variant="secondary" size="sm" :icon="X" @click="clearFilters">{{ $t("common.actions.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty
            v-else
            :icon="FolderPlus"
            :title="$t('projects.list.emptyTitle')"
            :message="$t('projects.list.emptyMessage')"
          >
            <UiButton
              v-if="can('project-create')"
              size="sm"
              :icon="Plus"
              :to="{ name: 'admin.projects.create' }"
            >
              {{ $t("projects.list.add") }}
            </UiButton>
          </UiEmpty>
        </template>
      </div>

      <div class="pt-1">
        <Pagination
          :meta="meta"
          :loading="loading || refreshing"
          @page-change="handlePageChange"
          @per-page-change="handlePerPageChange"
        />
      </div>
    </section>
  </div>
</template>
