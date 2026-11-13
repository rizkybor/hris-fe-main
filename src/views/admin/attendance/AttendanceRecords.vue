<script setup>
import { computed, onMounted, ref, toRef } from "vue";
import { useListState } from "@/composables/useListState";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { Users, Search, Clock, ArrowLeft, ChevronDown, Pencil, ClipboardList } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useAttendanceStore } from "@/stores/attendance";
import { formatDateShort, formatTime as formatTimeUtil } from "@/utils/dateUtils.js";
import { capitalize } from "@/utils/formatUtils.js";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import Avatar from "@/components/common/Avatar.vue";
import AttendanceDetailModal from "@/components/admin/attendance/AttendanceDetailModal.vue";
import EditAttendanceModal from "@/components/admin/attendance/EditAttendanceModal.vue";
import { can } from "@/helpers/permissionHelper";
import { UiPageHeader, UiTable, UiBadge, UiButton, UiInput, UiChips } from "@/components/ui";

const { t, te } = useI18n();
const router = useRouter();
const store = useAttendanceStore();
const { attendances, meta, loading } = storeToRefs(store);

const list = useListState("attendance-records", { q: "", status: "", from: "", to: "", page: 1 }, { remember: false });
const search = toRef(list, "q");
const statusFilter = toRef(list, "status");
const startDate = toRef(list, "from");
const endDate = toRef(list, "to");

const load = (page = 1) => {
  list.page = page;
  store.fetchAllPaginated({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    start_date: startDate.value || undefined,
    end_date: endDate.value || undefined,
    page,
  });
};

onMounted(() => load(list.page));

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const showDetail = ref(false);
const selectedAttendance = ref(null);

const openDetail = (attendance) => {
  selectedAttendance.value = attendance;
  showDetail.value = true;
};

const closeDetail = () => {
  showDetail.value = false;
};

// Manager, Operational Director and Finance can correct a record (attendance-edit).
const canEdit = can("attendance-edit");
const showEdit = ref(false);
const editing = ref(null);
const openEdit = (attendance) => {
  editing.value = attendance;
  showEdit.value = true;
};
const onSaved = () => load(meta.value?.current_page || 1);

const formatDate = (date) => (date ? formatDateShort(date) : "N/A");
const formatTime = (time) => (time ? formatTimeUtil(time) : "-");

// Presentation only: table columns, status chips and badge tones.
const STATUS_OPTIONS = computed(() => [
  { value: "", label: t("common.labels.allStatuses") },
  ...["present", "late", "absent", "remote", "overtime", "sick_leave"].map((value) => ({ value, label: t(`attendance.status.${value}`) })),
]);
const STATUS_TONE = { present: "ok", late: "warn", absent: "bad", remote: "info", overtime: "accent", sick_leave: "bad" };
const statusTone = (status) => STATUS_TONE[status] || "neutral";
const statusLabel = (status) => (status && te(`attendance.status.${status}`) ? t(`attendance.status.${status}`) : capitalize(status) || "-");
const columns = computed(() => [
  { key: "employee", label: t("common.labels.employee") },
  { key: "team", label: t("common.labels.team") },
  { key: "date", label: t("common.labels.date") },
  { key: "check_in", label: t("attendance.records.checkIn") },
  { key: "check_out", label: t("attendance.records.checkOut") },
  { key: "total_hours", label: t("attendance.records.totalHours"), align: "right" },
  { key: "status", label: t("common.labels.status") },
  ...(canEdit ? [{ key: "action", label: t("common.labels.actions"), align: "right" }] : []),
]);

