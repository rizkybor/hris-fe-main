<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePayrollStore } from "@/stores/payroll";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Banknote,
  CalendarCheck,
  Search,
  Download,
  Send,
  CheckCircle,
  X,
} from "lucide-vue-next";
import { debounce } from "lodash";
import Pagination from "@/components/admin/payroll/Pagination.vue";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";

const route = useRoute();
const router = useRouter();
const payrollStore = usePayrollStore();

const payroll = ref(null);
const payrollStatistics = ref(null);
const employees = ref([]);
const pagination = ref({
  current_page: 1,
  per_page: 50,
  total: 0,
  last_page: 1,
  from: 0,
  to: 0,
});
const loading = ref(true);
const loadingStatistics = ref(true);
const loadingDetails = ref(false);
const searchQuery = ref("");
const departmentFilter = ref("");
const showMarkAsPaidModal = ref(false);
const paymentDate = ref(new Date().toISOString().split("T")[0]);
const markingAsPaid = ref(false);

const fetchPayrollSummary = async () => {
  try {
    loading.value = true;
    payroll.value = await payrollStore.fetchPayroll(route.params.id);
  } catch (error) {
    console.error("Error fetching payroll summary:", error);
  } finally {
    loading.value = false;
  }
};

const fetchPayrollStatistics = async () => {
  try {
    loadingStatistics.value = true;
    payrollStatistics.value = await payrollStore.fetchPayrollStatistics(route.params.id);
  } catch (error) {
    console.error("Error fetching payroll statistics:", error);
  } finally {
    loadingStatistics.value = false;
  }
};

const fetchPayrollDetails = async (page = 1) => {
  try {
    loadingDetails.value = true;

    // Build filter params
    const filterParams = {};
    if (searchQuery.value) {
      filterParams.search = searchQuery.value;
    }
    if (departmentFilter.value) {
      filterParams.position = departmentFilter.value;
    }

    const response = await payrollStore.fetchPayrollDetails(
      route.params.id,
      page,
      pagination.value.per_page,
      filterParams
    );

    // Map payroll_details to employees format
    employees.value =
      response.data?.map((detail) => ({
        id: detail.employee?.id,
        name: detail.employee?.user?.name || "N/A",
        employee_id: detail.employee?.code || detail.employee?.id,
        position: detail.employee?.job_information?.job_title || "N/A",
        department: detail.employee?.job_information?.team?.name || "N/A",
        profile_photo: detail.employee?.user?.profile_photo || null,
        total_work_days: 22, // Default working days
        attended_days: detail.attended_days || 0,
        sick_days: detail.sick_days || 0,
        absent_days: detail.absent_days || 0,
        basic_salary: parseFloat(detail.original_salary) || 0,
        deductions:
          parseFloat(detail.original_salary) -
          parseFloat(detail.final_salary) || 0,
        net_salary: parseFloat(detail.final_salary) || 0,
        status: payroll.value?.status === "paid" ? "paid" : "pending",
        notes: detail.notes,
        bank_name: detail.employee?.bank_information?.bank_name || "N/A",
        account_number:
          detail.employee?.bank_information?.account_number || "N/A",
        account_holder_name:
          detail.employee?.bank_information?.account_holder_name || "N/A",
      })) || [];

    // Update pagination meta from response
    if (response.meta) {
      pagination.value = {
        current_page: response.meta.current_page,
        last_page: response.meta.last_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        from: response.meta.from,
        to: response.meta.to,
      };
    }
  } catch (error) {
    console.error("Error fetching payroll details:", error);
  } finally {
    loadingDetails.value = false;
  }
};

const handlePageChange = (page) => {
  pagination.value.current_page = page;
  fetchPayrollDetails(page);
};

const handlePerPageChange = (perPage) => {
  pagination.value.per_page = perPage;
  pagination.value.current_page = 1;
  fetchPayrollDetails(1);
};

onMounted(async () => {
  await fetchPayrollSummary();
  await fetchPayrollStatistics();
  await fetchPayrollDetails(1);
});

// Server-side filtering is now handled by the API
const filteredEmployees = computed(() => employees.value);

// Watch for search query changes with debounce
watch(
  searchQuery,
  debounce(() => {
    pagination.value.current_page = 1;
    fetchPayrollDetails(1);
  }, 300)
);

// Watch for department filter changes
watch(departmentFilter, () => {
  pagination.value.current_page = 1;
  fetchPayrollDetails(1);
});


const getAttendancePercentage = (attendedDays, totalDays) => {
  return Math.round((attendedDays / totalDays) * 100);
};

const exportExcel = async () => {
  try {
    await payrollStore.exportExcel(route.params.id);
  } catch (error) {
    console.error("Error exporting Excel:", error);
    alert("Failed to export Excel file. Please try again.");
  }
};

