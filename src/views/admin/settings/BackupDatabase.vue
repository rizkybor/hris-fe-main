<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { DatabaseBackup, Plus, Download, Trash2, Loader2, HardDrive, Search } from "lucide-vue-next";
import { useBackupStore } from "@/stores/backup";
import { can } from "@/helpers/permissionHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useBackupStore();
const alertModal = useAlertModalStore();
const { backups, meta, loading, creating, error } = storeToRefs(store);

const search = ref("");
const isDeleteModalOpen = ref(false);
const backupToDelete = ref(null);
const downloadingId = ref(null);

const load = (page = 1) => store.fetchBackups({ search: search.value || undefined, page });

onMounted(() => load());

const handleSearch = () => load(1);

const handleCreate = async () => {
  try {
    await store.createBackup();
  } catch {
    // error state is already surfaced via `error`
  }
};

const handleDownload = async (backup) => {
  downloadingId.value = backup.id;
  try {
    await store.downloadBackup(backup.id, backup.filename);
  } finally {
    downloadingId.value = null;
  }
};

const confirmDelete = (backup) => {
  backupToDelete.value = backup;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!backupToDelete.value) return;
  await store.deleteBackup(backupToDelete.value.id);
  isDeleteModalOpen.value = false;
  backupToDelete.value = null;
};

const formatSize = (bytes) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString("id-ID", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-red-50 rounded-[12px] flex items-center justify-center">
          <DatabaseBackup class="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Backup Database</h3>
          <p class="text-brand-light text-sm">Full SQL backup history of all database tables</p>
        </div>
      </div>

      <button
        v-if="can('backup-create')"
        type="button"
        @click="handleCreate"
        :disabled="creating"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2 disabled:opacity-50"
      >
        <Loader2 v-if="creating" class="w-4 h-4 animate-spin text-white" />
        <Plus v-else class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">{{ creating ? "Creating Backup..." : "Create New Backup" }}</span>
      </button>
    </div>

    <p v-if="error" class="text-red-500 text-sm mb-4">{{ typeof error === "string" ? error : "Failed to create backup." }}</p>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="relative mb-4 max-w-sm">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search class="w-4 h-4 text-gray-400" />
        </div>
        <input
          v-model="search"
          @keyup.enter="handleSearch"
          type="text"
          placeholder="Search backup file name..."
          class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        />
      </div>

      <SkeletonTable v-if="loading" :rows="6" :cols="5" />

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">No</th>
              <th class="py-3 pr-4 font-semibold">File Backup</th>
              <th class="py-3 pr-4 font-semibold">Ukuran</th>
              <th class="py-3 pr-4 font-semibold">Dibuat Oleh</th>
              <th class="py-3 pr-4 font-semibold">Date</th>
              <th class="py-3 pr-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(backup, index) in backups" :key="backup.id" class="border-b border-[#F1F1F1] hover:bg-gray-50">
              <td class="py-3 pr-4 text-brand-light">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4">
                <div class="flex items-center gap-2">
                  <HardDrive class="w-4 h-4 text-gray-400 shrink-0" />
                  <span class="font-mono text-xs">{{ backup.filename }}</span>
                </div>
              </td>
              <td class="py-3 pr-4">{{ formatSize(backup.size_bytes) }}</td>
              <td class="py-3 pr-4">{{ backup.creator || "-" }}</td>
              <td class="py-3 pr-4">{{ formatDate(backup.created_at) }}</td>
              <td class="py-3 pr-4">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="handleDownload(backup)"
                    :disabled="downloadingId === backup.id"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-[#0C51D9] disabled:opacity-50"
                    title="Download SQL"
                  >
                    <Download class="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    v-if="can('backup-delete')"
                    @click="confirmDelete(backup)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group"
                    title="Delete"
                  >
                    <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!loading && backups.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg font-semibold">No Backups yet</p>
          <p class="text-sm text-gray-400 mt-1">Click "Create New Backup" to create the first database backup.</p>
        </div>
      </div>

      <Pagination :meta="meta" :loading="loading" item-label="backup" @page-change="load" />
    </div>

    <Transition name="fade">
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="isDeleteModalOpen = false"></div>
        <div class="bg-white rounded-[24px] p-6 w-full max-w-sm relative z-10 shadow-2xl">
          <h3 class="text-xl font-bold text-brand-dark mb-2">Delete Backup?</h3>
          <p class="text-gray-500 text-sm mb-6">
            "{{ backupToDelete?.filename }}" will be permanently deleted from the server and cannot be recovered.
          </p>
          <div class="grid grid-cols-2 gap-3">
            <button @click="isDeleteModalOpen = false" class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50">
              Cancel
            </button>
            <button @click="handleDelete" class="px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600">
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
