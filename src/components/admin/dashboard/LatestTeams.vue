<script setup lang="ts">
import { onMounted } from "vue";
import {
  BoxIcon,
  MegaphoneIcon,
  PaletteIcon,
  TrendingUpIcon,
  HeadphonesIcon,
  UsersIcon,
} from "lucide-vue-next";
import { useTeamStore } from "@/stores/team";
import { useRouter } from "vue-router";
import { getTimeAgo } from "@/utils/dateUtils";
import { getStatusBadgeClass } from "@/utils/badgeUtils";
import { storeToRefs } from "pinia";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

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
  <!-- Latest Teams -->
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-brand-dark text-base font-bold">Latest Teams</h3>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 5" :key="i" class="flex items-center gap-3">
        <Skeleton width="56px" height="48px" rounded="8px" />
        <div class="flex-1 space-y-2">
          <Skeleton width="33%" height="14px" />
          <Skeleton width="50%" height="10px" />
        </div>
        <Skeleton width="80px" height="20px" rounded="6px" class="hidden sm:block" />
        <Skeleton width="70px" height="34px" rounded="10px" class="hidden sm:block" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!latestTeams || latestTeams.length === 0"
      class="text-center py-8"
    >
      <p class="text-gray-500 text-xs">No teams found</p>
    </div>

    <!-- Team List -->
    <div v-else class="space-y-4">
      <div
        v-for="(team, index) in latestTeams"
        :key="team.id"
        class="flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div
          class="w-12 h-10 sm:w-14 sm:h-12 relative flex items-center justify-center rounded-[8px] overflow-hidden"
        >
          <!-- Main blue background -->
          <div
            class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-[8px]"
          ></div>
          <!-- Lucide icon -->
          <img :src="team.icon" class="w-5 h-5 relative z-10" />
        </div>

        <!-- Team Info -->
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <p class="text-brand-dark text-sm sm:text-base font-bold">{{ team.name }}</p>
            <span
              v-if="team.status"
              :class="getStatusBadgeClass(team.status)"
              class="px-1.5 py-0.5 rounded-md text-[11px] font-semibold capitalize"
            >
              {{ team.status }}
            </span>
          </div>
          <p class="text-brand-dark text-xs font-normal">
            {{ team.members_count || 0 }} members •
            {{ getTimeAgo(team.created_at) }}
          </p>
        </div>

        <!-- Details Button -->
        <button
          @click="goToTeamDetail(team.id)"
          class="btn-details w-full sm:w-auto border border-[#DCDEDD] rounded-xl hover:ring-2 hover:ring-[#0C51D9] hover:text-[#0C51D9] transition-all duration-300 py-2 sm:py-2.5 px-3 sm:px-4 flex items-center justify-center"
        >
          <span class="text-brand-dark text-xs sm:text-sm font-medium">Details</span>
        </button>
      </div>
    </div>
  </div>
</template>
