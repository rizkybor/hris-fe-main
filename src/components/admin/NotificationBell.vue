<script setup>
import { onMounted, ref } from "vue";
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

onMounted(() => {
  notificationStore.fetchUnreadCount();
});
</script>

<template>
  <div class="relative">
    <button
      class="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150"
      @click="toggle"
    >
      <BellIcon class="w-[18px] h-[18px]" />
      <span
        v-if="unreadCount > 0"
        class="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
      >
        {{ unreadCount > 9 ? "9+" : unreadCount }}
      </span>
    </button>

    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9998]"
      @click="isOpen = false"
    ></div>

    <div
      v-if="isOpen"
      class="absolute right-0 top-full mt-2 w-80 bg-white border border-[#DCDEDD] rounded-[12px] shadow-md z-[9999] max-h-[70vh] overflow-y-auto"
    >
      <div class="px-4 py-3 border-b border-[#DCDEDD] flex items-center justify-between">
        <p class="text-sm font-semibold text-gray-900">Notifications</p>
        <button
          v-if="unreadCount > 0"
          @click="handleMarkAllRead"
          class="flex items-center gap-1 text-xs text-[#0C51D9] font-medium hover:underline"
        >
          <CheckCheckIcon class="w-3.5 h-3.5" />
          Mark all read
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

      <div v-else-if="notifications.length === 0" class="p-6 text-center text-sm text-gray-400">
        No notifications yet
      </div>

      <div v-else>
        <button
          v-for="notification in notifications"
          :key="notification.id"
          @click="handleItemClick(notification)"
          class="w-full text-left px-4 py-3 border-b border-[#F1F1F1] hover:bg-gray-50 transition-colors flex items-start gap-2"
          :class="{ 'bg-blue-50/40': !notification.read_at }"
        >
          <span
            class="w-2 h-2 rounded-full mt-1.5 shrink-0"
            :class="notification.read_at ? 'bg-transparent' : 'bg-[#0C51D9]'"
          ></span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-brand-dark truncate">
              {{ notification.data?.title ?? "Notification" }}
            </p>
            <p class="text-xs text-gray-500 line-clamp-2">
              {{ notification.data?.message }}
            </p>
            <p class="text-[11px] text-gray-400 mt-1">
              {{ getTimeAgo(notification.created_at) }}
            </p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
