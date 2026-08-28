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
  Table,
  Rows3,
  Columns3,
  Trash2,
  Palette,
  PaintBucket,
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
const tablePopoverOpen = ref(false);
const tableRows = ref(3);
const tableCols = ref(3);
const inTable = ref(false);
const colorPopoverOpen = ref(false);
const rowColorPopoverOpen = ref(false);
let savedSelection = null;

const CELL_COLORS = [
  { label: "Tanpa Warna", value: "" },
  { label: "Abu-abu", value: "#f3f4f6" },
  { label: "Merah", value: "#fee2e2" },
  { label: "Kuning", value: "#fef9c3" },
  { label: "Hijau", value: "#dcfce7" },
  { label: "Biru", value: "#dbeafe" },
  { label: "Ungu", value: "#ede9fe" },
];

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || "";
  }
  // Chrome wraps new lines in <div> by default when Enter is pressed in a
  // contenteditable, not <p> -- forcing this makes every new paragraph a
  // real <p>, which is what the PDF's first-line-indent CSS targets.
  document.execCommand("defaultParagraphSeparator", false, "p");
  document.addEventListener("selectionchange", trackSelection);
});

onBeforeUnmount(() => {
  document.removeEventListener("selectionchange", trackSelection);
  document.removeEventListener("mousemove", onResizeMouseMove);
  document.removeEventListener("mouseup", onResizeMouseUp);
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
    inTable.value = !!closestCell(selection.anchorNode);
  }
};

// Walks up from a selection node to the nearest table cell, stopping at the
// editor boundary -- used both to toggle the row/column controls and to
// locate which cell/row/table a table edit should apply to.
const closestCell = (node) => {
  let el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el && el !== editorRef.value) {
    if (el.tagName === "TD" || el.tagName === "TH") return el;
    el = el.parentElement;
  }
  return null;
};

const getTableContext = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const cell = closestCell(selection.anchorNode);
  if (!cell) return null;
  const row = cell.closest("tr");
  const table = cell.closest("table");
  if (!row || !table) return null;
  return { cell, row, table, cellIndex: Array.from(row.children).indexOf(cell) };
};

const restoreSelection = () => {
  if (!savedSelection) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedSelection);
};

// contenteditable does nothing with Tab by default -- it just moves focus
// off the editor. Mirror the common word-processor behavior instead: inside
// a list, Tab/Shift+Tab change nesting level; anywhere else, Tab inserts a
// fixed-width indent at the caret.
const closestListItem = (node) => {
  let el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el && el !== editorRef.value) {
    if (el.tagName === "LI") return el;
    el = el.parentElement;
  }
  return null;
};

