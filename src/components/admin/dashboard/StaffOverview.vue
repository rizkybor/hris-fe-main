<script setup>
import { computed } from "vue";
import { can } from "@/helpers/permissionHelper";
import EmployeeStatistics from "./EmployeeStatistics.vue";
import SearchSection from "./SearchSection.vue";

const hasDashboardPermission = computed(() => can("dashboard-view"));
</script>

<template>
  <div class="space-y-6">
    <EmployeeStatistics />
    <SearchSection v-if="hasDashboardPermission" />
  </div>
</template>
