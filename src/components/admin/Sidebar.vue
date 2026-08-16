<script setup>
import { computed } from "vue";
import {
  LayoutDashboard,
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
  Building2Icon,
  CircleDollarSign,
  FileStack,
  ListChecksIcon,
  BarChart3,
  History as HistoryIcon,
  Megaphone as MegaphoneIcon,
  Laptop as LaptopIcon,
  Network as NetworkIcon,
} from "lucide-vue-next";

import { can, canOneOf } from "@/helpers/permissionHelper";
import { RouterLink } from "vue-router";

const props = defineProps(["isOpen"]);
const emit = defineEmits(["navigate"]);

const onNavigate = () => emit("navigate");

// A section header only renders when at least one item inside it is
// visible to the current user's permissions - otherwise it's a dangling
// label with nothing underneath it.
const showMyWorkspace = computed(() =>
  canOneOf([
    "profile-menu",
    "team-view",
    "attendance-my-attendances",
    "attendance-check-in",
    "attendance-check-out",
    "task-list",
    "payslip-view",
  ])
);

const showPeopleAndWork = computed(() =>
  canOneOf([
    "employee-menu",
    "team-menu",
    "attendance-menu",
    "project-menu",
    "payroll-menu",
  ])
);

const showCompanyFinance = computed(() =>
  canOneOf([
    "company-about-menu",
    "company-finance-menu",
    "vendors-menu",
    "files-company-menu",
    "credential-account-list",
    "purchase-order-menu",
    "invoice-menu",
    "payment-receipt-menu",
    "letter-menu",
  ])
);
</script>

