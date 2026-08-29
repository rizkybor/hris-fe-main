<script setup>
import { CheckCircle, Eye, Edit } from "lucide-vue-next";
import { getStatusColor } from "@/utils/styleHelpers";
import Avatar from "@/components/common/Avatar.vue";

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});
</script>
<template>
  <div
    class="bg-white border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-3.5"
  >
    <div class="flex items-center justify-between mb-2.5">
      <div class="flex items-center gap-2.5">
        <div
          class="w-10 h-10 relative flex items-center justify-center rounded-[12px] overflow-hidden"
        >
          <!-- Main blue background -->
          <div
            class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-[12px]"
          ></div>
          <!-- Lucide icon -->
          <img
            :src="data.icon"
            alt="Team Icon"
            class="w-6 h-6 text-white relative z-10"
          />
        </div>
        <div>
          <h4 class="text-brand-dark text-sm font-bold">{{ data.name }}</h4>
          <p class="text-brand-light text-sm font-normal">
            {{ data.members_count }} members
          </p>
        </div>
      </div>
      <span
        class="px-1.5 py-1 rounded-md text-xs font-semibold capitalize"
        :class="getStatusColor(data.status)"
      >
        {{ data.status }}
      </span>
    </div>

    <!-- Border Divider -->
    <div class="border-b border-[#DCDEDD] mb-3.5"></div>

    <!-- Team Leader Section -->
    <div class="mb-3.5" v-if="data.leader">
      <div class="flex items-center gap-2.5">
        <Avatar
          :src="data.leader.profile_photo"
          :alt="data.leader.name"
          size="w-9 h-9"
          icon-size="w-5 h-5"
        />
        <div class="flex-1">
          <h5 class="text-brand-dark text-sm font-semibold">
            {{ data.leader.name }}
          </h5>
          <p class="text-brand-light text-xs font-normal">
            {{ data.leader?.employee_profile?.job_information?.job_title }}
          </p>
        </div>
        <!-- Team Leader Badge -->
        <span
          class="px-1.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-md"
        >
          Team Leader
        </span>
      </div>
    </div>

    <!-- Team Leader Section Not Found -->
    <div class="mb-3.5" v-else>
      <div
        class="w-full h-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
      >
        No Leader
      </div>
    </div>

    <!-- Stats Section -->
    <div class="space-y-2.5 mb-3.5">
      <div class="flex items-center gap-1.5">
        <CheckCircle class="w-4 h-4 text-green-600" />
        <span class="text-brand-dark text-sm font-semibold">
          {{ data.responsibilities?.length }} responsibilities
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <CheckCircle class="w-4 h-4 text-green-600" />
        <span class="text-brand-dark text-sm font-semibold">
          {{ data.projects_count }} active projects
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <CheckCircle class="w-4 h-4 text-green-600" />
        <span class="text-brand-dark text-sm font-semibold">
          0 completed tasks
        </span>
      </div>
    </div>
    <div class="flex gap-1.5">
      <RouterLink
        :to="{ name: 'admin.team.detail', params: { id: data.id } }"
        class="btn-secondary flex-1 text-brand-dark text-sm font-semibold border border-[#DCDEDD] rounded-[8px] px-3.5 py-2.5 hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-1.5"
      >
        <Eye class="w-4 h-4" />
        <span>View</span>
      </RouterLink>
      <RouterLink
        :to="{ name: 'admin.team.edit', params: { id: data.id } }"
        class="btn-secondary flex-1 text-brand-dark text-sm font-semibold border border-[#DCDEDD] rounded-[8px] px-3.5 py-2.5 hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-1.5"
      >
        <Edit class="w-4 h-4" />
        <span>Edit</span>
      </RouterLink>
    </div>
  </div>
</template>
