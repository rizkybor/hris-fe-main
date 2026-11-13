<script setup>
import { RouterView } from "vue-router";
import AlertConfirmModal from "@/components/common/AlertConfirmModal.vue";
import UiToastHost from "@/components/ui/UiToastHost.vue";
import UiRouteProgress from "@/components/ui/UiRouteProgress.vue";
import PwaStatus from "@/components/common/PwaStatus.vue";
</script>

<template>
  <UiRouteProgress />
  <RouterView />
  <AlertConfirmModal />
  <UiToastHost />
  <PwaStatus />
</template>
