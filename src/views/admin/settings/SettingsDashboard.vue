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
  Wallet,
  ClipboardCheck,
  FileSignature,
} from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";
import { UiPageHeader } from "@/components/ui";

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
      },
      {
        to: { name: "admin.settings.client-screening" },
        icon: ClipboardCheck,
        title: "Client Screening",
        description: "Service catalog (synced from the Rate Card) and the client needs questionnaire",
        permission: "screening-settings",
      },
      {
        to: { name: "admin.settings.documents" },
        icon: FileSignature,
        title: "Document Settings",
        description: "Show signatory names with or without academic degrees on generated PDFs",
        permission: "document-setting-edit",
      },
      {
        to: { name: "admin.settings.attendance" },
        icon: CalendarClock,
        title: "Attendance Settings",
        description: "Control whether staff can Clock In/Out on Saturday & Sunday",
        permission: "attendance-setting-edit",
      },
      {
        to: { name: "admin.settings.payroll" },
        icon: Wallet,
        title: "Payroll Settings",
        description: "Control how Payroll is automatically generated",
        permission: "payroll-setting-edit",
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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Settings" subtitle="Access, master data, configuration and system maintenance." />

    <section v-for="category in visibleCategories" :key="category.title" class="space-y-2.5 ui-anim-fade-up">
      <div class="flex items-baseline gap-2 flex-wrap px-1">
        <h2 class="text-ui-over uppercase tracking-wider text-ui-muted">{{ category.title }}</h2>
        <span class="hidden sm:inline text-ui-cap text-ui-faint">{{ category.description }}</span>
      </div>

      <!-- Phones: grouped list -->
      <div class="sm:hidden bg-ui-surface border border-ui-line rounded-ui-card divide-y divide-ui-line overflow-hidden">
        <router-link
          v-for="link in category.links"
          :key="link.title"
          :to="link.to"
          class="ui-press flex items-center gap-3 px-4 py-3.5 active:bg-ui-hover"
        >
          <span class="w-8 h-8 rounded-ui-control bg-ui-subtle text-ui-text flex items-center justify-center shrink-0">
            <component :is="link.icon" class="w-4 h-4" />
          </span>
          <span class="flex-1 min-w-0 text-ui-body text-ui-ink truncate">{{ link.title }}</span>
          <ChevronRight class="w-4 h-4 text-ui-faint shrink-0" />
        </router-link>
      </div>

      <!-- Tablet / desktop: card grid -->
      <div class="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-3 ui-stagger">
        <router-link
          v-for="link in category.links"
          :key="link.title"
          :to="link.to"
          class="ui-lift group bg-ui-surface border border-ui-line rounded-ui-card p-4 flex items-start gap-3.5 hover:border-ui-line-strong"
        >
          <span class="w-10 h-10 rounded-ui-control bg-ui-subtle text-ui-text flex items-center justify-center shrink-0">
            <component :is="link.icon" class="w-5 h-5" />
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-ui-body font-medium text-ui-ink">{{ link.title }}</span>
            <span class="block text-ui-small text-ui-muted mt-0.5 line-clamp-2">{{ link.description }}</span>
          </span>
          <ChevronRight class="w-4 h-4 text-ui-faint shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
        </router-link>
      </div>
    </section>
  </div>
</template>
