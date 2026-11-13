<script setup lang="ts">
import DashboardWelcome from "@/components/admin/dashboard/DashboardWelcome.vue";
import DashboardWidgetGrid from "@/components/admin/dashboard/DashboardWidgetGrid.vue";
import SptTahunanAlert from "@/components/admin/dashboard/SptTahunanAlert.vue";
</script>

<template>
  <div class="px-1 sm:px-3 lg:px-5 py-3 sm:py-5 space-y-4">
    <SptTahunanAlert />

    <DashboardWelcome />

    <DashboardWidgetGrid />
  </div>
</template>
