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
    :aria-label="label || (modelValue ? 'Active' : 'Inactive')"
    :disabled="disabled"
    @click.stop="toggle"
    class="inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span
      class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200"
      :class="modelValue ? 'bg-emerald-500' : 'bg-gray-300'"
    >
      <span
        class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
        :class="modelValue ? 'translate-x-4' : 'translate-x-0'"
      ></span>
    </span>
    <span
      v-if="label !== null"
      class="text-xs font-semibold"
      :class="modelValue ? 'text-emerald-700' : 'text-gray-500'"
    >
      {{ label || (modelValue ? "Active" : "Inactive") }}
    </span>
  </button>
</template>
