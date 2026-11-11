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
import { UiPageHeader, UiButton, UiBadge, UiEmpty } from "@/components/ui";

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

// Extension badge (redesign: neutral icon + extension).
const fileExt = (name, mime) => {
  const base = String(name || "").split("?")[0].split("/").pop();
  if (base.includes(".")) return base.split(".").pop().slice(0, 5).toUpperCase();
  if (!mime) return "FILE";
  if (mime.includes("spreadsheetml")) return "XLSX";
  if (mime.includes("wordprocessingml")) return "DOCX";
  return mime.split("/").pop().split(/[.+-]/).pop().slice(0, 5).toUpperCase();
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Document File Detail" subtitle="Informasi file (read-only)">
      <template #eyebrow>
        <button
          type="button"
          @click="router.back()"
          class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
          aria-label="Back"
        >
          <ArrowLeft class="w-4 h-4" />
          Back
        </button>
      </template>
      <template #actions>
        <UiButton :to="{ name: 'admin.files-company.edit', params: { id: archiveId } }" :icon="Pencil" class="w-full sm:w-auto">
          Edit
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <Spinner v-if="loading" label="Loading archive detail..." class="!py-20" />

    <!-- Error -->
    <div v-else-if="error" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="Archive" :title="error" />
    </div>

    <!-- Content -->
    <div v-else-if="archiveStore.currentArchive" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start ui-stagger">
      <!-- Summary -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 lg:order-2">
        <div class="p-5 sm:p-6 flex items-start gap-3">
          <div class="w-12 h-12 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0">
            <FileText class="w-6 h-6" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-ui-h2 text-ui-ink break-words">
              {{ archiveStore.currentArchive.document_name || "—" }}
            </h2>
            <UiBadge tone="outline" class="font-mono mt-1">
              {{ fileExt(archiveStore.currentArchive.document_path, archiveStore.currentArchive.type_file) }}
            </UiBadge>
          </div>
        </div>
        <p class="px-5 sm:px-6 pb-5 text-ui-body text-ui-text whitespace-pre-line">
          {{ archiveStore.currentArchive.description || "No description" }}
        </p>

        <dl class="border-t border-ui-line px-5 sm:px-6 py-2 divide-y divide-ui-line">
          <div class="flex items-center justify-between gap-4 py-2.5">
            <dt class="flex items-center gap-2 text-ui-small text-ui-muted"><FileType class="w-4 h-4" />File Type</dt>
            <dd class="text-ui-small text-ui-ink truncate text-right">{{ archiveStore.currentArchive.type_file || "—" }}</dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-2.5">
            <dt class="flex items-center gap-2 text-ui-small text-ui-muted"><HardDrive class="w-4 h-4" />File Size</dt>
            <dd class="text-ui-small text-ui-ink tabular-nums text-right">{{ formatSize(archiveStore.currentArchive.size_file) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-4 py-2.5">
            <dt class="flex items-center gap-2 text-ui-small text-ui-muted"><Clock class="w-4 h-4" />Upload Date</dt>
            <dd class="text-ui-small text-ui-ink text-right">{{ formatDate(archiveStore.currentArchive.created_at) }}</dd>
          </div>
        </dl>

        <div class="px-5 sm:px-6 pb-5 pt-2">
          <UiButton :icon="Download" block @click="downloadFile">Download File</UiButton>
        </div>
      </section>

      <!-- File Preview -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 lg:col-span-2 lg:order-1">
        <div class="flex items-center gap-2 px-5 sm:px-6 py-4 border-b border-ui-line">
          <Eye class="w-4 h-4 text-ui-muted" />
          <h3 class="text-ui-h3 text-ui-ink">Preview</h3>
        </div>

        <div
          v-if="isImage(archiveStore.currentArchive.type_file)"
          class="m-4 max-h-[75vh] overflow-auto border border-ui-line rounded-ui-control p-2 bg-ui-subtle flex justify-center"
        >
          <img
            :src="archiveStore.currentArchive.document_path"
            alt="File Preview"
            class="max-w-full max-h-[70vh] object-contain rounded-ui-control"
          />
        </div>

        <div
          v-else-if="archiveStore.currentArchive.type_file === 'application/pdf'"
          class="m-4 h-[80vh] min-h-[600px] border border-ui-line rounded-ui-control overflow-hidden"
        >
          <iframe :src="archiveStore.currentArchive.document_path" class="w-full h-full"></iframe>
        </div>

        <UiEmpty
          v-else
          :icon="FileText"
          title="No preview available"
          :message="archiveStore.currentArchive.type_file || ''"
        >
          <UiButton variant="secondary" :icon="Download" @click="downloadFile">Download File</UiButton>
        </UiEmpty>
      </section>
    </div>

    <!-- Fallback -->
    <div v-else class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="Archive" title="Archive data not available." />
    </div>
  </div>
</template>
