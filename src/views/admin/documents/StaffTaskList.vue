<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { ListChecksIcon, Plus, Pencil, Trash2, Users, User, Search, AlertTriangle, SearchX, CalendarRange, ListChecks, CheckCircle2, Filter, Loader2, X } from "lucide-vue-next";
import { useStaffTaskStore } from "@/stores/staffTask";
import { useAuthStore } from "@/stores/auth";
import { useLookupStore } from "@/stores/lookups";
import { useToastStore } from "@/stores/toast";
import { can } from "@/helpers/permissionHelper";
import { UiAlert, UiBadge, UiButton, UiDrawer, UiEmpty, UiInput, UiModal, UiPageHeader, UiPagination, UiSelect, UiStat, UiStatusSelect, UiTable } from "@/components/ui";
import Avatar from "@/components/common/Avatar.vue";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import StaffTaskComments from "@/components/admin/documents/StaffTaskComments.vue";
import { useAlertModalStore } from "@/stores/alertModal";
import StaffTasksRecap from "@/components/admin/documents/StaffTasksRecap.vue";
import { useListState } from "@/composables/useListState";
import { useStaleFetch, invalidate } from "@/composables/useStaleFetch";
import { optimistic } from "@/utils/optimistic";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const store = useStaffTaskStore();
const lookups = useLookupStore();
const toast = useToastStore();
const alertModal = useAlertModalStore();
const { staffTasks, meta, summary, summaryFailed, detailLoading } = storeToRefs(store);

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

// ----- List state: search, summary filter, page, page size -----
// Kept in the URL + remembered per browser. `filter` is the API's bucket
// (same rules as the summary tiles), so a tile's count is the list total.
const PER_PAGE = [10, 25, 50, 100];
const FILTERS = ["overdue", "due_this_week", "open", "done"];
const list = useListState("staff-tasks", { q: "", filter: "", page: 1, per: 10 });
const activeFilter = computed(() => (FILTERS.includes(list.filter) ? list.filter : ""));
const perPage = computed({
  get: () => (PER_PAGE.includes(Number(list.per)) ? Number(list.per) : 10),
  set: (v) => (list.per = Number(v)),
});
const perPageOptions = computed(() => PER_PAGE.map((n) => ({ value: n, label: `${n} ${t("common.pagination.perPage")}` })));

// Search box: typing updates the list 300ms after the last key.
const searchInput = ref(list.q);
let searchTimer = null;
watch(searchInput, (v) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => (list.q = (v || "").trim()), 300);
});
watch(
  () => list.q,
  (v) => {
    if (v !== (searchInput.value || "").trim()) searchInput.value = v;
  }
);

const params = computed(() => ({ search: list.q || undefined, filter: activeFilter.value || undefined, page: list.page, row_per_page: perPage.value }));
const paramsKey = computed(() => JSON.stringify(params.value));

// Returning to the page shows the rows the store already has for these
// params at once; newer data loads quietly behind them.
const { loading: listLoading, refreshing: listRefreshing, refresh: refreshList } = useStaleFetch(() => store.fetchStaffTasks(params.value), {
  key: () => ["staff-tasks:list", params.value],
  hasData: () => store.listKey === paramsKey.value,
  maxAge: 30_000,
});
// Skeleton only when there is nothing at all to show; otherwise keep the
// previous rows (dimmed) while the next page/search loads.
const tableLoading = computed(() => listLoading.value && staffTasks.value.length === 0);
const tableBusy = computed(() => (listLoading.value || listRefreshing.value) && staffTasks.value.length > 0);

const {
  loading: summaryLoading,
  refreshing: summaryRefreshing,
  refresh: refreshSummary,
} = useStaleFetch(() => store.fetchSummary(), { key: () => "staff-tasks:summary", hasData: () => !!store.summary, maxAge: 60_000 });
const retrySummary = () => refreshSummary({ force: true });
// After a change the recap counters follow quietly (no skeleton).
const quietRefreshSummary = () => refreshSummary({ force: true }).catch(() => {});
// With a filter on, an edit can move a task out of (or into) the bucket,
// which only the server can tell: refresh the page quietly (rows stay).
const quietRefreshFiltered = () => activeFilter.value && refreshList({ force: true }).catch(() => {});

// A stale page number (e.g. after deleting the last row of the last page).
watch(meta, (m) => {
  const last = Number(m?.last_page) || 1;
  if (list.page > last) list.page = last;
});

