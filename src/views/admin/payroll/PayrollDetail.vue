<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePayrollStore } from "@/stores/payroll";
import { useLookupStore } from "@/stores/lookups";
import { useToastStore } from "@/stores/toast";
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
  Loader2,
} from "lucide-vue-next";
import { debounce } from "lodash-es";
import Pagination from "@/components/admin/payroll/Pagination.vue";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { can, hasAnyRole } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { useListState } from "@/composables/useListState";
import { usePolling } from "@/composables/usePolling";
import { invalidate } from "@/composables/useStaleFetch";
import { UiAlert, UiBadge, UiButton, UiInput, UiModal, UiPageHeader, UiSelect, UiStat, UiTable } from "@/components/ui";
import Avatar from "@/components/common/Avatar.vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const payrollStore = usePayrollStore();
const lookups = useLookupStore();
const toast = useToastStore();
const alertModal = useAlertModalStore();

const payroll = ref(null);
const payrollStatistics = ref(null);
const employees = ref([]);
const positions = ref([]);

// Search, position filter, page and page size in the URL (per payroll, so
// not remembered across periods).
const list = useListState("payroll-detail", { q: "", position: "", page: 1, per: 50 }, { remember: false });
const searchInput = ref(list.q);
const pushSearch = debounce((v) => { list.q = v.trim(); }, 300);
watch(searchInput, (v) => pushSearch(v));
watch(() => list.q, (v) => { if (v !== searchInput.value.trim()) searchInput.value = v; });

const pagination = ref({
  current_page: list.page,
  per_page: list.per,
  total: 0,
  last_page: 1,
  from: 0,
  to: 0,
});
const loading = ref(true);
const loadingStatistics = ref(true);
const loadingDetails = ref(false);
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

// The dashboard's cached list/statistics are stale after a change here; its
// next visit refreshes them quietly.
const invalidateDashboard = () => {
  invalidate("payroll-list");
  invalidate("payroll-stats");
};

// `quiet` refreshes keep what's on screen (no skeleton).
const fetchPayrollSummary = async ({ quiet = false } = {}) => {
  try {
    if (!quiet) loading.value = true;
    payroll.value = await payrollStore.fetchPayroll(route.params.id);
  } catch (error) {
    console.error("Error fetching payroll summary:", error);
  } finally {
    loading.value = false;
  }
};

