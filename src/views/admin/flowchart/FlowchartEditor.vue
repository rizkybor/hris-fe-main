<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { VueFlow, useVueFlow, MarkerType, ConnectionMode, getRectOfNodes } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import "@vue-flow/minimap/dist/style.css";
import "@vue-flow/node-resizer/dist/style.css";
import { debounce } from "lodash-es";
import {
  ArrowLeft,
  Save,
  Download,
  FileImage,
  FileText,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Grid3x3,
  Maximize,
  Pencil,
  Loader2,
  ChevronDown,
  MousePointerClick,
  Bold,
  Lock,
} from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { UiButton, UiSpinner } from "@/components/ui";
import { uiColor } from "@/utils/uiColor";
import FlowchartNode from "@/components/admin/flowchart/FlowchartNode.vue";
import { SHAPES, SHAPE_KEYS, COLOR_PRESETS, makeNode, shapeLabel } from "@/components/admin/flowchart/flowchartShapes";
import { exportFlowchartJpg, exportFlowchartPdf, renderFlowchartPreview } from "@/components/admin/flowchart/exportFlowchart";
import { useFlowchartStore } from "@/stores/flowchart";
import { useAuthStore } from "@/stores/auth";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";

const props = defineProps({
  readonly: { type: Boolean, default: false },
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useFlowchartStore();
const alertModal = useAlertModalStore();

const flowchartId = computed(() => route.params.id ?? null);
const isReadonly = computed(() => props.readonly || (flowchartId.value ? !can("flowchart-edit") : !can("flowchart-create")));
provide("flowchartReadonly", isReadonly);

// A fresh store id per mount, so a previously opened diagram's state never
// leaks into the next one.
const flowId = `flowchart-${Date.now()}`;
const {
  getNodes,
  getSelectedNodes,
  getSelectedEdges,
  addSelectedNodes,
  removeSelectedElements,
  screenToFlowCoordinate,
  fitView,
  setViewport,
  getViewport,
  vueFlowRef,
  onConnect,
  addEdges,
  updateNodeData,
  onNodesInitialized,
  onNodesChange,
  onEdgesChange,
  selectionKeyCode,
} = useVueFlow(flowId);
// Set on the store rather than as a prop: Vue Flow declares that prop as
// Boolean | null, so a key name there trips a prop-type warning.
selectionKeyCode.value = "Shift";

const name = ref(t("flowchart.editor.untitled"));
const description = ref("");
// Who the flowchart is for -- shown in the export's details and licence line.
const preparedFor = ref("");
const authStore = useAuthStore();
const nodes = ref([]);
const edges = ref([]);
const meta = ref(null);
const loading = ref(false);
const snapToGrid = ref(true);
const exportMenuOpen = ref(false);
const exporting = ref(false);
const exportOrientation = ref("landscape");

const uid = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const DEFAULT_EDGE_DATA = { color: "#475569", dashed: false, arrow: "end" };

const styledEdge = (edge) => {
  const data = { ...DEFAULT_EDGE_DATA, ...(edge.data ?? {}) };
  const marker = { type: MarkerType.ArrowClosed, color: data.color, width: 18, height: 18 };
  return {
    ...edge,
    type: edge.type ?? "smoothstep",
    data,
    // fill is set inline (not left to Vue Flow's stylesheet) so it survives
    // the image export -- otherwise a curved connector exports filled black.
    style: { stroke: data.color, strokeWidth: 2, strokeDasharray: data.dashed ? "6 4" : undefined, fill: "none" },
    markerEnd: data.arrow === "none" ? undefined : marker,
    markerStart: data.arrow === "both" ? marker : undefined,
    labelStyle: { fill: "#0F172A", fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: "#FFFFFF" },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
  };
};

onConnect((connection) => {
  if (isReadonly.value) return;
  addEdges([styledEdge({ ...connection, id: uid("e") })]);
});

const serializeNodes = (list) =>
  list.map((n) => ({ id: n.id, type: n.type, position: { ...n.position }, style: { ...n.style }, data: { ...n.data } }));

const serializeEdges = (list) =>
  list.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    type: e.type,
    label: e.label ?? "",
    animated: !!e.animated,
    data: { ...e.data },
  }));

const snapshot = () => JSON.stringify({ nodes: serializeNodes(nodes.value), edges: serializeEdges(edges.value) });

const savedState = ref(null);
const savedMeta = ref("");
const metaState = () => JSON.stringify({ name: name.value, description: description.value, preparedFor: preparedFor.value });
const isDirty = computed(() => !isReadonly.value && savedState.value !== null && (currentState.value !== savedState.value || metaState() !== savedMeta.value));
const currentState = ref("");

const history = ref([]);
const historyIndex = ref(-1);
let restoring = false;

const recordHistory = debounce(() => {
  const state = snapshot();
  currentState.value = state;
  if (restoring) {
    restoring = false;
    return;
  }
  if (history.value[historyIndex.value] === state) return;
  history.value = history.value.slice(0, historyIndex.value + 1);
  history.value.push(state);
  if (history.value.length > 100) history.value.shift();
  historyIndex.value = history.value.length - 1;
}, 300);

const onFlowChanges = (changes) => {
  if (changes.some((c) => c.type !== "select")) recordHistory();
};
watch([nodes, edges], recordHistory);
onNodesChange(onFlowChanges);
onEdgesChange(onFlowChanges);
watch(() => nodes.value.map((n) => n.data), recordHistory, { deep: true });
watch(
  () => edges.value.map((e) => `${e.source}|${e.target}|${e.sourceHandle}|${e.targetHandle}|${e.label ?? ""}|${e.type}`).join("\n"),
  recordHistory
);

