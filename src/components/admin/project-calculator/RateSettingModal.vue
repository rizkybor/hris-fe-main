<script setup>
import { ref, computed, onMounted } from "vue";
import { X, Users2Icon, Loader2, WalletIcon, LayersIcon, ServerIcon, ClockIcon } from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { useCompanyFinanceStore } from "@/stores/companyFinance";
import { storeToRefs } from "pinia";
import { formatRupiah } from "@/utils/formatUtils";

const emit = defineEmits(["close", "saved"]);
const store = useProjectCalculatorStore();
const financeStore = useCompanyFinanceStore();
const { rateSetting, saving } = storeToRefs(store);
const { statistics: financeStatistics, loadingStatistics } = storeToRefs(financeStore);

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
  await financeStore.fetchStatistics();

  form.value = {
    selected_fixed_cost_ids: [...(rateSetting.value.selected_fixed_cost_ids || [])],
    selected_sdm_resource_ids: [...(rateSetting.value.selected_sdm_resource_ids || [])],
    selected_infrastructure_tool_ids: [...(rateSetting.value.selected_infrastructure_tool_ids || [])],
    margin_multiplier: rateSetting.value.margin_multiplier,
    pm_overhead_percent: rateSetting.value.pm_overhead_percent,
    default_infra_setup_cost: rateSetting.value.default_infra_setup_cost,
  };
});

const fixedCostItems = computed(() => financeStatistics.value?.fixed_cost?.items ?? []);
const sdmResourceItems = computed(() => financeStatistics.value?.sdm_resource?.items ?? []);
const infrastructureItems = computed(() => financeStatistics.value?.infrastructure?.items ?? []);

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

const previewTeamSize = computed(() => form.value.selected_sdm_resource_ids.length);

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
</script>

