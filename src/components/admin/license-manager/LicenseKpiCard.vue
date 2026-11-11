<script setup>
// One KPI tile: tinted icon square, big number, caption. Renders as a
// button when clickable (e.g. to filter by status); `active` highlights it.
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: null },
  caption: { type: String, default: "" },
  icon: { type: [Object, Function], required: true },
  tone: { type: String, default: "violet" }, // violet | emerald | amber | red | gray
  active: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
});

defineEmits(["select"]);

// Value colour by tone; the tile itself stays neutral like UiStat.
const TONES = {
  violet: { value: "text-ui-ink" },
  emerald: { value: "text-ui-ok" },
  amber: { value: "text-ui-warn" },
  red: { value: "text-ui-bad" },
  gray: { value: "text-ui-muted" },
};

const tone = () => TONES[props.tone] || TONES.violet;
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :type="clickable ? 'button' : undefined"
    :aria-pressed="clickable ? active : undefined"
    @click="clickable && $emit('select')"
    class="relative block w-full bg-ui-surface border rounded-ui-card px-5 py-4 text-left min-w-0 transition-colors"
    :class="[
      active ? 'border-ui-ink ring-1 ring-ui-ink' : 'border-ui-line',
      clickable ? 'ui-lift hover:border-ui-line-strong focus:outline-none focus-visible:shadow-ui-focus' : '',
    ]"
  >
    <div class="flex items-center gap-2 min-w-0">
      <component :is="icon" class="w-4 h-4 text-ui-faint shrink-0" />
      <p class="text-ui-small text-ui-muted truncate" :title="label">{{ label }}</p>
      <span v-if="active" class="ml-auto w-1.5 h-1.5 rounded-full bg-ui-ink shrink-0" aria-hidden="true"></span>
    </div>
    <Skeleton v-if="loading" width="56px" height="28px" rounded="6px" class="mt-2" />
    <p v-else class="text-ui-h1 tabular-nums mt-1.5" :class="tone().value">{{ value ?? "–" }}</p>
    <p v-if="caption" class="text-ui-cap text-ui-muted mt-1 truncate" :title="caption">{{ caption }}</p>
  </component>
</template>
