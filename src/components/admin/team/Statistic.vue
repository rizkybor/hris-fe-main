<script setup lang="ts">
import { onMounted, computed } from "vue";
import {
  CheckCircle,
  PlusCircle,
  Target,
  Users,
  UserPlus,
} from "lucide-vue-next";
import { useTeamStore } from "@/stores/team";
import { UiStat } from "@/components/ui";

const teamStore = useTeamStore();

onMounted(() => {
  teamStore.fetchStatistics();
});

// Computed properties for statistics
const total = computed(() => teamStore.statistics.total);
const addedThisMonth = computed(() => teamStore.statistics.added_this_month);
const active = computed(() => teamStore.statistics.active);
const activeChange = computed(() => teamStore.statistics.active_change);
const members = computed(() => teamStore.statistics.members);
const membersChange = computed(() => teamStore.statistics.members_change);
const averageSize = computed(() => teamStore.statistics.average_size);
const newTeams = computed(() => teamStore.statistics.new_teams);
const loading = computed(() => teamStore.loadingStatistics);
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 ui-stagger">
    <UiStat
      class="col-span-2 lg:col-span-1"
      label="Total Teams"
      :value="total"
      :icon="Users"
      :loading="loading"
    >
      <template #hint>
        <span class="text-ui-ok">+{{ addedThisMonth }} this month</span>
      </template>
    </UiStat>

    <UiStat label="Active Teams" :value="active" :icon="CheckCircle" :loading="loading">
      <template #hint>
        <span :class="activeChange >= 0 ? 'text-ui-ok' : 'text-ui-bad'">
          {{ activeChange >= 0 ? '+' : '' }}{{ activeChange }} this week
        </span>
      </template>
    </UiStat>

    <UiStat label="Team Members" :value="members" :icon="UserPlus" :loading="loading">
      <template #hint>
        <span :class="membersChange >= 0 ? 'text-ui-ok' : 'text-ui-bad'">
          {{ membersChange >= 0 ? '+' : '' }}{{ membersChange }} this month
        </span>
      </template>
    </UiStat>

    <UiStat
      label="Average Team Size"
      :value="averageSize"
      :icon="Target"
      hint="Optimal size"
      :loading="loading"
    />

    <UiStat
      label="New Teams"
      :value="newTeams"
      :icon="PlusCircle"
      hint="This month"
      :loading="loading"
    />
  </div>
</template>
