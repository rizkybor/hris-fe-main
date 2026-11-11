<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
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
  AlertTriangle,
  Star,
  ChevronRight,
  RefreshCw,
  Wrench,
  Trash2,
  CalendarRange,
  Search,
} from "lucide-vue-next";
import { useReportStore } from "@/stores/report";
import { useProjectStore } from "@/stores/project";
import { useOptionStore } from "@/stores/option";
import { useAlertModalStore } from "@/stores/alertModal";
import { can, hasAnyRole } from "@/helpers/permissionHelper";
import { useScrollFade } from "@/composables/useScrollFade";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";
import { UiPageHeader, UiStat, UiButton, UiBadge, UiInput, UiSelect, UiTable, UiEmpty, UiAlert, UiModal } from "@/components/ui";
import Pagination from "@/components/common/Pagination.vue";
import SignatureToggle from "@/components/common/SignatureToggle.vue";
import AttendanceDetailModal from "@/components/admin/attendance/AttendanceDetailModal.vue";
import DocumentReport from "@/components/admin/report/DocumentReport.vue";
import { formatTime as formatTimeUtil } from "@/utils/dateUtils";
import { formatHours, CONTRACT_STATUS, LEFTOVER_POLICY, usageColor } from "@/utils/maintenance";

const router = useRouter();
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
  subscription,
  maintenance,
  documents,
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
  { key: "subscription", label: "Subscription Lists", icon: RefreshCw },
  { key: "maintenance", label: "Maintenance Lists", icon: Wrench },
  { key: "documents", label: "Document Reports", icon: FileTextIcon },
  { key: "staff_raport", label: "Staff Raport", icon: Star, permission: "staff-raport-menu" },
];

const visibleTabs = computed(() => tabs.filter((t) => !t.permission || can(t.permission)));

// Only tabs backed by exactly one real, deletable record -- not Finance
// (three tables merged into fake rows), PPh 21 or Staff Raport (both
// purely computed from Payroll/Attendance, no table of their own).
// Deleting here deletes the underlying real record, so this is gated by
// role (Superadmin/Manager only), matching the backend's RoleMiddleware
// check on the same two endpoints.
const DELETABLE_REPORT_TYPES = ["attendance", "payroll", "employee", "ppn", "pph23", "project", "subscription"];
const canDeleteReports = computed(() => hasAnyRole(["superadmin", "manager"]));
const showDeleteColumn = computed(() => canDeleteReports.value && DELETABLE_REPORT_TYPES.includes(activeTab.value));

const alertModal = useAlertModalStore();
const deletingRowId = ref(null);

const rowIdField = (row) => row.id ?? row.employee_id;

const handleDeleteRow = async (row) => {
  const id = rowIdField(row);
  if (!(await alertModal.confirm("Delete this record? This deletes the actual underlying record, not just its appearance in this report.", { type: "danger", confirmText: "Delete" }))) return;

  deletingRowId.value = id;
  try {
    await reportStore.deleteRow(activeTab.value, id);
    await loadReport(reportMeta.value?.current_page || 1);
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to delete record.", { type: "danger" });
  } finally {
    deletingRowId.value = null;
  }
};

// Delete-by-range modal
const showDeleteRangeModal = ref(false);
const deleteRangeStart = ref("");
const deleteRangeEnd = ref("");
const deletingRange = ref(false);

const openDeleteRangeModal = () => {
  deleteRangeStart.value = "";
  deleteRangeEnd.value = "";
  showDeleteRangeModal.value = true;
};

const closeDeleteRangeModal = () => {
  showDeleteRangeModal.value = false;
};

const handleDeleteRange = async () => {
  if (!deleteRangeStart.value || !deleteRangeEnd.value) return;
  const tabLabel = tabs.find((t) => t.key === activeTab.value)?.label ?? activeTab.value;

  if (
    !(await alertModal.confirm(
      `Delete every "${tabLabel}" record between ${deleteRangeStart.value} and ${deleteRangeEnd.value}? This deletes the actual underlying records and cannot be undone from this screen.`,
      { type: "danger", confirmText: "Delete Range" }
    ))
  )
    return;

  deletingRange.value = true;
  try {
    const result = await reportStore.deleteByRange(activeTab.value, deleteRangeStart.value, deleteRangeEnd.value);
    showDeleteRangeModal.value = false;
    await loadReport(1);
    const skippedNote = result?.skipped?.length ? ` ${result.skipped.length} record(s) were skipped (e.g. already-paid Payroll).` : "";
    await alertModal.alert(`${result?.deleted ?? 0} record(s) deleted.${skippedNote}`, { type: "success" });
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to delete records in this range.", { type: "danger" });
  } finally {
    deletingRange.value = false;
  }
};

// 11 tabs routinely overflow the row at every breakpoint (not just mobile),
// so unlike other tab bars in the app this hint stays visible on desktop
// and tablet too -- shown/hidden based on actual scroll position, not a
// fixed screen-size breakpoint.
const { scrollRef: tabScrollRef, showLeftFade: showTabLeftFade, showRightFade: showTabRightFade, updateFade: updateTabFade } = useScrollFade();

