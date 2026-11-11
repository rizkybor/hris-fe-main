<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { NotebookPen, Plus, Search, SearchX, Trash2, Eye, Pin, PinOff, ArrowLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useMeetingNoteStore } from "@/stores/meetingNote";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiChips, UiTable, UiEmpty } from "@/components/ui";
import Pagination from "@/components/common/Pagination.vue";

const { t } = useI18n();
const router = useRouter();
const store = useMeetingNoteStore();
const alertModal = useAlertModalStore();
const { meetingNotes, meta, loading } = storeToRefs(store);

const search = ref("");
const typeFilter = ref("");
const pinBusyId = ref(null);

const load = (page = 1) => {
  store.fetchMeetingNotes({
    search: search.value || undefined,
    meeting_type: typeFilter.value || undefined,
    page,
  });
};

onMounted(() => load());

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const goToDetail = (id) => router.push({ name: "admin.meeting-notes.detail", params: { id } });

const handleDelete = async (note) => {
  if (
    !(await alertModal.confirm(t("documents.meetingNote.list.deleteConfirm", { number: note.document_number }), {
      type: "danger",
      confirmText: t("common.actions.delete"),
    }))
  )
    return;
  await store.deleteMeetingNote(note.id);
};

const togglePin = async (note) => {
  pinBusyId.value = note.id;
  try {
    note.is_pinned = await store.togglePin(note.id);
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
  { key: "document_number", label: t("documents.shared.number") },
  { key: "title", label: t("documents.meetingNote.fields.title") },
  { key: "meeting_type", label: t("common.labels.type") },
  { key: "meeting_date", label: t("documents.meetingNote.list.columns.meetingTime") },
  { key: "actions", label: t("common.labels.actions"), align: "right" },
]);
const iconBtn =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus disabled:opacity-50";
const iconBtnDanger =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus";

