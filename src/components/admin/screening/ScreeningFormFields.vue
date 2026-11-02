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
  <div class="space-y-4">
    <section v-for="(section, si) in sections" :key="section.key" class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5">
      <div class="mb-3">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-[#0C51D9]">Section {{ si + 1 }}</p>
        <h3 class="text-brand-dark text-base font-bold">{{ section.title }}</h3>
        <p v-if="section.description" class="text-brand-light text-xs mt-0.5">{{ section.description }}</p>
      </div>

      <div class="space-y-4">
        <div v-for="q in section.questions" :key="q.key">
          <label class="block text-sm font-semibold text-brand-dark mb-1.5">
            {{ q.label }}<span v-if="q.required" class="text-red-500"> *</span>
          </label>

          <div v-if="q.type === 'multi'" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              v-for="o in q.options"
              :key="o.value"
              class="flex items-start gap-2 border rounded-[10px] px-3 py-2 cursor-pointer text-sm transition-colors"
              :class="(answers[q.key] || []).includes(o.value) ? 'border-[#0C51D9] bg-blue-50/60' : 'border-[#DCDEDD] hover:border-[#0C51D9]'"
            >
              <input type="checkbox" class="mt-0.5 accent-[#0C51D9]" :checked="(answers[q.key] || []).includes(o.value)" @change="toggle(q.key, o.value)" />
              <span>{{ o.label }}</span>
            </label>
          </div>

          <div v-else-if="q.type === 'single' || q.type === 'boolean'" class="flex flex-wrap gap-2">
            <button
              v-for="o in q.options"
              :key="o.value"
              type="button"
              class="border rounded-[10px] px-3 py-1.5 text-sm transition-colors"
              :class="answers[q.key] === o.value ? 'border-[#0C51D9] bg-blue-50 text-[#0C51D9] font-semibold' : 'border-[#DCDEDD] text-brand-dark hover:border-[#0C51D9]'"
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
            class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]"
            @input="set(q.key, $event.target.value)"
          ></textarea>
          <input
            v-else
            :value="answers[q.key] ?? ''"
            :type="q.type === 'number' ? 'number' : 'text'"
            maxlength="255"
            class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]"
            @input="set(q.key, q.type === 'number' && $event.target.value !== '' ? Number($event.target.value) : $event.target.value)"
          />

          <p v-if="error(q.key)" class="text-xs text-red-500 mt-1">{{ error(q.key) }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
