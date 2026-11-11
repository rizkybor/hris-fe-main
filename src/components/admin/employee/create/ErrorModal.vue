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
    :title="$t('employees.errorModal.title')"
    :message="$t('employees.errorModal.message')"
    :confirm-text="$t('employees.errorModal.confirm')"
    @confirm="emit('close')"
    @cancel="emit('close')"
  />
</template>
