<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import {
  Archive,
  Upload,
  FileUp,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
  Info,
  Paperclip,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import BaseInput from "@/components/common/form/Input.vue";
import TextArea from "@/components/common/form/TextArea.vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";

const router = useRouter();
const archiveStore = useFilesCompanyStore();

const loading = ref(false);
const error = ref("");
const success = ref("");

const form = ref({
  file_name: "",
  description: "",
  file: null,
});

const fileError = ref(false);
const nameError = ref(false);

const onFileChange = (event) => {
  form.value.file = event.target.files[0] || null;
  fileError.value = false;
};

// Mirrors the archive list's file-type presentation so the chosen file is
// recognizable at a glance before it's even uploaded.
const fileTypeMeta = (mime) => {
  if (!mime) return { icon: FileIcon, class: "text-gray-400" };
  if (mime.startsWith("image/")) return { icon: FileImage, class: "text-emerald-500" };
  if (mime === "application/pdf") return { icon: FileText, class: "text-red-500" };
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv")
    return { icon: FileSpreadsheet, class: "text-green-600" };
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("archive"))
    return { icon: FileArchive, class: "text-amber-500" };
  if (mime.includes("word") || mime === "application/msword")
    return { icon: FileText, class: "text-blue-500" };
  return { icon: FileIcon, class: "text-gray-400" };
};

const selectedFileMeta = computed(() => fileTypeMeta(form.value.file?.type));

const submit = async () => {
  error.value = "";
  success.value = "";
  fileError.value = false;
  nameError.value = false;

  if (!form.value.file_name) nameError.value = true;
  if (!form.value.file) fileError.value = true;

  if (nameError.value || fileError.value) {
    error.value = "File Name dan File wajib diisi.";
    return;
  }

  const payload = new FormData();
  payload.append("document_name", form.value.file_name);
  payload.append("description", form.value.description || "");
  payload.append("document_path", form.value.file);
  payload.append("type_file", form.value.file.type);
  payload.append("size_file", form.value.file.size);

  loading.value = true;
  try {
    await archiveStore.createArchive(payload);
    success.value = "File berhasil diunggah.";

    setTimeout(() => {
      router.push({ name: "admin.files-company.dashboard" });
    }, 1200);
  } catch (err) {
    error.value = err?.message || "Gagal mengunggah file.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Archive class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-brand-dark text-xl font-bold">Upload Document File</h1>
          <p class="text-brand-light text-sm">Store a permanent company document</p>
        </div>
      </div>
    </div>

    <div class="mb-6">
      <Transition name="fade">
        <Alert
          v-if="error"
          type="danger"
          :title="error"
          message=""
          :show="!!error"
          @close="error = ''"
        />
      </Transition>
      <Transition name="fade">
        <Alert
          v-if="success"
          type="success"
          :title="success"
          message=""
          :show="!!success"
        />
      </Transition>
    </div>

    <form @submit.prevent="submit" class="space-y-6">
      <!-- File Info -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Info class="w-4.5 h-4.5 text-blue-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Informasi File</h4>
        </div>

        <div class="space-y-5">
          <BaseInput
            id="file_name"
            label="File Name *"
            placeholder="e.g. Company NDA Template, HR Policy 2026"
            v-model="form.file_name"
            :error="nameError ? 'File name is required.' : ''"
          />

          <TextArea
            id="description"
            label="Description (Optional)"
            placeholder="Additional notes about this file..."
            v-model="form.description"
            rows="4"
          />
        </div>
      </div>

      <!-- Upload -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-indigo-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Paperclip class="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Berkas</h4>
        </div>

        <label class="block text-brand-dark text-sm font-semibold mb-1.5">
          Upload File *
        </label>
        <label
          class="flex flex-col items-center justify-center gap-2 w-full py-8 border-2 border-dashed rounded-[12px] cursor-pointer transition-all"
          :class="fileError ? 'border-red-400 bg-red-50' : 'border-[#DCDEDD] hover:border-[#0C51D9] hover:bg-blue-50/30'"
        >
          <component :is="form.file ? selectedFileMeta.icon : FileUp" class="w-8 h-8" :class="form.file ? selectedFileMeta.class : 'text-gray-400'" />
          <span class="text-sm text-brand-dark font-semibold">
            {{ form.file ? form.file.name : "Click to choose a file" }}
          </span>
          <span v-if="!form.file" class="text-xs text-brand-light">or drag and drop</span>
          <input type="file" class="hidden" @change="onFileChange" />
        </label>
        <p v-if="fileError" class="mt-2 text-red-600 text-sm">File is required.</p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          @click="$router.back()"
          class="w-full sm:w-auto border border-[#DCDEDD] rounded-[12px] hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 px-6 py-3 text-brand-dark font-semibold"
        >
          Cancel
        </button>

        <button
          type="submit"
          :disabled="loading"
          class="w-full sm:w-auto btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Upload class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">
            {{ loading ? "Uploading..." : "Upload File" }}
          </span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
