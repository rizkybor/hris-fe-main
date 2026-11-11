<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { computed } from "vue";
import { ChevronRight } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";

const props = defineProps({
  title: { type: String, default: "Quick Access" },
  links: { type: Array, required: true },
});

const visibleLinks = computed(() =>
  props.links.filter((link) => !link.permission || can(link.permission))
);
</script>

<template>
  <DashboardWidgetCard :title="title" flush>
    <nav v-if="visibleLinks.length" class="p-2 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-0.5">
      <RouterLink
        v-for="link in visibleLinks"
        :key="link.title"
        :to="link.to"
        class="group flex items-center gap-3 h-10 px-3 rounded-ui-control text-ui-small text-ui-text hover:bg-ui-hover hover:text-ui-ink transition-colors"
      >
        <component :is="link.icon" class="w-4 h-4 text-ui-faint group-hover:text-ui-ink shrink-0" />
        <span class="flex-1 truncate">{{ link.title }}</span>
        <ChevronRight class="w-3.5 h-3.5 text-ui-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </RouterLink>
    </nav>
    <p v-else class="text-ui-small text-ui-muted text-center py-6">No quick links available.</p>
  </DashboardWidgetCard>
</template>
