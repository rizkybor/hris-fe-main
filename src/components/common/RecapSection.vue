<script setup>
import { ref } from "vue";
import { ChevronDown } from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

// Collapsible "Recap" block above a list page (open/closed remembered per
// browser), with its own loading and error states.
const props = defineProps({
  storageKey: { type: String, required: true },
  loading: Boolean,
  failed: Boolean,
  tiles: { type: Number, default: 4 },
});
const emit = defineEmits(["retry"]);

const open = ref(true);
try {
  open.value = localStorage.getItem(props.storageKey) !== "0";
} catch {
  /* storage unavailable */
}
const toggle = () => {
  open.value = !open.value;
  try {
    localStorage.setItem(props.storageKey, open.value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
};
</script>

<template>
  <section class="mb-4 sm:mb-5">
    <button type="button" class="w-full flex items-center justify-between gap-2 mb-2.5 text-left" :aria-expanded="open" @click="toggle">
      <span class="text-brand-dark text-sm font-bold">Recap</span>
      <span class="text-xs font-semibold text-brand-light inline-flex items-center gap-1 hover:text-[#0C51D9]">
        {{ open ? "Hide" : "Show" }}
        <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="{ '-rotate-90': !open }" />
      </span>
    </button>

    <template v-if="open">
      <div v-if="loading" class="space-y-3">
        <div v-if="tiles" class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <Skeleton v-for="i in tiles" :key="i" height="84px" rounded="12px" />
        </div>
        <Skeleton height="240px" rounded="14px" />
      </div>
      <p v-else-if="failed" class="text-sm text-gray-500 bg-white border border-[#DCDEDD] rounded-[12px] p-4">
        Couldn't load the recap. <button type="button" class="text-[#0C51D9] font-semibold hover:underline" @click="emit('retry')">Try again</button>
      </p>
      <div v-else class="space-y-3"><slot /></div>
    </template>
  </section>
</template>
