<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { X, Link2, Copy, Check, Loader2, Mail, MessageCircle, Eye, Ban, ExternalLink } from "lucide-vue-next";
import { useProposalStore } from "@/stores/proposal";
import { useAlertModalStore } from "@/stores/alertModal";
import { errorMessage } from "@/helpers/errorHelper";
import { buildWhatsAppMessage, normalizeWhatsAppNumber } from "@/utils/proposalShareMessage";

const props = defineProps({
  proposalId: { type: [Number, String], required: true },
});
const emit = defineEmits(["close", "updated"]);

const store = useProposalStore();
const alertModal = useAlertModalStore();

const proposal = ref(null);
const loading = ref(true);
const busy = ref("");
const copied = ref(false);
const tab = ref("email");

const EXPIRY_OPTIONS = [
  { value: "", label: "Tanpa batas waktu" },
  { value: 7, label: "7 hari" },
  { value: 14, label: "14 hari" },
  { value: 30, label: "30 hari" },
];
const expiry = ref(30);

const share = computed(() => proposal.value?.share ?? { active: false });

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null;

// ----- Email / WhatsApp forms, prefilled from the client record -----
const email = ref({ recipient_name: "", to: "", cc: "", message: "" });
const wa = ref({ recipient_name: "", phone: "", message: "" });
let waMessageEdited = false;

const LINK_PLACEHOLDER = "{link}";

const refreshWaMessage = () => {
  if (waMessageEdited || !proposal.value) return;
  wa.value.message = buildWhatsAppMessage({
    proposal: proposal.value,
    url: share.value.active ? share.value.url : LINK_PLACEHOLDER,
    recipientName: wa.value.recipient_name,
  });
};