const sendNotifications = () => {
  alert("Notifications sent successfully!");
};

const openMarkAsPaidModal = () => {
  paymentDate.value = new Date().toISOString().split("T")[0];
  showMarkAsPaidModal.value = true;
};

const closeMarkAsPaidModal = () => {
  showMarkAsPaidModal.value = false;
};

const handleMarkAsPaid = async () => {
  try {
    markingAsPaid.value = true;
    await payrollStore.markAsPaid(route.params.id, {
      payment_date: paymentDate.value,
    });

    // Refresh payroll data
    await fetchPayrollSummary();
    await fetchPayrollStatistics();
    await fetchPayrollDetails(pagination.value.current_page);

    closeMarkAsPaidModal();
    alert("Payroll marked as paid successfully!");
  } catch (error) {
    console.error("Error marking payroll as paid:", error);
    alert("Failed to mark payroll as paid. Please try again.");
  } finally {
    markingAsPaid.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <button @click="router.back()"
      class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2 flex items-center gap-2">
      <ArrowLeft class="w-4 h-4 text-gray-600" />
      <span class="text-brand-dark text-base font-semibold">Back</span>
    </button>

    <!-- Payroll Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Employees Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Total Employees</p>
            <p class="text-brand-dark text-3xl font-extrabold leading-tight my-2">
              {{ loadingStatistics ? "..." : (payrollStatistics?.total_employees || 0) }}
            </p>
            <p class="text-success text-sm font-medium">All departments</p>
          </div>
          <div class="w-14 h-14 bg-blue-50 rounded-[16px] flex items-center justify-center">
            <Users class="w-7 h-7 text-blue-600" />
          </div>
        </div>
      </div>

      <!-- Total Payroll Amount Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Total Payroll</p>
            <p class="text-brand-dark text-3xl font-extrabold leading-tight my-2">
              {{ loadingStatistics ? "..." : formatRupiahCompact(payrollStatistics?.total_amount || 0) }}
            </p>
            <p class="text-success text-sm font-medium">This period</p>
          </div>
          <div class="w-14 h-14 bg-green-50 rounded-[16px] flex items-center justify-center">
            <DollarSign class="w-7 h-7 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Average Salary Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Average Salary</p>
            <p class="text-brand-dark text-3xl font-extrabold leading-tight my-2">
              {{
                loadingStatistics
                  ? "..."
                  : formatRupiahCompact(payrollStatistics?.average_salary || 0)
              }}
            </p>
            <p class="text-success text-sm font-medium">Per employee</p>
          </div>
          <div class="w-14 h-14 bg-purple-50 rounded-[16px] flex items-center justify-center">
            <Banknote class="w-7 h-7 text-purple-600" />
          </div>
        </div>
      </div>

      <!-- Processing Date Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Processed On</p>
            <p class="text-brand-dark text-2xl font-extrabold leading-tight my-2">
              {{
                loading
                  ? "..."
                  : new Date(payroll?.created_at).toLocaleDateString("id-ID", {
                    month: "short",
                    day: "numeric",
                  })
              }}
            </p>
            <p class="text-brand-light text-sm font-medium">
              {{ new Date(payroll?.created_at).getFullYear() }}
            </p>
          </div>
          <div class="w-14 h-14 bg-orange-50 rounded-[16px] flex items-center justify-center">
            <CalendarCheck class="w-7 h-7 text-orange-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Employee Details Section -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center">
            <Users class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Employee Details</h3>
            <p class="text-brand-light text-sm font-normal">
              Complete payroll breakdown by employee
            </p>
          </div>
        </div>

        <!-- Search and Filter -->
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="h-4 w-4 text-gray-400" />
            </div>
            <input type="text" v-model="searchQuery" placeholder="Search employees..."
              class="pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300 text-sm" />
          </div>

          <select v-model="departmentFilter"
            class="px-3 py-2 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300 text-sm">
            <option value="">All Positions</option>
            <option value="Software Engineer">Software Engineer</option>
            <option value="Product Manager">Product Manager</option>
            <option value="UI/UX Designer">UI/UX Designer</option>
            <option value="HR Manager">HR Manager</option>
            <option value="Finance">Finance</option>
          </select>
        </div>
      </div>

      <!-- Employee Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-3 px-4 font-semibold text-brand-dark text-sm">
                Employee
              </th>
              <th class="text-left py-3 px-4 font-semibold text-brand-dark text-sm">
                Job Position
              </th>
              <th class="text-left py-3 px-4 font-semibold text-brand-dark text-sm">
                Bank Account
              </th>
              <th class="text-center py-3 px-4 font-semibold text-brand-dark text-sm">
                Attendance
              </th>
              <th class="text-right py-3 px-4 font-semibold text-brand-dark text-sm">
                Basic Salary
              </th>
              <th class="text-right py-3 px-4 font-semibold text-brand-dark text-sm">
                Deductions
              </th>
              <th class="text-right py-3 px-4 font-semibold text-brand-dark text-sm">
                Net Salary
              </th>
              <th class="text-center py-3 px-4 font-semibold text-brand-dark text-sm">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in filteredEmployees" :key="emp.id"
              class="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
              <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                  <img :src="emp.profile_photo || 'https://via.placeholder.com/150'
                    " :alt="emp.name" class="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p class="text-brand-dark text-sm font-semibold">
                      {{ emp.name }}
                    </p>
                    <p class="text-brand-light text-xs">
                      {{ emp.employee_id }} • {{ emp.position }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="py-4 px-4">
                <span class="text-brand-dark text-sm">{{
                  emp.position
                  }}</span>
              </td>
              <td class="py-4 px-4">
                <div class="text-sm">
                  <p class="text-brand-dark font-semibold">{{ emp.bank_name }}</p>
                  <p class="text-brand-light text-xs">{{ emp.account_number }}</p>
                </div>
              </td>
              <td class="py-4 px-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <span :class="[
                    'text-sm font-semibold',
                    getAttendancePercentage(
                      emp.attended_days,
                      emp.total_work_days
                    ) >= 90
                      ? 'text-green-600'
                      : getAttendancePercentage(
                        emp.attended_days,
                        emp.total_work_days
                      ) >= 80
                        ? 'text-yellow-600'
                        : 'text-red-600',
                  ]">
                    {{
                      getAttendancePercentage(
                        emp.attended_days,
                        emp.total_work_days
                      )
                    }}%
                  </span>
                  <span class="text-xs text-brand-light">({{ emp.attended_days }}/{{ emp.total_work_days }})</span>
                </div>
              </td>
              <td class="py-4 px-4 text-right">
                <span class="text-brand-dark text-sm font-semibold">{{
                  formatRupiah(emp.basic_salary)
                  }}</span>
              </td>
              <td class="py-4 px-4 text-right">
                <span class="text-red-600 text-sm font-semibold">{{
                  formatRupiah(emp.deductions)
                  }}</span>
              </td>
              <td class="py-4 px-4 text-right">
                <span class="text-green-600 text-sm font-bold">{{
                  formatRupiah(emp.net_salary)
                  }}</span>
              </td>
              <td class="py-4 px-4 text-center">
                <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                  {{ emp.status === "paid" ? "Paid" : "Pending" }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="employees.length > 0" class="mt-6">
        <Pagination :meta="pagination" :loading="loadingDetails" @page-change="handlePageChange"
          @per-page-change="handlePerPageChange" />
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Export & Actions</h3>
          <p class="text-brand-light text-sm font-normal mt-1">
            Download reports and manage payroll data
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button @click="exportExcel"
            class="border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center gap-2">
            <Download class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-semibold">Export Excel</span>
          </button>

          <button v-if="payroll?.status !== 'paid'" @click="openMarkAsPaidModal"
            class="border border-green-600 bg-green-50 rounded-[12px] hover:bg-green-100 hover:border-green-700 transition-all duration-300 px-4 py-2 flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-600" />
            <span class="text-green-700 text-sm font-semibold">Mark as Paid</span>
          </button>

          <button v-else @click="sendNotifications"
            class="btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2 flex items-center gap-2">
            <Send class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Send Notifications</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mark as Paid Modal -->
    <Teleport to="body">
      <div v-if="showMarkAsPaidModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        @click.self="closeMarkAsPaidModal" style="margin: 0; padding: 0">
        <div class="bg-white rounded-[20px] p-6 max-w-md w-full mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-brand-dark text-xl font-bold">
              Mark Payroll as Paid
            </h3>
            <button @click="closeMarkAsPaidModal" class="text-gray-400 hover:text-gray-600 transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="mb-6">
            <p class="text-brand-light text-sm mb-4">
              Confirm that you want to mark this payroll as paid. This action
              will update the status and record the payment date.
            </p>

            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-2">
                Payment Date *
              </label>
              <input type="date" v-model="paymentDate" required
                class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300" />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button @click="handleMarkAsPaid" :disabled="markingAsPaid"
              class="flex-1 btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <CheckCircle class="w-4 h-4 text-white" />
              <span class="text-brand-white text-sm font-semibold">
                {{ markingAsPaid ? "Processing..." : "Confirm Payment" }}
              </span>
            </button>
            <button @click="closeMarkAsPaidModal" :disabled="markingAsPaid"
              class="flex-1 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300 px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="text-brand-dark text-sm font-semibold">Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
