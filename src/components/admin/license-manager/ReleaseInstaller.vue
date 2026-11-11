<script setup>
// Installer file of one version (OCCA.dmg etc.): name, size, upload date,
// short SHA-256 and Download (license-release-download); Replace and Remove
// (license-release-edit; Remove only for drafts). When a Mac version has none: a warning with a drop zone / picker.
// Emits "updated" with the release from the API.
import { computed, ref } from "vue";
import { FileArchive, Download, RefreshCw, Trash2, Upload, AlertTriangle } from "lucide-vue-next";
import CopyKeyButton from "@/components/admin/license-manager/CopyKeyButton.vue";
import { UiButton, UiSpinner } from "@/components/ui";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { formatDateTime, validationErrors } from "@/components/admin/license-manager/licenseHelpers";
import { INSTALLER_ACCEPT, formatBytes, installerFileError, needsFile } from "@/components/admin/license-manager/releaseHelpers";

const props = defineProps({
  release: { type: Object, required: true },
});
const emit = defineEmits(["updated"]);

const store = useLicenseManagerStore();
const alertModal = useAlertModalStore();

const canEdit = computed(() => can("license-release-edit"));
const canDownload = computed(() => can("license-release-download"));

const file = computed(() => props.release.file || null);
const required = computed(() => needsFile(props.release));
const isDraft = computed(() => props.release.status === "draft");

const input = ref(null);
const progress = ref(null); // 0-100 while uploading
const busy = ref(false);
const error = ref("");
const dragging = ref(false);

const shortSha = computed(() => (file.value?.sha256 ? String(file.value.sha256).slice(0, 12) : ""));

const upload = async (picked) => {
  if (!picked || !canEdit.value) return;
  error.value = installerFileError(picked);
  if (error.value) return;
  busy.value = true;
  progress.value = 0;
  try {
    const updated = await store.uploadReleaseFile(props.release.id, picked, (p) => (progress.value = p));
    emit("updated", updated);
  } catch (err) {
    const errors = validationErrors(err);
    error.value = (Array.isArray(errors.file) ? errors.file[0] : errors.file) || errorMessage(err, "Failed to upload the installer.");
  } finally {
    busy.value = false;
    progress.value = null;
  }
};

const pick = (event) => {
  const picked = event.target.files?.[0];
  event.target.value = "";
  upload(picked);
};

const drop = (event) => {
  dragging.value = false;
  if (!canEdit.value || busy.value) return;
  upload(event.dataTransfer?.files?.[0]);
};

const download = async () => {
  busy.value = true;
  error.value = "";
  try {
    await store.downloadReleaseFile(props.release);
  } catch (err) {
    error.value = errorMessage(err, "Failed to download the installer.");
  } finally {
    busy.value = false;
  }
};

const remove = async () => {
  const ok = await alertModal.confirm(`Remove the installer ${file.value.name} from version ${props.release.version}?`, {
    title: "Remove Installer",
    type: "danger",
    confirmText: "Remove",
  });
  if (!ok) return;
  busy.value = true;
  error.value = "";
  try {
    const updated = await store.deleteReleaseFile(props.release.id);
    emit("updated", updated || { ...props.release, file: null });
  } catch (err) {
    const errors = validationErrors(err);
    error.value = (Array.isArray(errors.file) ? errors.file[0] : errors.file) || errorMessage(err, "Failed to remove the installer.");
  } finally {
    busy.value = false;
  }
};

</script>

<template>
  <div
    v-if="file || required"
    class="rounded-ui-control border px-3.5 py-3 transition-colors"
    :class="[
      file ? 'border-ui-line bg-ui-subtle/60' : 'border-dashed border-ui-warn/40 bg-ui-warn-soft',
      dragging ? '!border-ui-accent !bg-ui-accent-soft' : '',
    ]"
    @dragover.prevent="canEdit && !busy && (dragging = true)"
    @dragleave.prevent="dragging = false"
    @drop.prevent="drop"
  >
    <input ref="input" type="file" :accept="INSTALLER_ACCEPT" class="hidden" @change="pick" />

    <!-- Installer present -->
    <div v-if="file" class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-8 h-8 rounded-ui-control bg-ui-surface border border-ui-line flex items-center justify-center shrink-0">
          <FileArchive class="w-4 h-4 text-ui-muted" />
        </div>
        <div class="min-w-0">
          <p class="text-ui-small font-medium text-ui-ink truncate" :title="file.name">{{ file.name }}</p>
          <p class="text-ui-cap text-ui-muted flex flex-wrap items-center gap-x-1.5">
            <span class="tabular-nums">{{ formatBytes(file.size) }}</span>
            <template v-if="file.uploaded_at"><span class="text-ui-faint">·</span> Uploaded {{ formatDateTime(file.uploaded_at) }}</template>
            <template v-if="shortSha">
              <span class="text-ui-faint">·</span>
              <span class="inline-flex items-center gap-1">
                SHA-256 <span class="font-mono text-ui-ink" :title="file.sha256">{{ shortSha }}</span>
                <CopyKeyButton :value="file.sha256" />
              </span>
            </template>
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 shrink-0">
        <UiButton v-if="canDownload" variant="secondary" size="sm" :icon="Download" :disabled="busy" @click="download">Download</UiButton>
        <UiButton v-if="canEdit" variant="secondary" size="sm" :icon="RefreshCw" :disabled="busy" @click="input?.click()">Replace</UiButton>
        <UiButton v-if="canEdit && isDraft" variant="danger" size="sm" :icon="Trash2" :disabled="busy" @click="remove">Remove</UiButton>
      </div>
    </div>

    <!-- Missing and needed -->
    <div v-else class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <AlertTriangle class="w-[18px] h-[18px] text-ui-warn shrink-0" />
        <div class="min-w-0">
          <p class="text-ui-small font-semibold text-ui-warn">No installer yet</p>
          <p class="text-ui-cap text-ui-text">
            Upload the Mac installer (.dmg, .zip or .pkg, up to 2 GB)<template v-if="canEdit">, or drop it here</template>. It is needed to publish.
          </p>
        </div>
      </div>
      <UiButton v-if="canEdit" variant="secondary" size="sm" :icon="Upload" :disabled="busy" @click="input?.click()">Upload</UiButton>
    </div>

    <!-- Upload progress -->
    <div v-if="progress !== null" class="mt-3">
      <div class="flex items-center justify-between text-ui-cap text-ui-muted mb-1">
        <UiSpinner size="12px" label="Uploading…" :center="false" />
        <span class="tabular-nums font-medium text-ui-ink">{{ progress }}%</span>
      </div>
      <div class="h-1.5 w-full rounded-full bg-ui-line overflow-hidden">
        <div class="h-full rounded-full bg-ui-ink transition-all" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>
    <p v-if="error" class="text-ui-cap text-ui-bad mt-2">{{ error }}</p>
  </div>
</template>
