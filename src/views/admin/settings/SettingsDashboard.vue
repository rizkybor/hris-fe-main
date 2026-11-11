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

// Titles/descriptions are i18n keys, rendered with $t() in the template.
const categories = [
  {
    title: "settings.dashboard.categories.access.title",
    description: "settings.dashboard.categories.access.description",
    icon: Lock,
    links: [
      {
        to: { name: "admin.settings.roles" },
        icon: ShieldCheck,
        title: "settings.dashboard.links.roles.title",
        description: "settings.dashboard.links.roles.description",
        permission: "role-menu",
      },
      {
        to: { name: "admin.settings.staff-permissions" },
        icon: UserCheck,
        title: "settings.dashboard.links.staffPermissions.title",
        description: "settings.dashboard.links.staffPermissions.description",
        permission: "staff-permission-menu",
      },
      {
        to: { name: "admin.account-password.dashboard" },
        icon: KeyRound,
        title: "settings.dashboard.links.credentials.title",
        description: "settings.dashboard.links.credentials.description",
        permission: "credential-account-menu",
      },
    ],
  },
  {
    title: "settings.dashboard.categories.masterData.title",
    description: "settings.dashboard.categories.masterData.description",
    icon: Database,
    links: [
      {
        to: { name: "admin.settings.dropdown-options" },
        icon: ListChecks,
        title: "settings.dashboard.links.dropdownOptions.title",
        description: "settings.dashboard.links.dropdownOptions.description",
        permission: "option-menu",
      },
      {
        to: { name: "admin.settings.document-codes" },
        icon: Tags,
        title: "settings.dashboard.links.documentCodes.title",
        description: "settings.dashboard.links.documentCodes.description",
        permission: "letter-menu",
      },
      {
        to: { name: "admin.settings.bank-accounts" },
        icon: Landmark,
        title: "settings.dashboard.links.bankAccounts.title",
        description: "settings.dashboard.links.bankAccounts.description",
        permission: "invoice-menu",
      },
      {
        to: { name: "admin.settings.sdm-fields" },
        icon: Users2Icon,
        title: "settings.dashboard.links.sdmFields.title",
        description: "settings.dashboard.links.sdmFields.description",
        permission: "sdm-field-menu",
      },
    ],
  },
  {
    title: "settings.dashboard.categories.configuration.title",
    description: "settings.dashboard.categories.configuration.description",
    icon: SlidersHorizontal,
    links: [
      {
        to: { name: "admin.settings.certificate-settings" },
        icon: Award,
        title: "settings.dashboard.links.certificate.title",
        description: "settings.dashboard.links.certificate.description",
        permission: "certificate-menu",
      },
      {
        to: { name: "admin.settings.greetings" },
        icon: CalendarHeart,
        title: "settings.dashboard.links.greetings.title",
        description: "settings.dashboard.links.greetings.description",
        permission: "greeting-menu",
      },
      {
        to: { name: "admin.settings.client-screening" },
        icon: ClipboardCheck,
        title: "settings.dashboard.links.clientScreening.title",
        description: "settings.dashboard.links.clientScreening.description",
        permission: "screening-settings",
      },
      {
        to: { name: "admin.settings.documents" },
        icon: FileSignature,
        title: "settings.dashboard.links.documents.title",
        description: "settings.dashboard.links.documents.description",
        permission: "document-setting-edit",
      },
      {
        to: { name: "admin.settings.attendance" },
        icon: CalendarClock,
        title: "settings.dashboard.links.attendance.title",
        description: "settings.dashboard.links.attendance.description",
        permission: "attendance-setting-edit",
      },
      {
        to: { name: "admin.settings.payroll" },
        icon: Wallet,
        title: "settings.dashboard.links.payroll.title",
        description: "settings.dashboard.links.payroll.description",
        permission: "payroll-setting-edit",
      },
    ],
  },
  {
    title: "settings.dashboard.categories.system.title",
    description: "settings.dashboard.categories.system.description",
    icon: DatabaseBackup,
    links: [
      {
        to: { name: "admin.settings.backup" },
        icon: DatabaseBackup,
        title: "settings.dashboard.links.backup.title",
        description: "settings.dashboard.links.backup.description",
        permission: "backup-list",
      },
    ],
  },
  {
    title: "settings.dashboard.categories.personal.title",
    description: "settings.dashboard.categories.personal.description",
    icon: User,
    links: [
      {
        to: { name: "employee.profile" },
        icon: UserCog,
        title: "settings.dashboard.links.profile.title",
        description: "settings.dashboard.links.profile.description",
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
    <UiPageHeader :title="$t('settings.dashboard.title')" :subtitle="$t('settings.dashboard.subtitle')" />

    <section v-for="category in visibleCategories" :key="category.title" class="space-y-2.5 ui-anim-fade-up">
      <div class="flex items-baseline gap-2 flex-wrap px-1">
        <h2 class="text-ui-over uppercase tracking-wider text-ui-muted">{{ $t(category.title) }}</h2>
        <span class="hidden sm:inline text-ui-cap text-ui-faint">{{ $t(category.description) }}</span>
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
          <span class="flex-1 min-w-0 text-ui-body text-ui-ink truncate">{{ $t(link.title) }}</span>
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
            <span class="block text-ui-body font-medium text-ui-ink">{{ $t(link.title) }}</span>
            <span class="block text-ui-small text-ui-muted mt-0.5 line-clamp-2">{{ $t(link.description) }}</span>
          </span>
          <ChevronRight class="w-4 h-4 text-ui-faint shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
        </router-link>
      </div>
    </section>
  </div>
</template>
