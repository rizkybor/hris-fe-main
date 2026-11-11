<script setup>
import Sidebar from "@/components/admin/Sidebar.vue";
import Header from "@/components/admin/Header.vue";
import MobileTabBar from "@/components/admin/MobileTabBar.vue";
import { nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";

const isSidebarOpen = ref(false);

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const closeSidebar = () => {
  isSidebarOpen.value = false;
};

// Page enter: the content rises in on every navigation. The class is
// re-applied instead of re-keying the RouterView, so pages keep their
// component instance (and state) exactly as before.
const route = useRoute();
const mainEl = ref(null);
watch(
  () => route.path,
  async () => {
    closeSidebar();
    await nextTick();
    const el = mainEl.value;
    if (!el) return;
    el.classList.remove("ui-page-enter");
    void el.offsetWidth; // restart the CSS animation
    el.classList.add("ui-page-enter");
  }
);
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-ui-bg">
    <!-- Sidebar Slot - can be replaced with custom content -->
    <slot name="sidebar">
      <Sidebar :isOpen="isSidebarOpen" @navigate="closeSidebar" />
    </slot>

    <!-- Main Content -->
    <div id="main-content" class="flex-1 flex flex-col overflow-hidden min-w-0">
      <!-- Top bar -->
      <Header @toggle-sidebar="toggleSidebar" />
      <!-- Page content; room for the tab bar on phones and tablets -->
      <main class="main-content flex-1 overflow-auto p-3 pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-3">
        <div ref="mainEl" class="ui-page-enter h-full">
          <RouterView />
        </div>
      </main>
    </div>
  </div>

  <MobileTabBar :more-open="isSidebarOpen" @more="toggleSidebar" />

  <Transition name="ui-fade">
    <div v-if="isSidebarOpen" class="fixed inset-0 z-40 bg-ui-ink/30 lg:hidden" @click="closeSidebar"></div>
  </Transition>
</template>
