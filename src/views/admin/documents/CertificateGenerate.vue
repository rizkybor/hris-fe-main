<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { Award, Settings, Plus, Trash2, Info, ClipboardPaste, Loader2, ChevronDown } from "lucide-vue-next";
import { useCertificateStore } from "@/stores/certificate";
import { can } from "@/helpers/permissionHelper";

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
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-amber-50 rounded-[12px] flex items-center justify-center">
          <Award class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Generate Certificate</h3>
          <p class="text-brand-light text-sm">Certificate number is generated automatically, supports bulk generation</p>
        </div>
      </div>
      <router-link
        v-if="can('certificate-menu')"
        :to="{ name: 'admin.settings.certificate-settings' }"
        class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1 hover:underline shrink-0"
      >
        <Settings class="w-4 h-4" /> Settings & Templates
      </router-link>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <h4 class="text-brand-dark font-bold mb-4">Certificate Information</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Certificate Title</label>
            <input v-model="form.title" type="text" required placeholder="e.g. Advanced React Training Certificate" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Description (optional)</label>
            <textarea v-model="form.description" rows="3" placeholder="Description of achievement / program" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Start Date (optional)</label>
            <input v-model="form.start_date" type="date" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">End Date (optional)</label>
            <input v-model="form.end_date" type="date" :min="form.start_date || undefined" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Signatory Name</label>
            <input v-model="form.signatory_name" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Signatory Position</label>
            <input v-model="form.signatory_title" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <h4 class="text-brand-dark font-bold mb-4">Numbering & Template</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Category Code</label>
            <input v-model="form.category_code" type="text" required placeholder="e.g. TRAINING" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm uppercase" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Program Code</label>
            <input v-model="form.program_code" type="text" required placeholder="e.g. REACT101" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm uppercase" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Background Template</label>
            <div class="relative w-full">
              <select v-model="form.certificate_template_id" class="select-soft">
                <option value="">Default Premium (system default)</option>
                <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
              </select>
              <ChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <div class="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-start gap-2">
          <Info class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div class="text-sm text-amber-800">
            <span v-if="previewLoading" class="flex items-center gap-1">
              <Loader2 class="w-3.5 h-3.5 animate-spin" /> Calculating number...
            </span>
            <span v-else-if="preview">
              Next certificate number: <span class="font-mono font-bold">{{ preview.number }}</span>
            </span>
            <span v-else>Fill in Category Code and Program Code to preview the certificate number.</span>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between mb-1">
          <h4 class="text-brand-dark font-bold">Recipients</h4>
          <button type="button" @click="showBulkPaste = !showBulkPaste" class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1">
            <ClipboardPaste class="w-4 h-4" /> Bulk Paste
          </button>
        </div>
        <p class="text-xs text-gray-400 mb-4">
          Add more than 1 recipient for bulk generation &mdash; the result is automatically bundled into a .zip file containing a PDF per recipient, no duplicate numbers.
          <span v-if="isBulk" class="text-amber-600 font-semibold"> Bulk mode active ({{ recipients.filter(r => r.name).length }} recipients).</span>
        </p>

        <div v-if="showBulkPaste" class="mb-4 rounded-xl border border-[#DCDEDD] p-4">
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Paste name list (one name per line)</label>
          <textarea v-model="bulkText" rows="5" placeholder="John Doe&#10;Jane Smith&#10;..." class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none font-mono"></textarea>
          <button type="button" @click="applyBulkPaste" class="mt-2 px-4 py-2 rounded-lg bg-[#0C51D9] text-white text-sm font-semibold">
            Apply to Recipient List
          </button>
        </div>

        <div class="space-y-2">
          <div v-for="(recipient, i) in recipients" :key="i" class="flex items-center gap-2">
            <span class="text-xs text-gray-400 w-6 shrink-0">{{ i + 1 }}.</span>
            <input v-model="recipient.name" type="text" placeholder="Recipient name" class="flex-1 px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
            <button v-if="recipients.length > 1" type="button" @click="removeRecipient(i)" class="text-gray-400 hover:text-red-600 shrink-0">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
        <button type="button" @click="addRecipient" class="mt-3 text-[#0C51D9] text-sm font-semibold flex items-center gap-1">
          <Plus class="w-4 h-4" /> Add Recipient
        </button>
      </div>

      <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>
      <p v-if="successMessage" class="text-green-600 text-sm font-semibold">{{ successMessage }}</p>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          :disabled="submitting"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center gap-2 disabled:opacity-50"
        >
          <Loader2 v-if="submitting" class="w-4 h-4 animate-spin text-white" />
          <span class="text-brand-white text-sm font-semibold">
            {{ submitting ? "Generating Certificate..." : isBulk ? "Bulk Generate (.zip)" : "Generate Certificate" }}
          </span>
        </button>
        <router-link
          :to="{ name: 'admin.certificates.dashboard' }"
          class="px-6 py-3 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Cancel
        </router-link>
      </div>
    </form>
  </div>
</template>
