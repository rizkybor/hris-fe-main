<script setup>
import { computed, ref } from "vue";
import { HardDrive, MemoryStick, Cpu, Check, ExternalLink, RefreshCcw } from "lucide-vue-next";
import { formatBytes, formatUptime, SITE_TYPES, sslState, copyText } from "@/utils/serverMetrics";
import { UiBadge, UiButton } from "@/components/ui";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

// What one VPS's agent last reported: usage, hosted websites, folder sizes.
const props = defineProps({
  server: { type: Object, required: true },
});

const breakdownTotal = computed(() => props.server.report?.disk?.used || 0);
const sites = computed(() => (props.server.report?.sites || []).filter((site) => !site.unlinked));
const folders = computed(() => (props.server.report?.sites || []).filter((site) => site.unlinked));
const siteLabel = (site) => site.domains?.[0] || (site.server ? t("servers.report.defaultSite") : site.path);
const siteType = (site) => SITE_TYPES[site.type] || SITE_TYPES.unknown;
const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString(localeTag(), { dateStyle: "medium", timeStyle: "short" }) : "-";

const copied = ref("");
const copy = async (text, key) => {
  await copyText(text);
  copied.value = key;
  setTimeout(() => (copied.value = ""), 1800);
};

// ===== Presentation helpers (tokens) =====
// Same thresholds as usageLevel() in utils/serverMetrics (75 / 90).
const usageTone = (pct) => (pct === null || pct === undefined ? "neutral" : pct >= 90 ? "bad" : pct >= 75 ? "warn" : "ok");
const TONE_TEXT = { ok: "text-ui-ink", warn: "text-ui-warn", bad: "text-ui-bad", neutral: "text-ui-muted" };
const TONE_BAR = { ok: "bg-ui-ok", warn: "bg-ui-warn", bad: "bg-ui-bad", neutral: "bg-ui-faint" };
// sslState() returns legacy classes; read its colour family as a badge tone.
const sslTone = (site) => {
  const cls = sslState(site).class;
  return cls.includes("red") ? "bad" : cls.includes("amber") ? "warn" : cls.includes("green") ? "ok" : "neutral";
};
const usageTiles = computed(() => {
  const r = props.server.report;
  return [
    {
      key: "disk",
      icon: HardDrive,
      label: `Disk (${r.disk.mount})`,
      pct: r.disk.used_percent,
      sub: t("servers.report.diskSub", { used: formatBytes(r.disk.used), free: formatBytes(r.disk.free), total: formatBytes(r.disk.total) }),
    },
    {
      key: "ram",
      icon: MemoryStick,
      label: "RAM",
      pct: r.memory.used_percent,
      sub:
        `${formatBytes(r.memory.used)} / ${formatBytes(r.memory.total)}` +
        (r.memory.swap_total ? ` · swap ${formatBytes(r.memory.swap_used)} / ${formatBytes(r.memory.swap_total)}` : ""),
    },
    {
      key: "cpu",
      icon: Cpu,
      label: "CPU",
      pct: r.cpu.usage_percent,
      sub: t("servers.report.cpuSub", { cores: r.cpu.cores, load1: r.cpu.load1, load5: r.cpu.load5, load15: r.cpu.load15 }),
    },
  ];
});
</script>

