<script setup lang="ts">
// Employee wizard: "check your data" notice when validation fails.
import UiConfirmDialog from "@/components/ui/UiConfirmDialog.vue";

interface Props {
  show: boolean;
}

defineProps<Props>();
const emit = defineEmits(["close"]);
</script>

<template>
  <UiConfirmDialog
    :open="show"
    mode="alert"
    type="danger"
    title="Oops! Something's Not Right"
    message="Please check your data again and make sure all required fields are filled correctly."
    confirm-text="OK, I'll Fix It"
    @confirm="emit('close')"
    @cancel="emit('close')"
  />
</template>
