<script setup>
import { computed, onMounted, ref, toRef } from "vue";
import { useListState } from "@/composables/useListState";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { CalendarClock, Search, Check, X, ArrowLeft, ChevronDown, Paperclip } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useLeaveRequestStore } from "@/stores/leaveRequest";
import {
  getLeaveTypeBadgeClass,
  getLeaveRequestStatusBadgeClass,
} from "@/utils/styleHelpers.js";
import { formatDateShort } from "@/utils/dateUtils.js";
import { capitalize } from "@/utils/formatUtils.js";
import { can } from "@/helpers/permissionHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Avatar from "@/components/common/Avatar.vue";
import Pagination from "@/components/common/Pagination.vue";
import { UiPageHeader, UiTable, UiBadge, UiButton, UiInput, UiChips, UiConfirmDialog } from "@/components/ui";

const router = useRouter();
const store = useLeaveRequestStore();
const { leaveRequests, meta, loading } = storeToRefs(store);

// Status/search/page in the URL (?status=pending) and remembered per
// browser, so links can open a filtered list and returning keeps the view.
const list = useListState("leave-requests", { q: "", status: "", page: 1 });
const search = toRef(list, "q");
const statusFilter = toRef(list, "status");
const showApproveModalState = ref(false);
const showRejectModalState = ref(false);
const selectedLeaveRequest = ref(null);
const processingAction = ref(false);

const load = (page = 1) => {
  list.page = page;
  store.fetchAllPaginated({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    page,
  });
};

onMounted(() => load(list.page));

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

// Presentation only: table columns, status chips and badge tones.
const { t, te } = useI18n();
// Display labels for API values (the values themselves stay unchanged).
const leaveTypeLabel = (type) => (type && te(`attendance.leaveType.${type.toLowerCase()}`) ? t(`attendance.leaveType.${type.toLowerCase()}`) : capitalize(type));
const leaveStatusLabel = (status) => (status && te(`attendance.leaveStatus.${status.toLowerCase()}`) ? t(`attendance.leaveStatus.${status.toLowerCase()}`) : capitalize(status));
const STATUS_OPTIONS = computed(() => [
  { value: "", label: t("common.labels.allStatuses") },
  { value: "pending", label: t("attendance.leaveStatus.pending") },
  { value: "approved", label: t("attendance.leaveStatus.approved") },
  { value: "rejected", label: t("attendance.leaveStatus.rejected") },
]);
const LEAVE_STATUS_TONE = { pending: "warn", approved: "ok", rejected: "bad" };
const LEAVE_TYPE_TONE = { annual: "info", sick: "bad", personal: "accent", emergency: "warn", maternity: "accent" };
const leaveStatusTone = (status) => LEAVE_STATUS_TONE[status?.toLowerCase()] || "neutral";
const leaveTypeTone = (type) => LEAVE_TYPE_TONE[type?.toLowerCase()] || "neutral";
const columns = computed(() => [
  { key: "employee", label: t("common.labels.employee") },
  { key: "type", label: t("common.labels.type") },
  { key: "period", label: t("common.labels.period") },
  { key: "reason", label: t("attendance.leave.reason") },
  { key: "status", label: t("common.labels.status") },
  { key: "actions", label: t("common.labels.actions"), align: "right" },
]);

const formatDate = (date) => (date ? formatDateShort(date) : "N/A");

const showApproveModal = (request) => {
  selectedLeaveRequest.value = request;
  showApproveModalState.value = true;
};
const showRejectModal = (request) => {
  selectedLeaveRequest.value = request;
  showRejectModalState.value = true;
};
const closeApproveModal = () => {
  showApproveModalState.value = false;
  selectedLeaveRequest.value = null;
};
const closeRejectModal = () => {
  showRejectModalState.value = false;
  selectedLeaveRequest.value = null;
};

const confirmApprove = async () => {
  if (!selectedLeaveRequest.value) return;
  processingAction.value = true;
  try {
    await store.approveLeaveRequest(selectedLeaveRequest.value.id);
    await load(meta.value.current_page);
    closeApproveModal();
  } finally {
    processingAction.value = false;
  }
};

