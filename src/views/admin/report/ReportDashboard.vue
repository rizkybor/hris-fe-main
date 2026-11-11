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
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t, te } = useI18n();

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

const tabs = computed(() => [
  { key: "attendance", label: t("reports.tabs.attendance"), icon: ClockIcon },
  { key: "payroll", label: t("reports.tabs.payroll"), icon: Wallet },
  { key: "employee", label: t("reports.tabs.employee"), icon: Users },
  { key: "finance", label: t("reports.tabs.finance"), icon: Building2Icon },
  { key: "pph21", label: "PPh 21", icon: ReceiptIcon },
  { key: "pph23", label: "PPh 23", icon: ReceiptIcon },
  { key: "ppn", label: "PPN", icon: PercentIcon },
  { key: "project", label: t("reports.tabs.project"), icon: FolderKanban },
  { key: "subscription", label: t("reports.tabs.subscription"), icon: RefreshCw },
  { key: "maintenance", label: t("reports.tabs.maintenance"), icon: Wrench },
  { key: "documents", label: t("reports.tabs.documents"), icon: FileTextIcon },
  { key: "staff_raport", label: t("reports.tabs.staffRaport"), icon: Star, permission: "staff-raport-menu" },
]);

const visibleTabs = computed(() => tabs.value.filter((tab) => !tab.permission || can(tab.permission)));

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
  if (!(await alertModal.confirm(t("reports.delete.rowConfirm"), { type: "danger", confirmText: t("common.actions.delete") }))) return;

  deletingRowId.value = id;
  try {
    await reportStore.deleteRow(activeTab.value, id);
    await loadReport(reportMeta.value?.current_page || 1);
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || t("reports.delete.rowFailed"), { type: "danger" });
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
  const tabLabel = tabs.value.find((tab) => tab.key === activeTab.value)?.label ?? activeTab.value;

  if (
    !(await alertModal.confirm(
      t("reports.delete.rangeConfirm", { tab: tabLabel, start: deleteRangeStart.value, end: deleteRangeEnd.value }),
      { type: "danger", confirmText: t("reports.delete.range") }
    ))
  )
    return;

  deletingRange.value = true;
  try {
    const result = await reportStore.deleteByRange(activeTab.value, deleteRangeStart.value, deleteRangeEnd.value);
    showDeleteRangeModal.value = false;
    await loadReport(1);
    const skippedNote = result?.skipped?.length ? ` ${t("reports.delete.skipped", { n: result.skipped.length }, result.skipped.length)}` : "";
    await alertModal.alert(`${t("reports.delete.deleted", { n: result?.deleted ?? 0 }, result?.deleted ?? 0)}${skippedNote}`, { type: "success" });
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || t("reports.delete.rangeFailed"), { type: "danger" });
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
const FINANCE_SOURCES = computed(() => [
  { key: "cash_book", label: t("reports.finance.cashBook") },
  { key: "operational_cost", label: t("reports.finance.operationalCost") },
]);
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
  const tiers = a.late_tiers || {};
  return [
    { label: t("reports.raport.onTime"), value: (a.present ?? 0) + (a.remote ?? 0), sub: a.remote ? t("reports.raport.inclRemote", { n: a.remote }) : null },
    { label: t("reports.raport.late"), value: a.late ?? 0, class: a.late ? "text-ui-warn" : null, sub: a.late ? t("reports.raport.lateSub", { minutes: a.late_minutes, severe: tiers.severe || 0 }) : null },
    { label: t("reports.raport.absent"), value: missed, class: missed ? "text-ui-bad" : null, sub: a.no_record ? t("reports.raport.noRecord", { n: a.no_record }) : null },
    { label: t("reports.raport.notCounted"), value: (a.sick_leave ?? 0) + (a.leave ?? 0) + (a.holidays ?? 0), sub: t("reports.raport.notCountedSub", { sick: a.sick_leave ?? 0, leave: a.leave ?? 0, holiday: a.holidays ?? 0 }) },
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
        { label: t("reports.summary.totalRecords"), value: summary.total_records ?? 0 },
        { label: t("reports.summary.present"), value: summary.present ?? 0 },
        { label: t("reports.summary.late"), value: summary.late ?? 0 },
        { label: t("reports.summary.absent"), value: summary.absent ?? 0 },
      ];
    case "payroll":
      return [
        { label: t("reports.summary.payrollRuns"), value: summary.total_payroll_runs ?? 0 },
        { label: t("reports.summary.employeesPaid"), value: summary.total_employees_paid ?? 0 },
        {
          label: t("reports.summary.totalOriginalSalary"),
          value: formatCurrency(summary.total_original_salary),
        },
        {
          label: t("reports.summary.totalFinalSalary"),
          value: formatCurrency(summary.total_final_salary),
        },
      ];
    case "employee":
      return [
        { label: t("reports.summary.totalEmployees"), value: summary.total_employees ?? 0 },
        { label: t("reports.summary.active"), value: summary.active ?? 0 },
        { label: t("reports.summary.inactive"), value: summary.inactive ?? 0 },
      ];
    case "finance":
      if (summary.items_total !== undefined) {
        return [
          { label: t("reports.summary.fixedCostMonth"), value: formatCurrency(summary.fixed_cost) },
          { label: t("reports.summary.sdmMonth"), value: formatCurrency(summary.sdm) },
          { label: t("reports.summary.infraMonth"), value: formatCurrency(summary.infrastructure_monthly) },
          { label: t("reports.summary.infraYear"), value: formatCurrency(summary.infrastructure_annual) },
        ];
      }
      return [
        { label: t("reports.summary.periodOpening"), value: formatCurrency(summary.period_opening) },
        { label: t("reports.summary.totalDebit"), value: formatCurrency(summary.total_debit) },
        { label: t("reports.summary.totalCredit"), value: formatCurrency(summary.total_credit) },
        { label: t("reports.summary.periodClosing"), value: formatCurrency(summary.period_closing) },
      ];
    case "pph21":
      return [
        { label: t("reports.summary.employeesTaxed"), value: summary.total_employees_taxed ?? 0 },
        {
          label: t("reports.summary.totalGrossSalary"),
          value: formatCurrency(summary.total_gross_salary),
        },
        { label: t("reports.summary.totalPph21"), value: formatCurrency(summary.total_pph21) },
      ];
    case "ppn":
      return [
        { label: t("reports.summary.invoices"), value: summary.total_invoices ?? 0 },
        { label: t("reports.summary.totalDpp"), value: formatCurrency(summary.total_dpp) },
        { label: t("reports.summary.totalPpn"), value: formatCurrency(summary.total_ppn) },
      ];
    case "project": {
      const counts = summary.billing_status_counts || {};
      const paidPct = summary.total_invoiced ? Math.round((summary.total_paid / summary.total_invoiced) * 100) : null;
      return [
        { label: t("reports.summary.projects"), value: summary.total_projects ?? 0, sub: t("reports.summary.projectsSub", { active: summary.active_projects ?? 0, completed: summary.completed_projects ?? 0 }), subClass: "text-ui-muted" },
        { label: t("reports.summary.totalBudget"), value: formatCurrency(summary.total_budget), sub: t("reports.summary.notInvoicedYet", { amount: formatCurrency(summary.total_not_invoiced) }), subClass: "text-ui-muted" },
        { label: t("reports.summary.invoiced"), value: formatCurrency(summary.total_invoiced), sub: `${t("reports.summary.paidSub", { amount: formatCurrency(summary.total_paid) })}${paidPct !== null ? ` (${paidPct}%)` : ""}`, subClass: "text-ui-ok" },
        {
          label: t("reports.summary.outstanding"),
          value: formatCurrency(summary.total_outstanding),
          sub: `${t("reports.summary.outstandingSub", { settled: counts.settled ?? 0, outstanding: counts.outstanding ?? 0 })}${counts.overpaid ? t("reports.summary.overpaidSub", { n: counts.overpaid }) : ""}`,
          subClass: summary.total_outstanding > 0 ? "text-ui-warn" : "text-ui-muted",
        },
      ];
    }
    case "pph23":
      return [
        { label: t("reports.summary.receipts"), value: summary.total_receipts ?? 0 },
        { label: t("reports.summary.totalGross"), value: formatCurrency(summary.total_gross) },
        { label: t("reports.summary.totalPph23"), value: formatCurrency(summary.total_pph23) },
        { label: t("reports.summary.totalNet"), value: formatCurrency(summary.total_net_received) },
      ];
    case "subscription":
      return [
        { label: t("reports.summary.mrr"), value: formatCurrency(summary.mrr) },
        { label: t("reports.summary.arr"), value: formatCurrency(summary.arr) },
        { label: t("reports.summary.activeSubscriptions"), value: summary.active_count ?? 0 },
        { label: t("reports.summary.upcomingRenewals"), value: summary.upcoming_renewals_count ?? 0 },
      ];
    case "maintenance":
      return [
        { label: t("reports.summary.activeContracts"), value: `${summary.active_count ?? 0} / ${summary.total_count ?? 0}` },
        { label: t("reports.summary.hoursUsed", { month: maintenanceMonthLabel.value }), value: `${formatHours(summary.used)} / ${formatHours(summary.available)}` },
        { label: t("reports.summary.overQuota"), value: summary.over_count ?? 0 },
        { label: t("reports.summary.devBalance"), value: formatHours(summary.balance), sub: summary.expiring ? t("reports.summary.expiring", { hours: formatHours(summary.expiring) }) : null },
      ];
    case "staff_raport": {
      const rows = staffRaport.value.rows || [];
      const withScore = rows.filter((r) => r.overall_score !== null);
      const avg = (key) =>
        withScore.length ? Math.round((withScore.reduce((s, r) => s + (r[key] ?? 0), 0) / withScore.length) * 10) / 10 : 0;
      return [
        { label: t("reports.summary.totalStaff"), value: rows.length },
        { label: t("reports.summary.avgAttendance"), value: `${avg("attendance_rate")}%` },
        { label: t("reports.summary.avgTasks"), value: `${avg("task_completion_rate")}%` },
        { label: t("reports.summary.avgScore"), value: `${avg("overall_score")}%` },
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
const BILLING_STATUS = computed(() => ({
  settled: { label: t("reports.billing.settled"), tone: "ok" },
  outstanding: { label: t("reports.billing.outstanding"), tone: "warn" },
  overpaid: { label: t("reports.billing.overpaid"), tone: "bad" },
  not_invoiced: { label: t("reports.billing.notInvoiced"), tone: "neutral" },
}));

const subscriptionStatusTone = {
  active: "ok",
  postponed: "warn",
  cancelled: "neutral",
};

const contractStatusTone = { active: "ok", paused: "warn", ended: "neutral" };

const subscriptionStatusLabel = computed(() => ({
  active: t("reports.subscriptionStatus.active"),
  postponed: t("reports.subscriptionStatus.postponed"),
  cancelled: t("reports.subscriptionStatus.cancelled"),
}));

// Display label for an enum value: translated when the key exists,
// otherwise the value in Title Case.
const enumLabel = (group, v) => (v && te(`reports.${group}.${v}`) ? t(`reports.${group}.${v}`) : titleCase(v));
const contractStatusLabel = (v) => (te(`reports.contractStatus.${v}`) ? t(`reports.contractStatus.${v}`) : CONTRACT_STATUS[v]?.label ?? v);
const leftoverLabel = (v) => (te(`reports.leftover.${v}`) ? t(`reports.leftover.${v}`) : LEFTOVER_POLICY[v]?.short ?? v);

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
  return m ? new Date(`${m}-01T00:00:00`).toLocaleDateString(localeTag(), { month: "short", year: "numeric" }) : t("reports.thisMonth");
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
  return new Date(value).toLocaleDateString(localeTag(), {
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
const COLUMNS = computed(() => ({
  attendance: [
    { key: "date", label: t("reports.columns.date") },
    { key: "employee", label: t("reports.columns.employee") },
    { key: "check_in", label: t("reports.columns.checkIn") },
    { key: "check_out", label: t("reports.columns.checkOut") },
    { key: "status", label: t("reports.columns.status") },
  ],
  payroll: [
    { key: "period", label: t("reports.columns.period") },
    { key: "employee", label: t("reports.columns.employee") },
    { key: "original_salary", label: t("reports.columns.originalSalary"), align: R },
    { key: "final_salary", label: t("reports.columns.finalSalary"), align: R },
    { key: "status", label: t("reports.columns.status") },
  ],
  employee: [
    { key: "code", label: t("reports.columns.code") },
    { key: "name", label: t("reports.columns.name") },
    { key: "job_title", label: t("reports.columns.jobTitle") },
    { key: "team", label: t("reports.columns.team") },
    { key: "status", label: t("reports.columns.status") },
  ],
  operational_cost: [
    { key: "category", label: t("reports.columns.category") },
    { key: "item", label: t("reports.columns.item") },
    { key: "monthly", label: t("reports.columns.costPerMonth"), align: R },
    { key: "annual", label: t("reports.columns.costPerYear"), align: R },
    { key: "status", label: t("reports.columns.status") },
  ],
  finance: [
    { key: "date", label: t("reports.columns.date") },
    { key: "description", label: t("reports.columns.description") },
    { key: "source", label: t("reports.columns.source") },
    { key: "debit", label: t("reports.columns.debit"), align: R },
    { key: "credit", label: t("reports.columns.credit"), align: R },
    { key: "balance", label: t("reports.columns.balance"), align: R },
  ],
  pph21: [
    { key: "period", label: t("reports.columns.period") },
    { key: "employee", label: t("reports.columns.employee") },
    { key: "npwp", label: t("reports.columns.npwp") },
    { key: "ptkp", label: t("reports.columns.ptkp") },
    { key: "gross", label: t("reports.columns.grossSalary"), align: R },
    { key: "pph21", label: t("reports.columns.pph21"), align: R },
  ],
  ppn: [
    { key: "date", label: t("reports.columns.date") },
    { key: "faktur", label: t("reports.columns.faktur") },
    { key: "invoice", label: t("reports.columns.invoiceNo") },
    { key: "client", label: t("reports.columns.client") },
    { key: "dpp", label: t("reports.columns.dpp"), align: R },
    { key: "ppn", label: t("reports.columns.ppn"), align: R },
  ],
  project: [
    { key: "name", label: t("reports.columns.projectName") },
    { key: "leader", label: t("reports.columns.leader") },
    { key: "status", label: t("reports.columns.status") },
    { key: "priority", label: t("reports.columns.priority") },
    { key: "start_date", label: t("reports.columns.startDate") },
    { key: "end_date", label: t("reports.columns.endDate") },
    { key: "budget", label: t("reports.columns.budget"), align: R },
    { key: "tasks", label: t("reports.columns.tasksDone") },
    { key: "invoiced", label: t("reports.columns.invoiced"), align: R },
    { key: "paid", label: t("reports.columns.paid"), align: R },
    { key: "outstanding", label: t("reports.columns.outstanding"), align: R },
    { key: "billing", label: t("reports.columns.billing") },
  ],
  pph23: [
    { key: "date", label: t("reports.columns.date") },
    { key: "receipt", label: t("reports.columns.receiptNo") },
    { key: "invoice", label: t("reports.columns.invoiceNo") },
    { key: "client", label: t("reports.columns.client") },
    { key: "percent", label: t("reports.columns.pph23Percent"), align: R },
    { key: "gross", label: t("reports.columns.grossAmount"), align: R },
    { key: "withheld", label: t("reports.columns.pph23Withheld"), align: R },
    { key: "net", label: t("reports.columns.netReceived"), align: R },
  ],
  subscription: [
    { key: "name", label: t("reports.columns.name") },
    { key: "client", label: t("reports.columns.client") },
    { key: "services", label: t("reports.columns.services") },
    { key: "cycle", label: t("reports.columns.billingCycle") },
    { key: "amount", label: t("reports.columns.amount"), align: R },
    { key: "status", label: t("reports.columns.status") },
    { key: "next_due", label: t("reports.columns.nextDue") },
  ],
  maintenance: [
    { key: "contract", label: t("reports.columns.contract") },
    { key: "client", label: t("reports.columns.clientProject") },
    { key: "quota", label: t("reports.columns.quotaMonth"), align: R },
    { key: "used", label: t("reports.columns.used"), class: "min-w-[170px]" },
    { key: "leftover", label: t("reports.columns.leftover") },
    { key: "balance", label: t("reports.columns.devBalance"), align: R },
    { key: "status", label: t("reports.columns.status") },
  ],
  staff_raport: [
    { key: "name", label: t("reports.columns.name") },
    { key: "job_title", label: t("reports.columns.jobTitle") },
    { key: "employment_type", label: t("reports.columns.employmentType") },
    { key: "attendance", label: t("reports.columns.attendance"), align: R },
    { key: "tasks", label: t("reports.columns.tasksDone"), align: R },
    { key: "rating", label: t("reports.columns.rating") },
    { key: "view", label: "" },
  ],
}));

const tableColumns = computed(() => {
  const key = isOperationalCost.value ? "operational_cost" : activeTab.value;
  let cols = COLUMNS.value[key] || [];
  if (activeTab.value === "maintenance") {
    cols = cols.map((c) => (c.key === "used" ? { ...c, label: t("reports.columns.usedMonth", { month: maintenanceMonthLabel.value }) } : c));
  }
  return showDeleteColumn.value ? [...cols, { key: "actions", label: t("common.labels.actions"), align: R, width: 72 }] : cols;
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
const lateLabel = (m) => t("reports.lateBy", { duration: `${Math.floor(m / 60) > 0 ? `${Math.floor(m / 60)}h ` : ""}${m % 60}m` });

// Phone card: kicker line, title, sub line, amount on the right and a badge.
const mobileCard = (row) => {
  switch (activeTab.value) {
    case "attendance":
      return {
        kicker: formatDate(row.date),
        title: row.employee?.user?.name ?? "N/A",
        sub: `${t("reports.mobile.in")} ${row.check_in ? formatTimeUtil(row.check_in) : "-"} · ${t("reports.mobile.out")} ${row.check_out ? formatTimeUtil(row.check_out) : "-"}${row.status === "late" && row.late_minutes ? ` · ${lateLabel(row.late_minutes)}` : ""}`,
        badge: { tone: attendanceStatusTone[row.status] || "neutral", label: enumLabel("attendanceStatus", row.status) },
      };
    case "payroll":
      return {
        kicker: formatDate(row.salary_month),
        title: row.employee?.user?.name ?? "N/A",
        sub: t("reports.mobile.original", { amount: formatCurrency(row.original_salary) }),
        amount: formatCurrency(row.final_salary),
        badge: { tone: row.payment_status === "paid" ? "ok" : "warn", label: row.payment_status === "paid" ? t("reports.paymentStatus.paid") : t("reports.paymentStatus.pending") },
      };
    case "employee":
      return {
        kicker: row.code,
        title: row.user?.name ?? "N/A",
        sub: [row.job_information?.job_title, row.job_information?.team?.name].filter(Boolean).join(" · ") || "N/A",
        badge: { tone: "neutral", label: enumLabel("employeeStatus", row.job_information?.status ?? "N/A") },
      };
    case "finance":
      if (isOperationalCost.value) {
        return {
          kicker: row.category,
          title: row.name,
          sub: row.annual !== null ? t("reports.mobile.perYear", { amount: formatCurrency(row.annual) }) : null,
          amount: formatCurrency(row.monthly),
          badge: { tone: row.in_use ? "ok" : "neutral", label: row.in_use ? t("finance.usageStatus.active") : t("finance.usageStatus.inactive") },
        };
      }
      return {
        kicker: `${formatDate(row.transaction_date)} · ${row.source}`,
        title: row.description,
        sub: t("reports.mobile.balance", { amount: formatCurrency(row.balance) }),
        amount: `${row.type === "debit" ? "+" : "−"}${formatCurrency(row.amount)}`,
        amountClass: row.type === "debit" ? "text-ui-ok" : "text-ui-bad",
      };
    case "pph21":
      return {
        kicker: formatDate(row.salary_month),
        title: row.employee?.user?.name ?? "N/A",
        sub: `${row.employee?.job_information?.ptkp_status ?? "TK/0"} · ${t("reports.mobile.gross", { amount: formatCurrency(row.gross_salary) })}`,
        amount: formatCurrency(row.pph21),
      };
    case "ppn":
      return { kicker: row.invoice_number, mono: true, title: row.client_name, sub: `DPP ${formatCurrency(row.subtotal)} · ${formatDate(row.date)}`, amount: formatCurrency(row.ppn_amount) };
    case "project":
      return {
        kicker: enumLabel("projectStatus", row.status),
        title: row.name,
        sub: `${row.project_leader?.user?.name ?? "N/A"} · ${t("reports.mobile.tasks", { done: row.tasks_done_count, total: row.tasks_total_count })}`,
        amount: formatCurrency(row.billing?.invoiced_total),
        badge: { tone: BILLING_STATUS.value[row.billing?.status]?.tone || "neutral", label: BILLING_STATUS.value[row.billing?.status]?.label ?? "-" },
      };
    case "pph23":
      return {
        kicker: row.receipt_number,
        mono: true,
        title: row.invoice?.client_name ?? row.received_from,
        sub: `${Number(row.pph23_percent)}% · ${t("reports.mobile.net", { amount: formatCurrency(row.amount) })}`,
        amount: formatCurrency(row.pph23_amount),
      };
    case "subscription":
      return {
        kicker: `${enumLabel("billingCycle", row.billing_cycle)} · ${t("reports.mobile.due", { date: formatDate(row.next_due_date) })}`,
        title: row.name,
        sub: row.client?.name ?? "-",
        amount: formatCurrency(row.amount),
        badge: { tone: subscriptionStatusTone[row.status] || "neutral", label: subscriptionStatusLabel.value[row.status] || row.status },
      };
    case "maintenance":
      return {
        kicker: row.client ?? "-",
        title: row.name,
        sub: row.period ? t("reports.mobile.hoursUsed", { used: formatHours(row.period.used), total: formatHours(row.period.total), pct: Math.round(row.period.used_percent) }) : t("reports.maintenance.notRunning"),
        amount: formatHours(row.balance),
        badge: { tone: contractStatusTone[row.status] || "neutral", label: contractStatusLabel(row.status) },
      };
    case "staff_raport":
      return {
        kicker: row.job_title ?? "-",
        title: row.name ?? "N/A",
        sub: `${t("reports.columns.attendance")} ${row.attendance_rate !== null ? `${row.attendance_rate}%` : "-"} · ${t("reports.mobile.tasksLabel")} ${row.task_completion_rate !== null ? `${row.task_completion_rate}%` : "-"}`,
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
      <aside class="hidden lg:block w-[208px] shrink-0 sticky top-0" :aria-label="$t('reports.reportType')">
        <p class="text-ui-over uppercase text-ui-faint px-2.5 mb-2">{{ $t('reports.count', { n: visibleTabs.length }, visibleTabs.length) }}</p>
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
        <UiPageHeader :title="$t('reports.title')" :subtitle="$t('reports.subtitle')">
          <template #actions>
            <UiButton v-if="showDeleteColumn" variant="danger" :icon="CalendarRange" @click="openDeleteRangeModal">{{ $t('reports.delete.byRange') }}</UiButton>
            <UiButton v-if="canExport && activeTab !== 'staff_raport'" :icon="Download" :loading="exporting" @click="handleExport">
              {{ exporting ? $t('reports.exporting') : $t("common.actions.exportExcel") }}
            </UiButton>
          </template>
        </UiPageHeader>

        <!-- Phones / tablets: scrolling chips -->
        <div class="relative lg:hidden">
          <div ref="tabScrollRef" @scroll="updateTabFade" class="overflow-x-auto [scrollbar-width:none]">
            <div class="flex items-center gap-1.5 min-w-max pr-10" role="tablist" :aria-label="$t('reports.reportType')">
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
            {{ $t('reports.notices.pph21') }}
          </UiAlert>
          <UiAlert v-if="activeTab === 'ppn'" tone="info">
            {{ $t('reports.notices.ppn') }}
          </UiAlert>
          <UiAlert v-if="activeTab === 'pph23'" tone="info">
            {{ $t('reports.notices.pph23') }}
          </UiAlert>
          <UiAlert v-if="activeTab === 'pph21'" tone="warn">
            {{ $t('reports.notices.pph21Method') }}
          </UiAlert>
          <p class="text-ui-cap text-ui-muted bg-ui-subtle border border-ui-line rounded-ui-control px-3.5 py-2.5">
            {{ $t('reports.notices.coretax') }}
          </p>
        </div>

        <!-- Toolbar: finance source + filters, one row above the content -->
        <div v-if="activeTab === 'finance' || (activeTab !== 'employee' && !isOperationalCost)" class="space-y-2">
          <div class="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3">
            <div v-if="activeTab === 'finance'" class="min-w-0">
              <p class="text-ui-small font-medium text-ui-ink mb-1.5 hidden lg:block">{{ $t('reports.finance.source') }}</p>
              <div class="grid grid-cols-2 bg-ui-subtle border border-ui-line rounded-ui-control p-0.5 w-full sm:w-auto sm:inline-grid" role="tablist" :aria-label="$t('reports.finance.sourceAria')">
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
              <UiInput v-if="activeTab === 'maintenance'" v-model="maintenanceMonth" :label="$t('common.labels.month')" type="month" class="sm:w-[180px]" @change="loadReport(1)" />
              <UiSelect
                v-if="activeTab === 'maintenance'"
                v-model="maintenanceStatus"
                :label="$t('common.labels.status')"
                :options="[{ value: '', label: $t('common.labels.allStatuses') }, ...Object.keys(CONTRACT_STATUS).map((key) => ({ value: key, label: contractStatusLabel(key) }))]"
                class="sm:w-[180px]"
                @change="loadReport(1)"
              />
              <UiInput v-if="!['subscription', 'maintenance'].includes(activeTab)" v-model="startDate" :label="$t('common.labels.startDate')" type="date" class="sm:w-[170px]" @change="loadReport(1)" />
              <UiInput v-if="!['subscription', 'maintenance'].includes(activeTab)" v-model="endDate" :label="$t('common.labels.endDate')" type="date" class="sm:w-[170px]" @change="loadReport(1)" />
              <UiSelect
                v-if="activeTab === 'subscription'"
                v-model="subscriptionStatus"
                :label="$t('common.labels.status')"
                :options="[
                  { value: '', label: $t('common.labels.allStatuses') },
                  { value: 'active', label: subscriptionStatusLabel.active },
                  { value: 'postponed', label: subscriptionStatusLabel.postponed },
                  { value: 'cancelled', label: subscriptionStatusLabel.cancelled },
                ]"
                class="col-span-2 sm:w-[200px]"
                @change="loadReport(1)"
              />
              <UiSelect
                v-if="activeTab === 'project'"
                v-model="projectStatus"
                :label="$t('common.labels.status')"
                :options="[
                  { value: '', label: $t('common.labels.allStatuses') },
                  ...['draft', 'planning', 'active', 'on_hold', 'completed', 'cancelled'].map((v) => ({ value: v, label: enumLabel('projectStatus', v) })),
                ]"
                class="col-span-2 sm:w-[180px]"
                @change="loadReport(1)"
              />
              <UiInput
                v-if="activeTab === 'staff_raport'"
                v-model="staffRaportSearch"
                :label="$t('common.labels.name')"
                :icon="Search"
                :placeholder="$t('reports.staff.searchPlaceholder')"
                class="col-span-2 sm:w-[240px]"
                @input="loadReport(1)"
              />
              <UiSelect
                v-if="activeTab === 'staff_raport'"
                v-model="staffRaportEmploymentType"
                :label="$t('reports.columns.employmentType')"
                :options="[{ value: '', label: $t('reports.staff.allEmploymentTypes') }, ...(employmentTypes || [])]"
                class="col-span-2 sm:w-[220px]"
                @change="loadReport(1)"
              />
            </div>
          </div>

          <p v-if="activeTab === 'finance'" class="text-ui-cap text-ui-muted">
            <template v-if="financeSource === 'cash_book'">
              {{ $t('reports.finance.cashBookHint') }}
            </template>
            <template v-else>
              {{ $t('reports.finance.operationalCostHint') }}
            </template>
          </p>
          <p v-if="activeTab === 'staff_raport'" class="text-ui-cap text-ui-muted">
            {{ $t('reports.staff.hint') }}
          </p>
          <p v-if="activeTab === 'project'" class="text-ui-cap text-ui-muted">
            {{ $t('reports.projectHint') }}
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
              <h2 class="text-ui-h3 text-ui-ink mb-3">{{ $t('reports.subscription.statusBreakdown') }}</h2>
              <div class="space-y-2.5">
                <div v-for="item in subscription.status_breakdown" :key="item.status" class="flex items-center justify-between gap-3">
                  <UiBadge :tone="subscriptionStatusTone[item.status] || 'neutral'" dot>{{ subscriptionStatusLabel[item.status] || item.status }}</UiBadge>
                  <span class="text-ui-small text-ui-ink font-medium tabular-nums">{{ $t('reports.subscription.count', { n: item.count }, item.count) }}</span>
                </div>
                <p v-if="!subscription.status_breakdown?.length" class="text-ui-small text-ui-muted">{{ $t('reports.subscription.none') }}</p>
              </div>
            </section>

            <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
              <h2 class="text-ui-h3 text-ui-ink mb-3">{{ $t('reports.subscription.upcoming') }}</h2>
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
                <p v-if="!subscription.upcoming_renewals?.length" class="text-ui-small text-ui-muted">{{ $t('reports.subscription.noUpcoming') }}</p>
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
                  :title="$t('common.actions.delete')"
                  :aria-label="$t('common.actions.delete')"
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
                <UiBadge v-if="activeTab === 'attendance'" :tone="attendanceStatusTone[row.status] || 'neutral'" dot>{{ enumLabel('attendanceStatus', row.status) }}</UiBadge>
                <UiBadge v-else-if="activeTab === 'payroll'" :tone="row.payment_status === 'paid' ? 'ok' : 'warn'" dot>{{ row.payment_status === "paid" ? $t('reports.paymentStatus.paid') : $t('reports.paymentStatus.pending') }}</UiBadge>
                <UiBadge v-else-if="activeTab === 'employee'" tone="neutral">{{ enumLabel("employeeStatus", row.job_information?.status ?? "N/A") }}</UiBadge>
                <UiBadge v-else-if="isOperationalCost" :tone="row.in_use ? 'ok' : 'neutral'" dot class="whitespace-nowrap">{{ row.in_use ? $t("finance.usageStatus.active") : $t("finance.usageStatus.inactive") }}</UiBadge>
                <span v-else-if="activeTab === 'project'" class="whitespace-nowrap">{{ enumLabel("projectStatus", row.status) }}</span>
                <UiBadge v-else-if="activeTab === 'subscription'" :tone="subscriptionStatusTone[row.status] || 'neutral'" dot>{{ subscriptionStatusLabel[row.status] || row.status }}</UiBadge>
                <UiBadge v-else-if="activeTab === 'maintenance'" :tone="contractStatusTone[row.status] || 'neutral'" dot>{{ contractStatusLabel(row.status) }}</UiBadge>
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
                  <p v-if="row.expiring" class="text-ui-cap text-ui-warn whitespace-nowrap">{{ $t('reports.maintenance.expiring', { hours: formatHours(row.expiring) }) }}</p>
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
              <template #cell-priority="{ row }">{{ enumLabel("priority", row.priority) }}</template>
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
                <p v-if="row.billing?.invoiced_percent !== null && row.billing?.invoiced_percent !== undefined" class="text-ui-cap text-ui-muted whitespace-nowrap">{{ $t('reports.ofValue', { pct: row.billing.invoiced_percent }) }}</p>
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
                    :title="$t('reports.billing.mismatch', { n: row.billing.mismatch_count }, row.billing.mismatch_count)"
                  />
                </span>
              </template>

              <!-- Subscription -->
              <template #cell-services="{ row }">
                <span class="capitalize">{{ subscriptionServicesLabel(row.services) }}</span>
              </template>
              <template #cell-cycle="{ row }">
                <span>{{ enumLabel("billingCycle", row.billing_cycle) }}</span>
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
                  <p v-if="row.period.overage > 0" class="text-ui-cap text-ui-bad mt-0.5">{{ $t('reports.maintenance.overQuota', { hours: formatHours(row.period.overage) }) }}</p>
                </div>
                <span v-else class="text-ui-cap text-ui-muted">{{ $t('reports.maintenance.notRunning') }}</span>
              </template>
              <template #cell-leftover="{ row }">
                <span class="text-ui-cap whitespace-nowrap">{{ leftoverLabel(row.leftover_policy) }}</span>
              </template>

              <!-- Staff raport -->
              <template #cell-employment_type="{ row }">
                <span class="capitalize">{{ (row.employment_type || "-").replace("_", " ") }}</span>
              </template>
              <template #cell-attendance="{ row }">
                <span class="tabular-nums">{{ row.attendance_rate !== null ? `${row.attendance_rate}%` : "-" }}</span>
              </template>
              <template #cell-rating="{ row }">
                <span class="flex items-center gap-0.5" :aria-label="$t('reports.stars', { n: row.stars })">
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
                <span class="text-ui-cap font-medium text-ui-accent whitespace-nowrap">{{ $t('reports.viewDetail') }}</span>
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
                      <Trash2 class="w-3.5 h-3.5" />{{ $t("common.actions.delete") }}
                    </button>
                  </div>
                </div>
              </template>

              <template #empty>
                <UiEmpty :icon="FileTextIcon" :title="$t('reports.empty.title')" :message="$t('reports.empty.message')" compact />
              </template>
            </UiTable>

            <div v-if="reportMeta && reportMeta.total > 0" class="px-4 pb-3 border-t border-ui-line">
              <Pagination :meta="reportMeta" :loading="loading" :item-label="$t('reports.itemLabel')" @page-change="loadReport" />
            </div>
          </section>
        </template>

      </div>
    </div>

    <!-- Staff Raport Detail Modal -->
    <UiModal v-model:open="showRaportDetail" :title="$t('reports.tabs.staffRaport')" size="lg" @close="closeRaportDetail">
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
            <span v-if="staffRaportDetail.employee.start_date"> • {{ $t('reports.raport.joined') }} {{ formatDate(staffRaportDetail.employee.start_date) }}</span>
          </p>
          <div class="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 bg-ui-subtle border border-ui-line rounded-ui-control px-3 py-2">
            <p class="text-ui-cap text-ui-text flex-1">
              {{ $t('common.labels.period') }}: <strong class="text-ui-ink font-semibold">{{ staffRaportDetail.period_label }}</strong>
              <span class="text-ui-muted">({{ formatDate(staffRaportDetail.period.start_date) }} – {{ formatDate(staffRaportDetail.period.end_date) }})</span>
            </p>
            <UiSelect
              v-model="raportPeriod"
              :aria-label="$t('reports.raport.periodAria')"
              :options="[
                { value: 'filter', label: $t('reports.raport.periods.filter') },
                { value: 'week', label: $t('reports.raport.periods.week') },
                { value: 'month', label: $t('reports.raport.periods.month') },
                { value: 'all', label: $t('reports.raport.periods.all') },
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
            <span class="text-ui-small text-ui-muted ml-1 tabular-nums">{{ staffRaportDetail.overall_score !== null ? `${staffRaportDetail.overall_score}%` : $t('reports.raport.noData') }}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 sm:gap-3">
          <div class="bg-ui-subtle rounded-ui-control p-3 min-w-0">
            <p class="text-ui-h3 sm:text-ui-h2 text-ui-ink tabular-nums">{{ staffRaportDetail.attendance_rate !== null ? `${staffRaportDetail.attendance_rate}%` : "-" }}</p>
            <p class="text-ui-cap text-ui-muted">{{ $t('reports.raport.attendanceDays', { n: staffRaportDetail.attendance.total }) }}</p>
          </div>
          <div class="bg-ui-subtle rounded-ui-control p-3 min-w-0">
            <p class="text-ui-h3 sm:text-ui-h2 text-ui-ink tabular-nums">{{ staffRaportDetail.task_completion_rate !== null ? `${staffRaportDetail.task_completion_rate}%` : "-" }}</p>
            <p class="text-ui-cap text-ui-muted">{{ $t('reports.raport.tasksDue', { done: staffRaportDetail.tasks.done, total: staffRaportDetail.tasks.total }) }}</p>
          </div>
          <div class="bg-ui-subtle rounded-ui-control p-3 min-w-0">
            <p class="text-ui-h3 sm:text-ui-h2 text-ui-ink tabular-nums">{{ staffRaportDetail.overall_score !== null ? `${staffRaportDetail.overall_score}%` : "-" }}</p>
            <p class="text-ui-cap text-ui-muted">{{ $t('reports.raport.overallScore') }}</p>
          </div>
        </div>

        <!-- How the attendance score was reached, day by day -->
        <div v-if="staffRaportDetail.attendance.working_days !== undefined">
          <h4 class="text-ui-h3 text-ui-ink mb-2">{{ $t('reports.raport.punctuality') }}</h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div v-for="b in raportAttendanceBoxes" :key="b.label" class="border border-ui-line rounded-ui-control px-3 py-2 min-w-0">
              <p class="text-ui-cap text-ui-muted">{{ b.label }}</p>
              <p class="text-ui-h3 tabular-nums" :class="b.class || 'text-ui-ink'">{{ b.value }}</p>
              <p v-if="b.sub" class="text-ui-cap text-ui-muted">{{ b.sub }}</p>
            </div>
          </div>
          <p class="text-ui-cap text-ui-muted mt-2">
            {{ $t('reports.raport.scoring') }}
            <span v-if="staffRaportDetail.tasks.upcoming"> {{ $t('reports.raport.upcomingTasks', { n: staffRaportDetail.tasks.upcoming }, staffRaportDetail.tasks.upcoming) }}</span>
            <span v-if="staffRaportDetail.tasks.staff_done_late" class="text-ui-warn"> {{ $t('reports.raport.lateTasks', { n: staffRaportDetail.tasks.staff_done_late }, staffRaportDetail.tasks.staff_done_late) }}</span>
          </p>
        </div>

        <div>
          <h4 class="text-ui-h3 text-ui-ink mb-2">{{ $t('reports.raport.completedTasks', { n: staffRaportDetail.completed_tasks.length }) }}</h4>
          <div v-if="staffRaportDetail.completed_tasks.length" class="border border-ui-line rounded-ui-control divide-y divide-ui-line max-h-48 overflow-y-auto">
            <div v-for="(task, idx) in staffRaportDetail.completed_tasks" :key="idx" class="flex items-center justify-between gap-3 px-3.5 py-2.5 text-ui-small">
              <span class="text-ui-ink">{{ task.title }}<span v-if="task.project_name" class="text-ui-muted"> ({{ task.project_name }})</span></span>
              <span class="text-ui-cap text-ui-muted shrink-0">{{ formatDate(task.due_date) }}</span>
            </div>
          </div>
          <p v-else class="text-ui-small text-ui-muted">{{ $t('reports.raport.noCompleted') }}</p>
        </div>

        <div v-if="staffRaportDetail.performance_review" class="border-t border-ui-line pt-4">
          <h4 class="text-ui-h3 text-ui-ink mb-2">{{ $t('reports.raport.latestReview') }}</h4>
          <div class="bg-ui-subtle rounded-ui-control p-3.5 space-y-2">
            <div class="flex items-center justify-between gap-2 text-ui-cap text-ui-muted">
              <span>
                {{ staffRaportDetail.performance_review.period }}
                <span v-if="staffRaportDetail.performance_review.reviewer_name"> • {{ $t('reports.raport.reviewedBy', { name: staffRaportDetail.performance_review.reviewer_name }) }}</span>
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
            <p v-if="staffRaportDetail.performance_review.strengths" class="text-ui-cap text-ui-text"><strong class="text-ui-ink">{{ $t('reports.raport.strengths') }}</strong> {{ staffRaportDetail.performance_review.strengths }}</p>
            <p v-if="staffRaportDetail.performance_review.areas_for_improvement" class="text-ui-cap text-ui-text"><strong class="text-ui-ink">{{ $t('reports.raport.improvements') }}</strong> {{ staffRaportDetail.performance_review.areas_for_improvement }}</p>
          </div>
        </div>

        <div class="pt-4 border-t border-ui-line">
          <p class="text-ui-h3 text-ui-ink mb-2">{{ $t("common.actions.downloadPdf") }}</p>
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <p class="text-ui-cap text-ui-muted flex-1">{{ $t('reports.raport.usesPeriod') }} <strong class="text-ui-ink font-semibold">{{ staffRaportDetail.period_label }}</strong></p>
            <UiButton :icon="Download" :loading="downloadingPdf" class="shrink-0" @click="handleDownloadPdf">
              {{ downloadingPdf ? $t('reports.downloading') : $t("common.actions.downloadPdf") }}
            </UiButton>
          </div>
          <SignatureToggle v-model="raportUseSignature" class="mt-3" :hint="$t('reports.raport.signatureHint')" />
        </div>
      </div>
    </UiModal>

    <!-- Subscription Detail Modal -->
    <UiModal
      :open="showSubscriptionDetail && !!selectedSubscription"
      :title="selectedSubscription?.name || ''"
      :description="$t('reports.subscription.detail')"
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
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.columns.billingCycle') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ enumLabel("billingCycle", selectedSubscription.billing_cycle) }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.columns.nextDue') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ formatDate(selectedSubscription.next_due_date) }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.subscription.lastInvoiced') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedSubscription.last_invoiced_at ? formatDate(selectedSubscription.last_invoiced_at) : "-" }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.bankAccount') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedSubscription.bank_name ?? "-" }}</dd>
          </div>
        </dl>

        <div>
          <p class="text-ui-h3 text-ui-ink mb-2">{{ $t('reports.columns.services') }}</p>
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
            <p v-if="!selectedSubscription.services?.length" class="text-ui-small text-ui-muted">{{ $t('reports.subscription.noServices') }}</p>
          </div>
        </div>

        <div class="bg-ui-subtle rounded-ui-control p-4 text-ui-small text-ui-text space-y-1">
          <div class="flex justify-between gap-3"><span>{{ $t('reports.columns.amount') }}</span><span class="tabular-nums">{{ formatCurrency(selectedSubscription.amount) }}</span></div>
          <div class="flex justify-between gap-3">
            <span>{{ selectedSubscription.services?.length > 1 ? $t('reports.subscription.totalVat') : $t('reports.subscription.vat') }} ({{ selectedSubscription.ppn_percentage || 0 }}%)</span>
            <span class="tabular-nums">{{ formatCurrency(Math.round((Number(selectedSubscription.amount) || 0) * ((Number(selectedSubscription.ppn_percentage) || 0) / 100))) }}</span>
          </div>
          <div class="flex justify-between gap-3"><span>{{ $t('reports.adminFee') }}</span><span class="tabular-nums">{{ formatCurrency(selectedSubscription.admin_fee) }}</span></div>
          <div v-if="subscriptionIcannFeeTotal(selectedSubscription) > 0" class="flex justify-between gap-3">
            <span>ICANN Fee</span><span class="tabular-nums">{{ formatCurrency(subscriptionIcannFeeTotal(selectedSubscription)) }}</span>
          </div>
          <div v-if="selectedSubscription.pph23_type" class="flex justify-between gap-3"><span>PPh 23</span><span class="tabular-nums">{{ selectedSubscription.pph23_percent }}%</span></div>
        </div>

        <div v-if="selectedSubscription.terms">
          <p class="text-ui-small text-ui-ink font-medium mb-1">{{ $t('reports.terms') }}</p>
          <p class="text-ui-cap text-ui-muted whitespace-pre-line">{{ selectedSubscription.terms }}</p>
        </div>
      </div>
    </UiModal>

    <!-- PPN Invoice Detail Modal -->
    <UiModal
      :open="showInvoiceDetail && !!selectedInvoice"
      :title="selectedInvoice?.invoice_number || ''"
      :description="$t('reports.invoiceDetail')"
      @close="closeInvoiceDetail"
    >
      <div v-if="selectedInvoice" class="space-y-4">
        <dl class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t("common.labels.date") }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ formatDate(selectedInvoice.date) }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.columns.faktur') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedInvoice.faktur_pajak_number ?? "-" }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t("common.labels.client") }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedInvoice.client_name }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">NPWP</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedInvoice.client_npwp ?? "-" }}</dd>
          </div>
        </dl>

        <div v-if="selectedInvoice.items?.length">
          <p class="text-ui-h3 text-ui-ink mb-2">{{ $t('reports.items') }}</p>
          <div class="space-y-2">
            <div v-for="(item, idx) in selectedInvoice.items" :key="idx" class="flex items-center justify-between gap-3 bg-ui-subtle rounded-ui-control px-3 py-2 text-ui-small">
              <span class="min-w-0 truncate text-ui-text">{{ item.description }}</span>
              <span class="text-ui-ink font-medium tabular-nums shrink-0">{{ formatCurrency(item.total) }}</span>
            </div>
          </div>
        </div>

        <div class="bg-ui-subtle rounded-ui-control p-4 text-ui-small text-ui-text space-y-1">
          <div class="flex justify-between gap-3"><span>{{ $t('reports.dppSubtotal') }}</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.subtotal) }}</span></div>
          <div class="flex justify-between gap-3"><span>PPN ({{ selectedInvoice.ppn_percentage || 0 }}%)</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.ppn_amount) }}</span></div>
          <div v-if="selectedInvoice.admin_fee > 0" class="flex justify-between gap-3"><span>{{ $t('reports.adminFee') }}</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.admin_fee) }}</span></div>
          <div v-if="selectedInvoice.icann_fee > 0" class="flex justify-between gap-3"><span>ICANN Fee</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.icann_fee) }}</span></div>
          <div v-if="selectedInvoice.pph23_type" class="flex justify-between gap-3"><span>PPh 23</span><span class="tabular-nums">{{ selectedInvoice.pph23_percent }}%</span></div>
          <div class="flex justify-between gap-3 font-semibold text-ui-ink pt-1.5 mt-1 border-t border-ui-line">
            <span>{{ $t('reports.totalDue') }}</span><span class="tabular-nums">{{ formatCurrency(selectedInvoice.total) }}</span>
          </div>
        </div>

        <dl v-if="selectedInvoice.bank_name" class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.bank') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedInvoice.bank_name }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.accountNumber') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium tabular-nums">{{ selectedInvoice.bank_account ?? "-" }}</dd>
          </div>
        </dl>

        <div v-if="selectedInvoice.terms">
          <p class="text-ui-small text-ui-ink font-medium mb-1">{{ $t('reports.terms') }}</p>
          <p class="text-ui-cap text-ui-muted whitespace-pre-line">{{ selectedInvoice.terms }}</p>
        </div>
      </div>
    </UiModal>

    <!-- PPh 23 Receipt Detail Modal -->
    <UiModal
      :open="showReceiptDetail && !!selectedReceipt"
      :title="selectedReceipt?.receipt_number || ''"
      :description="$t('reports.receiptDetail')"
      @close="closeReceiptDetail"
    >
      <div v-if="selectedReceipt" class="space-y-4">
        <dl class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t("common.labels.date") }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ formatDate(selectedReceipt.date) }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.columns.invoiceNo') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedReceipt.invoice?.invoice_number ?? "-" }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.receivedFrom') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedReceipt.invoice?.client_name ?? selectedReceipt.received_from }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">{{ $t('reports.recipient') }}</dt>
            <dd class="text-ui-small text-ui-ink font-medium">{{ selectedReceipt.recipient_name ?? "-" }}</dd>
          </div>
        </dl>

        <div v-if="selectedReceipt.for_payment_of">
          <p class="text-ui-small text-ui-ink font-medium mb-1">{{ $t('reports.forPaymentOf') }}</p>
          <p class="text-ui-cap text-ui-muted whitespace-pre-line">{{ selectedReceipt.for_payment_of }}</p>
        </div>

        <div class="bg-ui-subtle rounded-ui-control p-4 text-ui-small text-ui-text space-y-1">
          <div class="flex justify-between gap-3">
            <span>{{ $t('reports.columns.grossAmount') }}</span><span class="tabular-nums">{{ formatCurrency(Number(selectedReceipt.amount) + Number(selectedReceipt.pph23_amount)) }}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span>{{ $t('reports.columns.pph23Withheld') }} ({{ Number(selectedReceipt.pph23_percent) }}%)</span><span class="tabular-nums">{{ formatCurrency(selectedReceipt.pph23_amount) }}</span>
          </div>
          <div class="flex justify-between gap-3 font-semibold text-ui-ink pt-1.5 mt-1 border-t border-ui-line">
            <span>{{ $t('reports.columns.netReceived') }}</span><span class="tabular-nums">{{ formatCurrency(selectedReceipt.amount) }}</span>
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
    <UiModal v-model:open="showDeleteRangeModal" :title="$t('reports.delete.byRange')" size="sm" @close="closeDeleteRangeModal">
      <div class="space-y-4">
        <UiAlert tone="bad">
          {{ $t('reports.delete.rangeWarning') }}
        </UiAlert>
        <div class="grid grid-cols-2 gap-3">
          <UiInput v-model="deleteRangeStart" type="date" :label="$t('common.labels.startDate')" />
          <UiInput v-model="deleteRangeEnd" type="date" :label="$t('common.labels.endDate')" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="closeDeleteRangeModal">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton variant="destructive" :loading="deletingRange" :disabled="!deleteRangeStart || !deleteRangeEnd" @click="handleDeleteRange">
          {{ deletingRange ? $t("common.actions.deleting") : $t('reports.delete.range') }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
