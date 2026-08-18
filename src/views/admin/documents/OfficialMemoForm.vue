<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { FileSignature, User, ShieldCheck, Paperclip, X, FileText } from "lucide-vue-next";
import { useDocumentLetterStore } from "@/stores/documentLetter";
import { useAuthStore } from "@/stores/auth";
import RichTextEditor from "@/components/common/RichTextEditor.vue";

const route = useRoute();
const router = useRouter();
const store = useDocumentLetterStore();
const authStore = useAuthStore();

const { error } = storeToRefs(store);

const isEditing = computed(() => !!route.params.id);
const saving = ref(false);

const form = ref({
  document_number: "",
  subject: "",
  document_date: new Date().toISOString().slice(0, 10),
  body: "",
});

const newAttachments = ref([]);
const existingAttachments = ref([]);
const removeAttachmentIds = ref([]);

onMounted(async () => {
  if (isEditing.value) {
    const memo = await store.fetchDocumentLetter(route.params.id);
    form.value = {
      document_number: memo.document_number,
      subject: memo.subject,
      document_date: memo.document_date?.slice(0, 10),
      body: memo.body,
    };
    existingAttachments.value = memo.attachments || [];
  }
});

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
  formData.append("subject", form.value.subject);
  formData.append("document_date", form.value.document_date);
  formData.append("body", form.value.body);
  newAttachments.value.forEach((file) => formData.append("attachments[]", file));
  removeAttachmentIds.value.forEach((id) => formData.append("remove_attachment_ids[]", id));
  return formData;
};

const handleSubmit = async () => {
  saving.value = true;
  try {
    const formData = buildFormData();
    const memo = isEditing.value
      ? await store.updateDocumentLetter(route.params.id, formData)
      : await store.createDocumentLetter(formData);
    router.push({ name: "admin.official-memos.detail", params: { id: memo.id } });
  } catch (err) {
    console.error(err);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex items-center gap-3">
      <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
        <FileSignature class="w-5 h-5 text-[#0C51D9]" />
      </div>
      <div>
        <h3 class="text-brand-dark text-lg font-bold">{{ isEditing ? "Edit Official Memo" : "Create Official Memo" }}</h3>
        <p class="text-brand-light text-sm">The Official Memo will be saved as Draft until you submit it for approval.</p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Memo Number</label>
          <input
            v-model="form.document_number"
            type="text"
            placeholder="Leave blank to auto-generate"
            class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Document Date</label>
          <input
            v-model="form.document_date"
            type="date"
            required
            class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Subject / Title</label>
        <input
          v-model="form.subject"
          type="text"
          required
          placeholder="e.g. Q3 Operational Budget Request"
          class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Sender</label>
          <div class="flex items-center gap-2 px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm bg-gray-50 text-brand-light">
            <User class="w-4 h-4" />
            {{ authStore.user?.name }}
          </div>
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Recipient</label>
          <div class="flex items-center gap-2 px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm bg-gray-50 text-brand-light">
            <ShieldCheck class="w-4 h-4" />
            Finance Manager
          </div>
        </div>
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Memo Content</label>
        <RichTextEditor v-model="form.body" placeholder="Dear ..." />
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
          <span class="text-brand-white text-sm font-semibold">{{ saving ? "Saving..." : "Save as Draft" }}</span>
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
