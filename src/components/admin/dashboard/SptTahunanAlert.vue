<script setup>
import { UiButton } from "@/components/ui";
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
  <div v-if="visible" class="ui-anim-fade-up flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-ui-card border border-ui-warn/30 bg-ui-warn-soft px-4 sm:px-5 py-3.5">
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <AlertTriangle class="w-5 h-5 text-ui-warn shrink-0 mt-px" />
      <div class="min-w-0">
        <p class="text-ui-h3 text-ui-ink">Buka Aplikasi Coretax - Segera Lakukan SPT Tahunan</p>
        <p class="text-ui-small text-ui-text mt-0.5">
          Batas pelaporan SPT Tahunan PPh Orang Pribadi adalah <strong class="font-medium text-ui-ink">{{ deadlineLabel }}</strong>
          <template v-if="daysLeft > 0"> ({{ daysLeft }} hari lagi)</template>
          <template v-else> (hari ini)</template>.
          Jika telat, akan dikenakan denda.
        </p>
      </div>
    </div>
    <UiButton :href="CORETAX_URL" target="_blank" rel="noopener noreferrer" variant="secondary" :icon-right="ExternalLink" class="shrink-0">Buka Coretax</UiButton>
  </div>
</template>
