<script setup>
import { CalendarCheck, CalendarDays, Clock, Clock3 } from "lucide-vue-next";
import { UiStat } from "@/components/ui";

const props = defineProps({
  statistics: {
    type: Object,
    required: true,
  },
  pendingRequestsCount: {
    type: Number,
    default: 0,
  },
  leaveBalance: {
    type: Object,
    default: null,
  },
});
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ui-stagger">
    <UiStat
      label="This Month"
      :icon="CalendarCheck"
      :value="`${statistics.present_days}/${statistics.total_days}`"
      hint="Days present"
    />
    <UiStat
      label="Leave Balance"
      :icon="CalendarDays"
      :value="leaveBalance ? leaveBalance.remaining : '-'"
      :hint="leaveBalance ? `of ${leaveBalance.quota} days` : 'Days remaining'"
    />
    <UiStat
      label="Pending Requests"
      :icon="Clock"
      :value="pendingRequestsCount"
      :tone="pendingRequestsCount > 0 ? 'warn' : ''"
      hint="Awaiting approval"
    />
    <UiStat
      label="Average Hours"
      :icon="Clock3"
      :value="`${statistics.average_hours || 0}h`"
      hint="Daily average"
    />
  </div>
</template>
