<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { User, ShieldCheck, Paperclip, X, FileText, ArrowLeft, Save, ArrowRight } from "lucide-vue-next";
import { useDocumentLetterStore } from "@/stores/documentLetter";
import { useAuthStore } from "@/stores/auth";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import SignatureToggle from "@/components/common/SignatureToggle.vue";
import { UiPageHeader, UiButton, UiCard, UiInput, UiAlert, UiBadge } from "@/components/ui";

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
  use_signature: false,
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
      use_signature: !!memo.use_signature,
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
  // "1"/"0" rather than true/false -- FormData stringifies, and Laravel's
  // boolean rule rejects the string "true".
  formData.append("use_signature", form.value.use_signature ? "1" : "0");
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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="isEditing ? 'Edit Official Memo' : 'Create Official Memo'"
      subtitle="The Official Memo will be saved as Draft until you submit it for approval."
      class="ui-anim-fade-up"
    >
      <template #eyebrow>
        <button
          type="button"
          class="ui-press inline-flex items-center gap-1 mb-1.5 text-ui-small font-medium text-ui-accent hover:underline"
          aria-label="Back"
          @click="router.back()"
        >
          <ArrowLeft class="w-4 h-4" />Back
        </button>
      </template>
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" @click="router.back()">Cancel</UiButton>
          <UiButton type="submit" form="memo-form" :icon="Save" :loading="saving">{{ saving ? "Saving..." : "Save as Draft" }}</UiButton>
        </div>
      </template>
    </UiPageHeader>

    <form id="memo-form" class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start" @submit.prevent="handleSubmit">
      <div class="lg:col-span-2 space-y-5 min-w-0 ui-stagger">
        <UiCard title="Memo">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput v-model="form.document_number" label="Memo Number" placeholder="Leave blank to auto-generate" mono />
            <UiInput v-model="form.document_date" type="date" label="Document Date" required />
            <UiInput v-model="form.subject" label="Subject / Title" required placeholder="e.g. Q3 Operational Budget Request" class="md:col-span-2" />
            <div class="md:col-span-2 min-w-0">
              <label class="block text-ui-small font-medium text-ui-ink mb-1.5">Memo Content<span class="text-ui-bad"> *</span></label>
              <RichTextEditor v-model="form.body" placeholder="Dear ..." />
            </div>
            <SignatureToggle v-model="form.use_signature" hint="Stamps the sender's signature onto the PDF." class="md:col-span-2" />
          </div>
        </UiCard>

        <UiCard title="Attachments">
          <div class="space-y-2">
            <div
              v-for="attachment in existingAttachments"
              :key="attachment.id"
              class="flex items-center justify-between gap-2 pl-3 pr-1 h-11 border border-ui-line rounded-ui-control text-ui-small"
            >
              <a :href="attachment.url" target="_blank" class="flex items-center gap-2 min-w-0 text-ui-accent hover:underline">
                <FileText class="w-4 h-4 shrink-0" />
                <span class="truncate">{{ attachment.original_name }}</span>
              </a>
              <button
                type="button"
                class="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                :aria-label="`Remove ${attachment.original_name}`"
                @click="removeExistingAttachment(attachment.id)"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
            <div
              v-for="(file, index) in newAttachments"
              :key="index"
              class="flex items-center justify-between gap-2 pl-3 pr-1 h-11 border border-ui-line rounded-ui-control text-ui-small"
            >
              <span class="flex items-center gap-2 min-w-0 text-ui-ink">
                <FileText class="w-4 h-4 shrink-0 text-ui-faint" />
                <span class="truncate">{{ file.name }}</span>
              </span>
              <button
                type="button"
                class="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                :aria-label="`Remove ${file.name}`"
                @click="removeNewAttachment(index)"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <label
              class="flex items-center gap-2 justify-center text-center border border-dashed border-ui-line-strong rounded-ui-control px-3 py-4 text-ui-small text-ui-muted cursor-pointer hover:border-ui-accent hover:text-ui-accent hover:bg-ui-accent-soft transition-colors"
            >
              <Paperclip class="w-4 h-4 shrink-0" />
              Add Attachment (PDF, DOC, PNG, JPG — max 5MB)
              <input type="file" multiple class="hidden" @change="onFileChange" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
            </label>
          </div>
        </UiCard>
      </div>

      <!-- Side panel: routing + actions -->
      <aside class="space-y-4 lg:sticky lg:top-4 min-w-0">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-ui-h3 text-ui-ink">Routing</h3>
            <UiBadge tone="neutral" dot>Draft</UiBadge>
          </div>
          <div class="mt-3 space-y-2">
            <div>
              <p class="text-ui-cap text-ui-muted mb-1">Sender</p>
              <div class="flex items-center gap-2 h-[38px] px-3 border border-ui-line rounded-ui-control bg-ui-subtle text-ui-body text-ui-text">
                <User class="w-4 h-4 text-ui-faint shrink-0" />
                <span class="truncate">{{ authStore.user?.name }}</span>
              </div>
            </div>
            <div class="flex justify-center text-ui-faint" aria-hidden="true"><ArrowRight class="w-4 h-4 rotate-90" /></div>
            <div>
              <p class="text-ui-cap text-ui-muted mb-1">Recipient</p>
              <div class="flex items-center gap-2 h-[38px] px-3 border border-ui-line rounded-ui-control bg-ui-subtle text-ui-body text-ui-text">
                <ShieldCheck class="w-4 h-4 text-ui-faint shrink-0" />
                Finance Manager
              </div>
            </div>
          </div>
          <p class="text-ui-cap text-ui-muted mt-3">
            {{ newAttachments.length + existingAttachments.length }} attachment(s)
          </p>
        </section>

        <UiAlert v-if="error" tone="bad" :message="typeof error === 'string' ? error : 'Please review the fields you\'ve filled in.'" />

        <div class="flex flex-col gap-2">
          <UiButton type="submit" size="lg" block :icon="Save" :loading="saving">{{ saving ? "Saving..." : "Save as Draft" }}</UiButton>
          <UiButton variant="secondary" size="lg" block class="sm:hidden" @click="router.back()">Cancel</UiButton>
        </div>
      </aside>
    </form>
  </div>
</template>
