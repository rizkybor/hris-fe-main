<script setup>
import { onMounted, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { Award, Save, Upload, Trash2, ImageIcon, Info } from "lucide-vue-next";
import { useCertificateStore } from "@/stores/certificate";
import { useAlertModalStore } from "@/stores/alertModal";

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
    settingsSuccess.value = "Certificate settings saved successfully.";
  } catch (error) {
    settingsError.value = error?.response?.data?.message || "Failed to save settings.";
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
    templateError.value = "Template name and background file are required.";
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
    templateError.value = error?.response?.data?.message || "Failed to upload template.";
  } finally {
    uploadingTemplate.value = false;
  }
};

const handleDeleteTemplate = async (template) => {
  if (!(await alertModal.confirm(`Delete template "${template.name}"?`))) return;
  await store.deleteTemplate(template.id);
};
</script>

<template>
  <div class="px-4 py-4">
    <div class="bg-white mb-5">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-amber-50 rounded-[12px] flex items-center justify-center">
          <Award class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Certificate Configuration</h3>
          <p class="text-brand-light text-sm">Automatic numbering format and certificate background template settings</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <h4 class="text-brand-dark font-bold mb-4"> Certificate Numbering</h4>

        <form @submit.prevent="handleSaveSettings" class="space-y-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Company Code</label>
            <input v-model="form.company_code" type="text" required maxlength="20" placeholder="e.g. JCD" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm uppercase" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Number Format</label>
            <input v-model="form.number_format" type="text" required placeholder="{company}/{category}/{program}/{year}/{month_roman}/{sequence}" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm font-mono" />
            <div class="flex flex-wrap gap-1.5 mt-2">
              <button
                v-for="token in tokens"
                :key="token"
                type="button"
                @click="insertToken(token)"
                class="px-2 py-1 rounded-md bg-blue-50 text-[#0C51D9] text-xs font-mono font-semibold hover:bg-blue-100"
              >
                {{ token }}
              </button>
            </div>
          </div>

          <div class="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-start gap-2">
            <Info class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div class="text-sm text-amber-800">
              Example result: <span class="font-mono font-bold">{{ previewFormat }}</span>
            </div>
          </div>

          <p v-if="settingsError" class="text-red-500 text-sm">{{ settingsError }}</p>
          <p v-if="settingsSuccess" class="text-green-600 text-sm font-semibold">{{ settingsSuccess }}</p>

          <button
            type="submit"
            :disabled="savingSettings"
            class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-5 py-2.5 flex items-center gap-2 disabled:opacity-50"
          >
            <Save class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">{{ savingSettings ? "Saving..." : "Save Settings" }}</span>
          </button>
        </form>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <h4 class="text-brand-dark font-bold mb-4">Template Background</h4>
        <p class="text-xs text-gray-400 mb-4">
          Without a specific template, certificates use the default premium template provided by the system.
          Upload an image to use your own background. (size guide : 297 X 210 mm)
        </p>

        <div class="border border-dashed border-[#DCDEDD] rounded-xl p-4 mb-4">
          <div class="mb-3">
            <label class="text-xs text-gray-500 mb-1 block">Template Name</label>
            <input v-model="newTemplate.name" type="text" placeholder="e.g. Premium Gold Template" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
          <div class="mb-3">
            <label class="text-xs text-gray-500 mb-1 block">Background Image (JPEG/PNG/WEBP, max 5MB)</label>
            <input id="template-file-input" @change="onFileChange" type="file" accept="image/jpeg,image/png,image/jpg,image/webp" class="w-full text-sm" />
          </div>
          <p v-if="templateError" class="text-red-500 text-xs mb-2">{{ templateError }}</p>
          <button
            type="button"
            @click="handleUploadTemplate"
            :disabled="uploadingTemplate"
            class="px-4 py-2 rounded-lg bg-[#0C51D9] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Upload class="w-4 h-4" /> {{ uploadingTemplate ? "Uploading..." : "Upload Template" }}
          </button>
        </div>

        <div class="space-y-2">
          <div v-for="template in templates" :key="template.id" class="flex items-center justify-between p-3 border border-[#DCDEDD] rounded-lg">
            <div class="flex items-center gap-3 min-w-0">
              <img
                v-if="template.background_url"
                :src="template.background_url"
                class="w-12 h-9 object-cover rounded-md border border-[#DCDEDD] shrink-0"
              />
              <div v-else class="w-12 h-9 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                <ImageIcon class="w-4 h-4 text-gray-400" />
              </div>
              <span class="font-semibold text-brand-dark text-sm truncate">{{ template.name }}</span>
            </div>
            <button @click="handleDeleteTemplate(template)" class="text-gray-400 hover:text-red-600 shrink-0">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <div v-if="templates.length === 0" class="text-center py-6 text-sm text-gray-400">
            No custom templates available. Certificates will use the default template.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
