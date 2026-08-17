<script setup>
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Megaphone, Plus, Pin, Pencil, Trash2, X } from "lucide-vue-next";
import { useAnnouncementStore } from "@/stores/announcement";
import { can } from "@/helpers/permissionHelper";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useAnnouncementStore();
const alertModal = useAlertModalStore();
const { announcements, meta, loading } = storeToRefs(store);

const showModal = ref(false);
const editingId = ref(null);
const form = ref({
  title: "",
  body: "",
  audience: "all",
  is_pinned: false,
  expires_at: "",
});
const submitting = ref(false);
const errorMessage = ref("");

const audienceOptions = [
  { value: "all", label: "Semua Role" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
  { value: "finance", label: "Finance" },
  { value: "staff", label: "Staff" },
];

const audienceLabel = (value) =>
  audienceOptions.find((o) => o.value === value)?.label ?? value;

const openCreateModal = () => {
  editingId.value = null;
  form.value = { title: "", body: "", audience: "all", is_pinned: false, expires_at: "" };
  errorMessage.value = "";
  showModal.value = true;
};

const openEditModal = (announcement) => {
  editingId.value = announcement.id;
  form.value = {
    title: announcement.title,
    body: announcement.body,
    audience: announcement.audience,
    is_pinned: announcement.is_pinned,
    expires_at: announcement.expires_at ?? "",
  };
  errorMessage.value = "";
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    if (editingId.value) {
      await store.updateAnnouncement(editingId.value, form.value);
    } else {
      await store.createAnnouncement(form.value);
    }
    showModal.value = false;
    await store.fetchAnnouncements();
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Failed to save announcement.");
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (id) => {
  if (!(await alertModal.confirm("Delete this announcement?"))) return;
  try {
    await store.deleteAnnouncement(id);
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to delete announcement.", { type: "danger" });
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

onMounted(() => {
  store.fetchAnnouncements();
});
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Megaphone class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Announcements</h3>
          <p class="text-brand-light text-sm">Broadcast information to the entire or selected teams</p>
        </div>
      </div>
      <button
        v-if="can('announcement-create')"
        @click="openCreateModal"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 shrink-0"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Create Announcement</span>
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 3" :key="i" height="90px" rounded="16px" />
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="announcement in announcements"
        :key="announcement.id"
        class="bg-white border border-[#DCDEDD] rounded-[14px] p-5"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <Pin v-if="announcement.is_pinned" class="w-3.5 h-3.5 text-[#0C51D9]" />
              <h4 class="text-brand-dark font-bold">{{ announcement.title }}</h4>
              <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                {{ audienceLabel(announcement.audience) }}
              </span>
            </div>
            <p class="text-brand-light text-sm whitespace-pre-line">{{ announcement.body }}</p>
            <p class="text-xs text-gray-400 mt-2">
              Oleh {{ announcement.created_by?.name ?? '-' }} • {{ formatDate(announcement.created_at) }}
              <span v-if="announcement.expires_at"> • Berlaku sampai {{ formatDate(announcement.expires_at) }}</span>
            </p>
          </div>
          <div v-if="can('announcement-edit') || can('announcement-delete')" class="flex items-center gap-2 shrink-0">
            <button
              v-if="can('announcement-edit')"
              @click="openEditModal(announcement)"
              class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] transition-colors"
            >
              <Pencil class="w-3.5 h-3.5 text-gray-600" />
            </button>
            <button
              v-if="can('announcement-delete')"
              @click="handleDelete(announcement.id)"
              class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-red-400 transition-colors"
            >
              <Trash2 class="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="announcements.length === 0" class="bg-white border border-[#DCDEDD] rounded-[14px] p-10 text-center">
        <Megaphone class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-brand-light text-sm">No announcements found.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-brand-dark text-lg font-bold">
            {{ editingId ? 'Edit Announcement' : 'Create Announcement' }}
          </h3>
          <button @click="closeModal" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Title</label>
            <input v-model="form.title" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Content</label>
            <textarea v-model="form.body" rows="5" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Audience</label>
              <select v-model="form.audience" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
                <option v-for="opt in audienceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Valid Until (Optional)</label>
              <input v-model="form.expires_at" type="date" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_pinned" class="w-4 h-4" />
            <span class="text-sm text-brand-dark">Pin to Top</span>
          </label>

          <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              :disabled="submitting"
              class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
            >
              <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Saving..." : "Save" }}</span>
            </button>
            <button type="button" @click="closeModal" class="px-6 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
