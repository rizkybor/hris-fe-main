<script setup>
// KPI tile: label, big value, optional hint line. `tone` colours the value
// only (e.g. "bad" for an overdue count); text stays on text tokens.
// With `to` the whole tile is a link. With `selectable` it is a filter
// toggle (button, aria-pressed): emits `select`, `active` highlights it.
import { computed } from "vue";
import Skeleton from "../common/skeleton/Skeleton.vue";

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: "" },
  hint: { type: String, default: "" },
  tone: { type: String, default: "" }, // "" | ok | warn | bad | accent
  icon: { type: [Object, Function], default: null },
  to: { type: [String, Object], default: null },
  loading: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
});
defineEmits(["select"]);
const TONES = { ok: "text-ui-ok", warn: "text-ui-warn", bad: "text-ui-bad", accent: "text-ui-accent" };
const valueClass = computed(() => TONES[props.tone] || "text-ui-ink");
</script>

<template>
  <component
    :is="to ? 'RouterLink' : selectable ? 'button' : 'div'"
    :to="to || undefined"
    :type="selectable ? 'button' : undefined"
    :aria-pressed="selectable ? active : undefined"
    class="block w-full text-left bg-ui-surface border rounded-ui-card px-5 py-4 min-w-0"
    :class="[
      to || selectable ? 'ui-lift hover:border-ui-line-strong' : '',
      active ? 'border-ui-accent ring-1 ring-ui-accent' : 'border-ui-line',
    ]"
    @click="selectable && $emit('select')"
  >
    <div class="flex items-center gap-2">
      <component :is="icon" v-if="icon" class="w-4 h-4 text-ui-faint shrink-0" />
      <p class="text-ui-small text-ui-muted truncate">{{ label }}</p>
    </div>
    <Skeleton v-if="loading" class="mt-2" width="96px" height="28px" rounded="6px" />
    <p v-else class="text-ui-h1 tabular-nums mt-1.5 truncate" :class="valueClass"><slot>{{ value }}</slot></p>
    <p v-if="hint || $slots.hint" class="text-ui-cap text-ui-muted mt-1 truncate"><slot name="hint">{{ hint }}</slot></p>
  </component>
</template>
