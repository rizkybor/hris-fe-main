<script setup>
import { ref, onMounted, computed } from "vue";
import { usePayrollStore } from "@/stores/payroll";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  DollarSign,
  UserCheck,
  Clock,
  Banknote,
  Plus,
  FileText,
  Download,
  Settings,
  TrendingUp,
  Star,
  Calendar,
  Users,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";

const router = useRouter();
const payrollStore = usePayrollStore();
const { payrolls, statistics, loading, success } = storeToRefs(payrollStore);

onMounted(async () => {
  await payrollStore.fetchStatistics();
  await payrollStore.fetchPayrolls({ page: 1, row_per_page: 10 });
});


const formatDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
  });
};

const formatProcessedDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getStatusColor = (status) => {
  const colors = {
    draft: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    finalized: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  return colors[status] || colors.draft;
};

const viewDetails = (id) => {
  router.push({ name: "admin.payroll.detail", params: { id } });
};
</script>

<template>
  <div>
    <!-- Stats Layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Total Payroll Amount Card (spans 2 rows on the left) -->
      <div class="main-card lg:row-span-2 rounded-[20px] border border-[#0B1042] relative overflow-hidden p-5">
        <div class="flex flex-col justify-center h-full relative z-10">
          <!-- Trending Badge -->
          <div class="flex items-center gap-2 mb-3">
            <div class="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              <TrendingUp class="w-3 h-3 text-white" />
              <span class="text-brand-white text-xs font-semibold">+5.2% this month</span>
            </div>
          </div>

          <div class="flex items-center justify-between mb-4">
            <div class="flex-1 min-w-0 pr-2">
              <p class="text-brand-white-90 text-sm font-medium">
                Total Payroll Amount
              </p>
              <p class="text-brand-white text-4xl lg:text-5xl font-extrabold leading-none my-4">
                {{ loading ? "..." : formatRupiahCompact(statistics.total_amount) }}
              </p>
              <p class="text-brand-white-80 text-base font-normal">
                Monthly compensation
              </p>
            </div>
            <div class="w-16 h-16 bg-white/20 rounded-[20px] flex items-center justify-center flex-shrink-0">
              <DollarSign class="w-8 h-8 text-white" />
            </div>
          </div>

          <!-- Additional Info -->
          <div class="flex items-center gap-3 mt-auto">
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span class="text-brand-white-70 text-xs font-normal">All Departments</span>
            </div>
            <div class="flex items-center gap-1">
              <Star class="w-3 h-3 text-white opacity-70" />
              <span class="text-brand-white-70 text-xs font-normal">On Schedule</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 1 Stats Cards -->
      <!-- Employees Paid -->
      <div
        class="stats-card bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-brand-dark text-sm font-medium">Employees Paid</p>
            <p class="text-brand-dark text-3xl font-extrabold leading-tight my-2 truncate">
              {{ loading ? "..." : statistics.total_payroll }}
            </p>
            <p class="text-success text-sm font-medium">This month</p>
          </div>
          <div class="w-12 h-12 bg-green-50 rounded-[16px] flex items-center justify-center flex-shrink-0">
            <UserCheck class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Pending Payments -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-brand-dark text-sm font-medium">Pending Payments</p>
            <p class="text-brand-dark text-3xl font-extrabold leading-tight my-2 truncate">
              {{ loading ? "..." : statistics.pending_review }}
            </p>
            <p class="text-danger text-sm font-medium">Need approval</p>
          </div>
          <div class="w-12 h-12 bg-red-50 rounded-[16px] flex items-center justify-center flex-shrink-0">
            <Clock class="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>

      <!-- Quick Actions Card (spans 2 rows on the right) -->
      <div
        class="lg:row-span-2 bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5">
        <h3 class="text-brand-dark text-lg font-bold mb-4">Payroll Actions</h3>
        <div class="space-y-3">
          <RouterLink :to="{ name: 'admin.payroll.create' }"
            class="btn-secondary w-full text-left rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2">
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Create New Payroll</span>
          </RouterLink>

          <button
            class="btn-secondary w-full text-left border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 hover:rounded-[12px] focus:border-[#0C51D9] focus:border-2 focus:rounded-[12px] focus:bg-white transition-all duration-300 px-4 py-3 flex items-center gap-2">
            <FileText class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-medium">Generate Reports</span>
          </button>

          <button
            class="btn-secondary w-full text-left border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 hover:rounded-[12px] focus:border-[#0C51D9] focus:border-2 focus:rounded-[12px] focus:bg-white transition-all duration-300 px-4 py-3 flex items-center gap-2">
            <Download class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-medium">Export Data</span>
          </button>

          <button
            class="btn-secondary w-full text-left border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 hover:rounded-[12px] focus:border-[#0C51D9] focus:border-2 focus:rounded-[12px] focus:bg-white transition-all duration-300 px-4 py-3 flex items-center gap-2">
            <Settings class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-medium">Payroll Settings</span>
          </button>
        </div>
      </div>

      <!-- Row 2 Stats Cards -->
      <!-- Average Salary -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-brand-dark text-sm font-medium">Average Salary</p>
            <p class="text-brand-dark text-2xl lg:text-3xl font-extrabold leading-tight my-2">
              {{ loading ? "..." : formatRupiahCompact(statistics.average_salary) }}
            </p>
            <p class="text-success text-sm font-medium">
              +{{ formatRupiahCompact(1900000) }} from last month
            </p>
          </div>
          <div class="w-12 h-12 bg-blue-50 rounded-[16px] flex items-center justify-center flex-shrink-0">
            <Banknote class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <!-- Overtime Hours -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-brand-dark text-sm font-medium">Finalized</p>
            <p class="text-brand-dark text-3xl font-extrabold leading-tight my-2 truncate">
              {{ loading ? "..." : statistics.finalized }}
            </p>
            <p class="text-purple-600 text-sm font-medium">This month</p>
          </div>
          <div class="w-12 h-12 bg-purple-50 rounded-[16px] flex items-center justify-center flex-shrink-0">
            <Clock class="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>

    <Alert type="success" :title="success" :show="success" />

    <!-- Monthly Payroll Periods -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-brand-dark text-lg font-bold">Monthly Payroll Periods</h3>
      </div>
      <div class="space-y-4">
        <div v-for="payroll in payrolls" :key="payroll.id"
          class="flex items-center gap-4 p-4 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300">
          <div class="w-16 h-16 relative flex items-center justify-center rounded-[12px] overflow-hidden">
            <!-- Background -->
            <div class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-[12px]"></div>
            <!-- Icon -->
            <Calendar class="w-8 h-8 text-white relative z-10" />
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <p class="text-brand-dark text-lg font-bold">
                {{ formatDate(payroll.period) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Users class="w-4 h-4 text-gray-600" />
              <p class="text-brand-dark text-sm font-normal">
                {{ payroll.employee_count || 0 }} employees • All departments
              </p>
            </div>
            <p class="text-brand-light text-xs font-normal mt-1">
              Processed on {{ formatProcessedDate(payroll.created_at) }}
            </p>
          </div>
          <div class="flex flex-col justify-center items-center">
            <span :class="[
              'px-2 py-1 rounded-md text-xs font-semibold',
              getStatusColor(payroll.status),
            ]">
              {{ payroll.status }}
            </span>
          </div>
          <div class="flex-1 flex flex-col justify-center items-center">
            <div class="text-left">
              <p class="text-brand-dark text-lg font-bold">
                {{ formatRupiahCompact(payroll.total_amount) }}
              </p>
              <p class="text-brand-light text-sm font-normal">Total payroll</p>
            </div>
          </div>
          <button @click="viewDetails(payroll.id)"
            class="btn-details border border-[#DCDEDD] rounded-xl hover:ring-2 hover:ring-[#0C51D9] hover:text-[#0C51D9] transition-all duration-300 py-[14px] px-5 flex items-center justify-center">
            <span class="text-brand-dark text-base font-medium">Details</span>
          </button>
        </div>

        <div v-if="!loading && payrolls.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg font-semibold">No payroll data found</p>
          <p class="text-sm">Create your first payroll to get started</p>
        </div>
      </div>
    </div>
  </div>
</template>
