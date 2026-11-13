<script setup>
import { CheckCircle, TrendingUp, Users, Folder } from "lucide-vue-next";
import { computed, watch } from "vue";
import { useTeamStore } from "@/stores/team";
import { storeToRefs } from "pinia";
import { UiStat } from "@/components/ui";

const props = defineProps({
  team: {
    type: Object,
    required: true,
  },
  teamId: {
    type: [String, Number],
    default: null,
  },
});

const teamStore = useTeamStore();
const { teamStatistics, loadingTeamStatistics, teamStatisticsId } = storeToRefs(teamStore);

const id = computed(() => props.teamId ?? props.team?.id ?? null);
// Never show another team's numbers while this one's load.
const loading = computed(() => loadingTeamStatistics.value || (id.value != null && teamStatisticsId.value !== String(id.value)));

watch(
  () => (props.teamId == null ? props.team?.id : null),
  (teamId) => teamId && teamStore.fetchTeamStatistics(teamId),
  { immediate: true }
);
</script>
<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ui-stagger">
    <UiStat
      :label="$t('teams.detail.stats.activeMembers')"
      :icon="Users"
      :value="teamStatistics.active_members || 0"
      :loading="loading"
    >
      <template #hint>
        <span
          class="text-ui-ok"
          v-if="!loading && teamStatistics.active_members >= team.expected_size"
        >
          {{ $t("teams.detail.stats.fullCapacity") }}
        </span>
        <span
          class="text-ui-bad"
          v-if="!loading && teamStatistics.active_members < team.expected_size"
        >
          {{ $t("teams.detail.stats.membersNeeded", { n: team.expected_size - teamStatistics.active_members }, team.expected_size - teamStatistics.active_members) }}
        </span>
      </template>
    </UiStat>

    <UiStat
      :label="$t('teams.detail.stats.projectsAssigned')"
      :icon="Folder"
      :value="teamStatistics.projects_assigned || 0"
      :loading="loading"
      :hint="$t('teams.detail.stats.inProgress', { n: teamStatistics.projects_in_progress || 0 })"
    />

    <UiStat
      :label="$t('teams.detail.stats.performance')"
      :icon="TrendingUp"
      :value="`${teamStatistics.team_performance || 0}%`"
      :loading="loading"
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
      :loading="loading"
      :hint="$t('teams.stats.thisMonthHint')"
    />
  </div>
</template>
