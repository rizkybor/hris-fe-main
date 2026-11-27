<script setup>
// Who signs a document: name only, or a scanned signature (with the
// company stamp) of someone on file. Edits the given form's
// signatory_name / signatory_title / use_signature in place.
import { computed } from "vue";
import { CheckCircle2 } from "lucide-vue-next";
import { UiInput } from "@/components/ui";
import { bareName } from "@/utils/personName";

const form = defineModel({ type: Object, required: true });
const props = defineProps({
  // [{ key, name, title, preview }]
  signatories: { type: Array, default: () => [] },
  label: { type: String, default: "" },
  idPrefix: { type: String, default: "signatory" },
});

const sameName = (a, b) => !!a && !!b && bareName(a).toLowerCase() === bareName(b).toLowerCase();
const selectedKey = computed(() => props.signatories.find((person) => sameName(person.name, form.value.signatory_name))?.key || "");

// Take the person's job title; without one, keep a typed title but not
// the one that came with the previously picked person.
const pick = (person) => {
  const previous = props.signatories.find((p) => sameName(p.name, form.value.signatory_name));
  form.value.signatory_name = person.name;
  if (person.title) form.value.signatory_title = person.title;
  else if (previous && form.value.signatory_title === previous.title) form.value.signatory_title = "";
};
const setSigned = (signed) => {
  form.value.use_signature = signed;
  if (signed && !selectedKey.value && props.signatories.length) pick(props.signatories[0]);
};
</script>

<template>
  <div class="space-y-3">
    <div>
      <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ label || $t("projects.export.signature.label") }}</p>
      <div class="grid grid-cols-2 gap-2" role="radiogroup">
        <button
          v-for="opt in [false, true]"
          :key="String(opt)"
          type="button"
          role="radio"
          :aria-checked="form.use_signature === opt"
          :disabled="opt && !signatories.length"
          class="ui-press rounded-ui-control border px-3 py-2.5 text-ui-small font-medium text-center disabled:opacity-50 disabled:cursor-not-allowed"
          :class="form.use_signature === opt ? 'border-ui-accent bg-ui-accent-soft text-ui-accent' : 'border-ui-line text-ui-text hover:bg-ui-subtle'"
          @click="setSigned(opt)"
        >
          {{ opt ? $t("projects.export.signature.with") : $t("projects.export.signature.without") }}
        </button>
      </div>
    </div>

    <div v-if="form.use_signature">
      <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.export.signature.who") }} <span class="text-ui-bad">*</span></p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="radiogroup">
        <label
          v-for="person in signatories"
          :key="person.key"
          class="ui-press cursor-pointer rounded-ui-control border overflow-hidden transition-colors"
          :class="selectedKey === person.key ? 'border-ui-accent shadow-ui-focus' : 'border-ui-line hover:border-ui-line-strong'"
        >
          <input type="radio" class="sr-only" :name="`${idPrefix}-person`" :checked="selectedKey === person.key" @change="pick(person)" />
          <div class="h-20 bg-white border-b border-ui-line flex items-center justify-center p-1.5">
            <img :src="person.preview" alt="" class="max-h-full max-w-full object-contain" />
          </div>
          <div class="px-3 py-2 bg-ui-subtle flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-ui-small font-medium text-ui-ink truncate">{{ person.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate">{{ person.title || "—" }}</p>
            </div>
            <CheckCircle2 v-if="selectedKey === person.key" class="w-4 h-4 text-ui-accent shrink-0 mt-0.5" />
          </div>
        </label>
      </div>
      <p class="text-ui-cap text-ui-muted mt-1.5">{{ $t("projects.export.signature.stampHint") }}</p>
      <UiInput v-model="form.signatory_title" :label="$t('projects.export.signatoryTitle')" class="mt-3" />
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UiInput v-model="form.signatory_name" :label="$t('projects.export.signatoryName')" />
      <UiInput v-model="form.signatory_title" :label="$t('projects.export.signatoryTitle')" />
    </div>
  </div>
</template>
