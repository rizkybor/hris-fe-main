<script setup>
// Surface card: white, thin border, 12px radius. An optional header row
// (title, subtitle, actions slot) sits above the content.
defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  padded: { type: Boolean, default: true },
});
</script>

<template>
  <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
    <header v-if="title || $slots.header || $slots.actions" class="flex items-start gap-3 px-5 pt-[18px] sm:px-6" :class="padded ? 'pb-0' : 'pb-3.5'">
      <slot name="header">
        <div class="flex-1 min-w-0">
          <h3 class="text-ui-h2 text-ui-ink">{{ title }}</h3>
          <p v-if="subtitle" class="text-ui-cap text-ui-muted mt-0.5">{{ subtitle }}</p>
        </div>
      </slot>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0"><slot name="actions" /></div>
    </header>
    <div :class="padded ? 'p-5 sm:p-6' : ''" :style="padded && (title || $slots.header) ? 'padding-top:14px' : ''">
      <slot />
    </div>
  </section>
</template>
