<script setup>
import { computed, ref, watch } from "vue";
import { CheckCircle2, Download, FileText, Mail } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { useToastStore } from "@/stores/toast";
import { UiAlert, UiButton, UiInput, UiModal, UiSelect, UiSwitch } from "@/components/ui";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { formatDate } from "@/utils/dateUtils";
import { bareName } from "@/utils/personName";
import { useI18n } from "vue-i18n";

// Export Progress: the report alone, or with a cover letter (Surat
// Pengantar) in front as one PDF. The cover letter is a numbered letter
// (code SPG) linked to the project: a new one, or one made for it before.
// Also used for the UAT documents: pass their own endpoints, `extra`
// (sent with both requests, e.g. { kind: "revision" }) and labels.
const props = defineProps({
  open: { type: Boolean, default: false },
  projectId: { type: [String, Number], required: true },
  projectName: { type: String, default: "" },
  optionsUrl: { type: String, default: "" },
  exportUrl: { type: String, default: "" },
  extra: { type: Object, default: () => ({}) },
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  reportLabel: { type: String, default: "" },
  reportHint: { type: String, default: "" },
  fileBase: { type: String, default: "" },
});
const optionsEndpoint = computed(() => props.optionsUrl || `/projects/${props.projectId}/cover-letter-options`);
const exportEndpoint = computed(() => props.exportUrl || `/projects/${props.projectId}/export-progress`);
const emit = defineEmits(["update:open"]);

const { t } = useI18n();
const toast = useToastStore();

const TEMPLATE_OPTIONS = computed(() => [
  { value: "primary", label: t("documents.letter.form.templatePrimary"), preview: "/images/template-letter-primary.png" },
  { value: "secondary", label: t("documents.letter.form.templateSecondary"), preview: "/images/template-letter-secondary.png" },
]);

const loading = ref(false);
const exporting = ref(false);
const loadError = ref("");
const formError = ref("");
const options = ref(null);
const withCover = ref(false);
const mode = ref("new");
const letterId = ref("");
const form = ref({});

const letters = computed(() => options.value?.letters || []);
// People whose signature scan (with the company stamp) is on file.
const signatories = computed(() => options.value?.signatories || []);
const sameName = (a, b) => !!a && !!b && bareName(a).toLowerCase() === bareName(b).toLowerCase();
const signatoryKey = ref("");
const pickSignatory = (person) => {
  signatoryKey.value = person.key;
  form.value.signatory_name = person.name;
  form.value.signatory_title = person.title || form.value.signatory_title;
};
const setSigned = (signed) => {
  form.value.use_signature = signed;
  if (signed && !signatoryKey.value && signatories.value.length) pickSignatory(signatories.value[0]);
};
const canCreate = computed(() => !!options.value?.can_create);
const canReuse = computed(() => !!options.value?.can_reuse && letters.value.length > 0);
const coverAvailable = computed(() => canCreate.value || canReuse.value);
const divisionOptions = computed(() => (options.value?.divisions || []).map((d) => ({ value: d.id, label: `${d.code} - ${d.name}` })));
const letterOptions = computed(() =>
  letters.value.map((letter) => ({ value: letter.id, label: `${letter.letter_number} · ${formatDate(letter.date)}` }))
);

const close = () => emit("update:open", false);

const load = async () => {
  loading.value = true;
  loadError.value = "";
  formError.value = "";
  try {
    const { data } = await axiosInstance.get(optionsEndpoint.value, { params: props.extra });
    options.value = data.data;
    const draft = data.data.draft;
    form.value = {
      template: draft.template || "primary",
      division_code_id: draft.division_code_id || data.data.divisions?.[0]?.id || "",
      date: draft.date,
      recipient: draft.recipient || "",
      subject: draft.subject || "",
      body: draft.body || "",
      signatory_name: draft.signatory_name || "",
      signatory_title: draft.signatory_title || "",
      use_signature: !!draft.use_signature,
    };
    const match = signatories.value.find((person) => sameName(person.name, form.value.signatory_name));
    signatoryKey.value = match?.key || "";
    if (form.value.use_signature && !match) form.value.use_signature = false;
    mode.value = canCreate.value ? "new" : "existing";
    letterId.value = letters.value[0]?.id || "";
  } catch {
    loadError.value = t("projects.export.loadFailed");
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  (open) => {
    if (open) {
      withCover.value = false;
      load();
    }
  },
  { immediate: true }
);

// Errors of a blob request come back as a Blob holding JSON.
const readError = async (error) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text());
      const first = json.errors ? Object.values(json.errors).flat()[0] : null;
      return first || json.message;
    } catch {
      return null;
    }
  }
  return data?.message;
};

