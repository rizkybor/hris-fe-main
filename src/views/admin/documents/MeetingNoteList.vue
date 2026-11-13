<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { NotebookPen, Plus, Search, SearchX, Trash2, FileText, Pin, PinOff, ArrowLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useMeetingNoteStore } from "@/stores/meetingNote";
import { useToastStore } from "@/stores/toast";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiChips, UiTable, UiEmpty, UiSpinner } from "@/components/ui";
import Pagination from "@/components/common/Pagination.vue";

const { t } = useI18n();
const router = useRouter();
const store = useMeetingNoteStore();
const alertModal = useAlertModalStore();
const toast = useToastStore();
const { meetingNotes, meta } = storeToRefs(store);

const list = useListState("meeting-notes", { q: "", type: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));

const params = computed(() => ({ search: list.q || undefined, meeting_type: list.type || undefined, page: list.page }));
const { loading, refreshing } = useStaleFetch(() => store.fetchMeetingNotes(params.value), {
  key: () => ["meeting-notes", params.value],
  hasData: () => store.listKey !== null,
});
const goToPage = (page) => (list.page = page);

const goToDetail = (note) => router.push({ name: "admin.meeting-notes.detail", params: { id: note.id } });

// Called straight from the click (no await before it) so the new tab
// isn't treated as a popup.
const viewingId = ref(null);
const handleViewPdf = async (note) => {
  viewingId.value = note.id;
  try {
    await store.viewPdf(note.id);
  } catch {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    viewingId.value = null;
  }
};

const handleDelete = async (note) => {
  const ok = await alertModal.confirm(t("documents.meetingNote.list.deleteConfirm", { number: note.document_number }), {
    type: "danger",
    confirmText: t("common.actions.delete"),
  });
  if (!ok) return;
  try {
    // Removes the row and lowers the total in the store.
    await store.deleteMeetingNote(note.id);
    toast.success(t("documents.meetingNote.list.toast.deleted"), note.document_number);
    if (!meetingNotes.value.length && list.page > 1) list.page -= 1;
  } catch (err) {
    toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  }
};

const pinBusyId = ref(null);
const togglePin = async (note) => {
  pinBusyId.value = note.id;
  try {
    // The store flips the row's pin from the response.
    await store.togglePin(note.id);
  } catch (err) {
    toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  } finally {
    pinBusyId.value = null;
  }
};

const TYPE_LABEL = computed(() => ({ internal: t("documents.meetingNote.types.internal"), external: t("documents.meetingNote.types.external") }));
// Presentation only: filter chips + table columns.
const TYPE_OPTIONS = computed(() => [
  { value: "", label: t("documents.meetingNote.list.allTypes") },
  { value: "internal", label: t("documents.meetingNote.types.internal") },
  { value: "external", label: t("documents.meetingNote.types.external") },
]);
const TYPE_TONE = { internal: "accent", external: "outline" };
const COLUMNS = computed(() => [
  { key: "title", label: t("documents.meetingNote.list.columns.note") },
  { key: "meeting_date", label: t("documents.meetingNote.list.columns.meetingTime") },
  { key: "meeting_type", label: t("common.labels.type") },
  { key: "actions", label: "", align: "right", width: 152 },
]);
const quietDanger = "!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft";

const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString(localeTag(), { dateStyle: "medium", timeStyle: "short" }) : "-";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('documents.meetingNote.list.title')" :subtitle="$t('documents.meetingNote.list.subtitle')" class="ui-anim-fade-up">
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
        <UiButton v-if="can('meeting-note-create')" :icon="Plus" :to="{ name: 'admin.meeting-notes.create' }" class="w-full sm:w-auto">{{ $t("documents.meetingNote.list.create") }}</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <!-- Toolbar: search · type, one line on desktop -->
      <div class="px-4 sm:px-5 py-3 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          :placeholder="$t('documents.meetingNote.list.searchPlaceholder')"
          :aria-label="$t('documents.meetingNote.list.searchPlaceholder')"
          class="lg:w-[280px]"
        />
        <UiChips v-model="list.type" :options="TYPE_OPTIONS" size="sm" class="min-w-0 lg:flex-1" />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("documents.shared.refreshing") }}
        </span>
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="meetingNotes"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        clickable
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        @row-click="goToDetail"
      >
        <template #cell-title="{ row }">
          <div class="min-w-0 max-w-[460px] py-2.5">
            <div class="flex items-center gap-1.5 min-w-0">
              <!-- The title is the keyboard way into the detail (rows open it on click). -->
              <router-link
                :to="{ name: 'admin.meeting-notes.detail', params: { id: row.id } }"
                class="min-w-0 text-ui-ink font-medium truncate rounded-sm hover:underline underline-offset-2 focus:outline-none focus-visible:shadow-ui-focus"
                :title="row.title"
                @click.stop
              >{{ row.title }}</router-link>
              <Pin v-if="row.is_pinned" class="w-3.5 h-3.5 text-ui-warn shrink-0" role="img" :aria-label="$t('documents.meetingNote.list.pinned')" />
            </div>
            <p class="mt-0.5 font-mono text-ui-cap text-ui-muted truncate">{{ row.document_number }}</p>
          </div>
        </template>
        <template #cell-meeting_date="{ row }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDateTime(row.meeting_date) }}</span>
        </template>
        <template #cell-meeting_type="{ row }">
          <UiBadge :tone="TYPE_TONE[row.meeting_type] || 'neutral'">{{ TYPE_LABEL[row.meeting_type] }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <UiButton
              v-if="can('meeting-note-pin')"
              variant="ghost"
              size="sm"
              :icon="row.is_pinned ? PinOff : Pin"
              :loading="pinBusyId === row.id"
              :class="row.is_pinned ? '!text-ui-warn' : ''"
              :title="row.is_pinned ? $t('documents.meetingNote.list.unpin') : $t('documents.meetingNote.list.pin')"
              :aria-label="row.is_pinned ? $t('documents.meetingNote.list.unpin') : $t('documents.meetingNote.list.pin')"
              @click="togglePin(row)"
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
              v-if="can('meeting-note-delete')"
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
                <p class="text-ui-body font-medium text-ui-ink line-clamp-2 break-words">
                  {{ row.title }}<Pin v-if="row.is_pinned" class="inline w-3.5 h-3.5 ml-1 -mt-0.5 text-ui-warn" role="img" :aria-label="$t('documents.meetingNote.list.pinned')" />
                </p>
                <p class="font-mono text-ui-cap text-ui-muted truncate mt-0.5">{{ row.document_number }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 pl-8">
              <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <UiBadge :tone="TYPE_TONE[row.meeting_type] || 'neutral'">{{ TYPE_LABEL[row.meeting_type] }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatDateTime(row.meeting_date) }}</span>
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
                  v-if="can('meeting-note-delete')"
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
          <UiEmpty v-if="list.isDirty" :icon="SearchX" :title="$t('documents.meetingNote.list.noMatchTitle')" :message="$t('documents.meetingNote.list.noMatchMessage')" compact>
            <UiButton variant="secondary" size="sm" @click="(search = ''), list.reset()">{{ $t("common.actions.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty v-else :icon="NotebookPen" :title="$t('documents.meetingNote.list.emptyTitle')" compact>
            <UiButton v-if="can('meeting-note-create')" variant="secondary" size="sm" :icon="Plus" :to="{ name: 'admin.meeting-notes.create' }">
              {{ $t("documents.meetingNote.list.create") }}
            </UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div v-if="meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('documents.meetingNote.list.itemLabel')" @page-change="goToPage" />
      </div>
    </section>
  </div>
</template>
