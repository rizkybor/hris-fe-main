<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { DatabaseBackup, Plus, Download, Trash2, RotateCcw, Loader2, HardDrive, Search, ArrowLeft } from "lucide-vue-next";
import { useBackupStore } from "@/stores/backup";
import { can } from "@/helpers/permissionHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiPageHeader, UiTable } from "@/components/ui";

const store = useBackupStore();
const alertModal = useAlertModalStore();
const { backups, meta, loading, creating, restoringId, error } = storeToRefs(store);

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

const handleRestore = async (backup) => {
  const confirmed = await alertModal.confirm(
    `This will PERMANENTLY REPLACE all current data with the contents of "${backup.filename}" (${formatDate(backup.created_at)}). A safety backup of the current state is taken automatically first, but this action itself cannot be undone from this screen, and you may be logged out afterward. Are you absolutely sure?`,
    { title: "Restore Database", confirmText: "Yes, Restore", type: "danger" }
  );
  if (!confirmed) return;

  try {
    await store.restoreBackup(backup.id);
    await alertModal.alert("Database restored successfully. The page will now reload.", { title: "Restore Complete", type: "success" });
    window.location.reload();
  } catch {
    // error state is already surfaced via `error`
  }
};

const handleDelete = async () => {
  if (!backupToDelete.value) return;
  await store.deleteBackup(backupToDelete.value.id);
  isDeleteModalOpen.value = false;
  backupToDelete.value = null;
};

// Presentation only.
const backupColumns = [
  { key: "filename", label: "File Backup" },
  { key: "size_bytes", label: "Ukuran", align: "right", width: 110 },
  { key: "creator", label: "Dibuat Oleh" },
  { key: "is_automatic", label: "Type", width: 120 },
  { key: "created_at", label: "Date", width: 180 },
  { key: "actions", label: "Aksi", align: "right", width: 130 },
];

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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Backup Database" subtitle="Full SQL backup history of all database tables">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" aria-label="Back to Settings" title="Back to Settings">
          <ArrowLeft class="w-4 h-4" /> Settings
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('backup-create')" :icon="Plus" :loading="creating" :disabled="creating" @click="handleCreate">
          {{ creating ? "Creating Backup..." : "Create New Backup" }}
        </UiButton>
      </template>
    </UiPageHeader>

    <p v-if="error" class="text-ui-small text-ui-bad">{{ typeof error === "string" ? error : "Failed to create backup." }}</p>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <div class="px-4 sm:px-5 pt-4 pb-3 flex flex-col md:flex-row md:items-center gap-3 border-b border-ui-line">
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink">Backups</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">{{ meta?.total ?? backups.length }} backups</p>
        </div>
        <UiInput v-model="search" :icon="Search" placeholder="Search backup file name..." class="md:w-[300px]" @keyup.enter="handleSearch" />
      </div>

      <UiTable :columns="backupColumns" :rows="backups" :meta="meta" :loading="loading" :skeleton-rows="6">
        <template #cell-filename="{ row }">
          <div class="flex items-center gap-2 min-w-0">
            <HardDrive class="w-4 h-4 text-ui-faint shrink-0" />
            <span class="font-mono text-ui-cap text-ui-ink truncate">{{ row.filename }}</span>
          </div>
        </template>
        <template #cell-size_bytes="{ row }">
          <span class="tabular-nums">{{ formatSize(row.size_bytes) }}</span>
        </template>
        <template #cell-creator="{ row }">{{ row.creator || "-" }}</template>
        <template #cell-is_automatic="{ row }">
          <UiBadge :tone="row.is_automatic ? 'info' : 'neutral'">{{ row.is_automatic ? "Automatic" : "Manual" }}</UiBadge>
        </template>
        <template #cell-created_at="{ row }">
          <span class="tabular-nums text-ui-muted whitespace-nowrap">{{ formatDate(row.created_at) }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UiButton
              v-if="can('backup-list')"
              variant="ghost"
              size="sm"
              :icon="Download"
              :loading="downloadingId === row.id"
              :disabled="downloadingId === row.id"
              title="Download SQL"
              aria-label="Download SQL"
              @click="handleDownload(row)"
            />
            <UiButton
              v-if="can('backup-restore')"
              variant="ghost"
              size="sm"
              :icon="RotateCcw"
              :loading="restoringId === row.id"
              :disabled="restoringId === row.id"
              title="Restore database from this backup"
              aria-label="Restore database from this backup"
              @click="handleRestore(row)"
            />
            <UiButton v-if="can('backup-delete')" variant="ghost" size="sm" :icon="Trash2" title="Delete" aria-label="Delete" @click="confirmDelete(row)" />
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="font-mono text-ui-cap text-ui-ink break-all">{{ row.filename }}</p>
              <p class="text-ui-cap text-ui-muted tabular-nums mt-1">
                {{ formatSize(row.size_bytes) }} · {{ formatDate(row.created_at) }}
              </p>
              <div class="flex items-center gap-1.5 mt-1.5">
                <UiBadge :tone="row.is_automatic ? 'info' : 'neutral'">{{ row.is_automatic ? "Automatic" : "Manual" }}</UiBadge>
                <span class="text-ui-cap text-ui-muted truncate">{{ row.creator || "-" }}</span>
              </div>
            </div>
            <div class="flex flex-col items-center gap-0.5 shrink-0">
              <UiButton v-if="can('backup-list')" variant="ghost" size="sm" :icon="Download" :loading="downloadingId === row.id" :disabled="downloadingId === row.id" aria-label="Download SQL" @click="handleDownload(row)" />
              <UiButton v-if="can('backup-restore')" variant="ghost" size="sm" :icon="RotateCcw" :loading="restoringId === row.id" :disabled="restoringId === row.id" aria-label="Restore" @click="handleRestore(row)" />
              <UiButton v-if="can('backup-delete')" variant="ghost" size="sm" :icon="Trash2" aria-label="Delete" @click="confirmDelete(row)" />
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="DatabaseBackup" title="No Backups yet" message='Click "Create New Backup" to create the first database backup.' compact />
        </template>
      </UiTable>

      <div v-if="meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" item-label="backup" @page-change="load" />
      </div>
    </section>

    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      title="Delete Backup?"
      :message="`&quot;${backupToDelete?.filename}&quot; will be permanently deleted from the server and cannot be recovered.`"
      confirm-text="Yes, Delete"
      @confirm="handleDelete"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>
