<script setup>
// Service worker + "no connection" banner. Updates apply by themselves:
// a new version takes over in the background, and the next page change
// (e.g. login -> dashboard) loads it in full. Registration waits until the
// page has loaded and the browser is idle, so it never slows the first screen.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { registerSW } from "virtual:pwa-register";
import { WifiOff, Wifi } from "lucide-vue-next";

const router = useRouter();
const HOUR = 60 * 60 * 1000;
let registration = null;
let timer = 0;
const checkUpdate = () => {
  if (registration && !document.hidden && navigator.onLine) registration.update().catch(() => {});
};

const register = () => {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      registration = reg || null;
      timer = window.setInterval(checkUpdate, HOUR);
    },
  });
};
let startTimer = 0;
const registerWhenIdle = () => {
  startTimer = window.setTimeout(() => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(register, { timeout: 5000 });
    else register();
  }, 3000);
};

// A newer version took control (not the first install): the code running
// now is outdated, so the next navigation does a full load instead.
const hadController = typeof navigator !== "undefined" && !!navigator.serviceWorker?.controller;
let outdated = false;
const onControllerChange = () => {
  if (hadController) outdated = true;
};

// A full load to `path`, at most once per 10 s (no loops while offline).
const hardNavigate = (path) => {
  try {
    const last = Number(sessionStorage.getItem("hris-hard-nav") || 0);
    if (Date.now() - last < 10_000) return false;
    sessionStorage.setItem("hris-hard-nav", String(Date.now()));
  } catch {
    /* storage unavailable */
  }
  window.location.assign(path);
  return true;
};
const removeGuard = router.beforeEach((to) => {
  if (outdated && navigator.onLine && hardNavigate(to.fullPath)) return false;
});
// After a deploy, an old page may ask for a file that no longer exists.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i;
const removeErrorHandler = router.onError((error, to) => {
  if (CHUNK_ERROR.test(error?.message || "") && navigator.onLine) hardNavigate(to.fullPath);
});
const onPreloadError = (event) => {
  if (!navigator.onLine) return;
  event.preventDefault();
  hardNavigate(window.location.pathname + window.location.search);
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
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    if (document.readyState === "complete") registerWhenIdle();
    else window.addEventListener("load", registerWhenIdle, { once: true });
  }
  window.addEventListener("vite:preloadError", onPreloadError);
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", checkUpdate);
});
onBeforeUnmount(() => {
  removeGuard();
  removeErrorHandler();
  navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
  window.removeEventListener("vite:preloadError", onPreloadError);
  window.removeEventListener("offline", onOffline);
  window.removeEventListener("online", onOnline);
  document.removeEventListener("visibilitychange", checkUpdate);
  window.clearInterval(timer);
  window.clearTimeout(startTimer);
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
  </div>
</template>
