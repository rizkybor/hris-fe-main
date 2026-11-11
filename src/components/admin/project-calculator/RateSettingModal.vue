<script setup>
import { ref, computed, onMounted } from "vue";
import { WalletIcon, LayersIcon, ServerIcon, ClockIcon } from "lucide-vue-next";
import { UiModal, UiButton, UiAlert, UiBadge, UiSpinner } from "@/components/ui";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { storeToRefs } from "pinia";
import { formatRupiah } from "@/utils/formatUtils";

const emit = defineEmits(["close", "saved"]);
const store = useProjectCalculatorStore();
const { rateSetting, saving } = storeToRefs(store);
// All items, "Digunakan" or not -- the team rate is set up independently of
// which items count toward the Operational Cost totals.
const options = ref({ fixed_costs: [], sdm_resources: [], infrastructure_tools: [] });
const loadingStatistics = ref(true);

const form = ref({
  selected_fixed_cost_ids: [],
  selected_sdm_resource_ids: [],
  selected_infrastructure_tool_ids: [],
  margin_multiplier: 0,
  pm_overhead_percent: 0,
  default_infra_setup_cost: 0,
});
const errorMessage = ref("");

onMounted(async () => {
  try {
    options.value = await store.fetchRateSettingOptions();
  } catch (error) {
    errorMessage.value = "Gagal memuat daftar item Operational Cost.";
  } finally {
    loadingStatistics.value = false;
  }

  form.value = {
    selected_fixed_cost_ids: [...(rateSetting.value.selected_fixed_cost_ids || [])],
    selected_sdm_resource_ids: [...(rateSetting.value.selected_sdm_resource_ids || [])],
    selected_infrastructure_tool_ids: [...(rateSetting.value.selected_infrastructure_tool_ids || [])],
    margin_multiplier: rateSetting.value.margin_multiplier,
    pm_overhead_percent: rateSetting.value.pm_overhead_percent,
    default_infra_setup_cost: rateSetting.value.default_infra_setup_cost,
  };
});

const fixedCostItems = computed(() => options.value.fixed_costs ?? []);
const sdmResourceItems = computed(() => options.value.sdm_resources ?? []);
const infrastructureItems = computed(() => options.value.infrastructure_tools ?? []);

const toggle = (list, id) => {
  const idx = list.indexOf(id);
  if (idx === -1) list.push(id);
  else list.splice(idx, 1);
};

// Live preview, mirrors the backend accessors exactly.
const previewTeamMonthlyCost = computed(() => {
  const fixedTotal = fixedCostItems.value
    .filter((i) => form.value.selected_fixed_cost_ids.includes(i.id))
    .reduce((sum, i) => sum + Number(i.actual || 0), 0);
  const sdmTotal = sdmResourceItems.value
    .filter((i) => form.value.selected_sdm_resource_ids.includes(i.id))
    .reduce((sum, i) => sum + Number(i.actual || 0), 0);
  const infraTotal = infrastructureItems.value
    .filter((i) => form.value.selected_infrastructure_tool_ids.includes(i.id))
    .reduce((sum, i) => sum + Number(i.monthly_fee || 0), 0);
  return fixedTotal + sdmTotal + infraTotal;
});

const previewProductiveHours = computed(() =>
  sdmResourceItems.value
    .filter((i) => form.value.selected_sdm_resource_ids.includes(i.id))
    .reduce((sum, i) => sum + Number(i.productive_hours_per_month || 0), 0)
);

const previewTeamSize = computed(
  () => sdmResourceItems.value.filter((i) => form.value.selected_sdm_resource_ids.includes(i.id)).length
);

const previewRateCost = computed(() =>
  previewProductiveHours.value > 0 ? previewTeamMonthlyCost.value / previewProductiveHours.value : 0
);
const previewRateSell = computed(() => previewRateCost.value * Number(form.value.margin_multiplier || 0));

const submit = async () => {
  errorMessage.value = "";
  try {
    await store.updateRateSetting(form.value);
    emit("saved");
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value =
      data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Gagal menyimpan rate setup.");
  }
};

// Presentation only: native number field (keeps v-model.number) in the field style.
const fieldClass =
  "w-full h-[38px] px-3 text-right tabular-nums bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const pickers = computed(() => [
  { key: "fixed", title: "Fixed Cost", icon: WalletIcon, items: fixedCostItems.value, list: form.value.selected_fixed_cost_ids, name: "financial_items", amount: (i) => formatRupiah(i.actual), empty: "No Fixed Cost items yet" },
  { key: "sdm", title: "SDM Resource", icon: LayersIcon, items: sdmResourceItems.value, list: form.value.selected_sdm_resource_ids, name: "sdm_component", amount: (i) => formatRupiah(i.actual), hours: true, empty: "No SDM Resource yet" },
  { key: "infra", title: "Infrastructure Tools", icon: ServerIcon, items: infrastructureItems.value, list: form.value.selected_infrastructure_tool_ids, name: "tech_stack_component", amount: (i) => `${formatRupiah(i.monthly_fee)}/bln`, empty: "No Infrastructure Tool yet" },
]);
</script>

