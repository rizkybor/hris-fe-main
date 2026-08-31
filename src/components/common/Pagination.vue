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
const from = computed(() => props.meta?.from || 0);
const to = computed(() => props.meta?.to || 0);

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
</script>

<template>
  <div v-if="total > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
    <div class="flex items-center gap-4">
      <p class="text-sm text-brand-light">
        Showing {{ from }} - {{ to }} of {{ total }} {{ itemLabel }}
      </p>
      <div v-if="showPerPage" class="flex items-center gap-2">
        <span class="text-brand-light text-sm">Show</span>
        <div class="relative">
          <select
            :value="perPage"
            @change="handlePerPageChange(parseInt($event.target.value))"
            :disabled="loading"
            class="select-soft"
          >
            <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
          </select>
          <ChevronDown
            class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          />
        </div>
      </div>
    </div>

    <div v-if="lastPage > 1" class="flex items-center gap-2">
      <button
        @click="goToPrevious"
        :disabled="currentPage <= 1 || loading"
        class="w-8 h-8 flex items-center justify-center border border-[#DCDEDD] rounded-lg hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <template v-for="(page, i) in visiblePages" :key="`${page}-${i}`">
        <button
          v-if="page !== '...'"
          @click="handlePageChange(page)"
          :disabled="loading"
          class="w-8 h-8 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="page === currentPage ? 'bg-[#0C51D9] text-white' : 'border border-[#DCDEDD] text-brand-dark hover:border-[#0C51D9]'"
        >
          {{ page }}
        </button>
        <span v-else class="px-1 text-gray-400">...</span>
      </template>

      <button
        @click="goToNext"
        :disabled="currentPage >= lastPage || loading"
        class="w-8 h-8 flex items-center justify-center border border-[#DCDEDD] rounded-lg hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