// ----- Status helpers -----
// Same tones as My Tasks (the assignee side): to do = neutral, working = warn, done = ok.
const STATUS_LABELS = computed(() => ({
  todo: { label: t("staffTasks.status.todo"), tone: "neutral" },
  in_progress: { label: t("staffTasks.status.inProgress"), tone: "warn" },
  done: { label: t("staffTasks.status.done"), tone: "ok" },
}));
const STATUS_OPTIONS = computed(() => Object.entries(STATUS_LABELS.value).map(([value, s]) => ({ value, ...s })));

const ymd = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const todayYmd = () => ymd(new Date());
// Weeks run Monday–Sunday, like the recap's "due this week".
const endOfWeekYmd = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return ymd(d);
};
const isDone = (task) => !!task?.progress && task.progress.total > 0 && task.progress.done === task.progress.total;
const isOverdue = (task) => !!task?.due_date && !isDone(task) && String(task.due_date).slice(0, 10) < todayYmd();
const isDueThisWeek = (task) => {
  if (!task?.due_date || isDone(task)) return false;
  const due = String(task.due_date).slice(0, 10);
  return due >= todayYmd() && due <= endOfWeekYmd();
};
// Client-side twin of the API filter, only to decide whether a task created
// here belongs on the filtered list shown.
const MATCHES = { overdue: isOverdue, due_this_week: isDueThisWeek, open: (task) => !isDone(task), done: isDone };

// ----- Summary strip: "what needs attention" -----
const tiles = computed(() => {
  const d = summary.value;
  const assignments = d ? (d.assignments?.todo ?? 0) + (d.assignments?.in_progress ?? 0) + (d.assignments?.done ?? 0) : 0;
  const pct = assignments ? Math.round(((d.assignments?.done ?? 0) / assignments) * 100) : 0;
  return [
    { key: "overdue", label: t("staffTasks.overdue"), value: d?.overdue ?? 0, tone: d?.overdue ? "bad" : "", hint: t("staffTasks.recap.overdueSub"), icon: AlertTriangle },
    { key: "due_this_week", label: t("staffTasks.recap.dueThisWeek"), value: d?.due_this_week ?? 0, tone: d?.due_this_week ? "warn" : "", hint: t("staffTasks.recap.stillOpen"), icon: CalendarRange },
    { key: "open", label: t("staffTasks.recap.open"), value: d?.open ?? 0, hint: t("staffTasks.recap.ofTotal", { n: d?.total ?? 0 }, d?.total ?? 0), icon: ListChecks },
    { key: "done", label: t("staffTasks.summary.doneTasks"), value: d?.done ?? 0, tone: d?.done ? "ok" : "", hint: t("staffTasks.summary.doneHint", { pct }), icon: CheckCircle2 },
  ];
});
const filterLabel = computed(() => tiles.value.find((x) => x.key === activeFilter.value)?.label ?? "");
// Second click on the active tile clears it (page goes back to 1 either way).
const toggleFilter = (key) => (list.filter = activeFilter.value === key ? "" : key);

const rows = staffTasks;

// Presentation only: table columns (UiTable adds the "#" column).
const COLUMNS = computed(() => [
  { key: "title", label: t("staffTasks.cols.task") },
  { key: "assignment_mode", label: t("staffTasks.cols.assignedTo"), width: 150 },
  { key: "due_date", label: t("staffTasks.cols.due"), width: 190 },
  { key: "progress", label: t("staffTasks.cols.progress"), width: 190 },
  { key: "actions", label: "", align: "right", width: 96 },
]);
const progressPct = (task) => (task.progress?.total ? (task.progress.done / task.progress.total) * 100 : 0);

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" });
};

// ----- Create / edit -----
const showFormModal = ref(false);
const editingId = ref(null);
const form = ref({ title: "", description: "", due_date: "", assignment_mode: "all_staff", assignee_employee_ids: [] });
const submitting = ref(false);
const errorMessage = ref("");
const staffOptions = computed(() => lookups.staffOptions);
const staffLoading = ref(false);

// Staff list from the shared lookup cache, loaded when the form opens (the
// modal doesn't wait for it).
const ensureStaffOptions = async () => {
  if (staffOptions.value.length === 0) staffLoading.value = true;
  try {
    await lookups.ensure("staffOptions");
  } catch {
    /* picker shows "no staff"; saving "all staff" still works */
  } finally {
    staffLoading.value = false;
  }
};