const download = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const submit = async () => {
  formError.value = "";
  let payload = { cover: "none" };
  if (withCover.value) {
    if (mode.value === "existing") {
      if (!letterId.value) return (formError.value = t("projects.export.pickLetter"));
      payload = { cover: "existing", letter_id: letterId.value };
    } else {
      if (!form.value.division_code_id || !form.value.subject?.trim() || !form.value.body?.trim()) {
        return (formError.value = t("projects.export.fillRequired"));
      }
      if (form.value.use_signature && !signatoryKey.value) return (formError.value = t("projects.export.signature.pick"));
      payload = { cover: "new", ...form.value };
    }
  }
  exporting.value = true;
  try {
    const response = await axiosInstance.post(exportEndpoint.value, { ...payload, ...props.extra }, { responseType: "blob" });
    const number = response.headers["x-letter-number"];
    const base = (props.fileBase || `${props.projectName || "project"}-progress-report`).replace(/[\\/]/g, "-");
    download(response.data, withCover.value ? `${base}-surat-pengantar.pdf` : `${base}.pdf`);
    if (number && payload.cover === "new") toast.success(t("projects.export.letterCreated"), number);
    else toast.success(t("projects.export.done"));
    close();
  } catch (error) {
    formError.value = (await readError(error)) || t("projects.export.failed");
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <UiModal :open="open" :title="title || $t('projects.export.title')" :description="description || $t('projects.export.description')" size="lg" @update:open="(value) => !value && close()">
    <div v-if="loading" class="space-y-3" aria-busy="true">
      <Skeleton height="56px" />
      <Skeleton height="120px" />
    </div>
    <UiAlert v-else-if="loadError" tone="bad">{{ loadError }}</UiAlert>

    <form v-else id="project-export-form" class="space-y-5" @submit.prevent="submit">
      <!-- What the PDF holds -->
      <div class="rounded-ui-control border border-ui-line divide-y divide-ui-line">
        <div class="flex items-center gap-3 px-4 py-3">
          <span class="w-9 h-9 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0"><FileText class="w-4 h-4" /></span>
          <div class="flex-1 min-w-0">
            <p class="text-ui-body font-medium text-ui-ink">{{ reportLabel || $t("projects.export.report") }}</p>
            <p class="text-ui-cap text-ui-muted">{{ reportHint || $t("projects.export.reportHint") }}</p>
          </div>
          <CheckCircle2 class="w-4 h-4 text-ui-ok shrink-0" />
        </div>
        <div class="flex items-center gap-3 px-4 py-3">
          <span class="w-9 h-9 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0"><Mail class="w-4 h-4" /></span>
          <div class="flex-1 min-w-0">
            <UiSwitch
              v-model="withCover"
              :disabled="!coverAvailable"
              :label="$t('projects.export.withCover')"
              :description="coverAvailable ? $t('projects.export.withCoverHint') : $t('projects.export.noLetterAccess')"
            />
          </div>
        </div>
      </div>

      <template v-if="withCover">
        <!-- New or earlier letter -->
        <div v-if="canCreate && canReuse" class="grid grid-cols-2 gap-2" role="radiogroup">
          <label
            v-for="opt in ['new', 'existing']"
            :key="opt"
            class="ui-press cursor-pointer rounded-ui-control border px-3 py-2.5 text-ui-small font-medium text-center"
            :class="mode === opt ? 'border-ui-accent bg-ui-accent-soft text-ui-accent' : 'border-ui-line text-ui-text hover:bg-ui-subtle'"
          >
            <input v-model="mode" type="radio" :value="opt" class="sr-only" />
            {{ $t(`projects.export.mode.${opt}`) }}
          </label>
        </div>

        <div v-if="mode === 'existing'">
          <UiSelect v-model="letterId" :options="letterOptions" :label="$t('projects.export.existingLetter')" required />
          <p class="text-ui-cap text-ui-muted mt-1.5">{{ $t("projects.export.existingHint") }}</p>
        </div>

        <template v-else>
          <!-- Letterhead -->
          <div>
            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.letter.form.letterhead") }}</p>
            <div class="grid grid-cols-2 gap-3">
              <label
                v-for="opt in TEMPLATE_OPTIONS"
                :key="opt.value"
                class="ui-press cursor-pointer rounded-ui-control border overflow-hidden transition-colors"
                :class="form.template === opt.value ? 'border-ui-accent shadow-ui-focus' : 'border-ui-line hover:border-ui-line-strong'"
              >
                <input v-model="form.template" type="radio" :value="opt.value" class="sr-only" />
                <div class="h-28 sm:h-36 w-full overflow-hidden bg-white border-b border-ui-line">
                  <img :src="opt.preview" alt="" class="w-full h-full object-cover object-top" />
                </div>
                <div class="px-3 py-2 flex items-center justify-between bg-ui-subtle">
                  <span class="text-ui-small font-medium text-ui-ink">{{ opt.label }}</span>
                  <CheckCircle2 v-if="form.template === opt.value" class="w-4 h-4 text-ui-accent" />
                </div>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiSelect v-model="form.division_code_id" :options="divisionOptions" :label="$t('documents.letter.fields.divisionCode')" required />
            <UiInput v-model="form.date" type="date" :label="$t('projects.export.letterDate')" required />
          </div>
          <UiInput v-if="form.template !== 'secondary'" v-model="form.recipient" :rows="2" :label="$t('projects.export.recipient')" :hint="$t('projects.export.recipientHint')" />
          <UiInput v-model="form.subject" :label="$t('projects.export.subject')" required />
          <div>
            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.export.body") }} <span class="text-ui-bad">*</span></p>
            <RichTextEditor v-model="form.body" />
          </div>
          <!-- Signature: none (name only), or a scan with the company stamp -->
          <div>
            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.export.signature.label") }}</p>
            <div class="grid grid-cols-2 gap-2" role="radiogroup">
              <button
                v-for="opt in [false, true]"
                :key="String(opt)"
                type="button"
                role="radio"
                :aria-checked="form.use_signature === opt"
                :disabled="opt && !signatories.length"
                class="ui-press rounded-ui-control border px-3 py-2.5 text-ui-small font-medium text-center disabled:opacity-50 disabled:cursor-not-allowed"
                :class="form.use_signature === opt ? 'border-ui-accent bg-ui-accent-soft text-ui-accent' : 'border-ui-line text-ui-text hover:bg-ui-subtle'"
                @click="setSigned(opt)"
              >
                {{ opt ? $t("projects.export.signature.with") : $t("projects.export.signature.without") }}
              </button>
            </div>
          </div>

          <div v-if="form.use_signature">
            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.export.signature.who") }} <span class="text-ui-bad">*</span></p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="radiogroup">
              <label
                v-for="person in signatories"
                :key="person.key"
                class="ui-press cursor-pointer rounded-ui-control border overflow-hidden transition-colors"
                :class="signatoryKey === person.key ? 'border-ui-accent shadow-ui-focus' : 'border-ui-line hover:border-ui-line-strong'"
              >
                <input type="radio" class="sr-only" :checked="signatoryKey === person.key" @change="pickSignatory(person)" />
                <div class="h-20 bg-white border-b border-ui-line flex items-center justify-center p-1.5">
                  <img :src="person.preview" alt="" class="max-h-full max-w-full object-contain" />
                </div>
                <div class="px-3 py-2 bg-ui-subtle flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-ui-small font-medium text-ui-ink truncate">{{ person.name }}</p>
                    <p class="text-ui-cap text-ui-muted truncate">{{ person.title || "—" }}</p>
                  </div>
                  <CheckCircle2 v-if="signatoryKey === person.key" class="w-4 h-4 text-ui-accent shrink-0 mt-0.5" />
                </div>
              </label>
            </div>
            <p class="text-ui-cap text-ui-muted mt-1.5">{{ $t("projects.export.signature.stampHint") }}</p>
            <UiInput v-model="form.signatory_title" :label="$t('projects.export.signatoryTitle')" class="mt-3" />
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.signatory_name" :label="$t('projects.export.signatoryName')" />
            <UiInput v-model="form.signatory_title" :label="$t('projects.export.signatoryTitle')" />
          </div>
          <p class="text-ui-cap text-ui-muted">{{ $t("projects.export.newHint") }}</p>
        </template>
      </template>

      <p v-if="formError" class="text-ui-cap text-ui-bad">{{ formError }}</p>
    </form>

    <template #footer>
      <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="close">{{ $t("common.actions.cancel") }}</UiButton>
      <UiButton type="submit" form="project-export-form" :icon="Download" :loading="exporting" :disabled="loading || !!loadError" class="flex-1 sm:flex-none">
        {{ withCover ? $t("projects.export.submitWithCover") : $t("projects.export.submit") }}
      </UiButton>
    </template>
  </UiModal>
</template>
