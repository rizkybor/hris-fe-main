<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiBadge, UiEmpty } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { ClipboardList } from "lucide-vue-next";
import { useLeaveRequestStore } from "@/stores/leaveRequest";
import { can } from "@/helpers/permissionHelper";
import { getTimeAgo } from "@/utils/dateUtils";

const canViewLeaveRequests = computed(() => can("leave-request-list"));

const leaveRequestStore = useLeaveRequestStore();
const { leaveRequests: pendingLeaveRequests, meta: leaveMeta, loading: leaveLoading } =
  storeToRefs(leaveRequestStore);

onMounted(() => {
  if (canViewLeaveRequests.value) {
    leaveRequestStore.fetchAllPaginated({ status: "pending", row_per_page: 5 });
  }
});

const STATUS_TONES = { pending: "warn", approved: "ok", rejected: "bad", cancelled: "neutral" };
const statusTone = (status) => STATUS_TONES[String(status).toLowerCase()] || "neutral";
</script>

<template>
  <DashboardWidgetCard
    v-if="canViewLeaveRequests"
    title="Pending Leave Requests"
    :subtitle="`${leaveMeta?.total ?? 0} awaiting your review`"
    :to="{ name: 'admin.leave-requests.dashboard' }"
    flush
  >
    <SkeletonList v-if="leaveLoading" :rows="3" class="p-3" />
    <UiEmpty v-else-if="pendingLeaveRequests.length === 0" :icon="ClipboardList" title="No pending leave requests." compact />
    <ul v-else class="divide-y divide-ui-line">
      <li v-for="request in pendingLeaveRequests" :key="request.id" class="flex items-center justify-between gap-3 px-5 py-3">
        <div class="min-w-0">
          <p class="text-ui-body font-medium text-ui-ink truncate">{{ request.employee?.user?.name || "Unknown" }}</p>
          <p class="text-ui-cap text-ui-muted mt-0.5">{{ request.leave_type || "Leave" }} &middot; {{ getTimeAgo(request.created_at) }}</p>
        </div>
        <UiBadge :tone="statusTone(request.status)" dot class="capitalize shrink-0">{{ request.status }}</UiBadge>
      </li>
    </ul>
  </DashboardWidgetCard>
</template>
