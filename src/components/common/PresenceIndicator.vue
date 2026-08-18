<script setup>
import { computed } from "vue";
import { Pencil, Eye } from "lucide-vue-next";
import Avatar from "@/components/common/Avatar.vue";

const props = defineProps({
  viewers: { type: Array, default: () => [] },
});

// Never show the current user in their own presence list -- seeing
// "you" listed as a collaborator is just noise.
const others = computed(() => props.viewers.filter((v) => !v.is_self));
</script>

<template>
  <div v-if="others.length" class="flex items-center gap-2 flex-wrap">
    <div class="flex -space-x-2">
      <Avatar
        v-for="viewer in others"
        :key="viewer.user_id"
        :alt="viewer.name"
        size="w-7 h-7"
        icon-size="w-3.5 h-3.5"
        class="ring-2 ring-white"
      />
    </div>
    <span class="text-xs text-brand-light flex items-center gap-1">
      <component :is="others.some((v) => v.is_editing) ? Pencil : Eye" class="w-3.5 h-3.5" />
      {{ others.map((v) => v.name).join(", ") }}
      {{ others.some((v) => v.is_editing) ? "editing" : "viewing" }}
    </span>
  </div>
</template>
