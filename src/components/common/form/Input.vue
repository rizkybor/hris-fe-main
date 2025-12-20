<template>
  <div>
    <label
      :for="id"
      class="block mb-2 text-gray-700 font-semibold font-jakarta text-[14px]"
      v-if="label"
    >
      {{ label }}
    </label>

    <div class="relative">
      <!-- slot icon -->
      <div
        v-if="$slots.icon"
        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
      >
        <slot name="icon" />
      </div>

      <input
        :id="id"
        :name="name"
        :type="type"
        v-model="modelValue"
        :placeholder="placeholder"
        :required="required"
        :min="min"
        :step="step"
        :class="[
          'w-full pl-10 pr-4 border rounded-[16px] transition-all duration-300',
          'hover:border-[#0C51D9] hover:border-2',
          'focus:border-[#0C51D9] focus:border-2 focus:bg-white',
          borderColor,
        ]"
        :style="inputStyle"
        @input="modelValue = $event.target.value"
      />
    </div>

    <p v-if="error" class="mt-2" :style="errorStyle">
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  id: { type: String, required: true },
  name: { type: String, default: "" },
  label: { type: String, required: true },
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
  required: { type: Boolean, default: false },
  modelValue: { type: [String, Number], default: "" },
  error: { type: String, default: "" },
  min: { type: [String, Number], default: undefined },
  step: { type: [String, Number], default: undefined },
});
const emit = defineEmits(["update:modelValue"]);

const modelValue = computed({
  get: () => props.modelValue || "",
  set: (value) => emit("update:modelValue", value),
});

const borderColor = computed(() =>
  props.error ? "border-[#DC2626] border-2" : "border-[#DCDEDD]"
);

const inputStyle = {
  display: "flex",
  padding: "12px",
  paddingLeft: "40px",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: "10px",
  background: "#ffffff",
};

const errorStyle = {
  color: "#dc2626",
  fontFamily: "Plus Jakarta Sans",
  fontSize: "14px",
  fontWeight: 400,
};
</script>
