<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { FileText, Plus, Search, SearchX, Eye, Pencil, Copy, Trash2, Layers, Share2, ArrowLeft } from "lucide-vue-next";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiSelect, UiChips, UiTable, UiEmpty, UiModal, UiSpinner } from "@/components/ui";
import ShareProposalModal from "@/components/admin/documents/ShareProposalModal.vue";
import { useProposalStore } from "@/stores/proposal";
import { useClientStore } from "@/stores/client";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import Pagination from "@/components/common/Pagination.vue";
import { PROPOSAL_STATUSES, proposalStatus } from "@/utils/proposalStatus";

const router = useRouter();
const store = useProposalStore();
const clientStore = useClientStore();
const alertModal = useAlertModalStore();
const { proposals, meta, loading, saving } = storeToRefs(store);
const { clients } = storeToRefs(clientStore);

const search = ref("");
const statusFilter = ref("");

const fetchPage = (page = 1) =>
  store.fetchProposals({ search: search.value || undefined, status: statusFilter.value || undefined, page, row_per_page: 10 });

onMounted(() => fetchPage());

let searchTimeout;
const onSearchInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchPage(1), 350);
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

// ===== New proposal =====
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const blankForm = () => ({ title: "", client_id: "", client_name: "", recipient: "", proposal_date: today(), letter_number: "" });
const showCreate = ref(false);
const form = ref(blankForm());
const formErrors = ref({});

const openCreate = async () => {
  form.value = blankForm();
  formErrors.value = {};
  showCreate.value = true;
  if (clients.value.length === 0) await clientStore.fetchAllClient();
};

// Picking a client fills in its name; the name stays editable (and a
// prospect that isn't a client record yet can just be typed in).
const onClientPicked = () => {
  const client = clients.value.find((c) => String(c.id) === String(form.value.client_id));
  if (client) {
    form.value.client_name = client.name;
    if (!form.value.recipient && client.pic_name) form.value.recipient = client.pic_name;
  }
};

const createProposal = async () => {
  formErrors.value = {};
  try {
    const created = await store.createProposal({ ...form.value, client_id: form.value.client_id || null });
    showCreate.value = false;
    router.push({ name: "admin.proposals.edit", params: { id: created.id } });
  } catch (error) {
    if (error?.response?.status === 422) formErrors.value = error.response.data.errors ?? {};
    else await alertModal.alert(errorMessage(error, "Proposal gagal dibuat."), { type: "danger" });
  }
};

// ===== Row actions =====
const busyId = ref(null);

const viewPdf = async (proposal) => {
  busyId.value = `pdf-${proposal.id}`;
  try {
    await store.viewPdf(proposal.id);
  } catch (error) {
    await alertModal.alert(errorMessage(error, "PDF gagal dibuat."), { type: "danger" });
  } finally {
    busyId.value = null;
  }
};

const duplicate = async (proposal) => {
  const ok = await alertModal.confirm(`Buat salinan dari "${proposal.title}"? Salinan dibuat sebagai Draft dengan tanggal hari ini.`, {
    confirmText: "Duplikat",
  });
  if (!ok) return;
  busyId.value = `dup-${proposal.id}`;
  try {
    const copy = await store.duplicateProposal(proposal.id);
    router.push({ name: "admin.proposals.edit", params: { id: copy.id } });
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Proposal gagal diduplikat."), { type: "danger" });
  } finally {
    busyId.value = null;
  }
};

const handleDelete = async (proposal) => {
  const ok = await alertModal.confirm(`Hapus proposal "${proposal.title}"? Tindakan ini tidak bisa dibatalkan.`, {
    type: "danger",
    confirmText: "Hapus",
  });
  if (!ok) return;
  try {
    await store.deleteProposal(proposal.id);
    const page = proposals.value.length === 0 && meta.value.current_page > 1 ? meta.value.current_page - 1 : meta.value.current_page;
    await fetchPage(page);
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Proposal gagal dihapus."), { type: "danger" });
  }
};

const canCreate = computed(() => can("proposal-create"));

const sharingId = ref(null);

// ===== Presentation only =====
const STATUS_TONE = { draft: "neutral", sent: "info", accepted: "ok", rejected: "bad" };
const STATUS_OPTIONS = [{ value: "", label: "Semua Status" }, ...PROPOSAL_STATUSES.map((s) => ({ value: s.value, label: s.label }))];
const clientOptions = computed(() => clients.value.map((c) => ({ value: c.id, label: c.name })));
const COLUMNS = [
  { key: "title", label: "Proposal" },
  { key: "proposal_date", label: "Tanggal" },
  { key: "letter_number", label: "Nomor Surat" },
  { key: "status", label: "Status" },
  { key: "updated_at", label: "Terakhir Diubah" },
  { key: "actions", label: "Aksi", align: "right" },
];
const iconBtn =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus disabled:opacity-50";
const iconBtnDanger =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus";

