<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  FileTextIcon,
  Download,
  Users,
  Wallet,
  ClockIcon,
  Building2Icon,
  ReceiptIcon,
  PercentIcon,
  FolderKanban,
  PiggyBank,
  Star,
  X,
} from "lucide-vue-next";
import { useReportStore } from "@/stores/report";
import { useProjectStore } from "@/stores/project";
import { useOptionStore } from "@/stores/option";
import { can } from "@/helpers/permissionHelper";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";

const reportStore = useReportStore();
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);
const optionStore = useOptionStore();
const { employmentTypes } = storeToRefs(optionStore);
const {
  attendance,
  payroll,
  employee,
  finance,
  pph21,
  ppn,
  project,
  pph23,
  projectExpense,
  staffRaport,
  staffRaportDetail,
  loading,
  exporting,
  downloadingPdf,
} = storeToRefs(reportStore);

const tabs = [
  { key: "attendance", label: "Attendance", icon: ClockIcon },
  { key: "payroll", label: "Payroll", icon: Wallet },
  { key: "employee", label: "Employee", icon: Users },
  { key: "finance", label: "Finance", icon: Building2Icon },
  { key: "pph21", label: "PPh 21", icon: ReceiptIcon },
  { key: "pph23", label: "PPh 23", icon: ReceiptIcon },
  { key: "ppn", label: "PPN", icon: PercentIcon },
  { key: "project", label: "Project", icon: FolderKanban },
  { key: "project_expense", label: "Project Cash", icon: PiggyBank },
  { key: "staff_raport", label: "Staff Raport", icon: Star, permission: "staff-raport-menu" },
];

const visibleTabs = computed(() => tabs.filter((t) => !t.permission || can(t.permission)));

const activeTab = ref("attendance");
const startDate = ref("");
const endDate = ref("");
const projectStatus = ref("");
const projectExpenseProjectId = ref("");
const staffRaportSearch = ref("");
const staffRaportEmploymentType = ref("");

const canExport = computed(() => can("report-export"));

// Staff Raport detail modal
const showRaportDetail = ref(false);
const raportPeriod = ref("month");
const loadingDetail = ref(false);

const openRaportDetail = async (employeeId) => {
  showRaportDetail.value = true;
  loadingDetail.value = true;
  try {
    await reportStore.fetchStaffRaportDetail(employeeId, filterParams.value);
  } finally {
    loadingDetail.value = false;
  }
};

const closeRaportDetail = () => {
  showRaportDetail.value = false;
};

const handleDownloadPdf = async () => {
  if (!staffRaportDetail.value) return;
  try {
    await reportStore.downloadStaffRaportPdf(
      staffRaportDetail.value.employee.id,
      raportPeriod.value,
      staffRaportDetail.value.employee.name
    );
  } catch (error) {
    console.error("PDF download failed", error);
  }
};

const currentReport = computed(() => {
  return {
    attendance: attendance.value,
    payroll: payroll.value,
    employee: employee.value,
    finance: finance.value,
    pph21: pph21.value,
    ppn: ppn.value,
    project: project.value,
    pph23: pph23.value,
    project_expense: projectExpense.value,
    staff_raport: staffRaport.value,
  }[activeTab.value];
});

