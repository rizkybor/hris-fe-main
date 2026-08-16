<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useEmployeeStore } from "@/stores/employee";
import { useRouter } from "vue-router";
import { User } from "lucide-vue-next";
import { getTimeAgo } from "@/utils/dateUtils";
import { getSkillLevelBadgeClass } from "@/utils/badgeUtils";
import { storeToRefs } from "pinia";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const employeeStore = useEmployeeStore();
const { employees, loading } = storeToRefs(employeeStore);
const { fetchEmployees } = employeeStore;

const router = useRouter();

onMounted(() => {
  fetchEmployees({
    limit: 5,
  });
});

const goToEmployeeDetail = (id: number) => {
  router.push({ name: "admin.employees.detail", params: { id } });
};
</script>

<template>
  <!-- Latest Employees -->
  <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-4 sm:p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-brand-dark text-lg font-bold">Latest Employees</h3>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 5" :key="i" class="flex items-center gap-3">
        <Skeleton width="56px" height="56px" rounded="9999px" />
        <div class="flex-1 space-y-2">
          <Skeleton width="33%" height="16px" />
          <Skeleton width="50%" height="12px" />
        </div>
        <Skeleton width="80px" height="40px" rounded="12px" class="hidden sm:block" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!employees || employees.length === 0"
      class="text-center py-8"
    >
      <p class="text-gray-500 text-sm">No employees found</p>
    </div>

    <!-- Employee List -->
    <div v-else class="space-y-4">
      <div
        v-for="employee in employees"
        :key="employee.id"
        class="flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <img
          :src="employee.user?.profile_photo"
          :alt="employee.user?.name"
          class="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
          v-if="employee?.user?.profile_photo"
        />
        <div
          class="w-12 h-12 sm:w-20 sm:h-20 rounded-full flex items-center justify-center bg-gray-100"
          v-else
        >
          <User class="w-5 h-5 text-gray-400" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-brand-dark text-base sm:text-lg font-bold">
              {{ employee.user?.name || "Unknown" }}
            </p>
            <span
              v-if="employee.job_information?.skill_level"
              :class="
                getSkillLevelBadgeClass(employee.job_information.skill_level)
              "
              class="px-2 py-1 rounded-md text-xs font-semibold capitalize"
            >
              {{ employee.job_information.skill_level }}
            </span>
          </div>
          <p class="text-brand-dark text-xs sm:text-sm font-normal mt-1">
            {{ employee.job_information?.job_title || "N/A" }} •
            {{ getTimeAgo(employee.created_at) }}
          </p>
        </div>
        <button
          @click="goToEmployeeDetail(employee.id)"
          class="btn-details w-full sm:w-auto border border-[#DCDEDD] rounded-xl hover:ring-2 hover:ring-[#0C51D9] hover:text-[#0C51D9] transition-all duration-300 py-2 sm:py-[14px] px-3 sm:px-5 flex items-center justify-center"
        >
          <span class="text-brand-dark text-sm sm:text-base font-medium">Details</span>
        </button>
      </div>
    </div>
  </div>
</template>
