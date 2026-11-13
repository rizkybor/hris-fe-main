<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import {
  History,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  CalendarDays,
  Tag,
  Trash2,
  CalendarRange,
} from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { useActivityLogStore } from "@/stores/activityLog";
import { useAlertModalStore } from "@/stores/alertModal";
import { hasAnyRole } from "@/helpers/permissionHelper";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import Avatar from "@/components/common/Avatar.vue";
import { UiPageHeader, UiButton, UiInput, UiSelect, UiStat, UiBadge, UiEmpty, UiModal, UiAlert, rowNumber } from "@/components/ui";

const { t } = useI18n();
const store = useActivityLogStore();
const alertModal = useAlertModalStore();
const { activities, categories, statistics, meta, loading, loadingStatistics } =
  storeToRefs(store);

const canDeleteHistory = computed(() => hasAnyRole(["superadmin", "manager"]));
const deletingRowId = ref(null);

const searchQuery = ref("");
const categoryFilter = ref("");
const dateFrom = ref("");
const dateTo = ref("");
const perPage = ref(20);
const expandedId = ref(null);

// Category is a plain label (outline badge); the event carries the tone,
// always next to its word.
const EVENT_TONES = {
  created: "ok",
  updated: "info",
  deleted: "bad",
  login_failed: "bad",
  role_created: "ok",
  role_updated: "info",
  role_deleted: "bad",
  backup_downloaded: "warn",
};
const eventTone = (event) => EVENT_TONES[event] || "neutral";

const categoryOptions = computed(() => [
  { value: "", label: t("history.filters.allCategories") },
  ...categories.value.map((c) => ({ value: c, label: c })),
]);

const EVENT_KEYS = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  login: "login",
  login_failed: "loginFailed",
  logout: "logout",
  role_created: "roleCreated",
  role_updated: "roleUpdated",
  role_deleted: "roleDeleted",
  backup_downloaded: "backupDownloaded",
};

const eventLabel = (event) => (EVENT_KEYS[event] ? t(`history.events.${EVENT_KEYS[event]}`) : event || "-");

const fetchData = async (page = 1) => {
  await store.fetchActivities({
    page,
    row_per_page: perPage.value,
    search: searchQuery.value || undefined,
    category: categoryFilter.value || undefined,
    date_from: dateFrom.value || undefined,
    date_to: dateTo.value || undefined,
  });
};

const handlePageChange = (page) => fetchData(page);

const handleDeleteRow = async (activity) => {
  if (!(await alertModal.confirm(t("history.deleteRow.confirm"), { type: "danger", confirmText: t("common.actions.delete") }))) return;

  deletingRowId.value = activity.id;
  try {
    await store.deleteRow(activity.id);
    await fetchData(meta.value.current_page);
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || t("history.deleteRow.failed"), { type: "danger" });
  } finally {
    deletingRowId.value = null;
  }
};

// Delete-by-range modal
const showDeleteRangeModal = ref(false);
const deleteRangeStart = ref("");
const deleteRangeEnd = ref("");
const deletingRange = ref(false);

const openDeleteRangeModal = () => {
  deleteRangeStart.value = "";
  deleteRangeEnd.value = "";
  showDeleteRangeModal.value = true;
};

const closeDeleteRangeModal = () => {
  showDeleteRangeModal.value = false;
};

const handleDeleteRange = async () => {
  if (!deleteRangeStart.value || !deleteRangeEnd.value) return;

  if (
    !(await alertModal.confirm(
      t("history.deleteRange.confirm", { start: deleteRangeStart.value, end: deleteRangeEnd.value }),
      { type: "danger", confirmText: t("history.deleteRange.submit") }
    ))
  )
    return;

  deletingRange.value = true;
  try {
    const result = await store.deleteByRange(deleteRangeStart.value, deleteRangeEnd.value);
    showDeleteRangeModal.value = false;
    await store.fetchStatistics();
    await fetchData(1);
    await alertModal.alert(t("history.deleteRange.deleted", { n: result?.deleted ?? 0 }, result?.deleted ?? 0), { type: "success" });
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || t("history.deleteRange.failed"), { type: "danger" });
  } finally {
    deletingRange.value = false;
  }
};

const toggleExpand = (id) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const hasProperties = (properties) => {
  if (!properties) return false;
  const keys = Object.keys(properties);
  return keys.length > 0;
};

