<script setup>
import { ref, computed, watch } from "vue";
import { X, ListPlus, ClipboardList, AlignLeft, Flag, Layers, Calendar, Upload, Eye, Tag, ChevronDown } from "lucide-vue-next";
import { useAlertModalStore } from "@/stores/alertModal";
import { TASK_TYPE_COLORS, getTaskTypeColorClasses } from "@/utils/styleHelpers";
import { UiButton, UiInput, UiSelect } from "@/components/ui";
import TaskPanel from "./TaskPanel.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// Presentation only: option lists for the selects.
const PRIORITY_OPTIONS = computed(() =>
  ["low", "medium", "high", "urgent"].map((value) => ({ value, label: t(`projects.priority.${value}`) }))
);
const STATUS_OPTIONS = computed(() => [
  { value: "todo", label: t("projects.taskStatus.todo") },
  { value: "in_progress", label: t("projects.taskStatus.inProgress") },
  { value: "review", label: t("projects.taskStatus.review") },
  { value: "done", label: t("projects.taskStatus.done") },
  { value: "cancelled", label: t("projects.taskStatus.cancelled") },
]);

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
  // { type, color }[] -- every task type already used in this project, so
  // naming stays consistent without a separate "manage task types" screen.
  typeSuggestions: {
    type: Array,
    default: () => [],
  },
  // Status the form starts with (the column whose "+" opened it).
  initialStatus: {
    type: String,
    default: "todo",
  },
});

const emit = defineEmits(["close", "created"]);

const defaultFormData = () => ({
  name: "",
  description: "",
  priority: "medium",
  status: props.initialStatus || "todo",
  due_date: "",
  project_id: props.projectId,
  image: null,
  type: "",
  color: null,
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

watch(
  () => formData.value.type,
  (value) => {
    const match = props.typeSuggestions.find((s) => s.type === value);
    if (match?.color) formData.value.color = match.color;
  }
);

const selectedTypeColor = computed(() => getTaskTypeColorClasses(formData.value.color));

const closeModal = () => {
  emit("close");
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
    await alertModal.alert(t("projects.tasks.form.nameRequired"), { type: "warning" });
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
  <TaskPanel
    :open="isOpen"
    :title="$t('projects.tasks.createNew')"
    :description="$t('projects.tasks.form.createDescription')"
    @update:open="(value) => !value && closeModal()"
  >
    <form id="task-create-form" @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Task Name -->
      <UiInput v-model="formData.name" :label="$t('projects.tasks.form.name')" :icon="ClipboardList" :placeholder="$t('projects.tasks.form.namePlaceholder')" required />

      <!-- Description -->
      <UiInput v-model="formData.description" :label="$t('common.labels.description')" :rows="3" :placeholder="$t('projects.tasks.form.descriptionPlaceholder')" />

      <!-- Priority and Status -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiSelect v-model="formData.priority" :label="$t('projects.fields.priority')" :options="PRIORITY_OPTIONS" />
        <UiSelect v-model="formData.status" :label="$t('common.labels.status')" :options="STATUS_OPTIONS" />
      </div>

      <!-- Task Type & Color -->
      <div>
        <label for="task-type-create" class="block text-ui-small font-medium text-ui-ink mb-1.5">
          {{ $t("projects.tasks.form.type") }} <span class="text-ui-muted font-normal">{{ $t("projects.tasks.form.optional") }}</span>
        </label>
        <div class="relative mb-3">
          <Tag class="absolute left-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
          <input
            id="task-type-create"
            v-model="formData.type"
            type="text"
            list="task-type-suggestions-create"
            maxlength="100"
            class="w-full h-[38px] pl-9 pr-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            :placeholder="$t('projects.tasks.form.typePlaceholder')"
          />
          <datalist id="task-type-suggestions-create">
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
            :aria-pressed="formData.color === swatch.key"
            @click="formData.color = formData.color === swatch.key ? null : swatch.key"
            class="ui-press w-6 h-6 rounded-full"
            :class="[swatch.dot, formData.color === swatch.key ? `ring-2 ring-offset-2 ${swatch.ring}` : 'opacity-60 hover:opacity-100']"
          ></button>
          <span v-if="formData.color" class="text-ui-cap font-medium text-ui-text ml-1">{{ $t(`projects.colors.${selectedTypeColor.key}`) }}</span>
        </div>
      </div>

      <!-- Due Date -->
      <UiInput v-model="formData.due_date" type="date" :label="$t('projects.tasks.form.dueDate')" :icon="Calendar" />

      <!-- Image (Optional) -->
      <div>
        <p class="block text-ui-small font-medium text-ui-ink mb-1.5">
          {{ $t("projects.tasks.form.image") }} <span class="text-ui-muted font-normal">{{ $t("projects.tasks.form.imageOptional") }}</span>
        </p>

        <input
          ref="imageInput"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          class="hidden"
          @change="handleImageSelect"
        />

        <div v-if="imagePreviewUrl" class="relative w-full sm:w-48">
          <img
            :src="imagePreviewUrl"
            :alt="$t('projects.tasks.form.imagePreview')"
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
              @click="removeImage"
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
      </div>
    </form>

    <template #footer>
      <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="closeModal">{{ $t("common.actions.cancel") }}</UiButton>
      <UiButton type="submit" form="task-create-form" :icon="ListPlus" :loading="isSubmitting" class="flex-1 sm:flex-none">
        {{ isSubmitting ? $t("projects.tasks.form.creating") : $t("projects.tasks.form.create") }}
      </UiButton>
    </template>
  </TaskPanel>

  <!-- Image Lightbox -->
  <Teleport to="body">
    <Transition name="ui-fade">
      <div
        v-if="lightboxOpen && imagePreviewUrl"
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
        <img :src="imagePreviewUrl" :alt="$t('projects.tasks.form.imageAlt')" class="relative max-w-full max-h-[85vh] rounded-ui-card object-contain" />
      </div>
    </Transition>
  </Teleport>
</template>
