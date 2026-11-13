<script setup>
// Empty / error state: soft icon, title, one line of help, optional action.
// The icon eases in (a soft pop) and the text follows when it appears.
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  message: { type: String, default: "" },
  compact: { type: Boolean, default: false },
});
</script>

<template>
  <div class="flex flex-col items-center text-center" :class="compact ? 'py-6 px-4' : 'py-12 px-6'">
    <div v-if="icon" class="ui-empty-icon w-10 h-10 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center mb-3">
      <component :is="icon" class="w-5 h-5" />
    </div>
    <p class="ui-empty-text text-ui-body font-medium text-ui-ink">{{ title }}</p>
    <p v-if="message" class="ui-empty-text text-ui-small text-ui-muted mt-1 max-w-sm">{{ message }}</p>
    <div v-if="$slots.default" class="mt-4"><slot /></div>
  </div>
</template>