const summaryCards = computed(() => {
  const summary = currentReport.value?.summary || {};

  switch (activeTab.value) {
    case "attendance":
      return [
        { label: "Total Records", value: summary.total_records ?? 0 },
        { label: "Present", value: summary.present ?? 0 },
        { label: "Late", value: summary.late ?? 0 },
        { label: "Absent", value: summary.absent ?? 0 },
      ];
    case "payroll":
      return [
        { label: "Payroll Runs", value: summary.total_payroll_runs ?? 0 },
        { label: "Employees Paid", value: summary.total_employees_paid ?? 0 },
        {
          label: "Total Original Salary",
          value: formatCurrency(summary.total_original_salary),
        },
        {
          label: "Total Final Salary",
          value: formatCurrency(summary.total_final_salary),
        },
      ];
    case "employee":
      return [
        { label: "Total Employees", value: summary.total_employees ?? 0 },
        { label: "Active", value: summary.active ?? 0 },
        { label: "Inactive", value: summary.inactive ?? 0 },
      ];
    case "finance":
      return [
        {
          label: "Company Balance",
          value: formatCurrency(summary.company_balance),
        },
        {
          label: "Fixed Cost (Actual)",
          value: formatCurrency(summary.fixed_cost_actual),
        },
        {
          label: "Infrastructure (Monthly)",
          value: formatCurrency(summary.infrastructure_monthly_fee),
        },
        { label: "SDM Actual", value: formatCurrency(summary.sdm_actual) },
      ];
    case "pph21":
      return [
        { label: "Employees Taxed", value: summary.total_employees_taxed ?? 0 },
        {
          label: "Total Gross Salary",
          value: formatCurrency(summary.total_gross_salary),
        },
        { label: "Total PPh 21", value: formatCurrency(summary.total_pph21) },
      ];
    case "ppn":
      return [
        { label: "Invoices", value: summary.total_invoices ?? 0 },
        { label: "Total DPP", value: formatCurrency(summary.total_dpp) },
        { label: "Total PPN", value: formatCurrency(summary.total_ppn) },
      ];
    case "project":
      return [
        { label: "Total Projects", value: summary.total_projects ?? 0 },
        { label: "Active", value: summary.active_projects ?? 0 },
        { label: "Completed", value: summary.completed_projects ?? 0 },
        { label: "Total Budget", value: formatCurrency(summary.total_budget) },
      ];
    case "pph23":
      return [
        { label: "Receipts", value: summary.total_receipts ?? 0 },
        { label: "Total Gross", value: formatCurrency(summary.total_gross) },
        { label: "Total PPh 23 Withheld", value: formatCurrency(summary.total_pph23) },
        { label: "Total Net Received", value: formatCurrency(summary.total_net_received) },
      ];
    case "project_expense":
      return [
        { label: "Projects with Activity", value: summary.total_projects ?? 0 },
        { label: "Total Budget", value: formatCurrency(summary.total_budget) },
        { label: "Total Debit", value: formatCurrency(summary.total_debit) },
        { label: "Total Credit", value: formatCurrency(summary.total_credit) },
      ];
    case "staff_raport": {
      const rows = staffRaport.value.rows || [];
      const withScore = rows.filter((r) => r.overall_score !== null);
      const avg = (key) =>
        withScore.length ? Math.round((withScore.reduce((s, r) => s + (r[key] ?? 0), 0) / withScore.length) * 10) / 10 : 0;
      return [
        { label: "Total Staff (this page)", value: rows.length },
        { label: "Avg. Attendance Rate", value: `${avg("attendance_rate")}%` },
        { label: "Avg. Task Completion", value: `${avg("task_completion_rate")}%` },
        { label: "Avg. Overall Score", value: `${avg("overall_score")}%` },
      ];
    }
    default:
      return [];
  }
});

const tableRows = computed(() => {
  if (activeTab.value === "finance") {
    const rows = currentReport.value?.rows || {};
    return [
      ...(rows.fixed_costs || []).map((r) => ({
        category: "Fixed Cost",
        name: r.financial_items,
        budget: r.budget,
        actual: r.actual,
      })),
      ...(rows.infrastructure_tools || []).map((r) => ({
        category: "Infrastructure",
        name: r.tech_stack_component,
        budget: r.monthly_fee,
        actual: r.annual_fee,
      })),
      ...(rows.sdm_resources || []).map((r) => ({
        category: "SDM Resource",
        name: r.sdm_component,
        budget: r.budget,
        actual: r.actual,
      })),
    ];
  }

  return currentReport.value?.rows || [];
});

function formatCurrency(value) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const filterParams = computed(() => {
  const params = {};
  if (startDate.value) params.start_date = startDate.value;
  if (endDate.value) params.end_date = endDate.value;
  if (activeTab.value === "project" && projectStatus.value) params.status = projectStatus.value;
  if (activeTab.value === "project_expense" && projectExpenseProjectId.value) {
    params.project_id = projectExpenseProjectId.value;
  }
  if (activeTab.value === "staff_raport") {
    if (staffRaportSearch.value) params.search = staffRaportSearch.value;
    if (staffRaportEmploymentType.value) params.employment_type = staffRaportEmploymentType.value;
  }
  return params;
});

const reportMeta = computed(() => {
  if (activeTab.value === "attendance") return attendance.value.meta;
  if (activeTab.value === "payroll") return payroll.value.meta;
  if (activeTab.value === "project") return project.value.meta;
  if (activeTab.value === "project_expense") return projectExpense.value.meta;
  if (activeTab.value === "staff_raport") return staffRaport.value.meta;
  return null;
});

