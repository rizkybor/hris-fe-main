<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ArrowLeft, Paperclip, X, FileText, Plus, UserPlus, Search, Users } from "lucide-vue-next";
import { UiPageHeader, UiButton, UiInput, UiSelect, UiAlert } from "@/components/ui";
import { useMeetingNoteStore } from "@/stores/meetingNote";
import { useEmployeeStore } from "@/stores/employee";
import { useAuthStore } from "@/stores/auth";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import PresenceIndicator from "@/components/common/PresenceIndicator.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useMeetingNoteStore();
const employeeStore = useEmployeeStore();
const authStore = useAuthStore();

const { employees } = storeToRefs(employeeStore);
const { error, activeViewers } = storeToRefs(store);

// The creator doesn't check themselves in as an Internal Attendee -- they
// can already comment/be mentioned on their own note regardless (see
// MeetingNoteCommentController) -- so don't offer them as a pickable
// attendee at all.
const selectableEmployees = computed(() => {
  const selfId = authStore.user?.employee_profile?.id;
  return employees.value.filter((employee) => employee.id !== selfId);
});

const isEditing = computed(() => !!route.params.id);
const saving = ref(false);

// <input type="datetime-local"> works in the browser's local time with no
// zone ("2026-10-20T10:00"), while the API stores and returns UTC -- convert
// both ways so the form shows the same time as the detail page and list.
const toLocalInput = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const toIsoString = (localValue) => (localValue ? new Date(localValue).toISOString() : "");

const form = ref({
  document_number: "",
  title: "",
  meeting_type: "internal",
  meeting_date: toLocalInput(),
  body: "",
  attendee_employee_ids: [],
});

const actionItems = ref([]);
const externalAttendees = ref([]);
const newExternalName = ref("");
const newExternalOrg = ref("");

const newAttachments = ref([]);
const existingAttachments = ref([]);
const removeAttachmentIds = ref([]);

const attendeeSearch = ref("");
const filteredEmployees = computed(() => {
  if (!attendeeSearch.value.trim()) return selectableEmployees.value;
  const q = attendeeSearch.value.trim().toLowerCase();
  return selectableEmployees.value.filter((employee) => (employee.user?.name || employee.name || "").toLowerCase().includes(q));
});

let heartbeatTimer = null;

onMounted(async () => {
  await employeeStore.fetchEmployees({});

  if (isEditing.value) {
    const note = await store.fetchMeetingNote(route.params.id);
    form.value = {
      document_number: note.document_number,
      title: note.title,
      meeting_type: note.meeting_type,
      meeting_date: toLocalInput(note.meeting_date),
      body: note.body || "",
      attendee_employee_ids: (note.attendees || [])
        .map((a) => a.id)
        .filter((id) => id !== authStore.user?.employee_profile?.id),
    };
    actionItems.value = note.action_items || [];
    externalAttendees.value = note.external_attendees || [];
    existingAttachments.value = note.attachments || [];

    // Presence heartbeat: let other collaborators know this document is
    // being edited right now (polling-based, see PresenceIndicator).
    store.sendHeartbeat(route.params.id, true);
    store.fetchActiveViewers(route.params.id);
    heartbeatTimer = setInterval(() => {
      store.sendHeartbeat(route.params.id, true);
      store.fetchActiveViewers(route.params.id);
    }, 8000);
  }
});

onUnmounted(() => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
});

const toggleAttendee = (employeeId) => {
  const idx = form.value.attendee_employee_ids.indexOf(employeeId);
  if (idx === -1) {
    form.value.attendee_employee_ids.push(employeeId);
  } else {
    form.value.attendee_employee_ids.splice(idx, 1);
  }
};

const addExternalAttendee = () => {
  if (!newExternalName.value.trim()) return;
  externalAttendees.value.push({ name: newExternalName.value.trim(), organization: newExternalOrg.value.trim() });
  newExternalName.value = "";
  newExternalOrg.value = "";
};
const removeExternalAttendee = (index) => externalAttendees.value.splice(index, 1);

