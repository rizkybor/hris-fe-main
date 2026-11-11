<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import {
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  Calendar,
  User,
  Download,
  Paperclip,
  ArrowLeft,
} from "lucide-vue-next";
import { useDocumentLetterStore } from "@/stores/documentLetter";
import { useAuthStore } from "@/stores/auth";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiBadge, UiAlert, UiModal, UiInput } from "@/components/ui";

const route = useRoute();
const router = useRouter();
const store = useDocumentLetterStore();
const authStore = useAuthStore();
const alertModal = useAlertModalStore();

const { currentDocumentLetter: memo, loading } = storeToRefs(store);

const busy = ref(false);
const isRejectModalOpen = ref(false);
const rejectionReason = ref("");

const load = () => store.fetchDocumentLetter(route.params.id);
onMounted(load);

const isAuthor = computed(() => memo.value?.creator?.id === authStore.user?.id);
const isFinanceManager = computed(() => authStore.user?.roles?.includes("finance"));

const canEdit = computed(() => can("document-letter-edit") && isAuthor.value && memo.value?.status === "draft");
const canSubmit = computed(() => canEdit.value);
const canApprove = computed(() => can("document-letter-approve") && isFinanceManager.value && memo.value?.status === "pending");

const STATUS_LABEL = { draft: "Draft", pending: "Pending", approved: "Approved", rejected: "Rejected" };
// Presentation only: status → badge tone.
const STATUS_TONE = { draft: "neutral", pending: "warn", approved: "ok", rejected: "bad" };

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" }) : "-";
const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

const handleSubmit = async () => {
  if (!(await alertModal.confirm("Submit this Official Memo for Finance Manager approval?", { type: "info", confirmText: "Submit" })))
    return;
  busy.value = true;
  try {
    await store.submitDocumentLetter(memo.value.id);
    await load();
  } finally {
    busy.value = false;
  }
};

const handleApprove = async () => {
  if (!(await alertModal.confirm("Approve this Official Memo?", { type: "success", confirmText: "Approve" }))) return;
  busy.value = true;
  try {
    await store.approveDocumentLetter(memo.value.id);
    await load();
  } finally {
    busy.value = false;
  }
};

const openRejectModal = () => {
  rejectionReason.value = "";
  isRejectModalOpen.value = true;
};

const handleReject = async () => {
  if (!rejectionReason.value.trim()) return;
  busy.value = true;
  try {
    await store.rejectDocumentLetter(memo.value.id, rejectionReason.value.trim());
    isRejectModalOpen.value = false;
    await load();
  } finally {
    busy.value = false;
  }
};

