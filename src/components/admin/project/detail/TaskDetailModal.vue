<script setup>
// Task detail side panel. Every field is edited in place and saved on its
// own (no separate "edit" mode): selects/dates/colours/assignees save when
// changed, the title/type/description when the field is left. The change
// shows at once and is undone with a toast if the save fails.
import { ref, computed, watch } from "vue";
import { X, Calendar, Tag, AlignLeft, Trash2, Upload, Eye, Check, Loader2, Image as ImageIcon } from "lucide-vue-next";
import TaskComments from "./TaskComments.vue";
import AssigneePicker from "./AssigneePicker.vue";
import TaskPanel from "./TaskPanel.vue";
import { TASK_TYPE_COLORS, getTaskTypeColorClasses } from "@/utils/styleHelpers";
import { formatDate } from "@/utils/dateUtils";
import { assigneesOf, assigneeFields } from "@/utils/taskAssignees";
import { useTaskStore } from "@/stores/task";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiBadge, UiInput, UiSelect, UiStatusSelect } from "@/components/ui";
import { optimistic } from "@/utils/optimistic";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const PRIORITY_TONES = { urgent: "bad", high: "warn", medium: "info", low: "neutral" };
const STATUS_TONES = { todo: "neutral", in_progress: "accent", review: "warn", done: "ok", cancelled: "neutral" };
const PRIORITY_OPTIONS = computed(() => ["low", "medium", "high", "urgent"].map((value) => ({ value, label: t(`projects.priority.${value}`) })));
const TASK_STATUS_KEYS = { todo: "todo", in_progress: "inProgress", review: "review", done: "done", cancelled: "cancelled" };
const taskStatusLabel = (status) =>
  TASK_STATUS_KEYS[status] ? t(`projects.taskStatus.${TASK_STATUS_KEYS[status]}`) : (status || "").replace("_", " ");
const STATUS_OPTIONS = computed(() => Object.keys(TASK_STATUS_KEYS).map((value) => ({ value, label: taskStatusLabel(value), tone: STATUS_TONES[value] })));
const priorityLabel = (priority) => (PRIORITY_TONES[priority] ? t(`projects.priority.${priority}`) : priority);
const fieldClass =
  "w-full bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // matches the API limit

const props = defineProps({
  task: { type: Object, default: null },
  isOpen: { type: Boolean, default: false },
  projectId: { type: Number, required: true },
  // { type, color }[] -- every task type already used in this project.
  typeSuggestions: { type: Array, default: () => [] },
});
const emit = defineEmits(["close", "deleted", "updated"]);

const taskStore = useTaskStore();
const alertModal = useAlertModalStore();
const editable = can("task-edit");

// Drafts for the typed fields, refreshed from the task unless being edited.
const name = ref("");
const description = ref("");
const type = ref("");
const dueDate = ref("");
const focused = ref("");
const syncDrafts = () => {
  const task = props.task;
  if (!task) return;
  if (focused.value !== "name") name.value = task.name ?? "";
  if (focused.value !== "description") description.value = task.description ?? "";
  if (focused.value !== "type") type.value = task.type ?? "";
  dueDate.value = task.due_date ?? "";
};
watch(() => props.task, syncDrafts, { immediate: true, deep: true });

// "Saving..." / "Saved" in the header.
const pending = ref(0);
const savedFlash = ref(false);
let flashTimer = 0;

// Apply `fields` to the task at once, then save `payload`; undone on failure.
const save = async (payload, fields = payload) => {
  const task = props.task;
  if (!task) return false;
  const before = Object.fromEntries(Object.keys(fields).map((k) => [k, task[k]]));
  pending.value++;
  const { ok } = await optimistic({
    apply: () => {
      Object.assign(task, fields);
      return () => Object.assign(taskStore.tasks.find((x) => x.id === task.id) || task, before);
    },
    request: () => taskStore.updateTask(task.id, payload, "assignee_ids" in payload ? fields : null),
    errorTitle: t("projects.tasks.detail.updateFailed"),
  });
  pending.value--;
  if (ok) {
    emit("updated");
    savedFlash.value = true;
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => (savedFlash.value = false), 1800);
  } else {
    syncDrafts();
  }
  return ok;
};

