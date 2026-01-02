<script setup>
import {
  BellIcon,
  ChevronDownIcon,
  MessageCircleIcon,
  UserIcon,
  ClockIcon,
  ReceiptIcon,
  SettingsIcon,
  HelpCircleIcon,
  LogOutIcon,
  MenuIcon,
} from "lucide-vue-next";
import ConfirmActionModal from "@/components/common/ConfirmationModal.vue";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import { ref, computed } from "vue";
import { useRoute, RouterLink } from "vue-router";
import _ from "lodash";

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const { logout } = authStore;

const isOpen = ref(false);
const emit = defineEmits(["toggle-sidebar"]);

const route = useRoute();

const showLogoutModal = ref(false);
const logoutLoading = ref(false);

const titles = {
  "admin.dashboard": {
    title: "Dashboard Overview",
    subtitle: "Monitor your team performance and key metrics",
  },
  "admin.teams": {
    title: "Teams",
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
    title: "Attendance",
    subtitle: "Review clock in/out records",
  },
  "admin.projects": {
    title: "Projects",
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
  "admin.vendors.dashboard": {
    title: "Dashboard Vendors",
    subtitle: "View All Vendors",
  },
  "admin.company-about.dashboard": {
    title: "Company About",
    subtitle: "View Company About Detail",
  },
  "employee.profile": {
    title: "My Profile",
    subtitle: "Manage your personal information",
  },
  "employee.profile.edit": {
    title: "Edit Profile",
    subtitle: "Update your personal information",
  },
  "employee.team": { title: "My Team", subtitle: "See your team members" },
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
};

const pageInfo = computed(() => {
  const name = route.name?.toString() || "";
  return titles[name] || titles["admin.dashboard"];
});

const pageTitle = computed(() => pageInfo.value.title);
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
  <header
    class="page-header bg-white border-b border-[#DCDEDD] px-3 sm:px-5 py-3 sm:py-4"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3 sm:gap-4">
        <button
          class="lg:hidden w-10 h-10 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all duration-200"
          @click="emit('toggle-sidebar')"
        >
          <MenuIcon class="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h2 class="text-brand-dark text-xl sm:text-2xl font-extrabold">
            {{ pageTitle }}
          </h2>
          <p class="hidden sm:block text-brand-light text-sm font-normal mt-1">
            {{ pageSubtitle }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <!-- Action Buttons -->
        <div class="hidden sm:flex items-center gap-3">
          <button
            class="w-10 h-10 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all duration-200"
          >
            <BellIcon class="w-5 h-5 text-gray-600" />
          </button>
          <button
            class="w-10 h-10 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all duration-200"
          >
            <MessageCircleIcon class="w-5 h-5 text-gray-600" />
          </button>
          <button
            class="w-10 h-10 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all duration-200"
          >
            <SettingsIcon class="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <!-- Divider -->
        <div class="hidden sm:block w-px h-8 bg-[#DCDEDD] mx-5"></div>

        <!-- User Profile -->
        <div class="relative z-[10]">
          <div
            class="flex items-center gap-2 sm:gap-3 cursor-pointer"
            @click="isOpen = !isOpen"
          >
            <img
              :src="user?.profile_photo"
              alt="User Avatar"
              class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
              v-if="user?.profile_photo"
            />
            <div
              class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gray-100"
              v-else
            >
              <UserIcon class="w-5 h-5 text-gray-400" />
            </div>
            <div class="hidden md:block text-left">
              <p class="text-brand-dark text-sm sm:text-base font-semibold">
                {{ user?.name }}
              </p>
              <p
                class="text-brand-dark text-sm sm:text-base font-normal leading-7"
              >
                {{ _.join(user?.roles, ", ").toUpperCase() }}
              </p>
            </div>
            <ChevronDownIcon
              class="w-4 h-4 text-gray-400 hidden sm:block"
              :class="{ 'rotate-180': isOpen }"
            />
          </div>

          <!-- Dropdown Menu -->
          <div
            class="absolute right-0 top-full mt-2 w-56 bg-white border border-[#DCDEDD] rounded-lg shadow-md py-2 z-[9999]"
            :class="{ hidden: !isOpen }"
          >
            <div class="px-4 py-3 border-b border-[#DCDEDD]">
              <p class="text-sm font-semibold text-gray-900">
                {{ user?.name }}
              </p>
              <p class="text-xs text-gray-600">{{ user?.email }}</p>
              <p class="text-xs text-gray-500">
                {{ _.join(user?.roles, ", ").toUpperCase() }}
              </p>
            </div>

            <div class="py-1">
              <RouterLink
                :to="{ name: 'employee.profile.edit' }"
                class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                @click="isOpen = false"
              >
                <UserIcon class="w-4 h-4" />
                Profil Pengguna
              </RouterLink>
              <a
                href="#"
                class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <SettingsIcon class="w-4 h-4" />
                Pengaturan Sistem
              </a>
              <a
                href="#"
                class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <HelpCircleIcon class="w-4 h-4" />
                Bantuan
              </a>
            </div>

            <div class="border-t border-[#DCDEDD] py-1">
              <button
                @click="handleLogout"
                class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
              >
                <LogOutIcon class="w-4 h-4" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      </div>
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
