<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePayrollStore } from "@/stores/payroll";
import { useProjectStore } from "@/stores/project";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Banknote,
  CalendarCheck,
  Search,
  Download,
  CheckCircle,
  X,
  ChevronDown,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
} from "lucide-vue-next";
import { debounce } from "lodash-es";
import Pagination from "@/components/admin/payroll/Pagination.vue";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { can, hasAnyRole } from "@/helpers/permissionHelper";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";
import { useAlertModalStore } from "@/stores/alertModal";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Avatar from "@/components/common/Avatar.vue";

const route = useRoute();
const router = useRouter();
const payrollStore = usePayrollStore();
const projectStore = useProjectStore();
const alertModal = useAlertModalStore();

const payroll = ref(null);
const payrollStatistics = ref(null);
const employees = ref([]);
const positions = ref([]);
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

// Manual per-employee override -- lets Superadmin/HR/Finance correct one
// employee's payroll when their actual situation doesn't match the
// automatic generation formula (e.g. a special-case bonus/deduction, or a
// startup arrangement where they're paid a cut of a project instead of a
// fixed figure).
const showEditModal = ref(false);
const editingEmployee = ref(null);
const editForm = ref({
  payment_mode: "manual",
  final_salary: 0,
  gross_salary: 0,
  bpjs_kesehatan_employee: 0,
  bpjs_jht_employee: 0,
  bpjs_jp_employee: 0,
  pph21: 0,
  total_deduction: 0,
  source_project_id: "",
  project_percentage: 0,
  notes: "",
});
const savingEdit = ref(false);
const loadingProjects = ref(false);

// Hidden by default -- salary figures are sensitive, revealed only on demand.
const showAmounts = ref(false);
const maskRupiah = (formatted) => (showAmounts.value ? formatted : "Rp ••••••");

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

const fetchPositions = async () => {
  try {
    positions.value = await payrollStore.fetchPayrollPositions(route.params.id);
  } catch (error) {
    console.error("Error fetching payroll positions:", error);
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
        detail_id: detail.id,
        id: detail.employee?.id,
        name: detail.employee?.user?.name || "N/A",
        employee_id: detail.employee?.code || detail.employee?.id,
        position: detail.employee?.job_information?.job_title || "N/A",
        department: detail.employee?.job_information?.team?.name || "N/A",
        profile_photo: detail.employee?.user?.profile_photo || null,
        total_work_days: payrollStatistics.value?.working_days || 0,
        attended_days: detail.attended_days || 0,
        sick_days: detail.sick_days || 0,
        absent_days: detail.absent_days || 0,
        months_of_service: detail.months_of_service,
        basic_salary: parseFloat(detail.original_salary) || 0,
        deductions:
          parseFloat(detail.original_salary) -
          parseFloat(detail.final_salary) || 0,
        net_salary: parseFloat(detail.final_salary) || 0,
        gross_salary: parseFloat(detail.gross_salary) || 0,
        bpjs_kesehatan_employee: parseFloat(detail.bpjs_kesehatan_employee) || 0,
        bpjs_jht_employee: parseFloat(detail.bpjs_jht_employee) || 0,
        bpjs_jp_employee: parseFloat(detail.bpjs_jp_employee) || 0,
        bpjs_kesehatan_company: parseFloat(detail.bpjs_kesehatan_company) || 0,
        bpjs_jht_company: parseFloat(detail.bpjs_jht_company) || 0,
        bpjs_jp_company: parseFloat(detail.bpjs_jp_company) || 0,
        bpjs_jkk_company: parseFloat(detail.bpjs_jkk_company) || 0,
        bpjs_jkm_company: parseFloat(detail.bpjs_jkm_company) || 0,
        pph21: parseFloat(detail.pph21) || 0,
        total_deduction: parseFloat(detail.total_deduction) || 0,
        status: payroll.value?.status === "paid" ? "paid" : "pending",
        notes: detail.notes,
        payment_mode: detail.payment_mode || "manual",
        source_project_id: detail.source_project_id,
        project_percentage: detail.project_percentage,
        source_project: detail.source_project,
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
  await fetchPositions();
});

// Server-side filtering is now handled by the API
const filteredEmployees = computed(() => employees.value);