const restore = (state) => {
  restoring = true;
  const parsed = JSON.parse(state);
  nodes.value = parsed.nodes;
  edges.value = parsed.edges.map(styledEdge);
};

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);
const undo = () => {
  if (!canUndo.value) return;
  historyIndex.value--;
  restore(history.value[historyIndex.value]);
};
const redo = () => {
  if (!canRedo.value) return;
  historyIndex.value++;
  restore(history.value[historyIndex.value]);
};

const addShape = (shape, position) => {
  const size = SHAPES[shape].size;
  let pos = position;
  if (!pos) {
    const rect = vueFlowRef.value?.getBoundingClientRect();
    const center = rect
      ? screenToFlowCoordinate({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 0, y: 0 };
    // Nudge repeated clicks so new shapes don't stack exactly on top of each other.
    const offset = (nodes.value.length % 6) * 18;
    pos = { x: center.x - size.width / 2 + offset, y: center.y - size.height / 2 + offset };
  }
  const node = makeNode(shape, pos, uid("n"));
  nodes.value = [...nodes.value, node];
  nextTick(() => {
    removeSelectedElements();
    const added = getNodes.value.find((n) => n.id === node.id);
    if (added) addSelectedNodes([added]);
  });
};

const onPaletteDragStart = (event, shape) => {
  event.dataTransfer.setData("application/flowchart-shape", shape);
  event.dataTransfer.effectAllowed = "move";
};

const onDragOver = (event) => {
  if (event.dataTransfer.types.includes("application/flowchart-shape")) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }
};

const onDrop = (event) => {
  const shape = event.dataTransfer.getData("application/flowchart-shape");
  if (!shape || !SHAPES[shape]) return;
  const point = screenToFlowCoordinate({ x: event.clientX, y: event.clientY });
  const size = SHAPES[shape].size;
  addShape(shape, { x: point.x - size.width / 2, y: point.y - size.height / 2 });
};

const selectedNode = computed(() => (getSelectedNodes.value.length === 1 && !getSelectedEdges.value.length ? getSelectedNodes.value[0] : null));
const selectedEdge = computed(() => (getSelectedEdges.value.length === 1 && !getSelectedNodes.value.length ? getSelectedEdges.value[0] : null));
const hasSelection = computed(() => getSelectedNodes.value.length > 0 || getSelectedEdges.value.length > 0);

const deleteSelected = () => {
  const nodeIds = new Set(getSelectedNodes.value.map((n) => n.id));
  const edgeIds = new Set(getSelectedEdges.value.map((e) => e.id));
  nodes.value = nodes.value.filter((n) => !nodeIds.has(n.id));
  edges.value = edges.value.filter((e) => !edgeIds.has(e.id) && !nodeIds.has(e.source) && !nodeIds.has(e.target));
};

// Copies the selected shapes plus any connectors running between them.
const duplicateSelected = () => {
  const selected = getSelectedNodes.value;
  if (!selected.length) return;
  const idMap = {};
  const copies = serializeNodes(selected).map((n) => {
    idMap[n.id] = uid("n");
    return { ...n, id: idMap[n.id], position: { x: n.position.x + 30, y: n.position.y + 30 } };
  });
  const edgeCopies = serializeEdges(edges.value.filter((e) => idMap[e.source] && idMap[e.target])).map((e) =>
    styledEdge({ ...e, id: uid("e"), source: idMap[e.source], target: idMap[e.target] })
  );
  nodes.value = [...nodes.value, ...copies];
  edges.value = [...edges.value, ...edgeCopies];
  nextTick(() => {
    removeSelectedElements();
    addSelectedNodes(getNodes.value.filter((n) => Object.values(idMap).includes(n.id)));
  });
};

const setNodeData = (patch) => {
  if (selectedNode.value) updateNodeData(selectedNode.value.id, patch);
};

const changeShape = (shape) => {
  if (!selectedNode.value) return;
  const def = SHAPES[shape];
  updateNodeData(selectedNode.value.id, { shape, fill: def.colors.fill, stroke: def.colors.stroke });
};

const setEdge = (patch) => {
  const edge = selectedEdge.value;
  if (!edge) return;
  const { data: dataPatch, ...rest } = patch;
  edges.value = edges.value.map((e) =>
    e.id === edge.id ? { ...styledEdge({ ...e, ...rest, data: { ...e.data, ...(dataPatch ?? {}) } }), selected: true } : e
  );
};

const edgeLabelInput = ref(null);
const onEdgeDoubleClick = async ({ edge }) => {
  if (isReadonly.value) return;
  removeSelectedElements();
  edges.value = edges.value.map((e) => ({ ...e, selected: e.id === edge.id }));
  await nextTick();
  edgeLabelInput.value?.focus();
};

let fitOnInit = !!route.params.id;
onNodesInitialized(() => {
  if (!fitOnInit) return;
  fitOnInit = false;
  const saved = meta.value?.data?.viewport;
  if (saved && !isReadonly.value) setViewport(saved);
  else fitView({ padding: 0.2, maxZoom: 1.25 });
});

const markSaved = () => {
  savedState.value = snapshot();
  currentState.value = savedState.value;
  savedMeta.value = metaState();
};

