<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Mail, Plus, Download, FileText, Pencil, Ban, Trash2, Search, SearchX, ArrowLeft } from "lucide-vue-next";
import { useLetterStore } from "@/stores/letter";
import { can } from "@/helpers/permissionHelper";
import Pagination from "@/components/common/Pagination.vue";
import { UiPageHeader, UiButton, UiInput, UiChips, UiTable, UiBadge, UiEmpty, UiConfirmDialog } from "@/components/ui";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useLetterStore();
const alertModal = useAlertModalStore();
const { letters, meta, loading } = storeToRefs(store);

const search = ref("");
const statusFilter = ref("");
const isDeleteModalOpen = ref(false);
const letterToDelete = ref(null);
const downloadingId = ref(null);

const load = (page = 1) => {
  store.fetchLetters({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    page,
  });
};

onMounted(() => load());

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const handleDownload = async (letter) => {
  downloadingId.value = letter.id;
  try {
    await store.downloadPdf(letter.id, letter.letter_number);
  } finally {
    downloadingId.value = null;
  }
};

const viewingId = ref(null);
const handleViewPdf = async (letter) => {
  viewingId.value = letter.id;
  try {
    await store.viewPdf(letter.id);
  } finally {
    viewingId.value = null;
  }
};

const handleCancel = async (letter) => {
  if (
    !(await alertModal.confirm(
      `Cancel Letter "${letter.letter_number}"? The number stays recorded and is labeled CANCELLED.`,
      { type: "warning", confirmText: "Cancel" }
    ))
  )
    return;
  await store.cancelLetter(letter.id);
};

const confirmDelete = (letter) => {
  letterToDelete.value = letter;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!letterToDelete.value) return;
  await store.deleteLetter(letterToDelete.value.id);
  isDeleteModalOpen.value = false;
  letterToDelete.value = null;
};

