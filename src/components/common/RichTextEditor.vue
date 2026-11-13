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
  ImagePlus,
  Loader2,
  Workflow,
} from "lucide-vue-next";

import { useAlertModalStore } from "@/stores/alertModal";
import { useI18n } from "vue-i18n";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Tulis isi dokumen di sini..." },
  disabled: { type: Boolean, default: false },
  uploadImage: { type: Function, default: null },
  insertFlowchart: { type: Function, default: null },
});
const emit = defineEmits(["update:modelValue"]);
const { t } = useI18n();

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
  { label: "editor.colors.none", value: "" },
  { label: "editor.colors.gray", value: "#f3f4f6" },
  { label: "editor.colors.red", value: "#fee2e2" },
  { label: "editor.colors.yellow", value: "#fef9c3" },
  { label: "editor.colors.green", value: "#dcfce7" },
  { label: "editor.colors.blue", value: "#dbeafe" },
  { label: "editor.colors.purple", value: "#ede9fe" },
];

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || "";
  }
  document.execCommand("defaultParagraphSeparator", false, "p");
  document.addEventListener("selectionchange", trackSelection);
});

onBeforeUnmount(() => {
  document.removeEventListener("selectionchange", trackSelection);
  document.removeEventListener("mousemove", onResizeMouseMove);
  document.removeEventListener("mouseup", onResizeMouseUp);
});

watch(
  () => props.modelValue,
  (value) => {
    // Compared without the editor-only selected-image class, which the
    // emitted value never contains.
    if (editorRef.value && cleanHtml() !== (value || "")) {
      deselectImage();
      editorRef.value.innerHTML = value || "";
    }
  }
);

// The selected-image outline is editor-only state, never part of the value.
const SELECTED_IMG_CLASS = "rte-img-selected";
const cleanHtml = () =>
  (editorRef.value?.innerHTML || "").replace(/\s?class="rte-img-selected"/g, "").replace(/\srte-img-selected/g, "");

const onInput = () => {
  if (selectedImage.value && !editorRef.value?.contains(selectedImage.value)) deselectImage();
  emit("update:modelValue", cleanHtml());
};

const selectedImage = ref(null);
const imageWidth = ref(100);
const IMAGE_SIZES = [
  { label: "S", value: 40 },
  { label: "M", value: 60 },
  { label: "L", value: 80 },
  { label: "editor.image.full", value: 100 },
];

const selectImage = (img) => {
  if (selectedImage.value && selectedImage.value !== img) selectedImage.value.classList.remove(SELECTED_IMG_CLASS);
  selectedImage.value = img;
  img.classList.add(SELECTED_IMG_CLASS);
  const match = /^(\d+(?:\.\d+)?)%$/.exec(img.style.width || "");
  imageWidth.value = match ? Math.round(Number(match[1])) : 100;
  imageAlign.value = img.parentElement?.style?.textAlign || "left";
};

const deselectImage = () => {
  selectedImage.value?.classList.remove(SELECTED_IMG_CLASS);
  if (selectedImage.value?.getAttribute("class") === "") selectedImage.value.removeAttribute("class");
  selectedImage.value = null;
};

const setImageWidth = (pct) => {
  const img = selectedImage.value;
  if (!img) return;
  imageWidth.value = pct;
  img.removeAttribute("width");
  img.removeAttribute("height");
  img.style.width = pct >= 100 ? "100%" : `${pct}%`;
  img.style.height = "";
  onInput();
};

// Alignment lives on the image's own paragraph (wrapping it in one first if
// it sits directly in the editor), so it carries over to the PDF as-is.
const imageBlock = (img) => {
  let el = img.parentElement;
  while (el && el !== editorRef.value && !["P", "DIV", "LI", "TD", "TH", "BLOCKQUOTE"].includes(el.tagName)) el = el.parentElement;
  if (!el || el === editorRef.value) {
    const p = document.createElement("p");
    img.parentNode.insertBefore(p, img);
    p.appendChild(img);
    return p;
  }
  return el;
};

const imageAlign = ref("left");

const setImageAlign = (align) => {
  const img = selectedImage.value;
  if (!img) return;
  imageBlock(img).style.textAlign = align === "left" ? "" : align;
  imageAlign.value = align;
  onInput();
};

const removeSelectedImage = () => {
  const img = selectedImage.value;
  if (!img) return;
  deselectImage();
  img.remove();
  onInput();
};

