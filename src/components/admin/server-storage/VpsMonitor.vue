<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { usePolling } from "@/composables/usePolling";
import { useListState } from "@/composables/useListState";
import { storeToRefs } from "pinia";
import {
  Server,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  Pencil,
  Trash2,
  KeyRound,
  HardDrive,
  MemoryStick,
  Cpu,
  ChevronRight,
  Globe,
  Activity,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-vue-next";
import { UiStat, UiButton, UiBadge, UiModal, UiAlert, UiEmpty, UiSpinner, UiDrawer } from "@/components/ui";
import VpsReportDetails from "@/components/admin/server-storage/VpsReportDetails.vue";
import { useServerMonitorStore } from "@/stores/serverMonitor";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { formatBytes, STATUS, timeAgo, sslState, copyText } from "@/utils/serverMetrics";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const store = useServerMonitorStore();
const alertModal = useAlertModalStore();
const { servers, loading, loaded, error } = storeToRefs(store);
const canManage = computed(() => can("server-storage-manage"));

// Agents report every 5 minutes; refresh the cards every minute while the
// page is open and the browser tab visible (a missed tick runs on return).
// A revisit shows the list the store already has and refreshes it quietly.
onMounted(() => store.fetchServers({ silent: loaded.value }));
usePolling(() => store.fetchServers({ silent: true }), 60000);

// Re-render "x menit lalu" labels between refreshes.
const now = ref(Date.now());
const clock = setInterval(() => (now.value = Date.now()), 30000);
onBeforeUnmount(() => clearInterval(clock));
const ago = (value) => (now.value, timeAgo(value));

// Sites whose certificate expires within 14 days (or already has).
const sslWarnings = (server) => (server.report?.sites || []).filter((site) => site.ssl && sslState(site).days < 14).length;
const siteCount = (server) => (server.report?.sites || []).filter((site) => !site.unlinked).length;

const needsAttention = (s) =>
  s.status === "offline" ||
  (s.report && (s.report.disk?.used_percent >= 90 || s.report.memory?.used_percent >= 90)) ||
  sslWarnings(s) > 0;

const summary = computed(() => ({
  total: servers.value.length,
  online: servers.value.filter((s) => s.status === "online").length,
  attention: servers.value.filter(needsAttention).length,
}));

// Filter from the summary tiles (in the URL + remembered): "" | attention | online.
const list = useListState("servers", { show: "" });
const toggleShow = (value) => (list.show = list.show === value ? "" : value);

// Attention first (offline, then the fullest disk/RAM), then by name.
const severity = (s) => {
  if (s.status === "offline") return 3;
  const peak = Math.max(s.report?.disk?.used_percent ?? 0, s.report?.memory?.used_percent ?? 0);
  if (peak >= 90) return 2 + peak / 1000;
  if (sslWarnings(s) > 0) return 1.5;
  if (s.status === "pending" || !s.report) return 1;
  return 0;
};
const visibleServers = computed(() =>
  servers.value
    .filter((s) => (list.show === "attention" ? needsAttention(s) : list.show === "online" ? s.status === "online" : true))
    .slice()
    .sort((a, b) => severity(b) - severity(a) || String(a.name).localeCompare(String(b.name)))
);

const cpuPercent = (server) => server.report?.cpu?.usage_percent ?? null;

// ===== Add / edit =====
const formOpen = ref(false);
const editing = ref(null);
const form = ref({ name: "", ip_address: "", description: "" });
const formErrors = ref({});
const saving = ref(false);

const openAdd = () => {
  editing.value = null;
  form.value = { name: "", ip_address: "", description: "" };
  formErrors.value = {};
  formOpen.value = true;
};

const openEdit = (server) => {
  editing.value = server;
  form.value = { name: server.name, ip_address: server.ip_address ?? "", description: server.description ?? "" };
  formErrors.value = {};
  formOpen.value = true;
};

const submitForm = async () => {
  saving.value = true;
  formErrors.value = {};
  const payload = { ...form.value, ip_address: form.value.ip_address.trim() || null, description: form.value.description.trim() || null };
  try {
    if (editing.value) {
      await store.updateServer(editing.value.id, payload);
    } else {
      const result = await store.addServer(payload);
      showInstall(result, false);
    }
    formOpen.value = false;
  } catch (e) {
    if (e?.response?.status === 422) formErrors.value = e.response.data.errors ?? {};
    else await alertModal.alert(errorMessage(e, t("servers.errors.save")), { type: "danger" });
  } finally {
    saving.value = false;
  }
};

// ===== Install command (shown once, right after it's issued) =====
const install = ref(null);
const copied = ref("");

const showInstall = (result, regenerated) => (install.value = { ...result, regenerated });

const copy = async (text, key) => {
  await copyText(text);
  copied.value = key;
  setTimeout(() => (copied.value = ""), 1800);
};

const regenerate = async (server) => {
  const ok = await alertModal.confirm(
    t("servers.confirm.regenerate", { name: server.name }),
    { type: "warning", confirmText: t("servers.actions.regenerate") }
  );
  if (!ok) return;
  try {
    showInstall(await store.regenerateToken(server.id), true);
  } catch (e) {
    await alertModal.alert(errorMessage(e, t("servers.errors.regenerate")), { type: "danger" });
  }
};

const remove = async (server) => {
  const ok = await alertModal.confirm(
    t("servers.confirm.remove", { name: server.name, command: "sudo /usr/local/bin/hris-server-agent --uninstall" }),
    { type: "danger", confirmText: t("common.actions.delete") }
  );
  if (!ok) return;
  try {
    await store.removeServer(server.id);
    if (detailId.value === server.id) detailId.value = null;
  } catch (e) {
    await alertModal.alert(errorMessage(e, t("servers.errors.remove")), { type: "danger" });
  }
};

// ===== Presentation helpers (tokens) =====
const STATUS_TONE = { online: "ok", offline: "bad", pending: "warn" };
// Same thresholds as usageLevel() in utils/serverMetrics: 90%+ critical,
// 75-90% attention, below that fine; no value -> neutral.
const usageTone = (pct) => (pct === null || pct === undefined ? "neutral" : pct >= 90 ? "bad" : pct >= 75 ? "warn" : "ok");
const TONE_BAR = { ok: "bg-ui-ok", warn: "bg-ui-warn", bad: "bg-ui-bad", neutral: "bg-ui-faint" };
const TONE_TEXT = { ok: "text-ui-ink", warn: "text-ui-warn", bad: "text-ui-bad", neutral: "text-ui-muted" };
const field =
  "w-full bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control px-3 transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";

// ===== Detail =====
// Keep only the id: the drawer always shows the store's current server, so
// polling and edits update an open detail too.
const detailId = ref(null);
const detail = computed(() => servers.value.find((s) => s.id === detailId.value) || null);
const detailOpen = computed({
  get: () => !!detail.value,
  set: (v) => {
    if (!v) detailId.value = null;
  },
});
const openDetail = (server) => (detailId.value = server.id);
const detailIndex = computed(() => visibleServers.value.findIndex((s) => s.id === detailId.value));
const step = (delta) => {
  const next = visibleServers.value[detailIndex.value + delta];
  if (next) detailId.value = next.id;
};
</script>

<template>
  <div class="space-y-5">
    <!-- Summary -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 ui-stagger">
      <UiStat label="VPS" :value="summary.total" :icon="Server" :loading="loading && !loaded" :selectable="!!list.show" @select="list.show = ''" />
      <UiStat
        :label="$t('servers.status.online')"
        :value="summary.online"
        :icon="Activity"
        tone="ok"
        :loading="loading && !loaded"
        selectable
        :active="list.show === 'online'"
        @select="toggleShow('online')"
      />
      <UiStat
        class="col-span-2 lg:col-span-1"
        :label="$t('servers.stats.attention')"
        :value="summary.attention"
        :icon="AlertTriangle"
        :tone="summary.attention ? 'bad' : ''"
        :hint="list.show === 'attention' ? $t('servers.filter.showingAttention') : summary.attention ? $t('servers.filter.tapToFilter') : ''"
        :loading="loading && !loaded"
        selectable
        :active="list.show === 'attention'"
        @select="toggleShow('attention')"
      />
    </div>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-ui-line">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <h3 class="text-ui-h3 text-ui-ink">VPS</h3>
          <UiBadge tone="neutral">{{ summary.total }}</UiBadge>
          <UiBadge tone="ok" dot>{{ $t("servers.toolbar.online", { n: summary.online }) }}</UiBadge>
          <UiBadge v-if="summary.attention" tone="bad" dot>{{ $t("servers.toolbar.attention", { n: summary.attention }) }}</UiBadge>
          <button
            v-if="list.show"
            type="button"
            class="ui-press inline-flex items-center gap-1 h-6 px-2 rounded-full border border-ui-accent text-ui-cap font-medium text-ui-accent hover:bg-ui-hover"
            @click="list.show = ''"
          >
            {{ list.show === "attention" ? $t("servers.filter.attention") : $t("servers.status.online") }}
            <X class="w-3 h-3" aria-hidden="true" /><span class="sr-only">{{ $t("servers.filter.clear") }}</span>
          </button>
        </div>
        <div class="grid grid-cols-2 sm:flex gap-2">
          <UiButton variant="secondary" :icon="RefreshCw" :loading="loading" @click="store.fetchServers()">{{ $t("common.actions.refresh") }}</UiButton>
          <UiButton v-if="canManage" :icon="Plus" @click="openAdd">{{ $t("servers.add") }}</UiButton>
        </div>
      </div>

      <div class="p-4 sm:p-5">
        <UiAlert v-if="error" tone="bad" :title="error" class="mb-4" />

        <UiSpinner v-if="loading && !loaded" />

        <!-- Empty -->
        <UiEmpty
          v-else-if="loaded && servers.length === 0"
          :icon="Server"
:title="$t('servers.empty.title')"
          :message="$t('servers.empty.message')"
        >
          <UiButton v-if="canManage" variant="secondary" :icon="Plus" @click="openAdd">{{ $t("servers.empty.addFirst") }}</UiButton>
        </UiEmpty>

        <!-- Filter matches nothing -->
        <UiEmpty
          v-else-if="loaded && visibleServers.length === 0"
          compact
          :icon="list.show === 'attention' ? CheckCircle2 : Server"
          :title="list.show === 'attention' ? $t('servers.filter.noneNeedAttention') : $t('servers.filter.noneMatch')"
        >
          <UiButton variant="secondary" size="sm" @click="list.show = ''">{{ $t("servers.filter.showAll") }}</UiButton>
        </UiEmpty>

        <!-- Cards (attention first) -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 ui-stagger">
          <button
            v-for="server in visibleServers"
            :key="server.id"
            type="button"
            class="ui-lift flex flex-col text-left bg-ui-surface border rounded-ui-card p-4 hover:border-ui-line-strong focus:outline-none focus-visible:shadow-ui-focus min-w-0"
            :class="needsAttention(server) ? 'border-ui-bad/40' : 'border-ui-line'"
            @click="openDetail(server)"
          >
            <div class="w-full flex items-start justify-between gap-2 mb-3.5">
              <div class="min-w-0">
                <p class="text-ui-h3 text-ui-ink truncate">{{ server.name }}</p>
                <p class="font-mono text-ui-cap text-ui-muted truncate mt-0.5">{{ server.ip_address || $t("servers.noIp") }}</p>
                <p v-if="server.report?.os" class="text-ui-cap text-ui-muted truncate">{{ server.report.os }}</p>
              </div>
              <UiBadge :tone="STATUS_TONE[server.status]" dot class="whitespace-nowrap">{{ STATUS[server.status].label }}</UiBadge>
            </div>

            <template v-if="server.report">
              <div class="w-full space-y-2.5 mb-3.5">
                <div v-for="m in [
                  { key: 'disk', label: 'Disk', icon: HardDrive, pct: server.report.disk.used_percent, text: `${formatBytes(server.report.disk.used)} / ${formatBytes(server.report.disk.total)}` },
                  { key: 'ram', label: 'RAM', icon: MemoryStick, pct: server.report.memory.used_percent, text: `${formatBytes(server.report.memory.used)} / ${formatBytes(server.report.memory.total)}` },
                  { key: 'cpu', label: 'CPU', icon: Cpu, pct: cpuPercent(server), text: $t('servers.metrics.coresLoad', { cores: server.report.cpu.cores, load: server.report.cpu.load1 }) },
                ]" :key="m.key">
                  <div class="flex items-center justify-between gap-2 text-ui-cap mb-1">
                    <span class="inline-flex items-center gap-1 text-ui-muted font-medium"><component :is="m.icon" class="w-3.5 h-3.5" /> {{ m.label }}</span>
                    <span class="text-ui-muted tabular-nums truncate">{{ m.text }} · <strong class="font-semibold" :class="TONE_TEXT[usageTone(m.pct)]">{{ m.pct ?? "-" }}%</strong></span>
                  </div>
                  <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden">
                    <div class="h-full rounded-full" :class="TONE_BAR[usageTone(m.pct)]" :style="{ width: `${Math.min(m.pct || 0, 100)}%` }"></div>
                  </div>
                </div>
              </div>
            </template>
            <p v-else class="mb-3.5 text-ui-cap text-ui-warn bg-ui-warn-soft rounded-ui-control p-2.5">
              {{ $t("servers.card.noReport") }}
            </p>

            <div class="w-full flex items-center justify-between gap-2 mt-auto pt-3 border-t border-ui-line text-ui-cap text-ui-muted">
              <span>
                {{ $t("servers.card.lastReport", { time: ago(server.last_report_at) }) }}
                <template v-if="server.report?.sites"> · <Globe class="w-3 h-3 inline -mt-0.5" /> {{ $t("servers.card.websites", { n: siteCount(server) }, siteCount(server)) }}</template>
                <span v-if="sslWarnings(server)" class="text-ui-bad font-medium"> · {{ $t("servers.card.sslExpiring", { n: sslWarnings(server) }) }}</span>
              </span>
              <ChevronRight class="w-4 h-4 shrink-0 text-ui-faint" />
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- Add / edit modal -->
    <UiModal v-model:open="formOpen" :title="editing ? $t('servers.edit') : $t('servers.add')" size="sm" :z-index="120">
      <form id="vps-form" class="space-y-4" @submit.prevent="submitForm">
        <div>
          <label for="vps-name" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("servers.form.name") }} <span class="text-ui-bad">*</span></label>
          <input id="vps-name" v-model="form.name" :class="[field, 'h-[38px]']" maxlength="100" :placeholder="$t('servers.form.namePlaceholder')" required />
          <p v-if="formErrors.name" class="text-ui-bad text-ui-cap mt-1.5">{{ formErrors.name[0] }}</p>
        </div>
        <div>
          <label for="vps-ip" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("servers.form.ip") }}</label>
          <input id="vps-ip" v-model="form.ip_address" :class="[field, 'h-[38px] font-mono text-ui-small']" maxlength="64" :placeholder="$t('servers.form.ipPlaceholder')" />
        </div>
        <div>
          <label for="vps-desc" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("servers.form.description") }}</label>
          <textarea id="vps-desc" v-model="form.description" :class="[field, 'py-2.5 resize-y']" rows="2" maxlength="500" :placeholder="$t('servers.form.descriptionPlaceholder')"></textarea>
        </div>
        <p v-if="!editing" class="text-ui-cap text-ui-muted">{{ $t("servers.form.afterSaveHint") }}</p>
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="formOpen = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="vps-form" class="flex-1 sm:flex-none" :loading="saving">{{ editing ? $t("common.actions.save") : $t("servers.form.saveAndShow") }}</UiButton>
      </template>
    </UiModal>

    <!-- Install command modal (shown once: only "Selesai" closes it) -->
    <UiModal
      :open="!!install"
      persistent
      size="lg"
      :z-index="130"
      :title="install ? $t('servers.install.title', { name: install.server.name }) : ''"
      :description="install ? (install.regenerated ? $t('servers.install.descRegenerated') : $t('servers.install.descAdded')) : ''"
    >
      <div v-if="install" class="space-y-4 text-ui-small text-ui-text">
        <ol class="space-y-1.5 list-decimal pl-5">
          <i18n-t keypath="servers.install.step1" tag="li" scope="global">
            <template #sudo><code class="font-mono text-ui-cap text-ui-ink">sudo</code></template>
          </i18n-t>
          <li>{{ $t("servers.install.step2") }}</li>
        </ol>
        <div class="relative">
          <pre class="bg-ui-ink text-white font-mono text-ui-cap rounded-ui-control p-3.5 pr-24 whitespace-pre-wrap break-all">{{ install.install_command }}</pre>
          <button
            type="button"
            class="absolute top-2 right-2 rounded-[6px] bg-white/10 hover:bg-white/20 text-white text-ui-cap font-medium px-2.5 py-1.5 inline-flex items-center gap-1"
            @click="copy(install.install_command, 'install')"
          >
            <Check v-if="copied === 'install'" class="w-3.5 h-3.5" /><Copy v-else class="w-3.5 h-3.5" />
            {{ copied === "install" ? $t("common.actions.copied") : $t("common.actions.copy") }}
          </button>
        </div>
        <ol start="3" class="space-y-1.5 list-decimal pl-5">
          <i18n-t keypath="servers.install.step3" tag="li" scope="global">
            <template #done><em>"{{ $t("servers.install.doneWord") }}"</em></template>
          </i18n-t>
          <i18n-t keypath="servers.install.step4" tag="li" scope="global">
            <template #online><strong>{{ $t("servers.status.online") }}</strong></template>
          </i18n-t>
        </ol>
        <UiAlert tone="warn">
          <i18n-t keypath="servers.install.secretWarning" tag="span" scope="global">
            <template #once><strong>{{ $t("servers.install.shownOnce") }}</strong></template>
            <template #regenerate><strong>{{ $t("servers.actions.regenerate") }}</strong></template>
          </i18n-t>
        </UiAlert>
        <div class="text-ui-cap text-ui-muted">
          <i18n-t keypath="servers.install.requirements" tag="span" scope="global">
            <template #python><code class="font-mono text-ui-ink">python3</code></template>
            <template #curl><code class="font-mono text-ui-ink">curl</code></template>
            <template #cron><code class="font-mono text-ui-ink">cron</code></template>
          </i18n-t>{{ " " }}
          <code class="font-mono text-ui-ink break-all">{{ install.uninstall_command }}</code>
        </div>
      </div>
      <template #footer>
        <UiButton class="flex-1 sm:flex-none" @click="install = null">{{ $t("common.actions.done") }}</UiButton>
      </template>
    </UiModal>

    <!-- Detail drawer: follows the store, so polling/edits keep it current -->
    <UiDrawer
      v-model:open="detailOpen"
      size="lg"
      :title="detail?.name || ''"
      :has-prev="detailIndex > 0"
      :has-next="detailIndex > -1 && detailIndex < visibleServers.length - 1"
      @prev="step(-1)"
      @next="step(1)"
    >
      <template #header>
        <div v-if="detail" class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <h2 class="text-ui-h2 text-ui-ink truncate">{{ detail.name }}</h2>
            <UiBadge :tone="STATUS_TONE[detail.status]" dot class="shrink-0">{{ STATUS[detail.status].label }}</UiBadge>
          </div>
          <p class="text-ui-cap text-ui-muted mt-0.5">
            <span class="font-mono">{{ detail.ip_address || $t("servers.noIp") }}</span><template v-if="detail.report?.hostname"> · <span class="font-mono">{{ detail.report.hostname }}</span></template>
            · {{ $t("servers.card.lastReport", { time: ago(detail.last_report_at) }) }}
          </p>
          <p v-if="detail.description" class="text-ui-cap text-ui-muted mt-1">{{ detail.description }}</p>
        </div>
      </template>

      <div v-if="detail" class="space-y-5">
        <template v-if="detail.report">
          <VpsReportDetails :server="detail" />
        </template>
        <UiAlert v-else tone="warn">
          {{ $t("servers.detail.neverReported") }}
          <template v-if="canManage"> <i18n-t keypath="servers.detail.lostCommand" tag="span" scope="global"><template #regenerate><strong>{{ $t("servers.actions.regenerate") }}</strong></template></i18n-t></template>
        </UiAlert>
      </div>

      <template v-if="canManage && detail" #footer>
        <div class="flex flex-wrap gap-2 justify-between w-full">
          <div class="flex flex-wrap gap-2">
            <UiButton variant="secondary" size="sm" :icon="Pencil" @click="openEdit(detail)">{{ $t("common.actions.edit") }}</UiButton>
            <UiButton variant="secondary" size="sm" :icon="KeyRound" @click="regenerate(detail)">{{ $t("servers.actions.regenerate") }}</UiButton>
            <UiButton
              variant="secondary"
              size="sm"
              :icon="copied === 'uninstall' ? Check : Terminal"
              @click="copy('sudo /usr/local/bin/hris-server-agent --uninstall', 'uninstall')"
            >
              {{ copied === "uninstall" ? $t("common.actions.copied") : $t("servers.actions.copyUninstall") }}
            </UiButton>
          </div>
          <UiButton variant="danger" size="sm" :icon="Trash2" @click="remove(detail)">{{ $t("common.actions.delete") }}</UiButton>
        </div>
      </template>
    </UiDrawer>
  </div>
</template>
