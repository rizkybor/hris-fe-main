<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Pin, ChevronRight } from "lucide-vue-next";
import { useMeetingNoteStore } from "@/stores/meetingNote";
import { can } from "@/helpers/permissionHelper";

const store = useMeetingNoteStore();
const { pinnedMeetingNotes } = storeToRefs(store);

onMounted(() => {
  if (can("meeting-note-pin")) {
    store.fetchPinnedMeetingNotes();
  }
});

// Strip HTML tags for the sticky-note preview -- the widget shows plain
// text, not the rich-text body itself.
const previewText = (html) => (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const NOTE_COLORS = [
  "bg-amber-50 border-amber-200",
  "bg-blue-50 border-blue-200",
  "bg-green-50 border-green-200",
  "bg-pink-50 border-pink-200",
];
const colorFor = (index) => NOTE_COLORS[index % NOTE_COLORS.length];
</script>

<template>
  <div v-if="can('meeting-note-pin')" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
    <div class="flex items-center gap-2 mb-4">
      <Pin class="w-4 h-4 text-amber-500" />
      <h3 class="text-brand-dark text-lg font-bold">Sticky Notes</h3>
    </div>

    <div v-if="pinnedMeetingNotes.length === 0" class="text-center py-6 text-sm text-gray-400">
      No Meeting Notes pinned yet. Pin an important note from Document Letters so it shows up here.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <router-link
        v-for="(note, index) in pinnedMeetingNotes"
        :key="note.id"
        :to="{ name: 'admin.meeting-notes.detail', params: { id: note.id } }"
        class="rounded-[12px] border p-4 hover:shadow-sm transition-all flex flex-col gap-2"
        :class="colorFor(index)"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-brand-dark text-sm font-bold truncate">{{ note.title }}</p>
          <ChevronRight class="w-4 h-4 text-gray-400 shrink-0" />
        </div>
        <p class="text-brand-light text-xs line-clamp-3">{{ previewText(note.body) || "Tidak ada catatan." }}</p>
      </router-link>
    </div>
  </div>
</template>
