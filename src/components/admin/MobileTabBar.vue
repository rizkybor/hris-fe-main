<script setup>
import { useI18n } from "vue-i18n";
// Bottom tab bar for phones and tablets (below lg), like a native app.
// Shows up to four destinations the user may open (same permissions as
// the sidebar) plus "More", which opens the full menu drawer.
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { House, Clock, ListChecks, Wallet, CircleUserRound, LayoutGrid } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";

defineProps({ moreOpen: { type: Boolean, default: false } });
const { t } = useI18n();
const emit = defineEmits(["more"]);
const route = useRoute();

const tabs = computed(() => {
  const candidates = [
    { label: t("nav.tabs.home"), icon: House, to: { name: "admin.dashboard" }, show: true, prefixes: ["admin.dashboard"] },
    can("attendance-check-in") || can("attendance-check-out")
      ? { label: t("nav.tabs.attendance"), icon: Clock, to: { name: "employee.attendance.clock" }, show: true, prefixes: ["employee.attendance"] }
      : { label: t("nav.tabs.attendance"), icon: Clock, to: { name: "employee.attendance.my-attendances" }, show: can("attendance-my-attendances"), prefixes: ["employee.attendance"] },
    { label: t("nav.tabs.tasks"), icon: ListChecks, to: { name: "employee.tasks" }, show: can("task-list"), prefixes: ["employee.tasks"] },
    { label: t("nav.tabs.payslips"), icon: Wallet, to: { name: "employee.payslips" }, show: can("payslip-view"), prefixes: ["employee.payslips"] },
    { label: t("nav.tabs.profile"), icon: CircleUserRound, to: { name: "employee.profile" }, show: can("profile-menu"), prefixes: ["employee.profile"] },
  ];
  return candidates.filter((t) => t.show).slice(0, 4);
});
const isActive = (tab) => tab.prefixes.some((p) => route.name?.toString().startsWith(p));
</script>

<template>
  <!-- Floating dock: frosted, rounded, inset from the screen edges and the
       home indicator. The active tab gets a soft pill behind its icon. -->
  <nav
    class="lg:hidden fixed z-40 left-3 right-3 bottom-[calc(10px+env(safe-area-inset-bottom))] font-sans"
    :aria-label="t('nav.shell.primary')"
  >
    <div class="flex h-16 px-1.5 rounded-[22px] bg-ui-surface/85 backdrop-blur-xl backdrop-saturate-150 border border-ui-line/80 shadow-ui-overlay">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.label"
        :to="tab.to"
        class="dock-item ui-press"
        :class="isActive(tab) && !moreOpen ? 'is-active' : ''"
        :aria-current="isActive(tab) ? 'page' : undefined"
      >
        <span class="dock-pill">
          <component :is="tab.icon" class="w-[21px] h-[21px]" :stroke-width="isActive(tab) && !moreOpen ? 2.2 : 1.8" />
        </span>
        <span class="dock-label">{{ tab.label }}</span>
      </RouterLink>
      <button type="button" class="dock-item ui-press" :class="moreOpen ? 'is-active' : ''" :aria-expanded="moreOpen" @click="emit('more')">
        <span class="dock-pill">
          <LayoutGrid class="w-[21px] h-[21px]" :stroke-width="moreOpen ? 2.2 : 1.8" />
        </span>
        <span class="dock-label">{{ t("nav.tabs.more") }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.dock-item {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: rgb(var(--ui-faint));
}
.dock-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 30px;
  border-radius: 999px;
  transition: background-color var(--ui-dur-base) var(--ui-ease-out), color var(--ui-dur-base) var(--ui-ease-out);
}
.dock-label {
  font-size: 10.5px;
  line-height: 12px;
  font-weight: 500;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.is-active {
  color: rgb(var(--ui-ink));
}
.is-active .dock-pill {
  background: rgb(var(--ui-accent-soft));
  color: rgb(var(--ui-accent));
}
.is-active .dock-label {
  font-weight: 600;
}
</style>
