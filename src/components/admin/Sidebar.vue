<script setup>
import {
  HomeIcon,
  FileTextIcon,
  UsersIcon,
  SettingsIcon,
  CrownIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  WalletIcon,
  XIcon,
  FolderClosedIcon,
  KeyRoundIcon,
  Building2Icon,
  CircleDollarSign,
} from "lucide-vue-next";

import { can } from "@/helpers/permissionHelper";
import { RouterLink } from "vue-router";

const props = defineProps(["isOpen"]);
const emit = defineEmits(["navigate"]);

const onNavigate = () => emit("navigate");
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
          <!-- <div
            class="w-14 h-14 absolute bg-gradient-to-br from-primary-100 to-primary-200 rounded-full"
          ></div> -->
          <!-- <div
            class="w-10 h-10 absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-full opacity-90"
          ></div> -->
          <!-- <BuildingIcon class="w-5 h-5 text-white relative z-10" /> -->
          <img
            src="/images/jcd-only-color.png"
            alt="Company Logo"
            class="w-12 h-12 relative z-10 object-contain"
          />
        </div>
        <div>
          <h1 class="text-brand-dark text-lg font-bold">
            HRIS
            <span class="text-xs font-medium text-gray-400 ml-1"> v1.0 </span>
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
      <!-- GENERAL Section -->
      <div>
        <h3 class="section-title">GENERAL</h3>
        <div class="space-y-3">
          <RouterLink
            :to="{ name: 'admin.dashboard' }"
            :class="{
              'nav-link-active': $route.name === 'admin.dashboard',
            }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            @click="onNavigate"
          >
            <HomeIcon
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

          <RouterLink
            :to="{ name: 'admin.teams' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.team'),
            }"
            v-if="can('team-menu')"
            @click="onNavigate"
          >
            <UsersIcon
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
            :to="{ name: 'admin.employees' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
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
            :to="{ name: 'admin.attendances' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            :class="{
              'nav-link-active': $route.name === 'admin.attendances',
            }"
            v-if="can('attendance-menu')"
            @click="onNavigate"
          >
            <CalendarIcon
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
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.project'),
            }"
            v-if="can('project-menu')"
            @click="onNavigate"
          >
            <FileTextIcon
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
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.payroll'),
            }"
            v-if="can('payroll-menu')"
            @click="onNavigate"
          >
            <WalletIcon
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

          <RouterLink
            :to="{ name: 'employee.payslips' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('employee.payslips'),
            }"
            v-if="can('payslip-view')"
            @click="onNavigate"
          >
            <WalletIcon
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

          <RouterLink
            :to="{ name: 'employee.attendance.my-attendances' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            :class="{
              'nav-link-active':
                $route.name === 'employee.attendance.my-attendances',
            }"
            v-if="can('attendance-my-attendances')"
            @click="onNavigate"
          >
            <FileTextIcon
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
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
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
            :to="{ name: 'employee.profile' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            :class="{
              'nav-link-active': $route.name === 'employee.profile',
            }"
            v-if="can('profile-menu')"
            @click="onNavigate"
          >
            <UserIcon
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
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            :class="{
              'nav-link-active': $route.name === 'employee.team',
            }"
            v-if="can('team-view')"
            @click="onNavigate"
          >
            <UsersIcon
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
        </div>
      </div>

      <!-- Company Section -->
      <div>
        <h3 class="section-title">Company</h3>
        <div class="space-y-3">
          <!-- <a
            href="#"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            @click="onNavigate"
          >
            <FileTextIcon class="w-5 h-5 text-gray-600" />
            <span class="text-brand-dark text-base font-medium">Company About</span>
          </a> -->
          <RouterLink
            :to="{ name: 'admin.company-about.dashboard' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
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
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
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
            :to="{ name: 'admin.account-password.dashboard' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
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

          <RouterLink
            :to="{ name: 'admin.files-company.dashboard' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
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
              >Document</span
            >
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin.vendors.dashboard' }"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            :class="{
              'nav-link-active': $route.name?.startsWith('admin.vendors'),
            }"
            @click="onNavigate"
          >
            <CrownIcon
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
        </div>
      </div>

      <!-- OTHERS Section -->
      <div>
        <h3 class="section-title">OTHERS</h3>
        <div class="space-y-3">
          <a
            href="#"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            @click="onNavigate"
          >
            <FileTextIcon class="w-5 h-5 text-gray-600" />
            <span class="text-brand-dark text-base font-medium">Reports</span>
          </a>

          <a
            href="#"
            class="nav-link border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 focus:bg-white transition-all duration-300"
            @click="onNavigate"
          >
            <SettingsIcon class="w-5 h-5 text-gray-600" />
            <span class="text-brand-dark text-base font-medium">Settings</span>
          </a>
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
          <!-- Ikon untuk memberikan kesan inspiratif -->
          <div
            class="w-12 h-12 rounded-[12px] flex items-center justify-center mb-4"
          >
            <img
              src="/images/jcd-only-color.png"
              alt="Background Image"
              class="w-full h-full object-cover"
            />
          </div>

          <!-- Judul -->
          <h4 class="text-blue-800 text-base font-bold mb-2">
            "Success doesn’t come from what you do occasionally, it comes from
            what you do consistently."
          </h4>
          <p class="text-blue-700 text-sm italic">– Marie Forleo</p>
        </div>
      </div>
    </div>

    <!-- Upgrade to Pro Box -->
    <!-- <div class="px-6 pb-6 mt-auto">
      <div
        class="upgrade-card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-[16px] relative overflow-hidden p-5"
      >

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

        <div class="relative z-10">
          <div
            class="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-[12px] flex items-center justify-center mb-3"
          >
            <CrownIcon class="w-5 h-5 text-white" />
          </div>

          <h4 class="text-brand-dark text-base font-bold mb-1">
            Upgrade to Pro
          </h4>
          <p class="text-brand-dark text-sm font-normal leading-5 mb-4">
            Unlock advanced features and insights
          </p>

          <button
            class="btn-primary w-full rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3"
          >
            <span class="text-brand-white text-sm font-semibold"
              >Upgrade Now</span
            >
            <ArrowRightIcon class="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div> -->
  </aside>
</template>
