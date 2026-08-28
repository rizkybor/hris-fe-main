<script setup>
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { ListChecksIcon, Plus, X, Pencil, Trash2, Users, User } from "lucide-vue-next";
import { useStaffTaskStore } from "@/stores/staffTask";
import { useAuthStore } from "@/stores/auth";
import { can } from "@/helpers/permissionHelper";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import StaffTaskComments from "@/components/admin/documents/StaffTaskComments.vue";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useStaffTaskStore();
const alertModal = useAlertModalStore();
const { staffTasks, staffOptions, loading } = storeToRefs(store);

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const filters = ref({ search: "" });

const STATUS_LABELS = {
  todo: { label: "To Do", class: "bg-gray-100 text-gray-600" },
  in_progress: { label: "In Progress", class: "bg-blue-100 text-blue-700" },
  done: { label: "Done", class: "bg-green-100 text-green-700" },
};

const showFormModal = ref(false);
const editingId = ref(null);
const form = ref({
  title: "",
  description: "",
  due_date: "",
  assignment_mode: "all_staff",
  assignee_employee_ids: [],
});
const submitting = ref(false);
const errorMessage = ref("");

const showDetailModal = ref(false);
const detailTask = ref(null);

const fetchData = async () => {
  await store.fetchStaffTasks(filters.value);
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const isOverdue = (task) => {
  if (!task.due_date) return false;
  const allDone = task.progress && task.progress.total > 0 && task.progress.done === task.progress.total;
  return !allDone && new Date(task.due_date) < new Date(new Date().toDateString());
};

// Card previews show a plain-text snippet -- rendering raw HTML tags inside
// a line-clamped card looks broken (stray "<p>" text, truncated mid-tag).
const stripHtml = (html) => (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const openCreateModal = async () => {
  editingId.value = null;
  form.value = { title: "", description: "", due_date: "", assignment_mode: "all_staff", assignee_employee_ids: [] };
  errorMessage.value = "";
  if (staffOptions.value.length === 0) {
    await store.fetchStaffOptions();
  }
  showFormModal.value = true;
};

const openEditModal = async (task) => {
  editingId.value = task.id;
  form.value = {
    title: task.title,
    description: task.description ?? "",
    due_date: task.due_date ?? "",
    assignment_mode: task.assignment_mode,
    assignee_employee_ids: (task.assignees || []).map((a) => a.employee_id),
  };
  errorMessage.value = "";
  if (staffOptions.value.length === 0) {
    await store.fetchStaffOptions();
  }
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
};

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    if (editingId.value) {
      await store.updateStaffTask(editingId.value, form.value);
    } else {
      await store.createStaffTask(form.value);
    }
    showFormModal.value = false;
    await fetchData();
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Failed to save task.");
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (id) => {
  if (!(await alertModal.confirm("Delete this task? Every assignee's progress on it will be removed too."))) return;
  try {
    await store.deleteStaffTask(id);
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to delete task.", { type: "danger" });
  }
};

const openDetailModal = async (task) => {
  const full = await store.fetchStaffTask(task.id);
  detailTask.value = full;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  detailTask.value = null;
};

// The comment composer needs {id, name} for its @mention list -- assignees
// plus the task's creator (if not already one), matching Meeting Note's
// "attendees + creator" mention-eligibility pattern on the backend.
const commentAssignees = computed(() => {
  if (!detailTask.value) return [];
  const list = (detailTask.value.assignees || []).map((a) => ({ id: a.employee_id, name: a.name }));
  const creatorEmployeeId = detailTask.value.creator?.employee_profile?.id;
  if (creatorEmployeeId && !list.some((a) => a.id === creatorEmployeeId)) {
    list.push({ id: creatorEmployeeId, name: detailTask.value.creator?.name });
  }
  return list;
});

const canCommentOnDetail = computed(() => {
  if (!detailTask.value) return false;
  const myEmployeeId = user.value?.employee_profile?.id;
  const isAssignee = (detailTask.value.assignees || []).some((a) => a.employee_id === myEmployeeId);
  const isCreator = detailTask.value.creator?.id === user.value?.id;
  const roles = user.value?.roles || [];
  const isAllowedRole = ["superadmin", "manager", "finance", "operational_director"].some((r) => roles.includes(r));
  return isAssignee || isCreator || isAllowedRole;
});

onMounted(fetchData);
</script>

<template>
  <div class="px-4 py-4">
    <div class="bg-white mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-11 h-11 bg-emerald-50 rounded-[12px] flex items-center justify-center shrink-0">
          <ListChecksIcon class="w-5 h-5 text-emerald-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-lg font-bold">Staff Tasks</h3>
          <p class="text-brand-light text-sm">Assign daily tasks to all staff or hand-picked staff</p>
        </div>
      </div>
      <button
        v-if="can('staff-task-create')"
        @click="openCreateModal"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Add Task</span>
      </button>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <input
        v-model="filters.search"
        @input="fetchData"
        type="text"
        placeholder="Search task title..."
        class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm"
      />
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 4" :key="i" height="90px" rounded="16px" />
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="task in staffTasks"
        :key="task.id"
        @click="openDetailModal(task)"
        class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 cursor-pointer hover:border-[#0C51D9] transition-colors"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <h4 class="text-brand-dark font-bold">{{ task.title }}</h4>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"
                :class="task.assignment_mode === 'all_staff' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'"
              >
                <Users v-if="task.assignment_mode === 'all_staff'" class="w-3 h-3" />
                <User v-else class="w-3 h-3" />
                {{ task.assignment_mode === "all_staff" ? "All Staff" : `${task.assignees?.length || 0} Selected` }}
              </span>
              <span v-if="isOverdue(task)" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Overdue</span>
            </div>
            <p class="text-brand-light text-sm">
              Due {{ formatDate(task.due_date) }}
              <span v-if="task.creator"> • by {{ task.creator.name }}</span>
            </p>
            <div v-if="task.progress" class="flex items-center gap-2 mt-2">
              <div class="flex-1 max-w-[160px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-emerald-500 transition-all"
                  :style="{ width: `${task.progress.total ? (task.progress.done / task.progress.total) * 100 : 0}%` }"
                ></div>
              </div>
              <span class="text-xs text-brand-light">{{ task.progress.done }}/{{ task.progress.total }} done</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0" @click.stop>
            <button
              v-if="can('staff-task-edit')"
              @click="openEditModal(task)"
              class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] transition-colors"
            >
              <Pencil class="w-3.5 h-3.5 text-gray-600" />
            </button>
            <button
              v-if="can('staff-task-delete')"
              @click="handleDelete(task.id)"
              class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-red-400 transition-colors"
            >
              <Trash2 class="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="staffTasks.length === 0" class="bg-white border border-[#DCDEDD] rounded-[14px] p-10 text-center">
        <ListChecksIcon class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-brand-light text-sm">No staff tasks yet.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showFormModal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closeFormModal">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-brand-dark text-lg font-bold">{{ editingId ? "Edit Task" : "Add Task" }}</h3>
          <button @click="closeFormModal" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Task Title<span class="text-red-600 ml-1">*</span></label>
            <input v-model="form.title" type="text" required placeholder="e.g. Submit weekly report" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Description</label>
            <RichTextEditor v-model="form.description" placeholder="Task details, instructions, links..." />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Due Date<span class="text-red-600 ml-1">*</span></label>
            <input
              v-model="form.due_date"
              type="date"
              required
              class="w-full h-[42px] px-3 py-2 border border-[#DCDEDD] rounded-xl text-base sm:text-sm appearance-none"
            />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-2 block">Assign To<span class="text-red-600 ml-1">*</span></label>
            <div class="flex gap-3">
              <label class="flex-1 flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm cursor-pointer" :class="form.assignment_mode === 'all_staff' ? 'border-[#0C51D9] bg-blue-50' : 'border-[#DCDEDD]'">
                <input type="radio" v-model="form.assignment_mode" value="all_staff" class="accent-[#0C51D9]" />
                <Users class="w-4 h-4 text-gray-500" />
                All Staff
              </label>
              <label class="flex-1 flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm cursor-pointer" :class="form.assignment_mode === 'selected' ? 'border-[#0C51D9] bg-blue-50' : 'border-[#DCDEDD]'">
                <input type="radio" v-model="form.assignment_mode" value="selected" class="accent-[#0C51D9]" />
                <User class="w-4 h-4 text-gray-500" />
                Select Staff
              </label>
            </div>

            <div v-if="form.assignment_mode === 'selected'" class="mt-3 border border-[#DCDEDD] rounded-xl max-h-48 overflow-y-auto p-2 space-y-1">
              <label
                v-for="opt in staffOptions"
                :key="opt.id"
                class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input type="checkbox" :value="opt.id" v-model="form.assignee_employee_ids" class="accent-[#0C51D9]" />
                {{ opt.name }}
              </label>
              <p v-if="staffOptions.length === 0" class="text-xs text-brand-light text-center py-3">No staff members found.</p>
            </div>
          </div>

          <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

          <div class="flex items-center gap-3 pt-2">
            <button type="submit" :disabled="submitting" class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-2.5 flex items-center gap-2 disabled:opacity-50">
              <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Saving..." : "Save" }}</span>
            </button>
            <button type="button" @click="closeFormModal" class="px-6 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closeDetailModal">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <div>
            <h3 class="text-brand-dark text-lg font-bold">{{ detailTask?.title }}</h3>
            <p class="text-brand-light text-xs mt-0.5">Due {{ formatDate(detailTask?.due_date) }} • by {{ detailTask?.creator?.name }}</p>
          </div>
          <button @click="closeDetailModal" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] shrink-0">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div class="p-5 space-y-5">
          <div v-if="detailTask?.description" class="rich-text-content text-sm text-brand-dark leading-relaxed" v-html="detailTask.description"></div>

          <div>
            <h4 class="text-sm font-semibold text-brand-dark mb-2">Assignee Progress</h4>
            <div class="border border-[#DCDEDD] rounded-xl overflow-hidden">
              <div
                v-for="assignee in detailTask?.assignees"
                :key="assignee.id"
                class="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-[#DCDEDD] last:border-b-0"
              >
                <p class="text-sm text-brand-dark">{{ assignee.name }}</p>
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="STATUS_LABELS[assignee.status]?.class">
                  {{ STATUS_LABELS[assignee.status]?.label ?? assignee.status }}
                </span>
              </div>
            </div>
          </div>

          <StaffTaskComments
            v-if="detailTask"
            :staff-task-id="detailTask.id"
            :assignees="commentAssignees"
            :can-comment="canCommentOnDetail"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base .rich-text-content lives in src/assets/css/input.css -- these add
   the same supplementary tag styling MeetingNoteDetail.vue uses. */
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
