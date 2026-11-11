<script setup>
import { computed } from "vue";
// Status / label badge: a soft tint with strong text, optionally a dot.
// Status colours always come with a word, never colour alone.
const props = defineProps({
  tone: { type: String, default: "neutral" }, // neutral | ok | warn | bad | info | accent | outline
  dot: { type: Boolean, default: false },
});

const TONES = {
  neutral: { box: "bg-ui-subtle text-ui-text", dot: "bg-ui-muted" },
  ok: { box: "bg-ui-ok-soft text-ui-ok", dot: "bg-ui-ok" },
  warn: { box: "bg-ui-warn-soft text-ui-warn", dot: "bg-ui-warn" },
  bad: { box: "bg-ui-bad-soft text-ui-bad", dot: "bg-ui-bad" },
  info: { box: "bg-ui-info-soft text-ui-info", dot: "bg-ui-info" },
  accent: { box: "bg-ui-accent-soft text-ui-accent", dot: "bg-ui-accent" },
  outline: { box: "bg-ui-surface text-ui-text border border-ui-line", dot: "bg-ui-muted" },
};
const palette = computed(() => TONES[props.tone] || TONES.neutral);
</script>

<template>
  <span :class="['inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md text-ui-cap font-medium whitespace-nowrap', palette.box]">
    <span v-if="dot" :class="['w-1.5 h-1.5 rounded-full', palette.dot]" aria-hidden="true"></span>
    <slot />
  </span>
</template>
