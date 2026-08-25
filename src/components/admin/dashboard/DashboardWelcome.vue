<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useGreetingStore } from "@/stores/greeting";
import { useAnnouncementStore } from "@/stores/announcement";
import { getRoleBadgeClass, getRoleLabel } from "@/utils/badgeUtils";
import { SparklesIcon, PartyPopper, Cake, CalendarClock, Megaphone, Pin } from "lucide-vue-next";

const authStore = useAuthStore();
const greetingStore = useGreetingStore();
const { todayGreetings } = storeToRefs(greetingStore);

const announcementStore = useAnnouncementStore();
const { announcements } = storeToRefs(announcementStore);

onMounted(() => {
  greetingStore.fetchTodayGreetings();
  // The backend already scopes this to active (not-yet-expired) announcements
  // for the current user's role, ordered pinned-first -- no client filtering needed.
  announcementStore.fetchAnnouncements({ row_per_page: 3 });
});

const GREETING_ICONS = { holiday: PartyPopper, birthday: Cake, meeting: CalendarClock, custom: SparklesIcon };
const greetingIcon = (type) => GREETING_ICONS[type] ?? SparklesIcon;

const userName = computed(() => authStore.user?.name?.split(",")[0] || "there");

const primaryRole = computed(() => {
  const roles = authStore.user?.roles || [];
  if (roles.includes("superadmin")) return "superadmin";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("operational_director")) return "operational_director";
  if (roles.includes("hr")) return "hr";
  if (roles.includes("finance")) return "finance";
  if (roles.includes("staff")) return "staff";
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
    superadmin: "Here's your system configuration overview.",
    manager: "Here's how the company is doing today.",
    operational_director: "Here's your operations & workforce snapshot.",
    hr: "Here's your people & workforce snapshot.",
    finance: "Here's your payroll & finance snapshot.",
    staff: "Here's your personal work overview.",
  };
  return subtitles[primaryRole.value] || "Here's what's happening today.";
});

const todayLabel = computed(() =>
  new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
);
</script>

<template>
  <div
    class="relative overflow-hidden rounded-[14px] border border-[#DCDEDD] bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 px-5 sm:px-7 py-6 sm:py-7 mb-6"
  >
    <!-- Decorative soft glow orbs -->
    <div
      class="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-200/25 blur-3xl"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-indigo-200/20 blur-3xl"
    ></div>

    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <div
            class="flex items-center gap-1 px-3 py-1 bg-white border border-[#DCDEDD] rounded-full"
          >
            <SparklesIcon class="w-3 h-3 text-blue-400" />
            <span class="text-brand-light text-xs font-medium">{{ todayLabel }}</span>
          </div>
          <span
            v-if="primaryRole"
            :class="getRoleBadgeClass(primaryRole)"
            class="px-3 py-1 rounded-full text-xs font-semibold border"
          >
            {{ getRoleLabel(primaryRole) }}
          </span>
        </div>

        <h1 class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight">
          {{ greeting }}, {{ userName }} 👋
        </h1>
        <p class="text-brand-light text-sm sm:text-base mt-1">
          {{ roleSubtitle }}
        </p>

        <div v-if="todayGreetings.length > 0" class="mt-3 flex flex-col gap-2">
          <div
            v-for="item in todayGreetings"
            :key="item.id"
            class="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full max-w-full"
            style="background-color: #d9f99d; border: 1px solid #bef264"
          >
            <component :is="greetingIcon(item.type)" class="w-3.5 h-3.5 shrink-0" style="color: #4d7c0f" />
            <span class="text-xs sm:text-sm font-semibold truncate" style="color: #365314">{{ item.message }}</span>
          </div>
        </div>
      </div>

      <!-- Announcements -->
      <RouterLink
        v-if="announcements.length > 0"
        :to="{ name: 'admin.announcements.dashboard' }"
        class="blue-gradient relative w-full sm:w-64 lg:w-80 shrink-0 overflow-hidden rounded-[12px] p-3.5 shadow-lg shadow-blue-900/25 ring-1 ring-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/35 hover:-translate-y-0.5"
      >
        <!-- Decorative glow, echoing the banner's own orbs -->
        <div class="pointer-events-none absolute -top-8 -right-6 w-24 h-24 rounded-full bg-white/10 blur-2xl"></div>

        <div class="relative flex items-center gap-1.5 mb-2.5">
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 shrink-0">
            <Megaphone class="w-3.5 h-3.5 text-white" />
          </div>
          <h3 class="text-white text-xs font-bold uppercase tracking-wide">Announcements</h3>
          <span class="ml-auto relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
          </span>
        </div>
        <div class="relative space-y-2 max-h-40 overflow-hidden">
          <div v-for="item in announcements" :key="item.id" class="min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <Pin v-if="item.is_pinned" class="w-3 h-3 text-amber-300 shrink-0" />
              <p class="text-white text-xs sm:text-sm font-semibold truncate min-w-0">{{ item.title }}</p>
            </div>
            <p class="text-blue-100 text-xs truncate">{{ item.body }}</p>
          </div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
