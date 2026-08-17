<script setup>
import { ref, onMounted } from "vue";
import { X, Users2Icon, Loader2 } from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { storeToRefs } from "pinia";
import { formatRupiah } from "@/utils/formatUtils";

const emit = defineEmits(["close", "saved"]);
const store = useProjectCalculatorStore();
const { rateSetting, saving } = storeToRefs(store);

const form = ref({
  team_monthly_cost: 0,
  productive_hours_per_person: 0,
  team_size: 0,
  margin_multiplier: 0,
  pm_overhead_percent: 0,
  default_infra_setup_cost: 0,
});
const errorMessage = ref("");

onMounted(() => {
  form.value = {
    team_monthly_cost: rateSetting.value.team_monthly_cost,
    productive_hours_per_person: rateSetting.value.productive_hours_per_person,
    team_size: rateSetting.value.team_size,
    margin_multiplier: rateSetting.value.margin_multiplier,
    pm_overhead_percent: rateSetting.value.pm_overhead_percent,
    default_infra_setup_cost: rateSetting.value.default_infra_setup_cost,
  };
});

const previewRateCost = () => {
  const total = form.value.productive_hours_per_person * form.value.team_size;
  return total > 0 ? form.value.team_monthly_cost / total : 0;
};

const previewRateSell = () => previewRateCost() * form.value.margin_multiplier;

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
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
      <div class="p-6 border-b border-[#DCDEDD] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
            <Users2Icon class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Rate Setup Tim</h3>
            <p class="text-brand-light text-sm">Baseline biaya operasional &amp; rate/jam</p>
          </div>
        </div>
        <button @click="emit('close')" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 space-y-5 overflow-y-auto">
        <p v-if="errorMessage" class="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {{ errorMessage }}
        </p>

        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-semibold text-brand-dark mb-1">Total Biaya Operasional Tim / Bulan (Rp)</label>
            <input v-model.number="form.team_monthly_cost" type="number" min="0" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">Jam Produktif / Orang / Bulan</label>
            <input v-model.number="form.productive_hours_per_person" type="number" min="1" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">Jumlah Orang di Tim</label>
            <input v-model.number="form.team_size" type="number" min="1" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
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

        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-[#F1F1F1]">
          <div class="p-3 rounded-[12px] bg-blue-50 border border-blue-100">
            <p class="text-xs text-blue-600 font-medium">Rate Cost / Jam (preview)</p>
            <p class="text-blue-900 text-base font-bold mt-1">{{ formatRupiah(previewRateCost()) }}</p>
          </div>
          <div class="p-3 rounded-[12px] bg-indigo-50 border border-indigo-100">
            <p class="text-xs text-indigo-600 font-medium">Rate Jual / Jam (preview)</p>
            <p class="text-indigo-900 text-base font-bold mt-1">{{ formatRupiah(previewRateSell()) }}</p>
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
