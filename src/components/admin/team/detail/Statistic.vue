<script setup>
import { CheckCircle, TrendingUp, Users, Folder } from "lucide-vue-next";
import { onMounted, watch } from "vue";
import { useTeamStore } from "@/stores/team";
import { storeToRefs } from "pinia";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";

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
  <SkeletonStatCards v-if="loadingTeamStatistics" :count="4" class="mb-5" />
  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
    <div
      class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Active Members</p>
          <p class="text-brand-dark text-xl font-extrabold leading-tight my-1.5">
            {{ loadingTeamStatistics ? "..." : (teamStatistics.active_members || 0) }}
          </p>
          <p
            class="text-success text-sm font-medium"
            v-if="!loadingTeamStatistics && teamStatistics.active_members >= team.expected_size"
          >
            Full capacity
          </p>
          <p
            class="text-danger text-sm font-medium"
            v-if="!loadingTeamStatistics && teamStatistics.active_members < team.expected_size"
          >
            {{ team.expected_size - teamStatistics.active_members }} members needed
          </p>
        </div>
        <div
          class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <Users class="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>
    <div
      class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Projects Assigned</p>
          <p class="text-brand-dark text-xl font-extrabold leading-tight my-1.5">
            {{ loadingTeamStatistics ? "..." : (teamStatistics.projects_assigned || 0) }}
          </p>
          <p class="text-success text-sm font-medium">
            {{ loadingTeamStatistics ? "..." : (teamStatistics.projects_in_progress || 0) }} in progress
          </p>
        </div>
        <div
          class="w-9 h-9 bg-green-50 rounded-[12px] flex items-center justify-center"
        >
          <Folder class="w-6 h-6 text-green-600" />
        </div>
      </div>
    </div>
    <div
      class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Team Performance</p>
          <p class="text-brand-dark text-xl font-extrabold leading-tight my-1.5">
            {{ loadingTeamStatistics ? "..." : (teamStatistics.team_performance || 0) }}%
          </p>
          <p
            class="text-sm font-medium"
            :class="(teamStatistics.team_performance || 0) >= 80 ? 'text-success' : 'text-warning'"
          >
            {{ (teamStatistics.team_performance || 0) >= 80 ? 'Above target' : 'Below target' }}
          </p>
        </div>
        <div
          class="w-9 h-9 bg-purple-50 rounded-[12px] flex items-center justify-center"
        >
          <TrendingUp class="w-6 h-6 text-purple-600" />
        </div>
      </div>
    </div>
    <div
      class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Completion Rate</p>
          <p class="text-brand-dark text-xl font-extrabold leading-tight my-1.5">
            {{ loadingTeamStatistics ? "..." : (teamStatistics.completion_rate || 0) }}%
          </p>
          <p class="text-success text-sm font-medium">This month</p>
        </div>
        <div
          class="w-9 h-9 bg-orange-50 rounded-[12px] flex items-center justify-center"
        >
          <CheckCircle class="w-6 h-6 text-orange-600" />
        </div>
      </div>
    </div>
  </div>
</template>
