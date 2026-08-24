<template>
  <div>
    <label
      :for="id"
      class="block mb-2 text-gray-700 font-semibold font-jakarta text-[14px]"
      v-if="label"
    >
      {{ label }}<span v-if="required" class="text-red-600 ml-1">*</span>
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
        :type="inputType"
        :placeholder="placeholder"
        :required="required"
        :min="min"
        :step="step"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :value="modelValue"
        :class="[
          'w-full border rounded-[12px] transition-all duration-300',
          'hover:border-[#0C51D9] hover:border-2',
          'focus:border-[#0C51D9] focus:border-2 focus:bg-white',
          borderColor,
        ]"
        :style="inputStyle"
        @input="onInput"
      />

      <button
        v-if="isPassword"
        type="button"
        tabindex="-1"
        @click="showPassword = !showPassword"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
      >
        <EyeOff v-if="showPassword" class="h-5 w-5" />
        <Eye v-else class="h-5 w-5" />
      </button>
    </div>

    <p v-if="error" class="mt-2" :style="errorStyle">
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { Eye, EyeOff } from "lucide-vue-next";

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
  readonly: { type: Boolean, default: false },
  onlyNumber: { type: Boolean, default: false },
  autocomplete: { type: String, default: undefined },
});
const emit = defineEmits(["update:modelValue"]);

const modelValue = computed({
  get: () => props.modelValue || "",
  set: (value) => emit("update:modelValue", value),
});

const borderColor = computed(() =>
  props.error ? "border-[#DC2626] border-2" : "border-[#DCDEDD]"
);

const isPassword = computed(() => props.type === "password");
const showPassword = ref(false);
const inputType = computed(() => (isPassword.value && showPassword.value ? "text" : props.type));

// A plain `padding` shorthand here would set padding-right too, and an
// inline style always beats the pr-4/pr-11 Tailwind classes on the input
// (inline wins regardless of the class's own specificity) -- so the
// password toggle button would end up unclickable, sitting under a
// paddingless slice of the input. Set every side explicitly instead so
// paddingRight can vary with isPassword.
const inputStyle = computed(() => ({
  display: "flex",
  paddingTop: "12px",
  paddingBottom: "12px",
  paddingLeft: "40px",
  paddingRight: isPassword.value ? "44px" : "12px",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: "10px",
  background: "#ffffff",
}));

const onInput = (event) => {
  let value = event.target.value;

  if (props.onlyNumber) {
    value = value.replace(/[^0-9]/g, "");
    event.target.value = value;
  }

  emit("update:modelValue", value);
};



const errorStyle = {
  color: "#dc2626",
  fontFamily: "Plus Jakarta Sans",
  fontSize: "14px",
  fontWeight: 400,
};
</script>
