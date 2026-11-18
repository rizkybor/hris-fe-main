<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { FileArchive, Download, RefreshCw, Trash2, Upload, AlertTriangle, Tablet, ChevronDown, ChevronRight } from "lucide-vue-next";
import CopyKeyButton from "@/components/admin/license-manager/CopyKeyButton.vue";
import { UiBadge, UiButton, UiSpinner } from "@/components/ui";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { formatDateTime, validationErrors } from "@/components/admin/license-manager/licenseHelpers";
import {
  INSTALLER_ACCEPT,
  IPA_ACCEPT,
  formatBytes,
  formatReleaseDate,
  installerFileError,
  ipaFileError,
  needsFile,
  needsIpa,
} from "@/components/admin/license-manager/releaseHelpers";

// One installer of a version: the Mac .dmg (platform "mac") or the iPad
// .ipa (platform "ipad", with what the API read from it: bundle id,
// version, build and the provisioning profile).
const props = defineProps({
  release: { type: Object, required: true },
  platform: { type: String, default: "mac" }, // mac | ipad
});
const emit = defineEmits(["updated"]);

const { t } = useI18n();
const store = useLicenseManagerStore();
const alertModal = useAlertModalStore();

const canEdit = computed(() => can("license-release-edit"));
const canDownload = computed(() => can("license-release-download"));

const isIpad = computed(() => props.platform === "ipad");
const file = computed(() => (isIpad.value ? props.release.ipa : props.release.file) || null);
const required = computed(() => (isIpad.value ? needsIpa(props.release) : needsFile(props.release)));
const isDraft = computed(() => props.release.status === "draft");
const accept = computed(() => (isIpad.value ? IPA_ACCEPT : INSTALLER_ACCEPT));
const prefix = computed(() => (isIpad.value ? "licenses.ipa" : "licenses.installer"));

const input = ref(null);
const progress = ref(null); // 0-100 while uploading
const busy = ref(false);
const error = ref("");
const dragging = ref(false);
const showDevices = ref(false);

const shortSha = computed(() => (file.value?.sha256 ? String(file.value.sha256).slice(0, 12) : ""));
const profile = computed(() => (isIpad.value ? file.value?.profile || null : null));
const warnings = computed(() => (isIpad.value ? file.value?.warnings || [] : []));
const profileDate = (value) => (value ? formatReleaseDate(String(value).slice(0, 10)) : "");

const upload = async (picked) => {
  if (!picked || !canEdit.value) return;
  error.value = isIpad.value ? ipaFileError(picked) : installerFileError(picked);
  if (error.value) return;
  busy.value = true;
  progress.value = 0;
  try {
    const onProgress = (p) => (progress.value = p);
    const updated = isIpad.value
      ? await store.uploadReleaseIpa(props.release.id, picked, onProgress)
      : await store.uploadReleaseFile(props.release.id, picked, onProgress);
    emit("updated", updated);
  } catch (err) {
    const errors = validationErrors(err);
    error.value = (Array.isArray(errors.file) ? errors.file[0] : errors.file) || errorMessage(err, t(`${prefix.value}.uploadFailed`));
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
    if (isIpad.value) await store.downloadReleaseIpa(props.release);
    else await store.downloadReleaseFile(props.release);
  } catch (err) {
    error.value = errorMessage(err, t(`${prefix.value}.downloadFailed`));
  } finally {
    busy.value = false;
  }
};

