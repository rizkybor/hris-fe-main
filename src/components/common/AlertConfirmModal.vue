<script setup>
// Global alert()/confirm() replacement (see stores/alertModal.js), mounted
// once in App.vue. Same store API as before; rendered with the redesign's
// confirm dialog (centred on desktop, bottom sheet on phones).
import { storeToRefs } from "pinia";
import UiConfirmDialog from "@/components/ui/UiConfirmDialog.vue";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useAlertModalStore();
const { visible, mode, title, message, confirmText, cancelText, type, celebrate } = storeToRefs(store);
</script>

<template>
  <UiConfirmDialog
    :open="visible"
    :mode="mode"
    :type="type"
    :celebrate="celebrate"
    :title="title"
    :message="message"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :z-index="999"
    @confirm="store.handleConfirm()"
    @cancel="store.handleCancel()"
  />
</template>
