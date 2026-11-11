<script setup lang="ts">
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiBadge, UiEmpty } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import { onMounted } from "vue";
import { useTeamStore } from "@/stores/team";
import { useRouter } from "vue-router";
import { can } from "@/helpers/permissionHelper";
import { getTimeAgo } from "@/utils/dateUtils";
import { storeToRefs } from "pinia";

const teamStore = useTeamStore();
const { teams: latestTeams, loading } = storeToRefs(teamStore);
const { fetchTeams } = teamStore;

const router = useRouter();

onMounted(() => {
  fetchTeams({
    limit: 5,
  });
});

const goToTeamDetail = (id: number) => {
  router.push({ name: "admin.team.detail", params: { id } });
};
</script>

<template>
  <DashboardWidgetCard :title="$t('dashboard.widgets.latestTeams')" :to="can('team-menu') ? { name: 'admin.teams' } : null" flush>
    <SkeletonList v-if="loading" :rows="5" class="p-3" />
    <UiEmpty v-else-if="!latestTeams || latestTeams.length === 0" :title="$t('dashboard.latestTeams.empty')" compact />
    <ul v-else class="divide-y divide-ui-line">
      <li v-for="team in latestTeams" :key="team.id">
        <button
          type="button"
          @click="goToTeamDetail(team.id)"
          class="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-ui-hover transition-colors"
        >
          <span class="w-9 h-9 rounded-ui-control bg-ui-ink flex items-center justify-center shrink-0">
            <img :src="team.icon" alt="" class="w-4 h-4" />
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ team.name }}</p>
              <UiBadge v-if="team.status" :tone="team.status === 'active' ? 'ok' : 'neutral'" dot class="capitalize shrink-0">{{ ["active", "inactive"].includes(team.status) ? $t(`common.labels.${team.status}`) : team.status }}</UiBadge>
            </div>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("dashboard.latestTeams.members", { n: team.members_count || 0 }, team.members_count || 0) }}</p>
          </div>
          <span class="text-ui-cap text-ui-faint shrink-0">{{ getTimeAgo(team.created_at) }}</span>
        </button>
      </li>
    </ul>
  </DashboardWidgetCard>
</template>
