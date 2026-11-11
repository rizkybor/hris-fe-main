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
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
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
          <p class="text-ui-cap text-ui-muted mt-0.5">Emergency Contact Guidelines</p>
        </div>
      </header>

      <ul class="grid gap-3.5 md:grid-cols-2 xl:grid-cols-1">
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Choose reliable contact</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Select someone who is easily reachable</p>
          </div>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Verify contact information</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Double-check phone numbers and email</p>
          </div>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Include relationship details</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Specify how they're related to the employee</p>
          </div>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Consider multiple contacts</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Primary and secondary emergency contacts</p>
          </div>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 mt-px shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">Review all form data</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">Final check before submitting the form</p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
