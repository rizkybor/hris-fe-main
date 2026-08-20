<script setup>
import { ref, computed, onMounted, watch } from "vue";
import {
  X,
  Calendar,
  Tag,
  AlignLeft,
  Search,
  SearchX,
  UserCheck,
  ChevronDown,
  Pencil,
  Check,
  ClipboardList,
  Trash2,
  Upload,
  Eye,
  Image as ImageIcon,
} from "lucide-vue-next";
import Avatar from "@/components/common/Avatar.vue";
import TaskComments from "./TaskComments.vue";
import { debounce } from "lodash";
import { getPriorityColor, TASK_TYPE_COLORS, getTaskTypeColorClasses } from "@/utils/styleHelpers";
import { formatDate } from "@/utils/dateUtils";
import { useEmployeeStore } from "@/stores/employee";
import { useTaskStore } from "@/stores/task";
import { storeToRefs } from "pinia";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";

const alertModal = useAlertModalStore();

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB, matches backend "standard size" limit

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
  // { type, color }[] -- every task type already used in this project.
  typeSuggestions: {
    type: Array,
    default: () => [],
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
const isEditingDetails = ref(false);
const editedName = ref("");
const editedDescription = ref("");
const editedPriority = ref("medium");
const editedType = ref("");
const editedColor = ref(null);
const isSavingDetails = ref(false);
const detailsError = ref("");

const taskTypeColor = computed(() => getTaskTypeColorClasses(props.task?.color));
const editedTypeColor = computed(() => getTaskTypeColorClasses(editedColor.value));

watch(editedType, (value) => {
  const match = props.typeSuggestions.find((s) => s.type === value);
  if (match?.color) editedColor.value = match.color;
});

// Image upload/delete/view
const editedImage = ref(null);
const removeImageFlag = ref(false);
const imagePreviewUrl = ref("");
const imageError = ref("");
const imageInput = ref(null);
const lightboxOpen = ref(false);
const isDeletingImage = ref(false);

const closeModal = () => {
  isEditingDetails.value = false;
  emit("close");
};

const toggleEditDetails = () => {
  isEditingDetails.value = true;
  editedName.value = props.task?.name ?? "";
  editedDescription.value = props.task?.description ?? "";
  editedPriority.value = props.task?.priority ?? "medium";
  editedType.value = props.task?.type ?? "";
  editedColor.value = props.task?.color ?? null;
  editedImage.value = null;
  removeImageFlag.value = false;
  imagePreviewUrl.value = props.task?.image ?? "";
  imageError.value = "";
  detailsError.value = "";
};

const cancelEditDetails = () => {
  isEditingDetails.value = false;
  detailsError.value = "";
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
  editedImage.value = file;
  removeImageFlag.value = false;
  imagePreviewUrl.value = URL.createObjectURL(file);
};

const removeImageInEditor = () => {
  editedImage.value = null;
  removeImageFlag.value = true;
  imagePreviewUrl.value = "";
  imageError.value = "";
  if (imageInput.value) imageInput.value.value = "";
};

const handleSaveDetails = async () => {
  if (!editedName.value.trim()) {
    detailsError.value = "Task name is required.";
    return;
  }

  isSavingDetails.value = true;
  detailsError.value = "";
  try {
    const payload = {
      name: editedName.value,
      description: editedDescription.value,
      priority: editedPriority.value,
      type: editedType.value || "",
      color: editedColor.value || "",
    };
    if (editedImage.value) {
      payload.image = editedImage.value;
    } else if (removeImageFlag.value) {
      payload.remove_image = true;
    }

    await updateTask(props.task.id, payload);
    await fetchProjectTasks(props.projectId);
    emit("updated");
    isEditingDetails.value = false;
  } catch (error) {
    detailsError.value =
      typeof taskStore.error === "string" ? taskStore.error : "Failed to update task.";
  } finally {
    isSavingDetails.value = false;
  }
};

// Quick delete for the current image, without entering full edit mode.
const handleDeleteImage = async () => {
  if (!(await alertModal.confirm("Delete this task's image?"))) return;

  isDeletingImage.value = true;
  try {
    await updateTask(props.task.id, { remove_image: true });
    await fetchProjectTasks(props.projectId);
    emit("updated");
  } catch (error) {
    console.error("Failed to delete image:", error);
  } finally {
    isDeletingImage.value = false;
  }
};

const handleDelete = async () => {
  if (await alertModal.confirm("Are you sure you want to delete this task?")) {
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
  <Transition name="fade">
    <div
      v-if="isOpen && task"
      class="fixed inset-0 z-50 flex items-center justify-center p-5"
      @click.self="closeModal"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"></div>

      <!-- Modal Container -->
      <div
        class="relative bg-white rounded-[18px] sm:rounded-[24px] border shadow-2xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        :class="task.color ? taskTypeColor.border : 'border-[#DCDEDD]'"
        @click.stop
      >
        <!-- Color accent bar -->
        <div v-if="task.color" class="h-1.5" :class="taskTypeColor.dot"></div>

        <!-- Modal Header -->
        <div
          class="flex items-start justify-between gap-3 sm:gap-3.5 p-4 sm:p-6 border-b border-[#DCDEDD]"
          :class="task.color ? taskTypeColor.accentBg : ''"
        >
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <div class="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5">
              <ClipboardList class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div class="flex-1 min-w-0">
              <input
                v-if="isEditingDetails"
                v-model="editedName"
                type="text"
                class="text-base sm:text-lg font-bold text-brand-dark border-b-2 border-[#0C51D9] focus:outline-none w-full pb-1.5"
              />
              <h2 v-else class="text-brand-dark text-base sm:text-lg font-bold truncate">
                {{ task.name }}
              </h2>
              <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                <p class="text-brand-light text-xs">
                  in list <span class="font-semibold capitalize">{{ task.status.replace("_", " ") }}</span>
                </p>
                <span
                  v-if="task.type && !isEditingDetails"
                  :class="[taskTypeColor.bg, taskTypeColor.text]"
                  class="px-2.5 py-0.5 rounded-md text-xs font-semibold"
                >
                  {{ task.type }}
                </span>
              </div>
            </div>
          </div>
          <button
            @click="closeModal"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150 shrink-0"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Main Content (Left Side) -->
              <div class="md:col-span-2 space-y-5">
                <!-- Labels/Priority -->
                <div>
                  <div class="flex items-center gap-2 mb-2.5">
                    <Tag class="w-3.5 h-3.5 text-brand-light" />
                    <h3 class="text-brand-dark text-xs font-semibold">Priority</h3>
                  </div>
                  <div class="relative" v-if="isEditingDetails">
                    <select
                      v-model="editedPriority"
                      class="px-4 py-2.5 border border-[#DCDEDD] rounded-[10px] text-sm font-semibold hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 appearance-none pr-9"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div v-else class="flex items-center gap-2.5">
                    <span
                      :class="getPriorityColor(task.priority)"
                      class="px-3 py-1.5 rounded-[8px] text-xs font-semibold capitalize"
                    >
                      {{ task.priority }}
                    </span>
                  </div>
                </div>

                <!-- Task Type & Color -->
                <div>
                  <div class="flex items-center gap-2 mb-2.5">
                    <Tag class="w-3.5 h-3.5 text-brand-light" />
                    <h3 class="text-brand-dark text-xs font-semibold">Task Type</h3>
                  </div>
                  <template v-if="isEditingDetails">
                    <div class="relative mb-3">
                      <input
                        v-model="editedType"
                        type="text"
                        list="task-type-suggestions-edit"
                        maxlength="100"
                        placeholder="e.g. Bug, Feature, Design, Copywriting..."
                        class="w-full px-4 py-2.5 text-sm border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
                      />
                      <datalist id="task-type-suggestions-edit">
                        <option v-for="s in typeSuggestions" :key="s.type" :value="s.type" />
                      </datalist>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <button
                        v-for="swatch in TASK_TYPE_COLORS"
                        :key="swatch.key"
                        type="button"
                        :title="swatch.label"
                        @click="editedColor = editedColor === swatch.key ? null : swatch.key"
                        class="w-6 h-6 rounded-full transition-all duration-150"
                        :class="[swatch.dot, editedColor === swatch.key ? `ring-2 ring-offset-2 ${swatch.ring}` : 'opacity-70 hover:opacity-100']"
                      ></button>
                      <span v-if="editedColor" class="text-xs font-semibold ml-1.5" :class="editedTypeColor.text">{{ editedTypeColor.label }}</span>
                    </div>
                  </template>
                  <div v-else-if="task.type" class="flex items-center gap-2.5">
                    <span :class="[taskTypeColor.bg, taskTypeColor.text]" class="px-3 py-1.5 rounded-[8px] text-xs font-semibold">
                      {{ task.type }}
                    </span>
                  </div>
                  <p v-else class="text-brand-light text-xs italic">No type set</p>
                </div>

                <!-- Image (Optional) -->
                <div>
                  <div class="flex items-center gap-2 mb-2.5">
                    <ImageIcon class="w-3.5 h-3.5 text-brand-light" />
                    <h3 class="text-brand-dark text-xs font-semibold">
                      Image <span class="text-brand-light font-normal">(optional)</span>
                    </h3>
                  </div>

                  <input
                    ref="imageInput"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    class="hidden"
                    @change="handleImageSelect"
                  />

                  <!-- Edit mode -->
                  <template v-if="isEditingDetails">
                    <div v-if="imagePreviewUrl" class="relative w-full sm:w-48">
                      <img
                        :src="imagePreviewUrl"
                        alt="Task image"
                        class="w-full h-32 object-cover rounded-[10px] border border-[#DCDEDD] cursor-pointer"
                        @click="lightboxOpen = true"
                      />
                      <div class="absolute top-1.5 right-1.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          @click="lightboxOpen = true"
                          class="w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                          title="View image"
                        >
                          <Eye class="w-3 h-3 text-gray-600" />
                        </button>
                        <button
                          type="button"
                          @click="removeImageInEditor"
                          class="w-6 h-6 rounded-full bg-white/90 hover:bg-red-50 flex items-center justify-center shadow-sm transition-colors"
                          title="Remove image"
                        >
                          <X class="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                    <button
                      v-else
                      type="button"
                      @click="imageInput.click()"
                      class="w-full sm:w-48 h-32 border-2 border-dashed border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300 flex flex-col items-center justify-center gap-2"
                    >
                      <div class="w-8 h-8 bg-blue-50 rounded-[8px] flex items-center justify-center">
                        <Upload class="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span class="text-brand-dark text-xs font-semibold">Upload Image</span>
                      <span class="text-brand-light text-xs">PNG, JPG, WEBP up to 2MB</span>
                    </button>
                    <p v-if="imageError" class="text-red-500 text-xs mt-2">{{ imageError }}</p>
                  </template>

                  <!-- View mode -->
                  <template v-else>
                    <div v-if="task.image" class="relative w-full sm:w-48">
                      <img
                        :src="task.image"
                        alt="Task image"
                        class="w-full h-32 object-cover rounded-[10px] border border-[#DCDEDD] cursor-pointer"
                        @click="lightboxOpen = true"
                      />
                      <div class="absolute top-1.5 right-1.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          @click="lightboxOpen = true"
                          class="w-6 h-6 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                          title="View image"
                        >
                          <Eye class="w-3 h-3 text-gray-600" />
                        </button>
                        <button
                          v-if="can('task-edit')"
                          type="button"
                          @click="handleDeleteImage"
                          :disabled="isDeletingImage"
                          class="w-6 h-6 rounded-full bg-white/90 hover:bg-red-50 flex items-center justify-center shadow-sm transition-colors disabled:opacity-50"
                          title="Delete image"
                        >
                          <Trash2 class="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                    <p v-else class="text-brand-light text-xs italic">No image attached</p>
                  </template>
                </div>

                <!-- Description -->
                <div>
                  <div class="flex items-center gap-2 mb-2.5">
                    <AlignLeft class="w-3.5 h-3.5 text-brand-light" />
                    <h3 class="text-brand-dark text-xs font-semibold">
                      Description
                    </h3>
                  </div>
                  <textarea
                    v-if="isEditingDetails"
                    v-model="editedDescription"
                    rows="4"
                    placeholder="Add a description..."
                    class="w-full bg-gray-50 rounded-[10px] p-4 text-sm text-brand-dark leading-relaxed border border-[#DCDEDD] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 resize-none"
                  ></textarea>
                  <div
                    v-else
                    class="bg-gray-50 rounded-[10px] p-4 text-sm text-brand-light leading-relaxed min-h-[80px]"
                  >
                    <p v-if="task.description">{{ task.description }}</p>
                    <p v-else class="text-gray-400 italic">
                      No description added
                    </p>
                  </div>

                  <p v-if="detailsError" class="text-red-500 text-xs mt-2.5">
                    {{ detailsError }}
                  </p>

                  <div v-if="isEditingDetails" class="flex gap-2.5 mt-3">
                    <button
                      type="button"
                      @click="handleSaveDetails"
                      :disabled="isSavingDetails"
                      class="btn-primary rounded-[10px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2.5 disabled:opacity-50"
                    >
                      <span class="text-brand-white text-xs font-semibold">
                        {{ isSavingDetails ? "Saving..." : "Save Changes" }}
                      </span>
                    </button>
                    <button
                      type="button"
                      @click="cancelEditDetails"
                      class="border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2.5 flex items-center gap-2.5"
                    >
                      <span class="text-brand-dark text-xs font-semibold">Cancel</span>
                    </button>
                  </div>
                </div>

                <!-- Comments -->
                <TaskComments
                  v-if="!isEditingDetails"
                  :task-id="task.id"
                  :project-id="projectId"
                  :can-comment="task.can_comment !== false"
                />
              </div>

              <!-- Sidebar (Right Side) -->
              <div class="space-y-5">
                <!-- Assignee -->
                <div v-if="!isEditingDetails" class="relative">
                  <h3
                    class="text-brand-light text-xs font-semibold uppercase mb-2.5"
                  >
                    Assignee
                  </h3>

                  <!-- Selected Assignee Display -->
                  <div
                    class="p-3 bg-gray-50 rounded-[10px] border border-[#DCDEDD] mb-2.5"
                    v-if="selectedAssignee"
                  >
                    <div class="flex items-center gap-3">
                      <Avatar
                        :src="selectedAssignee?.user?.profile_photo"
                        :alt="selectedAssignee?.user?.name"
                        size="w-9 h-9"
                      />
                      <div class="flex-1 min-w-0">
                        <h4 class="text-brand-dark text-xs font-semibold truncate">
                          {{ selectedAssignee?.user?.name }}
                        </h4>
                        <p class="text-brand-light text-xs truncate">
                          {{ selectedAssignee?.job_information?.job_title }}
                        </p>
                      </div>
                      <button
                        v-if="can('task-edit')"
                        type="button"
                        @click="handleRemoveAssignee"
                        class="text-gray-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        <X class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <!-- Dropdown Toggle Button -->
                  <button
                    v-if="can('task-edit')"
                    type="button"
                    class="w-full border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3 py-2.5 flex items-center gap-3 text-left"
                    @click="toggleAssigneeDropdown"
                  >
                    <UserCheck class="w-3.5 h-3.5 text-gray-400" />
                    <span class="text-brand-dark text-xs font-medium flex-1">
                      {{
                        selectedAssignee ? "Change assignee" : "Select assignee"
                      }}
                    </span>
                    <ChevronDown
                      class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200"
                      :class="{ 'rotate-180': assigneeDropdown }"
                    />
                  </button>

                  <!-- Dropdown Menu -->
                  <div
                    v-if="assigneeDropdown"
                    class="absolute top-full left-0 right-0 mt-2.5 bg-white border border-[#DCDEDD] rounded-[12px] shadow-lg z-10 max-h-80 overflow-hidden flex flex-col"
                  >
                    <!-- Search -->
                    <div class="p-3 border-b border-[#DCDEDD]">
                      <div class="relative flex items-center">
                        <div class="absolute left-2.5 pointer-events-none">
                          <Search class="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          v-model="searchAssignee"
                          placeholder="Search employees..."
                          class="w-full pl-8 pr-3.5 py-2 text-xs border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] focus:border-[#0C51D9] transition-all duration-300 outline-none"
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
                        <Avatar
                          :src="employee.user?.profile_photo"
                          :alt="employee.user?.name"
                          size="w-7 h-7"
                          icon-size="w-3 h-3"
                        />
                        <div class="flex-1 min-w-0">
                          <p class="text-brand-dark text-xs font-medium truncate">
                            {{ employee.user?.name }}
                          </p>
                          <p class="text-brand-light text-xs truncate">
                            {{ employee.job_information?.job_title }}
                          </p>
                        </div>
                      </button>

                      <!-- No Results -->
                      <div
                        v-if="employees.length === 0"
                        class="p-5 text-center"
                      >
                        <SearchX class="w-7 h-7 text-gray-400 mx-auto mb-2" />
                        <p class="text-xs text-gray-500">No employees found</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Due Date -->
                <div>
                  <div class="flex items-center justify-between mb-2.5">
                    <h3 class="text-brand-light text-xs font-semibold uppercase">
                      Due Date
                    </h3>
                    <button
                      v-if="!dueDateEditing && can('task-edit')"
                      type="button"
                      @click="toggleDueDateEdit"
                      class="text-gray-400 hover:text-[#0C51D9] transition-colors"
                    >
                      <Pencil class="w-3 h-3" />
                    </button>
                  </div>

                  <!-- Display Mode -->
                  <div v-if="!dueDateEditing" class="flex items-center gap-2.5">
                    <div class="p-2 bg-gray-100 rounded-lg">
                      <Calendar class="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div>
                      <p class="text-brand-dark text-xs font-medium">
                        {{ formatDate(task.due_date) }}
                      </p>
                    </div>
                  </div>

                  <!-- Edit Mode -->
                  <div v-else class="space-y-2.5">
                    <input
                      type="date"
                      v-model="editedDueDate"
                      class="w-full px-3 py-2 text-xs border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] focus:border-[#0C51D9] transition-all duration-300 outline-none"
                    />
                    <div class="flex gap-2.5">
                      <button
                        type="button"
                        @click="handleUpdateDueDate"
                        class="btn-primary flex-1 rounded-[8px] border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-3.5 py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Check class="w-3 h-3 text-white" />
                        <span class="text-brand-white">Save</span>
                      </button>
                      <button
                        type="button"
                        @click="cancelDueDateEdit"
                        class="flex-1 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3.5 py-2 text-xs font-semibold text-brand-dark"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Status -->
                <div v-if="!isEditingDetails">
                  <h3
                    class="text-brand-light text-xs font-semibold uppercase mb-2.5"
                  >
                    Status
                  </h3>
                  <div
                    class="px-3 py-2 bg-gray-100 rounded-[10px] text-xs font-medium text-brand-dark capitalize"
                  >
                    {{ task.status.replace("_", " ") }}
                  </div>
                </div>

                <!-- Actions -->
                <div>
                  <h3
                    class="text-brand-light text-xs font-semibold uppercase mb-2.5"
                  >
                    Actions
                  </h3>
                  <div class="space-y-2.5">
                    <button
                      v-if="can('task-edit') && !isEditingDetails"
                      @click="toggleEditDetails"
                      class="btn-primary w-full rounded-[10px] border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center justify-center gap-2.5"
                    >
                      <Pencil class="w-3.5 h-3.5 text-white" />
                      <span class="text-brand-white text-xs font-semibold">Edit Task</span>
                    </button>
                    <button
                      v-if="can('task-delete')"
                      @click="handleDelete"
                      class="w-full border border-red-200 rounded-[10px] hover:border-red-300 hover:bg-red-50 bg-red-50/60 transition-all duration-300 px-4 py-2.5 flex items-center justify-center gap-2.5"
                    >
                      <Trash2 class="w-3.5 h-3.5 text-red-600" />
                      <span class="text-red-600 text-xs font-semibold">Delete Task</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  </Transition>

  <!-- Image Lightbox -->
  <Transition name="fade">
    <div
      v-if="lightboxOpen && (imagePreviewUrl || task?.image)"
      class="fixed inset-0 z-[60] flex items-center justify-center p-5"
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
      <img
        :src="isEditingDetails ? imagePreviewUrl : task?.image"
        alt="Task image"
        class="relative w-[min(90vw,900px)] max-h-[85vh] rounded-[12px] object-contain"
      />
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
