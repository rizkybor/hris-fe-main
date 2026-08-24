<script setup>
import { Users, UsersRound, FolderKanban, Banknote, BarChart3, CalendarCheck, ClipboardList, Landmark, ReceiptText, FileText, Megaphone } from "lucide-vue-next";
import DashboardQuickLinks from "./DashboardQuickLinks.vue";

// Union of every operational role's quick links (Manager, HR, Operational
// Director, Finance Manager) -- DashboardQuickLinks filters each entry by
// its own `permission`, so a given user only ever sees the subset they
// actually have access to, regardless of role.
const quickLinks = [
  { to: { name: "admin.employees" }, icon: Users, title: "Employees", permission: "employee-menu" },
  { to: { name: "admin.teams" }, icon: UsersRound, title: "Our Teams", permission: "team-menu" },
  { to: { name: "admin.projects" }, icon: FolderKanban, title: "Projects", permission: "project-menu" },
  { to: { name: "admin.attendances" }, icon: CalendarCheck, title: "Attendance", permission: "attendance-menu" },
  { to: { name: "admin.leave-requests.dashboard" }, icon: ClipboardList, title: "Leave Requests", permission: "leave-request-menu" },
  { to: { name: "admin.announcements.dashboard" }, icon: Megaphone, title: "Announcements", permission: "announcement-menu" },
  { to: { name: "admin.payroll.dashboard" }, icon: Banknote, title: "Payroll", permission: "payroll-menu" },
  { to: { name: "admin.company-finance.dashboard" }, icon: Landmark, title: "Company Finance", permission: "company-finance-menu" },
  { to: { name: "admin.invoices.dashboard" }, icon: ReceiptText, title: "Invoices", permission: "invoice-menu" },
  { to: { name: "admin.purchase-orders.dashboard" }, icon: FileText, title: "Purchase Orders", permission: "purchase-order-menu" },
  { to: { name: "admin.report.dashboard" }, icon: BarChart3, title: "Reports", permission: "report-menu" },
];
</script>

<template>
  <DashboardQuickLinks title="Quick Access" :links="quickLinks" />
</template>