const statusBadgeClass = (status) => {
  switch (status) {
    case "present":
      return "bg-green-50 text-green-700";
    case "late":
      return "bg-amber-50 text-amber-700";
    case "absent":
      return "bg-red-50 text-red-700";
    case "remote":
      return "bg-blue-50 text-blue-700";
    case "overtime":
      return "bg-violet-50 text-violet-700";
    case "sick_leave":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('attendance.records.title')" :subtitle="$t('attendance.records.subtitle')" class="ui-anim-fade-up">
      <template #eyebrow>
        <button
          type="button"
          class="ui-press inline-flex items-center gap-1 mb-1.5 text-ui-small font-medium text-ui-accent hover:underline"
          :aria-label="$t('common.actions.back')"
          @click="router.back()"
        >
          <ArrowLeft class="w-4 h-4" />{{ $t("common.actions.back") }}
        </button>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <!-- Toolbar -->
      <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line space-y-3">
        <div class="flex flex-col md:flex-row md:items-center gap-2">
          <UiInput
            v-model="search"
            :icon="Search"
            :placeholder="$t('attendance.searchEmployee')"
            class="md:w-[280px]"
            @keyup.enter="handleSearch"
          />
          <div class="flex items-center gap-2 md:ml-auto">
            <input
              v-model="startDate"
              type="date"
              :aria-label="$t('common.labels.startDate')"
              class="flex-1 md:flex-none min-w-0 h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
              @change="handleFilterChange"
            />
            <span class="text-ui-small text-ui-muted">{{ $t("attendance.records.to") }}</span>
            <input
              v-model="endDate"
              type="date"
              :aria-label="$t('common.labels.endDate')"
              :min="startDate || undefined"
              class="flex-1 md:flex-none min-w-0 h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
              @change="handleFilterChange"
            />
          </div>
        </div>
        <UiChips v-model="statusFilter" :options="STATUS_OPTIONS" size="sm" @update:model-value="handleFilterChange" />
      </div>

      <UiTable
        :columns="columns"
        :rows="attendances"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        clickable
        @row-click="openDetail"
      >
        <template #cell-employee="{ row }">
          <div class="flex items-center gap-3">
            <Avatar :src="row.employee?.user?.profile_photo" :alt="row.employee?.user?.name" size="w-8 h-8" icon-size="w-4 h-4" />
            <span class="font-medium text-ui-ink whitespace-nowrap">{{ row.employee?.user?.name || "-" }}</span>
          </div>
        </template>
        <template #cell-team="{ row }">{{ row.employee?.job_information?.team?.name || "N/A" }}</template>
        <template #cell-date="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatDate(row.date) }}</span></template>
        <template #cell-check_in="{ row }">
          <span class="inline-flex items-center gap-1 tabular-nums text-ui-ink"><Clock class="w-3.5 h-3.5 text-ui-faint" />{{ formatTime(row.check_in) }}</span>
        </template>
        <template #cell-check_out="{ row }">
          <span class="inline-flex items-center gap-1 tabular-nums text-ui-ink"><Clock class="w-3.5 h-3.5 text-ui-faint" />{{ formatTime(row.check_out) }}</span>
        </template>
        <template #cell-total_hours="{ row }"><span class="tabular-nums">{{ row.total_hours || "-" }}</span></template>
        <template #cell-status="{ row }">
          <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiBadge>
        </template>
        <template #cell-action="{ row }">
          <UiButton
            variant="secondary"
            size="sm"
            :icon="Pencil"
            :aria-label="$t('attendance.records.editAria', { name: row.employee?.user?.name || '-' })"
            @click.stop="openEdit(row)"
          >{{ $t("common.actions.edit") }}</UiButton>
        </template>

        <!-- Phones: one card per record -->
        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="w-5 pt-2 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ number }}</span>
            <Avatar :src="row.employee?.user?.profile_photo" :alt="row.employee?.user?.name" size="w-9 h-9" icon-size="w-4 h-4" />
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-ui-h3 text-ui-ink truncate">{{ row.employee?.user?.name || "-" }}</p>
                  <p class="text-ui-cap text-ui-muted truncate">
                    {{ formatDate(row.date) }} · {{ row.employee?.job_information?.team?.name || "N/A" }}
                  </p>
                </div>
                <UiBadge :tone="statusTone(row.status)" dot class="shrink-0">{{ statusLabel(row.status) }}</UiBadge>
              </div>
              <div class="flex items-center justify-between gap-2 mt-2">
                <p v-if="!row.check_in && !row.check_out" class="text-ui-cap text-ui-faint">-</p>
                <p v-else class="text-ui-cap text-ui-muted tabular-nums">
                  <span class="text-ui-ink font-medium">{{ formatTime(row.check_in) }}</span> –
                  <span class="text-ui-ink font-medium">{{ formatTime(row.check_out) }}</span>
                  <span v-if="row.total_hours"> · {{ row.total_hours }}</span>
                </p>
                <button
                  v-if="canEdit"
                  type="button"
                  class="ui-press inline-flex items-center gap-1 text-ui-cap font-medium text-ui-accent"
                  :aria-label="$t('attendance.records.editAria', { name: row.employee?.user?.name || '-' })"
                  @click.stop="openEdit(row)"
                >
                  <Pencil class="w-3.5 h-3.5" />{{ $t("common.actions.edit") }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center py-4">
            <div class="w-10 h-10 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center mb-3">
              <ClipboardList class="w-5 h-5" />
            </div>
            <p class="text-ui-body font-medium text-ui-ink">{{ $t("attendance.records.empty") }}</p>
          </div>
        </template>
      </UiTable>

      <div class="px-4 sm:px-5 pb-4">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('attendance.records.itemLabel')" @page-change="load" />
      </div>
    </section>

    <AttendanceDetailModal :show="showDetail" :attendance="selectedAttendance" @close="closeDetail" />
    <EditAttendanceModal :show="showEdit" :attendance="editing" @close="showEdit = false" @saved="onSaved" />
  </div>
</template>
