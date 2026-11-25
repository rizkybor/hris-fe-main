<script setup>
// The OPUS app icon: the JCD butterfly inside a blue ring on a white
// squircle (public/images/opus-icon.svg is the source; the PNG is used here).
defineProps({
  // Accessible name; empty = decorative.
  label: { type: String, default: "" },
});
</script>

<template>
  <img src="/images/opus-icon.png" :alt="label" :aria-hidden="label ? undefined : 'true'" class="object-contain select-none" draggable="false" />
</template>
