<script setup>
import { ref, watch } from "vue";
import { X } from "lucide-vue-next";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  projectId: {
    type: [String, Number],
    required: true,
  },
});

const emit = defineEmits(["close", "created"]);

const formData = ref({
  name: "",
  description: "",
  priority: "medium",
  status: "todo",
  due_date: "",
  project_id: props.projectId,
});

const isSubmitting = ref(false);

// Reset form when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      formData.value = {
        name: "",
        description: "",
        priority: "medium",
        status: "todo",
        due_date: "",
        project_id: props.projectId,
      };
    }
  }
);

const closeModal = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!formData.value.name) {
    alert("Please enter task name");
    return;
  }

  isSubmitting.value = true;

  try {
    emit("created", { ...formData.value });
    closeModal();
  } catch (error) {
    console.error("Error creating task:", error);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isOpen"
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
          class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
          @click.stop
        >
          <!-- Modal Header -->
          <div
            class="flex items-center justify-between p-6 border-b border-gray-200"
          >
            <h2 class="text-2xl font-bold text-gray-900">Create New Task</h2>
            <button
              @click="closeModal"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X class="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <!-- Modal Body -->
          <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
            <!-- Task Name -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Task Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#0C51D9] focus:ring-2 focus:ring-[#0C51D9] focus:ring-opacity-20 transition-all"
                placeholder="Enter task name"
                required
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                v-model="formData.description"
                rows="4"
                class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#0C51D9] focus:ring-2 focus:ring-[#0C51D9] focus:ring-opacity-20 transition-all resize-none"
                placeholder="Enter task description"
              ></textarea>
            </div>

            <!-- Priority and Status -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Priority -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  v-model="formData.priority"
                  class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#0C51D9] focus:ring-2 focus:ring-[#0C51D9] focus:ring-opacity-20 transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <!-- Status -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  v-model="formData.status"
                  class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#0C51D9] focus:ring-2 focus:ring-[#0C51D9] focus:ring-opacity-20 transition-all"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <!-- Due Date -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Due Date
              </label>
              <input
                v-model="formData.due_date"
                type="date"
                class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-[#0C51D9] focus:ring-2 focus:ring-[#0C51D9] focus:ring-opacity-20 transition-all"
              />
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-6 py-3 bg-[#0C51D9] hover:bg-[#0a42b3] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? "Creating..." : "Create Task" }}
              </button>
            </div>
          </form>
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
