<script setup>
import { ref } from "vue";
import { ChevronDown } from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const props = defineProps({
  storageKey: { type: String, required: true },
  defaultOpen: { type: Boolean, default: true },
  loading: Boolean,
  failed: Boolean,
  tiles: { type: Number, default: 4 },
});
const emit = defineEmits(["retry"]);

const open = ref(props.defaultOpen);
try {
  const saved = localStorage.getItem(props.storageKey);
  if (saved !== null) open.value = saved !== "0";
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
      <span class="text-ui-over uppercase text-ui-muted">{{ $t("editor.recap.title") }}</span>
      <span class="text-ui-cap font-medium text-ui-muted inline-flex items-center gap-1 group-hover:text-ui-ink">
        {{ open ? $t("editor.recap.hide") : $t("editor.recap.show") }}
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
        {{ $t("editor.recap.loadFailed") }} <button type="button" class="text-ui-accent font-medium hover:underline" @click="emit('retry')">{{ $t("editor.recap.retry") }}</button>
      </p>
      <div v-else class="ui-anim-fade space-y-3"><slot /></div>
    </template>
  </section>
</template>
