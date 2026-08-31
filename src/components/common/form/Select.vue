<template>
  <div>
    <label :for="id" class="block mb-2" :style="labelStyle">
      {{ label }}<span v-if="required" class="text-red-600 ml-1">*</span>
    </label>

    <div class="relative">
      <!-- slot icon -->
      <div
        v-if="$slots.icon"
        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10"
      >
        <slot name="icon" />
      </div>

      <select
        :id="id"
        :name="name"
        v-model="modelValue"
        :required="required"
        :disabled="readonly"
        class="select-soft"
        :class="{ 'select-soft-icon-pl': $slots.icon }"
        :style="selectStyle"
        @change="modelValue = $event.target.value"
      >
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <ChevronDown
        class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
      />
    </div>

    <p v-if="error" class="mt-2" :style="errorStyle">
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { ChevronDown } from "lucide-vue-next";

const props = defineProps({
  id: { type: String, required: true },
  name: { type: String, default: "" },
  label: { type: String, required: true },
  placeholder: { type: String, default: "" },
  required: { type: Boolean, default: false },
  modelValue: { type: [String, Number], default: "" },
  options: {
    type: Array,
    default: () => [],
  },
  readonly: { type: Boolean, default: false },
  error: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const modelValue = computed({
  get: () => props.modelValue || "",
  set: (value) => emit("update:modelValue", value),
});

const labelStyle = {
  color: "#4b5563",
  fontFamily: "Plus Jakarta Sans",
  fontSize: "14px",
  fontWeight: 600,
};
// Inline (not a Tailwind class) since it needs to win over .select-soft's
// own border-color at equal specificity -- an error state must always be
// visible regardless of stylesheet source order.
const selectStyle = computed(() => (props.error ? { borderColor: "#DC2626" } : {}));
const errorStyle = {
  color: "#dc2626",
  fontFamily: "Plus Jakarta Sans",
  fontSize: "14px",
  fontWeight: 400,
};
</script>
