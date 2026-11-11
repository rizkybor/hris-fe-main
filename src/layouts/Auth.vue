<script setup>
import ThemeFloatingSwitch from "@/components/admin/ThemeFloatingSwitch.vue";
// Auth pages (sign in, forgot / reset password): the form on the left,
// a calm navy panel with the animated backdrop on the right (desktop).
import AuthBackdrop from "@/components/auth/AuthBackdrop.vue";
import AuthLogo3D from "@/components/auth/AuthLogo3D.vue";
import { APP_VERSION_SHORT } from "@/utils/appVersion";

import { onMounted, reactive, ref } from "vue";

const year = new Date().getFullYear();
// The panel text comes in once the logo is up (never later than 2.5 s).
const logoReady = ref(false);
onMounted(() => setTimeout(() => (logoReady.value = true), 2500));

// Headline shine: a soft blue light inside the letters, centred exactly on
// the pointer; it grows in and fades out smoothly (see .auth-headline).
const shine = reactive({ x: 0, y: 0, on: false });
const moveShine = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  shine.x = e.clientX - r.left;
  shine.y = e.clientY - r.top;
  shine.on = true;
};
</script>

<template>
  <div class="min-h-screen flex bg-ui-surface font-sans text-ui-text">
    <!-- Form side -->
    <div class="flex-1 lg:flex-none lg:w-[min(560px,46vw)] flex flex-col px-6 sm:px-12 lg:px-16 pt-8 pb-6 min-h-screen">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-[10px] bg-ui-surface border border-ui-line flex items-center justify-center">
          <img src="/images/jcd-only-color.png" alt="Jendela Cakra Digital" class="w-7 h-7 object-contain" />
        </div>
        <div class="leading-tight">
          <div class="flex items-center gap-1.5">
            <span class="text-ui-h3 text-ui-ink">HRIS+</span>
            <span class="text-[10.5px] leading-[15px] px-1.5 rounded border border-ui-line text-ui-muted tabular-nums">v{{ APP_VERSION_SHORT }}</span>
          </div>
          <p class="text-ui-cap text-ui-muted">PT Jendela Cakra Digital</p>
        </div>
      </div>

      <div class="flex-1 flex items-center py-10">
        <div class="w-full max-w-[400px] ui-anim-fade-up">
          <RouterView />
        </div>
      </div>

      <p class="text-ui-cap text-ui-faint">© {{ year }} PT Jendela Cakra Digital · HRIS+ v{{ APP_VERSION_SHORT }}</p>
    </div>

    <!-- Brand side (desktop) -->
    <div class="hidden lg:flex relative flex-1 bg-ui-brand overflow-hidden">
      <AuthBackdrop />
      <div class="relative z-10 flex flex-col justify-center px-16 xl:px-24 max-w-[640px]">
        <AuthLogo3D
          class="w-[305px] h-[275px] xl:w-[356px] xl:h-[320px] -ml-[52px] -mt-[30px] -mb-[6px] xl:-ml-[58px] xl:-mt-[34px] xl:-mb-[10px]"
          @ready="logoReady = true"
        />
        <div class="auth-copy" :class="{ 'is-in': logoReady }">
          <p class="text-ui-over uppercase tracking-[0.08em] text-white/55">{{ $t("auth.layout.eyebrow") }}</p>
          <h2
            class="auth-headline mt-4 text-[32px] leading-[42px] font-medium tracking-[-0.02em] text-white [text-wrap:balance]"
            :class="{ 'is-lit': shine.on }"
            :style="{ '--mx': shine.x + 'px', '--my': shine.y + 'px' }"
            @pointermove="moveShine"
            @pointerleave="shine.on = false"
          >
            {{ $t("auth.layout.headline") }}
          </h2>
          <p class="mt-5 text-[17px] leading-[26px] italic text-white/75">&ldquo;{{ $t("auth.layout.tagline") }}&rdquo;</p>
        </div>
      </div>
    </div>
    <ThemeFloatingSwitch :docked="false" />
  </div>
</template>

<style scoped>
/* Headline shine. The letters are filled with a radial light centred on the
   pointer (soft blue at the pointer, fading back to plain white), clipped to
   the text; --shine-r grows in on hover and shrinks away on leave. */
@property --shine-r {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
.auth-headline {
  --shine-r: 0px;
  cursor: pointer;
  background-image: radial-gradient(
    circle var(--shine-r) at var(--mx, 50%) var(--my, 50%),
    rgb(147 197 253) 0%,
    rgb(170 210 254) 35%,
    rgb(210 230 255) 70%,
    rgb(255 255 255) 100%
  );
  background-color: rgb(255 255 255);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  /* Keeps the copy's rise-in (opacity/transform) alongside the shine. */
  transition:
    opacity 600ms var(--ui-ease-out),
    transform 600ms var(--ui-ease-out),
    --shine-r 700ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 700ms cubic-bezier(0.22, 1, 0.36, 1);
}
.auth-headline.is-lit {
  --shine-r: 42px;
  filter: drop-shadow(0 0 8px rgb(191 219 254 / 0.12));
}

/* Panel text follows the logo in: eyebrow, headline and points rise in
   one after another. Without motion it simply appears. */
.auth-copy > * {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 600ms var(--ui-ease-out), transform 600ms var(--ui-ease-out);
}
.auth-copy.is-in > * { opacity: 1; transform: none; }
.auth-copy.is-in > :nth-child(2) { transition-delay: 120ms; }
/* The rise-in waits its turn; the shine reacts at once. */
.auth-copy.is-in > .auth-headline { transition-delay: 120ms, 120ms, 0ms, 0ms; }
.auth-copy.is-in > :nth-child(3) { transition-delay: 240ms; }
@media (prefers-reduced-motion: reduce) {
  .auth-copy > * { transition: none; transform: none; }
}
</style>
