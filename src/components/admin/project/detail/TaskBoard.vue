<script setup>
import { ref, computed, onMounted } from "vue";
import { ListChecks, Plus, Search } from "lucide-vue-next";
import { VueDraggableNext } from "vue-draggable-next";
import { useTaskStore } from "@/stores/task";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { can } from "@/helpers/permissionHelper";
import TaskCard from "./TaskCard.vue";
import TaskDetailModal from "./TaskDetailModal.vue";
import TaskCreateModal from "./TaskCreateModal.vue";

const route = useRoute();
const taskStore = useTaskStore();
const { tasks: allTasks, loading } = storeToRefs(taskStore);
const { fetchProjectTasks, updateTaskStatus, createTask, deleteTask } = taskStore;

const searchQuery = ref("");
const actionError = ref("");

const tasks = computed(() => {
  if (!searchQuery.value.trim()) return allTasks.value;
  const query = searchQuery.value.trim().toLowerCase();
  return allTasks.value.filter(
    (task) =>
      task.name?.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.assignee?.user?.name?.toLowerCase().includes(query)
  );
});
const isModalOpen = ref(false);
const selectedTaskId = ref(null);
const isCreateModalOpen = ref(false);

// Computed property to get always fresh task data from store
const selectedTask = computed(() => {
  if (!selectedTaskId.value) return null;
  return allTasks.value.find((task) => task.id === selectedTaskId.value) || null;
});

const openTaskDetail = (task) => {
  selectedTaskId.value = task.id;
  isModalOpen.value = true;
};

const closeTaskDetail = () => {
  isModalOpen.value = false;
  selectedTaskId.value = null;
};

const openCreateModal = () => {
  isCreateModalOpen.value = true;
};

const closeCreateModal = () => {
  isCreateModalOpen.value = false;
};

const handleCreateTask = async (taskData) => {
  actionError.value = "";
  try {
    await createTask(taskData);
    await fetchProjectTasks(route.params.id);
  } catch (error) {
    actionError.value =
      typeof taskStore.error === "string" ? taskStore.error : "Failed to create task.";
  }
};

const handleDeleteTask = async (taskId) => {
  actionError.value = "";
  try {
    await deleteTask(taskId);
    await fetchProjectTasks(route.params.id);
  } catch (error) {
    actionError.value =
      typeof taskStore.error === "string" ? taskStore.error : "Failed to delete task.";
  }
};

const handleStatusChange = async (taskId, newStatus) => {
  actionError.value = "";
  try {
    await updateTaskStatus(taskId, newStatus);
  } catch (error) {
    actionError.value =
      typeof taskStore.error === "string"
        ? taskStore.error
        : "Failed to move task. Reverting.";
    // Resync with server state so the board reflects reality after a failed move
    await fetchProjectTasks(route.params.id);
  }
};

// Writable computed properties untuk drag and drop
const todoTask = computed({
  get: () => tasks.value.filter((task) => task.status === "todo"),
  set: (value) => {
    // Detect moved task
    const movedTask = value.find(
      (task) => !tasks.value.filter((t) => t.status === "todo").includes(task)
    );
    if (movedTask && movedTask.status !== "todo") {
      handleStatusChange(movedTask.id, "todo");
    }
  },
});

const inProgressTasks = computed({
  get: () => tasks.value.filter((task) => task.status === "in_progress"),
  set: (value) => {
    const movedTask = value.find(
      (task) =>
        !tasks.value.filter((t) => t.status === "in_progress").includes(task)
    );
    if (movedTask && movedTask.status !== "in_progress") {
      handleStatusChange(movedTask.id, "in_progress");
    }
  },
});

const reviewTasks = computed({
  get: () => tasks.value.filter((task) => task.status === "review"),
  set: (value) => {
    const movedTask = value.find(
      (task) => !tasks.value.filter((t) => t.status === "review").includes(task)
    );
    if (movedTask && movedTask.status !== "review") {
      handleStatusChange(movedTask.id, "review");
    }
  },
});

const doneTasks = computed({
  get: () => tasks.value.filter((task) => task.status === "done"),
  set: (value) => {
    const movedTask = value.find(
      (task) => !tasks.value.filter((t) => t.status === "done").includes(task)
    );
    if (movedTask && movedTask.status !== "done") {
      handleStatusChange(movedTask.id, "done");
    }
  },
});

