<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Pencil,
  PrinterIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
} from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { storeToRefs } from "pinia";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import { calculateMarketingFee } from "@/utils/marketingFee";
import { formatToClientTimezone } from "@/helpers/format";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiBadge, UiChips, UiEmpty } from "@/components/ui";
import { rowNumber } from "@/components/ui/table";

const route = useRoute();
const router = useRouter();
const store = useProjectCalculatorStore();
const { pphTypes } = storeToRefs(store);

const calc = ref(null);
const loading = ref(true);

// Infrastructure Tools can be shown per month or per year. Snapshots saved
// before annual_fee was captured (or a tool with only one of the two fees
// filled in) fall back to monthly x 12 / annual / 12, flagged as estimates.
const infraPeriod = ref("monthly");

const infraFee = (tool) => {
  const monthly = Number(tool.monthly_fee || 0);
  const annual = Number(tool.annual_fee || 0);
  if (infraPeriod.value === "annual") {
    return annual > 0 ? { amount: annual, estimated: false } : { amount: Math.round(monthly * 12), estimated: monthly > 0 };
  }
  return monthly > 0 ? { amount: monthly, estimated: false } : { amount: Math.round(annual / 12), estimated: annual > 0 };
};

const infraTotal = computed(() =>
  (calc.value?.rate_setting_snapshot?.infrastructure_tools ?? []).reduce((sum, tool) => sum + infraFee(tool).amount, 0)
);

const infraUnit = computed(() => (infraPeriod.value === "annual" ? "/thn" : "/bln"));

onMounted(async () => {
  loading.value = true;
  try {
    const [calculation] = await Promise.all([store.fetchCalculation(route.params.id), store.fetchPphTypes()]);
    calc.value = calculation;
  } finally {
    loading.value = false;
  }
});

const pphTypeLabel = computed(
  () => pphTypes.value.find((t) => t.value === calc.value?.pph_type)?.label ?? "PPh"
);

const scenarioMeta = {
  feature: { label: "New Feature Estimate", tone: "accent" },
  build: { label: "Build from Scratch Estimate", tone: "info" },
  landing_page: { label: "Landing Page Estimate", tone: "outline" },
};

// Presentation only.
const infraPeriodOptions = [
  { value: "monthly", label: "Bulanan" },
  { value: "annual", label: "Tahunan" },
];

const landingPageItem = computed(() => (calc.value?.scenario === "landing_page" ? calc.value.items?.[0] : null));

const displayTotal = computed(() => (calc.value?.include_ppn ? calc.value.total_with_ppn : calc.value?.grand_total));

// Reference only -- a fair starting point for whoever brought in this deal
// (Marketing / B2B-B2C Sales), never added to the client-facing total.
const marketingFee = computed(() => calculateMarketingFee(calc.value?.grand_total));

