<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { FileText, Plus, Search, Eye, Pencil, Copy, Trash2, ChevronDown, X, Loader2, Layers } from "lucide-vue-next";
import { useProposalStore } from "@/stores/proposal";
import { useClientStore } from "@/stores/client";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
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
</script>

<template>
  <div class="px-4 py-4">
    <!-- Header -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 bg-violet-50 rounded-[12px] flex items-center justify-center shrink-0">
            <FileText class="w-6 h-6 text-violet-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold">Proposal Penawaran</h3>
            <p class="text-brand-light text-xs font-normal">
              Susun proposal penawaran dari template standar JCD, edit per bagian, lalu unduh sebagai PDF
            </p>
          </div>
        </div>

        <button
          v-if="canCreate"
          type="button"
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
          @click="openCreate"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Proposal Baru</span>
        </button>
      </div>

      <div class="flex flex-col sm:flex-row gap-2.5">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            v-model="search"
            type="text"
            class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
            placeholder="Cari judul, klien, atau nomor surat..."
            @input="onSearchInput"
          />
        </div>
        <div class="relative">
          <select v-model="statusFilter" class="select-soft" @change="fetchPage(1)">
            <option value="">Semua Status</option>
            <option v-for="s in PROPOSAL_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
      <SkeletonTable v-if="loading" />

      <div v-else-if="proposals.length === 0" class="text-center py-12">
        <FileText class="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
        <p class="text-brand-dark text-sm font-semibold">{{ search || statusFilter ? "Tidak ada proposal yang cocok" : "Belum ada proposal" }}</p>
        <p v-if="!search && !statusFilter" class="text-brand-light text-xs mt-1">Buat proposal pertama Anda dari template standar JCD.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">No</th>
              <th class="py-3 pr-4 font-semibold">Proposal</th>
              <th class="py-3 pr-4 font-semibold">Tanggal</th>
              <th class="py-3 pr-4 font-semibold">Nomor Surat</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
              <th class="py-3 pr-4 font-semibold">Terakhir Diubah</th>
              <th class="py-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(proposal, index) in proposals" :key="proposal.id" class="border-b border-[#F1F1F1] hover:bg-gray-50">
              <td class="py-3 pr-4 text-brand-light align-top">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4 align-top" style="min-width: 240px; max-width: 380px">
                <RouterLink
                  v-if="can('proposal-edit')"
                  :to="{ name: 'admin.proposals.edit', params: { id: proposal.id } }"
                  class="font-semibold text-brand-dark hover:text-[#0C51D9] transition-colors"
                >
                  {{ proposal.title }}
                </RouterLink>
                <p v-else class="font-semibold text-brand-dark">{{ proposal.title }}</p>
                <p class="text-brand-light text-xs mt-0.5">{{ proposal.client_name }}</p>
                <p class="text-gray-400 text-xs mt-0.5 inline-flex items-center gap-1">
                  <Layers class="w-3.5 h-3.5" /> {{ proposal.section_count }} bagian
                </p>
              </td>
              <td class="py-3 pr-4 align-top whitespace-nowrap text-brand-dark">{{ formatDate(proposal.proposal_date) }}</td>
              <td class="py-3 pr-4 align-top whitespace-nowrap text-brand-dark">{{ proposal.letter_number || "-" }}</td>
              <td class="py-3 pr-4 align-top">
                <span class="px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap" :class="proposalStatus(proposal.status).class">
                  {{ proposalStatus(proposal.status).label }}
                </span>
              </td>
              <td class="py-3 pr-4 align-top whitespace-nowrap">
                <p class="text-brand-dark">{{ formatDate(proposal.updated_at) }}</p>
                <p v-if="proposal.updater?.name" class="text-brand-light text-xs">oleh {{ proposal.updater.name }}</p>
              </td>
              <td class="py-3 align-top">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all disabled:opacity-50"
                    title="Lihat PDF"
                    :disabled="busyId === `pdf-${proposal.id}`"
                    @click="viewPdf(proposal)"
                  >
                    <Loader2 v-if="busyId === `pdf-${proposal.id}`" class="w-4 h-4 text-gray-600 animate-spin" />
                    <Eye v-else class="w-4 h-4 text-gray-600" />
                  </button>
                  <RouterLink
                    v-if="can('proposal-edit')"
                    :to="{ name: 'admin.proposals.edit', params: { id: proposal.id } }"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
                    title="Edit"
                  >
                    <Pencil class="w-4 h-4 text-gray-600" />
                  </RouterLink>
                  <button
                    v-if="canCreate"
                    type="button"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all disabled:opacity-50"
                    title="Duplikat"
                    :disabled="busyId === `dup-${proposal.id}`"
                    @click="duplicate(proposal)"
                  >
                    <Copy class="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    v-if="can('proposal-delete')"
                    type="button"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-red-500 hover:ring-2 hover:ring-red-500/30 hover:bg-red-50 group transition-all"
                    title="Hapus"
                    @click="handleDelete(proposal)"
                  >
                    <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && proposals.length > 0" class="pt-3.5 border-t border-[#DCDEDD] mt-4">
        <Pagination :meta="meta" :loading="loading" item-label="proposals" @page-change="fetchPage" />
      </div>
    </div>

    <!-- New proposal modal -->
    <div
      v-if="showCreate"
      class="fixed inset-0 backdrop-blur-sm bg-black/30 z-[90] flex items-center justify-center p-3.5"
      @click.self="showCreate = false"
    >
      <form class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg overflow-hidden" @submit.prevent="createProposal">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <div>
            <h3 class="text-brand-dark text-base font-bold">Proposal Baru</h3>
            <p class="text-brand-light text-sm">Isi data utama. Isi proposal dimulai dari template standar JCD.</p>
          </div>
          <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" @click="showCreate = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 space-y-3.5">
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">Judul Proyek <span class="text-red-500">*</span></label>
            <input v-model="form.title" type="text" class="pp-input" placeholder="cth. Sistem Manajemen Order" required />
            <p v-if="formErrors.title" class="text-red-500 text-xs mt-1">{{ formErrors.title[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">Pilih dari Data Klien</label>
            <select v-model="form.client_id" class="pp-input" @change="onClientPicked">
              <option value="">— Klien baru / prospek (ketik di bawah) —</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">Nama Klien <span class="text-red-500">*</span></label>
            <input v-model="form.client_name" type="text" class="pp-input" placeholder="cth. PT Misael Berkat Abadi" required />
            <p v-if="formErrors.client_name" class="text-red-500 text-xs mt-1">{{ formErrors.client_name[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">Ditujukan Kepada</label>
            <input v-model="form.recipient" type="text" class="pp-input" placeholder="cth. Bapak Hendri" />
            <p class="text-gray-400 text-xs mt-1">Dipakai untuk salam pembuka di bagian Pendahuluan.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block text-sm font-semibold text-brand-dark mb-1">Tanggal <span class="text-red-500">*</span></label>
              <input v-model="form.proposal_date" type="date" class="pp-input" required />
            </div>
            <div>
              <label class="block text-sm font-semibold text-brand-dark mb-1">Nomor Surat (SPH)</label>
              <input v-model="form.letter_number" type="text" class="pp-input" placeholder="cth. 002/E/SPH-JCD/BD/X/2026" />
            </div>
          </div>
        </div>

        <div class="p-5 border-t border-[#DCDEDD] flex justify-end gap-2.5">
          <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-gray-50" @click="showCreate = false">
            Batal
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-1.5 disabled:opacity-60"
          >
            <Loader2 v-if="saving" class="w-4 h-4 text-white animate-spin" />
            <span class="text-brand-white text-sm font-semibold">Buat & Mulai Edit</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.pp-input {
  width: 100%;
  border: 1px solid #dcdedd;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  transition: border-color 0.15s;
}
.pp-input:focus {
  border-color: #0c51d9;
}
</style>
