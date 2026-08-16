<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Archive,
  ArrowLeft,
  Pencil,
  Download,
  Clock,
  FileText,
  HardDrive,
  FileType,
} from "lucide-vue-next";
import { useFilesCompanyStore } from "@/stores/filesCompany";
import Spinner from "@/components/common/skeleton/Spinner.vue";

const archiveStore = useFilesCompanyStore();
const route = useRoute();
const router = useRouter();
const archiveId = route.params.id;

const loading = computed(() => archiveStore.loading);
const error = ref("");

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatSize = (bytes) => {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

onMounted(async () => {
  try {
    await archiveStore.fetchArchiveById(archiveId);
  } catch (err) {
    console.error(err);
    error.value = "Failed to load archive detail.";
  }
});

const downloadFile = () => {
  archiveStore.downloadArchive(archiveStore.currentArchive);
};

const isImage = (type) => type?.startsWith("image/");
</script>

<template>
  <div class="max-w-5xl mx-auto">
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

        <div class="flex-1">
          <h1 class="text-brand-dark text-xl font-bold">Document File Detail</h1>
          <p class="text-brand-light text-sm">Informasi file (read-only)</p>
        </div>

        <router-link
          :to="{ name: 'admin.files-company.edit', params: { id: archiveId } }"
          class="border border-[#DCDEDD] rounded-[12px] hover:border-blue-400 hover:bg-blue-50/30 transition-all px-4 py-2 flex items-center gap-2"
        >
          <Pencil class="w-4 h-4 text-gray-600" />
          <span class="text-brand-dark font-semibold text-sm">Edit</span>
        </router-link>
      </div>
    </div>

    <!-- Loading -->
    <Spinner v-if="loading" label="Loading archive detail..." />

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20 text-red-600">
      {{ error }}
    </div>

    <!-- Content -->
    <div
      v-else-if="archiveStore.currentArchive"
      class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 space-y-6"
    >
      <!-- File Name -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">File Name</label>
        <div class="flex items-center gap-3">
          <FileText class="w-5 h-5 text-gray-400" />
          <p class="text-brand-dark font-semibold">
            {{ archiveStore.currentArchive.document_name || "—" }}
          </p>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">Description</label>
        <div class="flex items-start gap-3 px-4 py-3 border border-[#DCDEDD] rounded-[12px] bg-gray-50">
          <FileText class="w-5 h-5 text-gray-400 mt-0.5" />
          <p class="text-brand-dark whitespace-pre-line">
            {{ archiveStore.currentArchive.description || "—" }}
          </p>
        </div>
      </div>

      <!-- Meta -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div class="flex items-center gap-3">
          <FileType class="w-5 h-5 text-gray-400" />
          <div>
            <p class="text-xs text-gray-500">File Type</p>
            <p class="text-sm font-semibold">{{ archiveStore.currentArchive.type_file || "—" }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <HardDrive class="w-5 h-5 text-gray-400" />
          <div>
            <p class="text-xs text-gray-500">File Size</p>
            <p class="text-sm font-semibold">{{ formatSize(archiveStore.currentArchive.size_file) }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <Clock class="w-5 h-5 text-gray-400" />
          <div>
            <p class="text-xs text-gray-500">Upload Date</p>
            <p class="text-sm font-semibold">{{ formatDate(archiveStore.currentArchive.created_at) }}</p>
          </div>
        </div>
      </div>

      <!-- File Preview -->
      <div v-if="isImage(archiveStore.currentArchive.type_file)">
        <label class="block text-brand-dark text-base font-semibold mb-1">Preview</label>
        <div class="w-full max-h-[75vh] overflow-auto border border-[#DCDEDD] rounded-[12px] p-2 bg-gray-50 flex justify-center">
          <img
            :src="archiveStore.currentArchive.document_path"
            alt="File Preview"
            class="max-w-full max-h-[70vh] object-contain rounded-[12px]"
          />
        </div>
      </div>

      <div v-else-if="archiveStore.currentArchive.type_file === 'application/pdf'">
        <label class="block text-brand-dark text-base font-semibold mb-1">Preview PDF</label>
        <div class="w-full h-[80vh] min-h-[600px] border border-[#DCDEDD] rounded-[12px] overflow-hidden">
          <iframe :src="archiveStore.currentArchive.document_path" class="w-full h-full"></iframe>
        </div>
      </div>

      <!-- Download -->
      <div class="pt-4 border-t border-[#DCDEDD]">
        <button
          @click="downloadFile"
          class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2 transition-all"
        >
          <Download class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Download File</span>
        </button>
      </div>
    </div>

    <!-- Fallback -->
    <div v-else class="text-center py-20 text-gray-400">Archive data not available.</div>
  </div>
</template>
