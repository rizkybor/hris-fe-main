<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Link2Off,
  Minus,
  Eraser,
} from "lucide-vue-next";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Tulis isi dokumen di sini..." },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const editorRef = ref(null);
const linkPopoverOpen = ref(false);
const linkUrl = ref("");
let savedSelection = null;

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || "";
  }
  document.addEventListener("selectionchange", trackSelection);
});

onBeforeUnmount(() => {
  document.removeEventListener("selectionchange", trackSelection);
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

// The link popover needs the caret position that existed *before* the
// popover's own input stole focus, so the selection is captured on every
// change and restored right before wrapSelectionInLink() runs.
const trackSelection = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editorRef.value) return;
  if (editorRef.value.contains(selection.anchorNode)) {
    savedSelection = selection.getRangeAt(0).cloneRange();
  }
};

const restoreSelection = () => {
  if (!savedSelection) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedSelection);
};

const exec = (command, value = null) => {
  if (props.disabled) return;
  editorRef.value?.focus();
  document.execCommand(command, false, value);
  onInput();
};

const setFormatBlock = (tag) => exec("formatBlock", tag);

const openLinkPopover = () => {
  trackSelection();
  linkUrl.value = "";
  linkPopoverOpen.value = true;
};

const confirmLink = () => {
  if (!linkUrl.value.trim()) {
    linkPopoverOpen.value = false;
    return;
  }
  editorRef.value?.focus();
  restoreSelection();
  // A plain URL with no http(s) prefix would otherwise resolve as a
  // relative link on the current page.
  const url = /^https?:\/\//i.test(linkUrl.value) ? linkUrl.value : `https://${linkUrl.value}`;
  document.execCommand("createLink", false, url);
  onInput();
  linkPopoverOpen.value = false;
};

const TOOLBAR_GROUPS = [
  [
    { command: "undo", icon: Undo2, title: "Undo" },
    { command: "redo", icon: Redo2, title: "Redo" },
  ],
  [
    { command: "bold", icon: Bold, title: "Bold" },
    { command: "italic", icon: Italic, title: "Italic" },
    { command: "underline", icon: Underline, title: "Underline" },
    { command: "strikeThrough", icon: Strikethrough, title: "Strikethrough" },
  ],
  [
    { command: "insertUnorderedList", icon: List, title: "Bullet List" },
    { command: "insertOrderedList", icon: ListOrdered, title: "Numbered List" },
    { command: "formatBlock", value: "<blockquote>", icon: Quote, title: "Quote" },
  ],
  [
    { command: "justifyLeft", icon: AlignLeft, title: "Align Left" },
    { command: "justifyCenter", icon: AlignCenter, title: "Align Center" },
    { command: "justifyRight", icon: AlignRight, title: "Align Right" },
    { command: "justifyFull", icon: AlignJustify, title: "Justify" },
  ],
  [
    { command: "unlink", icon: Link2Off, title: "Remove Link" },
    { command: "insertHorizontalRule", icon: Minus, title: "Horizontal Line" },
    { command: "removeFormat", icon: Eraser, title: "Clear Formatting" },
  ],
];

const FORMAT_OPTIONS = [
  { label: "Paragraf", value: "<p>" },
  { label: "Heading 1", value: "<h1>" },
  { label: "Heading 2", value: "<h2>" },
  { label: "Heading 3", value: "<h3>" },
];
</script>

<template>
  <div class="border border-[#DCDEDD] rounded-xl overflow-hidden" :class="{ 'opacity-60': disabled }">
    <div v-if="!disabled" class="flex flex-wrap items-center gap-1 border-b border-[#DCDEDD] bg-gray-50 px-2 py-1.5">
      <select
        @change="setFormatBlock($event.target.value)"
        class="text-xs border border-[#DCDEDD] rounded-md px-1.5 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#0C51D9] mr-1"
        title="Format Teks"
      >
        <option v-for="opt in FORMAT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>

      <template v-for="(group, gi) in TOOLBAR_GROUPS" :key="gi">
        <span class="w-px h-5 bg-[#DCDEDD] mx-0.5" />
        <button
          v-for="btn in group"
          :key="btn.command"
          type="button"
          :title="btn.title"
          @mousedown.prevent="exec(btn.command, btn.value)"
          class="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <component :is="btn.icon" class="w-4 h-4" />
        </button>
      </template>

      <span class="w-px h-5 bg-[#DCDEDD] mx-0.5" />
      <div class="relative">
        <button
          type="button"
          title="Insert Link"
          @mousedown.prevent="openLinkPopover"
          class="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <Link2 class="w-4 h-4" />
        </button>

        <div
          v-if="linkPopoverOpen"
          class="absolute z-10 top-full left-0 mt-1 bg-white border border-[#DCDEDD] rounded-lg shadow-lg p-2 flex items-center gap-1.5 w-64"
        >
          <input
            v-model="linkUrl"
            @keydown.enter.prevent="confirmLink"
            @keydown.esc="linkPopoverOpen = false"
            type="text"
            placeholder="https://..."
            autofocus
            class="flex-1 min-w-0 px-2 py-1 border border-[#DCDEDD] rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#0C51D9]"
          />
          <button
            type="button"
            @mousedown.prevent="confirmLink"
            class="shrink-0 px-2 py-1 rounded-md bg-[#0C51D9] text-white text-xs font-semibold"
          >
            OK
          </button>
        </div>
      </div>
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
.rich-text-editor :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0.5rem 0;
}
.rich-text-editor :deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0.5rem 0;
}
.rich-text-editor :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.5rem 0;
}
.rich-text-editor :deep(blockquote) {
  border-left: 3px solid #0c51d9;
  padding-left: 0.75rem;
  color: #6b7280;
  margin: 0.5rem 0;
}
.rich-text-editor :deep(a) {
  color: #0c51d9;
  text-decoration: underline;
}
.rich-text-editor :deep(hr) {
  border: none;
  border-top: 1px solid #dcdedd;
  margin: 0.75rem 0;
}
</style>
