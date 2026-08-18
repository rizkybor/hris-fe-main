<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { FileSignature, User, Paperclip, X, FileText } from "lucide-vue-next";
import { useDocumentLetterStore } from "@/stores/documentLetter";
import { useTeamStore } from "@/stores/team";
import { useAuthStore } from "@/stores/auth";
import RichTextEditor from "@/components/common/RichTextEditor.vue";

const route = useRoute();
const router = useRouter();
const store = useDocumentLetterStore();
const teamStore = useTeamStore();
const authStore = useAuthStore();

const { teams } = storeToRefs(teamStore);
const { error } = storeToRefs(store);

const isEditing = computed(() => !!route.params.id);
const saving = ref(false);

const form = ref({
  document_number: "",
  subject: "",
  document_date: new Date().toISOString().slice(0, 10),
  body: "",
  recipient_team_ids: [],
});

const newAttachments = ref([]);
const existingAttachments = ref([]);
const removeAttachmentIds = ref([]);

onMounted(async () => {
  await teamStore.fetchTeams();

  if (isEditing.value) {
    const memo = await store.fetchDocumentLetter(route.params.id);
    form.value = {
      document_number: memo.document_number,
      subject: memo.subject,
      document_date: memo.document_date?.slice(0, 10),
      body: memo.body,
      recipient_team_ids: memo.recipients?.map((r) => r.id) || [],
    };
    existingAttachments.value = memo.attachments || [];
  }
});

const toggleTeam = (teamId) => {
  const idx = form.value.recipient_team_ids.indexOf(teamId);
  if (idx === -1) {
    form.value.recipient_team_ids.push(teamId);
  } else {
    form.value.recipient_team_ids.splice(idx, 1);
  }
};

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
  form.value.recipient_team_ids.forEach((id) => formData.append("recipient_team_ids[]", id));
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
        <h3 class="text-brand-dark text-lg font-bold">{{ isEditing ? "Edit Official Memo" : "Buat Official Memo" }}</h3>
        <p class="text-brand-light text-sm">Nota Dinas akan tersimpan sebagai Draft hingga Anda submit untuk persetujuan.</p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Nomor Surat/Nota</label>
          <input
            v-model="form.document_number"
            type="text"
            placeholder="Kosongkan untuk auto-generate"
            class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Tanggal Dokumen</label>
          <input
            v-model="form.document_date"
            type="date"
            required
            class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Perihal / Judul</label>
        <input
          v-model="form.subject"
          type="text"
          required
          placeholder="e.g. Pengajuan Anggaran Operasional Q3"
          class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        />
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Pengirim</label>
        <div class="flex items-center gap-2 px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm bg-gray-50 text-brand-light">
          <User class="w-4 h-4" />
          {{ authStore.user?.name }}
        </div>
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Penerima / Unit Tujuan</label>
        <div class="border border-[#DCDEDD] rounded-xl p-3 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <label
            v-for="team in teams"
            :key="team.id"
            class="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              :checked="form.recipient_team_ids.includes(team.id)"
              @change="toggleTeam(team.id)"
              class="rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9]"
            />
            {{ team.name }}
          </label>
          <p v-if="teams.length === 0" class="text-sm text-gray-400 italic py-2">Belum ada unit/tim.</p>
        </div>
        <p v-if="form.recipient_team_ids.length === 0" class="text-xs text-red-500 mt-1">
          Pilih minimal satu unit tujuan.
        </p>
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Isi Nota Dinas</label>
        <RichTextEditor v-model="form.body" placeholder="Dengan hormat, ..." />
      </div>

      <div>
        <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Lampiran</label>
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
            Tambah Lampiran (PDF, DOC, PNG, JPG — max 5MB)
            <input type="file" multiple class="hidden" @change="onFileChange" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
          </label>
        </div>
      </div>

      <p v-if="error" class="text-red-500 text-sm">
        {{ typeof error === "string" ? error : "Periksa kembali data yang diisi." }}
      </p>

      <div class="flex items-center gap-3 pt-2 border-t border-[#F1F1F1]">
        <button
          type="submit"
          :disabled="saving || form.recipient_team_ids.length === 0"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-5 py-2.5 disabled:opacity-50"
        >
          <span class="text-brand-white text-sm font-semibold">{{ saving ? "Menyimpan..." : "Simpan sebagai Draft" }}</span>
        </button>
        <button
          type="button"
          @click="router.back()"
          class="px-5 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Batal
        </button>
      </div>
    </form>
  </div>
</template>
