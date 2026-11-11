<script setup>
import { CheckCircle, Calendar, Clock } from "lucide-vue-next";
import { formatLeaveType } from "@/utils/attendanceUtils";
import { formatDateShort } from "@/utils/dateUtils";
import { UiAlert, UiButton, UiModal } from "@/components/ui";

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  leaveData: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close"]);

const handleClose = () => {
  emit("close");
};
</script>

<template>
  <UiModal :open="show" size="sm" @close="handleClose">
    <div class="text-center pt-2">
      <div class="ui-anim-scale w-12 h-12 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center mx-auto mb-3">
        <CheckCircle class="w-6 h-6" />
      </div>
      <h3 class="text-ui-h2 text-ui-ink">Request Submitted!</h3>
      <p class="text-ui-small text-ui-muted mt-1">Your leave request has been successfully submitted</p>
    </div>

    <div v-if="leaveData" class="mt-5 space-y-4">
      <dl class="border border-ui-line rounded-ui-card divide-y divide-ui-line">
        <div class="flex items-center justify-between gap-3 px-4 py-2.5">
          <dt class="text-ui-small text-ui-muted">Leave Type</dt>
          <dd class="text-ui-h3 text-ui-ink">{{ formatLeaveType(leaveData.leave_type) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-3 px-4 py-2.5">
          <dt class="text-ui-small text-ui-muted">Duration</dt>
          <dd class="flex items-center gap-1.5 text-ui-body font-medium text-ui-ink">
            <Clock class="w-4 h-4 text-ui-faint" />
            {{ leaveData.total_days }}
            {{ leaveData.total_days === 1 ? "day" : "days" }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3 px-4 py-2.5">
          <dt class="text-ui-small text-ui-muted">Period</dt>
          <dd class="flex items-center gap-1.5 text-ui-body font-medium text-ui-ink text-right">
            <Calendar class="w-4 h-4 text-ui-faint shrink-0" />
            {{ formatDateShort(leaveData.start_date) }} -
            {{ formatDateShort(leaveData.end_date) }}
          </dd>
        </div>
      </dl>

      <UiAlert tone="info">
        You will receive a notification once your request has been reviewed by your manager.
      </UiAlert>
    </div>

    <template #footer>
      <UiButton block @click="handleClose">Got it!</UiButton>
    </template>
  </UiModal>
</template>
