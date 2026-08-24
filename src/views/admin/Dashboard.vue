<script setup lang="ts">
import DashboardWelcome from "@/components/admin/dashboard/DashboardWelcome.vue";
import DashboardWidgetGrid from "@/components/admin/dashboard/DashboardWidgetGrid.vue";
</script>

<template>
  <div class="px-4 py-4 space-y-6">
    <DashboardWelcome />

    <!-- Which widgets appear and in what order is now driven entirely by
         the backend (permission-gated per role, position customizable
         per-user via drag-and-drop) -- no more per-role branching here. -->
    <DashboardWidgetGrid />
  </div>
</template>
