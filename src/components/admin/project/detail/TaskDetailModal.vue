<script>
// projectId -> Promise<employee[]> for the assignee picker (module scope so
// reopening a task, or another task of the project, needs no request).
const peopleCache = new Map();
</script>

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
import { getPriorityColor, TASK_TYPE_COLORS, getTaskTypeColorClasses } from "@/utils/styleHelpers";
import { formatDate } from "@/utils/dateUtils";
import { axiosInstance } from "@/plugins/axios";
import { useTaskStore } from "@/stores/task";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiBadge, UiButton, UiInput, UiSelect, UiStatusSelect } from "@/components/ui";
import TaskPanel from "./TaskPanel.vue";
import { optimistic } from "@/utils/optimistic";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// Presentation only: priority -> badge tone, status -> badge tone, options.
const PRIORITY_TONES = { urgent: "bad", high: "warn", medium: "info", low: "neutral" };
const STATUS_TONES = { todo: "neutral", in_progress: "accent", review: "warn", done: "ok", cancelled: "neutral" };
const PRIORITY_OPTIONS = computed(() =>
  ["low", "medium", "high", "urgent"].map((value) => ({ value, label: t(`projects.priority.${value}`) }))
);
const TASK_STATUS_KEYS = { todo: "todo", in_progress: "inProgress", review: "review", done: "done", cancelled: "cancelled" };
const taskStatusLabel = (status) =>
  TASK_STATUS_KEYS[status] ? t(`projects.taskStatus.${TASK_STATUS_KEYS[status]}`) : (status || "").replace("_", " ");
const STATUS_OPTIONS = computed(() =>
  Object.keys(TASK_STATUS_KEYS).map((value) => ({ value, label: taskStatusLabel(value), tone: STATUS_TONES[value] }))
);
const priorityLabel = (priority) =>
  PRIORITY_TONES[priority] ? t(`projects.priority.${priority}`) : priority;
const fieldClass =
  "w-full bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";

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

const taskStore = useTaskStore();
const { updateTask } = taskStore;

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

const projectPeople = ref([]);
const peopleLoading = ref(false);
const loadProjectPeople = async () => {
  if (!peopleCache.has(props.projectId)) {
    peopleCache.set(
      props.projectId,
      axiosInstance
        .get("employees", { params: { project_id: props.projectId } })
        .then(({ data }) => data.data ?? [])
        .catch((error) => {
          peopleCache.delete(props.projectId);
          console.error("Failed to load employees:", error);
          return [];
        })
    );
  }
  peopleLoading.value = true;
  projectPeople.value = await peopleCache.get(props.projectId);
  peopleLoading.value = false;
};
const employees = computed(() => {
  const q = searchAssignee.value.trim().toLowerCase();
  const list = q
    ? projectPeople.value.filter((e) =>
        [e.user?.name, e.user?.email, e.job_information?.job_title].some((v) => v?.toLowerCase().includes(q))
      )
    : projectPeople.value;
  return list.slice(0, 50);
});

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
    imageError.value = t("projects.tasks.form.imageNotImage");
    return;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    imageError.value = t("projects.tasks.form.imageTooLarge");
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
    detailsError.value = t("projects.tasks.detail.nameRequired");
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
    emit("updated");
    isEditingDetails.value = false;
  } catch (error) {
    detailsError.value =
      typeof taskStore.error === "string" ? taskStore.error : t("projects.tasks.detail.updateFailed");
  } finally {
    isSavingDetails.value = false;
  }
};

// Quick delete for the current image, without entering full edit mode.
const handleDeleteImage = async () => {
  if (!(await alertModal.confirm(t("projects.tasks.detail.deleteImageConfirm")))) return;

  isDeletingImage.value = true;
  try {
    await updateTask(props.task.id, { remove_image: true });
    emit("updated");
  } catch (error) {
    console.error("Failed to delete image:", error);
  } finally {
    isDeletingImage.value = false;
  }
};

const handleDelete = async () => {
  if (await alertModal.confirm(t("projects.tasks.detail.deleteConfirm"))) {
    emit("deleted", props.task.id);
    closeModal();
  }
};

