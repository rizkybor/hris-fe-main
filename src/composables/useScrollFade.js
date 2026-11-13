import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";

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
