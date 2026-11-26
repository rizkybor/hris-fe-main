<script setup>
import { computed, ref, watch } from "vue";
import { axiosInstance } from "@/plugins/axios";
import { useListState } from "@/composables/useListState";
import { UiSelect } from "@/components/ui";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

// Totals for a period above a document list (Invoice, Kuitansi, PO).
// `stats(data)` turns the API summary into [{ label, value, hint, tone }].
const props = defineProps({
  endpoint: { type: String, required: true },
  storageKey: { type: String, required: true },
  stats: { type: Function, required: true },
  // Bump to reload (e.g. after a document is cancelled or marked paid).
  refreshKey: { type: [Number, String], default: 0 },
});

const { t } = useI18n();
const state = useListState(props.storageKey, { recap: "this_month" });

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Ranges in the device's local date (WIB), inclusive.
const range = (key) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "last_month":
      return [new Date(y, m - 1, 1), new Date(y, m, 0)];
    case "this_quarter": {
      const q = Math.floor(m / 3) * 3;
      return [new Date(y, q, 1), new Date(y, q + 3, 0)];
    }
    case "this_year":
      return [new Date(y, 0, 1), new Date(y, 11, 31)];
    case "last_year":
      return [new Date(y - 1, 0, 1), new Date(y - 1, 11, 31)];
    case "all":
      return [null, null];
    default:
      return [new Date(y, m, 1), new Date(y, m + 1, 0)];
  }
};

const PERIODS = ["this_month", "last_month", "this_quarter", "this_year", "last_year", "all"];
const periodOptions = computed(() => PERIODS.map((value) => ({ value, label: t(`documents.recap.period.${value}`) })));

const periodLabel = computed(() => {
  const [from, to] = range(state.recap);
  if (!from) return t("documents.recap.allTime");
  const fmt = (d) => d.toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(from)} – ${fmt(to)}`;
});

const loading = ref(true);
const failed = ref(false);
const data = ref(null);
let request = 0;

const load = async () => {
  const id = ++request;
  const [from, to] = range(state.recap);
  loading.value = !data.value;
  failed.value = false;
  try {
    const { data: response } = await axiosInstance.get(props.endpoint, { params: from ? { from: ymd(from), to: ymd(to) } : {} });
    if (id === request) data.value = response.data;
  } catch {
    if (id === request) failed.value = true;
  } finally {
    if (id === request) loading.value = false;
  }
};

watch(() => [state.recap, props.refreshKey], load, { immediate: true });

const items = computed(() => (data.value ? props.stats(data.value) : []));
const placeholders = [{ label: "" }, { label: "" }, { label: "" }, { label: "" }];
const TONES = { ok: "text-ui-ok", warn: "text-ui-warn", bad: "text-ui-bad", accent: "text-ui-accent" };
</script>

<template>
  <section :aria-label="$t('documents.recap.title')" class="space-y-2.5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="min-w-0">
        <h2 class="text-ui-h3 text-ui-ink">{{ $t("documents.recap.title") }}</h2>
        <p class="text-ui-cap text-ui-muted tabular-nums">{{ periodLabel }}</p>
      </div>
      <div class="w-full sm:w-48">
        <label :for="`${storageKey}-period`" class="sr-only">{{ $t("documents.recap.periodLabel") }}</label>
        <UiSelect :id="`${storageKey}-period`" v-model="state.recap" :options="periodOptions" />
      </div>
    </div>
    <p v-if="failed" class="text-ui-cap text-ui-bad">{{ $t("documents.recap.failed") }}</p>
    <!-- One card, cells split by hairlines: 2 per row on phones, 4 on wide screens. -->
    <div v-else class="bg-ui-surface border border-ui-line rounded-ui-card grid grid-cols-2 xl:grid-cols-4 overflow-hidden">
      <div
        v-for="(item, index) in loading && !items.length ? placeholders : items"
        :key="index"
        class="min-w-0 px-4 py-3 sm:px-5 sm:py-4 border-ui-line"
        :class="[index % 2 === 1 ? 'border-l' : '', index >= 2 ? 'border-t xl:border-t-0' : '', index >= 1 ? 'xl:border-l' : '']"
      >
        <p class="text-ui-cap sm:text-ui-small text-ui-muted truncate">{{ item.label }}</p>
        <Skeleton v-if="loading && !items.length" class="mt-2" width="70%" height="22px" rounded="6px" />
        <template v-else>
          <p class="text-ui-body sm:text-ui-h2 font-semibold tabular-nums mt-1 truncate" :class="TONES[item.tone] || 'text-ui-ink'" :title="String(item.value)">{{ item.value }}</p>
          <p v-if="item.hint" class="text-ui-cap text-ui-muted mt-0.5 truncate">{{ item.hint }}</p>
        </template>
      </div>
    </div>
  </section>
</template>
