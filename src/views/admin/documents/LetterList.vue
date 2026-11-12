<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { Mail, Plus, Download, FileText, Ban, Trash2, Search, SearchX, ArrowLeft } from "lucide-vue-next";
import { useLetterStore } from "@/stores/letter";
import { useToastStore } from "@/stores/toast";
import { can } from "@/helpers/permissionHelper";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import Pagination from "@/components/common/Pagination.vue";
import { UiPageHeader, UiButton, UiInput, UiChips, UiTable, UiBadge, UiEmpty, UiSpinner, UiConfirmDialog } from "@/components/ui";
import { useAlertModalStore } from "@/stores/alertModal";

const { t } = useI18n();
const router = useRouter();
const store = useLetterStore();
const alertModal = useAlertModalStore();
const toast = useToastStore();
const { letters, meta } = storeToRefs(store);

// Search, status and page live in the URL and are remembered, so coming
// back from a letter restores the same view; the list shows what the store
// has and refreshes quietly.
const list = useListState("letters", { q: "", status: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));

const params = computed(() => ({ search: list.q || undefined, status: list.status || undefined, page: list.page }));
const { loading, refreshing } = useStaleFetch(() => store.fetchLetters(params.value), {
  key: () => ["letters", params.value],
  hasData: () => store.listKey !== null,
});
const goToPage = (page) => (list.page = page);

const isDeleteModalOpen = ref(false);
const letterToDelete = ref(null);
const downloadingId = ref(null);
const viewingId = ref(null);

const handleDownload = async (letter) => {
  downloadingId.value = letter.id;
  try {
    await store.downloadPdf(letter.id, letter.letter_number);
  } catch {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    downloadingId.value = null;
  }
};

// Called straight from the click (no await before it) so the new tab
// isn't treated as a popup.
const handleViewPdf = async (letter) => {
  viewingId.value = letter.id;
  try {
    await store.viewPdf(letter.id);
  } catch {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    viewingId.value = null;
  }
};

const editLetter = (letter) => router.push({ name: "admin.letters.edit", params: { id: letter.id } });
// The row opens the letter for editing; without that right, its PDF.
const onRowClick = (letter) => (can("letter-edit") ? editLetter(letter) : handleViewPdf(letter));

const handleCancel = async (letter) => {
  const ok = await alertModal.confirm(t("documents.letter.list.cancelConfirm", { number: letter.letter_number }), {
    type: "warning",
    confirmText: t("documents.letter.list.cancelLetter"),
  });
  if (!ok) return;
  try {
    // The API returns the cancelled letter; the row is updated in place.
    await store.cancelLetter(letter.id);
    toast.success(t("documents.letter.list.toast.cancelled"), letter.letter_number);
  } catch (err) {
    toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  }
};

const confirmDelete = (letter) => {
  letterToDelete.value = letter;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  const letter = letterToDelete.value;
  if (!letter) return;
  try {
    await store.deleteLetter(letter.id);
    toast.success(t("documents.letter.list.toast.deleted"), letter.letter_number);
    // The last row of a later page: step back a page.
    if (!letters.value.length && list.page > 1) list.page -= 1;
  } catch (err) {
    toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  } finally {
    isDeleteModalOpen.value = false;
    letterToDelete.value = null;
  }
};

// Presentation only: status chips, table columns, badge.
const STATUS_OPTIONS = computed(() => [
  { value: "", label: t("common.labels.all") },
  { value: "issued", label: t("common.labels.active") },
  { value: "cancelled", label: t("documents.shared.status.cancelled") },
]);
const COLUMNS = computed(() => [
  { key: "subject", label: t("documents.letter.list.columns.letter") },
  { key: "date", label: t("common.labels.date") },
  { key: "status", label: t("common.labels.status") },
  { key: "actions", label: "", align: "right", width: 176 },
]);
const badge = (letter) =>
  letter.status === "cancelled"
    ? { tone: "bad", label: t("documents.shared.status.cancelled") }
    : { tone: "ok", label: t("common.labels.active") };
