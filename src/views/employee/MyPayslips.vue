<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { usePayrollStore } from "@/stores/payroll";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { debounce } from "lodash";
import {
  Search,
  Download,
  Eye,
  Calendar,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-vue-next";
import Pagination from "@/components/admin/team/Pagination.vue";

const router = useRouter();
const payrollStore = usePayrollStore();
const { payslips, meta, loading } = storeToRefs(payrollStore);
const { fetchMyPayslips, downloadPayslip } = payrollStore;

const serverOptions = ref({
  page: 1,
  row_per_page: 12,
});

const filters = ref({
  search: null,
  year: new Date().getFullYear(),
});

const fetchData = async () => {
  await fetchMyPayslips({
    ...serverOptions.value,
    ...filters.value,
  });
};

onMounted(async () => {
  await fetchData();
});

watch(
  filters,
  debounce(() => {
    serverOptions.value.page = 1;
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

const handleDownload = async (id) => {
  try {
    const blob = await downloadPayslip(id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payslip-${id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading payslip:", error);
  }
};

const viewDetails = (id) => {
  router.push({ name: "employee.payslips.detail", params: { id } });
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
  });
};

const totalEarnings = computed(() => {
  return payslips.value.reduce((sum, slip) => sum + (slip.gross_salary || 0), 0);
});

const totalDeductions = computed(() => {
  return payslips.value.reduce(
    (sum, slip) => sum + (slip.total_deductions || 0),
    0
  );
});
</script>

<template>
  <div>
    <!-- Header Section -->
    <div class="mb-6">
      <h2 class="text-[#0C1C3C] font-bold text-2xl mb-2">My Payslips</h2>
      <p class="text-gray-600">View and download your salary payslips</p>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div
        class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[20px] p-6 text-white"
      >
        <div class="flex items-center justify-between mb-3">
          <div
            class="w-12 h-12 bg-white/20 rounded-[16px] flex items-center justify-center backdrop-blur-sm"
          >
            <FileText class="w-6 h-6" />
          </div>
        </div>
        <p class="text-white/80 text-sm font-medium mb-2">Total Payslips</p>
        <p class="text-3xl font-extrabold">{{ meta.total || 0 }}</p>
      </div>

      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#10B981] hover:border-2 transition-all duration-300 p-6"
      >
        <div class="flex items-center justify-between mb-3">
          <div
            class="w-12 h-12 bg-green-50 rounded-[16px] flex items-center justify-center"
          >
            <ArrowUpRight class="w-6 h-6 text-green-600" />
          </div>
        </div>
        <p class="text-brand-dark text-sm font-medium mb-2">Total Earnings</p>
        <p class="text-brand-dark text-xl font-extrabold">
          {{ formatCurrency(totalEarnings) }}
        </p>
        <p class="text-success text-sm font-medium mt-1">This year</p>
      </div>

      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#EF4444] hover:border-2 transition-all duration-300 p-6"
      >
        <div class="flex items-center justify-between mb-3">
          <div
            class="w-12 h-12 bg-red-50 rounded-[16px] flex items-center justify-center"
          >
            <ArrowDownRight class="w-6 h-6 text-red-600" />
          </div>
        </div>
        <p class="text-brand-dark text-sm font-medium mb-2">Total Deductions</p>
        <p class="text-brand-dark text-xl font-extrabold">
          {{ formatCurrency(totalDeductions) }}
        </p>
        <p class="text-danger text-sm font-medium mt-1">This year</p>
      </div>
    </div>

    <!-- Search Section -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] mb-6 p-4">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300"
            placeholder="Search payslips by month or year..."
            v-model="filters.search"
          />
        </div>

        <select
          v-model.number="filters.year"
          class="px-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300"
        >
          <option :value="new Date().getFullYear()">
            {{ new Date().getFullYear() }}
          </option>
          <option :value="new Date().getFullYear() - 1">
            {{ new Date().getFullYear() - 1 }}
          </option>
          <option :value="new Date().getFullYear() - 2">
            {{ new Date().getFullYear() - 2 }}
          </option>
        </select>
      </div>
    </div>

    <!-- Payslips Grid -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5 mb-6">
      <div class="mb-6">
        <h3 class="text-[#0C1C3C] font-bold text-xl">All Payslips</h3>
        <p class="text-gray-600 text-sm mt-1">
          Showing {{ meta.from }} - {{ meta.to }} of {{ meta.total }} payslips
        </p>
      </div>

      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6"
      >
        <div
          v-for="payslip in payslips"
          :key="payslip.id"
          class="border border-[#DCDEDD] rounded-[16px] p-5 hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 cursor-pointer group"
          @click="viewDetails(payslip.id)"
        >
          <div class="flex items-start justify-between mb-4">
            <div
              class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center group-hover:bg-blue-100 transition-all duration-300"
            >
              <FileText class="w-6 h-6 text-blue-600" />
            </div>
            <span
              class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full"
            >
              Paid
            </span>
          </div>

          <div class="mb-4">
            <div class="flex items-center gap-2 mb-2">
              <Calendar class="w-4 h-4 text-gray-400" />
              <p class="text-brand-dark font-bold">{{ formatDate(payslip.period) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <DollarSign class="w-4 h-4 text-gray-400" />
              <p class="text-brand-dark text-xl font-extrabold">
                {{ formatCurrency(payslip.net_salary) }}
              </p>
            </div>
          </div>

          <div class="pt-4 border-t border-gray-200 flex items-center gap-2">
            <button
              @click.stop="viewDetails(payslip.id)"
              class="flex-1 px-3 py-2 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-semibold"
            >
              <Eye class="w-4 h-4" />
              View
            </button>
            <button
              @click.stop="handleDownload(payslip.id)"
              class="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-[8px] hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-semibold"
            >
              <Download class="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="!loading && payslips.length === 0"
        class="text-center py-12 text-gray-500"
      >
        <FileText class="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p class="text-lg font-semibold">No payslips found</p>
        <p class="text-sm">Your payslips will appear here once they are processed</p>
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
