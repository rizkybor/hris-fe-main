<script setup>
// One labelled form field: label (with * when required), an optional
// leading icon, the input in the default slot, a hint and the error.
// data-field lets the form scroll to the first field with an error.
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
    <label :for="`license-${field}`" class="block text-brand-dark text-sm font-semibold mb-1.5">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
      <span v-else class="text-brand-light font-normal">(Optional)</span>
    </label>
    <div class="relative">
      <div v-if="icon" class="absolute top-3.5 left-4 flex items-center pointer-events-none">
        <component :is="icon" class="w-5 h-5 text-gray-400" />
      </div>
      <slot :id="`license-${field}`" :invalid="!!error" />
    </div>
    <p v-if="hint && !error" class="text-xs text-brand-light mt-1.5">{{ hint }}</p>
    <p v-if="error" class="text-xs text-red-600 mt-1.5">{{ error }}</p>
  </div>
</template>
