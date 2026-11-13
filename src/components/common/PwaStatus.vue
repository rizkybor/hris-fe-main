<script setup>
// Installed-app status: "new version available" (reload when ready) and
// "no connection". The service worker is checked for updates hourly and
// whenever the tab comes back.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import { RefreshCw, WifiOff, Wifi } from "lucide-vue-next";

const HOUR = 60 * 60 * 1000;
let registration = null;
let timer = 0;
const checkUpdate = () => {
  if (registration && !document.hidden && navigator.onLine) registration.update().catch(() => {});
};

const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    registration = reg || null;
    timer = window.setInterval(checkUpdate, HOUR);
  },
});
const reloading = ref(false);
const reload = () => {
  reloading.value = true;
  updateServiceWorker(true);
};

const offline = ref(typeof navigator !== "undefined" && navigator.onLine === false);
const backOnline = ref(false);
let backTimer = 0;
const onOffline = () => {
  offline.value = true;
  backOnline.value = false;
};
const onOnline = () => {
  if (!offline.value) return;
  offline.value = false;
  backOnline.value = true;
  window.clearTimeout(backTimer);
  backTimer = window.setTimeout(() => (backOnline.value = false), 2500);
};

onMounted(() => {
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", checkUpdate);
});
onBeforeUnmount(() => {
  window.removeEventListener("offline", onOffline);
  window.removeEventListener("online", onOnline);
  document.removeEventListener("visibilitychange", checkUpdate);
  window.clearInterval(timer);
  window.clearTimeout(backTimer);
});
</script>

<template>
  <div class="fixed z-[120] inset-x-0 top-[calc(64px+env(safe-area-inset-top))] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
    <Transition name="ui-pop">
      <div
        v-if="offline || backOnline"
        role="status"
        class="pointer-events-auto inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-ui-small font-medium shadow-ui-overlay"
        :class="offline ? 'bg-ui-ink text-white' : 'bg-ui-ok text-white'"
      >
        <component :is="offline ? WifiOff : Wifi" class="w-4 h-4 shrink-0" />
        {{ offline ? $t("common.pwa.offline") : $t("common.pwa.backOnline") }}
      </div>
    </Transition>

    <Transition name="ui-pop">
      <div
        v-if="needRefresh"
        role="alert"
        class="pointer-events-auto w-full max-w-[420px] flex items-center gap-3 bg-ui-ink text-white rounded-[12px] pl-4 pr-2 py-2 shadow-ui-overlay"
      >
        <RefreshCw class="w-4 h-4 shrink-0 text-[#84ADFF]" />
        <div class="flex-1 min-w-0">
          <p class="text-ui-small font-medium">{{ $t("common.pwa.updateTitle") }}</p>
          <p class="text-ui-cap text-white/70">{{ $t("common.pwa.updateMessage") }}</p>
        </div>
        <button type="button" class="h-8 px-2.5 rounded-[8px] text-ui-small font-medium text-white/70 hover:text-white" @click="needRefresh = false">
          {{ $t("common.pwa.later") }}
        </button>
        <button
          type="button"
          class="ui-press h-8 px-3 rounded-[8px] bg-white text-ui-ink text-ui-small font-semibold disabled:opacity-60"
          :disabled="reloading"
          @click="reload"
        >
          {{ $t("common.pwa.reload") }}
        </button>
      </div>
    </Transition>
  </div>
</template>