async function loadReport(page = 1) {
  switch (activeTab.value) {
    case "attendance":
      await reportStore.fetchAttendanceReport({ ...filterParams.value, page });
      break;
    case "payroll":
      await reportStore.fetchPayrollReport({ ...filterParams.value, page });
      break;
    case "employee":
      await reportStore.fetchEmployeeReport();
      break;
    case "finance":
      await reportStore.fetchFinanceReport(filterParams.value);
      break;
    case "pph21":
      await reportStore.fetchPph21Report(filterParams.value);
      break;
    case "ppn":
      await reportStore.fetchPpnReport(filterParams.value);
      break;
    case "project":
      await reportStore.fetchProjectReport({ ...filterParams.value, page });
      break;
    case "pph23":
      await reportStore.fetchPph23Report(filterParams.value);
      break;
    case "project_expense":
      await reportStore.fetchProjectExpenseReport({ ...filterParams.value, page });
      break;
    case "staff_raport":
      await reportStore.fetchStaffRaport({ ...filterParams.value, page });
      break;
  }
}

async function handleExport() {
  try {
    await reportStore.exportReport(activeTab.value, filterParams.value);
  } catch (error) {
    console.error("Export failed", error);
  }
}

watch(activeTab, () => {
  loadReport();
});

onMounted(() => {
  loadReport();
  projectStore.fetchProjects({ limit: 200 });
  optionStore.fetchEmploymentTypes();
});
</script>

