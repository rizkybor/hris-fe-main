<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useTaskStore } from "@/stores/task";
import { formatDateLong as formatDate } from "@/utils/dateUtils.js";
import { Search, Calendar, Folder, ListChecks } from "lucide-vue-next";

const taskStore = useTaskStore();
const { myTasks, loading } = storeToRefs(taskStore);

const searchQuery = ref("");
const statusFilter = ref("");

const taskStatusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Waiting",
  done: "Completed",
};

const taskStatusClasses = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-[#FEF3C7] text-[#D97706]",
  review: "bg-[#EBF8FF] text-[#1E40AF]",
  done: "bg-[#F0FDF4] text-[#166534]",
};

const tasks = computed(() =>
  myTasks.value.map((task) => ({
    id: task.id,
    title: task.name,
    description: task.description,
    status: task.status,
    statusLabel: taskStatusLabels[task.status] ?? task.status,
    statusClass: taskStatusClasses[task.status] ?? "bg-gray-100 text-gray-600",
    dueDate: task.due_date ? formatDate(task.due_date) : "No due date",
    project: task.project?.name ?? "N/A",
    priority: task.priority,
  }))
);

const filteredTasks = computed(() => {
  return tasks.value.filter((task) => {
    const matchesSearch = searchQuery.value
      ? task.title?.toLowerCase().includes(searchQuery.value.toLowerCase())
      : true;
    const matchesStatus = statusFilter.value ? task.status === statusFilter.value : true;
    return matchesSearch && matchesStatus;
  });
});

onMounted(() => {
  taskStore.fetchMyTasks(100);
});
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5 mb-6">
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-orange-50 rounded-[12px] flex items-center justify-center">
            <ListChecks class="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-lg font-bold">My Tasks</h3>
            <p class="text-brand-light text-sm">All tasks assigned to you</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div class="relative w-full sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <Search class="w-4 h-4 text-blue-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search tasks..."
              class="relative w-full pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            />
          </div>

          <select
            v-model="statusFilter"
            class="px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
          >
            <option value="">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Waiting</option>
            <option value="done">Completed</option>
          </select>
        </div>
      </div>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5">
      <div v-if="loading" class="text-center py-12 text-gray-500">Loading tasks...</div>

      <div v-else-if="filteredTasks.length === 0" class="text-center py-12 text-gray-500 bg-gray-50 rounded-[16px] border border-dashed border-[#DCDEDD]">
        <ListChecks class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-lg font-semibold">No tasks found</p>
        <p class="text-sm text-gray-400">You have no tasks matching this filter</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="border border-[#DCDEDD] rounded-[16px] p-4 hover:border-[#0C51D9] hover:border-2 transition-all duration-300"
        >
          <div class="flex items-start justify-between mb-2">
            <h4 class="text-brand-dark text-base font-semibold">{{ task.title }}</h4>
            <span
              :class="task.statusClass"
              class="px-2 py-1 rounded-md text-xs font-semibold flex-shrink-0"
              >{{ task.statusLabel }}</span
            >
          </div>
          <p class="text-brand-light text-sm mb-3 line-clamp-2">{{ task.description }}</p>
          <div class="flex items-center gap-4 text-xs text-gray-600">
            <div class="flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              <span>{{ task.dueDate }}</span>
            </div>
            <div class="flex items-center gap-1">
              <Folder class="w-3 h-3" />
              <span>{{ task.project }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
