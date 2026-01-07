<script setup>
import { ref, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  Archive,
  Upload,
  Calendar,
  Eye,
  Pencil,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";

const archiveStore = useFilesCompanyStore();
const { archives, statistics, loading, success, error, pagination } =
  storeToRefs(archiveStore);

// Input search
const searchQuery = ref("");

// Rows per page (bisa diubah dari parent)
const rowsPerPage = ref(10);

// Format tanggal
const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Fetch stats & first page on mount
onMounted(async () => {
  await archiveStore.fetchStatistics();
  await archiveStore.fetchArchives({ page: 1, perPage: rowsPerPage.value });
});

// Watch searchQuery dan reload archives dengan debounce
watch(
  searchQuery,
  async (newQuery) => {
    await archiveStore.fetchArchives({
      search: newQuery,
      page: 1,
      perPage: rowsPerPage.value,
    });
  },
  { debounce: 500 }
);

// Pagination
const goToPage = async (page) => {
  await archiveStore.fetchArchives({
    search: searchQuery.value,
    page,
    perPage: rowsPerPage.value,
  });
};

const prevPage = () => {
  if (pagination.value.current_page > 1) {
    goToPage(pagination.value.current_page - 1);
  }
};

const nextPage = () => {
  if (pagination.value.current_page < pagination.value.last_page) {
    goToPage(pagination.value.current_page + 1);
  }
};

// Delete Archive
const deleteArchive = async (archive) => {
  if (!confirm(`Are you sure you want to delete "${archive.file_name}"?`)) return;
  try {
    await archiveStore.deleteArchive(archive.id);
    alert("File deleted successfully!");
  } catch (err) {
    console.error(err);
    alert("Failed to delete file.");
  }
};
</script>

<template>
  <div>
    <!-- ================= STATS ================= -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div class="lg:row-span-2 rounded-[20px] border border-[#0B1042] relative overflow-hidden main-card p-5">
        <div class="flex flex-col justify-center h-full relative z-10">
          <p class="text-lg text-gray-300">Total Archived Files</p>
          <p class="text-4xl text-brand-white font-extrabold my-4">
            {{ loading ? "..." : statistics.total_archives }}
          </p>
          <div class="flex items-center gap-2 text-sm text-green-600">
            <Archive class="w-4 h-4" /> Secure Archive
          </div>
        </div>
      </div>

      <div class="bg-white border rounded-[20px] p-5">
        <p class="text-sm text-gray-500">Last Upload</p>
        <p class="text-lg font-bold my-5">
          {{ statistics.last_uploaded ? formatDate(statistics.last_uploaded) : "-" }}
        </p>
        <div class="flex items-center gap-2 text-sm text-blue-600">
          <Calendar class="w-4 h-4" /> Latest Archive
        </div>
      </div>

      <div class="bg-white border rounded-[20px] p-5 flex justify-between items-center">
        <div class="my-5">
          <p class="text-sm text-gray-500">New Archive</p>
          <p class="text-xs text-gray-400">Store permanent documents</p>
        </div>
        <router-link
          :to="{ name: 'admin.files-company.create' }"
          class="px-4 py-2 bg-[#0C51D9] text-white rounded-xl text-sm font-semibold"
        >
          <Upload class="inline w-4 h-4 mr-1" /> Upload
        </router-link>
      </div>
    </div>

    <!-- ================= ALERT ================= -->
    <Alert type="success" :title="success" :show="success" />
    <Alert type="error" :title="error" :show="error" />

    <!-- ================= ARCHIVE LIST ================= -->
    <div class="bg-white border rounded-[20px] p-5">
      <!-- Header -->
      <div class="mb-4 flex justify-between items-center">
        <h3 class="text-lg font-bold">File Archives</h3>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search archives..."
          class="border rounded-xl p-2 w-1/3"
        />
      </div>

      <!-- Archive items -->
      <div class="space-y-4">
        <div
          v-for="archive in archives"
          :key="archive.id"
          class="flex items-center gap-4 p-4 border rounded-[16px] hover:border-[#0C51D9]"
        >
          <div class="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center">
            <Archive class="w-6 h-6 text-blue-600" />
          </div>

          <div class="flex-1">
            <p class="text-lg font-bold">{{ archive.file_name }}</p>
            <p class="text-sm text-gray-600">{{ archive.description }}</p>
            <p class="text-xs text-gray-400 mt-1">
              Uploaded {{ formatDate(archive.created_at) }} by
              {{ archive.uploaded_by || "System" }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="archiveStore.downloadArchive(archive)"
              class="border p-2 rounded-xl"
            >
              <Download class="w-4 h-4" />
            </button>

            <router-link
              :to="{ name: 'admin.files-company.detail', params: { id: archive.id } }"
              class="border p-2 rounded-xl"
            >
              <Eye class="w-4 h-4" />
            </router-link>

            <router-link
              :to="{ name: 'admin.files-company.edit', params: { id: archive.id } }"
              class="border p-2 rounded-xl"
            >
              <Pencil class="w-4 h-4" />
            </router-link>

            <button
              @click="deleteArchive(archive)"
              class="border p-2 rounded-xl hover:bg-red-50"
            >
              <Trash2 class="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="!loading && archives.length === 0"
          class="text-center py-10 text-gray-400"
        >
          No archived files available
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex justify-between items-center mt-6">
        <span class="text-sm text-gray-600">
          Page {{ pagination.current_page }} of {{ pagination.last_page }}
        </span>
        <div class="flex gap-2">
          <button
            @click="prevPage"
            :disabled="pagination.current_page === 1"
            class="px-3 py-1 border rounded-lg disabled:opacity-50"
          >
            <ChevronLeft class="w-4 h-4 inline" /> Prev
          </button>

          <button
            @click="nextPage"
            :disabled="pagination.current_page === pagination.last_page"
            class="px-3 py-1 border rounded-lg disabled:opacity-50"
          >
            Next <ChevronRight class="w-4 h-4 inline" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
