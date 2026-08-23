<script setup>
import { FileStack, ShoppingCart, Receipt, FileCheck2, Mail, Award, FileSignature, NotebookPen, ChevronRight } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";

const links = [
  {
    to: { name: "admin.letters.dashboard" },
    icon: Mail,
    title: "Letters",
    description: "Create and manage internal and external company letters",
    permission: "letter-menu",
  },
  {
    to: { name: "admin.invoices.dashboard" },
    icon: Receipt,
    title: "Invoice",
    description: "Create and manage client invoices",
    permission: "invoice-menu",
  },
  {
    to: { name: "admin.payment-receipts.dashboard" },
    icon: FileCheck2,
    title: "Payment Receipt",
    description: "Create and manage payment receipts",
    permission: "payment-receipt-menu",
  },
  {
    to: { name: "admin.purchase-orders.dashboard" },
    icon: ShoppingCart,
    title: "Purchase Order",
    description: "Create and manage Purchase Orders (PO) for vendors",
    permission: "purchase-order-menu",
  },
  {
    to: { name: "admin.official-memos.dashboard" },
    icon: FileSignature,
    title: "Official Memo",
    description: "Internal memos with a Finance Manager approval workflow",
    permission: "document-letter-menu",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    to: { name: "admin.meeting-notes.dashboard" },
    icon: NotebookPen,
    title: "Meeting Note",
    description: "Internal & external meeting recaps, managed together by the management team",
    permission: "meeting-note-menu",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  {
    to: { name: "admin.certificates.dashboard" },
    icon: Award,
    title: "Certificate",
    description: "Generate dynamic certificates, single or in bulk",
    permission: "certificate-menu",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];
</script>

<template>
  <div class="px-4 py-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <template v-for="link in links" :key="link.title">
        <router-link
          v-if="can(link.permission)"
          :to="link.to"
          class="bg-white border border-[#DCDEDD] rounded-[12px] p-5 flex flex-col gap-3 hover:border-[#0C51D9] hover:shadow-sm transition-all"
        >
          <div
            class="w-12 h-12 rounded-[12px] flex items-center justify-center"
            :class="link.iconBg || 'bg-blue-50'"
          >
            <component :is="link.icon" class="w-6 h-6" :class="link.iconColor || 'text-[#0C51D9]'" />
          </div>
          <div class="flex-1">
            <p class="text-brand-dark text-base font-bold flex items-center justify-between">
              {{ link.title }}
              <ChevronRight class="w-4 h-4 text-gray-400" />
            </p>
            <p class="text-brand-light text-sm mt-1">{{ link.description }}</p>
          </div>
        </router-link>
      </template>
    </div>
  </div>
</template>
