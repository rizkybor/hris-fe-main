<script setup>
import { User } from "lucide-vue-next";

defineProps({
  src: { type: String, default: null },
  alt: { type: String, default: "" },
  size: { type: String, default: "w-12 h-12" },
  iconSize: { type: String, default: "w-5 h-5" },
  rounded: { type: String, default: "rounded-full" },
});
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="alt"
    :title="alt"
    :class="[size, rounded, 'object-cover shrink-0']"
  />
  <div
    v-else
    :title="alt"
    :class="[size, rounded, 'bg-gray-100 flex items-center justify-center shrink-0']"
  >
    <User :class="[iconSize, 'text-gray-400']" />
  </div>
</template>
