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
    <button type="button" class="w-full flex items-center justify-between gap-2 mb-2.5 text-left group" :aria-expanded="open" @click="toggle">
      <span class="text-ui-over uppercase text-ui-muted">Recap</span>
      <span class="text-ui-cap font-medium text-ui-muted inline-flex items-center gap-1 group-hover:text-ui-ink">
        {{ open ? "Hide" : "Show" }}
        <ChevronDown class="w-3.5 h-3.5 transition-transform duration-ui-fast" :class="{ '-rotate-90': !open }" />
      </span>
    </button>

    <template v-if="open">
      <div v-if="loading" class="space-y-3">
        <div v-if="tiles" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Skeleton v-for="i in tiles" :key="i" height="88px" rounded="12px" />
        </div>
        <Skeleton height="240px" rounded="12px" />
      </div>
      <p v-else-if="failed" class="text-ui-small text-ui-muted bg-ui-surface border border-ui-line rounded-ui-card px-4 py-3">
        Couldn't load the recap. <button type="button" class="text-ui-accent font-medium hover:underline" @click="emit('retry')">Try again</button>
      </p>
      <div v-else class="ui-anim-fade space-y-3"><slot /></div>
    </template>
  </section>
</template>
