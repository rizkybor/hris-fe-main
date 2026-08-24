<script setup>
import { ref, watch } from "vue";
import { ClipboardCheck, Pencil, X } from "lucide-vue-next";
import { useProjectStore } from "@/stores/project";
import RichTextEditor from "@/components/common/RichTextEditor.vue";

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
    errorMessage.value = error?.response?.data?.message || "Failed to save the note.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 sm:p-6 h-full">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 mb-5">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 sm:w-10 sm:h-10 bg-purple-50 rounded-[10px] flex items-center justify-center shrink-0">
          <ClipboardCheck class="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-base sm:text-lg font-bold">Project Inspect</h3>
          <p class="text-brand-light text-xs font-normal">
            Optional — only the Project Leader can write this note
          </p>
        </div>
      </div>

      <button
        v-if="isLeader && !editing"
        @click="startEditing"
        class="border border-[#DCDEDD] text-brand-dark py-2 px-3.5 rounded-[8px] font-medium hover:bg-gray-50 hover:border-[#0C51D9] hover:border-2 transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
      >
        <Pencil class="w-3.5 h-3.5" />
        <span class="text-xs font-semibold">{{ note ? "Edit Note" : "Add Note" }}</span>
      </button>
    </div>

    <!-- Editing (Project Leader only) -->
    <div v-if="editing">
      <RichTextEditor v-model="draft" placeholder="Write your inspection notes here..." />
      <p v-if="errorMessage" class="text-red-500 text-xs mt-2">{{ errorMessage }}</p>
      <div class="flex items-center gap-2.5 mt-3.5">
        <button
          @click="handleSave"
          :disabled="saving"
          class="px-4 py-2.5 rounded-lg bg-[#0C51D9] text-white text-xs font-semibold hover:brightness-110 transition disabled:opacity-50"
        >
          {{ saving ? "Saving..." : "Save Note" }}
        </button>
        <button
          @click="cancelEditing"
          :disabled="saving"
          class="px-4 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-xs font-semibold hover:bg-gray-50 transition flex items-center gap-1.5"
        >
          <X class="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </div>

    <!-- Read-only content -->
    <div v-else-if="note">
      <RichTextEditor :model-value="note" disabled />
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="text-center py-10 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD]"
    >
      <ClipboardCheck class="w-9 h-9 text-gray-300 mx-auto mb-3" />
      <p class="text-sm font-semibold">No inspection notes yet</p>
      <p class="text-xs text-gray-400">
        {{ isLeader ? "Optional — add a note whenever you inspect this project." : "Only the Project Leader can add one." }}
      </p>
    </div>
  </div>
</template>