// THR rows have no attendance data (eligibility is tenure-based, not
// attendance-based -- see PayrollRepository::generateThrPayroll()), so the
// Attendance column is swapped for Months of Service instead.
const isThr = computed(() => payroll.value?.type === "thr");

const canEditPayroll = computed(() => can("payroll-edit") && payroll.value?.status !== "paid");

// Deleting a detail row, deleting/regenerating a paid payroll -- these
// override data that's already been processed/paid, so (unlike the plain
// edit above) they stay available regardless of paid status, but only for
// the roles the backend itself trusts to do that.
const canManagePayroll = computed(() => hasAnyRole(["superadmin", "manager", "finance"]));

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
  if (!totalDays) return 0;
  return Math.round((attendedDays / totalDays) * 100);
};

const deductionBreakdown = (emp) => {
  if (isThr.value) {
    return [`PPh 21: ${formatRupiah(emp.pph21)}`].join("\n");
  }

  const attendanceDeduction =
    emp.deductions - emp.bpjs_kesehatan_employee - emp.bpjs_jht_employee - emp.bpjs_jp_employee - emp.pph21;
  return [
    `Potongan Absensi: ${formatRupiah(Math.max(0, attendanceDeduction))}`,
    `BPJS Kesehatan: ${formatRupiah(emp.bpjs_kesehatan_employee)}`,
    `BPJS JHT: ${formatRupiah(emp.bpjs_jht_employee)}`,
    `BPJS JP: ${formatRupiah(emp.bpjs_jp_employee)}`,
    `PPh 21: ${formatRupiah(emp.pph21)}`,
  ].join("\n");
};

const exportExcel = async () => {
  try {
    await payrollStore.exportExcel(route.params.id);
  } catch (error) {
    console.error("Error exporting Excel:", error);
    await alertModal.alert("Failed to export Excel file. Please try again.", { type: "danger" });
  }
};

const openMarkAsPaidModal = () => {
  paymentDate.value = new Date().toISOString().split("T")[0];
  showMarkAsPaidModal.value = true;
};

const closeMarkAsPaidModal = () => {
  showMarkAsPaidModal.value = false;
};

const openEditModal = async (emp) => {
  editingEmployee.value = emp;
  editForm.value = {
    payment_mode: emp.payment_mode || "manual",
    final_salary: emp.net_salary || 0,
    gross_salary: emp.gross_salary || 0,
    bpjs_kesehatan_employee: emp.bpjs_kesehatan_employee || 0,
    bpjs_jht_employee: emp.bpjs_jht_employee || 0,
    bpjs_jp_employee: emp.bpjs_jp_employee || 0,
    pph21: emp.pph21 || 0,
    total_deduction: emp.total_deduction || 0,
    source_project_id: emp.source_project_id || "",
    project_percentage: emp.project_percentage || 0,
    notes: emp.notes || "",
  };
  showEditModal.value = true;

  if (projectStore.projects.length === 0) {
    loadingProjects.value = true;
    try {
      await projectStore.fetchProjects();
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      loadingProjects.value = false;
    }
  }
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingEmployee.value = null;
};

// Client-side preview only -- the authoritative figure is always
// recomputed server-side from the project's current budget.
const projectPercentagePreview = computed(() => {
  const project = projectStore.projects.find((p) => p.id === editForm.value.source_project_id);
  if (!project || !editForm.value.project_percentage) return 0;
  return (parseFloat(project.budget) || 0) * (parseFloat(editForm.value.project_percentage) / 100);
});

