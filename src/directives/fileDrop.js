import { t } from "@/i18n";
import { useToastStore } from "@/stores/toast";

// v-file-drop: drag & drop files onto an upload area.
//
// The element must contain an <input type="file">. Dropped files are handed
// to that input (its accept / multiple / disabled rules apply) and a normal
// "change" event fires, so the page's existing upload handler runs as is.
//
//   <div v-file-drop> … <input type="file" @change="onPick" /> … </div>
//   <div v-file-drop="'.cover-input'">   pick one of several inputs
//   <div v-file-drop="false">            switched off
//
// While files are dragged over it the area gets .ui-dropzone-active (an
// outline and a "Drop files here" label, see input.css).

const hasFiles = (event) => Array.from(event.dataTransfer?.types || []).includes("Files");

const findInput = (el, value) => {
  if (typeof value === "string") return el.querySelector(value);
  return el.matches?.('input[type="file"]') ? el : el.querySelector('input[type="file"]');
};

// "image/*,.pdf" against a File: extensions, exact types and type/* wildcards.
const accepts = (file, accept) => {
  const rules = String(accept || "")
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);
  if (!rules.length) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
};

const setActive = (el, active) => {
  el.classList.toggle("ui-dropzone-active", active);
  if (active) el.setAttribute("data-drop-label", t("common.fileDrop.dropHere"));
};

const handlers = new WeakMap();
// The latest binding value of each zone (it can change after mount).
const values = new WeakMap();

const bind = (el, binding) => {
  let depth = 0;
  values.set(el, binding.value);
  const enabled = () => values.get(el) !== false;
  const input = () => findInput(el, values.get(el));
  const usable = () => {
    const field = input();
    return enabled() && field && !field.disabled;
  };

  const onEnter = (event) => {
    if (!hasFiles(event) || !usable()) return;
    event.preventDefault();
    depth += 1;
    setActive(el, true);
  };
  const onOver = (event) => {
    if (!hasFiles(event) || !usable()) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };
  const onLeave = (event) => {
    if (!hasFiles(event)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) setActive(el, false);
  };
  const onDrop = (event) => {
    if (!hasFiles(event)) return;
    depth = 0;
    setActive(el, false);
    const field = input();
    if (!usable() || !field) return;
    // Taken here (capture phase) so an inner editor or the browser doesn't
    // also handle the files.
    event.preventDefault();
    event.stopPropagation();

    const toast = useToastStore();
    const dropped = Array.from(event.dataTransfer.files || []);
    let files = dropped.filter((file) => accepts(file, field.accept));
    if (!files.length) {
      toast.error(t("common.fileDrop.notAccepted"), field.accept ? t("common.fileDrop.allowed", { types: field.accept }) : "");
      return;
    }
    const skipped = dropped.length - files.length;
    if (skipped > 0) toast.push({ type: "info", title: t("common.fileDrop.someSkipped", { n: skipped }, skipped) });
    if (!field.multiple && files.length > 1) {
      files = files.slice(0, 1);
      toast.push({ type: "info", title: t("common.fileDrop.oneOnly", { name: files[0].name }) });
    }

    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    field.files = transfer.files;
    field.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const listeners = { dragenter: onEnter, dragover: onOver, dragleave: onLeave, drop: onDrop };
  Object.entries(listeners).forEach(([name, fn]) => el.addEventListener(name, fn, true));
  handlers.set(el, listeners);
  el.classList.add("ui-dropzone");
};

export default {
  mounted: bind,
  updated(el, binding) {
    values.set(el, binding.value);
  },
  beforeUnmount(el) {
    const listeners = handlers.get(el);
    if (listeners) Object.entries(listeners).forEach(([name, fn]) => el.removeEventListener(name, fn, true));
    handlers.delete(el);
  },
};

// Files dropped outside an upload area would otherwise open in the tab and
// leave the app: ignore those drops. Areas with their own drag & drop
// (they already called preventDefault) are left alone.
export const blockStrayFileDrops = () => {
  const stop = (event) => {
    if (hasFiles(event) && !event.defaultPrevented && !event.target?.closest?.(".ui-dropzone")) {
      event.preventDefault();
      if (event.type === "dragover") event.dataTransfer.dropEffect = "none";
    }
  };
  window.addEventListener("dragover", stop);
  window.addEventListener("drop", stop);
};