const addActionItem = () => actionItems.value.push({ text: "", done: false, assignee: "" });
const removeActionItem = (index) => actionItems.value.splice(index, 1);

const onFileChange = (e) => {
  newAttachments.value.push(...Array.from(e.target.files || []));
  e.target.value = "";
};
const removeNewAttachment = (index) => newAttachments.value.splice(index, 1);
const removeExistingAttachment = (attachmentId) => {
  removeAttachmentIds.value.push(attachmentId);
  existingAttachments.value = existingAttachments.value.filter((a) => a.id !== attachmentId);
};

const buildFormData = () => {
  const formData = new FormData();
  if (form.value.document_number) formData.append("document_number", form.value.document_number);
  formData.append("title", form.value.title);
  formData.append("meeting_type", form.value.meeting_type);
  formData.append("meeting_date", toIsoString(form.value.meeting_date));
  formData.append("body", form.value.body);
  form.value.attendee_employee_ids.forEach((id) => formData.append("attendee_employee_ids[]", id));
  actionItems.value
    .filter((item) => item.text.trim())
    .forEach((item, i) => {
      formData.append(`action_items[${i}][text]`, item.text);
      formData.append(`action_items[${i}][done]`, item.done ? "1" : "0");
      formData.append(`action_items[${i}][assignee]`, item.assignee || "");
    });
  externalAttendees.value.forEach((att, i) => {
    formData.append(`external_attendees[${i}][name]`, att.name);
    formData.append(`external_attendees[${i}][organization]`, att.organization || "");
  });
  newAttachments.value.forEach((file) => formData.append("attachments[]", file));
  removeAttachmentIds.value.forEach((id) => formData.append("remove_attachment_ids[]", id));
  return formData;
};

// Presentation only.
const TYPE_OPTIONS = computed(() => [
  { value: "internal", label: t("documents.meetingNote.types.internal") },
  { value: "external", label: t("documents.meetingNote.types.external") },
]);
const fieldClass =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow";
const removeBtn =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-faint hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus shrink-0";

