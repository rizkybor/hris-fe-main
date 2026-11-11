<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { NotebookPen, Pencil, Trash2, Pin, PinOff, FileText, Users, Calendar, Building2, CheckSquare, Square, ArrowLeft, FileDown } from "lucide-vue-next";
import { UiButton, UiBadge } from "@/components/ui";
import { useMeetingNoteStore } from "@/stores/meetingNote";
import { useAuthStore } from "@/stores/auth";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import PresenceIndicator from "@/components/common/PresenceIndicator.vue";
import MeetingNoteComments from "@/components/admin/documents/MeetingNoteComments.vue";

const route = useRoute();
const router = useRouter();
const store = useMeetingNoteStore();
const alertModal = useAlertModalStore();
const authStore = useAuthStore();

const { currentMeetingNote: note, loading, activeViewers } = storeToRefs(store);

// Pin/unpin is a shared toggle (pinning surfaces the note on every Internal
// Attendee's dashboard, not just the clicker's own), so only the note's
// creator may control it -- matches MeetingNoteController::togglePin().
const isCreator = computed(() => note.value?.creator?.id === authStore.user?.id);

// @mention targets for the comment composer: Internal Attendees plus the
// note's own creator (who can comment/be mentioned even if they didn't
// check themselves in as an attendee -- see MeetingNoteCommentController).
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
    await alertModal.alert("PDF gagal dibuat. Coba lagi beberapa saat.", { type: "danger" });
  } finally {
    pdfBusy.value = false;
  }
};
let heartbeatTimer = null;

const load = () => store.fetchMeetingNote(route.params.id);

onMounted(() => {
  load();
  store.sendHeartbeat(route.params.id, false);
  store.fetchActiveViewers(route.params.id);
  heartbeatTimer = setInterval(() => {
    store.sendHeartbeat(route.params.id, false);
    store.fetchActiveViewers(route.params.id);
  }, 8000);
});

onUnmounted(() => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
});

const TYPE_LABEL = { internal: "Internal", external: "External" };
const TYPE_TONE = { internal: "accent", external: "outline" };
const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }) : "-";

const togglePin = async () => {
  pinBusy.value = true;
  try {
    note.value.is_pinned = await store.togglePin(note.value.id);
  } finally {
    pinBusy.value = false;
  }
};

const handleDelete = async () => {
  if (
    !(await alertModal.confirm(`Delete Meeting Note "${note.value.document_number}"? This action cannot be undone.`, {
      type: "danger",
      confirmText: "Delete",
    }))
  )
    return;
  await store.deleteMeetingNote(note.value.id);
  router.push({ name: "admin.meeting-notes.dashboard" });
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <div v-if="loading" class="space-y-5" role="status" aria-label="Loading">
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
          Back to Meeting Notes
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
                <UiBadge v-if="note.is_pinned" tone="warn"><Pin class="w-3 h-3" />Pinned</UiBadge>
              </div>
              <p class="text-ui-small text-ui-muted mt-1">
                <span class="font-mono">{{ note.document_number }}</span>
                <span class="text-ui-faint"> · </span>
                <span class="tabular-nums">{{ formatDateTime(note.meeting_date) }}</span>
              </p>
              <PresenceIndicator :viewers="activeViewers" class="mt-2" />
            </div>
          </div>

          <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0">
            <UiButton
              variant="secondary"
              :icon="FileDown"
              :loading="pdfBusy"
              title="Unduh Meeting Note ini sebagai PDF (Notulen Rapat)"
              @click="downloadPdf"
            >Download PDF</UiButton>
            <UiButton
              v-if="can('meeting-note-pin') && isCreator"
              variant="secondary"
              :icon="note.is_pinned ? PinOff : Pin"
              :loading="pinBusy"
              title="Pinning also adds this note to every Internal Attendee's dashboard"
              @click="togglePin"
            >{{ note.is_pinned ? "Unpin" : "Pin to Dashboard" }}</UiButton>
            <UiButton
              v-if="can('meeting-note-edit')"
              variant="secondary"
              :icon="Pencil"
              :to="{ name: 'admin.meeting-notes.edit', params: { id: note.id } }"
            >Edit</UiButton>
            <UiButton v-if="can('meeting-note-delete')" variant="danger" :icon="Trash2" @click="handleDelete">Delete</UiButton>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start ui-stagger">
        <div class="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
            <h2 class="text-ui-h2 text-ui-ink mb-3">Notes Content</h2>
            <div v-if="note.body" class="rich-text-content text-ui-body text-ui-text leading-relaxed" v-html="note.body"></div>
            <p v-else class="text-ui-small text-ui-muted">No notes yet.</p>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
            <h2 class="text-ui-h2 text-ui-ink mb-3">Action Items</h2>
            <ul v-if="note.action_items?.length" class="divide-y divide-ui-line -my-1">
              <li v-for="(item, index) in note.action_items" :key="index" class="flex items-start gap-2.5 py-2.5 text-ui-body">
                <CheckSquare v-if="item.done" class="w-4 h-4 text-ui-ok shrink-0 mt-0.5" aria-label="Done" />
                <Square v-else class="w-4 h-4 text-ui-faint shrink-0 mt-0.5" aria-label="Open" />
                <div class="flex-1 min-w-0 sm:flex sm:items-start sm:gap-3">
                  <span class="block flex-1 break-words" :class="item.done ? 'line-through text-ui-muted' : 'text-ui-ink'">{{ item.text }}</span>
                  <span v-if="item.assignee" class="block text-ui-cap text-ui-muted mt-0.5 sm:mt-0.5 shrink-0">Assignee: {{ item.assignee }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="text-ui-small text-ui-muted">No action items yet.</p>
          </section>

          <section v-if="note.attachments?.length" class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
            <h2 class="text-ui-h2 text-ui-ink mb-3">Attachments</h2>
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
            <h2 class="text-ui-h3 text-ui-ink">Meeting</h2>
            <div>
              <p class="text-ui-cap text-ui-muted flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5 text-ui-faint" />Date & time</p>
              <p class="text-ui-body text-ui-ink mt-1 tabular-nums">{{ formatDateTime(note.meeting_date) }}</p>
            </div>

            <div v-if="note.attendees?.length">
              <p class="text-ui-cap text-ui-muted flex items-center gap-1.5"><Users class="w-3.5 h-3.5 text-ui-faint" />Internal Attendees:</p>
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                <UiBadge v-for="attendee in note.attendees" :key="attendee.id" tone="accent">{{ attendee.name }}</UiBadge>
              </div>
            </div>

            <div v-if="note.external_attendees?.length">
              <p class="text-ui-cap text-ui-muted flex items-center gap-1.5"><Building2 class="w-3.5 h-3.5 text-ui-faint" />External Attendees:</p>
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                <UiBadge v-for="(att, index) in note.external_attendees" :key="index" tone="neutral"
                  >{{ att.name }}<span v-if="att.organization">&nbsp;({{ att.organization }})</span></UiBadge
                >
              </div>
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 space-y-2.5 text-ui-small">
            <div class="flex items-center justify-between gap-3">
              <span class="text-ui-muted">Created by:</span>
              <span class="text-ui-ink font-medium text-right truncate">{{ note.creator?.name || "-" }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-ui-muted">Last edited by:</span>
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
