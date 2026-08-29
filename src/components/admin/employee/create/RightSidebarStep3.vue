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
  <div class="w-full lg:w-80 flex-shrink-0">
    <div
      ref="sidebarRef"
      :class="[
        'hidden md:block bg-white border border-[#DCDEDD] rounded-[14px] p-5 transition-all duration-300 ease-in-out',
        isSticky ? 'fixed top-5 z-10' : 'relative'
      ]"
      :style="isSticky ? { width: `${sidebarWidth}px` } : {}"
    >
      <div class="flex items-center gap-2.5 mb-5">
        <div
          class="w-9 h-9 bg-green-50 rounded-[12px] flex items-center justify-center"
        >
          <Lightbulb class="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-base font-bold">Form Tips</h3>
          <p class="text-brand-light text-sm font-normal">
            Emergency Contact Guidelines
          </p>
        </div>
      </div>

      <div class="space-y-3.5">
        <div class="flex items-start gap-2.5">
          <div
            class="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          >
            <Check class="w-3 h-3 text-green-600" />
          </div>
          <div>
            <p class="text-brand-dark text-sm font-semibold">
              Choose reliable contact
            </p>
            <p class="text-brand-light text-xs font-normal">
              Select someone who is easily reachable
            </p>
          </div>
        </div>

        <div class="flex items-start gap-2.5">
          <div
            class="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          >
            <Check class="w-3 h-3 text-green-600" />
          </div>
          <div>
            <p class="text-brand-dark text-sm font-semibold">
              Verify contact information
            </p>
            <p class="text-brand-light text-xs font-normal">
              Double-check phone numbers and email
            </p>
          </div>
        </div>

        <div class="flex items-start gap-2.5">
          <div
            class="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          >
            <Check class="w-3 h-3 text-green-600" />
          </div>
          <div>
            <p class="text-brand-dark text-sm font-semibold">
              Include relationship details
            </p>
            <p class="text-brand-light text-xs font-normal">
              Specify how they're related to the employee
            </p>
          </div>
        </div>

        <div class="flex items-start gap-2.5">
          <div
            class="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          >
            <Check class="w-3 h-3 text-green-600" />
          </div>
          <div>
            <p class="text-brand-dark text-sm font-semibold">
              Consider multiple contacts
            </p>
            <p class="text-brand-light text-xs font-normal">
              Primary and secondary emergency contacts
            </p>
          </div>
        </div>

        <div class="flex items-start gap-2.5">
          <div
            class="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          >
            <Check class="w-3 h-3 text-green-600" />
          </div>
          <div>
            <p class="text-brand-dark text-sm font-semibold">
              Review all form data
            </p>
            <p class="text-brand-light text-xs font-normal">
              Final check before submitting the form
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