const openCreateModal = () => {
  editingId.value = null;
  form.value = { title: "", description: "", due_date: "", assignment_mode: "all_staff", assignee_employee_ids: [] };
  errorMessage.value = "";
  showFormModal.value = true;
  ensureStaffOptions();
};

const openEditModal = (task) => {
  editingId.value = task.id;
  form.value = {
    title: task.title,
    description: task.description ?? "",
    due_date: task.due_date ?? "",
    assignment_mode: task.assignment_mode,
    assignee_employee_ids: (task.assignees || []).map((a) => a.employee_id),
  };
  errorMessage.value = "";
  showFormModal.value = true;
  ensureStaffOptions();
};

const closeFormModal = () => {
  showFormModal.value = false;
};

const matchesList = (task) =>
  (!list.q || (task.title || "").toLowerCase().includes(list.q.toLowerCase())) && (!activeFilter.value || MATCHES[activeFilter.value](task));

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    if (editingId.value) {
      // The store puts the returned task back into the list and the drawer.
      await store.updateStaffTask(editingId.value, form.value);
      toast.success(t("staffTasks.toast.updated"));
      quietRefreshFiltered();
    } else {
      const created = await store.createStaffTask(form.value);
      // New tasks sort first (newest created): show it on top of page 1.
      if (list.page === 1 && matchesList(created)) {
        store.upsertStaffTask(created, { prepend: true });
        toast.success(t("staffTasks.toast.created"));
      } else {
        toast.success(t("staffTasks.toast.created"), t("staffTasks.toast.createdElsewhere"));
      }
    }
    showFormModal.value = false;
    // Other pages/searches are now out of date; this one was patched.
    invalidate("staff-tasks:list");
    quietRefreshSummary();
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t("staffTasks.saveFailed"));
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (task) => {
  if (!(await alertModal.confirm(t("staffTasks.deleteConfirm")))) return;
  try {
    await store.deleteStaffTask(task.id);
    if (detailId.value === task.id) closeDetail();
    toast.success(t("staffTasks.toast.deleted"));
    invalidate("staff-tasks:list");
    // The page emptied: step back one page (that one loads).
    if (staffTasks.value.length === 0 && list.page > 1) list.page -= 1;
    quietRefreshSummary();
  } catch (error) {
    toast.error(t("staffTasks.deleteFailed"), error?.response?.data?.message || "");
  }
};

// ----- Detail drawer -----
// Opens at once with the row's data; the full record loads behind it.
// ?task=<id> in the URL (deep link, reload, back button); ?comment=<id>
// highlights a comment in the thread.
const detailId = ref(null);
const drawerOpen = ref(false);
const detail = computed(() => {
  if (!detailId.value) return null;
  return staffTasks.value.find((x) => x.id === detailId.value) || (store.currentStaffTask?.id === detailId.value ? store.currentStaffTask : null);
});
const detailIndex = computed(() => rows.value.findIndex((x) => x.id === detailId.value));
const hasPrev = computed(() => detailIndex.value > 0);
const hasNext = computed(() => detailIndex.value !== -1 && detailIndex.value < rows.value.length - 1);

const fullFetchedAt = new Map(); // id -> timestamp of the last GET /staff-tasks/{id}
const loadDetail = async (id) => {
  if (Date.now() - (fullFetchedAt.get(id) ?? 0) < 30_000) return;
  try {
    const full = await store.fetchStaffTask(id);
    fullFetchedAt.set(id, Date.now());
    if (full) store.upsertStaffTask(full);
  } catch (error) {
    if (detailId.value !== id) return;
    if (error?.response?.status === 404) {
      toast.error(t("staffTasks.toast.notFound"));
      closeDetail();
    } else if (!detail.value) {
      toast.error(t("staffTasks.toast.loadFailed"));
      closeDetail();
    }
  }
};

const setTaskQuery = (id) => {
  const query = { ...route.query };
  if (id) query.task = String(id);
  else {
    delete query.task;
    delete query.comment;
  }
  if (String(query.task ?? "") !== String(route.query.task ?? "") || query.comment !== route.query.comment) router.replace({ query }).catch(() => {});
};

