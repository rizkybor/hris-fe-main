<script setup>
import { computed } from "vue";
import {
  SettingsIcon,
  ShieldCheck,
  KeyRound,
  UserCog,
  ChevronRight,
  Tags,
  Landmark,
  DatabaseBackup,
  Users2Icon,
  Award,
  ListChecks,
  UserCheck,
  Lock,
  Database,
  SlidersHorizontal,
  User,
  CalendarHeart,
  CalendarClock,
} from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";

const categories = [
  {
    title: "Access & Security",
    description: "Control who can sign in and what they can do",
    icon: Lock,
    links: [
      {
        to: { name: "admin.settings.roles" },
        icon: ShieldCheck,
        title: "Roles & Permissions",
        description: "Manage user roles and control access to each module",
        permission: "role-menu",
      },
      {
        to: { name: "admin.settings.staff-permissions" },
        icon: UserCheck,
        title: "Staff Account Permissions",
        description: "Grant extra permissions to individual Staff accounts on top of the Staff role",
        permission: "staff-permission-menu",
      },
      {
        to: { name: "admin.account-password.dashboard" },
        icon: KeyRound,
        title: "Account & Credentials",
        description: "Manage stored company account credentials",
        permission: "credential-account-menu",
      },
    ],
  },
  {
    title: "Master Data",
    description: "Reference lists used throughout the app's forms",
    icon: Database,
    links: [
      {
        to: { name: "admin.settings.dropdown-options" },
        icon: ListChecks,
        title: "Dropdown Options",
        description: "Manage Employment Type, PTKP Status, Bank Name, and Preferred Language choices",
        permission: "option-menu",
      },
      {
        to: { name: "admin.settings.document-codes" },
        icon: Tags,
        title: "Letter & Division Codes",
        description: "Manage the letter code and division code reference lists",
        permission: "letter-menu",
      },
      {
        to: { name: "admin.settings.bank-accounts" },
        icon: Landmark,
        title: "Bank Accounts",
        description: "Manage the Bank Name and Account Number choices used in Invoice's Payment & Tax section",
        permission: "invoice-menu",
      },
      {
        to: { name: "admin.settings.sdm-fields" },
        icon: Users2Icon,
        title: "SDM Field",
        description: "Manage the role/field list used by SDM Resource in Operational Cost",
        permission: "sdm-field-menu",
      },
    ],
  },
  {
    title: "Configuration",
    description: "Format and template settings for generated documents",
    icon: SlidersHorizontal,
    links: [
      {
        to: { name: "admin.settings.certificate-settings" },
        icon: Award,
        title: "Certificate Configuration",
        description: "Manage the certificate numbering format and background templates",
        permission: "certificate-menu",
      },
      {
        to: { name: "admin.settings.greetings" },
        icon: CalendarHeart,
        title: "Calendar Greetings",
        description: "Manage holidays, birthdays, meetings, and other date-based greetings shown on the dashboard",
        permission: "greeting-menu",
        iconBg: "bg-pink-50",
        iconColor: "text-pink-600",
      },
      {
        to: { name: "admin.settings.attendance" },
        icon: CalendarClock,
        title: "Attendance Settings",
        description: "Control whether staff can Clock In/Out on Saturday & Sunday",
        permission: "attendance-setting-edit",
        iconBg: "bg-indigo-50",
        iconColor: "text-indigo-600",
      },
    ],
  },
  {
    title: "System",
    description: "Database maintenance",
    icon: DatabaseBackup,
    links: [
      {
        to: { name: "admin.settings.backup" },
        icon: DatabaseBackup,
        title: "Backup Database",
        description: "Generate and manage full SQL backups of the database",
        permission: "backup-list",
        iconBg: "bg-red-50",
        iconColor: "text-red-600",
      },
    ],
  },
  {
    title: "Personal",
    description: "Your own account settings",
    icon: User,
    links: [
      {
        to: { name: "employee.profile" },
        icon: UserCog,
        title: "My Profile",
        description: "Update your personal profile information",
        permission: null,
      },
    ],
  },
];

const visibleCategories = computed(() =>
  categories
    .map((category) => ({
      ...category,
      links: category.links.filter((link) => !link.permission || can(link.permission)),
    }))
    .filter((category) => category.links.length > 0)
);
</script>

<template>
  <div class="px-4 py-4">
    <div v-for="category in visibleCategories" :key="category.title" class="mb-8 last:mb-0">
      <div class="flex items-center gap-2 mb-3 px-1">
        <component :is="category.icon" class="w-4 h-4 text-gray-400" />
        <h3 class="text-brand-dark text-sm font-bold uppercase tracking-wide">
          {{ category.title }}
        </h3>
        <span class="text-brand-light text-xs">&mdash; {{ category.description }}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <router-link
          v-for="link in category.links"
          :key="link.title"
          :to="link.to"
          class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5 flex items-start gap-4 hover:border-[#0C51D9] hover:shadow-sm transition-all"
        >
          <div
            class="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0"
            :class="link.iconBg || 'bg-blue-50'"
          >
            <component :is="link.icon" class="w-6 h-6" :class="link.iconColor || 'text-[#0C51D9]'" />
          </div>
          <div class="flex-1">
            <p class="text-brand-dark text-base font-bold">{{ link.title }}</p>
            <p class="text-brand-light text-sm mt-1">{{ link.description }}</p>
          </div>
          <ChevronRight class="w-5 h-5 text-gray-400 shrink-0 mt-1" />
        </router-link>
      </div>
    </div>
  </div>
</template>