<template>
  <div class="px-4 py-4">
    <div
      class="bg-white"
    >
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center"
          >
            <FileTextIcon class="w-5 h-5 text-[#0C51D9]" />
          </div>
          <div>
            <h3 class="text-brand-dark text-lg font-bold">Reports</h3>
            <p class="text-brand-light text-sm">
              Company-wide reports across HR modules
            </p>
          </div>
        </div>

        <button
          v-if="canExport && activeTab !== 'staff_raport'"
          @click="handleExport"
          :disabled="exporting"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2 disabled:opacity-50"
        >
          <Download class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">
            {{ exporting ? "Exporting..." : "Export Excel" }}
          </span>
        </button>
      </div>

      <!-- Tabs -->
      <div class="tabs-scroll flex flex-nowrap gap-2 overflow-x-auto border-b border-[#DCDEDD] pb-4 mb-4">
        <button
          v-for="tab in visibleTabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border transition-all duration-200 shrink-0 whitespace-nowrap"
          :class="
            activeTab === tab.key
              ? 'bg-[#0C51D9] border-[#0C51D9] text-white'
              : 'border-[#DCDEDD] text-brand-dark hover:border-[#0C51D9]'
          "
        >
          <component :is="tab.icon" class="w-4 h-4 shrink-0" />
          <span class="text-sm font-semibold">{{ tab.label }}</span>
        </button>
      </div>

      <!-- When this data appears -->
      <div
        v-if="activeTab === 'pph21'"
        class="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 mb-3"
      >
        Data muncul setelah ada Payroll yang sudah di-Run untuk periode terkait, dan hasil perhitungannya menghasilkan PPh 21 terutang (gaji karyawan melebihi PTKP). Belum ada Payroll berjalan pada periode ini = tabel akan kosong.
      </div>
      <div
        v-if="activeTab === 'ppn'"
        class="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 mb-3"
      >
        Data muncul setelah ada Invoice yang dibuat pada periode terkait dengan PPN (%) diisi lebih dari 0 saat pembuatan Invoice. Invoice tanpa PPN tidak akan muncul di sini.
      </div>
      <div
        v-if="activeTab === 'pph23'"
        class="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 mb-3"
      >
        Data muncul setelah ada Payment Receipt yang dibuat pada periode terkait dengan PPh 23 diisi (checkbox "Dipotong PPh 23?" saat membuat Payment Receipt). Payment Receipt tanpa PPh 23 tidak akan muncul di sini.
      </div>

      <!-- Disclaimer -->
      <div
        v-if="activeTab === 'pph21'"
        class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3"
      >
        PPh 21 dihitung dengan metode tahunan (Pasal 17), belum menggunakan metode TER bulanan DJP. Gunakan sebagai draft rekap, verifikasi ulang sebelum diinput ke Coretax.
      </div>
      <div
        v-if="activeTab === 'ppn' || activeTab === 'pph21' || activeTab === 'pph23'"
        class="text-xs text-brand-light bg-gray-50 border border-[#DCDEDD] rounded-xl px-3 py-2 mb-3"
      >
        Laporan ini adalah rekap siap ekspor untuk membantu pengisian Coretax secara manual, bukan integrasi otomatis ke sistem DJP.
      </div>

      <!-- Filters -->
      <div
        v-if="activeTab !== 'employee'"
        class="flex flex-col sm:flex-row gap-3 mb-2"
      >
        <div class="flex-1">
          <label class="text-xs text-brand-light font-medium mb-1 block"
            >Start Date</label
          >
          <input
            v-model="startDate"
            type="date"
            @change="loadReport(1)"
            class="w-full h-[42px] px-3 py-2 border border-[#DCDEDD] rounded-xl text-base appearance-none focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <div class="flex-1">
          <label class="text-xs text-brand-light font-medium mb-1 block"
            >End Date</label
          >
          <input
            v-model="endDate"
            type="date"
            @change="loadReport(1)"
            class="w-full h-[42px] px-3 py-2 border border-[#DCDEDD] rounded-xl text-base appearance-none focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <div v-if="activeTab === 'project'" class="flex-1">
          <label class="text-xs text-brand-light font-medium mb-1 block">Status</label>
          <select
            v-model="projectStatus"
            @change="loadReport(1)"
            class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div v-if="activeTab === 'project_expense'" class="flex-1">
          <label class="text-xs text-brand-light font-medium mb-1 block">Project</label>
          <select
            v-model="projectExpenseProjectId"
            @change="loadReport(1)"
            class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          >
            <option value="">All Projects</option>
            <option v-for="proj in projects" :key="proj.id" :value="proj.id">{{ proj.name }}</option>
          </select>
        </div>
        <div v-if="activeTab === 'staff_raport'" class="flex-1">
          <label class="text-xs text-brand-light font-medium mb-1 block">Name</label>
          <input
            v-model="staffRaportSearch"
            @input="loadReport(1)"
            type="text"
            placeholder="Search staff name..."
            class="w-full h-[42px] px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <div v-if="activeTab === 'staff_raport'" class="flex-1">
          <label class="text-xs text-brand-light font-medium mb-1 block">Employment Type</label>
          <select
            v-model="staffRaportEmploymentType"
            @change="loadReport(1)"
            class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          >
            <option value="">All Employment Types</option>
            <option v-for="opt in employmentTypes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>
      <p v-if="activeTab === 'staff_raport'" class="text-xs text-gray-400 -mt-1 mb-2">
        Attendance rate and task completion (and the resulting score/stars) are calculated for this date range. Click a row to view full details and download a PDF for a different period.
      </p>
      <p v-if="activeTab === 'project'" class="text-xs text-gray-400 -mt-1 mb-2">
        Filtered by each project's Start Date falling within this range.
      </p>
      <p v-if="activeTab === 'project_expense'" class="text-xs text-gray-400 -mt-1 mb-2">
        Filtered by each cash transaction's date falling within this range -- Budget itself isn't date-scoped.
      </p>
    </div>

    <!-- Summary Cards -->
    <SkeletonStatCards v-if="loading" :count="4" cols="grid-cols-2 lg:grid-cols-4" class="mb-6" />
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="bg-white border border-[#DCDEDD] rounded-[12px] p-4"
      >
        <p class="text-brand-light text-xs font-medium mb-1">
          {{ card.label }}
        </p>
        <p class="text-brand-dark text-xl font-bold">
          {{ card.value }}
        </p>
      </div>
    </div>

    <!-- Table -->
    <SkeletonTable v-if="loading" :rows="6" :cols="6" />
    <div v-else class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
            <th class="py-3 pr-4 font-semibold">No</th>
            <template v-if="activeTab === 'attendance'">
              <th class="py-3 pr-4 font-semibold">Date</th>
              <th class="py-3 pr-4 font-semibold">Employee</th>
              <th class="py-3 pr-4 font-semibold">Check In</th>
              <th class="py-3 pr-4 font-semibold">Check Out</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
            </template>
            <template v-else-if="activeTab === 'payroll'">
              <th class="py-3 pr-4 font-semibold">Period</th>
              <th class="py-3 pr-4 font-semibold">Employee</th>
              <th class="py-3 pr-4 font-semibold">Original Salary</th>
              <th class="py-3 pr-4 font-semibold">Final Salary</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
            </template>
            <template v-else-if="activeTab === 'employee'">
              <th class="py-3 pr-4 font-semibold">Code</th>
              <th class="py-3 pr-4 font-semibold">Name</th>
              <th class="py-3 pr-4 font-semibold">Job Title</th>
              <th class="py-3 pr-4 font-semibold">Team</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
            </template>
            <template v-else-if="activeTab === 'finance'">
              <th class="py-3 pr-4 font-semibold">Category</th>
              <th class="py-3 pr-4 font-semibold">Item</th>
              <th class="py-3 pr-4 font-semibold">Budget</th>
              <th class="py-3 pr-4 font-semibold">Actual</th>
            </template>
            <template v-else-if="activeTab === 'pph21'">
              <th class="py-3 pr-4 font-semibold">Period</th>
              <th class="py-3 pr-4 font-semibold">Employee</th>
              <th class="py-3 pr-4 font-semibold">NPWP</th>
              <th class="py-3 pr-4 font-semibold">PTKP Status</th>
              <th class="py-3 pr-4 font-semibold">Gross Salary</th>
              <th class="py-3 pr-4 font-semibold">PPh 21</th>
            </template>
            <template v-else-if="activeTab === 'ppn'">
              <th class="py-3 pr-4 font-semibold">Date</th>
              <th class="py-3 pr-4 font-semibold">Faktur Pajak No.</th>
              <th class="py-3 pr-4 font-semibold">Invoice No.</th>
              <th class="py-3 pr-4 font-semibold">Client</th>
              <th class="py-3 pr-4 font-semibold">DPP</th>
              <th class="py-3 pr-4 font-semibold">PPN</th>
            </template>
            <template v-else-if="activeTab === 'project'">
              <th class="py-3 pr-4 font-semibold">Project Name</th>
              <th class="py-3 pr-4 font-semibold">Leader</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
              <th class="py-3 pr-4 font-semibold">Priority</th>
              <th class="py-3 pr-4 font-semibold">Start Date</th>
              <th class="py-3 pr-4 font-semibold">End Date</th>
              <th class="py-3 pr-4 font-semibold">Budget</th>
              <th class="py-3 pr-4 font-semibold">Tasks Done</th>
            </template>
            <template v-else-if="activeTab === 'pph23'">
              <th class="py-3 pr-4 font-semibold">Date</th>
              <th class="py-3 pr-4 font-semibold">Receipt No.</th>
              <th class="py-3 pr-4 font-semibold">Invoice No.</th>
              <th class="py-3 pr-4 font-semibold">Client</th>
              <th class="py-3 pr-4 font-semibold">% PPh 23</th>
              <th class="py-3 pr-4 font-semibold">Gross Amount</th>
              <th class="py-3 pr-4 font-semibold">PPh 23 Withheld</th>
              <th class="py-3 pr-4 font-semibold">Net Received</th>
            </template>
            <template v-else-if="activeTab === 'project_expense'">
              <th class="py-3 pr-4 font-semibold">Tanggal</th>
              <th class="py-3 pr-4 font-semibold">Project Name</th>
              <th class="py-3 pr-4 font-semibold">Keterangan</th>
              <th class="py-3 pr-4 font-semibold">Debit</th>
              <th class="py-3 pr-4 font-semibold">Kredit</th>
            </template>
            <template v-else-if="activeTab === 'staff_raport'">
              <th class="py-3 pr-4 font-semibold">Name</th>
              <th class="py-3 pr-4 font-semibold">Job Title</th>
              <th class="py-3 pr-4 font-semibold">Employment Type</th>
              <th class="py-3 pr-4 font-semibold">Attendance</th>
              <th class="py-3 pr-4 font-semibold">Tasks Done</th>
              <th class="py-3 pr-4 font-semibold">Rating</th>
              <th class="py-3 pr-4 font-semibold"></th>
            </template>
          </tr>
        </thead>
        <tbody>
          <template v-if="activeTab === 'attendance'">
            <tr
              v-for="(row, index) in tableRows"
              :key="row.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (attendance.meta.current_page - 1) * attendance.meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4">{{ formatDate(row.date) }}</td>
              <td class="py-3 pr-4">{{ row.employee?.user?.name ?? "N/A" }}</td>
              <td class="py-3 pr-4">
                {{ row.check_in ? formatDate(row.check_in) : "-" }}
              </td>
              <td class="py-3 pr-4">
                {{ row.check_out ? formatDate(row.check_out) : "-" }}
              </td>
              <td class="py-3 pr-4 capitalize">
                {{ (row.status || "").replace("_", " ") }}
              </td>
            </tr>
          </template>
          <template v-else-if="activeTab === 'payroll'">
            <tr
              v-for="(row, index) in tableRows"
              :key="row.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (payroll.meta.current_page - 1) * payroll.meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4">{{ formatDate(row.salary_month) }}</td>
              <td class="py-3 pr-4">{{ row.employee?.user?.name ?? "N/A" }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.original_salary) }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.final_salary) }}</td>
              <td class="py-3 pr-4 capitalize">
                {{ row.payment_status === "paid" ? "Paid" : "Pending" }}
              </td>
            </tr>
          </template>
          <template v-else-if="activeTab === 'employee'">
            <tr
              v-for="(row, index) in tableRows"
              :key="row.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ index + 1 }}</td>
              <td class="py-3 pr-4">{{ row.code }}</td>
              <td class="py-3 pr-4">{{ row.user?.name ?? "N/A" }}</td>
              <td class="py-3 pr-4">{{ row.job_information?.job_title ?? "N/A" }}</td>
              <td class="py-3 pr-4">{{ row.job_information?.team?.name ?? "N/A" }}</td>
              <td class="py-3 pr-4 capitalize">
                {{ row.job_information?.status ?? "N/A" }}
              </td>
            </tr>
          </template>
          <template v-else-if="activeTab === 'finance'">
            <tr
              v-for="(row, idx) in tableRows"
              :key="idx"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ idx + 1 }}</td>
              <td class="py-3 pr-4">{{ row.category }}</td>
              <td class="py-3 pr-4">{{ row.name }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.budget) }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.actual) }}</td>
            </tr>
          </template>
          <template v-else-if="activeTab === 'pph21'">
            <tr
              v-for="(row, idx) in tableRows"
              :key="row.id ?? idx"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ idx + 1 }}</td>
              <td class="py-3 pr-4">{{ formatDate(row.salary_month) }}</td>
              <td class="py-3 pr-4">{{ row.employee?.user?.name ?? "N/A" }}</td>
              <td class="py-3 pr-4">{{ row.employee?.npwp ?? "-" }}</td>
              <td class="py-3 pr-4">{{ row.employee?.job_information?.ptkp_status ?? "TK/0" }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.gross_salary) }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.pph21) }}</td>
            </tr>
          </template>
          <template v-else-if="activeTab === 'ppn'">
            <tr
              v-for="(row, idx) in tableRows"
              :key="row.id ?? idx"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ idx + 1 }}</td>
              <td class="py-3 pr-4">{{ formatDate(row.date) }}</td>
              <td class="py-3 pr-4">{{ row.faktur_pajak_number ?? "-" }}</td>
              <td class="py-3 pr-4">{{ row.invoice_number }}</td>
              <td class="py-3 pr-4">{{ row.client_name }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.subtotal) }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.ppn_amount) }}</td>
            </tr>
          </template>
          <template v-else-if="activeTab === 'project'">
            <tr
              v-for="(row, index) in tableRows"
              :key="row.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (project.meta.current_page - 1) * project.meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4 font-semibold text-brand-dark">{{ row.name }}</td>
              <td class="py-3 pr-4">{{ row.project_leader?.user?.name ?? "N/A" }}</td>
              <td class="py-3 pr-4 capitalize">{{ (row.status || "").replace("_", " ") }}</td>
              <td class="py-3 pr-4 capitalize">{{ row.priority }}</td>
              <td class="py-3 pr-4">{{ formatDate(row.start_date) }}</td>
              <td class="py-3 pr-4">{{ row.end_date ? formatDate(row.end_date) : "-" }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.budget) }}</td>
              <td class="py-3 pr-4">{{ row.tasks_done_count }}/{{ row.tasks_total_count }}</td>
            </tr>
          </template>
          <template v-else-if="activeTab === 'pph23'">
            <tr
              v-for="(row, idx) in tableRows"
              :key="row.id ?? idx"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ idx + 1 }}</td>
              <td class="py-3 pr-4">{{ formatDate(row.date) }}</td>
              <td class="py-3 pr-4">{{ row.receipt_number }}</td>
              <td class="py-3 pr-4">{{ row.invoice?.invoice_number ?? "-" }}</td>
              <td class="py-3 pr-4">{{ row.invoice?.client_name ?? row.received_from }}</td>
              <td class="py-3 pr-4">{{ Number(row.pph23_percent) }}%</td>
              <td class="py-3 pr-4">{{ formatCurrency(Number(row.amount) + Number(row.pph23_amount)) }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.pph23_amount) }}</td>
              <td class="py-3 pr-4">{{ formatCurrency(row.amount) }}</td>
            </tr>
          </template>
          <template v-else-if="activeTab === 'project_expense'">
            <tr
              v-for="(row, index) in tableRows"
              :key="row.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (projectExpense.meta.current_page - 1) * projectExpense.meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4">{{ formatDate(row.transaction_date) }}</td>
              <td class="py-3 pr-4 font-semibold text-brand-dark">{{ row.project_name ?? "N/A" }}</td>
              <td class="py-3 pr-4">{{ row.description }}</td>
              <td class="py-3 pr-4 text-emerald-600">{{ row.type === "debit" ? formatCurrency(row.amount) : "-" }}</td>
              <td class="py-3 pr-4 text-red-600">{{ row.type === "credit" ? formatCurrency(row.amount) : "-" }}</td>
            </tr>
          </template>
          <template v-else-if="activeTab === 'staff_raport'">
            <tr
              v-for="(row, index) in tableRows"
              :key="row.employee_id"
              @click="openRaportDetail(row.employee_id)"
              class="border-b border-[#F1F1F1] hover:bg-gray-50 cursor-pointer"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (staffRaport.meta.current_page - 1) * staffRaport.meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4 font-semibold text-brand-dark">{{ row.name ?? "N/A" }}</td>
              <td class="py-3 pr-4">{{ row.job_title ?? "-" }}</td>
              <td class="py-3 pr-4 capitalize">{{ (row.employment_type || "-").replace("_", " ") }}</td>
              <td class="py-3 pr-4">{{ row.attendance_rate !== null ? `${row.attendance_rate}%` : "-" }}</td>
              <td class="py-3 pr-4">{{ row.task_completion_rate !== null ? `${row.task_completion_rate}%` : "-" }}</td>
              <td class="py-3 pr-4">
                <span class="flex items-center gap-0.5">
                  <Star
                    v-for="i in 5"
                    :key="i"
                    class="w-3.5 h-3.5"
                    :class="i <= row.stars ? 'text-amber-500' : 'text-gray-200'"
                    :fill="i <= row.stars ? 'currentColor' : 'none'"
                  />
                </span>
              </td>
              <td class="py-3 pr-4 text-[#0C51D9] text-xs font-semibold">View Detail</td>
            </tr>
          </template>
        </tbody>
      </table>

      <div
        v-if="!loading && tableRows.length === 0"
        class="text-center py-12 text-gray-500"
      >
        <p class="text-lg font-semibold">No data found</p>
        <p class="text-sm">Try adjusting the date range or filters</p>
      </div>

      <Pagination
        v-if="reportMeta"
        :meta="reportMeta"
        :loading="loading"
        item-label="records"
        @page-change="loadReport"
      />
    </div>

    <!-- Staff Raport Detail Modal -->
    <div v-if="showRaportDetail" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closeRaportDetail">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between sticky top-0 bg-white">
          <h3 class="text-brand-dark text-lg font-bold">Staff Raport</h3>
          <button @click="closeRaportDetail" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div v-if="loadingDetail" class="p-5">
          <SkeletonStatCards :count="3" cols="grid-cols-3" />
        </div>

        <div v-else-if="staffRaportDetail" class="p-5 space-y-5">
          <div>
            <p class="text-brand-dark text-base font-bold">{{ staffRaportDetail.employee.name }}</p>
            <p class="text-brand-light text-sm">
              {{ staffRaportDetail.employee.code }}
              <span v-if="staffRaportDetail.employee.job_title"> • {{ staffRaportDetail.employee.job_title }}</span>
              <span v-if="staffRaportDetail.employee.team"> • {{ staffRaportDetail.employee.team }}</span>
            </p>
            <p class="text-brand-light text-xs mt-0.5 capitalize">
              {{ (staffRaportDetail.employee.employment_type || "-").replace("_", " ") }}
              <span v-if="staffRaportDetail.employee.start_date"> • Joined {{ formatDate(staffRaportDetail.employee.start_date) }}</span>
            </p>
            <div class="flex items-center gap-1 mt-2">
              <Star
                v-for="i in 5"
                :key="i"
                class="w-5 h-5"
                :class="i <= staffRaportDetail.stars ? 'text-amber-500' : 'text-gray-200'"
                :fill="i <= staffRaportDetail.stars ? 'currentColor' : 'none'"
              />
              <span class="text-sm text-brand-light ml-1">{{ staffRaportDetail.overall_score !== null ? `${staffRaportDetail.overall_score}%` : "No data" }}</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="bg-gray-50 border border-[#DCDEDD] rounded-xl p-3">
              <p class="text-brand-dark text-lg font-bold">{{ staffRaportDetail.attendance_rate !== null ? `${staffRaportDetail.attendance_rate}%` : "-" }}</p>
              <p class="text-brand-light text-xs">Attendance ({{ staffRaportDetail.attendance.present + staffRaportDetail.attendance.late }}/{{ staffRaportDetail.attendance.total }})</p>
            </div>
            <div class="bg-gray-50 border border-[#DCDEDD] rounded-xl p-3">
              <p class="text-brand-dark text-lg font-bold">{{ staffRaportDetail.task_completion_rate !== null ? `${staffRaportDetail.task_completion_rate}%` : "-" }}</p>
              <p class="text-brand-light text-xs">Tasks Done ({{ staffRaportDetail.tasks.done }}/{{ staffRaportDetail.tasks.total }})</p>
            </div>
            <div class="bg-gray-50 border border-[#DCDEDD] rounded-xl p-3">
              <p class="text-brand-dark text-lg font-bold">{{ staffRaportDetail.overall_score !== null ? `${staffRaportDetail.overall_score}%` : "-" }}</p>
              <p class="text-brand-light text-xs">Overall Score</p>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-brand-dark mb-2">Completed Tasks ({{ staffRaportDetail.completed_tasks.length }})</h4>
            <div v-if="staffRaportDetail.completed_tasks.length" class="border border-[#DCDEDD] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <div
                v-for="(task, idx) in staffRaportDetail.completed_tasks"
                :key="idx"
                class="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-[#DCDEDD] last:border-b-0 text-sm"
              >
                <span class="text-brand-dark">{{ task.title }}<span v-if="task.project_name" class="text-brand-light"> ({{ task.project_name }})</span></span>
                <span class="text-brand-light text-xs shrink-0">{{ formatDate(task.due_date) }}</span>
              </div>
            </div>
            <p v-else class="text-brand-light text-sm">No completed tasks in this period.</p>
          </div>

          <div v-if="staffRaportDetail.performance_review" class="border-t border-[#DCDEDD] pt-4">
            <h4 class="text-sm font-semibold text-brand-dark mb-2">Latest Performance Review</h4>
            <div class="bg-gray-50 border border-[#DCDEDD] rounded-xl p-3.5 space-y-2">
              <div class="flex items-center justify-between text-xs text-brand-light">
                <span>
                  {{ staffRaportDetail.performance_review.period }}
                  <span v-if="staffRaportDetail.performance_review.reviewer_name"> • Reviewed by {{ staffRaportDetail.performance_review.reviewer_name }}</span>
                </span>
                <span class="font-semibold text-[#0C51D9]">{{ staffRaportDetail.performance_review.overall_rating }} / 5</span>
              </div>
              <div v-if="staffRaportDetail.performance_review.category_scores" class="flex flex-wrap gap-2">
                <span
                  v-for="(score, category) in staffRaportDetail.performance_review.category_scores"
                  :key="category"
                  class="px-2 py-0.5 rounded-full text-xs bg-white border border-[#DCDEDD] text-brand-dark capitalize"
                >
                  {{ category.replace("_", " ") }}: {{ score }}/5
                </span>
              </div>
              <p v-if="staffRaportDetail.performance_review.strengths" class="text-xs text-brand-dark"><strong>Strengths:</strong> {{ staffRaportDetail.performance_review.strengths }}</p>
              <p v-if="staffRaportDetail.performance_review.areas_for_improvement" class="text-xs text-brand-dark"><strong>Areas for Improvement:</strong> {{ staffRaportDetail.performance_review.areas_for_improvement }}</p>
            </div>
          </div>

          <div class="pt-3 border-t border-[#DCDEDD]">
            <label class="text-sm font-semibold text-brand-dark mb-2 block">Download PDF for period</label>
            <div class="flex items-center gap-3">
              <select v-model="raportPeriod" class="flex-1 px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
              <button
                @click="handleDownloadPdf"
                :disabled="downloadingPdf"
                class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                <Download class="w-4 h-4 text-white" />
                <span class="text-brand-white text-sm font-semibold">{{ downloadingPdf ? "Downloading..." : "Download PDF" }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 8 report tabs no longer wrap into a ragged multi-row block on mobile/
   tablet -- they scroll horizontally in one row instead, scrollbar hidden
   since the row itself makes it obvious there's more to swipe to. */
.tabs-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tabs-scroll::-webkit-scrollbar {
  display: none;
}
</style>
