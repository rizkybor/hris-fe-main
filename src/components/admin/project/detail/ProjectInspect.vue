<script setup>
import { ref, watch } from "vue";
import { ClipboardCheck, Pencil, X } from "lucide-vue-next";
import { useProjectStore } from "@/stores/project";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import { UiButton, UiEmpty } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  projectId: {
    type: [String, Number],
    required: true,
  },
  note: {
    type: String,
    default: "",
  },
  // Only the Project Leader may write this note -- the backend enforces
  // the same rule independently (see ProjectController::update()), this
  // just keeps the UI from offering an edit control that would be
  // rejected anyway.
  isLeader: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["updated"]);

const projectStore = useProjectStore();

const editing = ref(false);
const draft = ref(props.note || "");
const saving = ref(false);
const errorMessage = ref("");

// Keep the draft in sync if the project reloads with a newer note (e.g.
// after a router navigation back into this same instance).
watch(
  () => props.note,
  (value) => {
    if (!editing.value) draft.value = value || "";
  }
);

const startEditing = () => {
  draft.value = props.note || "";
  errorMessage.value = "";
  editing.value = true;
};

const cancelEditing = () => {
  editing.value = false;
  draft.value = props.note || "";
  errorMessage.value = "";
};

const handleSave = async () => {
  saving.value = true;
  errorMessage.value = "";
  try {
    const updated = await projectStore.updateInspectNote(props.projectId, draft.value);
    editing.value = false;
    emit("updated", updated?.inspect_note ?? draft.value);
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("projects.inspect.saveFailed");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 h-full flex flex-col">
    <div class="flex items-start justify-between gap-3 mb-4 shrink-0">
      <div class="min-w-0">
        <h3 class="text-ui-h2 text-ui-ink">{{ $t("projects.inspect.title") }}</h3>
        <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.inspect.subtitle") }}</p>
      </div>

      <UiButton v-if="isLeader && !editing" variant="ghost" size="sm" :icon="Pencil" class="shrink-0" @click="startEditing">
        {{ note ? $t("projects.inspect.editNote") : $t("projects.inspect.addNote") }}
      </UiButton>
    </div>

    <!-- Editing (Project Leader only) -- left unconstrained (not capped
         like the read-only view below) so actively writing a long note
         isn't cramped into a tiny scroll box. -->
    <div v-if="editing">
      <RichTextEditor v-model="draft" :placeholder="$t('projects.inspect.placeholder')" />
      <p v-if="errorMessage" class="text-ui-cap text-ui-bad mt-1.5">{{ errorMessage }}</p>
      <div class="flex items-center gap-2 mt-3">
        <UiButton :loading="saving" class="flex-1 sm:flex-none" @click="handleSave">
          {{ saving ? $t("common.actions.saving") : $t("projects.inspect.saveNote") }}
        </UiButton>
        <UiButton variant="secondary" :icon="X" :disabled="saving" class="flex-1 sm:flex-none" @click="cancelEditing">{{ $t("common.actions.cancel") }}</UiButton>
      </div>
    </div>

    <!-- Read-only content -- capped + scrollable so a long note doesn't
         grow this card taller than its siblings. -->
    <div v-else-if="note" class="overflow-y-auto max-h-[320px] sm:max-h-[420px]">
      <RichTextEditor :model-value="note" disabled />
    </div>

    <!-- Empty state -->
    <UiEmpty
      v-else
      compact
      :icon="ClipboardCheck"
      :title="$t('projects.inspect.emptyTitle')"
      :message="isLeader ? $t('projects.inspect.emptyLeader') : $t('projects.inspect.emptyOther')"
      class="bg-ui-subtle rounded-ui-control"
    />
  </section>
</template>