const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString(localeTag(), { dateStyle: "medium", timeStyle: "short" }) : "-";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="$t('documents.meetingNote.list.title')"
      :subtitle="$t('documents.meetingNote.list.subtitle')"
    >
      <template #eyebrow>
        <router-link
          :to="{ name: 'admin.documents.dashboard' }"
          class="inline-flex items-center gap-1 text-ui-small text-ui-accent hover:underline mb-1.5"
          :aria-label="$t('documents.shared.backToDocuments')"
          :title="$t('documents.shared.backToDocuments')"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          {{ $t("documents.shared.documents") }}
        </router-link>
      </template>
      <template #actions>
        <UiButton
          v-if="can('meeting-note-create')"
          :icon="Plus"
          :to="{ name: 'admin.meeting-notes.create' }"
          class="w-full sm:w-auto"
        >{{ $t("documents.meetingNote.list.create") }}</UiButton>
      </template>
    </UiPageHeader>

    <div class="bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden">
      <div class="p-3 sm:p-4 border-b border-ui-line flex flex-col sm:flex-row sm:items-center gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          :placeholder="$t('documents.meetingNote.list.searchPlaceholder')"
          class="sm:max-w-sm w-full"
          @keyup.enter="handleSearch"
        />
        <UiChips
          :model-value="typeFilter"
          :options="TYPE_OPTIONS"
          @update:model-value="(v) => { typeFilter = v; handleFilterChange(); }"
        />
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="meetingNotes"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        clickable
        @row-click="(note) => goToDetail(note.id)"
      >
        <template #cell-document_number="{ row }">
          <span class="font-mono text-ui-cap text-ui-ink whitespace-nowrap">{{ row.document_number }}</span>
        </template>
        <template #cell-title="{ row }">
          <div class="flex items-center gap-2 min-w-0 max-w-[420px]">
            <span class="font-medium text-ui-ink truncate">{{ row.title }}</span>
            <Pin v-if="row.is_pinned" class="w-3.5 h-3.5 text-ui-warn shrink-0" :aria-label="$t('documents.meetingNote.list.pinned')" />
          </div>
        </template>
        <template #cell-meeting_type="{ row }">
          <UiBadge :tone="TYPE_TONE[row.meeting_type] || 'neutral'">{{ TYPE_LABEL[row.meeting_type] }}</UiBadge>
        </template>
        <template #cell-meeting_date="{ row }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDateTime(row.meeting_date) }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="inline-flex items-center justify-end gap-1" @click.stop>
            <button
              v-if="can('meeting-note-pin')"
              type="button"
              :disabled="pinBusyId === row.id"
              :class="[iconBtn, row.is_pinned ? 'text-ui-warn' : '']"
              :title="row.is_pinned ? $t('documents.meetingNote.list.unpin') : $t('documents.meetingNote.list.pin')"
              :aria-label="row.is_pinned ? $t('documents.meetingNote.list.unpin') : $t('documents.meetingNote.list.pin')"
              @click="togglePin(row)"
            >
              <PinOff v-if="row.is_pinned" class="w-4 h-4" />
              <Pin v-else class="w-4 h-4" />
            </button>
            <button type="button" :class="iconBtn" :title="$t('documents.shared.viewDetail')" :aria-label="$t('documents.shared.viewDetail')" @click="goToDetail(row.id)">
              <Eye class="w-4 h-4" />
            </button>
            <button
              v-if="can('meeting-note-delete')"
              type="button"
              :class="iconBtnDanger"
              :title="$t('common.actions.delete')"
              :aria-label="$t('common.actions.delete')"
              @click="handleDelete(row)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- Phones: one card per note -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5 flex items-start gap-3">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 shrink-0 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="font-mono text-ui-cap text-ui-muted">{{ row.document_number }}</p>
              <p class="text-ui-body font-medium text-ui-ink break-words mt-0.5">{{ row.title }}</p>
              <div class="flex items-center gap-2 flex-wrap mt-1.5">
                <UiBadge :tone="TYPE_TONE[row.meeting_type] || 'neutral'">{{ TYPE_LABEL[row.meeting_type] }}</UiBadge>
                <UiBadge v-if="row.is_pinned" tone="warn"><Pin class="w-3 h-3" />{{ $t("documents.meetingNote.list.pinnedBadge") }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatDateTime(row.meeting_date) }}</span>
              </div>
            </div>
            <div class="flex flex-col items-center gap-1 shrink-0 -mr-1.5 -mt-1" @click.stop>
              <button
                v-if="can('meeting-note-pin')"
                type="button"
                :disabled="pinBusyId === row.id"
                class="w-9 h-9 inline-flex items-center justify-center rounded-ui-control active:bg-ui-hover disabled:opacity-50"
                :class="row.is_pinned ? 'text-ui-warn' : 'text-ui-muted'"
                :aria-label="row.is_pinned ? $t('documents.meetingNote.list.unpin') : $t('documents.meetingNote.list.pin')"
                @click="togglePin(row)"
              >
                <PinOff v-if="row.is_pinned" class="w-4 h-4" />
                <Pin v-else class="w-4 h-4" />
              </button>
              <button
                v-if="can('meeting-note-delete')"
                type="button"
                class="w-9 h-9 inline-flex items-center justify-center rounded-ui-control text-ui-muted active:bg-ui-bad-soft active:text-ui-bad"
                :aria-label="$t('common.actions.delete')"
                @click="handleDelete(row)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="search || typeFilter" :icon="SearchX" :title="$t('documents.meetingNote.list.noMatchTitle')" :message="$t('documents.meetingNote.list.noMatchMessage')" compact />
          <UiEmpty v-else :icon="NotebookPen" :title="$t('documents.meetingNote.list.emptyTitle')" compact>
            <UiButton v-if="can('meeting-note-create')" variant="secondary" size="sm" :icon="Plus" :to="{ name: 'admin.meeting-notes.create' }">
              {{ $t("documents.meetingNote.list.create") }}
            </UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div v-if="meta?.total" class="px-3 sm:px-4 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('documents.meetingNote.list.itemLabel')" @page-change="load" />
      </div>
    </div>
  </div>
</template>
