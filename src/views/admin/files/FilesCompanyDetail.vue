<script setup>
import { ref, computed, onMounted } from "vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";
import { useRoute } from "vue-router";

const archiveStore = useFilesCompanyStore();
const route = useRoute();
const archiveId = route.params.id;

// Loading & error state
const loading = computed(() => archiveStore.loading);
const error = ref(null);

// Format tanggal
const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Fetch detail archive
onMounted(async () => {
  try {
    await archiveStore.fetchArchiveById(archiveId);
  } catch (err) {
    console.error(err);
    error.value = "Failed to load archive detail.";
  }
});

// Download function
const downloadFile = () => {
  const archive = archiveStore.currentArchive;
  if (!archive || !archive.document_path) return;
  window.open(archive.document_path, "_blank");
};

// Check if file is image
const isImage = (type) => type?.startsWith("image/");
</script>

<template>
  <div
    class="w-full min-h-screen flex items-center justify-center bg-gray-100 p-6"
  >
    <div
      class="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-4xl shadow-lg space-y-6"
    >
      <!-- Button Back -->
      <div class="flex items-center mb-4">
        <button
          @click="router.back()"
          type="button"
          class="flex items-center bg-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white font-medium px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm transition-colors duration-200 text-sm focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>

      <h2 class="text-xl font-bold text-gray-800 border-b pb-3 mb-6">
        Archive Detail
      </h2>

      <!-- Loading -->
      <div v-if="loading" class="text-center text-gray-500 py-20">
        Loading archive detail...
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center text-red-600 py-20">
        {{ error }}
      </div>

      <!-- Detail Archive -->
      <div v-else-if="archiveStore.currentArchive" class="space-y-6">
        <!-- Metadata -->
        <div class="grid grid-cols-2 gap-4 text-gray-700">
          <div class="flex flex-col">
            <span class="font-semibold text-gray-800">File Name:</span>
            <span class="mt-1">{{
              archiveStore.currentArchive.document_name || "-"
            }}</span>
          </div>

          <div class="flex flex-col">
            <span class="font-semibold text-gray-800">Description:</span>
            <span class="mt-1">{{
              archiveStore.currentArchive.description || "-"
            }}</span>
          </div>

          <div class="flex flex-col">
            <span class="font-semibold text-gray-800">Uploaded By:</span>
            <span class="mt-1">{{
              archiveStore.currentArchive.uploaded_by || "-"
            }}</span>
          </div>

          <div class="flex flex-col">
            <span class="font-semibold text-gray-800">Upload Date:</span>
            <span class="mt-1">{{
              formatDate(archiveStore.currentArchive.created_at)
            }}</span>
          </div>

          <div class="flex flex-col">
            <span class="font-semibold text-gray-800">File Type:</span>
            <span class="mt-1">{{
              archiveStore.currentArchive.type_file || "-"
            }}</span>
          </div>

          <div class="flex flex-col">
            <span class="font-semibold text-gray-800">File Size:</span>
            <span class="mt-1"
              >{{
                (archiveStore.currentArchive.size_file / 1024).toFixed(2)
              }}
              KB</span
            >
          </div>
        </div>

        <!-- File Preview -->
        <div v-if="isImage(archiveStore.currentArchive.type_file)" class="mt-4">
          <span class="font-semibold text-gray-800">Preview:</span>
          <div
            class="mt-2 w-full max-h-[400px] overflow-auto border border-gray-200 rounded-lg shadow-sm p-1"
          >
            <img
              :src="archiveStore.currentArchive.document_path"
              alt="File Preview"
              class="w-full object-contain"
            />
          </div>
        </div>

        <div
          v-else-if="
            archiveStore.currentArchive.type_file === 'application/pdf'
          "
          class="mt-4"
        >
          <span class="font-semibold text-gray-800">Preview PDF:</span>
          <div
            class="mt-2 w-full max-h-[400px] overflow-auto border border-gray-200 rounded-lg"
          >
            <iframe
              :src="archiveStore.currentArchive.document_path"
              class="w-full h-[400px]"
            ></iframe>
          </div>
        </div>

        <!-- Download Button -->
        <button
          @click="downloadFile"
          class="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 shadow-md"
        >
          Download File
        </button>
      </div>

      <!-- Fallback -->
      <div v-else class="text-center text-gray-400 py-20">
        Archive data not available.
      </div>
    </div>
  </div>
</template>
