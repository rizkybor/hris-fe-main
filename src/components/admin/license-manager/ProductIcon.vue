<script setup>
// A product's app icon with rounded "app icon" corners. Falls back to the
// product's initials on a soft background when there is no icon (or it
// fails to load).
import { computed, ref, watch } from "vue";

const props = defineProps({
  product: { type: Object, default: null },
  size: { type: Number, default: 40 },
});

const failed = ref(false);
watch(
  () => props.product?.icon_url,
  () => (failed.value = false)
);

const initials = computed(() => {
  const name = String(props.product?.name || props.product?.code || "?").trim();
  const words = name.split(/[\s-]+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
});

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  minWidth: `${props.size}px`,
  maxWidth: "none",
  // iOS-like corner radius (about 22% of the size).
  borderRadius: `${Math.round(props.size * 0.225)}px`,
  fontSize: `${Math.max(9, Math.round(props.size * 0.38))}px`,
}));
</script>

<template>
  <img
    v-if="product?.icon_url && !failed"
    :src="product.icon_url"
    :alt="`${product.name} icon`"
    :style="style"
    class="object-cover shrink-0 bg-ui-surface ring-1 ring-ui-line"
    loading="lazy"
    @error="failed = true"
  />
  <span
    v-else
    :style="style"
    class="inline-flex items-center justify-center shrink-0 bg-ui-ink text-white font-semibold leading-none select-none"
    :aria-label="product?.name ? `${product.name} icon` : 'Product icon'"
    role="img"
  >
    {{ initials }}
  </span>
</template>