const handleSubmit = async () => {
  saving.value = true;
  try {
    const formData = buildFormData();
    const note = isEditing.value
      ? await store.updateMeetingNote(route.params.id, formData)
      : await store.createMeetingNote(formData);
    router.push({ name: "admin.meeting-notes.detail", params: { id: note.id } });
  } catch (err) {
    console.error(err);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="isEditing ? $t('documents.meetingNote.form.editTitle') : $t('documents.meetingNote.list.create')"
      :subtitle="$t('documents.meetingNote.form.subtitle')"
    >
      <template #eyebrow>
        <button type="button" class="inline-flex items-center gap-1 text-ui-small text-ui-accent hover:underline mb-1.5" @click="router.back()">
          <ArrowLeft class="w-3.5 h-3.5" />
          {{ $t("common.actions.back") }}
        </button>
      </template>
      <template #actions>
        <PresenceIndicator :viewers="activeViewers" />
      </template>
    </UiPageHeader>

    <form @submit.prevent="handleSubmit" class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
      <div class="p-4 sm:p-6 space-y-6">
        <!-- Basics -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <UiInput v-model="form.document_number" :label="$t('documents.meetingNote.fields.number')" :placeholder="$t('documents.shared.autoNumberPlaceholder')" mono />
          <UiSelect v-model="form.meeting_type" :label="$t('documents.meetingNote.fields.type')" :options="TYPE_OPTIONS" />
          <UiInput v-model="form.meeting_date" type="datetime-local" :label="$t('documents.meetingNote.fields.dateTime')" required class="sm:col-span-2 lg:col-span-1" />
          <UiInput
            v-model="form.title"
            :label="$t('documents.meetingNote.fields.titleSubject')"
            required
            :placeholder="$t('documents.meetingNote.form.titlePlaceholder')"
            class="sm:col-span-2 lg:col-span-3"
          />
        </div>

        <!-- Attendees -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="min-w-0">
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-ui-small font-medium text-ui-ink block">{{ $t("documents.meetingNote.fields.internalAttendees") }}</label>
              <span v-if="form.attendee_employee_ids.length" class="text-ui-cap text-ui-accent font-medium flex items-center gap-1 tabular-nums">
                <Users class="w-3.5 h-3.5" />
                {{ $t("documents.meetingNote.form.selected", { n: form.attendee_employee_ids.length }) }}
              </span>
            </div>
            <div class="border border-ui-line-strong rounded-ui-control overflow-hidden">
              <div v-if="selectableEmployees.length > 8" class="relative border-b border-ui-line bg-ui-subtle p-2">
                <Search class="w-3.5 h-3.5 text-ui-faint absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  v-model="attendeeSearch"
                  type="text"
                  :placeholder="$t('documents.meetingNote.form.searchAttendees')"
                  class="w-full h-8 pl-7 pr-2 bg-ui-surface text-ui-small text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
                />
              </div>
              <div class="p-1.5 max-h-64 overflow-y-auto">
                <label
                  v-for="employee in filteredEmployees"
                  :key="employee.id"
                  class="flex items-center gap-2.5 text-ui-small px-2.5 h-9 rounded-ui-control cursor-pointer hover:bg-ui-hover"
                  :class="form.attendee_employee_ids.includes(employee.id) ? 'text-ui-ink font-medium' : 'text-ui-text'"
                >
                  <input
                    type="checkbox"
                    :checked="form.attendee_employee_ids.includes(employee.id)"
                    @change="toggleAttendee(employee.id)"
                    class="w-4 h-4 accent-ui-accent shrink-0"
                  />
                  <span class="truncate">{{ employee.user?.name || employee.name }}</span>
                </label>
                <p v-if="selectableEmployees.length === 0" class="text-ui-small text-ui-muted px-2.5 py-2">{{ $t("documents.meetingNote.form.noStaff") }}</p>
                <p v-else-if="filteredEmployees.length === 0" class="text-ui-small text-ui-muted px-2.5 py-2">{{ $t("documents.meetingNote.form.noAttendeeMatch", { q: attendeeSearch }) }}</p>
              </div>
            </div>
          </div>

          <div class="min-w-0">
            <label class="text-ui-small font-medium text-ui-ink mb-1.5 block">{{ $t("documents.meetingNote.fields.externalAttendees") }}</label>
            <div class="border border-ui-line-strong rounded-ui-control p-2 space-y-1.5">
              <div
                v-for="(att, index) in externalAttendees"
                :key="index"
                class="flex items-center justify-between gap-2 text-ui-small pl-2.5 pr-0.5 h-9 rounded-ui-control bg-ui-subtle"
              >
                <span class="truncate text-ui-ink">{{ att.name }}<span v-if="att.organization" class="text-ui-muted"> &middot; {{ att.organization }}</span></span>
                <button type="button" @click="removeExternalAttendee(index)" :class="removeBtn" :aria-label="$t('documents.meetingNote.form.removeAttendee')">
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="flex gap-1.5">
                <input v-model="newExternalName" type="text" :placeholder="$t('common.labels.name')" :class="[fieldClass, 'flex-1 min-w-0']" />
                <input v-model="newExternalOrg" type="text" :placeholder="$t('documents.meetingNote.form.organization')" :class="[fieldClass, 'flex-1 min-w-0']" />
                <UiButton variant="secondary" :icon="UserPlus" :aria-label="$t('documents.meetingNote.form.addExternal')" :title="$t('documents.meetingNote.form.addExternal')" @click="addExternalAttendee" />
              </div>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="min-w-0">
          <label class="text-ui-small font-medium text-ui-ink mb-1.5 block">{{ $t("documents.meetingNote.fields.body") }}</label>
          <RichTextEditor v-model="form.body" :placeholder="$t('documents.meetingNote.form.bodyPlaceholder')" />
        </div>

        <!-- Action items -->
        <div class="min-w-0">
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-ui-small font-medium text-ui-ink block">{{ $t("documents.meetingNote.fields.actionItems") }}</label>
            <UiButton variant="ghost" size="sm" :icon="Plus" @click="addActionItem">{{ $t("documents.shared.addItem") }}</UiButton>
          </div>
          <div class="space-y-2">
            <div
              v-for="(item, index) in actionItems"
              :key="index"
              class="grid grid-cols-[auto,1fr,auto] sm:grid-cols-[auto,1fr,10rem,auto] items-center gap-2"
            >
              <input type="checkbox" v-model="item.done" class="w-4 h-4 accent-ui-accent shrink-0" :aria-label="$t('common.actions.done')" />
              <input v-model="item.text" type="text" :placeholder="$t('documents.meetingNote.form.actionPlaceholder')" :class="[fieldClass, 'min-w-0']" />
              <input
                v-model="item.assignee"
                type="text"
                :placeholder="$t('documents.meetingNote.form.assignee')"
                :class="[fieldClass, 'min-w-0 col-start-2 row-start-2 sm:col-start-auto sm:row-start-auto']"
              />
              <button type="button" @click="removeActionItem(index)" :class="[removeBtn, 'col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto']" :aria-label="$t('documents.shared.removeLine')">
                <X class="w-4 h-4" />
              </button>
            </div>
            <p v-if="actionItems.length === 0" class="text-ui-small text-ui-muted">{{ $t("documents.meetingNote.form.noActionItems") }}</p>
          </div>
        </div>

        <!-- Attachments -->
        <div class="min-w-0">
          <label class="text-ui-small font-medium text-ui-ink mb-1.5 block">{{ $t("documents.memo.fields.attachments") }}</label>
          <div class="space-y-2">
            <div
              v-for="attachment in existingAttachments"
              :key="attachment.id"
              class="flex items-center justify-between gap-2 pl-3 pr-1 h-10 border border-ui-line rounded-ui-control text-ui-small"
            >
              <a :href="attachment.url" target="_blank" class="flex items-center gap-2 text-ui-accent hover:underline min-w-0">
                <FileText class="w-4 h-4 shrink-0 text-ui-faint" />
                <span class="truncate">{{ attachment.original_name }}</span>
              </a>
              <button type="button" @click="removeExistingAttachment(attachment.id)" :class="removeBtn" :aria-label="$t('documents.shared.removeAttachment')">
                <X class="w-4 h-4" />
              </button>
            </div>
            <div
              v-for="(file, index) in newAttachments"
              :key="index"
              class="flex items-center justify-between gap-2 pl-3 pr-1 h-10 border border-ui-line rounded-ui-control text-ui-small"
            >
              <span class="flex items-center gap-2 min-w-0 text-ui-ink">
                <FileText class="w-4 h-4 shrink-0 text-ui-faint" />
                <span class="truncate">{{ file.name }}</span>
              </span>
              <button type="button" @click="removeNewAttachment(index)" :class="removeBtn" :aria-label="$t('documents.shared.removeAttachment')">
                <X class="w-4 h-4" />
              </button>
            </div>

            <label
              class="flex items-center gap-2 justify-center text-center border border-dashed border-ui-line-strong rounded-ui-control px-3 py-3 text-ui-small text-ui-muted cursor-pointer hover:border-ui-accent hover:text-ui-accent hover:bg-ui-accent-soft/40 transition-colors"
            >
              <Paperclip class="w-4 h-4 shrink-0" />
              {{ $t("documents.memo.form.addAttachment") }}
              <input type="file" multiple class="hidden" @change="onFileChange" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
            </label>
          </div>
        </div>

        <UiAlert v-if="error" tone="bad">
          {{ typeof error === "string" ? error : $t("documents.shared.reviewFields") }}
        </UiAlert>
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end items-stretch sm:items-center gap-2 px-4 sm:px-6 py-4 border-t border-ui-line bg-ui-subtle/60 rounded-b-ui-card">
        <UiButton variant="secondary" @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" :loading="saving">{{ saving ? $t("common.actions.saving") : $t("common.actions.save") }}</UiButton>
      </div>
    </form>
  </div>
</template>
