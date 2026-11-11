<script setup>
import { ref, onBeforeUnmount } from "vue";
import { Copy, Check } from "lucide-vue-next";

const props = defineProps({
  value: { type: String, required: true },
  size: { type: String, default: "sm" }, // sm | md
});

const copied = ref(false);
let timer = null;

const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.value);
    copied.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied.value = false), 1500);
  } catch (e) {
    console.error(e);
  }
};

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <button
    type="button"
    @click.stop="copy"
    class="inline-flex justify-center items-center rounded-ui-control border border-ui-line bg-ui-surface text-ui-muted hover:text-ui-ink hover:bg-ui-subtle transition-colors shrink-0"
    :class="size === 'md' ? 'w-9 h-9' : 'w-7 h-7'"
    :title="copied ? $t('common.actions.copied') : $t('licenses.copyKey')"
    :aria-label="copied ? $t('common.actions.copied') : $t('licenses.copyKey')"
  >
    <Check v-if="copied" :class="size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'" class="text-ui-ok" />
    <Copy v-else :class="size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'" />
  </button>
</template>
