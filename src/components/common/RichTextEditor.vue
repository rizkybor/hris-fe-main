<script setup>
import { ref, watch, onMounted } from "vue";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-vue-next";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Tulis isi dokumen di sini..." },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const editorRef = ref(null);

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || "";
  }
});

// Only re-sync from outside when the value actually diverges (e.g. loading
// an existing document) -- otherwise every keystroke's own emit would
// bounce back and reset the caret position.
watch(
  () => props.modelValue,
  (value) => {
    if (editorRef.value && editorRef.value.innerHTML !== (value || "")) {
      editorRef.value.innerHTML = value || "";
    }
  }
);

const onInput = () => {
  emit("update:modelValue", editorRef.value?.innerHTML || "");
};

const exec = (command) => {
  if (props.disabled) return;
  editorRef.value?.focus();
  document.execCommand(command);
  onInput();
};

const toolbarButtons = [
  { command: "bold", icon: Bold, title: "Bold" },
  { command: "italic", icon: Italic, title: "Italic" },
  { command: "underline", icon: Underline, title: "Underline" },
  { command: "insertUnorderedList", icon: List, title: "Bullet List" },
  { command: "insertOrderedList", icon: ListOrdered, title: "Numbered List" },
];
</script>

<template>
  <div class="border border-[#DCDEDD] rounded-xl overflow-hidden" :class="{ 'opacity-60': disabled }">
    <div v-if="!disabled" class="flex items-center gap-1 border-b border-[#DCDEDD] bg-gray-50 px-2 py-1.5">
      <button
        v-for="btn in toolbarButtons"
        :key="btn.command"
        type="button"
        :title="btn.title"
        @mousedown.prevent="exec(btn.command)"
        class="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
      >
        <component :is="btn.icon" class="w-4 h-4" />
      </button>
    </div>
    <div
      ref="editorRef"
      :contenteditable="!disabled"
      @input="onInput"
      class="rich-text-editor px-3 py-2.5 text-sm min-h-[180px] max-h-[400px] overflow-y-auto focus:outline-none"
      :data-placeholder="placeholder"
    ></div>
  </div>
</template>

<style scoped>
.rich-text-editor:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
}
.rich-text-editor :deep(ul) {
  list-style: disc;
  padding-left: 1.5rem;
}
.rich-text-editor :deep(ol) {
  list-style: decimal;
  padding-left: 1.5rem;
}
</style>
