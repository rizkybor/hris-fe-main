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
import { useAlertModalStore } from "@/stores/alertModal";
import { UiAlert, UiBadge, UiButton, UiInput, UiModal, UiPageHeader, UiSelect, UiStat, UiTable } from "@/components/ui";
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

// ---- Presentation only -------------------------------------------------
const STATUS = {
  draft: { tone: "neutral", label: "Draft" },
  pending: { tone: "warn", label: "Pending" },
  processing: { tone: "warn", label: "Processing" },
  approved: { tone: "info", label: "Approved" },
  paid: { tone: "ok", label: "Paid" },
  cancelled: { tone: "bad", label: "Cancelled" },
};
const statusOf = (status) => STATUS[status] || { tone: "neutral", label: status || "Pending" };

const formatPeriod = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "long" }) : "";

const pageTitle = computed(() => {
  const period = formatPeriod(payroll.value?.period || payroll.value?.salary_month);
  return `${isThr.value ? "THR" : "Payroll"}${period ? ` · ${period}` : ""}`;
});

const processedOn = computed(() =>
  payroll.value?.created_at
    ? new Date(payroll.value.created_at).toLocaleDateString("id-ID", { month: "short", day: "numeric" })
    : "-"
);
const processedYear = computed(() =>
  payroll.value?.created_at ? String(new Date(payroll.value.created_at).getFullYear()) : ""
);

const positionOptions = computed(() => [
  { value: "", label: "All Positions" },
  ...positions.value.map((p) => ({ value: p, label: p })),
]);

const projectOptions = computed(() =>
  projectStore.projects.map((project) => ({
    value: project.id,
    label: `${project.name} — ${formatRupiah(project.budget)}`,
  }))
);

const showActionsColumn = computed(() => canEditPayroll.value || canManagePayroll.value);
const columns = computed(() => [
  { key: "employee", label: "Employee" },
  { key: "position", label: "Job Position", class: "hidden 2xl:table-cell" },
  { key: "bank", label: "Bank Account" },
  { key: "attendance", label: isThr.value ? "Months of Service" : "Attendance", align: "center" },
  { key: "basic_salary", label: isThr.value ? "Gross THR" : "Basic Salary", align: "right" },
  { key: "deductions", label: "Deductions", align: "right" },
  { key: "net_salary", label: "Net Salary", align: "right" },
  { key: "status", label: "Status" },
  ...(showActionsColumn.value ? [{ key: "actions", label: "", align: "right", width: 88 }] : []),
]);

const attendanceTone = (emp) => {
  const pct = getAttendancePercentage(emp.attended_days, emp.total_work_days);
  return pct >= 90 ? "text-ui-ok" : pct >= 80 ? "text-ui-warn" : "text-ui-bad";
};

// Per-employee breakdown sheet (same reading order as the employee payslip:
// earnings, deductions, ink take-home band). Uses the same split as
// deductionBreakdown() above.
const showBreakdown = ref(false);
const breakdownEmp = ref(null);
const openBreakdown = (emp) => {
  breakdownEmp.value = emp;
  showBreakdown.value = true;
};
const breakdownDeductions = computed(() => {
  const emp = breakdownEmp.value;
  if (!emp) return [];
  if (isThr.value) return [{ label: "PPh 21", value: emp.pph21 }];
  const attendanceDeduction =
    emp.deductions - emp.bpjs_kesehatan_employee - emp.bpjs_jht_employee - emp.bpjs_jp_employee - emp.pph21;
  return [
    { label: "Potongan Absensi", value: Math.max(0, attendanceDeduction) },
    { label: "BPJS Kesehatan", value: emp.bpjs_kesehatan_employee },
    { label: "BPJS JHT", value: emp.bpjs_jht_employee },
    { label: "BPJS JP", value: emp.bpjs_jp_employee },
    { label: "PPh 21", value: emp.pph21 },
  ];
});
const editFromBreakdown = (emp) => {
  showBreakdown.value = false;
  openEditModal(emp);
};
const deleteFromBreakdown = (emp) => {
  showBreakdown.value = false;
  handleDeleteDetail(emp);
};

// Native number inputs keep v-model.number / min / max / step; styled like UiInput.
const fieldClass =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink tabular-nums border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const labelClass = "block text-ui-small font-medium text-ui-ink mb-1.5";
</script>


