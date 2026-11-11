<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiEmpty } from "@/components/ui";
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useActivityLogStore } from "@/stores/activityLog";
import { can } from "@/helpers/permissionHelper";
import { getTimeAgo } from "@/utils/dateUtils";
import { History } from "lucide-vue-next";

const activityLogStore = useActivityLogStore();
const { activities } = storeToRefs(activityLogStore);

onMounted(() => {
  activityLogStore.fetchActivities({ row_per_page: 6 });
});

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
</script>

<template>
  <DashboardWidgetCard
    :title="$t('dashboard.widgets.recentActivity')"
    :subtitle="$t('dashboard.recentActivity.subtitle')"
    :to="can('history-menu') || can('history-view') ? { name: 'admin.history.dashboard' } : null"
    flush
  >
    <UiEmpty v-if="activities.length === 0" :icon="History" :title="$t('dashboard.recentActivity.empty')" compact />
    <ul v-else class="divide-y divide-ui-line">
      <li v-for="activity in activities" :key="activity.id" class="flex items-start gap-3 px-5 py-3">
        <span class="w-7 h-7 rounded-full bg-ui-accent-soft text-ui-accent text-[10px] font-semibold flex items-center justify-center shrink-0 mt-px">
          {{ initials(activity.causer?.name || $t("dashboard.recentActivity.system")) }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-ui-small text-ui-ink line-clamp-2">{{ activity.description }}</p>
          <p class="text-ui-cap text-ui-muted mt-0.5">{{ activity.causer?.name || $t("dashboard.recentActivity.system") }}</p>
        </div>
        <span class="text-ui-cap text-ui-faint tabular-nums shrink-0 pt-0.5">{{ getTimeAgo(activity.created_at) }}</span>
      </li>
    </ul>
  </DashboardWidgetCard>
</template>