const handleSaveEdit = async () => {
  if (!editingEmployee.value) return;

  const payload = {
    notes: editForm.value.notes,
    payment_mode: editForm.value.payment_mode,
  };

  if (editForm.value.payment_mode === "project_percentage") {
    payload.source_project_id = editForm.value.source_project_id;
    payload.project_percentage = editForm.value.project_percentage;
  } else {
    payload.final_salary = editForm.value.final_salary;
    payload.gross_salary = editForm.value.gross_salary;
    payload.bpjs_kesehatan_employee = editForm.value.bpjs_kesehatan_employee;
    payload.bpjs_jht_employee = editForm.value.bpjs_jht_employee;
    payload.bpjs_jp_employee = editForm.value.bpjs_jp_employee;
    payload.pph21 = editForm.value.pph21;
    payload.total_deduction = editForm.value.total_deduction;
  }

  try {
    savingEdit.value = true;
    await payrollStore.updatePayrollDetail(editingEmployee.value.detail_id, payload);
    await fetchPayrollDetails(pagination.value.current_page);
    await fetchPayrollStatistics();
    closeEditModal();
    await alertModal.alert("Payroll detail updated successfully.", { type: "success" });
  } catch (error) {
    console.error("Error updating payroll detail:", error);
    await alertModal.alert(
      error?.response?.data?.message || "Failed to update payroll detail.",
      { type: "danger" }
    );
  } finally {
    savingEdit.value = false;
  }
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
    await alertModal.alert("Payroll marked as paid successfully!", { type: "success" });
  } catch (error) {
    console.error("Error marking payroll as paid:", error);
    await alertModal.alert("Failed to mark payroll as paid. Please try again.", { type: "danger" });
  } finally {
    markingAsPaid.value = false;
  }
};

const handleDeleteDetail = async (emp) => {
  const ok = await alertModal.confirm(
    `Delete ${emp.name}'s payroll entry for this period? This cannot be undone.`,
    { type: "danger", confirmText: "Delete" }
  );
  if (!ok) return;

  try {
    await payrollStore.deletePayrollDetail(emp.detail_id);
    await fetchPayrollDetails(pagination.value.current_page);
    await fetchPayrollStatistics();
  } catch (error) {
    console.error("Error deleting payroll detail:", error);
    await alertModal.alert(
      error?.response?.data?.message || "Failed to delete payroll detail.",
      { type: "danger" }
    );
  }
};

const handleDeletePayroll = async () => {
  const label = isThr.value ? "THR" : "Payroll";
  const ok = await alertModal.confirm(
    `Delete this entire ${label} period? This permanently removes it and all its employee details.`,
    { type: "danger", confirmText: "Delete" }
  );
  if (!ok) return;

  try {
    await payrollStore.deletePayroll(route.params.id);
    router.push({ name: "admin.payroll.dashboard" });
  } catch (error) {
    console.error("Error deleting payroll:", error);
    await alertModal.alert(
      error?.response?.data?.message || "Failed to delete payroll.",
      { type: "danger" }
    );
  }
};

const regenerating = ref(false);

