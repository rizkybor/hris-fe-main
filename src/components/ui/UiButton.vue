<script setup>
// Redesign button. Variants: primary (ink), secondary (outlined), ghost,
// danger. Renders a RouterLink when `to` is set, an <a> for `href`,
// otherwise a <button>.
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Loader2 } from "lucide-vue-next";

const props = defineProps({
  variant: { type: String, default: "primary" }, // primary | secondary | ghost | danger
  size: { type: String, default: "md" }, // sm | md | lg
  type: { type: String, default: "button" },
  icon: { type: [Object, Function], default: null },
  iconRight: { type: [Object, Function], default: null },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  href: { type: String, default: null },
});

const VARIANTS = {
  primary: "bg-ui-ink text-white border-transparent hover:bg-ui-ink/90",
  secondary: "bg-ui-surface text-ui-ink border-ui-line-strong hover:bg-ui-subtle",
  ghost: "bg-transparent text-ui-text border-transparent hover:bg-ui-hover",
  danger: "bg-ui-surface text-ui-bad border-ui-bad/30 hover:bg-ui-bad-soft",
};
const SIZES = {
  sm: "h-[30px] px-2.5 text-ui-cap gap-1.5 rounded-[7px]",
  md: "h-9 px-3.5 text-ui-small gap-2 rounded-ui-control",
  lg: "h-11 px-[18px] text-ui-body gap-2 rounded-[10px]",
};
const ICON = { sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-[18px] h-[18px]" };

const tag = computed(() => (props.to ? RouterLink : props.href ? "a" : "button"));
const inactive = computed(() => props.disabled || props.loading);
const classes = computed(() => [
  "ui-press inline-flex items-center justify-center font-medium whitespace-nowrap border",
  "focus:outline-none focus-visible:shadow-ui-focus",
  VARIANTS[props.variant] || VARIANTS.primary,
  SIZES[props.size] || SIZES.md,
  props.block ? "w-full" : "",
  inactive.value ? "opacity-50 pointer-events-none" : "",
]);
</script>

<template>
  <component
    :is="tag"
    :to="to || undefined"
    :href="href || undefined"
    :type="tag === 'button' ? type : undefined"
    :disabled="tag === 'button' ? inactive : undefined"
    :aria-disabled="inactive || undefined"
    :aria-busy="loading || undefined"
    :class="classes"
  >
    <Loader2 v-if="loading" :class="[ICON[size], 'animate-spin']" />
    <component :is="icon" v-else-if="icon" :class="ICON[size]" />
    <slot />
    <component :is="iconRight" v-if="iconRight && !loading" :class="ICON[size]" />
  </component>
</template>
