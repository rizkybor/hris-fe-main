<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { NotebookPen, Paperclip, X, FileText, Plus, UserPlus, Search, Users } from "lucide-vue-next";
import { useMeetingNoteStore } from "@/stores/meetingNote";
import { useEmployeeStore } from "@/stores/employee";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import PresenceIndicator from "@/components/common/PresenceIndicator.vue";

const route = useRoute();
const router = useRouter();
const store = useMeetingNoteStore();
const employeeStore = useEmployeeStore();

const { employees } = storeToRefs(employeeStore);
const { error, activeViewers } = storeToRefs(store);

const isEditing = computed(() => !!route.params.id);
const saving = ref(false);

const form = ref({
  document_number: "",
  title: "",
  meeting_type: "internal",
  meeting_date: new Date().toISOString().slice(0, 16),
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
  if (!attendeeSearch.value.trim()) return employees.value;
  const q = attendeeSearch.value.trim().toLowerCase();
  return employees.value.filter((employee) => (employee.user?.name || employee.name || "").toLowerCase().includes(q));
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
      meeting_date: note.meeting_date?.slice(0, 16),
      body: note.body || "",
      attendee_employee_ids: note.attendees?.map((a) => a.id) || [],
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
  formData.append("meeting_date", form.value.meeting_date);
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
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex items-start justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <NotebookPen class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">{{ isEditing ? "Edit Meeting Note" : "Create Meeting Note" }}</h3>
          <p class="text-brand-light text-sm">Meeting notes can be managed together by Manager, Operational Director, HR, and Finance Manager.</p>
        </div>
      </div>
      <PresenceIndicator :viewers="activeViewers" />
    </div>

    <form @submit.prevent="handleSubmit" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-5">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Document Number</label>
          <input
            v-model="form.document_number"
            type="text"
            placeholder="Leave blank to auto-generate"
            class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Meeting Type</label>
          <select
            v-model="form.meeting_type"
            class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          >
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Meeting Date & Time</label>
          <input
            v-model="form.meeting_date"
            type="datetime-local"
            required
            class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Meeting Title / Subject</label>
        <input
          v-model="form.title"
          type="text"
          required
          placeholder="e.g. Weekly Operations Sync"
          class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-sm font-semibold text-brand-dark block">Internal Attendees</label>
            <span v-if="form.attendee_employee_ids.length" class="text-xs text-[#0C51D9] font-semibold flex items-center gap-1">
              <Users class="w-3.5 h-3.5" />
              {{ form.attendee_employee_ids.length }} selected
            </span>
          </div>
          <div class="border border-[#DCDEDD] rounded-xl overflow-hidden">
            <div v-if="employees.length > 8" class="relative border-b border-[#DCDEDD] bg-gray-50 p-2">
              <Search class="w-3.5 h-3.5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                v-model="attendeeSearch"
                type="text"
                placeholder="Search attendees..."
                class="w-full pl-7 pr-2 py-1.5 border border-[#DCDEDD] rounded-lg text-xs bg-white focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
              />
            </div>
            <div class="p-3 max-h-64 overflow-y-auto space-y-1">
              <label
                v-for="employee in filteredEmployees"
                :key="employee.id"
                class="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  :checked="form.attendee_employee_ids.includes(employee.id)"
                  @change="toggleAttendee(employee.id)"
                  class="rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9] shrink-0"
                />
                <span class="truncate">{{ employee.user?.name || employee.name }}</span>
              </label>
              <p v-if="employees.length === 0" class="text-sm text-gray-400 italic py-2">No active staff data yet.</p>
              <p v-else-if="filteredEmployees.length === 0" class="text-sm text-gray-400 italic py-2">No attendees match "{{ attendeeSearch }}".</p>
            </div>
          </div>
        </div>

        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">External Attendees</label>
          <div class="border border-[#DCDEDD] rounded-xl p-3 space-y-2">
            <div v-for="(att, index) in externalAttendees" :key="index" class="flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded-lg bg-gray-50">
              <span class="truncate">{{ att.name }}<span v-if="att.organization" class="text-gray-400"> &middot; {{ att.organization }}</span></span>
              <button type="button" @click="removeExternalAttendee(index)" class="text-gray-400 hover:text-red-500 shrink-0">
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
            <div class="flex gap-1.5">
              <input v-model="newExternalName" type="text" placeholder="Name" class="flex-1 min-w-0 px-2 py-1.5 border border-[#DCDEDD] rounded-lg text-xs" />
              <input v-model="newExternalOrg" type="text" placeholder="Organization" class="flex-1 min-w-0 px-2 py-1.5 border border-[#DCDEDD] rounded-lg text-xs" />
              <button type="button" @click="addExternalAttendee" class="shrink-0 px-2.5 py-1.5 rounded-lg border border-[#DCDEDD] hover:border-[#0C51D9] hover:text-[#0C51D9]">
                <UserPlus class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Notes Content</label>
        <RichTextEditor v-model="form.body" placeholder="Meeting discussion summary..." />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-sm font-semibold text-brand-dark block">Action Items</label>
          <button type="button" @click="addActionItem" class="text-xs text-[#0C51D9] font-semibold hover:underline flex items-center gap-1">
            <Plus class="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
        <div class="space-y-2">
          <div v-for="(item, index) in actionItems" :key="index" class="flex items-center gap-2">
            <input type="checkbox" v-model="item.done" class="rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9] shrink-0" />
            <input v-model="item.text" type="text" placeholder="Action item description" class="flex-1 min-w-0 px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
            <input v-model="item.assignee" type="text" placeholder="Assignee" class="w-32 shrink-0 px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
            <button type="button" @click="removeActionItem(index)" class="text-gray-400 hover:text-red-500 shrink-0">
              <X class="w-4 h-4" />
            </button>
          </div>
          <p v-if="actionItems.length === 0" class="text-sm text-gray-400 italic">No action items yet.</p>
        </div>
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Attachments</label>
        <div class="space-y-2">
          <div
            v-for="attachment in existingAttachments"
            :key="attachment.id"
            class="flex items-center justify-between gap-2 px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm"
          >
            <a :href="attachment.url" target="_blank" class="flex items-center gap-2 text-[#0C51D9] hover:underline truncate">
              <FileText class="w-4 h-4 shrink-0" />
              {{ attachment.original_name }}
            </a>
            <button type="button" @click="removeExistingAttachment(attachment.id)" class="text-gray-400 hover:text-red-500 shrink-0">
              <X class="w-4 h-4" />
            </button>
          </div>
          <div
            v-for="(file, index) in newAttachments"
            :key="index"
            class="flex items-center justify-between gap-2 px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm"
          >
            <span class="flex items-center gap-2 truncate">
              <FileText class="w-4 h-4 shrink-0 text-gray-400" />
              {{ file.name }}
            </span>
            <button type="button" @click="removeNewAttachment(index)" class="text-gray-400 hover:text-red-500 shrink-0">
              <X class="w-4 h-4" />
            </button>
          </div>

          <label class="flex items-center gap-2 justify-center border border-dashed border-[#DCDEDD] rounded-lg py-3 text-sm text-brand-light cursor-pointer hover:border-[#0C51D9] hover:text-[#0C51D9] transition-colors">
            <Paperclip class="w-4 h-4" />
            Add Attachment (PDF, DOC, PNG, JPG — max 5MB)
            <input type="file" multiple class="hidden" @change="onFileChange" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
          </label>
        </div>
      </div>

      <p v-if="error" class="text-red-500 text-sm">
        {{ typeof error === "string" ? error : "Please review the fields you've filled in." }}
      </p>

      <div class="flex items-center gap-3 pt-2 border-t border-[#F1F1F1]">
        <button
          type="submit"
          :disabled="saving"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-5 py-2.5 disabled:opacity-50"
        >
          <span class="text-brand-white text-sm font-semibold">{{ saving ? "Saving..." : "Save" }}</span>
        </button>
        <button
          type="button"
          @click="router.back()"
          class="px-5 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>
