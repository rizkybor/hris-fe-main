<script setup>
import { ref, watch } from "vue";
import { X, ListPlus, ClipboardList, AlignLeft, Flag, Layers, Calendar, Upload, Eye } from "lucide-vue-next";
import { useAlertModalStore } from "@/stores/alertModal";

const alertModal = useAlertModalStore();

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB, matches backend "standard size" limit

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

const defaultFormData = () => ({
  name: "",
  description: "",
  priority: "medium",
  status: "todo",
  due_date: "",
  project_id: props.projectId,
  image: null,
});

const formData = ref(defaultFormData());
const imagePreviewUrl = ref("");
const imageError = ref("");
const imageInput = ref(null);
const lightboxOpen = ref(false);

const isSubmitting = ref(false);

// Reset form when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      formData.value = defaultFormData();
      imagePreviewUrl.value = "";
      imageError.value = "";
      lightboxOpen.value = false;
    }
  }
);

const closeModal = () => {
  emit("close");
};

const handleImageSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    imageError.value = "File must be an image.";
    return;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    imageError.value = "Image must be 2MB or smaller.";
    return;
  }

  imageError.value = "";
  formData.value.image = file;
  imagePreviewUrl.value = URL.createObjectURL(file);
};

const removeImage = () => {
  formData.value.image = null;
  imagePreviewUrl.value = "";
  imageError.value = "";
  if (imageInput.value) imageInput.value.value = "";
};

const handleSubmit = async () => {
  if (!formData.value.name) {
    await alertModal.alert("Please enter task name", { type: "warning" });
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
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeModal"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"></div>

      <!-- Modal Container -->
      <div
        class="relative bg-white rounded-[18px] sm:rounded-[24px] border border-[#DCDEDD] shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 border-b border-[#DCDEDD]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
              <ListPlus class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h2 class="text-brand-dark text-lg sm:text-xl font-bold">Create New Task</h2>
              <p class="text-brand-light text-xs sm:text-sm">Add a task to this project's board</p>
            </div>
          </div>
          <button
            type="button"
            @click="closeModal"
            class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150 shrink-0"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <form @submit.prevent="handleSubmit" class="p-4 sm:p-6 space-y-5">
          <!-- Task Name -->
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">
              Task Name <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <ClipboardList class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="formData.name"
                type="text"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
                placeholder="Enter task name"
                required
              />
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">
              Description
            </label>
            <div class="relative">
              <div class="absolute top-3 left-0 pl-4 flex items-start pointer-events-none">
                <AlignLeft class="w-5 h-5 text-gray-400" />
              </div>
              <textarea
                v-model="formData.description"
                rows="4"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 resize-none"
                placeholder="Enter task description"
              ></textarea>
            </div>
          </div>

          <!-- Priority and Status -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Priority -->
            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-1.5">
                Priority
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Flag class="w-5 h-5 text-gray-400" />
                </div>
                <select
                  v-model="formData.priority"
                  class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <!-- Status -->
            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-1.5">
                Status
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Layers class="w-5 h-5 text-gray-400" />
                </div>
                <select
                  v-model="formData.status"
                  class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold appearance-none"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Due Date -->
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">
              Due Date
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="formData.due_date"
                type="date"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <!-- Image (Optional) -->
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">
              Image <span class="text-brand-light font-normal">(optional, max 2MB)</span>
            </label>

            <input
              ref="imageInput"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              class="hidden"
              @change="handleImageSelect"
            />

            <div v-if="imagePreviewUrl" class="relative w-full sm:w-56">
              <img
                :src="imagePreviewUrl"
                alt="Task image preview"
                class="w-full h-36 object-cover rounded-[12px] border border-[#DCDEDD] cursor-pointer"
                @click="lightboxOpen = true"
              />
              <div class="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  @click="lightboxOpen = true"
                  class="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                  title="View image"
                >
                  <Eye class="w-3.5 h-3.5 text-gray-600" />
                </button>
                <button
                  type="button"
                  @click="removeImage"
                  class="w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 flex items-center justify-center shadow-sm transition-colors"
                  title="Remove image"
                >
                  <X class="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
            <button
              v-else
              type="button"
              @click="imageInput.click()"
              class="w-full sm:w-56 h-36 border-2 border-dashed border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300 flex flex-col items-center justify-center gap-1.5"
            >
              <div class="w-9 h-9 bg-blue-50 rounded-[10px] flex items-center justify-center">
                <Upload class="w-4 h-4 text-blue-600" />
              </div>
              <span class="text-brand-dark text-xs font-semibold">Upload Image</span>
              <span class="text-brand-light text-[11px]">PNG, JPG, WEBP up to 2MB</span>
            </button>

            <p v-if="imageError" class="text-red-500 text-xs mt-1.5">{{ imageError }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2">
            <button
              type="button"
              @click="closeModal"
              class="border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span class="text-brand-dark text-sm font-semibold">Cancel</span>
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="btn-primary w-full sm:w-auto rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ListPlus class="w-4 h-4 text-white" />
              <span class="text-brand-white text-sm font-semibold">
                {{ isSubmitting ? "Creating..." : "Create Task" }}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>

  <!-- Image Lightbox -->
  <Transition name="fade">
    <div
      v-if="lightboxOpen && imagePreviewUrl"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
      @click="lightboxOpen = false"
    >
      <div class="absolute inset-0 bg-brand-dark/70 backdrop-blur-sm"></div>
      <button
        type="button"
        @click="lightboxOpen = false"
        class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
      >
        <X class="w-5 h-5" />
      </button>
      <img :src="imagePreviewUrl" alt="Task image" class="relative max-w-full max-h-[85vh] rounded-[12px] object-contain" />
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .relative,
.fade-leave-active .relative {
  transition: transform 0.3s ease;
}

.fade-enter-from .relative,
.fade-leave-to .relative {
  transform: scale(0.95);
}
</style>
