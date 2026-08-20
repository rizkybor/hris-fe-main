<script setup>
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
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5">
    <h3 class="text-brand-dark text-base font-bold mb-3.5">{{ title }}</h3>
    <div class="space-y-2">
      <RouterLink
        v-for="link in visibleLinks"
        :key="link.title"
        :to="link.to"
        class="flex items-center gap-2.5 p-2.5 rounded-[10px] border border-[#DCDEDD] hover:border-[#0C51D9] hover:shadow-sm transition-all"
      >
        <div class="w-8 h-8 bg-blue-50 rounded-[8px] flex items-center justify-center shrink-0">
          <component :is="link.icon" class="w-4 h-4 text-[#0C51D9]" />
        </div>
        <span class="text-brand-dark text-xs font-semibold flex-1">{{ link.title }}</span>
        <ChevronRight class="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </RouterLink>

      <p v-if="visibleLinks.length === 0" class="text-xs text-gray-400 text-center py-4">
        No quick links available.
      </p>
    </div>
  </div>
</template>
