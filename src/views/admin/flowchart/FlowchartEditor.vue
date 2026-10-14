<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
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
} from "lucide-vue-next";
import FlowchartNode from "@/components/admin/flowchart/FlowchartNode.vue";
import { SHAPES, SHAPE_KEYS, COLOR_PRESETS, makeNode } from "@/components/admin/flowchart/flowchartShapes";
import { exportFlowchartJpg, exportFlowchartPdf, renderFlowchartPreview } from "@/components/admin/flowchart/exportFlowchart";
import { useFlowchartStore } from "@/stores/flowchart";
import { useAuthStore } from "@/stores/auth";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";

const props = defineProps({
  readonly: { type: Boolean, default: false },
});

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
} = useVueFlow(flowId);

const name = ref("Untitled Flowchart");
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

// ---------------------------------------------------------------------------
// Edges: appearance lives in edge.data (color / dashed / arrow) and is
// expanded into Vue Flow's style + marker props, so the panel only ever
// edits a few plain fields.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Serialization: only what's needed to redraw the diagram, without Vue
// Flow's runtime fields (selected, dragging, computed positions...).
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Undo / redo: a snapshot is recorded shortly after the diagram settles, so
// a drag or a typing burst becomes one step instead of hundreds.
// ---------------------------------------------------------------------------
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

watch([nodes, edges], recordHistory, { deep: true });

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

// ---------------------------------------------------------------------------
// Adding shapes: click a palette tile to drop it in the middle of the
// visible canvas, or drag it to a spot.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Selection actions
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Properties panel
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Load / save
// ---------------------------------------------------------------------------
// Frame the diagram once, right after an existing flowchart's shapes have
// rendered (a brand-new one has nothing to frame -- adding its first shape
// shouldn't suddenly zoom the canvas).
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
    await alertModal.alert(errorMessage(error, "Flowchart could not be loaded."), { type: "danger" });
    router.push({ name: "admin.flowchart.dashboard" });
  } finally {
    loading.value = false;
  }
};

// After each save, a PNG snapshot is stored with the flowchart so documents
// that embed it (Proposal Penawaran) show the latest version. Runs in the
// background: a failed snapshot never blocks or fails the save itself.
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
    await alertModal.alert("Please give the flowchart a name.", { type: "warning" });
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
    await alertModal.alert(errorMessage(error, "Flowchart could not be saved."), { type: "danger" });
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
    await alertModal.alert(error?.message || "Export failed.", { type: "danger" });
  } finally {
    exporting.value = false;
  }
};

// ---------------------------------------------------------------------------
// Keyboard shortcuts (ignored while typing in a field)
// ---------------------------------------------------------------------------
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
  return alertModal.confirm("You have unsaved changes. Leave without saving?", { type: "warning", confirmText: "Leave" });
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

const nodeTypes = { flowchart: FlowchartNode };
const minimapNodeColor = (node) => (node.data?.fill === "transparent" ? "#E2E8F0" : node.data?.fill ?? "#E2E8F0");
const minimapStrokeColor = (node) => node.data?.stroke ?? "#94A3B8";

const previewSize = (shape) => {
  if (shape === "connector") return { width: 26, height: 26 };
  if (shape === "decision") return { width: 40, height: 28 };
  if (shape === "database") return { width: 30, height: 30 };
  return { width: 44, height: 28 };
};

