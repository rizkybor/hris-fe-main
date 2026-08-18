<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { NotebookPen, Plus, Search, Trash2, Eye, Pin, PinOff } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useMeetingNoteStore } from "@/stores/meetingNote";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";

const router = useRouter();
const store = useMeetingNoteStore();
const alertModal = useAlertModalStore();
const { meetingNotes, meta, loading } = storeToRefs(store);

const search = ref("");
const typeFilter = ref("");
const pinBusyId = ref(null);

const load = (page = 1) => {
  store.fetchMeetingNotes({
    search: search.value || undefined,
    meeting_type: typeFilter.value || undefined,
    page,
  });
};

onMounted(() => load());

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const goToDetail = (id) => router.push({ name: "admin.meeting-notes.detail", params: { id } });

const handleDelete = async (note) => {
  if (
    !(await alertModal.confirm(`Hapus Meeting Note "${note.document_number}"? Tindakan ini tidak dapat dibatalkan.`, {
      type: "danger",
      confirmText: "Hapus",
    }))
  )
    return;
  await store.deleteMeetingNote(note.id);
};

const togglePin = async (note) => {
  pinBusyId.value = note.id;
  try {
    note.is_pinned = await store.togglePin(note.id);
  } finally {
    pinBusyId.value = null;
  }
};

const TYPE_LABEL = { internal: "Internal", external: "External" };
const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <NotebookPen class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Meeting Note</h3>
          <p class="text-brand-light text-sm">Recap rapat internal & eksternal, dikelola bersama Manager/Operational Director/HR/Finance Manager</p>
        </div>
      </div>

      <router-link
        v-if="can('meeting-note-create')"
        :to="{ name: 'admin.meeting-notes.create' }"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Buat Meeting Note</span>
      </router-link>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <div class="relative max-w-sm w-full">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-gray-400" />
          </div>
          <input
            v-model="search"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Cari nomor, judul..."
            class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <select
          v-model="typeFilter"
          @change="handleFilterChange"
          class="px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        >
          <option value="">Semua Tipe</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
        </select>
      </div>

      <SkeletonTable v-if="loading" :rows="6" :cols="6" />

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">No</th>
              <th class="py-3 pr-4 font-semibold">Nomor</th>
              <th class="py-3 pr-4 font-semibold">Judul</th>
              <th class="py-3 pr-4 font-semibold">Tipe</th>
              <th class="py-3 pr-4 font-semibold">Waktu Rapat</th>
              <th class="py-3 pr-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(note, index) in meetingNotes"
              :key="note.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50 cursor-pointer"
              @click="goToDetail(note.id)"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4 font-mono text-xs">{{ note.document_number }}</td>
              <td class="py-3 pr-4">{{ note.title }}</td>
              <td class="py-3 pr-4">
                <span class="px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 text-[#0C51D9]">
                  {{ TYPE_LABEL[note.meeting_type] }}
                </span>
              </td>
              <td class="py-3 pr-4">{{ formatDateTime(note.meeting_date) }}</td>
              <td class="py-3 pr-4" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <button
                    v-if="can('meeting-note-pin')"
                    @click="togglePin(note)"
                    :disabled="pinBusyId === note.id"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-amber-400 hover:bg-amber-50 group disabled:opacity-50"
                    :title="note.is_pinned ? 'Unpin dari Dashboard' : 'Pin ke Dashboard'"
                  >
                    <PinOff v-if="note.is_pinned" class="w-4 h-4 text-amber-600" />
                    <Pin v-else class="w-4 h-4 text-gray-600 group-hover:text-amber-600" />
                  </button>
                  <button
                    @click="goToDetail(note.id)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-[#0C51D9]"
                    title="Lihat Detail"
                  >
                    <Eye class="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    v-if="can('meeting-note-delete')"
                    @click="handleDelete(note)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group"
                    title="Hapus"
                  >
                    <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!loading && meetingNotes.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg font-semibold">Belum ada Meeting Note</p>
        </div>
      </div>

      <Pagination :meta="meta" :loading="loading" item-label="note" @page-change="load" />
    </div>
  </div>
</template>