const toggleAssigneeDropdown = () => {
  assigneeDropdown.value = !assigneeDropdown.value;
  if (assigneeDropdown.value) {
    searchAssignee.value = "";
    loadProjectPeople();
  }
};

const handleSelectAssignee = async (employee) => {
  try {
    // The response still carries the previous assignee relation, so the
    // picked person is stored with it (no board refetch).
    await updateTask(props.task.id, { assignee_id: employee.id }, { assignee: employee, assignee_id: employee.id });
    selectedAssignee.value = employee;

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
    await updateTask(props.task.id, { assignee_id: "" }, { assignee: null, assignee_id: null });
    selectedAssignee.value = null;

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

const changeStatus = (value) => {
  const task = props.task;
  if (!task || value === task.status) return;
  const before = task.status;
  return optimistic({
    apply: () => {
      task.status = value;
      return () => {
        const current = taskStore.tasks.find((t) => t.id === task.id) || task;
        current.status = before;
      };
    },
    request: () => updateTask(task.id, { status: value }),
  }).then(({ ok }) => ok && emit("updated"));
};

onMounted(() => {
  // Set initial assignee from task prop
  if (props.task?.assignee) {
    selectedAssignee.value = props.task.assignee;
  }

  // Set initial due date
  if (props.task?.due_date) {
    editedDueDate.value = props.task.due_date;
  }
});


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
      selectedAssignee.value = newTask.assignee || null;
      if (newTask.due_date && !dueDateEditing.value) {
        editedDueDate.value = newTask.due_date;
      }
    }
  },
  { deep: true }
);
</script>

