<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { Settings, Plus, Trash2, Hash, ClipboardPaste, ArrowLeft, Award } from "lucide-vue-next";
import { useCertificateStore } from "@/stores/certificate";
import SignatureToggle from "@/components/common/SignatureToggle.vue";
import { can } from "@/helpers/permissionHelper";
import { UiPageHeader, UiButton, UiCard, UiInput, UiSelect, UiAlert, UiBadge, UiSpinner } from "@/components/ui";

const store = useCertificateStore();
const { templates } = storeToRefs(store);
const router = useRouter();

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
});

const recipients = ref([{ name: "" }]);
const bulkText = ref("");
const showBulkPaste = ref(false);

const preview = ref(null);
const previewLoading = ref(false);
const submitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

onMounted(async () => {
  await store.fetchTemplates();
});

const addRecipient = () => recipients.value.push({ name: "" });
const removeRecipient = (i) => recipients.value.splice(i, 1);

const applyBulkPaste = () => {
  const names = bulkText.value
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return;
  recipients.value = names.map((name) => ({ name }));
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
    errorMessage.value = "At least 1 recipient is required.";
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      ...form.value,
      certificate_template_id: form.value.certificate_template_id || null,
      start_date: form.value.start_date || null,
      end_date: form.value.end_date || null,
      recipients: cleanRecipients,
    };
    const result = await store.generate(payload);
    successMessage.value = result.isZip
      ? `Successfully generated ${cleanRecipients.length} certificates, downloaded as ${result.filename}.`
      : `Certificate successfully generated and downloaded as ${result.filename}.`;
    recipients.value = [{ name: "" }];
    preview.value = null;
    setTimeout(() => router.push({ name: "admin.certificates.dashboard" }), 1500);
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Failed to generate certificate.");
  } finally {
    submitting.value = false;
  }
};