// Title
const nameError = ref("");
const commitName = () => {
  focused.value = "";
  const value = name.value.trim();
  if (!value) {
    nameError.value = t("projects.tasks.detail.nameRequired");
    name.value = props.task?.name ?? "";
    return;
  }
  nameError.value = "";
  if (value !== props.task?.name) save({ name: value });
};
const cancelName = (event) => {
  name.value = props.task?.name ?? "";
  event.target.blur();
};

// Description
const commitDescription = () => {
  focused.value = "";
  if ((description.value ?? "") !== (props.task?.description ?? "")) save({ description: description.value });
};

// Priority, status, due date
const changePriority = (value) => value !== props.task?.priority && save({ priority: value });
const changeStatus = (value) => value !== props.task?.status && save({ status: value });
// On "change" (picked, or the field left), not on every typed digit.
const changeDueDate = (value) => {
  if (value && value !== props.task?.due_date) save({ due_date: value });
};

// Type & colour
const typeColor = computed(() => getTaskTypeColorClasses(props.task?.color));
const commitType = () => {
  focused.value = "";
  const value = type.value.trim();
  if (value === (props.task?.type ?? "")) return;
  const match = props.typeSuggestions.find((s) => s.type === value);
  save(match?.color ? { type: value, color: match.color } : { type: value });
};
const pickColor = (key) => save({ color: props.task?.color === key ? "" : key }, { color: props.task?.color === key ? null : key });

// Assignees
const assignees = computed({
  get: () => assigneesOf(props.task),
  set: (list) => save({ assignee_ids: list.map((e) => e.id) }, assigneeFields(list)),
});

// Image: uploaded / removed right away
const imageInput = ref(null);
const imageError = ref("");
const imageBusy = ref(false);
const lightboxOpen = ref(false);
const pickImage = async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) return (imageError.value = t("projects.tasks.form.imageNotImage"));
  if (file.size > MAX_IMAGE_SIZE) return (imageError.value = t("projects.tasks.form.imageTooLarge"));
  imageError.value = "";
  imageBusy.value = true;
  await save({ image: file }, {});
  imageBusy.value = false;
};
const removeImage = async () => {
  if (!(await alertModal.confirm(t("projects.tasks.detail.deleteImageConfirm")))) return;
  imageBusy.value = true;
  await save({ remove_image: true }, { image: null });
  imageBusy.value = false;
};

const handleDelete = async () => {
  if (await alertModal.confirm(t("projects.tasks.detail.deleteConfirm"))) {
    emit("deleted", props.task.id);
    emit("close");
  }
};
const closePanel = () => emit("close");
</script>

