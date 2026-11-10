<script setup>
// Add / edit a version of the product's app in a modal: version (with the
// kind it implies), title, platforms, status, release date, build, critical
// flag, download URL, internal notes, the changes editor and an optional
// installer file (uploaded after the version is saved). Emits "saved" with
// the release from the API.
import { computed, ref, watch } from "vue";
import {
  History,
  Save,
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ListChecks,
  FileArchive,
  Upload,
  Loader2,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import LicenseFormField from "@/components/admin/license-manager/LicenseFormField.vue";
import LicenseStatusSwitch from "@/components/admin/license-manager/LicenseStatusSwitch.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { validationErrors } from "@/components/admin/license-manager/licenseHelpers";
import {
  RELEASE_PLATFORM_OPTIONS,
  RELEASE_STATUS_OPTIONS,
  CHANGE_TYPES,
  KIND_LABELS,
  INSTALLER_ACCEPT,
  PUBLISH_NEEDS_FILE,
  kindOfVersion,
  releaseToForm,
  releasePayload,
  validateReleaseForm,
  blankChange,
  todayInput,
  formatBytes,
  installerFileError,
} from "@/components/admin/license-manager/releaseHelpers";

const props = defineProps({
  show: { type: Boolean, default: false },
  // null = add a new version; otherwise the version to edit.
  release: { type: Object, default: null },
  productName: { type: String, default: "" },
  // Areas used by other versions, offered as suggestions.
  areas: { type: Array, default: () => [] },
});
const emit = defineEmits(["close", "saved"]);

const store = useLicenseManagerStore();

const isEdit = computed(() => !!props.release);
const allowed = computed(() => can(isEdit.value ? "license-release-edit" : "license-release-create"));
// Installer upload needs license-release-edit.
const canUpload = computed(() => can("license-release-edit"));

const form = ref(releaseToForm(null));
const errors = ref({});
const error = ref("");
const saving = ref(false);
const installer = ref(null);
const installerInput = ref(null);
const progress = ref(null);
// The version saved while the installer upload failed (so a retry updates it).
const savedRelease = ref(null);

watch(
  () => props.show,
  (show) => {
    if (!show) return;
    errors.value = {};
    error.value = "";
    installer.value = null;
    progress.value = null;
    savedRelease.value = null;
    form.value = releaseToForm(props.release);
    if (!isEdit.value && !form.value.changes.length) form.value.changes = [blankChange()];
  },
  { immediate: true }
);

const fieldError = (field) => {
  const v = errors.value?.[field];
  return Array.isArray(v) ? v[0] : v || "";
};

const kind = computed(() => kindOfVersion(form.value.version));
const kindHint = computed(() =>
  kind.value ? `${form.value.version.trim()} → ${KIND_LABELS[kind.value]}` : "major.minor.patch, e.g. 1.1.0"
);

const hasFile = computed(() => !!(installer.value || savedRelease.value?.file || props.release?.file));
const needsInstaller = computed(() => form.value.platforms !== "ipad");

// A published date defaults to today.
watch(
  () => form.value.status,
  (status) => {
    if (status === "published" && !form.value.released_at) form.value.released_at = todayInput();
  }
);

/* ---------- Changes editor ---------- */
const addChange = () => form.value.changes.push(blankChange(form.value.changes.at(-1)?.type || "feature"));
const removeChange = (index) => form.value.changes.splice(index, 1);
const moveChange = (index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= form.value.changes.length) return;
  const list = form.value.changes;
  [list[index], list[target]] = [list[target], list[index]];
};

const areaSuggestions = computed(() => {
  const set = new Set(props.areas.filter(Boolean));
  for (const c of form.value.changes) if (c.area?.trim()) set.add(c.area.trim());
  return [...set].sort((a, b) => a.localeCompare(b));
});

/* ---------- Installer ---------- */
const pickInstaller = (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const message = installerFileError(file);
  errors.value = { ...errors.value, file: message };
  installer.value = message ? null : file;
};

