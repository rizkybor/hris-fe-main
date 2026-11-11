<script setup>
import { APP_VERSION_SHORT } from "@/utils/appVersion";
import { computed, ref, watch } from "vue";
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
  XIcon,
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
  PanelLeftClose,
  PanelLeftOpen,
  CalculatorIcon,
  Landmark,
  LineChart,
  RefreshCw,
  Wrench,
  ChevronDown,
  ClipboardList,
} from "lucide-vue-next";

import { can, canOneOf } from "@/helpers/permissionHelper";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import { RouterLink, useRoute } from "vue-router";

const props = defineProps(["isOpen"]);
const emit = defineEmits(["navigate"]);

const onNavigate = () => emit("navigate");

// Desktop-only icon-rail collapse. Mobile always shows the full sidebar as
// a drawer, so this is deliberately not wired into the isOpen prop.
const collapsed = ref(localStorage.getItem("sidebar-collapsed") === "true");

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};

watch(collapsed, (value) => {
  localStorage.setItem("sidebar-collapsed", String(value));
});

// Collapsed nav-links lose their visible label, so a floating tooltip
// (teleported to <body> to escape the scrollable nav's clipping) shows it
// on hover instead. Derived from each link's own .nav-label text so no
// per-item label has to be duplicated here.
const tooltipText = ref("");
const tooltipStyle = ref({});