// Fetch tasks on mount
onMounted(async () => {
  const projectId = route.params.id;
  if (projectId) {
    await fetchProjectTasks(projectId);
  }
});
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 bg-purple-50 rounded-[12px] flex items-center justify-center"
        >
          <ListChecks class="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-xl font-bold">Project Tasks</h3>
          <p class="text-brand-light text-sm font-normal">
            Manage and track all project tasks
          </p>
        </div>
      </div>
      <button
        v-if="can('task-create')"
        @click="openCreateModal"
        class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold"
          >Create New Task</span
        >
      </button>
    </div>

    <div
      v-if="actionError"
      class="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center justify-between"
    >
      <span>{{ actionError }}</span>
      <button @click="actionError = ''" class="text-red-400 hover:text-red-600">&times;</button>
    </div>

    <!-- Tasks Filter -->
    <div class="mb-6">
      <div class="relative">
        <div
          class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
        >
          <Search class="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
          placeholder="Search tasks..."
          v-model="searchQuery"
        />
      </div>
    </div>

    <!-- Task Management Columns -->
    <div
      class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
    >
      <!-- To Do Column -->
      <div class="bg-gray-50 rounded-[12px] p-4 flex-shrink-0 w-72">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
            <h4 class="text-brand-dark text-base font-semibold">To Do</h4>
          </div>
          <span
            class="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium"
          >
            {{ todoTask.length }}
          </span>
        </div>
        <VueDraggableNext
          v-model="todoTask"
          group="tasks"
          class="space-y-3 min-h-[500px] max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2"
          :animation="200"
        >
          <TaskCard
            v-for="task in todoTask"
            :key="task.id"
            :task="task"
            @click="openTaskDetail(task)"
          />
        </VueDraggableNext>
      </div>

      <!-- In Progress Column -->
      <div class="bg-blue-50 rounded-[12px] p-4 flex-shrink-0 w-72">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h4 class="text-brand-dark text-base font-semibold">In Progress</h4>
          </div>
          <span
            class="bg-blue-200 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
          >
            {{ inProgressTasks.length }}
          </span>
        </div>
        <VueDraggableNext
          v-model="inProgressTasks"
          group="tasks"
          class="space-y-3 min-h-[500px] max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2"
          :animation="200"
        >
          <TaskCard
            v-for="task in inProgressTasks"
            :key="task.id"
            :task="task"
            @click="openTaskDetail(task)"
          />
        </VueDraggableNext>
      </div>

      <!-- Review Column -->
      <div class="bg-yellow-50 rounded-[12px] p-4 flex-shrink-0 w-72">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <h4 class="text-brand-dark text-base font-semibold">Review</h4>
          </div>
          <span
            class="bg-yellow-200 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium"
          >
            {{ reviewTasks.length }}
          </span>
        </div>
        <VueDraggableNext
          v-model="reviewTasks"
          group="tasks"
          class="space-y-3 min-h-[500px] max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2"
          :animation="200"
        >
          <TaskCard
            v-for="task in reviewTasks"
            :key="task.id"
            :task="task"
            @click="openTaskDetail(task)"
          />
        </VueDraggableNext>
      </div>

      <!-- Done Column -->
      <div class="bg-green-50 rounded-[12px] p-4 flex-shrink-0 w-72">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
            <h4 class="text-brand-dark text-base font-semibold">Done</h4>
          </div>
          <span
            class="bg-green-200 text-green-700 px-2 py-1 rounded-full text-xs font-medium"
          >
            {{ doneTasks.length }}
          </span>
        </div>
        <VueDraggableNext
          v-model="doneTasks"
          group="tasks"
          class="space-y-3 min-h-[500px] max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2"
          :animation="200"
        >
          <TaskCard
            v-for="task in doneTasks"
            :key="task.id"
            :task="task"
            @click="openTaskDetail(task)"
          />
        </VueDraggableNext>
      </div>
    </div>

    <!-- Task Detail Modal -->
    <TaskDetailModal
      :task="selectedTask"
      :is-open="isModalOpen"
      :project-id="parseInt(route.params.id)"
      @close="closeTaskDetail"
      @deleted="handleDeleteTask"
    />

    <!-- Task Create Modal -->
    <TaskCreateModal
      :is-open="isCreateModalOpen"
      :project-id="route.params.id"
      @close="closeCreateModal"
      @created="handleCreateTask"
    />
  </div>
</template>
