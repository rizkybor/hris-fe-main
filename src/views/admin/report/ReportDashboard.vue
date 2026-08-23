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
} from "lucide-vue-next";
import { useReportStore } from "@/stores/report";
import { can } from "@/helpers/permissionHelper";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";

const reportStore = useReportStore();
const { attendance, payroll, employee, finance, pph21, ppn, loading, exporting } =
  storeToRefs(reportStore);

const tabs = [
  { key: "attendance", label: "Attendance", icon: ClockIcon },
  { key: "payroll", label: "Payroll", icon: Wallet },
  { key: "employee", label: "Employee", icon: Users },
  { key: "finance", label: "Finance", icon: Building2Icon },
  { key: "pph21", label: "PPh 21", icon: ReceiptIcon },
  { key: "ppn", label: "PPN", icon: PercentIcon },
];

const activeTab = ref("attendance");
const startDate = ref("");
const endDate = ref("");

const canExport = computed(() => can("report-export"));

const currentReport = computed(() => {
  return {
    attendance: attendance.value,
    payroll: payroll.value,
    employee: employee.value,
    finance: finance.value,
    pph21: pph21.value,
    ppn: ppn.value,
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
  return params;
});

const reportMeta = computed(() => {
  if (activeTab.value === "attendance") return attendance.value.meta;
  if (activeTab.value === "payroll") return payroll.value.meta;
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
});
</script>

<template>
  <div>
    <div
      class="bg-white p-5"
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
          v-if="canExport"
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
      <div class="flex flex-wrap gap-2 border-b border-[#DCDEDD] pb-4 mb-4">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200"
          :class="
            activeTab === tab.key
              ? 'bg-[#0C51D9] border-[#0C51D9] text-white'
              : 'border-[#DCDEDD] text-brand-dark hover:border-[#0C51D9]'
          "
        >
          <component :is="tab.icon" class="w-4 h-4" />
          <span class="text-sm font-semibold">{{ tab.label }}</span>
        </button>
      </div>

      <!-- Disclaimer -->
      <div
        v-if="activeTab === 'pph21'"
        class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3"
      >
        PPh 21 dihitung dengan metode tahunan (Pasal 17), belum menggunakan metode TER bulanan DJP. Gunakan sebagai draft rekap, verifikasi ulang sebelum diinput ke Coretax.
      </div>
      <div
        v-if="activeTab === 'ppn' || activeTab === 'pph21'"
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
            class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
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
            class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
      </div>
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
  </div>
</template>
