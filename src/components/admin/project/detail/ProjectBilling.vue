<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { ReceiptText, Eye, EyeOff, CheckCircle2, AlertTriangle, Clock, ChevronDown } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";

// Project detail: is what the client was invoiced for this project matched by
// what they paid (payment receipts)? Replaces the old project cash ledger.
const props = defineProps({ projectId: { type: [String, Number], required: true } });

const data = ref(null);
const loading = ref(true);
const failed = ref(false);
const load = async () => {
  loading.value = true;
  failed.value = false;
  try {
    data.value = (await axiosInstance.get(`/projects/${props.projectId}/billing`)).data.data;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};
onMounted(load);
watch(() => props.projectId, load);

// Hidden by default like the project budget.
const visible = ref(false);
const money = (v) => (visible.value ? formatRupiah(v ?? 0) : "Rp ••••••");

const STATUS = {
  settled: { label: "Settled — every invoice is fully paid", class: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  outstanding: { label: "Not settled — there is still an outstanding balance", class: "bg-amber-50 text-amber-800 border-amber-200", icon: Clock },
  overpaid: { label: "Overpaid — payments exceed the invoiced amount", class: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle },
  not_invoiced: { label: "No invoices for this project yet", class: "bg-gray-50 text-gray-600 border-[#DCDEDD]", icon: ReceiptText },
};
const INVOICE_STATE = {
  paid: { label: "Paid", class: "bg-green-50 text-green-700" },
  partial: { label: "Partially paid", class: "bg-amber-50 text-amber-700" },
  unpaid: { label: "Unpaid", class: "bg-red-50 text-red-700" },
  overpaid: { label: "Overpaid", class: "bg-red-50 text-red-700" },
  cancelled: { label: "Cancelled", class: "bg-gray-100 text-gray-500" },
};

const status = computed(() => STATUS[data.value?.status] || STATUS.not_invoiced);

// Project value split into paid / invoiced-unpaid / not invoiced (before tax
// shares, so the bar adds up to the project value).
const bar = computed(() => {
  const d = data.value;
  if (!d || !d.project_value) return null;
  const pct = (v) => Math.max(0, Math.min(100, (v / d.project_value) * 100));
  const ratio = d.invoiced_total > 0 ? d.invoiced_subtotal / d.invoiced_total : 1;
  const paid = pct(Math.min(d.paid_total, d.invoiced_total) * ratio);
  const invoiced = Math.max(0, pct(d.invoiced_subtotal) - paid);
  return { paid, invoiced, rest: Math.max(0, 100 - paid - invoiced) };
});

const openInvoice = ref(null);
const formatDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-");
</script>

<template>
  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 sm:p-6">
    <div class="flex items-start justify-between gap-3 mb-5">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 rounded-[10px] flex items-center justify-center shrink-0">
          <ReceiptText class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base sm:text-lg font-bold">Billing &amp; Payments</h3>
          <p class="text-brand-light text-xs">This project's invoices compared with payments from Payment Receipts</p>
        </div>
      </div>
      <button
        type="button"
        class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0"
        :title="visible ? 'Hide amounts' : 'Show amounts'"
        :aria-label="visible ? 'Hide amounts' : 'Show amounts'"
        @click="visible = !visible"
      >
        <EyeOff v-if="visible" class="w-4 h-4" />
        <Eye v-else class="w-4 h-4" />
      </button>
    </div>

    <div v-if="loading && !data" class="text-center py-8 text-xs text-gray-400">Loading billing data...</div>
    <p v-else-if="failed" class="text-sm text-gray-500 bg-white border border-[#DCDEDD] rounded-[12px] p-4">
      Couldn't load billing data. <button type="button" class="text-[#0C51D9] font-semibold hover:underline" @click="load">Try again</button>
    </p>

    <template v-else-if="data">
      <!-- Verdict -->
      <div class="flex items-center gap-2 border rounded-[10px] px-3.5 py-2.5 mb-4 text-sm font-semibold" :class="status.class">
        <component :is="status.icon" class="w-4 h-4 shrink-0" />
        <span>{{ status.label }}</span>
      </div>

      <!-- Figures -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="bg-white border border-[#DCDEDD] rounded-[10px] p-3.5 min-w-0">
          <p class="text-brand-light text-xs">Project Value</p>
          <p class="text-brand-dark text-sm font-bold mt-1 truncate">{{ money(data.project_value) }}</p>
          <p class="text-[11px] text-gray-400 mt-0.5 leading-snug">Not invoiced yet {{ money(data.not_invoiced) }}</p>
        </div>
        <div class="bg-white border border-[#DCDEDD] rounded-[10px] p-3.5 min-w-0">
          <p class="text-brand-light text-xs">Total Invoiced</p>
          <p class="text-brand-dark text-sm font-bold mt-1 truncate">{{ money(data.invoiced_total) }}</p>
          <p class="text-[11px] text-gray-400 mt-0.5 leading-snug">
            DPP {{ money(data.invoiced_subtotal) }}<template v-if="data.invoiced_percent !== null"> · {{ data.invoiced_percent }}% of project value</template>
          </p>
        </div>
        <div class="bg-white border border-[#DCDEDD] rounded-[10px] p-3.5 min-w-0">
          <p class="text-brand-light text-xs">Total Paid</p>
          <p class="text-emerald-700 text-sm font-bold mt-1 truncate">{{ money(data.paid_total) }}</p>
          <p class="text-[11px] text-gray-400 mt-0.5 leading-snug">
            <template v-if="data.paid_percent !== null">{{ data.paid_percent }}% of invoiced</template>
            <template v-if="data.pph23_withheld"> · incl. PPh 23 {{ money(data.pph23_withheld) }}</template>
          </p>
        </div>
        <div class="bg-white border rounded-[10px] p-3.5 min-w-0" :class="data.outstanding > 0 ? 'border-amber-200' : data.outstanding < 0 ? 'border-red-200' : 'border-[#DCDEDD]'">
          <p class="text-brand-light text-xs">{{ data.outstanding < 0 ? "Overpaid" : "Outstanding" }}</p>
          <p class="text-sm font-bold mt-1 truncate" :class="data.outstanding > 0 ? 'text-amber-700' : data.outstanding < 0 ? 'text-red-600' : 'text-brand-dark'">
            {{ money(Math.abs(data.outstanding)) }}
          </p>
          <p class="text-[11px] text-gray-400 mt-0.5 leading-snug">Invoiced − paid</p>
        </div>
      </div>

      <!-- Progress of the project value -->
      <div v-if="bar" class="mb-5">
        <div class="flex h-2.5 rounded-full overflow-hidden bg-gray-200 gap-[2px]">
          <div v-if="bar.paid" class="h-full bg-[#1baf7a]" :style="{ width: `${bar.paid}%` }"></div>
          <div v-if="bar.invoiced" class="h-full bg-[#eda100]" :style="{ width: `${bar.invoiced}%` }"></div>
        </div>
        <p class="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-brand-light">
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-[#1baf7a]"></span>Paid {{ Math.round(bar.paid) }}%</span>
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-[#eda100]"></span>Invoiced, not yet paid {{ Math.round(bar.invoiced) }}%</span>
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-gray-200"></span>Not invoiced yet {{ Math.round(bar.rest) }}%</span>
        </p>
      </div>

      <p v-if="data.mismatch_count" class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-[10px] px-3 py-2 mb-4 flex items-start gap-2">
        <AlertTriangle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {{ data.mismatch_count }} invoice{{ data.mismatch_count === 1 ? " is" : "s are" }} marked Paid/Unpaid differently from {{ data.mismatch_count === 1 ? "its" : "their" }} Payment Receipts — please check and update the invoice status.
      </p>

      <!-- Per invoice -->
      <div v-if="!data.invoices.length" class="text-center py-8 text-gray-500 bg-white rounded-[12px] border border-dashed border-[#DCDEDD]">
        <ReceiptText class="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p class="text-sm font-semibold">No invoices yet</p>
        <p class="text-xs text-gray-400">Select this project when creating an Invoice for it to appear here.</p>
      </div>
      <div v-else class="bg-white rounded-[12px] border border-[#DCDEDD] divide-y divide-[#EEF1F5]">
        <div class="hidden sm:grid grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-x-3 px-3.5 py-2 text-[11px] font-semibold uppercase text-gray-500 bg-gray-50 rounded-t-[12px]">
          <span>Invoice</span><span>Invoiced</span><span>Paid</span><span>Outstanding</span><span class="w-[118px] text-right">Status</span>
        </div>
        <div v-for="inv in data.invoices" :key="inv.id" :class="{ 'opacity-60': inv.state === 'cancelled' }">
          <button
            type="button"
            class="w-full text-left px-3.5 py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-x-3 gap-y-1 items-center hover:bg-gray-50"
            :aria-expanded="openInvoice === inv.id"
            @click="openInvoice = openInvoice === inv.id ? null : inv.id"
          >
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-brand-dark truncate">{{ inv.invoice_number }}</span>
              <span class="block text-[11px] text-gray-400">{{ formatDate(inv.date) }} · {{ inv.receipts.length }} receipt{{ inv.receipts.length === 1 ? "" : "s" }}</span>
            </span>
            <span class="flex items-center justify-end gap-1.5 justify-self-end sm:order-last sm:w-[118px]">
              <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap" :class="INVOICE_STATE[inv.state].class">{{ INVOICE_STATE[inv.state].label }}</span>
              <AlertTriangle v-if="inv.status_mismatch" class="w-3.5 h-3.5 text-amber-600" :title="`Invoice status: ${inv.invoice_status}`" />
              <ChevronDown class="w-4 h-4 text-gray-400 transition-transform" :class="{ 'rotate-180': openInvoice === inv.id }" />
            </span>
            <span class="text-xs sm:text-sm"><span class="sm:hidden text-gray-400">Invoiced </span>{{ money(inv.total) }}</span>
            <span class="text-xs sm:text-sm text-emerald-700"><span class="sm:hidden text-gray-400">Paid </span>{{ money(inv.paid) }}</span>
            <span class="text-xs sm:text-sm col-span-2 sm:col-span-1" :class="inv.outstanding > 0 ? 'text-amber-700 font-semibold' : inv.outstanding < 0 ? 'text-red-600 font-semibold' : 'text-gray-400'">
              <span class="sm:hidden text-gray-400 font-normal">Outstanding </span>{{ inv.outstanding === 0 ? "—" : money(inv.outstanding) }}
            </span>
          </button>
          <div v-if="openInvoice === inv.id" class="px-3.5 pb-3 text-xs">
            <p v-if="inv.status_mismatch" class="text-amber-800 mb-2">
              The invoice is marked <strong>{{ inv.invoice_status === "paid" ? "Paid" : "Unpaid" }}</strong>, but according to its Payment Receipts it is <strong>{{ INVOICE_STATE[inv.state].label }}</strong>.
            </p>
            <p v-if="!inv.receipts.length" class="text-gray-400">No Payment Receipts for this invoice yet.</p>
            <ul v-else class="space-y-1">
              <li v-for="r in inv.receipts" :key="r.id" class="flex flex-wrap justify-between gap-x-3 bg-gray-50 rounded-md px-2.5 py-1.5">
                <span class="text-brand-dark font-medium">{{ r.receipt_number }} <span class="text-gray-400 font-normal">· {{ formatDate(r.date) }}</span></span>
                <span>
                  {{ money(r.amount) }}
                  <span v-if="r.pph23_amount" class="text-gray-400">+ PPh 23 {{ money(r.pph23_amount) }}</span>
                </span>
              </li>
            </ul>
            <RouterLink
              v-if="can('invoice-edit')"
              :to="{ name: 'admin.invoices.edit', params: { id: inv.id } }"
              class="inline-block mt-2 text-[#0C51D9] font-semibold hover:underline"
            >Open invoice →</RouterLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
