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
      :label="$t('myAttendance.stats.thisMonth')"
      :icon="CalendarCheck"
      :value="`${statistics.present_days}/${statistics.total_days}`"
      :hint="$t('myAttendance.stats.daysPresent')"
    />
    <UiStat
      :label="$t('myAttendance.stats.leaveBalance')"
      :icon="CalendarDays"
      :value="leaveBalance ? leaveBalance.remaining : '-'"
      :hint="leaveBalance ? $t('myAttendance.stats.ofDays', { n: leaveBalance.quota }, leaveBalance.quota) : $t('myAttendance.stats.daysRemaining')"
    />
    <UiStat
      :label="$t('myAttendance.stats.pendingRequests')"
      :icon="Clock"
      :value="pendingRequestsCount"
      :tone="pendingRequestsCount > 0 ? 'warn' : ''"
      :hint="$t('myAttendance.stats.awaitingApproval')"
    />
    <UiStat
      :label="$t('myAttendance.stats.averageHours')"
      :icon="Clock3"
      :value="$t('myAttendance.stats.hours', { n: statistics.average_hours || 0 })"
      :hint="$t('myAttendance.stats.dailyAverage')"
    />
  </div>
</template>