const remove = async () => {
  const ok = await alertModal.confirm(
    t(`${prefix.value}.removeConfirm`, { name: file.value.name, version: props.release.version }),
    {
      title: t(`${prefix.value}.removeTitle`),
      type: "danger",
      confirmText: t("common.actions.remove"),
    }
  );
  if (!ok) return;
  busy.value = true;
  error.value = "";
  try {
    const updated = isIpad.value ? await store.deleteReleaseIpa(props.release.id) : await store.deleteReleaseFile(props.release.id);
    emit("updated", updated || { ...props.release, [isIpad.value ? "ipa" : "file"]: null });
  } catch (err) {
    const errors = validationErrors(err);
    error.value = (Array.isArray(errors.file) ? errors.file[0] : errors.file) || errorMessage(err, t(`${prefix.value}.removeFailed`));
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
    <input ref="input" type="file" :accept="accept" class="hidden" @change="pick" />

    <!-- Installer present -->
    <div v-if="file" class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-8 h-8 rounded-ui-control bg-ui-surface border border-ui-line flex items-center justify-center shrink-0">
          <component :is="isIpad ? Tablet : FileArchive" class="w-4 h-4 text-ui-muted" />
        </div>
        <div class="min-w-0">
          <p class="text-ui-small font-medium text-ui-ink truncate" :title="file.name">
            <span v-if="isIpad" class="text-ui-muted font-normal">{{ $t("licenses.ipa.label") }} · </span>{{ file.name }}
          </p>
          <p class="text-ui-cap text-ui-muted flex flex-wrap items-center gap-x-1.5">
            <span class="tabular-nums">{{ formatBytes(file.size) }}</span>
            <template v-if="file.uploaded_at"><span class="text-ui-faint">·</span> {{ $t("licenses.installer.uploaded", { date: formatDateTime(file.uploaded_at) }) }}</template>
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
        <UiButton v-if="canDownload" variant="secondary" size="sm" :icon="Download" :disabled="busy" @click="download">{{ $t("common.actions.download") }}</UiButton>
        <UiButton v-if="canEdit" variant="secondary" size="sm" :icon="RefreshCw" :disabled="busy" @click="input?.click()">{{ $t("licenses.installer.replace") }}</UiButton>
        <UiButton v-if="canEdit && (isDraft || !required)" variant="danger" size="sm" :icon="Trash2" :disabled="busy" @click="remove">{{ $t("common.actions.remove") }}</UiButton>
      </div>
    </div>

    <!-- iPad: what the .ipa contains and which iPads its profile covers -->
    <div v-if="file && isIpad" class="mt-2.5 pt-2.5 border-t border-ui-line space-y-1.5 text-ui-cap text-ui-muted">
      <p class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span class="font-mono text-ui-ink">{{ file.bundle_id || "—" }}</span>
        <span class="text-ui-faint">·</span>
        <span>{{ $t("licenses.ipa.versionBuild", { version: file.short_version || "—", build: file.build || "—" }) }}</span>
        <template v-if="file.minimum_os">
          <span class="text-ui-faint">·</span>
          <span>{{ $t("licenses.ipa.minimumOs", { version: file.minimum_os }) }}</span>
        </template>
      </p>
      <p v-if="profile" class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <UiBadge :tone="profile.type === 'ad_hoc' ? 'ok' : 'warn'">{{ profile.type_label }}</UiBadge>
        <span v-if="profile.name" class="text-ui-text">{{ profile.name }}</span>
        <template v-if="profile.team_id">
          <span class="text-ui-faint">·</span>
          <span>{{ $t("licenses.ipa.team", { team: profile.team_name ? `${profile.team_name} (${profile.team_id})` : profile.team_id }) }}</span>
        </template>
        <template v-if="profile.expires_at">
          <span class="text-ui-faint">·</span>
          <span :class="profile.expired ? 'text-ui-bad font-medium' : ''">
            {{ $t(profile.expired ? "licenses.ipa.profileExpired" : "licenses.ipa.profileExpires", { date: profileDate(profile.expires_at) }) }}
          </span>
        </template>
      </p>
      <p v-else class="text-ui-warn">{{ $t("licenses.ipa.noProfile") }}</p>
      <div v-if="profile && profile.device_count">
        <button
          type="button"
          class="inline-flex items-center gap-1 font-medium text-ui-accent hover:underline"
          :aria-expanded="showDevices"
          @click="showDevices = !showDevices"
        >
          <component :is="showDevices ? ChevronDown : ChevronRight" class="w-3.5 h-3.5" />
          {{ $t("licenses.ipa.devices", { n: profile.device_count }, profile.device_count) }}
        </button>
        <ul v-if="showDevices" class="mt-1.5 grid sm:grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-ui-text">
          <li v-for="udid in profile.devices" :key="udid" class="flex items-center gap-1.5 min-w-0">
            <span class="truncate" :title="udid">{{ udid }}</span>
            <CopyKeyButton :value="udid" />
          </li>
        </ul>
        <p class="mt-1">{{ $t("licenses.ipa.devicesHint") }}</p>
      </div>
      <ul v-if="warnings.length" class="space-y-0.5">
        <li v-for="(warning, i) in warnings" :key="i" class="flex items-start gap-1.5 text-ui-warn">
          <AlertTriangle class="w-3.5 h-3.5 shrink-0 mt-px" /> <span>{{ warning }}</span>
        </li>
      </ul>
    </div>

    <!-- Missing and needed -->
    <div v-if="!file" class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <AlertTriangle class="w-[18px] h-[18px] text-ui-warn shrink-0" />
        <div class="min-w-0">
          <p class="text-ui-small font-semibold text-ui-warn">{{ $t(`${prefix}.missingTitle`) }}</p>
          <p class="text-ui-cap text-ui-text">
            {{ canEdit ? $t(`${prefix}.missingMessageDrop`) : $t(`${prefix}.missingMessage`) }}
          </p>
        </div>
      </div>
      <UiButton v-if="canEdit" variant="secondary" size="sm" :icon="Upload" :disabled="busy" @click="input?.click()">{{ $t("common.actions.upload") }}</UiButton>
    </div>

    <!-- Upload progress -->
    <div v-if="progress !== null" class="mt-3">
      <div class="flex items-center justify-between text-ui-cap text-ui-muted mb-1">
        <UiSpinner size="12px" :label="$t('licenses.installer.uploading')" :center="false" />
        <span class="tabular-nums font-medium text-ui-ink">{{ progress }}%</span>
      </div>
      <div class="h-1.5 w-full rounded-full bg-ui-line overflow-hidden">
        <div class="h-full rounded-full bg-ui-ink transition-all" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>
    <p v-if="error" class="text-ui-cap text-ui-bad mt-2">{{ error }}</p>
  </div>
</template>
