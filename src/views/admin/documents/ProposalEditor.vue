<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  ArrowLeft,
  Save,
  Eye,
  Download,
  Loader2,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  ImagePlus,
  X,
  FileText,
  ListTree,
  SeparatorHorizontal,
} from "lucide-vue-next";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import { useProposalStore } from "@/stores/proposal";
import { useClientStore } from "@/stores/client";
import { useAlertModalStore } from "@/stores/alertModal";
import { errorMessage } from "@/helpers/errorHelper";
import { PROPOSAL_STATUSES, proposalStatus } from "@/utils/proposalStatus";

const route = useRoute();
const router = useRouter();
const store = useProposalStore();
const clientStore = useClientStore();
const alertModal = useAlertModalStore();
const { saving } = storeToRefs(store);
const { clients } = storeToRefs(clientStore);

const loading = ref(true);
const proposal = ref(null);
const doc = ref(null); // editable copy
const savedState = ref("");
const pdfBusy = ref(false);
const coverUploading = ref(false);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const snapshot = () => JSON.stringify(doc.value);
const isDirty = computed(() => !!doc.value && snapshot() !== savedState.value);

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const fromProposal = (p) => ({
  title: p.title,
  client_id: p.client_id ?? "",
  client_name: p.client_name,
  proposal_date: p.proposal_date,
  letter_number: p.letter_number ?? "",
  status: p.status,
  cover_image: p.cover_image ?? null,
  cover_image_url: p.cover_image_url ?? null,
  signatory_name: p.signatory_name ?? "",
  signatory_title: p.signatory_title ?? "",
  use_signature: !!p.use_signature,
  sections: (p.sections ?? []).map((s) => ({ ...s, page_break_before: !!s.page_break_before })),
});

const load = async () => {
  loading.value = true;
  try {
    const data = await store.fetchProposal(route.params.id);
    proposal.value = data;
    doc.value = fromProposal(data);
    savedState.value = snapshot();
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Proposal tidak bisa dibuka."), { type: "danger" });
    router.push({ name: "admin.proposals.dashboard" });
  } finally {
    loading.value = false;
  }
  if (clients.value.length === 0) clientStore.fetchAllClient();
};

// Untitled sections are free-form blocks: they don't get a number, same as
// in the PDF, so the numbering here always matches the document.
const sectionNumbers = computed(() => {
  let n = 0;
  return (doc.value?.sections ?? []).map((s) => (s.title?.trim() ? ++n : null));
});

// ===== Sections =====
const addSection = async (index) => {
  const section = { id: newId(), title: "Bagian Baru", content: "<p></p>", page_break_before: false };
  doc.value.sections.splice(index, 0, section);
  await nextTick();
  scrollToSection(section.id, true);
};

const duplicateSection = (index) => {
  const source = doc.value.sections[index];
  doc.value.sections.splice(index + 1, 0, { ...source, id: newId(), title: source.title ? `${source.title} (Salinan)` : "" });
};

const moveSection = (index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= doc.value.sections.length) return;
  const [section] = doc.value.sections.splice(index, 1);
  doc.value.sections.splice(target, 0, section);
  nextTick(() => scrollToSection(section.id));
};

const removeSection = async (index) => {
  const section = doc.value.sections[index];
  const ok = await alertModal.confirm(`Hapus bagian "${section.title || "tanpa judul"}"?`, { type: "danger", confirmText: "Hapus" });
  if (ok) doc.value.sections.splice(index, 1);
};

const scrollToSection = (id, focusTitle = false) => {
  const el = document.getElementById(`section-${id}`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (focusTitle) el?.querySelector("input")?.select();
};

// ===== Images =====
const uploadEditorImage = async (file) => {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Ukuran gambar maksimal 5 MB.");
  const { url } = await store.uploadImage(file);
  return url;
};

const coverInput = ref(null);
const onCoverSelected = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > MAX_IMAGE_BYTES) {
    await alertModal.alert("Ukuran gambar maksimal 5 MB.", { type: "warning" });
    return;
  }
  coverUploading.value = true;
  try {
    const { public_id, url } = await store.uploadImage(file);
    doc.value.cover_image = public_id;
    doc.value.cover_image_url = url;
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Gambar sampul gagal diunggah."), { type: "danger" });
  } finally {
    coverUploading.value = false;
  }
};

const removeCover = () => {
  doc.value.cover_image = null;
  doc.value.cover_image_url = null;
};

const onClientPicked = () => {
  const client = clients.value.find((c) => String(c.id) === String(doc.value.client_id));
  if (client) doc.value.client_name = client.name;
};

