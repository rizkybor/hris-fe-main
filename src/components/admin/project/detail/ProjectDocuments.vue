<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  X,
  AlertTriangle,
  FileIcon,
} from "lucide-vue-next";
import { useProjectDocumentStore } from "@/stores/projectDocument";
import { can } from "@/helpers/permissionHelper";
import { UiButton, UiConfirmDialog, UiEmpty, UiInput, UiModal } from "@/components/ui";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const props = defineProps({
  projectId: {
    type: [String, Number],
    required: true,
  },
});

const documentStore = useProjectDocumentStore();
const { documents, loading, uploading, error } = storeToRefs(documentStore);

const isUploadModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const documentToDelete = ref(null);
const isDeleting = ref(false);
const fileInputRef = ref(null);
const formError = ref("");

const form = ref({
  document_name: "",
  description: "",
  file: null,
});

const resetForm = () => {
  form.value = { document_name: "", description: "", file: null };
  formError.value = "";
  if (fileInputRef.value) fileInputRef.value.value = "";
};

const openUploadModal = () => {
  resetForm();
  isUploadModalOpen.value = true;
};

const closeUploadModal = () => {
  isUploadModalOpen.value = false;
};

const handleFileChange = (event) => {
  form.value.file = event.target.files[0] ?? null;
};

const handleUpload = async () => {
  formError.value = "";

  if (!form.value.document_name) {
    formError.value = t("projects.documents.nameRequired");
    return;
  }
  if (!form.value.file) {
    formError.value = t("projects.documents.fileRequired");
    return;
  }

  const payload = new FormData();
  payload.append("project_id", props.projectId);
  payload.append("document_name", form.value.document_name);
  payload.append("description", form.value.description || "");
  payload.append("document_path", form.value.file);

  try {
    await documentStore.uploadDocument(payload);
    closeUploadModal();
  } catch (err) {
    formError.value =
      typeof documentStore.error === "string"
        ? documentStore.error
        : t("projects.documents.uploadFailed");
  }
};

const confirmDelete = (document) => {
  documentToDelete.value = document;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!documentToDelete.value) return;
  isDeleting.value = true;
  try {
    await documentStore.deleteDocument(documentToDelete.value.id);
    isDeleteModalOpen.value = false;
    documentToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

onMounted(() => {
  documentStore.fetchByProject(props.projectId);
});
</script>

<template>
  <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 h-full flex flex-col">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 shrink-0">
      <div class="min-w-0">
        <h3 class="text-ui-h2 text-ui-ink">{{ $t("projects.documents.title") }}</h3>
        <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.documents.subtitle") }}</p>
      </div>

      <UiButton v-if="can('project-edit')" :icon="Upload" class="w-full sm:w-auto shrink-0" @click="openUploadModal">
        {{ $t("projects.documents.upload") }}
      </UiButton>
    </div>

    <div v-if="loading" class="divide-y divide-ui-line" aria-busy="true">
      <div v-for="i in 3" :key="i" class="flex items-center gap-3 py-3">
        <Skeleton width="36px" height="36px" rounded="8px" />
        <div class="flex-1 space-y-2">
          <Skeleton width="45%" height="14px" />
          <Skeleton width="25%" height="12px" />
        </div>
      </div>
      <span class="sr-only">{{ $t("projects.documents.loading") }}</span>
    </div>

    <UiEmpty
      v-else-if="documents.length === 0"
      :icon="FileIcon"
      :title="$t('projects.documents.emptyTitle')"
      :message="$t('projects.documents.emptyMessage')"
      class="bg-ui-subtle rounded-ui-control"
    />

    <ul v-else class="divide-y divide-ui-line -my-1 ui-stagger">
      <li v-for="document in documents" :key="document.id" class="group flex items-center gap-3 py-3">
        <span class="w-9 h-9 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0">
          <FileText class="w-4 h-4" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-ui-body font-medium text-ui-ink leading-snug line-clamp-2 break-words" :title="document.document_name">
            {{ document.document_name }}
          </p>
          <p v-if="document.description" class="text-ui-cap text-ui-muted mt-0.5 line-clamp-2 break-words">
            {{ document.description }}
          </p>
          <div class="flex items-center gap-1.5 mt-1 flex-wrap text-ui-cap text-ui-muted">
            <span v-if="document.type_file" class="px-1.5 h-[18px] inline-flex items-center rounded bg-ui-subtle text-ui-text font-medium uppercase text-ui-over">
              {{ document.type_file }}
            </span>
            <span v-if="document.size_file" class="whitespace-nowrap tabular-nums">{{ document.size_file }}</span>
            <span v-if="document.size_file" class="text-ui-faint">·</span>
            <span class="whitespace-nowrap tabular-nums">{{ formatDate(document.created_at) }}</span>
          </div>
        </div>
        <div class="flex items-center gap-0.5 shrink-0">
          <a
            :href="document.document_path"
            target="_blank"
            rel="noopener"
            class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
            :title="$t('projects.documents.downloadView')"
            :aria-label="$t('projects.documents.downloadView')"
          >
            <Download class="w-4 h-4" />
          </a>
          <button
            v-if="can('project-delete')"
            type="button"
            @click="confirmDelete(document)"
            class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
            :title="$t('common.actions.delete')"
            :aria-label="$t('common.actions.delete')"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </li>
    </ul>

    <!-- UPLOAD MODAL -->
    <UiModal
      :open="isUploadModalOpen"
      :title="$t('projects.documents.upload')"
      size="sm"
      @update:open="(value) => !value && closeUploadModal()"
    >
      <form id="project-document-upload-form" @submit.prevent="handleUpload" class="space-y-4">
        <UiInput v-model="form.document_name" :label="$t('projects.documents.name')" required :placeholder="$t('projects.documents.namePlaceholder')" />
        <UiInput v-model="form.description" :label="$t('common.labels.description')" :rows="3" :placeholder="$t('projects.documents.descriptionPlaceholder')" />

        <div>
          <label for="project-document-file" class="block text-ui-small font-medium text-ui-ink mb-1.5">
            {{ $t("projects.documents.file") }}<span class="text-ui-bad"> *</span>
          </label>
          <input
            id="project-document-file"
            ref="fileInputRef"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            @change="handleFileChange"
            class="block w-full text-ui-small text-ui-text cursor-pointer file:mr-3 file:h-9 file:px-3.5 file:rounded-ui-control file:border file:border-solid file:border-ui-line-strong file:bg-ui-surface file:text-ui-small file:font-medium file:text-ui-ink hover:file:bg-ui-subtle"
          />
          <p class="text-ui-cap text-ui-muted mt-1.5">{{ $t("projects.documents.fileHint") }}</p>
        </div>

        <p v-if="formError" class="text-ui-cap text-ui-bad">{{ formError }}</p>
      </form>

      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="closeUploadModal">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="project-document-upload-form" :icon="Upload" :loading="uploading" class="flex-1 sm:flex-none">
          {{ uploading ? $t("projects.documents.uploading") : $t("common.actions.upload") }}
        </UiButton>
      </template>
    </UiModal>

    <!-- DELETE MODAL -->
    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      type="danger"
      :title="$t('projects.documents.deleteTitle')"
      :message="$t('projects.documents.deleteMessage', { name: documentToDelete?.document_name ?? '' })"
      :confirm-text="isDeleting ? $t('common.actions.deleting') : $t('projects.documents.deleteConfirm')"
      :loading="isDeleting"
      @confirm="handleDelete"
    />
  </section>
</template>