<template>
  <TaskPanel :open="isOpen && !!task" :title="task?.name || ''" @update:open="(value) => !value && closePanel()">
    <template #header>
      <div v-if="task" class="flex-1 min-w-0">
        <input
          v-if="editable"
          v-model="name"
          type="text"
          :aria-label="$t('projects.tasks.form.name')"
          class="w-full -ml-2 px-2 h-10 rounded-ui-control bg-transparent text-ui-h2 font-semibold text-ui-ink border border-transparent hover:border-ui-line focus:border-ui-accent focus:bg-ui-surface focus:shadow-ui-focus focus:outline-none transition-colors"
          @focus="focused = 'name'"
          @blur="commitName"
          @keydown.enter.prevent="$event.target.blur()"
          @keydown.esc.stop.prevent="cancelName"
        />
        <h2 v-else class="text-ui-h2 text-ui-ink break-words">{{ task.name }}</h2>
        <p v-if="nameError" class="text-ui-cap text-ui-bad mt-0.5">{{ nameError }}</p>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <p class="text-ui-cap text-ui-muted">
            {{ $t("projects.tasks.detail.inList") }} <span class="font-medium text-ui-text capitalize">{{ taskStatusLabel(task.status) }}</span>
          </p>
          <span v-if="pending" class="inline-flex items-center gap-1 text-ui-cap text-ui-muted" role="status">
            <Loader2 class="w-3 h-3 animate-spin" />{{ $t("common.actions.saving") }}
          </span>
          <Transition name="ui-fade">
            <span v-if="!pending && savedFlash" class="inline-flex items-center gap-1 text-ui-cap text-ui-ok" role="status">
              <Check class="w-3 h-3" />{{ $t("common.states.saved") }}
            </span>
          </Transition>
        </div>
      </div>
      <button
        v-if="task && can('task-delete')"
        type="button"
        class="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-faint hover:text-ui-bad hover:bg-ui-bad-soft"
        :title="$t('projects.tasks.detail.delete')"
        :aria-label="$t('projects.tasks.detail.delete')"
        @click="handleDelete"
      >
        <Trash2 class="w-[18px] h-[18px]" />
      </button>
    </template>

    <div v-if="task" class="space-y-5">
      <!-- Key facts, same order as the new-task form: type, due date, assignees, then status / priority -->
      <div class="space-y-5 pb-5 border-b border-ui-line">
        <!-- Type & colour -->
        <div>
          <h3 class="flex items-center gap-1.5 text-ui-over uppercase text-ui-muted mb-2">
            <Tag class="w-3.5 h-3.5" /> {{ $t("projects.tasks.form.type") }}
          </h3>
          <template v-if="editable">
            <input
              v-model="type"
              type="text"
              list="task-type-suggestions-edit"
              maxlength="100"
              :aria-label="$t('projects.tasks.form.type')"
              :placeholder="$t('projects.tasks.form.typePlaceholder')"
              :class="[fieldClass, 'h-[38px] px-3 mb-3']"
              @focus="focused = 'type'"
              @blur="commitType"
              @keydown.enter.prevent="$event.target.blur()"
            />
            <datalist id="task-type-suggestions-edit">
              <option v-for="s in typeSuggestions" :key="s.type" :value="s.type" />
            </datalist>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-for="swatch in TASK_TYPE_COLORS"
                :key="swatch.key"
                type="button"
                :title="$t(`projects.colors.${swatch.key}`)"
                :aria-label="$t(`projects.colors.${swatch.key}`)"
                :aria-pressed="task.color === swatch.key"
                class="ui-press w-6 h-6 rounded-full"
                :class="[swatch.dot, task.color === swatch.key ? `ring-2 ring-offset-2 ${swatch.ring}` : 'opacity-60 hover:opacity-100']"
                @click="pickColor(swatch.key)"
              ></button>
              <span v-if="task.color" class="text-ui-cap font-medium text-ui-text ml-1">{{ $t(`projects.colors.${typeColor.key}`) }}</span>
            </div>
          </template>
          <span v-else-if="task.type" class="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md bg-ui-subtle text-ui-cap font-medium text-ui-text">
            <span v-if="task.color" class="w-1.5 h-1.5 rounded-full" :class="typeColor.dot" aria-hidden="true"></span>
            {{ task.type }}
          </span>
          <p v-else class="text-ui-small text-ui-faint">{{ $t("projects.tasks.detail.noType") }}</p>
        </div>

        <div>
          <h3 class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("projects.tasks.form.dueDate") }}</h3>
          <div v-if="editable" @change="changeDueDate($event.target.value)">
            <UiInput v-model="dueDate" type="date" :icon="Calendar" :aria-label="$t('projects.tasks.form.dueDate')" />
          </div>
          <p v-else class="flex items-center gap-2 text-ui-small text-ui-ink tabular-nums">
            <Calendar class="w-4 h-4 text-ui-faint" />{{ task.due_date ? formatDate(task.due_date) : "-" }}
          </p>
        </div>
        <div>
          <h3 class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("projects.tasks.detail.assignee") }}</h3>
          <AssigneePicker v-model="assignees" :project-id="projectId" :disabled="!editable" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="min-w-0">
            <h3 class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("common.labels.status") }}</h3>
            <UiStatusSelect :model-value="task.status" :options="STATUS_OPTIONS" :label="$t('common.labels.status')" :disabled="!editable" @change="changeStatus" />
          </div>
          <div class="min-w-0">
            <h3 class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("projects.fields.priority") }}</h3>
            <UiSelect v-if="editable" :model-value="task.priority" :options="PRIORITY_OPTIONS" :aria-label="$t('projects.fields.priority')" @update:model-value="changePriority" />
            <UiBadge v-else :tone="PRIORITY_TONES[task.priority] || 'neutral'" dot class="capitalize">{{ priorityLabel(task.priority) }}</UiBadge>
          </div>
        </div>
      </div>

      <!-- Image -->
      <div v-file-drop>
        <h3 class="flex items-center gap-1.5 text-ui-over uppercase text-ui-muted mb-2">
          <ImageIcon class="w-3.5 h-3.5" /> {{ $t("projects.tasks.form.image") }}
          <span class="normal-case tracking-normal font-normal text-ui-faint">{{ $t("projects.tasks.form.optional") }}</span>
        </h3>
        <input ref="imageInput" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" class="hidden" @change="pickImage" />
        <div v-if="task.image" class="relative w-full sm:w-48" :class="{ 'opacity-60': imageBusy }">
          <img :src="task.image" :alt="$t('projects.tasks.form.imageAlt')" class="w-full h-32 object-cover rounded-ui-control border border-ui-line cursor-pointer" @click="lightboxOpen = true" />
          <div class="absolute top-1.5 right-1.5 flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-full bg-ui-surface/90 hover:bg-ui-surface flex items-center justify-center shadow-ui-raised text-ui-text"
              :title="$t('projects.tasks.form.viewImage')"
              :aria-label="$t('projects.tasks.form.viewImage')"
              @click="lightboxOpen = true"
            >
              <Eye class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="editable"
              type="button"
              :disabled="imageBusy"
              class="w-7 h-7 rounded-full bg-ui-surface/90 hover:bg-ui-bad-soft flex items-center justify-center shadow-ui-raised text-ui-bad disabled:opacity-50"
              :title="$t('projects.tasks.detail.deleteImage')"
              :aria-label="$t('projects.tasks.detail.deleteImage')"
              @click="removeImage"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <button
          v-else-if="editable"
          type="button"
          :disabled="imageBusy"
          class="ui-press w-full sm:w-48 h-28 border border-dashed border-ui-line-strong rounded-ui-control hover:bg-ui-subtle flex flex-col items-center justify-center gap-1.5 disabled:opacity-60"
          @click="imageInput.click()"
        >
          <span class="w-8 h-8 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center">
            <Loader2 v-if="imageBusy" class="w-4 h-4 animate-spin" />
            <Upload v-else class="w-4 h-4" />
          </span>
          <span class="text-ui-small font-medium text-ui-ink">{{ $t("projects.tasks.form.uploadImage") }}</span>
          <span class="text-ui-cap text-ui-muted">{{ $t("projects.tasks.form.imageHint") }}</span>
        </button>
        <p v-else class="text-ui-small text-ui-faint">{{ $t("projects.tasks.detail.noImage") }}</p>
        <p v-if="imageError" class="text-ui-cap text-ui-bad mt-1.5">{{ imageError }}</p>
      </div>

      <!-- Description -->
      <div>
        <h3 class="flex items-center gap-1.5 text-ui-over uppercase text-ui-muted mb-2">
          <AlignLeft class="w-3.5 h-3.5" /> {{ $t("common.labels.description") }}
        </h3>
        <div v-if="editable" @focusin="focused = 'description'" @focusout="commitDescription">
          <UiInput v-model="description" :rows="4" :placeholder="$t('projects.tasks.detail.descriptionPlaceholder')" :aria-label="$t('common.labels.description')" />
        </div>
        <div v-else class="bg-ui-subtle rounded-ui-control px-3.5 py-3 text-ui-body text-ui-text leading-relaxed min-h-[72px] whitespace-pre-line break-words">
          <p v-if="task.description">{{ task.description }}</p>
          <p v-else class="text-ui-faint">{{ $t("projects.tasks.detail.noDescription") }}</p>
        </div>
      </div>

      <TaskComments :task-id="task.id" :project-id="projectId" :can-comment="task.can_comment !== false" />
    </div>
  </TaskPanel>

  <!-- Image lightbox -->
  <Teleport to="body">
    <Transition name="ui-fade">
      <div v-if="lightboxOpen && task?.image" class="fixed inset-0 z-[150] flex items-center justify-center p-5" @click="lightboxOpen = false">
        <div class="absolute inset-0 bg-ui-scrim/80"></div>
        <button
          type="button"
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
          :aria-label="$t('common.actions.close')"
          @click="lightboxOpen = false"
        >
          <X class="w-5 h-5" />
        </button>
        <img :src="task.image" :alt="$t('projects.tasks.form.imageAlt')" class="relative w-[min(90vw,900px)] max-h-[85vh] rounded-ui-card object-contain" />
      </div>
    </Transition>
  </Teleport>
</template>
