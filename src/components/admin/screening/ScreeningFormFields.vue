<script setup>
import { computed } from "vue";
import { isVisible } from "@/utils/screening";

// The questionnaire for filling a screening in from HRIS. Sections and
// questions appear/disappear with the answers, like on the website.
const props = defineProps({
  form: { type: Object, required: true }, // { sections: [...] } as returned by the API
  modelValue: { type: Object, default: () => ({}) },
  errors: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["update:modelValue"]);

const answers = computed(() => props.modelValue || {});
const sections = computed(() =>
  (props.form?.sections || [])
    .filter((s) => isVisible(s.show_if, answers.value))
    .map((s) => ({ ...s, questions: s.questions.filter((q) => isVisible(q.show_if, answers.value)) }))
);

const set = (key, value) => {
  const next = { ...answers.value };
  if (value === "" || value === null || (Array.isArray(value) && !value.length)) delete next[key];
  else next[key] = value;
  emit("update:modelValue", next);
};
const toggle = (key, value) => {
  const current = Array.isArray(answers.value[key]) ? answers.value[key] : [];
  set(key, current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
};
const error = (key) => props.errors?.[`answers.${key}`]?.[0];
</script>

<template>
  <div class="space-y-5">
    <section v-for="(section, si) in sections" :key="section.key" class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
      <header class="px-5 sm:px-6 py-4 border-b border-ui-line">
        <p class="text-ui-over uppercase text-ui-muted">Section {{ si + 1 }}</p>
        <h3 class="text-ui-h2 text-ui-ink">{{ section.title }}</h3>
        <p v-if="section.description" class="text-ui-cap text-ui-muted mt-0.5">{{ section.description }}</p>
      </header>

      <div class="p-5 sm:p-6 space-y-5">
        <div v-for="q in section.questions" :key="q.key">
          <label class="block text-ui-small font-medium text-ui-ink mb-2">
            {{ q.label }}<span v-if="q.required" class="text-ui-bad"> *</span>
          </label>

          <div v-if="q.type === 'multi'" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              v-for="o in q.options"
              :key="o.value"
              class="ui-press flex items-start gap-2.5 border rounded-ui-control px-3 py-2.5 cursor-pointer text-ui-small transition-colors has-[:focus-visible]:shadow-ui-focus"
              :class="(answers[q.key] || []).includes(o.value) ? 'border-ui-ink bg-ui-subtle text-ui-ink' : 'border-ui-line text-ui-text hover:bg-ui-hover'"
            >
              <input type="checkbox" class="mt-0.5 accent-ui-ink" :checked="(answers[q.key] || []).includes(o.value)" @change="toggle(q.key, o.value)" />
              <span>{{ o.label }}</span>
            </label>
          </div>

          <div v-else-if="q.type === 'single' || q.type === 'boolean'" class="flex flex-wrap gap-2">
            <button
              v-for="o in q.options"
              :key="o.value"
              type="button"
              :aria-pressed="answers[q.key] === o.value"
              class="ui-press h-8 px-3 rounded-full border text-ui-small font-medium transition-colors focus:outline-none focus-visible:shadow-ui-focus"
              :class="answers[q.key] === o.value ? 'bg-ui-ink text-white border-ui-ink' : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover'"
              @click="set(q.key, answers[q.key] === o.value ? null : o.value)"
            >
              {{ o.label }}
            </button>
          </div>

          <textarea
            v-else-if="q.type === 'textarea'"
            :value="answers[q.key] || ''"
            rows="3"
            maxlength="3000"
            class="w-full px-3 py-2.5 bg-ui-surface text-ui-body text-ui-ink border rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            :class="error(q.key) ? 'border-ui-bad/50' : 'border-ui-line-strong'"
            @input="set(q.key, $event.target.value)"
          ></textarea>
          <input
            v-else
            :value="answers[q.key] ?? ''"
            :type="q.type === 'number' ? 'number' : 'text'"
            maxlength="255"
            class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            :class="[error(q.key) ? 'border-ui-bad/50' : 'border-ui-line-strong', q.type === 'number' ? 'tabular-nums' : '']"
            @input="set(q.key, q.type === 'number' && $event.target.value !== '' ? Number($event.target.value) : $event.target.value)"
          />

          <p v-if="error(q.key)" class="text-ui-cap text-ui-bad mt-1.5">{{ error(q.key) }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