// Presentation only: template options and the summary panel.
const templateOptions = computed(() => [
  { value: "", label: "Default Premium (system default)" },
  ...templates.value.map((tpl) => ({ value: tpl.id, label: tpl.name })),
]);
const filledRecipients = computed(() => recipients.value.filter((r) => r.name).length);
const submitLabel = computed(() => (submitting.value ? "Generating Certificate..." : isBulk.value ? "Bulk Generate (.zip)" : "Generate Certificate"));
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      title="Generate Certificate"
      subtitle="Certificate number is generated automatically, supports bulk generation"
      class="ui-anim-fade-up"
    >
      <template #eyebrow>
        <router-link
          :to="{ name: 'admin.certificates.dashboard' }"
          class="ui-press inline-flex items-center gap-1 mb-1.5 text-ui-small font-medium text-ui-accent hover:underline"
          aria-label="Back to Certificates"
        >
          <ArrowLeft class="w-4 h-4" />Certificate
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('certificate-menu')" variant="ghost" :icon="Settings" :to="{ name: 'admin.settings.certificate-settings' }">Settings & Templates</UiButton>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" :to="{ name: 'admin.certificates.dashboard' }">Cancel</UiButton>
          <UiButton type="submit" form="certificate-form" :icon="Award" :loading="submitting">{{ submitLabel }}</UiButton>
        </div>
      </template>
    </UiPageHeader>

    <form id="certificate-form" class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start" @submit.prevent="handleSubmit">
      <div class="lg:col-span-2 space-y-5 min-w-0 ui-stagger">
        <UiCard title="Certificate Information">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput v-model="form.title" label="Certificate Title" required placeholder="e.g. Advanced React Training Certificate" class="md:col-span-2" />
            <UiInput v-model="form.description" :rows="3" label="Description (optional)" placeholder="Description of achievement / program" class="md:col-span-2" />
            <UiInput v-model="form.start_date" type="date" label="Start Date (optional)" />
            <div class="min-w-0">
              <label for="certificate-end-date" class="block text-ui-small font-medium text-ui-ink mb-1.5">End Date (optional)</label>
              <input
                id="certificate-end-date"
                v-model="form.end_date"
                type="date"
                :min="form.start_date || undefined"
                class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
              />
            </div>
            <UiInput v-model="form.signatory_name" label="Signatory Name" required />
            <UiInput v-model="form.signatory_title" label="Signatory Position" required />
            <SignatureToggle v-model="form.use_signature" class="md:col-span-2" />
          </div>
        </UiCard>

        <UiCard title="Numbering & Template">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput v-model="form.category_code" label="Category Code" required placeholder="e.g. TRAINING" class="[&_input]:uppercase" />
            <UiInput v-model="form.program_code" label="Program Code" required placeholder="e.g. REACT101" class="[&_input]:uppercase" />
            <UiSelect v-model="form.certificate_template_id" label="Background Template" :options="templateOptions" class="md:col-span-2" />
          </div>
        </UiCard>

        <UiCard title="Recipients">
          <template #actions>
            <UiButton variant="ghost" size="sm" :icon="ClipboardPaste" @click="showBulkPaste = !showBulkPaste">Bulk Paste</UiButton>
          </template>
          <p class="text-ui-cap text-ui-muted -mt-1 mb-4">
            Add more than 1 recipient for bulk generation &mdash; the result is automatically bundled into a .zip file containing a PDF per recipient, no duplicate numbers.
          </p>

          <div v-if="showBulkPaste" class="mb-4 rounded-ui-control border border-ui-line bg-ui-subtle/60 p-4 ui-anim-fade-up">
            <UiInput v-model="bulkText" :rows="5" label="Paste name list (one name per line)" placeholder="John Doe&#10;Jane Smith&#10;..." mono />
            <UiButton variant="secondary" size="sm" class="mt-2" @click="applyBulkPaste">Apply to Recipient List</UiButton>
          </div>

          <ol class="space-y-2">
            <li v-for="(recipient, i) in recipients" :key="i" class="flex items-center gap-2">
              <span class="text-ui-cap text-ui-faint tabular-nums w-6 shrink-0 text-right">{{ i + 1 }}.</span>
              <UiInput v-model="recipient.name" placeholder="Recipient name" class="flex-1" />
              <button
                v-if="recipients.length > 1"
                type="button"
                class="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus"
                :aria-label="`Remove recipient ${i + 1}`"
                @click="removeRecipient(i)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </li>
          </ol>
          <UiButton variant="secondary" :icon="Plus" class="mt-3 w-full sm:w-auto" @click="addRecipient">Add Recipient</UiButton>
        </UiCard>
      </div>

      <!-- Side panel: number preview, summary, actions -->
      <aside class="space-y-4 lg:sticky lg:top-4 min-w-0">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <div class="flex items-center gap-2">
            <Hash class="w-4 h-4 text-ui-faint" />
            <h3 class="text-ui-h3 text-ui-ink">Next certificate number</h3>
          </div>
          <div class="mt-3 rounded-ui-control bg-ui-subtle border border-ui-line px-3.5 py-3 min-h-[48px] flex items-center">
            <span v-if="previewLoading" class="flex items-center gap-2 text-ui-small text-ui-muted">
              <UiSpinner size="14px" /> Calculating number...
            </span>
            <span v-else-if="preview" class="font-mono text-ui-body font-semibold text-ui-ink break-all">{{ preview.number }}</span>
            <span v-else class="text-ui-small text-ui-muted">Fill in Category Code and Program Code to preview the certificate number.</span>
          </div>

          <dl class="mt-3 divide-y divide-ui-line text-ui-small">
            <div class="flex items-center justify-between gap-3 py-2">
              <dt class="text-ui-muted">Recipients</dt>
              <dd class="text-ui-ink tabular-nums">{{ filledRecipients }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2">
              <dt class="text-ui-muted">Mode</dt>
              <dd>
                <UiBadge v-if="isBulk" tone="warn" dot>Bulk mode active ({{ recipients.filter(r => r.name).length }} recipients)</UiBadge>
                <UiBadge v-else tone="neutral">Single</UiBadge>
              </dd>
            </div>
          </dl>
        </section>

        <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" />
        <UiAlert v-if="successMessage" tone="ok" :message="successMessage" />

        <div class="flex flex-col gap-2">
          <UiButton type="submit" size="lg" block :icon="Award" :loading="submitting">{{ submitLabel }}</UiButton>
          <UiButton variant="secondary" size="lg" block class="sm:hidden" :to="{ name: 'admin.certificates.dashboard' }">Cancel</UiButton>
        </div>
      </aside>
    </form>
  </div>
</template>