const handleRegenerate = async () => {
  const label = isThr.value ? "THR" : "Payroll";
  const ok = await alertModal.confirm(
    `Re-generate this ${label} period? This replaces all existing employee details with freshly computed ones.`,
    { type: "warning", confirmText: "Regenerate" }
  );
  if (!ok) return;

  const salaryMonth = new Date(payroll.value.salary_month).toISOString().slice(0, 7);
  const payload = { salary_month: salaryMonth, regenerate: true };

  try {
    regenerating.value = true;
    if (isThr.value) {
      await payrollStore.generateThrPayroll(payload);
    } else {
      await payrollStore.generatePayroll(payload);
    }
    await alertModal.alert(
      `${label} regeneration is being processed in the background. Please check back shortly.`,
      { type: "success" }
    );
    await fetchPayrollSummary();
    await fetchPayrollStatistics();
    await fetchPayrollDetails(pagination.value.current_page);
  } catch (error) {
    console.error("Error regenerating payroll:", error);
    await alertModal.alert(
      error?.response?.data?.message || `Failed to regenerate ${label}.`,
      { type: "danger" }
    );
  } finally {
    regenerating.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <div class="flex items-center justify-between">
      <button @click="router.back()"
        class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2 flex items-center gap-2">
        <ArrowLeft class="w-4 h-4 text-gray-600" />
        <span class="text-brand-dark text-base font-semibold">Back</span>
      </button>

      <button
        type="button"
        @click="showAmounts = !showAmounts"
        class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2 flex items-center gap-2"
      >
        <Eye v-if="!showAmounts" class="w-4 h-4 text-gray-600" />
        <EyeOff v-else class="w-4 h-4 text-gray-600" />
        <span class="text-brand-dark text-sm font-semibold">
          {{ showAmounts ? "Hide Amounts" : "Show Amounts" }}
        </span>
      </button>
    </div>

    <!-- Payroll Summary Cards -->
    <SkeletonStatCards v-if="loading || loadingStatistics" :count="4" />
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Employees Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Total Employees</p>
            <p class="text-brand-dark text-3xl font-extrabold leading-tight my-2">
              {{ loadingStatistics ? "..." : (payrollStatistics?.total_employees || 0) }}
            </p>
            <p class="text-success text-sm font-medium">All departments</p>
          </div>
          <div class="w-14 h-14 bg-blue-50 rounded-[12px] flex items-center justify-center">
            <Users class="w-7 h-7 text-blue-600" />
          </div>
        </div>
      </div>

      <!-- Total Payroll Amount Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Total Payroll</p>
            <p class="text-brand-dark text-3xl font-extrabold leading-tight my-2">
              {{ loadingStatistics ? "..." : maskRupiah(formatRupiahCompact(payrollStatistics?.total_amount || 0)) }}
            </p>
            <p class="text-success text-sm font-medium">This period</p>
          </div>
          <div class="w-14 h-14 bg-green-50 rounded-[12px] flex items-center justify-center">
            <DollarSign class="w-7 h-7 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Average Salary Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Average Salary</p>
            <p class="text-brand-dark text-3xl font-extrabold leading-tight my-2">
              {{
                loadingStatistics
                  ? "..."
                  : maskRupiah(formatRupiahCompact(payrollStatistics?.average_salary || 0))
              }}
            </p>
            <p class="text-success text-sm font-medium">Per employee</p>
          </div>
          <div class="w-14 h-14 bg-purple-50 rounded-[12px] flex items-center justify-center">
            <Banknote class="w-7 h-7 text-purple-600" />
          </div>
        </div>
      </div>

      <!-- Processing Date Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6">
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
          <div class="w-14 h-14 bg-orange-50 rounded-[12px] flex items-center justify-center">
            <CalendarCheck class="w-7 h-7 text-orange-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Employee Details Section -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center">
            <Users class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-brand-dark text-xl font-bold">Employee Details</h3>
              <span
                v-if="isThr"
                class="px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-700"
              >THR</span>
            </div>
            <p class="text-brand-light text-sm font-normal">
              Complete payroll breakdown by employee
            </p>
          </div>
        </div>

        <!-- Search and Filter -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div class="relative w-full sm:w-auto">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="h-4 w-4 text-gray-400" />
            </div>
            <input type="text" v-model="searchQuery" placeholder="Search employees..."
              class="w-full sm:w-auto pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300 text-sm" />
          </div>

          <div class="relative w-full sm:w-auto">
            <select v-model="departmentFilter"
              class="select-soft">
              <option value="">All Positions</option>
              <option v-for="position in positions" :key="position" :value="position">
                {{ position }}
              </option>
            </select>
            <ChevronDown
              class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      <!-- Employee Table -->
      <SkeletonTable v-if="loadingDetails" :rows="6" :cols="canEditPayroll || canManagePayroll ? 10 : 9" />
      <div v-else class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-3 px-4 font-semibold text-brand-dark text-sm">
                No
              </th>
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
                {{ isThr ? "Months of Service" : "Attendance" }}
              </th>
              <th class="text-right py-3 px-4 font-semibold text-brand-dark text-sm">
                {{ isThr ? "Gross THR" : "Basic Salary" }}
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
              <th v-if="canEditPayroll || canManagePayroll" class="text-center py-3 px-4 font-semibold text-brand-dark text-sm">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(emp, index) in filteredEmployees" :key="emp.id"
              class="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
              <td class="py-4 px-4 text-brand-light text-sm">{{ (pagination.current_page - 1) * pagination.per_page + index + 1 }}</td>
              <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                  <Avatar :src="emp.profile_photo" :alt="emp.name" size="w-10 h-10" />
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
              <td v-if="isThr" class="py-4 px-4 text-center">
                <span class="text-sm font-semibold text-brand-dark">{{ emp.months_of_service ?? "-" }}/12</span>
              </td>
              <td v-else class="py-4 px-4 text-center">
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
                  maskRupiah(formatRupiah(emp.basic_salary))
                  }}</span>
              </td>
              <td class="py-4 px-4 text-right">
                <span v-if="emp.payment_mode === 'project_percentage'" class="text-brand-light text-sm" title="Not applicable -- paid as a percentage of a project's budget, not the attendance-based formula">
                  N/A
                </span>
                <span
                  v-else
                  class="text-red-600 text-sm font-semibold cursor-help underline decoration-dotted"
                  :title="showAmounts ? deductionBreakdown(emp) : 'Click Show Amounts to see the breakdown'"
                >{{
                  maskRupiah(formatRupiah(emp.deductions))
                  }}</span>
              </td>
              <td class="py-4 px-4 text-right">
                <span class="text-green-600 text-sm font-bold">{{
                  maskRupiah(formatRupiah(emp.net_salary))
                  }}</span>
                <span
                  v-if="emp.payment_mode === 'project_percentage'"
                  class="block text-[11px] text-purple-600 font-medium mt-0.5"
                >
                  {{ emp.project_percentage }}% of {{ emp.source_project?.name || "project" }}
                </span>
              </td>
              <td class="py-4 px-4 text-center">
                <span :class="[
                  'px-2 py-1 rounded-full text-xs font-semibold',
                  emp.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800',
                ]">
                  {{ emp.status === "paid" ? "Paid" : "Pending" }}
                </span>
              </td>
              <td v-if="canEditPayroll || canManagePayroll" class="py-4 px-4 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button
                    v-if="canEditPayroll"
                    @click="openEditModal(emp)"
                    title="Edit"
                    class="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-blue-50 transition-colors"
                  >
                    <Pencil class="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    v-if="canManagePayroll"
                    @click="handleDeleteDetail(emp)"
                    title="Delete"
                    class="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-red-50 transition-colors"
                  >
                    <Trash2 class="w-4 h-4 text-red-600" />
                  </button>
                </div>
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
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Export & Actions</h3>
          <p class="text-brand-light text-sm font-normal mt-1">
            Download reports and manage payroll data
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button v-if="can('payroll-list')" @click="exportExcel"
            class="border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center gap-2">
            <Download class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-semibold">Export Excel</span>
          </button>

          <button v-if="can('payroll-process') && payroll?.status !== 'paid'" @click="openMarkAsPaidModal"
            class="border border-green-600 bg-green-50 rounded-[12px] hover:bg-green-100 hover:border-green-700 transition-all duration-300 px-4 py-2 flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-600" />
            <span class="text-green-700 text-sm font-semibold">Mark as Paid</span>
          </button>

          <button v-if="canManagePayroll" @click="handleRegenerate" :disabled="regenerating"
            class="border border-yellow-500 bg-yellow-50 rounded-[12px] hover:bg-yellow-100 hover:border-yellow-600 transition-all duration-300 px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <RefreshCw class="w-4 h-4 text-yellow-700" />
            <span class="text-yellow-700 text-sm font-semibold">
              {{ regenerating ? "Regenerating..." : "Regenerate" }}
            </span>
          </button>

          <button v-if="canManagePayroll" @click="handleDeletePayroll"
            class="border border-red-600 bg-red-50 rounded-[12px] hover:bg-red-100 hover:border-red-700 transition-all duration-300 px-4 py-2 flex items-center gap-2">
            <Trash2 class="w-4 h-4 text-red-600" />
            <span class="text-red-700 text-sm font-semibold">Delete Payroll</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mark as Paid Modal -->
    <Teleport to="body">
      <div v-if="showMarkAsPaidModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
        @click.self="closeMarkAsPaidModal" style="margin: 0; padding: 0">
        <div class="bg-white rounded-[14px] p-6 max-w-md w-full mx-4">
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

    <!-- Edit Payroll Detail Modal -->
    <Teleport to="body">
      <div v-if="showEditModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
        @click.self="closeEditModal" style="margin: 0; padding: 0">
        <div class="bg-white rounded-[14px] p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-brand-dark text-xl font-bold">
              Edit Payroll — {{ editingEmployee?.name }}
            </h3>
            <button @click="closeEditModal" class="text-gray-400 hover:text-gray-600 transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>

          <p class="text-brand-light text-sm mb-5">
            Override this employee's automatically generated figures when their actual
            situation differs -- e.g. a fixed manual amount, or a cut of a project instead.
          </p>

          <div class="space-y-4">
            <!-- Payment Mode -->
            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-2">Payment Mode</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  @click="editForm.payment_mode = 'manual'"
                  :class="[
                    'px-4 py-2.5 rounded-[10px] border text-sm font-semibold transition-all',
                    editForm.payment_mode === 'manual'
                      ? 'border-[#0C51D9] bg-blue-50 text-[#0C51D9]'
                      : 'border-[#DCDEDD] text-brand-light hover:border-[#0C51D9]',
                  ]"
                >
                  Fixed Amount (Rp)
                </button>
                <button
                  type="button"
                  @click="editForm.payment_mode = 'project_percentage'"
                  :class="[
                    'px-4 py-2.5 rounded-[10px] border text-sm font-semibold transition-all',
                    editForm.payment_mode === 'project_percentage'
                      ? 'border-[#0C51D9] bg-blue-50 text-[#0C51D9]'
                      : 'border-[#DCDEDD] text-brand-light hover:border-[#0C51D9]',
                  ]"
                >
                  % of a Project
                </button>
              </div>
            </div>

            <!-- Fixed Amount mode -->
            <template v-if="editForm.payment_mode === 'manual'">
              <div>
                <label class="block text-brand-dark text-sm font-semibold mb-2">Final Salary (Take-home)</label>
                <input type="number" min="0" v-model.number="editForm.final_salary"
                  class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300" />
              </div>
              <div>
                <label class="block text-brand-dark text-sm font-semibold mb-2">Gross Salary</label>
                <input type="number" min="0" v-model.number="editForm.gross_salary"
                  class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-brand-dark text-sm font-semibold mb-2">BPJS Kesehatan</label>
                  <input type="number" min="0" v-model.number="editForm.bpjs_kesehatan_employee"
                    class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300" />
                </div>
                <div>
                  <label class="block text-brand-dark text-sm font-semibold mb-2">BPJS JHT</label>
                  <input type="number" min="0" v-model.number="editForm.bpjs_jht_employee"
                    class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300" />
                </div>
                <div>
                  <label class="block text-brand-dark text-sm font-semibold mb-2">BPJS JP</label>
                  <input type="number" min="0" v-model.number="editForm.bpjs_jp_employee"
                    class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300" />
                </div>
                <div>
                  <label class="block text-brand-dark text-sm font-semibold mb-2">PPh 21</label>
                  <input type="number" min="0" v-model.number="editForm.pph21"
                    class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300" />
                </div>
              </div>
              <div>
                <label class="block text-brand-dark text-sm font-semibold mb-2">Total Deduction</label>
                <input type="number" min="0" v-model.number="editForm.total_deduction"
                  class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300" />
              </div>
            </template>

            <!-- Percentage of Project mode -->
            <template v-else>
              <div>
                <label class="block text-brand-dark text-sm font-semibold mb-2">Project</label>
                <select v-model="editForm.source_project_id" class="select-soft w-full">
                  <option value="" disabled>{{ loadingProjects ? "Loading projects..." : "Select a project" }}</option>
                  <option v-for="project in projectStore.projects" :key="project.id" :value="project.id">
                    {{ project.name }} — {{ formatRupiah(project.budget) }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-brand-dark text-sm font-semibold mb-2">Percentage (%)</label>
                <input type="number" min="0" max="100" step="0.1" v-model.number="editForm.project_percentage"
                  class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300" />
              </div>
              <div class="bg-purple-50 border border-purple-100 rounded-[12px] p-3">
                <p class="text-purple-700 text-sm font-semibold">
                  Estimated payout: {{ formatRupiah(projectPercentagePreview) }}
                </p>
                <p class="text-purple-600 text-xs mt-1">
                  Recalculated from the project's current budget when you save.
                </p>
              </div>
            </template>

            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-2">Notes</label>
              <textarea v-model="editForm.notes" rows="2"
                class="w-full px-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:ring-2 focus:ring-blue-100 transition-all duration-300"
                placeholder="Optional reason for this override..."></textarea>
            </div>
          </div>

          <div class="flex items-center gap-3 mt-6">
            <button @click="handleSaveEdit" :disabled="savingEdit"
              class="flex-1 btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="text-brand-white text-sm font-semibold">
                {{ savingEdit ? "Saving..." : "Save Changes" }}
              </span>
            </button>
            <button @click="closeEditModal" :disabled="savingEdit"
              class="flex-1 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300 px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="text-brand-dark text-sm font-semibold">Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
