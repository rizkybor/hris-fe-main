<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
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
} from "lucide-vue-next";
import { UiStat, UiButton, UiBadge, UiModal, UiAlert, UiEmpty, UiSpinner } from "@/components/ui";
import VpsReportDetails from "@/components/admin/server-storage/VpsReportDetails.vue";
import { useServerMonitorStore } from "@/stores/serverMonitor";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { formatBytes, STATUS, timeAgo, sslState, copyText } from "@/utils/serverMetrics";

const store = useServerMonitorStore();
const alertModal = useAlertModalStore();
const { servers, loading, loaded, error } = storeToRefs(store);
const canManage = computed(() => can("server-storage-manage"));

// Agents report every 5 minutes; refresh the cards every minute while open.
let timer;
onMounted(() => {
  store.fetchServers();
  timer = setInterval(() => store.fetchServers({ silent: true }), 60000);
});
onBeforeUnmount(() => clearInterval(timer));

// Re-render "x menit lalu" labels between refreshes.
const now = ref(Date.now());
const clock = setInterval(() => (now.value = Date.now()), 30000);
onBeforeUnmount(() => clearInterval(clock));
const ago = (value) => (now.value, timeAgo(value));

// Sites whose certificate expires within 14 days (or already has).
const sslWarnings = (server) => (server.report?.sites || []).filter((site) => site.ssl && sslState(site).days < 14).length;
const siteCount = (server) => (server.report?.sites || []).filter((site) => !site.unlinked).length;

const summary = computed(() => ({
  total: servers.value.length,
  online: servers.value.filter((s) => s.status === "online").length,
  attention: servers.value.filter(
    (s) =>
      s.status === "offline" ||
      (s.report && (s.report.disk.used_percent >= 90 || s.report.memory.used_percent >= 90)) ||
      sslWarnings(s) > 0
  ).length,
}));

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
      if (detail.value?.id === editing.value.id) detail.value = servers.value.find((s) => s.id === editing.value.id);
    } else {
      const result = await store.addServer(payload);
      showInstall(result, false);
    }
    formOpen.value = false;
  } catch (e) {
    if (e?.response?.status === 422) formErrors.value = e.response.data.errors ?? {};
    else await alertModal.alert(errorMessage(e, "VPS gagal disimpan."), { type: "danger" });
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
    `Buat token baru untuk "${server.name}"? Token lama langsung berhenti berlaku, jadi agen di VPS ini harus dipasang ulang dengan perintah baru.`,
    { type: "warning", confirmText: "Buat token baru" }
  );
  if (!ok) return;
  try {
    showInstall(await store.regenerateToken(server.id), true);
  } catch (e) {
    await alertModal.alert(errorMessage(e, "Token gagal dibuat ulang."), { type: "danger" });
  }
};