<template>
  <div class="fixed inset-0 backdrop-blur-sm bg-black/30 z-[90] flex items-center justify-center p-4" @click.self="emit('close')">
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <div class="p-6 border-b border-[#DCDEDD] flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
            <Users2Icon class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Rate Setup Tim</h3>
            <p class="text-brand-light text-sm">Pilih item dari Operational Cost untuk membentuk biaya tim</p>
          </div>
        </div>
        <button @click="emit('close')" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 space-y-6 overflow-y-auto">
        <p v-if="errorMessage" class="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {{ errorMessage }}
        </p>

        <div v-if="loadingStatistics" class="text-center py-8 text-sm text-gray-400">Memuat data Operational Cost...</div>

        <template v-else>
          <!-- Fixed Cost picker -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <WalletIcon class="w-4 h-4 text-blue-600" />
              <h4 class="text-brand-dark text-sm font-bold">Fixed Cost</h4>
            </div>
            <div class="border border-[#DCDEDD] rounded-[12px] divide-y divide-[#F1F1F1] max-h-40 overflow-y-auto">
              <label
                v-for="item in fixedCostItems"
                :key="item.id"
                class="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    :checked="form.selected_fixed_cost_ids.includes(item.id)"
                    @change="toggle(form.selected_fixed_cost_ids, item.id)"
                    class="w-4 h-4 rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9] flex-shrink-0"
                  />
                  <span class="text-sm text-brand-dark font-medium truncate">{{ item.financial_items }}</span>
                </span>
                <span class="text-xs text-gray-500 flex-shrink-0">{{ formatRupiah(item.actual) }}</span>
              </label>
              <p v-if="fixedCostItems.length === 0" class="text-center py-4 text-xs text-gray-400">Belum ada item Fixed Cost</p>
            </div>
          </div>

          <!-- SDM Resource picker -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <LayersIcon class="w-4 h-4 text-violet-600" />
              <h4 class="text-brand-dark text-sm font-bold">SDM Resource</h4>
            </div>
            <div class="border border-[#DCDEDD] rounded-[12px] divide-y divide-[#F1F1F1] max-h-40 overflow-y-auto">
              <label
                v-for="item in sdmResourceItems"
                :key="item.id"
                class="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    :checked="form.selected_sdm_resource_ids.includes(item.id)"
                    @change="toggle(form.selected_sdm_resource_ids, item.id)"
                    class="w-4 h-4 rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9] flex-shrink-0"
                  />
                  <span class="text-sm text-brand-dark font-medium truncate">{{ item.sdm_component }}</span>
                  <span v-if="item.productive_hours_per_month" class="text-xs text-gray-400 flex-shrink-0">({{ item.productive_hours_per_month }} jam/bln)</span>
                </span>
                <span class="text-xs text-gray-500 flex-shrink-0">{{ formatRupiah(item.actual) }}</span>
              </label>
              <p v-if="sdmResourceItems.length === 0" class="text-center py-4 text-xs text-gray-400">Belum ada SDM Resource</p>
            </div>
          </div>

          <!-- Infrastructure Tools picker -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <ServerIcon class="w-4 h-4 text-orange-600" />
              <h4 class="text-brand-dark text-sm font-bold">Infrastructure Tools</h4>
            </div>
            <div class="border border-[#DCDEDD] rounded-[12px] divide-y divide-[#F1F1F1] max-h-40 overflow-y-auto">
              <label
                v-for="item in infrastructureItems"
                :key="item.id"
                class="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    :checked="form.selected_infrastructure_tool_ids.includes(item.id)"
                    @change="toggle(form.selected_infrastructure_tool_ids, item.id)"
                    class="w-4 h-4 rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9] flex-shrink-0"
                  />
                  <span class="text-sm text-brand-dark font-medium truncate">{{ item.tech_stack_component }}</span>
                </span>
                <span class="text-xs text-gray-500 flex-shrink-0">{{ formatRupiah(item.monthly_fee) }}/bln</span>
              </label>
              <p v-if="infrastructureItems.length === 0" class="text-center py-4 text-xs text-gray-400">Belum ada Infrastructure Tool</p>
            </div>
          </div>
        </template>

        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-[#F1F1F1]">
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">Multiplier Margin Jual</label>
            <input v-model.number="form.margin_multiplier" type="number" min="1" step="0.1" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">PM Overhead Default (%)</label>
            <input v-model.number="form.pm_overhead_percent" type="number" min="0" max="100" step="0.5" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
          <div class="col-span-2">
            <label class="block text-sm font-semibold text-brand-dark mb-1">Biaya Setup Infrastruktur Default (Rp)</label>
            <input v-model.number="form.default_infra_setup_cost" type="number" min="0" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
        </div>

        <!-- Live preview -->
        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-[#F1F1F1]">
          <div class="p-3 rounded-[12px] bg-gray-50 border border-[#F1F1F1]">
            <p class="text-xs text-gray-500 font-medium">Total Biaya Operasional Tim / Bulan</p>
            <p class="text-brand-dark text-base font-bold mt-1">{{ formatRupiah(previewTeamMonthlyCost) }}</p>
          </div>
          <div class="p-3 rounded-[12px] bg-gray-50 border border-[#F1F1F1]">
            <p class="text-xs text-gray-500 font-medium flex items-center gap-1">
              <ClockIcon class="w-3 h-3" /> Total Jam Produktif Tim / Bulan
            </p>
            <p class="text-brand-dark text-base font-bold mt-1">{{ previewProductiveHours }} jam &middot; {{ previewTeamSize }} orang</p>
          </div>
          <div class="p-3 rounded-[12px] bg-blue-50 border border-blue-100">
            <p class="text-xs text-blue-600 font-medium">Rate Cost / Jam (preview)</p>
            <p class="text-blue-900 text-base font-bold mt-1">{{ formatRupiah(previewRateCost) }}</p>
          </div>
          <div class="p-3 rounded-[12px] bg-indigo-50 border border-indigo-100">
            <p class="text-xs text-indigo-600 font-medium">Rate Jual / Jam (preview)</p>
            <p class="text-indigo-900 text-base font-bold mt-1">{{ formatRupiah(previewRateSell) }}</p>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-[#DCDEDD] flex gap-3 justify-end flex-shrink-0">
        <button @click="emit('close')" :disabled="saving" class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 transition-all px-6 py-3">
          <span class="text-brand-dark text-sm font-semibold">Batal</span>
        </button>
        <button
          @click="submit"
          :disabled="saving"
          class="rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all blue-gradient blue-btn-shadow px-6 py-3 flex items-center gap-2 disabled:opacity-50"
        >
          <Loader2 v-if="saving" class="w-4 h-4 text-white animate-spin" />
          <span class="text-brand-white text-sm font-semibold">{{ saving ? "Menyimpan..." : "Simpan Rate Setup" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
