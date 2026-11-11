<script setup>
import ThemeFloatingSwitch from "@/components/admin/ThemeFloatingSwitch.vue";
// Auth pages (sign in, forgot / reset password): the form on the left,
// a calm navy panel with the animated backdrop on the right (desktop).
import AuthBackdrop from "@/components/auth/AuthBackdrop.vue";
import AuthLogo3D from "@/components/auth/AuthLogo3D.vue";
import { APP_VERSION_SHORT } from "@/utils/appVersion";

import { onMounted, ref } from "vue";

const year = new Date().getFullYear();
// The panel text comes in once the logo is up (never later than 2.5 s).
const logoReady = ref(false);
onMounted(() => setTimeout(() => (logoReady.value = true), 2500));
const POINTS = ["auth.layout.points.projects", "auth.layout.points.clients", "auth.layout.points.people"];
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
          <h2 class="mt-4 text-[32px] leading-[42px] font-medium tracking-[-0.02em] text-white [text-wrap:balance]">
            {{ $t("auth.layout.headline") }}
          </h2>
          <ul class="mt-8 space-y-3">
            <li v-for="p in POINTS" :key="p" class="flex items-start gap-3 text-ui-body text-white/75">
              <span class="w-1.5 h-1.5 mt-[9px] shrink-0 rounded-full bg-ui-accent-soft"></span>{{ $t(p) }}
            </li>
          </ul>
        </div>
      </div>
    </div>
    <ThemeFloatingSwitch :docked="false" />
  </div>
</template>

<style scoped>
/* Panel text follows the logo in: eyebrow, headline and points rise in
   one after another. Without motion it simply appears. */
.auth-copy > * {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 600ms var(--ui-ease-out), transform 600ms var(--ui-ease-out);
}
.auth-copy.is-in > * { opacity: 1; transform: none; }
.auth-copy.is-in > :nth-child(2) { transition-delay: 120ms; }
.auth-copy.is-in > :nth-child(3) { transition-delay: 240ms; }
@media (prefers-reduced-motion: reduce) {
  .auth-copy > * { transition: none; transform: none; }
}
</style>
