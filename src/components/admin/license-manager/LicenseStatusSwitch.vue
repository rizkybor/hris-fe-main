<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const toggle = () => {
  if (!props.disabled) emit("update:modelValue", !props.modelValue);
};
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label || (modelValue ? $t('common.labels.active') : $t('common.labels.inactive'))"
    :disabled="disabled"
    @click.stop="toggle"
    class="inline-flex items-center gap-2 disabled:opacity-50"
  >
    <span class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-ui-base" :class="modelValue ? 'bg-ui-ink' : 'bg-ui-line-strong'">
      <span class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-ui-raised transition-transform duration-ui-base ease-ui-out" :class="modelValue ? 'translate-x-4' : 'translate-x-0'"></span>
    </span>
    <span v-if="label !== null" class="text-ui-cap font-medium" :class="modelValue ? 'text-ui-ok' : 'text-ui-muted'">
      {{ label || (modelValue ? $t("common.labels.active") : $t("common.labels.inactive")) }}
    </span>
  </button>
</template>
