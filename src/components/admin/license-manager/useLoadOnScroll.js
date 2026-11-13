import { onBeforeUnmount, watch } from "vue";

export function useLoadOnScroll(root, sentinel, loadMore, canLoad) {
  let observer = null;

  const stop = () => {
    observer?.disconnect();
    observer = null;
  };

  const start = () => {
    stop();
    if (!sentinel.value || typeof IntersectionObserver === "undefined") return;
    observer = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting) || !canLoad()) return;
        await loadMore();
        // Observing again re-checks: a page that doesn't fill the panel
        // loads the next one right away.
        if (canLoad()) start();
      },
      { root: root.value || null, rootMargin: "0px 0px 24px 0px" }
    );
    observer.observe(sentinel.value);
  };

  // The sentinel appears / disappears with the list.
  watch([root, sentinel], start, { flush: "post" });
  onBeforeUnmount(stop);

  return { restart: start };
}
