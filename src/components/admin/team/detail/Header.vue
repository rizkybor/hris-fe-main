<script setup>
import { Building, Calendar, Edit, Share, Users } from "lucide-vue-next";
import { RouterLink } from "vue-router";
import { capitalize } from "lodash-es";
import { formatToClientTimezone } from "@/helpers/format";

const props = defineProps({
  team: {
    type: Object,
    required: true,
  },
});
</script>
<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] mb-5 p-3.5 sm:p-5">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-5">
      <div class="flex items-center gap-3.5 min-w-0">
        <div class="relative shrink-0">
          <div
            class="w-16 h-16 sm:w-32 sm:h-32 relative flex items-center justify-center rounded-full overflow-hidden"
          >
            <!-- Main blue background -->
            <div
              class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-full"
            ></div>
            <!-- Lucide icon -->
            <img
              class="w-5 h-5 sm:w-9 sm:h-9 text-white relative z-10"
              :src="team.icon"
              alt="Team Icon"
            />
          </div>
        </div>

        <!-- Team name shown next to the avatar on mobile only; on sm+ it moves
        into the text column below alongside the department/date info. -->
        <div class="flex items-center gap-2.5 flex-wrap min-w-0 sm:hidden">
          <h1 class="text-brand-dark text-lg font-extrabold break-words min-w-0">
            {{ team.name }}
          </h1>
          <span
            class="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EBF8FF] text-[#1E40AF]"
            >Verified</span
          >
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <div class="hidden sm:flex items-center gap-3.5 mb-2.5 flex-wrap min-w-0">
          <h1 class="text-brand-dark text-xl font-extrabold break-words min-w-0">
            {{ team.name }}
          </h1>
          <span
            class="px-2.5 py-1 rounded-md text-sm font-semibold bg-[#EBF8FF] text-[#1E40AF]"
            >Verified</span
          >
        </div>
        <div class="flex flex-col gap-1.5 text-sm text-gray-600">
          <div class="flex items-center gap-1.5">
            <Users class="w-4 h-4" />
            <span>{{ team.members_count }}/{{ team.expected_size }} members</span>
          </div>
          <div class="flex items-center gap-1.5">
            <Building class="w-4 h-4" />
            <span>{{ capitalize(team.department) }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <Calendar class="w-4 h-4" />
            <span>{{ formatToClientTimezone(team.created_at) }}</span>
          </div>
        </div>
      </div>

      <div class="flex gap-2.5">
        <RouterLink
          :to="{ name: 'admin.team.edit', params: { id: team.id } }"
          class="flex-1 sm:flex-none border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow rounded-[8px] px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-center gap-1.5"
        >
          <Edit class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Edit Team</span>
        </RouterLink>
        <button
          class="flex-1 sm:flex-none bg-white border border-[#DCDEDD] text-brand-dark py-2 sm:py-2.5 px-3.5 sm:px-5 rounded-[8px] font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Share class="w-4 h-4" />
          <span class="whitespace-nowrap">Share Team</span>
        </button>
      </div>
    </div>
  </div>
</template>
