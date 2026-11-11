<script setup>
// Confirm dialog driven by props (show / loading) with confirm and cancel
// events -- same API as before, redesign look via UiConfirmDialog.
import UiConfirmDialog from "@/components/ui/UiConfirmDialog.vue";

defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: "Confirm Action" },
  message: { type: String, default: "Are you sure you want to proceed?" },
  confirmText: { type: String, default: "Confirm" },
  cancelText: { type: String, default: "Cancel" },
  loading: { type: Boolean, default: false },
  type: { type: String, default: "danger" }, // danger, warning, info
});

const emit = defineEmits(["confirm", "cancel"]);
</script>

<template>
  <UiConfirmDialog
    :open="show"
    :title="title"
    :message="message"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :loading="loading"
    :type="type"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  />
</template>
