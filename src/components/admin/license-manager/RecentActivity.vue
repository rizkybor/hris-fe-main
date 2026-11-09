<script setup>
// Overview panel: the latest tracking events of every product. While the
// endpoint is missing or failing it shows a quiet "Not available yet"
// state (no toast).
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Activity, PlugZap, RefreshCw, Inbox } from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import {
  eventLabel,
  eventToneClass,
  platformLabel,
  relativeTime,
  formatDateTime,
} from "@/components/admin/license-manager/licenseHelpers";
import { eventIcon } from "@/components/admin/license-manager/licenseEventIcons";

const props = defineProps({
  limit: { type: Number, default: 15 },
});

const store = useLicenseManagerStore();
const router = useRouter();

const items = ref([]);
const state = ref("loading"); // loading | ready | unavailable

const load = async () => {
  state.value = "loading";
  try {
    items.value = await store.fetchRecentEvents({ limit: props.limit });
    state.value = "ready";
  } catch {
    items.value = [];
    state.value = "unavailable";
  }
};
onMounted(load);
defineExpose({ reload: load });

// Who / where: the admin for admin actions, else the device.
const actor = (e) => {
  if (e.admin?.name) return `by ${e.admin.name}`;
  const parts = [e.device_name, e.platform ? platformLabel(e.platform) : null].filter(Boolean);
  return parts.join(" · ");
};

const canOpen = (e) => !!(e.license?.id && e.product?.code && e.event !== "deleted");

const open = (e) => {
  if (!canOpen(e)) return;
  router.push({ name: "admin.license-manager.licenses.detail", params: { product: e.product.code, id: e.license.id } });
};
</script>

<template>
  <section class="bg-white border border-[#DCDEDD] rounded-[16px] shadow-sm flex flex-col min-w-0">
    <header class="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#F1F1F1]">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 rounded-[10px] bg-violet-50 text-violet-600 ring-1 ring-violet-100 flex items-center justify-center shrink-0">
          <Activity class="w-[18px] h-[18px]" />
        </div>
        <div class="min-w-0">
          <h4 class="text-brand-dark text-sm font-bold">Recent activity</h4>
          <p class="text-xs text-brand-light">Latest events across all products</p>
        </div>
      </div>
      <button
        v-if="state === 'ready'"
        type="button"
        @click="load"
        class="p-2 rounded-lg border border-[#DCDEDD] hover:border-violet-400 hover:bg-violet-50/40 transition-all"
        title="Refresh"
        aria-label="Refresh activity"
      >
        <RefreshCw class="w-3.5 h-3.5 text-gray-500" />
      </button>
    </header>

    <div v-if="state === 'loading'" class="p-5 space-y-4">
      <div v-for="i in 5" :key="i" class="flex items-center gap-3">
        <Skeleton width="32px" height="32px" rounded="999px" />
        <div class="flex-1 space-y-1.5">
          <Skeleton width="60%" height="12px" />
          <Skeleton width="40%" height="10px" />
        </div>
        <Skeleton width="48px" height="10px" />
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
      <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
        <Inbox class="w-6 h-6 text-gray-400" />
      </div>
      <p class="text-sm font-semibold text-brand-dark">No activity yet</p>
      <p class="text-xs text-brand-light">Activations and admin changes will show up here.</p>
    </div>

    <ul v-else class="divide-y divide-[#F1F1F1]">
      <li v-for="e in items" :key="e.id">
        <component
          :is="canOpen(e) ? 'button' : 'div'"
          :type="canOpen(e) ? 'button' : undefined"
          @click="open(e)"
          class="w-full flex items-center gap-3 px-5 py-3 text-left"
          :class="canOpen(e) ? 'hover:bg-violet-50/40 transition-colors' : ''"
        >
          <div class="w-8 h-8 rounded-full ring-1 flex items-center justify-center shrink-0" :class="eventToneClass(e)">
            <component :is="eventIcon(e)" class="w-4 h-4" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-brand-dark truncate">{{ eventLabel(e) }}</p>
            <p class="text-xs text-brand-light truncate">
              {{ e.license?.licensee_name || e.license?.key || "-" }}<template v-if="actor(e)"> · {{ actor(e) }}</template>
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[11px] text-brand-light whitespace-nowrap" :title="formatDateTime(e.created_at)">
              {{ relativeTime(e.created_at) }}
            </span>
            <ProductIcon v-if="e.product" :product="e.product" :size="22" :title="e.product.name" />
          </div>
        </component>
      </li>
    </ul>
  </section>
</template>
