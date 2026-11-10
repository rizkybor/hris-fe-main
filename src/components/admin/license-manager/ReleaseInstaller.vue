<script setup>
// Installer file of one version (OCCA.dmg etc.): name, size, upload date,
// short SHA-256 and Download (license-release-download); Replace and Remove
// (license-release-edit; Remove only for drafts). When a Mac version has none: a warning with a drop zone / picker.
// Emits "updated" with the release from the API.
import { computed, ref } from "vue";
import { FileArchive, Download, RefreshCw, Trash2, Upload, AlertTriangle, Loader2 } from "lucide-vue-next";
import CopyKeyButton from "@/components/admin/license-manager/CopyKeyButton.vue";
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

const smallBtn =
  "inline-flex items-center gap-1.5 border border-[#DCDEDD] bg-white rounded-[10px] px-2.5 py-1.5 text-xs font-semibold text-brand-dark hover:border-violet-400 disabled:opacity-50";
</script>

<template>
  <div
    v-if="file || required"
    class="rounded-[12px] border px-3.5 py-3 transition-colors"
    :class="[
      file ? 'border-[#DCDEDD] bg-slate-50' : 'border-dashed border-amber-300 bg-amber-50/60',
      dragging ? '!border-violet-400 !bg-violet-50' : '',
    ]"
    @dragover.prevent="canEdit && !busy && (dragging = true)"
    @dragleave.prevent="dragging = false"
    @drop.prevent="drop"
  >
    <input ref="input" type="file" :accept="INSTALLER_ACCEPT" class="hidden" @change="pick" />

    <!-- Installer present -->
    <div v-if="file" class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-9 h-9 rounded-[10px] bg-white border border-[#DCDEDD] flex items-center justify-center shrink-0">
          <FileArchive class="w-[18px] h-[18px] text-violet-600" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-brand-dark truncate" :title="file.name">{{ file.name }}</p>
          <p class="text-[11px] text-brand-light flex flex-wrap items-center gap-x-1.5">
            <span class="tabular-nums">{{ formatBytes(file.size) }}</span>
            <template v-if="file.uploaded_at"><span class="text-gray-300">·</span> Uploaded {{ formatDateTime(file.uploaded_at) }}</template>
            <template v-if="shortSha">
              <span class="text-gray-300">·</span>
              <span class="inline-flex items-center gap-1">
                SHA-256 <span class="font-mono text-brand-dark" :title="file.sha256">{{ shortSha }}</span>
                <CopyKeyButton :value="file.sha256" />
              </span>
            </template>
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 shrink-0">
        <button v-if="canDownload" type="button" :class="smallBtn" :disabled="busy" @click="download">
          <Download class="w-3.5 h-3.5" /> Download
        </button>
        <button v-if="canEdit" type="button" :class="smallBtn" :disabled="busy" @click="input?.click()">
          <RefreshCw class="w-3.5 h-3.5" /> Replace
        </button>
        <button
          v-if="canEdit && isDraft"
          type="button"
          :class="[smallBtn, 'hover:!border-red-400 hover:text-red-600']"
          :disabled="busy"
          @click="remove"
        >
          <Trash2 class="w-3.5 h-3.5" /> Remove
        </button>
      </div>
    </div>

    <!-- Missing and needed -->
    <div v-else class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <AlertTriangle class="w-5 h-5 text-amber-600 shrink-0" />
        <div class="min-w-0">
          <p class="text-sm font-semibold text-amber-800">No installer yet</p>
          <p class="text-[11px] text-amber-700">
            Upload the Mac installer (.dmg, .zip or .pkg, up to 2 GB)<template v-if="canEdit">, or drop it here</template>. It is needed to publish.
          </p>
        </div>
      </div>
      <button v-if="canEdit" type="button" :class="smallBtn" :disabled="busy" @click="input?.click()">
        <Upload class="w-3.5 h-3.5" /> Upload
      </button>
    </div>

    <!-- Upload progress -->
    <div v-if="progress !== null" class="mt-3">
      <div class="flex items-center justify-between text-[11px] text-brand-light mb-1">
        <span class="inline-flex items-center gap-1"><Loader2 class="w-3 h-3 animate-spin" /> Uploading…</span>
        <span class="tabular-nums font-semibold text-brand-dark">{{ progress }}%</span>
      </div>
      <div class="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div class="h-full rounded-full bg-violet-500 transition-all" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>
    <p v-if="error" class="text-xs text-red-600 mt-2">{{ error }}</p>
  </div>
</template>
