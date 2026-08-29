<script setup lang="ts">
import { onMounted, computed } from "vue";
import {
  CheckCircle,
  PlusCircle,
  Target,
  Star,
  TrendingUp,
  Users,
  UserPlus,
} from "lucide-vue-next";
import { useTeamStore } from "@/stores/team";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";

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
  <SkeletonStatCards
    v-if="loading"
    :count="5"
    cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    class="mb-5"
  />
  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
    <!-- Total Teams Card (spans 2 rows on the left) -->
    <div
      class="lg:row-span-2 rounded-[14px] border border-[#0B1042] relative overflow-hidden main-card p-4"
    >
      <div class="flex flex-col justify-center h-full relative z-10">
        <!-- Trending Badge -->
        <div class="flex items-center gap-1.5 mb-2.5">
          <div
            class="flex items-center gap-1 px-2.5 py-1 bg-white/20 rounded-full backdrop-blur-sm"
          >
            <TrendingUp class="w-3 h-3 text-white" />
            <span class="text-brand-white text-xs font-semibold"
              >+{{ addedThisMonth }} this month</span
            >
          </div>
        </div>

        <div class="flex items-center justify-between mb-3.5">
          <div>
            <p class="text-brand-white-90 text-sm font-medium">Total Teams</p>
            <p
              class="text-brand-white text-3xl font-extrabold leading-none my-3.5"
            >
              {{ loading ? '...' : total }}
            </p>
            <p class="text-brand-white-80 text-sm font-normal">
              Company teams
            </p>
          </div>
          <div
            class="w-21 h-21 p-4 bg-white rounded-[14px] flex items-center justify-center"
          >
            <Users class="w-21 h-21 text-white/20" />
          </div>
        </div>

        <!-- Additional Info -->
        <div class="flex items-center gap-2.5 mt-auto">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span class="text-brand-white-70 text-xs font-normal"
              >All Departments</span
            >
          </div>
          <div class="flex items-center gap-1">
            <Star class="w-3 h-3 text-white opacity-70" />
            <span class="text-brand-white-70 text-xs font-normal"
              >Growing Teams</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Active Teams Card -->
    <div
      class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Active Teams</p>
          <p class="text-brand-dark text-xl font-extrabold leading-none my-1.5">
            {{ loading ? '...' : active }}
          </p>
          <p :class="activeChange >= 0 ? 'text-success' : 'text-danger'" class="text-sm font-medium">
            {{ activeChange >= 0 ? '+' : '' }}{{ activeChange }} this week
          </p>
        </div>
        <div
          class="w-10 h-10 bg-green-50 rounded-[12px] flex items-center justify-center"
        >
          <CheckCircle class="w-6 h-6 text-green-600" />
        </div>
      </div>
    </div>

    <!-- Team Members Card -->
    <div
      class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Team Members</p>
          <p class="text-brand-dark text-xl font-extrabold leading-none my-1.5">
            {{ loading ? '...' : members }}
          </p>
          <p :class="membersChange >= 0 ? 'text-success' : 'text-danger'" class="text-sm font-medium">
            {{ membersChange >= 0 ? '+' : '' }}{{ membersChange }} this month
          </p>
        </div>
        <div
          class="w-10 h-10 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <UserPlus class="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>

    <!-- Average Team Size Card -->
    <div
      class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Average Team Size</p>
          <p class="text-brand-dark text-xl font-extrabold leading-none my-1.5">
            {{ loading ? '...' : averageSize }}
          </p>
          <p class="text-success text-sm font-medium">Optimal size</p>
        </div>
        <div
          class="w-10 h-10 bg-orange-50 rounded-[12px] flex items-center justify-center"
        >
          <Target class="w-6 h-6 text-orange-600" />
        </div>
      </div>
    </div>

    <!-- Recent Teams Card -->
    <div
      class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">New Teams</p>
          <p class="text-brand-dark text-xl font-extrabold leading-none my-1.5">
            {{ loading ? '...' : newTeams }}
          </p>
          <p class="text-success text-sm font-medium">This month</p>
        </div>
        <div
          class="w-10 h-10 bg-purple-50 rounded-[12px] flex items-center justify-center"
        >
          <PlusCircle class="w-6 h-6 text-purple-600" />
        </div>
      </div>
    </div>
  </div>
</template>