/* ---------- Save ---------- */
const save = async () => {
  if (!allowed.value) return;
  // Rows left completely empty are dropped (so error indices match the rows).
  form.value.changes = form.value.changes.filter((c) => c.text.trim() || c.area.trim());
  errors.value = validateReleaseForm(form.value);
  // Publishing a Mac version needs the installer first.
  if (form.value.status === "published" && needsInstaller.value && !hasFile.value) {
    errors.value.status = PUBLISH_NEEDS_FILE;
  }
  if (Object.keys(errors.value).length) {
    error.value = "Please fix the highlighted fields.";
    return;
  }

  saving.value = true;
  error.value = "";
  const payload = releasePayload(form.value);
  // A new installer is uploaded before publishing: save as a draft first,
  // upload, then publish.
  let stage = "save";
  const publishAfterUpload = installer.value && payload.status === "published" && needsInstaller.value && !savedRelease.value?.file && !props.release?.file;
  try {
    let saved = savedRelease.value;
    const target = saved?.id ?? props.release?.id;
    const body = publishAfterUpload ? { ...payload, status: "draft" } : payload;
    saved = target ? await store.updateRelease(target, body) : await store.createRelease(body);
    savedRelease.value = saved;

    if (installer.value) {
      stage = "upload";
      progress.value = 0;
      saved = await store.uploadReleaseFile(saved.id, installer.value, (p) => (progress.value = p));
      savedRelease.value = saved;
      installer.value = null;
    }
    progress.value = null;
    stage = "publish";
    if (publishAfterUpload) saved = await store.updateRelease(saved.id, { status: "published", released_at: payload.released_at });
    emit("saved", saved);
  } catch (err) {
    errors.value = validationErrors(err);
    if (stage === "upload") {
      error.value = `Version ${savedRelease.value.version} was saved${publishAfterUpload ? " as a draft" : ""}, but the installer upload failed: ${errorMessage(err, "please try again.")}`;
    } else if (stage === "publish") {
      error.value = `The installer was uploaded, but publishing failed: ${errorMessage(err, "please try again.")}`;
    } else {
      error.value = errorMessage(err, "Failed to save the version.");
    }
  } finally {
    saving.value = false;
    progress.value = null;
  }
};

const inputClass = (field) => [
  "w-full px-4 py-3 border rounded-[12px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-semibold bg-white",
  fieldError(field) ? "border-red-500" : "border-[#DCDEDD]",
];
const segment = (active) =>
  active ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-200" : "text-brand-light hover:text-brand-dark";
