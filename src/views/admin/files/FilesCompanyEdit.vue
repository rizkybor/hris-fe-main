<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Archive,
  Save,
  ArrowLeft,
  FileUp,
  X,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
  Info,
  Paperclip,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";
import { errorMessage } from "@/helpers/errorHelper";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiSpinner, UiEmpty } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const archiveStore = useFilesCompanyStore();
const route = useRoute();
const router = useRouter();
const archiveId = route.params.id;

const loading = ref(true);
const submitting = ref(false);
const loadError = ref("");
const error = ref("");
const success = ref("");

const form = ref({
  document_name: "",
  description: "",
  new_file: null,
  remove_file: false,
});
const fileNameError = ref(false);

let tempPreviewURL = null;

const isImage = (type) => type?.startsWith("image/");

const fetchArchive = async () => {
  loading.value = true;
  try {
    await archiveStore.fetchArchiveById(archiveId);
    const archive = archiveStore.currentArchive;

    if (!archive) {
      loadError.value = t("files.edit.notFound");
      return;
    }

    form.value.document_name = archive.document_name || "";
    form.value.description = archive.description || "";
    form.value.new_file = null;
    form.value.remove_file = false;

    if (tempPreviewURL) {
      URL.revokeObjectURL(tempPreviewURL);
      tempPreviewURL = null;
    }
  } catch (err) {
    console.error(err);
    loadError.value = t("files.edit.loadFailed");
  } finally {
    loading.value = false;
  }
};

onMounted(fetchArchive);
onBeforeUnmount(() => {
  if (tempPreviewURL) URL.revokeObjectURL(tempPreviewURL);
});

const onFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  form.value.new_file = file;
  form.value.remove_file = false;

  if (tempPreviewURL) URL.revokeObjectURL(tempPreviewURL);
  tempPreviewURL = URL.createObjectURL(file);
};

const removeFile = () => {
  const archive = archiveStore.currentArchive;
  if (!archive?.document_path) return;

  form.value.remove_file = true;
  form.value.new_file = null;

  if (tempPreviewURL) {
    URL.revokeObjectURL(tempPreviewURL);
    tempPreviewURL = null;
  }
};

const submit = async () => {
  error.value = "";
  success.value = "";
  fileNameError.value = false;

  if (!form.value.document_name) {
    fileNameError.value = true;
    error.value = t("files.form.nameRequired");
    return;
  }

  // A company file always has a file: removing it needs a replacement
  // (the API rejects it otherwise, before deleting anything).
  if (form.value.remove_file && !form.value.new_file) {
    error.value = t("files.form.replacementRequired");
    return;
  }

  submitting.value = true;
  try {
    const formData = new FormData();
    formData.append("document_name", form.value.document_name);
    formData.append("description", form.value.description);

    if (form.value.new_file) {
      formData.append("document_path", form.value.new_file);
    }
    if (form.value.remove_file) {
      formData.append("remove_file", "1");
    }

    const updatedArchive = await archiveStore.updateArchive(archiveId, formData);

    form.value.new_file = null;
    form.value.remove_file = false;
    form.value.document_name = updatedArchive.document_name;
    form.value.description = updatedArchive.description;

    success.value = t("files.edit.updateSuccess");

    setTimeout(() => {
      router.push({ name: "admin.files-company.dashboard" });
    }, 1200);
  } catch (err) {
    console.error(err);
    error.value = errorMessage(err, t("files.edit.updateFailed"));
  } finally {
    submitting.value = false;
  }
};

const previewFile = computed(() => {
  if (form.value.new_file) return tempPreviewURL;
  if (archiveStore.currentArchive?.document_path && !form.value.remove_file)
    return archiveStore.currentArchive.document_path;
  return null;
});

// Mirrors the archive list's file-type presentation for the "replace file" dropzone.
const fileTypeMeta = (mime) => {
  if (!mime) return { icon: FileIcon, class: "text-gray-400" };
  if (mime.startsWith("image/")) return { icon: FileImage, class: "text-emerald-500" };
  if (mime === "application/pdf") return { icon: FileText, class: "text-red-500" };
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv")
    return { icon: FileSpreadsheet, class: "text-green-600" };
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("archive"))
    return { icon: FileArchive, class: "text-amber-500" };
  if (mime.includes("word") || mime === "application/msword")
    return { icon: FileText, class: "text-blue-500" };
  return { icon: FileIcon, class: "text-gray-400" };
};

const newFileMeta = computed(() => fileTypeMeta(form.value.new_file?.type));

