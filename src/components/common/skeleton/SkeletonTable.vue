<script setup>
// Table placeholder in the redesign's table shape (a "#" column first).
import Skeleton from "./Skeleton.vue";

defineProps({
  rows: { type: Number, default: 5 },
  cols: { type: Number, default: 4 },
});
const widths = ["55%", "80%", "65%", "45%", "70%", "50%"];
</script>

<template>
  <div class="overflow-x-auto rounded-ui-card border border-ui-line bg-ui-surface" role="status" aria-label="Loading">
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-ui-line">
          <th class="w-11 pl-4 pr-0 h-10"><Skeleton width="10px" height="10px" rounded="3px" /></th>
          <th v-for="c in cols" :key="c" class="px-4 h-10 text-left"><Skeleton width="56px" height="10px" /></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r" class="border-b border-ui-line last:border-b-0">
          <td class="pl-4 pr-0 h-14"><Skeleton width="12px" height="10px" rounded="3px" /></td>
          <td v-for="c in cols" :key="c" class="px-4 h-14">
            <Skeleton :width="widths[(r + c) % widths.length]" height="12px" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
