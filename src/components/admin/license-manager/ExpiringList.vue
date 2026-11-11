<script setup>
// Overview panel: licenses of every product that expire within `days`
// days, soonest first. While the endpoint is missing or failing it shows a
// quiet "Not available yet" state (no toast).
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Hourglass, CalendarClock, PlugZap, RefreshCw, ChevronRight } from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import { UiEmpty } from "@/components/ui";
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
  <section class="bg-ui-surface border border-ui-line rounded-ui-card flex flex-col min-w-0 overflow-hidden">
    <header class="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-ui-line">
      <div class="flex items-center gap-2.5 min-w-0">
        <Hourglass class="w-4 h-4 text-ui-faint shrink-0" />
        <div class="min-w-0">
          <h4 class="text-ui-h2 text-ui-ink">Expiring soon</h4>
          <p class="text-ui-cap text-ui-muted">Active licenses ending within {{ days }} days</p>
        </div>
      </div>
      <span
        v-if="state === 'ready' && items.length"
        class="inline-flex items-center h-[22px] px-2 rounded-md text-ui-cap font-medium bg-ui-warn-soft text-ui-warn tabular-nums"
      >
        {{ items.length }}
      </span>
    </header>

    <div v-if="state === 'loading'" class="p-5 space-y-4">
      <div v-for="i in 4" :key="i" class="flex items-center gap-3">
        <Skeleton width="32px" height="32px" rounded="8px" />
        <div class="flex-1 space-y-1.5">
          <Skeleton width="55%" height="12px" />
          <Skeleton width="35%" height="10px" />
        </div>
        <Skeleton width="72px" height="20px" rounded="6px" />
      </div>
    </div>

    <UiEmpty v-else-if="state === 'unavailable'" :icon="PlugZap" title="Not available yet" message="This panel will fill in once the server supports it." compact>
      <button type="button" @click="load" class="inline-flex items-center gap-1.5 text-ui-small font-medium text-ui-accent hover:underline">
        <RefreshCw class="w-3.5 h-3.5" /> Try again
      </button>
    </UiEmpty>

    <UiEmpty
      v-else-if="!items.length"
      :icon="CalendarClock"
      title="Nothing expiring"
      :message="`No active license ends in the next ${days} days.`"
      compact
    />

    <ul v-else class="divide-y divide-ui-line">
      <li v-for="license in items" :key="license.id">
        <button
          type="button"
          @click="open(license)"
          class="group w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-ui-hover transition-colors"
        >
          <ProductIcon :product="license.product" :size="32" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <p class="text-ui-small font-medium text-ui-ink truncate">{{ license.licensee_name || "-" }}</p>
              <span class="inline-flex items-center h-5 px-1.5 rounded-md text-ui-cap font-medium whitespace-nowrap shrink-0" :class="planChipClass(license.plan)">
                {{ planLabel(license) }}
              </span>
            </div>
            <p class="text-ui-cap text-ui-muted truncate">
              {{ license.product?.name || "-" }} · ends {{ formatDate(license.expires_at) }}
            </p>
          </div>
          <span class="inline-flex items-center h-[22px] px-2 rounded-md text-ui-cap font-medium whitespace-nowrap tabular-nums" :class="remainingBadgeClass(license)">
            {{ remainingLabel(license.remaining_days) }}
          </span>
          <ChevronRight class="w-4 h-4 text-ui-faint group-hover:text-ui-ink transition-colors shrink-0 hidden sm:block" />
        </button>
      </li>
    </ul>
  </section>
</template>
