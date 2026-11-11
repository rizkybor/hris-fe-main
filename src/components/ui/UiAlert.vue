<script setup>
// Inline message banner (form errors, success notes). Tone + optional
// title; the message can also come through the default slot.
import { computed } from "vue";
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-vue-next";

const props = defineProps({
  tone: { type: String, default: "info" }, // info | ok | warn | bad
  title: { type: String, default: "" },
  message: { type: String, default: "" },
});
const TONES = {
  info: { box: "bg-ui-info-soft border-ui-info/20", icon: Info, ink: "text-ui-info" },
  ok: { box: "bg-ui-ok-soft border-ui-ok/20", icon: CheckCircle2, ink: "text-ui-ok" },
  warn: { box: "bg-ui-warn-soft border-ui-warn/20", icon: AlertTriangle, ink: "text-ui-warn" },
  bad: { box: "bg-ui-bad-soft border-ui-bad/20", icon: AlertCircle, ink: "text-ui-bad" },
};
const t = computed(() => TONES[props.tone] || TONES.info);
</script>

<template>
  <div :class="['ui-anim-fade flex items-start gap-3 rounded-[10px] border px-3.5 py-3', t.box]" :role="tone === 'bad' ? 'alert' : 'status'">
    <component :is="t.icon" :class="['w-[18px] h-[18px] shrink-0 mt-px', t.ink]" />
    <div class="min-w-0">
      <p v-if="title" :class="['text-ui-small font-semibold', t.ink]">{{ title }}</p>
      <p v-if="message || $slots.default" class="text-ui-small text-ui-text" :class="title ? 'mt-0.5' : ''"><slot>{{ message }}</slot></p>
    </div>
  </div>
</template>
