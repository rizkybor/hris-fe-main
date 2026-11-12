<script setup>
// A short editable list (missions, branches): one input per item, remove
// buttons, and "add" at the bottom. Enter in the last row adds a new one.
import { nextTick, ref } from "vue";
import { Plus, X } from "lucide-vue-next";

const items = defineModel({ type: Array, default: () => [] });
defineProps({
  label: { type: String, required: true }, // e.g. "Misi" -- used for row labels
  addLabel: { type: String, required: true },
  placeholder: { type: String, default: "" },
  numbered: { type: Boolean, default: false },
});

const list = ref(null);
const focusRow = async (index) => {
  await nextTick();
  list.value?.querySelectorAll("input")[index]?.focus();
};
const add = () => {
  items.value = [...items.value, ""];
  focusRow(items.value.length - 1);
};
const remove = (index) => {
  items.value = items.value.filter((_, i) => i !== index);
  focusRow(Math.max(0, index - 1));
};
const update = (index, value) => {
  items.value = items.value.map((v, i) => (i === index ? value : v));
};
const onEnter = (index) => {
  if (index === items.value.length - 1 && items.value[index].trim()) add();
  else focusRow(index + 1);
};
</script>

<template>
  <div ref="list" class="space-y-2">
    <div v-for="(item, index) in items" :key="index" class="flex items-center gap-2">
      <span v-if="numbered" class="w-6 h-6 shrink-0 rounded-full bg-ui-accent-soft text-ui-accent text-ui-cap font-semibold tabular-nums inline-flex items-center justify-center" aria-hidden="true">
        {{ index + 1 }}
      </span>
      <input
        :value="item"
        type="text"
        class="flex-1 min-w-0 h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow"
        :placeholder="placeholder"
        :aria-label="`${label} ${index + 1}`"
        @input="update(index, $event.target.value)"
        @keydown.enter.prevent="onEnter(index)"
      />
      <button
        type="button"
        class="ui-press w-[38px] h-[38px] shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-faint hover:text-ui-bad hover:bg-ui-bad-soft focus:outline-none focus-visible:shadow-ui-focus"
        :aria-label="`${$t('common.actions.remove')} ${label} ${index + 1}`"
        :title="$t('common.actions.remove')"
        @click="remove(index)"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
    <button
      type="button"
      class="ui-press inline-flex items-center gap-1.5 h-9 px-3 rounded-ui-control border border-dashed border-ui-line-strong text-ui-small font-medium text-ui-muted hover:text-ui-ink hover:border-ui-ink/40 focus:outline-none focus-visible:shadow-ui-focus"
      @click="add"
    >
      <Plus class="w-4 h-4" />{{ addLabel }}
    </button>
  </div>
</template>
