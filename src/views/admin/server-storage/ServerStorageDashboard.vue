<script setup>
import VpsMonitor from "@/components/admin/server-storage/VpsMonitor.vue";
import { UiPageHeader } from "@/components/ui";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('servers.title')" :subtitle="$t('servers.subtitle')" />

    <VpsMonitor />
  </div>
</template>
