<script setup>
import { defineProps } from "vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";

// Props: archive yang ingin ditampilkan
const props = defineProps({
  archive: {
    type: Object,
    required: true,
  },
});

const archiveStore = useFilesCompanyStore();

// Format tanggal
const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Download function
const downloadFile = async () => {
  if (!props.archive) return;
  await archiveStore.downloadArchive(props.archive);
};
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-[20px] p-6 max-w-2xl shadow-lg mx-auto my-10">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Archive Detail</h2>

    <div v-if="props.archive" class="space-y-4 text-gray-700">
      <p><strong>File Name:</strong> {{ props.archive.file_name || "-" }}</p>
      <p><strong>Description:</strong> {{ props.archive.description || "-" }}</p>
      <p><strong>Uploaded By:</strong> {{ props.archive.uploaded_by || "-" }}</p>
      <p><strong>Upload Date:</strong> {{ formatDate(props.archive.uploaded_at || props.archive.created_at) }}</p>

      <button
        @click="downloadFile"
        class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl transition-all duration-200"
      >
        Download Archived File
      </button>
    </div>

    <div v-else class="text-center text-gray-400 py-10">
      Archive data not available.
    </div>
  </div>
</template>
