<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import {
  Archive,
  Upload,
  FileUp,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
  Info,
  Paperclip,
  ArrowLeft,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";
import { errorMessage } from "@/helpers/errorHelper";
import { UiPageHeader, UiButton, UiBadge, UiInput } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const router = useRouter();
const archiveStore = useFilesCompanyStore();

const loading = ref(false);
const error = ref("");
const success = ref("");

const form = ref({
  file_name: "",
  description: "",
  file: null,
});

const fileError = ref(false);
const nameError = ref(false);

const onFileChange = (event) => {
  form.value.file = event.target.files[0] || null;
  fileError.value = false;
};

// Mirrors the archive list's file-type presentation so the chosen file is
// recognizable at a glance before it's even uploaded.
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

const selectedFileMeta = computed(() => fileTypeMeta(form.value.file?.type));

// Extension badge for the chosen file (redesign: neutral icon + extension).
const fileExt = (file) => {
  const name = file?.name || "";
  return name.includes(".") ? name.split(".").pop().slice(0, 5).toUpperCase() : "FILE";
};
const formatSize = (bytes) => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const submit = async () => {
  error.value = "";
  success.value = "";
  fileError.value = false;
  nameError.value = false;

  if (!form.value.file_name) nameError.value = true;
  if (!form.value.file) fileError.value = true;

  if (nameError.value || fileError.value) {
    error.value = t("files.form.nameAndFileRequired");
    return;
  }

  const payload = new FormData();
  payload.append("document_name", form.value.file_name);
  payload.append("description", form.value.description || "");
  payload.append("document_path", form.value.file);
  payload.append("type_file", form.value.file.type);
  payload.append("size_file", form.value.file.size);

  loading.value = true;
  try {
    await archiveStore.createArchive(payload);
    success.value = t("files.form.uploadSuccess");

    setTimeout(() => {
      router.push({ name: "admin.files-company.dashboard" });
    }, 1200);
  } catch (err) {
    error.value = errorMessage(err, t("files.form.uploadFailed"));
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <form class="p-1 sm:p-3 lg:p-5 space-y-5" @submit.prevent="submit">
    <UiPageHeader :title="$t('files.create.title')" :subtitle="$t('files.create.subtitle')">
      <template #eyebrow>
        <button
          type="button"
          @click="$router.back()"
          class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
          :aria-label="$t('common.actions.back')"
        >
          <ArrowLeft class="w-4 h-4" />
          {{ $t("common.actions.back") }}
        </button>
      </template>
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" @click="$router.back()">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" :icon="Upload" :loading="loading">
            {{ loading ? $t("files.form.uploading") : $t("files.form.uploadFile") }}
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
            id="file_name"
:label="$t('files.form.nameRequiredLabel')"
            :placeholder="$t('files.form.namePlaceholder')"
            v-model="form.file_name"
            :error="nameError ? $t('files.form.nameRequired') : ''"
          />

          <UiInput
            id="description"
:label="$t('files.form.descriptionOptional')"
            :placeholder="$t('files.form.descriptionPlaceholder')"
            v-model="form.description"
            :rows="4"
          />
        </div>
      </section>

      <!-- Upload -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
        <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
          <div class="w-8 h-8 rounded-ui-control border border-ui-line text-ui-muted flex items-center justify-center shrink-0">
            <Paperclip class="w-4 h-4" />
          </div>
          <h2 class="text-ui-h2 text-ui-ink">{{ $t("files.form.fileSection") }}</h2>
        </div>

        <p class="block text-ui-small font-medium text-ui-ink mb-1.5">
          {{ $t("files.form.uploadFile") }} <span class="text-ui-bad">*</span>
        </p>
        <label
          class="flex flex-col items-center justify-center gap-2 w-full py-10 px-4 border border-dashed rounded-ui-card cursor-pointer text-center transition-colors focus-within:shadow-ui-focus"
          :class="fileError ? 'border-ui-bad/50 bg-ui-bad-soft' : 'border-ui-line-strong bg-ui-subtle/50 hover:border-ui-accent hover:bg-ui-accent-soft/40'"
        >
          <div class="w-11 h-11 rounded-ui-control bg-ui-surface border border-ui-line text-ui-muted flex items-center justify-center">
            <component :is="form.file ? selectedFileMeta.icon : FileUp" class="w-5 h-5" />
          </div>
          <span class="text-ui-body text-ui-ink font-medium break-all">
            {{ form.file ? form.file.name : $t("files.form.chooseFile") }}
          </span>
          <span v-if="form.file" class="flex items-center gap-1.5">
            <UiBadge tone="outline" class="font-mono">{{ fileExt(form.file) }}</UiBadge>
            <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatSize(form.file.size) }}</span>
          </span>
          <span v-else class="text-ui-cap text-ui-muted">{{ $t("files.form.dragDrop") }}</span>
          <input type="file" class="sr-only" @change="onFileChange" />
        </label>
        <p v-if="fileError" class="mt-1.5 text-ui-cap text-ui-bad">{{ $t("files.form.fileRequired") }}</p>
      </section>
    </div>

    <!-- Phones: actions at the end of the form, full width -->
    <div class="sm:hidden flex flex-col gap-2">
      <UiButton type="submit" size="lg" block :icon="Upload" :loading="loading">
        {{ loading ? $t("files.form.uploading") : $t("files.form.uploadFile") }}
      </UiButton>
      <UiButton variant="ghost" size="lg" block @click="$router.back()">{{ $t("common.actions.cancel") }}</UiButton>
    </div>
  </form>
</template>
