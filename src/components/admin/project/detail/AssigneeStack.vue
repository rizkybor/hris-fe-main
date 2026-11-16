<script setup>
// Compact assignees for cards and rows: up to three overlapping avatars and
// "Name" / "Name +2" (everyone's name in the tooltip).
import { computed } from "vue";
import Avatar from "@/components/common/Avatar.vue";

const props = defineProps({
  assignees: { type: Array, default: () => [] },
  textClass: { type: String, default: "text-ui-cap text-ui-muted" },
});

const shown = computed(() => props.assignees.slice(0, 3));
const names = computed(() => props.assignees.map((a) => a.user?.name).filter(Boolean));
</script>

<template>
  <div class="flex items-center gap-1.5 min-w-0" :title="names.join(', ') || undefined">
    <template v-if="assignees.length">
      <div class="flex -space-x-1.5 shrink-0">
        <Avatar
          v-for="person in shown"
          :key="person.id"
          :src="person.user?.profile_photo"
          :alt="person.user?.name"
          size="w-6 h-6"
          icon-size="w-3 h-3"
          rounded="rounded-full"
          class="ring-2 ring-ui-surface"
        />
      </div>
      <span class="truncate" :class="textClass">
        {{ names[0] || "" }}<span v-if="assignees.length > 1" class="text-ui-faint"> +{{ assignees.length - 1 }}</span>
      </span>
    </template>
    <template v-else>
      <Avatar size="w-6 h-6" icon-size="w-3 h-3" rounded="rounded-full" />
      <span class="truncate text-ui-faint" :class="textClass.replace('text-ui-muted', '').replace('text-ui-text', '')">{{ $t("projects.tasks.unassigned") }}</span>
    </template>
  </div>
</template>