const showTooltip = (event) => {
  if (!collapsed.value || window.innerWidth < 1024) return;
  const label = event.currentTarget.querySelector(".nav-label")?.textContent?.trim();
  if (!label) return;

  const rect = event.currentTarget.getBoundingClientRect();
  tooltipText.value = label;
  tooltipStyle.value = {
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.right + 12}px`,
  };
};

const hideTooltip = () => {
  tooltipText.value = "";
};

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

// Each nav section can be individually collapsed via its title. State is
// keyed by section id and persisted so a user's preference survives reloads;
// a section defaults to expanded when its key is absent from storage.
const SECTION_KEYS = ["overview", "myWorkspace", "people", "company", "licenseManager", "finance", "tools", "insights"];

// First login (nothing in storage yet) shows only General expanded, every
// other section starts collapsed -- a returning user's own choice (once
// they've toggled anything) always wins over this default.
const defaultCollapsed = (key) => key !== "overview";

const loadCollapsedSections = () => {
  try {
    const raw = JSON.parse(localStorage.getItem("sidebar-collapsed-sections") || "{}");
    return SECTION_KEYS.reduce((acc, key) => {
      acc[key] = key in raw ? !!raw[key] : defaultCollapsed(key);
      return acc;
    }, {});
  } catch {
    return SECTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: defaultCollapsed(key) }), {});
  }
};

const collapsedSections = ref(loadCollapsedSections());

const toggleSection = (key) => {
  collapsedSections.value = { ...collapsedSections.value, [key]: !collapsedSections.value[key] };
};

watch(
  collapsedSections,
  (value) => {
    localStorage.setItem("sidebar-collapsed-sections", JSON.stringify(value));
  },
  { deep: true }
);

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
    title: "General",
    show: true,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: { name: "admin.dashboard" }, show: true, active: isRoute("admin.dashboard") },
      { label: "Clock In/Out", icon: ClockIcon, to: { name: "employee.attendance.clock" }, show: can("attendance-check-in") || can("attendance-check-out"), active: isRoute("employee.attendance.clock") },
      { label: "My Attendance", icon: CalendarCheck, to: { name: "employee.attendance.my-attendances" }, show: can("attendance-my-attendances"), active: isRoute("employee.attendance.my-attendances") },
      { label: "My Payslips", icon: Wallet, to: { name: "employee.payslips" }, show: can("payslip-view"), active: startsWith("employee.payslips") },
    ],
  },
  {
    key: "myWorkspace",
    title: "My Workspace",
    show: showMyWorkspace.value,
    items: [
      { label: "My Profile", icon: CircleUserRound, to: { name: "employee.profile" }, show: can("profile-menu"), active: isRoute("employee.profile") },
      { label: "My Team", icon: Contact, to: { name: "employee.team" }, show: can("team-view"), active: isRoute("employee.team") },
      { label: "My Tasks", icon: ListChecksIcon, to: { name: "employee.tasks" }, show: can("task-list"), active: startsWith("employee.tasks") },
      { label: "Staff Tasks", icon: ClipboardList, to: { name: "admin.staff-tasks.dashboard" }, show: can("staff-task-menu"), active: startsWith("admin.staff-tasks") },
      { label: "Client Screening", icon: ClipboardCheck, to: { name: "admin.screening.dashboard" }, show: can("screening-menu"), active: startsWith("admin.screening") },
      { label: "Project Lists", icon: FolderKanban, to: { name: "admin.projects" }, show: can("project-menu"), active: startsWith("admin.projects") },
      { label: "Subscription Lists", icon: RefreshCw, to: { name: "admin.subscriptions.dashboard" }, show: can("subscription-menu"), active: startsWith("admin.subscriptions") },
      { label: "Maintenance Lists", icon: Wrench, to: { name: "admin.maintenance.dashboard" }, show: can("maintenance-menu"), active: startsWith("admin.maintenance") },
      { label: "Server Lists", icon: HardDrive, to: { name: "admin.server-storage.dashboard" }, show: can("server-storage-menu"), active: startsWith("admin.server-storage") },
      { label: "Attendance Summary", icon: CalendarDays, to: { name: "admin.attendances" }, show: can("attendance-menu"), active: isRoute("admin.attendances") },
    ],
  },
  {
    key: "people",
    title: "Administration",
    show: showPeople.value,
    items: [
      { label: "Employees", icon: UsersIcon, to: { name: "admin.employees" }, show: can("employee-menu"), active: startsWith("admin.employee") },
      { label: "Our Teams", icon: UsersRound, to: { name: "admin.teams" }, show: can("team-menu"), active: startsWith("admin.team") },
      { label: "Our Clients", icon: Handshake, to: { name: "admin.clients.dashboard" }, show: can("clients-menu"), active: startsWith("admin.clients") },
      {
        label: "Business Documents",
        icon: FileStack,
        to: { name: "admin.documents.dashboard" },
        show: canOneOf(["purchase-order-menu", "invoice-menu", "payment-receipt-menu", "letter-menu", "certificate-menu", "document-letter-menu", "meeting-note-menu", "proposal-menu"]),
        active: startsWith("admin.documents", "admin.purchase-orders", "admin.invoices", "admin.payment-receipts", "admin.letters", "admin.certificates", "admin.official-memos", "admin.meeting-notes", "admin.proposals"),
      },
    ],
  },
  {
    key: "finance",
    title: "Finance",
    show: showFinance.value,
    items: [
      { label: "Operational Cost", icon: CircleDollarSign, to: { name: "admin.company-finance.dashboard" }, show: can("company-finance-menu"), active: startsWith("admin.company-finance") },
      { label: "Company Cash Book", icon: Landmark, to: { name: "admin.company-cash-book.dashboard" }, show: can("company-cash-book-menu"), active: startsWith("admin.company-cash-book") },
      { label: "Payroll", icon: Banknote, to: { name: "admin.payroll.dashboard" }, show: can("payroll-menu"), active: startsWith("admin.payroll") },
      { label: "Reporting", icon: BarChart3, to: { name: "admin.report.dashboard" }, show: can("report-menu"), active: startsWith("admin.report") },
    ],
  },
  {
    key: "tools",
    title: "Tools",
    show: showTools.value,
    items: [
      { label: "Project Calculator", icon: CalculatorIcon, to: { name: "admin.project-calculator.dashboard" }, show: can("project-calculator-menu"), active: startsWith("admin.project-calculator") },
      { label: "Flowchart Maker", icon: Workflow, to: { name: "admin.flowchart.dashboard" }, show: can("flowchart-menu"), active: startsWith("admin.flowchart") },
    ],
  },
  {
    key: "company",
    title: "Company",
    show: showCompany.value,
    items: [
      { label: "Company About", icon: Building2Icon, to: { name: "admin.company-about.dashboard" }, show: can("company-about-menu"), active: startsWith("admin.company-about") },
      { label: "Assets", icon: LaptopIcon, to: { name: "admin.assets.dashboard" }, show: can("asset-menu"), active: startsWith("admin.assets") },
      { label: "Document Files", icon: FolderClosedIcon, to: { name: "admin.files-company.dashboard" }, show: can("files-company-menu"), active: startsWith("admin.files-company") },
      { label: "Credential", icon: KeyRoundIcon, to: { name: "admin.account-password.dashboard" }, show: can("credential-account-list"), active: startsWith("admin.account-password") },
      { label: "Announcements", icon: MegaphoneIcon, to: { name: "admin.announcements.dashboard" }, show: can("announcement-menu"), active: startsWith("admin.announcements") },
    ],
  },
  // License Manager (products come from the API) renders after Company.
  {
    key: "insights",
    title: "Insights",
    show: showInsights.value,
    items: [
      { label: "Analytics", icon: LineChart, to: { name: "admin.analytics.dashboard" }, show: can("analytics-menu"), active: startsWith("admin.analytics") },
      { label: "History", icon: HistoryIcon, to: { name: "admin.history.dashboard" }, show: can("history-menu"), active: startsWith("admin.history") },
    ],
  },
]);
const sectionsBeforeLicense = computed(() => SECTIONS.value.filter((s) => s.key !== "insights" && s.show));
const sectionsAfterLicense = computed(() => SECTIONS.value.filter((s) => s.key === "insights" && s.show));
const settingsActive = startsWith("admin.settings");

const itemClass = (active) => [
  "nav-item group flex items-center gap-2.5 h-8 px-2.5 rounded-[7px] text-ui-small border transition-colors duration-ui-fast",
  active
    ? "bg-ui-surface border-ui-line text-ui-ink font-semibold shadow-ui-raised"
    : "border-transparent text-ui-text hover:bg-ui-hover hover:text-ui-ink",
  collapsed.value ? "lg:justify-center lg:px-0 lg:h-9" : "",
];
const iconClass = (active) => ["w-4 h-4 shrink-0", active ? "text-ui-ink" : "text-ui-muted group-hover:text-ui-ink"];
const labelClass = computed(() => ["nav-label truncate", collapsed.value ? "lg:hidden" : ""]);
</script>

<template>
  <!-- Desktop: a quiet panel next to the content (icon rail when collapsed).
       Phones and tablets: a drawer opened from the tab bar's "More". -->
  <aside
    id="sidebar"
    class="fixed lg:relative inset-y-0 left-0 z-50 h-screen flex flex-col bg-ui-bg border-r border-ui-line font-sans transition-[transform,width] duration-ui-slow ease-ui-out w-[280px]"
    :class="[
      props.isOpen ? 'translate-x-0 shadow-ui-overlay lg:shadow-none' : '-translate-x-full',
      'lg:translate-x-0',
      collapsed ? 'lg:w-[72px] is-collapsed' : 'lg:w-[248px]',
    ]"
    :data-collapsed="collapsed"
    aria-label="Main navigation"
  >
    <!-- Brand -->
    <div class="flex items-center gap-2.5 px-3.5 pt-3.5 pb-3" :class="collapsed ? 'lg:flex-col lg:px-2 lg:gap-2' : ''">
      <div class="w-8 h-8 shrink-0 rounded-[9px] bg-ui-surface border border-ui-line flex items-center justify-center">
        <img src="/images/jcd-only-color.png" alt="Jendela Cakra Digital" class="w-6 h-6 object-contain" />
      </div>
      <div class="min-w-0 flex-1" :class="collapsed ? 'lg:hidden' : ''">
        <div class="flex items-center gap-1.5">
          <span class="text-ui-h3 text-ui-ink">HRIS+</span>
          <span class="text-[10.5px] leading-[15px] px-1.5 rounded border border-ui-line text-ui-muted tabular-nums">v{{ APP_VERSION_SHORT }}</span>
        </div>
        <p class="text-ui-cap text-ui-muted truncate">Jendela Cakra Digital</p>
      </div>
      <button
        type="button"
        class="hidden lg:inline-flex w-8 h-8 shrink-0 items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink transition-colors"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleCollapsed"
      >
        <PanelLeftOpen v-if="collapsed" class="w-4 h-4" />
        <PanelLeftClose v-else class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="lg:hidden w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
        aria-label="Close menu"
        @click="onNavigate"
      >
        <XIcon class="w-[18px] h-[18px]" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 space-y-1" :class="collapsed ? 'lg:px-2' : ''">
      <template v-for="section in sectionsBeforeLicense" :key="section.key">
        <div>
          <button
            type="button"
            class="w-full flex items-center justify-between px-2.5 pt-3 pb-1 text-ui-over uppercase text-ui-faint hover:text-ui-muted transition-colors"
            :class="collapsed ? 'lg:hidden' : ''"
            :aria-expanded="!collapsedSections[section.key]"
            @click="toggleSection(section.key)"
          >
            <span>{{ section.title }}</span>
            <ChevronDown class="w-3 h-3 shrink-0 transition-transform duration-ui-fast" :class="{ '-rotate-90': collapsedSections[section.key] }" />
          </button>
          <div v-if="collapsed" class="hidden lg:block h-px bg-ui-line mx-2 my-2"></div>
          <div v-show="!collapsedSections[section.key] || collapsed" class="space-y-px">
            <template v-for="item in section.items" :key="item.label">
              <RouterLink
                v-if="item.show"
                :to="item.to"
                :class="itemClass(item.active())"
                :aria-current="item.active() ? 'page' : undefined"
                @click="onNavigate"
                @mouseenter="showTooltip"
                @mouseleave="hideTooltip"
              >
                <component :is="item.icon" :class="iconClass(item.active())" />
                <span :class="labelClass">{{ item.label }}</span>
              </RouterLink>
            </template>
          </div>
        </div>
      </template>

      <!-- License Manager: Overview, then one entry per product -->
      <div v-if="showLicenseManager">
        <button
          type="button"
          class="w-full flex items-center justify-between px-2.5 pt-3 pb-1 text-ui-over uppercase text-ui-faint hover:text-ui-muted transition-colors"
          :class="collapsed ? 'lg:hidden' : ''"
          :aria-expanded="!collapsedSections.licenseManager"
          @click="toggleSection('licenseManager')"
        >
          <span>License Manager</span>
          <ChevronDown class="w-3 h-3 shrink-0 transition-transform duration-ui-fast" :class="{ '-rotate-90': collapsedSections.licenseManager }" />
        </button>
        <div v-if="collapsed" class="hidden lg:block h-px bg-ui-line mx-2 my-2"></div>
        <div v-show="!collapsedSections.licenseManager || collapsed" class="space-y-px">
          <RouterLink
            v-if="can('license-manager-menu')"
            :to="{ name: 'admin.license-manager.overview' }"
            :class="itemClass($route.name === 'admin.license-manager.overview')"
            @click="onNavigate"
            @mouseenter="showTooltip"
            @mouseleave="hideTooltip"
          >
            <KeyIcon :class="iconClass($route.name === 'admin.license-manager.overview')" />
            <span :class="labelClass">Overview</span>
          </RouterLink>

          <template v-if="canListLicenses || canSeeVersions">
            <template v-for="product in licenseProducts" :key="product.code">
              <!-- Without license-manager-list the product opens its Versions page -->
              <RouterLink
                :to="{
                  name: canListLicenses ? 'admin.license-manager.licenses.dashboard' : 'admin.license-manager.versions',
                  params: { product: product.code },
                }"
                :class="itemClass(canListLicenses ? isLicenseProductRoute(product.code) : isLicenseVersionsRoute(product.code))"
                @click="onNavigate"
                @mouseenter="showTooltip"
                @mouseleave="hideTooltip"
              >
                <ProductIcon :product="product" :size="18" class="shrink-0" />
                <span :class="labelClass">{{ product.name }}</span>
              </RouterLink>
              <!-- The product's release history, shown while one of its pages is open -->
              <RouterLink
                v-if="canListLicenses && canSeeVersions && (isLicenseProductRoute(product.code) || isLicenseVersionsRoute(product.code))"
                :to="{ name: 'admin.license-manager.versions', params: { product: product.code } }"
                :class="[itemClass(isLicenseVersionsRoute(product.code)), collapsed ? '' : 'ml-5']"
                @click="onNavigate"
                @mouseenter="showTooltip"
                @mouseleave="hideTooltip"
              >
                <HistoryIcon :class="iconClass(isLicenseVersionsRoute(product.code))" />
                <span :class="labelClass">Versions</span>
              </RouterLink>
            </template>
          </template>
        </div>
      </div>

      <template v-for="section in sectionsAfterLicense" :key="section.key">
        <div>
          <button
            type="button"
            class="w-full flex items-center justify-between px-2.5 pt-3 pb-1 text-ui-over uppercase text-ui-faint hover:text-ui-muted transition-colors"
            :class="collapsed ? 'lg:hidden' : ''"
            :aria-expanded="!collapsedSections[section.key]"
            @click="toggleSection(section.key)"
          >
            <span>{{ section.title }}</span>
            <ChevronDown class="w-3 h-3 shrink-0 transition-transform duration-ui-fast" :class="{ '-rotate-90': collapsedSections[section.key] }" />
          </button>
          <div v-if="collapsed" class="hidden lg:block h-px bg-ui-line mx-2 my-2"></div>
          <div v-show="!collapsedSections[section.key] || collapsed" class="space-y-px">
            <template v-for="item in section.items" :key="item.label">
              <RouterLink
                v-if="item.show"
                :to="item.to"
                :class="itemClass(item.active())"
                :aria-current="item.active() ? 'page' : undefined"
                @click="onNavigate"
                @mouseenter="showTooltip"
                @mouseleave="hideTooltip"
              >
                <component :is="item.icon" :class="iconClass(item.active())" />
                <span :class="labelClass">{{ item.label }}</span>
              </RouterLink>
            </template>
          </div>
        </div>
      </template>
    </nav>

    <!-- Settings: standalone, pinned to the bottom -->
    <div class="px-3 py-3 border-t border-ui-line" :class="collapsed ? 'lg:px-2' : ''">
      <RouterLink
        :to="{ name: 'admin.settings.dashboard' }"
        :class="itemClass(settingsActive())"
        @click="onNavigate"
        @mouseenter="showTooltip"
        @mouseleave="hideTooltip"
      >
        <SettingsIcon :class="iconClass(settingsActive())" />
        <span :class="labelClass">Settings</span>
      </RouterLink>
    </div>
  </aside>

  <Teleport to="body">
    <Transition name="ui-fade">
      <div
        v-if="tooltipText"
        class="fixed z-[60] -translate-y-1/2 pointer-events-none whitespace-nowrap bg-ui-ink text-white text-ui-cap font-medium px-2.5 py-1.5 rounded-ui-control shadow-ui-overlay"
        :style="tooltipStyle"
      >
        {{ tooltipText }}
      </div>
    </Transition>
  </Teleport>
</template>
