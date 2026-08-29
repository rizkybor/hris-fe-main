<script setup>
import { can } from "@/helpers/permissionHelper";
import { capitalize } from "lodash-es";
import { Building, User, Calendar, Eye, Edit } from "lucide-vue-next";
import { useRouter } from "vue-router";
import Avatar from "@/components/common/Avatar.vue";

const router = useRouter();

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const goToEdit = () => {
  router.push({ name: "admin.employees.edit", params: { id: props.data.id } });
};

const goToDetail = () => {
  router.push({
    name: "admin.employees.detail",
    params: { id: props.data.id },
  });
};
</script>

<template>
  <!-- Employee Card 1 -->
  <div
    class="bg-white border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-3.5"
  >
    <div class="flex items-start justify-between mb-2.5">
      <Avatar
        :src="data?.user?.profile_photo"
        :alt="data?.user?.name"
        size="w-9 h-9"
        icon-size="w-5 h-5"
      />
      <span
        class="px-1.5 py-1 rounded-md text-xs font-semibold bg-[#F0FDF4] text-[#166534]"
      >
        {{ capitalize(data?.job_information?.status) }}
      </span>
    </div>
    <div class="flex items-center justify-between mb-2.5">
      <div class="text-left">
        <h4
          class="text-[#0C1C3C] font-['Plus_Jakarta_Sans'] text-[16px] font-bold"
        >
          {{ data?.user?.name }}
        </h4>
        <p
          class="mt-1 text-[#6B7280] font-['Plus_Jakarta_Sans'] text-[14px] font-normal"
        >
          {{ capitalize(data?.job_information?.job_title) }}
        </p>
      </div>
      <span
        class="px-1.5 py-1 rounded-md text-xs font-semibold bg-[#EBF8FF] text-[#1E40AF]"
      >
        {{ capitalize(data?.job_information?.skill_level) }}
      </span>
    </div>

    <!-- Divider -->
    <div class="border-b border-[#DCDEDD] mb-2.5"></div>

    <!-- Employee Details -->
    <div class="space-y-1.5 mb-3.5">
      <div class="flex items-center gap-1.5 text-sm text-gray-500">
        <Building class="w-3.5 h-3.5" />
        <span>{{ capitalize(data?.job_information?.work_location) }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-sm text-gray-500">
        <User class="w-3.5 h-3.5" />
        <span>{{ capitalize(data?.gender) }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-sm text-gray-500">
        <Calendar class="w-3.5 h-3.5" />
        <span
          >{{ data?.job_information?.years_experience }} years experience</span
        >
      </div>
    </div>
    <div class="flex gap-1.5">
      <button
        @click="goToEdit"
        class="flex-1 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3.5 py-2.5 flex items-center justify-center gap-1.5"
        v-if="can('employee-edit')"
      >
        <Edit class="w-4 h-4 text-gray-600" />
        <span class="text-brand-dark text-sm font-semibold">Edit</span>
      </button>
      <button
        @click="goToDetail"
        class="flex-1 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3.5 py-2.5 flex items-center justify-center gap-1.5"
      >
        <Eye class="w-4 h-4 text-gray-600" />
        <span class="text-brand-dark text-sm font-semibold">View</span>
      </button>
    </div>
  </div>
</template>