const load = async () => {
  loading.value = true;
  try {
    proposal.value = await store.fetchProposal(props.proposalId);
    const client = proposal.value.client ?? {};
    email.value = { recipient_name: client.pic_name ?? "", to: client.email ?? "", cc: "", message: "" };
    wa.value = { recipient_name: client.pic_name ?? "", phone: client.pic_phone ?? "", message: "" };
    waMessageEdited = false;
    refreshWaMessage();
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Proposal tidak bisa dimuat."), { type: "danger" });
    emit("close");
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(() => wa.value.recipient_name, refreshWaMessage);

const applyResult = (updated) => {
  proposal.value = updated;
  emit("updated", updated);
  refreshWaMessage();
};

// ----- Link -----
const createLink = async () => {
  busy.value = "link";
  try {
    applyResult(await store.shareProposal(props.proposalId, expiry.value || null));
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Link gagal dibuat."), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const disableLink = async () => {
  const ok = await alertModal.confirm(
    "Nonaktifkan link ini? Siapa pun yang sudah menerima link tidak akan bisa membukanya lagi. Membuat link lagi nanti akan menghasilkan alamat baru.",
    { type: "danger", confirmText: "Nonaktifkan" }
  );
  if (!ok) return;
  busy.value = "disable";
  try {
    applyResult(await store.unshareProposal(props.proposalId));
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Link gagal dinonaktifkan."), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(share.value.url);
  } catch {
    const input = document.getElementById("proposal-share-url");
    input?.select();
    document.execCommand("copy");
  }
  copied.value = true;
  setTimeout(() => (copied.value = false), 1800);
};

// ----- Email -----
const sendEmail = async () => {
  const cc = email.value.cc
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  busy.value = "email";
  try {
    const updated = await store.shareByEmail(props.proposalId, {
      to: email.value.to.trim(),
      cc,
      recipient_name: email.value.recipient_name.trim() || null,
      message: email.value.message.trim() || null,
      ...(share.value.active ? {} : { expires_in_days: expiry.value || null }),
    });
    applyResult(updated);
    await alertModal.alert(`Proposal terkirim ke ${email.value.to.trim()}.`, { type: "success" });
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Email gagal dikirim."), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

// ----- WhatsApp -----
const waNumber = computed(() => normalizeWhatsAppNumber(wa.value.phone));

const openWhatsApp = async () => {
  // Opened right away so the browser treats it as part of the click (not a
  // blocked popup), then pointed at WhatsApp once the link is ready.
  const tabRef = window.open("", "_blank");
  busy.value = "wa";
  try {
    if (!share.value.active) applyResult(await store.shareProposal(props.proposalId, expiry.value || null));
    const text = wa.value.message.replaceAll(LINK_PLACEHOLDER, share.value.url);
    const url = `https://wa.me/${waNumber.value}?text=${encodeURIComponent(text)}`;
    if (tabRef) tabRef.location.href = url;
    else window.open(url, "_blank");
  } catch (error) {
    tabRef?.close();
    await alertModal.alert(errorMessage(error, "Link gagal dibuat."), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const resetWaMessage = () => {
  waMessageEdited = false;
  refreshWaMessage();
};
</script>

<template>
  <div class="fixed inset-0 backdrop-blur-sm bg-black/30 z-[90] flex items-center justify-center p-3.5" @click.self="emit('close')">
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
      <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between flex-shrink-0">
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">Bagikan Proposal</h3>
          <p class="text-brand-light text-sm truncate">{{ proposal?.title }} · {{ proposal?.client_name }}</p>
        </div>
        <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div v-if="loading" class="py-16 flex justify-center"><Loader2 class="w-6 h-6 text-[#0C51D9] animate-spin" /></div>

      <div v-else class="p-5 space-y-5 overflow-y-auto">
        <!-- Link -->
        <div class="border border-[#DCDEDD] rounded-[12px] p-4">
          <div class="flex items-center gap-2 mb-3">
            <Link2 class="w-4 h-4 text-[#0C51D9]" />
            <p class="text-brand-dark text-sm font-bold">Link Proposal</p>
            <span
              class="ml-auto px-2 py-0.5 rounded-md text-xs font-semibold"
              :class="share.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
            >
              {{ share.active ? "Aktif" : "Belum dibagikan" }}
            </span>
          </div>

          <template v-if="share.active">
            <div class="flex gap-2">
              <input id="proposal-share-url" :value="share.url" readonly class="ps-input flex-1 min-w-0 text-gray-600" @focus="$event.target.select()" />
              <button type="button" class="ps-btn-secondary" @click="copyLink">
                <Check v-if="copied" class="w-4 h-4 text-green-600" />
                <Copy v-else class="w-4 h-4" />
                {{ copied ? "Tersalin" : "Salin" }}
              </button>
              <a :href="share.url" target="_blank" rel="noopener" class="ps-btn-secondary" title="Buka link">
                <ExternalLink class="w-4 h-4" />
              </a>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-brand-light">
              <span>Berlaku: <strong class="text-brand-dark">{{ share.expires_at ? `hingga ${formatDate(share.expires_at)}` : "tanpa batas waktu" }}</strong></span>
              <span class="inline-flex items-center gap-1">
                <Eye class="w-3.5 h-3.5" /> Dilihat {{ share.view_count }}×<template v-if="share.last_viewed_at"> · terakhir {{ formatDateTime(share.last_viewed_at) }}</template>
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2 mt-3">
              <select v-model="expiry" class="ps-input" style="width: auto">
                <option v-for="o in EXPIRY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <button type="button" class="ps-btn-secondary" :disabled="busy === 'link'" @click="createLink">
                <Loader2 v-if="busy === 'link'" class="w-4 h-4 animate-spin" /> Perbarui masa berlaku
              </button>
              <button type="button" class="ps-btn-danger ml-auto" :disabled="busy === 'disable'" @click="disableLink">
                <Ban class="w-4 h-4" /> Nonaktifkan
              </button>
            </div>
          </template>

          <template v-else>
            <p class="text-xs text-brand-light mb-3">
              Buat link agar klien bisa membuka dan mengunduh PDF proposal tanpa login. Link selalu menampilkan versi terakhir yang disimpan.
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <select v-model="expiry" class="ps-input" style="width: auto">
                <option v-for="o in EXPIRY_OPTIONS" :key="o.value" :value="o.value">Berlaku {{ o.label.toLowerCase() }}</option>
              </select>
              <button type="button" class="ps-btn-primary" :disabled="busy === 'link'" @click="createLink">
                <Loader2 v-if="busy === 'link'" class="w-4 h-4 animate-spin" />
                <Link2 v-else class="w-4 h-4" /> Buat Link
              </button>
            </div>
          </template>
        </div>

        <!-- Send via -->
        <div>
          <div class="flex gap-1 border-b border-[#DCDEDD] mb-4">
            <button type="button" class="ps-tab" :class="{ 'ps-tab--active': tab === 'email' }" @click="tab = 'email'">
              <Mail class="w-4 h-4" /> Kirim via Email
            </button>
            <button type="button" class="ps-tab" :class="{ 'ps-tab--active': tab === 'wa' }" @click="tab = 'wa'">
              <MessageCircle class="w-4 h-4" /> Kirim via WhatsApp
            </button>
          </div>

          <form v-if="tab === 'email'" class="space-y-3" @submit.prevent="sendEmail">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="ps-label">Nama Penerima</label>
                <input v-model="email.recipient_name" class="ps-input" placeholder="cth. Bapak Hendri" />
              </div>
              <div>
                <label class="ps-label">Email Penerima <span class="text-red-500">*</span></label>
                <input v-model="email.to" type="email" required class="ps-input" placeholder="nama@perusahaan.com" />
              </div>
            </div>
            <div>
              <label class="ps-label">CC (opsional)</label>
              <input v-model="email.cc" class="ps-input" placeholder="pisahkan dengan koma, maks. 5 alamat" />
            </div>
            <div>
              <label class="ps-label">Pesan tambahan (opsional)</label>
              <textarea v-model="email.message" rows="3" maxlength="2000" class="ps-input" placeholder="Ditampilkan di dalam email, di bawah salam pembuka."></textarea>
            </div>
            <p class="text-xs text-brand-light">
              Email dikirim atas nama PT Jendela Cakra Digital dan balasan klien masuk ke contact@jcdigital.co.id.
              <template v-if="!share.active"> Link proposal dibuat otomatis.</template>
              <template v-if="proposal?.status === 'draft'"> Status proposal akan berubah menjadi Terkirim.</template>
            </p>
            <div class="flex justify-end">
              <button type="submit" class="ps-btn-primary" :disabled="busy === 'email' || !email.to.trim()">
                <Loader2 v-if="busy === 'email'" class="w-4 h-4 animate-spin" />
                <Mail v-else class="w-4 h-4" /> Kirim Email
              </button>
            </div>
          </form>

          <form v-else class="space-y-3" @submit.prevent="openWhatsApp">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="ps-label">Nama Penerima</label>
                <input v-model="wa.recipient_name" class="ps-input" placeholder="cth. Bapak Hendri" />
              </div>
              <div>
                <label class="ps-label">Nomor WhatsApp</label>
                <input v-model="wa.phone" class="ps-input" placeholder="cth. 0812 3456 7890" />
                <p class="text-[11px] text-gray-400 mt-0.5">Kosongkan untuk memilih kontak sendiri di WhatsApp.</p>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between">
                <label class="ps-label">Pesan</label>
                <button type="button" class="text-xs text-[#0C51D9] hover:underline" @click="resetWaMessage">Kembalikan ke template</button>
              </div>
              <textarea v-model="wa.message" rows="9" class="ps-input" style="font-size: 13px" @input="waMessageEdited = true"></textarea>
              <p v-if="!share.active" class="text-[11px] text-gray-400 mt-0.5">{link} diganti otomatis dengan link proposal saat dikirim.</p>
            </div>
            <div class="flex justify-end">
              <button type="submit" class="ps-btn-whatsapp" :disabled="busy === 'wa' || !wa.message.trim()">
                <Loader2 v-if="busy === 'wa'" class="w-4 h-4 animate-spin" />
                <MessageCircle v-else class="w-4 h-4" /> Buka WhatsApp
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ps-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 3px;
}
.ps-input {
  width: 100%;
  border: 1px solid #dcdedd;
  border-radius: 9px;
  padding: 7px 10px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  outline: none;
}
.ps-input:focus {
  border-color: #0c51d9;
}
.ps-btn-primary,
.ps-btn-secondary,
.ps-btn-danger,
.ps-btn-whatsapp {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 9px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 0.15s, border-color 0.15s;
}
.ps-btn-primary {
  background: #0b1d51;
  color: #ffffff;
}
.ps-btn-primary:hover:not(:disabled) {
  background: #0c51d9;
}
.ps-btn-secondary {
  border: 1px solid #dcdedd;
  color: #0f172a;
  background: #ffffff;
}
.ps-btn-secondary:hover:not(:disabled) {
  border-color: #0c51d9;
}
.ps-btn-danger {
  border: 1px solid #fecaca;
  color: #dc2626;
  background: #ffffff;
}
.ps-btn-danger:hover:not(:disabled) {
  background: #fef2f2;
}
.ps-btn-whatsapp {
  background: #128c4b;
  color: #ffffff;
}
.ps-btn-whatsapp:hover:not(:disabled) {
  background: #0f7a41;
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ps-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.ps-tab--active {
  color: #0c51d9;
  border-bottom-color: #0c51d9;
}
</style>
