<script setup>
import { Users, UsersRound, FolderKanban, Banknote, BarChart3, CalendarCheck, ClipboardList, Landmark, ReceiptText, FileText, Megaphone } from "lucide-vue-next";
import DashboardQuickLinks from "./DashboardQuickLinks.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// Union of every operational role's quick links (Manager, HR, Operational
// Director, Finance Manager) -- DashboardQuickLinks filters each entry by
// its own `permission`, so a given user only ever sees the subset they
// actually have access to, regardless of role.
const quickLinks = computed(() => [
  { to: { name: "admin.employees" }, icon: Users, title: t("dashboard.quickLinks.employees"), permission: "employee-menu" },
  { to: { name: "admin.teams" }, icon: UsersRound, title: t("dashboard.quickLinks.teams"), permission: "team-menu" },
  { to: { name: "admin.projects" }, icon: FolderKanban, title: t("dashboard.quickLinks.projects"), permission: "project-menu" },
  { to: { name: "admin.attendances" }, icon: CalendarCheck, title: t("dashboard.quickLinks.attendance"), permission: "attendance-menu" },
  { to: { name: "admin.leave-requests.dashboard" }, icon: ClipboardList, title: t("dashboard.quickLinks.leaveRequests"), permission: "leave-request-menu" },
  { to: { name: "admin.announcements.dashboard" }, icon: Megaphone, title: t("dashboard.quickLinks.announcements"), permission: "announcement-menu" },
  { to: { name: "admin.payroll.dashboard" }, icon: Banknote, title: t("dashboard.quickLinks.payroll"), permission: "payroll-menu" },
  { to: { name: "admin.company-finance.dashboard" }, icon: Landmark, title: t("dashboard.quickLinks.companyFinance"), permission: "company-finance-menu" },
  { to: { name: "admin.invoices.dashboard" }, icon: ReceiptText, title: t("dashboard.quickLinks.invoices"), permission: "invoice-menu" },
  { to: { name: "admin.purchase-orders.dashboard" }, icon: FileText, title: t("dashboard.quickLinks.purchaseOrders"), permission: "purchase-order-menu" },
  { to: { name: "admin.report.dashboard" }, icon: BarChart3, title: t("dashboard.quickLinks.reports"), permission: "report-menu" },
]);
</script>

<template>
  <DashboardQuickLinks :title="$t('dashboard.widgets.quickAccess')" :links="quickLinks" />
</template>