const downloading = ref(false);
const handleDownload = async () => {
  downloading.value = true;
  try {
    await store.downloadPdf(memo.value.id, memo.value.document_number);
  } finally {
    downloading.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <div v-if="loading" class="space-y-5">
      <div class="space-y-2">
        <Skeleton width="120px" height="16px" />
        <Skeleton width="40%" height="28px" />
        <Skeleton width="180px" height="16px" />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
          <Skeleton width="30%" height="20px" />
          <Skeleton width="100%" height="200px" />
        </div>
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
          <Skeleton width="60%" height="16px" />
          <Skeleton width="80%" height="16px" />
          <Skeleton width="70%" height="16px" />
        </div>
      </div>
    </div>

    <template v-else-if="memo">
      <UiPageHeader :title="memo.subject" class="ui-anim-fade-up">
        <template #eyebrow>
          <router-link
            :to="{ name: 'admin.official-memos.dashboard' }"
            class="ui-press inline-flex items-center gap-1 mb-1.5 text-ui-small font-medium text-ui-accent hover:underline"
          >
            <ArrowLeft class="w-4 h-4" />
            Back to Official Memos
          </router-link>
        </template>
        <template #subtitle>
          <span class="inline-flex items-center gap-2 flex-wrap">
            <UiBadge :tone="STATUS_TONE[memo.status]" dot>{{ STATUS_LABEL[memo.status] }}</UiBadge>
            <span class="font-mono">{{ memo.document_number }}</span>
          </span>
        </template>
        <template #actions>
          <UiButton variant="secondary" :icon="Download" :loading="downloading" @click="handleDownload">
            {{ downloading ? "Downloading..." : "Download PDF" }}
          </UiButton>
          <UiButton v-if="canEdit" variant="secondary" :icon="Pencil" :to="{ name: 'admin.official-memos.edit', params: { id: memo.id } }">Edit</UiButton>
          <UiButton v-if="canSubmit" :icon="Send" :disabled="busy" @click="handleSubmit">Submit</UiButton>
          <UiButton v-if="canApprove" variant="danger" :icon="XCircle" :disabled="busy" @click="openRejectModal">Reject</UiButton>
          <UiButton v-if="canApprove" :icon="CheckCircle2" :disabled="busy" @click="handleApprove">Approve</UiButton>
        </template>
      </UiPageHeader>

      <UiAlert v-if="memo.status === 'rejected' && memo.rejection_reason" tone="bad" title="Rejection Reason" :message="memo.rejection_reason" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div class="lg:col-span-2 space-y-5 min-w-0 ui-stagger">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
            <h3 class="text-ui-h2 text-ui-ink mb-3">Memo Content</h3>
            <div class="rich-text-content text-ui-body text-ui-text leading-relaxed" v-html="memo.body"></div>
          </section>

          <section v-if="memo.attachments?.length" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
            <h3 class="text-ui-h2 text-ui-ink mb-3">Attachments</h3>
            <div class="space-y-2">
              <a
                v-for="attachment in memo.attachments"
                :key="attachment.id"
                :href="attachment.url"
                target="_blank"
                class="flex items-center gap-2 px-3 h-11 border border-ui-line rounded-ui-control text-ui-small text-ui-accent hover:bg-ui-hover hover:underline min-w-0"
              >
                <FileText class="w-4 h-4 shrink-0" />
                <span class="truncate">{{ attachment.original_name }}</span>
              </a>
            </div>
          </section>
        </div>

        <aside class="space-y-4 min-w-0">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
            <h3 class="text-ui-h3 text-ui-ink">Details</h3>
            <dl class="mt-2 divide-y divide-ui-line text-ui-small">
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="flex items-center gap-2 text-ui-muted shrink-0"><Calendar class="w-4 h-4 text-ui-faint" />Date</dt>
                <dd class="text-ui-ink text-right tabular-nums">{{ formatDate(memo.document_date) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="flex items-center gap-2 text-ui-muted shrink-0"><User class="w-4 h-4 text-ui-faint" />Sender</dt>
                <dd class="text-ui-ink text-right truncate">{{ memo.sender?.name || memo.creator?.name || "-" }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="flex items-center gap-2 text-ui-muted shrink-0"><ShieldCheck class="w-4 h-4 text-ui-faint" />Recipient</dt>
                <dd class="text-ui-ink text-right">Finance Manager</dd>
              </div>
              <div v-if="memo.attachments?.length" class="flex items-center justify-between gap-3 py-2.5">
                <dt class="flex items-center gap-2 text-ui-muted shrink-0"><Paperclip class="w-4 h-4 text-ui-faint" />Attachments</dt>
                <dd class="text-ui-ink text-right tabular-nums">{{ memo.attachments.length }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="memo.submitted_at || memo.approved_at && memo.approver" class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
            <h3 class="text-ui-h3 text-ui-ink">Activity</h3>
            <ol class="mt-3 space-y-3">
              <li v-if="memo.submitted_at" class="flex items-start gap-2.5">
                <span class="w-2 h-2 rounded-full bg-ui-muted mt-1.5 shrink-0" aria-hidden="true"></span>
                <p class="text-ui-small text-ui-text">Submitted: <span class="tabular-nums text-ui-muted">{{ formatDateTime(memo.submitted_at) }}</span></p>
              </li>
              <li v-if="memo.approved_at && memo.approver" class="flex items-start gap-2.5">
                <span class="w-2 h-2 rounded-full mt-1.5 shrink-0" :class="memo.status === 'rejected' ? 'bg-ui-bad' : 'bg-ui-ok'" aria-hidden="true"></span>
                <p class="text-ui-small text-ui-text">
                  {{ memo.status === "rejected" ? "Rejected" : "Approved" }} by {{ memo.approver.name }} &middot;
                  <span class="tabular-nums text-ui-muted">{{ formatDateTime(memo.approved_at) }}</span>
                </p>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </template>

    <UiModal
      v-model:open="isRejectModalOpen"
      title="Reject Official Memo?"
      description="Provide a rejection reason so the author knows what needs to be fixed."
    >
      <UiInput
        v-model="rejectionReason"
        :rows="4"
        required
        label="Rejection Reason"
        placeholder="Example: Budget doesn't match the Q3 allocation..."
      />
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="isRejectModalOpen = false">Cancel</UiButton>
        <UiButton
          variant="destructive"
          class="flex-1 sm:flex-none"
          :loading="busy"
          :disabled="busy || !rejectionReason.trim()"
          @click="handleReject"
        >
          {{ busy ? "Rejecting..." : "Reject" }}
        </UiButton>
      </template>
    </UiModal>
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
