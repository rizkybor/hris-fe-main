<script setup>
import { formatToClientTimezone } from "@/helpers/format";
import { can } from "@/helpers/permissionHelper";
import _ from "lodash";
import { Calendar, Crown, Edit, Eye, FileText, User } from "lucide-vue-next";

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const getPriorityColor = (priority) => {
  const priorityConfig = {
    high: "bg-red-100 text-red-600",
    medium: "bg-yellow-100 text-yellow-600",
    low: "bg-green-100 text-green-600",
  };
  return priorityConfig[priority] || priorityConfig["medium"];
};

const getStatusColor = (status) => {
  const statusConfig = {
    active: "bg-[#EBF8FF] text-[#1E40AF]",
    completed: "bg-[#F0FDF4] text-[#166534]",
    "on-hold": "bg-[#FEF3C7] text-[#92400E]",
    overdue: "bg-[#FEE2E2] text-[#991B1B]",
  };
  return statusConfig[status] || "bg-gray-100 text-gray-500";
};
</script>

<template>
  <div
    class="border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-4"
  >
    <!-- Project Image -->
    <div
      class="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden rounded-[12px] mb-4"
    >
      <img
        class="w-full h-full object-cover rounded-[12px]"
        :src="data.photo"
      />
      <!-- Priority Badge Overlay -->
      <div
        class="absolute bottom-2 left-2 px-2 py-1 rounded-md text-xs font-semibold"
        :class="getPriorityColor(data.priority)"
      >
        <span>{{ _.capitalize(data.priority) }}</span>
      </div>
      <!-- Status Badge Overlay -->
      <div
        class="absolute bottom-2 right-2 px-2 py-1 rounded-md text-xs font-semibold"
        :class="getStatusColor(data.status)"
      >
        {{ _.capitalize(data.status) }}
      </div>
    </div>
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <h4 class="text-brand-dark text-lg font-bold mb-2">
          {{ data.name }}
        </h4>
        <p class="text-brand-light text-sm line-clamp-2 mb-1">
          {{ data.description }}
        </p>
      </div>
    </div>

    <div class="border-t border-[#DCDEDD] pt-4 mb-4" v-if="data.leader">
      <div class="flex items-center gap-3">
        <img
          :src="data.leader?.user?.profile_photo"
          class="w-10 h-10 rounded-full object-cover"
          v-if="data.leader?.user?.profile_photo"
        />

        <div
          class="w-10 h-10 rounded-[12px] flex items-center justify-center bg-gray-100"
          v-else
        >
          <User class="w-5 h-5 text-gray-400" />
        </div>

        <div class="flex-1">
          <h5 class="text-brand-dark text-sm font-semibold">
            {{ data.leader?.user?.name }}
          </h5>
          <p class="text-brand-light text-xs">
            {{ data.leader?.job_information?.job_title }}
          </p>
        </div>
        <div
          class="px-2 py-1 bg-green-50 border border-green-200 rounded-[6px] flex items-center gap-1"
        >
          <Crown class="w-3 h-3 text-green-600" />
          <span class="text-green-700 text-xs font-medium">Leader</span>
        </div>
      </div>
      <div class="border-b border-[#DCDEDD] pb-4"></div>
    </div>

    <div class="mb-4">
      <div class="flex items-center justify-between text-sm mb-2">
        <span class="text-brand-light">Progress</span>
        <span class="text-brand-dark font-semibold">{{ data.progress }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div class="h-2 rounded-full ${getProgressColor(data.progress)}"></div>
      </div>
    </div>

    <div class="space-y-2 mb-4">
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <FileText class="w-4 h-4" />
        <span v-if="data.teams.length > 0">{{
          data.teams.map((team) => team.name).join(", ")
        }}</span>
        <span v-else>No teams assigned</span>
      </div>
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <Calendar class="w-4 h-4" />
        <span>
          {{ formatToClientTimezone(data.start_date) }} -
          {{ data.end_date ? formatToClientTimezone(data.end_date) : "N/A" }}
        </span>
      </div>
    </div>

    <div class="flex gap-2">
      <RouterLink
        :to="{ name: 'admin.projects.detail', params: { id: data.id } }"
        class="flex-1 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2 flex items-center justify-center gap-2"
      >
        <Eye class="w-4 h-4 text-gray-600" />
        <span class="text-brand-dark text-sm font-semibold">View</span>
      </RouterLink>
      <RouterLink
        :to="{ name: 'admin.projects.edit', params: { id: data.id } }"
        class="flex-1 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2 flex items-center justify-center gap-2"
        v-if="can('project-edit')"
      >
        <Edit class="w-4 h-4 text-gray-600" />
        <span class="text-brand-dark text-sm font-semibold">Edit</span>
      </RouterLink>
    </div>
  </div>
</template>
