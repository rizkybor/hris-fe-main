<script setup>
import { computed } from "vue";
import { Clock, User, AlertCircle } from "lucide-vue-next";
import { getPriorityColor, getTaskTypeColorClasses } from "@/utils/styleHelpers";
import { formatDate } from "@/utils/dateUtils";
import Avatar from "@/components/common/Avatar.vue";
import { UiBadge } from "@/components/ui";

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["click"]);

const handleClick = () => {
  emit("click");
};

const isOverdue = computed(() => {
  if (!props.task.due_date || props.task.status === "done") return false;
  return new Date(props.task.due_date) < new Date(new Date().toDateString());
});

const typeColor = computed(() => getTaskTypeColorClasses(props.task.color));

// Presentation only: priority -> badge tone (always shown with its word).
const PRIORITY_TONES = { urgent: "bad", high: "warn", medium: "info", low: "neutral" };
const priorityTone = computed(() => PRIORITY_TONES[props.task.priority?.toLowerCase()] || "neutral");
</script>

<template>
  <div
    @click="handleClick"
    class="group bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-raised p-3.5 cursor-pointer select-none transition-colors hover:border-ui-line-strong active:bg-ui-subtle focus-within:shadow-ui-focus"
  >
    <!-- Task Title -->
    <h5 class="text-ui-body font-medium text-ui-ink leading-snug break-words">
      {{ task.name }}
    </h5>

    <!-- Labels/Tags Row -->
    <div class="flex items-center gap-1.5 mt-2.5 flex-wrap">
      <UiBadge :tone="priorityTone" class="capitalize">{{ task.priority }}</UiBadge>
      <span
        v-if="task.type"
        class="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md bg-ui-subtle text-ui-cap font-medium text-ui-text max-w-[140px]"
        :title="task.type"
      >
        <span v-if="task.color" class="w-1.5 h-1.5 rounded-full shrink-0" :class="typeColor.dot" aria-hidden="true"></span>
        <span class="truncate">{{ task.type }}</span>
      </span>
    </div>

    <!-- Footer with Assignee and Due Date -->
    <div class="flex items-center justify-between gap-2 mt-3">
      <!-- Assignee Avatar + Name -->
      <div class="flex items-center gap-1.5 min-w-0">
        <Avatar
          :src="task.assignee?.user?.profile_photo"
          :alt="task.assignee?.user?.name || 'Unassigned'"
          size="w-6 h-6"
          icon-size="w-3 h-3"
          rounded="rounded-full"
        />
        <span class="text-ui-cap text-ui-muted truncate">
          {{ task.assignee?.user?.name || "Unassigned" }}
        </span>
      </div>

      <!-- Due Date -->
      <div
        class="flex items-center gap-1 shrink-0 text-ui-cap tabular-nums"
        :class="isOverdue ? 'text-ui-bad font-medium' : 'text-ui-muted'"
      >
        <AlertCircle v-if="isOverdue" class="w-3.5 h-3.5" />
        <Clock v-else class="w-3.5 h-3.5 text-ui-faint" />
        <span>{{ formatDate(task.due_date) }}</span>
      </div>
    </div>
  </div>
</template>
