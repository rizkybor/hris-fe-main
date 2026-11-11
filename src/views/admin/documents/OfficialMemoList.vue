<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { FileSignature, Plus, Search, SearchX, Trash2, Eye, FileText, Pencil, ArrowLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useDocumentLetterStore } from "@/stores/documentLetter";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import Pagination from "@/components/common/Pagination.vue";
import { UiPageHeader, UiButton, UiInput, UiChips, UiTable, UiBadge, UiEmpty } from "@/components/ui";

const router = useRouter();
const store = useDocumentLetterStore();
const alertModal = useAlertModalStore();
const { documentLetters, meta, loading } = storeToRefs(store);

const search = ref("");
const statusFilter = ref("");

const load = (page = 1) => {
  store.fetchDocumentLetters({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    page,
  });
};

onMounted(() => load());

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const goToDetail = (id) => router.push({ name: "admin.official-memos.detail", params: { id } });

const viewingId = ref(null);
const handleViewPdf = async (memo) => {
  viewingId.value = memo.id;
  try {
    await store.viewPdf(memo.id);
  } finally {
    viewingId.value = null;
  }
};

const handleDelete = async (memo) => {
  if (
    !(await alertModal.confirm(`Delete Official Memo "${memo.document_number}"? This action cannot be undone.`, {
      type: "danger",
      confirmText: "Delete",
    }))
  )
    return;
  await store.deleteDocumentLetter(memo.id);
};

const STATUS_LABEL = { draft: "Draft", pending: "Pending", approved: "Approved", rejected: "Rejected" };
// Presentation only: badge tones, status chips, table columns.
const STATUS_TONE = { draft: "neutral", pending: "warn", approved: "ok", rejected: "bad" };
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const COLUMNS = [
  { key: "document_number", label: "Number" },
  { key: "subject", label: "Subject" },
  { key: "document_date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "actions", label: "", align: "right" },
];
const iconBtn =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink disabled:opacity-50 focus:outline-none focus-visible:shadow-ui-focus";

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Official Memo" subtitle="Internal memos with a Finance Manager approval workflow" class="ui-anim-fade-up">
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
        <UiButton v-if="can('document-letter-create')" :to="{ name: 'admin.official-memos.create' }" :icon="Plus" class="w-full sm:w-auto">Create Official Memo</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <!-- Toolbar -->
      <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line flex flex-col md:flex-row md:items-center gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          placeholder="Search number, subject..."
          class="md:w-[300px]"
          @keyup.enter="handleSearch"
        />
        <UiChips v-model="statusFilter" :options="STATUS_OPTIONS" @update:model-value="handleFilterChange" />
      </div>

      <UiTable :columns="COLUMNS" :rows="documentLetters" :meta="meta" :loading="loading" :skeleton-rows="6" clickable @row-click="(memo) => goToDetail(memo.id)">
        <template #cell-document_number="{ row }">
          <span class="font-mono text-ui-cap text-ui-ink whitespace-nowrap">{{ row.document_number }}</span>
        </template>
        <template #cell-subject="{ row }">
          <span class="block max-w-[420px] truncate text-ui-ink" :title="row.subject">{{ row.subject }}</span>
        </template>
        <template #cell-document_date="{ row }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDate(row.document_date) }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="STATUS_TONE[row.status]" dot>{{ STATUS_LABEL[row.status] }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="inline-flex items-center gap-0.5" @click.stop>
            <button type="button" :class="iconBtn" title="View Detail" :aria-label="`View ${row.document_number}`" @click="goToDetail(row.id)">
              <Eye class="w-4 h-4" />
            </button>
            <button type="button" :class="iconBtn" :disabled="viewingId === row.id" title="View PDF" :aria-label="`View PDF ${row.document_number}`" @click="handleViewPdf(row)">
              <FileText class="w-4 h-4" />
            </button>
            <router-link
              v-if="can('document-letter-edit') && row.status === 'draft'"
              :to="{ name: 'admin.official-memos.edit', params: { id: row.id } }"
              :class="iconBtn"
              title="Edit"
              :aria-label="`Edit ${row.document_number}`"
            >
              <Pencil class="w-4 h-4" />
            </router-link>
            <button
              v-if="can('document-letter-delete') && row.status === 'draft'"
              type="button"
              :class="[iconBtn, 'hover:!bg-ui-bad-soft hover:!text-ui-bad']"
              title="Delete"
              :aria-label="`Delete ${row.document_number}`"
              @click="handleDelete(row)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- Phones: one card per memo -->
        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="w-5 pt-0.5 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="font-mono text-ui-cap text-ui-muted truncate">{{ row.document_number }}</p>
                <UiBadge :tone="STATUS_TONE[row.status]" dot class="shrink-0">{{ STATUS_LABEL[row.status] }}</UiBadge>
              </div>
              <p class="text-ui-body font-medium text-ui-ink mt-0.5 break-words">{{ row.subject }}</p>
              <p class="text-ui-cap text-ui-muted mt-0.5 tabular-nums">{{ formatDate(row.document_date) }}</p>
              <div class="flex items-center gap-1 mt-2 -ml-2" @click.stop>
                <button type="button" :class="iconBtn" class="!w-9 !h-9" :disabled="viewingId === row.id" :aria-label="`View PDF ${row.document_number}`" @click="handleViewPdf(row)">
                  <FileText class="w-4 h-4" />
                </button>
                <router-link
                  v-if="can('document-letter-edit') && row.status === 'draft'"
                  :to="{ name: 'admin.official-memos.edit', params: { id: row.id } }"
                  :class="iconBtn"
                  class="!w-9 !h-9"
                  :aria-label="`Edit ${row.document_number}`"
                >
                  <Pencil class="w-4 h-4" />
                </router-link>
                <button
                  v-if="can('document-letter-delete') && row.status === 'draft'"
                  type="button"
                  :class="iconBtn"
                  class="!w-9 !h-9"
                  :aria-label="`Delete ${row.document_number}`"
                  @click="handleDelete(row)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="search || statusFilter" :icon="SearchX" title="No memos match your filters" message="Try another number, subject or status." compact />
          <UiEmpty v-else :icon="FileSignature" title="No Official Memo yet" compact>
            <UiButton v-if="can('document-letter-create')" variant="secondary" size="sm" :icon="Plus" :to="{ name: 'admin.official-memos.create' }">Create Official Memo</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div class="px-4 sm:px-5 pb-4">
        <Pagination :meta="meta" :loading="loading" item-label="memo" @page-change="load" />
      </div>
    </section>
  </div>
</template>