const formatDate = (date) =>
  new Date(date).toLocaleString(localeTag(), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

onMounted(async () => {
  await store.fetchStatistics();
  await store.fetchCategories();
  await fetchData(1);
});

const debouncedSearch = debounce(() => fetchData(1), 400);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('history.title')" :subtitle="$t('history.subtitle')">
      <template #actions>
        <UiButton v-if="canDeleteHistory" variant="danger" :icon="CalendarRange" @click="openDeleteRangeModal">
          {{ $t("history.deleteRange.title") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
      <UiStat :label="$t('history.stats.total')" :value="statistics.total" :icon="Activity" :hint="$t('history.stats.totalHint')" :loading="loadingStatistics" />
      <UiStat :label="$t('common.labels.today')" :value="statistics.today" :icon="CalendarDays" :hint="$t('history.stats.todayHint')" :loading="loadingStatistics" />
      <UiStat :label="$t('history.stats.thisWeek')" :value="statistics.this_week" :icon="Clock" :hint="$t('history.stats.thisWeekHint')" :loading="loadingStatistics" />
      <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <Tag class="w-4 h-4 text-ui-faint shrink-0" />
          <p class="text-ui-small text-ui-muted">{{ $t("history.stats.categories") }}</p>
        </div>
        <div v-if="loadingStatistics" class="space-y-1.5">
          <Skeleton width="100%" height="12px" />
          <Skeleton width="80%" height="12px" />
        </div>
        <div v-else class="space-y-1 max-h-[72px] overflow-y-auto pr-1">
          <div v-for="c in statistics.by_category" :key="c.log_name" class="flex items-center justify-between gap-2 text-ui-cap">
            <span class="text-ui-muted truncate">{{ c.log_name }}</span>
            <span class="text-ui-ink font-medium tabular-nums">{{ c.total }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters + List -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-ui-line">
        <h2 class="text-ui-h2 text-ui-ink shrink-0">{{ $t("history.list.title") }}</h2>
        <div class="grid grid-cols-2 md:flex md:items-center gap-2 lg:ml-auto">
          <UiInput
            v-model="searchQuery"
            :icon="Search"
            :placeholder="$t('history.filters.search')"
            class="col-span-2 md:w-[240px]"
            @input="debouncedSearch"
          />
          <UiSelect
            v-model="categoryFilter"
            :options="categoryOptions"
            class="col-span-2 md:w-[180px]"
            :aria-label="$t('common.labels.category')"
            @change="fetchData(1)"
          />
          <UiInput v-model="dateFrom" type="date" class="md:w-[150px]" :aria-label="$t('history.filters.dateFrom')" @change="fetchData(1)" />
          <UiInput v-model="dateTo" type="date" class="md:w-[150px]" :aria-label="$t('history.filters.dateTo')" @change="fetchData(1)" />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="p-4 sm:p-5">
        <SkeletonList :rows="6" />
      </div>

      <!-- Empty -->
      <UiEmpty v-else-if="activities.length === 0" :icon="History" :title="$t('history.list.empty')" :message="$t('common.states.noResultsHint')" />

      <!-- List -->
      <template v-else>
        <!-- Column heads (desktop) -->
        <div class="hidden md:grid hist-grid items-center gap-4 px-4 sm:px-5 h-10 border-b border-ui-line text-ui-cap font-medium text-ui-muted">
          <span>#</span>
          <span>{{ $t("history.list.activity") }}</span>
          <span>{{ $t("common.labels.category") }}</span>
          <span>{{ $t("history.list.when") }}</span>
          <span class="sr-only">{{ $t("common.labels.actions") }}</span>
        </div>

        <ul class="divide-y divide-ui-line ui-stagger">
          <li v-for="(activity, index) in activities" :key="activity.id" class="px-4 sm:px-5 py-3.5 hover:bg-ui-subtle/60 transition-colors">
            <div class="md:grid hist-grid md:items-center gap-4 flex items-start">
              <span class="hidden md:block text-ui-cap text-ui-faint tabular-nums">{{ rowNumber(index, meta) }}</span>

              <!-- Actor + description -->
              <div class="flex items-start md:items-center gap-3 min-w-0 flex-1">
                <Avatar :alt="activity.causer?.name || $t('history.list.system')" size="w-8 h-8" icon-size="w-4 h-4" class="shrink-0 mt-0.5 md:mt-0 text-ui-cap" />
                <div class="min-w-0 flex-1">
                  <p class="text-ui-small text-ui-text">
                    <span class="font-medium text-ui-ink">{{ activity.causer?.name || $t("history.list.system") }}</span>
                    {{ activity.description }}
                    <span v-if="activity.subject_type" class="text-ui-faint">
                      &middot; {{ activity.subject_type }}<template v-if="activity.subject_id"> #{{ activity.subject_id }}</template>
                    </span>
                  </p>
                  <!-- Phones: meta line under the text -->
                  <div class="md:hidden flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span class="text-ui-cap text-ui-faint tabular-nums">#{{ rowNumber(index, meta) }}</span>
                    <UiBadge tone="outline">{{ activity.category }}</UiBadge>
                    <UiBadge :tone="eventTone(activity.event)" dot>{{ eventLabel(activity.event) }}</UiBadge>
                    <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(activity.created_at) }}</span>
                  </div>
                </div>
              </div>

              <div class="hidden md:flex flex-wrap items-center gap-1.5 min-w-0">
                <UiBadge tone="outline">{{ activity.category }}</UiBadge>
                <UiBadge :tone="eventTone(activity.event)" dot>{{ eventLabel(activity.event) }}</UiBadge>
              </div>

              <span class="hidden md:block text-ui-cap text-ui-muted tabular-nums whitespace-nowrap">{{ formatDate(activity.created_at) }}</span>

              <div class="flex items-center justify-end gap-0.5 shrink-0">
                <button
                  v-if="hasProperties(activity.properties)"
                  type="button"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted transition-colors hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
                  :aria-label="expandedId === activity.id ? $t('history.list.hideDetails') : $t('history.list.showDetails')"
                  :aria-expanded="expandedId === activity.id"
                  @click="toggleExpand(activity.id)"
                >
                  <ChevronUp v-if="expandedId === activity.id" class="w-4 h-4" />
                  <ChevronDown v-else class="w-4 h-4" />
                </button>
                <button
                  v-if="canDeleteHistory"
                  type="button"
                  :title="$t('common.actions.delete')"
                  :aria-label="$t('common.actions.delete')"
                  :disabled="deletingRowId === activity.id"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted transition-colors hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus disabled:opacity-50"
                  @click="handleDeleteRow(activity)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <Transition name="ui-fade">
              <div
                v-if="expandedId === activity.id && hasProperties(activity.properties)"
                class="mt-3 md:ml-[60px] grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <div v-if="activity.properties.old" class="min-w-0">
                  <p class="text-ui-over uppercase text-ui-muted mb-1">{{ $t("history.list.before") }}</p>
                  <pre class="text-ui-cap font-mono bg-ui-bad-soft text-ui-bad border border-ui-bad/15 rounded-ui-control p-3 overflow-x-auto">{{ JSON.stringify(activity.properties.old, null, 2) }}</pre>
                </div>
                <div v-if="activity.properties.attributes" class="min-w-0">
                  <p class="text-ui-over uppercase text-ui-muted mb-1">{{ $t("history.list.after") }}</p>
                  <pre class="text-ui-cap font-mono bg-ui-ok-soft text-ui-ok border border-ui-ok/15 rounded-ui-control p-3 overflow-x-auto">{{ JSON.stringify(activity.properties.attributes, null, 2) }}</pre>
                </div>
                <div v-if="!activity.properties.old && !activity.properties.attributes" class="md:col-span-2 min-w-0">
                  <pre class="text-ui-cap font-mono bg-ui-subtle text-ui-text border border-ui-line rounded-ui-control p-3 overflow-x-auto">{{ JSON.stringify(activity.properties, null, 2) }}</pre>
                </div>
              </div>
            </Transition>
          </li>
        </ul>
      </template>

      <!-- Pagination -->
      <div
        v-if="!loading && activities.length > 0"
        class="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-ui-line"
      >
        <span class="text-ui-small text-ui-muted tabular-nums">
          {{ $t("common.pagination.page", { page: meta.current_page, last: meta.last_page }) }}
          <span class="hidden sm:inline">&middot; {{ $t("history.list.totalActivities", { n: meta.total }, meta.total) }}</span>
        </span>
        <div class="flex gap-2">
          <UiButton variant="secondary" size="sm" :disabled="meta.current_page === 1" @click="handlePageChange(meta.current_page - 1)">
            {{ $t("common.pagination.previous") }}
          </UiButton>
          <UiButton variant="secondary" size="sm" :disabled="meta.current_page === meta.last_page" @click="handlePageChange(meta.current_page + 1)">
            {{ $t("common.pagination.next") }}
          </UiButton>
        </div>
      </div>
    </section>

    <!-- Delete by Date Range Modal -->
    <UiModal v-model:open="showDeleteRangeModal" :title="$t('history.deleteRange.title')" size="sm" @close="closeDeleteRangeModal">
      <div class="space-y-4">
        <UiAlert
          tone="bad"
          :message="$t('history.deleteRange.warning')"
        />
        <UiInput v-model="deleteRangeStart" type="date" :label="$t('common.labels.startDate')" />
        <UiInput v-model="deleteRangeEnd" type="date" :label="$t('common.labels.endDate')" />
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="closeDeleteRangeModal">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton
          variant="destructive"
          :loading="deletingRange"
          :disabled="deletingRange || !deleteRangeStart || !deleteRangeEnd"
          @click="handleDeleteRange"
        >
          {{ deletingRange ? $t("common.actions.deleting") : $t("history.deleteRange.submit") }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.hist-grid {
  grid-template-columns: 28px minmax(0, 1fr) minmax(0, 220px) 180px 72px;
}
</style>
