<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  CalculatorIcon,
  ArrowLeft,
  Pencil,
  PrinterIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
} from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import { formatToClientTimezone } from "@/helpers/format";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const route = useRoute();
const router = useRouter();
const store = useProjectCalculatorStore();

const calc = ref(null);
const loading = ref(true);

onMounted(async () => {
  loading.value = true;
  try {
    calc.value = await store.fetchCalculation(route.params.id);
  } finally {
    loading.value = false;
  }
});

const scenarioMeta = {
  feature: { label: "Estimasi Fitur Baru", class: "bg-blue-50 text-blue-700 border-blue-100" },
  build: { label: "Estimasi Bangun dari 0", class: "bg-violet-50 text-violet-700 border-violet-100" },
};

const displayTotal = computed(() => (calc.value?.include_ppn ? calc.value.total_with_ppn : calc.value?.grand_total));

const printQuote = () => window.print();
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header (hidden on print) -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 print:hidden">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <button
            @click="router.push({ name: 'admin.project-calculator.dashboard' })"
            class="w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-blue-400 transition-all"
          >
            <ArrowLeft class="w-5 h-5 text-gray-600" />
          </button>
          <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center">
            <CalculatorIcon class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 class="text-brand-dark text-xl font-bold">Detail Estimasi</h1>
            <p class="text-brand-light text-sm">Ringkasan estimasi biaya project</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="printQuote"
            class="border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 transition-all px-4 py-2.5 inline-flex items-center gap-2"
          >
            <PrinterIcon class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-semibold">Cetak / PDF</span>
          </button>
          <RouterLink
            v-if="can('project-calculator-edit')"
            :to="{ name: 'admin.project-calculator.edit', params: { id: route.params.id } }"
            class="rounded-[10px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all blue-gradient blue-btn-shadow px-4 py-2.5 inline-flex items-center gap-2"
          >
            <Pencil class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Edit</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <Skeleton height="140px" rounded="14px" />
      <Skeleton height="300px" rounded="14px" />
    </div>

    <!-- Printable quote document -->
    <div v-else-if="calc" id="quote-document" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 sm:p-8 print:border-0 print:rounded-none">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-[#DCDEDD]">
        <div>
          <p class="text-brand-light text-xs font-semibold uppercase tracking-wide mb-1">PT. Jendela Cakra Digital</p>
          <h2 class="text-brand-dark text-2xl font-extrabold">{{ calc.name }}</h2>
          <span class="inline-block mt-2 px-2.5 py-1 rounded-md text-xs font-semibold border" :class="scenarioMeta[calc.scenario].class">
            {{ scenarioMeta[calc.scenario].label }}
          </span>
        </div>
        <div class="text-left sm:text-right space-y-1 text-sm">
          <p v-if="calc.client_name" class="flex items-center gap-1.5 sm:justify-end text-brand-dark font-semibold">
            <UserIcon class="w-3.5 h-3.5 text-gray-400" /> {{ calc.client_name }}
          </p>
          <p class="flex items-center gap-1.5 sm:justify-end text-gray-500">
            <CalendarIcon class="w-3.5 h-3.5" /> {{ formatToClientTimezone(calc.created_at, "dd MMM yyyy") }}
          </p>
          <p v-if="calc.creator?.name" class="text-gray-400 text-xs">Dibuat oleh {{ calc.creator.name }}</p>
        </div>
      </div>

      <!-- Items table -->
      <div class="overflow-x-auto mt-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-[#F1F1F1]">
              <th class="py-2 pr-4">{{ calc.scenario === "feature" ? "Fitur" : "Modul" }}</th>
              <th class="py-2 pr-4 text-right">Jam Dasar</th>
              <th class="py-2 pr-4 text-right">Faktor</th>
              <th class="py-2 pr-4 text-right">Jam Terpakai</th>
              <th class="py-2 pr-4 text-right">Subtotal</th>
              <th class="py-2 pr-4 text-right">Buffer</th>
              <th class="py-2 text-right">Harga Akhir</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in calc.items" :key="idx" class="border-b border-[#F8F8F8]">
              <td class="py-3 pr-4 font-semibold text-brand-dark">{{ item.name }}</td>
              <td class="py-3 pr-4 text-right text-gray-600">
                {{ (item.base_hours ?? item.estimated_hours ?? 0).toFixed(1) }}h
              </td>
              <td class="py-3 pr-4 text-right text-gray-600">{{ item.complexity_factor }}x</td>
              <td class="py-3 pr-4 text-right text-gray-600">{{ item.total_hours_used.toFixed(1) }}h</td>
              <td class="py-3 pr-4 text-right text-gray-600">{{ formatRupiah(item.subtotal) }}</td>
              <td class="py-3 pr-4 text-right text-gray-600">{{ item.buffer_percent }}%</td>
              <td class="py-3 text-right font-bold text-brand-dark">{{ formatRupiah(item.final_price) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="flex justify-end mt-6">
        <div class="w-full sm:w-80 space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Subtotal</span>
            <span class="text-brand-dark font-medium">{{ formatRupiah(calc.subtotal) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Buffer Risiko</span>
            <span class="text-brand-dark font-medium">{{ formatRupiah(calc.buffer_total) }}</span>
          </div>
          <div v-if="calc.scenario === 'build'" class="flex items-center justify-between">
            <span class="text-gray-500">PM Overhead ({{ calc.pm_overhead_percent }}%)</span>
            <span class="text-brand-dark font-medium">{{ formatRupiah(calc.pm_overhead_total) }}</span>
          </div>
          <div v-if="calc.scenario === 'build'" class="flex items-center justify-between">
            <span class="text-gray-500">Setup Infrastruktur</span>
            <span class="text-brand-dark font-medium">{{ formatRupiah(calc.infra_setup_cost) }}</span>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-[#F1F1F1]">
            <span class="text-brand-dark font-bold">Total Estimasi</span>
            <span class="text-brand-dark font-bold">{{ formatRupiah(calc.grand_total) }}</span>
          </div>
          <div v-if="calc.include_ppn" class="flex items-center justify-between">
            <span class="text-gray-500">PPN ({{ calc.ppn_percent }}%)</span>
            <span class="text-gray-500">{{ formatRupiah(calc.total_with_ppn - calc.grand_total) }}</span>
          </div>
          <div v-if="calc.include_ppn" class="flex items-center justify-between pt-2 border-t border-[#F1F1F1]">
            <span class="text-indigo-700 text-base font-extrabold">Total + PPN</span>
            <span class="text-indigo-700 text-xl font-extrabold">{{ formatRupiah(calc.total_with_ppn) }}</span>
          </div>
          <div v-else class="flex items-center justify-between pt-1">
            <span class="text-brand-dark text-base font-extrabold">Grand Total</span>
            <span class="text-brand-dark text-xl font-extrabold">{{ formatRupiah(displayTotal) }}</span>
          </div>
        </div>
      </div>

      <div class="mt-6 flex items-center gap-2 p-3 rounded-[12px] bg-blue-50 border border-blue-100 text-sm w-fit">
        <ClockIcon class="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span class="text-blue-800">Estimasi durasi pengerjaan: <strong>{{ calc.estimated_duration_weeks ?? "-" }} minggu</strong></span>
      </div>

      <div v-if="calc.notes" class="mt-6 pt-6 border-t border-[#F1F1F1]">
        <p class="text-xs font-semibold text-gray-400 uppercase mb-1">Catatan</p>
        <p class="text-brand-dark text-sm whitespace-pre-line">{{ calc.notes }}</p>
      </div>
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
