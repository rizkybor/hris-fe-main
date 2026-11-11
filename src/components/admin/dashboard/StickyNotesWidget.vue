<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiEmpty } from "@/components/ui";
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

// One quiet colour stripe per note, cycling through the status hues.
const NOTE_COLORS = ["bg-ui-warn", "bg-ui-accent", "bg-ui-ok", "bg-ui-info"];
const colorFor = (index) => NOTE_COLORS[index % NOTE_COLORS.length];
</script>

<template>
  <DashboardWidgetCard v-if="can('meeting-note-pin')" title="Sticky Notes" subtitle="Pinned meeting notes">
    <UiEmpty
      v-if="pinnedMeetingNotes.length === 0"
      :icon="Pin"
      title="No pinned notes"
      message="Pin an important note from Business Documents so it shows up here."
      compact
    />
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <RouterLink
        v-for="(note, index) in pinnedMeetingNotes"
        :key="note.id"
        :to="{ name: 'admin.meeting-notes.detail', params: { id: note.id } }"
        class="ui-lift group relative rounded-ui-card border border-ui-line bg-ui-subtle/60 p-4 pl-5 hover:border-ui-line-strong flex flex-col gap-1.5 overflow-hidden"
      >
        <span class="absolute left-0 inset-y-0 w-1" :class="colorFor(index)" aria-hidden="true"></span>
        <div class="flex items-start justify-between gap-2">
          <p class="text-ui-h3 text-ui-ink truncate">{{ note.title }}</p>
          <ChevronRight class="w-4 h-4 text-ui-faint group-hover:text-ui-ink shrink-0" />
        </div>
        <p class="text-ui-cap text-ui-muted line-clamp-3">{{ previewText(note.body) || "Tidak ada catatan." }}</p>
      </RouterLink>
    </div>
  </DashboardWidgetCard>
</template>
