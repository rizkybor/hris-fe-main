<script setup>
// Shared chrome for dashboard widgets: title, optional subtitle and meta
// on the right ("4 open"), a "View all" link and an actions slot. Fills the
// grid cell height so widgets in one row line up.
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  meta: { type: String, default: "" },
  to: { type: [String, Object], default: null },
  linkText: { type: String, default: "View all" },
  flush: { type: Boolean, default: false }, // body without padding (lists)
});
</script>

<template>
  <section class="h-full flex flex-col bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
    <header class="flex items-start gap-3 px-5 pt-[18px]" :class="flush ? 'pb-3.5 border-b border-ui-line' : 'pb-0'">
      <div class="flex-1 min-w-0">
        <h3 class="text-ui-h2 text-ui-ink truncate">{{ title }}</h3>
        <p v-if="subtitle || $slots.subtitle" class="text-ui-cap text-ui-muted mt-0.5 truncate"><slot name="subtitle">{{ subtitle }}</slot></p>
      </div>
      <div class="flex items-center gap-2 shrink-0 pt-0.5">
        <slot name="actions" />
        <span v-if="meta" class="text-ui-cap text-ui-muted tabular-nums">{{ meta }}</span>
        <RouterLink v-if="to" :to="to" class="text-ui-small font-medium text-ui-accent hover:underline">{{ linkText }}</RouterLink>
      </div>
    </header>
    <div class="flex-1 min-h-0" :class="flush ? '' : 'px-5 pb-5 pt-3.5'">
      <slot />
    </div>
  </section>
</template>
