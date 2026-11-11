<script setup>
import { CheckCircle, TrendingUp, Users, Folder } from "lucide-vue-next";
import { onMounted, watch } from "vue";
import { useTeamStore } from "@/stores/team";
import { storeToRefs } from "pinia";
import { UiStat } from "@/components/ui";

const props = defineProps({
  team: {
    type: Object,
    required: true,
  },
});

const teamStore = useTeamStore();
const { teamStatistics, loadingTeamStatistics } = storeToRefs(teamStore);
const { fetchTeamStatistics } = teamStore;

const loadStatistics = async () => {
  if (props.team?.id) {
    try {
      await fetchTeamStatistics(props.team.id);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }
};

onMounted(async () => {
  await loadStatistics();
});

watch(() => props.team?.id, async (newId) => {
  if (newId) {
    await loadStatistics();
  }
}, { immediate: true });
</script>
<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ui-stagger">
    <UiStat
      :label="$t('teams.detail.stats.activeMembers')"
      :icon="Users"
      :value="teamStatistics.active_members || 0"
      :loading="loadingTeamStatistics"
    >
      <template #hint>
        <span
          class="text-ui-ok"
          v-if="!loadingTeamStatistics && teamStatistics.active_members >= team.expected_size"
        >
          {{ $t("teams.detail.stats.fullCapacity") }}
        </span>
        <span
          class="text-ui-bad"
          v-if="!loadingTeamStatistics && teamStatistics.active_members < team.expected_size"
        >
          {{ $t("teams.detail.stats.membersNeeded", { n: team.expected_size - teamStatistics.active_members }, team.expected_size - teamStatistics.active_members) }}
        </span>
      </template>
    </UiStat>

    <UiStat
      :label="$t('teams.detail.stats.projectsAssigned')"
      :icon="Folder"
      :value="teamStatistics.projects_assigned || 0"
      :loading="loadingTeamStatistics"
      :hint="$t('teams.detail.stats.inProgress', { n: teamStatistics.projects_in_progress || 0 })"
    />

    <UiStat
      :label="$t('teams.detail.stats.performance')"
      :icon="TrendingUp"
      :value="`${teamStatistics.team_performance || 0}%`"
      :loading="loadingTeamStatistics"
    >
      <template #hint>
        <span :class="(teamStatistics.team_performance || 0) >= 80 ? 'text-ui-ok' : 'text-ui-warn'">
          {{ (teamStatistics.team_performance || 0) >= 80 ? $t('teams.detail.stats.aboveTarget') : $t('teams.detail.stats.belowTarget') }}
        </span>
      </template>
    </UiStat>

    <UiStat
      :label="$t('teams.detail.stats.completionRate')"
      :icon="CheckCircle"
      :value="`${teamStatistics.completion_rate || 0}%`"
      :loading="loadingTeamStatistics"
      :hint="$t('teams.stats.thisMonthHint')"
    />
  </div>
</template>
