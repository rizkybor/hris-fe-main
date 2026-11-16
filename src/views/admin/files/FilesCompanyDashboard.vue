<script setup>
import { ref, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import {
  Archive,
  Upload,
  Calendar,
  Pencil,
  Download,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";
import { UiPageHeader, UiButton, UiBadge, UiStat, UiInput, UiEmpty, UiPagination, UiConfirmDialog } from "@/components/ui";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import { localeTag } from "@/i18n";
import { formatFileSize, cloudinaryThumb } from "@/utils/fileUtils";

const archiveStore = useFilesCompanyStore();
const { archives, statistics, loading, success, error, pagination } =
  storeToRefs(archiveStore);

const searchQuery = ref("");
const rowsPerPage = ref(10);
const isDeleteModalOpen = ref(false);
const archiveToDelete = ref(null);
const isDeleting = ref(false);

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// File-type presentation for the card cover: icon and a tint per kind.
const fileTypeMeta = (mime) => {
  if (!mime) return { icon: FileIcon, tint: "bg-ui-subtle", ink: "text-ui-muted", label: "bg-ui-muted" };
  if (mime.startsWith("image/")) return { icon: FileImage, tint: "bg-emerald-500/10", ink: "text-emerald-600", label: "bg-emerald-600" };
  if (mime === "application/pdf") return { icon: FileText, tint: "bg-red-500/10", ink: "text-red-600", label: "bg-red-600" };
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv")
    return { icon: FileSpreadsheet, tint: "bg-green-600/10", ink: "text-green-700", label: "bg-green-700" };
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("archive"))
    return { icon: FileArchive, tint: "bg-amber-500/10", ink: "text-amber-600", label: "bg-amber-600" };
  if (mime.includes("word") || mime === "application/msword")
    return { icon: FileText, tint: "bg-blue-500/10", ink: "text-blue-600", label: "bg-blue-600" };
  if (mime.includes("presentation") || mime.includes("powerpoint"))
    return { icon: FileText, tint: "bg-orange-500/10", ink: "text-orange-600", label: "bg-orange-600" };
  return { icon: FileIcon, tint: "bg-ui-subtle", ink: "text-ui-muted", label: "bg-ui-muted" };
};
const isImage = (archive) => String(archive.type_file || "").startsWith("image/") && !!archive.document_path;
// Covers that failed to load fall back to the document illustration.
const brokenCovers = ref(new Set());
const coverUrl = (archive) => (isImage(archive) && !brokenCovers.value.has(archive.id) ? cloudinaryThumb(archive.document_path, { width: 640, height: 360 }) : "");
const markBroken = (archive) => {
  brokenCovers.value = new Set(brokenCovers.value).add(archive.id);
};

// Extension badge shown next to the neutral file icon (redesign).
const fileExt = (path, mime) => {
  const base = String(path || "").split("?")[0].split("/").pop();
  if (base.includes(".")) return base.split(".").pop().slice(0, 5).toUpperCase();
  if (!mime) return "FILE";
  if (mime.includes("spreadsheetml")) return "XLSX";
  if (mime.includes("ms-excel")) return "XLS";
  if (mime.includes("wordprocessingml")) return "DOCX";
  if (mime === "application/msword") return "DOC";
  if (mime.includes("presentation")) return "PPTX";
  return mime.split("/").pop().split(/[.+-]/).pop().slice(0, 5).toUpperCase();
};
const iconBtn =
  "ui-press w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink";

onMounted(async () => {
  await archiveStore.fetchStatistics();
  await archiveStore.fetchArchives({ page: 1, perPage: rowsPerPage.value });
});

watch(
  success,
  (newValue) => {
    if (newValue) {
      setTimeout(() => archiveStore.clearMessages(), 3000);
    }
  }
);

watch(
  searchQuery,
  debounce(async (newQuery) => {
    await archiveStore.fetchArchives({
      search: newQuery,
      page: 1,
      perPage: rowsPerPage.value,
    });
  }, 400)
);

const goToPage = async (page) => {
  await archiveStore.fetchArchives({
    search: searchQuery.value,
    page,
    perPage: rowsPerPage.value,
  });
};

const prevPage = () => {
  if (pagination.value.current_page > 1) {
    goToPage(pagination.value.current_page - 1);
  }
};

const nextPage = () => {
  if (pagination.value.current_page < pagination.value.last_page) {
    goToPage(pagination.value.current_page + 1);
  }
};

const confirmDelete = (archive) => {
  archiveToDelete.value = archive;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!archiveToDelete.value) return;

  isDeleting.value = true;
  try {
    await archiveStore.deleteArchive(archiveToDelete.value.id);
    isDeleteModalOpen.value = false;
    archiveToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('files.title')" :subtitle="$t('files.subtitle')">
      <template #actions>
        <UiButton :to="{ name: 'admin.files-company.create' }" :icon="Upload" class="w-full sm:w-auto">{{ $t("common.actions.upload") }}</UiButton>
      </template>
    </UiPageHeader>

    <!-- ================= STATS ================= -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ui-stagger">
      <UiStat
        :label="$t('files.stats.total')"
        :value="statistics.total_archives"
        :hint="$t('files.stats.totalHint')"
        :icon="Archive"
        :loading="loading"
      />
      <UiStat
        :label="$t('files.stats.lastUpload')"
        :value="statistics.last_uploaded ? formatDate(statistics.last_uploaded) : '—'"
        :hint="$t('files.stats.lastUploadHint')"
        :icon="Calendar"
      />
    </div>

    <div v-if="success || error" class="space-y-3">
      <Alert
        v-if="success"
        type="success"
        :title="success"
        message=""
        :show="!!success"
        @close="archiveStore.clearMessages()"
      />
      <Alert
        v-if="error"
        type="danger"
        :title="error"
        message=""
        :show="!!error"
        @close="archiveStore.clearMessages()"
      />
    </div>

    <!-- ================= ARCHIVE LIST ================= -->
    <!-- Heading + search, cards and pagination straight on the page (no frame). -->
    <section class="space-y-4 min-w-0">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink">{{ $t("files.listTitle") }}</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">{{ $t("files.totalFiles", { n: pagination.total }, pagination.total) }}</p>
        </div>
        <UiInput v-model="searchQuery" :icon="Search" :placeholder="$t('files.searchPlaceholder')" class="w-full sm:w-72" />
      </div>

      <div>
        <SkeletonCardGrid v-if="loading" :count="6" cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />

        <div v-else-if="archives.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ui-stagger">
          <article
            v-for="archive in archives"
            :key="archive.id"
            class="ui-lift group bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden flex flex-col min-w-0"
          >
            <!-- Cover: the picture itself for images, a document sheet for the rest -->
            <router-link
              :to="{ name: 'admin.files-company.detail', params: { id: archive.id } }"
              class="relative block aspect-[16/9] overflow-hidden border-b border-ui-line"
              :class="coverUrl(archive) ? 'bg-ui-subtle' : fileTypeMeta(archive.type_file).tint"
              :aria-label="archive.document_name"
              tabindex="-1"
            >
              <img
                v-if="coverUrl(archive)"
                :src="coverUrl(archive)"
                :alt="archive.document_name"
                loading="lazy"
                decoding="async"
                width="640"
                height="360"
                class="w-full h-full object-cover transition-transform duration-ui-base group-hover:scale-[1.02]"
                @error="markBroken(archive)"
              />
              <div v-else class="absolute inset-0 flex items-center justify-center">
                <div class="relative w-[88px] h-[108px] rounded-[6px] bg-ui-surface border border-ui-line shadow-ui-raised transition-transform duration-ui-base group-hover:-translate-y-0.5">
                  <span class="absolute top-0 right-0 w-5 h-5 bg-ui-subtle rounded-bl-[6px] border-l border-b border-ui-line" aria-hidden="true"></span>
                  <div class="absolute left-3 right-6 top-4 space-y-1.5" aria-hidden="true">
                    <span class="block h-1 rounded-full bg-ui-line"></span>
                    <span class="block h-1 w-4/5 rounded-full bg-ui-line"></span>
                  </div>
                  <component :is="fileTypeMeta(archive.type_file).icon" class="absolute left-1/2 top-[52px] -translate-x-1/2 w-6 h-6" :class="fileTypeMeta(archive.type_file).ink" />
                  <span
                    class="absolute left-0 bottom-3 px-1.5 py-0.5 rounded-r-[4px] text-[10px] font-semibold tracking-wide text-white font-mono"
                    :class="fileTypeMeta(archive.type_file).label"
                  >{{ fileExt(archive.document_path || archive.document_name, archive.type_file) }}</span>
                </div>
              </div>
              <UiBadge v-if="coverUrl(archive)" tone="neutral" class="absolute top-2.5 left-2.5 font-mono shadow-ui-raised">{{ fileExt(archive.document_path || archive.document_name, archive.type_file) }}</UiBadge>
            </router-link>

            <div class="p-4 flex flex-col flex-1 min-w-0">
              <router-link
                :to="{ name: 'admin.files-company.detail', params: { id: archive.id } }"
                class="block text-ui-h3 text-ui-ink truncate hover:text-ui-accent"
                :title="archive.document_name"
              >
                {{ archive.document_name }}
              </router-link>
              <p v-if="archive.description" class="text-ui-small text-ui-muted truncate mt-0.5" :title="archive.description">{{ archive.description }}</p>
              <p v-else class="text-ui-small text-ui-faint mt-0.5">—</p>

              <div class="flex items-center gap-2 mt-auto pt-3">
                <p class="text-ui-cap text-ui-muted flex-1 min-w-0 truncate tabular-nums">
                  <span class="font-medium text-ui-text">{{ formatFileSize(archive.size_file) }}</span>
                  <span class="text-ui-faint"> · </span>{{ formatDate(archive.created_at) }}
                </p>
                <div class="flex items-center gap-0.5 -mr-1.5">
                  <button
                    type="button"
                    :class="iconBtn"
                    :title="$t('files.actions.download')"
                    :aria-label="$t('files.actions.download')"
                    @click="archiveStore.downloadArchive(archive)"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                  <router-link
                    :to="{ name: 'admin.files-company.edit', params: { id: archive.id } }"
                    :class="iconBtn"
                    :title="$t('files.actions.edit')"
                    :aria-label="$t('files.actions.edit')"
                  >
                    <Pencil class="w-4 h-4" />
                  </router-link>
                  <button
                    type="button"
                    class="ui-press w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                    :title="$t('files.actions.delete')"
                    :aria-label="$t('files.actions.delete')"
                    @click="confirmDelete(archive)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- Empty states -->
        <UiEmpty
          v-else-if="searchQuery"
          :icon="Search"
          :title="$t('common.states.noResults')"
          :message="$t('files.noResultsFor', { query: searchQuery })"
        />
        <UiEmpty v-else :icon="Archive" :title="$t('files.empty.title')" :message="$t('files.empty.message')">
          <UiButton :to="{ name: 'admin.files-company.create' }" :icon="Upload" variant="secondary">{{ $t("common.actions.upload") }}</UiButton>
        </UiEmpty>
      </div>

      <!-- Pagination -->
      <UiPagination v-if="archives.length > 0" flat :meta="pagination" :item-label="$t('files.itemLabel')" :disabled="loading" @change="goToPage" />
    </section>

    <!-- Delete Confirmation Modal -->
    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      type="danger"
      :title="$t('files.delete.title')"
      :message="$t('files.delete.message', { name: archiveToDelete?.document_name ?? '' })"
      :confirm-text="isDeleting ? $t('common.actions.deleting') : $t('files.delete.confirm')"
      :cancel-text="$t('common.actions.cancel')"
      :loading="isDeleting"
      @confirm="handleDelete"
    />
  </div>
</template>
