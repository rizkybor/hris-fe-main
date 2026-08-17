<script setup>
import { computed } from "vue";
import { Clock, User, AlertCircle } from "lucide-vue-next";
import { getPriorityColor } from "@/utils/styleHelpers";
import { formatDate } from "@/utils/dateUtils";
import Avatar from "@/components/common/Avatar.vue";

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
</script>

<template>
  <div
    @click="handleClick"
    class="bg-white rounded-[12px] shadow-sm hover:shadow-lg transition-all duration-300 p-4 cursor-pointer group border border-[#DCDEDD] hover:border-[#0C51D9] hover:border-2"
  >
    <!-- Task Title -->
    <h5
      class="text-sm font-semibold text-brand-dark mb-3 leading-snug group-hover:text-[#0C51D9] transition-colors"
    >
      {{ task.name }}
    </h5>

    <!-- Labels/Tags Row -->
    <div class="flex items-center gap-2 mb-4">
      <span
        :class="getPriorityColor(task.priority)"
        class="px-2.5 py-1 rounded-md text-xs font-semibold capitalize"
      >
        {{ task.priority }}
      </span>
    </div>

    <!-- Footer with Assignee and Due Date -->
    <div
      class="flex items-center justify-between pt-3 border-t border-gray-100"
    >
      <!-- Assignee Avatar -->
      <Avatar
        :src="task.assignee?.user?.profile_photo"
        :alt="task.assignee?.user?.name || 'Unassigned'"
        size="w-7 h-7"
        icon-size="w-3.5 h-3.5"
        rounded="rounded-full ring-2 ring-white"
      />

      <!-- Due Date -->
      <div
        class="flex items-center gap-1.5 px-2 py-1 rounded-md"
        :class="isOverdue ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'"
      >
        <AlertCircle v-if="isOverdue" class="w-3.5 h-3.5" />
        <Clock v-else class="w-3.5 h-3.5 text-gray-500" />
        <span class="text-xs font-medium">{{
          formatDate(task.due_date)
        }}</span>
      </div>
    </div>
  </div>
</template>
