<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Archive,
  Save,
  ArrowLeft,
  FileUp,
  X,
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
import { errorMessage } from "@/helpers/errorHelper";

const archiveStore = useFilesCompanyStore();
const route = useRoute();
const router = useRouter();
const archiveId = route.params.id;

const loading = ref(true);
const submitting = ref(false);
const loadError = ref("");
const error = ref("");
const success = ref("");

const form = ref({
  document_name: "",
  description: "",
  new_file: null,
  remove_file: false,
});
const fileNameError = ref(false);

let tempPreviewURL = null;

const isImage = (type) => type?.startsWith("image/");

const fetchArchive = async () => {
  loading.value = true;
  try {
    await archiveStore.fetchArchiveById(archiveId);
    const archive = archiveStore.currentArchive;

    if (!archive) {
      loadError.value = "Archive not found.";
      return;
    }

    form.value.document_name = archive.document_name || "";
    form.value.description = archive.description || "";
    form.value.new_file = null;
    form.value.remove_file = false;

    if (tempPreviewURL) {
      URL.revokeObjectURL(tempPreviewURL);
      tempPreviewURL = null;
    }
  } catch (err) {
    console.error(err);
    loadError.value = "Failed to load archive.";
  } finally {
    loading.value = false;
  }
};

onMounted(fetchArchive);
onBeforeUnmount(() => {
  if (tempPreviewURL) URL.revokeObjectURL(tempPreviewURL);
});

const onFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  form.value.new_file = file;
  form.value.remove_file = false;

  if (tempPreviewURL) URL.revokeObjectURL(tempPreviewURL);
  tempPreviewURL = URL.createObjectURL(file);
};

const removeFile = () => {
  const archive = archiveStore.currentArchive;
  if (!archive?.document_path) return;

  form.value.remove_file = true;
  form.value.new_file = null;

  if (tempPreviewURL) {
    URL.revokeObjectURL(tempPreviewURL);
    tempPreviewURL = null;
  }
};

const submit = async () => {
  error.value = "";
  success.value = "";
  fileNameError.value = false;

  if (!form.value.document_name) {
    fileNameError.value = true;
    error.value = "File name is required.";
    return;
  }

  submitting.value = true;
  try {
    const formData = new FormData();
    formData.append("document_name", form.value.document_name);
    formData.append("description", form.value.description);

    if (form.value.new_file) {
      formData.append("document_path", form.value.new_file);
    }
    if (form.value.remove_file) {
      formData.append("remove_file", "1");
    }

    const updatedArchive = await archiveStore.updateArchive(archiveId, formData);

    form.value.new_file = null;
    form.value.remove_file = false;
    form.value.document_name = updatedArchive.document_name;
    form.value.description = updatedArchive.description;

    success.value = "File updated successfully.";

    setTimeout(() => {
      router.push({ name: "admin.files-company.dashboard" });
    }, 1200);
  } catch (err) {
    console.error(err);
    error.value = errorMessage(err, "Failed to update file.");
  } finally {
    submitting.value = false;
  }
};

const previewFile = computed(() => {
  if (form.value.new_file) return tempPreviewURL;
  if (archiveStore.currentArchive?.document_path && !form.value.remove_file)
    return archiveStore.currentArchive.document_path;
  return null;
});

// Mirrors the archive list's file-type presentation for the "replace file" dropzone.
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

const newFileMeta = computed(() => fileTypeMeta(form.value.new_file?.type));
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <button
          @click="router.back()"
          class="w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-blue-400 transition-all"
          aria-label="Back"
        >
          <ArrowLeft class="w-5 h-5 text-gray-600" />
        </button>

        <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Archive class="w-6 h-6 text-blue-600" />
        </div>

        <div>
          <h1 class="text-brand-dark text-xl font-bold">Edit Document File</h1>
          <p class="text-brand-light text-sm">Update file metadata or replace the attached document</p>
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

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center gap-3 py-20 text-gray-500">
      <span class="w-5 h-5 border-2 border-gray-300 border-t-[#0C51D9] rounded-full animate-spin"></span>
      Loading archive data...
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" class="text-center py-20 text-red-600">
      {{ loadError }}
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="submit" class="space-y-6">
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
            id="document_name"
            label="File Name *"
            placeholder="Enter file name"
            v-model="form.document_name"
            :error="fileNameError ? 'File name is required.' : ''"
          />

          <TextArea
            id="description"
            label="Description (Optional)"
            placeholder="Enter a description"
            v-model="form.description"
            rows="4"
          />
        </div>
      </div>

      <!-- File -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-indigo-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Paperclip class="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <h4 class="text-brand-dark font-bold">File</h4>
        </div>

        <!-- Current / Preview File -->
        <div v-if="previewFile" class="mb-5">
          <label class="block text-brand-dark text-sm font-semibold mb-1.5">File Preview</label>

          <div
            v-if="!form.new_file && !form.remove_file"
            class="flex items-center justify-between gap-3 px-4 py-3 border border-[#DCDEDD] rounded-[12px] mb-3"
          >
            <a
              :href="archiveStore.currentArchive.document_path"
              target="_blank"
              class="text-[#0C51D9] font-semibold hover:underline truncate"
            >
              {{ archiveStore.currentArchive.document_name }}
            </a>
            <button
              type="button"
              @click="removeFile"
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-all flex-shrink-0"
            >
              <X class="w-4 h-4" /> Remove
            </button>
          </div>

          <div class="w-full max-h-[400px] overflow-auto border border-[#DCDEDD] rounded-[12px] p-1">
            <img
              v-if="isImage(form.new_file?.type || archiveStore.currentArchive?.type_file)"
              :src="previewFile"
              alt="File Preview"
              class="w-full object-contain rounded-[12px]"
            />
            <iframe
              v-else-if="(form.new_file?.type || archiveStore.currentArchive?.type_file) === 'application/pdf'"
              :src="previewFile"
              class="w-full h-[400px] rounded-[12px]"
            ></iframe>
          </div>
        </div>

        <!-- Upload New File -->
        <div>
          <label class="block text-brand-dark text-sm font-semibold mb-1.5">
            Replace File (Optional)
          </label>
          <label
            class="flex flex-col items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-[#DCDEDD] rounded-[12px] cursor-pointer hover:border-[#0C51D9] hover:bg-blue-50/30 transition-all"
          >
            <component :is="form.new_file ? newFileMeta.icon : FileUp" class="w-7 h-7" :class="form.new_file ? newFileMeta.class : 'text-gray-400'" />
            <span class="text-sm text-brand-dark font-semibold">
              {{ form.new_file ? form.new_file.name : "Click to choose a new file" }}
            </span>
            <input type="file" class="hidden" @change="onFileChange" />
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          @click="router.back()"
          class="w-full sm:w-auto border border-[#DCDEDD] rounded-[12px] hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 px-6 py-3 text-brand-dark font-semibold"
        >
          Cancel
        </button>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full sm:w-auto btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          <Save class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">
            {{ submitting ? "Saving..." : "Save Changes" }}
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
