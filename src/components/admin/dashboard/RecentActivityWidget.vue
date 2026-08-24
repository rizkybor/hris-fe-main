<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useActivityLogStore } from "@/stores/activityLog";
import { can } from "@/helpers/permissionHelper";
import { getTimeAgo } from "@/utils/dateUtils";
import { History, ShieldAlert } from "lucide-vue-next";

const activityLogStore = useActivityLogStore();
const { activities } = storeToRefs(activityLogStore);

onMounted(() => {
  activityLogStore.fetchActivities({ row_per_page: 6 });
});
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-gray-50 rounded-[12px] flex items-center justify-center shrink-0">
          <History class="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Recent Activity</h3>
          <p class="text-brand-light text-sm">Latest changes across the system</p>
        </div>
      </div>
      <RouterLink
        v-if="can('history-menu') || can('history-view')"
        :to="{ name: 'admin.history.dashboard' }"
        class="text-[#0C51D9] text-sm font-medium hover:underline shrink-0"
      >
        View All
      </RouterLink>
    </div>

    <div v-if="activities.length === 0" class="text-center py-10 text-sm text-gray-400">
      No activity recorded yet.
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="flex items-start gap-3 border border-[#DCDEDD] rounded-[12px] p-3"
      >
        <div class="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert class="w-4 h-4 text-red-500" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-brand-dark text-sm font-medium truncate">
            {{ activity.description }}
          </p>
          <p class="text-brand-light text-xs mt-0.5">
            {{ activity.causer?.name || "System" }} &middot; {{ getTimeAgo(activity.created_at) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
