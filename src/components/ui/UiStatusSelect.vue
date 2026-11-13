<script setup>
import { computed } from "vue";
import { ChevronDown } from "lucide-vue-next";

const props = defineProps({
  options: { type: Array, required: true }, // [{ value, label, tone? }]
  label: { type: String, default: "" }, // accessible name, e.g. "Status"
  disabled: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});
const model = defineModel({ type: [String, Number, null], default: null });
const emit = defineEmits(["change"]);

const TONES = {
  neutral: { box: "bg-ui-subtle text-ui-text", dot: "bg-ui-muted" },
  ok: { box: "bg-ui-ok-soft text-ui-ok", dot: "bg-ui-ok" },
  warn: { box: "bg-ui-warn-soft text-ui-warn", dot: "bg-ui-warn" },
  bad: { box: "bg-ui-bad-soft text-ui-bad", dot: "bg-ui-bad" },
  info: { box: "bg-ui-info-soft text-ui-info", dot: "bg-ui-info" },
  accent: { box: "bg-ui-accent-soft text-ui-accent", dot: "bg-ui-accent" },
};
const current = computed(() => props.options.find((o) => o.value === model.value) || { label: model.value ?? "—", tone: "neutral" });
const palette = computed(() => TONES[current.value.tone] || TONES.neutral);

const onChange = (event) => {
  const option = props.options.find((o) => String(o.value) === event.target.value);
  if (!option || option.value === model.value) return;
  model.value = option.value;
  emit("change", option.value);
};
</script>

<template>
  <span
    :class="[
      'relative inline-flex items-center gap-1.5 h-[24px] pl-2 pr-1.5 rounded-md text-ui-cap font-medium whitespace-nowrap',
      palette.box,
      disabled ? '' : 'hover:brightness-95 focus-within:ring-2 focus-within:ring-ui-accent/40',
      busy ? 'opacity-60' : '',
    ]"
    @click.stop
  >
    <span :class="['w-1.5 h-1.5 rounded-full', palette.dot]" aria-hidden="true"></span>
    {{ current.label }}
    <ChevronDown v-if="!disabled" class="w-3 h-3 opacity-70" aria-hidden="true" />
    <select
      v-if="!disabled"
      class="absolute -inset-x-1 -inset-y-2 opacity-0 cursor-pointer"
      :value="model"
      :aria-label="label || undefined"
      :disabled="busy"
      @change="onChange"
    >
      <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
    </select>
  </span>
</template>
