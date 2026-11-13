<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { NotebookPen, Pencil, Trash2, Pin, PinOff, FileText, Users, Calendar, Building2, CheckSquare, Square, ArrowLeft, FileDown } from "lucide-vue-next";
import { usePolling } from "@/composables/usePolling";
import { useToastStore } from "@/stores/toast";
import { UiButton, UiBadge } from "@/components/ui";
import { useMeetingNoteStore } from "@/stores/meetingNote";
import { useAuthStore } from "@/stores/auth";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import PresenceIndicator from "@/components/common/PresenceIndicator.vue";
import MeetingNoteComments from "@/components/admin/documents/MeetingNoteComments.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useMeetingNoteStore();
const alertModal = useAlertModalStore();
const authStore = useAuthStore();
const toast = useToastStore();

const { currentMeetingNote: note, loading, activeViewers } = storeToRefs(store);

const isCreator = computed(() => note.value?.creator?.id === authStore.user?.id);

const mentionableEmployees = computed(() => {
  const attendees = note.value?.attendees || [];
  const creatorEmployeeId = note.value?.creator?.employee_id;
  if (!creatorEmployeeId || attendees.some((a) => a.id === creatorEmployeeId)) {
    return attendees;
  }
  return [...attendees, { id: creatorEmployeeId, name: note.value.creator.name }];
});

const pinBusy = ref(false);
const pdfBusy = ref(false);

const downloadPdf = async () => {
  pdfBusy.value = true;
  try {
    await store.downloadPdf(note.value.id, note.value.document_number);
  } catch {
    await alertModal.alert(t("documents.meetingNote.detail.pdfFailed"), { type: "danger" });
  } finally {
    pdfBusy.value = false;
  }
};

// Opened straight from the click (no await before it) so the new tab isn't
// treated as a popup.
const viewingPdf = ref(false);
const viewPdf = async () => {
  viewingPdf.value = true;
  try {
    await store.viewPdf(note.value.id);
  } catch {
    toast.error(t("documents.meetingNote.detail.pdfFailed"));
  } finally {
    viewingPdf.value = false;
  }
};

// A note already in the store (just saved, or opened before) shows at once
// and refreshes quietly; the skeleton is only for a note not loaded yet.
const load = () => store.fetchMeetingNote(route.params.id).catch(() => {});

// Presence: who else has this note open. Paused while the browser tab is
// hidden, stopped when the page closes.
const pingPresence = () => {
  store.sendHeartbeat(route.params.id, false);
  store.fetchActiveViewers(route.params.id);
};
usePolling(pingPresence, 8000, { immediate: true });

onMounted(load);
watch(() => route.params.id, (id) => id && (load(), pingPresence()));

const TYPE_LABEL = computed(() => ({ internal: t("documents.meetingNote.types.internal"), external: t("documents.meetingNote.types.external") }));
const TYPE_TONE = { internal: "accent", external: "outline" };
const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString(localeTag(), { dateStyle: "full", timeStyle: "short" }) : "-";

const togglePin = async () => {
  pinBusy.value = true;
  try {
    // The store flips the pin on this note and its list row.
    await store.togglePin(note.value.id);
  } catch (err) {
    toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  } finally {
    pinBusy.value = false;
  }
};

