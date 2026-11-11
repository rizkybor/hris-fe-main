<script setup>
// Auth pages (sign in, forgot / reset password): the form on the left,
// a calm navy panel with the animated backdrop on the right (desktop).
import AuthBackdrop from "@/components/auth/AuthBackdrop.vue";
import { APP_VERSION_SHORT } from "@/utils/appVersion";

const year = new Date().getFullYear();
const POINTS = ["Attendance with photo and location", "Payroll and payslips", "Projects, documents and licenses"];
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
        <p class="text-ui-over uppercase text-white/50">HRIS+ for growing teams</p>
        <h2 class="mt-4 text-[34px] leading-[44px] font-medium tracking-[-0.02em] text-white">
          People, attendance, payroll and licenses, in one calm place.
        </h2>
        <ul class="mt-8 space-y-3">
          <li v-for="p in POINTS" :key="p" class="flex items-center gap-3 text-ui-body text-white/75">
            <span class="w-1.5 h-1.5 rounded-full bg-ui-accent-soft"></span>{{ p }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
