<script setup>
// Bottom tab bar for phones and tablets (below lg), like a native app.
// Shows up to four destinations the user may open (same permissions as
// the sidebar) plus "More", which opens the full menu drawer.
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { House, Clock, ListChecks, Wallet, CircleUserRound, LayoutGrid } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";

defineProps({ moreOpen: { type: Boolean, default: false } });
const emit = defineEmits(["more"]);
const route = useRoute();

const tabs = computed(() => {
  const candidates = [
    { label: "Home", icon: House, to: { name: "admin.dashboard" }, show: true, prefixes: ["admin.dashboard"] },
    can("attendance-check-in") || can("attendance-check-out")
      ? { label: "Attendance", icon: Clock, to: { name: "employee.attendance.clock" }, show: true, prefixes: ["employee.attendance"] }
      : { label: "Attendance", icon: Clock, to: { name: "employee.attendance.my-attendances" }, show: can("attendance-my-attendances"), prefixes: ["employee.attendance"] },
    { label: "Tasks", icon: ListChecks, to: { name: "employee.tasks" }, show: can("task-list"), prefixes: ["employee.tasks"] },
    { label: "Payslips", icon: Wallet, to: { name: "employee.payslips" }, show: can("payslip-view"), prefixes: ["employee.payslips"] },
    { label: "Profile", icon: CircleUserRound, to: { name: "employee.profile" }, show: can("profile-menu"), prefixes: ["employee.profile"] },
  ];
  return candidates.filter((t) => t.show).slice(0, 4);
});
const isActive = (tab) => tab.prefixes.some((p) => route.name?.toString().startsWith(p));
</script>

<template>
  <nav
    class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ui-surface/95 backdrop-blur border-t border-ui-line pb-[env(safe-area-inset-bottom)] font-sans"
    aria-label="Primary"
  >
    <div class="flex h-[58px] px-1">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.label"
        :to="tab.to"
        class="ui-press flex-1 flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium"
        :class="isActive(tab) && !moreOpen ? 'text-ui-ink' : 'text-ui-faint'"
        :aria-current="isActive(tab) ? 'page' : undefined"
      >
        <component :is="tab.icon" class="w-[22px] h-[22px]" :stroke-width="isActive(tab) && !moreOpen ? 2.1 : 1.8" />
        {{ tab.label }}
      </RouterLink>
      <button
        type="button"
        class="ui-press flex-1 flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium"
        :class="moreOpen ? 'text-ui-ink' : 'text-ui-faint'"
        :aria-expanded="moreOpen"
        @click="emit('more')"
      >
        <LayoutGrid class="w-[22px] h-[22px]" :stroke-width="moreOpen ? 2.1 : 1.8" />
        More
      </button>
    </div>
  </nav>
</template>