// The muted line under the subject: number, then the division code.
const subline = (letter) => [letter.letter_number, letter.division_code?.code].filter(Boolean).join(" · ");
const quietDanger = "!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft";

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString(localeTag(), { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('documents.letter.list.title')" :subtitle="$t('documents.letter.list.subtitle')" class="ui-anim-fade-up">
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
        <UiButton v-if="can('letter-create')" :to="{ name: 'admin.letters.create' }" :icon="Plus" class="w-full sm:w-auto">{{ $t("documents.letter.list.create") }}</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <!-- Toolbar: search · status, one line on desktop -->
      <div class="px-4 sm:px-5 py-3 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          :placeholder="$t('documents.letter.list.searchPlaceholder')"
          :aria-label="$t('documents.letter.list.searchPlaceholder')"
          class="lg:w-[280px]"
        />
        <UiChips v-model="list.status" :options="STATUS_OPTIONS" size="sm" class="min-w-0 lg:flex-1" />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("documents.shared.refreshing") }}
        </span>
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="letters"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        clickable
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        @row-click="onRowClick"
      >
        <template #cell-subject="{ row }">
          <div class="min-w-0 max-w-[460px] py-2.5">
            <!-- The subject is the keyboard way into the row's action. -->
            <button
              type="button"
              class="block max-w-full text-left text-ui-ink font-medium truncate rounded-sm hover:underline underline-offset-2 focus:outline-none focus-visible:shadow-ui-focus"
              :title="row.subject"
              @click.stop="onRowClick(row)"
            >{{ row.subject }}</button>
            <p class="mt-0.5 font-mono text-ui-cap text-ui-muted truncate" :title="subline(row)">{{ subline(row) }}</p>
          </div>
        </template>
        <template #cell-date="{ row }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDate(row.date) }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="badge(row).tone" dot>{{ badge(row).label }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <UiButton
              variant="secondary"
              size="sm"
              :icon="FileText"
              :loading="viewingId === row.id"
              :aria-label="$t('documents.shared.viewPdfItem', { number: row.letter_number })"
              @click="handleViewPdf(row)"
            >{{ $t("documents.shared.pdf") }}</UiButton>
            <UiButton
              variant="ghost"
              size="sm"
              :icon="Download"
              :loading="downloadingId === row.id"
              :title="$t('common.actions.downloadPdf')"
              :aria-label="$t('documents.shared.downloadPdfItem', { number: row.letter_number })"
              @click="handleDownload(row)"
            />
            <UiButton
              v-if="can('letter-edit') && row.status !== 'cancelled'"
              variant="ghost"
              size="sm"
              :icon="Ban"
              class="!text-ui-faint hover:!text-ui-warn hover:!bg-ui-warn-soft"
              :title="$t('documents.letter.list.cancelLetter')"
              :aria-label="$t('documents.shared.cancelItem', { number: row.letter_number })"
              @click="handleCancel(row)"
            />
            <UiButton
              v-if="can('letter-delete')"
              variant="ghost"
              size="sm"
              :icon="Trash2"
              :class="quietDanger"
              :title="$t('common.actions.delete')"
              :aria-label="$t('documents.shared.deleteItem', { number: row.letter_number })"
              @click="confirmDelete(row)"
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
                <p class="font-mono text-ui-cap text-ui-muted truncate mt-0.5">{{ subline(row) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 pl-8">
              <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <UiBadge :tone="badge(row).tone" dot>{{ badge(row).label }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(row.date) }}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0" @click.stop>
                <UiButton
                  variant="secondary"
                  size="sm"
                  :icon="FileText"
                  :loading="viewingId === row.id"
                  :aria-label="$t('documents.shared.viewPdfItem', { number: row.letter_number })"
                  @click="handleViewPdf(row)"
                >{{ $t("documents.shared.pdf") }}</UiButton>
                <UiButton
                  v-if="can('letter-delete')"
                  variant="ghost"
                  size="sm"
                  :icon="Trash2"
                  :class="quietDanger"
                  :aria-label="$t('documents.shared.deleteItem', { number: row.letter_number })"
                  @click="confirmDelete(row)"
                />
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="list.isDirty" :icon="SearchX" :title="$t('documents.letter.list.noMatchTitle')" :message="$t('documents.letter.list.noMatchMessage')" compact>
            <UiButton variant="secondary" size="sm" @click="(search = ''), list.reset()">{{ $t("common.actions.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty v-else :icon="Mail" :title="$t('documents.letter.list.emptyTitle')" compact>
            <UiButton v-if="can('letter-create')" variant="secondary" size="sm" :icon="Plus" :to="{ name: 'admin.letters.create' }">{{ $t("documents.letter.list.create") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div v-if="meta.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('documents.letter.list.itemLabel')" @page-change="goToPage" />
      </div>
    </section>

    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      type="danger"
      :title="$t('documents.letter.list.deleteTitle')"
      :message="$t('documents.letter.list.deleteMessage', { number: letterToDelete?.letter_number })"
      :confirm-text="$t('documents.shared.yesDelete')"
      @confirm="handleDelete"
    />
  </div>
</template>
