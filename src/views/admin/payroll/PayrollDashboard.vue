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
  TrendingUp,
  Star,
  Calendar,
  Users,
  Eye,
  EyeOff,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";

const router = useRouter();
const payrollStore = usePayrollStore();
const { payrolls, statistics, loading, success } = storeToRefs(payrollStore);

onMounted(async () => {
  await payrollStore.fetchStatistics();
  await payrollStore.fetchPayrolls({ page: 1, row_per_page: 10 });
});

// Hidden by default -- payroll amounts are sensitive, revealed only on demand.
const isTotalAmountVisible = ref(false);
const isAverageSalaryVisible = ref(false);

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
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
  };
  return colors[status] || colors.pending;
};

const viewDetails = (id) => {
  router.push({ name: "admin.payroll.detail", params: { id } });
};
</script>

<template>
  <div class="px-4 py-4">
    <!-- Stats Layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Total Payroll Amount Card (spans 2 rows on the left) -->
      <div
        class="main-card lg:row-span-2 rounded-[14px] border border-[#0B1042] relative overflow-hidden p-5"
      >
        <div class="flex flex-col justify-center h-full relative z-10">
          <!-- Trending Badge -->
          <div class="flex items-center gap-2 mb-3">
            <div
              class="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm"
            >
              <TrendingUp class="w-3 h-3 text-white" />
              <span class="text-brand-white text-xs font-semibold">
                {{ (statistics.salary_change ?? 0) >= 0 ? "+" : ""
                }}{{ statistics.salary_change ?? 0 }}% this month
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between mb-4">
            <div class="flex-1 min-w-0 pr-2">
              <p class="text-brand-white-90 text-xs font-medium">
                Total Payroll Amount
              </p>
              <div class="flex items-center gap-2 my-3">
                <Skeleton
                  v-if="loading"
                  dark
                  width="120px"
                  height="2.5rem"
                  rounded="8px"
                />

                <p
                  v-else-if="isTotalAmountVisible"
                  class="text-brand-white text-xl font-bold leading-none"
                >
                  {{ formatRupiahCompact(statistics.total_amount) }}
                </p>

                <p
                  v-else
                  class="text-brand-white text-xl font-bold leading-none tracking-widest"
                >
                  Rp ••••••
                </p>

                <button
                  type="button"
                  @click="isTotalAmountVisible = !isTotalAmountVisible"
                  class="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors shrink-0"
                  :title="isTotalAmountVisible ? 'Hide amount' : 'Show amount'"
                >
                  <Eye v-if="!isTotalAmountVisible" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
              <p class="text-brand-white-80 text-sm font-normal">
                Monthly compensation
              </p>
            </div>
            <div class="flex flex-col items-center gap-2 flex-shrink-0">
              <div
                class="w-21 h-21 p-4 bg-white rounded-[14px] flex items-center justify-center"
              >
                <DollarSign class="w-21 h-21 text-white/20" />
              </div>
            </div>
          </div>

          <!-- Additional Info -->
          <div class="flex items-center gap-3 mt-auto">
            <div class="flex items-center gap-1">
              <div
                class="w-2 h-2 bg-green-400 rounded-full animate-pulse"
              ></div>
              <span class="text-brand-white-70 text-[11px] font-normal"
                >All Departments</span
              >
            </div>
            <div class="flex items-center gap-1">
              <Star class="w-3 h-3 text-white opacity-70" />
              <span class="text-brand-white-70 text-[11px] font-normal"
                >On Schedule</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Row 1 Stats Cards -->
      <!-- Employees Paid -->
      <div
        class="stats-card bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-brand-dark text-xs font-medium">Employees Paid</p>
            <Skeleton
              v-if="loading"
              width="50px"
              height="1.5rem"
              rounded="6px"
              class="my-1.5"
            />
            <p
              v-else
              class="text-brand-dark text-2xl font-extrabold leading-tight my-1.5 truncate"
            >
              {{ statistics.total_payroll }}
            </p>
            <p class="text-success text-xs font-medium">This month</p>
          </div>
          <div
            class="w-10 h-10 bg-green-50 rounded-[10px] flex items-center justify-center flex-shrink-0"
          >
            <UserCheck class="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Pending Payments -->
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-brand-dark text-xs font-medium">Pending Payments</p>
            <Skeleton
              v-if="loading"
              width="50px"
              height="1.5rem"
              rounded="6px"
              class="my-1.5"
            />
            <p
              v-else
              class="text-brand-dark text-2xl font-extrabold leading-tight my-1.5 truncate"
            >
              {{ statistics.pending_review }}
            </p>
            <p class="text-danger text-xs font-medium">Need approval</p>
          </div>
          <div
            class="w-10 h-10 bg-red-50 rounded-[10px] flex items-center justify-center flex-shrink-0"
          >
            <Clock class="w-5 h-5 text-red-600" />
          </div>
        </div>
      </div>

      <!-- Quick Actions Card (spans 2 rows on the right) -->
      <div
        class="lg:row-span-2 bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <h3 class="text-brand-dark text-base font-bold mb-3.5">
          Payroll Actions
        </h3>
        <div class="space-y-3">
          <RouterLink
            v-if="can('payroll-create')"
            :to="{ name: 'admin.payroll.create' }"
            class="btn-secondary w-full text-left rounded-[10px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center gap-2"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-xs font-semibold"
              >Create New Payroll</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.report.dashboard' }"
            class="bg-white btn-secondary w-full text-left border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 px-3.5 py-2.5 flex items-center gap-2"
          >
            <FileText class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-xs font-medium"
              >Generate Reports</span
            >
          </RouterLink>
        </div>
      </div>

      <!-- Row 2 Stats Cards -->
      <!-- Average Salary -->
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-brand-dark text-xs font-medium">Average Salary</p>
            <Skeleton
              v-if="loading"
              width="80px"
              height="1.5rem"
              rounded="6px"
              class="my-1.5"
            />
            <p
              v-else-if="isAverageSalaryVisible"
              class="text-brand-dark text-xl lg:text-xl font-extrabold leading-tight my-1.5"
            >
              {{ formatRupiahCompact(statistics.average_salary) }}
            </p>
            <p
              v-else
              class="text-brand-dark text-xl lg:text-xl font-extrabold leading-tight my-1.5 tracking-widest"
            >
              Rp ••••••
            </p>
            <p class="text-success text-xs font-medium">Per employee</p>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              @click="isAverageSalaryVisible = !isAverageSalaryVisible"
              class="w-7 h-7 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
              :title="isAverageSalaryVisible ? 'Hide salary' : 'Show salary'"
            >
              <Eye v-if="!isAverageSalaryVisible" class="w-3.5 h-3.5" />
              <EyeOff v-else class="w-3.5 h-3.5" />
            </button>
            <div
              class="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center"
            >
              <Banknote class="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Overtime Hours -->
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-brand-dark text-xs font-medium">Finalized</p>
            <Skeleton
              v-if="loading"
              width="50px"
              height="1.5rem"
              rounded="6px"
              class="my-1.5"
            />
            <p
              v-else
              class="text-brand-dark text-2xl font-extrabold leading-tight my-1.5 truncate"
            >
              {{ statistics.finalized }}
            </p>
            <p class="text-purple-600 text-xs font-medium">This month</p>
          </div>
          <div
            class="w-10 h-10 bg-purple-50 rounded-[10px] flex items-center justify-center flex-shrink-0"
          >
            <Clock class="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>
    </div>

    <Alert type="success" :title="success" :show="success" />

    <!-- Monthly Payroll Periods -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5">
      <div class="flex items-center justify-between mb-3.5">
        <h3 class="text-brand-dark text-base font-bold">
          Monthly Payroll Periods
        </h3>
      </div>
      <SkeletonList v-if="loading" :rows="3" />

      <div v-else class="space-y-3.5">
        <div
          v-for="payroll in payrolls"
          :key="payroll.id"
          class="flex flex-col sm:flex-row sm:items-center gap-3.5 p-3.5 border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300"
        >
          <div class="flex items-center gap-3.5">
            <div
              class="w-12 h-12 shrink-0 relative flex items-center justify-center rounded-[10px] overflow-hidden"
            >
              <!-- Background -->
              <div
                class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-[10px]"
              ></div>
              <!-- Icon -->
              <Calendar class="w-6 h-6 text-white relative z-10" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <p class="text-brand-dark text-sm font-bold">
                  {{ formatDate(payroll.period) }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Users class="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <p class="text-brand-dark text-xs font-normal">
                  {{ payroll.employee_count || 0 }} employees • All departments
                </p>
              </div>
              <p class="text-brand-light text-[11px] font-normal mt-1">
                Processed on {{ formatProcessedDate(payroll.created_at) }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between gap-4 sm:flex-1">
            <div class="flex flex-col justify-center items-center shrink-0">
              <span
                :class="[
                  'px-2 py-0.5 rounded-md text-xs font-semibold',
                  getStatusColor(payroll.status),
                ]"
              >
                {{ payroll.status }}
              </span>
            </div>
            <div class="flex-1 flex flex-col justify-center items-center">
              <div class="text-left">
                <p class="text-brand-dark text-sm font-bold">
                  {{ formatRupiahCompact(payroll.total_amount) }}
                </p>
                <p class="text-brand-light text-xs font-normal">
                  Total payroll
                </p>
              </div>
            </div>
            <button
              @click="viewDetails(payroll.id)"
              class="btn-details shrink-0 border border-[#DCDEDD] rounded-xl hover:ring-2 hover:ring-[#0C51D9] hover:text-[#0C51D9] transition-all duration-300 py-2.5 px-4 flex items-center justify-center"
            >
              <span class="text-brand-dark text-sm font-medium">Details</span>
            </button>
          </div>
        </div>

        <div
          v-if="!loading && payrolls.length === 0"
          class="text-center py-12 text-gray-500"
        >
          <p class="text-base font-semibold">No payroll data found</p>
          <p class="text-xs">Create your first payroll to get started</p>
        </div>
      </div>
    </div>
  </div>
</template>
