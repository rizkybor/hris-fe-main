<script setup>
// Page title block: H1, one-line description, actions on the right.
// On phones the actions wrap under the title.
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
});
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
    <div class="flex-1 min-w-0">
      <slot name="eyebrow" />
      <h1 class="text-ui-h1 text-ui-ink truncate" :title="title">{{ title }}</h1>
      <p v-if="subtitle || $slots.subtitle" class="text-ui-small text-ui-muted mt-1"><slot name="subtitle">{{ subtitle }}</slot></p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2 shrink-0"><slot name="actions" /></div>
  </div>
</template>
