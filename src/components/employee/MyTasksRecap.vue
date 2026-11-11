<script setup>
import { computed, defineAsyncComponent } from "vue";
import RecapSection from "@/components/common/RecapSection.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

// Charts for My Tasks, worked out from the tasks already on the page:
// where everything stands, and which projects the open work sits in.
const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
});

// ApexCharts needs real colour values, so read them from the redesign
// tokens (CSS variables in input.css) instead of hard-coding hex.
const tokenColor = (name) => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(`--ui-${name}`).trim();
    if (v) return `rgb(${v.split(/\s+/).join(",")})`;
  } catch {
    /* no DOM */
  }
  return "currentColor";
};

// Status, not identity -- same meaning as the badges in the list.
const STATUSES = [
  { key: "todo", token: "faint", swatch: "bg-ui-faint" },
  { key: "in_progress", token: "warn", swatch: "bg-ui-warn" },
  { key: "review", token: "info", swatch: "bg-ui-info" },
  { key: "done", token: "ok", swatch: "bg-ui-ok" },
  { key: "cancelled", token: "line-strong", swatch: "bg-ui-line-strong" },
].map((s) => ({ ...s, color: tokenColor(s.token) }));
const byStatus = computed(() =>
  STATUSES.map((s) => ({ ...s, label: t(`myTasks.status.${s.key}`), count: props.items.filter((i) => i.status === s.key).length })).filter((s) => s.count > 0)
);
const total = computed(() => props.items.length);
const doneCount = computed(() => props.items.filter((i) => i.status === "done").length);

const donutOptions = computed(() => ({
  chart: { type: "donut", fontFamily: "inherit", animations: { enabled: false } },
  labels: byStatus.value.map((s) => s.label),
  colors: byStatus.value.map((s) => s.color),
  stroke: { width: 2, colors: [tokenColor("surface")] },
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: {
        size: "70%",
        labels: {
          show: true,
          name: { show: true, offsetY: 18, color: tokenColor("muted"), fontSize: "11px" },
          value: { show: true, offsetY: -14, color: tokenColor("ink"), fontSize: "17px", fontWeight: 600 },
          total: { show: true, label: t("myTasks.recap.doneLabel"), color: tokenColor("muted"), fontSize: "11px", formatter: () => `${total.value ? Math.round((doneCount.value / total.value) * 100) : 0}%` },
        },
      },
    },
  },
}));

// Open work per project; assigned (non-project) tasks get their own row.
const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const groups = computed(() => {
  const map = new Map();
  props.items
    .filter((i) => !["done", "cancelled"].includes(i.status))
    .forEach((i) => {
      const key = i.source === "assigned" ? "__assigned" : `p-${i.projectId ?? "none"}`;
      const name = i.source === "assigned" ? t("myTasks.recap.assignedTasks") : i.projectName;
      const g = map.get(key) || { key, name, open: 0, overdue: 0, assigned: i.source === "assigned" };
      g.open++;
      if (i.due && i.due < today) g.overdue++;
      map.set(key, g);
    });
  return Array.from(map.values()).sort((a, b) => b.open - a.open);
});
const shown = computed(() => groups.value.slice(0, 6));
const maxOpen = computed(() => Math.max(1, ...groups.value.map((g) => g.open)));
</script>

<template>
  <RecapSection storage-key="my-tasks-recap-open" :loading="loading" :failed="false" :tiles="0">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
        <p class="text-ui-h3 text-ui-ink">{{ $t("myTasks.recap.standTitle") }}</p>
        <p class="text-ui-cap text-ui-muted mb-2">{{ $t("myTasks.recap.standSubtitle") }}</p>
        <p v-if="!total" class="text-ui-small text-ui-muted py-10 text-center">{{ $t("myTasks.recap.noTasks") }}</p>
        <div v-else class="flex flex-col sm:flex-row items-center gap-4">
          <div class="w-44 shrink-0">
            <VueApexCharts type="donut" height="190" :options="donutOptions" :series="byStatus.map((s) => s.count)" />
          </div>
          <ul class="w-full space-y-2 text-ui-cap">
            <li v-for="s in byStatus" :key="s.key" class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" :class="s.swatch"></span>
              <span class="text-ui-text font-medium flex-1">{{ s.label }}</span>
              <span class="text-ui-ink font-medium tabular-nums">{{ s.count }}</span>
              <span class="text-ui-muted w-10 text-right tabular-nums">{{ Math.round((s.count / total) * 100) }}%</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
        <p class="text-ui-h3 text-ui-ink">{{ $t("myTasks.recap.byProjectTitle") }}</p>
        <p class="text-ui-cap text-ui-muted mb-3">{{ $t("myTasks.recap.byProjectSubtitle") }}</p>
        <p v-if="!groups.length" class="text-ui-small text-ui-muted py-10 text-center">{{ $t("myTasks.recap.nothingOpen") }}</p>
        <div v-else class="space-y-3">
          <div v-for="g in shown" :key="g.key">
            <div class="flex items-baseline justify-between gap-2 text-ui-cap mb-1">
              <span class="font-medium truncate" :class="g.assigned ? 'text-ui-muted italic' : 'text-ui-text'">{{ g.name }}</span>
              <span class="shrink-0 text-ui-muted tabular-nums">
                <i18n-t keypath="myTasks.recap.openCount" tag="span" scope="global"><template #n><strong class="text-ui-ink font-medium">{{ g.open }}</strong></template></i18n-t>
                <span v-if="g.overdue" class="text-ui-bad font-medium"> · {{ $t("myTasks.recap.overdueCount", { n: g.overdue }) }}</span>
              </span>
            </div>
            <div class="w-full h-2 bg-ui-subtle rounded-full overflow-hidden flex gap-0.5">
              <div v-if="g.overdue" class="h-full rounded-full bg-ui-bad" :style="{ width: `${(g.overdue / maxOpen) * 100}%` }"></div>
              <div v-if="g.open - g.overdue" class="h-full rounded-full bg-ui-accent" :style="{ width: `${((g.open - g.overdue) / maxOpen) * 100}%` }"></div>
            </div>
          </div>
          <p class="text-ui-cap text-ui-muted flex flex-wrap gap-x-3 gap-y-1">
            <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-ui-bad"></span>{{ $t("myTasks.buckets.overdue") }}</span>
            <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-ui-accent"></span>{{ $t("myTasks.summary.open") }}</span>
            <span v-if="groups.length > shown.length">{{ $t("myTasks.recap.more", { n: groups.length - shown.length }) }}</span>
          </p>
        </div>
      </div>
    </div>
  </RecapSection>
</template>