// Reflect a status change (e.g. Draft -> Terkirim after emailing) in the row.
const onShared = (updated) => {
  const row = proposals.value.find((p) => p.id === updated.id);
  if (row) row.status = updated.status;
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      title="Proposal Penawaran"
      subtitle="Susun proposal penawaran dari template standar JCD, edit per bagian, lalu unduh sebagai PDF"
    >
      <template #eyebrow>
        <router-link :to="{ name: 'admin.documents.dashboard' }" class="inline-flex items-center gap-1 text-ui-small text-ui-accent hover:underline mb-1.5">
          <ArrowLeft class="w-3.5 h-3.5" />
          Documents
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="canCreate" :icon="Plus" class="w-full sm:w-auto" @click="openCreate">Proposal Baru</UiButton>
      </template>
    </UiPageHeader>

    <div class="bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden">
      <div class="p-3 sm:p-4 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          placeholder="Cari judul, klien, atau nomor surat..."
          class="lg:max-w-sm w-full"
          @input="onSearchInput"
        />
        <UiChips
          :model-value="statusFilter"
          :options="STATUS_OPTIONS"
          @update:model-value="(v) => { statusFilter = v; fetchPage(1); }"
        />
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="proposals"
        :meta="meta"
        :loading="loading"
      >
        <template #cell-title="{ row }">
          <div class="min-w-[220px] max-w-[380px] py-2">
            <RouterLink
              v-if="can('proposal-edit')"
              :to="{ name: 'admin.proposals.edit', params: { id: row.id } }"
              class="block font-medium text-ui-ink hover:text-ui-accent truncate transition-colors"
              :title="row.title"
            >{{ row.title }}</RouterLink>
            <p v-else class="font-medium text-ui-ink truncate" :title="row.title">{{ row.title }}</p>
            <p class="text-ui-cap text-ui-muted truncate">{{ row.client_name }}</p>
            <p class="text-ui-cap text-ui-faint inline-flex items-center gap-1 mt-0.5 tabular-nums">
              <Layers class="w-3.5 h-3.5" /> {{ row.section_count }} bagian
            </p>
          </div>
        </template>
        <template #cell-proposal_date="{ row }">
          <span class="whitespace-nowrap tabular-nums">{{ formatDate(row.proposal_date) }}</span>
        </template>
        <template #cell-letter_number="{ row }">
          <span class="whitespace-nowrap font-mono text-ui-cap">{{ row.letter_number || "-" }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot>{{ proposalStatus(row.status).label }}</UiBadge>
        </template>
        <template #cell-updated_at="{ row }">
          <div class="whitespace-nowrap">
            <p class="tabular-nums">{{ formatDate(row.updated_at) }}</p>
            <p v-if="row.updater?.name" class="text-ui-cap text-ui-muted">oleh {{ row.updater.name }}</p>
          </div>
        </template>
        <template #cell-actions="{ row }">
          <div class="inline-flex items-center justify-end gap-0.5" @click.stop>
            <button
              type="button"
              :class="iconBtn"
              title="Lihat PDF"
              aria-label="Lihat PDF"
              :disabled="busyId === `pdf-${row.id}`"
              @click="viewPdf(row)"
            >
              <UiSpinner v-if="busyId === `pdf-${row.id}`" size="16px" :center="false" />
              <Eye v-else class="w-4 h-4" />
            </button>
            <button
              v-if="can('proposal-edit')"
              type="button"
              :class="iconBtn"
              title="Bagikan (link, email, WhatsApp)"
              aria-label="Bagikan"
              @click="sharingId = row.id"
            >
              <Share2 class="w-4 h-4" />
            </button>
            <RouterLink
              v-if="can('proposal-edit')"
              :to="{ name: 'admin.proposals.edit', params: { id: row.id } }"
              :class="iconBtn"
              title="Edit"
              aria-label="Edit"
            >
              <Pencil class="w-4 h-4" />
            </RouterLink>
            <button
              v-if="canCreate"
              type="button"
              :class="iconBtn"
              title="Duplikat"
              aria-label="Duplikat"
              :disabled="busyId === `dup-${row.id}`"
              @click="duplicate(row)"
            >
              <Copy class="w-4 h-4" />
            </button>
            <button
              v-if="can('proposal-delete')"
              type="button"
              :class="iconBtnDanger"
              title="Hapus"
              aria-label="Hapus"
              @click="handleDelete(row)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- Phones: one card per proposal -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5 flex items-start gap-3">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 shrink-0 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <RouterLink
                  v-if="can('proposal-edit')"
                  :to="{ name: 'admin.proposals.edit', params: { id: row.id } }"
                  class="text-ui-body font-medium text-ui-ink break-words"
                >{{ row.title }}</RouterLink>
                <p v-else class="text-ui-body font-medium text-ui-ink break-words">{{ row.title }}</p>
                <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot class="shrink-0">{{ proposalStatus(row.status).label }}</UiBadge>
              </div>
              <p class="text-ui-small text-ui-muted mt-0.5 truncate">{{ row.client_name }}</p>
              <p class="text-ui-cap text-ui-faint mt-1 tabular-nums">
                {{ formatDate(row.proposal_date) }} · {{ row.section_count }} bagian
              </p>
              <div class="flex items-center gap-0.5 mt-2 -ml-2" @click.stop>
                <button type="button" :class="iconBtn" aria-label="Lihat PDF" :disabled="busyId === `pdf-${row.id}`" @click="viewPdf(row)">
                  <UiSpinner v-if="busyId === `pdf-${row.id}`" size="16px" :center="false" />
                  <Eye v-else class="w-4 h-4" />
                </button>
                <button v-if="can('proposal-edit')" type="button" :class="iconBtn" aria-label="Bagikan" @click="sharingId = row.id">
                  <Share2 class="w-4 h-4" />
                </button>
                <button
                  v-if="canCreate"
                  type="button"
                  :class="iconBtn"
                  aria-label="Duplikat"
                  :disabled="busyId === `dup-${row.id}`"
                  @click="duplicate(row)"
                >
                  <Copy class="w-4 h-4" />
                </button>
                <button v-if="can('proposal-delete')" type="button" :class="iconBtnDanger" aria-label="Hapus" @click="handleDelete(row)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="search || statusFilter" :icon="SearchX" title="Tidak ada proposal yang cocok" compact />
          <UiEmpty v-else :icon="FileText" title="Belum ada proposal" message="Buat proposal pertama Anda dari template standar JCD." compact>
            <UiButton v-if="canCreate" variant="secondary" size="sm" :icon="Plus" @click="openCreate">Proposal Baru</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div v-if="!loading && proposals.length > 0" class="px-3 sm:px-4 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" item-label="proposals" @page-change="fetchPage" />
      </div>
    </div>

    <ShareProposalModal v-if="sharingId" :proposal-id="sharingId" @close="sharingId = null" @updated="onShared" />

    <!-- New proposal modal -->
    <UiModal
      v-model:open="showCreate"
      title="Proposal Baru"
      description="Isi data utama. Isi proposal dimulai dari template standar JCD."
    >
      <form id="proposal-create-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="createProposal">
        <UiInput
          v-model="form.title"
          label="Judul Proyek"
          required
          placeholder="cth. Sistem Manajemen Order"
          :error="formErrors.title?.[0] || ''"
          class="sm:col-span-2"
        />
        <UiSelect
          v-model="form.client_id"
          label="Pilih dari Data Klien"
          :options="[{ value: '', label: '— Klien baru / prospek (ketik di bawah) —' }, ...clientOptions]"
          class="sm:col-span-2"
          @change="onClientPicked"
        />
        <UiInput
          v-model="form.client_name"
          label="Nama Klien"
          required
          placeholder="cth. PT Misael Berkat Abadi"
          :error="formErrors.client_name?.[0] || ''"
          class="sm:col-span-2"
        />
        <UiInput
          v-model="form.recipient"
          label="Ditujukan Kepada"
          placeholder="cth. Bapak Hendri"
          hint="Dipakai untuk salam pembuka di bagian Pendahuluan."
          class="sm:col-span-2"
        />
        <UiInput v-model="form.proposal_date" type="date" label="Tanggal" required />
        <UiInput v-model="form.letter_number" label="Nomor Surat (SPH)" placeholder="cth. 002/E/SPH-JCD/BD/X/2026" />
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="showCreate = false">Batal</UiButton>
        <UiButton type="submit" form="proposal-create-form" :loading="saving">Buat & Mulai Edit</UiButton>
      </template>
    </UiModal>
  </div>
</template>