<template>
  <!-- Mobile Overlay handled by layout -->

  <!-- Sidebar -->
  <aside
    id="sidebar"
    class="fixed lg:relative inset-y-0 left-0 z-50 w-64 h-screen bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col transform transition-all duration-300 ease-in-out"
    :class="[
      props.isOpen ? 'translate-x-0' : '-translate-x-full',
      'lg:translate-x-0',
    ]"
    data-collapsed="false"
  >
    <!-- Logo Section -->
    <div
      class="px-6 py-4 border-b border-[#DCDEDD] flex items-center justify-between"
    >
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 relative flex items-center justify-center">
          <img
            src="/images/jcd-only-color.png"
            alt="Company Logo"
            class="w-12 h-12 relative z-10 object-contain"
          />
        </div>
        <div>
          <h1 class="text-brand-dark text-lg font-bold">
            HRIS
            <span class="text-xs font-medium text-gray-400 ml-1"> v3.3 </span>
          </h1>
          <p class="text-brand-dark text-xs font-normal">
            Jendela Cakra Digital
          </p>
        </div>
      </div>
      <button
        class="lg:hidden w-10 h-10 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all duration-200"
        @click="onNavigate"
      >
        <XIcon class="w-5 h-5 text-gray-600" />
      </button>
    </div>

    <!-- Navigation Menu -->
    <nav
      class="px-6 py-4 space-y-6 flex-1 overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
    >
      <!-- Overview -->
      <div>
        <h3 class="section-title">Overview</h3>
        <div class="space-y-3">
          <RouterLink
            :to="{ name: 'admin.dashboard' }"
            :class="{
              'nav-link-active': $route.name === 'admin.dashboard',
            }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            @click="onNavigate"
          >
            <LayoutDashboard
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name === 'admin.dashboard',
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name === 'admin.dashboard',
              }"
              >Dashboard</span
            >
          </RouterLink>
        </div>
      </div>

      <!-- My Workspace: self-service items scoped to the logged-in employee -->
      <div v-if="showMyWorkspace">
        <h3 class="section-title">My Workspace</h3>
        <div class="space-y-3">
          <RouterLink
            :to="{ name: 'employee.profile' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name === 'employee.profile',
            }"
            v-if="can('profile-menu')"
            @click="onNavigate"
          >
            <CircleUserRound
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name === 'employee.profile',
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name === 'employee.profile',
              }"
              >My Profile</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'employee.team' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name === 'employee.team',
            }"
            v-if="can('team-view')"
            @click="onNavigate"
          >
            <Contact
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name === 'employee.team',
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name === 'employee.team',
              }"
              >My Team</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'employee.attendance.my-attendances' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active':
                $route.name === 'employee.attendance.my-attendances',
            }"
            v-if="can('attendance-my-attendances')"
            @click="onNavigate"
          >
            <CalendarCheck
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white':
                  $route.name === 'employee.attendance.my-attendances',
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white':
                  $route.name === 'employee.attendance.my-attendances',
              }"
              >My Attendance</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'employee.attendance.clock' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name === 'employee.attendance.clock',
            }"
            v-if="can('attendance-check-in') || can('attendance-check-out')"
            @click="onNavigate"
          >
            <ClockIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name === 'employee.attendance.clock',
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name === 'employee.attendance.clock',
              }"
              >Clock In/Out</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'employee.tasks' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('employee.tasks'),
            }"
            v-if="can('task-list')"
            @click="onNavigate"
          >
            <ListChecksIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('employee.tasks'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('employee.tasks'),
              }"
              >My Tasks</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'employee.payslips' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('employee.payslips'),
            }"
            v-if="can('payslip-view')"
            @click="onNavigate"
          >
            <Wallet
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('employee.payslips'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white':
                  $route.name?.startsWith('employee.payslips'),
              }"
              >My Payslips</span
            >
          </RouterLink>
        </div>
      </div>

      <!-- People & Work: managing employees, teams, attendance, and payroll company-wide -->
      <div v-if="showPeopleAndWork">
        <h3 class="section-title">People &amp; Work</h3>
        <div class="space-y-3">
          <RouterLink
            :to="{ name: 'admin.employees' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.employee'),
            }"
            v-if="can('employee-menu')"
            @click="onNavigate"
          >
            <UsersIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.employee'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.employee'),
              }"
              >Employees</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.teams' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.team'),
            }"
            v-if="can('team-menu')"
            @click="onNavigate"
          >
            <UsersRound
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.team'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.team'),
              }"
              >Our Teams</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.orgchart.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.orgchart'),
            }"
            v-if="can('team-menu')"
            @click="onNavigate"
          >
            <NetworkIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.orgchart'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.orgchart'),
              }"
              >Org Chart</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.attendances' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name === 'admin.attendances',
            }"
            v-if="can('attendance-menu')"
            @click="onNavigate"
          >
            <CalendarDays
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name === 'admin.attendances',
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name === 'admin.attendances',
              }"
              >Attendance</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.projects' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.project'),
            }"
            v-if="can('project-menu')"
            @click="onNavigate"
          >
            <FolderKanban
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.project'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.project'),
              }"
              >Projects</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.payroll.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.payroll'),
            }"
            v-if="can('payroll-menu')"
            @click="onNavigate"
          >
            <Banknote
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.payroll'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.payroll'),
              }"
              >Payroll</span
            >
          </RouterLink>
        </div>
      </div>

      <!-- Company & Finance: company profile, spending, vendors, and paperwork -->
      <div v-if="showCompanyFinance">
        <h3 class="section-title">Company &amp; Finance</h3>
        <div class="space-y-3">
          <RouterLink
            :to="{ name: 'admin.company-about.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.company-about'),
            }"
            v-if="can('company-about-menu')"
            @click="onNavigate"
          >
            <Building2Icon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.company-about'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith(
                  'admin.company-about'
                ),
              }"
              >Company About</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.company-finance.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith(
                'admin.company-finance'
              ),
            }"
            v-if="can('company-finance-menu')"
            @click="onNavigate"
          >
            <CircleDollarSign
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.company-finance'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith(
                  'admin.company-finance'
                ),
              }"
              >Operational Cost</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.vendors.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.vendors'),
            }"
            v-if="can('vendors-menu')"
            @click="onNavigate"
          >
            <Handshake
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.vendors'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.vendors'),
              }"
              >Vendor</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.documents.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.documents') || $route.name?.startsWith('admin.purchase-orders') || $route.name?.startsWith('admin.invoices') || $route.name?.startsWith('admin.payment-receipts') || $route.name?.startsWith('admin.letters'),
            }"
            v-if="canOneOf(['purchase-order-menu', 'invoice-menu', 'payment-receipt-menu', 'letter-menu'])"
            @click="onNavigate"
          >
            <FileStack
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.documents') || $route.name?.startsWith('admin.purchase-orders') || $route.name?.startsWith('admin.invoices') || $route.name?.startsWith('admin.payment-receipts') || $route.name?.startsWith('admin.letters'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.documents') || $route.name?.startsWith('admin.purchase-orders') || $route.name?.startsWith('admin.invoices') || $route.name?.startsWith('admin.payment-receipts') || $route.name?.startsWith('admin.letters'),
              }"
              >Document Letters</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.files-company.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.files-company'),
            }"
            v-if="can('files-company-menu')"
            @click="onNavigate"
          >
            <FolderClosedIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.files-company'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith(
                  'admin.files-company'
                ),
              }"
              >Document Files</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.account-password.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith(
                'admin.account-password'
              ),
            }"
            v-if="can('credential-account-list')"
            @click="onNavigate"
          >
            <KeyRoundIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.account-password'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith(
                  'admin.account-password'
                ),
              }"
              >Credential</span
            >
          </RouterLink>
        </div>
      </div>

      <!-- Insights & Admin: reporting, audit trail, comms, assets, and system settings -->
      <div>
        <h3 class="section-title">Insights &amp; Admin</h3>
        <div class="space-y-3">
          <RouterLink
            :to="{ name: 'admin.report.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.report'),
            }"
            v-if="can('report-menu')"
            @click="onNavigate"
          >
            <BarChart3
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.report'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.report'),
              }"
              >Reports</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.history.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.history'),
            }"
            v-if="can('history-menu')"
            @click="onNavigate"
          >
            <HistoryIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.history'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.history'),
              }"
              >History</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.announcements.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.announcements'),
            }"
            v-if="can('announcement-menu')"
            @click="onNavigate"
          >
            <MegaphoneIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.announcements'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.announcements'),
              }"
              >Announcements</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.assets.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.assets'),
            }"
            v-if="can('asset-menu')"
            @click="onNavigate"
          >
            <LaptopIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.assets'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.assets'),
              }"
              >Assets</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.settings.dashboard' }"
            class="nav-link border-2 border-transparent rounded-[20px] hover:border-[#0C51D9] transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.settings'),
            }"
            @click="onNavigate"
          >
            <SettingsIcon
              class="w-5 h-5 text-gray-600"
              :class="{
                'text-white': $route.name?.startsWith('admin.settings'),
              }"
            />
            <span
              class="text-brand-dark text-base font-medium"
              :class="{
                'text-brand-white': $route.name?.startsWith('admin.settings'),
              }"
              >Settings</span
            >
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="px-6 pb-6 mt-auto">
      <div
        class="upgrade-card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-[16px] relative overflow-hidden p-5"
      >
        <!-- Dekorasi latar belakang -->
        <div class="absolute inset-0 opacity-5">
          <div
            class="absolute top-2 right-4 w-8 h-8 bg-blue-500 rounded-full"
          ></div>
          <div
            class="absolute bottom-4 left-2 w-6 h-6 bg-blue-400 rounded-full"
          ></div>
          <div
            class="absolute top-1/2 left-1/2 w-4 h-4 bg-blue-600 rounded-full"
          ></div>
        </div>

        <!-- Konten utama -->
        <div class="relative z-10">
          <!-- Judul -->
          <h4 class="text-blue-800 text-base font-bold mb-2">
            "Success doesn’t come from what you do occasionally, it comes from
            what you do consistently."
          </h4>
          <p class="text-blue-700 text-sm italic">– Marie Forleo</p>
        </div>
      </div>
    </div>
  </aside>
</template>
