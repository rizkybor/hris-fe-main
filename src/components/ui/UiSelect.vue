<script setup>
// Native select in the field style (keyboard and mobile pickers for free).
// options: [{ value, label, disabled? }] or plain strings.
import { computed, useId } from "vue";
import { ChevronDown } from "lucide-vue-next";

const model = defineModel({ type: [String, Number, Boolean, null], default: "" });
const props = defineProps({
  options: { type: Array, default: () => [] },
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  error: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  id: { type: String, default: "" },
});

const autoId = useId();
const fieldId = computed(() => props.id || `ui-select-${autoId}`);
const items = computed(() => props.options.map((o) => (typeof o === "object" && o !== null ? o : { value: o, label: String(o) })));
const empty = computed(() => model.value === "" || model.value === null || model.value === undefined);
</script>

<template>
  <div class="min-w-0">
    <label v-if="label" :for="fieldId" class="block text-ui-small font-medium text-ui-ink mb-1.5">
      {{ label }}<span v-if="required" class="text-ui-bad"> *</span>
    </label>
    <div class="relative">
      <select
        :id="fieldId"
        v-model="model"
        :required="required"
        :disabled="disabled"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error || hint ? `${fieldId}-help` : undefined"
        :class="[
          'w-full h-[38px] pl-3 pr-9 appearance-none bg-ui-surface text-ui-body border rounded-ui-control transition-shadow',
          'focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-muted',
          error ? 'border-ui-bad/50' : 'border-ui-line-strong',
          empty && placeholder ? 'text-ui-faint' : 'text-ui-ink',
        ]"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="o in items" :key="String(o.value)" :value="o.value" :disabled="o.disabled">{{ o.label }}</option>
      </select>
      <ChevronDown class="absolute right-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
    </div>
    <p v-if="error" :id="`${fieldId}-help`" class="text-ui-cap text-ui-bad mt-1.5">{{ error }}</p>
    <p v-else-if="hint" :id="`${fieldId}-help`" class="text-ui-cap text-ui-muted mt-1.5">{{ hint }}</p>
  </div>
</template>