const handleDelete = async () => {
  if (
    !(await alertModal.confirm(t("documents.meetingNote.list.deleteConfirm", { number: note.value.document_number }), {
      type: "danger",
      confirmText: t("common.actions.delete"),
    }))
  )
    return;
  const number = note.value.document_number;
  try {
    // Removes the row from the list too, so it doesn't reload.
    await store.deleteMeetingNote(note.value.id);
    toast.success(t("documents.meetingNote.list.toast.deleted"), number);
    router.push({ name: "admin.meeting-notes.dashboard" });
  } catch (err) {
    toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <div v-if="loading" class="space-y-5" role="status" :aria-label="$t('common.a11y.loading')">
      <div class="flex items-center gap-4">
        <Skeleton width="48px" height="48px" rounded="12px" />
        <div class="flex-1 space-y-2">
          <Skeleton width="40%" height="22px" />
          <Skeleton width="25%" height="14px" />
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div class="lg:col-span-2 bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
          <Skeleton width="30%" height="16px" />
          <Skeleton width="100%" height="200px" />
        </div>
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
          <Skeleton v-for="i in 4" :key="i" width="100%" height="16px" />
        </div>
      </div>
    </div>

    <template v-else-if="note">
      <!-- Detail header -->
      <div class="ui-anim-fade-up">
        <router-link
          :to="{ name: 'admin.meeting-notes.dashboard' }"
          class="inline-flex items-center gap-1 text-ui-small text-ui-accent hover:underline mb-3"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          {{ $t("documents.meetingNote.detail.back") }}
        </router-link>

        <div class="flex flex-col lg:flex-row lg:items-center gap-4">
          <div class="flex items-start gap-4 flex-1 min-w-0">
            <div class="w-12 h-12 rounded-ui-card bg-ui-accent-soft text-ui-accent flex items-center justify-center shrink-0">
              <NotebookPen class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
                <h1 class="text-ui-h1 text-ui-ink break-words">{{ note.title }}</h1>
                <UiBadge :tone="TYPE_TONE[note.meeting_type] || 'neutral'">{{ TYPE_LABEL[note.meeting_type] }}</UiBadge>
                <UiBadge v-if="note.is_pinned" tone="warn"><Pin class="w-3 h-3" />{{ $t("documents.meetingNote.list.pinnedBadge") }}</UiBadge>
              </div>
              <p class="text-ui-small text-ui-muted mt-1">
                <span class="font-mono">{{ note.document_number }}</span>
                <span class="text-ui-faint"> · </span>
                <span class="tabular-nums">{{ formatDateTime(note.meeting_date) }}</span>
              </p>
              <PresenceIndicator :viewers="activeViewers" class="mt-2" />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <UiButton :icon="FileText" :loading="viewingPdf" @click="viewPdf">{{ $t("documents.shared.viewPdf") }}</UiButton>
            <UiButton
              variant="secondary"
              :icon="FileDown"
              :loading="pdfBusy"
              :title="$t('documents.meetingNote.detail.downloadHint')"
              @click="downloadPdf"
            >{{ $t("common.actions.downloadPdf") }}</UiButton>
            <UiButton
              v-if="can('meeting-note-pin') && isCreator"
              variant="secondary"
              :icon="note.is_pinned ? PinOff : Pin"
              :loading="pinBusy"
              :title="$t('documents.meetingNote.detail.pinHint')"
              @click="togglePin"
            >{{ note.is_pinned ? $t("documents.meetingNote.detail.unpin") : $t("documents.meetingNote.list.pin") }}</UiButton>
            <UiButton
              v-if="can('meeting-note-edit')"
              variant="secondary"
              :icon="Pencil"
              :to="{ name: 'admin.meeting-notes.edit', params: { id: note.id } }"
            >{{ $t("common.actions.edit") }}</UiButton>
            <UiButton
              v-if="can('meeting-note-delete')"
              variant="ghost"
              :icon="Trash2"
              class="!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft"
              :title="$t('common.actions.delete')"
              :aria-label="$t('documents.shared.deleteItem', { number: note.document_number })"
              @click="handleDelete"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start ui-stagger">
        <div class="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
            <h2 class="text-ui-h2 text-ui-ink mb-3">{{ $t("documents.meetingNote.fields.body") }}</h2>
            <div v-if="note.body" class="rich-text-content text-ui-body text-ui-text leading-relaxed" v-html="note.body"></div>
            <p v-else class="text-ui-small text-ui-muted">{{ $t("documents.meetingNote.detail.noBody") }}</p>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
            <h2 class="text-ui-h2 text-ui-ink mb-3">{{ $t("documents.meetingNote.fields.actionItems") }}</h2>
            <ul v-if="note.action_items?.length" class="divide-y divide-ui-line -my-1">
              <li v-for="(item, index) in note.action_items" :key="index" class="flex items-start gap-2.5 py-2.5 text-ui-body">
                <CheckSquare v-if="item.done" class="w-4 h-4 text-ui-ok shrink-0 mt-0.5" :aria-label="$t('common.actions.done')" />
                <Square v-else class="w-4 h-4 text-ui-faint shrink-0 mt-0.5" :aria-label="$t('documents.meetingNote.detail.open')" />
                <div class="flex-1 min-w-0 sm:flex sm:items-start sm:gap-3">
                  <span class="block flex-1 break-words" :class="item.done ? 'line-through text-ui-muted' : 'text-ui-ink'">{{ item.text }}</span>
                  <span v-if="item.assignee" class="block text-ui-cap text-ui-muted mt-0.5 sm:mt-0.5 shrink-0">{{ $t("documents.meetingNote.detail.assignee", { name: item.assignee }) }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="text-ui-small text-ui-muted">{{ $t("documents.meetingNote.form.noActionItems") }}</p>
          </section>

          <section v-if="note.attachments?.length" class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
            <h2 class="text-ui-h2 text-ui-ink mb-3">{{ $t("documents.memo.fields.attachments") }}</h2>
            <div class="space-y-2">
              <a
                v-for="attachment in note.attachments"
                :key="attachment.id"
                :href="attachment.url"
                target="_blank"
                class="flex items-center gap-2.5 h-10 px-3 border border-ui-line rounded-ui-control text-ui-small text-ui-accent hover:bg-ui-hover transition-colors min-w-0"
              >
                <FileText class="w-4 h-4 shrink-0 text-ui-faint" />
                <span class="truncate">{{ attachment.original_name }}</span>
              </a>
            </div>
          </section>

          <MeetingNoteComments
            :meeting-note-id="note.id"
            :attendees="mentionableEmployees"
            :can-comment="!!note.can_comment"
          />
        </div>

        <aside class="space-y-4 sm:space-y-5 min-w-0">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 space-y-4">
            <h2 class="text-ui-h3 text-ui-ink">{{ $t("documents.meetingNote.detail.meeting") }}</h2>
            <div>
              <p class="text-ui-cap text-ui-muted flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5 text-ui-faint" />{{ $t("documents.meetingNote.detail.dateTime") }}</p>
              <p class="text-ui-body text-ui-ink mt-1 tabular-nums">{{ formatDateTime(note.meeting_date) }}</p>
            </div>

            <div v-if="note.attendees?.length">
              <p class="text-ui-cap text-ui-muted flex items-center gap-1.5"><Users class="w-3.5 h-3.5 text-ui-faint" />{{ $t("documents.meetingNote.fields.internalAttendees") }}:</p>
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                <UiBadge v-for="attendee in note.attendees" :key="attendee.id" tone="accent">{{ attendee.name }}</UiBadge>
              </div>
            </div>

            <div v-if="note.external_attendees?.length">
              <p class="text-ui-cap text-ui-muted flex items-center gap-1.5"><Building2 class="w-3.5 h-3.5 text-ui-faint" />{{ $t("documents.meetingNote.fields.externalAttendees") }}:</p>
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                <UiBadge v-for="(att, index) in note.external_attendees" :key="index" tone="neutral"
                  >{{ att.name }}<span v-if="att.organization">&nbsp;({{ att.organization }})</span></UiBadge
                >
              </div>
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 space-y-2.5 text-ui-small">
            <div class="flex items-center justify-between gap-3">
              <span class="text-ui-muted">{{ $t("common.labels.createdBy") }}:</span>
              <span class="text-ui-ink font-medium text-right truncate">{{ note.creator?.name || "-" }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-ui-muted">{{ $t("documents.meetingNote.detail.lastEditedBy") }}</span>
              <span class="text-ui-ink font-medium text-right truncate">{{ note.updater?.name || "-" }}</span>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Table containment (overflow-x-auto, border, padding) lives in the
   shared global .rich-text-content class in src/assets/css/input.css --
   only the non-table typography rules stay local here. */
.rich-text-content :deep(p) { margin-bottom: 0.75rem; }
.rich-text-content :deep(ul) { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(ol) { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(h1) { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
.rich-text-content :deep(h2) { font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0; }
.rich-text-content :deep(h3) { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0; }
.rich-text-content :deep(blockquote) { border-left: 3px solid rgb(var(--ui-line-strong)); padding-left: 0.75rem; color: rgb(var(--ui-muted)); margin: 0.5rem 0; }
.rich-text-content :deep(a) { color: rgb(var(--ui-accent)); text-decoration: underline; }
.rich-text-content :deep(hr) { border: none; border-top: 1px solid rgb(var(--ui-line)); margin: 0.75rem 0; }
</style>
