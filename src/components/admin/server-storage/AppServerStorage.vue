<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import {
  HardDrive,
  RefreshCw,
  Database,
  Archive,
  Upload,
  FileText,
  Search,
  Zap,
  Package,
  Code2,
  Server,
  Activity,
} from "lucide-vue-next";
import { useServerStorageStore } from "@/stores/serverStorage";
import { useServerMonitorStore } from "@/stores/serverMonitor";
import { STATUS, timeAgo } from "@/utils/serverMetrics";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import VpsReportDetails from "@/components/admin/server-storage/VpsReportDetails.vue";

defineEmits(["open-vps"]);

const store = useServerStorageStore();
const { storage, loading, error } = storeToRefs(store);
const monitor = useServerMonitorStore();

onMounted(() => {
  store.fetchStorage();
  if (!monitor.loaded) monitor.fetchServers();
});

// RAM, CPU and websites come from the monitoring agent, when one runs on
// this same server -- matched by hostname.
const agentServer = computed(() =>
  storage.value?.hostname ? monitor.servers.find((s) => s.report?.hostname === storage.value.hostname) : null
);

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

const usedPercent = computed(() => storage.value?.disk.used_percent ?? 0);

// Same thresholds a sysadmin would act on: under 75% is fine, 75-90% is
// time to clean up, above 90% risks the database or uploads failing.
const level = computed(() => {
  if (usedPercent.value >= 90) return { color: "#DC2626", label: "Critical", badge: "bg-red-50 text-red-700" };
  if (usedPercent.value >= 75) return { color: "#D97706", label: "Warning", badge: "bg-yellow-50 text-yellow-700" };
  return { color: "#0C51D9", label: "Healthy", badge: "bg-green-50 text-green-700" };
});

// Fixed color + icon per backend category key, so a category keeps the
// same look no matter which others are present (Database is omitted when
// MySQL's size can't be read).
const CATEGORY_STYLE = {
  database: { color: "#4F46E5", icon: Database },
  backups: { color: "#0891B2", icon: Archive },
  uploads: { color: "#16A34A", icon: Upload },
  logs: { color: "#D97706", icon: FileText },
  search_index: { color: "#DB2777", icon: Search },
  cache: { color: "#7C3AED", icon: Zap },
  dependencies: { color: "#0C51D9", icon: Package },
  application: { color: "#0F766E", icon: Code2 },
  system: { color: "#64748B", icon: Server },
};

const categories = computed(() =>
  (storage.value?.categories ?? []).map((c) => ({
    ...c,
    ...(CATEGORY_STYLE[c.key] ?? { color: "#94A3B8", icon: HardDrive }),
    percentOfDisk: storage.value.disk.total_bytes ? (c.bytes / storage.value.disk.total_bytes) * 100 : 0,
    percentOfUsed: storage.value.disk.used_bytes ? (c.bytes / storage.value.disk.used_bytes) * 100 : 0,
  }))
);

const sortedCategories = computed(() => [...categories.value].sort((a, b) => b.bytes - a.bytes));

const hasDatabase = computed(() => categories.value.some((c) => c.key === "database"));

const formatPercent = (value) => (value > 0 && value < 0.1 ? "<0.1" : value.toFixed(1));

