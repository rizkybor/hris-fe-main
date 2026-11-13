<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { BellIcon, CheckCheckIcon } from "lucide-vue-next";
import { useNotificationStore } from "@/stores/notification";
import { getTimeAgo } from "@/utils/dateUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const notificationStore = useNotificationStore();
const { notifications, unreadCount, loading } = storeToRefs(notificationStore);
const router = useRouter();

const isOpen = ref(false);

const toggle = async () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await notificationStore.fetchNotifications();
  }
};

const handleItemClick = async (notification) => {
  if (!notification.read_at) {
    await notificationStore.markAsRead(notification.id);
  }
  isOpen.value = false;
  if (notification.data?.url) {
    router.push(notification.data.url);
  }
};

const handleMarkAllRead = async () => {
  await notificationStore.markAllAsRead();
};

const POLL_MS = 60_000;
let timer = 0;
let lastCheck = 0;
const refreshCount = () => {
  if (document.hidden) return;
  lastCheck = Date.now();
  notificationStore.fetchUnreadCount();
};
const onVisible = () => {
  if (!document.hidden && Date.now() - lastCheck > 15_000) refreshCount();
};

const ringing = ref(false);
watch(unreadCount, async (count, previous) => {
  if (count <= (previous ?? 0)) return;
  ringing.value = false;
  await nextTick();
  ringing.value = true;
});

onMounted(() => {
  refreshCount();
  timer = window.setInterval(refreshCount, POLL_MS);
  document.addEventListener("visibilitychange", onVisible);
});
onBeforeUnmount(() => {
  window.clearInterval(timer);
  document.removeEventListener("visibilitychange", onVisible);
});
</script>

<template>
  <div class="relative">
    <button
      class="relative w-9 h-9 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink transition-colors"
      :aria-label="$t('common.a11y.notifications')"
      @click="toggle"
    >
      <BellIcon class="w-[18px] h-[18px]" :class="{ 'ui-bell-ring': ringing }" @animationend="ringing = false" />
      <span
        v-if="unreadCount > 0"
        :key="unreadCount"
        class="ui-badge-pop absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-ui-bad text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-ui-bg"
      >
        {{ unreadCount > 9 ? "9+" : unreadCount }}
      </span>
    </button>

    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9998] bg-ui-scrim/20 sm:bg-transparent"
      @click="isOpen = false"
    ></div>

    <!-- Phones: a full-width panel under the header (anchored to the bell it
         would run off the left edge). Wider screens: a dropdown under the bell. -->
    <div
      v-if="isOpen"
      class="ui-anim-scale fixed inset-x-3 top-[60px] max-h-[calc(100dvh-76px)] origin-top sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-h-[70vh] sm:origin-top-right bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay z-[9999] overflow-y-auto"
    >
      <div class="px-4 py-3 border-b border-ui-line flex items-center justify-between">
        <p class="text-ui-small font-semibold text-ui-ink">{{ $t("dashboard.notifications.title") }}</p>
        <button
          v-if="unreadCount > 0"
          @click="handleMarkAllRead"
          class="flex items-center gap-1 text-ui-cap text-ui-accent font-medium hover:underline"
        >
          <CheckCheckIcon class="w-3.5 h-3.5" />
          {{ $t("dashboard.notifications.markAllRead") }}
        </button>
      </div>

      <div v-if="loading" class="p-4 space-y-3">
        <div v-for="i in 3" :key="i" class="flex items-center gap-3">
          <Skeleton width="36px" height="36px" rounded="10px" />
          <div class="flex-1 space-y-2">
            <Skeleton width="80%" height="12px" />
            <Skeleton width="40%" height="10px" />
          </div>
        </div>
      </div>

      <div v-else-if="notifications.length === 0" class="p-6 text-center text-ui-small text-ui-muted">
        {{ $t("dashboard.notifications.empty") }}
      </div>

      <div v-else>
        <button
          v-for="notification in notifications"
          :key="notification.id"
          @click="handleItemClick(notification)"
          class="w-full text-left px-4 py-3 border-b border-ui-line last:border-b-0 hover:bg-ui-hover transition-colors flex items-start gap-2.5"
          :class="{ 'bg-ui-accent-soft/50': !notification.read_at }"
        >
          <span
            class="w-2 h-2 rounded-full mt-1.5 shrink-0"
            :class="notification.read_at ? 'bg-transparent' : 'bg-ui-accent'"
          ></span>
          <div class="flex-1 min-w-0">
            <p class="text-ui-small font-medium text-ui-ink truncate">
              {{ notification.data?.title ?? $t("dashboard.notifications.fallbackTitle") }}
            </p>
            <p class="text-ui-cap text-ui-muted line-clamp-2">
              {{ notification.data?.message }}
            </p>
            <p class="text-ui-cap text-ui-faint mt-1">
              {{ getTimeAgo(notification.created_at) }}
            </p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