const printQuote = () => window.print();
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      class="print:hidden"
      :title="calc?.name || 'Estimate Detail'"
      :subtitle="calc ? `Estimate Detail · ${scenarioMeta[calc.scenario].label}` : 'Project cost estimate summary'"
    >
      <template #eyebrow>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
          aria-label="Back"
          @click="router.push({ name: 'admin.project-calculator.dashboard' })"
        >
          <ArrowLeft class="w-4 h-4" /> Project Calculator
        </button>
      </template>
      <template #actions>
        <UiButton variant="secondary" :icon="PrinterIcon" @click="printQuote">Cetak / PDF</UiButton>
        <UiButton
          v-if="can('project-calculator-edit')"
          :icon="Pencil"
          :to="{ name: 'admin.project-calculator.edit', params: { id: route.params.id } }"
        >
          Edit
        </UiButton>
      </template>
    </UiPageHeader>

    <div v-if="loading" class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
      <Skeleton height="420px" rounded="12px" />
      <Skeleton height="300px" rounded="12px" />
    </div>

    <section v-else-if="!calc" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty title="Estimate not found." message="It may have been deleted." />
    </section>

    <!-- Printable quote document -->
    <div v-else id="quote-document" class="space-y-5">
      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <!-- Main document -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden print:border-0">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-ui-line">
            <div class="min-w-0">
              <p class="text-ui-over uppercase text-ui-muted mb-1">PT. Jendela Cakra Digital</p>
              <h2 class="text-ui-h2 text-ui-ink">{{ calc.name }}</h2>
              <UiBadge class="mt-1.5" :tone="scenarioMeta[calc.scenario].tone">{{ scenarioMeta[calc.scenario].label }}</UiBadge>
            </div>
            <div class="text-left sm:text-right space-y-1 text-ui-small shrink-0">
              <p v-if="calc.client_name" class="flex items-center gap-1.5 sm:justify-end text-ui-ink font-medium">
                <UserIcon class="w-3.5 h-3.5 text-ui-faint" /> {{ calc.client_name }}
              </p>
              <p class="flex items-center gap-1.5 sm:justify-end text-ui-muted tabular-nums">
                <CalendarIcon class="w-3.5 h-3.5 text-ui-faint" /> {{ formatToClientTimezone(calc.created_at, "dd MMM yyyy") }}
              </p>
              <p v-if="calc.creator?.name" class="text-ui-cap text-ui-faint">Dibuat oleh {{ calc.creator.name }}</p>
            </div>
          </div>

          <!-- Items table -->
          <template v-if="calc.scenario !== 'landing_page'">
          <!-- Phones: stacked rows -->
          <ul class="md:hidden divide-y divide-ui-line">
            <li v-for="(item, idx) in calc.items" :key="`m-${idx}`" class="flex items-start gap-3 px-5 py-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-4 pt-0.5">{{ rowNumber(idx) }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-small font-medium text-ui-ink">{{ item.name }}</p>
                <p class="text-ui-cap text-ui-muted tabular-nums mt-0.5">
                  {{ (item.base_hours ?? item.estimated_hours ?? 0).toFixed(1) }}h &times; {{ item.complexity_factor }}x = {{ item.total_hours_used.toFixed(1) }}h &middot; Buffer {{ item.buffer_percent }}%
                </p>
              </div>
              <p class="text-ui-small font-semibold text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(item.final_price) }}</p>
            </li>
          </ul>
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="text-ui-cap font-medium text-ui-muted">
                  <th class="w-11 pl-5 sm:pl-6 pr-0 h-10 text-left font-medium border-b border-ui-line">#</th>
                  <th class="px-3 h-10 text-left font-medium border-b border-ui-line">{{ calc.scenario === "feature" ? "Feature" : "Module" }}</th>
                  <th class="px-3 h-10 text-right font-medium border-b border-ui-line whitespace-nowrap">Jam Dasar</th>
                  <th class="px-3 h-10 text-right font-medium border-b border-ui-line">Faktor</th>
                  <th class="px-3 h-10 text-right font-medium border-b border-ui-line whitespace-nowrap">Jam Terpakai</th>
                  <th class="px-3 h-10 text-right font-medium border-b border-ui-line">Subtotal</th>
                  <th class="px-3 h-10 text-right font-medium border-b border-ui-line">Buffer</th>
                  <th class="pl-3 pr-5 sm:pr-6 h-10 text-right font-medium border-b border-ui-line whitespace-nowrap">Final Price</th>
                </tr>
              </thead>
              <tbody class="text-ui-small text-ui-text tabular-nums">
                <tr v-for="(item, idx) in calc.items" :key="idx" class="border-b border-ui-line last:border-b-0">
                  <td class="pl-5 sm:pl-6 pr-0 py-3 text-ui-cap text-ui-faint">{{ rowNumber(idx) }}</td>
                  <td class="px-3 py-3 font-medium text-ui-ink min-w-[140px]">{{ item.name }}</td>
                  <td class="px-3 py-3 text-right">{{ (item.base_hours ?? item.estimated_hours ?? 0).toFixed(1) }}h</td>
                  <td class="px-3 py-3 text-right">{{ item.complexity_factor }}x</td>
                  <td class="px-3 py-3 text-right">{{ item.total_hours_used.toFixed(1) }}h</td>
                  <td class="px-3 py-3 text-right whitespace-nowrap">{{ formatRupiah(item.subtotal) }}</td>
                  <td class="px-3 py-3 text-right">{{ item.buffer_percent }}%</td>
                  <td class="pl-3 pr-5 sm:pr-6 py-3 text-right font-semibold text-ui-ink whitespace-nowrap">{{ formatRupiah(item.final_price) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          </template>

          <!-- Landing Page breakdown table -->
          <div v-else-if="landingPageItem" class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="text-ui-cap font-medium text-ui-muted">
                  <th class="w-11 pl-5 sm:pl-6 pr-0 h-10 text-left font-medium border-b border-ui-line">#</th>
                  <th class="px-3 h-10 text-left font-medium border-b border-ui-line">Component</th>
                  <th class="px-3 h-10 text-left font-medium border-b border-ui-line">Choice</th>
                  <th class="pl-3 pr-5 sm:pr-6 h-10 text-right font-medium border-b border-ui-line">Price</th>
                </tr>
              </thead>
              <tbody class="text-ui-small text-ui-text">
                <tr class="border-b border-ui-line">
                  <td class="pl-5 sm:pl-6 pr-0 py-3 text-ui-cap text-ui-faint tabular-nums">1</td>
                  <td class="px-3 py-3 font-medium text-ui-ink">Server</td>
                  <td class="px-3 py-3 capitalize">{{ landingPageItem.server_type }}</td>
                  <td class="pl-3 pr-5 sm:pr-6 py-3 text-right font-semibold text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(landingPageItem.server_cost) }}</td>
                </tr>
                <tr class="border-b border-ui-line">
                  <td class="pl-5 sm:pl-6 pr-0 py-3 text-ui-cap text-ui-faint tabular-nums">2</td>
                  <td class="px-3 py-3 font-medium text-ui-ink">Design</td>
                  <td class="px-3 py-3 capitalize">{{ landingPageItem.design_type }}</td>
                  <td class="pl-3 pr-5 sm:pr-6 py-3 text-right font-semibold text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(landingPageItem.design_cost) }}</td>
                </tr>
                <tr class="border-b border-ui-line last:border-b-0">
                  <td class="pl-5 sm:pl-6 pr-0 py-3 text-ui-cap text-ui-faint tabular-nums">3</td>
                  <td class="px-3 py-3 font-medium text-ui-ink">Development</td>
                  <td class="px-3 py-3 tabular-nums">
                    {{ landingPageItem.estimated_hours }}h &times; {{ formatRupiah(landingPageItem.rate_developer) }} &times; {{ landingPageItem.developer_count }} dev
                  </td>
                  <td class="pl-3 pr-5 sm:pr-6 py-3 text-right font-semibold text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(landingPageItem.development_cost) }}</td>
                </tr>
                <tr v-for="(item, idx) in landingPageItem.additional_items" :key="idx" class="border-b border-ui-line last:border-b-0">
                  <td class="pl-5 sm:pl-6 pr-0 py-3 text-ui-cap text-ui-faint tabular-nums">{{ idx + 4 }}</td>
                  <td class="px-3 py-3 font-medium text-ui-ink">{{ item.description }}</td>
                  <td class="px-3 py-3 tabular-nums">{{ item.amount }} &times; {{ formatRupiah(item.price) }}</td>
                  <td class="pl-3 pr-5 sm:pr-6 py-3 text-right font-semibold text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="px-5 sm:px-6 py-4 border-t border-ui-line space-y-4">
            <div class="flex items-start gap-2 text-ui-small text-ui-text">
              <ClockIcon class="w-4 h-4 text-ui-faint shrink-0 mt-px" />
              <span>Estimated duration: <strong class="font-semibold text-ui-ink tabular-nums">{{ calc.estimated_duration_weeks ?? "-" }} weeks</strong><template v-if="calc.estimated_duration_weeks"> (&asymp; {{ (calc.estimated_duration_weeks / 4.33).toFixed(1).replace(".", ",") }} months)</template><template v-if="calc.allocated_developers"> &middot; {{ calc.allocated_developers }} developer{{ calc.allocated_developers > 1 ? "s" : "" }}</template></span>
            </div>

            <div v-if="calc.notes">
              <p class="text-ui-over uppercase text-ui-muted mb-1">Catatan</p>
              <p class="text-ui-small text-ui-ink whitespace-pre-line">{{ calc.notes }}</p>
            </div>
          </div>
        </section>

        <!-- Totals -->
        <aside class="space-y-4 xl:sticky xl:top-4">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4">
            <h2 class="text-ui-h3 text-ui-ink mb-3">Summary</h2>
            <dl class="space-y-2 text-ui-small">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">Subtotal</dt>
                <dd class="text-ui-ink tabular-nums">{{ formatRupiah(calc.subtotal) }}</dd>
              </div>
              <div v-if="calc.scenario !== 'landing_page'" class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">Buffer Risiko</dt>
                <dd class="text-ui-ink tabular-nums">{{ formatRupiah(calc.buffer_total) }}</dd>
              </div>
              <div v-if="calc.scenario === 'build'" class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">PM Overhead ({{ calc.pm_overhead_percent }}%)</dt>
                <dd class="text-ui-ink tabular-nums">{{ formatRupiah(calc.pm_overhead_total) }}</dd>
              </div>
              <div v-if="calc.scenario === 'build'" class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">Infrastructure Setup</dt>
                <dd class="text-ui-ink tabular-nums">{{ formatRupiah(calc.infra_setup_cost) }}</dd>
              </div>
              <div v-if="calc.scenario === 'landing_page'" class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">Margin Jual ({{ calc.margin_percent }}%)</dt>
                <dd class="text-ui-ink tabular-nums">{{ formatRupiah(calc.margin_total) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3 pt-2 border-t border-ui-line">
                <dt class="text-ui-ink font-medium">Total Estimate</dt>
                <dd class="text-ui-ink font-medium tabular-nums">{{ formatRupiah(calc.grand_total) }}</dd>
              </div>
              <div v-if="calc.include_ppn" class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">PPN ({{ calc.ppn_percent }}%)</dt>
                <dd class="text-ui-muted tabular-nums">{{ formatRupiah(calc.total_with_ppn - calc.grand_total) }}</dd>
              </div>
            </dl>
            <div class="flex items-baseline justify-between gap-3 mt-3 pt-3 border-t border-ui-line">
              <span class="text-ui-h3 text-ui-ink">{{ calc.include_ppn ? "Total + PPN" : "Grand Total" }}</span>
              <span class="text-ui-h2 text-ui-ink tabular-nums">{{ formatRupiah(calc.include_ppn ? calc.total_with_ppn : displayTotal) }}</span>
            </div>

            <template v-if="calc.include_pph">
              <dl class="space-y-2 text-ui-small mt-3 pt-3 border-t border-ui-line">
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-ui-bad">{{ pphTypeLabel }} ({{ calc.pph_percent }}%)</dt>
                  <dd class="text-ui-bad tabular-nums">-{{ formatRupiah(calc.pph_amount) }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-ui-ok font-semibold">Diterima Bersih</dt>
                  <dd class="text-ui-ok font-semibold text-ui-body tabular-nums">{{ formatRupiah(calc.net_received) }}</dd>
                </div>
              </dl>
              <p class="text-ui-cap text-ui-faint mt-1.5">Dipotong PPh oleh klien sesuai peraturan perpajakan yang berlaku</p>
            </template>
          </section>

          <section class="bg-ui-subtle border border-ui-line rounded-ui-card px-5 py-3.5 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-ui-small font-medium text-ui-ink">Fee Marketing / B2B-B2C Sales</p>
              <p class="text-ui-cap text-ui-muted">Reference only, not added to total</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-ui-small font-semibold text-ui-ink tabular-nums">{{ marketingFee.percent }}%</p>
              <p class="text-ui-cap text-ui-muted tabular-nums">{{ formatRupiah(marketingFee.amount) }}</p>
            </div>
          </section>
        </aside>
      </div>

      <!-- Team Rate Setup snapshot -- frozen as it stood when this estimate
           was saved, not the live/shared setting (which may have changed
           since). Older estimates saved before this existed simply won't
           have one. -->
      <section
        v-if="calc.rate_setting_snapshot && calc.scenario !== 'landing_page'"
        class="bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden print:border-0"
      >
        <div class="px-5 sm:px-6 pt-4 pb-3 border-b border-ui-line">
          <h2 class="text-ui-h3 text-ui-ink">Team Rate Setup</h2>
          <p class="text-ui-cap text-ui-muted">Snapshot saved with this estimate</p>
        </div>

        <dl class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ui-line border-b border-ui-line">
          <div class="bg-ui-surface px-5 sm:px-6 py-3">
            <dt class="text-ui-cap text-ui-muted">Team Size</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums">{{ calc.rate_setting_snapshot.team_size }} orang</dd>
          </div>
          <div class="bg-ui-surface px-5 sm:px-6 py-3 min-w-0">
            <dt class="text-ui-cap text-ui-muted">Biaya Tim / Bulan</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums truncate">{{ formatRupiah(calc.rate_setting_snapshot.team_monthly_cost) }}</dd>
          </div>
          <div class="bg-ui-surface px-5 sm:px-6 py-3">
            <dt class="text-ui-cap text-ui-muted">Jam Produktif / Bulan</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums">{{ calc.rate_setting_snapshot.total_productive_hours_per_month }}h</dd>
          </div>
          <div class="bg-ui-surface px-5 sm:px-6 py-3">
            <dt class="text-ui-cap text-ui-muted">Margin</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums">{{ calc.rate_setting_snapshot.margin_multiplier }}x</dd>
          </div>
        </dl>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 px-5 sm:px-6 py-4 text-ui-small">
          <div v-if="calc.rate_setting_snapshot.sdm_resources?.length" class="min-w-0">
            <p class="text-ui-h3 text-ui-ink mb-2">SDM Resources</p>
            <ul class="space-y-1.5">
              <li v-for="r in calc.rate_setting_snapshot.sdm_resources" :key="r.id" class="flex items-center justify-between gap-3 text-ui-text">
                <span class="min-w-0 truncate">{{ r.name }}<span v-if="r.field" class="text-ui-faint"> ({{ r.field }})</span></span>
                <span class="text-ui-ink tabular-nums shrink-0">{{ formatRupiah(r.actual) }}</span>
              </li>
            </ul>
          </div>
          <div v-if="calc.rate_setting_snapshot.fixed_costs?.length" class="min-w-0">
            <p class="text-ui-h3 text-ui-ink mb-2">Fixed Costs</p>
            <ul class="space-y-1.5">
              <li v-for="f in calc.rate_setting_snapshot.fixed_costs" :key="f.id" class="flex items-center justify-between gap-3 text-ui-text">
                <span class="min-w-0 truncate">{{ f.name }}</span>
                <span class="text-ui-ink tabular-nums shrink-0">{{ formatRupiah(f.actual) }}</span>
              </li>
            </ul>
          </div>
          <div v-if="calc.rate_setting_snapshot.infrastructure_tools?.length" class="min-w-0">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-ui-h3 text-ui-ink">Infrastructure Tools</p>
              <UiChips v-model="infraPeriod" :options="infraPeriodOptions" size="sm" class="!mx-0 !px-0 print:hidden" />
            </div>
            <ul class="space-y-1.5">
              <li v-for="t in calc.rate_setting_snapshot.infrastructure_tools" :key="t.id" class="flex items-center justify-between gap-3 text-ui-text">
                <span class="min-w-0 truncate">{{ t.name }}<span v-if="t.vendor" class="text-ui-faint"> ({{ t.vendor }})</span></span>
                <span
                  class="text-ui-ink tabular-nums shrink-0"
                  :title="infraFee(t).estimated ? (infraPeriod === 'annual' ? 'Estimasi: biaya bulanan × 12' : 'Estimasi: biaya tahunan ÷ 12') : ''"
                >
                  {{ formatRupiah(infraFee(t).amount) }}{{ infraUnit }}<span v-if="infraFee(t).estimated" class="text-ui-faint"> est.</span>
                </span>
              </li>
              <li class="flex items-center justify-between gap-3 border-t border-ui-line pt-1.5 mt-1.5">
                <span class="text-ui-ink font-medium">Total</span>
                <span class="text-ui-ink font-semibold tabular-nums">{{ formatRupiah(infraTotal) }}{{ infraUnit }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  #quote-document,
  #quote-document * {
    visibility: visible;
  }
  #quote-document {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
</style>