<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="pageTitle">
      <template #eyebrow>
        <button
          type="button"
          class="ui-press inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-2"
          @click="router.back()"
        >
          <ArrowLeft class="w-4 h-4" />Back
        </button>
      </template>
      <template #subtitle>
        <span class="inline-flex flex-wrap items-center gap-2">
          <UiBadge v-if="payroll" :tone="statusOf(payroll.status).tone" dot>{{ statusOf(payroll.status).label }}</UiBadge>
          <UiBadge v-if="isThr" tone="accent">THR</UiBadge>
          <span>Complete payroll breakdown by employee</span>
        </span>
      </template>
      <template #actions>
        <UiButton variant="ghost" :icon="showAmounts ? EyeOff : Eye" @click="showAmounts = !showAmounts">
          {{ showAmounts ? "Hide Amounts" : "Show Amounts" }}
        </UiButton>
        <UiButton v-if="canManagePayroll" variant="ghost" :icon="RefreshCw" :loading="regenerating" @click="handleRegenerate">
          {{ regenerating ? "Regenerating..." : "Regenerate" }}
        </UiButton>
        <UiButton v-if="canManagePayroll" variant="danger" :icon="Trash2" @click="handleDeletePayroll">Delete Payroll</UiButton>
        <UiButton v-if="can('payroll-list')" variant="secondary" :icon="Download" @click="exportExcel">Export Excel</UiButton>
        <UiButton
          v-if="can('payroll-process') && payroll?.status !== 'paid'"
          :icon="CheckCircle"
          class="order-first sm:order-none w-full sm:w-auto"
          @click="openMarkAsPaidModal"
        >
          Mark as Paid
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Summary -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
      <UiStat
        label="Total Employees"
        :icon="Users"
        :loading="loading || loadingStatistics"
        :value="payrollStatistics?.total_employees || 0"
        hint="All departments"
      />
      <UiStat
        label="Total Payroll"
        :icon="DollarSign"
        :loading="loading || loadingStatistics"
        :value="maskRupiah(formatRupiahCompact(payrollStatistics?.total_amount || 0))"
        hint="This period"
      />
      <UiStat
        label="Average Salary"
        :icon="Banknote"
        :loading="loading || loadingStatistics"
        :value="maskRupiah(formatRupiahCompact(payrollStatistics?.average_salary || 0))"
        hint="Per employee"
      />
      <UiStat
        label="Processed On"
        :icon="CalendarCheck"
        :loading="loading || loadingStatistics"
        :value="processedOn"
        :hint="processedYear"
      />
    </div>

    <!-- Employee Details -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 pt-4 pb-3 flex flex-col md:flex-row md:items-center gap-3 border-b border-ui-line">
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink">Employee Details</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">
            {{ pagination.total || 0 }} employees in this period
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-2">
          <UiInput v-model="searchQuery" :icon="Search" placeholder="Search employees..." class="md:w-[260px]" />
          <UiSelect v-model="departmentFilter" :options="positionOptions" class="md:w-[200px]" aria-label="Position" />
        </div>
      </div>

      <UiTable
        :columns="columns"
        :rows="filteredEmployees"
        :meta="pagination"
        :loading="loadingDetails"
        :skeleton-rows="6"
        row-key="detail_id"
        clickable
        @row-click="openBreakdown"
      >
        <template #cell-employee="{ row }">
          <div class="flex items-center gap-3 min-w-0">
            <Avatar :src="row.profile_photo" :alt="row.name" size="w-8 h-8" />
            <div class="min-w-0">
              <p class="text-ui-small font-medium text-ui-ink truncate">{{ row.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate">{{ row.employee_id }} • {{ row.position }}</p>
            </div>
          </div>
        </template>
        <template #cell-position="{ row }">{{ row.position }}</template>
        <template #cell-bank="{ row }">
          <p class="text-ui-small text-ui-ink">{{ row.bank_name }}</p>
          <p class="text-ui-cap text-ui-muted tabular-nums">{{ row.account_number }}</p>
        </template>
        <template #cell-attendance="{ row }">
          <span v-if="isThr" class="font-medium text-ui-ink tabular-nums">{{ row.months_of_service ?? "-" }}/12</span>
          <span v-else class="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
            <span :class="['font-medium', attendanceTone(row)]">{{ getAttendancePercentage(row.attended_days, row.total_work_days) }}%</span>
            <span class="text-ui-cap text-ui-muted">({{ row.attended_days }}/{{ row.total_work_days }})</span>
          </span>
        </template>
        <template #cell-basic_salary="{ row }">
          <span class="tabular-nums text-ui-text whitespace-nowrap">{{ maskRupiah(formatRupiah(row.basic_salary)) }}</span>
        </template>
        <template #cell-deductions="{ row }">
          <span
            v-if="row.payment_mode === 'project_percentage'"
            class="text-ui-muted"
            title="Not applicable -- paid as a percentage of a project's budget, not the attendance-based formula"
          >N/A</span>
          <span
            v-else
            class="tabular-nums text-ui-bad whitespace-nowrap cursor-help underline decoration-dotted underline-offset-2"
            :title="showAmounts ? deductionBreakdown(row) : 'Click Show Amounts to see the breakdown'"
          >{{ maskRupiah(formatRupiah(row.deductions)) }}</span>
        </template>
        <template #cell-net_salary="{ row }">
          <span class="block tabular-nums font-semibold text-ui-ink whitespace-nowrap">{{ maskRupiah(formatRupiah(row.net_salary)) }}</span>
          <span v-if="row.payment_mode === 'project_percentage'" class="block text-ui-cap text-ui-accent mt-0.5">
            {{ row.project_percentage }}% of {{ row.source_project?.name || "project" }}
          </span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="row.status === 'paid' ? 'ok' : 'warn'" dot>{{ row.status === "paid" ? "Paid" : "Pending" }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UiButton v-if="canEditPayroll" variant="ghost" size="sm" :icon="Pencil" title="Edit" aria-label="Edit" @click.stop="openEditModal(row)" />
            <UiButton
              v-if="canManagePayroll"
              variant="ghost"
              size="sm"
              :icon="Trash2"
              title="Delete"
              aria-label="Delete"
              class="!text-ui-bad"
              @click.stop="handleDeleteDetail(row)"
            />
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-center gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
            <Avatar :src="row.profile_photo" :alt="row.name" size="w-9 h-9" />
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate tabular-nums">
                {{ isThr ? "Gross THR" : "Basic" }} {{ maskRupiah(formatRupiah(row.basic_salary)) }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-ui-body font-semibold text-ui-ink tabular-nums">{{ maskRupiah(formatRupiah(row.net_salary)) }}</p>
              <UiBadge class="mt-1" :tone="row.status === 'paid' ? 'ok' : 'warn'" dot>{{ row.status === "paid" ? "Paid" : "Pending" }}</UiBadge>
            </div>
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center py-4">
            <div class="w-10 h-10 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center mb-3">
              <Users class="w-5 h-5" />
            </div>
            <p class="text-ui-body font-medium text-ui-ink">No employees found</p>
            <p class="text-ui-small text-ui-muted mt-1">Try a different search or position filter</p>
          </div>
        </template>
      </UiTable>

      <div v-if="employees.length > 0" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="pagination" :loading="loadingDetails" @page-change="handlePageChange" @per-page-change="handlePerPageChange" />
      </div>
    </section>

    <!-- Per-employee breakdown -->
    <UiModal
      v-model:open="showBreakdown"
      :title="breakdownEmp?.name || ''"
      :description="breakdownEmp ? `${breakdownEmp.employee_id} • ${breakdownEmp.position}` : ''"
    >
      <div v-if="breakdownEmp" class="space-y-5">
        <dl class="bg-ui-subtle rounded-ui-card px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
          <div class="min-w-0">
            <dt class="text-ui-cap text-ui-muted">Bank Account</dt>
            <dd class="text-ui-small font-medium text-ui-ink truncate">{{ breakdownEmp.bank_name }}</dd>
            <dd class="text-ui-cap text-ui-muted tabular-nums truncate">{{ breakdownEmp.account_number }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ isThr ? "Months of Service" : "Attendance" }}</dt>
            <dd v-if="isThr" class="text-ui-small font-medium text-ui-ink tabular-nums">{{ breakdownEmp.months_of_service ?? "-" }}/12</dd>
            <dd v-else class="text-ui-small font-medium tabular-nums">
              <span :class="attendanceTone(breakdownEmp)">{{ getAttendancePercentage(breakdownEmp.attended_days, breakdownEmp.total_work_days) }}%</span>
              <span class="text-ui-cap text-ui-muted"> ({{ breakdownEmp.attended_days }}/{{ breakdownEmp.total_work_days }})</span>
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="text-ui-cap text-ui-muted">Status</dt>
            <dd class="mt-0.5">
              <UiBadge :tone="breakdownEmp.status === 'paid' ? 'ok' : 'warn'" dot>{{ breakdownEmp.status === "paid" ? "Paid" : "Pending" }}</UiBadge>
            </dd>
          </div>
          <div v-if="breakdownEmp.payment_mode === 'project_percentage'" class="min-w-0">
            <dt class="text-ui-cap text-ui-muted">Payment Mode</dt>
            <dd class="text-ui-small font-medium text-ui-ink">
              {{ breakdownEmp.project_percentage }}% of {{ breakdownEmp.source_project?.name || "project" }}
            </dd>
          </div>
        </dl>

        <section>
          <h3 class="text-ui-over uppercase text-ui-muted pb-1">Earnings</h3>
          <div class="divide-y divide-ui-line">
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-ui-small text-ui-muted">{{ isThr ? "Gross THR" : "Basic Salary" }}</span>
              <span class="text-ui-small text-ui-ink tabular-nums text-right">{{ maskRupiah(formatRupiah(breakdownEmp.basic_salary)) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-ui-small font-semibold text-ui-ink">Gross Salary</span>
              <span class="text-ui-small font-semibold text-ui-ink tabular-nums text-right">{{ maskRupiah(formatRupiah(breakdownEmp.gross_salary)) }}</span>
            </div>
          </div>
        </section>

        <section>
          <h3 class="text-ui-over uppercase text-ui-muted pb-1">Deductions</h3>
          <p v-if="breakdownEmp.payment_mode === 'project_percentage'" class="text-ui-small text-ui-muted py-2.5">
            Not applicable -- paid as a percentage of a project's budget, not the attendance-based formula
          </p>
          <div v-else class="divide-y divide-ui-line">
            <div v-for="line in breakdownDeductions" :key="line.label" class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-ui-small text-ui-muted">{{ line.label }}</span>
              <span class="text-ui-small text-ui-bad tabular-nums text-right">{{ maskRupiah(formatRupiah(line.value)) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-ui-small font-semibold text-ui-ink">Total Deductions</span>
              <span class="text-ui-small font-semibold text-ui-bad tabular-nums text-right">{{ maskRupiah(formatRupiah(breakdownEmp.deductions)) }}</span>
            </div>
          </div>
        </section>

        <div class="flex items-center justify-between gap-4 bg-ui-ink text-white rounded-ui-card px-5 py-4">
          <p class="text-ui-small text-white/70">Net Salary (Take Home)</p>
          <p class="text-ui-h1 tabular-nums text-right">{{ maskRupiah(formatRupiah(breakdownEmp.net_salary)) }}</p>
        </div>

        <div v-if="breakdownEmp.notes" class="bg-ui-subtle rounded-ui-card px-4 py-3">
          <p class="text-ui-small font-medium text-ui-ink mb-1">Notes:</p>
          <p class="text-ui-small text-ui-text">{{ breakdownEmp.notes }}</p>
        </div>
      </div>
      <template v-if="breakdownEmp && showActionsColumn" #footer>
        <UiButton v-if="canManagePayroll" variant="danger" :icon="Trash2" class="mr-auto" @click="deleteFromBreakdown(breakdownEmp)">Delete</UiButton>
        <UiButton v-if="canEditPayroll" :icon="Pencil" @click="editFromBreakdown(breakdownEmp)">Edit</UiButton>
      </template>
    </UiModal>

    <!-- Mark as Paid -->
    <UiModal
      v-model:open="showMarkAsPaidModal"
      title="Mark Payroll as Paid"
      size="sm"
      :persistent="markingAsPaid"
      @close="closeMarkAsPaidModal"
    >
      <p class="text-ui-small text-ui-muted mb-4">
        Confirm that you want to mark this payroll as paid. This action
        will update the status and record the payment date.
      </p>
      <UiInput v-model="paymentDate" type="date" label="Payment Date" required />
      <template #footer>
        <UiButton variant="secondary" :disabled="markingAsPaid" @click="closeMarkAsPaidModal">Cancel</UiButton>
        <UiButton :icon="CheckCircle" :loading="markingAsPaid" @click="handleMarkAsPaid">
          {{ markingAsPaid ? "Processing..." : "Confirm Payment" }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Edit Payroll Detail -->
    <UiModal
      v-model:open="showEditModal"
      :title="`Edit Payroll — ${editingEmployee?.name || ''}`"
      description="Override this employee's automatically generated figures when their actual situation differs -- e.g. a fixed manual amount, or a cut of a project instead."
      :persistent="savingEdit"
      @close="closeEditModal"
    >
      <div class="space-y-4">
        <fieldset>
          <legend :class="labelClass">Payment Mode</legend>
          <div class="grid grid-cols-2 gap-1 p-1 bg-ui-subtle rounded-ui-control" role="radiogroup">
            <button
              v-for="mode in [
                { value: 'manual', label: 'Fixed Amount (Rp)' },
                { value: 'project_percentage', label: '% of a Project' },
              ]"
              :key="mode.value"
              type="button"
              role="radio"
              :aria-checked="editForm.payment_mode === mode.value"
              :class="[
                'ui-press h-8 rounded-[6px] text-ui-small font-medium transition-colors focus:outline-none focus-visible:shadow-ui-focus',
                editForm.payment_mode === mode.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink',
              ]"
              @click="editForm.payment_mode = mode.value"
            >
              {{ mode.label }}
            </button>
          </div>
        </fieldset>

        <template v-if="editForm.payment_mode === 'manual'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="pd-final" :class="labelClass">Final Salary (Take-home)</label>
              <input id="pd-final" type="number" min="0" v-model.number="editForm.final_salary" :class="fieldClass" />
            </div>
            <div>
              <label for="pd-gross" :class="labelClass">Gross Salary</label>
              <input id="pd-gross" type="number" min="0" v-model.number="editForm.gross_salary" :class="fieldClass" />
            </div>
            <div>
              <label for="pd-bpjs-kes" :class="labelClass">BPJS Kesehatan</label>
              <input id="pd-bpjs-kes" type="number" min="0" v-model.number="editForm.bpjs_kesehatan_employee" :class="fieldClass" />
            </div>
            <div>
              <label for="pd-bpjs-jht" :class="labelClass">BPJS JHT</label>
              <input id="pd-bpjs-jht" type="number" min="0" v-model.number="editForm.bpjs_jht_employee" :class="fieldClass" />
            </div>
            <div>
              <label for="pd-bpjs-jp" :class="labelClass">BPJS JP</label>
              <input id="pd-bpjs-jp" type="number" min="0" v-model.number="editForm.bpjs_jp_employee" :class="fieldClass" />
            </div>
            <div>
              <label for="pd-pph21" :class="labelClass">PPh 21</label>
              <input id="pd-pph21" type="number" min="0" v-model.number="editForm.pph21" :class="fieldClass" />
            </div>
            <div class="sm:col-span-2">
              <label for="pd-total-ded" :class="labelClass">Total Deduction</label>
              <input id="pd-total-ded" type="number" min="0" v-model.number="editForm.total_deduction" :class="fieldClass" />
            </div>
          </div>
        </template>

        <template v-else>
          <UiSelect
            v-model="editForm.source_project_id"
            label="Project"
            :options="projectOptions"
            :placeholder="loadingProjects ? 'Loading projects...' : 'Select a project'"
          />
          <div>
            <label for="pd-pct" :class="labelClass">Percentage (%)</label>
            <input id="pd-pct" type="number" min="0" max="100" step="0.1" v-model.number="editForm.project_percentage" :class="fieldClass" />
          </div>
          <UiAlert tone="info" :title="`Estimated payout: ${formatRupiah(projectPercentagePreview)}`">
            Recalculated from the project's current budget when you save.
          </UiAlert>
        </template>

        <UiInput v-model="editForm.notes" label="Notes" :rows="2" placeholder="Optional reason for this override..." />
      </div>

      <template #footer>
        <UiButton variant="secondary" :disabled="savingEdit" @click="closeEditModal">Cancel</UiButton>
        <UiButton :loading="savingEdit" @click="handleSaveEdit">{{ savingEdit ? "Saving..." : "Save Changes" }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>
