<script setup>
import { onMounted, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { FileText, Image as ImageIcon, Upload, Download, Trash2, AlertTriangle, X } from "lucide-vue-next";
import { useEmployeeFileStore } from "@/stores/employeeFile";
import { can } from "@/helpers/permissionHelper";
import { UiAlert, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiModal } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const props = defineProps({
  employeeId: {
    type: [String, Number],
    required: true,
  },
});

const fileStore = useEmployeeFileStore();
const { files, loading, uploading } = storeToRefs(fileStore);

const fileInputRef = ref(null);
const uploadError = ref("");
const isDeleteModalOpen = ref(false);
const fileToDelete = ref(null);
const isDeleting = ref(false);

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const openFilePicker = () => fileInputRef.value?.click();

// Files staged after picking -- each needs a required display name before upload.
const isNameModalOpen = ref(false);
const pendingFiles = ref([]);
const pendingNames = ref([]);
const nameError = ref("");

const stripExtension = (filename) => filename.replace(/\.[^/.]+$/, "");

const handleFileChange = (event) => {
  const selected = Array.from(event.target.files || []);
  uploadError.value = "";

  const invalid = selected.find(
    (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE
  );
  if (invalid) {
    uploadError.value = t("employees.files.notAllowed", { name: invalid.name });
    if (fileInputRef.value) fileInputRef.value.value = "";
    return;
  }

  if (selected.length === 0) return;

  pendingFiles.value = selected;
  pendingNames.value = selected.map((file) => stripExtension(file.name));
  nameError.value = "";
  isNameModalOpen.value = true;
  if (fileInputRef.value) fileInputRef.value.value = "";
};

const cancelPendingUpload = () => {
  isNameModalOpen.value = false;
  pendingFiles.value = [];
  pendingNames.value = [];
};

const confirmUpload = async () => {
  if (pendingNames.value.some((name) => !name || !name.trim())) {
    nameError.value = t("employees.files.nameRequired");
    return;
  }

  uploadError.value = "";
  try {
    await fileStore.uploadFiles(props.employeeId, pendingFiles.value, pendingNames.value);
    isNameModalOpen.value = false;
    pendingFiles.value = [];
    pendingNames.value = [];
  } catch (err) {
    uploadError.value =
      typeof fileStore.error === "string" ? fileStore.error : t("employees.files.uploadFailed");
  }
};

const confirmDelete = (file) => {
  fileToDelete.value = file;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!fileToDelete.value) return;
  isDeleting.value = true;
  try {
    await fileStore.deleteFile(fileToDelete.value.id);
    isDeleteModalOpen.value = false;
    fileToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};

const isImage = (mimeType) => mimeType?.startsWith("image/");

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

onMounted(() => {
  fileStore.fetchByEmployee(props.employeeId);
});
</script>

<template>
  <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
    <header class="flex flex-col sm:flex-row sm:items-center gap-3 px-5 pt-[18px] sm:px-6 pb-4 border-b border-ui-line">
      <div class="flex-1 min-w-0">
        <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.files.title") }}</h3>
        <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.files.subtitle") }}</p>
      </div>
      <UiButton
        v-if="can('employee-edit')"
        :icon="Upload"
        :loading="uploading"
        class="w-full sm:w-auto"
        @click="openFilePicker"
      >
        {{ uploading ? $t("employees.files.uploading") : $t("employees.files.uploadFile") }}
      </UiButton>
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg"
        class="hidden"
        @change="handleFileChange"
      />
    </header>

    <div class="p-4 sm:p-5 space-y-4">
      <UiAlert v-if="uploadError" tone="bad" :message="uploadError" />

      <SkeletonList v-if="loading" :rows="3" />

      <UiEmpty
        v-else-if="files.length === 0"
        :icon="FileText"
        :title="$t('employees.files.empty')"
        :message="$t('employees.files.emptyHint')"
        class="border border-dashed border-ui-line-strong rounded-ui-card"
      />

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 ui-stagger">
        <div
          v-for="file in files"
          :key="file.id"
          class="flex items-start gap-3 p-3.5 border border-ui-line rounded-ui-card hover:border-ui-line-strong transition-colors"
        >
          <div class="w-10 h-10 rounded-ui-control bg-ui-subtle border border-ui-line text-ui-muted flex items-center justify-center shrink-0">
            <ImageIcon v-if="isImage(file.mime_type)" class="w-[18px] h-[18px]" />
            <FileText v-else class="w-[18px] h-[18px]" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-ui-h3 text-ui-ink truncate" :title="file.display_name || file.original_name">
              {{ file.display_name || file.original_name }}
            </p>
            <p class="text-ui-cap text-ui-muted truncate" :title="file.original_name">{{ file.original_name }}</p>
            <div class="flex items-center gap-x-2 gap-y-0.5 mt-1 flex-wrap text-ui-cap text-ui-faint">
              <span v-if="file.size_file" class="tabular-nums">{{ file.size_file }}</span>
              <span class="tabular-nums">{{ formatDate(file.created_at) }}</span>
              <span v-if="file.uploader?.name">{{ $t("employees.files.uploadedBy", { name: file.uploader.name }) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <a
              :href="file.url"
              target="_blank"
              rel="noopener"
              class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control border border-ui-line text-ui-muted hover:text-ui-ink hover:bg-ui-hover focus:outline-none focus-visible:shadow-ui-focus"
              :title="$t('common.actions.view')"
              :aria-label="$t('common.actions.view')"
            >
              <Download class="w-4 h-4" />
            </a>
            <button
              v-if="can('employee-delete')"
              type="button"
              @click="confirmDelete(file)"
              class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control border border-ui-line text-ui-muted hover:text-ui-bad hover:bg-ui-bad-soft focus:outline-none focus-visible:shadow-ui-focus"
              :title="$t('common.actions.delete')"
              :aria-label="$t('common.actions.delete')"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- DELETE MODAL -->
    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      :title="$t('employees.files.deleteTitle')"
      :message="$t('employees.files.deleteMessage', { name: fileToDelete?.display_name || fileToDelete?.original_name })"
      type="danger"
      :cancel-text="$t('common.actions.cancel')"
      :confirm-text="isDeleting ? $t('common.actions.deleting') : $t('employees.files.confirmDelete')"
      :loading="isDeleting"
      @confirm="handleDelete"
    />

    <!-- NAME FILES MODAL -->
    <UiModal
      :open="isNameModalOpen"
      :title="$t('employees.files.nameModalTitle')"
      :description="$t('employees.files.nameModalDescription')"
      @update:open="(value) => { if (!value) cancelPendingUpload(); }"
    >
      <div class="space-y-3">
        <div v-for="(file, index) in pendingFiles" :key="index" class="border border-ui-line rounded-ui-card p-3">
          <p class="text-ui-cap text-ui-muted mb-1.5 truncate" :title="file.name">{{ file.name }}</p>
          <UiInput
            v-model="pendingNames[index]"
            required
            :placeholder="$t('employees.files.namePlaceholder')"
          />
        </div>
        <UiAlert v-if="nameError" tone="bad" :message="nameError" />
      </div>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="cancelPendingUpload">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton :loading="uploading" class="flex-1 sm:flex-none" @click="confirmUpload">
          {{ uploading ? $t("employees.files.uploading") : $t("common.actions.upload") }}
        </UiButton>
      </template>
    </UiModal>
  </section>
</template>
