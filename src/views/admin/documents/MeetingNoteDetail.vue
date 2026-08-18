<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { NotebookPen, Pencil, Trash2, Pin, PinOff, FileText, Users, Calendar, Building2, CheckSquare, Square } from "lucide-vue-next";
import { useMeetingNoteStore } from "@/stores/meetingNote";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import PresenceIndicator from "@/components/common/PresenceIndicator.vue";

const route = useRoute();
const router = useRouter();
const store = useMeetingNoteStore();
const alertModal = useAlertModalStore();

const { currentMeetingNote: note, loading, activeViewers } = storeToRefs(store);

const pinBusy = ref(false);
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
const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : "-";

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
  <div>
    <div v-if="loading" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-3">
      <Skeleton width="40%" height="24px" />
      <Skeleton width="100%" height="200px" />
    </div>

    <template v-else-if="note">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
            <NotebookPen class="w-5 h-5 text-[#0C51D9]" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-brand-dark text-lg font-bold">{{ note.title }}</h3>
              <span class="px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 text-[#0C51D9] shrink-0">
                {{ TYPE_LABEL[note.meeting_type] }}
              </span>
            </div>
            <p class="text-brand-light text-sm font-mono">{{ note.document_number }}</p>
            <PresenceIndicator :viewers="activeViewers" class="mt-2" />
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            v-if="can('meeting-note-pin')"
            @click="togglePin"
            :disabled="pinBusy"
            class="px-3 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-amber-50 hover:border-amber-300 flex items-center gap-2 disabled:opacity-50"
          >
            <PinOff v-if="note.is_pinned" class="w-4 h-4 text-amber-600" />
            <Pin v-else class="w-4 h-4" />
            {{ note.is_pinned ? "Unpin" : "Pin to Dashboard" }}
          </button>
          <router-link
            v-if="can('meeting-note-edit')"
            :to="{ name: 'admin.meeting-notes.edit', params: { id: note.id } }"
            class="px-4 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50 flex items-center gap-2"
          >
            <Pencil class="w-4 h-4" />
            Edit
          </router-link>
          <button
            v-if="can('meeting-note-delete')"
            @click="handleDelete"
            class="px-4 py-2.5 rounded-lg border border-[#DCDEDD] text-red-600 text-sm font-semibold hover:bg-red-50 hover:border-red-300 flex items-center gap-2"
          >
            <Trash2 class="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
            <h4 class="text-brand-dark text-sm font-bold mb-3">Notes Content</h4>
            <div v-if="note.body" class="memo-body text-sm text-brand-dark leading-relaxed" v-html="note.body"></div>
            <p v-else class="text-sm text-gray-400 italic">No notes yet.</p>
          </div>

          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
            <h4 class="text-brand-dark text-sm font-bold mb-3">Action Items</h4>
            <div v-if="note.action_items?.length" class="space-y-2">
              <div v-for="(item, index) in note.action_items" :key="index" class="flex items-center gap-2 text-sm">
                <CheckSquare v-if="item.done" class="w-4 h-4 text-green-600 shrink-0" />
                <Square v-else class="w-4 h-4 text-gray-300 shrink-0" />
                <span :class="item.done ? 'line-through text-gray-400' : 'text-brand-dark'">{{ item.text }}</span>
                <span v-if="item.assignee" class="text-xs text-brand-light ml-auto shrink-0">Assignee: {{ item.assignee }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-gray-400 italic">No action items yet.</p>
          </div>

          <div v-if="note.attachments?.length" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
            <h4 class="text-brand-dark text-sm font-bold mb-3">Attachments</h4>
            <div class="space-y-2">
              <a
                v-for="attachment in note.attachments"
                :key="attachment.id"
                :href="attachment.url"
                target="_blank"
                class="flex items-center gap-2 px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm text-[#0C51D9] hover:underline"
              >
                <FileText class="w-4 h-4 shrink-0" />
                {{ attachment.original_name }}
              </a>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-3">
            <div class="flex items-center gap-2 text-sm">
              <Calendar class="w-4 h-4 text-gray-400 shrink-0" />
              <span class="text-brand-dark font-medium">{{ formatDateTime(note.meeting_date) }}</span>
            </div>

            <div v-if="note.attendees?.length" class="flex items-start gap-2 text-sm">
              <Users class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span class="text-brand-light">Internal Attendees:</span>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="attendee in note.attendees"
                    :key="attendee.id"
                    class="px-2 py-0.5 rounded-md bg-blue-50 text-[#0C51D9] text-xs font-medium"
                  >
                    {{ attendee.name }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="note.external_attendees?.length" class="flex items-start gap-2 text-sm">
              <Building2 class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span class="text-brand-light">External Attendees:</span>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="(att, index) in note.external_attendees"
                    :key="index"
                    class="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium"
                  >
                    {{ att.name }}<span v-if="att.organization"> ({{ att.organization }})</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-1.5 text-xs text-brand-light">
            <p>Created by: <span class="text-brand-dark font-medium">{{ note.creator?.name || "-" }}</span></p>
            <p>Last edited by: <span class="text-brand-dark font-medium">{{ note.updater?.name || "-" }}</span></p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.memo-body :deep(p) { margin-bottom: 0.75rem; }
.memo-body :deep(ul) { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.memo-body :deep(ol) { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.memo-body :deep(h1) { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
.memo-body :deep(h2) { font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0; }
.memo-body :deep(h3) { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0; }
.memo-body :deep(blockquote) { border-left: 3px solid #0c51d9; padding-left: 0.75rem; color: #6b7280; margin: 0.5rem 0; }
.memo-body :deep(a) { color: #0c51d9; text-decoration: underline; }
.memo-body :deep(hr) { border: none; border-top: 1px solid #dcdedd; margin: 0.75rem 0; }
</style>