const rowBtn =
  "w-8 h-8 flex items-center justify-center rounded-lg border border-[#DCDEDD] bg-white text-gray-500 hover:border-violet-400 disabled:opacity-40 disabled:hover:border-[#DCDEDD]";
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4"
      @click.self="!saving && emit('close')"
      @keydown.esc="!saving && emit('close')"
    >
      <form
        novalidate
        @submit.prevent="save"
        class="bg-white rounded-[16px] border border-[#DCDEDD] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        :aria-label="isEdit ? `Edit version ${release?.version}` : 'New version'"
      >
        <div class="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#DCDEDD]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-violet-50 rounded-[12px] flex items-center justify-center">
              <History class="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-lg font-bold leading-tight">{{ isEdit ? `Edit ${productName} ${release?.version}` : `New ${productName} Version` }}</h3>
              <p class="text-xs text-brand-light">Release notes shown as the app's version history</p>
            </div>
          </div>
          <button type="button" @click="emit('close')" :disabled="saving" class="p-2 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X class="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div class="px-6 py-5 overflow-y-auto space-y-5">
          <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <LicenseFormField field="version" label="Version" required :error="fieldError('version')" :hint="kindHint" v-slot="{ id }">
              <input :id="id" v-model.trim="form.version" type="text" placeholder="1.1.0" :class="[inputClass('version'), 'font-mono']" />
            </LicenseFormField>
            <LicenseFormField field="title" label="Title" :error="fieldError('title')" v-slot="{ id }">
              <input :id="id" v-model="form.title" type="text" placeholder="e.g. Course planning on iPad" :class="inputClass('title')" />
            </LicenseFormField>

            <div data-field="platforms">
              <p class="block text-brand-dark text-sm font-semibold mb-1.5">Platforms <span class="text-red-500">*</span></p>
              <div class="inline-flex p-1 bg-slate-100 border border-[#DCDEDD] rounded-[12px]" role="radiogroup" aria-label="Platforms">
                <button
                  v-for="opt in RELEASE_PLATFORM_OPTIONS"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="form.platforms === opt.value"
                  @click="form.platforms = opt.value"
                  class="px-4 py-2 rounded-[9px] text-sm font-semibold transition-all"
                  :class="segment(form.platforms === opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
              <p v-if="fieldError('platforms')" class="text-xs text-red-600 mt-1.5">{{ fieldError("platforms") }}</p>
            </div>

            <div data-field="status">
              <p class="block text-brand-dark text-sm font-semibold mb-1.5">Status <span class="text-red-500">*</span></p>
              <div class="inline-flex p-1 bg-slate-100 border border-[#DCDEDD] rounded-[12px]" role="radiogroup" aria-label="Status">
                <button
                  v-for="opt in [...RELEASE_STATUS_OPTIONS].reverse()"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="form.status === opt.value"
                  @click="form.status = opt.value"
                  class="px-4 py-2 rounded-[9px] text-sm font-semibold transition-all"
                  :class="segment(form.status === opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
              <p v-if="fieldError('status')" class="text-xs text-red-600 mt-1.5">{{ fieldError("status") }}</p>
              <p v-else class="text-xs text-brand-light mt-1.5">Drafts are hidden from the apps.</p>
            </div>

            <LicenseFormField
              field="released_at"
              label="Release Date"
              :required="form.status === 'published'"
              :error="fieldError('released_at')"
              v-slot="{ id }"
            >
              <input :id="id" v-model="form.released_at" type="date" :class="inputClass('released_at')" />
            </LicenseFormField>
            <LicenseFormField field="build" label="Build" :error="fieldError('build')" hint="The app's build number, e.g. 42." v-slot="{ id }">
              <input :id="id" v-model.number="form.build" type="number" min="0" step="1" placeholder="42" :class="[inputClass('build'), 'font-mono']" />
            </LicenseFormField>

            <div data-field="is_critical" class="md:col-span-2">
              <div class="flex items-center justify-between gap-4 p-3 border rounded-[12px]" :class="form.is_critical ? 'border-red-200 bg-red-50/50' : 'border-[#DCDEDD]'">
                <div>
                  <p class="text-sm font-semibold text-brand-dark">Required update — older versions must update</p>
                  <p class="text-xs text-brand-light">Marks the version as critical.</p>
                </div>
                <LicenseStatusSwitch v-model="form.is_critical" label="Required update" />
              </div>
            </div>

            <LicenseFormField field="download_url" label="Download URL" :error="fieldError('download_url')" wide v-slot="{ id }">
              <input :id="id" v-model.trim="form.download_url" type="url" placeholder="https://example.com/OCCA-1.1.0.dmg" :class="inputClass('download_url')" />
            </LicenseFormField>
          </div>

          <!-- Changes -->
          <div class="border-t border-[#DCDEDD] pt-5" data-field="changes">
            <div class="flex items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-2">
                <ListChecks class="w-[18px] h-[18px] text-violet-600" />
                <h4 class="text-brand-dark font-bold">Changes</h4>
                <span class="text-xs text-brand-light">({{ form.changes.length }})</span>
              </div>
              <button type="button" @click="addChange" class="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800">
                <Plus class="w-3.5 h-3.5" /> Add change
              </button>
            </div>
            <p v-if="fieldError('changes')" class="text-xs text-red-600 mb-2">{{ fieldError("changes") }}</p>

            <datalist id="release-areas">
              <option v-for="area in areaSuggestions" :key="area" :value="area" />
            </datalist>

            <div v-if="!form.changes.length" class="text-center py-6 bg-slate-50 rounded-[12px] border border-dashed border-[#DCDEDD]">
              <p class="text-sm text-brand-light">No changes listed yet.</p>
            </div>
            <ol v-else class="space-y-2.5">
              <li
                v-for="(change, index) in form.changes"
                :key="index"
                :data-field="`changes.${index}.text`"
                class="p-3 rounded-[12px] border bg-slate-50"
                :class="fieldError(`changes.${index}.text`) || fieldError(`changes.${index}.type`) || fieldError(`changes.${index}.area`) ? 'border-red-300' : 'border-[#DCDEDD]'"
              >
                <div class="flex flex-col md:flex-row gap-2">
                  <select v-model="change.type" class="select-soft md:!w-32 shrink-0" :aria-label="`Change ${index + 1} type`">
                    <option v-for="t in CHANGE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                  <input
                    v-model="change.area"
                    type="text"
                    list="release-areas"
                    placeholder="Area (optional)"
                    :aria-label="`Change ${index + 1} area`"
                    class="md:w-40 shrink-0 px-3 py-2 text-sm border border-[#DCDEDD] rounded-[10px] bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                  <input
                    v-model="change.text"
                    type="text"
                    placeholder="What changed"
                    :aria-label="`Change ${index + 1} text`"
                    class="flex-1 min-w-0 px-3 py-2 text-sm border rounded-[10px] bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    :class="fieldError(`changes.${index}.text`) ? 'border-red-500' : 'border-[#DCDEDD]'"
                  />
                  <div class="flex items-center gap-1 shrink-0">
                    <button type="button" :class="rowBtn" :disabled="index === 0" @click="moveChange(index, -1)" title="Move up" aria-label="Move up">
                      <ArrowUp class="w-3.5 h-3.5" />
                    </button>
                    <button type="button" :class="rowBtn" :disabled="index === form.changes.length - 1" @click="moveChange(index, 1)" title="Move down" aria-label="Move down">
                      <ArrowDown class="w-3.5 h-3.5" />
                    </button>
                    <button type="button" :class="[rowBtn, 'hover:!border-red-400 hover:text-red-600']" @click="removeChange(index)" title="Remove" aria-label="Remove change">
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p
                  v-for="key in ['type', 'area', 'text']"
                  v-show="fieldError(`changes.${index}.${key}`)"
                  :key="key"
                  class="text-xs text-red-600 mt-1.5"
                >
                  {{ fieldError(`changes.${index}.${key}`) }}
                </p>
              </li>
            </ol>
          </div>

          <!-- Installer -->
          <div v-if="canUpload" class="border-t border-[#DCDEDD] pt-5" data-field="file">
            <div class="flex items-center gap-2 mb-1">
              <FileArchive class="w-[18px] h-[18px] text-violet-600" />
              <h4 class="text-brand-dark font-bold">Installer</h4>
              <span class="text-xs text-brand-light">(Optional)</span>
            </div>
            <p class="text-xs text-brand-light mb-3">
              <template v-if="needsInstaller">The Mac installer (.dmg, .zip or .pkg, up to 2 GB) is kept in HRIS and is needed to publish.</template>
              <template v-else>iPad-only versions install through Apple; no installer is needed.</template>
              The server's upload limits (PHP <span class="font-mono">upload_max_filesize</span> / <span class="font-mono">post_max_size</span>,
              nginx <span class="font-mono">client_max_body_size</span>) must allow files this large.
            </p>
            <input ref="installerInput" type="file" :accept="INSTALLER_ACCEPT" class="hidden" @change="pickInstaller" />
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                @click="installerInput?.click()"
                :disabled="saving"
                class="inline-flex items-center gap-2 border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm font-semibold text-brand-dark hover:border-violet-400 disabled:opacity-50"
              >
                <Upload class="w-4 h-4" />
                {{ installer ? "Choose another file" : release?.file || savedRelease?.file ? "Replace installer" : "Choose installer" }}
              </button>
              <span v-if="installer" class="text-sm text-brand-dark">
                <span class="font-semibold">{{ installer.name }}</span>
                <span class="text-brand-light"> · {{ formatBytes(installer.size) }}</span>
                <button type="button" class="ml-2 text-xs font-semibold text-violet-600 hover:underline" :disabled="saving" @click="installer = null">Clear</button>
              </span>
              <span v-else-if="release?.file || savedRelease?.file" class="text-sm text-brand-light">
                Current: <span class="font-semibold text-brand-dark">{{ (savedRelease?.file || release.file).name }}</span>
              </span>
            </div>
            <div v-if="progress !== null" class="mt-3 max-w-md">
              <div class="flex items-center justify-between text-[11px] text-brand-light mb-1">
                <span class="inline-flex items-center gap-1"><Loader2 class="w-3 h-3 animate-spin" /> Uploading installer…</span>
                <span class="tabular-nums font-semibold text-brand-dark">{{ progress }}%</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div class="h-full rounded-full bg-violet-500 transition-all" :style="{ width: `${progress}%` }"></div>
              </div>
            </div>
            <p v-if="fieldError('file')" class="text-xs text-red-600 mt-1.5">{{ fieldError("file") }}</p>
          </div>

          <LicenseFormField field="notes" label="Internal Notes" :error="fieldError('notes')" hint="Only visible in HRIS." v-slot="{ id }">
            <textarea :id="id" v-model="form.notes" rows="2" :class="[inputClass('notes'), 'font-normal resize-none']"></textarea>
          </LicenseFormField>
        </div>

        <div class="flex justify-end gap-3 px-6 py-4 border-t border-[#DCDEDD] bg-slate-50">
          <button
            type="button"
            @click="emit('close')"
            :disabled="saving"
            class="border border-[#DCDEDD] bg-white rounded-[12px] px-5 py-2.5 text-sm font-semibold text-brand-dark hover:border-violet-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving || !allowed"
            :title="allowed ? undefined : 'You do not have permission to do this.'"
            class="rounded-[12px] border border-violet-800 bg-gradient-to-r from-violet-600 to-indigo-700 px-5 py-2.5 flex items-center gap-2 disabled:opacity-50"
          >
            <Save class="w-4 h-4 text-white" />
            <span class="text-white text-sm font-semibold">
              {{ saving ? (progress !== null ? `Uploading ${progress}%...` : "Saving...") : isEdit ? "Save Version" : "Add Version" }}
            </span>
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