// ===== Save / PDF =====
const save = async () => {
  if (saving.value || !doc.value) return false;
  const { cover_image_url, ...payload } = doc.value;
  try {
    const updated = await store.updateProposal(route.params.id, { ...payload, client_id: payload.client_id || null });
    proposal.value = updated;
    // Keep the current editing state (and caret positions) -- only mark it saved.
    savedState.value = snapshot();
    return true;
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Proposal gagal disimpan."), { type: "danger" });
    return false;
  }
};

// The PDF is built from what's saved, so unsaved edits are saved first.
const openPdf = async (download = false) => {
  if (isDirty.value && !(await save())) return;
  pdfBusy.value = true;
  try {
    if (download) {
      const name = `Proposal Penawaran - ${doc.value.title} - ${doc.value.client_name}`.replace(/[\\/:*?"<>|]/g, "-");
      await store.downloadPdf(route.params.id, name);
    } else {
      await store.viewPdf(route.params.id);
    }
  } catch (error) {
    await alertModal.alert(errorMessage(error, "PDF gagal dibuat."), { type: "danger" });
  } finally {
    pdfBusy.value = false;
  }
};

const onKeydown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    save();
  }
};

const onBeforeUnload = (event) => {
  if (isDirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};

onBeforeRouteLeave(async () => {
  if (!isDirty.value) return true;
  return alertModal.confirm("Ada perubahan yang belum disimpan. Tinggalkan halaman tanpa menyimpan?", {
    type: "warning",
    confirmText: "Tinggalkan",
  });
});

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("beforeunload", onBeforeUnload);
  load();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("beforeunload", onBeforeUnload);
});