const remove = async (server) => {
  const ok = await alertModal.confirm(
    `Hapus "${server.name}" dari pemantauan? Laporan dari VPS ini tidak akan diterima lagi. Untuk membersihkan agen di VPS, jalankan: sudo /usr/local/bin/hris-server-agent --uninstall`,
    { type: "danger", confirmText: "Hapus" }
  );
  if (!ok) return;
  try {
    await store.removeServer(server.id);
    detail.value = null;
  } catch (e) {
    await alertModal.alert(errorMessage(e, "VPS gagal dihapus."), { type: "danger" });
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
const detail = ref(null);
const openDetail = (server) => (detail.value = server);
</script>

<template>
  <div class="space-y-5">
    <!-- Summary -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 ui-stagger">
      <UiStat label="VPS" :value="summary.total" :icon="Server" :loading="loading && !loaded" />
      <UiStat label="Online" :value="summary.online" :icon="Activity" tone="ok" :loading="loading && !loaded" />
      <UiStat
        class="col-span-2 lg:col-span-1"
        label="Perlu perhatian"
        :value="summary.attention"
        :icon="AlertTriangle"
        :tone="summary.attention ? 'bad' : ''"
        :loading="loading && !loaded"
      />
    </div>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-ui-line">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <h3 class="text-ui-h3 text-ui-ink">VPS</h3>
          <UiBadge tone="neutral">{{ summary.total }}</UiBadge>
          <UiBadge tone="ok" dot>{{ summary.online }} online</UiBadge>
          <UiBadge v-if="summary.attention" tone="bad" dot>{{ summary.attention }} perlu perhatian</UiBadge>
        </div>
        <div class="grid grid-cols-2 sm:flex gap-2">
          <UiButton variant="secondary" :icon="RefreshCw" :loading="loading" @click="store.fetchServers()">Refresh</UiButton>
          <UiButton v-if="canManage" :icon="Plus" @click="openAdd">Tambah VPS</UiButton>
        </div>
      </div>

      <div class="p-4 sm:p-5">
        <UiAlert v-if="error" tone="bad" :title="error" class="mb-4" />

        <UiSpinner v-if="loading && !loaded" />

        <!-- Empty -->
        <UiEmpty
          v-else-if="loaded && servers.length === 0"
          :icon="Server"
          title="Belum ada VPS yang dipantau"
          message="Tambahkan VPS, lalu jalankan perintah instalasi yang diberikan di VPS tersebut. Agen akan melaporkan disk, RAM, dan CPU setiap 5 menit."
        >
          <UiButton v-if="canManage" variant="secondary" :icon="Plus" @click="openAdd">Tambah VPS pertama</UiButton>
        </UiEmpty>

        <!-- Cards -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 ui-stagger">
          <button
            v-for="server in servers"
            :key="server.id"
            type="button"
            class="ui-lift flex flex-col text-left bg-ui-surface border border-ui-line rounded-ui-card p-4 hover:border-ui-line-strong focus:outline-none focus-visible:shadow-ui-focus min-w-0"
            @click="openDetail(server)"
          >
            <div class="w-full flex items-start justify-between gap-2 mb-3.5">
              <div class="min-w-0">
                <p class="text-ui-h3 text-ui-ink truncate">{{ server.name }}</p>
                <p class="font-mono text-ui-cap text-ui-muted truncate mt-0.5">{{ server.ip_address || "IP belum diisi" }}</p>
                <p v-if="server.report?.os" class="text-ui-cap text-ui-muted truncate">{{ server.report.os }}</p>
              </div>
              <UiBadge :tone="STATUS_TONE[server.status]" dot class="whitespace-nowrap">{{ STATUS[server.status].label }}</UiBadge>
            </div>

            <template v-if="server.report">
              <div class="w-full space-y-2.5 mb-3.5">
                <div v-for="m in [
                  { key: 'disk', label: 'Disk', icon: HardDrive, pct: server.report.disk.used_percent, text: `${formatBytes(server.report.disk.used)} / ${formatBytes(server.report.disk.total)}` },
                  { key: 'ram', label: 'RAM', icon: MemoryStick, pct: server.report.memory.used_percent, text: `${formatBytes(server.report.memory.used)} / ${formatBytes(server.report.memory.total)}` },
                  { key: 'cpu', label: 'CPU', icon: Cpu, pct: cpuPercent(server), text: `${server.report.cpu.cores} core · load ${server.report.cpu.load1}` },
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
              Belum ada laporan. Jalankan perintah instalasi agen di VPS ini.
            </p>

            <div class="w-full flex items-center justify-between gap-2 mt-auto pt-3 border-t border-ui-line text-ui-cap text-ui-muted">
              <span>
                Laporan terakhir: {{ ago(server.last_report_at) }}
                <template v-if="server.report?.sites"> · <Globe class="w-3 h-3 inline -mt-0.5" /> {{ siteCount(server) }} website</template>
                <span v-if="sslWarnings(server)" class="text-ui-bad font-medium"> · {{ sslWarnings(server) }} SSL hampir habis</span>
              </span>
              <ChevronRight class="w-4 h-4 shrink-0 text-ui-faint" />
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- Add / edit modal -->
    <UiModal v-model:open="formOpen" :title="editing ? 'Ubah VPS' : 'Tambah VPS'" size="sm" :z-index="120">
      <form id="vps-form" class="space-y-4" @submit.prevent="submitForm">
        <div>
          <label for="vps-name" class="block text-ui-small font-medium text-ui-ink mb-1.5">Nama VPS <span class="text-ui-bad">*</span></label>
          <input id="vps-name" v-model="form.name" :class="[field, 'h-[38px]']" maxlength="100" placeholder="cth. VPS Produksi HRIS" required />
          <p v-if="formErrors.name" class="text-ui-bad text-ui-cap mt-1.5">{{ formErrors.name[0] }}</p>
        </div>
        <div>
          <label for="vps-ip" class="block text-ui-small font-medium text-ui-ink mb-1.5">IP Address</label>
          <input id="vps-ip" v-model="form.ip_address" :class="[field, 'h-[38px] font-mono text-ui-small']" maxlength="64" placeholder="cth. 103.10.20.30" />
        </div>
        <div>
          <label for="vps-desc" class="block text-ui-small font-medium text-ui-ink mb-1.5">Keterangan</label>
          <textarea id="vps-desc" v-model="form.description" :class="[field, 'py-2.5 resize-y']" rows="2" maxlength="500" placeholder="cth. Hosting website klien, provider IDCloudHost"></textarea>
        </div>
        <p v-if="!editing" class="text-ui-cap text-ui-muted">Setelah disimpan, Anda akan mendapat perintah instalasi agen untuk dijalankan di VPS ini.</p>
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="formOpen = false">Batal</UiButton>
        <UiButton type="submit" form="vps-form" class="flex-1 sm:flex-none" :loading="saving">{{ editing ? "Simpan" : "Simpan & Lihat Perintah" }}</UiButton>
      </template>
    </UiModal>

    <!-- Install command modal (shown once: only "Selesai" closes it) -->
    <UiModal
      :open="!!install"
      persistent
      size="lg"
      :z-index="130"
      :title="install ? `Pasang Agen di ${install.server.name}` : ''"
      :description="install ? (install.regenerated ? 'Token baru dibuat. Pasang ulang agen dengan perintah di bawah.' : 'VPS ditambahkan. Pasang agen dengan perintah di bawah.') : ''"
    >
      <div v-if="install" class="space-y-4 text-ui-small text-ui-text">
        <ol class="space-y-1.5 list-decimal pl-5">
          <li>Masuk ke VPS lewat SSH dengan user yang punya akses <code class="font-mono text-ui-cap text-ui-ink">sudo</code>.</li>
          <li>Salin dan jalankan perintah berikut (sekali saja):</li>
        </ol>
        <div class="relative">
          <pre class="bg-ui-ink text-white font-mono text-ui-cap rounded-ui-control p-3.5 pr-24 whitespace-pre-wrap break-all">{{ install.install_command }}</pre>
          <button
            type="button"
            class="absolute top-2 right-2 rounded-[6px] bg-white/10 hover:bg-white/20 text-white text-ui-cap font-medium px-2.5 py-1.5 inline-flex items-center gap-1"
            @click="copy(install.install_command, 'install')"
          >
            <Check v-if="copied === 'install'" class="w-3.5 h-3.5" /><Copy v-else class="w-3.5 h-3.5" />
            {{ copied === "install" ? "Tersalin" : "Salin" }}
          </button>
        </div>
        <ol start="3" class="space-y-1.5 list-decimal pl-5">
          <li>Tunggu sampai muncul <em>"Selesai"</em>. Laporan pertama bisa memakan 1–2 menit karena ukuran folder diukur dulu.</li>
          <li>Kartu VPS ini akan berubah menjadi <strong>Online</strong>, lalu diperbarui otomatis setiap 5 menit.</li>
        </ol>
        <UiAlert tone="warn">
          Perintah ini berisi token rahasia VPS ini dan <strong>hanya ditampilkan sekali</strong>. Jangan dibagikan. Kalau hilang, gunakan
          <strong>Buat token baru</strong> di rincian VPS.
        </UiAlert>
        <div class="text-ui-cap text-ui-muted">
          Persyaratan: Ubuntu dengan <code class="font-mono text-ui-ink">python3</code>, <code class="font-mono text-ui-ink">curl</code>, dan <code class="font-mono text-ui-ink">cron</code> (semuanya bawaan Ubuntu). Untuk mencopot agen:
          <code class="font-mono text-ui-ink break-all">{{ install.uninstall_command }}</code>
        </div>
      </div>
      <template #footer>
        <UiButton class="flex-1 sm:flex-none" @click="install = null">Selesai</UiButton>
      </template>
    </UiModal>

    <!-- Detail modal -->
    <UiModal :open="!!detail" size="lg" :z-index="100" @update:open="(v) => !v && (detail = null)">
      <template #header>
        <div v-if="detail" class="flex-1 min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <h2 class="text-ui-h2 text-ui-ink truncate">{{ detail.name }}</h2>
            <UiBadge :tone="STATUS_TONE[detail.status]" dot class="shrink-0">{{ STATUS[detail.status].label }}</UiBadge>
          </div>
          <p class="text-ui-cap text-ui-muted mt-0.5">
            <span class="font-mono">{{ detail.ip_address || "IP belum diisi" }}</span><template v-if="detail.report?.hostname"> · <span class="font-mono">{{ detail.report.hostname }}</span></template>
          </p>
          <p v-if="detail.description" class="text-ui-cap text-ui-muted mt-1">{{ detail.description }}</p>
        </div>
      </template>

      <div v-if="detail" class="space-y-5">
        <template v-if="detail.report">
          <VpsReportDetails :server="detail" />
        </template>
        <UiAlert v-else tone="warn">
          VPS ini belum pernah melapor. Pasang agen dengan perintah instalasi yang diberikan saat VPS ditambahkan.
          <template v-if="canManage"> Kalau perintahnya hilang, gunakan <strong>Buat token baru</strong> di bawah.</template>
        </UiAlert>
      </div>

      <template v-if="canManage && detail" #footer>
        <div class="flex flex-wrap gap-2 justify-between w-full">
          <div class="flex flex-wrap gap-2">
            <UiButton variant="secondary" size="sm" :icon="Pencil" @click="openEdit(detail)">Ubah</UiButton>
            <UiButton variant="secondary" size="sm" :icon="KeyRound" @click="regenerate(detail)">Buat token baru</UiButton>
            <UiButton
              variant="secondary"
              size="sm"
              :icon="copied === 'uninstall' ? Check : Terminal"
              @click="copy('sudo /usr/local/bin/hris-server-agent --uninstall', 'uninstall')"
            >
              {{ copied === "uninstall" ? "Tersalin" : "Salin perintah copot agen" }}
            </UiButton>
          </div>
          <UiButton variant="danger" size="sm" :icon="Trash2" @click="remove(detail)">Hapus</UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
