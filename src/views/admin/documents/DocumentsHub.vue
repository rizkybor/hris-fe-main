<script setup>
import { ShoppingCart, Receipt, FileCheck2, Mail, Award, FileSignature, NotebookPen, ChevronRight, FileText, FolderOpen } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";
import { UiEmpty, UiPageHeader } from "@/components/ui";

const links = [
  {
    to: { name: "admin.proposals.dashboard" },
    icon: FileText,
    title: "Proposal Penawaran",
    description: "Write sales proposals from the JCD template and export them as PDF",
    permission: "proposal-menu",
    group: "billing",
  },
  {
    to: { name: "admin.letters.dashboard" },
    icon: Mail,
    title: "Letters",
    description: "Create and manage internal and external company letters",
    permission: "letter-menu",
    group: "office",
  },
  {
    to: { name: "admin.invoices.dashboard" },
    icon: Receipt,
    title: "Invoice",
    description: "Create and manage client invoices",
    permission: "invoice-menu",
    group: "billing",
  },
  {
    to: { name: "admin.payment-receipts.dashboard" },
    icon: FileCheck2,
    title: "Payment Receipt",
    description: "Create and manage payment receipts",
    permission: "payment-receipt-menu",
    group: "billing",
  },
  {
    to: { name: "admin.purchase-orders.dashboard" },
    icon: ShoppingCart,
    title: "Purchase Order",
    description: "Create and manage Purchase Orders (PO) for clients",
    permission: "purchase-order-menu",
    group: "billing",
  },
  {
    to: { name: "admin.official-memos.dashboard" },
    icon: FileSignature,
    title: "Official Memo",
    description: "Internal memos with a Finance Manager approval workflow",
    permission: "document-letter-menu",
    group: "office",
  },
  {
    to: { name: "admin.meeting-notes.dashboard" },
    icon: NotebookPen,
    title: "Meeting Note",
    description: "Internal & external meeting recaps, managed together by the management team",
    permission: "meeting-note-menu",
    group: "office",
  },
  {
    to: { name: "admin.certificates.dashboard" },
    icon: Award,
    title: "Certificate",
    description: "Generate dynamic certificates, single or in bulk",
    permission: "certificate-menu",
    group: "office",
  },
];

// Presentation only: the same links, shown in two labelled groups.
const groups = [
  { key: "billing", label: "Billing & sales" },
  { key: "office", label: "Letters & records" },
];
const visibleIn = (key) => links.filter((l) => l.group === key && can(l.permission));
const hasAny = () => links.some((l) => can(l.permission));
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Business Documents" subtitle="Invoices, receipts, purchase orders, letters and other company documents, exported as PDF." />

    <template v-for="group in groups" :key="group.key">
      <section v-if="visibleIn(group.key).length" class="space-y-2.5">
        <h2 class="text-ui-over uppercase text-ui-muted px-0.5">{{ group.label }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 ui-stagger">
          <router-link
            v-for="link in visibleIn(group.key)"
            :key="link.title"
            :to="link.to"
            class="ui-lift group flex items-start gap-3.5 bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 hover:border-ui-line-strong focus:outline-none focus-visible:shadow-ui-focus"
          >
            <span class="w-10 h-10 shrink-0 rounded-ui-control bg-ui-subtle text-ui-ink flex items-center justify-center">
              <component :is="link.icon" class="w-5 h-5" />
            </span>
            <span class="flex-1 min-w-0">
              <span class="flex items-center justify-between gap-2">
                <span class="text-ui-h3 text-ui-ink">{{ link.title }}</span>
                <ChevronRight class="w-4 h-4 text-ui-faint shrink-0 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span class="block text-ui-small text-ui-muted mt-1">{{ link.description }}</span>
            </span>
          </router-link>
        </div>
      </section>
    </template>

    <div v-if="!hasAny()" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="FolderOpen" title="No documents available" message="You don't have access to any document type yet." />
    </div>
  </div>
</template>
