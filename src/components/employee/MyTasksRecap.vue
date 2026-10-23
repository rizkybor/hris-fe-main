<script setup>
import { computed, defineAsyncComponent } from "vue";
import RecapSection from "@/components/common/RecapSection.vue";

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

// Charts for My Tasks, worked out from the tasks already on the page:
// where everything stands, and which projects the open work sits in.
const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
});

// Status, not identity -- same meaning as the badges in the list.
const STATUSES = [
  { key: "todo", label: "To Do", color: "#94a3b8" },
  { key: "in_progress", label: "In Progress", color: "#eda100" },
  { key: "review", label: "Review", color: "#2a78d6" },
  { key: "done", label: "Done", color: "#1baf7a" },
  { key: "cancelled", label: "Cancelled", color: "#cbd5e1" },
];
const byStatus = computed(() =>
  STATUSES.map((s) => ({ ...s, count: props.items.filter((i) => i.status === s.key).length })).filter((s) => s.count > 0)
);
const total = computed(() => props.items.length);
const doneCount = computed(() => props.items.filter((i) => i.status === "done").length);

const donutOptions = computed(() => ({
  chart: { type: "donut", fontFamily: "inherit", animations: { enabled: false } },
  labels: byStatus.value.map((s) => s.label),
  colors: byStatus.value.map((s) => s.color),
  stroke: { width: 2, colors: ["#ffffff"] },
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: {
        size: "70%",
        labels: {
          show: true,
          name: { show: true, offsetY: 18, color: "#64748b", fontSize: "11px" },
          value: { show: true, offsetY: -14, color: "#0f172a", fontSize: "18px", fontWeight: 800 },
          total: { show: true, label: "done", color: "#64748b", fontSize: "11px", formatter: () => `${total.value ? Math.round((doneCount.value / total.value) * 100) : 0}%` },
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
      const name = i.source === "assigned" ? "Assigned tasks" : i.projectName;
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
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-dark text-sm font-bold">Where my tasks stand</p>
        <p class="text-brand-light text-xs mb-2">Project and assigned tasks together</p>
        <p v-if="!total" class="text-sm text-gray-500 py-10 text-center">No tasks yet.</p>
        <div v-else class="flex flex-col sm:flex-row items-center gap-4">
          <div class="w-44 shrink-0">
            <VueApexCharts type="donut" height="190" :options="donutOptions" :series="byStatus.map((s) => s.count)" />
          </div>
          <ul class="w-full space-y-2 text-xs">
            <li v-for="s in byStatus" :key="s.key" class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: s.color }"></span>
              <span class="text-brand-dark font-medium flex-1">{{ s.label }}</span>
              <span class="text-brand-dark font-semibold tabular-nums">{{ s.count }}</span>
              <span class="text-brand-light w-10 text-right tabular-nums">{{ Math.round((s.count / total) * 100) }}%</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-dark text-sm font-bold">Open tasks by project</p>
        <p class="text-brand-light text-xs mb-3">Most open first</p>
        <p v-if="!groups.length" class="text-sm text-gray-500 py-10 text-center">Nothing open. Nice work!</p>
        <div v-else class="space-y-3">
          <div v-for="g in shown" :key="g.key">
            <div class="flex items-baseline justify-between gap-2 text-xs mb-1">
              <span class="font-medium truncate" :class="g.assigned ? 'text-brand-light italic' : 'text-brand-dark'">{{ g.name }}</span>
              <span class="shrink-0 text-brand-light tabular-nums">
                <strong class="text-brand-dark">{{ g.open }}</strong> open
                <span v-if="g.overdue" class="text-red-600 font-semibold"> · {{ g.overdue }} overdue</span>
              </span>
            </div>
            <div class="w-full bg-gray-100 rounded-full overflow-hidden flex gap-[2px]" style="height: 8px">
              <div v-if="g.overdue" class="h-full rounded-full bg-[#dc2626]" :style="{ width: `${(g.overdue / maxOpen) * 100}%` }"></div>
              <div v-if="g.open - g.overdue" class="h-full rounded-full bg-[#2a78d6]" :style="{ width: `${((g.open - g.overdue) / maxOpen) * 100}%` }"></div>
            </div>
          </div>
          <p class="text-[11px] text-brand-light flex flex-wrap gap-x-3 gap-y-1">
            <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-[#dc2626]"></span>Overdue</span>
            <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-[#2a78d6]"></span>Open</span>
            <span v-if="groups.length > shown.length">+ {{ groups.length - shown.length }} more</span>
          </p>
        </div>
      </div>
    </div>
  </RecapSection>
</template>
