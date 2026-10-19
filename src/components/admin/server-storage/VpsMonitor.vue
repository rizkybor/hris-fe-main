<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  Server,
  Plus,
  RefreshCw,
  X,
  Copy,
  Check,
  Loader2,
  Terminal,
  Pencil,
  Trash2,
  KeyRound,
  HardDrive,
  MemoryStick,
  Cpu,
  ChevronRight,
  Globe,
} from "lucide-vue-next";
import VpsReportDetails from "@/components/admin/server-storage/VpsReportDetails.vue";
import { useServerMonitorStore } from "@/stores/serverMonitor";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { formatBytes, usageLevel, STATUS, timeAgo, sslState, copyText } from "@/utils/serverMetrics";

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

// ===== Detail =====
const detail = ref(null);
const openDetail = (server) => (detail.value = server);
</script>

<template>
  <div>
    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="px-2.5 py-1 rounded-lg bg-white border border-[#DCDEDD] text-brand-dark"><strong>{{ summary.total }}</strong> VPS</span>
        <span class="px-2.5 py-1 rounded-lg bg-green-50 text-green-700"><strong>{{ summary.online }}</strong> online</span>
        <span v-if="summary.attention" class="px-2.5 py-1 rounded-lg bg-red-50 text-red-600"><strong>{{ summary.attention }}</strong> perlu perhatian</span>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-[8px] border border-[#DCDEDD] bg-white hover:border-[#0C51D9] px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-50"
          :disabled="loading"
          @click="store.fetchServers()"
        >
          <RefreshCw class="w-4 h-4 text-brand-dark" :class="{ 'animate-spin': loading }" />
          <span class="text-brand-dark text-sm font-semibold">Refresh</span>
        </button>
        <button
          v-if="canManage"
          type="button"
          class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-3.5 py-2 flex items-center gap-1.5"
          @click="openAdd"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Tambah VPS</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-[12px] p-3.5 mb-4">{{ error }}</div>

    <div v-if="loading && !loaded" class="py-16 flex justify-center"><Loader2 class="w-6 h-6 text-[#0C51D9] animate-spin" /></div>

    <!-- Empty -->
    <div v-else-if="loaded && servers.length === 0" class="bg-white border border-dashed border-[#DCDEDD] rounded-[14px] p-10 text-center">
      <Server class="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
      <p class="text-brand-dark text-sm font-semibold">Belum ada VPS yang dipantau</p>
      <p class="text-brand-light text-xs mt-1 max-w-md mx-auto">
        Tambahkan VPS, lalu jalankan perintah instalasi yang diberikan di VPS tersebut. Agen akan melaporkan disk, RAM, dan CPU setiap 5 menit.
      </p>
      <button v-if="canManage" type="button" class="mt-4 text-sm font-semibold text-[#0C51D9] hover:underline" @click="openAdd">+ Tambah VPS pertama</button>
    </div>

    <!-- Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <button
        v-for="server in servers"
        :key="server.id"
        type="button"
        class="text-left bg-white border border-[#DCDEDD] rounded-[14px] p-4 hover:border-[#0C51D9] hover:shadow-sm transition-all"
        @click="openDetail(server)"
      >
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="min-w-0">
            <p class="text-brand-dark text-base font-bold truncate">{{ server.name }}</p>
            <p class="text-brand-light text-xs truncate">
              {{ server.ip_address || "IP belum diisi" }}<template v-if="server.report?.os"> · {{ server.report.os }}</template>
            </p>
          </div>
          <span class="px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1" :class="STATUS[server.status].class">
            <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: STATUS[server.status].dot }"></span>
            {{ STATUS[server.status].label }}
          </span>
        </div>

        <template v-if="server.report">
          <div class="space-y-2.5">
            <div v-for="m in [
              { key: 'disk', label: 'Disk', icon: HardDrive, pct: server.report.disk.used_percent, text: `${formatBytes(server.report.disk.used)} / ${formatBytes(server.report.disk.total)}` },
              { key: 'ram', label: 'RAM', icon: MemoryStick, pct: server.report.memory.used_percent, text: `${formatBytes(server.report.memory.used)} / ${formatBytes(server.report.memory.total)}` },
              { key: 'cpu', label: 'CPU', icon: Cpu, pct: cpuPercent(server), text: `${server.report.cpu.cores} core · load ${server.report.cpu.load1}` },
            ]" :key="m.key">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="inline-flex items-center gap-1 text-brand-light font-medium"><component :is="m.icon" class="w-3.5 h-3.5" /> {{ m.label }}</span>
                <span class="text-brand-light">{{ m.text }} · <strong :class="usageLevel(m.pct).text">{{ m.pct ?? "-" }}%</strong></span>
              </div>
              <div class="w-full bg-gray-100 rounded-full overflow-hidden" style="height: 7px">
                <div class="h-full rounded-full" :style="{ width: `${Math.min(m.pct || 0, 100)}%`, backgroundColor: usageLevel(m.pct).color }"></div>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="text-xs text-brand-light bg-amber-50/60 rounded-lg p-2.5">
          Belum ada laporan. Jalankan perintah instalasi agen di VPS ini.
        </p>

        <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-[#F1F1F1] text-xs text-brand-light">
          <span>
            Laporan terakhir: {{ ago(server.last_report_at) }}
            <template v-if="server.report?.sites"> · <Globe class="w-3 h-3 inline -mt-0.5" /> {{ siteCount(server) }} website</template>
            <span v-if="sslWarnings(server)" class="text-red-600 font-semibold"> · {{ sslWarnings(server) }} SSL hampir habis</span>
          </span>
          <ChevronRight class="w-4 h-4 shrink-0" />
        </div>
      </button>
    </div>

    <!-- Add / edit modal -->
    <div v-if="formOpen" class="fixed inset-0 backdrop-blur-sm bg-black/30 z-[95] flex items-center justify-center p-3.5" @click.self="formOpen = false">
      <form class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-md overflow-hidden" @submit.prevent="submitForm">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-brand-dark text-base font-bold">{{ editing ? "Ubah VPS" : "Tambah VPS" }}</h3>
          <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" @click="formOpen = false"><X class="w-5 h-5" /></button>
        </div>
        <div class="p-5 space-y-3.5">
          <div>
            <label class="vm-label">Nama VPS <span class="text-red-500">*</span></label>
            <input v-model="form.name" class="vm-input" maxlength="100" placeholder="cth. VPS Produksi HRIS" required />
            <p v-if="formErrors.name" class="text-red-500 text-xs mt-1">{{ formErrors.name[0] }}</p>
          </div>
          <div>
            <label class="vm-label">IP Address</label>
            <input v-model="form.ip_address" class="vm-input" maxlength="64" placeholder="cth. 103.10.20.30" />
          </div>
          <div>
            <label class="vm-label">Keterangan</label>
            <textarea v-model="form.description" class="vm-input" rows="2" maxlength="500" placeholder="cth. Hosting website klien, provider IDCloudHost"></textarea>
          </div>
          <p v-if="!editing" class="text-xs text-brand-light">Setelah disimpan, Anda akan mendapat perintah instalasi agen untuk dijalankan di VPS ini.</p>
        </div>
        <div class="p-5 border-t border-[#DCDEDD] flex justify-end gap-2.5">
          <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-gray-50" @click="formOpen = false">Batal</button>
          <button type="submit" :disabled="saving" class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-4 py-2 flex items-center gap-1.5 disabled:opacity-60">
            <Loader2 v-if="saving" class="w-4 h-4 text-white animate-spin" />
            <span class="text-brand-white text-sm font-semibold">{{ editing ? "Simpan" : "Simpan & Lihat Perintah" }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Install command modal -->
    <div v-if="install" class="fixed inset-0 backdrop-blur-sm bg-black/30 z-[95] flex items-center justify-center p-3.5">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <div>
            <h3 class="text-brand-dark text-base font-bold">Pasang Agen di {{ install.server.name }}</h3>
            <p class="text-brand-light text-sm">{{ install.regenerated ? "Token baru dibuat. Pasang ulang agen dengan perintah di bawah." : "VPS ditambahkan. Pasang agen dengan perintah di bawah." }}</p>
          </div>
          <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" @click="install = null"><X class="w-5 h-5" /></button>
        </div>
        <div class="p-5 space-y-4 overflow-y-auto text-sm text-brand-dark">
          <ol class="space-y-1.5 list-decimal pl-5">
            <li>Masuk ke VPS lewat SSH dengan user yang punya akses <code>sudo</code>.</li>
            <li>Salin dan jalankan perintah berikut (sekali saja):</li>
          </ol>
          <div class="relative">
            <pre class="bg-slate-900 text-slate-100 text-xs rounded-[10px] p-3.5 pr-24 whitespace-pre-wrap break-all">{{ install.install_command }}</pre>
            <button type="button" class="absolute top-2 right-2 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-2.5 py-1.5 inline-flex items-center gap-1" @click="copy(install.install_command, 'install')">
              <Check v-if="copied === 'install'" class="w-3.5 h-3.5" /><Copy v-else class="w-3.5 h-3.5" />
              {{ copied === "install" ? "Tersalin" : "Salin" }}
            </button>
          </div>
          <ol start="3" class="space-y-1.5 list-decimal pl-5">
            <li>Tunggu sampai muncul <em>"Selesai"</em>. Laporan pertama bisa memakan 1–2 menit karena ukuran folder diukur dulu.</li>
            <li>Kartu VPS ini akan berubah menjadi <strong>Online</strong>, lalu diperbarui otomatis setiap 5 menit.</li>
          </ol>
          <div class="bg-amber-50 border border-amber-200 rounded-[10px] p-3 text-xs text-amber-800">
            Perintah ini berisi token rahasia VPS ini dan <strong>hanya ditampilkan sekali</strong>. Jangan dibagikan. Kalau hilang, gunakan
            <strong>Buat token baru</strong> di rincian VPS.
          </div>
          <div class="text-xs text-brand-light">
            Persyaratan: Ubuntu dengan <code>python3</code>, <code>curl</code>, dan <code>cron</code> (semuanya bawaan Ubuntu). Untuk mencopot agen:
            <code class="text-brand-dark">{{ install.uninstall_command }}</code>
          </div>
        </div>
        <div class="p-5 border-t border-[#DCDEDD] flex justify-end">
          <button type="button" class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-4 py-2" @click="install = null">
            <span class="text-brand-white text-sm font-semibold">Selesai</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Detail modal -->
    <div v-if="detail" class="fixed inset-0 backdrop-blur-sm bg-black/30 z-[90] flex items-center justify-center p-3.5" @click.self="detail = null">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-5 border-b border-[#DCDEDD] flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-brand-dark text-base font-bold truncate">{{ detail.name }}</h3>
              <span class="px-2 py-0.5 rounded-md text-xs font-semibold" :class="STATUS[detail.status].class">{{ STATUS[detail.status].label }}</span>
            </div>
            <p class="text-brand-light text-xs mt-0.5">
              {{ detail.ip_address || "IP belum diisi" }}<template v-if="detail.report?.hostname"> · {{ detail.report.hostname }}</template>
            </p>
            <p v-if="detail.description" class="text-brand-light text-xs mt-1">{{ detail.description }}</p>
          </div>
          <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0" @click="detail = null"><X class="w-5 h-5" /></button>
        </div>

        <div class="p-5 overflow-y-auto space-y-5">
          <template v-if="detail.report">
            <VpsReportDetails :server="detail" />
          </template>
          <div v-else class="bg-amber-50 border border-amber-200 rounded-[10px] p-4 text-sm text-amber-800">
            VPS ini belum pernah melapor. Pasang agen dengan perintah instalasi yang diberikan saat VPS ditambahkan.
            <template v-if="canManage"> Kalau perintahnya hilang, gunakan <strong>Buat token baru</strong> di bawah.</template>
          </div>
        </div>

        <div v-if="canManage" class="p-4 border-t border-[#DCDEDD] flex flex-wrap gap-2 justify-between">
          <div class="flex flex-wrap gap-2">
            <button type="button" class="vm-btn" @click="openEdit(detail)"><Pencil class="w-4 h-4" /> Ubah</button>
            <button type="button" class="vm-btn" @click="regenerate(detail)"><KeyRound class="w-4 h-4" /> Buat token baru</button>
            <button type="button" class="vm-btn" @click="copy('sudo /usr/local/bin/hris-server-agent --uninstall', 'uninstall')">
              <Check v-if="copied === 'uninstall'" class="w-4 h-4 text-green-600" /><Terminal v-else class="w-4 h-4" />
              {{ copied === "uninstall" ? "Tersalin" : "Salin perintah copot agen" }}
            </button>
          </div>
          <button type="button" class="vm-btn vm-btn--danger" @click="remove(detail)"><Trash2 class="w-4 h-4" /> Hapus</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vm-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}
.vm-input {
  width: 100%;
  border: 1px solid #dcdedd;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 14px;
  color: #0f172a;
  outline: none;
}
.vm-input:focus {
  border-color: #0c51d9;
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
.vm-btn--danger {
  color: #dc2626;
  border-color: #fecaca;
}
.vm-btn--danger:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
</style>
