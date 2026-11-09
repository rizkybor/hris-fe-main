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
    class="flex justify-center items-center border border-[#DCDEDD] bg-white rounded-lg hover:border-violet-400 hover:ring-2 hover:ring-violet-400/30 transition-all shrink-0"
    :class="size === 'md' ? 'p-2.5' : 'p-1.5'"
    :title="copied ? 'Copied' : 'Copy key'"
    :aria-label="copied ? 'Copied' : 'Copy key'"
  >
    <Check v-if="copied" :class="size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5'" class="text-success" />
    <Copy v-else :class="size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5'" class="text-gray-600" />
  </button>
</template>