const onEditorKeydown = (e) => {
  if (e.key !== "Tab" || props.disabled) return;
  e.preventDefault();

  const selection = window.getSelection();
  const inListItem = selection?.rangeCount && closestListItem(selection.anchorNode);

  if (inListItem) {
    document.execCommand(e.shiftKey ? "outdent" : "indent");
  } else if (!e.shiftKey) {
    document.execCommand("insertHTML", false, "&emsp;");
  }
  onInput();
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

const openTablePopover = () => {
  trackSelection();
  tableRows.value = 3;
  tableCols.value = 3;
  tablePopoverOpen.value = true;
};

const confirmInsertTable = () => {
  const rows = Math.max(1, Math.min(20, parseInt(tableRows.value) || 1));
  const cols = Math.max(1, Math.min(10, parseInt(tableCols.value) || 1));
  const rowHtml = `<tr>${"<td>&nbsp;</td>".repeat(cols)}</tr>`;
  editorRef.value?.focus();
  restoreSelection();
  document.execCommand("insertHTML", false, `<table>${rowHtml.repeat(rows)}</table><p><br></p>`);
  onInput();
  tablePopoverOpen.value = false;
};

const addRow = () => {
  const ctx = getTableContext();
  if (!ctx) return;
  const newRow = document.createElement("tr");
  for (let i = 0; i < ctx.row.children.length; i++) {
    newRow.innerHTML += "<td>&nbsp;</td>";
  }
  ctx.row.after(newRow);
  onInput();
};

const deleteRow = () => {
  const ctx = getTableContext();
  if (!ctx) return;
  if (ctx.table.querySelectorAll("tr").length <= 1) {
    deleteTable();
    return;
  }
  ctx.row.remove();
  onInput();
};

const addColumn = () => {
  const ctx = getTableContext();
  if (!ctx) return;
  ctx.table.querySelectorAll("tr").forEach((row) => {
    const cell = row.children[ctx.cellIndex];
    if (cell) cell.insertAdjacentHTML("afterend", "<td>&nbsp;</td>");
  });
  onInput();
};

const deleteColumn = () => {
  const ctx = getTableContext();
  if (!ctx) return;
  if (ctx.row.children.length <= 1) {
    deleteTable();
    return;
  }
  ctx.table.querySelectorAll("tr").forEach((row) => {
    row.children[ctx.cellIndex]?.remove();
  });
  onInput();
};

const deleteTable = () => {
  const ctx = getTableContext();
  if (!ctx) return;
  ctx.table.remove();
  inTable.value = false;
  onInput();
};

const openColorPopover = () => {
  trackSelection();
  colorPopoverOpen.value = true;
};

const applyColumnColor = (color) => {
  const ctx = getTableContext();
  colorPopoverOpen.value = false;
  if (!ctx) return;
  ctx.table.querySelectorAll("tr").forEach((row) => {
    const cell = row.children[ctx.cellIndex];
    if (cell) cell.style.backgroundColor = color;
  });
  onInput();
};

const openRowColorPopover = () => {
  trackSelection();
  rowColorPopoverOpen.value = true;
};

const applyRowColor = (color) => {
  const ctx = getTableContext();
  rowColorPopoverOpen.value = false;
  if (!ctx) return;
  Array.from(ctx.row.children).forEach((cell) => {
    cell.style.backgroundColor = color;
  });
  onInput();
};

// --- Column width / row height resizing -----------------------------
// Plain <td>/<th> widths are driven by the browser's table auto-layout
// (widest content wins), so there's no single element to resize. A
// <colgroup> gives each column its own resizable element; it's built
// lazily off the current rendered widths the first time a column is
// dragged, then the table is pinned to table-layout: fixed so those
// widths actually stick.
const RESIZE_EDGE_PX = 6;
let resizeState = null;

const ensureColgroup = (table) => {
  const firstRow = table.querySelector("tr");
  if (!firstRow) return null;
  const colCount = firstRow.children.length;
  let colgroup = table.querySelector(":scope > colgroup");
  if (colgroup && colgroup.children.length === colCount) return colgroup;

  colgroup = document.createElement("colgroup");
  Array.from(firstRow.children).forEach((cell) => {
    const col = document.createElement("col");
    col.style.width = `${Math.round(cell.getBoundingClientRect().width)}px`;
    colgroup.appendChild(col);
  });
  table.insertBefore(colgroup, table.firstChild);
  table.style.tableLayout = "fixed";
  return colgroup;
};

const resizeEdgeAt = (cell, clientX, clientY) => {
  const rect = cell.getBoundingClientRect();
  if (rect.right - clientX <= RESIZE_EDGE_PX) return "col";
  if (rect.bottom - clientY <= RESIZE_EDGE_PX) return "row";
  return null;
};

const onEditorMouseMove = (e) => {
  if (resizeState || props.disabled) return;
  const cell = closestCell(e.target);
  const edge = cell ? resizeEdgeAt(cell, e.clientX, e.clientY) : null;
  editorRef.value.style.cursor = edge === "col" ? "col-resize" : edge === "row" ? "row-resize" : "";
};

const onEditorMouseDown = (e) => {
  if (props.disabled) return;
  const cell = closestCell(e.target);
  if (!cell) return;
  const edge = resizeEdgeAt(cell, e.clientX, e.clientY);
  if (!edge) return;

  e.preventDefault();
  const table = cell.closest("table");
  const row = cell.closest("tr");

  if (edge === "col") {
    const colgroup = ensureColgroup(table);
    const cellIndex = Array.from(row.children).indexOf(cell);
    const col = colgroup?.children[cellIndex];
    if (!col) return;
    resizeState = { type: "col", col, startX: e.clientX, startWidth: parseFloat(col.style.width) };
  } else {
    resizeState = { type: "row", row, startY: e.clientY, startHeight: row.getBoundingClientRect().height };
  }

  document.addEventListener("mousemove", onResizeMouseMove);
  document.addEventListener("mouseup", onResizeMouseUp);
};

const onResizeMouseMove = (e) => {
  if (!resizeState) return;
  if (resizeState.type === "col") {
    const width = Math.max(30, resizeState.startWidth + (e.clientX - resizeState.startX));
    resizeState.col.style.width = `${width}px`;
  } else {
    const height = Math.max(20, resizeState.startHeight + (e.clientY - resizeState.startY));
    resizeState.row.style.height = `${height}px`;
  }
};

const onResizeMouseUp = () => {
  if (!resizeState) return;
  resizeState = null;
  document.removeEventListener("mousemove", onResizeMouseMove);
  document.removeEventListener("mouseup", onResizeMouseUp);
  onInput();
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
  { label: "Normal Text", value: "<p>" },
  { label: "Title", value: "<h1>" },
  { label: "Subtitle", value: "<h2>" },
  { label: "Heading", value: "<h3>" },
  { label: "Sub Heading", value: "<h4>" },
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

      <span class="w-px h-5 bg-[#DCDEDD] mx-0.5" />
      <div class="relative">
        <button
          type="button"
          title="Insert Table"
          @mousedown.prevent="openTablePopover"
          class="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <Table class="w-4 h-4" />
        </button>

        <div
          v-if="tablePopoverOpen"
          class="absolute z-10 top-full left-0 mt-1 bg-white border border-[#DCDEDD] rounded-lg shadow-lg p-3 w-44"
        >
          <div class="flex items-center gap-2 mb-2">
            <label class="text-xs text-gray-500 w-12 shrink-0">Baris</label>
            <input
              v-model.number="tableRows"
              @keydown.enter.prevent="confirmInsertTable"
              @keydown.esc="tablePopoverOpen = false"
              type="number"
              min="1"
              max="20"
              class="flex-1 min-w-0 px-2 py-1 border border-[#DCDEDD] rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#0C51D9]"
            />
          </div>
          <div class="flex items-center gap-2 mb-2.5">
            <label class="text-xs text-gray-500 w-12 shrink-0">Kolom</label>
            <input
              v-model.number="tableCols"
              @keydown.enter.prevent="confirmInsertTable"
              @keydown.esc="tablePopoverOpen = false"
              type="number"
              min="1"
              max="10"
              class="flex-1 min-w-0 px-2 py-1 border border-[#DCDEDD] rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#0C51D9]"
            />
          </div>
          <button
            type="button"
            @mousedown.prevent="confirmInsertTable"
            class="w-full px-2 py-1.5 rounded-md bg-[#0C51D9] text-white text-xs font-semibold"
          >
            Sisipkan Tabel
          </button>
        </div>
      </div>

      <template v-if="inTable">
        <span class="w-px h-5 bg-[#DCDEDD] mx-0.5" />
        <button
          type="button"
          title="Add Row Below"
          @mousedown.prevent="addRow"
          class="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <Rows3 class="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Delete Current Row"
          @mousedown.prevent="deleteRow"
          class="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
        >
          <Rows3 class="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Add Column Right"
          @mousedown.prevent="addColumn"
          class="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <Columns3 class="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Delete Current Column"
          @mousedown.prevent="deleteColumn"
          class="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
        >
          <Columns3 class="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Delete Table"
          @mousedown.prevent="deleteTable"
          class="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
        >
          <Trash2 class="w-4 h-4" />
        </button>

        <div class="relative">
          <button
            type="button"
            title="Column Color"
            @mousedown.prevent="openColorPopover"
            class="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <Palette class="w-4 h-4" />
          </button>

          <div
            v-if="colorPopoverOpen"
            class="absolute z-10 top-full left-0 mt-1 bg-white border border-[#DCDEDD] rounded-lg shadow-lg p-2 flex items-center gap-1.5"
          >
            <button
              v-for="color in CELL_COLORS"
              :key="color.value || 'none'"
              type="button"
              :title="color.label"
              @mousedown.prevent="applyColumnColor(color.value)"
              class="w-6 h-6 rounded-md border border-[#DCDEDD] transition-transform hover:scale-110"
              :class="{ 'bg-white bg-[linear-gradient(135deg,transparent_45%,#ef4444_45%,#ef4444_55%,transparent_55%)]': !color.value }"
              :style="color.value ? { backgroundColor: color.value } : {}"
            ></button>
          </div>
        </div>

        <div class="relative">
          <button
            type="button"
            title="Row Color"
            @mousedown.prevent="openRowColorPopover"
            class="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <PaintBucket class="w-4 h-4" />
          </button>

          <div
            v-if="rowColorPopoverOpen"
            class="absolute z-10 top-full left-0 mt-1 bg-white border border-[#DCDEDD] rounded-lg shadow-lg p-2 flex items-center gap-1.5"
          >
            <button
              v-for="color in CELL_COLORS"
              :key="color.value || 'none'"
              type="button"
              :title="color.label"
              @mousedown.prevent="applyRowColor(color.value)"
              class="w-6 h-6 rounded-md border border-[#DCDEDD] transition-transform hover:scale-110"
              :class="{ 'bg-white bg-[linear-gradient(135deg,transparent_45%,#ef4444_45%,#ef4444_55%,transparent_55%)]': !color.value }"
              :style="color.value ? { backgroundColor: color.value } : {}"
            ></button>
          </div>
        </div>
      </template>
    </div>

    <div
      ref="editorRef"
      :contenteditable="!disabled"
      @input="onInput"
      @keydown="onEditorKeydown"
      @mousemove="onEditorMouseMove"
      @mousedown="onEditorMouseDown"
      @mouseleave="editorRef.style.cursor = ''"
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
/* Indentation is left to the Align/Indent controls (and Tab) instead of
   being auto-applied to every paragraph -- matches the PDF, where
   .body-content no longer forces a first-line-indent either. */
.rich-text-editor :deep(p),
.rich-text-editor > :deep(div) {
  margin: 0 0 0.5em 0;
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
  font-size: 1.1rem;
  font-weight: 500;
  color: #6b7280;
  margin: -0.25rem 0 0.5rem 0;
}
.rich-text-editor :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.5rem 0;
}
.rich-text-editor :deep(h4) {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
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
.rich-text-editor :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
}
.rich-text-editor :deep(table td),
.rich-text-editor :deep(table th) {
  border: 1px solid #dcdedd;
  padding: 0.375rem 0.5rem;
  min-width: 1.5rem;
}
</style>