const showDetail = (id) => {
  detailId.value = id;
  drawerOpen.value = true;
  setTaskQuery(id);
  loadDetail(id);
};
const openDetail = (task) => showDetail(task.id);
const closeDetail = () => {
  drawerOpen.value = false;
  detailId.value = null;
  setTaskQuery(null);
};
watch(drawerOpen, (open) => {
  if (!open && detailId.value) closeDetail();
});
const goPrev = () => hasPrev.value && showDetail(rows.value[detailIndex.value - 1].id);
const goNext = () => hasNext.value && showDetail(rows.value[detailIndex.value + 1].id);

// Back/forward and deep links: follow ?task in the URL.
watch(
  () => route.query.task,
  (raw) => {
    const id = raw ? Number(raw) : null;
    if (id && id !== detailId.value) showDetail(id);
    else if (!id && drawerOpen.value) {
      drawerOpen.value = false;
      detailId.value = null;
    }
  }
);

// The comment composer needs {id, name} for its @mention list -- assignees
// plus the task's creator (if not already one), matching Meeting Note's
// "attendees + creator" mention-eligibility pattern on the backend.
const commentAssignees = computed(() => {
  if (!detail.value) return [];
  const result = (detail.value.assignees || []).map((a) => ({ id: a.employee_id, name: a.name }));
  const creatorEmployeeId = detail.value.creator?.employee_profile?.id;
  if (creatorEmployeeId && !result.some((a) => a.id === creatorEmployeeId)) {
    result.push({ id: creatorEmployeeId, name: detail.value.creator?.name });
  }
  return result;
});

const myEmployeeId = computed(() => user.value?.employee_profile?.id ?? null);
const canCommentOnDetail = computed(() => {
  if (!detail.value) return false;
  const isAssignee = (detail.value.assignees || []).some((a) => a.employee_id === myEmployeeId.value);
  const isCreator = detail.value.creator?.id === user.value?.id;
  const roles = user.value?.roles || [];
  const isAllowedRole = ["superadmin", "manager", "finance", "operational_director"].some((r) => roles.includes(r));
  return isAssignee || isCreator || isAllowedRole;
});

// Only your own assignment can change (PATCH /staff-tasks/{id}/status is
// identity-gated on the backend, same as My Tasks).
const isMine = (assignee) => !!myEmployeeId.value && assignee.employee_id === myEmployeeId.value;
const changeMyStatus = async (task, assignee, status) => {
  const before = assignee.status;
  const { ok } = await optimistic({
    apply: () => {
      store.patchAssignee(task.id, { id: assignee.id, status });
      return () => store.patchAssignee(task.id, { id: assignee.id, status: before });
    },
    request: () => store.updateMyStatus(task.id, status),
    success: t("staffTasks.toast.statusUpdated"),
  });
  if (ok) {
    quietRefreshSummary();
    quietRefreshFiltered();
  }
};

// ----- Keyboard: "/" focuses the search -----
const onKey = (e) => {
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
  const el = e.target;
  if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
  if (drawerOpen.value || showFormModal.value) return;
  const input = document.getElementById("staff-task-search");
  if (input) {
    e.preventDefault();
    input.focus();
  }
};

