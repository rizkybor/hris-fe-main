<script setup>
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps({
  meta: {
    type: Object,
    required: true,
    default: () => ({
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 0,
      from: 0,
      to: 0,
    }),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  itemLabel: {
    type: String,
    default: "items",
  },
  showPerPage: {
    type: Boolean,
    default: false,
  },
  perPageOptions: {
    type: Array,
    default: () => [10, 25, 50, 100],
  },
});

const emit = defineEmits(["page-change", "per-page-change"]);

const currentPage = computed(() => props.meta?.current_page || 1);
const lastPage = computed(() => props.meta?.last_page || 1);
const perPage = computed(() => props.meta?.per_page || 10);
const total = computed(() => props.meta?.total || 0);
// Some APIs omit from/to in meta; derive them from the page so the range
// never reads "0–0".
const from = computed(() => props.meta?.from || (total.value ? (currentPage.value - 1) * perPage.value + 1 : 0));
const to = computed(() => props.meta?.to || Math.min(currentPage.value * perPage.value, total.value));

// Windowed page numbers with ellipsis, so a dataset with hundreds of pages
// doesn't render hundreds of buttons into the DOM.
const visiblePages = computed(() => {
  const pages = [];
  const current = currentPage.value;
  const last = lastPage.value;

  if (last <= 7) {
    for (let i = 1; i <= last; i++) pages.push(i);
  } else if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push("...");
    pages.push(last);
  } else if (current >= last - 3) {
    pages.push(1);
    pages.push("...");
    for (let i = last - 4; i <= last; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push("...");
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push("...");
    pages.push(last);
  }

  return pages;
});

const handlePageChange = (page) => {
  if (page !== currentPage.value && !props.loading) {
    emit("page-change", page);
  }
};

const handlePerPageChange = (newPerPage) => {
  if (newPerPage !== perPage.value && !props.loading) {
    emit("per-page-change", newPerPage);
  }
};

const goToPrevious = () => {
  if (currentPage.value > 1 && !props.loading) handlePageChange(currentPage.value - 1);
};

const goToNext = () => {
  if (currentPage.value < lastPage.value && !props.loading) handlePageChange(currentPage.value + 1);
};

// Shared button shape (matches UiPagination).
const btn = "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-ui-control border text-ui-small font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none";
</script>

<template>
  <nav v-if="total > 0" class="flex flex-wrap items-center gap-3 pt-4" aria-label="Pagination">
    <div class="flex items-center gap-3">
      <p class="text-ui-small text-ui-muted tabular-nums">Showing {{ from }}–{{ to }} of {{ total }} {{ itemLabel }}</p>
      <div v-if="showPerPage" class="flex items-center gap-2">
        <span class="text-ui-small text-ui-muted">Show</span>
        <div class="relative">
          <select
            :value="perPage"
            @change="handlePerPageChange(parseInt($event.target.value))"
            :disabled="loading"
            class="select-soft !w-auto"
            aria-label="Rows per page"
          >
            <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
          </select>
          <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ui-faint pointer-events-none" />
        </div>
      </div>
    </div>
    <div v-if="lastPage > 1" class="ml-auto flex items-center gap-1">
      <button type="button" @click="goToPrevious" :disabled="currentPage <= 1 || loading" :class="[btn, 'border-ui-line-strong bg-ui-surface text-ui-ink hover:bg-ui-subtle gap-1 px-2.5']" aria-label="Previous page">
        <ChevronLeft class="w-4 h-4" /><span class="sm:hidden">Previous</span>
      </button>
      <template v-for="(page, i) in visiblePages" :key="`${page}-${i}`">
        <span v-if="page === '...'" class="hidden sm:inline px-1 text-ui-faint">…</span>
        <button
          v-else
          type="button"
          @click="handlePageChange(page)"
          :disabled="loading"
          :aria-current="page === currentPage ? 'page' : undefined"
          :class="[btn, 'hidden sm:inline-flex tabular-nums', page === currentPage ? 'bg-ui-ink text-white border-ui-ink' : 'border-transparent text-ui-text hover:bg-ui-hover']"
        >{{ page }}</button>
      </template>
      <span class="sm:hidden text-ui-small text-ui-muted tabular-nums px-2">{{ currentPage }} / {{ lastPage }}</span>
      <button type="button" @click="goToNext" :disabled="currentPage >= lastPage || loading" :class="[btn, 'border-ui-line-strong bg-ui-surface text-ui-ink hover:bg-ui-subtle gap-1 px-2.5']" aria-label="Next page">
        <span class="sm:hidden">Next</span><ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </nav>
</template>
