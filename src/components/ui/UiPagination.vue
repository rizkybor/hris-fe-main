<script setup>
// Pagination for the API meta ({ current_page, last_page, per_page, total }).
// Desktop: "Showing a–b of n" + page numbers; phones: Previous / Next.
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

const props = defineProps({
  meta: { type: Object, required: true },
  itemLabel: { type: String, default: "results" },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["change"]);

const page = computed(() => Number(props.meta?.current_page) || 1);
const last = computed(() => Math.max(1, Number(props.meta?.last_page) || 1));
const total = computed(() => Number(props.meta?.total) || 0);
const perPage = computed(() => Number(props.meta?.per_page) || 0);
const from = computed(() => (total.value ? (page.value - 1) * perPage.value + 1 : 0));
const to = computed(() => Math.min(total.value, page.value * perPage.value || total.value));

// 1 … 4 5 6 … 12
const pages = computed(() => {
  const out = [];
  const add = (p) => out.push(p);
  const window = new Set([1, last.value, page.value - 1, page.value, page.value + 1]);
  let prev = 0;
  for (let p = 1; p <= last.value; p++) {
    if (!window.has(p)) continue;
    if (p - prev > 1) add("…");
    add(p);
    prev = p;
  }
  return out;
});

const go = (p) => {
  if (props.disabled || p < 1 || p > last.value || p === page.value) return;
  emit("change", p);
};
const btn = "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-ui-control text-ui-small border transition-colors disabled:opacity-40 disabled:pointer-events-none";
</script>

<template>
  <nav class="flex items-center gap-3 px-4 py-3 border-t border-ui-line" aria-label="Pagination">
    <p class="text-ui-small text-ui-muted tabular-nums">
      <span class="hidden sm:inline">Showing {{ from }}–{{ to }} of {{ total }} {{ itemLabel }}</span>
      <span class="sm:hidden">Page {{ page }} of {{ last }}</span>
    </p>
    <div class="ml-auto flex items-center gap-1">
      <button type="button" :class="[btn, 'border-ui-line-strong bg-ui-surface text-ui-ink hover:bg-ui-subtle gap-1 px-2.5']" :disabled="page <= 1 || disabled" @click="go(page - 1)">
        <ChevronLeft class="w-4 h-4" /><span class="sm:hidden">Previous</span>
      </button>
      <template v-for="(p, i) in pages" :key="`${p}-${i}`">
        <span v-if="p === '…'" class="hidden sm:inline px-1 text-ui-faint">…</span>
        <button
          v-else
          type="button"
          :aria-current="p === page ? 'page' : undefined"
          :class="[btn, 'hidden sm:inline-flex tabular-nums', p === page ? 'bg-ui-ink text-white border-ui-ink' : 'border-transparent text-ui-text hover:bg-ui-hover']"
          :disabled="disabled"
          @click="go(p)"
        >{{ p }}</button>
      </template>
      <button type="button" :class="[btn, 'border-ui-line-strong bg-ui-surface text-ui-ink hover:bg-ui-subtle gap-1 px-2.5']" :disabled="page >= last || disabled" @click="go(page + 1)">
        <span class="sm:hidden">Next</span><ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </nav>
</template>