const fetchPayrollStatistics = async ({ quiet = false } = {}) => {
  try {
    if (!quiet) loadingStatistics.value = true;
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

// API detail -> table row. Working days and the paid status come from the
// statistics / summary (see `rows`), so all mount requests can run at once.
// `prev` fills what an update response leaves out (it doesn't load the
// employee's bank information).
const toRow = (detail, prev = {}) => {
  const emp = detail.employee || {};
  const bank = emp.bank_information;
  return {
    ...prev,
    detail_id: detail.id,
    id: emp.id ?? prev.id,
    name: emp.user?.name || prev.name || "N/A",
    employee_id: emp.code || emp.id || prev.employee_id,
    position: emp.job_information?.job_title || prev.position || "N/A",
    department: emp.job_information?.team?.name || prev.department || "N/A",
    profile_photo: emp.user ? emp.user.profile_photo || null : prev.profile_photo ?? null,
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
    notes: detail.notes,
    payment_mode: detail.payment_mode || "manual",
    source_project_id: detail.source_project_id,
    project_percentage: detail.project_percentage,
    source_project: detail.source_project ?? prev.source_project,
    bank_name: bank ? bank.bank_name || "N/A" : prev.bank_name || "N/A",
    account_number: bank ? bank.account_number || "N/A" : prev.account_number || "N/A",
    account_holder_name: bank ? bank.account_holder_name || "N/A" : prev.account_holder_name || "N/A",
  };
};

let detailsRequest = 0;
const fetchPayrollDetails = async ({ quiet = false } = {}) => {
  const id = ++detailsRequest;
  try {
    if (!quiet) loadingDetails.value = true;

    // Build filter params
    const filterParams = {};
    if (list.q) {
      filterParams.search = list.q;
    }
    if (list.position) {
      filterParams.position = list.position;
    }

    const response = await payrollStore.fetchPayrollDetails(
      route.params.id,
      list.page,
      list.per,
      filterParams
    );
    // A newer search/page answered first: ignore this one.
    if (id !== detailsRequest) return;

    employees.value = response.data?.map((detail) => toRow(detail)) || [];

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
    if (id === detailsRequest) loadingDetails.value = false;
  }
};

const handlePageChange = (page) => {
  list.page = page;
};

const handlePerPageChange = (perPage) => {
  list.per = perPage; // a change other than page resets page to 1
};

// The four requests are independent: start them together.
onMounted(() => {
  Promise.all([fetchPayrollSummary(), fetchPayrollStatistics(), fetchPayrollDetails(), fetchPositions()]);
});

// Search (debounced above), position filter, page or page size changed.
watch(
  () => [list.q, list.position, list.page, list.per],
  () => fetchPayrollDetails()
);

// Working days and the paid status are per payroll, not per row.
const filteredEmployees = computed(() => {
  const workDays = payrollStatistics.value?.working_days || 0;
  const status = payroll.value?.status === "paid" ? "paid" : "pending";
  return employees.value.map((e) => ({ ...e, total_work_days: workDays, status }));
});

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

// ---- Queued (re)generation: refresh quietly until it's done ---------------
const generating = computed(() => payrollStore.isGenerating(payroll.value));

const onGenerationDone = async () => {
  const label = isThr.value ? "THR" : t("payroll.common.payroll");
  toast.success(t("payroll.generation.doneTitle", { label }), t("payroll.generation.doneMessage", { period: formatPeriod(payroll.value?.period || payroll.value?.salary_month) }));
  invalidateDashboard();
  // Every employee row was replaced: reload them behind what's shown.
  await Promise.all([fetchPayrollStatistics({ quiet: true }), fetchPayrollDetails({ quiet: true }), fetchPositions()]);
};

let polling = false;
const pollTick = async () => {
  if (polling || !payroll.value) return;
  polling = true;
  try {
    const mine = (g) => String(g.id) === String(payroll.value.id);
    if (payrollStore.pendingGenerations.some(mine)) {
      const { finished } = await payrollStore.checkGenerations();
      const done = finished.find(mine);
      if (done) {
        payroll.value = { ...payroll.value, ...done.payroll };
        await onGenerationDone();
      }
    } else if (payroll.value.status === "processing") {
      await fetchPayrollSummary({ quiet: true });
      if (payroll.value?.status !== "processing") await onGenerationDone();
    }
  } finally {
    polling = false;
  }
};
const poller = usePolling(pollTick, 5000);
onMounted(() => {
  if (!generating.value) poller.pause();
});
watch(generating, (on) => (on ? poller.resume() : poller.pause()));

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
    `${t("payroll.detail.attendanceDeduction")}: ${formatRupiah(Math.max(0, attendanceDeduction))}`,
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
    await alertModal.alert(t("payroll.detail.exportFailed"), { type: "danger" });
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

  // The complete project list (with budget) from the shared lookup cache --
  // not projectStore.projects, which is whatever page the Projects screen
  // last loaded. No request while the cache is fresh.
  if (!lookups.projects.length) loadingProjects.value = true;
  try {
    await lookups.ensure("projects");
  } catch (error) {
    console.error("Error fetching projects:", error);
  } finally {
    loadingProjects.value = false;
  }
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingEmployee.value = null;
};

// Client-side preview only -- the authoritative figure is always
// recomputed server-side from the project's current budget.
const projectPercentagePreview = computed(() => {
  const project = lookups.projects.find((p) => String(p.id) === String(editForm.value.source_project_id));
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
    const detailId = editingEmployee.value.detail_id;
    const updated = await payrollStore.updatePayrollDetail(detailId, payload);
    payrollStore.clearMessages();
    // Patch the row from the response (server-computed figures); only the
    // period totals need the server again.
    const i = employees.value.findIndex((e) => e.detail_id === detailId);
    if (updated && i !== -1) employees.value.splice(i, 1, toRow(updated, employees.value[i]));
    else fetchPayrollDetails({ quiet: true });
    closeEditModal();
    toast.success(t("payroll.detail.updated"));
    invalidateDashboard();
    fetchPayrollStatistics({ quiet: true });
  } catch (error) {
    console.error("Error updating payroll detail:", error);
    await alertModal.alert(
      error?.response?.data?.message || t("payroll.detail.updateFailed"),
      { type: "danger" }
    );
  } finally {
    savingEdit.value = false;
  }
};

const handleMarkAsPaid = async () => {
  try {
    markingAsPaid.value = true;
    const updated = await payrollStore.markAsPaid(route.params.id, {
      payment_date: paymentDate.value,
    });
    payrollStore.clearMessages();

    // The response is the payroll itself: patch it (rows read their status
    // from it) and refresh only the period statistics.
    if (updated) payroll.value = { ...payroll.value, ...updated };
    else fetchPayrollSummary({ quiet: true });
    payrollStore.patchPayroll(route.params.id, { status: "paid", payment_date: updated?.payment_date ?? paymentDate.value });
    invalidateDashboard();
    fetchPayrollStatistics({ quiet: true });

    closeMarkAsPaidModal();
    toast.success(t("payroll.detail.markedPaid"));
  } catch (error) {
    console.error("Error marking payroll as paid:", error);
    await alertModal.alert(t("payroll.detail.markPaidFailed"), { type: "danger" });
  } finally {
    markingAsPaid.value = false;
  }
};

const handleDeleteDetail = async (emp) => {
  const ok = await alertModal.confirm(
    t("payroll.detail.deleteDetailConfirm", { name: emp.name }),
    { type: "danger", confirmText: t("common.actions.delete") }
  );
  if (!ok) return;

  try {
    await payrollStore.deletePayrollDetail(emp.detail_id);
    payrollStore.clearMessages();
    employees.value = employees.value.filter((e) => e.detail_id !== emp.detail_id);
    pagination.value = { ...pagination.value, total: Math.max(0, (pagination.value.total || 0) - 1) };
    invalidateDashboard();
    if (!employees.value.length && list.page > 1) list.page -= 1; // the watcher loads it
    else Promise.all([fetchPayrollDetails({ quiet: true }), fetchPayrollStatistics({ quiet: true })]);
  } catch (error) {
    console.error("Error deleting payroll detail:", error);
    await alertModal.alert(
      error?.response?.data?.message || t("payroll.detail.deleteDetailFailed"),
      { type: "danger" }
    );
  }
};

const handleDeletePayroll = async () => {
  const label = isThr.value ? "THR" : t("payroll.common.payroll");
  const ok = await alertModal.confirm(
    t("payroll.detail.deletePayrollConfirm", { label }),
    { type: "danger", confirmText: t("common.actions.delete") }
  );
  if (!ok) return;

  try {
    await payrollStore.deletePayroll(route.params.id);
    payrollStore.clearMessages();
    payrollStore.payrolls = payrollStore.payrolls.filter((p) => String(p.id) !== String(route.params.id));
    invalidateDashboard();
    toast.success(t("payroll.dashboard.deleted", { label }));
    router.push({ name: "admin.payroll.dashboard" });
  } catch (error) {
    console.error("Error deleting payroll:", error);
    await alertModal.alert(
      error?.response?.data?.message || t("payroll.dashboard.deleteFailed"),
      { type: "danger" }
    );
  }
};

const regenerating = ref(false);

const handleRegenerate = async () => {
  const label = isThr.value ? "THR" : t("payroll.common.payroll");
  const ok = await alertModal.confirm(
    t("payroll.detail.regenerateConfirm", { label }),
    { type: "warning", confirmText: t("payroll.common.regenerate") }
  );
  if (!ok) return;

  const salaryMonth = String(payroll.value.salary_month).slice(0, 7);
  const payload = { salary_month: salaryMonth, regenerate: true };

  try {
    regenerating.value = true;
    if (isThr.value) {
      await payrollStore.generateThrPayroll(payload);
    } else {
      await payrollStore.generatePayroll(payload);
    }
    payrollStore.clearMessages();
    // Queued: this page polls until the run has replaced the details.
    payrollStore.trackGeneration({
      type: payroll.value.type || "monthly",
      month: salaryMonth,
      id: payroll.value.id,
      baseline: payroll.value.updated_at,
    });
    invalidateDashboard();
    toast.info(t("payroll.generation.queuedTitle", { label }), t("payroll.generation.queuedMessage"));
  } catch (error) {
    console.error("Error regenerating payroll:", error);
    await alertModal.alert(
      error?.response?.data?.message || t("payroll.dashboard.regenerateFailed", { label }),
      { type: "danger" }
    );
  } finally {
    regenerating.value = false;
  }
};

// ---- Presentation only -------------------------------------------------
const STATUS_TONES = {
  draft: "neutral",
  pending: "warn",
  processing: "warn",
  approved: "info",
  paid: "ok",
  cancelled: "bad",
};
const statusOf = (status) =>
  STATUS_TONES[status]
    ? { tone: STATUS_TONES[status], label: t(`payroll.status.${status}`) }
    : { tone: "neutral", label: status || t("payroll.status.pending") };

const formatPeriod = (date) =>
  date ? new Date(date).toLocaleDateString(localeTag(), { year: "numeric", month: "long" }) : "";

const pageTitle = computed(() => {
  const period = formatPeriod(payroll.value?.period || payroll.value?.salary_month);
  return `${isThr.value ? "THR" : t("payroll.common.payroll")}${period ? ` · ${period}` : ""}`;
});

const processedOn = computed(() =>
  payroll.value?.created_at
    ? new Date(payroll.value.created_at).toLocaleDateString(localeTag(), { month: "short", day: "numeric" })
    : "-"
);
const processedYear = computed(() =>
  payroll.value?.created_at ? String(new Date(payroll.value.created_at).getFullYear()) : ""
);

const positionOptions = computed(() => [
  { value: "", label: t("payroll.detail.allPositions") },
  ...positions.value.map((p) => ({ value: p, label: p })),
]);

const projectOptions = computed(() => {
  const all = [...lookups.projects];
  // Keep the row's current project selectable even if it's no longer listed.
  const current = editingEmployee.value?.source_project;
  if (current && !all.some((p) => String(p.id) === String(current.id))) all.push(current);
  return all.map((project) => ({
    value: project.id,
    label: `${project.name} — ${formatRupiah(project.budget)}`,
  }));
});

const showActionsColumn = computed(() => canEditPayroll.value || canManagePayroll.value);
const columns = computed(() => [
  { key: "employee", label: t("common.labels.employee") },
  { key: "position", label: t("payroll.detail.columns.position"), class: "hidden 2xl:table-cell" },
  { key: "bank", label: t("payroll.detail.bankAccount") },
  { key: "attendance", label: isThr.value ? t("payroll.detail.monthsOfService") : t("payroll.detail.attendance"), align: "center" },
  { key: "basic_salary", label: isThr.value ? t("payroll.detail.grossThr") : t("payroll.detail.basicSalary"), align: "right" },
  { key: "deductions", label: t("payroll.detail.deductions"), align: "right" },
  { key: "net_salary", label: t("payroll.detail.netSalary"), align: "right" },
  { key: "status", label: t("common.labels.status") },
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
    { label: t("payroll.detail.attendanceDeduction"), value: Math.max(0, attendanceDeduction) },
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
          <ArrowLeft class="w-4 h-4" />{{ $t("common.actions.back") }}
        </button>
      </template>
      <template #subtitle>
        <span class="inline-flex flex-wrap items-center gap-2">
          <UiBadge v-if="payroll && generating" tone="warn">
            <Loader2 class="w-3 h-3 animate-spin" />{{ $t("payroll.status.processing") }}
          </UiBadge>
          <UiBadge v-else-if="payroll" :tone="statusOf(payroll.status).tone" dot>{{ statusOf(payroll.status).label }}</UiBadge>
          <UiBadge v-if="isThr" tone="accent">THR</UiBadge>
          <span>{{ $t('payroll.detail.subtitle') }}</span>
        </span>
      </template>
      <template #actions>
        <UiButton variant="ghost" :icon="showAmounts ? EyeOff : Eye" @click="showAmounts = !showAmounts">
          {{ showAmounts ? $t("common.actions.hideAmounts") : $t("common.actions.showAmounts") }}
        </UiButton>
        <UiButton v-if="canManagePayroll" variant="ghost" :icon="RefreshCw" :loading="regenerating" :disabled="generating" @click="handleRegenerate">
          {{ regenerating ? $t('payroll.detail.regenerating') : $t("payroll.common.regenerate") }}
        </UiButton>
        <UiButton v-if="canManagePayroll" variant="danger" :icon="Trash2" @click="handleDeletePayroll">{{ $t('payroll.detail.deletePayroll') }}</UiButton>
        <UiButton v-if="can('payroll-list')" variant="secondary" :icon="Download" @click="exportExcel">{{ $t("common.actions.exportExcel") }}</UiButton>
        <UiButton
          v-if="can('payroll-process') && payroll?.status !== 'paid'"
          :icon="CheckCircle"
          class="order-first sm:order-none w-full sm:w-auto"
          @click="openMarkAsPaidModal"
        >
          {{ $t('payroll.detail.markAsPaid') }}
        </UiButton>
      </template>
    </UiPageHeader>

    <UiAlert v-if="generating" tone="info" :title="$t('payroll.generation.detailRunningTitle')">
      {{ $t("payroll.generation.detailRunningHint") }}
    </UiAlert>

    <!-- Summary -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
      <UiStat
        :label="$t('payroll.detail.stats.totalEmployees')"
        :icon="Users"
        :loading="loading || loadingStatistics"
        :value="payrollStatistics?.total_employees || 0"
        :hint="$t('payroll.detail.stats.allDepartments')"
      />
      <UiStat
        :label="$t('payroll.detail.stats.totalPayroll')"
        :icon="DollarSign"
        :loading="loading || loadingStatistics"
        :value="maskRupiah(formatRupiahCompact(payrollStatistics?.total_amount || 0))"
        :hint="$t('payroll.detail.stats.thisPeriod')"
      />
      <UiStat
        :label="$t('payroll.dashboard.stats.averageSalary')"
        :icon="Banknote"
        :loading="loading || loadingStatistics"
        :value="maskRupiah(formatRupiahCompact(payrollStatistics?.average_salary || 0))"
        :hint="$t('payroll.dashboard.stats.perEmployee')"
      />
      <UiStat
        :label="$t('payroll.detail.stats.processedOn')"
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
          <h2 class="text-ui-h2 text-ui-ink">{{ $t('payroll.detail.employeeDetails') }}</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">
            {{ $t('payroll.detail.employeesInPeriod', { n: pagination.total || 0 }, pagination.total || 0) }}
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-2">
          <UiInput v-model="searchInput" :icon="Search" :placeholder="$t('payroll.detail.searchEmployees')" class="md:w-[260px]" />
          <UiSelect v-model="list.position" :options="positionOptions" class="md:w-[200px]" :aria-label="$t('payroll.detail.columns.position')" />
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
            :title="$t('payroll.detail.notApplicableHint')"
          >{{ $t("common.duration.na") }}</span>
          <span
            v-else
            class="tabular-nums text-ui-bad whitespace-nowrap cursor-help underline decoration-dotted underline-offset-2"
            :title="showAmounts ? deductionBreakdown(row) : $t('payroll.detail.showAmountsHint')"
          >{{ maskRupiah(formatRupiah(row.deductions)) }}</span>
        </template>
        <template #cell-net_salary="{ row }">
          <span class="block tabular-nums font-semibold text-ui-ink whitespace-nowrap">{{ maskRupiah(formatRupiah(row.net_salary)) }}</span>
          <span v-if="row.payment_mode === 'project_percentage'" class="block text-ui-cap text-ui-accent mt-0.5">
            {{ $t('payroll.detail.percentOfProject', { pct: row.project_percentage, project: row.source_project?.name || $t('payroll.detail.project') }) }}
          </span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="row.status === 'paid' ? 'ok' : 'warn'" dot>{{ row.status === "paid" ? $t("payroll.status.paid") : $t("payroll.status.pending") }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UiButton v-if="canEditPayroll" variant="ghost" size="sm" :icon="Pencil" :title="$t('common.actions.edit')" :aria-label="$t('common.actions.edit')" @click.stop="openEditModal(row)" />
            <UiButton
              v-if="canManagePayroll"
              variant="ghost"
              size="sm"
              :icon="Trash2"
              :title="$t('common.actions.delete')"
              :aria-label="$t('common.actions.delete')"
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
                {{ isThr ? $t('payroll.detail.grossThr') : $t('payroll.detail.basic') }} {{ maskRupiah(formatRupiah(row.basic_salary)) }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-ui-body font-semibold text-ui-ink tabular-nums">{{ maskRupiah(formatRupiah(row.net_salary)) }}</p>
              <UiBadge class="mt-1" :tone="row.status === 'paid' ? 'ok' : 'warn'" dot>{{ row.status === "paid" ? $t("payroll.status.paid") : $t("payroll.status.pending") }}</UiBadge>
            </div>
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center py-4">
            <div class="w-10 h-10 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center mb-3">
              <Users class="w-5 h-5" />
            </div>
            <p class="text-ui-body font-medium text-ui-ink">{{ $t('payroll.detail.empty.title') }}</p>
            <p class="text-ui-small text-ui-muted mt-1">{{ $t('payroll.detail.empty.message') }}</p>
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
            <dt class="text-ui-cap text-ui-muted">{{ $t('payroll.detail.bankAccount') }}</dt>
            <dd class="text-ui-small font-medium text-ui-ink truncate">{{ breakdownEmp.bank_name }}</dd>
            <dd class="text-ui-cap text-ui-muted tabular-nums truncate">{{ breakdownEmp.account_number }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ isThr ? $t('payroll.detail.monthsOfService') : $t('payroll.detail.attendance') }}</dt>
            <dd v-if="isThr" class="text-ui-small font-medium text-ui-ink tabular-nums">{{ breakdownEmp.months_of_service ?? "-" }}/12</dd>
            <dd v-else class="text-ui-small font-medium tabular-nums">
              <span :class="attendanceTone(breakdownEmp)">{{ getAttendancePercentage(breakdownEmp.attended_days, breakdownEmp.total_work_days) }}%</span>
              <span class="text-ui-cap text-ui-muted"> ({{ breakdownEmp.attended_days }}/{{ breakdownEmp.total_work_days }})</span>
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t("common.labels.status") }}</dt>
            <dd class="mt-0.5">
              <UiBadge :tone="breakdownEmp.status === 'paid' ? 'ok' : 'warn'" dot>{{ breakdownEmp.status === "paid" ? $t("payroll.status.paid") : $t("payroll.status.pending") }}</UiBadge>
            </dd>
          </div>
          <div v-if="breakdownEmp.payment_mode === 'project_percentage'" class="min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t('payroll.detail.paymentMode') }}</dt>
            <dd class="text-ui-small font-medium text-ui-ink">
              {{ $t('payroll.detail.percentOfProject', { pct: breakdownEmp.project_percentage, project: breakdownEmp.source_project?.name || $t('payroll.detail.project') }) }}
            </dd>
          </div>
        </dl>

        <section>
          <h3 class="text-ui-over uppercase text-ui-muted pb-1">{{ $t('payroll.detail.earnings') }}</h3>
          <div class="divide-y divide-ui-line">
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-ui-small text-ui-muted">{{ isThr ? $t('payroll.detail.grossThr') : $t('payroll.detail.basicSalary') }}</span>
              <span class="text-ui-small text-ui-ink tabular-nums text-right">{{ maskRupiah(formatRupiah(breakdownEmp.basic_salary)) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-ui-small font-semibold text-ui-ink">{{ $t('payroll.detail.grossSalary') }}</span>
              <span class="text-ui-small font-semibold text-ui-ink tabular-nums text-right">{{ maskRupiah(formatRupiah(breakdownEmp.gross_salary)) }}</span>
            </div>
          </div>
        </section>

        <section>
          <h3 class="text-ui-over uppercase text-ui-muted pb-1">{{ $t('payroll.detail.deductions') }}</h3>
          <p v-if="breakdownEmp.payment_mode === 'project_percentage'" class="text-ui-small text-ui-muted py-2.5">
            {{ $t('payroll.detail.notApplicableHint') }}
          </p>
          <div v-else class="divide-y divide-ui-line">
            <div v-for="line in breakdownDeductions" :key="line.label" class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-ui-small text-ui-muted">{{ line.label }}</span>
              <span class="text-ui-small text-ui-bad tabular-nums text-right">{{ maskRupiah(formatRupiah(line.value)) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <span class="text-ui-small font-semibold text-ui-ink">{{ $t('payroll.detail.totalDeductions') }}</span>
              <span class="text-ui-small font-semibold text-ui-bad tabular-nums text-right">{{ maskRupiah(formatRupiah(breakdownEmp.deductions)) }}</span>
            </div>
          </div>
        </section>

        <div class="flex items-center justify-between gap-4 bg-ui-ink text-white rounded-ui-card px-5 py-4">
          <p class="text-ui-small text-white/70">{{ $t('payroll.detail.netTakeHome') }}</p>
          <p class="text-ui-h1 tabular-nums text-right">{{ maskRupiah(formatRupiah(breakdownEmp.net_salary)) }}</p>
        </div>

        <div v-if="breakdownEmp.notes" class="bg-ui-subtle rounded-ui-card px-4 py-3">
          <p class="text-ui-small font-medium text-ui-ink mb-1">{{ $t('payroll.detail.notesLabel') }}</p>
          <p class="text-ui-small text-ui-text">{{ breakdownEmp.notes }}</p>
        </div>
      </div>
      <template v-if="breakdownEmp && showActionsColumn" #footer>
        <UiButton v-if="canManagePayroll" variant="danger" :icon="Trash2" class="mr-auto" @click="deleteFromBreakdown(breakdownEmp)">{{ $t("common.actions.delete") }}</UiButton>
        <UiButton v-if="canEditPayroll" :icon="Pencil" @click="editFromBreakdown(breakdownEmp)">{{ $t("common.actions.edit") }}</UiButton>
      </template>
    </UiModal>

    <!-- Mark as Paid -->
    <UiModal
      v-model:open="showMarkAsPaidModal"
      :title="$t('payroll.detail.markPaid.title')"
      size="sm"
      :persistent="markingAsPaid"
      @close="closeMarkAsPaidModal"
    >
      <p class="text-ui-small text-ui-muted mb-4">
        {{ $t('payroll.detail.markPaid.message') }}
      </p>
      <UiInput v-model="paymentDate" type="date" :label="$t('payroll.detail.markPaid.paymentDate')" required />
      <template #footer>
        <UiButton variant="secondary" :disabled="markingAsPaid" @click="closeMarkAsPaidModal">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton :icon="CheckCircle" :loading="markingAsPaid" @click="handleMarkAsPaid">
          {{ markingAsPaid ? $t('payroll.detail.markPaid.processing') : $t('payroll.detail.markPaid.confirm') }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Edit Payroll Detail -->
    <UiModal
      v-model:open="showEditModal"
      :title="$t('payroll.detail.edit.title', { name: editingEmployee?.name || '' })"
      :description="$t('payroll.detail.edit.description')"
      :persistent="savingEdit"
      @close="closeEditModal"
    >
      <div class="space-y-4">
        <fieldset>
          <legend :class="labelClass">{{ $t('payroll.detail.paymentMode') }}</legend>
          <div class="grid grid-cols-2 gap-1 p-1 bg-ui-subtle rounded-ui-control" role="radiogroup">
            <button
              v-for="mode in [
                { value: 'manual', label: $t('payroll.detail.edit.fixedAmount') },
                { value: 'project_percentage', label: $t('payroll.detail.edit.percentOfProject') },
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
              <label for="pd-final" :class="labelClass">{{ $t('payroll.detail.edit.finalSalary') }}</label>
              <input id="pd-final" type="number" min="0" v-model.number="editForm.final_salary" :class="fieldClass" />
            </div>
            <div>
              <label for="pd-gross" :class="labelClass">{{ $t('payroll.detail.grossSalary') }}</label>
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
              <label for="pd-total-ded" :class="labelClass">{{ $t('payroll.detail.edit.totalDeduction') }}</label>
              <input id="pd-total-ded" type="number" min="0" v-model.number="editForm.total_deduction" :class="fieldClass" />
            </div>
          </div>
        </template>

        <template v-else>
          <UiSelect
            v-model="editForm.source_project_id"
            :label="$t('common.labels.project')"
            :options="projectOptions"
            :placeholder="loadingProjects ? $t('payroll.detail.edit.loadingProjects') : $t('payroll.detail.edit.selectProject')"
          />
          <div>
            <label for="pd-pct" :class="labelClass">{{ $t('payroll.detail.edit.percentage') }}</label>
            <input id="pd-pct" type="number" min="0" max="100" step="0.1" v-model.number="editForm.project_percentage" :class="fieldClass" />
          </div>
          <UiAlert tone="info" :title="$t('payroll.detail.edit.estimated', { amount: formatRupiah(projectPercentagePreview) })">
            {{ $t('payroll.detail.edit.recalculated') }}
          </UiAlert>
        </template>

        <UiInput v-model="editForm.notes" :label="$t('common.labels.notes')" :rows="2" :placeholder="$t('payroll.detail.edit.notesPlaceholder')" />
      </div>

      <template #footer>
        <UiButton variant="secondary" :disabled="savingEdit" @click="closeEditModal">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton :loading="savingEdit" @click="handleSaveEdit">{{ savingEdit ? $t("common.actions.saving") : $t("common.actions.saveChanges") }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>