// Presentation only: status chips, table columns, badge tone.
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "issued", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
];
const COLUMNS = [
  { key: "letter_number", label: "Letter No." },
  { key: "subject", label: "Subject" },
  { key: "division", label: "Division" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "actions", label: "", align: "right" },
];
const statusTone = (status) => (status === "cancelled" ? "bad" : "ok");
const iconBtn =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink disabled:opacity-50 focus:outline-none focus-visible:shadow-ui-focus";

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Letters" subtitle="Register of internal and external company letters" class="ui-anim-fade-up">
      <template #eyebrow>
        <router-link
          :to="{ name: 'admin.documents.dashboard' }"
          class="ui-press inline-flex items-center gap-1 mb-1.5 text-ui-small font-medium text-ui-accent hover:underline"
          aria-label="Back to Documents"
          title="Back to Documents"
        >
          <ArrowLeft class="w-4 h-4" />Documents
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('letter-create')" :to="{ name: 'admin.letters.create' }" :icon="Plus" class="w-full sm:w-auto">Create Letter</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <!-- Toolbar -->
      <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line flex flex-col md:flex-row md:items-center gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          placeholder="Search letter number, subject..."
          class="md:w-[300px]"
          @keyup.enter="handleSearch"
        />
        <UiChips v-model="statusFilter" :options="STATUS_OPTIONS" @update:model-value="handleFilterChange" />
      </div>

      <UiTable :columns="COLUMNS" :rows="letters" :meta="meta" :loading="loading" :skeleton-rows="6">
        <template #cell-letter_number="{ row }">
          <span class="font-mono text-ui-cap text-ui-ink whitespace-nowrap">{{ row.letter_number }}</span>
        </template>
        <template #cell-subject="{ row }">
          <span class="block max-w-[360px] truncate text-ui-ink" :title="row.subject">{{ row.subject }}</span>
        </template>
        <template #cell-division="{ row }">
          <span class="text-ui-text">{{ row.division_code?.code || "—" }}</span>
        </template>
        <template #cell-date="{ row }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDate(row.date) }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="statusTone(row.status)" dot>{{ row.status === "cancelled" ? "Cancelled" : "Active" }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="inline-flex items-center gap-0.5">
            <button type="button" :class="iconBtn" :disabled="viewingId === row.id" title="View PDF" :aria-label="`View PDF ${row.letter_number}`" @click="handleViewPdf(row)">
              <FileText class="w-4 h-4" />
            </button>
            <button type="button" :class="iconBtn" :disabled="downloadingId === row.id" title="Download PDF" :aria-label="`Download PDF ${row.letter_number}`" @click="handleDownload(row)">
              <Download class="w-4 h-4" />
            </button>
            <router-link v-if="can('letter-edit')" :to="{ name: 'admin.letters.edit', params: { id: row.id } }" :class="iconBtn" title="Edit" :aria-label="`Edit ${row.letter_number}`">
              <Pencil class="w-4 h-4" />
            </router-link>
            <button
              v-if="can('letter-edit') && row.status !== 'cancelled'"
              type="button"
              :class="[iconBtn, 'hover:!bg-ui-warn-soft hover:!text-ui-warn']"
              title="Cancel"
              :aria-label="`Cancel ${row.letter_number}`"
              @click="handleCancel(row)"
            >
              <Ban class="w-4 h-4" />
            </button>
            <button
              v-if="can('letter-delete')"
              type="button"
              :class="[iconBtn, 'hover:!bg-ui-bad-soft hover:!text-ui-bad']"
              title="Delete"
              :aria-label="`Delete ${row.letter_number}`"
              @click="confirmDelete(row)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- Phones: one card per letter -->
        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="w-5 pt-0.5 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="font-mono text-ui-cap text-ui-muted truncate">{{ row.letter_number }}</p>
                <UiBadge :tone="statusTone(row.status)" dot class="shrink-0">{{ row.status === "cancelled" ? "Cancelled" : "Active" }}</UiBadge>
              </div>
              <p class="text-ui-body font-medium text-ui-ink mt-0.5 break-words">{{ row.subject }}</p>
              <p class="text-ui-cap text-ui-muted mt-0.5">
                <span v-if="row.division_code?.code">{{ row.division_code.code }} · </span><span class="tabular-nums">{{ formatDate(row.date) }}</span>
              </p>
              <div class="flex items-center gap-1 mt-2 -ml-2">
                <button type="button" :class="iconBtn" class="!w-9 !h-9" :disabled="viewingId === row.id" :aria-label="`View PDF ${row.letter_number}`" @click="handleViewPdf(row)">
                  <FileText class="w-4 h-4" />
                </button>
                <button type="button" :class="iconBtn" class="!w-9 !h-9" :disabled="downloadingId === row.id" :aria-label="`Download PDF ${row.letter_number}`" @click="handleDownload(row)">
                  <Download class="w-4 h-4" />
                </button>
                <router-link v-if="can('letter-edit')" :to="{ name: 'admin.letters.edit', params: { id: row.id } }" :class="iconBtn" class="!w-9 !h-9" :aria-label="`Edit ${row.letter_number}`">
                  <Pencil class="w-4 h-4" />
                </router-link>
                <button v-if="can('letter-edit') && row.status !== 'cancelled'" type="button" :class="iconBtn" class="!w-9 !h-9" :aria-label="`Cancel ${row.letter_number}`" @click="handleCancel(row)">
                  <Ban class="w-4 h-4" />
                </button>
                <button v-if="can('letter-delete')" type="button" :class="iconBtn" class="!w-9 !h-9" :aria-label="`Delete ${row.letter_number}`" @click="confirmDelete(row)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="search || statusFilter" :icon="SearchX" title="No letters match your filters" message="Try another number, subject or status." compact />
          <UiEmpty v-else :icon="Mail" title="No Letters yet" compact>
            <UiButton v-if="can('letter-create')" variant="secondary" size="sm" :icon="Plus" :to="{ name: 'admin.letters.create' }">Create Letter</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div class="px-4 sm:px-5 pb-4">
        <Pagination :meta="meta" :loading="loading" item-label="letters" @page-change="load" />
      </div>
    </section>

    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      type="danger"
      title="Delete Letter?"
      :message="`&quot;${letterToDelete?.letter_number}&quot; will be permanently deleted from the system. For an already-issued letter, it's better to use &quot;Cancel&quot; so the number stays recorded in the register.`"
      confirm-text="Yes, Delete"
      @confirm="handleDelete"
    />
  </div>
</template>