const trackSelection = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editorRef.value) return;
  if (editorRef.value.contains(selection.anchorNode)) {
    savedSelection = selection.getRangeAt(0).cloneRange();
    inTable.value = !!closestCell(selection.anchorNode);
  }
};

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

const imageInput = ref(null);
const uploadingImage = ref(false);

const openImagePicker = () => {
  trackSelection();
  imageInput.value?.click();
};

const insertingFlowchart = ref(false);

const pickFlowchart = async () => {
  if (!props.insertFlowchart) return;
  trackSelection();
  insertingFlowchart.value = true;
  try {
    const picked = await props.insertFlowchart();
    if (!picked) return;
    const name = picked.name || "Flowchart";
    const imgBlock = document.createElement("p");
    const img = document.createElement("img");
    img.src = picked.url;
    img.alt = `Flowchart: ${name}`;
    img.setAttribute("data-flowchart-id", String(Number(picked.id)));
    imgBlock.appendChild(img);
    const caption = document.createElement("p");
    const em = document.createElement("em");
    em.textContent = `Gambar: ${name}`;
    caption.appendChild(em);
    const after = document.createElement("p");
    after.appendChild(document.createElement("br"));

    const anchor = savedSelection?.startContainer;
    let block = anchor && editorRef.value.contains(anchor) ? (anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor) : null;
    while (block && block.parentElement !== editorRef.value) block = block.parentElement;
    if (block && block !== editorRef.value) block.after(imgBlock, caption, after);
    else editorRef.value.append(imgBlock, caption, after);

    editorRef.value.focus();
    const range = document.createRange();
    range.setStart(after, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    onInput();
  } finally {
    insertingFlowchart.value = false;
  }
};

const onImageSelected = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || !props.uploadImage) return;
  uploadingImage.value = true;
  try {
    const url = await props.uploadImage(file);
    editorRef.value?.focus();
    restoreSelection();
    document.execCommand("insertImage", false, url);
    onInput();
  } catch (error) {
    await useAlertModalStore().alert(error?.message || t("editor.image.uploadFailed"), { type: "danger" });
  } finally {
    uploadingImage.value = false;
  }
};

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
  if (e.target?.tagName === "IMG") {
    selectImage(e.target);
  } else if (selectedImage.value) {
    deselectImage();
  }
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
    { command: "undo", icon: Undo2, title: "editor.toolbar.undo" },
    { command: "redo", icon: Redo2, title: "editor.toolbar.redo" },
  ],
  [
    { command: "bold", icon: Bold, title: "editor.toolbar.bold" },
    { command: "italic", icon: Italic, title: "editor.toolbar.italic" },
    { command: "underline", icon: Underline, title: "editor.toolbar.underline" },
    { command: "strikeThrough", icon: Strikethrough, title: "editor.toolbar.strikethrough" },
  ],
  [
    { command: "insertUnorderedList", icon: List, title: "editor.toolbar.bulletList" },
    { command: "insertOrderedList", icon: ListOrdered, title: "editor.toolbar.numberedList" },
    { command: "formatBlock", value: "<blockquote>", icon: Quote, title: "editor.toolbar.quote" },
  ],
  [
    { command: "justifyLeft", icon: AlignLeft, title: "editor.toolbar.alignLeft" },
    { command: "justifyCenter", icon: AlignCenter, title: "editor.toolbar.alignCenter" },
    { command: "justifyRight", icon: AlignRight, title: "editor.toolbar.alignRight" },
    { command: "justifyFull", icon: AlignJustify, title: "editor.toolbar.justify" },
  ],
  [
    { command: "unlink", icon: Link2Off, title: "editor.toolbar.removeLink" },
    { command: "insertHorizontalRule", icon: Minus, title: "editor.toolbar.horizontalLine" },
    { command: "removeFormat", icon: Eraser, title: "editor.toolbar.clearFormatting" },
  ],
];

const FORMAT_OPTIONS = [
  { label: "editor.format.normal", value: "<p>" },
  { label: "editor.format.title", value: "<h1>" },
  { label: "editor.format.subtitle", value: "<h2>" },
  { label: "editor.format.heading", value: "<h3>" },
  { label: "editor.format.subHeading", value: "<h4>" },
];
</script>

