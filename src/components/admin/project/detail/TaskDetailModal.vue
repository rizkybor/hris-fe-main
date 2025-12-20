<script setup>
import { ref, onMounted, watch } from "vue";
import {
  X,
  User,
  Calendar,
  Tag,
  AlignLeft,
  MessageSquare,
  Paperclip,
  Search,
  SearchX,
  UserCheck,
  ChevronDown,
  Pencil,
  Check,
} from "lucide-vue-next";
import { debounce } from "lodash";
import { getPriorityColor } from "@/utils/styleHelpers";
import { formatDate } from "@/utils/dateUtils";
import { useEmployeeStore } from "@/stores/employee";
import { useTaskStore } from "@/stores/task";
import { storeToRefs } from "pinia";

const props = defineProps({
  task: {
    type: Object,
    default: null,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
  projectId: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(["close", "deleted", "assigneeChanged", "updated"]);

const employeeStore = useEmployeeStore();
const { employees } = storeToRefs(employeeStore);
const { fetchEmployees } = employeeStore;

const taskStore = useTaskStore();
const { updateTask, fetchProjectTasks } = taskStore;

const assigneeDropdown = ref(false);
const dueDateEditing = ref(false);
const searchAssignee = ref("");
const selectedAssignee = ref(null);
const editedDueDate = ref("");

const closeModal = () => {
  emit("close");
};

const handleDelete = () => {
  if (confirm("Are you sure you want to delete this task?")) {
    emit("deleted", props.task.id);
    closeModal();
  }
};

const toggleAssigneeDropdown = () => {
  assigneeDropdown.value = !assigneeDropdown.value;
  if (assigneeDropdown.value) {
    searchAssignee.value = "";
  }
};

const handleSelectAssignee = async (employee) => {
  try {
    await updateTask(props.task.id, {
      assignee_id: employee.id,
    });
    selectedAssignee.value = employee;

    // Fetch ulang data tasks
    await fetchProjectTasks(props.projectId);

    emit("assigneeChanged", employee);
    emit("updated");
    assigneeDropdown.value = false;
  } catch (error) {
    console.error("Failed to update assignee:", error);
    assigneeDropdown.value = false;
  }
};

const handleRemoveAssignee = async () => {
  try {
    // Kirim string kosong untuk remove assignee (Laravel lebih baik handle string kosong daripada null)
    await updateTask(props.task.id, {
      assignee_id: "",
    });
    selectedAssignee.value = null;

    // Fetch ulang data tasks
    await fetchProjectTasks(props.projectId);

    emit("assigneeChanged", null);
    emit("updated");
  } catch (error) {
    console.error("Failed to remove assignee:", error);
  }
};

const toggleDueDateEdit = () => {
  dueDateEditing.value = !dueDateEditing.value;
  if (dueDateEditing.value && props.task?.due_date) {
    editedDueDate.value = props.task.due_date;
  }
};

const handleUpdateDueDate = async () => {
  try {
    await updateTask(props.task.id, {
      due_date: editedDueDate.value,
    });

    // Fetch ulang data tasks
    await fetchProjectTasks(props.projectId);

    emit("updated");
    dueDateEditing.value = false;
  } catch (error) {
    console.error("Failed to update due date:", error);
    dueDateEditing.value = false;
  }
};

const cancelDueDateEdit = () => {
  dueDateEditing.value = false;
  editedDueDate.value = props.task?.due_date || "";
};

onMounted(async () => {
  await fetchEmployees({
    limit: 6,
    project_id: props.projectId,
  });

  // Set initial assignee from task prop
  if (props.task?.assignee) {
    selectedAssignee.value = props.task.assignee;
  }

  // Set initial due date
  if (props.task?.due_date) {
    editedDueDate.value = props.task.due_date;
  }
});

watch(
  searchAssignee,
  debounce(() => {
    fetchEmployees({
      limit: 6,
      search: searchAssignee.value,
      project_id: props.projectId,
    });
  }, 300),
  { deep: true }
);

// Watch for task changes to update selected assignee
watch(
  () => props.task?.assignee,
  (newAssignee) => {
    selectedAssignee.value = newAssignee;
  }
);

// Watch for task changes to update due date
watch(
  () => props.task?.due_date,
  (newDueDate) => {
    if (newDueDate && !dueDateEditing.value) {
      editedDueDate.value = newDueDate;
    }
  }
);

// Watch for entire task object changes
watch(
  () => props.task,
  (newTask) => {
    if (newTask) {
      if (newTask.assignee) {
        selectedAssignee.value = newTask.assignee;
      }
      if (newTask.due_date && !dueDateEditing.value) {
        editedDueDate.value = newTask.due_date;
      }
    }
  },
  { deep: true }
);
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isOpen && task"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click.self="closeModal"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      ></div>

      <!-- Modal Container -->
      <div class="flex min-h-screen items-center justify-center p-4">
        <div
          class="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          @click.stop
        >
          <!-- Modal Header -->
          <div
            class="flex items-start justify-between p-6 border-b border-gray-200"
          >
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <Tag class="w-5 h-5 text-gray-400" />
                <h2 class="text-2xl font-bold text-gray-900">
                  {{ task.name }}
                </h2>
              </div>
              <p class="text-sm text-gray-500">
                in list <span class="font-semibold">{{ task.status }}</span>
              </p>
            </div>
            <button
              @click="closeModal"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X class="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="flex-1 overflow-y-auto p-6">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Main Content (Left Side) -->
              <div class="lg:col-span-2 space-y-6">
                <!-- Labels/Priority -->
                <div>
                  <div class="flex items-center gap-2 mb-3">
                    <Tag class="w-4 h-4 text-gray-500" />
                    <h3 class="text-sm font-semibold text-gray-700">Labels</h3>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      :class="getPriorityColor(task.priority)"
                      class="px-3 py-1.5 rounded-lg text-sm font-semibold"
                    >
                      {{ task.priority }}
                    </span>
                  </div>
                </div>

                <!-- Description -->
                <div>
                  <div class="flex items-center gap-2 mb-3">
                    <AlignLeft class="w-4 h-4 text-gray-500" />
                    <h3 class="text-sm font-semibold text-gray-700">
                      Description
                    </h3>
                  </div>
                  <div
                    class="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 leading-relaxed min-h-[100px]"
                  >
                    <p v-if="task.description">{{ task.description }}</p>
                    <p v-else class="text-gray-400 italic">
                      No description added
                    </p>
                  </div>
                </div>

                <!-- Comments -->
                <div>
                  <div class="flex items-center gap-2 mb-3">
                    <MessageSquare class="w-4 h-4 text-gray-500" />
                    <h3 class="text-sm font-semibold text-gray-700">
                      Activity
                    </h3>
                  </div>
                  <div class="space-y-3">
                    <!-- Comment Input -->
                    <div class="flex gap-3">
                      <div
                        class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      >
                        U
                      </div>
                      <textarea
                        class="flex-1 border border-gray-200 rounded-lg p-3 text-sm resize-none focus:border-[#0C51D9] focus:ring-2 focus:ring-[#0C51D9] focus:ring-opacity-20 transition-all"
                        placeholder="Write a comment..."
                        rows="3"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <!-- Attachments -->
                <div>
                  <div class="flex items-center gap-2 mb-3">
                    <Paperclip class="w-4 h-4 text-gray-500" />
                    <h3 class="text-sm font-semibold text-gray-700">
                      Attachments
                    </h3>
                  </div>
                  <button
                    class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                  >
                    Add an attachment
                  </button>
                </div>
              </div>

              <!-- Sidebar (Right Side) -->
              <div class="space-y-6">
                <!-- Assignee -->
                <div class="relative">
                  <h3
                    class="text-xs font-semibold text-gray-500 uppercase mb-3"
                  >
                    Assignee
                  </h3>

                  <!-- Selected Assignee Display -->
                  <div
                    class="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2"
                    v-if="selectedAssignee"
                  >
                    <div class="flex items-center gap-3">
                      <img
                        :src="selectedAssignee?.user?.profile_photo"
                        :alt="selectedAssignee?.user?.name"
                        class="w-10 h-10 rounded-full object-cover"
                        v-if="selectedAssignee?.user?.profile_photo"
                      />
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100"
                        v-else
                      >
                        <User class="w-4 h-4 text-gray-400" />
                      </div>
                      <div class="flex-1">
                        <h4 class="text-sm font-semibold text-gray-900">
                          {{ selectedAssignee?.user?.name }}
                        </h4>
                        <p class="text-xs text-gray-500">
                          {{ selectedAssignee?.job_information?.job_title }}
                        </p>
                      </div>
                      <button
                        type="button"
                        @click="handleRemoveAssignee"
                        class="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Dropdown Toggle Button -->
                  <button
                    type="button"
                    class="w-full border border-gray-200 rounded-lg hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300 px-3 py-2 flex items-center gap-3 text-left"
                    @click="toggleAssigneeDropdown"
                  >
                    <UserCheck class="w-4 h-4 text-gray-400" />
                    <span class="text-sm font-medium text-gray-700 flex-1">
                      {{
                        selectedAssignee ? "Change assignee" : "Select assignee"
                      }}
                    </span>
                    <ChevronDown
                      class="w-4 h-4 text-gray-400 transition-transform duration-200"
                      :class="{ 'rotate-180': assigneeDropdown }"
                    />
                  </button>

                  <!-- Dropdown Menu -->
                  <div
                    v-if="assigneeDropdown"
                    class="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-80 overflow-hidden flex flex-col"
                  >
                    <!-- Search -->
                    <div class="p-3 border-b border-gray-200">
                      <div class="relative flex items-center">
                        <div class="absolute left-3 pointer-events-none">
                          <Search class="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          v-model="searchAssignee"
                          placeholder="Search employees..."
                          class="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#0C51D9] focus:outline-none"
                        />
                      </div>
                    </div>

                    <!-- Employee List -->
                    <div class="overflow-y-auto max-h-64">
                      <button
                        v-for="employee in employees"
                        :key="employee.id"
                        type="button"
                        @click="handleSelectAssignee(employee)"
                        class="w-full p-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
                      >
                        <img
                          :src="employee.user?.profile_photo"
                          :alt="employee.user?.name"
                          class="w-8 h-8 rounded-full object-cover"
                          v-if="employee.user?.profile_photo"
                        />
                        <div
                          class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100"
                          v-else
                        >
                          <User class="w-3 h-3 text-gray-400" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">
                            {{ employee.user?.name }}
                          </p>
                          <p class="text-xs text-gray-500 truncate">
                            {{ employee.job_information?.job_title }}
                          </p>
                        </div>
                      </button>

                      <!-- No Results -->
                      <div
                        v-if="employees.length === 0"
                        class="p-4 text-center"
                      >
                        <SearchX class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p class="text-sm text-gray-500">No employees found</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Due Date -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-xs font-semibold text-gray-500 uppercase">
                      Due Date
                    </h3>
                    <button
                      v-if="!dueDateEditing"
                      type="button"
                      @click="toggleDueDateEdit"
                      class="text-gray-400 hover:text-[#0C51D9] transition-colors"
                    >
                      <Pencil class="w-3 h-3" />
                    </button>
                  </div>

                  <!-- Display Mode -->
                  <div v-if="!dueDateEditing" class="flex items-center gap-2">
                    <div class="p-2 bg-gray-100 rounded-lg">
                      <Calendar class="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">
                        {{ formatDate(task.due_date) }}
                      </p>
                    </div>
                  </div>

                  <!-- Edit Mode -->
                  <div v-else class="space-y-2">
                    <input
                      type="date"
                      v-model="editedDueDate"
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#0C51D9] focus:outline-none"
                    />
                    <div class="flex gap-2">
                      <button
                        type="button"
                        @click="handleUpdateDueDate"
                        class="flex-1 px-3 py-1.5 bg-[#0C51D9] text-white rounded-lg text-xs font-medium hover:bg-[#0a42b3] transition-colors flex items-center justify-center gap-1"
                      >
                        <Check class="w-3 h-3" />
                        Save
                      </button>
                      <button
                        type="button"
                        @click="cancelDueDateEdit"
                        class="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Status -->
                <div>
                  <h3
                    class="text-xs font-semibold text-gray-500 uppercase mb-3"
                  >
                    Status
                  </h3>
                  <div
                    class="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 capitalize"
                  >
                    {{ task.status.replace("_", " ") }}
                  </div>
                </div>

                <!-- Actions -->
                <div>
                  <h3
                    class="text-xs font-semibold text-gray-500 uppercase mb-3"
                  >
                    Actions
                  </h3>
                  <div class="space-y-2">
                    <button
                      class="w-full px-4 py-2 bg-[#0C51D9] hover:bg-[#0a42b3] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit Task
                    </button>
                    <button
                      class="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Move to...
                    </button>
                    <button
                      @click="handleDelete"
                      class="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete Task
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