// Extension badge (redesign: neutral icon + extension).
const fileExt = (name, mime) => {
  const base = String(name || "").split("?")[0].split("/").pop();
  if (base.includes(".")) return base.split(".").pop().slice(0, 5).toUpperCase();
  if (!mime) return "FILE";
  if (mime.includes("spreadsheetml")) return "XLSX";
  if (mime.includes("wordprocessingml")) return "DOCX";
  return mime.split("/").pop().split(/[.+-]/).pop().slice(0, 5).toUpperCase();
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('files.edit.title')" :subtitle="$t('files.edit.subtitle')">
      <template #eyebrow>
        <button
          type="button"
          @click="router.back()"
          class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
          :aria-label="$t('common.actions.back')"
        >
          <ArrowLeft class="w-4 h-4" />
          {{ $t("common.actions.back") }}
        </button>
      </template>
      <template v-if="!loading && !loadError" #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="files-company-edit-form" :icon="Save" :loading="submitting">
            {{ submitting ? $t("common.actions.saving") : $t("common.actions.saveChanges") }}
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <div v-if="error || success" class="space-y-3">
      <Alert
        v-if="error"
        type="danger"
        :title="error"
        message=""
        :show="!!error"
        @close="error = ''"
      />
      <Alert
        v-if="success"
        type="success"
        :title="success"
        message=""
        :show="!!success"
      />
    </div>

    <!-- Loading -->
    <UiSpinner v-if="loading" :label="$t('files.edit.loading')" class="!py-20" />

    <!-- Load error -->
    <div v-else-if="loadError" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="Archive" :title="loadError" />
    </div>

    <!-- Form -->
    <form v-else id="files-company-edit-form" class="space-y-5" @submit.prevent="submit">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start ui-stagger">
        <!-- File Info -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
          <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
            <div class="w-8 h-8 rounded-ui-control border border-ui-line text-ui-muted flex items-center justify-center shrink-0">
              <Info class="w-4 h-4" />
            </div>
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("files.form.infoSection") }}</h2>
          </div>

          <div class="space-y-5">
            <UiInput
              id="document_name"
:label="$t('files.form.nameRequiredLabel')"
              :placeholder="$t('files.edit.namePlaceholder')"
              v-model="form.document_name"
              :error="fileNameError ? $t('files.form.nameRequired') : ''"
            />

            <UiInput
              id="description"
:label="$t('files.form.descriptionOptional')"
              :placeholder="$t('files.edit.descriptionPlaceholder')"
              v-model="form.description"
              :rows="4"
            />
          </div>
        </section>

        <!-- File -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
          <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
            <div class="w-8 h-8 rounded-ui-control border border-ui-line text-ui-muted flex items-center justify-center shrink-0">
              <Paperclip class="w-4 h-4" />
            </div>
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("files.form.fileSection") }}</h2>
          </div>

          <!-- Current / Preview File -->
          <div v-if="previewFile" class="mb-5">
            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("files.edit.filePreview") }}</p>

            <div
              v-if="!form.new_file && !form.remove_file"
              class="flex items-center gap-3 px-3 py-2.5 border border-ui-line rounded-ui-control mb-3"
            >
              <div class="w-9 h-9 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0">
                <component :is="fileTypeMeta(archiveStore.currentArchive.type_file).icon" class="w-4 h-4" />
              </div>
              <a
                :href="archiveStore.currentArchive.document_path"
                target="_blank"
                class="flex-1 min-w-0 text-ui-body font-medium text-ui-accent hover:underline truncate"
              >
                {{ archiveStore.currentArchive.document_name }}
              </a>
              <UiBadge tone="outline" class="font-mono shrink-0">
                {{ fileExt(archiveStore.currentArchive.document_path, archiveStore.currentArchive.type_file) }}
              </UiBadge>
              <UiButton variant="danger" size="sm" :icon="X" class="shrink-0" @click="removeFile">{{ $t("common.actions.remove") }}</UiButton>
            </div>

            <div class="w-full max-h-[400px] overflow-auto border border-ui-line rounded-ui-card bg-ui-subtle p-1">
              <img
                v-if="isImage(form.new_file?.type || archiveStore.currentArchive?.type_file)"
                :src="previewFile"
                :alt="$t('files.edit.filePreview')"
                class="w-full object-contain rounded-ui-control"
              />
              <iframe
                v-else-if="(form.new_file?.type || archiveStore.currentArchive?.type_file) === 'application/pdf'"
                :src="previewFile"
                class="w-full h-[400px] rounded-ui-control bg-ui-surface"
              ></iframe>
            </div>
          </div>

          <!-- Upload New File -->
          <div>
            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("files.edit.replaceFile") }}</p>
            <label
              class="flex flex-col items-center justify-center gap-2 w-full py-8 px-4 border border-dashed border-ui-line-strong bg-ui-subtle/50 rounded-ui-card cursor-pointer text-center transition-colors hover:border-ui-accent hover:bg-ui-accent-soft/40 focus-within:shadow-ui-focus"
            >
              <div class="w-11 h-11 rounded-ui-control bg-ui-surface border border-ui-line text-ui-muted flex items-center justify-center">
                <component :is="form.new_file ? newFileMeta.icon : FileUp" class="w-5 h-5" />
              </div>
              <span class="text-ui-body text-ui-ink font-medium break-all">
                {{ form.new_file ? form.new_file.name : $t("files.edit.chooseNewFile") }}
              </span>
              <UiBadge v-if="form.new_file" tone="outline" class="font-mono">{{ fileExt(form.new_file.name, form.new_file.type) }}</UiBadge>
              <input type="file" class="sr-only" @change="onFileChange" />
            </label>
          </div>
        </section>
      </div>

      <!-- Phones: actions at the end of the form, full width -->
      <div class="sm:hidden flex flex-col gap-2">
        <UiButton type="submit" size="lg" block :icon="Save" :loading="submitting">
          {{ submitting ? $t("common.actions.saving") : $t("common.actions.saveChanges") }}
        </UiButton>
        <UiButton variant="ghost" size="lg" block @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
      </div>
    </form>
  </div>
</template>
