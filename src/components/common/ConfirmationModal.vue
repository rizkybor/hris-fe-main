<script setup>
// Confirm dialog driven by props (show / loading) with confirm and cancel
// events -- same API as before, redesign look via UiConfirmDialog.
import UiConfirmDialog from "@/components/ui/UiConfirmDialog.vue";

defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: "" },
  message: { type: String, default: "" },
  confirmText: { type: String, default: "" },
  cancelText: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  type: { type: String, default: "danger" }, // danger, warning, info
});

const emit = defineEmits(["confirm", "cancel"]);
</script>

<template>
  <UiConfirmDialog
    :open="show"
    :title="title"
    :message="message || $t('common.confirm.message')"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :loading="loading"
    :type="type"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  />
</template>
