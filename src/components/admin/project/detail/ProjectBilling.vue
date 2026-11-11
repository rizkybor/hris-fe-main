<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { ReceiptText, Eye, EyeOff, CheckCircle2, AlertTriangle, Clock, ChevronDown } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah } from "@/utils/formatUtils";
import { can } from "@/helpers/permissionHelper";
import { UiAlert, UiBadge, UiButton, UiEmpty, UiStat, rowNumber } from "@/components/ui";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

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

// Presentation only: verdict / invoice state -> tone (labels stay above).
const STATUS_TONE = { settled: "ok", outstanding: "warn", overpaid: "bad", not_invoiced: "neutral" };
const VERDICT_BOX = {
  ok: "bg-ui-ok-soft text-ui-ok",
  warn: "bg-ui-warn-soft text-ui-warn",
  bad: "bg-ui-bad-soft text-ui-bad",
  neutral: "bg-ui-subtle text-ui-text",
};
const INVOICE_TONE = { paid: "ok", partial: "warn", unpaid: "bad", overpaid: "bad", cancelled: "neutral" };
const verdictBox = computed(() => VERDICT_BOX[STATUS_TONE[data.value?.status] || "neutral"]);
const outstandingClass = (v) => (v > 0 ? "text-ui-warn font-medium" : v < 0 ? "text-ui-bad font-medium" : "text-ui-faint");

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
  <div class="space-y-4">
    <!-- Heading + amount visibility toggle -->
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-ui-h2 text-ui-ink">Billing &amp; Payments</h3>
        <p class="text-ui-cap text-ui-muted mt-0.5">This project's invoices compared with payments from Payment Receipts</p>
      </div>
      <UiButton
        variant="secondary"
        size="sm"
        :icon="visible ? EyeOff : Eye"
        class="shrink-0"
        :title="visible ? 'Hide amounts' : 'Show amounts'"
        :aria-label="visible ? 'Hide amounts' : 'Show amounts'"
        @click="visible = !visible"
      >
        <span class="hidden sm:inline">{{ visible ? "Hide amounts" : "Show amounts" }}</span>
      </UiButton>
    </div>

    <!-- Loading -->
    <template v-if="loading && !data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <UiStat v-for="l in ['Project Value', 'Total Invoiced', 'Total Paid', 'Outstanding']" :key="l" :label="l" loading />
      </div>
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3" aria-busy="true">
        <Skeleton v-for="i in 3" :key="i" height="18px" />
        <span class="sr-only">Loading billing data...</span>
      </div>
    </template>

    <div v-else-if="failed" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty compact :icon="AlertTriangle" title="Couldn't load billing data.">
        <UiButton variant="secondary" size="sm" @click="load">Try again</UiButton>
      </UiEmpty>
    </div>

    <template v-else-if="data">
      <!-- Verdict -->
      <div class="inline-flex items-center gap-2 rounded-ui-control px-3 py-2 text-ui-small font-medium" :class="verdictBox">
        <component :is="status.icon" class="w-4 h-4 shrink-0" />
        <span>{{ status.label }}</span>
      </div>

      <!-- Figures -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ui-stagger">
        <UiStat label="Project Value" :value="money(data.project_value)" :hint="`Not invoiced yet ${money(data.not_invoiced)}`" />
        <UiStat label="Total Invoiced" :value="money(data.invoiced_total)">
          <template #hint>DPP {{ money(data.invoiced_subtotal) }}<template v-if="data.invoiced_percent !== null"> · {{ data.invoiced_percent }}% of project value</template></template>
        </UiStat>
        <UiStat label="Total Paid" tone="ok" :value="money(data.paid_total)">
          <template #hint>
            <template v-if="data.paid_percent !== null">{{ data.paid_percent }}% of invoiced</template>
            <template v-if="data.pph23_withheld"> · incl. PPh 23 {{ money(data.pph23_withheld) }}</template>
          </template>
        </UiStat>
        <UiStat
          :label="data.outstanding < 0 ? 'Overpaid' : 'Outstanding'"
          :tone="data.outstanding > 0 ? 'warn' : data.outstanding < 0 ? 'bad' : ''"
          :value="money(Math.abs(data.outstanding))"
          hint="Invoiced − paid"
        />
      </div>

      <UiAlert v-if="data.mismatch_count" tone="warn">
        {{ data.mismatch_count }} invoice{{ data.mismatch_count === 1 ? " is" : "s are" }} marked Paid/Unpaid differently from {{ data.mismatch_count === 1 ? "its" : "their" }} Payment Receipts — please check and update the invoice status.
      </UiAlert>

      <section class="bg-ui-surface border border-ui-line rounded-ui-card">
        <div class="px-5 sm:px-6 pt-5 pb-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-ui-h2 text-ui-ink">Invoices &amp; receipts</h3>
            <span class="text-ui-cap text-ui-muted tabular-nums">{{ data.invoices.length }} invoice{{ data.invoices.length === 1 ? "" : "s" }}</span>
          </div>

          <!-- Progress of the project value -->
          <div v-if="bar">
            <div class="flex h-2 rounded-full overflow-hidden bg-ui-subtle gap-[2px]">
              <div v-if="bar.paid" class="h-full bg-ui-ok" :style="{ width: `${bar.paid}%` }"></div>
              <div v-if="bar.invoiced" class="h-full bg-ui-warn" :style="{ width: `${bar.invoiced}%` }"></div>
            </div>
            <p class="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-ui-cap text-ui-muted tabular-nums">
              <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-sm bg-ui-ok"></span>Paid {{ Math.round(bar.paid) }}%</span>
              <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-sm bg-ui-warn"></span>Invoiced, not yet paid {{ Math.round(bar.invoiced) }}%</span>
              <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-sm bg-ui-line-strong"></span>Not invoiced yet {{ Math.round(bar.rest) }}%</span>
            </p>
          </div>
        </div>

        <!-- Per invoice -->
        <UiEmpty
          v-if="!data.invoices.length"
          :icon="ReceiptText"
          title="No invoices yet"
          message="Select this project when creating an Invoice for it to appear here."
          class="border-t border-ui-line"
        />

        <template v-else>
          <!-- Desktop / tablet: numbered table, rows expand to their receipts -->
          <div class="hidden md:block overflow-x-auto border-t border-ui-line">
            <table class="w-full border-collapse">
              <thead>
                <tr class="text-ui-cap font-medium text-ui-muted">
                  <th scope="col" class="w-11 pl-5 pr-0 h-10 text-left font-medium">#</th>
                  <th scope="col" class="px-4 h-10 text-left font-medium">Invoice</th>
                  <th scope="col" class="px-4 h-10 text-right font-medium">Invoiced</th>
                  <th scope="col" class="px-4 h-10 text-right font-medium">Paid</th>
                  <th scope="col" class="px-4 h-10 text-right font-medium">Outstanding</th>
                  <th scope="col" class="pl-4 pr-5 h-10 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(inv, index) in data.invoices" :key="inv.id">
                  <tr
                    class="border-t border-ui-line cursor-pointer hover:bg-ui-hover transition-colors"
                    :class="{ 'opacity-60': inv.state === 'cancelled' }"
                    :aria-expanded="openInvoice === inv.id"
                    @click="openInvoice = openInvoice === inv.id ? null : inv.id"
                  >
                    <td class="pl-5 pr-0 h-14 text-ui-cap text-ui-faint tabular-nums">{{ rowNumber(index) }}</td>
                    <td class="px-4 py-2.5">
                      <div class="flex items-center gap-2 min-w-0">
                        <ChevronDown class="w-4 h-4 text-ui-faint shrink-0 transition-transform" :class="{ 'rotate-180': openInvoice === inv.id }" />
                        <div class="min-w-0">
                          <p class="text-ui-small font-mono text-ui-ink truncate">{{ inv.invoice_number }}</p>
                          <p class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(inv.date) }} · {{ inv.receipts.length }} receipt{{ inv.receipts.length === 1 ? "" : "s" }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 text-right text-ui-small text-ui-ink tabular-nums whitespace-nowrap">{{ money(inv.total) }}</td>
                    <td class="px-4 text-right text-ui-small text-ui-ok tabular-nums whitespace-nowrap">{{ money(inv.paid) }}</td>
                    <td class="px-4 text-right text-ui-small tabular-nums whitespace-nowrap" :class="outstandingClass(inv.outstanding)">
                      {{ inv.outstanding === 0 ? "—" : money(inv.outstanding) }}
                    </td>
                    <td class="pl-4 pr-5">
                      <span class="inline-flex items-center gap-1.5">
                        <UiBadge :tone="INVOICE_TONE[inv.state] || 'neutral'" dot>{{ INVOICE_STATE[inv.state].label }}</UiBadge>
                        <AlertTriangle v-if="inv.status_mismatch" class="w-3.5 h-3.5 text-ui-warn" :title="`Invoice status: ${inv.invoice_status}`" />
                      </span>
                    </td>
                  </tr>
                  <tr v-if="openInvoice === inv.id" class="bg-ui-subtle/70">
                    <td></td>
                    <td colspan="5" class="px-4 pb-3 pt-1 text-ui-cap">
                      <p v-if="inv.status_mismatch" class="text-ui-warn mb-2">
                        The invoice is marked <strong>{{ inv.invoice_status === "paid" ? "Paid" : "Unpaid" }}</strong>, but according to its Payment Receipts it is <strong>{{ INVOICE_STATE[inv.state].label }}</strong>.
                      </p>
                      <p v-if="!inv.receipts.length" class="text-ui-muted py-1">No Payment Receipts for this invoice yet.</p>
                      <ul v-else class="divide-y divide-ui-line">
                        <li v-for="r in inv.receipts" :key="r.id" class="flex flex-wrap items-center justify-between gap-x-3 py-1.5">
                          <span class="inline-flex items-center gap-2 text-ui-text">
                            <ReceiptText class="w-3.5 h-3.5 text-ui-faint" />
                            <span class="font-mono">{{ r.receipt_number }}</span>
                            <span class="text-ui-muted">· {{ formatDate(r.date) }}</span>
                          </span>
                          <span class="tabular-nums text-ui-ink">
                            {{ money(r.amount) }}
                            <span v-if="r.pph23_amount" class="text-ui-muted">+ PPh 23 {{ money(r.pph23_amount) }}</span>
                          </span>
                        </li>
                      </ul>
                      <RouterLink
                        v-if="can('invoice-edit')"
                        :to="{ name: 'admin.invoices.edit', params: { id: inv.id } }"
                        class="inline-block mt-2 text-ui-accent font-medium hover:underline"
                      >Open invoice →</RouterLink>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Phones: stacked invoice cards -->
          <ul class="md:hidden divide-y divide-ui-line border-t border-ui-line">
            <li v-for="(inv, index) in data.invoices" :key="inv.id" :class="{ 'opacity-60': inv.state === 'cancelled' }">
              <button
                type="button"
                class="w-full text-left px-4 py-3.5 active:bg-ui-hover"
                :aria-expanded="openInvoice === inv.id"
                @click="openInvoice = openInvoice === inv.id ? null : inv.id"
              >
                <div class="flex items-start gap-2">
                  <span class="text-ui-cap text-ui-faint tabular-nums w-5 shrink-0 pt-px">{{ rowNumber(index) }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-ui-small font-mono text-ui-ink truncate">{{ inv.invoice_number }}</p>
                    <p class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(inv.date) }} · {{ inv.receipts.length }} receipt{{ inv.receipts.length === 1 ? "" : "s" }}</p>
                  </div>
                  <UiBadge :tone="INVOICE_TONE[inv.state] || 'neutral'" dot>{{ INVOICE_STATE[inv.state].label }}</UiBadge>
                  <AlertTriangle v-if="inv.status_mismatch" class="w-3.5 h-3.5 text-ui-warn mt-1" :title="`Invoice status: ${inv.invoice_status}`" />
                  <ChevronDown class="w-4 h-4 text-ui-faint mt-0.5 transition-transform" :class="{ 'rotate-180': openInvoice === inv.id }" />
                </div>
                <dl class="grid grid-cols-3 gap-2 mt-2.5 pl-7 text-ui-cap">
                  <div><dt class="text-ui-muted">Invoiced</dt><dd class="text-ui-ink tabular-nums">{{ money(inv.total) }}</dd></div>
                  <div><dt class="text-ui-muted">Paid</dt><dd class="text-ui-ok tabular-nums">{{ money(inv.paid) }}</dd></div>
                  <div class="text-right"><dt class="text-ui-muted">Outstanding</dt><dd class="tabular-nums" :class="outstandingClass(inv.outstanding)">{{ inv.outstanding === 0 ? "—" : money(inv.outstanding) }}</dd></div>
                </dl>
              </button>
              <div v-if="openInvoice === inv.id" class="px-4 pb-3.5 pl-11 text-ui-cap">
                <p v-if="inv.status_mismatch" class="text-ui-warn mb-2">
                  The invoice is marked <strong>{{ inv.invoice_status === "paid" ? "Paid" : "Unpaid" }}</strong>, but according to its Payment Receipts it is <strong>{{ INVOICE_STATE[inv.state].label }}</strong>.
                </p>
                <p v-if="!inv.receipts.length" class="text-ui-muted">No Payment Receipts for this invoice yet.</p>
                <ul v-else class="space-y-1">
                  <li v-for="r in inv.receipts" :key="r.id" class="flex flex-wrap justify-between gap-x-3 bg-ui-subtle rounded-md px-2.5 py-1.5">
                    <span class="text-ui-text"><span class="font-mono">{{ r.receipt_number }}</span> <span class="text-ui-muted">· {{ formatDate(r.date) }}</span></span>
                    <span class="tabular-nums text-ui-ink">
                      {{ money(r.amount) }}
                      <span v-if="r.pph23_amount" class="text-ui-muted">+ PPh 23 {{ money(r.pph23_amount) }}</span>
                    </span>
                  </li>
                </ul>
                <RouterLink
                  v-if="can('invoice-edit')"
                  :to="{ name: 'admin.invoices.edit', params: { id: inv.id } }"
                  class="inline-block mt-2 text-ui-accent font-medium hover:underline"
                >Open invoice →</RouterLink>
              </div>
            </li>
          </ul>
        </template>
      </section>
    </template>
  </div>
</template>
