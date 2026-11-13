<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ChevronDown, Search, Check } from "lucide-vue-next";
import { UiSpinner } from "@/components/ui";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: "" },
  searchPlaceholder: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  id: { type: String, default: undefined },
  icon: { type: [Object, Function], default: null },
  emptyText: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue", "change"]);

const root = ref(null);
const searchInput = ref(null);
const listEl = ref(null);
const open = ref(false);
const query = ref("");
const active = ref(0);

const selected = computed(() => props.options.find((o) => String(o.value) === String(props.modelValue)) || null);

const normalize = (text) =>
  String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Label prefix matches first, then other matches; capped for speed.
const filtered = computed(() => {
  const q = normalize(query.value.trim());
  if (!q) return props.options.slice(0, 500);
  const starts = [];
  const contains = [];
  for (const o of props.options) {
    const label = normalize(o.label);
    if (label.startsWith(q)) starts.push(o);
    else if (label.includes(q) || normalize(o.hint).includes(q)) contains.push(o);
    if (starts.length + contains.length >= 500) break;
  }
  return [...starts, ...contains];
});

const toggle = async () => {
  if (props.disabled) return;
  open.value = !open.value;
  if (open.value) {
    query.value = "";
    active.value = Math.max(0, filtered.value.findIndex((o) => String(o.value) === String(props.modelValue)));
    await nextTick();
    searchInput.value?.focus();
    scrollActive();
  }
};

const choose = (option) => {
  if (!option) return;
  emit("update:modelValue", option.value);
  emit("change", option);
  open.value = false;
};

const scrollActive = () => {
  nextTick(() => listEl.value?.querySelector(`[data-index="${active.value}"]`)?.scrollIntoView({ block: "nearest" }));
};

const onKey = (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    active.value = Math.min(filtered.value.length - 1, active.value + 1);
    scrollActive();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    active.value = Math.max(0, active.value - 1);
    scrollActive();
  } else if (event.key === "Enter") {
    event.preventDefault();
    choose(filtered.value[active.value]);
  } else if (event.key === "Escape") {
    open.value = false;
  }
};

watch(query, () => (active.value = 0));

const onDocClick = (event) => {
  if (open.value && root.value && !root.value.contains(event.target)) open.value = false;
};
onMounted(() => document.addEventListener("mousedown", onDocClick));
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocClick));
</script>

<template>
  <div ref="root" class="relative">
    <button
      :id="id"
      type="button"
      @click="toggle"
      @keydown.down.prevent="!open && toggle()"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      class="w-full h-[38px] flex items-center gap-2 pr-3 border rounded-ui-control bg-ui-surface text-left text-ui-body transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:cursor-not-allowed"
      :class="[icon ? 'pl-9' : 'pl-3', invalid ? 'border-ui-bad/50' : open ? 'border-ui-accent shadow-ui-focus' : 'border-ui-line-strong']"
    >
      <component v-if="icon" :is="icon" class="absolute left-3 w-4 h-4 text-ui-faint" />
      <span class="flex-1 truncate" :class="selected ? 'text-ui-ink' : 'text-ui-faint'">
        {{ selected ? selected.label : placeholder || $t("licenses.select.placeholder") }}
      </span>
      <UiSpinner v-if="loading" size="14px" :center="false" />
      <ChevronDown v-else class="w-4 h-4 text-ui-faint shrink-0 transition-transform" :class="{ 'rotate-180': open }" />
    </button>

    <Transition name="ui-pop">
      <div
        v-if="open"
        class="absolute z-30 mt-1.5 w-full bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay overflow-hidden"
      >
        <div class="relative border-b border-ui-line">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint" />
          <input
            ref="searchInput"
            v-model="query"
            type="text"
            :placeholder="searchPlaceholder || $t('licenses.select.searchPlaceholder')"
            class="w-full pl-9 pr-3 py-2.5 bg-ui-surface text-ui-small text-ui-ink placeholder:text-ui-faint focus:outline-none"
            @keydown="onKey"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="open"
          />
        </div>
        <ul ref="listEl" class="max-h-64 overflow-y-auto scroll-soft p-1" role="listbox">
          <li v-if="!filtered.length" class="px-3 py-2 text-ui-small text-ui-muted">{{ loading ? $t("common.states.loading") : emptyText || $t("licenses.select.noMatches") }}</li>
          <li
            v-for="(option, index) in filtered"
            :key="option.value"
            :data-index="index"
            role="option"
            :aria-selected="String(option.value) === String(modelValue)"
            @mousedown.prevent="choose(option)"
            @mouseenter="active = index"
            class="flex items-center gap-2 px-2.5 py-2 rounded-ui-control text-ui-small cursor-pointer"
            :class="index === active ? 'bg-ui-hover text-ui-ink' : 'text-ui-text'"
          >
            <span class="flex-1 truncate">{{ option.label }}</span>
            <span v-if="option.hint" class="text-ui-cap font-mono text-ui-faint">{{ option.hint }}</span>
            <Check v-if="String(option.value) === String(modelValue)" class="w-4 h-4 text-ui-accent shrink-0" />
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>
