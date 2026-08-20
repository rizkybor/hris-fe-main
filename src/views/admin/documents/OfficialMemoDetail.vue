<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import {
  FileSignature,
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  Calendar,
  User,
  X,
  Download,
} from "lucide-vue-next";
import { useDocumentLetterStore } from "@/stores/documentLetter";
import { useAuthStore } from "@/stores/auth";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

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
const STATUS_CLASS = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

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
  <div>
    <div v-if="loading" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-3">
      <Skeleton width="40%" height="24px" />
      <Skeleton width="100%" height="200px" />
    </div>

    <template v-else-if="memo">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
            <FileSignature class="w-5 h-5 text-[#0C51D9]" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-brand-dark text-lg font-bold">{{ memo.subject }}</h3>
              <span class="px-2 py-1 rounded-md text-xs font-semibold shrink-0" :class="STATUS_CLASS[memo.status]">
                {{ STATUS_LABEL[memo.status] }}
              </span>
            </div>
            <p class="text-brand-light text-sm font-mono">{{ memo.document_number }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="handleDownload"
            :disabled="downloading"
            class="px-4 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
          >
            <Download class="w-4 h-4" />
            {{ downloading ? "Downloading..." : "Download PDF" }}
          </button>
          <router-link
            v-if="canEdit"
            :to="{ name: 'admin.official-memos.edit', params: { id: memo.id } }"
            class="px-4 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50 flex items-center gap-2"
          >
            <Pencil class="w-4 h-4" />
            Edit
          </router-link>
          <button
            v-if="canSubmit"
            @click="handleSubmit"
            :disabled="busy"
            class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 disabled:opacity-50"
          >
            <Send class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Submit</span>
          </button>
          <button
            v-if="canApprove"
            @click="handleApprove"
            :disabled="busy"
            class="rounded-lg bg-green-600 hover:brightness-110 px-4 py-2.5 flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 class="w-4 h-4 text-white" />
            <span class="text-white text-sm font-semibold">Approve</span>
          </button>
          <button
            v-if="canApprove"
            @click="openRejectModal"
            :disabled="busy"
            class="rounded-lg bg-red-500 hover:brightness-110 px-4 py-2.5 flex items-center gap-2 disabled:opacity-50"
          >
            <XCircle class="w-4 h-4 text-white" />
            <span class="text-white text-sm font-semibold">Reject</span>
          </button>
        </div>
      </div>

      <div v-if="memo.status === 'rejected' && memo.rejection_reason" class="bg-red-50 border border-red-100 rounded-[14px] p-4 mb-6">
        <p class="text-red-700 text-sm font-semibold mb-1">Rejection Reason</p>
        <p class="text-red-600 text-sm">{{ memo.rejection_reason }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
            <h4 class="text-brand-dark text-sm font-bold mb-3">Memo Content</h4>
            <div class="rich-text-content text-sm text-brand-dark leading-relaxed" v-html="memo.body"></div>
          </div>

          <div v-if="memo.attachments?.length" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
            <h4 class="text-brand-dark text-sm font-bold mb-3">Attachments</h4>
            <div class="space-y-2">
              <a
                v-for="attachment in memo.attachments"
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
              <span class="text-brand-light">Date:</span>
              <span class="text-brand-dark font-medium">{{ formatDate(memo.document_date) }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <User class="w-4 h-4 text-gray-400 shrink-0" />
              <span class="text-brand-light">Sender:</span>
              <span class="text-brand-dark font-medium">{{ memo.sender?.name || memo.creator?.name || "-" }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <ShieldCheck class="w-4 h-4 text-gray-400 shrink-0" />
              <span class="text-brand-light">Recipient:</span>
              <span class="text-brand-dark font-medium">Finance Manager</span>
            </div>
          </div>

          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-2 text-xs text-brand-light">
            <p v-if="memo.submitted_at">Submitted: {{ formatDateTime(memo.submitted_at) }}</p>
            <p v-if="memo.approved_at && memo.approver">
              {{ memo.status === "rejected" ? "Rejected" : "Approved" }} by {{ memo.approver.name }} &middot;
              {{ formatDateTime(memo.approved_at) }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <Transition name="fade">
      <div v-if="isRejectModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="isRejectModalOpen = false"></div>
        <div class="bg-white rounded-[24px] p-6 w-full max-w-md relative z-10 shadow-2xl">
          <button @click="isRejectModalOpen = false" class="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
          <h3 class="text-xl font-bold text-brand-dark mb-2">Reject Official Memo?</h3>
          <p class="text-gray-500 text-sm mb-4">Provide a rejection reason so the author knows what needs to be fixed.</p>
          <textarea
            v-model="rejectionReason"
            rows="4"
            required
            placeholder="Example: Budget doesn't match the Q3 allocation..."
            class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm resize-none focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none mb-4"
          ></textarea>
          <div class="grid grid-cols-2 gap-3">
            <button @click="isRejectModalOpen = false" class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50">
              Cancel
            </button>
            <button
              @click="handleReject"
              :disabled="busy || !rejectionReason.trim()"
              class="px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50"
            >
              {{ busy ? "Rejecting..." : "Reject" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Table containment (overflow-x-auto, border, padding) lives in the
   shared global .rich-text-content class in src/assets/css/input.css --
   only the non-table typography rules stay local here. */
.rich-text-content :deep(p) { margin-bottom: 0.75rem; }
.rich-text-content :deep(ul) { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(ol) { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(h1) { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }
.rich-text-content :deep(h2) { font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0; }
.rich-text-content :deep(h3) { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0; }
.rich-text-content :deep(blockquote) { border-left: 3px solid #0c51d9; padding-left: 0.75rem; color: #6b7280; margin: 0.5rem 0; }
.rich-text-content :deep(a) { color: #0c51d9; text-decoration: underline; }
.rich-text-content :deep(hr) { border: none; border-top: 1px solid #dcdedd; margin: 0.75rem 0; }
</style>
