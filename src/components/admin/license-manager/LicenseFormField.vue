<script setup>
defineProps({
  field: { type: String, required: true },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  error: { type: String, default: "" },
  hint: { type: String, default: "" },
  icon: { type: [Object, Function], default: null },
  wide: { type: Boolean, default: false },
});
</script>

<template>
  <div :data-field="field" :class="{ 'md:col-span-2': wide }">
    <label :for="`license-${field}`" class="block text-ui-small font-medium text-ui-ink mb-1.5">
      {{ label }}
      <span v-if="required" class="text-ui-bad">*</span>
      <span v-else class="text-ui-faint font-normal">({{ $t("common.states.optional") }})</span>
    </label>
    <div class="relative">
      <div v-if="icon" class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <component :is="icon" class="w-4 h-4 text-ui-faint" />
      </div>
      <slot :id="`license-${field}`" :invalid="!!error" />
    </div>
    <p v-if="hint && !error" class="text-ui-cap text-ui-muted mt-1.5">{{ hint }}</p>
    <p v-if="error" class="text-ui-cap text-ui-bad mt-1.5">{{ error }}</p>
  </div>
</template>
