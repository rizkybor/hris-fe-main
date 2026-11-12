<script setup>
// Confirm / alert dialog on top of UiModal: status icon, title, message,
// Cancel + action. "danger" makes the action a solid red button.
import { computed } from "vue";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-vue-next";
import UiModal from "./UiModal.vue";
import UiButton from "./UiButton.vue";

const open = defineModel("open", { type: Boolean, default: false });
const props = defineProps({
  title: { type: String, default: "" }, // default: common.confirm.title
  message: { type: String, default: "" },
  type: { type: String, default: "danger" }, // danger | warning | success | info
  mode: { type: String, default: "confirm" }, // confirm | alert (single button)
  confirmText: { type: String, default: "" }, // default: common.actions.confirm / OK
  cancelText: { type: String, default: "" }, // default: common.actions.cancel
  loading: { type: Boolean, default: false },
  zIndex: { type: Number, default: 200 },
  // success only: the check draws itself in (ring, then tick, a small pop
  // and one soft pulse). Still icon when the device asks for less motion.
  celebrate: { type: Boolean, default: false },
});
const emit = defineEmits(["confirm", "cancel"]);

const TONES = {
  danger: { icon: OctagonAlert, box: "bg-ui-bad-soft text-ui-bad" },
  warning: { icon: AlertTriangle, box: "bg-ui-warn-soft text-ui-warn" },
  success: { icon: CheckCircle2, box: "bg-ui-ok-soft text-ui-ok" },
  info: { icon: Info, box: "bg-ui-info-soft text-ui-info" },
};
const tone = computed(() => TONES[props.type] || TONES.info);
const actionVariant = computed(() => (props.type === "danger" && props.mode === "confirm" ? "destructive" : "primary"));

// Cancel button, Esc, backdrop and X all cancel. With v-model:open the
// dialog closes itself; with a one-way :open the parent decides.
const cancel = () => {
  if (props.loading) return;
  emit("cancel");
  open.value = false;
};
const onOpenChange = (value) => {
  if (!value) cancel();
};
</script>

<template>
  <UiModal :open="open" size="sm" :z-index="zIndex" :persistent="loading" @update:open="onOpenChange">
    <template #header>
      <div class="flex items-start gap-3.5 flex-1 min-w-0">
        <span v-if="celebrate && type === 'success'" :class="['ui-check relative w-10 h-10 shrink-0 rounded-full inline-flex items-center justify-center', tone.box]">
          <span class="ui-check__pulse" aria-hidden="true"></span>
          <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle class="ui-check__ring" cx="12" cy="12" r="9.5" pathLength="1" />
            <path class="ui-check__tick" d="M7.8 12.4l2.9 2.9 5.6-6" pathLength="1" />
          </svg>
        </span>
        <span v-else :class="['w-10 h-10 shrink-0 rounded-full inline-flex items-center justify-center', tone.box]">
          <component :is="tone.icon" class="w-5 h-5" />
        </span>
        <div class="min-w-0 pt-0.5">
          <h2 class="text-ui-h2 text-ui-ink">{{ title || $t("common.confirm.title") }}</h2>
          <p v-if="message" class="text-ui-small text-ui-muted mt-1 whitespace-pre-line">{{ message }}</p>
        </div>
      </div>
    </template>
    <template v-if="$slots.default" #default><slot /></template>
    <template #footer>
      <UiButton v-if="mode === 'confirm'" variant="secondary" :disabled="loading" class="flex-1 sm:flex-none" @click="cancel">{{ cancelText || $t("common.actions.cancel") }}</UiButton>
      <UiButton :variant="actionVariant" :loading="loading" class="flex-1 sm:flex-none" @click="emit('confirm')">{{ confirmText || (mode === 'alert' ? $t('common.confirm.ok') : $t('common.actions.confirm')) }}</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
/* Drawn check (celebrate): transform/opacity and a stroke draw only, once. */
.ui-check {
  animation: ui-check-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.ui-check__ring,
.ui-check__tick {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.ui-check__ring {
  animation: ui-check-draw 420ms 80ms ease-out forwards;
}
.ui-check__tick {
  animation: ui-check-draw 300ms 420ms ease-out forwards;
}
.ui-check__pulse {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  border: 2px solid currentColor;
  opacity: 0;
  animation: ui-check-pulse 900ms 560ms ease-out;
}
@keyframes ui-check-pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
}
@keyframes ui-check-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes ui-check-pulse {
  from {
    transform: scale(1);
    opacity: 0.45;
  }
  to {
    transform: scale(1.7);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ui-check,
  .ui-check__ring,
  .ui-check__tick,
  .ui-check__pulse {
    animation: none;
  }
  .ui-check__ring,
  .ui-check__tick {
    stroke-dashoffset: 0;
  }
}
</style>
