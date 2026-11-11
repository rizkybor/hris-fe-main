<script setup>
import { onMounted, ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { Award, Save, Upload, Trash2, ImageIcon, Info, ArrowLeft } from "lucide-vue-next";
import { useCertificateStore } from "@/stores/certificate";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiAlert, UiButton, UiEmpty, UiInput, UiPageHeader, UiTable } from "@/components/ui";

const { t } = useI18n();
const store = useCertificateStore();
const alertModal = useAlertModalStore();
const { settings, templates } = storeToRefs(store);

const form = ref({ company_code: "", number_format: "" });
const savingSettings = ref(false);
const settingsError = ref("");
const settingsSuccess = ref("");

const newTemplate = ref({ name: "", file: null });
const uploadingTemplate = ref(false);
const templateError = ref("");

onMounted(async () => {
  await Promise.all([store.fetchSettings(), store.fetchTemplates()]);
  form.value = { company_code: settings.value.company_code, number_format: settings.value.number_format };
});

const tokens = ["{company}", "{category}", "{program}", "{year}", "{month_roman}", "{sequence}"];

const previewFormat = computed(() => {
  if (!form.value.number_format) return "-";
  return form.value.number_format
    .replace("{company}", form.value.company_code || "JCD")
    .replace("{category}", "TRAINING")
    .replace("{program}", "REACT101")
    .replace("{year}", String(new Date().getFullYear()))
    .replace("{month_roman}", "VIII")
    .replace("{sequence}", "0001");
});

const insertToken = (token) => {
  form.value.number_format = `${form.value.number_format}${token}`;
};

const handleSaveSettings = async () => {
  settingsError.value = "";
  settingsSuccess.value = "";
  savingSettings.value = true;
  try {
    await store.updateSettings(form.value);
    settingsSuccess.value = t("settings.certificate.saved");
  } catch (error) {
    settingsError.value = error?.response?.data?.message || t("settings.certificate.saveFailed");
  } finally {
    savingSettings.value = false;
  }
};

const onFileChange = (event) => {
  newTemplate.value.file = event.target.files[0] || null;
};

const handleUploadTemplate = async () => {
  templateError.value = "";
  if (!newTemplate.value.name || !newTemplate.value.file) {
    templateError.value = t("settings.certificate.templateRequired");
    return;
  }
  const formData = new FormData();
  formData.append("name", newTemplate.value.name);
  formData.append("background", newTemplate.value.file);

  uploadingTemplate.value = true;
  try {
    await store.createTemplate(formData);
    newTemplate.value = { name: "", file: null };
    const input = document.getElementById("template-file-input");
    if (input) input.value = "";
  } catch (error) {
    templateError.value = error?.response?.data?.message || t("settings.certificate.uploadFailed");
  } finally {
    uploadingTemplate.value = false;
  }
};

// Presentation only.
const templateColumns = computed(() => [
  { key: "name", label: t("settings.certificate.templateColumn") },
  { key: "actions", label: "", align: "right", width: 64 },
]);

