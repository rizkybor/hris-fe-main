<script setup>
import { computed } from "vue";
import { Clock, User, AlertCircle } from "lucide-vue-next";
import { getPriorityColor, getTaskTypeColorClasses } from "@/utils/styleHelpers";
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

const typeColor = computed(() => getTaskTypeColorClasses(props.task.color));
</script>

<template>
  <div
    @click="handleClick"
    class="bg-white rounded-[12px] shadow-sm hover:shadow-md transition-all duration-300 p-4 cursor-pointer group border border-[#DCDEDD] hover:border-[#0C51D9] hover:border-2"
    :class="task.color ? [typeColor.borderLeft, 'border-l-4'] : ''"
  >
    <!-- Task Title -->
    <h5
      class="text-sm font-semibold text-brand-dark mb-3 leading-snug group-hover:text-[#0C51D9] transition-colors"
    >
      {{ task.name }}
    </h5>

    <!-- Labels/Tags Row -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <span
        :class="getPriorityColor(task.priority)"
        class="px-2.5 py-0.5 rounded-md text-xs font-semibold capitalize"
      >
        {{ task.priority }}
      </span>
      <span
        v-if="task.type"
        :class="[typeColor.bg, typeColor.text]"
        class="px-2.5 py-0.5 rounded-md text-xs font-semibold truncate max-w-[130px]"
        :title="task.type"
      >
        {{ task.type }}
      </span>
    </div>

    <!-- Footer with Assignee and Due Date -->
    <div
      class="flex items-center justify-between pt-3 border-t border-gray-100 gap-2"
    >
      <!-- Assignee Avatar + Name -->
      <div class="flex items-center gap-1.5 min-w-0">
        <Avatar
          :src="task.assignee?.user?.profile_photo"
          :alt="task.assignee?.user?.name || 'Unassigned'"
          size="w-7 h-7"
          icon-size="w-3.5 h-3.5"
          rounded="rounded-full ring-2 ring-white"
        />
        <span class="text-[11px] font-medium text-gray-500 truncate">
          {{ task.assignee?.user?.name || "Unassigned" }}
        </span>
      </div>

      <!-- Due Date -->
      <div
        class="flex items-center gap-1 px-2 py-0.5 rounded-md shrink-0"
        :class="isOverdue ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'"
      >
        <AlertCircle v-if="isOverdue" class="w-3 h-3" />
        <Clock v-else class="w-3 h-3 text-gray-500" />
        <span class="text-[10px] font-medium">{{
          formatDate(task.due_date)
        }}</span>
      </div>
    </div>
  </div>
</template>