<template>
  <div v-if="server.report" class="space-y-5">
    <div v-if="server.agent_outdated" class="bg-ui-info-soft border border-ui-info/20 rounded-ui-control p-3 text-ui-cap text-ui-text flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
      <span>{{ $t("servers.report.outdated", { version: server.report.agent_version }) }}</span>
      <UiButton variant="secondary" size="sm" class="shrink-0" :icon="copied === 'update' ? Check : RefreshCcw" @click="copy(server.update_command, 'update')">
        {{ copied === "update" ? $t("common.actions.copied") : $t("servers.report.copyUpdate") }}
      </UiButton>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div v-for="t in usageTiles" :key="t.key" class="border border-ui-line rounded-ui-card px-4 py-3.5 min-w-0">
        <p class="flex items-center gap-1.5 text-ui-small text-ui-muted"><component :is="t.icon" class="w-4 h-4 text-ui-faint" /> {{ t.label }}</p>
        <p class="text-ui-h1 tabular-nums mt-1" :class="TONE_TEXT[usageTone(t.pct)]">{{ t.pct }}%</p>
        <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden mt-2">
          <div class="h-full rounded-full" :class="TONE_BAR[usageTone(t.pct)]" :style="{ width: `${Math.min(t.pct || 0, 100)}%` }"></div>
        </div>
        <p class="text-ui-cap text-ui-muted mt-2 leading-snug">{{ t.sub }}</p>
      </div>
    </div>

    <div v-if="server.report.sites">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-ui-h3 text-ui-ink">{{ $t("servers.report.sitesTitle", { n: sites.length }) }}</p>
        <p class="text-ui-cap text-ui-muted text-right">{{ $t("servers.report.sitesSource") }}</p>
      </div>
      <p v-if="!sites.length" class="text-ui-cap text-ui-muted">{{ $t("servers.report.noSites") }}</p>
      <div v-else class="border border-ui-line rounded-ui-card divide-y divide-ui-line">
        <div v-for="site in sites" :key="siteLabel(site) + site.path" class="p-3 flex flex-col sm:flex-row sm:items-start gap-2 justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <a v-if="site.domains?.length" :href="`${site.ssl ? 'https' : 'http'}://${site.domains[0]}`" target="_blank" rel="noopener" class="text-ui-small font-medium text-ui-ink hover:text-ui-accent inline-flex items-center gap-1">
                {{ site.domains[0] }} <ExternalLink class="w-3 h-3" />
              </a>
              <span v-else class="text-ui-small font-medium text-ui-ink">{{ siteLabel(site) }}</span>
              <UiBadge tone="outline">{{ siteType(site).label + (site.version ? ` ${site.version}` : "") }}</UiBadge>
            </div>
            <p v-if="site.domains?.length > 1" class="text-ui-cap text-ui-muted mt-0.5 break-all">{{ $t("servers.report.alsoDomains", { domains: site.domains.slice(1).join(", ") }) }}</p>
            <p class="text-ui-cap text-ui-muted mt-0.5 break-all">
              <template v-if="site.path"><code class="font-mono">{{ site.path }}</code></template>
              <template v-if="site.proxy"> · {{ $t("servers.report.proxyTo") }} <code class="font-mono">{{ site.proxy }}</code><template v-if="site.process"> ({{ site.process }})</template></template>
              <template v-if="site.server"> · {{ site.server }}</template>
            </p>
          </div>
          <div class="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0">
            <span class="text-ui-cap font-medium text-ui-ink tabular-nums">{{ site.bytes != null ? formatBytes(site.bytes) : "-" }}</span>
            <UiBadge :tone="sslTone(site)" class="whitespace-nowrap">{{ sslState(site).label }}</UiBadge>
          </div>
        </div>
      </div>

      <template v-if="folders.length">
        <p class="text-ui-small font-medium text-ui-ink mt-4 mb-1">{{ $t("servers.report.foldersTitle", { n: folders.length }) }}</p>
        <p class="text-ui-cap text-ui-muted mb-2">{{ $t("servers.report.foldersHint") }}</p>
        <div class="border border-ui-line rounded-ui-card divide-y divide-ui-line">
          <div v-for="site in folders" :key="site.path" class="px-3 py-2 flex items-center justify-between gap-2 text-ui-cap">
            <span class="min-w-0 break-all"><code class="font-mono text-ui-ink">{{ site.path }}</code>
              <UiBadge v-if="site.type !== 'folder'" tone="outline" class="ml-1">{{ siteType(site).label + (site.version ? ` ${site.version}` : "") }}</UiBadge>
            </span>
            <span class="text-ui-ink font-medium tabular-nums shrink-0">{{ site.bytes != null ? formatBytes(site.bytes) : "-" }}</span>
          </div>
        </div>
      </template>
    </div>

    <div>
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-ui-h3 text-ui-ink">{{ $t("servers.report.diskByFolder") }}</p>
        <p class="text-ui-cap text-ui-muted text-right">{{ $t("servers.report.measuredAt", { date: formatDateTime(server.report.breakdown_at) }) }}</p>
      </div>
      <div v-if="server.report.breakdown?.length" class="space-y-2.5">
        <div v-for="item in server.report.breakdown" :key="item.path">
          <div class="flex items-center justify-between gap-2 text-ui-cap mb-1">
            <code class="font-mono text-ui-ink break-all">{{ item.path }}</code>
            <span class="text-ui-ink font-medium tabular-nums shrink-0">{{ formatBytes(item.bytes) }}</span>
          </div>
          <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-ui-accent" :style="{ width: `${breakdownTotal ? Math.min((item.bytes / breakdownTotal) * 100, 100) : 0}%` }"></div>
          </div>
        </div>
      </div>
      <p v-else class="text-ui-cap text-ui-muted">{{ $t("servers.report.noBreakdown") }}</p>
    </div>

    <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-ui-line">
      <div><dt class="text-ui-cap text-ui-muted">{{ $t("servers.report.os") }}</dt><dd class="text-ui-small font-medium text-ui-ink">{{ server.report.os || "-" }}</dd></div>
      <div><dt class="text-ui-cap text-ui-muted">{{ $t("servers.report.uptime") }}</dt><dd class="text-ui-small font-medium text-ui-ink">{{ formatUptime(server.report.uptime_seconds) }}</dd></div>
      <div><dt class="text-ui-cap text-ui-muted">{{ $t("servers.report.lastReport") }}</dt><dd class="text-ui-small font-medium text-ui-ink">{{ formatDateTime(server.last_report_at) }}</dd></div>
      <div><dt class="text-ui-cap text-ui-muted">{{ $t("servers.report.agentVersion") }}</dt><dd class="text-ui-small font-medium text-ui-ink font-mono">{{ server.report.agent_version || "-" }}</dd></div>
    </dl>
  </div>
</template>