const handleDeleteTemplate = async (template) => {
  if (!(await alertModal.confirm(t("settings.certificate.deleteTemplateConfirm", { name: template.name })))) return;
  await store.deleteTemplate(template.id);
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('settings.certificate.title')" :subtitle="$t('settings.certificate.subtitle')">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" :aria-label="$t('settings.backToSettings')" :title="$t('settings.backToSettings')">
          <ArrowLeft class="w-4 h-4" /> {{ $t("settings.settings") }}
        </router-link>
      </template>
    </UiPageHeader>

    <!-- Numbering -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4 lg:gap-10 p-4 sm:p-5 lg:p-6">
        <div>
          <div class="flex items-center gap-2">
            <Award class="w-4 h-4 text-ui-muted" />
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("settings.certificate.numberingTitle") }}</h2>
          </div>
          <p class="text-ui-small text-ui-muted mt-1">{{ $t("settings.certificate.numberingHint") }}</p>
        </div>

        <form @submit.prevent="handleSaveSettings" class="space-y-4 min-w-0">
          <div class="sm:max-w-[240px]">
            <label for="cert-company-code" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("settings.certificate.companyCode") }}<span class="text-ui-bad"> *</span></label>
            <input id="cert-company-code" v-model="form.company_code" type="text" required maxlength="20" :placeholder="$t('settings.certificate.companyCodePlaceholder')" class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus uppercase" />
          </div>
          <div>
            <UiInput v-model="form.number_format" :label="$t('settings.certificate.numberFormat')" required mono placeholder="{company}/{category}/{program}/{year}/{month_roman}/{sequence}" />
            <div class="flex flex-wrap gap-1.5 mt-2">
              <button
                v-for="token in tokens"
                :key="token"
                type="button"
                @click="insertToken(token)"
                class="ui-press h-7 px-2 rounded-md border border-ui-line bg-ui-subtle text-ui-text text-ui-cap font-mono hover:bg-ui-hover hover:text-ui-ink"
              >
                {{ token }}
              </button>
            </div>
          </div>

          <UiAlert tone="info">
            {{ $t("settings.certificate.exampleResult") }} <span class="font-mono font-semibold text-ui-ink break-all">{{ previewFormat }}</span>
          </UiAlert>

          <UiAlert v-if="settingsError" tone="bad" :message="settingsError" />
          <UiAlert v-if="settingsSuccess" tone="ok" :message="settingsSuccess" />

          <div class="flex justify-end">
            <UiButton type="submit" :icon="Save" :loading="savingSettings" :disabled="savingSettings">
              {{ savingSettings ? $t("common.actions.saving") : $t("settings.certificate.saveSettings") }}
            </UiButton>
          </div>
        </form>
      </div>
    </section>

    <!-- Templates -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4 lg:gap-10 p-4 sm:p-5 lg:p-6">
        <div>
          <div class="flex items-center gap-2">
            <ImageIcon class="w-4 h-4 text-ui-muted" />
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("settings.certificate.templateTitle") }}</h2>
          </div>
          <p class="text-ui-small text-ui-muted mt-1">{{ $t("settings.certificate.templateHint") }}</p>
        </div>

        <div class="space-y-4 min-w-0">
          <div class="border border-dashed border-ui-line-strong rounded-ui-card p-4 space-y-3">
            <UiInput v-model="newTemplate.name" :label="$t('settings.certificate.templateName')" :placeholder="$t('settings.certificate.templateNamePlaceholder')" />
            <div>
              <label for="template-file-input" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("settings.certificate.backgroundImage") }}</label>
              <input
                id="template-file-input"
                @change="onFileChange"
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                class="block w-full text-ui-small text-ui-muted file:mr-3 file:h-[34px] file:px-3 file:rounded-ui-control file:border file:border-solid file:border-ui-line-strong file:bg-ui-surface file:text-ui-small file:font-medium file:text-ui-ink hover:file:bg-ui-hover file:cursor-pointer"
              />
            </div>
            <p v-if="templateError" class="text-ui-cap text-ui-bad">{{ templateError }}</p>
            <UiButton :icon="Upload" :loading="uploadingTemplate" :disabled="uploadingTemplate" @click="handleUploadTemplate">
              {{ uploadingTemplate ? $t("settings.certificate.uploading") : $t("settings.certificate.uploadTemplate") }}
            </UiButton>
          </div>

          <div class="border border-ui-line rounded-ui-card overflow-hidden">
            <UiTable :columns="templateColumns" :rows="templates">
              <template #cell-name="{ row }">
                <div class="flex items-center gap-3 min-w-0">
                  <img v-if="row.background_url" :src="row.background_url" :alt="row.name" class="w-12 h-9 object-cover rounded-md border border-ui-line shrink-0" />
                  <div v-else class="w-12 h-9 rounded-md bg-ui-subtle flex items-center justify-center shrink-0">
                    <ImageIcon class="w-4 h-4 text-ui-faint" />
                  </div>
                  <span class="font-medium text-ui-ink truncate">{{ row.name }}</span>
                </div>
              </template>
              <template #cell-actions="{ row }">
                <UiButton variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('settings.certificate.deleteTemplateAria')" @click="handleDeleteTemplate(row)" />
              </template>
              <template #mobile="{ row, number }">
                <div class="flex items-center gap-3 px-3 py-2.5">
                  <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
                  <img v-if="row.background_url" :src="row.background_url" :alt="row.name" class="w-12 h-9 object-cover rounded-md border border-ui-line shrink-0" />
                  <div v-else class="w-12 h-9 rounded-md bg-ui-subtle flex items-center justify-center shrink-0">
                    <ImageIcon class="w-4 h-4 text-ui-faint" />
                  </div>
                  <span class="flex-1 min-w-0 text-ui-small font-medium text-ui-ink truncate">{{ row.name }}</span>
                  <UiButton variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('settings.certificate.deleteTemplateAria')" @click="handleDeleteTemplate(row)" />
                </div>
              </template>
              <template #empty>
                <UiEmpty :icon="ImageIcon" :title="$t('settings.certificate.emptyTitle')" :message="$t('settings.certificate.emptyMessage')" compact />
              </template>
            </UiTable>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
