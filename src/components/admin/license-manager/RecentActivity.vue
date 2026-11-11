<script setup>
// Overview panel: the latest tracking events of every product. While the
// endpoint is missing or failing it shows a quiet "Not available yet"
// state (no toast).
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Activity, PlugZap, RefreshCw, Inbox } from "lucide-vue-next";
import { useLoadOnScroll } from "@/components/admin/license-manager/useLoadOnScroll";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import { UiEmpty, UiSpinner } from "@/components/ui";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import {
  eventLabel,
  eventToneClass,
  platformLabel,
  relativeTime,
  formatDateTime,
} from "@/components/admin/license-manager/licenseHelpers";
import { eventIcon } from "@/components/admin/license-manager/licenseEventIcons";

// limit: events per load (the first one, then each scroll to the end).
const props = defineProps({
  limit: { type: Number, default: 10 },
});

const store = useLicenseManagerStore();
const router = useRouter();

const items = ref([]);
const state = ref("loading"); // loading | ready | unavailable
// Load on scroll: a full page means there may be more.
const hasMore = ref(false);
const loadingMore = ref(false);
const scroller = ref(null);
const sentinel = ref(null);
const lastId = computed(() => items.value[items.value.length - 1]?.id ?? null);

const load = async () => {
  state.value = "loading";
  try {
    items.value = await store.fetchRecentEvents({ limit: props.limit });
    hasMore.value = items.value.length >= props.limit;
    state.value = "ready";
  } catch {
    items.value = [];
    hasMore.value = false;
    state.value = "unavailable";
  }
};

const loadMore = async () => {
  loadingMore.value = true;
  try {
    const more = await store.fetchRecentEvents({ limit: props.limit, beforeId: lastId.value });
    items.value = [...items.value, ...more.filter((e) => !items.value.some((x) => x.id === e.id))];
    hasMore.value = more.length >= props.limit;
  } catch {
    // Scrolling again retries.
  } finally {
    loadingMore.value = false;
  }
};

useLoadOnScroll(scroller, sentinel, loadMore, () => hasMore.value && !loadingMore.value && state.value === "ready");
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
  <section class="bg-ui-surface border border-ui-line rounded-ui-card flex flex-col min-w-0 overflow-hidden">
    <header class="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-ui-line">
      <div class="flex items-center gap-2.5 min-w-0">
        <Activity class="w-4 h-4 text-ui-faint shrink-0" />
        <div class="min-w-0">
          <h4 class="text-ui-h2 text-ui-ink">Recent activity</h4>
          <p class="text-ui-cap text-ui-muted">Latest events across all products</p>
        </div>
      </div>
      <button
        v-if="state === 'ready'"
        type="button"
        @click="load"
        class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink transition-colors"
        title="Refresh"
        aria-label="Refresh activity"
      >
        <RefreshCw class="w-3.5 h-3.5" />
      </button>
    </header>

    <div v-if="state === 'loading'" class="p-5 space-y-4">
      <div v-for="i in 5" :key="i" class="flex items-center gap-3">
        <Skeleton width="28px" height="28px" rounded="999px" />
        <div class="flex-1 space-y-1.5">
          <Skeleton width="60%" height="12px" />
          <Skeleton width="40%" height="10px" />
        </div>
        <Skeleton width="48px" height="10px" />
      </div>
    </div>

    <UiEmpty v-else-if="state === 'unavailable'" :icon="PlugZap" title="Not available yet" message="This panel will fill in once the server supports it." compact>
      <button type="button" @click="load" class="inline-flex items-center gap-1.5 text-ui-small font-medium text-ui-accent hover:underline">
        <RefreshCw class="w-3.5 h-3.5" /> Try again
      </button>
    </UiEmpty>

    <UiEmpty v-else-if="!items.length" :icon="Inbox" title="No activity yet" message="Activations and admin changes will show up here." compact />

    <div v-else ref="scroller" class="max-h-[460px] overflow-y-auto scroll-soft">
    <ul class="divide-y divide-ui-line">
      <li v-for="e in items" :key="e.id">
        <component
          :is="canOpen(e) ? 'button' : 'div'"
          :type="canOpen(e) ? 'button' : undefined"
          @click="open(e)"
          class="w-full flex items-center gap-3 px-5 py-3 text-left"
          :class="canOpen(e) ? 'hover:bg-ui-hover transition-colors' : ''"
        >
          <div class="w-7 h-7 rounded-full ring-1 flex items-center justify-center shrink-0" :class="eventToneClass(e)">
            <component :is="eventIcon(e)" class="w-3.5 h-3.5" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-ui-small font-medium text-ui-ink truncate">{{ eventLabel(e) }}</p>
            <p class="text-ui-cap text-ui-muted truncate">
              {{ e.license?.licensee_name || e.license?.key || "-" }}<template v-if="actor(e)"> · {{ actor(e) }}</template>
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-ui-cap text-ui-muted whitespace-nowrap" :title="formatDateTime(e.created_at)">
              {{ relativeTime(e.created_at) }}
            </span>
            <ProductIcon v-if="e.product" :product="e.product" :size="20" :title="e.product.name" />
          </div>
        </component>
      </li>
    </ul>
      <div ref="sentinel" class="h-px"></div>
      <div v-if="loadingMore" class="py-3">
        <UiSpinner size="16px" label="Loading more..." :center="false" class="justify-center" />
      </div>
      <p v-else-if="!hasMore && items.length > limit" class="py-3 text-center text-ui-cap text-ui-faint">That's all the activity</p>
    </div>
  </section>
</template>
