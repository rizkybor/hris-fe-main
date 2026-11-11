<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { DatabaseBackup, Plus, Download, Trash2, RotateCcw, Loader2, HardDrive, Search, ArrowLeft } from "lucide-vue-next";
import { useBackupStore } from "@/stores/backup";
import { can } from "@/helpers/permissionHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiPageHeader, UiTable } from "@/components/ui";

const { t } = useI18n();
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
    t("settings.backup.restoreConfirm.message", { file: backup.filename, date: formatDate(backup.created_at) }),
    { title: t("settings.backup.restoreConfirm.title"), confirmText: t("settings.backup.restoreConfirm.confirm"), type: "danger" }
  );
  if (!confirmed) return;

  try {
    await store.restoreBackup(backup.id);
    await alertModal.alert(t("settings.backup.restoreDone.message"), { title: t("settings.backup.restoreDone.title"), type: "success" });
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
const backupColumns = computed(() => [
  { key: "filename", label: t("settings.backup.columns.file") },
  { key: "size_bytes", label: t("settings.backup.columns.size"), align: "right", width: 110 },
  { key: "creator", label: t("settings.backup.columns.createdBy") },
  { key: "is_automatic", label: t("settings.backup.columns.type"), width: 120 },
  { key: "created_at", label: t("settings.backup.columns.date"), width: 180 },
  { key: "actions", label: t("common.labels.actions"), align: "right", width: 130 },
]);

const formatSize = (bytes) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString(localeTag(), { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('settings.backup.title')" :subtitle="$t('settings.backup.subtitle')">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" :aria-label="$t('settings.backToSettings')" :title="$t('settings.backToSettings')">
          <ArrowLeft class="w-4 h-4" /> {{ $t("settings.settings") }}
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('backup-create')" :icon="Plus" :loading="creating" :disabled="creating" @click="handleCreate">
          {{ creating ? $t("settings.backup.creating") : $t("settings.backup.create") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <p v-if="error" class="text-ui-small text-ui-bad">{{ typeof error === "string" ? error : $t("settings.backup.createFailed") }}</p>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <div class="px-4 sm:px-5 pt-4 pb-3 flex flex-col md:flex-row md:items-center gap-3 border-b border-ui-line">
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink">{{ $t("settings.backup.listTitle") }}</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">{{ $t("settings.backup.count", { n: meta?.total ?? backups.length }, meta?.total ?? backups.length) }}</p>
        </div>
        <UiInput v-model="search" :icon="Search" :placeholder="$t('settings.backup.searchPlaceholder')" class="md:w-[300px]" @keyup.enter="handleSearch" />
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
          <UiBadge :tone="row.is_automatic ? 'info' : 'neutral'">{{ row.is_automatic ? $t("settings.backup.automatic") : $t("settings.backup.manual") }}</UiBadge>
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
              :title="$t('settings.backup.downloadSql')"
              :aria-label="$t('settings.backup.downloadSql')"
              @click="handleDownload(row)"
            />
            <UiButton
              v-if="can('backup-restore')"
              variant="ghost"
              size="sm"
              :icon="RotateCcw"
              :loading="restoringId === row.id"
              :disabled="restoringId === row.id"
              :title="$t('settings.backup.restoreFromBackup')"
              :aria-label="$t('settings.backup.restoreFromBackup')"
              @click="handleRestore(row)"
            />
            <UiButton v-if="can('backup-delete')" variant="ghost" size="sm" :icon="Trash2" :title="$t('common.actions.delete')" :aria-label="$t('common.actions.delete')" @click="confirmDelete(row)" />
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
                <UiBadge :tone="row.is_automatic ? 'info' : 'neutral'">{{ row.is_automatic ? $t("settings.backup.automatic") : $t("settings.backup.manual") }}</UiBadge>
                <span class="text-ui-cap text-ui-muted truncate">{{ row.creator || "-" }}</span>
              </div>
            </div>
            <div class="flex flex-col items-center gap-0.5 shrink-0">
              <UiButton v-if="can('backup-list')" variant="ghost" size="sm" :icon="Download" :loading="downloadingId === row.id" :disabled="downloadingId === row.id" :aria-label="$t('settings.backup.downloadSql')" @click="handleDownload(row)" />
              <UiButton v-if="can('backup-restore')" variant="ghost" size="sm" :icon="RotateCcw" :loading="restoringId === row.id" :disabled="restoringId === row.id" :aria-label="$t('settings.backup.restore')" @click="handleRestore(row)" />
              <UiButton v-if="can('backup-delete')" variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('common.actions.delete')" @click="confirmDelete(row)" />
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="DatabaseBackup" :title="$t('settings.backup.emptyTitle')" :message="$t('settings.backup.emptyMessage')" compact />
        </template>
      </UiTable>

      <div v-if="meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('settings.backup.itemLabel')" @page-change="load" />
      </div>
    </section>

    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      :title="$t('settings.backup.deleteConfirm.title')"
      :message="$t('settings.backup.deleteConfirm.message', { file: backupToDelete?.filename })"
      :confirm-text="$t('settings.backup.deleteConfirm.confirm')"
      @confirm="handleDelete"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>