<template>
  <TaskPanel
    :open="isOpen && !!task"
    :title="task?.name || ''"
    @update:open="(value) => !value && closeModal()"
  >
    <template #header>
      <div v-if="task" class="flex-1 min-w-0">
        <input
          v-if="isEditingDetails"
          v-model="editedName"
          type="text"
          :aria-label="$t('projects.tasks.form.name')"
          :class="[fieldClass, 'h-10 px-3 text-ui-h2 font-semibold']"
        />
        <h2 v-else class="text-ui-h2 text-ui-ink break-words">{{ task.name }}</h2>
        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <p class="text-ui-cap text-ui-muted">
            {{ $t("projects.tasks.detail.inList") }} <span class="font-medium text-ui-text capitalize">{{ taskStatusLabel(task.status) }}</span>
          </p>
          <span
            v-if="task.type && !isEditingDetails"
            class="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md bg-ui-subtle text-ui-cap font-medium text-ui-text"
          >
            <span v-if="task.color" class="w-1.5 h-1.5 rounded-full" :class="taskTypeColor.dot" aria-hidden="true"></span>
            {{ task.type }}
          </span>
        </div>
      </div>
    </template>

    <!-- One column in the side panel: details first, then the rest. -->
    <div v-if="task" class="grid grid-cols-1 gap-6">
      <!-- Main Content (Left Side) -->
      <div class="space-y-5 min-w-0">
        <!-- Labels/Priority -->
        <div>
          <h3 class="flex items-center gap-1.5 text-ui-over uppercase text-ui-muted mb-2">
            <Tag class="w-3.5 h-3.5" /> {{ $t("projects.fields.priority") }}
          </h3>
          <UiSelect v-if="isEditingDetails" v-model="editedPriority" :options="PRIORITY_OPTIONS" class="sm:max-w-[220px]" />
          <UiBadge v-else :tone="PRIORITY_TONES[task.priority] || 'neutral'" dot class="capitalize">{{ priorityLabel(task.priority) }}</UiBadge>
        </div>

        <!-- Task Type & Color -->
        <div>
          <h3 class="flex items-center gap-1.5 text-ui-over uppercase text-ui-muted mb-2">
            <Tag class="w-3.5 h-3.5" /> {{ $t("projects.tasks.form.type") }}
          </h3>
          <template v-if="isEditingDetails">
            <div class="relative mb-3">
              <input
                v-model="editedType"
                type="text"
                list="task-type-suggestions-edit"
                maxlength="100"
                :aria-label="$t('projects.tasks.form.type')"
                :placeholder="$t('projects.tasks.form.typePlaceholder')"
                :class="[fieldClass, 'h-[38px] px-3']"
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
                :title="$t(`projects.colors.${swatch.key}`)"
                :aria-label="$t(`projects.colors.${swatch.key}`)"
                :aria-pressed="editedColor === swatch.key"
                @click="editedColor = editedColor === swatch.key ? null : swatch.key"
                class="ui-press w-6 h-6 rounded-full"
                :class="[swatch.dot, editedColor === swatch.key ? `ring-2 ring-offset-2 ${swatch.ring}` : 'opacity-60 hover:opacity-100']"
              ></button>
              <span v-if="editedColor" class="text-ui-cap font-medium text-ui-text ml-1">{{ $t(`projects.colors.${editedTypeColor.key}`) }}</span>
            </div>
          </template>
          <span
            v-else-if="task.type"
            class="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md bg-ui-subtle text-ui-cap font-medium text-ui-text"
          >
            <span v-if="task.color" class="w-1.5 h-1.5 rounded-full" :class="taskTypeColor.dot" aria-hidden="true"></span>
            {{ task.type }}
          </span>
          <p v-else class="text-ui-small text-ui-faint">{{ $t("projects.tasks.detail.noType") }}</p>
        </div>

        <!-- Image (Optional) -->
        <div>
          <h3 class="flex items-center gap-1.5 text-ui-over uppercase text-ui-muted mb-2">
            <ImageIcon class="w-3.5 h-3.5" /> {{ $t("projects.tasks.form.image") }} <span class="normal-case tracking-normal font-normal text-ui-faint">{{ $t("projects.tasks.form.optional") }}</span>
          </h3>

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
                :alt="$t('projects.tasks.form.imageAlt')"
                class="w-full h-32 object-cover rounded-ui-control border border-ui-line cursor-pointer"
                @click="lightboxOpen = true"
              />
              <div class="absolute top-1.5 right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  @click="lightboxOpen = true"
                  class="w-7 h-7 rounded-full bg-ui-surface/90 hover:bg-ui-surface flex items-center justify-center shadow-ui-raised text-ui-text"
                  :title="$t('projects.tasks.form.viewImage')"
                >
                  <Eye class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  @click="removeImageInEditor"
                  class="w-7 h-7 rounded-full bg-ui-surface/90 hover:bg-ui-bad-soft flex items-center justify-center shadow-ui-raised text-ui-bad"
                  :title="$t('projects.tasks.form.removeImage')"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button
              v-else
              type="button"
              @click="imageInput.click()"
              class="ui-press w-full sm:w-48 h-32 border border-dashed border-ui-line-strong rounded-ui-control hover:bg-ui-subtle flex flex-col items-center justify-center gap-1.5"
            >
              <span class="w-8 h-8 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center">
                <Upload class="w-4 h-4" />
              </span>
              <span class="text-ui-small font-medium text-ui-ink">{{ $t("projects.tasks.form.uploadImage") }}</span>
              <span class="text-ui-cap text-ui-muted">{{ $t("projects.tasks.form.imageHint") }}</span>
            </button>
            <p v-if="imageError" class="text-ui-cap text-ui-bad mt-1.5">{{ imageError }}</p>
          </template>

          <!-- View mode -->
          <template v-else>
            <div v-if="task.image" class="relative w-full sm:w-48">
              <img
                :src="task.image"
                :alt="$t('projects.tasks.form.imageAlt')"
                class="w-full h-32 object-cover rounded-ui-control border border-ui-line cursor-pointer"
                @click="lightboxOpen = true"
              />
              <div class="absolute top-1.5 right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  @click="lightboxOpen = true"
                  class="w-7 h-7 rounded-full bg-ui-surface/90 hover:bg-ui-surface flex items-center justify-center shadow-ui-raised text-ui-text"
                  :title="$t('projects.tasks.form.viewImage')"
                >
                  <Eye class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="can('task-edit')"
                  type="button"
                  @click="handleDeleteImage"
                  :disabled="isDeletingImage"
                  class="w-7 h-7 rounded-full bg-ui-surface/90 hover:bg-ui-bad-soft flex items-center justify-center shadow-ui-raised text-ui-bad disabled:opacity-50"
                  :title="$t('projects.tasks.detail.deleteImage')"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p v-else class="text-ui-small text-ui-faint">{{ $t("projects.tasks.detail.noImage") }}</p>
          </template>
        </div>

        <!-- Description -->
        <div>
          <h3 class="flex items-center gap-1.5 text-ui-over uppercase text-ui-muted mb-2">
            <AlignLeft class="w-3.5 h-3.5" /> {{ $t("common.labels.description") }}
          </h3>
          <UiInput v-if="isEditingDetails" v-model="editedDescription" :rows="4" :placeholder="$t('projects.tasks.detail.descriptionPlaceholder')" />
          <div v-else class="bg-ui-subtle rounded-ui-control px-3.5 py-3 text-ui-body text-ui-text leading-relaxed min-h-[72px] whitespace-pre-line break-words">
            <p v-if="task.description">{{ task.description }}</p>
            <p v-else class="text-ui-faint">{{ $t("projects.tasks.detail.noDescription") }}</p>
          </div>

          <p v-if="detailsError" class="text-ui-cap text-ui-bad mt-2">{{ detailsError }}</p>

          <div v-if="isEditingDetails" class="flex gap-2 mt-3">
            <UiButton :loading="isSavingDetails" class="flex-1 sm:flex-none" @click="handleSaveDetails">
              {{ isSavingDetails ? $t("common.actions.saving") : $t("common.actions.saveChanges") }}
            </UiButton>
            <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="cancelEditDetails">{{ $t("common.actions.cancel") }}</UiButton>
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

      <!-- Sidebar (Right Side): first on phones so the key facts sit on top -->
      <div class="order-first space-y-5 pb-5 border-b border-ui-line">
        <!-- Assignee -->
        <div v-if="!isEditingDetails" class="relative">
          <h3 class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("projects.tasks.detail.assignee") }}</h3>

          <!-- Selected Assignee Display -->
          <div v-if="selectedAssignee" class="flex items-center gap-2.5 mb-2">
            <Avatar
              :src="selectedAssignee?.user?.profile_photo"
              :alt="selectedAssignee?.user?.name"
              size="w-8 h-8"
              icon-size="w-4 h-4"
            />
            <div class="flex-1 min-w-0">
              <p class="text-ui-small font-medium text-ui-ink truncate">{{ selectedAssignee?.user?.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate">{{ selectedAssignee?.job_information?.job_title }}</p>
            </div>
            <button
              v-if="can('task-edit')"
              type="button"
              @click="handleRemoveAssignee"
              class="w-7 h-7 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-bad-soft hover:text-ui-bad shrink-0"
              :title="$t('projects.tasks.detail.removeAssignee')"
              :aria-label="$t('projects.tasks.detail.removeAssignee')"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
          <p v-else class="text-ui-small text-ui-faint mb-2">{{ $t("projects.tasks.unassigned") }}</p>

          <!-- Dropdown Toggle Button -->
          <button
            v-if="can('task-edit')"
            type="button"
            class="ui-press w-full h-9 border border-ui-line-strong rounded-ui-control bg-ui-surface hover:bg-ui-subtle px-3 flex items-center gap-2 text-left"
            :aria-expanded="assigneeDropdown"
            @click="toggleAssigneeDropdown"
          >
            <UserCheck class="w-4 h-4 text-ui-faint" />
            <span class="text-ui-small font-medium text-ui-ink flex-1">
              {{ selectedAssignee ? $t("projects.tasks.detail.changeAssignee") : $t("projects.tasks.detail.selectAssignee") }}
            </span>
            <ChevronDown class="w-4 h-4 text-ui-faint transition-transform duration-200" :class="{ 'rotate-180': assigneeDropdown }" />
          </button>

          <!-- Dropdown Menu -->
          <Transition name="ui-pop">
            <div
              v-if="assigneeDropdown"
              class="absolute top-full left-0 right-0 mt-1.5 bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay z-10 max-h-80 overflow-hidden flex flex-col"
            >
              <!-- Search -->
              <div class="p-2 border-b border-ui-line">
                <div class="relative">
                  <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ui-faint pointer-events-none" />
                  <input
                    type="text"
                    v-model="searchAssignee"
                    :placeholder="$t('projects.tasks.detail.searchEmployees')"
                    :class="[fieldClass, 'h-8 pl-8 pr-3 text-ui-small']"
                  />
                </div>
              </div>

              <!-- Employee List -->
              <div class="overflow-y-auto max-h-64 p-1">
                <button
                  v-for="employee in employees"
                  :key="employee.id"
                  type="button"
                  @click="handleSelectAssignee(employee)"
                  class="w-full px-2.5 py-2 rounded-md hover:bg-ui-hover flex items-center gap-2.5 text-left"
                >
                  <Avatar :src="employee.user?.profile_photo" :alt="employee.user?.name" size="w-7 h-7" icon-size="w-3 h-3" />
                  <div class="flex-1 min-w-0">
                    <p class="text-ui-small font-medium text-ui-ink truncate">{{ employee.user?.name }}</p>
                    <p class="text-ui-cap text-ui-muted truncate">{{ employee.job_information?.job_title }}</p>
                  </div>
                </button>

                <!-- No Results -->
                <div v-if="employees.length === 0 && !peopleLoading" class="p-5 text-center">
                  <SearchX class="w-5 h-5 text-ui-faint mx-auto mb-1.5" />
                  <p class="text-ui-cap text-ui-muted">{{ $t("projects.tasks.detail.noEmployees") }}</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Due Date -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-ui-over uppercase text-ui-muted">{{ $t("projects.tasks.form.dueDate") }}</h3>
            <button
              v-if="!dueDateEditing && can('task-edit')"
              type="button"
              @click="toggleDueDateEdit"
              class="w-7 h-7 -mr-1.5 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-hover hover:text-ui-ink"
              :title="$t('projects.tasks.detail.editDueDate')"
              :aria-label="$t('projects.tasks.detail.editDueDate')"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Display Mode -->
          <div v-if="!dueDateEditing" class="flex items-center gap-2 text-ui-small text-ui-ink tabular-nums">
            <Calendar class="w-4 h-4 text-ui-faint" />
            {{ formatDate(task.due_date) }}
          </div>

          <!-- Edit Mode -->
          <div v-else class="space-y-2">
            <UiInput v-model="editedDueDate" type="date" />
            <div class="flex gap-2">
              <UiButton size="sm" :icon="Check" class="flex-1" @click="handleUpdateDueDate">{{ $t("common.actions.save") }}</UiButton>
              <UiButton size="sm" variant="secondary" class="flex-1" @click="cancelDueDateEdit">{{ $t("common.actions.cancel") }}</UiButton>
            </div>
          </div>
        </div>

        <!-- Status -->
        <div v-if="!isEditingDetails">
          <h3 class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("common.labels.status") }}</h3>
          <UiStatusSelect
            :model-value="task.status"
            :options="STATUS_OPTIONS"
            :label="$t('common.labels.status')"
            :disabled="!can('task-edit')"
            @change="changeStatus"
          />
        </div>

        <!-- Actions -->
        <div v-if="(can('task-edit') && !isEditingDetails) || can('task-delete')">
          <h3 class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("common.labels.actions") }}</h3>
          <div class="flex gap-2">
            <UiButton v-if="can('task-edit') && !isEditingDetails" :icon="Pencil" class="flex-1" @click="toggleEditDetails">
              {{ $t("projects.tasks.detail.edit") }}
            </UiButton>
            <UiButton v-if="can('task-delete')" variant="danger" :icon="Trash2" class="flex-1" @click="handleDelete">
              {{ $t("projects.tasks.detail.delete") }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </TaskPanel>

  <!-- Image Lightbox -->
  <Teleport to="body">
    <Transition name="ui-fade">
      <div
        v-if="lightboxOpen && (imagePreviewUrl || task?.image)"
        class="fixed inset-0 z-[150] flex items-center justify-center p-5"
        @click="lightboxOpen = false"
      >
        <div class="absolute inset-0 bg-ui-scrim/80"></div>
        <button
          type="button"
          @click="lightboxOpen = false"
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
          :aria-label="$t('common.actions.close')"
        >
          <X class="w-5 h-5" />
        </button>
        <img
          :src="isEditingDetails ? imagePreviewUrl : task?.image"
          :alt="$t('projects.tasks.form.imageAlt')"
          class="relative w-[min(90vw,900px)] max-h-[85vh] rounded-ui-card object-contain"
        />
      </div>
    </Transition>
  </Teleport>
</template>