const activeTab = ref("attendance");
const startDate = ref("");
const endDate = ref("");
const projectStatus = ref("");
const subscriptionStatus = ref("");
// Maintenance Lists: contract status + which month's quota use to show.
const maintenanceStatus = ref("");
const maintenanceMonth = ref(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
const staffRaportSearch = ref("");
const staffRaportEmploymentType = ref("");

const canExport = computed(() => can("report-export"));

// Finance tab has two sources: the Company Cash Book (default) or Operational Cost.
const FINANCE_SOURCES = [
  { key: "cash_book", label: "Company Cash Book" },
  { key: "operational_cost", label: "Operational Cost" },
];
const financeSource = ref("cash_book");
const isOperationalCost = computed(() => activeTab.value === "finance" && financeSource.value === "operational_cost");
const setFinanceSource = (key) => {
  if (financeSource.value === key) return;
  financeSource.value = key;
  loadReport(1);
};

// Staff Raport detail modal
const showRaportDetail = ref(false);
// One period drives both the modal and the PDF: "filter" = the list's date
// range (what the row's score was computed for), or week / month / all time.
const raportPeriod = ref("filter");
const raportUseSignature = ref(false);
const loadingDetail = ref(false);
const raportEmployeeId = ref(null);

const raportPeriodParams = () => {
  if (raportPeriod.value !== "filter") return { period: raportPeriod.value };
  const { start_date, end_date } = filterParams.value;
  return start_date && end_date ? { start_date, end_date } : { period: "month" };
};

const loadRaportDetail = async () => {
  loadingDetail.value = true;
  try {
    await reportStore.fetchStaffRaportDetail(raportEmployeeId.value, raportPeriodParams());
  } finally {
    loadingDetail.value = false;
  }
};

const openRaportDetail = async (employeeId) => {
  raportEmployeeId.value = employeeId;
  raportPeriod.value = "filter";
  showRaportDetail.value = true;
  await loadRaportDetail();
};

const closeRaportDetail = () => {
  showRaportDetail.value = false;
};

// Subscription detail modal -- the report row already carries everything
// needed (client, project, bundled services, invoice configuration), so
// this just opens with the clicked row rather than making another
// request.
const showSubscriptionDetail = ref(false);
const selectedSubscription = ref(null);

const openSubscriptionDetail = (row) => {
  selectedSubscription.value = row;
  showSubscriptionDetail.value = true;
};

const closeSubscriptionDetail = () => {
  showSubscriptionDetail.value = false;
};

// PPN invoice detail modal -- same idea: the report row is already the
// full Invoice record, so no extra request is needed to show it.
const showInvoiceDetail = ref(false);
const selectedInvoice = ref(null);

const openInvoiceDetail = (row) => {
  selectedInvoice.value = row;
  showInvoiceDetail.value = true;
};

const closeInvoiceDetail = () => {
  showInvoiceDetail.value = false;
};

// PPh 23 receipt detail modal -- same idea again: the report row is
// already the full PaymentReceipt record (with its invoice relation
// loaded), so no extra request is needed to show it.
const showReceiptDetail = ref(false);
const selectedReceipt = ref(null);

const openReceiptDetail = (row) => {
  selectedReceipt.value = row;
  showReceiptDetail.value = true;
};

const closeReceiptDetail = () => {
  showReceiptDetail.value = false;
};

// Attendance detail modal -- shared with Attendance Records so both pages
// show the same photo/location breakdown from the same component.
const showAttendanceDetail = ref(false);
const selectedAttendance = ref(null);

const openAttendanceDetail = (row) => {
  selectedAttendance.value = row;
  showAttendanceDetail.value = true;
};

const closeAttendanceDetail = () => {
  showAttendanceDetail.value = false;
};

const attendanceStatusTone = {
  present: "ok",
  late: "warn",
  absent: "bad",
  remote: "info",
  overtime: "accent",
};

// Punctuality boxes in the raport detail.
const raportAttendanceBoxes = computed(() => {
  const a = staffRaportDetail.value?.attendance;
  if (!a) return [];
  const missed = (a.absent ?? 0) + (a.no_record ?? 0);
  const t = a.late_tiers || {};
  return [
    { label: "On time", value: (a.present ?? 0) + (a.remote ?? 0), sub: a.remote ? `incl. ${a.remote} remote` : null },
    { label: "Late", value: a.late ?? 0, class: a.late ? "text-ui-warn" : null, sub: a.late ? `${a.late_minutes} min total · ${t.severe || 0} over 1 h` : null },
    { label: "Absent / no check-in", value: missed, class: missed ? "text-ui-bad" : null, sub: a.no_record ? `${a.no_record} without any record` : null },
    { label: "Not counted", value: (a.sick_leave ?? 0) + (a.leave ?? 0) + (a.holidays ?? 0), sub: `${a.sick_leave ?? 0} sick · ${a.leave ?? 0} leave · ${a.holidays ?? 0} holiday` },
  ];
});

const handleDownloadPdf = async () => {
  if (!staffRaportDetail.value) return;
  try {
    await reportStore.downloadStaffRaportPdf(
      staffRaportDetail.value.employee.id,
      raportPeriodParams(),
      staffRaportDetail.value.employee.name,
      raportUseSignature.value
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
    subscription: subscription.value,
    maintenance: maintenance.value,
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
      if (summary.items_total !== undefined) {
        return [
          { label: "Fixed Cost / bulan", value: formatCurrency(summary.fixed_cost) },
          { label: "SDM / bulan", value: formatCurrency(summary.sdm) },
          { label: "Infrastructure / bulan", value: formatCurrency(summary.infrastructure_monthly) },
          { label: "Infrastructure / tahun", value: formatCurrency(summary.infrastructure_annual) },
        ];
      }
      return [
        { label: "Saldo Awal Periode", value: formatCurrency(summary.period_opening) },
        { label: "Total Debit (Masuk)", value: formatCurrency(summary.total_debit) },
        { label: "Total Kredit (Keluar)", value: formatCurrency(summary.total_credit) },
        { label: "Saldo Akhir Periode", value: formatCurrency(summary.period_closing) },
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
    case "project": {
      const counts = summary.billing_status_counts || {};
      const paidPct = summary.total_invoiced ? Math.round((summary.total_paid / summary.total_invoiced) * 100) : null;
      return [
        { label: "Projects", value: summary.total_projects ?? 0, sub: `${summary.active_projects ?? 0} active · ${summary.completed_projects ?? 0} completed`, subClass: "text-ui-muted" },
        { label: "Total Budget", value: formatCurrency(summary.total_budget), sub: `Not invoiced yet ${formatCurrency(summary.total_not_invoiced)}`, subClass: "text-ui-muted" },
        { label: "Invoiced", value: formatCurrency(summary.total_invoiced), sub: `Paid ${formatCurrency(summary.total_paid)}${paidPct !== null ? ` (${paidPct}%)` : ""}`, subClass: "text-ui-ok" },
        {
          label: "Outstanding",
          value: formatCurrency(summary.total_outstanding),
          sub: `${counts.settled ?? 0} settled · ${counts.outstanding ?? 0} outstanding${counts.overpaid ? ` · ${counts.overpaid} overpaid` : ""}`,
          subClass: summary.total_outstanding > 0 ? "text-ui-warn" : "text-ui-muted",
        },
      ];
    }
    case "pph23":
      return [
        { label: "Receipts", value: summary.total_receipts ?? 0 },
        { label: "Total Gross", value: formatCurrency(summary.total_gross) },
        { label: "Total PPh 23 Withheld", value: formatCurrency(summary.total_pph23) },
        { label: "Total Net Received", value: formatCurrency(summary.total_net_received) },
      ];
    case "subscription":
      return [
        { label: "MRR (Monthly Recurring Revenue)", value: formatCurrency(summary.mrr) },
        { label: "ARR (Annual Recurring Revenue)", value: formatCurrency(summary.arr) },
        { label: "Active Subscriptions", value: summary.active_count ?? 0 },
        { label: "Upcoming Renewals (30d)", value: summary.upcoming_renewals_count ?? 0 },
      ];
    case "maintenance":
      return [
        { label: "Active Contracts", value: `${summary.active_count ?? 0} / ${summary.total_count ?? 0}` },
        { label: `Hours Used · ${maintenanceMonthLabel.value}`, value: `${formatHours(summary.used)} / ${formatHours(summary.available)}` },
        { label: "Over Quota", value: summary.over_count ?? 0 },
        { label: "Development Balance", value: formatHours(summary.balance), sub: summary.expiring ? `${formatHours(summary.expiring)} expiring in 30 days` : null },
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
    // Ignore a response from the other source still on screen mid-switch.
    const report = currentReport.value;
    return report?.source === financeSource.value && Array.isArray(report.rows) ? report.rows : [];
  }

  return currentReport.value?.rows || [];
});

// Project tab: invoiced vs paid per project (see ProjectBillingService).
const BILLING_STATUS = {
  settled: { label: "Settled", tone: "ok" },
  outstanding: { label: "Outstanding", tone: "warn" },
  overpaid: { label: "Overpaid", tone: "bad" },
  not_invoiced: { label: "Not invoiced", tone: "neutral" },
};

const subscriptionStatusTone = {
  active: "ok",
  postponed: "warn",
  cancelled: "neutral",
};

const contractStatusTone = { active: "ok", paused: "warn", ended: "neutral" };

const subscriptionStatusLabel = {
  active: "Active",
  postponed: "Postponed",
  cancelled: "Not Active",
};

// A subscription can bundle several services -- list them all instead of
// the single service_type this column used to show.
function subscriptionServicesLabel(services) {
  if (!services?.length) return "-";
  return services
    .map((s) => (s.product_name ? `${s.service_type} (${s.product_name})` : s.service_type))
    .join(", ")
    .replace(/_/g, " ");
}

// Sum of every bundled service's optional ICANN/registrar fee -- not part
// of VAT, so it's tallied separately from the VAT/PPN total above.
function subscriptionIcannFeeTotal(subscription) {
  return (subscription.services || []).reduce((sum, s) => sum + (Number(s.icann_fee) || 0), 0);
}

const maintenanceMonthLabel = computed(() => {
  const m = maintenance.value?.month;
  return m ? new Date(`${m}-01T00:00:00`).toLocaleDateString("id-ID", { month: "short", year: "numeric" }) : "this month";
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
  if (!["subscription", "maintenance"].includes(activeTab.value)) {
    if (startDate.value) params.start_date = startDate.value;
    if (endDate.value) params.end_date = endDate.value;
  }
  if (activeTab.value === "finance") {
    params.source = financeSource.value;
    if (financeSource.value === "operational_cost") {
      delete params.start_date;
      delete params.end_date;
    }
  }
  if (activeTab.value === "project" && projectStatus.value) params.status = projectStatus.value;
  if (activeTab.value === "staff_raport") {
    if (staffRaportSearch.value) params.search = staffRaportSearch.value;
    if (staffRaportEmploymentType.value) params.employment_type = staffRaportEmploymentType.value;
  }
  if (activeTab.value === "maintenance") {
    if (maintenanceStatus.value) params.status = maintenanceStatus.value;
    if (maintenanceMonth.value) params.month = maintenanceMonth.value;
  }
  if (activeTab.value === "subscription" && subscriptionStatus.value) {
    params.status = subscriptionStatus.value;
  }
  return params;
});

const reportMeta = computed(() => {
  if (activeTab.value === "attendance") return attendance.value.meta;
  if (activeTab.value === "payroll") return payroll.value.meta;
  if (activeTab.value === "project") return project.value.meta;
  if (activeTab.value === "staff_raport") return staffRaport.value.meta;
  if (activeTab.value === "finance" && finance.value?.source === "cash_book" && financeSource.value === "cash_book") return finance.value.meta;
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
      await reportStore.fetchFinanceReport({ ...filterParams.value, page });
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
    case "subscription":
      await reportStore.fetchSubscriptionReport(filterParams.value);
      break;
    case "maintenance":
      await reportStore.fetchMaintenanceReport(filterParams.value);
      break;
    case "documents":
      await reportStore.fetchDocumentReport(filterParams.value);
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

// ----- Presentation only: table columns, row keys, row clicks and the
// phone card for each report. -----
const R = "right";
const COLUMNS = {
  attendance: [
    { key: "date", label: "Date" },
    { key: "employee", label: "Employee" },
    { key: "check_in", label: "Check In" },
    { key: "check_out", label: "Check Out" },
    { key: "status", label: "Status" },
  ],
  payroll: [
    { key: "period", label: "Period" },
    { key: "employee", label: "Employee" },
    { key: "original_salary", label: "Original Salary", align: R },
    { key: "final_salary", label: "Final Salary", align: R },
    { key: "status", label: "Status" },
  ],
  employee: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "job_title", label: "Job Title" },
    { key: "team", label: "Team" },
    { key: "status", label: "Status" },
  ],
  operational_cost: [
    { key: "category", label: "Category" },
    { key: "item", label: "Item" },
    { key: "monthly", label: "Biaya / Bulan", align: R },
    { key: "annual", label: "Biaya / Tahun", align: R },
    { key: "status", label: "Status" },
  ],
  finance: [
    { key: "date", label: "Tanggal" },
    { key: "description", label: "Keterangan" },
    { key: "source", label: "Sumber" },
    { key: "debit", label: "Debit", align: R },
    { key: "credit", label: "Kredit", align: R },
    { key: "balance", label: "Saldo", align: R },
  ],
  pph21: [
    { key: "period", label: "Period" },
    { key: "employee", label: "Employee" },
    { key: "npwp", label: "NPWP" },
    { key: "ptkp", label: "PTKP Status" },
    { key: "gross", label: "Gross Salary", align: R },
    { key: "pph21", label: "PPh 21", align: R },
  ],
  ppn: [
    { key: "date", label: "Date" },
    { key: "faktur", label: "Faktur Pajak No." },
    { key: "invoice", label: "Invoice No." },
    { key: "client", label: "Client" },
    { key: "dpp", label: "DPP", align: R },
    { key: "ppn", label: "PPN", align: R },
  ],
  project: [
    { key: "name", label: "Project Name" },
    { key: "leader", label: "Leader" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "start_date", label: "Start Date" },
    { key: "end_date", label: "End Date" },
    { key: "budget", label: "Budget", align: R },
    { key: "tasks", label: "Tasks Done" },
    { key: "invoiced", label: "Invoiced", align: R },
    { key: "paid", label: "Paid", align: R },
    { key: "outstanding", label: "Outstanding", align: R },
    { key: "billing", label: "Billing" },
  ],
  pph23: [
    { key: "date", label: "Date" },
    { key: "receipt", label: "Receipt No." },
    { key: "invoice", label: "Invoice No." },
    { key: "client", label: "Client" },
    { key: "percent", label: "% PPh 23", align: R },
    { key: "gross", label: "Gross Amount", align: R },
    { key: "withheld", label: "PPh 23 Withheld", align: R },
    { key: "net", label: "Net Received", align: R },
  ],
  subscription: [
    { key: "name", label: "Name" },
    { key: "client", label: "Client" },
    { key: "services", label: "Services" },
    { key: "cycle", label: "Billing Cycle" },
    { key: "amount", label: "Amount", align: R },
    { key: "status", label: "Status" },
    { key: "next_due", label: "Next Due Date" },
  ],
  maintenance: [
    { key: "contract", label: "Contract" },
    { key: "client", label: "Client / Project" },
    { key: "quota", label: "Quota / Month", align: R },
    { key: "used", label: "Used", class: "min-w-[170px]" },
    { key: "leftover", label: "Leftover" },
    { key: "balance", label: "Dev. Balance", align: R },
    { key: "status", label: "Status" },
  ],
  staff_raport: [
    { key: "name", label: "Name" },
    { key: "job_title", label: "Job Title" },
    { key: "employment_type", label: "Employment Type" },
    { key: "attendance", label: "Attendance", align: R },
    { key: "tasks", label: "Tasks Done", align: R },
    { key: "rating", label: "Rating" },
    { key: "view", label: "" },
  ],
};

const tableColumns = computed(() => {
  const key = isOperationalCost.value ? "operational_cost" : activeTab.value;
  let cols = COLUMNS[key] || [];
  if (activeTab.value === "maintenance") {
    cols = cols.map((c) => (c.key === "used" ? { ...c, label: `Used (${maintenanceMonthLabel.value})` } : c));
  }
  return showDeleteColumn.value ? [...cols, { key: "actions", label: "Actions", align: R, width: 72 }] : cols;
});

const tableRowKey = (row) => {
  if (isOperationalCost.value) return `${row.category}-${row.id}`;
  if (activeTab.value === "staff_raport") return row.employee_id;
  return row.id;
};

const CLICKABLE_TABS = ["attendance", "ppn", "project", "pph23", "subscription", "maintenance", "staff_raport"];
const rowsClickable = computed(() => CLICKABLE_TABS.includes(activeTab.value));

const onRowClick = (row) => {
  switch (activeTab.value) {
    case "attendance":
      return openAttendanceDetail(row);
    case "ppn":
      return openInvoiceDetail(row);
    case "project":
      return router.push({ name: "admin.projects.detail", params: { id: row.id } });
    case "pph23":
      return openReceiptDetail(row);
    case "subscription":
      return openSubscriptionDetail(row);
    case "maintenance":
      return router.push({ name: "admin.maintenance.detail", params: { id: row.id } });
    case "staff_raport":
      return openRaportDetail(row.employee_id);
  }
};

const titleCase = (v) => (v ? String(v).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-");
const lateLabel = (m) => `late by ${Math.floor(m / 60) > 0 ? `${Math.floor(m / 60)}h ` : ""}${m % 60}m`;

// Phone card: kicker line, title, sub line, amount on the right and a badge.
const mobileCard = (row) => {
  switch (activeTab.value) {
    case "attendance":
      return {
        kicker: formatDate(row.date),
        title: row.employee?.user?.name ?? "N/A",
        sub: `In ${row.check_in ? formatTimeUtil(row.check_in) : "-"} · Out ${row.check_out ? formatTimeUtil(row.check_out) : "-"}${row.status === "late" && row.late_minutes ? ` · ${lateLabel(row.late_minutes)}` : ""}`,
        badge: { tone: attendanceStatusTone[row.status] || "neutral", label: titleCase(row.status) },
      };
    case "payroll":
      return {
        kicker: formatDate(row.salary_month),
        title: row.employee?.user?.name ?? "N/A",
        sub: `Original ${formatCurrency(row.original_salary)}`,
        amount: formatCurrency(row.final_salary),
        badge: { tone: row.payment_status === "paid" ? "ok" : "warn", label: row.payment_status === "paid" ? "Paid" : "Pending" },
      };
    case "employee":
      return {
        kicker: row.code,
        title: row.user?.name ?? "N/A",
        sub: [row.job_information?.job_title, row.job_information?.team?.name].filter(Boolean).join(" · ") || "N/A",
        badge: { tone: "neutral", label: titleCase(row.job_information?.status ?? "N/A") },
      };
    case "finance":
      if (isOperationalCost.value) {
        return {
          kicker: row.category,
          title: row.name,
          sub: row.annual !== null ? `${formatCurrency(row.annual)} / tahun` : null,
          amount: formatCurrency(row.monthly),
          badge: { tone: row.in_use ? "ok" : "neutral", label: row.in_use ? "Digunakan" : "Tidak Digunakan" },
        };
      }
      return {
        kicker: `${formatDate(row.transaction_date)} · ${row.source}`,
        title: row.description,
        sub: `Saldo ${formatCurrency(row.balance)}`,
        amount: `${row.type === "debit" ? "+" : "−"}${formatCurrency(row.amount)}`,
        amountClass: row.type === "debit" ? "text-ui-ok" : "text-ui-bad",
      };
    case "pph21":
      return {
        kicker: formatDate(row.salary_month),
        title: row.employee?.user?.name ?? "N/A",
        sub: `${row.employee?.job_information?.ptkp_status ?? "TK/0"} · Gross ${formatCurrency(row.gross_salary)}`,
        amount: formatCurrency(row.pph21),
      };
    case "ppn":
      return { kicker: row.invoice_number, mono: true, title: row.client_name, sub: `DPP ${formatCurrency(row.subtotal)} · ${formatDate(row.date)}`, amount: formatCurrency(row.ppn_amount) };
    case "project":
      return {
        kicker: titleCase(row.status),
        title: row.name,
        sub: `${row.project_leader?.user?.name ?? "N/A"} · ${row.tasks_done_count}/${row.tasks_total_count} tasks`,
        amount: formatCurrency(row.billing?.invoiced_total),
        badge: { tone: BILLING_STATUS[row.billing?.status]?.tone || "neutral", label: BILLING_STATUS[row.billing?.status]?.label ?? "-" },
      };
    case "pph23":
      return {
        kicker: row.receipt_number,
        mono: true,
        title: row.invoice?.client_name ?? row.received_from,
        sub: `${Number(row.pph23_percent)}% · Net ${formatCurrency(row.amount)}`,
        amount: formatCurrency(row.pph23_amount),
      };
    case "subscription":
      return {
        kicker: `${titleCase(row.billing_cycle)} · due ${formatDate(row.next_due_date)}`,
        title: row.name,
        sub: row.client?.name ?? "-",
        amount: formatCurrency(row.amount),
        badge: { tone: subscriptionStatusTone[row.status] || "neutral", label: subscriptionStatusLabel[row.status] || row.status },
      };
    case "maintenance":
      return {
        kicker: row.client ?? "-",
        title: row.name,
        sub: row.period ? `${formatHours(row.period.used)} / ${formatHours(row.period.total)} used · ${Math.round(row.period.used_percent)}%` : "Not running this month",
        amount: formatHours(row.balance),
        badge: { tone: contractStatusTone[row.status] || "neutral", label: CONTRACT_STATUS[row.status]?.label ?? row.status },
      };
    case "staff_raport":
      return {
        kicker: row.job_title ?? "-",
        title: row.name ?? "N/A",
        sub: `Attendance ${row.attendance_rate !== null ? `${row.attendance_rate}%` : "-"} · Tasks ${row.task_completion_rate !== null ? `${row.task_completion_rate}%` : "-"}`,
        stars: row.stars,
      };
    default:
      return { title: "-" };
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <div class="lg:flex lg:items-start lg:gap-6">
      <!-- Desktop: report rail -->
      <aside class="hidden lg:block w-[208px] shrink-0 sticky top-0" aria-label="Report type">
        <p class="text-ui-over uppercase text-ui-faint px-2.5 mb-2">{{ visibleTabs.length }} Reports</p>
        <nav class="flex flex-col gap-0.5" role="tablist" aria-orientation="vertical">
          <button
            v-for="tab in visibleTabs"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.key"
            @click="activeTab = tab.key"
            :class="[
              'ui-press w-full flex items-center gap-2.5 h-9 px-2.5 rounded-ui-control border text-left text-ui-body whitespace-nowrap focus:outline-none focus-visible:shadow-ui-focus',
              activeTab === tab.key
                ? 'bg-ui-surface border-ui-line text-ui-ink font-medium shadow-ui-raised'
                : 'border-transparent text-ui-text hover:bg-ui-hover',
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4 shrink-0" :class="activeTab === tab.key ? 'text-ui-ink' : 'text-ui-faint'" />
            <span class="truncate">{{ tab.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- Report content -->
      <div class="flex-1 min-w-0 space-y-5">
        <UiPageHeader title="Reports" subtitle="Company-wide reports across HR modules.">
          <template #actions>
            <UiButton v-if="showDeleteColumn" variant="danger" :icon="CalendarRange" @click="openDeleteRangeModal">Delete by Date Range</UiButton>
            <UiButton v-if="canExport && activeTab !== 'staff_raport'" :icon="Download" :loading="exporting" @click="handleExport">
              {{ exporting ? "Exporting..." : "Export Excel" }}
            </UiButton>
          </template>
        </UiPageHeader>

        <!-- Phones / tablets: scrolling chips -->
        <div class="relative lg:hidden">
          <div ref="tabScrollRef" @scroll="updateTabFade" class="overflow-x-auto [scrollbar-width:none]">
            <div class="flex items-center gap-1.5 min-w-max pr-10" role="tablist" aria-label="Report type">
              <button
                v-for="tab in visibleTabs"
                :key="tab.key"
                type="button"
                role="tab"
                :aria-selected="activeTab === tab.key"
                @click="activeTab = tab.key"
                :class="[
                  'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium h-8 px-3 rounded-full border text-ui-small focus:outline-none focus-visible:shadow-ui-focus',
                  activeTab === tab.key ? 'bg-ui-ink text-white border-ui-ink' : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover',
                ]"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>
          <!-- More tabs off-screen: shown by scroll position -->
          <Transition name="ui-fade">
            <div v-if="showTabRightFade" class="pointer-events-none absolute right-0 top-0 h-8 flex items-center">
              <span class="w-7 h-7 rounded-full bg-ui-surface border border-ui-line shadow-ui-raised flex items-center justify-center">
                <ChevronRight class="w-4 h-4 text-ui-accent scroll-hint-nudge" />
              </span>
            </div>
          </Transition>
        </div>

        <!-- When this data appears / disclaimers -->
        <div v-if="['pph21', 'ppn', 'pph23'].includes(activeTab)" class="space-y-2">
          <UiAlert v-if="activeTab === 'pph21'" tone="info">
            Data muncul setelah ada Payroll yang sudah di-Run untuk periode terkait, dan hasil perhitungannya menghasilkan PPh 21 terutang (gaji karyawan melebihi PTKP). Belum ada Payroll berjalan pada periode ini = tabel akan kosong.
          </UiAlert>
          <UiAlert v-if="activeTab === 'ppn'" tone="info">
            Data muncul setelah ada Invoice yang dibuat pada periode terkait dengan PPN (%) diisi lebih dari 0 saat pembuatan Invoice. Invoice tanpa PPN tidak akan muncul di sini.
          </UiAlert>
          <UiAlert v-if="activeTab === 'pph23'" tone="info">
            Data muncul setelah ada Payment Receipt yang dibuat pada periode terkait dengan PPh 23 diisi (checkbox "Dipotong PPh 23?" saat membuat Payment Receipt). Payment Receipt tanpa PPh 23 tidak akan muncul di sini.
          </UiAlert>
          <UiAlert v-if="activeTab === 'pph21'" tone="warn">
            PPh 21 dihitung dengan metode tahunan (Pasal 17), belum menggunakan metode TER bulanan DJP. Gunakan sebagai draft rekap, verifikasi ulang sebelum diinput ke Coretax.
          </UiAlert>
          <p class="text-ui-cap text-ui-muted bg-ui-subtle border border-ui-line rounded-ui-control px-3.5 py-2.5">
            Laporan ini adalah rekap siap ekspor untuk membantu pengisian Coretax secara manual, bukan integrasi otomatis ke sistem DJP.
          </p>
        </div>

        <!-- Toolbar: finance source + filters, one row above the content -->
        <div v-if="activeTab === 'finance' || (activeTab !== 'employee' && !isOperationalCost)" class="space-y-2">
          <div class="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3">
            <div v-if="activeTab === 'finance'" class="min-w-0">
              <p class="text-ui-small font-medium text-ui-ink mb-1.5 hidden lg:block">Source</p>
              <div class="grid grid-cols-2 bg-ui-subtle border border-ui-line rounded-ui-control p-0.5 w-full sm:w-auto sm:inline-grid" role="tablist" aria-label="Finance data source">
                <button
                  v-for="src in FINANCE_SOURCES"
                  :key="src.key"
                  type="button"
                  role="tab"
                  :aria-selected="financeSource === src.key"
                  class="ui-press h-[33px] px-3 sm:px-4 rounded-[6px] text-ui-small font-medium whitespace-nowrap transition-colors"
                  :class="financeSource === src.key ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
                  @click="setFinanceSource(src.key)"
                >
                  {{ src.label }}
                </button>
              </div>
            </div>

            <div v-if="activeTab !== 'employee' && !isOperationalCost" class="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-2 sm:gap-3">
              <UiInput v-if="activeTab === 'maintenance'" v-model="maintenanceMonth" type="month" label="Month" class="sm:w-[180px]" @change="loadReport(1)" />
              <UiSelect
                v-if="activeTab === 'maintenance'"
                v-model="maintenanceStatus"
                label="Status"
                :options="[{ value: '', label: 'All Statuses' }, ...Object.entries(CONTRACT_STATUS).map(([key, st]) => ({ value: key, label: st.label }))]"
                class="sm:w-[180px]"
                @change="loadReport(1)"
              />
              <UiInput v-if="!['subscription', 'maintenance'].includes(activeTab)" v-model="startDate" type="date" label="Start Date" class="sm:w-[170px]" @change="loadReport(1)" />
              <UiInput v-if="!['subscription', 'maintenance'].includes(activeTab)" v-model="endDate" type="date" label="End Date" class="sm:w-[170px]" @change="loadReport(1)" />
              <UiSelect
                v-if="activeTab === 'subscription'"
                v-model="subscriptionStatus"
                label="Status"
                :options="[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'postponed', label: 'Postponed' },
                  { value: 'cancelled', label: 'Not Active' },
                ]"
                class="col-span-2 sm:w-[200px]"
                @change="loadReport(1)"
              />
              <UiSelect
                v-if="activeTab === 'project'"
                v-model="projectStatus"
                label="Status"
                :options="[
                  { value: '', label: 'All Statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'planning', label: 'Planning' },
                  { value: 'active', label: 'Active' },
                  { value: 'on_hold', label: 'On Hold' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]"
                class="col-span-2 sm:w-[180px]"
                @change="loadReport(1)"
              />
              <UiInput
                v-if="activeTab === 'staff_raport'"
                v-model="staffRaportSearch"
                label="Name"
                :icon="Search"
                placeholder="Search staff name..."
                class="col-span-2 sm:w-[240px]"
                @input="loadReport(1)"
              />
              <UiSelect
                v-if="activeTab === 'staff_raport'"
                v-model="staffRaportEmploymentType"
                label="Employment Type"
                :options="[{ value: '', label: 'All Employment Types' }, ...(employmentTypes || [])]"
                class="col-span-2 sm:w-[220px]"
                @change="loadReport(1)"
              />
            </div>
          </div>

          <p v-if="activeTab === 'finance'" class="text-ui-cap text-ui-muted">
            <template v-if="financeSource === 'cash_book'">
              Transaksi kas nyata (manual + otomatis dari Cash Ledger tiap project) dalam rentang tanggal ini. Saldo dihitung berjalan dari Saldo Awal Company Cash Book.
            </template>
            <template v-else>
              Biaya operasional yang berlaku saat ini, sama seperti halaman Operational Cost. Total hanya menghitung item berstatus Digunakan; tidak terikat rentang tanggal.
            </template>
          </p>
          <p v-if="activeTab === 'staff_raport'" class="text-ui-cap text-ui-muted">
            Attendance rate and task completion (and the resulting score/stars) are calculated for this date range. Click a row to view full details and download a PDF for a different period.
          </p>
          <p v-if="activeTab === 'project'" class="text-ui-cap text-ui-muted">
            Filtered by each project's Start Date falling within this range. Invoiced and Paid cover all invoices linked to each project (cancelled excluded; paid includes PPh 23 withheld). Click a project for its invoice details.
          </p>
        </div>

        <DocumentReport v-if="activeTab === 'documents'" :data="documents" :loading="loading" />

        <template v-else>
          <!-- Summary -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
            <template v-if="loading">
              <UiStat v-for="i in 4" :key="`sk-${i}`" label="" loading />
            </template>
            <template v-else>
              <UiStat
                v-for="card in summaryCards"
                :key="card.label"
                :label="card.label"
                :value="card.value"
                :class="summaryCards.length === 3 ? 'last:col-span-2 lg:last:col-span-1' : ''"
              >
                <span class="text-ui-h2 sm:text-ui-h1" :title="String(card.value)">{{ card.value }}</span>
                <template v-if="card.sub" #hint>
                  <span :class="card.subClass || 'text-ui-warn'">{{ card.sub }}</span>
                </template>
              </UiStat>
            </template>
          </div>

          <!-- Status Breakdown & Upcoming Renewals (Subscription only) -->
          <div v-if="!loading && activeTab === 'subscription'" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
              <h2 class="text-ui-h3 text-ui-ink mb-3">Status Breakdown</h2>
              <div class="space-y-2.5">
                <div v-for="item in subscription.status_breakdown" :key="item.status" class="flex items-center justify-between gap-3">
                  <UiBadge :tone="subscriptionStatusTone[item.status] || 'neutral'" dot>{{ subscriptionStatusLabel[item.status] || item.status }}</UiBadge>
                  <span class="text-ui-small text-ui-ink font-medium tabular-nums">{{ item.count }} subscription{{ item.count === 1 ? "" : "s" }}</span>
                </div>
                <p v-if="!subscription.status_breakdown?.length" class="text-ui-small text-ui-muted">No subscriptions yet.</p>
              </div>
            </section>

            <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
              <h2 class="text-ui-h3 text-ui-ink mb-3">Upcoming Renewals (next 30 days)</h2>
              <div class="max-h-48 overflow-y-auto divide-y divide-ui-line">
                <div v-for="row in subscription.upcoming_renewals" :key="row.id" class="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div class="min-w-0">
                    <p class="text-ui-small text-ui-ink font-medium truncate">{{ row.name }}</p>
                    <p class="text-ui-cap text-ui-muted truncate">{{ row.client?.name ?? "-" }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-ui-small text-ui-ink font-medium tabular-nums">{{ formatCurrency(row.amount) }}</p>
                    <p class="text-ui-cap text-ui-muted">{{ formatDate(row.next_due_date) }}</p>
                  </div>
                </div>
                <p v-if="!subscription.upcoming_renewals?.length" class="text-ui-small text-ui-muted">No renewals due in the next 30 days.</p>
              </div>
            </section>
          </div>

          <!-- Table -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
            <UiTable
              :key="isOperationalCost ? 'operational_cost' : activeTab"
              :columns="tableColumns"
              :rows="tableRows"
              :row-key="tableRowKey"
              :meta="reportMeta"
              :loading="loading"
              :skeleton-rows="6"
              :clickable="rowsClickable"
              @row-click="onRowClick"
            >
              <!-- Shared cells -->
              <template #cell-actions="{ row }">
                <UiButton
                  variant="ghost"
                  size="sm"
                  :icon="Trash2"
                  :loading="deletingRowId === rowIdField(row)"
                  :disabled="deletingRowId === rowIdField(row)"
                  title="Delete"
                  aria-label="Delete"
                  class="hover:text-ui-bad"
                  @click.stop="handleDeleteRow(row)"
                />
              </template>

              <!-- Attendance / PPN / PPh 23 dates, and other per-tab cells -->
              <template #cell-date="{ row }">
                <span class="whitespace-nowrap">{{ activeTab === "finance" ? formatDate(row.transaction_date) : formatDate(row.date) }}</span>
              </template>
              <template #cell-employee="{ row }">
                <span class="text-ui-ink font-medium">{{ row.employee?.user?.name ?? "N/A" }}</span>
              </template>
              <template #cell-check_in="{ row }">
                <span class="tabular-nums">{{ row.check_in ? formatTimeUtil(row.check_in) : "-" }}</span>
                <p v-if="row.status === 'late' && row.late_minutes" class="text-ui-cap text-ui-warn mt-0.5">{{ lateLabel(row.late_minutes) }}</p>
              </template>
              <template #cell-check_out="{ row }">
                <span class="tabular-nums">{{ row.check_out ? formatTimeUtil(row.check_out) : "-" }}</span>
              </template>
              <template #cell-period="{ row }">
                <span class="whitespace-nowrap">{{ formatDate(row.salary_month) }}</span>
              </template>
              <template #cell-original_salary="{ row }">
                <span class="tabular-nums whitespace-nowrap">{{ formatCurrency(row.original_salary) }}</span>
              </template>
              <template #cell-final_salary="{ row }">
                <span class="tabular-nums whitespace-nowrap text-ui-ink font-medium">{{ formatCurrency(row.final_salary) }}</span>
              </template>
              <template #cell-code="{ row }">
                <span class="font-mono text-ui-cap">{{ row.code }}</span>
              </template>
              <template #cell-name="{ row }">
                <span class="text-ui-ink font-medium" :class="activeTab === 'project' ? 'whitespace-nowrap' : ''">
                  {{ activeTab === "employee" ? row.user?.name ?? "N/A" : activeTab === "staff_raport" ? row.name ?? "N/A" : row.name }}
                </span>
              </template>
              <template #cell-job_title="{ row }">
                {{ activeTab === "employee" ? row.job_information?.job_title ?? "N/A" : row.job_title ?? "-" }}
              </template>
              <template #cell-team="{ row }">{{ row.job_information?.team?.name ?? "N/A" }}</template>
              <template #cell-status="{ row }">
                <UiBadge v-if="activeTab === 'attendance'" :tone="attendanceStatusTone[row.status] || 'neutral'" dot>{{ titleCase(row.status) }}</UiBadge>
                <UiBadge v-else-if="activeTab === 'payroll'" :tone="row.payment_status === 'paid' ? 'ok' : 'warn'" dot>{{ row.payment_status === "paid" ? "Paid" : "Pending" }}</UiBadge>
                <UiBadge v-else-if="activeTab === 'employee'" tone="neutral">{{ titleCase(row.job_information?.status ?? "N/A") }}</UiBadge>
                <UiBadge v-else-if="isOperationalCost" :tone="row.in_use ? 'ok' : 'neutral'" dot class="whitespace-nowrap">{{ row.in_use ? "Digunakan" : "Tidak Digunakan" }}</UiBadge>
                <span v-else-if="activeTab === 'project'" class="whitespace-nowrap">{{ titleCase(row.status) }}</span>
                <UiBadge v-else-if="activeTab === 'subscription'" :tone="subscriptionStatusTone[row.status] || 'neutral'" dot>{{ subscriptionStatusLabel[row.status] || row.status }}</UiBadge>
                <UiBadge v-else-if="activeTab === 'maintenance'" :tone="contractStatusTone[row.status] || 'neutral'" dot>{{ CONTRACT_STATUS[row.status]?.label ?? row.status }}</UiBadge>
              </template>

              <!-- Finance -->
              <template #cell-category="{ row }">
                <span class="whitespace-nowrap" :class="row.in_use ? '' : 'text-ui-faint'">{{ row.category }}</span>
              </template>
              <template #cell-item="{ row }">
                <span :class="row.in_use ? 'text-ui-ink' : 'text-ui-faint'">{{ row.name }}</span>
              </template>
              <template #cell-monthly="{ row }">
                <span class="tabular-nums whitespace-nowrap" :class="row.in_use ? 'text-ui-ink' : 'text-ui-faint'">{{ formatCurrency(row.monthly) }}</span>
              </template>
              <template #cell-annual="{ row }">
                <span class="tabular-nums whitespace-nowrap" :class="row.in_use ? '' : 'text-ui-faint'">{{ row.annual !== null ? formatCurrency(row.annual) : "-" }}</span>
              </template>
              <template #cell-description="{ row }">
                <div class="min-w-[180px] py-2">
                  <p class="text-ui-ink font-medium">{{ row.description }}</p>
                  <p v-if="row.notes" class="text-ui-cap text-ui-muted">{{ row.notes }}</p>
                </div>
              </template>
              <template #cell-source="{ row }">
                <UiBadge :tone="row.is_synced ? 'info' : 'neutral'" class="whitespace-nowrap">{{ row.source }}</UiBadge>
              </template>
              <template #cell-debit="{ row }">
                <span class="tabular-nums whitespace-nowrap text-ui-ok">{{ row.type === "debit" ? formatCurrency(row.amount) : "" }}</span>
              </template>
              <template #cell-credit="{ row }">
                <span class="tabular-nums whitespace-nowrap text-ui-bad">{{ row.type === "credit" ? formatCurrency(row.amount) : "" }}</span>
              </template>
              <template #cell-balance="{ row }">
                <template v-if="activeTab === 'maintenance'">
                  <span class="tabular-nums whitespace-nowrap">{{ formatHours(row.balance) }}</span>
                  <p v-if="row.expiring" class="text-ui-cap text-ui-warn whitespace-nowrap">{{ formatHours(row.expiring) }} expiring</p>
                </template>
                <span v-else class="tabular-nums whitespace-nowrap font-medium text-ui-ink">{{ formatCurrency(row.balance) }}</span>
              </template>

              <!-- Tax -->
              <template #cell-npwp="{ row }">{{ row.employee?.npwp ?? "-" }}</template>
              <template #cell-ptkp="{ row }">{{ row.employee?.job_information?.ptkp_status ?? "TK/0" }}</template>
              <template #cell-gross="{ row }">
                <span class="tabular-nums whitespace-nowrap">{{ activeTab === "pph21" ? formatCurrency(row.gross_salary) : formatCurrency(Number(row.amount) + Number(row.pph23_amount)) }}</span>
              </template>
              <template #cell-pph21="{ row }">
                <span class="tabular-nums whitespace-nowrap text-ui-ink font-medium">{{ formatCurrency(row.pph21) }}</span>
              </template>
              <template #cell-faktur="{ row }">
                <span class="font-mono text-ui-cap whitespace-nowrap">{{ row.faktur_pajak_number ?? "-" }}</span>
              </template>
              <template #cell-invoice="{ row }">
                <span class="font-mono text-ui-cap text-ui-ink whitespace-nowrap">{{ activeTab === "ppn" ? row.invoice_number : row.invoice?.invoice_number ?? "-" }}</span>
              </template>
              <template #cell-client="{ row }">
                <template v-if="activeTab === 'maintenance'">
                  <div class="min-w-[150px]">
                    <p>{{ row.client ?? "-" }}</p>
                    <p v-if="row.project" class="text-ui-cap text-ui-muted">{{ row.project }}</p>
                  </div>
                </template>
                <template v-else-if="activeTab === 'ppn'">{{ row.client_name }}</template>
                <template v-else-if="activeTab === 'pph23'">{{ row.invoice?.client_name ?? row.received_from }}</template>
                <template v-else>{{ row.client?.name ?? "-" }}</template>
              </template>
              <template #cell-dpp="{ row }">
                <span class="tabular-nums whitespace-nowrap">{{ formatCurrency(row.subtotal) }}</span>
              </template>
              <template #cell-ppn="{ row }">
                <span class="tabular-nums whitespace-nowrap text-ui-ink font-medium">{{ formatCurrency(row.ppn_amount) }}</span>
              </template>
              <template #cell-receipt="{ row }">
                <span class="font-mono text-ui-cap text-ui-ink whitespace-nowrap">{{ row.receipt_number }}</span>
              </template>
              <template #cell-percent="{ row }">
                <span class="tabular-nums">{{ Number(row.pph23_percent) }}%</span>
              </template>
              <template #cell-withheld="{ row }">
                <span class="tabular-nums whitespace-nowrap text-ui-ink font-medium">{{ formatCurrency(row.pph23_amount) }}</span>
              </template>
              <template #cell-net="{ row }">
                <span class="tabular-nums whitespace-nowrap">{{ formatCurrency(row.amount) }}</span>
              </template>

              <!-- Project -->
              <template #cell-leader="{ row }"><span class="whitespace-nowrap">{{ row.project_leader?.user?.name ?? "N/A" }}</span></template>
              <template #cell-priority="{ row }">{{ titleCase(row.priority) }}</template>
              <template #cell-start_date="{ row }">
                <span class="whitespace-nowrap">{{ formatDate(row.start_date) }}</span>
              </template>
              <template #cell-end_date="{ row }">
                <span class="whitespace-nowrap">{{ row.end_date ? formatDate(row.end_date) : "-" }}</span>
              </template>
              <template #cell-budget="{ row }">
                <span class="tabular-nums whitespace-nowrap">{{ formatCurrency(row.budget) }}</span>
              </template>
              <template #cell-tasks="{ row }">
                <span class="tabular-nums">
                  {{ activeTab === "project" ? `${row.tasks_done_count}/${row.tasks_total_count}` : row.task_completion_rate !== null ? `${row.task_completion_rate}%` : "-" }}
                </span>
              </template>
              <template #cell-invoiced="{ row }">
                <span class="tabular-nums whitespace-nowrap">{{ formatCurrency(row.billing?.invoiced_total) }}</span>
                <p v-if="row.billing?.invoiced_percent !== null && row.billing?.invoiced_percent !== undefined" class="text-ui-cap text-ui-muted whitespace-nowrap">{{ row.billing.invoiced_percent }}% of value</p>
              </template>
              <template #cell-paid="{ row }">
                <span class="tabular-nums whitespace-nowrap text-ui-ok">{{ formatCurrency(row.billing?.paid_total) }}</span>
              </template>
              <template #cell-outstanding="{ row }">
                <span
                  class="tabular-nums whitespace-nowrap"
                  :class="row.billing?.outstanding > 0 ? 'text-ui-warn font-medium' : row.billing?.outstanding < 0 ? 'text-ui-bad font-medium' : 'text-ui-faint'"
                >{{ row.billing?.outstanding ? formatCurrency(Math.abs(row.billing.outstanding)) : "—" }}</span>
              </template>
              <template #cell-billing="{ row }">
                <span class="inline-flex items-center gap-1 whitespace-nowrap">
                  <UiBadge :tone="BILLING_STATUS[row.billing?.status]?.tone || 'neutral'" dot>{{ BILLING_STATUS[row.billing?.status]?.label ?? "-" }}</UiBadge>
                  <AlertTriangle
                    v-if="row.billing?.mismatch_count"
                    class="w-3.5 h-3.5 text-ui-warn"
                    :title="`${row.billing.mismatch_count} invoice(s) marked Paid/Unpaid differently from their receipts`"
                  />
                </span>
              </template>

              <!-- Subscription -->
              <template #cell-services="{ row }">
                <span class="capitalize">{{ subscriptionServicesLabel(row.services) }}</span>
              </template>
              <template #cell-cycle="{ row }">
                <span class="capitalize">{{ row.billing_cycle }}</span>
              </template>
              <template #cell-amount="{ row }">
                <span class="tabular-nums whitespace-nowrap text-ui-ink font-medium">{{ formatCurrency(row.amount) }}</span>
              </template>
              <template #cell-next_due="{ row }">
                <span class="whitespace-nowrap">{{ formatDate(row.next_due_date) }}</span>
              </template>

              <!-- Maintenance -->
              <template #cell-contract="{ row }">
                <span class="text-ui-ink font-medium block min-w-[150px]">{{ row.name }}</span>
              </template>
              <template #cell-quota="{ row }">
                <span class="tabular-nums whitespace-nowrap">{{ formatHours(row.monthly_quota_hours) }}</span>
              </template>
              <template #cell-used="{ row }">
                <div v-if="row.period" class="py-2">
                  <div class="flex items-center justify-between gap-2 text-ui-cap mb-1">
                    <span class="whitespace-nowrap tabular-nums">{{ formatHours(row.period.used) }} / {{ formatHours(row.period.total) }}</span>
                    <span
                      class="font-medium tabular-nums"
                      :class="row.period.overage > 0 ? 'text-ui-bad' : row.period.used_percent >= 75 ? 'text-ui-warn' : 'text-ui-ink'"
                    >{{ Math.round(row.period.used_percent) }}%</span>
                  </div>
                  <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden">
                    <div class="h-full rounded-full" :style="{ width: `${Math.min(100, Math.max(2, row.period.used_percent))}%`, backgroundColor: usageColor(row.period) }"></div>
                  </div>
                  <p v-if="row.period.overage > 0" class="text-ui-cap text-ui-bad mt-0.5">{{ formatHours(row.period.overage) }} over quota</p>
                </div>
                <span v-else class="text-ui-cap text-ui-muted">Not running this month</span>
              </template>
              <template #cell-leftover="{ row }">
                <span class="text-ui-cap whitespace-nowrap">{{ LEFTOVER_POLICY[row.leftover_policy]?.short ?? row.leftover_policy }}</span>
              </template>

              <!-- Staff raport -->
              <template #cell-employment_type="{ row }">
                <span class="capitalize">{{ (row.employment_type || "-").replace("_", " ") }}</span>
              </template>
              <template #cell-attendance="{ row }">
                <span class="tabular-nums">{{ row.attendance_rate !== null ? `${row.attendance_rate}%` : "-" }}</span>
              </template>
              <template #cell-rating="{ row }">
                <span class="flex items-center gap-0.5" :aria-label="`${row.stars} of 5 stars`">
                  <Star
                    v-for="i in 5"
                    :key="i"
                    class="w-3.5 h-3.5"
                    :class="i <= row.stars ? 'text-ui-warn' : 'text-ui-line-strong'"
                    :fill="i <= row.stars ? 'currentColor' : 'none'"
                  />
                </span>
              </template>
              <template #cell-view>
                <span class="text-ui-cap font-medium text-ui-accent whitespace-nowrap">View Detail</span>
              </template>

              <!-- Phones: stacked row cards -->
              <template #mobile="{ row, number }">
                <div class="flex items-start gap-3 px-4 py-3.5">
                  <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
                  <div class="flex-1 min-w-0">
                    <p v-if="mobileCard(row).kicker" class="text-ui-cap text-ui-muted truncate" :class="mobileCard(row).mono ? 'font-mono' : ''">{{ mobileCard(row).kicker }}</p>
                    <p class="text-ui-body font-medium text-ui-ink truncate">{{ mobileCard(row).title }}</p>
                    <p v-if="mobileCard(row).sub" class="text-ui-cap text-ui-muted mt-0.5 truncate">{{ mobileCard(row).sub }}</p>
                    <span v-if="mobileCard(row).stars !== undefined" class="flex items-center gap-0.5 mt-1">
                      <Star
                        v-for="i in 5"
                        :key="i"
                        class="w-3.5 h-3.5"
                        :class="i <= mobileCard(row).stars ? 'text-ui-warn' : 'text-ui-line-strong'"
                        :fill="i <= mobileCard(row).stars ? 'currentColor' : 'none'"
                      />
                    </span>
                  </div>
                  <div class="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <p v-if="mobileCard(row).amount" class="text-ui-body font-medium tabular-nums" :class="mobileCard(row).amountClass || 'text-ui-ink'">{{ mobileCard(row).amount }}</p>
                    <UiBadge v-if="mobileCard(row).badge" :tone="mobileCard(row).badge.tone" dot>{{ mobileCard(row).badge.label }}</UiBadge>
                    <button
                      v-if="showDeleteColumn"
                      type="button"
                      class="ui-press inline-flex items-center gap-1 text-ui-cap font-medium text-ui-bad disabled:opacity-50"
                      :disabled="deletingRowId === rowIdField(row)"
                      @click.stop="handleDeleteRow(row)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />Delete
                    </button>
                  </div>
                </div>
              </template>

              <template #empty>
                <UiEmpty :icon="FileTextIcon" title="No data found" message="Try adjusting the date range or filters" compact />
              </template>
            </UiTable>

            <div v-if="reportMeta && reportMeta.total > 0" class="px-4 pb-3 border-t border-ui-line">
              <Pagination :meta="reportMeta" :loading="loading" item-label="records" @page-change="loadReport" />
            </div>
          </section>
        </template>

      </div>
    </div>

    <!-- Staff Raport Detail Modal -->
    <UiModal v-model:open="showRaportDetail" title="Staff Raport" size="lg" @close="closeRaportDetail">
      <div v-if="loadingDetail">
        <SkeletonStatCards :count="3" cols="grid-cols-3" />
      </div>

      <div v-else-if="staffRaportDetail" class="space-y-5">
        <div>
          <p class="text-ui-h2 text-ui-ink">{{ staffRaportDetail.employee.name }}</p>
          <p class="text-ui-small text-ui-muted">
            {{ staffRaportDetail.employee.code }}
            <span v-if="staffRaportDetail.employee.job_title"> • {{ staffRaportDetail.employee.job_title }}</span>
            <span v-if="staffRaportDetail.employee.team"> • {{ staffRaportDetail.employee.team }}</span>
          </p>
          <p class="text-ui-cap text-ui-muted mt-0.5 capitalize">
            {{ (staffRaportDetail.employee.employment_type || "-").replace("_", " ") }}
            <span v-if="staffRaportDetail.employee.start_date"> • Joined {{ formatDate(staffRaportDetail.employee.start_date) }}</span>
          </p>
          <div class="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 bg-ui-subtle border border-ui-line rounded-ui-control px-3 py-2">
            <p class="text-ui-cap text-ui-text flex-1">
              Period: <strong class="text-ui-ink font-semibold">{{ staffRaportDetail.period_label }}</strong>
              <span class="text-ui-muted">({{ formatDate(staffRaportDetail.period.start_date) }} – {{ formatDate(staffRaportDetail.period.end_date) }})</span>
            </p>
            <UiSelect
              v-model="raportPeriod"
              aria-label="Raport period"
              :options="[
                { value: 'filter', label: 'Report filter period' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'all', label: 'All Time' },
              ]"
              class="sm:w-48"
              @change="loadRaportDetail"
            />
          </div>
          <div class="flex items-center gap-1 mt-2">
            <Star
              v-for="i in 5"
              :key="i"
              class="w-5 h-5"
              :class="i <= staffRaportDetail.stars ? 'text-ui-warn' : 'text-ui-line-strong'"
              :fill="i <= staffRaportDetail.stars ? 'currentColor' : 'none'"
            />
            <span class="text-ui-small text-ui-muted ml-1 tabular-nums">{{ staffRaportDetail.overall_score !== null ? `${staffRaportDetail.overall_score}%` : "No data" }}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 sm:gap-3">
          <div class="bg-ui-subtle rounded-ui-control p-3 min-w-0">
            <p class="text-ui-h3 sm:text-ui-h2 text-ui-ink tabular-nums">{{ staffRaportDetail.attendance_rate !== null ? `${staffRaportDetail.attendance_rate}%` : "-" }}</p>
            <p class="text-ui-cap text-ui-muted">Attendance ({{ staffRaportDetail.attendance.total }} working days)</p>
          </div>
          <div class="bg-ui-subtle rounded-ui-control p-3 min-w-0">
            <p class="text-ui-h3 sm:text-ui-h2 text-ui-ink tabular-nums">{{ staffRaportDetail.task_completion_rate !== null ? `${staffRaportDetail.task_completion_rate}%` : "-" }}</p>
            <p class="text-ui-cap text-ui-muted">Tasks Done ({{ staffRaportDetail.tasks.done }}/{{ staffRaportDetail.tasks.total }} due)</p>
          </div>
          <div class="bg-ui-subtle rounded-ui-control p-3 min-w-0">
            <p class="text-ui-h3 sm:text-ui-h2 text-ui-ink tabular-nums">{{ staffRaportDetail.overall_score !== null ? `${staffRaportDetail.overall_score}%` : "-" }}</p>
            <p class="text-ui-cap text-ui-muted">Overall Score</p>
          </div>
        </div>

        <!-- How the attendance score was reached, day by day -->
        <div v-if="staffRaportDetail.attendance.working_days !== undefined">
          <h4 class="text-ui-h3 text-ui-ink mb-2">Attendance &amp; Punctuality</h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div v-for="b in raportAttendanceBoxes" :key="b.label" class="border border-ui-line rounded-ui-control px-3 py-2 min-w-0">
              <p class="text-ui-cap text-ui-muted">{{ b.label }}</p>
              <p class="text-ui-h3 tabular-nums" :class="b.class || 'text-ui-ink'">{{ b.value }}</p>
              <p v-if="b.sub" class="text-ui-cap text-ui-muted">{{ b.sub }}</p>
            </div>
          </div>
          <p class="text-ui-cap text-ui-muted mt-2">
            Each working day is scored: on time / remote 100, late up to 15 min 90, 16–60 min 75, over 60 min 50, absent or no check-in 0.
            Sick days, approved leave and holidays aren't counted.
            <span v-if="staffRaportDetail.tasks.upcoming"> {{ staffRaportDetail.tasks.upcoming }} task(s) not yet due are left out of the task rate.</span>
            <span v-if="staffRaportDetail.tasks.staff_done_late" class="text-ui-warn"> {{ staffRaportDetail.tasks.staff_done_late }} staff task(s) were completed after the due date.</span>
          </p>
        </div>

        <div>
          <h4 class="text-ui-h3 text-ui-ink mb-2">Completed Tasks ({{ staffRaportDetail.completed_tasks.length }})</h4>
          <div v-if="staffRaportDetail.completed_tasks.length" class="border border-ui-line rounded-ui-control divide-y divide-ui-line max-h-48 overflow-y-auto">
            <div v-for="(task, idx) in staffRaportDetail.completed_tasks" :key="idx" class="flex items-center justify-between gap-3 px-3.5 py-2.5 text-ui-small">
              <span class="text-ui-ink">{{ task.title }}<span v-if="task.project_name" class="text-ui-muted"> ({{ task.project_name }})</span></span>
              <span class="text-ui-cap text-ui-muted shrink-0">{{ formatDate(task.due_date) }}</span>
            </div>
          </div>
          <p v-else class="text-ui-small text-ui-muted">No completed tasks due in this period.</p>
        </div>

        <div v-if="staffRaportDetail.performance_review" class="border-t border-ui-line pt-4">
          <h4 class="text-ui-h3 text-ui-ink mb-2">Latest Performance Review</h4>
          <div class="bg-ui-subtle rounded-ui-control p-3.5 space-y-2">
            <div class="flex items-center justify-between gap-2 text-ui-cap text-ui-muted">
              <span>
                {{ staffRaportDetail.performance_review.period }}
                <span v-if="staffRaportDetail.performance_review.reviewer_name"> • Reviewed by {{ staffRaportDetail.performance_review.reviewer_name }}</span>
              </span>
              <span class="flex items-center gap-0.5 shrink-0">
                <Star
                  v-for="i in 5"
                  :key="i"
                  class="w-3.5 h-3.5"
                  :class="i <= Math.round(staffRaportDetail.performance_review.overall_rating) ? 'text-ui-warn' : 'text-ui-line-strong'"
                  :fill="i <= Math.round(staffRaportDetail.performance_review.overall_rating) ? 'currentColor' : 'none'"
                />
                <span class="font-medium text-ui-ink tabular-nums ml-1">{{ staffRaportDetail.performance_review.overall_rating }}/5</span>
              </span>
            </div>
            <div v-if="staffRaportDetail.performance_review.category_scores" class="flex flex-wrap gap-1.5">
              <UiBadge v-for="(score, category) in staffRaportDetail.performance_review.category_scores" :key="category" tone="outline" class="capitalize">
                {{ category.replace("_", " ") }}: {{ score }}/5
              </UiBadge>
            </div>
            <p v-if="staffRaportDetail.performance_review.strengths" class="text-ui-cap text-ui-text"><strong class="text-ui-ink">Strengths:</strong> {{ staffRaportDetail.performance_review.strengths }}</p>
            <p v-if="staffRaportDetail.performance_review.areas_for_improvement" class="text-ui-cap text-ui-text"><strong class="text-ui-ink">Areas for Improvement:</strong> {{ staffRaportDetail.performance_review.areas_for_improvement }}</p>
          </div>
        </div>

        <div class="pt-4 border-t border-ui-line">
          <p class="text-ui-h3 text-ui-ink mb-2">Download PDF</p>
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <p class="text-ui-cap text-ui-muted flex-1">Uses the period above: <strong class="text-ui-ink font-semibold">{{ staffRaportDetail.period_label }}</strong></p>
            <UiButton :icon="Download" :loading="downloadingPdf" class="shrink-0" @click="handleDownloadPdf">
              {{ downloadingPdf ? "Downloading..." : "Download PDF" }}
            </UiButton>
          </div>
          <SignatureToggle v-model="raportUseSignature" class="mt-3" hint="Stamps the Director's signature onto the PDF." />
        </div>
      </div>
    </UiModal>

    <!-- Subscription Detail Modal -->
    <UiModal
      :open="showSubscriptionDetail && !!selectedSubscription"
      :title="selectedSubscription?.name || ''"
      description="Subscription Detail"
      @close="closeSubscriptionDetail"
    >
      <div v-if="selectedSubscription" class="space-y-4">
        <div class="flex items-center gap-2 flex-wrap">
          <UiBadge :tone="subscriptionStatusTone[selectedSubscription.status] || 'neutral'" dot>
            {{ subscriptionStatusLabel[selectedSubscription.status] || selectedSubscription.status }}
          </UiBadge>
          <span class="inline-flex items-center gap-1 text-ui-cap text-ui-muted"><Building2Icon class="w-3.5 h-3.5" /> {{ selectedSubscription.client?.name ?? "-" }}</span>
          <span v-if="selectedSubscription.project" class="inline-flex items-center gap-1 text-ui-cap text-ui-muted">
            <FolderKanban class="w-3.5 h-3.5" /> {{ selectedSubscription.project.name }}
          </span>
        </div>

        <dl class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-ui-cap text-ui-muted">Billing Cycle</dt>
            <dd class="text-ui-small text-ui-ink font-medium capitalize">{{ selectedSubscription.billing_cycle }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Next Due Date</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ formatDate(selectedSubscription.next_due_date) }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Last Invoiced</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedSubscription.last_invoiced_at ? formatDate(selectedSubscription.last_invoiced_at) : "-" }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Bank Account</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedSubscription.bank_name ?? "-" }}</dd>
          </div>
        </dl>

        <div>
          <p class="text-ui-h3 text-ui-ink mb-2">Services</p>
          <div class="space-y-2">
            <div v-for="service in selectedSubscription.services" :key="service.id" class="flex items-center justify-between gap-3 bg-ui-subtle rounded-ui-control px-3 py-2">
              <div class="min-w-0">
                <p class="text-ui-small text-ui-ink font-medium capitalize truncate">{{ (service.service_type || "-").replace(/_/g, " ") }}</p>
                <p v-if="service.product_name" class="text-ui-cap text-ui-muted truncate">{{ service.product_name }}</p>
                <p v-if="service.ppn_percentage" class="text-ui-cap text-ui-muted">VAT/PPN {{ service.ppn_percentage }}%</p>
                <p v-if="service.icann_fee > 0" class="text-ui-cap text-ui-muted">ICANN Fee {{ formatCurrency(service.icann_fee) }}</p>
              </div>
              <p class="text-ui-small text-ui-ink font-medium tabular-nums shrink-0">{{ formatCurrency(service.amount) }}</p>
            </div>
            <p v-if="!selectedSubscription.services?.length" class="text-ui-small text-ui-muted">No services on this subscription.</p>
          </div>
        </div>

        <div class="bg-ui-subtle rounded-ui-control p-4 text-ui-small text-ui-text space-y-1">
          <div class="flex justify-between gap-3"><span>Amount</span><span class="tabular-nums">{{ formatCurrency(selectedSubscription.amount) }}</span></div>
          <div class="flex justify-between gap-3">
            <span>{{ selectedSubscription.services?.length > 1 ? "Total VAT / PPN" : "VAT / PPN" }} ({{ selectedSubscription.ppn_percentage || 0 }}%)</span>
            <span class="tabular-nums">{{ formatCurrency(Math.round((Number(selectedSubscription.amount) || 0) * ((Number(selectedSubscription.ppn_percentage) || 0) / 100))) }}</span>
          </div>
          <div class="flex justify-between gap-3"><span>Admin Fee</span><span class="tabular-nums">{{ formatCurrency(selectedSubscription.admin_fee) }}</span></div>
          <div v-if="subscriptionIcannFeeTotal(selectedSubscription) > 0" class="flex justify-between gap-3">
            <span>ICANN Fee</span><span class="tabular-nums">{{ formatCurrency(subscriptionIcannFeeTotal(selectedSubscription)) }}</span>
          </div>
          <div v-if="selectedSubscription.pph23_type" class="flex justify-between gap-3"><span>PPh 23</span><span class="tabular-nums">{{ selectedSubscription.pph23_percent }}%</span></div>
        </div>

        <div v-if="selectedSubscription.terms">
          <p class="text-ui-small text-ui-ink font-medium mb-1">Terms & Conditions</p>
          <p class="text-ui-cap text-ui-muted whitespace-pre-line">{{ selectedSubscription.terms }}</p>
        </div>
      </div>
    </UiModal>

    <!-- PPN Invoice Detail Modal -->
    <UiModal
      :open="showInvoiceDetail && !!selectedInvoice"
      :title="selectedInvoice?.invoice_number || ''"
      description="Invoice Detail"
      @close="closeInvoiceDetail"
    >
      <div v-if="selectedInvoice" class="space-y-4">
        <dl class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-ui-cap text-ui-muted">Date</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ formatDate(selectedInvoice.date) }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Faktur Pajak No.</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedInvoice.faktur_pajak_number ?? "-" }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Client</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedInvoice.client_name }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">NPWP</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedInvoice.client_npwp ?? "-" }}</dd>
          </div>
        </dl>

        <div v-if="selectedInvoice.items?.length">
          <p class="text-ui-h3 text-ui-ink mb-2">Items</p>
          <div class="space-y-2">
            <div v-for="(item, idx) in selectedInvoice.items" :key="idx" class="flex items-center justify-between gap-3 bg-ui-subtle rounded-ui-control px-3 py-2 text-ui-small">
              <span class="min-w-0 truncate text-ui-text">{{ item.description }}</span>
              <span class="text-ui-ink font-medium tabular-nums shrink-0">{{ formatCurrency(item.total) }}</span>
            </div>
          </div>
        </div>

        <div class="bg-ui-subtle rounded-ui-control p-4 text-ui-small text-ui-text space-y-1">
          <div class="flex justify-between gap-3"><span>DPP (Subtotal)</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.subtotal) }}</span></div>
          <div class="flex justify-between gap-3"><span>PPN ({{ selectedInvoice.ppn_percentage || 0 }}%)</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.ppn_amount) }}</span></div>
          <div v-if="selectedInvoice.admin_fee > 0" class="flex justify-between gap-3"><span>Admin Fee</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.admin_fee) }}</span></div>
          <div v-if="selectedInvoice.icann_fee > 0" class="flex justify-between gap-3"><span>ICANN Fee</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.icann_fee) }}</span></div>
          <div v-if="selectedInvoice.pph23_type" class="flex justify-between gap-3"><span>PPh 23</span><span class="tabular-nums">{{ selectedInvoice.pph23_percent }}%</span></div>
          <div class="flex justify-between gap-3 font-semibold text-ui-ink pt-1.5 mt-1 border-t border-ui-line">
            <span>Total Amount Due</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.total) }}</span>
          </div>
        </div>

        <dl v-if="selectedInvoice.bank_name" class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-ui-cap text-ui-muted">Bank</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedInvoice.bank_name }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Account Number</dt>
            <dd class="text-ui-small text-ui-ink font-medium tabular-nums">{{ selectedInvoice.bank_account ?? "-" }}</dd>
          </div>
        </dl>

        <div v-if="selectedInvoice.terms">
          <p class="text-ui-small text-ui-ink font-medium mb-1">Terms & Conditions</p>
          <p class="text-ui-cap text-ui-muted whitespace-pre-line">{{ selectedInvoice.terms }}</p>
        </div>
      </div>
    </UiModal>

    <!-- PPh 23 Receipt Detail Modal -->
    <UiModal
      :open="showReceiptDetail && !!selectedReceipt"
      :title="selectedReceipt?.receipt_number || ''"
      description="Payment Receipt Detail"
      @close="closeReceiptDetail"
    >
      <div v-if="selectedReceipt" class="space-y-4">
        <dl class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-ui-cap text-ui-muted">Date</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ formatDate(selectedReceipt.date) }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Invoice No.</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedReceipt.invoice?.invoice_number ?? "-" }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Received From</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedReceipt.invoice?.client_name ?? selectedReceipt.received_from }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Recipient</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedReceipt.recipient_name ?? "-" }}</dd>
          </div>
        </dl>

        <div v-if="selectedReceipt.for_payment_of">
          <p class="text-ui-small text-ui-ink font-medium mb-1">For Payment Of</p>
          <p class="text-ui-cap text-ui-muted whitespace-pre-line">{{ selectedReceipt.for_payment_of }}</p>
        </div>

        <div class="bg-ui-subtle rounded-ui-control p-4 text-ui-small text-ui-text space-y-1">
          <div class="flex justify-between gap-3">
            <span>Gross Amount</span><span class="tabular-nums">{{ formatCurrency(Number(selectedReceipt.amount) + Number(selectedReceipt.pph23_amount)) }}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span>PPh 23 Withheld ({{ Number(selectedReceipt.pph23_percent) }}%)</span><span class="tabular-nums">{{ formatCurrency(selectedReceipt.pph23_amount) }}</span>
          </div>
          <div class="flex justify-between gap-3 font-semibold text-ui-ink pt-1.5 mt-1 border-t border-ui-line">
            <span>Net Received</span><span class="tabular-nums">{{ formatCurrency(selectedReceipt.amount) }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <UiBadge v-if="selectedReceipt.pph23_type" tone="info">{{ selectedReceipt.pph23_type }}</UiBadge>
          <UiBadge v-if="selectedReceipt.payment_status" tone="neutral" class="capitalize">{{ selectedReceipt.payment_status }}</UiBadge>
        </div>
      </div>
    </UiModal>

    <AttendanceDetailModal :show="showAttendanceDetail" :attendance="selectedAttendance" @close="closeAttendanceDetail" />

    <!-- Delete by Date Range Modal -->
    <UiModal v-model:open="showDeleteRangeModal" title="Delete by Date Range" size="sm" @close="closeDeleteRangeModal">
      <div class="space-y-4">
        <UiAlert tone="bad">
          This permanently deletes every underlying record in this range, not just its appearance in the report. This cannot be undone from this screen.
        </UiAlert>
        <div class="grid grid-cols-2 gap-3">
          <UiInput v-model="deleteRangeStart" type="date" label="Start Date" />
          <UiInput v-model="deleteRangeEnd" type="date" label="End Date" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="closeDeleteRangeModal">Cancel</UiButton>
        <UiButton variant="destructive" :loading="deletingRange" :disabled="!deleteRangeStart || !deleteRangeEnd" @click="handleDeleteRange">
          {{ deletingRange ? "Deleting..." : "Delete Range" }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
