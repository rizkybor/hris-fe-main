<script setup>
import Skeleton from "./Skeleton.vue";

defineProps({
  rows: { type: Number, default: 5 },
  cols: { type: Number, default: 4 },
});
</script>

<template>
  <div class="overflow-x-auto rounded-[12px] border border-gray-200">
    <table class="min-w-full text-sm">
      <thead class="bg-gray-50">
        <tr>
          <th v-for="c in cols" :key="c" class="px-3 py-3">
            <Skeleton width="70%" height="12px" />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r" class="border-t border-gray-100">
          <td v-for="c in cols" :key="c" class="px-3 py-3">
            <Skeleton :width="c === 1 ? '40%' : '80%'" height="14px" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
