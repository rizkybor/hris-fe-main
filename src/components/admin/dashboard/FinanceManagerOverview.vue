<script setup>
import { Banknote, Landmark, ReceiptText, FileText, BarChart3 } from "lucide-vue-next";
import Statistics from "./Statistics.vue";
import DashboardQuickLinks from "./DashboardQuickLinks.vue";
import StickyNotesWidget from "./StickyNotesWidget.vue";

const quickLinks = [
  { to: { name: "admin.payroll.dashboard" }, icon: Banknote, title: "Payroll", permission: "payroll-menu" },
  {
    to: { name: "admin.company-finance.dashboard" },
    icon: Landmark,
    title: "Company Finance",
    permission: "company-finance-menu",
  },
  { to: { name: "admin.invoices.dashboard" }, icon: ReceiptText, title: "Invoices", permission: "invoice-menu" },
  {
    to: { name: "admin.purchase-orders.dashboard" },
    icon: FileText,
    title: "Purchase Orders",
    permission: "purchase-order-menu",
  },
  { to: { name: "admin.report.dashboard" }, icon: BarChart3, title: "Reports", permission: "report-menu" },
];
</script>

<template>
  <div class="space-y-6">
    <Statistics />
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <DashboardQuickLinks title="Finance & Operations" :links="quickLinks" class="lg:col-span-3" />
    </div>
    <StickyNotesWidget />
  </div>
</template>
