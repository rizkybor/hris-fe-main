<script setup>
import { ref, onMounted } from "vue";
import { X, Globe, Loader2, ServerIcon, PaletteIcon, CodeIcon, TrendingUpIcon } from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { storeToRefs } from "pinia";

const emit = defineEmits(["close", "saved"]);
const store = useProjectCalculatorStore();
const { landingPageRateSetting, saving } = storeToRefs(store);

const form = ref({
  server_dedicated_price: 0,
  server_shared_price: 0,
  design_dedicated_price: 0,
  design_template_price: 0,
  default_rate_developer: 0,
  margin_percent: 0,
});
const errorMessage = ref("");

onMounted(() => {
  form.value = {
    server_dedicated_price: landingPageRateSetting.value.server_dedicated_price,
    server_shared_price: landingPageRateSetting.value.server_shared_price,
    design_dedicated_price: landingPageRateSetting.value.design_dedicated_price,
    design_template_price: landingPageRateSetting.value.design_template_price,
    default_rate_developer: landingPageRateSetting.value.default_rate_developer,
    margin_percent: landingPageRateSetting.value.margin_percent,
  };
});

const submit = async () => {
  errorMessage.value = "";
  try {
    await store.updateLandingPageRateSetting(form.value);
    emit("saved");
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value =
      data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Gagal menyimpan konfigurasi Landing Page.");
  }
};
</script>

<template>
  <div class="fixed inset-0 backdrop-blur-sm bg-black/30 z-[90] flex items-center justify-center p-4" @click.self="emit('close')">
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
      <div class="p-6 border-b border-[#DCDEDD] flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-emerald-50 rounded-[12px] flex items-center justify-center">
            <Globe class="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Landing Page Rate Setup</h3>
            <p class="text-brand-light text-sm">Configure the package pricing used by the Landing Page scenario</p>
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

        <div>
          <div class="flex items-center gap-2 mb-2">
            <ServerIcon class="w-4 h-4 text-emerald-600" />
            <h4 class="text-brand-dark text-sm font-bold">Server</h4>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Dedicated (Rp)</label>
              <input v-model.number="form.server_dedicated_price" type="number" min="0" step="10000" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Shared (Rp)</label>
              <input v-model.number="form.server_shared_price" type="number" min="0" step="10000" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center gap-2 mb-2">
            <PaletteIcon class="w-4 h-4 text-emerald-600" />
            <h4 class="text-brand-dark text-sm font-bold">Design</h4>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Dedicated (Rp)</label>
              <input v-model.number="form.design_dedicated_price" type="number" min="0" step="10000" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Template (Rp)</label>
              <input v-model.number="form.design_template_price" type="number" min="0" step="10000" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center gap-2 mb-2">
            <CodeIcon class="w-4 h-4 text-emerald-600" />
            <h4 class="text-brand-dark text-sm font-bold">Development</h4>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Default Rate Developer (Rp/jam)</label>
            <input v-model.number="form.default_rate_developer" type="number" min="0" step="1000" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
        </div>

        <div class="pt-2 border-t border-[#F1F1F1]">
          <div class="flex items-center gap-2 mb-2">
            <TrendingUpIcon class="w-4 h-4 text-emerald-600" />
            <h4 class="text-brand-dark text-sm font-bold">Margin Jual</h4>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Margin Jual Default (%)</label>
            <input v-model.number="form.margin_percent" type="number" min="0" step="1" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-[#DCDEDD] flex gap-3 justify-end flex-shrink-0">
        <button @click="emit('close')" :disabled="saving" class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 transition-all px-6 py-3">
          <span class="text-brand-dark text-sm font-semibold">Cancel</span>
        </button>
        <button
          @click="submit"
          :disabled="saving"
          class="rounded-[8px] hover:brightness-110 focus:ring-2 transition-all px-6 py-3 flex items-center gap-2 disabled:opacity-50"
          style="background-color: #059669; border: 1px solid #047857; color: #fff"
        >
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" style="color: #fff" />
          <span class="text-sm font-semibold" style="color: #fff">{{ saving ? "Saving..." : "Save Configuration" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
