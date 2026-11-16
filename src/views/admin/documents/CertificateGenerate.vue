<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { Settings, Plus, Trash2, Hash, ClipboardPaste, ArrowLeft, Award, RectangleHorizontal, RectangleVertical, ListChecks } from "lucide-vue-next";
import { useCertificateStore } from "@/stores/certificate";
import SignatureToggle from "@/components/common/SignatureToggle.vue";
import { can } from "@/helpers/permissionHelper";
import { useUnsavedGuard } from "@/composables/useUnsavedGuard";
import { invalidate } from "@/composables/useStaleFetch";
import { UiPageHeader, UiButton, UiCard, UiInput, UiSelect, UiSwitch, UiAlert, UiBadge, UiSpinner } from "@/components/ui";

const { t } = useI18n();
const store = useCertificateStore();
const { templates } = storeToRefs(store);
const router = useRouter();
const route = useRoute();

const form = ref({
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  signatory_name: "",
  signatory_title: "",
  use_signature: false,
  category_code: "",
  program_code: "",
  certificate_template_id: "",
  orientation: "landscape",
  include_tasks: false,
  use_hologram: false,
});

// A recipient is a typed name, optionally linked to an employee (needed for
// the completed-tasks page).
const blankRecipient = () => ({ name: "", employee_id: "" });
const recipients = ref([blankRecipient()]);
const employees = ref([]);
const bulkText = ref("");
const showBulkPaste = ref(false);

const preview = ref(null);
const previewLoading = ref(false);
const submitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

// Unsaved-changes guard: anything typed since the page opened.
const snapshot = () => JSON.stringify([form.value, recipients.value]);
let pristine = snapshot();

// Templates are fetched once per session (Settings keeps the list in step).
// Opened from an employee's page (?employee_id=…&start_date=…&end_date=…),
// the first recipient and the period come prefilled.
onMounted(async () => {
  store.ensureTemplates().catch(() => {});
  try {
    employees.value = await store.fetchEmployeeOptions();
  } catch {
    employees.value = [];
  }
  const preset = employees.value.find((e) => String(e.id) === String(route.query.employee_id || ""));
  if (preset) {
    recipients.value = [{ name: preset.name, employee_id: preset.id }];
    form.value.include_tasks = true;
    if (typeof route.query.start_date === "string") form.value.start_date = route.query.start_date;
    if (typeof route.query.end_date === "string") form.value.end_date = route.query.end_date;
    pristine = snapshot();
  }
});

const employeeOptions = computed(() => [
  { value: "", label: t("documents.certificate.generate.notEmployee") },
  ...employees.value.map((e) => ({ value: e.id, label: e.is_active ? e.name : `${e.name} (${t("documents.certificate.generate.accessEnded")})` })),
]);
const pickEmployee = (recipient) => {
  const employee = employees.value.find((e) => e.id === recipient.employee_id);
  if (employee) recipient.name = employee.name;
};
const linkedRecipients = computed(() => recipients.value.filter((r) => r.name.trim() && r.employee_id).length);
let generated = false;
useUnsavedGuard(() => !generated && snapshot() !== pristine);

const addRecipient = () => recipients.value.push(blankRecipient());
const removeRecipient = (i) => recipients.value.splice(i, 1);

const applyBulkPaste = () => {
  const names = bulkText.value
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return;
  recipients.value = names.map((name) => ({ name, employee_id: "" }));
  bulkText.value = "";
  showBulkPaste.value = false;
};

const isBulk = computed(() => recipients.value.filter((r) => r.name).length > 1);

let previewTimer = null;
watch(
  () => [form.value.category_code, form.value.program_code],
  () => {
    clearTimeout(previewTimer);
    if (!form.value.category_code || !form.value.program_code) {
      preview.value = null;
      return;
    }
    previewTimer = setTimeout(async () => {
      previewLoading.value = true;
      try {
        preview.value = await store.previewNumber({
          category_code: form.value.category_code,
          program_code: form.value.program_code,
        });
      } catch {
        preview.value = null;
      } finally {
        previewLoading.value = false;
      }
    }, 400);
  }
);

