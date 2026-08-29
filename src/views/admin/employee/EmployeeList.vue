<script setup>
import Statisctics from "@/components/admin/employee/list/Statisctics.vue";
import CardList from "@/components/admin/employee/list/CardList.vue";
import { useEmployeeStore } from "@/stores/employee";
import { useOptionStore } from "@/stores/option";
import { storeToRefs } from "pinia";
import { ref, onMounted, watch } from "vue";
import { debounce } from "lodash-es";
import {
  Search,
  Building,
  Briefcase,
  CheckCircle,
  ChevronDown,
  Upload,
  UserPlus,
  AlertTriangle,
} from "lucide-vue-next";
import Pagination from "@/components/admin/team/Pagination.vue";
import { can } from "@/helpers/permissionHelper";
import Alert from "@/components/common/Alert.vue";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";

const employeeStore = useEmployeeStore();
const { employees, meta, loading, success } = storeToRefs(employeeStore);
const { fetchEmployeesPaginated, fetchContractAlerts } = employeeStore;

const contractAlerts = ref([]);
const showContractAlerts = ref(true);

const alertLabel = (row) => {
  const parts = [];
  if (row.probation_days_left !== null) {
    parts.push(`Probation berakhir dalam ${row.probation_days_left} hari`);
  }
  if (row.contract_days_left !== null) {
    parts.push(`Kontrak berakhir dalam ${row.contract_days_left} hari`);
  }
  return parts.join(" • ");
};

const optionStore = useOptionStore();
const { employmentTypes, jobStatuses } = storeToRefs(optionStore);
const { fetchEmploymentTypes, fetchJobStatuses } = optionStore;

const serverOptions = ref({
  page: 1,
  row_per_page: 10,
});

const filters = ref({
  search: null,
  type: "",
  status: "",
});

const fetchData = async () => {
  await fetchEmployeesPaginated({
    ...serverOptions.value,
    ...filters.value,
  });
};

onMounted(async () => {
  await fetchData();
  await fetchEmploymentTypes();
  await fetchJobStatuses();
  try {
    contractAlerts.value = await fetchContractAlerts();
  } catch (error) {
    console.error("Failed to fetch contract alerts:", error);
  }
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
  <div class="px-4 py-4">

  <Statisctics />

  <div
    v-if="showContractAlerts && contractAlerts.length > 0"
    class="bg-orange-50 border border-orange-200 rounded-[14px] p-4 mb-5"
  >
    <div class="flex items-start justify-between gap-3.5">
      <div class="flex items-start gap-2.5">
        <div class="w-10 h-10 bg-orange-100 rounded-[12px] flex items-center justify-center shrink-0">
          <AlertTriangle class="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h4 class="text-orange-900 font-bold text-sm mb-1">
            {{ contractAlerts.length }} karyawan akan habis masa kontrak/probation dalam 30 hari
          </h4>
          <ul class="space-y-1">
            <li
              v-for="row in contractAlerts"
              :key="row.employee_id"
              class="text-orange-800 text-xs"
            >
              <span class="font-semibold">{{ row.employee_name }}</span>
              ({{ row.job_title }}) — {{ alertLabel(row) }}
            </li>
          </ul>
        </div>
      </div>
      <button
        @click="showContractAlerts = false"
        class="text-orange-500 hover:text-orange-700 text-xs font-semibold shrink-0"
      >
        Tutup
      </button>
    </div>
  </div>

 

  <Alert type="success" :title="success" :show="success" />

  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] mb-5 p-4">
    <!-- Section Cards -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 mb-5">
      <div>
        <h3
          class="text-[#0C1C3C] font-['Plus_Jakarta_Sans'] text-base font-bold"
        >
          All Employees
        </h3>
        <p
          class="text-[#6B7280] font-['Plus_Jakarta_Sans'] text-[14px] font-normal mt-1"
        >
          Showing {{ meta.from }} - {{ meta.to }} of {{ meta.total }} employees
        </p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-[10px]">
        <button
          class="bg-white w-full sm:w-auto border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3.5 py-2.5 flex items-center justify-center gap-1.5"
        >
          <Upload class="w-4 h-4 text-gray-600" />
          <span class="text-brand-dark text-sm font-semibold">Import CSV</span>
        </button>
        <RouterLink
          :to="{ name: 'admin.employees.create' }"
          class="w-full sm:w-auto justify-center btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5"
          v-if="can('employee-create')"
        >
          <UserPlus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold"
            >Add Employee</span
          >
        </RouterLink>
      </div>
    </div>

         <!-- Search Section -->
  <div class="bg-slate-50 rounded-[14px] mb-5">
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5"
    >
      <!-- Search Bar -->
      <div class="flex-1 relative">
        <div
          class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
        >
          <Search class="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300"
          placeholder="Search employees by name, department, role..."
          v-model="filters.search"
        />
      </div>

      <!-- Filter and Action Buttons -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <!-- Type Filter -->
        <div class="relative w-full sm:w-auto">
          <div
            class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
          >
            <Briefcase class="h-4 w-4 text-gray-400" />
          </div>
          <select
            class="w-full sm:w-auto pl-8 pr-6 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 bg-white appearance-none"
            v-model="filters.type"
          >
            <option value="">All Types</option>
            <option
              v-for="employmentType in employmentTypes"
              :key="employmentType.value"
              :value="employmentType.value"
            >
              {{ employmentType.label }}
            </option>
          </select>
          <div
            class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none"
          >
            <ChevronDown class="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <!-- Status Filter -->
        <div class="relative w-full sm:w-auto">
          <div
            class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
          >
            <CheckCircle class="h-4 w-4 text-gray-400" />
          </div>
          <select
            class="w-full sm:w-auto pl-8 pr-6 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 bg-white appearance-none"
            v-model="filters.status"
          >
            <option value="">All Status</option>
            <option
              v-for="jobStatus in jobStatuses"
              :key="jobStatus.value"
              :value="jobStatus.value"
            >
              {{ jobStatus.label }}
            </option>
          </select>
          <div
            class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none"
          >
            <ChevronDown class="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Employee Grid -->
    <SkeletonCardGrid
      v-if="loading"
      :count="8"
      cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      class="mb-5"
    />

    <div
      v-else-if="employees.length === 0"
      class="text-center py-12 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD] mb-5"
    >
      <p class="text-sm font-semibold">No employees found</p>
    </div>

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mb-5"
    >
      <CardList
        v-for="employee in employees"
        :key="employee.id"
        :data="employee"
      />
    </div>

    <!-- Pagination -->
    <Pagination
      :meta="meta"
      :loading="loading"
      @page-change="handlePageChange"
      @per-page-change="handlePerPageChange"
    />
  </div>
   </div>
</template>
