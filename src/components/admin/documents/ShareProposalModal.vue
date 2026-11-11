<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { Link2, Copy, Check, Mail, MessageCircle, Eye, Ban, ExternalLink } from "lucide-vue-next";
import { UiModal, UiButton, UiBadge, UiInput, UiSelect, UiSpinner } from "@/components/ui";
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
// Presentation only: the "create link" select reads "Berlaku 30 hari".
const EXPIRY_OPTIONS_LONG = EXPIRY_OPTIONS.map((o) => ({ value: o.value, label: `Berlaku ${o.label.toLowerCase()}` }));
const tabClass = (active) => [
  "ui-press inline-flex items-center gap-1.5 h-10 px-3 -mb-px border-b-2 text-ui-small font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:shadow-ui-focus",
  active ? "border-ui-accent text-ui-ink" : "border-transparent text-ui-muted hover:text-ui-ink",
];

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
  <UiModal :open="true" size="lg" title="Bagikan Proposal" @close="emit('close')">
    <template #header>
      <div class="min-w-0 flex-1">
        <h2 class="text-ui-h2 text-ui-ink">Bagikan Proposal</h2>
        <p class="text-ui-small text-ui-muted truncate mt-0.5">{{ proposal?.title }} · {{ proposal?.client_name }}</p>
      </div>
    </template>

    <UiSpinner v-if="loading" />

    <div v-else class="space-y-5">
      <!-- Link -->
      <section class="border border-ui-line rounded-ui-card p-4">
        <div class="flex items-center gap-2 mb-3">
          <Link2 class="w-4 h-4 text-ui-faint" />
          <p class="text-ui-h3 text-ui-ink">Link Proposal</p>
          <UiBadge class="ml-auto" :tone="share.active ? 'ok' : 'neutral'" dot>
            {{ share.active ? "Aktif" : "Belum dibagikan" }}
          </UiBadge>
        </div>

        <template v-if="share.active">
          <div class="flex gap-2">
            <UiInput
              id="proposal-share-url"
              :model-value="share.url"
              readonly
              mono
              class="flex-1 min-w-0"
              @focusin="$event.target.select()"
            />
            <UiButton variant="secondary" :icon="copied ? Check : Copy" @click="copyLink">
              <span class="hidden sm:inline">{{ copied ? "Tersalin" : "Salin" }}</span>
            </UiButton>
            <UiButton variant="secondary" :icon="ExternalLink" :href="share.url" target="_blank" rel="noopener" title="Buka link" aria-label="Buka link" />
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-ui-cap text-ui-muted">
            <span>Berlaku: <strong class="font-medium text-ui-ink">{{ share.expires_at ? `hingga ${formatDate(share.expires_at)}` : "tanpa batas waktu" }}</strong></span>
            <span class="inline-flex items-center gap-1 tabular-nums">
              <Eye class="w-3.5 h-3.5" /> Dilihat {{ share.view_count }}×<template v-if="share.last_viewed_at"> · terakhir {{ formatDateTime(share.last_viewed_at) }}</template>
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2 mt-3">
            <UiSelect v-model="expiry" :options="EXPIRY_OPTIONS" class="w-full sm:w-48" />
            <UiButton variant="secondary" :loading="busy === 'link'" @click="createLink">Perbarui masa berlaku</UiButton>
            <UiButton variant="danger" :icon="Ban" :loading="busy === 'disable'" class="sm:ml-auto" @click="disableLink">Nonaktifkan</UiButton>
          </div>
        </template>

        <template v-else>
          <p class="text-ui-small text-ui-muted mb-3">
            Buat link agar klien bisa membuka dan mengunduh PDF proposal tanpa login. Link selalu menampilkan versi terakhir yang disimpan.
          </p>
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <UiSelect v-model="expiry" :options="EXPIRY_OPTIONS_LONG" class="w-full sm:w-56" />
            <UiButton :icon="Link2" :loading="busy === 'link'" @click="createLink">Buat Link</UiButton>
          </div>
        </template>
      </section>

      <!-- Send via -->
      <section>
        <div class="flex gap-1 border-b border-ui-line mb-4 overflow-x-auto [scrollbar-width:none]" role="tablist">
          <button type="button" role="tab" :aria-selected="tab === 'email'" :class="tabClass(tab === 'email')" @click="tab = 'email'">
            <Mail class="w-4 h-4" /> Kirim via Email
          </button>
          <button type="button" role="tab" :aria-selected="tab === 'wa'" :class="tabClass(tab === 'wa')" @click="tab = 'wa'">
            <MessageCircle class="w-4 h-4" /> Kirim via WhatsApp
          </button>
        </div>

        <form v-if="tab === 'email'" class="space-y-4" @submit.prevent="sendEmail">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="email.recipient_name" label="Nama Penerima" placeholder="cth. Bapak Hendri" />
            <UiInput v-model="email.to" type="email" required label="Email Penerima" placeholder="nama@perusahaan.com" />
          </div>
          <UiInput v-model="email.cc" label="CC (opsional)" placeholder="pisahkan dengan koma, maks. 5 alamat" />
          <div class="min-w-0">
            <label for="proposal-share-email-message" class="block text-ui-small font-medium text-ui-ink mb-1.5">Pesan tambahan (opsional)</label>
            <textarea
              id="proposal-share-email-message"
              v-model="email.message"
              rows="3"
              maxlength="2000"
              class="w-full px-3 py-2.5 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow"
              placeholder="Ditampilkan di dalam email, di bawah salam pembuka."
            ></textarea>
          </div>
          <p class="text-ui-cap text-ui-muted">
            Email dikirim atas nama PT Jendela Cakra Digital dan balasan klien masuk ke contact@jcdigital.co.id.
            <template v-if="!share.active"> Link proposal dibuat otomatis.</template>
            <template v-if="proposal?.status === 'draft'"> Status proposal akan berubah menjadi Terkirim.</template>
          </p>
          <div class="flex justify-end">
            <UiButton type="submit" :icon="Mail" :loading="busy === 'email'" :disabled="!email.to.trim()" class="w-full sm:w-auto">Kirim Email</UiButton>
          </div>
        </form>

        <form v-else class="space-y-4" @submit.prevent="openWhatsApp">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="wa.recipient_name" label="Nama Penerima" placeholder="cth. Bapak Hendri" />
            <UiInput
              v-model="wa.phone"
              label="Nomor WhatsApp"
              placeholder="cth. 0812 3456 7890"
              hint="Kosongkan untuk memilih kontak sendiri di WhatsApp."
            />
          </div>
          <div class="min-w-0">
            <div class="flex items-center justify-between mb-1.5">
              <label for="proposal-share-wa-message" class="block text-ui-small font-medium text-ui-ink">Pesan</label>
              <button type="button" class="text-ui-cap text-ui-accent hover:underline" @click="resetWaMessage">Kembalikan ke template</button>
            </div>
            <textarea
              id="proposal-share-wa-message"
              v-model="wa.message"
              rows="9"
              class="w-full px-3 py-2.5 bg-ui-surface text-ui-small text-ui-ink border border-ui-line-strong rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow"
              @input="waMessageEdited = true"
            ></textarea>
            <p v-if="!share.active" class="text-ui-cap text-ui-muted mt-1.5">{link} diganti otomatis dengan link proposal saat dikirim.</p>
          </div>
          <div class="flex justify-end">
            <UiButton type="submit" :icon="MessageCircle" :loading="busy === 'wa'" :disabled="!wa.message.trim()" class="w-full sm:w-auto">Buka WhatsApp</UiButton>
          </div>
        </form>
      </section>
    </div>
  </UiModal>
</template>
