// Main menu as data, shared by the desktop sidebar and the phone "More"
// sheet so both always list the same links with the same permission and
// active rules. Labels come from the nav.* locale namespace.
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  LayoutDashboard,
  ClipboardCheck,
  UsersIcon,
  UsersRound,
  Contact,
  SettingsIcon,
  Handshake,
  ClockIcon,
  CircleUserRound,
  CalendarDays,
  CalendarCheck,
  Wallet,
  Banknote,
  FolderClosedIcon,
  FolderKanban,
  KeyRoundIcon,
  Key as KeyIcon,
  Building2Icon,
  CircleDollarSign,
  FileStack,
  ListChecksIcon,
  BarChart3,
  History as HistoryIcon,
  HardDrive,
  Workflow,
  Megaphone as MegaphoneIcon,
  Laptop as LaptopIcon,
  CalculatorIcon,
  Landmark,
  LineChart,
  RefreshCw,
  Wrench,
  ClipboardList,
} from "lucide-vue-next";
import { can, canOneOf } from "@/helpers/permissionHelper";
import { useLicenseManagerStore } from "@/stores/licenseManager";

export function useNavMenu() {
  const { t } = useI18n();

  // A section header only renders when at least one item inside it is
  // visible to the current user's permissions - otherwise it's a dangling
  // label with nothing underneath it.
  const showMyWorkspace = computed(() =>
    canOneOf([
      "profile-menu",
      "team-view",
      "task-list",
      "attendance-menu",
      "project-menu",
      "screening-menu",
      "subscription-menu",
      "maintenance-menu",
      "server-storage-menu",
      "staff-task-menu",
    ])
  );

  const showPeople = computed(() =>
    canOneOf([
      "employee-menu",
      "team-menu",
      "clients-menu",
      "purchase-order-menu",
      "invoice-menu",
      "payment-receipt-menu",
      "letter-menu",
      "certificate-menu",
      "document-letter-menu",
      "meeting-note-menu",
    ])
  );

  const showFinance = computed(() =>
    canOneOf([
      "company-finance-menu",
      "company-cash-book-menu",
      "report-menu",
      "payroll-menu",
    ])
  );

  const showTools = computed(() => canOneOf(["project-calculator-menu", "flowchart-menu"]));

  const showCompany = computed(() =>
    canOneOf(["company-about-menu", "asset-menu", "files-company-menu", "credential-account-list", "announcement-menu"])
  );

  // License Manager: Overview, then one entry per active product (loaded
  // from the API). Products are managed on the overview.
  // Versions (release history) has its own module, license-release-*.
  const showLicenseManager = computed(() => canOneOf(["license-manager-menu", "license-release-menu"]));
  const canListLicenses = computed(() => can("license-manager-list"));
  const canSeeVersions = computed(() => can("license-release-menu"));
  const route = useRoute();
  const licenseStore = useLicenseManagerStore();
  const licenseProducts = computed(() => licenseStore.activeProducts);
  watch(
    showLicenseManager,
    (show) => {
      if (show) licenseStore.fetchProducts().catch(() => {});
    },
    { immediate: true }
  );
  const isLicenseProductRoute = (code) =>
    route.name?.startsWith("admin.license-manager.licenses") && route.params.product === code;
  const isLicenseVersionsRoute = (code) =>
    route.name === "admin.license-manager.versions" && route.params.product === code;

  const showInsights = computed(() => canOneOf(["analytics-menu", "history-menu"]));

  // ---------------------------------------------------------------------------
  // Menu (redesign): the same links, permissions and active rules as before,
  // as data. `show` is evaluated against the current user's permissions;
  // `active` against the current route.
  // ---------------------------------------------------------------------------
  const startsWith = (...prefixes) => () => prefixes.some((p) => route.name?.startsWith(p));
  const isRoute = (name) => () => route.name === name;

  const SECTIONS = computed(() => [
    {
      key: "overview",
      title: t("nav.sections.general"),
      show: true,
      items: [
        { label: t("nav.menu.dashboard"), icon: LayoutDashboard, to: { name: "admin.dashboard" }, show: true, active: isRoute("admin.dashboard") },
        { label: t("nav.menu.clock"), icon: ClockIcon, to: { name: "employee.attendance.clock" }, show: can("attendance-check-in") || can("attendance-check-out"), active: isRoute("employee.attendance.clock") },
        { label: t("nav.menu.myAttendance"), icon: CalendarCheck, to: { name: "employee.attendance.my-attendances" }, show: can("attendance-my-attendances"), active: isRoute("employee.attendance.my-attendances") },
        { label: t("nav.menu.myPayslips"), icon: Wallet, to: { name: "employee.payslips" }, show: can("payslip-view"), active: startsWith("employee.payslips") },
      ],
    },
    {
      key: "myWorkspace",
      title: t("nav.sections.myWorkspace"),
      show: showMyWorkspace.value,
      items: [
        { label: t("nav.menu.myProfile"), icon: CircleUserRound, to: { name: "employee.profile" }, show: can("profile-menu"), active: isRoute("employee.profile") },
        { label: t("nav.menu.myTeam"), icon: Contact, to: { name: "employee.team" }, show: can("team-view"), active: isRoute("employee.team") },
        { label: t("nav.menu.myTasks"), icon: ListChecksIcon, to: { name: "employee.tasks" }, show: can("task-list"), active: startsWith("employee.tasks") },
        { label: t("nav.menu.staffTasks"), icon: ClipboardList, to: { name: "admin.staff-tasks.dashboard" }, show: can("staff-task-menu"), active: startsWith("admin.staff-tasks") },
        { label: t("nav.menu.clientScreening"), icon: ClipboardCheck, to: { name: "admin.screening.dashboard" }, show: can("screening-menu"), active: startsWith("admin.screening") },
        { label: t("nav.menu.projects"), icon: FolderKanban, to: { name: "admin.projects" }, show: can("project-menu"), active: startsWith("admin.projects") },
        { label: t("nav.menu.subscriptions"), icon: RefreshCw, to: { name: "admin.subscriptions.dashboard" }, show: can("subscription-menu"), active: startsWith("admin.subscriptions") },
        { label: t("nav.menu.maintenance"), icon: Wrench, to: { name: "admin.maintenance.dashboard" }, show: can("maintenance-menu"), active: startsWith("admin.maintenance") },
        { label: t("nav.menu.servers"), icon: HardDrive, to: { name: "admin.server-storage.dashboard" }, show: can("server-storage-menu"), active: startsWith("admin.server-storage") },
        { label: t("nav.menu.attendanceSummary"), icon: CalendarDays, to: { name: "admin.attendances" }, show: can("attendance-menu"), active: isRoute("admin.attendances") },
      ],
    },
    {
      key: "people",
      title: t("nav.sections.administration"),
      show: showPeople.value,
      items: [
        { label: t("nav.menu.employees"), icon: UsersIcon, to: { name: "admin.employees" }, show: can("employee-menu"), active: startsWith("admin.employee") },
        { label: t("nav.menu.teams"), icon: UsersRound, to: { name: "admin.teams" }, show: can("team-menu"), active: startsWith("admin.team") },
        { label: t("nav.menu.clients"), icon: Handshake, to: { name: "admin.clients.dashboard" }, show: can("clients-menu"), active: startsWith("admin.clients") },
        {
          label: t("nav.menu.documents"),
          icon: FileStack,
          to: { name: "admin.documents.dashboard" },
          show: canOneOf(["purchase-order-menu", "invoice-menu", "payment-receipt-menu", "letter-menu", "certificate-menu", "document-letter-menu", "meeting-note-menu", "proposal-menu"]),
          active: startsWith("admin.documents", "admin.purchase-orders", "admin.invoices", "admin.payment-receipts", "admin.letters", "admin.certificates", "admin.official-memos", "admin.meeting-notes", "admin.proposals"),
        },
      ],
    },
    {
      key: "finance",
      title: t("nav.sections.finance"),
      show: showFinance.value,
      items: [
        { label: t("nav.menu.operationalCost"), icon: CircleDollarSign, to: { name: "admin.company-finance.dashboard" }, show: can("company-finance-menu"), active: startsWith("admin.company-finance") },
        { label: t("nav.menu.cashBook"), icon: Landmark, to: { name: "admin.company-cash-book.dashboard" }, show: can("company-cash-book-menu"), active: startsWith("admin.company-cash-book") },
        { label: t("nav.menu.payroll"), icon: Banknote, to: { name: "admin.payroll.dashboard" }, show: can("payroll-menu"), active: startsWith("admin.payroll") },
        { label: t("nav.menu.reporting"), icon: BarChart3, to: { name: "admin.report.dashboard" }, show: can("report-menu"), active: startsWith("admin.report") },
      ],
    },
    {
      key: "tools",
      title: t("nav.sections.tools"),
      show: showTools.value,
      items: [
        { label: t("nav.menu.projectCalculator"), icon: CalculatorIcon, to: { name: "admin.project-calculator.dashboard" }, show: can("project-calculator-menu"), active: startsWith("admin.project-calculator") },
        { label: t("nav.menu.flowchart"), icon: Workflow, to: { name: "admin.flowchart.dashboard" }, show: can("flowchart-menu"), active: startsWith("admin.flowchart") },
      ],
    },
    {
      key: "company",
      title: t("nav.sections.company"),
      show: showCompany.value,
      items: [
        { label: t("nav.menu.companyAbout"), icon: Building2Icon, to: { name: "admin.company-about.dashboard" }, show: can("company-about-menu"), active: startsWith("admin.company-about") },
        { label: t("nav.menu.assets"), icon: LaptopIcon, to: { name: "admin.assets.dashboard" }, show: can("asset-menu"), active: startsWith("admin.assets") },
        { label: t("nav.menu.documentFiles"), icon: FolderClosedIcon, to: { name: "admin.files-company.dashboard" }, show: can("files-company-menu"), active: startsWith("admin.files-company") },
        { label: t("nav.menu.credential"), icon: KeyRoundIcon, to: { name: "admin.account-password.dashboard" }, show: can("credential-account-list"), active: startsWith("admin.account-password") },
        { label: t("nav.menu.announcements"), icon: MegaphoneIcon, to: { name: "admin.announcements.dashboard" }, show: can("announcement-menu"), active: startsWith("admin.announcements") },
      ],
    },
    // License Manager (products come from the API) renders after Company.
    {
      key: "insights",
      title: t("nav.sections.insights"),
      show: showInsights.value,
      items: [
        { label: t("nav.menu.analytics"), icon: LineChart, to: { name: "admin.analytics.dashboard" }, show: can("analytics-menu"), active: startsWith("admin.analytics") },
        { label: t("nav.menu.history"), icon: HistoryIcon, to: { name: "admin.history.dashboard" }, show: can("history-menu"), active: startsWith("admin.history") },
      ],
    },
  ]);

  const settingsActive = startsWith("admin.settings");

  return {
    SECTIONS,
    showLicenseManager,
    canListLicenses,
    canSeeVersions,
    licenseProducts,
    isLicenseProductRoute,
    isLicenseVersionsRoute,
    settingsActive,
    route,
  };
}
