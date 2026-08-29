<script setup>
import { onMounted, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { FileText, Image as ImageIcon, Upload, Download, Trash2, AlertTriangle, X } from "lucide-vue-next";
import { useEmployeeFileStore } from "@/stores/employeeFile";
import { can } from "@/helpers/permissionHelper";

const props = defineProps({
  employeeId: {
    type: [String, Number],
    required: true,
  },
});

const fileStore = useEmployeeFileStore();
const { files, loading, uploading } = storeToRefs(fileStore);

const fileInputRef = ref(null);
const uploadError = ref("");
const isDeleteModalOpen = ref(false);
const fileToDelete = ref(null);
const isDeleting = ref(false);

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const openFilePicker = () => fileInputRef.value?.click();

// Files staged after picking -- each needs a required display name before upload.
const isNameModalOpen = ref(false);
const pendingFiles = ref([]);
const pendingNames = ref([]);
const nameError = ref("");

const stripExtension = (filename) => filename.replace(/\.[^/.]+$/, "");

const handleFileChange = (event) => {
  const selected = Array.from(event.target.files || []);
  uploadError.value = "";

  const invalid = selected.find(
    (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE
  );
  if (invalid) {
    uploadError.value = `"${invalid.name}" is not allowed. Only PDF, PNG, or JPEG files up to 2MB are supported.`;
    if (fileInputRef.value) fileInputRef.value.value = "";
    return;
  }

  if (selected.length === 0) return;

  pendingFiles.value = selected;
  pendingNames.value = selected.map((file) => stripExtension(file.name));
  nameError.value = "";
  isNameModalOpen.value = true;
  if (fileInputRef.value) fileInputRef.value.value = "";
};

const cancelPendingUpload = () => {
  isNameModalOpen.value = false;
  pendingFiles.value = [];
  pendingNames.value = [];
};

const confirmUpload = async () => {
  if (pendingNames.value.some((name) => !name || !name.trim())) {
    nameError.value = "Please give every file a name.";
    return;
  }

  uploadError.value = "";
  try {
    await fileStore.uploadFiles(props.employeeId, pendingFiles.value, pendingNames.value);
    isNameModalOpen.value = false;
    pendingFiles.value = [];
    pendingNames.value = [];
  } catch (err) {
    uploadError.value =
      typeof fileStore.error === "string" ? fileStore.error : "Failed to upload file(s).";
  }
};

const confirmDelete = (file) => {
  fileToDelete.value = file;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!fileToDelete.value) return;
  isDeleting.value = true;
  try {
    await fileStore.deleteFile(fileToDelete.value.id);
    isDeleteModalOpen.value = false;
    fileToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};

const isImage = (mimeType) => mimeType?.startsWith("image/");

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

onMounted(() => {
  fileStore.fetchByEmployee(props.employeeId);
});
</script>

<template>
  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-5">
      <div class="flex items-center gap-2.5">
        <div class="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-50 rounded-[12px] flex items-center justify-center shrink-0">
          <FileText class="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-sm sm:text-base font-bold">Documents</h3>
          <p class="text-brand-light text-sm font-normal">
            Optional -- PDF, PNG, or JPEG, up to 2MB each
          </p>
        </div>
      </div>

      <button
        v-if="can('employee-edit')"
        type="button"
        @click="openFilePicker"
        :disabled="uploading"
        class="btn-primary w-full sm:w-auto rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <Upload class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">
          {{ uploading ? "Uploading..." : "Upload File" }}
        </span>
      </button>
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg"
        class="hidden"
        @change="handleFileChange"
      />
    </div>

    <p v-if="uploadError" class="text-red-500 text-sm mb-3.5">{{ uploadError }}</p>

    <div v-if="loading" class="text-center py-6 text-sm text-gray-400">Loading files...</div>

    <div
      v-else-if="files.length === 0"
      class="text-center py-12 text-gray-500 bg-slate-100 rounded-[12px] border border-dashed border-[#DCDEDD]"
    >
      <FileText class="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
      <p class="text-sm font-semibold">No files uploaded yet</p>
      <p class="text-sm text-gray-400">
        Optional -- upload ID scans, certificates, or other supporting documents.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      <div
        v-for="file in files"
        :key="file.id"
        class="flex items-start gap-2.5 p-3.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:shadow-sm transition-all"
      >
        <div class="w-11 h-11 bg-indigo-50 rounded-[10px] flex items-center justify-center shrink-0">
          <ImageIcon v-if="isImage(file.mime_type)" class="w-5 h-5 text-indigo-600" />
          <FileText v-else class="w-5 h-5 text-indigo-600" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-brand-dark text-sm font-bold truncate" :title="file.display_name || file.original_name">
            {{ file.display_name || file.original_name }}
          </p>
          <p class="text-[11px] text-gray-400 truncate" :title="file.original_name">{{ file.original_name }}</p>
          <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span v-if="file.size_file" class="text-[11px] text-gray-400">{{ file.size_file }}</span>
            <span class="text-[11px] text-gray-400">{{ formatDate(file.created_at) }}</span>
            <span v-if="file.uploader?.name" class="text-[11px] text-gray-400">by {{ file.uploader.name }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <a
            :href="file.url"
            target="_blank"
            rel="noopener"
            class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-1.5 hover:ring-2 hover:ring-[#0C51D9]"
            title="View"
          >
            <Download class="w-4 h-4 text-gray-600" />
          </a>
          <button
            v-if="can('employee-delete')"
            type="button"
            @click="confirmDelete(file)"
            class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-1.5 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group"
            title="Delete"
          >
            <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
          </button>
        </div>
      </div>
    </div>

    <!-- DELETE MODAL -->
    <Transition name="fade">
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-3.5">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="isDeleteModalOpen = false"></div>

        <div class="bg-white rounded-[24px] p-5 w-full max-w-sm relative z-10 shadow-2xl text-center">
          <div class="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3.5">
            <AlertTriangle class="w-8 h-8 text-red-500" />
          </div>
          <h3 class="text-sm sm:text-base font-bold text-brand-dark mb-1.5">Delete File?</h3>
          <p class="text-gray-500 text-sm mb-5">
            Are you sure you want to delete
            <span class="font-bold text-brand-dark">"{{ fileToDelete?.display_name || fileToDelete?.original_name }}"</span>? This action cannot be undone.
          </p>
          <div class="grid grid-cols-2 gap-2.5">
            <button
              @click="isDeleteModalOpen = false"
              class="px-3.5 py-2.5 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              @click="handleDelete"
              :disabled="isDeleting"
              class="px-3.5 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-50"
            >
              {{ isDeleting ? "Deleting..." : "Yes, Delete" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- NAME FILES MODAL -->
    <Transition name="fade">
      <div v-if="isNameModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-3.5">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="cancelPendingUpload"></div>

        <div class="bg-white rounded-[14px] border border-[#DCDEDD] p-5 w-full max-w-lg relative z-10 shadow-2xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-3.5">
            <h3 class="text-sm font-bold text-brand-dark">Name your file(s)</h3>
            <button @click="cancelPendingUpload" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
              <X class="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <p class="text-sm text-brand-light mb-3.5">
            Give each file a name so it's easy to recognize in the list.
          </p>

          <div class="space-y-3.5">
            <div v-for="(file, index) in pendingFiles" :key="index" class="border border-[#DCDEDD] rounded-[12px] p-2.5">
              <p class="text-xs text-gray-400 mb-1.5 truncate" :title="file.name">{{ file.name }}</p>
              <input
                v-model="pendingNames[index]"
                type="text"
                required
                placeholder="e.g. KTP, Ijazah, Sertifikat..."
                class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:border-2 outline-none"
              />
            </div>
          </div>

          <p v-if="nameError" class="text-red-500 text-sm mt-3.5">{{ nameError }}</p>

          <div class="flex items-center gap-2.5 pt-4">
            <button
              type="button"
              @click="confirmUpload"
              :disabled="uploading"
              class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-5 py-2 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span class="text-brand-white text-sm font-semibold">{{ uploading ? "Uploading..." : "Upload" }}</span>
            </button>
            <button type="button" @click="cancelPendingUpload" class="px-5 py-2 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
