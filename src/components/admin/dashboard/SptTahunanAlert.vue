<script setup>
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { isCompanySignatory } from "@/utils/signatories";
import { AlertTriangle, ExternalLink } from "lucide-vue-next";

// Yearly reminder for the company's directors to file their personal
// annual tax return (SPT Tahunan PPh Orang Pribadi) on Coretax. Shown only
// in February-March, since the filing deadline is 31 March -- purely
// client-side, nothing to fetch.
const CORETAX_URL = "https://coretaxdjp.pajak.go.id";

const authStore = useAuthStore();

const today = new Date();
const isFilingSeason = [1, 2].includes(today.getMonth());

const visible = computed(() => isFilingSeason && isCompanySignatory(authStore.user?.name));

const deadline = new Date(today.getFullYear(), 2, 31);
const daysLeft = Math.ceil((deadline - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);

const deadlineLabel = deadline.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
</script>

<template>
  <div
    v-if="visible"
    class="flex flex-col sm:flex-row sm:items-center gap-4 rounded-[14px] border border-amber-300 bg-amber-50 px-5 py-4"
  >
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 shrink-0">
        <AlertTriangle class="w-5 h-5 text-amber-600" />
      </div>
      <div class="min-w-0">
        <p class="text-amber-900 font-bold">Buka Aplikasi Coretax - Segera Lakukan SPT Tahunan</p>
        <p class="text-amber-800 text-sm mt-0.5">
          Batas pelaporan SPT Tahunan PPh Orang Pribadi adalah <strong>{{ deadlineLabel }}</strong>
          <template v-if="daysLeft > 0"> ({{ daysLeft }} hari lagi)</template>
          <template v-else> (hari ini)</template>.
          Jika telat, akan dikenakan denda.
        </p>
      </div>
    </div>
    <a
      :href="CORETAX_URL"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shrink-0"
    >
      Buka Coretax
      <ExternalLink class="w-4 h-4" />
    </a>
  </div>
</template>
