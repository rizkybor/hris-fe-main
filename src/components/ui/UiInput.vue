<script setup>
// Text field with label, hint and error. `rows` turns it into a textarea.
// An optional leading icon; `mono` for keys and codes.
import { computed, ref, useId } from "vue";
import { Eye, EyeOff } from "lucide-vue-next";

const model = defineModel({ type: [String, Number], default: "" });
const props = defineProps({
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  error: { type: String, default: "" },
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  icon: { type: [Object, Function], default: null },
  rows: { type: Number, default: 0 },
  mono: { type: Boolean, default: false },
  id: { type: String, default: "" },
  autocomplete: { type: String, default: undefined },
  name: { type: String, default: undefined },
});

// Password fields get a show / hide toggle.
const isPassword = computed(() => props.type === "password");
const revealed = ref(false);
const inputType = computed(() => (isPassword.value && revealed.value ? "text" : props.type));

const autoId = useId();
const fieldId = computed(() => props.id || `ui-input-${autoId}`);
const describedBy = computed(() => (props.error || props.hint ? `${fieldId.value}-help` : undefined));
const controlClass = computed(() => [
  "w-full bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border rounded-ui-control transition-shadow",
  "focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-muted",
  props.error ? "border-ui-bad/50" : "border-ui-line-strong",
  props.rows ? "px-3 py-2.5 resize-y" : "h-[38px] px-3",
  props.icon ? "pl-9" : "",
  isPassword.value ? "pr-10" : "",
  props.mono ? "font-mono text-ui-small" : "",
]);
</script>

<template>
  <div class="min-w-0">
    <label v-if="label" :for="fieldId" class="block text-ui-small font-medium text-ui-ink mb-1.5">
      {{ label }}<span v-if="required" class="text-ui-bad"> *</span>
    </label>
    <div class="relative">
      <component :is="icon" v-if="icon" class="absolute left-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
      <textarea
        v-if="rows"
        :id="fieldId"
        v-model="model"
        :rows="rows"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedBy"
        :class="controlClass"
      ></textarea>
      <input
        v-else
        :id="fieldId"
        v-model="model"
        :type="inputType"
        :name="name"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedBy"
        :class="controlClass"
      />
      <button
        v-if="isPassword && !rows"
        type="button"
        class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-[6px] text-ui-faint hover:text-ui-ink"
        :aria-label="revealed ? $t('common.a11y.hidePassword') : $t('common.a11y.showPassword')"
        :aria-pressed="revealed"
        @click="revealed = !revealed"
      >
        <EyeOff v-if="revealed" class="w-4 h-4" /><Eye v-else class="w-4 h-4" />
      </button>
    </div>
    <p v-if="error" :id="`${fieldId}-help`" class="text-ui-cap text-ui-bad mt-1.5">{{ error }}</p>
    <p v-else-if="hint" :id="`${fieldId}-help`" class="text-ui-cap text-ui-muted mt-1.5">{{ hint }}</p>
  </div>
</template>
