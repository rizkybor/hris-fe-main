<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { FileSignature, Plus, Search, SearchX, Trash2, FileText, Pencil, ArrowLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useDocumentLetterStore } from "@/stores/documentLetter";
import { useToastStore } from "@/stores/toast";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import Pagination from "@/components/common/Pagination.vue";
import { UiPageHeader, UiButton, UiInput, UiChips, UiTable, UiBadge, UiEmpty, UiSpinner } from "@/components/ui";

const { t } = useI18n();
const router = useRouter();
const store = useDocumentLetterStore();
const alertModal = useAlertModalStore();
const toast = useToastStore();
const { documentLetters, meta } = storeToRefs(store);

// Search, status and page live in the URL and are remembered, so coming
// back from a memo restores the same view; the list shows what the store
// has and refreshes quietly.
const list = useListState("official-memos", { q: "", status: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));

const params = computed(() => ({ search: list.q || undefined, status: list.status || undefined, page: list.page }));
const { loading, refreshing } = useStaleFetch(() => store.fetchDocumentLetters(params.value), {
  key: () => ["official-memos", params.value],
  hasData: () => store.listKey !== null,
});
const goToPage = (page) => (list.page = page);

const goToDetail = (memo) => router.push({ name: "admin.official-memos.detail", params: { id: memo.id } });

// Called straight from the click (no await before it) so the new tab
// isn't treated as a popup.
const viewingId = ref(null);
const handleViewPdf = async (memo) => {
  viewingId.value = memo.id;
  try {
    await store.viewPdf(memo.id);
  } catch {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    viewingId.value = null;
  }
};

const handleDelete = async (memo) => {
  const ok = await alertModal.confirm(t("documents.memo.list.deleteConfirm", { number: memo.document_number }), {
    type: "danger",
    confirmText: t("common.actions.delete"),
  });
  if (!ok) return;
  try {
    // Removes the row and lowers the total in the store.
    await store.deleteDocumentLetter(memo.id);
    toast.success(t("documents.memo.list.toast.deleted"), memo.document_number);
    if (!documentLetters.value.length && list.page > 1) list.page -= 1;
  } catch (err) {
    toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  }
};

