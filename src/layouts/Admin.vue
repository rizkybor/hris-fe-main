<script setup>
import Sidebar from "@/components/admin/Sidebar.vue";
import Header from "@/components/admin/Header.vue";
import MobileTabBar from "@/components/admin/MobileTabBar.vue";
import MobileMoreSheet from "@/components/admin/MobileMoreSheet.vue";
import ThemeFloatingSwitch from "@/components/admin/ThemeFloatingSwitch.vue";
import { useAuthStore } from "@/stores/auth";
import { useAlertModalStore } from "@/stores/alertModal";
import { t } from "@/i18n";
import { nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

const isSidebarOpen = ref(false);

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const closeSidebar = () => {
  isSidebarOpen.value = false;
};

// Sign out from the phone menu: same confirmation as the header's.
const authStore = useAuthStore();
const alertModal = useAlertModalStore();
const confirmLogout = async () => {
  closeSidebar();
  const ok = await alertModal.confirm(t("common.user.signOutMessage"), {
    title: t("common.user.signOutTitle"),
    confirmText: t("common.actions.signOut"),
    type: "danger",
  });
  if (ok) await authStore.logout();
};

// Page enter: the page's root element rises in on every navigation. The
// RouterView stays a direct child of <main> (no wrapper), so pages that use
// h-full still size against <main> and main's bottom padding (room for the
// phone tab bar) still applies to long pages. The class is re-applied
// instead of re-keying the RouterView, so pages keep their component
// instance and state exactly as before.
const route = useRoute();
const mainEl = ref(null);
const playPageEnter = async () => {
  await nextTick();
  const el = mainEl.value?.firstElementChild;
  if (!el) return;
  // A new page root just gets the class. The same root (e.g. only a param
  // changed) drops it and gets it back two frames later, so the browser sees
  // the change and restarts the animation — without forcing a synchronous
  // layout of the whole page (reading offsetWidth did that).
  if (!el.classList.contains("ui-page-enter")) {
    el.classList.add("ui-page-enter");
    return;
  }
  el.classList.remove("ui-page-enter");
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("ui-page-enter")));
};
onMounted(playPageEnter);
watch(
  () => route.path,
  () => {
    closeSidebar();
    playPageEnter();
  }
);
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-ui-bg">
    <!-- Sidebar Slot - can be replaced with custom content -->
    <slot name="sidebar">
      <!-- Desktop sidebar; on phones and tablets the menu is the bottom sheet below. -->
      <Sidebar :isOpen="false" @navigate="closeSidebar" />
    </slot>

    <!-- Main Content -->
    <div id="main-content" class="flex-1 flex flex-col overflow-hidden min-w-0">
      <!-- Top bar -->
      <Header @toggle-sidebar="toggleSidebar" />
      <!-- Page content; room for the tab bar on phones and tablets -->
      <main ref="mainEl" class="main-content flex-1 overflow-auto p-3 pb-[calc(92px+env(safe-area-inset-bottom))] lg:pb-3">
        <RouterView />
      </main>
    </div>
  </div>

  <MobileTabBar :more-open="isSidebarOpen" @more="toggleSidebar" />
  <MobileMoreSheet :open="isSidebarOpen" @close="closeSidebar" @logout="confirmLogout" />
  <ThemeFloatingSwitch />
</template>
