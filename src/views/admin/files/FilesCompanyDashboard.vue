<script setup>
import { ref, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import {
  Archive,
  Upload,
  Calendar,
  Eye,
  Pencil,
  Download,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";

const archiveStore = useFilesCompanyStore();
const { archives, statistics, loading, success, error, pagination } =
  storeToRefs(archiveStore);

const searchQuery = ref("");
const rowsPerPage = ref(10);
const isDeleteModalOpen = ref(false);
const archiveToDelete = ref(null);
const isDeleting = ref(false);

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// File-type presentation so the archive list reads at a glance instead of
// every row wearing the same generic icon.
const fileTypeMeta = (mime) => {
  if (!mime) return { icon: FileIcon, class: "from-gray-400 to-gray-500" };
  if (mime.startsWith("image/")) return { icon: FileImage, class: "from-emerald-500 to-emerald-600" };
  if (mime === "application/pdf") return { icon: FileText, class: "from-red-500 to-red-600" };
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv")
    return { icon: FileSpreadsheet, class: "from-green-600 to-green-700" };
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("archive"))
    return { icon: FileArchive, class: "from-amber-500 to-amber-600" };
  if (mime.includes("word") || mime === "application/msword")
    return { icon: FileText, class: "from-blue-500 to-blue-600" };
  return { icon: FileIcon, class: "from-primary-500 to-primary-600" };
};

onMounted(async () => {
  await archiveStore.fetchStatistics();
  await archiveStore.fetchArchives({ page: 1, perPage: rowsPerPage.value });
});

watch(
  success,
  (newValue) => {
    if (newValue) {
      setTimeout(() => archiveStore.clearMessages(), 3000);
    }
  }
);

watch(
  searchQuery,
  debounce(async (newQuery) => {
    await archiveStore.fetchArchives({
      search: newQuery,
      page: 1,
      perPage: rowsPerPage.value,
    });
  }, 400)
);

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

const confirmDelete = (archive) => {
  archiveToDelete.value = archive;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!archiveToDelete.value) return;

  isDeleting.value = true;
  try {
    await archiveStore.deleteArchive(archiveToDelete.value.id);
    isDeleteModalOpen.value = false;
    archiveToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <div class="px-4 py-4">
    <!-- ================= STATS ================= -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div
        class="main-card rounded-[14px] border border-[#0B1042] relative overflow-hidden p-5"
      >
        <div class="flex flex-col justify-center h-full relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <div
              class="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm"
            >
              <Archive class="w-3 h-3 text-white" />
              <span class="text-brand-white text-xs font-semibold">
                Secure Archive
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between mb-4">
            <div class="flex-1 min-w-0 pr-2">
              <p class="text-brand-white-90 text-sm font-medium">
                Total Archived Files
              </p>
              <Skeleton v-if="loading" dark width="90px" height="3rem" rounded="8px" class="my-4" />
              <p
                v-else
                class="text-brand-white text-3xl lg:text-3xl font-extrabold leading-none my-4"
              >
                {{ statistics.total_archives }}
              </p>
              <p class="text-brand-white-80 text-sm font-normal">
                Company document storage
              </p>
            </div>
            <div
              class="w-16 h-16 bg-white rounded-[14px] flex items-center justify-center flex-shrink-0"
            >
              <Archive class="w-8 h-8 text-brand-primary" />
            </div>
          </div>
        </div>
      </div>

      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-brand-dark text-sm font-medium">Last Upload</p>
            <p class="text-brand-dark text-xl font-extrabold leading-tight my-2 truncate">
              {{ statistics.last_uploaded ? formatDate(statistics.last_uploaded) : "—" }}
            </p>
            <p class="text-brand-light text-sm font-medium">Latest archive</p>
          </div>
          <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center flex-shrink-0">
            <Calendar class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5 flex items-center justify-between gap-4"
      >
        <div>
          <p class="text-brand-dark text-sm font-medium">New Archive</p>
          <p class="text-brand-light text-sm mt-1">Store a permanent document</p>
        </div>
        <router-link
          :to="{ name: 'admin.files-company.create' }"
          class="btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2 flex-shrink-0"
        >
          <Upload class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Upload</span>
        </router-link>
      </div>
    </div>

    <div class="mb-6 space-y-3">
      <Transition name="fade">
        <Alert
          v-if="success"
          type="success"
          :title="success"
          message=""
          :show="!!success"
          @close="archiveStore.clearMessages()"
        />
      </Transition>
      <Transition name="fade">
        <Alert
          v-if="error"
          type="danger"
          :title="error"
          message=""
          :show="!!error"
          @close="archiveStore.clearMessages()"
        />
      </Transition>
    </div>

    <!-- ================= ARCHIVE LIST ================= -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4"
      >
        <h3 class="text-brand-dark text-base font-bold">File Archives</h3>

        <div class="relative w-full sm:w-64">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <Search class="w-4 h-4 text-blue-400" />
          </div>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search archives..."
            class="relative w-full pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
          />
        </div>
      </div>

      <!-- Archive items -->
      <SkeletonList v-if="loading" :rows="4" />

      <div v-else class="space-y-4">
        <div
          v-for="archive in archives"
          :key="archive.id"
          class="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:shadow-sm transition-all"
        >
          <div
            class="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br rounded-[12px] flex items-center justify-center flex-shrink-0"
            :class="fileTypeMeta(archive.type_file).class"
          >
            <component :is="fileTypeMeta(archive.type_file).icon" class="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-brand-dark text-sm font-bold truncate">
              {{ archive.document_name }}
            </p>
            <p v-if="archive.description" class="text-sm text-brand-light truncate">
              {{ archive.description }}
            </p>
            <p class="text-brand-light text-xs mt-1">
              Uploaded {{ formatDate(archive.created_at) }}
            </p>
          </div>

          <div class="grid grid-cols-4 sm:flex items-center gap-2 w-full sm:w-auto">
            <button
              @click="archiveStore.downloadArchive(archive)"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
              title="Download File"
              aria-label="Download File"
            >
              <Download class="w-4 h-4 text-gray-600" />
            </button>

            <router-link
              :to="{ name: 'admin.files-company.detail', params: { id: archive.id } }"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
              title="View File"
              aria-label="View File"
            >
              <Eye class="w-4 h-4 text-gray-600" />
            </router-link>

            <router-link
              :to="{ name: 'admin.files-company.edit', params: { id: archive.id } }"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
              title="Edit File"
              aria-label="Edit File"
            >
              <Pencil class="w-4 h-4 text-gray-600" />
            </router-link>

            <button
              @click="confirmDelete(archive)"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:border-red-500 hover:ring-2 hover:ring-red-500/30 hover:bg-red-50 group transition-all"
              title="Delete File"
              aria-label="Delete File"
            >
              <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
            </button>
          </div>
        </div>

        <!-- Empty states -->
        <div
          v-if="!loading && archives.length === 0 && searchQuery"
          class="text-center py-12 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD]"
        >
          <Search class="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p class="text-lg font-semibold">No results found</p>
          <p class="text-sm text-gray-400">
            Try searching with a different keyword for "{{ searchQuery }}"
          </p>
        </div>

        <div
          v-else-if="!loading && archives.length === 0"
          class="text-center py-12 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD]"
        >
          <Archive class="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p class="text-lg font-semibold">No archived files found</p>
          <p class="text-sm text-gray-400">Upload your first document to get started</p>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="archives.length > 0"
        class="flex items-center justify-between mt-6 pt-4 border-t border-[#DCDEDD]"
      >
        <span class="text-sm text-brand-light">
          Page {{ pagination.current_page }} of {{ pagination.last_page }}
          <span class="hidden sm:inline">&middot; {{ pagination.total }} total files</span>
        </span>
        <div class="flex gap-2">
          <button
            @click="prevPage"
            :disabled="pagination.current_page === 1"
            class="bg-white px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft class="w-4 h-4" /> Prev
          </button>

          <button
            @click="nextPage"
            :disabled="pagination.current_page === pagination.last_page"
            class="bg-white px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <Transition name="fade">
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-[99] flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
        @click="isDeleteModalOpen = false"
      ></div>

      <div class="bg-white rounded-[14px] p-6 w-full max-w-sm relative z-10 shadow-2xl transform transition-all">
        <button
          @click="isDeleteModalOpen = false"
          class="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X class="w-5 h-5" />
        </button>

        <div class="text-center">
          <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle class="w-8 h-8 text-red-500" />
          </div>

          <h3 class="text-xl font-bold text-brand-dark mb-2">Delete File?</h3>
          <p class="text-gray-500 text-sm mb-6">
            Are you sure you want to delete
            <span class="font-bold text-brand-dark">"{{ archiveToDelete?.document_name }}"</span
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

.fade-enter-active .bg-white {
  animation: modal-in 0.3s ease-out;
}
.fade-leave-active .bg-white {
  animation: modal-in 0.2s ease-in reverse;
}

@keyframes modal-in {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
