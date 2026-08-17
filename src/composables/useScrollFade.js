import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";

/**
 * Tracks whether a horizontally-scrollable element has more content hidden
 * off the left/right edge, so callers can show a directional scroll hint
 * (fade + chevron) that disappears once the user actually reaches the end.
 */
export function useScrollFade() {
  const scrollRef = ref(null);
  const showLeftFade = ref(false);
  const showRightFade = ref(false);

  const updateFade = () => {
    const el = scrollRef.value;
    if (!el) return;
    showLeftFade.value = el.scrollLeft > 4;
    showRightFade.value = el.scrollWidth - el.clientWidth - el.scrollLeft > 4;
  };

  onMounted(() => {
    nextTick(updateFade);
    window.addEventListener("resize", updateFade);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", updateFade);
  });

  return { scrollRef, showLeftFade, showRightFade, updateFade };
}
