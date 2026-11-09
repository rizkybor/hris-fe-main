<script setup>
// Overview panel: licenses of every product that expire within `days`
// days, soonest first. While the endpoint is missing or failing it shows a
// quiet "Not available yet" state (no toast).
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Hourglass, CalendarClock, PlugZap, RefreshCw, ChevronRight } from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import {
  planLabel,
  planChipClass,
  formatDate,
  remainingLabel,
  remainingBadgeClass,
} from "@/components/admin/license-manager/licenseHelpers";

const props = defineProps({
  days: { type: Number, default: 30 },
  limit: { type: Number, default: 10 },
});

const store = useLicenseManagerStore();
const router = useRouter();

const items = ref([]);
const state = ref("loading"); // loading | ready | unavailable

const load = async () => {
  state.value = "loading";
  try {
    items.value = await store.fetchExpiring({ days: props.days, limit: props.limit });
    state.value = "ready";
  } catch {
    items.value = [];
    state.value = "unavailable";
  }
};
onMounted(load);
defineExpose({ reload: load });

const open = (license) => {
  const code = license.product?.code;
  if (!code) return;
  router.push({ name: "admin.license-manager.licenses.detail", params: { product: code, id: license.id } });
};
</script>

<template>
  <section class="bg-white border border-[#DCDEDD] rounded-[16px] shadow-sm flex flex-col min-w-0">
    <header class="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#F1F1F1]">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 rounded-[10px] bg-amber-50 text-amber-600 ring-1 ring-amber-100 flex items-center justify-center shrink-0">
          <Hourglass class="w-[18px] h-[18px]" />
        </div>
        <div class="min-w-0">
          <h4 class="text-brand-dark text-sm font-bold">Expiring soon</h4>
          <p class="text-xs text-brand-light">Active licenses ending within {{ days }} days</p>
        </div>
      </div>
      <span v-if="state === 'ready' && items.length" class="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full tabular-nums">
        {{ items.length }}
      </span>
    </header>

    <div v-if="state === 'loading'" class="p-5 space-y-4">
      <div v-for="i in 4" :key="i" class="flex items-center gap-3">
        <Skeleton width="36px" height="36px" rounded="9px" />
        <div class="flex-1 space-y-1.5">
          <Skeleton width="55%" height="12px" />
          <Skeleton width="35%" height="10px" />
        </div>
        <Skeleton width="72px" height="20px" rounded="999px" />
      </div>
    </div>

    <div v-else-if="state === 'unavailable'" class="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
      <PlugZap class="w-8 h-8 text-gray-300 mb-2.5" />
      <p class="text-sm font-semibold text-brand-dark">Not available yet</p>
      <p class="text-xs text-brand-light mb-3">This panel will fill in once the server supports it.</p>
      <button type="button" @click="load" class="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700">
        <RefreshCw class="w-3.5 h-3.5" /> Try again
      </button>
    </div>

    <div v-else-if="!items.length" class="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
      <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
        <CalendarClock class="w-6 h-6 text-emerald-500" />
      </div>
      <p class="text-sm font-semibold text-brand-dark">Nothing expiring</p>
      <p class="text-xs text-brand-light">No active license ends in the next {{ days }} days.</p>
    </div>

    <ul v-else class="divide-y divide-[#F1F1F1]">
      <li v-for="license in items" :key="license.id">
        <button
          type="button"
          @click="open(license)"
          class="group w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-violet-50/40 transition-colors"
        >
          <ProductIcon :product="license.product" :size="36" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <p class="text-sm font-semibold text-brand-dark truncate">{{ license.licensee_name || "-" }}</p>
              <span class="text-[11px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0" :class="planChipClass(license.plan)">
                {{ planLabel(license) }}
              </span>
            </div>
            <p class="text-xs text-brand-light truncate">
              {{ license.product?.name || "-" }} · ends {{ formatDate(license.expires_at) }}
            </p>
          </div>
          <span class="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap tabular-nums" :class="remainingBadgeClass(license)">
            {{ remainingLabel(license.remaining_days) }}
          </span>
          <ChevronRight class="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors shrink-0 hidden sm:block" />
        </button>
      </li>
    </ul>
  </section>
</template>
