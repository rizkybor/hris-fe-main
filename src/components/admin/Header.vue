<script setup>
import {
  ChevronDownIcon,
  ChevronRight,
  UserIcon,
  ClockIcon,
  ReceiptIcon,
  SettingsIcon,
  LogOutIcon,
  Sun,
  Moon,
  Monitor,
} from "lucide-vue-next";
import { useTheme } from "@/composables/useTheme";
import ConfirmActionModal from "@/components/common/ConfirmationModal.vue";
import NotificationBell from "@/components/admin/NotificationBell.vue";
import Avatar from "@/components/common/Avatar.vue";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { join } from "lodash-es";
import { useLicenseManagerStore } from "@/stores/licenseManager";

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const { logout } = authStore;

const isOpen = ref(false);
const profileMenuRef = ref(null);
const emit = defineEmits(["toggle-sidebar"]);

// Closes the dropdown on an outside click or Escape -- without this it
// only ever closes via an explicit menu action, so it's left open (and
// intercepting clicks behind it) the moment the user clicks anywhere else
// on the page.
const handleOutsideClick = (event) => {
  if (isOpen.value && profileMenuRef.value && !profileMenuRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};
const handleEscape = (event) => {
  if (event.key === "Escape") isOpen.value = false;
};
onMounted(() => {
  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", handleEscape);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
  document.removeEventListener("keydown", handleEscape);
});

const route = useRoute();

const showLogoutModal = ref(false);
const logoutLoading = ref(false);

const titles = {
  "admin.dashboard": {
    title: "Dashboard Overview",
    subtitle: "Monitor your team performance and key metrics",
  },
  "admin.teams": {
    title: "Our Teams",
    subtitle: "Manage teams and organization units",
  },
  "admin.team.detail": {
    title: "Team Details",
    subtitle: "View team information",
  },
  "admin.team.create": { title: "Create Team", subtitle: "Set up a new team" },
  "admin.team.edit": {
    title: "Edit Team",
    subtitle: "Update team information",
  },
  "admin.employees": {
    title: "Employees",
    subtitle: "Manage employee records",
  },
  "admin.employees.create": {
    title: "Create Employee",
    subtitle: "Add new employee",
  },
  "admin.employees.edit": {
    title: "Edit Employee",
    subtitle: "Update employee information",
  },
  "admin.employees.detail": {
    title: "Employee Details",
    subtitle: "View employee profile",
  },
  "admin.employees.success": {
    title: "Employee Created",
    subtitle: "Employee has been added",
  },
  "admin.attendances": {
    title: "Attendance Summary",
    subtitle: "Review clock in/out records",
  },
  "admin.attendances.records": {
    title: "Attendance Records",
    subtitle: "Every clock in/out across the company",
  },
  "admin.leave-requests.dashboard": {
    title: "Leave Requests",
    subtitle: "Review and approve leave applications",
  },
  "admin.projects": {
    title: "Project Lists",
    subtitle: "Manage projects and tasks",
  },
  "admin.projects.create": {
    title: "Create Project",
    subtitle: "Set up a new project",
  },
  "admin.projects.edit": {
    title: "Edit Project",
    subtitle: "Update project information",
  },
  "admin.projects.detail": {
    title: "Project Details",
    subtitle: "View project information",
  },
  "admin.payroll.dashboard": {
    title: "Payroll",
    subtitle: "Manage payroll and payments",
  },
  "admin.payroll.create": {
    title: "Create Payroll",
    subtitle: "Generate payroll for employees",
  },
  "admin.payroll.detail": {
    title: "Payroll Details",
    subtitle: "View payroll summary",
  },
  "admin.account-password.dashboard": {
    title: "Credential Account",
    subtitle: "Manage and monitor company credential passwords",
  },
  "admin.account-password.detail": {
    title: "Credential Detail",
    subtitle: "View detailed information of the credential password",
  },
  "admin.account-password.create": {
    title: "Create Credential",
    subtitle: "Set a new credential password for the company account",
  },
  "admin.account-password.edit": {
    title: "Edit Credential",
    subtitle: "Update and change the company account password",
  },
  "admin.license-manager.overview": {
    title: "License Manager",
    subtitle: "License keys for every app, one list per product",
  },
  "admin.clients.dashboard": {
    title: "Our Clients",
    subtitle: "View All Clients on Dashboard",
  },
  "admin.clients.create": {
    title: "Add Client",
    subtitle: "Register a new client",
  },
  "admin.clients.detail": {
    title: "Client Details",
    subtitle: "View client information",
  },
  "admin.clients.edit": {
    title: "Edit Client",
    subtitle: "Update client information",
  },
  "admin.screening.dashboard": {
    title: "Client Screening",
    subtitle: "Client needs questionnaires and the services to offer",
  },
  "admin.screening.detail": {
    title: "Screening Detail",
    subtitle: "Answers, recommended services and the needs summary",
  },
  "admin.settings.client-screening": {
    title: "Client Screening Settings",
    subtitle: "Service catalog from the Rate Card and the questionnaire",
  },
  "admin.maintenance.dashboard": {
    title: "Maintenance Lists",
    subtitle: "Monthly maintenance hour quotas per client",
  },
  "admin.maintenance.detail": {
    title: "Maintenance Detail",
    subtitle: "Quota, work log, development balance and new features",
  },
  "admin.subscriptions.dashboard": {
    title: "Subscription Lists",
    subtitle: "Manage recurring billing for maintenance, domain renewal, and SaaS subscriptions",
  },
  "admin.company-about.dashboard": {
    title: "Company About",
    subtitle: "View Company About Detail",
  },
  "admin.company-finance.dashboard": {
    title: "Operational Cost",
    subtitle: "Company Operational Cost Overview",
  },
  "admin.company-cash-book.dashboard": {
    title: "Company Cash Book",
    subtitle: "Track company cash in and out",
  },
  "admin.project-calculator.dashboard": {
    title: "Project Calculator",
    subtitle: "Estimate development cost by feature or from scratch",
  },
  "admin.project-calculator.create": {
    title: "Create New Estimate",
    subtitle: "Enter the project details to calculate the cost estimate.",
  },
  "admin.project-calculator.edit": {
    title: "Edit Estimate",
    subtitle: "Update the project estimate details and recalculate the cost.",
  },
  "admin.project-calculator.detail": {
    title: "Detail Estimate",
    subtitle: "Summary of the project cost estimate and breakdown of features or modules.",
  },
  "admin.files-company.dashboard": {
    title: "Document Files",
    subtitle: "View Document Company",
  },
  "admin.files-company.create": {
    title: "Upload Document File",
    subtitle: "Store a permanent company document",
  },
  "admin.files-company.detail": {
    title: "Document File Detail",
    subtitle: "View file information and preview",
  },
  "admin.files-company.edit": {
    title: "Edit Document File",
    subtitle: "Update file metadata or replace the attached document",
  },
  "admin.documents.dashboard": {
    title: "Business Documents",
    subtitle: "Letters, Invoice, Payment Receipt, Purchase Order, Official Memo, Meeting Note, and Certificate",
  },
  "admin.purchase-orders.dashboard": {
    title: "Purchase Order",
    subtitle: "Manage Purchase Order (PO) documents",
  },
  "admin.purchase-orders.create": {
    title: "Create Purchase Order",
    subtitle: "Generate a new Purchase Order",
  },
  "admin.invoices.dashboard": {
    title: "Invoice",
    subtitle: "Manage client invoices",
  },
  "admin.invoices.create": {
    title: "Create Invoice",
    subtitle: "Generate a new invoice",
  },
  "admin.payment-receipts.dashboard": {
    title: "Payment Receipt",
    subtitle: "Manage payment receipts",
  },
  "admin.payment-receipts.create": {
    title: "Create Payment Receipt",
    subtitle: "Generate a new payment receipt",
  },
  "admin.proposals.dashboard": {
    title: "Proposal Penawaran",
    subtitle: "Sales proposals built from the JCD template",
  },
  "admin.proposals.edit": {
    title: "Edit Proposal Penawaran",
    subtitle: "Edit each section, then preview or download the PDF",
  },
  "admin.letters.dashboard": {
    title: "Letters",
    subtitle: "Company letter register (internal and external)",
  },
  "admin.letters.create": {
    title: "Create Letter",
    subtitle: "Draft and issue a new company letter",
  },
  "admin.official-memos.dashboard": {
    title: "Official Memo",
    subtitle: "Internal memos with a Finance Manager approval workflow",
  },
  "admin.official-memos.create": {
    title: "Create Official Memo",
    subtitle: "Draft a new internal memo",
  },
  "admin.official-memos.detail": {
    title: "Official Memo Detail",
    subtitle: "View memo content and approval status",
  },
  "admin.official-memos.edit": {
    title: "Edit Official Memo",
    subtitle: "Update a memo that is still in Draft",
  },
  "admin.meeting-notes.dashboard": {
    title: "Meeting Note",
    subtitle: "Internal & external meeting recaps, managed together by the management team",
  },
  "admin.meeting-notes.create": {
    title: "Create Meeting Note",
    subtitle: "Record a new meeting recap",
  },
  "admin.meeting-notes.detail": {
    title: "Meeting Note Detail",
    subtitle: "View notes, action items, and attendees",
  },
  "admin.meeting-notes.edit": {
    title: "Edit Meeting Note",
    subtitle: "Update meeting notes and action items",
  },
  "admin.settings.document-codes": {
    title: "Letter & Division Codes",
    subtitle: "Manage letter code and division code references",
  },
  "admin.settings.sdm-fields": {
    title: "SDM Field",
    subtitle: "Manage the role/field list used by SDM Resource",
  },
  "admin.certificates.dashboard": {
    title: "Certificate",
    subtitle: "History of issued certificates",
  },
  "admin.staff-tasks.dashboard": {
    title: "Staff Tasks",
    subtitle: "Assign daily tasks to all staff or hand-picked staff, and track progress",
  },
  "admin.certificates.create": {
    title: "Generate Certificate",
    subtitle: "Create new certificate, single or mass",
  },
  "admin.settings.certificate-settings": {
    title: "Certificate Configuration",
    subtitle: "Certificate numbering format and background template settings",
  },
  "admin.settings.backup": {
    title: "Backup Database",
    subtitle: "Generate and manage full SQL backups of the database",
  },
  "admin.report.dashboard": {
    title: "Reporting",
    subtitle: "Generate and review company-wide reports",
  },
  "admin.history.dashboard": {
    title: "History",
    subtitle: "Track and review every activity across the system",
  },
  "admin.not-found": {
    title: "Halaman tidak ditemukan",
    subtitle: "Alamat ini tidak tersedia",
  },
  "admin.flowchart.dashboard": {
    title: "Flowchart",
    subtitle: "Design and export process flowcharts",
  },
  "admin.flowchart.create": {
    title: "New Flowchart",
    subtitle: "Design a process flowchart",
  },
  "admin.flowchart.detail": {
    title: "Flowchart",
    subtitle: "View and export a process flowchart",
  },
  "admin.flowchart.edit": {
    title: "Edit Flowchart",
    subtitle: "Design a process flowchart",
  },
  "admin.server-storage.dashboard": {
    title: "Server Lists",
    subtitle: "Monitor disk, RAM and CPU of your VPS",
  },
  "admin.announcements.dashboard": {
    title: "Announcements",
    subtitle: "Broadcast information to your team",
  },
  "admin.assets.dashboard": {
    title: "Company Assets",
    subtitle: "Track and assign company-owned equipment",
  },
  "admin.orgchart.dashboard": {
    title: "Organization Chart",
    subtitle: "Company structure by department and team",
  },
  "admin.settings.dashboard": {
    title: "Settings",
    subtitle: "Manage system configuration and preferences",
  },
  "admin.settings.roles": {
    title: "Roles & Permissions",
    subtitle: "Control which modules and actions each role can access",
  },

  // EMPLOYEE
  "employee.profile": {
    title: "My Profile",
    subtitle: "Manage your personal information",
  },
  "employee.profile.edit": {
    title: "Edit Profile",
    subtitle: "Update your personal information",
  },
  "employee.team": { title: "My Team", subtitle: "See your team members" },
  "employee.tasks": {
    title: "My Tasks",
    subtitle: "All tasks assigned to you",
  },
  "employee.attendance.my-attendances": {
    title: "My Attendances",
    subtitle: "Track your attendance records",
  },
  "employee.attendance.clock": {
    title: "Clock In/Out",
    subtitle: "Record your working time",
  },
  "employee.payslips": {
    title: "My Payslips",
    subtitle: "View your payroll history",
  },
  "employee.payslips.detail": {
    title: "Payslip Details",
    subtitle: "See payroll breakdown",
  },
  "admin.analytics.dashboard": { title: "Analytics", subtitle: "Usage and trends across the system" },
  "admin.invoices.edit": { title: "Edit Invoice", subtitle: "Update the invoice details" },
  "admin.payment-receipts.edit": { title: "Edit Payment Receipt", subtitle: "Update the receipt details" },
  "admin.purchase-orders.edit": { title: "Edit Purchase Order", subtitle: "Update the purchase order" },
  "admin.letters.edit": { title: "Edit Letter", subtitle: "Update the letter details" },
  "admin.settings.staff-permissions": { title: "Staff Account Permissions", subtitle: "Extra permissions per staff account" },
  "admin.settings.dropdown-options": { title: "Dropdown Options", subtitle: "Options used across forms" },
  "admin.settings.bank-accounts": { title: "Bank Accounts", subtitle: "Company bank accounts" },
  "admin.settings.greetings": { title: "Greetings", subtitle: "Dashboard greetings and occasions" },
  "admin.settings.attendance": { title: "Attendance Settings", subtitle: "Working hours, holidays and rules" },
  "admin.settings.payroll": { title: "Payroll Settings", subtitle: "Payroll components and rules" },
  "admin.settings.documents": { title: "Document Settings", subtitle: "Numbering, templates and letterheads" },
};

// License pages are per product: the title carries the product name.
const LICENSE_PAGE_TITLES = {
  "admin.license-manager.licenses.dashboard": ["Licenses", "Issue and manage license keys"],
  "admin.license-manager.licenses.create": ["Create License", "Generate a new license key"],
  "admin.license-manager.licenses.detail": ["License Detail", "Active period, devices and tracking"],
  "admin.license-manager.licenses.edit": ["Edit License", "Update details, extend or deactivate"],
  "admin.license-manager.versions": ["Versions", "Release history, installers and versions in use"],
};
const licenseStore = useLicenseManagerStore();

const pageInfo = computed(() => {
  const name = route.name?.toString() || "";
  const licensePage = LICENSE_PAGE_TITLES[name];
  if (licensePage) {
    const code = String(route.params.product || "");
    const productName = licenseStore.productByCode(code)?.name || code.toUpperCase();
    return { title: `${productName} · ${licensePage[0]}`, subtitle: licensePage[1] };
  }
  return titles[name] || titles["admin.dashboard"];
});

const pageTitle = computed(() => pageInfo.value.title);

// Appearance switch in the user menu.
const { mode: themeMode, setMode: setThemeMode } = useTheme();
const THEME_OPTIONS = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

// Breadcrumb section, named like the sidebar groups. First matching
// route-name prefix wins; the dashboard has no section.
const SECTION_RULES = [
  ["License Manager", ["admin.license-manager"]],
  ["Settings", ["admin.settings"]],
  ["General", ["employee.attendance.clock", "employee.attendance.my-attendances", "employee.payslips"]],
  ["My Workspace", ["employee.profile", "employee.team", "employee.tasks", "admin.staff-tasks", "admin.screening", "admin.projects", "admin.subscriptions", "admin.maintenance", "admin.server-storage", "admin.attendances", "admin.leave-requests"]],
  ["Administration", ["admin.employee", "admin.team", "admin.clients", "admin.documents", "admin.purchase-orders", "admin.invoices", "admin.payment-receipts", "admin.letters", "admin.certificates", "admin.official-memos", "admin.meeting-notes", "admin.proposals", "admin.orgchart"]],
  ["Finance", ["admin.company-finance", "admin.company-cash-book", "admin.payroll", "admin.report"]],
  ["Tools", ["admin.project-calculator", "admin.flowchart"]],
  ["Company", ["admin.company-about", "admin.assets", "admin.files-company", "admin.account-password", "admin.announcements"]],
  ["Insights", ["admin.analytics", "admin.history"]],
];
const pageSection = computed(() => {
  const name = route.name?.toString() || "";
  return SECTION_RULES.find(([, prefixes]) => prefixes.some((p) => name.startsWith(p)))?.[0] || "";
});
const pageSubtitle = computed(() => pageInfo.value.subtitle);

const handleLogout = () => {
  showLogoutModal.value = true;
};

const confirmLogout = async () => {
  logoutLoading.value = true;
  await logout();
  logoutLoading.value = false;
  showLogoutModal.value = false;
};


</script>

<template>
  <header class="page-header h-14 shrink-0 flex items-center gap-3 px-4 sm:px-6 bg-ui-bg border-b border-ui-line font-sans">
    <!-- Breadcrumb: the page itself carries the big title and description
         (UiPageHeader), so the bar only says where you are. On phones it
         reads as an app bar title. -->
    <nav aria-label="Breadcrumb" class="flex-1 min-w-0 flex items-center gap-1.5">
      <template v-if="pageSection">
        <span class="hidden sm:inline text-ui-small text-ui-muted truncate shrink-0 max-w-[40%]">{{ pageSection }}</span>
        <ChevronRight class="hidden sm:block w-3.5 h-3.5 text-ui-faint shrink-0" aria-hidden="true" />
      </template>
      <h2 class="text-ui-h3 sm:text-ui-small sm:font-medium text-ui-ink truncate" aria-current="page">{{ pageTitle }}</h2>
    </nav>

    <div class="flex items-center gap-1">
      <NotificationBell />
      <RouterLink
        :to="{ name: 'admin.settings.dashboard' }"
        class="hidden sm:inline-flex w-9 h-9 items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink transition-colors"
        aria-label="Settings"
      >
        <SettingsIcon class="w-[18px] h-[18px]" />
      </RouterLink>
    </div>

    <div class="hidden sm:block w-px h-6 bg-ui-line mx-1"></div>

    <!-- User menu -->
    <div ref="profileMenuRef" class="relative z-50">
      <button
        type="button"
        class="flex items-center gap-2.5 rounded-[10px] py-1 pl-1 pr-1.5 hover:bg-ui-hover transition-colors focus:outline-none focus-visible:shadow-ui-focus"
        aria-haspopup="true"
        :aria-expanded="isOpen"
        @click="isOpen = !isOpen"
      >
        <Avatar :src="user?.profile_photo" :alt="user?.name" size="w-8 h-8" />
        <div class="hidden md:block text-left max-w-[160px]">
          <p class="text-ui-small font-medium text-ui-ink leading-tight truncate">{{ user?.name }}</p>
          <p class="text-ui-cap text-ui-muted leading-tight mt-0.5 truncate capitalize">{{ join(user?.roles, ", ") }}</p>
        </div>
        <ChevronDownIcon class="w-4 h-4 text-ui-faint shrink-0 transition-transform duration-ui-fast" :class="{ 'rotate-180': isOpen }" />
      </button>

      <Transition name="ui-pop">
        <div
          v-if="isOpen"
          role="menu"
          class="absolute right-0 top-full mt-2 w-60 bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay p-1.5 origin-top-right"
        >
          <div class="px-2.5 py-2.5 mb-1 border-b border-ui-line">
            <p class="text-ui-small font-semibold text-ui-ink truncate">{{ user?.name }}</p>
            <p class="text-ui-cap text-ui-muted truncate">{{ user?.email }}</p>
            <p class="text-ui-cap text-ui-faint mt-0.5 truncate capitalize">{{ join(user?.roles, ", ") }}</p>
          </div>
          <RouterLink
            :to="{ name: 'employee.profile.edit' }"
            role="menuitem"
            class="flex items-center gap-2.5 h-9 px-2.5 rounded-ui-control text-ui-small text-ui-text hover:bg-ui-hover hover:text-ui-ink transition-colors"
            @click="isOpen = false"
          >
            <UserIcon class="w-4 h-4 text-ui-muted" />
            Profil Pengguna
          </RouterLink>
          <RouterLink
            :to="{ name: 'admin.settings.dashboard' }"
            role="menuitem"
            class="flex items-center gap-2.5 h-9 px-2.5 rounded-ui-control text-ui-small text-ui-text hover:bg-ui-hover hover:text-ui-ink transition-colors"
            @click="isOpen = false"
          >
            <SettingsIcon class="w-4 h-4 text-ui-muted" />
            Pengaturan Sistem
          </RouterLink>
          <!-- Appearance: stays open so the change is visible right away. -->
          <div class="px-2.5 pt-2 pb-1.5">
            <p class="text-ui-cap text-ui-muted mb-1.5">Tampilan</p>
            <div class="grid grid-cols-3 gap-0.5 p-0.5 bg-ui-subtle border border-ui-line rounded-ui-control" role="radiogroup" aria-label="Tampilan">
              <button
                v-for="opt in THEME_OPTIONS"
                :key="opt.value"
                type="button"
                role="radio"
                :aria-checked="themeMode === opt.value"
                class="h-8 rounded-[6px] flex items-center justify-center gap-1 text-ui-cap font-medium transition-colors"
                :class="themeMode === opt.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
                @click.stop="setThemeMode(opt.value)"
              >
                <component :is="opt.icon" class="w-3.5 h-3.5" />
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="h-px bg-ui-line my-1"></div>
          <button
            type="button"
            role="menuitem"
            class="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-ui-control text-ui-small text-ui-bad hover:bg-ui-bad-soft transition-colors text-left"
            @click="isOpen = false; handleLogout()"
          >
            <LogOutIcon class="w-4 h-4" />
            Keluar
          </button>
        </div>
      </Transition>
    </div>

    <ConfirmActionModal
      :show="showLogoutModal"
      title="Keluar dari Sistem"
      message="Anda yakin ingin keluar? Semua sesi aktif akan dihentikan."
      confirm-text="Keluar"
      cancel-text="Batal"
      type="danger"
      :loading="logoutLoading"
      @cancel="showLogoutModal = false"
      @confirm="confirmLogout"
    />
  </header>
</template>
