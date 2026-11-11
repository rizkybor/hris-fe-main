<script setup>
// Confirm / alert dialog on top of UiModal: status icon, title, message,
// Cancel + action. "danger" makes the action a solid red button.
import { computed } from "vue";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-vue-next";
import UiModal from "./UiModal.vue";
import UiButton from "./UiButton.vue";

const open = defineModel("open", { type: Boolean, default: false });
const props = defineProps({
  title: { type: String, default: "Confirm Action" },
  message: { type: String, default: "" },
  type: { type: String, default: "danger" }, // danger | warning | success | info
  mode: { type: String, default: "confirm" }, // confirm | alert (single button)
  confirmText: { type: String, default: "Confirm" },
  cancelText: { type: String, default: "Cancel" },
  loading: { type: Boolean, default: false },
  zIndex: { type: Number, default: 200 },
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
        <span :class="['w-10 h-10 shrink-0 rounded-full inline-flex items-center justify-center', tone.box]">
          <component :is="tone.icon" class="w-5 h-5" />
        </span>
        <div class="min-w-0 pt-0.5">
          <h2 class="text-ui-h2 text-ui-ink">{{ title }}</h2>
          <p v-if="message" class="text-ui-small text-ui-muted mt-1 whitespace-pre-line">{{ message }}</p>
        </div>
      </div>
    </template>
    <template v-if="$slots.default" #default><slot /></template>
    <template #footer>
      <UiButton v-if="mode === 'confirm'" variant="secondary" :disabled="loading" class="flex-1 sm:flex-none" @click="cancel">{{ cancelText }}</UiButton>
      <UiButton :variant="actionVariant" :loading="loading" class="flex-1 sm:flex-none" @click="emit('confirm')">{{ confirmText }}</UiButton>
    </template>
  </UiModal>
</template>
