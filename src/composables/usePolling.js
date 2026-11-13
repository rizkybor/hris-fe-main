import { onBeforeUnmount, onMounted } from "vue";

export function usePolling(fn, intervalMs, { immediate = false } = {}) {
  let timer = null;
  let missed = false;
  let stopped = false;

  const tick = () => {
    if (document.visibilityState === "hidden") {
      missed = true;
      return;
    }
    fn();
  };
  const start = () => {
    clearInterval(timer);
    timer = setInterval(tick, intervalMs);
  };
  const onVisible = () => {
    if (document.visibilityState === "visible" && missed && !stopped) {
      missed = false;
      fn();
    }
  };
  const pause = () => {
    stopped = true;
    clearInterval(timer);
  };
  const resume = () => {
    stopped = false;
    start();
  };

  onMounted(() => {
    if (immediate) fn();
    start();
    document.addEventListener("visibilitychange", onVisible);
  });
  onBeforeUnmount(() => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  });
  return { pause, resume };
}