const STATUS_LABEL = computed(() => ({
  draft: t("documents.shared.status.draft"),
  pending: t("documents.shared.status.pending"),
  approved: t("documents.shared.status.approved"),
  rejected: t("documents.shared.status.rejected"),
}));
// Presentation only: badge tones, status chips, table columns.
const STATUS_TONE = { draft: "neutral", pending: "warn", approved: "ok", rejected: "bad" };
const STATUS_OPTIONS = computed(() => [
  { value: "", label: t("common.labels.all") },
  { value: "draft", label: t("documents.shared.status.draft") },
  { value: "pending", label: t("documents.shared.status.pending") },
  { value: "approved", label: t("documents.shared.status.approved") },
  { value: "rejected", label: t("documents.shared.status.rejected") },
]);
const COLUMNS = computed(() => [
  { key: "subject", label: t("documents.memo.list.columns.memo") },
  { key: "document_date", label: t("common.labels.date") },
  { key: "status", label: t("common.labels.status") },
  { key: "actions", label: "", align: "right", width: 152 },
]);
const canEditRow = (memo) => can("document-letter-edit") && memo.status === "draft";
const canDeleteRow = (memo) => can("document-letter-delete") && memo.status === "draft";
// The muted line under the subject: number, then who wrote it.
const subline = (memo) => [memo.document_number, memo.sender?.name || memo.creator?.name].filter(Boolean).join(" · ");
const quietDanger = "!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft";

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString(localeTag(), { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('documents.memo.list.title')" :subtitle="$t('documents.memo.list.subtitle')" class="ui-anim-fade-up">
      <template #eyebrow>
        <router-link
          :to="{ name: 'admin.documents.dashboard' }"
          class="ui-press inline-flex items-center gap-1 mb-1.5 text-ui-small font-medium text-ui-accent hover:underline"
          :aria-label="$t('documents.shared.backToDocuments')"
          :title="$t('documents.shared.backToDocuments')"
        >
          <ArrowLeft class="w-4 h-4" />{{ $t("documents.shared.documents") }}
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('document-letter-create')" :to="{ name: 'admin.official-memos.create' }" :icon="Plus" class="w-full sm:w-auto">{{ $t("documents.memo.list.create") }}</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <!-- Toolbar: search · status, one line on desktop -->
      <div class="px-4 sm:px-5 py-3 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          :placeholder="$t('documents.memo.list.searchPlaceholder')"
          :aria-label="$t('documents.memo.list.searchPlaceholder')"
          class="lg:w-[280px]"
        />
        <UiChips v-model="list.status" :options="STATUS_OPTIONS" size="sm" class="min-w-0 lg:flex-1" />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("documents.shared.refreshing") }}
        </span>
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="documentLetters"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        clickable
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        @row-click="goToDetail"
      >
        <template #cell-subject="{ row }">
          <div class="min-w-0 max-w-[460px] py-2.5">
            <!-- The subject is the keyboard way into the detail (rows open it on click). -->
            <router-link
              :to="{ name: 'admin.official-memos.detail', params: { id: row.id } }"
              class="block max-w-full text-ui-ink font-medium truncate rounded-sm hover:underline underline-offset-2 focus:outline-none focus-visible:shadow-ui-focus"
              :title="row.subject"
              @click.stop
            >{{ row.subject }}</router-link>
            <p class="mt-0.5 text-ui-cap text-ui-muted truncate" :title="subline(row)"><span class="font-mono">{{ row.document_number }}</span><template v-if="row.sender?.name || row.creator?.name"> · {{ row.sender?.name || row.creator?.name }}</template></p>
          </div>
        </template>
        <template #cell-document_date="{ row }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDate(row.document_date) }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="STATUS_TONE[row.status]" dot>{{ STATUS_LABEL[row.status] }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <UiButton
              v-if="canEditRow(row)"
              variant="ghost"
              size="sm"
              :icon="Pencil"
              :to="{ name: 'admin.official-memos.edit', params: { id: row.id } }"
              :title="$t('common.actions.edit')"
              :aria-label="$t('documents.shared.editItem', { number: row.document_number })"
            />
            <UiButton
              variant="secondary"
              size="sm"
              :icon="FileText"
              :loading="viewingId === row.id"
              :aria-label="$t('documents.shared.viewPdfItem', { number: row.document_number })"
              @click="handleViewPdf(row)"
            >{{ $t("documents.shared.pdf") }}</UiButton>
            <UiButton
              v-if="canDeleteRow(row)"
              variant="ghost"
              size="sm"
              :icon="Trash2"
              :class="quietDanger"
              :title="$t('common.actions.delete')"
              :aria-label="$t('documents.shared.deleteItem', { number: row.document_number })"
              @click="handleDelete(row)"
            />
          </div>
        </template>

        <!-- Phones: the same simplified row as a card -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5">
            <div class="flex items-start gap-3">
              <span class="w-5 pt-0.5 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink line-clamp-2 break-words">{{ row.subject }}</p>
                <p class="text-ui-cap text-ui-muted truncate mt-0.5"><span class="font-mono">{{ row.document_number }}</span><template v-if="row.sender?.name || row.creator?.name"> · {{ row.sender?.name || row.creator?.name }}</template></p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 pl-8">
              <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <UiBadge :tone="STATUS_TONE[row.status]" dot>{{ STATUS_LABEL[row.status] }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(row.document_date) }}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0" @click.stop>
                <UiButton
                  variant="secondary"
                  size="sm"
                  :icon="FileText"
                  :loading="viewingId === row.id"
                  :aria-label="$t('documents.shared.viewPdfItem', { number: row.document_number })"
                  @click="handleViewPdf(row)"
                >{{ $t("documents.shared.pdf") }}</UiButton>
                <UiButton
                  v-if="canDeleteRow(row)"
                  variant="ghost"
                  size="sm"
                  :icon="Trash2"
                  :class="quietDanger"
                  :aria-label="$t('documents.shared.deleteItem', { number: row.document_number })"
                  @click="handleDelete(row)"
                />
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="list.isDirty" :icon="SearchX" :title="$t('documents.memo.list.noMatchTitle')" :message="$t('documents.memo.list.noMatchMessage')" compact>
            <UiButton variant="secondary" size="sm" @click="(search = ''), list.reset()">{{ $t("common.actions.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty v-else :icon="FileSignature" :title="$t('documents.memo.list.emptyTitle')" compact>
            <UiButton v-if="can('document-letter-create')" variant="secondary" size="sm" :icon="Plus" :to="{ name: 'admin.official-memos.create' }">{{ $t("documents.memo.list.create") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div v-if="meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('documents.memo.list.itemLabel')" @page-change="goToPage" />
      </div>
    </section>
  </div>
</template>