onMounted(() => {
  document.addEventListener("keydown", onKey);
  if (route.query.task) showDetail(Number(route.query.task));
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  clearTimeout(searchTimer);
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('staffTasks.title')" :subtitle="$t('staffTasks.subtitle')">
      <template #actions>
        <UiButton v-if="can('staff-task-create')" :icon="Plus" class="w-full sm:w-auto" @click="openCreateModal">{{ $t("staffTasks.add") }}</UiButton>
      </template>
    </UiPageHeader>

    <!-- What needs attention (all tasks); a click filters the rows below -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" :class="{ 'opacity-80': summaryRefreshing }">
      <UiStat
        v-for="tile in tiles"
        :key="tile.key"
        :label="tile.label"
        :value="tile.value"
        :hint="tile.hint"
        :tone="tile.tone"
        :icon="tile.icon"
        :loading="summaryLoading && !summary"
        selectable
        :active="activeFilter === tile.key"
        @select="toggleFilter(tile.key)"
      />
    </div>

    <div class="bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden">
      <div class="p-3 sm:p-4 border-b border-ui-line flex flex-col sm:flex-row sm:items-center gap-2.5">
        <UiInput id="staff-task-search" v-model="searchInput" :icon="Search" :placeholder="$t('staffTasks.searchPlaceholder')" class="sm:max-w-sm flex-1" />
        <div class="flex items-center gap-2 sm:ml-auto">
          <button
            v-if="activeFilter"
            type="button"
            class="inline-flex items-center gap-1.5 h-[38px] px-3 rounded-ui-control border border-ui-accent bg-ui-accent-soft text-ui-small font-medium text-ui-ink hover:brightness-95"
            :aria-label="$t('staffTasks.clearFilter', { label: filterLabel })"
            @click="list.filter = ''"
          >
            <Filter class="w-3.5 h-3.5" />{{ filterLabel }}<X class="w-3.5 h-3.5 text-ui-muted" />
          </button>
          <span v-if="tableBusy" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted" role="status">
            <Loader2 class="w-3.5 h-3.5 animate-spin" />{{ $t("staffTasks.updating") }}
          </span>
          <UiSelect v-model="perPage" :options="perPageOptions" class="w-36" :aria-label="$t('common.pagination.rowsPerPage')" />
        </div>
      </div>

      <div :class="['transition-opacity', tableBusy ? 'opacity-60' : '']">
        <UiTable :columns="COLUMNS" :rows="rows" :meta="meta" :loading="tableLoading" :skeleton-rows="4" clickable @row-click="openDetail">
          <template #cell-title="{ row }">
            <div class="min-w-0 max-w-[420px]">
              <p class="text-ui-small font-medium text-ui-ink truncate">{{ row.title }}</p>
              <p v-if="row.creator" class="text-ui-cap text-ui-muted truncate">{{ $t("staffTasks.by", { name: row.creator.name }) }}</p>
            </div>
          </template>
          <template #cell-assignment_mode="{ row }">
            <UiBadge :tone="row.assignment_mode === 'all_staff' ? 'neutral' : 'outline'">
              <Users v-if="row.assignment_mode === 'all_staff'" class="w-3 h-3" />
              <User v-else class="w-3 h-3" />
              {{ row.assignment_mode === "all_staff" ? $t("staffTasks.allStaff") : $t("staffTasks.selectedCount", { n: row.assignees?.length || 0 }) }}
            </UiBadge>
          </template>
          <template #cell-due_date="{ row }">
            <div class="flex items-center gap-2 whitespace-nowrap">
              <span class="tabular-nums" :class="isOverdue(row) ? 'text-ui-bad font-medium' : 'text-ui-text'">{{ formatDate(row.due_date) }}</span>
              <UiBadge v-if="isOverdue(row)" tone="bad"><AlertTriangle class="w-3 h-3" />{{ $t("staffTasks.overdue") }}</UiBadge>
            </div>
          </template>
          <template #cell-progress="{ row }">
            <div v-if="row.progress" class="flex items-center gap-2.5">
              <div class="flex-1 max-w-[110px] h-1.5 bg-ui-subtle rounded-full overflow-hidden">
                <div class="h-full bg-ui-ok rounded-full transition-all" :style="{ width: `${progressPct(row)}%` }"></div>
              </div>
              <span class="text-ui-cap text-ui-muted tabular-nums whitespace-nowrap">{{ $t("staffTasks.progressDone", { done: row.progress.done, total: row.progress.total }) }}</span>
            </div>
            <span v-else class="text-ui-faint">—</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="inline-flex items-center gap-1" @click.stop>
              <button
                v-if="can('staff-task-edit')"
                type="button"
                class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
                :aria-label="$t('staffTasks.editLabel', { title: row.title })"
                :title="$t('common.actions.edit')"
                @click="openEditModal(row)"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                v-if="can('staff-task-delete')"
                type="button"
                class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus"
                :aria-label="$t('staffTasks.deleteLabel', { title: row.title })"
                :title="$t('common.actions.delete')"
                @click="handleDelete(row)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </template>

          <!-- Phones: one card per task -->
          <template #mobile="{ row, number }">
            <div class="px-4 py-3.5 flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 shrink-0 pt-0.5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink break-words">{{ row.title }}</p>
                <p class="text-ui-cap text-ui-muted mt-0.5">
                  {{ $t("staffTasks.due") }} <span class="tabular-nums" :class="isOverdue(row) ? 'text-ui-bad font-medium' : ''">{{ formatDate(row.due_date) }}</span><span v-if="row.creator"> • {{ $t("staffTasks.by", { name: row.creator.name }) }}</span>
                </p>
                <div class="flex items-center gap-1.5 flex-wrap mt-2">
                  <UiBadge :tone="row.assignment_mode === 'all_staff' ? 'neutral' : 'outline'">
                    <Users v-if="row.assignment_mode === 'all_staff'" class="w-3 h-3" />
                    <User v-else class="w-3 h-3" />
                    {{ row.assignment_mode === "all_staff" ? $t("staffTasks.allStaff") : $t("staffTasks.selectedCount", { n: row.assignees?.length || 0 }) }}
                  </UiBadge>
                  <UiBadge v-if="isOverdue(row)" tone="bad"><AlertTriangle class="w-3 h-3" />{{ $t("staffTasks.overdue") }}</UiBadge>
                </div>
                <div v-if="row.progress" class="flex items-center gap-2.5 mt-2.5">
                  <div class="flex-1 h-1.5 bg-ui-subtle rounded-full overflow-hidden">
                    <div class="h-full bg-ui-ok rounded-full transition-all" :style="{ width: `${progressPct(row)}%` }"></div>
                  </div>
                  <span class="text-ui-cap text-ui-muted tabular-nums whitespace-nowrap">{{ $t("staffTasks.progressDone", { done: row.progress.done, total: row.progress.total }) }}</span>
                </div>
              </div>
              <div class="flex flex-col items-center gap-1 shrink-0 -mr-1.5 -mt-1" @click.stop>
                <button
                  v-if="can('staff-task-edit')"
                  type="button"
                  class="w-10 h-10 inline-flex items-center justify-center rounded-ui-control text-ui-muted active:bg-ui-hover"
                  :aria-label="$t('staffTasks.editLabel', { title: row.title })"
                  @click="openEditModal(row)"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <button
                  v-if="can('staff-task-delete')"
                  type="button"
                  class="w-10 h-10 inline-flex items-center justify-center rounded-ui-control text-ui-muted active:bg-ui-bad-soft active:text-ui-bad"
                  :aria-label="$t('staffTasks.deleteLabel', { title: row.title })"
                  @click="handleDelete(row)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </template>

          <template #empty>
            <UiEmpty v-if="activeFilter" :icon="Filter" :title="$t('staffTasks.emptyFilterTitle', { label: filterLabel })" :message="$t('staffTasks.emptyFilterMessage')" compact>
              <UiButton variant="secondary" size="sm" @click="list.filter = ''">{{ $t("common.actions.clearFilters") }}</UiButton>
            </UiEmpty>
            <UiEmpty v-else-if="list.q" :icon="SearchX" :title="$t('staffTasks.emptySearchTitle')" :message="$t('staffTasks.emptySearchMessage')" compact />
            <UiEmpty v-else :icon="ListChecksIcon" :title="$t('staffTasks.emptyTitle')" compact>
              <UiButton v-if="can('staff-task-create')" variant="secondary" size="sm" :icon="Plus" @click="openCreateModal">{{ $t("staffTasks.add") }}</UiButton>
            </UiEmpty>
          </template>
        </UiTable>
      </div>

      <UiPagination v-if="(Number(meta?.total) || 0) > 0" :meta="meta" :item-label="$t('staffTasks.itemLabel')" :disabled="listLoading" @change="(p) => (list.page = p)" />
    </div>

    <StaffTasksRecap :data="summary" :loading="summaryLoading && !summary" :failed="summaryFailed && !summary" @retry="retrySummary" />

    <!-- Create/Edit Modal -->
    <UiModal :open="showFormModal" size="lg" :z-index="110" :title="editingId ? $t('staffTasks.edit') : $t('staffTasks.add')" @close="closeFormModal">
      <form id="staff-task-form" class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4" @submit.prevent="handleSubmit">
        <UiInput v-model="form.title" :label="$t('staffTasks.form.title')" required :placeholder="$t('staffTasks.form.titlePlaceholder')" />
        <UiInput v-model="form.due_date" :label="$t('staffTasks.form.dueDate')" type="date" required />

        <div class="sm:col-span-2 min-w-0">
          <label class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("common.labels.description") }}</label>
          <RichTextEditor v-model="form.description" :placeholder="$t('staffTasks.form.descriptionPlaceholder')" />
        </div>

        <fieldset class="sm:col-span-2 min-w-0">
          <legend class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("staffTasks.form.assignTo") }}<span class="text-ui-bad"> *</span></legend>
          <div class="grid grid-cols-2 gap-2.5">
            <label
              class="flex items-center gap-2.5 h-11 px-3 border rounded-ui-control text-ui-small cursor-pointer transition-colors"
              :class="form.assignment_mode === 'all_staff' ? 'border-ui-accent bg-ui-accent-soft text-ui-ink' : 'border-ui-line-strong text-ui-text hover:bg-ui-hover'"
            >
              <input type="radio" v-model="form.assignment_mode" value="all_staff" class="accent-ui-accent" />
              <Users class="w-4 h-4 text-ui-muted" />
              {{ $t("staffTasks.allStaff") }}
            </label>
            <label
              class="flex items-center gap-2.5 h-11 px-3 border rounded-ui-control text-ui-small cursor-pointer transition-colors"
              :class="form.assignment_mode === 'selected' ? 'border-ui-accent bg-ui-accent-soft text-ui-ink' : 'border-ui-line-strong text-ui-text hover:bg-ui-hover'"
            >
              <input type="radio" v-model="form.assignment_mode" value="selected" class="accent-ui-accent" />
              <User class="w-4 h-4 text-ui-muted" />
              {{ $t("staffTasks.form.selectStaff") }}
            </label>
          </div>

          <div v-if="form.assignment_mode === 'selected'" class="mt-2.5 border border-ui-line rounded-ui-control max-h-56 overflow-y-auto p-1.5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
              <label
                v-for="opt in staffOptions"
                :key="opt.id"
                class="flex items-center gap-2.5 px-2.5 h-10 rounded-md hover:bg-ui-hover cursor-pointer text-ui-small text-ui-text min-w-0"
              >
                <input type="checkbox" :value="opt.id" v-model="form.assignee_employee_ids" class="accent-ui-accent shrink-0" />
                <span class="truncate">{{ opt.name }}</span>
              </label>
            </div>
            <p v-if="staffLoading" class="text-ui-cap text-ui-muted text-center py-3 inline-flex items-center justify-center gap-1.5 w-full">
              <Loader2 class="w-3.5 h-3.5 animate-spin" />{{ $t("staffTasks.form.loadingStaff") }}
            </p>
            <p v-else-if="staffOptions.length === 0" class="text-ui-cap text-ui-muted text-center py-3">{{ $t("staffTasks.form.noStaff") }}</p>
          </div>
        </fieldset>

        <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" class="sm:col-span-2" />
      </form>

      <template #footer>
        <UiButton variant="ghost" @click="closeFormModal">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="staff-task-form" :loading="submitting">{{ submitting ? $t("common.actions.saving") : $t("common.actions.save") }}</UiButton>
      </template>
    </UiModal>

    <!-- Detail drawer (prev/next through the rows shown) -->
    <UiDrawer v-model:open="drawerOpen" size="lg" :title="detail?.title || ''" :has-prev="hasPrev" :has-next="hasNext" @prev="goPrev" @next="goNext">
      <template #header>
        <template v-if="detail">
          <h2 class="text-ui-h2 text-ui-ink break-words">{{ detail.title }}</h2>
          <p class="text-ui-small text-ui-muted mt-0.5">
            {{ $t("staffTasks.due") }} <span class="tabular-nums" :class="isOverdue(detail) ? 'text-ui-bad font-medium' : ''">{{ formatDate(detail.due_date) }}</span>
            <span v-if="detail.creator"> • {{ $t("staffTasks.by", { name: detail.creator.name }) }}</span>
          </p>
          <div class="flex items-center gap-1.5 flex-wrap mt-2">
            <UiBadge :tone="detail.assignment_mode === 'all_staff' ? 'neutral' : 'outline'">
              <Users v-if="detail.assignment_mode === 'all_staff'" class="w-3 h-3" />
              <User v-else class="w-3 h-3" />
              {{ detail.assignment_mode === "all_staff" ? $t("staffTasks.allStaff") : $t("staffTasks.selectedCount", { n: detail.assignees?.length || 0 }) }}
            </UiBadge>
            <UiBadge v-if="isOverdue(detail)" tone="bad"><AlertTriangle class="w-3 h-3" />{{ $t("staffTasks.overdue") }}</UiBadge>
            <span v-if="detailLoading" class="inline-flex items-center gap-1 text-ui-cap text-ui-muted" role="status">
              <Loader2 class="w-3 h-3 animate-spin" />{{ $t("staffTasks.updating") }}
            </span>
          </div>
        </template>
        <template v-else>
          <div class="h-6 w-2/3 rounded bg-ui-subtle animate-pulse"></div>
          <div class="h-4 w-1/3 rounded bg-ui-subtle animate-pulse mt-2"></div>
        </template>
      </template>

      <div v-if="detail" class="space-y-5">
        <div v-if="detail.description" class="rich-text-content text-ui-body text-ui-text" v-html="detail.description"></div>

        <section>
          <div class="flex items-baseline justify-between gap-2 mb-2">
            <h3 class="text-ui-h3 text-ui-ink">{{ $t("staffTasks.assigneeProgress") }}</h3>
            <span v-if="detail.progress" class="text-ui-cap text-ui-muted tabular-nums">{{ $t("staffTasks.progressDone", { done: detail.progress.done, total: detail.progress.total }) }}</span>
          </div>
          <ul class="border border-ui-line rounded-ui-card divide-y divide-ui-line">
            <li v-for="assignee in detail.assignees" :key="assignee.id" class="flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px]">
              <div class="flex items-center gap-2.5 min-w-0">
                <Avatar :alt="assignee.name" size="w-7 h-7" icon-size="w-3.5 h-3.5" />
                <p class="text-ui-small text-ui-ink truncate">
                  {{ assignee.name }}<span v-if="isMine(assignee)" class="text-ui-muted ml-1">{{ $t("staffTasks.you") }}</span>
                </p>
              </div>
              <UiStatusSelect
                v-if="isMine(assignee)"
                :model-value="assignee.status"
                :options="STATUS_OPTIONS"
                :label="$t('staffTasks.myStatus')"
                @change="(v) => changeMyStatus(detail, assignee, v)"
              />
              <UiBadge v-else :tone="STATUS_LABELS[assignee.status]?.tone ?? 'neutral'" dot>
                {{ STATUS_LABELS[assignee.status]?.label ?? assignee.status }}
              </UiBadge>
            </li>
            <li v-if="!detail.assignees?.length" class="px-3.5 py-3 text-ui-small text-ui-muted">{{ $t("staffTasks.recap.noAssignments") }}</li>
          </ul>
        </section>

        <StaffTaskComments :staff-task-id="detail.id" :assignees="commentAssignees" :can-comment="canCommentOnDetail" />
      </div>
      <div v-else class="space-y-3">
        <div class="h-4 w-full rounded bg-ui-subtle animate-pulse"></div>
        <div class="h-4 w-5/6 rounded bg-ui-subtle animate-pulse"></div>
        <div class="h-24 w-full rounded bg-ui-subtle animate-pulse"></div>
      </div>

      <template v-if="detail && (can('staff-task-edit') || can('staff-task-delete'))" #footer>
        <UiButton v-if="can('staff-task-delete')" variant="ghost" :icon="Trash2" class="mr-auto text-ui-bad" @click="handleDelete(detail)">{{ $t("common.actions.delete") }}</UiButton>
        <UiButton v-if="can('staff-task-edit')" variant="secondary" :icon="Pencil" @click="openEditModal(detail)">{{ $t("common.actions.edit") }}</UiButton>
      </template>
    </UiDrawer>
  </div>
</template>

<style scoped>
/* Base .rich-text-content lives in src/assets/css/input.css -- these add
   the same supplementary tag styling MyTasks.vue uses. */
.rich-text-content :deep(p) { margin-bottom: 0.75rem; }
.rich-text-content :deep(ul) { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(ol) { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(h1) { font-size: 22px; line-height: 30px; font-weight: 600; margin: 0.5rem 0; }
.rich-text-content :deep(h2) { font-size: 17px; line-height: 26px; font-weight: 600; margin: 0.5rem 0; }
.rich-text-content :deep(h3) { font-size: 14px; line-height: 20px; font-weight: 600; margin: 0.5rem 0; }
.rich-text-content :deep(blockquote) { border-left: 3px solid rgb(var(--ui-line-strong)); padding-left: 0.75rem; color: rgb(var(--ui-muted)); margin: 0.5rem 0; }
.rich-text-content :deep(a) { color: rgb(var(--ui-accent)); text-decoration: underline; }
.rich-text-content :deep(hr) { border: none; border-top: 1px solid rgb(var(--ui-line)); margin: 0.75rem 0; }
</style>