const checkedAt = computed(() =>
  storage.value?.checked_at
    ? new Date(storage.value.checked_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : "-"
);
</script>

<template>
  <!-- Disk of the server the HRIS API itself runs on, read directly by the
       API (no agent needed). -->
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <p class="text-brand-light text-sm">Disk server tempat aplikasi HRIS berjalan, dibaca langsung oleh aplikasi.</p>
      <button
        type="button"
        @click="store.fetchStorage(true)"
        :disabled="loading"
        class="rounded-[8px] border border-[#DCDEDD] bg-white hover:border-[#0C51D9] transition-all duration-300 px-3.5 py-2 flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50"
      >
        <RefreshCw class="w-4 h-4 text-brand-dark" :class="{ 'animate-spin': loading }" />
        <span class="text-brand-dark text-sm font-semibold">Refresh</span>
      </button>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-[14px] p-4 mb-5">
      {{ error }}
    </div>

    <div v-if="loading && !storage" class="space-y-4">
      <Skeleton class="h-48 w-full rounded-[14px]" />
      <Skeleton class="h-28 w-full rounded-[14px]" />
    </div>

    <template v-else-if="storage">
      <!-- Disk usage -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-5">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <p class="text-brand-light text-sm font-medium">Used</p>
            <p class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight">
              {{ formatBytes(storage.disk.used_bytes) }}
              <span class="text-brand-light text-base font-medium">of {{ formatBytes(storage.disk.total_bytes) }}</span>
            </p>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" :class="level.badge">
            {{ level.label }}
          </span>
        </div>

        <!-- Stacked by category; the grey track left over is the free space -->
        <div class="w-full bg-gray-100 rounded-full overflow-hidden flex" style="height: 14px">
          <div
            v-for="category in categories"
            :key="category.key"
            class="h-full transition-all duration-500"
            :style="{ width: `${category.percentOfDisk}%`, backgroundColor: category.color }"
            :title="`${category.label}: ${formatBytes(category.bytes)}`"
          ></div>
        </div>
        <div class="flex items-center justify-between mt-2 text-sm">
          <span class="text-brand-dark font-semibold">{{ usedPercent }}% used</span>
          <span class="text-brand-light">Checked {{ checkedAt }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div class="border border-[#DCDEDD] rounded-[12px] p-4">
            <p class="text-brand-light text-sm font-medium">Total Capacity</p>
            <p class="text-brand-dark text-xl font-bold mt-1">{{ formatBytes(storage.disk.total_bytes) }}</p>
          </div>
          <div class="border border-[#DCDEDD] rounded-[12px] p-4">
            <p class="text-brand-light text-sm font-medium">Used</p>
            <p class="text-brand-dark text-xl font-bold mt-1">{{ formatBytes(storage.disk.used_bytes) }}</p>
          </div>
          <div class="border border-[#DCDEDD] rounded-[12px] p-4">
            <p class="text-brand-light text-sm font-medium">Free</p>
            <p class="text-xl font-bold mt-1" :style="{ color: level.color }">
              {{ formatBytes(storage.disk.free_bytes) }}
            </p>
          </div>
        </div>
      </div>

      <!-- RAM, CPU and websites, from this server's monitoring agent -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div class="flex items-center gap-2 min-w-0">
            <Activity class="w-5 h-5 text-[#0C51D9] shrink-0" />
            <h3 class="text-brand-dark text-base font-bold">RAM, CPU &amp; Website</h3>
            <span v-if="agentServer" class="px-2 py-0.5 rounded-md text-xs font-semibold" :class="STATUS[agentServer.status].class">{{ STATUS[agentServer.status].label }}</span>
          </div>
          <p v-if="agentServer" class="text-xs text-brand-light">
            Dari agen VPS <strong class="text-brand-dark">{{ agentServer.name }}</strong> · laporan {{ timeAgo(agentServer.last_report_at) }}
          </p>
        </div>

        <VpsReportDetails v-if="agentServer" :server="agentServer" hide-disk />
        <div v-else-if="monitor.loaded" class="bg-slate-50 border border-dashed border-[#DCDEDD] rounded-[12px] p-4 text-sm text-brand-light">
          Pasang agen pemantauan di server ini agar RAM, CPU, daftar website, dan masa berlaku SSL ikut tampil di sini.
          Tambahkan server ini (hostname <code class="text-brand-dark">{{ storage.hostname || "-" }}</code>) di tab VPS, lalu jalankan perintah instalasinya.
          <button type="button" class="block mt-2 text-sm font-semibold text-[#0C51D9] hover:underline" @click="$emit('open-vps')">Buka tab VPS →</button>
        </div>
        <Skeleton v-else class="h-24 w-full rounded-[12px]" />
      </div>

      <!-- What the used space is made of -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-5">
        <h3 class="text-brand-dark text-base font-bold">Usage Breakdown</h3>
        <p class="text-brand-light text-xs mb-4">What the {{ formatBytes(storage.disk.used_bytes) }} of used space is taken up by</p>

        <div class="space-y-3">
          <div v-for="category in sortedCategories" :key="category.key" class="flex items-center gap-3">
            <div
              class="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              :style="{ backgroundColor: `${category.color}1A` }"
            >
              <component :is="category.icon" class="w-4 h-4" :style="{ color: category.color }" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3">
                <p class="text-brand-dark text-sm font-semibold truncate">{{ category.label }}</p>
                <p class="text-brand-dark text-sm font-bold shrink-0">{{ formatBytes(category.bytes) }}</p>
              </div>
              <div class="flex items-center gap-3 mt-1">
                <div class="flex-1 bg-gray-100 rounded-full overflow-hidden" style="height: 6px">
                  <div
                    class="h-full rounded-full"
                    :style="{ width: `${Math.min(category.percentOfUsed, 100)}%`, backgroundColor: category.color }"
                  ></div>
                </div>
                <span class="text-brand-light text-xs shrink-0 text-right" style="width: 48px">
                  {{ formatPercent(category.percentOfUsed) }}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <p class="text-brand-light text-xs mt-4">
          <span class="font-semibold">System &amp; Other</span> is everything outside this application: the
          operating system, other apps or sites on the VPS, and MySQL's own logs.
          <template v-if="!hasDatabase">
            The database size couldn't be read, so it's included there too.
          </template>
        </p>
      </div>

      <!-- Biggest database tables -->
      <div v-if="storage.largest_tables?.length" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <h3 class="text-brand-dark text-base font-bold">Largest Database Tables</h3>
        <p class="text-brand-light text-xs mb-4">The tables taking up the most space in the database</p>

        <div class="divide-y divide-gray-100">
          <div
            v-for="table in storage.largest_tables"
            :key="table.name"
            class="flex items-center justify-between gap-3 py-2.5"
          >
            <p class="text-brand-dark text-sm font-medium truncate">{{ table.name }}</p>
            <p class="text-brand-dark text-sm font-bold shrink-0">{{ formatBytes(table.bytes) }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
