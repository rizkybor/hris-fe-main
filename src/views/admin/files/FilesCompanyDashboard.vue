<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import {
  Archive,
  Upload,
  Calendar,
  User,
  Eye,
  Pencil,
  Download,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";

const archiveStore = useFilesCompanyStore();
const { archives, statistics, loading, success } = storeToRefs(archiveStore);

onMounted(async () => {
  await archiveStore.fetchStatistics();
  await archiveStore.fetchArchives();
});

const formatDate = (date) =>
  new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
</script>

<template>
  <div>
    <!-- ================= STATS ================= -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div class="bg-white border rounded-[20px] p-5">
        <p class="text-sm text-gray-500">Total Archived Files</p>
        <p class="text-4xl font-extrabold my-3">
          {{ loading ? "..." : statistics.total_archives }}
        </p>
        <div class="flex items-center gap-2 text-sm text-green-600">
          <Archive class="w-4 h-4" /> Secure Archive
        </div>
      </div>

      <div class="bg-white border rounded-[20px] p-5">
        <p class="text-sm text-gray-500">Last Upload</p>
        <p class="text-lg font-bold my-3">
          {{ statistics.last_uploaded }}
        </p>
        <div class="flex items-center gap-2 text-sm text-blue-600">
          <Calendar class="w-4 h-4" /> Latest Archive
        </div>
      </div>

      <div class="bg-white border rounded-[20px] p-5 flex justify-between items-center">
        <div>
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

    <Alert type="success" :title="success" :show="success" />

    <!-- ================= ARCHIVE LIST ================= -->
    <div class="bg-white border rounded-[20px] p-5">
      <h3 class="text-lg font-bold mb-4">File Archives</h3>

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
              Uploaded {{ formatDate(archive.uploaded_at) }}
              by {{ archive.uploaded_by }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <a
              :href="archive.file_url"
              target="_blank"
              class="border p-2 rounded-xl"
            >
              <Download class="w-4 h-4" />
            </a>

            <router-link
              :to="{
                name: 'admin.files-company.detail',
                params: { id: archive.id },
              }"
              class="border p-2 rounded-xl"
            >
              <Eye class="w-4 h-4" />
            </router-link>

            <router-link
              :to="{
                name: 'admin.files-company.edit',
                params: { id: archive.id },
              }"
              class="border p-2 rounded-xl"
            >
              <Pencil class="w-4 h-4" />
            </router-link>
          </div>
        </div>

        <div
          v-if="!loading && archives.length === 0"
          class="text-center py-10 text-gray-400"
        >
          No archived files available
        </div>
      </div>
    </div>
  </div>
</template>
