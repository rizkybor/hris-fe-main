<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  meta: { type: String, default: "" },
  to: { type: [String, Object], default: null },
  linkText: { type: String, default: "" }, // defaults to "View all"
  flush: { type: Boolean, default: false }, // body without padding (lists)
  // No card around it: title and content straight on the page, for a widget
  // that is itself made of cards (Key Metrics) -- no card inside a card.
  frameless: { type: Boolean, default: false },
});
</script>

<template>
  <section class="h-full flex flex-col min-w-0" :class="frameless ? '' : 'bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden'">
    <header class="flex items-start gap-3" :class="frameless ? 'pb-0' : ['px-5 pt-[18px]', flush ? 'pb-3.5 border-b border-ui-line' : 'pb-0']">
      <div class="flex-1 min-w-0">
        <h3 class="text-ui-h2 text-ui-ink truncate">{{ title }}</h3>
        <p v-if="subtitle || $slots.subtitle" class="text-ui-cap text-ui-muted mt-0.5 truncate"><slot name="subtitle">{{ subtitle }}</slot></p>
      </div>
      <div class="flex items-center gap-2 shrink-0 pt-0.5">
        <slot name="actions" />
        <span v-if="meta" class="text-ui-cap text-ui-muted tabular-nums">{{ meta }}</span>
        <RouterLink v-if="to" :to="to" class="text-ui-small font-medium text-ui-accent hover:underline">{{ linkText || $t("common.actions.viewAll") }}</RouterLink>
      </div>
    </header>
    <div class="flex-1 min-h-0" :class="frameless ? 'pt-3' : flush ? '' : 'px-5 pb-5 pt-3.5'">
      <slot />
    </div>
  </section>
</template>
