<script setup>
import Statistic from "@/components/admin/team/Statistic.vue";
import CardList from "@/components/admin/team/CardList.vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import { useTeamStore } from "@/stores/team";
import { useOptionStore } from "@/stores/option";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";
import { debounce } from "lodash";
import {
  Upload,
  Users,
  SearchIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  BuildingIcon,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";

const teamStore = useTeamStore();
const { teams, meta, loading, success } = storeToRefs(teamStore);
const { fetchTeamsPaginated } = teamStore;

const optionStore = useOptionStore();
const { departments } = storeToRefs(optionStore);
const { fetchDepartments } = optionStore;

const serverOptions = ref({
  page: 1,
  row_per_page: 10,
});

const filters = ref({
  search: null,
  status: "",
  department: "",
});

const fetchData = async () => {
  await fetchTeamsPaginated({
    ...serverOptions.value,
    ...filters.value,
  });
};

onMounted(async () => {
  await fetchDepartments();
  fetchData();
});

watch(
  filters,
  debounce(() => {
    serverOptions.value.page = 1; // Reset to first page when filtering
    fetchData();
  }, 300),
  { deep: true }
);

const handlePageChange = (page) => {
  serverOptions.value.page = page;
  fetchData();
};

const handlePerPageChange = (perPage) => {
  serverOptions.value.row_per_page = perPage;
  serverOptions.value.page = 1;
  fetchData();
};
</script>

<template>
  <Statistic />

  <!-- Search Section -->
  <div class="bg-white border border-[#DCDEDD] rounded-[20px] mb-6 p-4">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
    >
      <!-- Search Bar -->
      <div class="flex-1 relative">
        <div
          class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
        >
          <SearchIcon class="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
          placeholder="Search teams by name, lead, status..."
          v-model="filters.search"
        />
      </div>

      <!-- Filter Buttons -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
        <!-- Status Filter -->
        <div class="relative w-full sm:w-auto">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <CheckCircleIcon class="h-4 w-4 text-gray-400" />
          </div>
          <select
            class="w-full sm:w-auto pl-10 pr-8 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 bg-white appearance-none font-semibold"
            v-model="filters.status"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="forming">Forming</option>
            <option value="planning">Planning</option>
            <option value="dormant">Dormant</option>
          </select>
          <div
            class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
          >
            <ChevronDownIcon class="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <!-- Department Filter -->
        <div class="relative w-full sm:w-auto">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <BuildingIcon class="h-4 w-4 text-gray-400" />
          </div>
          <select
            class="w-full sm:w-auto pl-10 pr-8 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 bg-white appearance-none font-semibold"
            v-model="filters.department"
          >
            <option value="">All Departments</option>
            <option
              v-for="dept in departments"
              :key="dept.value"
              :value="dept.value"
            >
              {{ dept.label }}
            </option>
          </select>
          <div
            class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
          >
            <ChevronDownIcon class="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <Alert type="success" :title="success" :show="success" />

  <!-- Team List Section -->
  <div class="bg-white border border-[#DCDEDD] rounded-[20px] mb-6 p-4 sm:p-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h3 class="text-brand-dark text-xl font-bold">All Teams</h3>
        <p class="text-brand-light text-sm font-normal mt-1">
          Showing {{ meta.from }} - {{ meta.to }} of {{ meta.total }} teams
        </p>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
        <button
          class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-3 flex items-center gap-2 w-full sm:w-auto"
        >
          <Upload class="w-4 h-4 text-gray-600" />
          <span class="text-brand-dark text-sm font-semibold">Import CSV</span>
        </button>
        <RouterLink
          :to="{ name: 'admin.team.create' }"
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2 w-full sm:w-auto"
        >
          <Users class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Add Team</span>
        </RouterLink>
      </div>
    </div>

    <!-- Teams Grid -->
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6"
      v-if="teams.length > 0"
    >
      <CardList v-for="team in teams" :key="team.id" :data="team" />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <p class="text-gray-500 text-sm">No teams found</p>
    </div>

    <!-- Pagination -->
    <Pagination
      :meta="meta"
      :loading="loading"
      @page-change="handlePageChange"
      @per-page-change="handlePerPageChange"
    />
  </div>
</template>
