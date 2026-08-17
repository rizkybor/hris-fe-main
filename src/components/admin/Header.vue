<script setup>
import {
  ChevronDownIcon,
  UserIcon,
  ClockIcon,
  ReceiptIcon,
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
} from "lucide-vue-next";
import ConfirmActionModal from "@/components/common/ConfirmationModal.vue";
import NotificationBell from "@/components/admin/NotificationBell.vue";
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
    title: "Vendors",
    subtitle: "View All Vendors on Dashboard",
  },
  "admin.company-about.dashboard": {
    title: "Company About",
    subtitle: "View Company About Detail",
  },
  "admin.company-finance.dashboard": {
    title: "Operational Cost",
    subtitle: "Company Operational Cost Overview",
  },
  "admin.project-calculator.dashboard": {
    title: "Project Calculator",
    subtitle: "Estimate development cost by feature or from scratch",
  },
  "admin.project-calculator.create": {
    title: "Buat Estimasi Baru",
    subtitle: "Isi detail project untuk menghitung estimasi biaya",
  },
  "admin.project-calculator.edit": {
    title: "Edit Estimasi",
    subtitle: "Perbarui detail estimasi project",
  },
  "admin.project-calculator.detail": {
    title: "Detail Estimasi",
    subtitle: "Ringkasan estimasi biaya project",
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
    title: "Document Letters",
    subtitle: "Purchase Order, Invoice, Payment Receipt, Surat-Surat, and Sertifikat",
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
  "admin.letters.dashboard": {
    title: "Surat-Surat",
    subtitle: "Company letter register (internal and external)",
  },
  "admin.letters.create": {
    title: "Create Letter",
    subtitle: "Draft and issue a new company letter",
  },
  "admin.settings.document-codes": {
    title: "Kode Surat & Divisi",
    subtitle: "Manage letter code and division code references",
  },
  "admin.settings.sdm-fields": {
    title: "Bidang SDM",
    subtitle: "Manage the role/field list used by SDM Resource",
  },
  "admin.certificates.dashboard": {
    title: "Certificate",
    subtitle: "Riwayat sertifikat yang telah diterbitkan",
  },
  "admin.certificates.create": {
    title: "Generate Certificate",
    subtitle: "Buat sertifikat baru, tunggal maupun massal",
  },
  "admin.settings.certificate-settings": {
    title: "Pengaturan Certificate",
    subtitle: "Format penomoran dan template background sertifikat",
  },
  "admin.settings.backup": {
    title: "Backup Database",
    subtitle: "Generate and manage full SQL backups of the database",
  },
  "admin.report.dashboard": {
    title: "Reports",
    subtitle: "Generate and review company-wide reports",
  },
  "admin.history.dashboard": {
    title: "History",
    subtitle: "Track and review every activity across the system",
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
    title: "Org Chart",
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

const getInitials = (name) => {
  if (!name) return '';
  const nameParts = name.split(' ');
  const initials = nameParts.map(part => part.charAt(0).toUpperCase());
  return initials.slice(0, 2).join('');
};
</script>

<template>
  <header
    class="page-header bg-white border-b border-[#DCDEDD] px-3 sm:px-5 py-2.5 sm:py-3"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3 sm:gap-4">
        <button
          class="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150"
          @click="emit('toggle-sidebar')"
        >
          <MenuIcon class="w-[18px] h-[18px]" />
        </button>
        <div>
          <h2 class="text-brand-dark text-base sm:text-lg font-bold leading-tight">
            {{ pageTitle }}
          </h2>
          <p class="hidden sm:block text-brand-light text-xs font-normal mt-0.5">
            {{ pageSubtitle }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Action Buttons -->
        <div class="hidden sm:flex items-center gap-1">
          <NotificationBell />
          <RouterLink
            :to="{ name: 'admin.settings.dashboard' }"
            class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150"
          >
            <SettingsIcon class="w-[18px] h-[18px]" />
          </RouterLink>
        </div>

        <!-- Divider -->
        <div class="hidden sm:block w-px h-6 bg-[#DCDEDD] mx-2"></div>

        <!-- User Profile -->
        <div class="relative z-[9999]">
          <div
            class="flex items-center gap-2 sm:gap-2.5 cursor-pointer rounded-full hover:bg-gray-50 transition-colors duration-150 py-1 pr-1"
            @click="isOpen = !isOpen"
          >
             <div v-if="user?.profile_photo" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full">
              <img :src="user?.profile_photo" alt="User Avatar" class="w-full h-full rounded-full object-cover" />
            </div>
            <div v-else class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gray-100">
              <span class="text-gray-400 text-sm font-semibold">
                {{ getInitials(user?.name) }}
              </span>
            </div>
            <div class="hidden md:block text-left">
              <p class="text-brand-dark text-sm font-semibold leading-tight">
                {{ user?.name }}
              </p>
              <p class="text-gray-400 text-xs font-medium leading-tight mt-0.5">
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
            class="absolute right-0 top-full mt-2 w-56 bg-white border border-[#DCDEDD] rounded-[12px] shadow-md py-2 z-[9999]"
            :class="{ hidden: !isOpen }"
          >
            <div class="px-4 py-3 border-b border-[#DCDEDD]">
              <p class="text-sm font-semibold text-gray-900">
                {{ user?.name }}
              </p>
              <p class="text-xs text-gray-500">{{ user?.email }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ _.join(user?.roles, ", ").toUpperCase() }}
              </p>
            </div>

            <div class="py-1">
              <RouterLink
                :to="{ name: 'employee.profile.edit' }"
                class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                @click="isOpen = false"
              >
                <UserIcon class="w-4 h-4 text-gray-400" />
                Profil Pengguna
              </RouterLink>
              <RouterLink
                :to="{ name: 'admin.settings.dashboard' }"
                class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                @click="isOpen = false"
              >
                <SettingsIcon class="w-4 h-4 text-gray-400" />
                Pengaturan Sistem
              </RouterLink>
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
