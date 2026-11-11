<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useGreetingStore } from "@/stores/greeting";
import { useAnnouncementStore } from "@/stores/announcement";
import { getRoleLabel } from "@/utils/badgeUtils";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { can } from "@/helpers/permissionHelper";
import { UiBadge, UiButton } from "@/components/ui";
import { SparklesIcon, PartyPopper, Cake, CalendarClock, Megaphone, Pin, Clock } from "lucide-vue-next";

const { t, te } = useI18n();
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

const userName = computed(() => authStore.user?.name?.split(",")[0] || t("dashboard.welcome.fallbackName"));

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
  const part = hour < 11 ? "morning" : hour < 15 ? "afternoon" : hour < 19 ? "evening" : "night";
  return t(`dashboard.welcome.greeting.${part}`, { name: userName.value });
});

const roleSubtitle = computed(() => {
  const key = `dashboard.welcome.subtitle.${primaryRole.value}`;
  return primaryRole.value && te(key) ? t(key) : t("dashboard.welcome.subtitle.default");
});

const roleLabel = computed(() => {
  const key = `dashboard.welcome.roles.${primaryRole.value}`;
  return te(key) ? t(key) : getRoleLabel(primaryRole.value);
});

const todayLabel = computed(() =>
  new Date().toLocaleDateString(localeTag(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
);
</script>

<template>
  <div class="flex flex-col lg:flex-row lg:items-end gap-5">
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-center gap-2 mb-1.5">
        <p class="text-ui-small text-ui-muted capitalize">{{ todayLabel }}</p>
        <UiBadge v-if="primaryRole" tone="outline">{{ roleLabel }}</UiBadge>
      </div>
      <h1 class="text-ui-h1 sm:text-ui-display text-ui-ink">{{ greeting }}</h1>
      <p class="text-ui-small text-ui-muted mt-1">{{ roleSubtitle }}</p>

      <div v-if="todayGreetings.length > 0" class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="item in todayGreetings"
          :key="item.id"
          class="ui-anim-fade-up inline-flex items-center gap-2 h-7 px-3 rounded-full bg-ui-ok-soft text-ui-ok max-w-full"
        >
          <component :is="greetingIcon(item.type)" class="w-3.5 h-3.5 shrink-0" />
          <span class="text-ui-cap font-medium truncate">{{ item.message }}</span>
        </span>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 lg:items-end shrink-0">
      <UiButton v-if="can('attendance-check-in')" :to="{ name: 'employee.attendance.clock' }" variant="secondary" :icon="Clock">{{ $t("dashboard.welcome.clockInOut") }}</UiButton>

      <!-- Announcements -->
      <RouterLink
        v-if="announcements.length > 0"
        :to="{ name: 'admin.announcements.dashboard' }"
        class="ui-lift group w-full sm:w-80 rounded-ui-card bg-ui-surface border border-ui-line hover:border-ui-line-strong p-4"
      >
        <div class="flex items-center gap-2 mb-2">
          <Megaphone class="w-4 h-4 text-ui-faint" />
          <p class="text-ui-h3 text-ui-ink">{{ $t("dashboard.welcome.announcements") }}</p>
          <UiBadge tone="accent" class="ml-auto">{{ $t("dashboard.welcome.new") }}</UiBadge>
        </div>
        <ul class="space-y-1.5">
          <li v-for="item in announcements" :key="item.id" class="min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <Pin v-if="item.is_pinned" class="w-3 h-3 text-ui-warn shrink-0" :aria-label="$t('dashboard.welcome.pinned')" />
              <p class="text-ui-small font-medium text-ui-ink truncate">{{ item.title }}</p>
            </div>
            <p class="text-ui-cap text-ui-muted truncate">{{ item.body }}</p>
          </li>
        </ul>
      </RouterLink>
    </div>
  </div>
</template>
