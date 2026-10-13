<script setup>
import { computed, inject, nextTick, ref } from "vue";
import { Handle, Position, useVueFlow } from "@vue-flow/core";
import { NodeResizer } from "@vue-flow/node-resizer";
import { SHAPES } from "./flowchartShapes";

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  dimensions: { type: Object, default: () => ({ width: 0, height: 0 }) },
});

const readonly = inject("flowchartReadonly", ref(false));
const { updateNodeData } = useVueFlow();

const shape = computed(() => SHAPES[props.data.shape] ?? SHAPES.process);
const width = computed(() => props.dimensions.width || shape.value.size.width);
const height = computed(() => props.dimensions.height || shape.value.size.height);
const elements = computed(() => shape.value.path(width.value, height.value));

const labelStyle = computed(() => ({
  top: "6px",
  bottom: "6px",
  left: "10px",
  right: "10px",
  ...(shape.value.labelBox ?? {}),
  color: props.data.textColor,
  fontSize: `${props.data.fontSize || 13}px`,
  fontWeight: props.data.bold ? 700 : 500,
}));

// Double-click a shape to type straight into it, like any diagram tool.
// Enter commits, Shift+Enter adds a line break, Escape cancels.
const editing = ref(false);
const draft = ref("");
const textarea = ref(null);

const startEditing = async () => {
  if (readonly.value) return;
  draft.value = props.data.label ?? "";
  editing.value = true;
  await nextTick();
  textarea.value?.focus();
  textarea.value?.select();
};

const commit = () => {
  if (!editing.value) return;
  editing.value = false;
  if (draft.value !== props.data.label) updateNodeData(props.id, { label: draft.value });
};

const onKeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    commit();
  } else if (e.key === "Escape") {
    editing.value = false;
  }
};

const handles = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
];
</script>

<template>
  <div class="fc-node" :class="{ 'fc-node--selected': selected, 'fc-node--readonly': readonly }" @dblclick.stop="startEditing">
    <NodeResizer
      v-if="!readonly"
      :is-visible="selected"
      :min-width="40"
      :min-height="30"
      color="#0C51D9"
    />

    <svg class="fc-shape" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <component
        :is="el.tag"
        v-for="(el, index) in elements"
        :key="index"
        v-bind="el.attrs"
        :fill="el.attrs.fill ?? data.fill"
        :stroke="data.stroke"
        stroke-width="2"
        stroke-linejoin="round"
      />
    </svg>

    <div class="fc-label" :style="labelStyle">
      <textarea
        v-if="editing"
        ref="textarea"
        v-model="draft"
        class="fc-label-input nodrag nowheel"
        :style="{ color: data.textColor, fontSize: `${data.fontSize || 13}px`, fontWeight: data.bold ? 700 : 500 }"
        @blur="commit"
        @keydown.stop="onKeydown"
      />
      <span v-else class="fc-label-text">{{ data.label }}</span>
    </div>

    <Handle
      v-for="handle in handles"
      :id="handle.id"
      :key="handle.id"
      type="source"
      :position="handle.position"
      class="fc-handle"
      :connectable="!readonly"
    />
  </div>
</template>

<style scoped>
.fc-node {
  position: relative;
  width: 100%;
  height: 100%;
}

.fc-shape {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.fc-node--selected .fc-shape {
  filter: drop-shadow(0 0 0.5px #0c51d9) drop-shadow(0 4px 10px rgba(12, 81, 217, 0.18));
}

.fc-label {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.3;
  overflow: hidden;
  pointer-events: none;
}

.fc-label-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.fc-label-input {
  pointer-events: all;
  width: 100%;
  height: 100%;
  resize: none;
  border: none;
  outline: none;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  text-align: center;
  font-family: inherit;
  line-height: 1.3;
  padding: 2px;
}

.fc-handle {
  width: 9px;
  height: 9px;
  background: #ffffff;
  border: 2px solid #0c51d9;
  opacity: 0;
  transition: opacity 0.15s;
}

.fc-node:hover .fc-handle,
.fc-node--selected .fc-handle {
  opacity: 1;
}

.fc-node--readonly .fc-handle {
  opacity: 0 !important;
  pointer-events: none;
}
</style>
