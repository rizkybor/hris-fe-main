<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  X,
  AlertTriangle,
  FileIcon,
} from "lucide-vue-next";
import { useProjectDocumentStore } from "@/stores/projectDocument";
import { can } from "@/helpers/permissionHelper";

const props = defineProps({
  projectId: {
    type: [String, Number],
    required: true,
  },
});

const documentStore = useProjectDocumentStore();
const { documents, loading, uploading, error } = storeToRefs(documentStore);

const isUploadModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const documentToDelete = ref(null);
const isDeleting = ref(false);
const fileInputRef = ref(null);
const formError = ref("");

const form = ref({
  document_name: "",
  description: "",
  file: null,
});

const resetForm = () => {
  form.value = { document_name: "", description: "", file: null };
  formError.value = "";
  if (fileInputRef.value) fileInputRef.value.value = "";
};

const openUploadModal = () => {
  resetForm();
  isUploadModalOpen.value = true;
};

const closeUploadModal = () => {
  isUploadModalOpen.value = false;
};

const handleFileChange = (event) => {
  form.value.file = event.target.files[0] ?? null;
};

const handleUpload = async () => {
  formError.value = "";

  if (!form.value.document_name) {
    formError.value = "Document name is required.";
    return;
  }
  if (!form.value.file) {
    formError.value = "Please choose a file to upload.";
    return;
  }

  const payload = new FormData();
  payload.append("project_id", props.projectId);
  payload.append("document_name", form.value.document_name);
  payload.append("description", form.value.description || "");
  payload.append("document_path", form.value.file);

  try {
    await documentStore.uploadDocument(payload);
    closeUploadModal();
  } catch (err) {
    formError.value =
      typeof documentStore.error === "string"
        ? documentStore.error
        : "Failed to upload document.";
  }
};

const confirmDelete = (document) => {
  documentToDelete.value = document;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!documentToDelete.value) return;
  isDeleting.value = true;
  try {
    await documentStore.deleteDocument(documentToDelete.value.id);
    isDeleteModalOpen.value = false;
    documentToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

onMounted(() => {
  documentStore.fetchByProject(props.projectId);
});
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6 mt-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 bg-teal-50 rounded-[12px] flex items-center justify-center"
        >
          <FileText class="w-6 h-6 text-teal-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-xl font-bold">Project Documents</h3>
          <p class="text-brand-light text-sm font-normal">
            Optional supporting documents (proposals, client files, etc.)
          </p>
        </div>
      </div>

      <button
        v-if="can('project-edit')"
        @click="openUploadModal"
        class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
      >
        <Upload class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Upload Document</span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-8 text-sm text-gray-400">
      Loading documents...
    </div>

    <div
      v-else-if="documents.length === 0"
      class="text-center py-12 text-gray-500 bg-gray-50 rounded-[16px] border border-dashed border-[#DCDEDD]"
    >
      <FileIcon class="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p class="text-base font-semibold">No documents uploaded yet</p>
      <p class="text-sm text-gray-400">
        Documents are optional — upload proposals, client files, or other supporting files.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="document in documents"
        :key="document.id"
        class="flex items-start gap-3 p-4 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:shadow-sm transition-all"
      >
        <div
          class="w-11 h-11 bg-teal-50 rounded-[10px] flex items-center justify-center shrink-0"
        >
          <FileText class="w-5 h-5 text-teal-600" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-brand-dark text-sm font-bold truncate">
            {{ document.document_name }}
          </p>
          <p v-if="document.description" class="text-brand-light text-xs mt-0.5 line-clamp-2">
            {{ document.description }}
          </p>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span
              v-if="document.type_file"
              class="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium uppercase"
            >
              {{ document.type_file }}
            </span>
            <span v-if="document.size_file" class="text-[11px] text-gray-400">
              {{ document.size_file }}
            </span>
            <span class="text-[11px] text-gray-400">
              {{ formatDate(document.created_at) }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <a
            :href="document.document_path"
            target="_blank"
            rel="noopener"
            class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-[#0C51D9]"
            title="Download / View"
          >
            <Download class="w-4 h-4 text-gray-600" />
          </a>
          <button
            v-if="can('project-delete')"
            @click="confirmDelete(document)"
            class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group"
            title="Delete"
          >
            <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
          </button>
        </div>
      </div>
    </div>

    <!-- UPLOAD MODAL -->
    <Transition name="fade">
      <div
        v-if="isUploadModalOpen"
        class="fixed inset-0 z-[99] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
          @click="closeUploadModal"
        ></div>

        <div class="bg-white rounded-[20px] p-6 w-full max-w-md relative z-10 shadow-2xl">
          <button
            @click="closeUploadModal"
            class="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          >
            <X class="w-5 h-5" />
          </button>

          <h3 class="text-xl font-bold text-brand-dark mb-4">Upload Document</h3>

          <form @submit.prevent="handleUpload" class="space-y-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">
                Document Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.document_name"
                type="text"
                placeholder="e.g. Proposal Penawaran"
                class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
              />
            </div>

            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">
                Description
              </label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="Optional notes about this document"
                class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none resize-none"
              ></textarea>
            </div>

            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">
                File <span class="text-red-500">*</span>
              </label>
              <input
                ref="fileInputRef"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                @change="handleFileChange"
                class="w-full text-sm text-gray-700 file:border file:border-gray-300 file:rounded-lg file:px-3 file:py-1.5 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
              />
              <p class="text-xs text-gray-400 mt-1">
                PDF, Word, Excel, or image. Max 10MB.
              </p>
            </div>

            <p v-if="formError" class="text-red-500 text-sm">{{ formError }}</p>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                @click="closeUploadModal"
                class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="uploading"
                class="px-4 py-3 rounded-xl bg-[#0C51D9] text-white font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {{ uploading ? "Uploading..." : "Upload" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- DELETE MODAL -->
    <Transition name="fade">
      <div
        v-if="isDeleteModalOpen"
        class="fixed inset-0 z-[99] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
          @click="isDeleteModalOpen = false"
        ></div>

        <div class="bg-white rounded-[24px] p-6 w-full max-w-sm relative z-10 shadow-2xl">
          <button
            @click="isDeleteModalOpen = false"
            class="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          >
            <X class="w-5 h-5" />
          </button>

          <div class="text-center">
            <div
              class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <AlertTriangle class="w-8 h-8 text-red-500" />
            </div>

            <h3 class="text-xl font-bold text-brand-dark mb-2">Delete Document?</h3>
            <p class="text-gray-500 text-sm mb-6">
              Are you sure you want to delete
              <span class="font-bold text-brand-dark">
                "{{ documentToDelete?.document_name }}"</span
              >? This action cannot be undone.
            </p>

            <div class="grid grid-cols-2 gap-3">
              <button
                @click="isDeleteModalOpen = false"
                class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                @click="handleDelete"
                :disabled="isDeleting"
                class="px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 v-if="!isDeleting" class="w-4 h-4" />
                {{ isDeleting ? "Deleting..." : "Yes, Delete" }}
              </button>
            </div>
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
