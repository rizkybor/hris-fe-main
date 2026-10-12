<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { HardDrive, RefreshCw, Database, FolderOpen } from "lucide-vue-next";
import { useServerStorageStore } from "@/stores/serverStorage";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const store = useServerStorageStore();
const { storage, loading, error } = storeToRefs(store);

onMounted(() => store.fetchStorage());

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

const checkedAt = computed(() =>
  storage.value?.checked_at
    ? new Date(storage.value.checked_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : "-"
);
</script>

<template>
  <div class="px-4 py-4">
    <!-- Header -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
            <HardDrive class="w-6 h-6 text-blue-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold">Server Storage</h3>
            <p class="text-brand-light text-xs font-normal">Disk usage of the VPS running the HRIS server</p>
          </div>
        </div>

        <button
          type="button"
          @click="store.fetchStorage()"
          :disabled="loading"
          class="rounded-[8px] border border-[#DCDEDD] bg-white hover:border-[#0C51D9] transition-all duration-300 px-3.5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50"
        >
          <RefreshCw class="w-4 h-4 text-brand-dark" :class="{ 'animate-spin': loading }" />
          <span class="text-brand-dark text-sm font-semibold">Refresh</span>
        </button>
      </div>
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

        <div class="w-full bg-gray-100 rounded-full overflow-hidden" style="height: 14px">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{ width: `${Math.min(usedPercent, 100)}%`, backgroundColor: level.color }"
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

      <!-- What the HRIS itself takes up on that disk -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <h3 class="text-brand-dark text-base font-bold">HRIS Usage</h3>
        <p class="text-brand-light text-xs mb-4">Space taken by this application on the disk above</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex items-center gap-3 border border-[#DCDEDD] rounded-[12px] p-4">
            <div class="w-10 h-10 bg-indigo-50 rounded-[12px] flex items-center justify-center shrink-0">
              <Database class="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p class="text-brand-light text-sm font-medium">Database</p>
              <p class="text-brand-dark text-lg font-bold">{{ formatBytes(storage.breakdown.database_bytes) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 border border-[#DCDEDD] rounded-[12px] p-4">
            <div class="w-10 h-10 bg-orange-50 rounded-[12px] flex items-center justify-center shrink-0">
              <FolderOpen class="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p class="text-brand-light text-sm font-medium">App Storage (logs, cache, backups)</p>
              <p class="text-brand-dark text-lg font-bold">{{ formatBytes(storage.breakdown.app_storage_bytes) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
