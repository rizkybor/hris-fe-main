<script setup>
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { getRoleBadgeClass, getRoleLabel } from "@/utils/badgeUtils";
import { SparklesIcon } from "lucide-vue-next";

const authStore = useAuthStore();

const userName = computed(() => authStore.user?.name?.split(",")[0] || "there");

const primaryRole = computed(() => {
  const roles = authStore.user?.roles || [];
  if (roles.includes("manager")) return "manager";
  if (roles.includes("hr")) return "hr";
  if (roles.includes("finance")) return "finance";
  if (roles.includes("employee")) return "employee";
  return roles[0];
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 11) return "Good morning";
  if (hour < 15) return "Good afternoon";
  if (hour < 19) return "Good evening";
  return "Good evening";
});

const roleSubtitle = computed(() => {
  const subtitles = {
    manager: "Here's how the company is doing today.",
    hr: "Here's your people & workforce snapshot.",
    finance: "Here's your payroll & finance snapshot.",
    employee: "Here's your personal work overview.",
  };
  return subtitles[primaryRole.value] || "Here's what's happening today.";
});

const todayLabel = computed(() =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
);
</script>

<template>
  <div
    class="relative overflow-hidden rounded-[14px] border border-[#0B1042] main-card px-5 sm:px-7 py-6 sm:py-7 mb-6"
  >
    <!-- Decorative glow orbs -->
    <div
      class="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl"
    ></div>

    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <div
            class="flex items-center gap-1 px-3 py-1 bg-white/10 border border-white/10 rounded-full backdrop-blur-sm"
          >
            <SparklesIcon class="w-3 h-3 text-blue-300" />
            <span class="text-brand-white-80 text-xs font-medium">{{ todayLabel }}</span>
          </div>
          <span
            v-if="primaryRole"
            :class="getRoleBadgeClass(primaryRole)"
            class="px-3 py-1 rounded-full text-xs font-semibold border"
          >
            {{ getRoleLabel(primaryRole) }}
          </span>
        </div>

        <h1 class="text-brand-white text-2xl sm:text-3xl font-extrabold leading-tight">
          {{ greeting }}, {{ userName }} 👋
        </h1>
        <p class="text-brand-white-70 text-sm sm:text-base mt-1">
          {{ roleSubtitle }}
        </p>
      </div>
    </div>
  </div>
</template>