const handleSubmit = async () => {
  errorMessage.value = "";
  successMessage.value = "";

  const cleanRecipients = recipients.value.filter((r) => r.name.trim());
  if (cleanRecipients.length === 0) {
    errorMessage.value = t("documents.certificate.generate.errors.noRecipient");
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      ...form.value,
      certificate_template_id: form.value.certificate_template_id || null,
      start_date: form.value.start_date || null,
      end_date: form.value.end_date || null,
      recipients: cleanRecipients.map((r) => ({ name: r.name.trim(), employee_id: r.employee_id || null })),
    };
    const result = await store.generate(payload);
    successMessage.value = result.isZip
      ? t("documents.certificate.generate.successBulk", { n: cleanRecipients.length, filename: result.filename })
      : t("documents.certificate.generate.successSingle", { filename: result.filename });
    generated = true;
    // The history and its counters show the new certificates on return.
    invalidate("certificates");
    recipients.value = [blankRecipient()];
    preview.value = null;
    setTimeout(() => router.push({ name: "admin.certificates.dashboard" }), 1500);
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t("documents.certificate.generate.errors.failed"));
  } finally {
    submitting.value = false;
  }
};

// Presentation only: template options and the summary panel.
const templateOptions = computed(() => [
  { value: "", label: t("documents.certificate.generate.defaultTemplate") },
  ...templates.value.map((tpl) => ({ value: tpl.id, label: tpl.name })),
]);
const orientations = computed(() => [
  { value: "landscape", icon: RectangleHorizontal, label: t("documents.certificate.generate.layout.landscape") },
  { value: "portrait", icon: RectangleVertical, label: t("documents.certificate.generate.layout.portrait") },
]);
const filledRecipients = computed(() => recipients.value.filter((r) => r.name).length);
const submitLabel = computed(() =>
  submitting.value
    ? t("documents.certificate.generate.submitting")
    : isBulk.value
      ? t("documents.certificate.generate.submitBulk")
      : t("documents.certificate.list.generate")
);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="$t('documents.certificate.list.generate')"
      :subtitle="$t('documents.certificate.generate.subtitle')"
      class="ui-anim-fade-up"
    >
      <template #eyebrow>
        <router-link
          :to="{ name: 'admin.certificates.dashboard' }"
          class="ui-press inline-flex items-center gap-1 mb-1.5 text-ui-small font-medium text-ui-accent hover:underline"
          :aria-label="$t('documents.certificate.generate.back')"
        >
          <ArrowLeft class="w-4 h-4" />{{ $t("documents.certificate.list.title") }}
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('certificate-menu')" variant="ghost" :icon="Settings" :to="{ name: 'admin.settings.certificate-settings' }">{{ $t("documents.certificate.list.settings") }}</UiButton>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" :to="{ name: 'admin.certificates.dashboard' }">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="certificate-form" :icon="Award" :loading="submitting">{{ submitLabel }}</UiButton>
        </div>
      </template>
    </UiPageHeader>

    <form id="certificate-form" class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start" @submit.prevent="handleSubmit">
      <div class="lg:col-span-2 space-y-5 min-w-0 ui-stagger">
        <UiCard :title="$t('documents.certificate.generate.infoTitle')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput v-model="form.title" :label="$t('documents.certificate.generate.fields.title')" required :placeholder="$t('documents.certificate.generate.fields.titlePlaceholder')" class="md:col-span-2" />
            <UiInput v-model="form.description" :rows="3" :label="$t('documents.certificate.generate.fields.description')" :placeholder="$t('documents.certificate.generate.fields.descriptionPlaceholder')" class="md:col-span-2" />
            <UiInput v-model="form.start_date" type="date" :label="$t('documents.certificate.generate.fields.startDate')" />
            <div class="min-w-0">
              <label for="certificate-end-date" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.certificate.generate.fields.endDate") }}</label>
              <input
                id="certificate-end-date"
                v-model="form.end_date"
                type="date"
                :min="form.start_date || undefined"
                class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
              />
            </div>
            <UiInput v-model="form.signatory_name" :label="$t('documents.certificate.generate.fields.signatoryName')" required />
            <UiInput v-model="form.signatory_title" :label="$t('documents.certificate.generate.fields.signatoryTitle')" required />
            <SignatureToggle v-model="form.use_signature" class="md:col-span-2" />
          </div>
        </UiCard>

        <UiCard :title="$t('documents.certificate.generate.numberingTitle')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput v-model="form.category_code" :label="$t('documents.certificate.generate.fields.categoryCode')" required :placeholder="$t('documents.certificate.generate.fields.categoryPlaceholder')" class="[&_input]:uppercase" />
            <UiInput v-model="form.program_code" :label="$t('documents.certificate.generate.fields.programCode')" required :placeholder="$t('documents.certificate.generate.fields.programPlaceholder')" class="[&_input]:uppercase" />
            <UiSelect v-model="form.certificate_template_id" :label="$t('documents.certificate.generate.fields.template')" :options="templateOptions" class="md:col-span-2" />
          </div>
        </UiCard>

        <UiCard :title="$t('documents.certificate.generate.layout.title')">
          <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.certificate.generate.layout.orientation") }}</p>
          <div class="grid grid-cols-2 gap-3 max-w-md" role="radiogroup" :aria-label="$t('documents.certificate.generate.layout.orientation')">
            <button
              v-for="opt in orientations"
              :key="opt.value"
              type="button"
              role="radio"
              :aria-checked="form.orientation === opt.value"
              class="ui-press flex items-center gap-3 rounded-ui-control border px-3 py-2.5 text-left focus:outline-none focus-visible:shadow-ui-focus"
              :class="form.orientation === opt.value ? 'border-ui-accent bg-ui-accent-soft text-ui-ink' : 'border-ui-line-strong bg-ui-surface text-ui-text hover:bg-ui-hover'"
              @click="form.orientation = opt.value"
            >
              <component :is="opt.icon" class="w-5 h-5 shrink-0" :class="form.orientation === opt.value ? 'text-ui-accent' : 'text-ui-faint'" />
              <span class="text-ui-small font-medium">{{ opt.label }}</span>
            </button>
          </div>

          <div class="mt-5 pt-4 border-t border-ui-line">
            <UiSwitch
              v-model="form.use_hologram"
              :label="$t('documents.certificate.generate.hologram.label')"
              :description="$t('documents.certificate.generate.hologram.description')"
            />
          </div>

          <div class="mt-4 pt-4 border-t border-ui-line">
            <UiSwitch
              v-model="form.include_tasks"
              :label="$t('documents.certificate.generate.tasksPage.label')"
              :description="$t('documents.certificate.generate.tasksPage.description')"
            />
            <p v-if="form.include_tasks && filledRecipients > linkedRecipients" class="mt-2 flex items-start gap-1.5 text-ui-cap text-ui-warn">
              <ListChecks class="w-3.5 h-3.5 mt-px shrink-0" />
              {{ $t("documents.certificate.generate.tasksPage.unlinked", { n: filledRecipients - linkedRecipients }) }}
            </p>
          </div>
        </UiCard>

        <UiCard :title="$t('documents.certificate.generate.recipientsTitle')">
          <template #actions>
            <UiButton variant="ghost" size="sm" :icon="ClipboardPaste" @click="showBulkPaste = !showBulkPaste">{{ $t("documents.certificate.generate.bulkPaste") }}</UiButton>
          </template>
          <p class="text-ui-cap text-ui-muted -mt-1 mb-4">
            {{ $t("documents.certificate.generate.recipientsHint") }}
          </p>

          <div v-if="showBulkPaste" class="mb-4 rounded-ui-control border border-ui-line bg-ui-subtle/60 p-4 ui-anim-fade-up">
            <UiInput v-model="bulkText" :rows="5" :label="$t('documents.certificate.generate.pasteLabel')" placeholder="John Doe&#10;Jane Smith&#10;..." mono />
            <UiButton variant="secondary" size="sm" class="mt-2" @click="applyBulkPaste">{{ $t("documents.certificate.generate.applyPaste") }}</UiButton>
          </div>

          <ol class="space-y-2">
            <li v-for="(recipient, i) in recipients" :key="i" class="flex items-start sm:items-center gap-2">
              <span class="text-ui-cap text-ui-faint tabular-nums w-6 shrink-0 text-right pt-2.5 sm:pt-0">{{ i + 1 }}.</span>
              <div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <template v-if="employees.length">
                  <label :for="`certificate-recipient-employee-${i}`" class="sr-only">{{ $t("documents.certificate.generate.employee") }} {{ i + 1 }}</label>
                  <UiSelect :id="`certificate-recipient-employee-${i}`" v-model="recipient.employee_id" :options="employeeOptions" @change="pickEmployee(recipient)" />
                </template>
                <UiInput v-model="recipient.name" :placeholder="$t('documents.certificate.generate.recipientName')" :class="employees.length ? '' : 'sm:col-span-2'" />
              </div>
              <button
                v-if="recipients.length > 1"
                type="button"
                class="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus"
                :aria-label="$t('documents.certificate.generate.removeRecipient', { n: i + 1 })"
                @click="removeRecipient(i)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </li>
          </ol>
          <UiButton variant="secondary" :icon="Plus" class="mt-3 w-full sm:w-auto" @click="addRecipient">{{ $t("documents.certificate.generate.addRecipient") }}</UiButton>
        </UiCard>
      </div>

      <!-- Side panel: number preview, summary, actions -->
      <aside class="space-y-4 lg:sticky lg:top-4 min-w-0">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <div class="flex items-center gap-2">
            <Hash class="w-4 h-4 text-ui-faint" />
            <h3 class="text-ui-h3 text-ui-ink">{{ $t("documents.certificate.generate.nextNumber") }}</h3>
          </div>
          <div class="mt-3 rounded-ui-control bg-ui-subtle border border-ui-line px-3.5 py-3 min-h-[48px] flex items-center">
            <span v-if="previewLoading" class="flex items-center gap-2 text-ui-small text-ui-muted">
              <UiSpinner size="14px" /> {{ $t("documents.certificate.generate.calculating") }}
            </span>
            <span v-else-if="preview" class="font-mono text-ui-body font-semibold text-ui-ink break-all">{{ preview.number }}</span>
            <span v-else class="text-ui-small text-ui-muted">{{ $t("documents.certificate.generate.previewHint") }}</span>
          </div>

          <dl class="mt-3 divide-y divide-ui-line text-ui-small">
            <div class="flex items-center justify-between gap-3 py-2">
              <dt class="text-ui-muted">{{ $t("documents.certificate.generate.recipientsTitle") }}</dt>
              <dd class="text-ui-ink tabular-nums">{{ filledRecipients }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2">
              <dt class="text-ui-muted">{{ $t("documents.certificate.generate.mode") }}</dt>
              <dd>
                <UiBadge v-if="isBulk" tone="warn" dot>{{ $t("documents.certificate.generate.bulkActive", { n: recipients.filter(r => r.name).length }) }}</UiBadge>
                <UiBadge v-else tone="neutral">{{ $t("documents.certificate.generate.single") }}</UiBadge>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2">
              <dt class="text-ui-muted">{{ $t("documents.certificate.generate.layout.orientation") }}</dt>
              <dd class="text-ui-ink">{{ $t(`documents.certificate.generate.layout.${form.orientation}`) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2">
              <dt class="text-ui-muted">{{ $t("documents.certificate.generate.tasksPage.short") }}</dt>
              <dd class="text-ui-ink">{{ form.include_tasks ? $t("documents.certificate.generate.tasksPage.on", { n: linkedRecipients }) : $t("documents.certificate.generate.tasksPage.off") }}</dd>
            </div>
          </dl>
        </section>

        <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" />
        <UiAlert v-if="successMessage" tone="ok" :message="successMessage" />

        <div class="flex flex-col gap-2">
          <UiButton type="submit" size="lg" block :icon="Award" :loading="submitting">{{ submitLabel }}</UiButton>
          <UiButton variant="secondary" size="lg" block class="sm:hidden" :to="{ name: 'admin.certificates.dashboard' }">{{ $t("common.actions.cancel") }}</UiButton>
        </div>
      </aside>
    </form>
  </div>
</template>