<template>
  <div class="border border-ui-line rounded-ui-card overflow-hidden" :class="{ 'opacity-60': disabled }">
    <div v-if="!disabled" class="flex flex-wrap items-center gap-1 border-b border-ui-line bg-ui-subtle px-2 py-1.5">
      <select
        @change="setFormatBlock($event.target.value)"
        class="text-ui-cap border border-ui-line rounded-md px-1.5 py-1 bg-ui-surface text-ui-text cursor-pointer transition-colors hover:border-ui-line-strong focus:outline-none focus:ring-1 focus:ring-ui-accent focus:border-ui-accent mr-1"
        :title="t('editor.format.label')"
      >
        <option v-for="opt in FORMAT_OPTIONS" :key="opt.value" :value="opt.value">{{ t(opt.label) }}</option>
      </select>

      <template v-for="(group, gi) in TOOLBAR_GROUPS" :key="gi">
        <span class="w-px h-5 bg-ui-line mx-0.5" />
        <button
          v-for="btn in group"
          :key="btn.command"
          type="button"
          :title="t(btn.title)"
          @mousedown.prevent="exec(btn.command, btn.value)"
          class="p-1.5 rounded-md hover:bg-ui-hover text-ui-text transition-colors"
        >
          <component :is="btn.icon" class="w-4 h-4" />
        </button>
      </template>

      <template v-if="uploadImage">
        <span class="w-px h-5 bg-ui-line mx-0.5" />
        <button
          type="button"
          :title="t('editor.toolbar.insertImage')"
          :disabled="uploadingImage"
          @mousedown.prevent="openImagePicker"
          class="p-1.5 rounded-md hover:bg-ui-hover text-ui-text transition-colors disabled:opacity-50"
        >
          <Loader2 v-if="uploadingImage" class="w-4 h-4 animate-spin" />
          <ImagePlus v-else class="w-4 h-4" />
        </button>
        <input ref="imageInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onImageSelected" />
      </template>
      <button
        v-if="insertFlowchart"
        type="button"
        :title="t('editor.toolbar.insertFlowchart')"
        :disabled="insertingFlowchart"
        @mousedown.prevent="pickFlowchart"
        class="p-1.5 rounded-md hover:bg-ui-hover text-ui-text transition-colors disabled:opacity-50"
      >
        <Workflow class="w-4 h-4" />
      </button>

      <span class="w-px h-5 bg-ui-line mx-0.5" />
      <div class="relative">
        <button
          type="button"
          :title="t('editor.toolbar.insertLink')"
          @mousedown.prevent="openLinkPopover"
          class="p-1.5 rounded-md hover:bg-ui-hover text-ui-text transition-colors"
        >
          <Link2 class="w-4 h-4" />
        </button>

        <div
          v-if="linkPopoverOpen"
          class="absolute z-10 top-full left-0 mt-1 bg-ui-surface border border-ui-line rounded-ui-control shadow-ui-overlay p-2 flex items-center gap-1.5 w-64"
        >
          <input
            v-model="linkUrl"
            @keydown.enter.prevent="confirmLink"
            @keydown.esc="linkPopoverOpen = false"
            type="text"
            placeholder="https://..."
            autofocus
            class="flex-1 min-w-0 px-2 py-1 border border-ui-line rounded-md text-ui-cap focus:outline-none focus:ring-1 focus:ring-ui-accent"
          />
          <button
            type="button"
            @mousedown.prevent="confirmLink"
            class="shrink-0 px-2 py-1 rounded-md bg-ui-ink text-white text-ui-cap font-semibold"
          >
            OK
          </button>
        </div>
      </div>

      <span class="w-px h-5 bg-ui-line mx-0.5" />
      <div class="relative">
        <button
          type="button"
          :title="t('editor.toolbar.insertTable')"
          @mousedown.prevent="openTablePopover"
          class="p-1.5 rounded-md hover:bg-ui-hover text-ui-text transition-colors"
        >
          <Table class="w-4 h-4" />
        </button>

        <div
          v-if="tablePopoverOpen"
          class="absolute z-10 top-full left-0 mt-1 bg-ui-surface border border-ui-line rounded-ui-control shadow-ui-overlay p-3 w-44"
        >
          <div class="flex items-center gap-2 mb-2">
            <label class="text-ui-cap text-ui-muted w-12 shrink-0">{{ t("editor.table.rows") }}</label>
            <input
              v-model.number="tableRows"
              @keydown.enter.prevent="confirmInsertTable"
              @keydown.esc="tablePopoverOpen = false"
              type="number"
              min="1"
              max="20"
              class="flex-1 min-w-0 px-2 py-1 border border-ui-line rounded-md text-ui-cap focus:outline-none focus:ring-1 focus:ring-ui-accent"
            />
          </div>
          <div class="flex items-center gap-2 mb-2.5">
            <label class="text-ui-cap text-ui-muted w-12 shrink-0">{{ t("editor.table.cols") }}</label>
            <input
              v-model.number="tableCols"
              @keydown.enter.prevent="confirmInsertTable"
              @keydown.esc="tablePopoverOpen = false"
              type="number"
              min="1"
              max="10"
              class="flex-1 min-w-0 px-2 py-1 border border-ui-line rounded-md text-ui-cap focus:outline-none focus:ring-1 focus:ring-ui-accent"
            />
          </div>
          <button
            type="button"
            @mousedown.prevent="confirmInsertTable"
            class="w-full px-2 py-1.5 rounded-md bg-ui-ink text-white text-ui-cap font-semibold"
          >
            Sisipkan Tabel
          </button>
        </div>
      </div>

      <template v-if="inTable">
        <span class="w-px h-5 bg-ui-line mx-0.5" />
        <button
          type="button"
          :title="t('editor.table.addRowBelow')"
          @mousedown.prevent="addRow"
          class="p-1.5 rounded-md hover:bg-ui-hover text-ui-text transition-colors"
        >
          <Rows3 class="w-4 h-4" />
        </button>
        <button
          type="button"
          :title="t('editor.table.deleteRow')"
          @mousedown.prevent="deleteRow"
          class="p-1.5 rounded-md hover:bg-ui-bad-soft text-ui-bad transition-colors"
        >
          <Rows3 class="w-4 h-4" />
        </button>
        <button
          type="button"
          :title="t('editor.table.addColRight')"
          @mousedown.prevent="addColumn"
          class="p-1.5 rounded-md hover:bg-ui-hover text-ui-text transition-colors"
        >
          <Columns3 class="w-4 h-4" />
        </button>
        <button
          type="button"
          :title="t('editor.table.deleteCol')"
          @mousedown.prevent="deleteColumn"
          class="p-1.5 rounded-md hover:bg-ui-bad-soft text-ui-bad transition-colors"
        >
          <Columns3 class="w-4 h-4" />
        </button>
        <button
          type="button"
          :title="t('editor.table.deleteTable')"
          @mousedown.prevent="deleteTable"
          class="p-1.5 rounded-md hover:bg-ui-bad-soft text-ui-bad transition-colors"
        >
          <Trash2 class="w-4 h-4" />
        </button>

        <div class="relative">
          <button
            type="button"
            :title="t('editor.table.columnColor')"
            @mousedown.prevent="openColorPopover"
            class="p-1.5 rounded-md hover:bg-ui-hover text-ui-text transition-colors"
          >
            <Palette class="w-4 h-4" />
          </button>

          <div
            v-if="colorPopoverOpen"
            class="absolute z-10 top-full left-0 mt-1 bg-ui-surface border border-ui-line rounded-ui-control shadow-ui-overlay p-2 flex items-center gap-1.5"
          >
            <button
              v-for="color in CELL_COLORS"
              :key="color.value || 'none'"
              type="button"
              :title="t(color.label)"
              @mousedown.prevent="applyColumnColor(color.value)"
              class="w-6 h-6 rounded-md border border-ui-line transition-transform hover:scale-110"
              :class="{ 'bg-white bg-[linear-gradient(135deg,transparent_45%,#ef4444_45%,#ef4444_55%,transparent_55%)]': !color.value }"
              :style="color.value ? { backgroundColor: color.value } : {}"
            ></button>
          </div>
        </div>

        <div class="relative">
          <button
            type="button"
            :title="t('editor.table.rowColor')"
            @mousedown.prevent="openRowColorPopover"
            class="p-1.5 rounded-md hover:bg-ui-hover text-ui-text transition-colors"
          >
            <PaintBucket class="w-4 h-4" />
          </button>

          <div
            v-if="rowColorPopoverOpen"
            class="absolute z-10 top-full left-0 mt-1 bg-ui-surface border border-ui-line rounded-ui-control shadow-ui-overlay p-2 flex items-center gap-1.5"
          >
            <button
              v-for="color in CELL_COLORS"
              :key="color.value || 'none'"
              type="button"
              :title="t(color.label)"
              @mousedown.prevent="applyRowColor(color.value)"
              class="w-6 h-6 rounded-md border border-ui-line transition-transform hover:scale-110"
              :class="{ 'bg-white bg-[linear-gradient(135deg,transparent_45%,#ef4444_45%,#ef4444_55%,transparent_55%)]': !color.value }"
              :style="color.value ? { backgroundColor: color.value } : {}"
            ></button>
          </div>
        </div>
      </template>
    </div>

    <div
      v-if="selectedImage && !disabled"
      class="flex flex-wrap items-center gap-2 border-b border-ui-line bg-ui-accent-soft px-2.5 py-1.5 text-ui-cap text-ui-ink"
    >
      <span class="font-semibold">{{ t("editor.image.label") }}</span>
      <div class="inline-flex rounded-md border border-ui-line bg-ui-surface overflow-hidden">
        <button
          v-for="size in IMAGE_SIZES"
          :key="size.value"
          type="button"
          class="px-2 py-1 font-semibold transition-colors"
          :class="imageWidth === size.value ? 'bg-ui-ink text-white' : 'text-ui-text hover:bg-ui-hover'"
          :title="t('editor.image.width', { n: size.value })"
          @mousedown.prevent="setImageWidth(size.value)"
        >
          {{ size.label.includes(".") ? t(size.label) : size.label }}
        </button>
      </div>
      <input
        type="range"
        min="20"
        max="100"
        step="5"
        :value="imageWidth"
        class="w-28 accent-[rgb(var(--ui-ink))]"
        :title="t('editor.image.setWidth')"
        @input="setImageWidth(Number($event.target.value))"
      />
      <span class="w-9 tabular-nums">{{ imageWidth }}%</span>
      <span class="w-px h-5 bg-ui-line" />
      <div class="inline-flex gap-0.5">
        <button
          v-for="opt in [
            { value: 'left', icon: AlignLeft, title: 'editor.image.alignLeft' },
            { value: 'center', icon: AlignCenter, title: 'editor.image.center' },
            { value: 'right', icon: AlignRight, title: 'editor.image.alignRight' },
          ]"
          :key="opt.value"
          type="button"
          class="p-1 rounded-md transition-colors"
          :class="imageAlign === opt.value ? 'bg-ui-ink text-white' : 'text-ui-text hover:bg-ui-hover'"
          :title="t(opt.title)"
          @mousedown.prevent="setImageAlign(opt.value)"
        >
          <component :is="opt.icon" class="w-4 h-4" />
        </button>
      </div>
      <button type="button" class="ml-auto p-1 rounded-md text-ui-text hover:bg-ui-bad-soft hover:text-ui-bad" :title="t('editor.image.remove')" @mousedown.prevent="removeSelectedImage">
        <Trash2 class="w-4 h-4" />
      </button>
      <button type="button" class="px-1.5 py-0.5 rounded-md text-ui-muted hover:bg-ui-surface" :title="t('editor.image.done')" @mousedown.prevent="deselectImage">{{ t("editor.image.done") }}</button>
    </div>

    <div
      ref="editorRef"
      :contenteditable="!disabled"
      @input="onInput"
      @keydown="onEditorKeydown"
      @mousemove="onEditorMouseMove"
      @mousedown="onEditorMouseDown"
      @mouseleave="editorRef.style.cursor = ''"
      class="rich-text-editor px-3 py-2.5 text-ui-small min-h-[180px] max-h-[400px] overflow-y-auto focus:outline-none"
      :data-placeholder="placeholder"
    ></div>
  </div>
</template>

<style scoped>
/* Content styles mirror the exported PDF on purpose (headings, quotes,
   links, tables) -- only the editor chrome follows the UI tokens. */
/* The editable area is the document itself (it mirrors the PDF), so in
   dark mode it stays a white sheet with dark text, like a page. */
:global(:root[data-theme="dark"]) .rich-text-editor {
  background: #fff;
  color: #1f2937;
  caret-color: #1f2937;
}
.rich-text-editor:empty::before {
  content: attr(data-placeholder);
  color: rgb(var(--ui-faint));
}
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
.rich-text-editor :deep(img) {
  /* inline-block (Tailwind's reset makes images block) so the paragraph's
     text-align positions it, the same way the PDF does. */
  display: inline-block;
  max-width: 100%;
  height: auto;
  margin: 0.5rem 0;
  cursor: pointer;
}
.rich-text-editor :deep(img.rte-img-selected) {
  outline: 2px solid rgb(var(--ui-accent));
  outline-offset: 2px;
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
