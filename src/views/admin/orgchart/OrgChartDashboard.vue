<script setup>
import { ref, onMounted } from "vue";
import { Network, Crown, User } from "lucide-vue-next";
import { useTeamStore } from "@/stores/team";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const teamStore = useTeamStore();
const departments = ref([]);
const loading = ref(true);

const departmentLabels = {
  development: "Development",
  design: "Design",
  marketing: "Marketing",
  sales: "Sales",
  support: "Support",
  management: "Management",
};

onMounted(async () => {
  try {
    departments.value = await teamStore.fetchOrgChart();
  } catch (error) {
    console.error("Failed to fetch org chart:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex items-center gap-3">
      <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
        <Network class="w-5 h-5 text-[#0C51D9]" />
      </div>
      <div>
        <h3 class="text-brand-dark text-lg font-bold">Struktur Organisasi</h3>
        <p class="text-brand-light text-sm">Departemen, tim, dan anggotanya</p>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <Skeleton v-for="i in 3" :key="i" height="140px" rounded="20px" />
    </div>

    <div v-else class="space-y-6">
      <div v-for="dept in departments" :key="dept.department" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <h4 class="text-brand-dark text-base font-bold mb-4 uppercase tracking-wide">
          {{ departmentLabels[dept.department] ?? dept.department }}
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="team in dept.teams" :key="team.id" class="border border-[#DCDEDD] rounded-[12px] p-4">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-[10px] flex items-center justify-center">
                <Crown class="w-4 h-4 text-white" />
              </div>
              <div>
                <p class="text-brand-dark text-sm font-bold">{{ team.name }}</p>
                <p class="text-brand-light text-xs">Lead: {{ team.lead ?? '-' }}</p>
              </div>
            </div>
            <div class="space-y-2">
              <div v-for="member in team.members" :key="member.employee_id" class="flex items-center gap-2 pl-2 border-l-2 border-gray-200">
                <User class="w-3.5 h-3.5 text-gray-400" />
                <div>
                  <p class="text-brand-dark text-xs font-medium">{{ member.name }}</p>
                  <p class="text-gray-400 text-xs">{{ member.job_title }}</p>
                </div>
              </div>
              <p v-if="team.members.length === 0" class="text-xs text-gray-400 pl-2">Belum ada anggota</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="departments.length === 0" class="bg-white border border-[#DCDEDD] rounded-[14px] p-10 text-center">
        <Network class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-brand-light text-sm">Belum ada tim aktif.</p>
      </div>
    </div>
  </div>
</template>