<template>
  <UiModal
    :open="true"
    size="lg"
    title="Team Rate Setup"
    description="Select items from Operational Cost to build the team cost"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <UiAlert v-if="errorMessage" tone="bad">{{ errorMessage }}</UiAlert>

      <div v-if="loadingStatistics" class="flex items-center justify-center gap-2 py-6 text-ui-small text-ui-muted">
        <UiSpinner size="16px" :center="false" /> Memuat data Operational Cost...
      </div>

      <template v-else>
        <div v-for="picker in pickers" :key="picker.key">
          <div class="flex items-center gap-1.5 mb-2">
            <component :is="picker.icon" class="w-4 h-4 text-ui-faint" />
            <h3 class="text-ui-h3 text-ui-ink">{{ picker.title }}</h3>
            <span class="text-ui-cap text-ui-faint tabular-nums">{{ picker.list.length }}/{{ picker.items.length }}</span>
          </div>
          <div class="border border-ui-line rounded-ui-card divide-y divide-ui-line max-h-40 overflow-y-auto">
            <label
              v-for="item in picker.items"
              :key="item.id"
              class="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-ui-hover"
            >
              <span class="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  :checked="picker.list.includes(item.id)"
                  @change="toggle(picker.list, item.id)"
                  class="w-4 h-4 rounded border-ui-line-strong text-ui-accent focus:ring-ui-accent shrink-0"
                />
                <span class="text-ui-small text-ui-ink font-medium truncate">{{ item[picker.name] }}</span>
                <span v-if="picker.hours && item.productive_hours_per_month" class="text-ui-cap text-ui-faint shrink-0 tabular-nums">({{ item.productive_hours_per_month }} jam/bln)</span>
                <UiBadge v-if="item.status === 'inactive'" class="shrink-0" title="Tidak Digunakan di Operational Cost (tetap bisa dipilih)">Tidak Digunakan</UiBadge>
              </span>
              <span class="text-ui-cap text-ui-muted tabular-nums shrink-0">{{ picker.amount(item) }}</span>
            </label>
            <p v-if="picker.items.length === 0" class="text-center py-3.5 text-ui-cap text-ui-faint">{{ picker.empty }}</p>
          </div>
        </div>
      </template>

      <div class="grid grid-cols-2 gap-3 pt-4 border-t border-ui-line">
        <label class="block">
          <span class="block text-ui-small font-medium text-ui-ink mb-1.5">Multiplier Margin Jual</span>
          <input v-model.number="form.margin_multiplier" type="number" min="1" step="0.1" :class="fieldClass" />
        </label>
        <label class="block">
          <span class="block text-ui-small font-medium text-ui-ink mb-1.5">PM Overhead Default (%)</span>
          <input v-model.number="form.pm_overhead_percent" type="number" min="0" max="100" step="0.5" :class="fieldClass" />
        </label>
        <label class="block col-span-2">
          <span class="block text-ui-small font-medium text-ui-ink mb-1.5">Default Infrastructure Setup Cost (Rp)</span>
          <input v-model.number="form.default_infra_setup_cost" type="number" min="0" :class="fieldClass" />
        </label>
      </div>

      <!-- Live preview -->
      <dl class="grid grid-cols-2 gap-px bg-ui-line border border-ui-line rounded-ui-card overflow-hidden">
        <div class="bg-ui-subtle px-3.5 py-3 min-w-0">
          <dt class="text-ui-cap text-ui-muted">Total Team Operational Cost / Month</dt>
          <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(previewTeamMonthlyCost) }}</dd>
        </div>
        <div class="bg-ui-subtle px-3.5 py-3 min-w-0">
          <dt class="text-ui-cap text-ui-muted flex items-center gap-1"><ClockIcon class="w-3 h-3" /> Total Jam Produktif Tim / Bulan</dt>
          <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5">{{ previewProductiveHours }} jam &middot; {{ previewTeamSize }} orang</dd>
        </div>
        <div class="bg-ui-subtle px-3.5 py-3 min-w-0">
          <dt class="text-ui-cap text-ui-muted">Rate Cost / Jam (preview)</dt>
          <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(previewRateCost) }}</dd>
        </div>
        <div class="bg-ui-subtle px-3.5 py-3 min-w-0">
          <dt class="text-ui-cap text-ui-muted">Rate Jual / Jam (preview)</dt>
          <dd class="text-ui-body font-semibold text-ui-accent tabular-nums mt-0.5 truncate">{{ formatRupiah(previewRateSell) }}</dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <UiButton variant="secondary" :disabled="saving" @click="emit('close')">Cancel</UiButton>
      <UiButton :loading="saving" @click="submit">{{ saving ? "Saving..." : "Save Rate Setup" }}</UiButton>
    </template>
  </UiModal>
</template>
