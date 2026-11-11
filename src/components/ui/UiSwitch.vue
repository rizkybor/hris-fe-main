<script setup>
// On/off switch (role="switch"). With `label` / `description` it renders
// as a full row: text on the left, switch on the right.
import { useId } from "vue";

const model = defineModel({ type: Boolean, default: false });
defineProps({
  label: { type: String, default: "" },
  description: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});
const id = `ui-switch-${useId()}`;
</script>

<template>
  <div :class="label ? 'flex items-center gap-3' : 'inline-flex'">
    <div v-if="label" class="flex-1 min-w-0">
      <label :for="id" class="block text-ui-body font-medium text-ui-ink cursor-pointer">{{ label }}</label>
      <p v-if="description" class="text-ui-cap text-ui-muted">{{ description }}</p>
    </div>
    <button
      :id="id"
      type="button"
      role="switch"
      :aria-checked="model"
      :disabled="disabled"
      @click="model = !model"
      :class="[
        'relative inline-flex shrink-0 w-8 h-[18px] rounded-full transition-colors duration-150 focus:outline-none focus-visible:shadow-ui-focus disabled:opacity-50',
        model ? 'bg-ui-ink' : 'bg-ui-line-strong',
      ]"
    >
      <span
        :class="['absolute top-0.5 w-[14px] h-[14px] rounded-full bg-white shadow-ui-raised transition-[left] duration-150', model ? 'left-4' : 'left-0.5']"
        aria-hidden="true"
      ></span>
    </button>
  </div>
</template>
