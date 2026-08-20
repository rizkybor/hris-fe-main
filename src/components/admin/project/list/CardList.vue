<script setup>
import { computed } from "vue";
import { formatToClientTimezone } from "@/helpers/format";
import { can } from "@/helpers/permissionHelper";
import _ from "lodash";
import { Calendar, Crown, Edit, Eye, FileText, FolderKanban, WalletIcon, AlertTriangle, Trash2 } from "lucide-vue-next";
import { formatRupiah } from "@/utils/formatUtils";
import { getProjectHealth, PROJECT_HEALTH_BADGE_CLASS } from "@/utils/projectHealth";
import Avatar from "@/components/common/Avatar.vue";

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["delete"]);

const health = computed(() => getProjectHealth(props.data));

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

const getProgressColor = (progress) => {
  const value = progress ?? 0;
  if (value >= 100) return "bg-green-500";
  if (value >= 50) return "bg-blue-500";
  if (value > 0) return "bg-yellow-500";
  return "bg-gray-300";
};
</script>

<template>
  <div
    class="bg-white border border-[#DCDEDD] rounded-[16px] overflow-hidden hover:border-[#0C51D9] hover:shadow-lg transition-all duration-300 group"
  >
    <!-- Project Image with gradient overlay for badge legibility -->
    <div
      class="w-full h-32 sm:h-36 bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden"
    >
      <img
        v-if="data.photo"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        :src="data.photo"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <FolderKanban class="w-10 h-10 text-blue-300" />
      </div>
      <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent"></div>

      <div class="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
        <span
          class="px-2 py-0.5 rounded-md text-xs font-semibold shadow-sm"
          :class="getPriorityColor(data.priority)"
        >
          {{ _.capitalize(data.priority) }}
        </span>
        <span
          class="px-2 py-0.5 rounded-md text-xs font-semibold shadow-sm"
          :class="getStatusColor(data.status)"
        >
          {{ _.capitalize(data.status) }}
        </span>
      </div>
    </div>

    <div class="p-3.5 sm:p-4">
      <!-- Title row with leader avatar inline -->
      <div class="flex items-start justify-between gap-2.5 mb-3">
        <div class="flex-1 min-w-0">
          <h4 class="text-brand-dark text-base font-bold mb-1 truncate">
            {{ data.name }}
          </h4>
          <p class="text-brand-light text-xs line-clamp-2">
            {{ data.description }}
          </p>
        </div>
        <div v-if="data.leader" class="relative shrink-0" :title="`${data.leader?.user?.name} · Leader`">
          <Avatar
            :src="data.leader?.user?.profile_photo"
            :alt="data.leader?.user?.name"
            size="w-9 h-9"
            icon-size="w-4 h-4"
          />
          <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-100 border-2 border-white rounded-full flex items-center justify-center">
            <Crown class="w-2.5 h-2.5 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Progress -->
      <div class="mb-3">
        <div class="flex items-center justify-between text-xs mb-1.5">
          <span class="text-brand-light">Progress</span>
          <span class="text-brand-dark font-semibold">{{ data.progress ?? 0 }}%</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-1.5">
          <div
            class="h-1.5 rounded-full transition-all duration-300"
            :class="getProgressColor(data.progress)"
            :style="{ width: `${data.progress ?? 0}%` }"
          ></div>
        </div>
        <div
          v-if="health && health.level !== 'on-track'"
          class="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md text-xs font-semibold w-fit"
          :class="PROJECT_HEALTH_BADGE_CLASS[health.level]"
        >
          <AlertTriangle class="w-3.5 h-3.5" />
          <span>
            {{ health.label }} &middot;
            {{ health.daysRemaining >= 0 ? `${health.daysRemaining}d left` : `${Math.abs(health.daysRemaining)}d overdue` }}
          </span>
        </div>
      </div>

      <!-- Meta info row: budget pill + team/date, unified compact style -->
      <div class="flex flex-wrap items-center gap-1.5 mb-3.5">
        <span
          v-if="data.budget"
          class="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-semibold"
        >
          <WalletIcon class="w-3 h-3" />
          {{ formatRupiah(data.budget) }}
        </span>
        <span class="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 rounded-md text-[11px] font-medium truncate max-w-full">
          <FileText class="w-3 h-3 shrink-0" />
          <span v-if="data.teams.length > 0" class="truncate">{{ data.teams.map((team) => team.name).join(", ") }}</span>
          <span v-else-if="data.members?.length > 0" class="truncate">{{ data.members.map((member) => member.name).join(", ") }}</span>
          <span v-else>No teams</span>
        </span>
        <span class="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 rounded-md text-[11px] font-medium">
          <Calendar class="w-3 h-3 shrink-0" />
          {{ formatToClientTimezone(data.start_date) }} - {{ data.end_date ? formatToClientTimezone(data.end_date) : "N/A" }}
        </span>
      </div>

      <!-- Actions: primary View CTA + de-emphasized icon actions -->
      <div class="flex items-center gap-2 pt-3 border-t border-[#DCDEDD]">
        <RouterLink
          :to="{ name: 'admin.projects.detail', params: { id: data.id } }"
          class="btn-primary flex-1 rounded-[8px] border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow transition-all duration-300 px-3 py-2 flex items-center justify-center gap-1.5"
        >
          <Eye class="w-3.5 h-3.5 text-white" />
          <span class="text-brand-white text-xs font-semibold">View Details</span>
        </RouterLink>
        <RouterLink
          :to="{ name: 'admin.projects.edit', params: { id: data.id } }"
          class="w-8 h-8 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300"
          v-if="can('project-edit')"
          title="Edit"
        >
          <Edit class="w-3.5 h-3.5 text-gray-600" />
        </RouterLink>
        <button
          type="button"
          v-if="can('project-delete')"
          @click="emit('delete', data)"
          class="w-8 h-8 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-red-400 hover:bg-red-50 group/delete transition-all duration-300"
          title="Delete"
        >
          <Trash2 class="w-3.5 h-3.5 text-gray-500 group-hover/delete:text-red-600" />
        </button>
      </div>
    </div>
  </div>
</template>
