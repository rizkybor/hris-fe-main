<script setup lang="ts">
import { Lightbulb, Check } from "lucide-vue-next";
import { ref, onMounted, onUnmounted } from "vue";

const sidebarRef = ref<HTMLElement | null>(null);
const isSticky = ref(false);
const sidebarTop = ref(0);
const sidebarWidth = ref(0);

const handleScroll = () => {
  if (!sidebarRef.value) return;

  // Below lg the sidebar stacks under the form full-width, so the
  // scroll-based fixed positioning (designed for a narrow side column)
  // would otherwise misalign/overlap the form.
  if (window.innerWidth < 1024) {
    isSticky.value = false;
    return;
  }

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const offset = 20; // 20px from top when sticky

  if (scrollTop > sidebarTop.value - offset) {
    isSticky.value = true;
  } else {
    isSticky.value = false;
  }
};

const handleResize = () => {
  if (sidebarRef.value) {
    sidebarWidth.value = sidebarRef.value.offsetWidth;
  }
  handleScroll();
};

onMounted(() => {
  if (sidebarRef.value) {
    sidebarTop.value = sidebarRef.value.offsetTop;
    sidebarWidth.value = sidebarRef.value.offsetWidth;
  }
  window.addEventListener("scroll", handleScroll);
  window.addEventListener("resize", handleResize);
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <div class="w-full min-w-0 xl:self-stretch">
    <div
      ref="sidebarRef"
      :class="[
        'hidden md:block bg-ui-surface border border-ui-line rounded-ui-card p-5',
        isSticky ? 'fixed top-5 z-10' : 'relative xl:sticky xl:top-0',
      ]"
      :style="isSticky ? { width: `${sidebarWidth}px` } : {}"
    >
      <header class="flex items-start gap-3 pb-4 mb-4 border-b border-ui-line">
        <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
          <Lightbulb class="w-4 h-4" />
        </span>
        <div class="min-w-0">
          <h3 class="text-ui-h3 text-ui-ink">Form Tips</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">Job Information Guidelines</p>
        </div>
      </header>

      <ul class="grid gap-3.5 md:grid-cols-2 xl:grid-cols-1">
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Choose clear job title</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Use standard industry job titles</p>
          </div>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Verify department assignment</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Choose the correct department for the role</p>
          </div>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Set realistic start date</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Allow time for onboarding preparations</p>
          </div>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Review employment type</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Ensure it matches the job requirements</p>
          </div>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Select appropriate skill level</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Match with employee's experience level</p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
