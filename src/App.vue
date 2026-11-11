<script setup>
import { RouterView } from "vue-router";
import AlertConfirmModal from "@/components/common/AlertConfirmModal.vue";
import UiToastHost from "@/components/ui/UiToastHost.vue";
</script>

<template>
  <RouterView />
  <AlertConfirmModal />
  <UiToastHost />
</template>