const load = async () => {
  if (!flowchartId.value) {
    markSaved();
    history.value = [savedState.value];
    historyIndex.value = 0;
    return;
  }
  loading.value = true;
  try {
    const flowchart = await store.fetchFlowchart(flowchartId.value);
    meta.value = flowchart;
    name.value = flowchart.name;
    description.value = flowchart.description ?? "";
    preparedFor.value = flowchart.prepared_for ?? "";
    nodes.value = flowchart.data?.nodes ?? [];
    edges.value = (flowchart.data?.edges ?? []).map(styledEdge);
    await nextTick();
    markSaved();
    history.value = [savedState.value];
    historyIndex.value = 0;
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("flowchart.editor.loadFailed")), { type: "danger" });
    router.push({ name: "admin.flowchart.dashboard" });
  } finally {
    loading.value = false;
  }
};

const refreshPreview = async (id) => {
  try {
    const blob = await renderFlowchartPreview(vueFlowRef.value, getNodes.value);
    if (blob) await store.uploadPreview(id, blob);
  } catch (error) {
    console.warn("Flowchart preview could not be updated", error);
  }
};

const save = async () => {
  if (isReadonly.value || store.saving) return;
  if (!name.value.trim()) {
    await alertModal.alert(t("flowchart.editor.nameRequired"), { type: "warning" });
    return;
  }
  const payload = {
    name: name.value.trim(),
    description: description.value.trim() || null,
    prepared_for: preparedFor.value.trim() || null,
    data: { nodes: serializeNodes(nodes.value), edges: serializeEdges(edges.value), viewport: getViewport() },
  };
  try {
    if (flowchartId.value) {
      meta.value = await store.updateFlowchart(flowchartId.value, payload);
      markSaved();
    } else {
      const created = await store.createFlowchart(payload);
      meta.value = created;
      markSaved();
      router.replace({ name: "admin.flowchart.edit", params: { id: created.id } });
    }
    refreshPreview(meta.value.id);
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("flowchart.editor.saveFailed")), { type: "danger" });
  }
};

// Opening the menu pre-picks the orientation that fits the diagram best;
// the user can still switch it before exporting.
const toggleExportMenu = () => {
  exportMenuOpen.value = !exportMenuOpen.value;
  if (exportMenuOpen.value && getNodes.value.length) {
    const bounds = getRectOfNodes(getNodes.value);
    exportOrientation.value = bounds.width >= bounds.height ? "landscape" : "portrait";
  }
};

const doExport = async (format) => {
  exportMenuOpen.value = false;
  exporting.value = true;
  removeSelectedElements();
  await nextTick();
  const options = {
    name: name.value,
    description: description.value,
    orientation: exportOrientation.value,
    // Document details printed on the export: who made it and when (an
    // unsaved draft is attributed to the current user, today), and who it's for.
    meta: {
      id: meta.value?.id ?? null,
      preparedFor: preparedFor.value.trim(),
      createdBy: meta.value?.creator?.name ?? authStore.user?.name ?? "",
      createdAt: meta.value?.created_at ?? new Date().toISOString(),
      updatedAt: meta.value?.updated_at ?? null,
    },
  };
  try {
    if (format === "jpg") await exportFlowchartJpg(vueFlowRef.value, getNodes.value, options);
    else await exportFlowchartPdf(vueFlowRef.value, getNodes.value, options);
  } catch (error) {
    await alertModal.alert(error?.message || t("flowchart.export.failed"), { type: "danger" });
  } finally {
    exporting.value = false;
  }
};

const onKeydown = (event) => {
  const tag = event.target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target?.isContentEditable) return;
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return;
  const key = event.key.toLowerCase();
  if (key === "s") {
    event.preventDefault();
    save();
  } else if (isReadonly.value) {
    return;
  } else if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    undo();
  } else if ((key === "z" && event.shiftKey) || key === "y") {
    event.preventDefault();
    redo();
  } else if (key === "d") {
    event.preventDefault();
    duplicateSelected();
  }
};

const onBeforeUnload = (event) => {
  if (isDirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};

onBeforeRouteLeave(async (to) => {
  // Saving a new flowchart swaps /create for /:id/edit -- not a real leave.
  if (to.name === "admin.flowchart.edit" && !flowchartId.value) return true;
  if (!isDirty.value) return true;
  return alertModal.confirm(t("flowchart.editor.leaveConfirm"), { type: "warning", confirmText: t("flowchart.editor.leave") });
});

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("beforeunload", onBeforeUnload);
  load();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("beforeunload", onBeforeUnload);
  recordHistory.cancel();
});

watch(flowchartId, (id, oldId) => {
  // Only re-load when switching between two existing flowcharts; the
  // create -> edit swap after the first save keeps the current canvas.
  if (id && oldId) {
    fitOnInit = true;
    load();
  }
});

const nodeTypes = { flowchart: markRaw(FlowchartNode) };
// Default canvas chrome follows the design tokens; shape colours stay as
// the user picked them.
const CHROME = {
  accent: uiColor("accent"),
  dots: uiColor("line-strong"),
  minimapFill: uiColor("subtle"),
  minimapStroke: uiColor("faint"),
};
const minimapNodeColor = (node) => (node.data?.fill === "transparent" ? CHROME.minimapFill : node.data?.fill ?? CHROME.minimapFill);
const minimapStrokeColor = (node) => node.data?.stroke ?? CHROME.minimapStroke;
const FIELD =
  "w-full bg-ui-surface text-ui-small text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control px-2.5 transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";

