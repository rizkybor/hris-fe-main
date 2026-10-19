<script setup>
import { computed, ref } from "vue";
import { HardDrive, MemoryStick, Cpu, Check, ExternalLink, RefreshCcw } from "lucide-vue-next";
import { formatBytes, usageLevel, formatUptime, SITE_TYPES, sslState, copyText } from "@/utils/serverMetrics";

// What one VPS's agent last reported: usage, hosted websites, folder sizes.
const props = defineProps({
  server: { type: Object, required: true },
});

const breakdownTotal = computed(() => props.server.report?.disk?.used || 0);
const sites = computed(() => (props.server.report?.sites || []).filter((site) => !site.unlinked));
const folders = computed(() => (props.server.report?.sites || []).filter((site) => site.unlinked));
const siteLabel = (site) => site.domains?.[0] || (site.server ? "Situs default (tanpa domain)" : site.path);
const siteType = (site) => SITE_TYPES[site.type] || SITE_TYPES.unknown;
const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

const copied = ref("");
const copy = async (text, key) => {
  await copyText(text);
  copied.value = key;
  setTimeout(() => (copied.value = ""), 1800);
};
</script>

<template>
  <div v-if="server.report" class="space-y-5">
    <div v-if="server.agent_outdated" class="bg-blue-50 border border-blue-200 rounded-[10px] p-3 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
      <span>Agen di VPS ini versi lama ({{ server.report.agent_version }}). Perbarui agar daftar website ikut terbaca. Jalankan di VPS (tanpa token baru):</span>
      <button type="button" class="vm-btn shrink-0" @click="copy(server.update_command, 'update')">
        <Check v-if="copied === 'update'" class="w-4 h-4 text-green-600" /><RefreshCcw v-else class="w-4 h-4" />
        {{ copied === "update" ? "Tersalin" : "Salin perintah update" }}
      </button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="vm-stat">
        <p class="vm-stat-label"><HardDrive class="w-3.5 h-3.5" /> Disk ({{ server.report.disk.mount }})</p>
        <p class="vm-stat-value" :class="usageLevel(server.report.disk.used_percent).text">{{ server.report.disk.used_percent }}%</p>
        <p class="vm-stat-sub">{{ formatBytes(server.report.disk.used) }} terpakai · sisa {{ formatBytes(server.report.disk.free) }} dari {{ formatBytes(server.report.disk.total) }}</p>
      </div>
      <div class="vm-stat">
        <p class="vm-stat-label"><MemoryStick class="w-3.5 h-3.5" /> RAM</p>
        <p class="vm-stat-value" :class="usageLevel(server.report.memory.used_percent).text">{{ server.report.memory.used_percent }}%</p>
        <p class="vm-stat-sub">
          {{ formatBytes(server.report.memory.used) }} / {{ formatBytes(server.report.memory.total) }}
          <template v-if="server.report.memory.swap_total"> · swap {{ formatBytes(server.report.memory.swap_used) }} / {{ formatBytes(server.report.memory.swap_total) }}</template>
        </p>
      </div>
      <div class="vm-stat">
        <p class="vm-stat-label"><Cpu class="w-3.5 h-3.5" /> CPU</p>
        <p class="vm-stat-value" :class="usageLevel(server.report.cpu.usage_percent).text">{{ server.report.cpu.usage_percent }}%</p>
        <p class="vm-stat-sub">{{ server.report.cpu.cores }} core · load {{ server.report.cpu.load1 }} / {{ server.report.cpu.load5 }} / {{ server.report.cpu.load15 }} (1/5/15 mnt)</p>
      </div>
    </div>

    <div v-if="server.report.sites">
      <div class="flex items-center justify-between mb-2">
        <p class="text-brand-dark text-sm font-bold">Website &amp; Sistem ({{ sites.length }})</p>
        <p class="text-xs text-brand-light">Dibaca dari konfigurasi nginx/apache</p>
      </div>
      <p v-if="!sites.length" class="text-xs text-brand-light">Tidak ada website yang terkonfigurasi di nginx/apache.</p>
      <div v-else class="border border-[#DCDEDD] rounded-[12px] divide-y divide-[#F1F1F1]">
        <div v-for="site in sites" :key="siteLabel(site) + site.path" class="p-3 flex flex-col sm:flex-row sm:items-start gap-2 justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <a v-if="site.domains?.length" :href="`${site.ssl ? 'https' : 'http'}://${site.domains[0]}`" target="_blank" rel="noopener" class="text-brand-dark text-sm font-semibold hover:text-[#0C51D9] inline-flex items-center gap-1">
                {{ site.domains[0] }} <ExternalLink class="w-3 h-3" />
              </a>
              <span v-else class="text-brand-dark text-sm font-semibold">{{ siteLabel(site) }}</span>
              <span class="px-1.5 py-0.5 rounded text-[11px] font-semibold" :class="siteType(site).class">{{ siteType(site).label + (site.version ? ` ${site.version}` : "") }}</span>
            </div>
            <p v-if="site.domains?.length > 1" class="text-[11px] text-brand-light mt-0.5 break-all">juga: {{ site.domains.slice(1).join(", ") }}</p>
            <p class="text-[11px] text-brand-light mt-0.5 break-all">
              <template v-if="site.path"><code>{{ site.path }}</code></template>
              <template v-if="site.proxy"> · proxy ke <code>{{ site.proxy }}</code><template v-if="site.process"> ({{ site.process }})</template></template>
              <template v-if="site.server"> · {{ site.server }}</template>
            </p>
          </div>
          <div class="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0">
            <span class="text-brand-dark text-xs font-semibold">{{ site.bytes != null ? formatBytes(site.bytes) : "-" }}</span>
            <span class="px-1.5 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap" :class="sslState(site).class">{{ sslState(site).label }}</span>
          </div>
        </div>
      </div>

      <template v-if="folders.length">
        <p class="text-brand-dark text-xs font-bold mt-3 mb-1.5">Folder di /var/www tanpa domain ({{ folders.length }})</p>
        <p class="text-[11px] text-brand-light mb-1.5">Tidak dipakai oleh konfigurasi web server mana pun. Bisa jadi sisa proyek lama yang aman dihapus; periksa dulu.</p>
        <div class="border border-[#DCDEDD] rounded-[12px] divide-y divide-[#F1F1F1]">
          <div v-for="site in folders" :key="site.path" class="px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <span class="min-w-0 break-all"><code class="text-brand-dark">{{ site.path }}</code>
              <span v-if="site.type !== 'folder'" class="ml-1 px-1.5 py-0.5 rounded text-[11px] font-semibold" :class="siteType(site).class">{{ siteType(site).label + (site.version ? ` ${site.version}` : "") }}</span>
            </span>
            <span class="text-brand-dark font-semibold shrink-0">{{ site.bytes != null ? formatBytes(site.bytes) : "-" }}</span>
          </div>
        </div>
      </template>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <p class="text-brand-dark text-sm font-bold">Pemakaian Disk per Folder</p>
        <p class="text-xs text-brand-light">Diukur {{ formatDateTime(server.report.breakdown_at) }} · diperbarui tiap 6 jam</p>
      </div>
      <div v-if="server.report.breakdown?.length" class="space-y-2">
        <div v-for="item in server.report.breakdown" :key="item.path">
          <div class="flex items-center justify-between text-xs mb-1">
            <code class="text-brand-dark">{{ item.path }}</code>
            <span class="text-brand-dark font-semibold">{{ formatBytes(item.bytes) }}</span>
          </div>
          <div class="w-full bg-gray-100 rounded-full overflow-hidden" style="height: 6px">
            <div class="h-full rounded-full" :style="{ width: `${breakdownTotal ? Math.min((item.bytes / breakdownTotal) * 100, 100) : 0}%`, backgroundColor: '#0C51D9' }"></div>
          </div>
        </div>
      </div>
      <p v-else class="text-xs text-brand-light">Rincian folder belum tersedia.</p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div><p class="text-brand-light">Sistem operasi</p><p class="text-brand-dark font-semibold">{{ server.report.os || "-" }}</p></div>
      <div><p class="text-brand-light">Uptime</p><p class="text-brand-dark font-semibold">{{ formatUptime(server.report.uptime_seconds) }}</p></div>
      <div><p class="text-brand-light">Laporan terakhir</p><p class="text-brand-dark font-semibold">{{ formatDateTime(server.last_report_at) }}</p></div>
      <div><p class="text-brand-light">Versi agen</p><p class="text-brand-dark font-semibold">{{ server.report.agent_version || "-" }}</p></div>
    </div>
  </div>
</template>

<style scoped>
.vm-stat {
  border: 1px solid #dcdedd;
  border-radius: 12px;
  padding: 12px;
}
.vm-stat-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}
.vm-stat-value {
  font-size: 24px;
  font-weight: 800;
  margin: 2px 0;
}
.vm-stat-sub {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}
.vm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #dcdedd;
  border-radius: 9px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  background: #ffffff;
}
.vm-btn:hover {
  border-color: #0c51d9;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
</style>