const lastSaved = computed(() => {
  if (!proposal.value?.updated_at) return null;
  const at = new Date(proposal.value.updated_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  return proposal.value.updater?.name ? `Tersimpan ${at} oleh ${proposal.value.updater.name}` : `Tersimpan ${at}`;
});
</script>

<template>
  <div class="px-4 py-4">
    <div v-if="loading" class="flex items-center justify-center py-24">
      <Loader2 class="w-6 h-6 text-[#0C51D9] animate-spin" />
    </div>

    <template v-else-if="doc">
      <!-- Top bar -->
      <!-- top: -12px cancels the layout's <main> padding (p-3), so the bar
           sticks flush to the edge instead of leaving a gap that content
           scrolls through. -->
      <div class="sticky z-20 bg-slate-50 border border-[#DCDEDD] rounded-[14px] px-4 py-3 mb-5 flex flex-wrap items-center gap-2.5" style="top: -12px; box-shadow: 0 -12px 0 0 #ffffff">
        <button
          type="button"
          class="w-9 h-9 rounded-[10px] border border-[#DCDEDD] bg-white flex items-center justify-center hover:border-[#0C51D9] transition-colors shrink-0"
          title="Kembali ke daftar"
          @click="router.push({ name: 'admin.proposals.dashboard' })"
        >
          <ArrowLeft class="w-4 h-4 text-brand-dark" />
        </button>
        <div class="flex-1 min-w-[200px]">
          <p class="text-brand-dark text-sm font-bold truncate">Proposal Penawaran — {{ doc.title || "Tanpa judul" }}</p>
          <p class="text-brand-light text-xs truncate">
            {{ doc.client_name }}
            <span v-if="isDirty" class="text-amber-600 font-semibold"> · Belum disimpan</span>
            <span v-else-if="lastSaved"> · {{ lastSaved }}</span>
          </p>
        </div>

        <div class="relative shrink-0">
          <select v-model="doc.status" class="select-soft" title="Status proposal">
            <option v-for="s in PROPOSAL_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <button
          type="button"
          class="rounded-[10px] border border-[#DCDEDD] bg-white px-3 py-2 flex items-center gap-1.5 hover:border-[#0C51D9] transition-colors disabled:opacity-50 shrink-0"
          :disabled="pdfBusy"
          title="Lihat PDF di tab baru"
          @click="openPdf(false)"
        >
          <Loader2 v-if="pdfBusy" class="w-4 h-4 animate-spin text-brand-dark" />
          <Eye v-else class="w-4 h-4 text-brand-dark" />
          <span class="text-brand-dark text-sm font-semibold">Lihat PDF</span>
        </button>
        <button
          type="button"
          class="rounded-[10px] border border-[#DCDEDD] bg-white px-3 py-2 flex items-center gap-1.5 hover:border-[#0C51D9] transition-colors disabled:opacity-50 shrink-0"
          :disabled="pdfBusy"
          title="Unduh PDF"
          @click="openPdf(true)"
        >
          <Download class="w-4 h-4 text-brand-dark" />
          <span class="text-brand-dark text-sm font-semibold">Unduh</span>
        </button>
        <button
          type="button"
          class="btn-primary rounded-[10px] border border-[#2151A0] blue-gradient blue-btn-shadow px-3.5 py-2 flex items-center gap-1.5 shrink-0 disabled:opacity-60"
          :disabled="saving || !isDirty"
          title="Simpan (Ctrl+S)"
          @click="save"
        >
          <Loader2 v-if="saving" class="w-4 h-4 text-white animate-spin" />
          <Save v-else class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Simpan</span>
        </button>
      </div>

      <div class="flex flex-col lg:flex-row gap-5 items-start">
        <!-- Main column -->
        <div class="flex-1 min-w-0 w-full space-y-4">
          <!-- Document info -->
          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
            <div class="flex items-center gap-2 mb-4">
              <FileText class="w-5 h-5 text-violet-600" />
              <h3 class="text-brand-dark text-base font-bold">Informasi Dokumen</h3>
            </div>

            <!-- Cover -->
            <div class="mb-4">
              <label class="pp-label">Gambar Sampul</label>
              <div v-if="doc.cover_image_url" class="relative rounded-[12px] overflow-hidden border border-[#DCDEDD]" style="height: 160px">
                <img :src="doc.cover_image_url" class="w-full h-full object-cover" alt="Sampul" />
                <div class="absolute top-2 right-2 flex gap-1.5">
                  <button type="button" class="pp-chip" @click="coverInput?.click()">Ganti</button>
                  <button type="button" class="pp-chip" @click="removeCover"><X class="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <button
                v-else
                type="button"
                class="w-full rounded-[12px] border-2 border-dashed border-[#DCDEDD] hover:border-[#0C51D9] transition-colors flex flex-col items-center justify-center gap-1 text-brand-light"
                style="height: 110px"
                :disabled="coverUploading"
                @click="coverInput?.click()"
              >
                <Loader2 v-if="coverUploading" class="w-5 h-5 animate-spin" />
                <ImagePlus v-else class="w-5 h-5" />
                <span class="text-xs font-medium">Unggah gambar sampul (opsional, JPG/PNG/WebP, maks. 5 MB)</span>
              </button>
              <input ref="coverInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onCoverSelected" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div class="md:col-span-2">
                <label class="pp-label">Judul Proyek</label>
                <input v-model="doc.title" type="text" class="pp-input" maxlength="255" />
              </div>
              <div>
                <label class="pp-label">Pilih dari Data Klien</label>
                <select v-model="doc.client_id" class="pp-input" @change="onClientPicked">
                  <option value="">— Klien baru / prospek —</option>
                  <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
                </select>
              </div>
              <div>
                <label class="pp-label">Nama Klien</label>
                <input v-model="doc.client_name" type="text" class="pp-input" maxlength="255" />
              </div>
              <div>
                <label class="pp-label">Tanggal</label>
                <input v-model="doc.proposal_date" type="date" class="pp-input" />
              </div>
              <div>
                <label class="pp-label">Lampiran Surat Nomor (SPH)</label>
                <input v-model="doc.letter_number" type="text" class="pp-input" maxlength="100" placeholder="cth. 002/E/SPH-JCD/BD/X/2026" />
              </div>
              <div>
                <label class="pp-label">Nama Penanda Tangan</label>
                <input v-model="doc.signatory_name" type="text" class="pp-input" maxlength="255" />
              </div>
              <div>
                <label class="pp-label">Jabatan</label>
                <input v-model="doc.signatory_title" type="text" class="pp-input" maxlength="255" />
              </div>
              <label class="md:col-span-2 flex items-center gap-2 text-sm text-brand-dark">
                <input v-model="doc.use_signature" type="checkbox" />
                Tampilkan tanda tangan (jika tersedia untuk nama penanda tangan)
              </label>
            </div>
          </div>

          <!-- Sections -->
          <template v-for="(section, index) in doc.sections" :key="section.id">
            <div
              v-if="section.page_break_before"
              class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-violet-600"
            >
              <span class="flex-1 border-t border-dashed border-violet-300"></span>
              Halaman baru
              <span class="flex-1 border-t border-dashed border-violet-300"></span>
            </div>

            <div :id="`section-${section.id}`" class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 scroll-mt-24">
              <div class="flex items-center gap-2 mb-3">
                <span
                  class="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-bold shrink-0"
                  :class="sectionNumbers[index] ? 'bg-blue-50 text-[#0C51D9]' : 'bg-gray-100 text-gray-400'"
                  :title="sectionNumbers[index] ? 'Nomor bagian di PDF' : 'Bagian tanpa judul tidak diberi nomor'"
                >
                  {{ sectionNumbers[index] ?? "–" }}
                </span>
                <input
                  v-model="section.title"
                  type="text"
                  maxlength="255"
                  placeholder="Judul bagian (kosongkan untuk blok tanpa nomor)"
                  class="flex-1 min-w-0 text-brand-dark text-base font-bold bg-transparent outline-none border-b border-transparent focus:border-[#0C51D9] py-1"
                />
                <div class="flex items-center gap-0.5 shrink-0">
                  <button type="button" class="pp-icon" :disabled="index === 0" title="Naikkan" @click="moveSection(index, -1)"><ChevronUp class="w-4 h-4" /></button>
                  <button type="button" class="pp-icon" :disabled="index === doc.sections.length - 1" title="Turunkan" @click="moveSection(index, 1)"><ChevronDown class="w-4 h-4" /></button>
                  <button
                    type="button"
                    class="pp-icon"
                    :class="{ 'pp-icon--active': section.page_break_before }"
                    title="Mulai bagian ini di halaman baru"
                    @click="section.page_break_before = !section.page_break_before"
                  >
                    <SeparatorHorizontal class="w-4 h-4" />
                  </button>
                  <button type="button" class="pp-icon" title="Duplikat bagian" @click="duplicateSection(index)"><Copy class="w-4 h-4" /></button>
                  <button type="button" class="pp-icon pp-icon--danger" title="Hapus bagian" @click="removeSection(index)"><Trash2 class="w-4 h-4" /></button>
                </div>
              </div>

              <RichTextEditor v-model="section.content" :upload-image="uploadEditorImage" placeholder="Tulis isi bagian ini..." />
            </div>

            <div class="flex justify-center">
              <button
                type="button"
                class="text-xs font-semibold text-brand-light hover:text-[#0C51D9] flex items-center gap-1 px-3 py-1 rounded-full hover:bg-blue-50 transition-colors"
                @click="addSection(index + 1)"
              >
                <Plus class="w-3.5 h-3.5" /> Tambah bagian di sini
              </button>
            </div>
          </template>

          <div v-if="doc.sections.length === 0" class="bg-white border border-dashed border-[#DCDEDD] rounded-[14px] p-8 text-center">
            <p class="text-brand-dark text-sm font-semibold mb-2">Proposal ini belum punya bagian</p>
            <button type="button" class="text-sm font-semibold text-[#0C51D9] hover:underline" @click="addSection(0)">+ Tambah bagian pertama</button>
          </div>
        </div>

        <!-- Outline -->
        <aside class="w-full lg:w-[260px] shrink-0 lg:sticky lg:top-24">
          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
            <div class="flex items-center gap-2 mb-3">
              <ListTree class="w-4 h-4 text-brand-light" />
              <p class="text-brand-dark text-sm font-bold">Daftar Bagian</p>
            </div>
            <ol class="space-y-0.5 overflow-y-auto" style="max-height: 60vh">
              <li v-for="(section, index) in doc.sections" :key="section.id">
                <button
                  type="button"
                  class="w-full text-left text-xs text-brand-dark hover:bg-gray-50 hover:text-[#0C51D9] rounded-md px-2 py-1.5 flex gap-1.5"
                  @click="scrollToSection(section.id)"
                >
                  <span class="text-brand-light shrink-0" style="min-width: 18px">{{ sectionNumbers[index] ? `${sectionNumbers[index]}.` : "·" }}</span>
                  <span class="truncate">{{ section.title || "Tanpa judul" }}</span>
                </button>
              </li>
            </ol>
            <button
              type="button"
              class="mt-3 w-full rounded-[10px] border border-dashed border-[#DCDEDD] hover:border-[#0C51D9] text-xs font-semibold text-brand-dark py-2 flex items-center justify-center gap-1"
              @click="addSection(doc.sections.length)"
            >
              <Plus class="w-3.5 h-3.5" /> Tambah bagian di akhir
            </button>
            <p class="text-[11px] text-brand-light leading-snug mt-3">
              Teks dalam [kurung siku] adalah petunjuk dari template. Ganti sebelum proposal dikirim.
            </p>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pp-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}
.pp-input {
  width: 100%;
  border: 1px solid #dcdedd;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  transition: border-color 0.15s;
}
.pp-input:focus {
  border-color: #0c51d9;
}
.pp-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: background-color 0.15s, color 0.15s;
}
.pp-icon:hover:not(:disabled) {
  background: #eff6ff;
  color: #0c51d9;
}
.pp-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.pp-icon--active {
  background: #ede9fe;
  color: #7c3aed;
}
.pp-icon--danger:hover:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
}
.pp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dcdedd;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}
</style>