const exportOrientations = computed(() => [
  { value: "portrait", label: t("flowchart.export.portrait"), w: 14, h: 19 },
  { value: "landscape", label: t("flowchart.export.landscape"), w: 19, h: 14 },
]);

const previewSize = (shape) => {
  if (shape === "connector") return { width: 26, height: 26 };
  if (shape === "decision") return { width: 40, height: 28 };
  if (shape === "database") return { width: 30, height: 30 };
  return { width: 44, height: 28 };
};

const updatedLabel = computed(() => {
  if (!meta.value?.updated_at) return null;
  const at = new Date(meta.value.updated_at).toLocaleString(localeTag(), { dateStyle: "medium", timeStyle: "short" });
  return meta.value.updater?.name
    ? t("flowchart.editor.lastSavedBy", { at, name: meta.value.updater.name })
    : t("flowchart.editor.lastSaved", { at });
});
</script>

<template>
  <div class="flex flex-col bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden" style="height: 100%; min-height: 560px">
    <!-- Top bar -->
    <header class="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 border-b border-ui-line bg-ui-surface">
      <button
        type="button"
        class="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink transition-colors focus:outline-none focus-visible:shadow-ui-focus"
        :title="$t('flowchart.editor.backToList')"
        :aria-label="$t('flowchart.editor.backToList')"
        @click="router.push({ name: 'admin.flowchart.dashboard' })"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>

      <div class="flex-1 min-w-0">
        <!-- The visible title is the editable name field below. -->
        <h1 class="sr-only">{{ name || "Flowchart" }}</h1>
        <input
          v-model="name"
          :readonly="isReadonly"
          maxlength="255"
          :placeholder="$t('flowchart.editor.namePlaceholder')"
          :aria-label="$t('flowchart.editor.namePlaceholder')"
          class="w-full bg-transparent text-ui-h3 text-ui-ink placeholder:text-ui-faint outline-none rounded-[4px] -mx-1 px-1 focus:bg-ui-subtle transition-colors"
        />
        <p class="text-ui-cap truncate">
          <span v-if="isDirty" class="text-ui-warn font-medium">{{ $t("flowchart.editor.unsaved") }}</span>
          <span v-else-if="updatedLabel" class="text-ui-muted">{{ updatedLabel }}</span>
          <span v-else class="text-ui-faint">{{ isReadonly ? $t("flowchart.editor.readOnly") : $t("flowchart.editor.notSaved") }}</span>
        </p>
      </div>

      <!-- Edit tools (desktop) -->
      <div v-if="!isReadonly" class="hidden md:flex items-center gap-0.5 shrink-0">
        <button type="button" class="fc-tool" :disabled="!canUndo" :title="$t('flowchart.tools.undo') + ' (Ctrl+Z)'" :aria-label="$t('flowchart.tools.undo')" @click="undo"><Undo2 class="w-4 h-4" /></button>
        <button type="button" class="fc-tool" :disabled="!canRedo" :title="$t('flowchart.tools.redo') + ' (Ctrl+Shift+Z)'" :aria-label="$t('flowchart.tools.redo')" @click="redo"><Redo2 class="w-4 h-4" /></button>
        <span class="w-px h-5 bg-ui-line mx-1"></span>
        <button type="button" class="fc-tool" :disabled="!getSelectedNodes.length" :title="$t('common.actions.duplicate') + ' (Ctrl+D)'" :aria-label="$t('common.actions.duplicate')" @click="duplicateSelected"><Copy class="w-4 h-4" /></button>
        <button type="button" class="fc-tool fc-tool--danger" :disabled="!hasSelection" :title="$t('common.actions.delete') + ' (Del)'" :aria-label="$t('common.actions.delete')" @click="deleteSelected"><Trash2 class="w-4 h-4" /></button>
        <span class="w-px h-5 bg-ui-line mx-1"></span>
        <button type="button" class="fc-tool" :class="{ 'fc-tool--active': snapToGrid }" :title="$t('flowchart.tools.snap')" :aria-label="$t('flowchart.tools.snap')" :aria-pressed="snapToGrid" @click="snapToGrid = !snapToGrid"><Grid3x3 class="w-4 h-4" /></button>
        <button type="button" class="fc-tool" :title="$t('flowchart.tools.fit')" :aria-label="$t('flowchart.tools.fit')" @click="fitView({ padding: 0.2, maxZoom: 1.25 })"><Maximize class="w-4 h-4" /></button>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <span v-if="isReadonly" class="hidden sm:inline-flex items-center gap-1.5 px-2 text-ui-small text-ui-muted">
          <Lock class="w-3.5 h-3.5" /> {{ $t("flowchart.editor.readOnly") }}
        </span>

        <div class="relative">
          <UiButton
            variant="secondary"
            :icon="Download"
            :loading="exporting"
            :disabled="exporting || nodes.length === 0"
            :icon-right="ChevronDown"
            :aria-label="$t('common.actions.export')"
            @click="toggleExportMenu"
          >
            <span class="hidden sm:inline">{{ $t("common.actions.export") }}</span>
          </UiButton>
          <Transition name="ui-pop">
            <div
              v-if="exportMenuOpen"
              class="absolute right-0 top-full mt-1.5 w-60 bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay z-30 p-2"
            >
              <p class="fc-panel-title px-1 pt-1">{{ $t("flowchart.export.paper") }}</p>
              <div class="grid grid-cols-2 gap-1.5 mb-2">
                <button
                  v-for="option in exportOrientations"
                  :key="option.value"
                  type="button"
                  class="flex flex-col items-center gap-1.5 rounded-ui-control border py-2.5 transition-colors"
                  :class="exportOrientation === option.value ? 'border-ui-accent bg-ui-accent-soft' : 'border-ui-line hover:bg-ui-hover'"
                  :aria-pressed="exportOrientation === option.value"
                  @click="exportOrientation = option.value"
                >
                  <span
                    class="rounded-[2px] border-2"
                    :class="exportOrientation === option.value ? 'border-ui-accent' : 'border-ui-faint'"
                    :style="{ width: `${option.w}px`, height: `${option.h}px` }"
                  ></span>
                  <span class="text-ui-cap font-medium" :class="exportOrientation === option.value ? 'text-ui-accent' : 'text-ui-text'">{{ option.label }}</span>
                </button>
              </div>
              <div class="border-t border-ui-line pt-1.5 space-y-0.5">
                <button type="button" class="w-full h-9 px-2 rounded-ui-control flex items-center gap-2 text-ui-small text-ui-ink hover:bg-ui-hover" @click="doExport('jpg')">
                  <FileImage class="w-4 h-4 text-ui-muted" /> {{ $t("flowchart.export.jpg") }}
                </button>
                <button type="button" class="w-full h-9 px-2 rounded-ui-control flex items-center gap-2 text-ui-small text-ui-ink hover:bg-ui-hover" @click="doExport('pdf')">
                  <FileText class="w-4 h-4 text-ui-muted" /> {{ $t("flowchart.export.pdf") }}
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <UiButton
          v-if="isReadonly && flowchartId && can('flowchart-edit')"
          :icon="Pencil"
          :to="{ name: 'admin.flowchart.edit', params: { id: flowchartId } }"
        >
          {{ $t("common.actions.edit") }}
        </UiButton>
        <UiButton v-if="!isReadonly" :icon="Save" :loading="store.saving" :title="$t('common.actions.save') + ' (Ctrl+S)'" @click="save">{{ $t("common.actions.save") }}</UiButton>
      </div>
    </header>

    <!-- Details: description + who it's for -->
    <div
      v-if="!isReadonly || description || preparedFor"
      class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-3 sm:px-4 py-1.5 border-b border-ui-line bg-ui-subtle/60 text-ui-cap"
    >
      <input
        v-model="description"
        :readonly="isReadonly"
        maxlength="2000"
        :placeholder="isReadonly ? '' : $t('flowchart.editor.descriptionPlaceholder')"
        :aria-label="$t('common.labels.description')"
        class="flex-1 min-w-0 bg-transparent text-ui-text placeholder:text-ui-faint outline-none rounded-[4px] -mx-1 px-1 focus:bg-ui-surface transition-colors"
      />
      <label class="flex items-center gap-1.5 sm:w-[340px] shrink-0 text-ui-muted">
        <span class="shrink-0 font-medium">{{ $t("flowchart.editor.preparedFor") }}</span>
        <input
          v-model="preparedFor"
          :readonly="isReadonly"
          maxlength="255"
          :placeholder="isReadonly ? '-' : $t('flowchart.editor.preparedForPlaceholder')"
          class="flex-1 min-w-0 bg-transparent text-ui-ink placeholder:text-ui-faint outline-none rounded-[4px] px-1 focus:bg-ui-surface transition-colors"
        />
      </label>
    </div>

    <div class="flex flex-1 min-h-0">
      <!-- Shape palette -->
      <aside v-if="!isReadonly" class="w-[176px] shrink-0 border-r border-ui-line bg-ui-surface overflow-y-auto p-3 hidden sm:block">
        <p class="fc-panel-title px-1">{{ $t("flowchart.palette.title") }}</p>
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="shape in SHAPE_KEYS"
            :key="shape"
            type="button"
            draggable="true"
            class="flex flex-col items-center justify-center gap-1.5 rounded-ui-control border border-transparent hover:border-ui-line hover:bg-ui-subtle transition-colors py-2.5 px-1 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:shadow-ui-focus"
            :title="$t('flowchart.palette.shapeHint', { shape: shapeLabel(shape) })"
            @click="addShape(shape)"
            @dragstart="onPaletteDragStart($event, shape)"
          >
            <svg
              v-if="shape !== 'text'"
              :width="previewSize(shape).width"
              :height="previewSize(shape).height"
              :viewBox="`0 0 ${previewSize(shape).width} ${previewSize(shape).height}`"
              style="overflow: visible"
            >
              <component
                :is="el.tag"
                v-for="(el, i) in SHAPES[shape].path(previewSize(shape).width, previewSize(shape).height)"
                :key="i"
                v-bind="el.attrs"
                :fill="el.attrs.fill ?? SHAPES[shape].colors.fill"
                :stroke="SHAPES[shape].colors.stroke"
                stroke-width="1.5"
              />
            </svg>
            <span v-else class="text-ui-h2 font-bold text-ui-ink leading-7">T</span>
            <span class="text-ui-cap leading-tight text-center text-ui-muted">{{ shapeLabel(shape) }}</span>
          </button>
        </div>
        <p class="text-ui-cap text-ui-faint mt-4 px-1">
          {{ $t("flowchart.palette.help") }}
        </p>
      </aside>

      <!-- Canvas -->
      <div class="flex-1 min-w-0 relative" @dragover="onDragOver" @drop="onDrop">
        <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-ui-surface/70">
          <UiSpinner size="24px" :center="false" :label="$t('flowchart.editor.loading')" />
        </div>

        <!-- Canvas toolbar (phones / tablets; desktop has it in the top bar) -->
        <div
          v-if="!isReadonly"
          class="md:hidden absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-raised p-1"
        >
          <button type="button" class="fc-tool" :disabled="!canUndo" :title="$t('flowchart.tools.undo') + ' (Ctrl+Z)'" :aria-label="$t('flowchart.tools.undo')" @click="undo"><Undo2 class="w-4 h-4" /></button>
          <button type="button" class="fc-tool" :disabled="!canRedo" :title="$t('flowchart.tools.redo') + ' (Ctrl+Shift+Z)'" :aria-label="$t('flowchart.tools.redo')" @click="redo"><Redo2 class="w-4 h-4" /></button>
          <span class="w-px h-5 bg-ui-line mx-0.5"></span>
          <button type="button" class="fc-tool" :disabled="!getSelectedNodes.length" :title="$t('common.actions.duplicate') + ' (Ctrl+D)'" :aria-label="$t('common.actions.duplicate')" @click="duplicateSelected"><Copy class="w-4 h-4" /></button>
          <button type="button" class="fc-tool fc-tool--danger" :disabled="!hasSelection" :title="$t('common.actions.delete') + ' (Del)'" :aria-label="$t('common.actions.delete')" @click="deleteSelected"><Trash2 class="w-4 h-4" /></button>
          <span class="w-px h-5 bg-ui-line mx-0.5"></span>
          <button type="button" class="fc-tool" :class="{ 'fc-tool--active': snapToGrid }" :title="$t('flowchart.tools.snap')" :aria-label="$t('flowchart.tools.snap')" :aria-pressed="snapToGrid" @click="snapToGrid = !snapToGrid"><Grid3x3 class="w-4 h-4" /></button>
          <button type="button" class="fc-tool" :title="$t('flowchart.tools.fit')" :aria-label="$t('flowchart.tools.fit')" @click="fitView({ padding: 0.2, maxZoom: 1.25 })"><Maximize class="w-4 h-4" /></button>
        </div>

        <VueFlow
          :id="flowId"
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :connection-mode="ConnectionMode.Loose"
          :default-edge-options="{ type: 'smoothstep' }"
          :connection-line-options="{ style: { stroke: CHROME.accent, strokeWidth: 2 } }"
          :snap-to-grid="snapToGrid"
          :snap-grid="[10, 10]"
          :nodes-draggable="!isReadonly"
          :nodes-connectable="!isReadonly"
          :elements-selectable="!isReadonly"
          :edges-updatable="!isReadonly"
          :delete-key-code="isReadonly ? null : ['Delete', 'Backspace']"
          multi-selection-key-code="Shift"
          :min-zoom="0.2"
          :max-zoom="3"
          class="fc-canvas"
          @edge-double-click="onEdgeDoubleClick"
        >
          <Background :pattern-color="CHROME.dots" :gap="20" />
          <Controls :show-interactive="false" position="bottom-left" />
          <MiniMap pannable zoomable :node-color="minimapNodeColor" :node-stroke-color="minimapStrokeColor" position="bottom-right" class="hidden sm:block" />
        </VueFlow>

        <div v-if="!loading && nodes.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="text-center">
            <div class="w-10 h-10 rounded-full bg-ui-surface border border-ui-line text-ui-muted flex items-center justify-center mx-auto mb-3">
              <MousePointerClick class="w-5 h-5" />
            </div>
            <p class="text-ui-body font-medium text-ui-ink">{{ isReadonly ? $t("flowchart.editor.emptyReadonly") : $t("flowchart.editor.emptyTitle") }}</p>
            <p v-if="!isReadonly" class="text-ui-small text-ui-muted mt-1">{{ $t("flowchart.editor.emptyHint") }}</p>
          </div>
        </div>
      </div>

      <!-- Properties panel -->
      <aside v-if="!isReadonly" class="w-[264px] shrink-0 border-l border-ui-line bg-ui-surface overflow-y-auto hidden lg:flex flex-col">
        <!-- Node -->
        <template v-if="selectedNode">
          <div class="px-4 pt-4 pb-3 border-b border-ui-line">
            <p class="text-ui-h3 text-ui-ink truncate">{{ selectedNode.data.label || shapeLabel(selectedNode.data.shape) }}</p>
            <p class="text-ui-cap text-ui-muted">{{ shapeLabel(selectedNode.data.shape) }}</p>
          </div>
          <div class="p-4 space-y-4 flex-1">
            <div>
              <p class="fc-label">{{ $t("flowchart.inspector.shape") }}</p>
              <select :class="[FIELD, 'h-9']" :value="selectedNode.data.shape" @change="changeShape($event.target.value)">
                <option v-for="shape in SHAPE_KEYS" :key="shape" :value="shape">{{ shapeLabel(shape) }}</option>
              </select>
            </div>

            <div>
              <p class="fc-label">{{ $t("flowchart.inspector.text") }}</p>
              <textarea
                :class="[FIELD, 'py-2 resize-y']"
                rows="3"
                :value="selectedNode.data.label"
                @input="setNodeData({ label: $event.target.value })"
              ></textarea>
              <div class="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min="8"
                  max="48"
                  :class="[FIELD, 'h-8 tabular-nums']"
                  style="width: 64px"
                  :value="selectedNode.data.fontSize"
                  :aria-label="$t('flowchart.inspector.fontSize')"
                  @input="setNodeData({ fontSize: Number($event.target.value) || 13 })"
                />
                <span class="text-ui-cap text-ui-muted">px</span>
                <button
                  type="button"
                  class="fc-tool border border-ui-line-strong"
                  :class="{ 'fc-tool--active': selectedNode.data.bold }"
                  :title="$t('flowchart.inspector.bold')"
                  :aria-label="$t('flowchart.inspector.bold')"
                  :aria-pressed="!!selectedNode.data.bold"
                  @click="setNodeData({ bold: !selectedNode.data.bold })"
                >
                  <Bold class="w-4 h-4" />
                </button>
                <input
                  type="color"
                  class="fc-color"
                  :title="$t('flowchart.inspector.textColor')"
                  :aria-label="$t('flowchart.inspector.textColor')"
                  :value="selectedNode.data.textColor"
                  @input="setNodeData({ textColor: $event.target.value })"
                />
              </div>
            </div>

            <div>
              <p class="fc-label">{{ $t("flowchart.inspector.color") }}</p>
              <div class="grid grid-cols-5 gap-1.5 mb-3">
                <button
                  v-for="(preset, i) in COLOR_PRESETS"
                  :key="i"
                  type="button"
                  class="h-7 rounded-ui-control border-2 transition-transform hover:scale-110"
                  :style="{ backgroundColor: preset.fill, borderColor: preset.stroke }"
                  :aria-label="$t('flowchart.inspector.colorPreset', { n: i + 1 })"
                  @click="setNodeData({ fill: preset.fill, stroke: preset.stroke, textColor: ['#0C51D9', '#0F172A'].includes(preset.fill) ? '#FFFFFF' : '#0F172A' })"
                ></button>
              </div>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-1.5 text-ui-cap text-ui-text">
                  <input type="color" class="fc-color" :value="selectedNode.data.fill === 'transparent' ? '#FFFFFF' : selectedNode.data.fill" @input="setNodeData({ fill: $event.target.value })" />
                  {{ $t("flowchart.inspector.fill") }}
                </label>
                <label class="flex items-center gap-1.5 text-ui-cap text-ui-text">
                  <input type="color" class="fc-color" :value="selectedNode.data.stroke === 'transparent' ? '#334155' : selectedNode.data.stroke" @input="setNodeData({ stroke: $event.target.value })" />
                  {{ $t("flowchart.inspector.border") }}
                </label>
              </div>
            </div>
          </div>
          <div class="px-4 pb-4">
            <UiButton variant="danger" size="sm" :icon="Trash2" @click="deleteSelected">{{ $t("flowchart.inspector.deleteShape") }}</UiButton>
          </div>
        </template>

        <!-- Edge -->
        <template v-else-if="selectedEdge">
          <div class="px-4 pt-4 pb-3 border-b border-ui-line">
            <p class="text-ui-h3 text-ui-ink truncate">{{ selectedEdge.label || $t("flowchart.inspector.connector") }}</p>
            <p class="text-ui-cap text-ui-muted">{{ $t("flowchart.inspector.connector") }}</p>
          </div>
          <div class="p-4 space-y-4 flex-1">
            <div>
              <p class="fc-label">{{ $t("flowchart.inspector.connectorLabel") }}</p>
              <input
                ref="edgeLabelInput"
                :class="[FIELD, 'h-9']"
                :placeholder="$t('flowchart.inspector.connectorLabelPlaceholder')"
                :value="selectedEdge.label"
                @input="setEdge({ label: $event.target.value })"
              />
            </div>

            <div>
              <p class="fc-label">{{ $t("flowchart.inspector.lineType") }}</p>
              <select :class="[FIELD, 'h-9']" :value="selectedEdge.type" @change="setEdge({ type: $event.target.value })">
                <option value="smoothstep">{{ $t("flowchart.inspector.lines.smoothstep") }}</option>
                <option value="step">{{ $t("flowchart.inspector.lines.step") }}</option>
                <option value="straight">{{ $t("flowchart.inspector.lines.straight") }}</option>
                <option value="default">{{ $t("flowchart.inspector.lines.curved") }}</option>
              </select>
            </div>

            <div>
              <p class="fc-label">{{ $t("flowchart.inspector.arrow") }}</p>
              <select :class="[FIELD, 'h-9']" :value="selectedEdge.data?.arrow ?? 'end'" @change="setEdge({ data: { arrow: $event.target.value } })">
                <option value="end">{{ $t("flowchart.inspector.arrows.end") }}</option>
                <option value="both">{{ $t("flowchart.inspector.arrows.both") }}</option>
                <option value="none">{{ $t("flowchart.inspector.arrows.none") }}</option>
              </select>
            </div>

            <div>
              <p class="fc-label">{{ $t("flowchart.inspector.style") }}</p>
              <div class="flex items-center gap-4 mb-2.5">
                <label class="flex items-center gap-1.5 text-ui-cap text-ui-text">
                  <input type="color" class="fc-color" :value="selectedEdge.data?.color ?? '#475569'" @input="setEdge({ data: { color: $event.target.value } })" />
                  {{ $t("flowchart.inspector.color") }}
                </label>
                <label class="flex items-center gap-1.5 text-ui-cap text-ui-text">
                  <input type="checkbox" class="fc-check" :checked="selectedEdge.data?.dashed" @change="setEdge({ data: { dashed: $event.target.checked } })" />
                  {{ $t("flowchart.inspector.dashed") }}
                </label>
              </div>
              <label class="flex items-center gap-1.5 text-ui-cap text-ui-text">
                <input type="checkbox" class="fc-check" :checked="selectedEdge.animated" @change="setEdge({ animated: $event.target.checked })" />
                {{ $t("flowchart.inspector.animated") }}
              </label>
            </div>
          </div>
          <div class="px-4 pb-4">
            <UiButton variant="danger" size="sm" :icon="Trash2" @click="deleteSelected">{{ $t("flowchart.inspector.deleteConnector") }}</UiButton>
          </div>
        </template>

        <!-- Nothing selected -->
        <div v-else class="p-4">
          <p class="fc-panel-title">{{ $t("flowchart.inspector.properties") }}</p>
          <p class="text-ui-small text-ui-muted mb-5">{{ $t("flowchart.inspector.propertiesHint") }}</p>
          <p class="fc-panel-title">{{ $t("flowchart.inspector.shortcuts") }}</p>
          <ul class="text-ui-cap text-ui-text space-y-2">
            <li class="flex justify-between items-center"><span>{{ $t("common.actions.save") }}</span><kbd class="fc-kbd">Ctrl S</kbd></li>
            <li class="flex justify-between items-center"><span>{{ $t("flowchart.tools.undo") }} / {{ $t("flowchart.tools.redo") }}</span><kbd class="fc-kbd">Ctrl Z / ⇧Z</kbd></li>
            <li class="flex justify-between items-center"><span>{{ $t("common.actions.duplicate") }}</span><kbd class="fc-kbd">Ctrl D</kbd></li>
            <li class="flex justify-between items-center"><span>{{ $t("common.actions.delete") }}</span><kbd class="fc-kbd">Del</kbd></li>
            <li class="flex justify-between items-center"><span>{{ $t("flowchart.inspector.multiSelect") }}</span><kbd class="fc-kbd">Shift</kbd></li>
          </ul>
          <p class="text-ui-cap text-ui-faint mt-5 tabular-nums">{{ $t("flowchart.counts.shapes", { n: nodes.length }, nodes.length) }} · {{ $t("flowchart.counts.connectors", { n: edges.length }, edges.length) }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.fc-tool {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--ui-text));
  transition: background-color 0.12s, color 0.12s;
}
.fc-tool:hover:not(:disabled) {
  background: rgb(var(--ui-hover));
  color: rgb(var(--ui-ink));
}
.fc-tool:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgb(var(--ui-accent) / 0.16);
}
.fc-tool:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.fc-tool--active,
.fc-tool--active:hover:not(:disabled) {
  background: rgb(var(--ui-accent-soft));
  color: rgb(var(--ui-accent));
}
.fc-tool--danger:hover:not(:disabled) {
  background: rgb(var(--ui-bad-soft));
  color: rgb(var(--ui-bad));
}
.fc-panel-title {
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--ui-faint));
  margin-bottom: 8px;
}
.fc-label {
  font-size: 13px;
  line-height: 18px;
  font-weight: 500;
  color: rgb(var(--ui-ink));
  margin-bottom: 6px;
}
.fc-color {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgb(var(--ui-line-strong));
  border-radius: 6px;
  background: none;
  cursor: pointer;
}
.fc-check {
  accent-color: rgb(var(--ui-accent));
}
.fc-kbd {
  font-family: inherit;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid rgb(var(--ui-line));
  background: rgb(var(--ui-subtle));
  color: rgb(var(--ui-muted));
}
.fc-canvas {
  background: rgb(var(--ui-bg));
}
</style>

