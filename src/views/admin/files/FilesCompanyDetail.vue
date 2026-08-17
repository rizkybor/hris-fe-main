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
  Eye,
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
          class="btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2"
        >
          <Pencil class="w-4 h-4 text-white" />
          <span class="text-brand-white font-semibold text-sm">Edit</span>
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
    <div v-else-if="archiveStore.currentArchive" class="space-y-6">
      <!-- Hero -->
      <div class="main-card rounded-[14px] p-6 relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl"></div>
        <div class="relative z-10 flex items-start gap-4">
          <div class="w-14 h-14 bg-white/10 border border-white/10 rounded-[14px] flex items-center justify-center shrink-0">
            <FileType class="w-7 h-7 text-blue-300" />
          </div>
          <div class="min-w-0">
            <h2 class="text-white text-xl font-extrabold truncate">
              {{ archiveStore.currentArchive.document_name || "—" }}
            </h2>
            <p class="text-brand-white-70 text-sm mt-1 whitespace-pre-line">
              {{ archiveStore.currentArchive.description || "Tidak ada deskripsi" }}
            </p>
          </div>
        </div>

        <div class="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-white/10 border border-white/10 rounded-[10px] flex items-center justify-center shrink-0">
              <FileType class="w-4 h-4 text-blue-300" />
            </div>
            <div class="min-w-0">
              <p class="text-brand-white-70 text-xs">File Type</p>
              <p class="text-white text-sm font-semibold truncate">{{ archiveStore.currentArchive.type_file || "—" }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-white/10 border border-white/10 rounded-[10px] flex items-center justify-center shrink-0">
              <HardDrive class="w-4 h-4 text-blue-300" />
            </div>
            <div class="min-w-0">
              <p class="text-brand-white-70 text-xs">File Size</p>
              <p class="text-white text-sm font-semibold truncate">{{ formatSize(archiveStore.currentArchive.size_file) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-white/10 border border-white/10 rounded-[10px] flex items-center justify-center shrink-0">
              <Clock class="w-4 h-4 text-blue-300" />
            </div>
            <div class="min-w-0">
              <p class="text-brand-white-70 text-xs">Upload Date</p>
              <p class="text-white text-sm font-semibold truncate">{{ formatDate(archiveStore.currentArchive.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- File Preview -->
      <div v-if="isImage(archiveStore.currentArchive.type_file) || archiveStore.currentArchive.type_file === 'application/pdf'" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-indigo-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Eye class="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Preview</h4>
        </div>

        <div v-if="isImage(archiveStore.currentArchive.type_file)" class="w-full max-h-[75vh] overflow-auto border border-[#DCDEDD] rounded-[12px] p-2 bg-gray-50 flex justify-center">
          <img
            :src="archiveStore.currentArchive.document_path"
            alt="File Preview"
            class="max-w-full max-h-[70vh] object-contain rounded-[12px]"
          />
        </div>

        <div v-else class="w-full h-[80vh] min-h-[600px] border border-[#DCDEDD] rounded-[12px] overflow-hidden">
          <iframe :src="archiveStore.currentArchive.document_path" class="w-full h-full"></iframe>
        </div>
      </div>

      <!-- Download -->
      <button
        @click="downloadFile"
        class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2 transition-all"
      >
        <Download class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Download File</span>
      </button>
    </div>

    <!-- Fallback -->
    <div v-else class="text-center py-20 text-gray-400">Archive data not available.</div>
  </div>
</template>