const confirmReject = async () => {
  if (!selectedLeaveRequest.value) return;
  processingAction.value = true;
  try {
    await store.rejectLeaveRequest(selectedLeaveRequest.value.id);
    await load(meta.value.current_page);
    closeRejectModal();
  } finally {
    processingAction.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('attendance.leave.title')" :subtitle="$t('attendance.leave.subtitle')" class="ui-anim-fade-up">
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
      <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line flex flex-col md:flex-row md:items-center gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          :placeholder="$t('attendance.searchEmployee')"
          class="md:w-[280px]"
          @keyup.enter="handleSearch"
        />
        <UiChips v-model="statusFilter" :options="STATUS_OPTIONS" @update:model-value="handleFilterChange" />
      </div>

      <UiTable :columns="columns" :rows="leaveRequests" :meta="meta" :loading="loading" :skeleton-rows="6">
        <template #cell-employee="{ row }">
          <div class="flex items-center gap-3">
            <Avatar :src="row.employee?.user?.profile_photo" :alt="row.employee?.user?.name" size="w-8 h-8" icon-size="w-4 h-4" />
            <span class="font-medium text-ui-ink whitespace-nowrap">{{ row.employee?.user?.name || "-" }}</span>
          </div>
        </template>
        <template #cell-type="{ row }">
          <UiBadge :tone="leaveTypeTone(row.type)">{{ leaveTypeLabel(row.type) }}</UiBadge>
        </template>
        <template #cell-period="{ row }">
          <span class="inline-flex items-center gap-1 whitespace-nowrap">
            <span class="tabular-nums text-ui-ink">{{ formatDate(row.start_date) }} - {{ formatDate(row.end_date) }}</span>
            <span class="text-ui-muted">({{ $t("attendance.leave.days", { n: row.days }, Number(row.days) || 0) }})</span>
            <UiBadge v-if="row.is_half_day" tone="accent">{{ $t("attendance.leave.half") }}</UiBadge>
            <Paperclip v-if="row.attachment_url" class="w-3.5 h-3.5 text-ui-faint" />
          </span>
        </template>
        <template #cell-reason="{ row }">
          <span class="block max-w-[240px] truncate" :title="row.reason">{{ row.reason || "-" }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="leaveStatusTone(row.status)" dot>{{ leaveStatusLabel(row.status) }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div v-if="row.status === 'pending' && can('leave-request-approve')" class="flex items-center justify-end gap-1.5">
            <UiButton variant="secondary" size="sm" :icon="Check" :title="$t('common.actions.approve')" @click="showApproveModal(row)">{{ $t("common.actions.approve") }}</UiButton>
            <UiButton variant="danger" size="sm" :icon="X" :title="$t('common.actions.reject')" @click="showRejectModal(row)">{{ $t("common.actions.reject") }}</UiButton>
          </div>
        </template>

        <!-- Phones: one card per request -->
        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="w-5 pt-2 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ number }}</span>
            <Avatar :src="row.employee?.user?.profile_photo" :alt="row.employee?.user?.name" size="w-9 h-9" icon-size="w-4 h-4" />
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-ui-h3 text-ui-ink truncate">{{ row.employee?.user?.name || "-" }}</p>
                <UiBadge :tone="leaveStatusTone(row.status)" dot class="shrink-0">{{ leaveStatusLabel(row.status) }}</UiBadge>
              </div>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <UiBadge :tone="leaveTypeTone(row.type)">{{ leaveTypeLabel(row.type) }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">
                  {{ formatDate(row.start_date) }} - {{ formatDate(row.end_date) }} ({{ $t("attendance.leave.days", { n: row.days }, Number(row.days) || 0) }})
                </span>
                <span v-if="row.is_half_day" class="text-ui-cap font-medium text-ui-accent">{{ $t("attendance.leave.half") }}</span>
                <Paperclip v-if="row.attachment_url" class="w-3.5 h-3.5 text-ui-faint" />
              </div>
              <p v-if="row.reason" class="text-ui-cap text-ui-muted mt-1.5 line-clamp-2">{{ row.reason }}</p>
              <div v-if="row.status === 'pending' && can('leave-request-approve')" class="grid grid-cols-2 gap-2 mt-3">
                <UiButton variant="secondary" size="sm" :icon="Check" @click="showApproveModal(row)">{{ $t("common.actions.approve") }}</UiButton>
                <UiButton variant="danger" size="sm" :icon="X" @click="showRejectModal(row)">{{ $t("common.actions.reject") }}</UiButton>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center py-4">
            <div class="w-10 h-10 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center mb-3">
              <CalendarClock class="w-5 h-5" />
            </div>
            <p class="text-ui-body font-medium text-ui-ink">{{ $t("attendance.leave.emptyYet") }}</p>
          </div>
        </template>
      </UiTable>

      <div class="px-4 sm:px-5 pb-4">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('attendance.leave.itemLabel')" @page-change="load" />
      </div>
    </section>

    <!-- Approve Modal -->
    <UiConfirmDialog
      v-model:open="showApproveModalState"
      type="success"
      :title="$t('attendance.leave.approveTitle')"
      :message="$t('attendance.leave.approveMessage')"
      :confirm-text="processingAction ? $t('attendance.leave.approving') : $t('common.actions.approve')"
      :loading="processingAction"
      @cancel="closeApproveModal"
      @confirm="confirmApprove"
    >
      <div v-if="selectedLeaveRequest" class="border border-ui-line rounded-ui-card p-3.5 space-y-1.5">
        <p class="text-ui-h3 text-ui-ink">{{ selectedLeaveRequest.employee?.user?.name }}</p>
        <UiBadge :tone="leaveTypeTone(selectedLeaveRequest.type)">{{ leaveTypeLabel(selectedLeaveRequest.type) }}</UiBadge>
        <p class="text-ui-small text-ui-text tabular-nums">
          {{ formatDate(selectedLeaveRequest.start_date) }} - {{ formatDate(selectedLeaveRequest.end_date) }} ({{ $t("attendance.leave.days", { n: selectedLeaveRequest.days }, Number(selectedLeaveRequest.days) || 0) }})
          <span v-if="selectedLeaveRequest.is_half_day" class="text-ui-accent font-medium">({{ $t("attendance.leave.halfDay") }})</span>
        </p>
        <p class="text-ui-small text-ui-muted">{{ selectedLeaveRequest.reason }}</p>
        <a
          v-if="selectedLeaveRequest.attachment_url"
          :href="selectedLeaveRequest.attachment_url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 pt-1 text-ui-small font-medium text-ui-accent hover:underline"
        >
          <Paperclip class="w-3.5 h-3.5" />
          {{ selectedLeaveRequest.attachment_original_name || $t("attendance.leave.viewAttachment") }}
        </a>
      </div>
    </UiConfirmDialog>

    <!-- Reject Modal -->
    <UiConfirmDialog
      v-model:open="showRejectModalState"
      type="danger"
      :title="$t('attendance.leave.rejectTitle')"
      :message="$t('attendance.leave.rejectMessage')"
      :confirm-text="processingAction ? $t('attendance.leave.rejecting') : $t('common.actions.reject')"
      :loading="processingAction"
      @cancel="closeRejectModal"
      @confirm="confirmReject"
    >
      <div v-if="selectedLeaveRequest" class="border border-ui-line rounded-ui-card p-3.5 space-y-1.5">
        <p class="text-ui-h3 text-ui-ink">{{ selectedLeaveRequest.employee?.user?.name }}</p>
        <UiBadge :tone="leaveTypeTone(selectedLeaveRequest.type)">{{ leaveTypeLabel(selectedLeaveRequest.type) }}</UiBadge>
        <p class="text-ui-small text-ui-text tabular-nums">
          {{ formatDate(selectedLeaveRequest.start_date) }} - {{ formatDate(selectedLeaveRequest.end_date) }} ({{ $t("attendance.leave.days", { n: selectedLeaveRequest.days }, Number(selectedLeaveRequest.days) || 0) }})
          <span v-if="selectedLeaveRequest.is_half_day" class="text-ui-accent font-medium">({{ $t("attendance.leave.halfDay") }})</span>
        </p>
        <p class="text-ui-small text-ui-muted">{{ selectedLeaveRequest.reason }}</p>
        <a
          v-if="selectedLeaveRequest.attachment_url"
          :href="selectedLeaveRequest.attachment_url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 pt-1 text-ui-small font-medium text-ui-accent hover:underline"
        >
          <Paperclip class="w-3.5 h-3.5" />
          {{ selectedLeaveRequest.attachment_original_name || $t("attendance.leave.viewAttachment") }}
        </a>
      </div>
    </UiConfirmDialog>
  </div>
</template>