<style>
/* Unscoped: these target Vue Flow's own elements. */
.fc-canvas .vue-flow__node-flowchart {
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}
.fc-canvas .vue-flow__edge.selected .vue-flow__edge-path {
  filter: drop-shadow(0 0 3px rgb(var(--ui-accent) / 0.55));
}
/* Canvas chrome in the design tokens. */
.fc-canvas .vue-flow__controls {
  box-shadow: 0 1px 2px rgb(var(--ui-ink) / 0.06);
  border: 1px solid rgb(var(--ui-line));
  border-radius: 10px;
  overflow: hidden;
  background: rgb(var(--ui-surface));
}
.fc-canvas .vue-flow__controls-button {
  width: 30px;
  height: 30px;
  background: rgb(var(--ui-surface));
  border-bottom: 1px solid rgb(var(--ui-line));
  color: rgb(var(--ui-text));
}
.fc-canvas .vue-flow__controls-button:last-child {
  border-bottom: none;
}
.fc-canvas .vue-flow__controls-button:hover {
  background: rgb(var(--ui-hover));
}
.fc-canvas .vue-flow__controls-button svg {
  fill: currentColor;
}
.fc-canvas .vue-flow__minimap {
  border: 1px solid rgb(var(--ui-line));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--ui-surface));
  box-shadow: 0 1px 2px rgb(var(--ui-ink) / 0.06);
}
/* While exporting: no selection glow in the picture. */
.fc-exporting .fc-node--selected .fc-shape,
.fc-exporting .vue-flow__edge.selected .vue-flow__edge-path {
  filter: none !important;
}
</style>