const updatedLabel = computed(() => {
  if (!meta.value?.updated_at) return null;
  const at = new Date(meta.value.updated_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  return meta.value.updater?.name ? `Last saved ${at} by ${meta.value.updater.name}` : `Last saved ${at}`;
});
</script>

<template>
  <div class="flex flex-col bg-white border border-[#DCDEDD] rounded-[14px] overflow-hidden" style="height: 100%; min-height: 560px">
    <!-- Top bar -->
    <div class="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 border-b border-[#DCDEDD] bg-slate-50">
      <button
        type="button"
        class="w-9 h-9 rounded-[10px] border border-[#DCDEDD] bg-white flex items-center justify-center hover:border-[#0C51D9] transition-colors shrink-0"
        title="Back to list"
        @click="router.push({ name: 'admin.flowchart.dashboard' })"
      >
        <ArrowLeft class="w-4 h-4 text-brand-dark" />
      </button>

      <div class="flex-1 min-w-[180px]">
        <input
          v-model="name"
          :readonly="isReadonly"
          maxlength="255"
          placeholder="Flowchart name"
          class="w-full bg-transparent text-brand-dark text-base font-bold outline-none border-b border-transparent focus:border-[#0C51D9] transition-colors"
        />
        <input
          v-model="description"
          :readonly="isReadonly"
          maxlength="2000"
          :placeholder="isReadonly ? '' : 'Add a short description (optional)'"
          class="w-full bg-transparent text-brand-light text-xs outline-none border-b border-transparent focus:border-[#0C51D9] transition-colors mt-0.5"
        />
        <label class="flex items-center gap-1.5 mt-0.5 text-xs text-brand-light">
          <span class="shrink-0 font-semibold">Disiapkan untuk:</span>
          <input
            v-model="preparedFor"
            :readonly="isReadonly"
            maxlength="255"
            :placeholder="isReadonly ? '-' : 'cth. PT Misael Berkat Abadi (opsional)'"
            class="flex-1 min-w-0 bg-transparent text-brand-dark outline-none border-b border-transparent focus:border-[#0C51D9] transition-colors"
          />
        </label>
      </div>

      <span v-if="isDirty" class="text-xs font-semibold text-amber-600 shrink-0">Unsaved changes</span>
      <span v-else-if="updatedLabel" class="text-xs text-brand-light shrink-0 hidden md:inline">{{ updatedLabel }}</span>

      <div class="relative shrink-0">
        <button
          type="button"
          class="rounded-[10px] border border-[#DCDEDD] bg-white px-3 py-2 flex items-center gap-1.5 hover:border-[#0C51D9] transition-colors disabled:opacity-50"
          :disabled="exporting || nodes.length === 0"
          @click="toggleExportMenu"
        >
          <Loader2 v-if="exporting" class="w-4 h-4 animate-spin text-brand-dark" />
          <Download v-else class="w-4 h-4 text-brand-dark" />
          <span class="text-brand-dark text-sm font-semibold">Export</span>
          <ChevronDown class="w-3.5 h-3.5 text-gray-400" />
        </button>
        <div
          v-if="exportMenuOpen"
          class="absolute right-0 mt-1.5 w-56 bg-white border border-[#DCDEDD] rounded-[12px] shadow-lg z-20 p-2.5"
        >
          <p class="fc-panel-title">Paper · A4</p>
          <div class="grid grid-cols-2 gap-1.5 mb-2.5">
            <button
              v-for="option in [
                { value: 'portrait', label: 'Portrait', w: 14, h: 19 },
                { value: 'landscape', label: 'Landscape', w: 19, h: 14 },
              ]"
              :key="option.value"
              type="button"
              class="flex flex-col items-center gap-1 rounded-[10px] border py-2 transition-colors"
              :class="exportOrientation === option.value ? 'border-[#0C51D9] bg-blue-50' : 'border-[#DCDEDD] hover:border-[#0C51D9]'"
              @click="exportOrientation = option.value"
            >
              <span
                class="rounded-[2px] border-2"
                :class="exportOrientation === option.value ? 'border-[#0C51D9]' : 'border-gray-400'"
                :style="{ width: `${option.w}px`, height: `${option.h}px` }"
              ></span>
              <span class="text-xs font-semibold text-brand-dark">{{ option.label }}</span>
            </button>
          </div>
          <button type="button" class="w-full px-2 py-2 rounded-[8px] flex items-center gap-2 text-sm text-brand-dark hover:bg-gray-50" @click="doExport('jpg')">
            <FileImage class="w-4 h-4 text-emerald-600" /> Export as JPG
          </button>
          <button type="button" class="w-full px-2 py-2 rounded-[8px] flex items-center gap-2 text-sm text-brand-dark hover:bg-gray-50" @click="doExport('pdf')">
            <FileText class="w-4 h-4 text-red-600" /> Export as PDF
          </button>
        </div>
      </div>

      <RouterLink
        v-if="isReadonly && flowchartId && can('flowchart-edit')"
        :to="{ name: 'admin.flowchart.edit', params: { id: flowchartId } }"
        class="btn-primary rounded-[10px] border border-[#2151A0] blue-gradient blue-btn-shadow px-3.5 py-2 flex items-center gap-1.5 shrink-0"
      >
        <Pencil class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Edit</span>
      </RouterLink>
      <button
        v-if="!isReadonly"
        type="button"
        class="btn-primary rounded-[10px] border border-[#2151A0] blue-gradient blue-btn-shadow px-3.5 py-2 flex items-center gap-1.5 shrink-0 disabled:opacity-60"
        :disabled="store.saving"
        title="Save (Ctrl+S)"
        @click="save"
      >
        <Loader2 v-if="store.saving" class="w-4 h-4 text-white animate-spin" />
        <Save v-else class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Save</span>
      </button>
    </div>

    <div class="flex flex-1 min-h-0">
      <!-- Shape palette -->
      <aside v-if="!isReadonly" class="w-[150px] shrink-0 border-r border-[#DCDEDD] bg-white overflow-y-auto p-2.5 hidden sm:block">
        <p class="text-[11px] font-bold uppercase tracking-wide text-brand-light mb-2 px-1">Shapes</p>
        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="shape in SHAPE_KEYS"
            :key="shape"
            type="button"
            draggable="true"
            class="flex flex-col items-center justify-center gap-1 rounded-[10px] border border-[#EEF0F2] hover:border-[#0C51D9] hover:bg-blue-50/40 transition-colors py-2 px-1 cursor-grab active:cursor-grabbing"
            :title="`${SHAPES[shape].label} — click or drag onto the canvas`"
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
            <span v-else class="text-brand-dark font-bold" style="font-size: 18px; line-height: 28px">T</span>
            <span class="text-[10px] leading-tight text-center text-brand-dark font-medium">{{ SHAPES[shape].label }}</span>
          </button>
        </div>
        <p class="text-[10px] text-brand-light leading-snug mt-3 px-1">
          Drag from a shape's edge dot to another shape to connect them. Double-click a shape or line to edit its text.
        </p>
      </aside>

      <!-- Canvas -->
      <div class="flex-1 min-w-0 relative" @dragover="onDragOver" @drop="onDrop">
        <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <Loader2 class="w-6 h-6 text-[#0C51D9] animate-spin" />
        </div>

        <!-- Canvas toolbar -->
        <div
          v-if="!isReadonly"
          class="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 bg-white border border-[#DCDEDD] rounded-[12px] shadow-sm p-1"
        >
          <button type="button" class="fc-tool" :disabled="!canUndo" title="Undo (Ctrl+Z)" @click="undo"><Undo2 class="w-4 h-4" /></button>
          <button type="button" class="fc-tool" :disabled="!canRedo" title="Redo (Ctrl+Shift+Z)" @click="redo"><Redo2 class="w-4 h-4" /></button>
          <span class="w-px h-5 bg-[#DCDEDD] mx-0.5"></span>
          <button type="button" class="fc-tool" :disabled="!getSelectedNodes.length" title="Duplicate (Ctrl+D)" @click="duplicateSelected"><Copy class="w-4 h-4" /></button>
          <button type="button" class="fc-tool fc-tool--danger" :disabled="!hasSelection" title="Delete (Del)" @click="deleteSelected"><Trash2 class="w-4 h-4" /></button>
          <span class="w-px h-5 bg-[#DCDEDD] mx-0.5"></span>
          <button type="button" class="fc-tool" :class="{ 'fc-tool--active': snapToGrid }" title="Snap to grid" @click="snapToGrid = !snapToGrid"><Grid3x3 class="w-4 h-4" /></button>
          <button type="button" class="fc-tool" title="Fit to screen" @click="fitView({ padding: 0.2, maxZoom: 1.25 })"><Maximize class="w-4 h-4" /></button>
        </div>

        <VueFlow
          :id="flowId"
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :connection-mode="ConnectionMode.Loose"
          :default-edge-options="{ type: 'smoothstep' }"
          :connection-line-options="{ style: { stroke: '#0C51D9', strokeWidth: 2 } }"
          :snap-to-grid="snapToGrid"
          :snap-grid="[10, 10]"
          :nodes-draggable="!isReadonly"
          :nodes-connectable="!isReadonly"
          :elements-selectable="!isReadonly"
          :edges-updatable="!isReadonly"
          :delete-key-code="isReadonly ? null : ['Delete', 'Backspace']"
          selection-key-code="Shift"
          multi-selection-key-code="Shift"
          :min-zoom="0.2"
          :max-zoom="3"
          class="fc-canvas"
          @edge-double-click="onEdgeDoubleClick"
        >
          <Background pattern-color="#CBD5E1" :gap="20" />
          <Controls :show-interactive="false" position="bottom-left" />
          <MiniMap pannable zoomable :node-color="minimapNodeColor" :node-stroke-color="minimapStrokeColor" position="bottom-right" />
        </VueFlow>

        <div
          v-if="!loading && nodes.length === 0"
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div class="text-center">
            <MousePointerClick class="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <p class="text-brand-dark text-sm font-semibold">{{ isReadonly ? "This flowchart is empty" : "Start your flowchart" }}</p>
            <p v-if="!isReadonly" class="text-brand-light text-xs mt-1">Click or drag a shape from the left panel</p>
          </div>
        </div>
      </div>

      <!-- Properties panel -->
      <aside v-if="!isReadonly" class="w-[240px] shrink-0 border-l border-[#DCDEDD] bg-white overflow-y-auto p-3.5 hidden lg:block">
        <!-- Node -->
        <template v-if="selectedNode">
          <p class="fc-panel-title">Shape</p>
          <select class="fc-input mb-3" :value="selectedNode.data.shape" @change="changeShape($event.target.value)">
            <option v-for="shape in SHAPE_KEYS" :key="shape" :value="shape">{{ SHAPES[shape].label }}</option>
          </select>

          <p class="fc-panel-title">Text</p>
          <textarea
            class="fc-input mb-2"
            rows="3"
            :value="selectedNode.data.label"
            @input="setNodeData({ label: $event.target.value })"
          ></textarea>
          <div class="flex items-center gap-2 mb-3">
            <input
              type="number"
              min="8"
              max="48"
              class="fc-input"
              style="width: 70px"
              :value="selectedNode.data.fontSize"
              @input="setNodeData({ fontSize: Number($event.target.value) || 13 })"
            />
            <span class="text-xs text-brand-light">px</span>
            <button
              type="button"
              class="fc-tool border border-[#DCDEDD]"
              :class="{ 'fc-tool--active': selectedNode.data.bold }"
              title="Bold"
              @click="setNodeData({ bold: !selectedNode.data.bold })"
            >
              <Bold class="w-4 h-4" />
            </button>
            <input
              type="color"
              class="fc-color"
              title="Text color"
              :value="selectedNode.data.textColor"
              @input="setNodeData({ textColor: $event.target.value })"
            />
          </div>

          <p class="fc-panel-title">Color</p>
          <div class="grid grid-cols-5 gap-1.5 mb-2.5">
            <button
              v-for="(preset, i) in COLOR_PRESETS"
              :key="i"
              type="button"
              class="h-7 rounded-md border-2 transition-transform hover:scale-110"
              :style="{ backgroundColor: preset.fill, borderColor: preset.stroke }"
              @click="setNodeData({ fill: preset.fill, stroke: preset.stroke, textColor: ['#0C51D9', '#0F172A'].includes(preset.fill) ? '#FFFFFF' : '#0F172A' })"
            ></button>
          </div>
          <div class="flex items-center gap-3 mb-1">
            <label class="flex items-center gap-1.5 text-xs text-brand-dark">
              <input type="color" class="fc-color" :value="selectedNode.data.fill === 'transparent' ? '#FFFFFF' : selectedNode.data.fill" @input="setNodeData({ fill: $event.target.value })" />
              Fill
            </label>
            <label class="flex items-center gap-1.5 text-xs text-brand-dark">
              <input type="color" class="fc-color" :value="selectedNode.data.stroke === 'transparent' ? '#334155' : selectedNode.data.stroke" @input="setNodeData({ stroke: $event.target.value })" />
              Border
            </label>
          </div>
        </template>

        <!-- Edge -->
        <template v-else-if="selectedEdge">
          <p class="fc-panel-title">Connector Label</p>
          <input
            ref="edgeLabelInput"
            class="fc-input mb-3"
            placeholder="e.g. Yes / No"
            :value="selectedEdge.label"
            @input="setEdge({ label: $event.target.value })"
          />

          <p class="fc-panel-title">Line Type</p>
          <select class="fc-input mb-3" :value="selectedEdge.type" @change="setEdge({ type: $event.target.value })">
            <option value="smoothstep">Rounded elbow</option>
            <option value="step">Sharp elbow</option>
            <option value="straight">Straight</option>
            <option value="default">Curved</option>
          </select>

          <p class="fc-panel-title">Arrow</p>
          <select class="fc-input mb-3" :value="selectedEdge.data?.arrow ?? 'end'" @change="setEdge({ data: { arrow: $event.target.value } })">
            <option value="end">One way →</option>
            <option value="both">Both ways ↔</option>
            <option value="none">No arrow</option>
          </select>

          <p class="fc-panel-title">Style</p>
          <div class="flex items-center gap-3 mb-2">
            <label class="flex items-center gap-1.5 text-xs text-brand-dark">
              <input type="color" class="fc-color" :value="selectedEdge.data?.color ?? '#475569'" @input="setEdge({ data: { color: $event.target.value } })" />
              Color
            </label>
            <label class="flex items-center gap-1.5 text-xs text-brand-dark">
              <input type="checkbox" :checked="selectedEdge.data?.dashed" @change="setEdge({ data: { dashed: $event.target.checked } })" />
              Dashed
            </label>
          </div>
          <label class="flex items-center gap-1.5 text-xs text-brand-dark">
            <input type="checkbox" :checked="selectedEdge.animated" @change="setEdge({ animated: $event.target.checked })" />
            Animated flow
          </label>
        </template>

        <!-- Nothing selected -->
        <template v-else>
          <p class="fc-panel-title">Properties</p>
          <p class="text-xs text-brand-light leading-relaxed mb-4">Select a shape or connector to change its text, colors, and style.</p>
          <p class="fc-panel-title">Shortcuts</p>
          <ul class="text-xs text-brand-dark space-y-1.5">
            <li class="flex justify-between"><span>Save</span><kbd class="fc-kbd">Ctrl S</kbd></li>
            <li class="flex justify-between"><span>Undo / Redo</span><kbd class="fc-kbd">Ctrl Z / ⇧Z</kbd></li>
            <li class="flex justify-between"><span>Duplicate</span><kbd class="fc-kbd">Ctrl D</kbd></li>
            <li class="flex justify-between"><span>Delete</span><kbd class="fc-kbd">Del</kbd></li>
            <li class="flex justify-between"><span>Multi-select</span><kbd class="fc-kbd">Shift</kbd></li>
          </ul>
          <p class="text-xs text-brand-light mt-4">{{ nodes.length }} shapes · {{ edges.length }} connectors</p>
        </template>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.fc-tool {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
  transition: background-color 0.15s, color 0.15s;
}
.fc-tool:hover:not(:disabled) {
  background: #eff6ff;
  color: #0c51d9;
}
.fc-tool:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.fc-tool--active {
  background: #dbeafe;
  color: #0c51d9;
}
.fc-tool--danger:hover:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
}
.fc-panel-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 6px;
}
.fc-input {
  width: 100%;
  border: 1px solid #dcdedd;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  background: #ffffff;
}
.fc-input:focus {
  border-color: #0c51d9;
}
.fc-color {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #dcdedd;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}
.fc-kbd {
  font-family: inherit;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #dcdedd;
  background: #f8fafc;
  color: #475569;
}
.fc-canvas {
  background: #f8fafc;
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
  filter: drop-shadow(0 0 3px rgba(12, 81, 217, 0.55));
}
/* While exporting: no selection glow in the picture. */
.fc-exporting .fc-node--selected .fc-shape,
.fc-exporting .vue-flow__edge.selected .vue-flow__edge-path {
  filter: none !important;
}
</style>
