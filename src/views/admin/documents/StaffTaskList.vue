<script setup>
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { ListChecksIcon, Plus, Pencil, Trash2, Users, User, Search, Calendar, AlertTriangle, SearchX } from "lucide-vue-next";
import { useStaffTaskStore } from "@/stores/staffTask";
import { useAuthStore } from "@/stores/auth";
import { can } from "@/helpers/permissionHelper";
import { UiAlert, UiBadge, UiButton, UiEmpty, UiInput, UiModal, UiPageHeader, UiTable } from "@/components/ui";
import Avatar from "@/components/common/Avatar.vue";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import StaffTaskComments from "@/components/admin/documents/StaffTaskComments.vue";
import { useAlertModalStore } from "@/stores/alertModal";
import StaffTasksRecap from "@/components/admin/documents/StaffTasksRecap.vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const store = useStaffTaskStore();
const alertModal = useAlertModalStore();
const { staffTasks, staffOptions, loading } = storeToRefs(store);

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const filters = ref({ search: "" });

// Same tones as My Tasks (the assignee side): to do = neutral, working = warn, done = ok.
const STATUS_LABELS = computed(() => ({
  todo: { label: t("staffTasks.status.todo"), tone: "neutral" },
  in_progress: { label: t("staffTasks.status.inProgress"), tone: "warn" },
  done: { label: t("staffTasks.status.done"), tone: "ok" },
}));

// Presentation only: table columns (UiTable adds the "#" column).
const COLUMNS = computed(() => [
  { key: "title", label: t("staffTasks.cols.task") },
  { key: "assignment_mode", label: t("staffTasks.cols.assignedTo"), width: 150 },
  { key: "due_date", label: t("staffTasks.cols.due"), width: 190 },
  { key: "progress", label: t("staffTasks.cols.progress"), width: 190 },
  { key: "actions", label: "", align: "right", width: 96 },
]);
const progressPct = (task) => (task.progress?.total ? (task.progress.done / task.progress.total) * 100 : 0);

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
// Bumped after a create/edit/delete so the recap follows.
const recapKey = ref(0);

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" });
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
    recapKey.value++;
    await fetchData();
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t("staffTasks.saveFailed"));
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (id) => {
  if (!(await alertModal.confirm(t("staffTasks.deleteConfirm")))) return;
  try {
    await store.deleteStaffTask(id);
    recapKey.value++;
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || t("staffTasks.deleteFailed"), { type: "danger" });
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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('staffTasks.title')" :subtitle="$t('staffTasks.subtitle')">
      <template #actions>
        <UiButton v-if="can('staff-task-create')" :icon="Plus" class="w-full sm:w-auto" @click="openCreateModal">{{ $t("staffTasks.add") }}</UiButton>
      </template>
    </UiPageHeader>

    <StaffTasksRecap :refresh-key="recapKey" />

    <div class="bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden">
      <div class="p-3 sm:p-4 border-b border-ui-line">
        <UiInput
          :model-value="filters.search"
          :icon="Search"
          :placeholder="$t('staffTasks.searchPlaceholder')"
          class="sm:max-w-sm"
          @update:model-value="(v) => { filters.search = v; fetchData(); }"
        />
      </div>

      <UiTable :columns="COLUMNS" :rows="staffTasks" :loading="loading" :skeleton-rows="4" clickable @row-click="openDetailModal">
        <template #cell-title="{ row }">
          <div class="min-w-0 max-w-[420px]">
            <p class="text-ui-small font-medium text-ui-ink truncate">{{ row.title }}</p>
            <p v-if="row.creator" class="text-ui-cap text-ui-muted truncate">{{ $t("staffTasks.by", { name: row.creator.name }) }}</p>
          </div>
        </template>
        <template #cell-assignment_mode="{ row }">
          <UiBadge :tone="row.assignment_mode === 'all_staff' ? 'neutral' : 'outline'">
            <Users v-if="row.assignment_mode === 'all_staff'" class="w-3 h-3" />
            <User v-else class="w-3 h-3" />
            {{ row.assignment_mode === "all_staff" ? $t("staffTasks.allStaff") : $t("staffTasks.selectedCount", { n: row.assignees?.length || 0 }) }}
          </UiBadge>
        </template>
        <template #cell-due_date="{ row }">
          <div class="flex items-center gap-2 whitespace-nowrap">
            <span class="tabular-nums" :class="isOverdue(row) ? 'text-ui-bad font-medium' : 'text-ui-text'">{{ formatDate(row.due_date) }}</span>
            <UiBadge v-if="isOverdue(row)" tone="bad"><AlertTriangle class="w-3 h-3" />{{ $t("staffTasks.overdue") }}</UiBadge>
          </div>
        </template>
        <template #cell-progress="{ row }">
          <div v-if="row.progress" class="flex items-center gap-2.5">
            <div class="flex-1 max-w-[110px] h-1.5 bg-ui-subtle rounded-full overflow-hidden">
              <div class="h-full bg-ui-ok rounded-full transition-all" :style="{ width: `${progressPct(row)}%` }"></div>
            </div>
            <span class="text-ui-cap text-ui-muted tabular-nums whitespace-nowrap">{{ $t("staffTasks.progressDone", { done: row.progress.done, total: row.progress.total }) }}</span>
          </div>
          <span v-else class="text-ui-faint">—</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="inline-flex items-center gap-1" @click.stop>
            <button
              v-if="can('staff-task-edit')"
              type="button"
              class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
              :aria-label="$t('staffTasks.editLabel', { title: row.title })"
              :title="$t('common.actions.edit')"
              @click="openEditModal(row)"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              v-if="can('staff-task-delete')"
              type="button"
              class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus"
              :aria-label="$t('staffTasks.deleteLabel', { title: row.title })"
              :title="$t('common.actions.delete')"
              @click="handleDelete(row.id)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- Phones: one card per task -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5 flex items-start gap-3">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 shrink-0 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink break-words">{{ row.title }}</p>
              <p class="text-ui-cap text-ui-muted mt-0.5">
                {{ $t("staffTasks.due") }} <span class="tabular-nums">{{ formatDate(row.due_date) }}</span><span v-if="row.creator"> • {{ $t("staffTasks.by", { name: row.creator.name }) }}</span>
              </p>
              <div class="flex items-center gap-1.5 flex-wrap mt-2">
                <UiBadge :tone="row.assignment_mode === 'all_staff' ? 'neutral' : 'outline'">
                  <Users v-if="row.assignment_mode === 'all_staff'" class="w-3 h-3" />
                  <User v-else class="w-3 h-3" />
                  {{ row.assignment_mode === "all_staff" ? $t("staffTasks.allStaff") : $t("staffTasks.selectedCount", { n: row.assignees?.length || 0 }) }}
                </UiBadge>
                <UiBadge v-if="isOverdue(row)" tone="bad"><AlertTriangle class="w-3 h-3" />{{ $t("staffTasks.overdue") }}</UiBadge>
              </div>
              <div v-if="row.progress" class="flex items-center gap-2.5 mt-2.5">
                <div class="flex-1 h-1.5 bg-ui-subtle rounded-full overflow-hidden">
                  <div class="h-full bg-ui-ok rounded-full transition-all" :style="{ width: `${progressPct(row)}%` }"></div>
                </div>
                <span class="text-ui-cap text-ui-muted tabular-nums whitespace-nowrap">{{ $t("staffTasks.progressDone", { done: row.progress.done, total: row.progress.total }) }}</span>
              </div>
            </div>
            <div class="flex flex-col items-center gap-1 shrink-0 -mr-1.5 -mt-1" @click.stop>
              <button
                v-if="can('staff-task-edit')"
                type="button"
                class="w-9 h-9 inline-flex items-center justify-center rounded-ui-control text-ui-muted active:bg-ui-hover"
                :aria-label="$t('staffTasks.editLabel', { title: row.title })"
                @click="openEditModal(row)"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                v-if="can('staff-task-delete')"
                type="button"
                class="w-9 h-9 inline-flex items-center justify-center rounded-ui-control text-ui-muted active:bg-ui-bad-soft active:text-ui-bad"
                :aria-label="$t('staffTasks.deleteLabel', { title: row.title })"
                @click="handleDelete(row.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="filters.search" :icon="SearchX" :title="$t('staffTasks.emptySearchTitle')" :message="$t('staffTasks.emptySearchMessage')" compact />
          <UiEmpty v-else :icon="ListChecksIcon" :title="$t('staffTasks.emptyTitle')" compact>
            <UiButton v-if="can('staff-task-create')" variant="secondary" size="sm" :icon="Plus" @click="openCreateModal">{{ $t("staffTasks.add") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>
    </div>

    <!-- Create/Edit Modal -->
    <UiModal :open="showFormModal" size="lg" :title="editingId ? $t('staffTasks.edit') : $t('staffTasks.add')" @close="closeFormModal">
      <form id="staff-task-form" class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4" @submit.prevent="handleSubmit">
        <UiInput v-model="form.title" :label="$t('staffTasks.form.title')" required :placeholder="$t('staffTasks.form.titlePlaceholder')" />
        <UiInput v-model="form.due_date" :label="$t('staffTasks.form.dueDate')" type="date" required />

        <div class="sm:col-span-2 min-w-0">
          <label class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("common.labels.description") }}</label>
          <RichTextEditor v-model="form.description" :placeholder="$t('staffTasks.form.descriptionPlaceholder')" />
        </div>

        <fieldset class="sm:col-span-2 min-w-0">
          <legend class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("staffTasks.form.assignTo") }}<span class="text-ui-bad"> *</span></legend>
          <div class="grid grid-cols-2 gap-2.5">
            <label
              class="flex items-center gap-2.5 h-11 px-3 border rounded-ui-control text-ui-small cursor-pointer transition-colors"
              :class="form.assignment_mode === 'all_staff' ? 'border-ui-accent bg-ui-accent-soft text-ui-ink' : 'border-ui-line-strong text-ui-text hover:bg-ui-hover'"
            >
              <input type="radio" v-model="form.assignment_mode" value="all_staff" class="accent-ui-accent" />
              <Users class="w-4 h-4 text-ui-muted" />
              {{ $t("staffTasks.allStaff") }}
            </label>
            <label
              class="flex items-center gap-2.5 h-11 px-3 border rounded-ui-control text-ui-small cursor-pointer transition-colors"
              :class="form.assignment_mode === 'selected' ? 'border-ui-accent bg-ui-accent-soft text-ui-ink' : 'border-ui-line-strong text-ui-text hover:bg-ui-hover'"
            >
              <input type="radio" v-model="form.assignment_mode" value="selected" class="accent-ui-accent" />
              <User class="w-4 h-4 text-ui-muted" />
              {{ $t("staffTasks.form.selectStaff") }}
            </label>
          </div>

          <div v-if="form.assignment_mode === 'selected'" class="mt-2.5 border border-ui-line rounded-ui-control max-h-56 overflow-y-auto p-1.5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
              <label
                v-for="opt in staffOptions"
                :key="opt.id"
                class="flex items-center gap-2.5 px-2.5 h-10 rounded-md hover:bg-ui-hover cursor-pointer text-ui-small text-ui-text min-w-0"
              >
                <input type="checkbox" :value="opt.id" v-model="form.assignee_employee_ids" class="accent-ui-accent shrink-0" />
                <span class="truncate">{{ opt.name }}</span>
              </label>
            </div>
            <p v-if="staffOptions.length === 0" class="text-ui-cap text-ui-muted text-center py-3">{{ $t("staffTasks.form.noStaff") }}</p>
          </div>
        </fieldset>

        <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" class="sm:col-span-2" />
      </form>

      <template #footer>
        <UiButton variant="ghost" @click="closeFormModal">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="staff-task-form" :loading="submitting">{{ submitting ? $t("common.actions.saving") : $t("common.actions.save") }}</UiButton>
      </template>
    </UiModal>

    <!-- Detail Modal -->
    <UiModal :open="showDetailModal" size="lg" @close="closeDetailModal">
      <template #header>
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink break-words">{{ detailTask?.title }}</h2>
          <p class="text-ui-small text-ui-muted mt-0.5">{{ $t("staffTasks.due") }} {{ formatDate(detailTask?.due_date) }} • {{ $t("staffTasks.by", { name: detailTask?.creator?.name }) }}</p>
          <div v-if="detailTask" class="flex items-center gap-1.5 flex-wrap mt-2">
            <UiBadge :tone="detailTask.assignment_mode === 'all_staff' ? 'neutral' : 'outline'">
              <Users v-if="detailTask.assignment_mode === 'all_staff'" class="w-3 h-3" />
              <User v-else class="w-3 h-3" />
              {{ detailTask.assignment_mode === "all_staff" ? $t("staffTasks.allStaff") : $t("staffTasks.selectedCount", { n: detailTask.assignees?.length || 0 }) }}
            </UiBadge>
            <UiBadge v-if="isOverdue(detailTask)" tone="bad"><AlertTriangle class="w-3 h-3" />{{ $t("staffTasks.overdue") }}</UiBadge>
          </div>
        </div>
      </template>

      <div v-if="detailTask" class="space-y-5">
        <div v-if="detailTask.description" class="rich-text-content text-ui-body text-ui-text" v-html="detailTask.description"></div>

        <section>
          <h3 class="text-ui-h3 text-ui-ink mb-2">{{ $t("staffTasks.assigneeProgress") }}</h3>
          <ul class="border border-ui-line rounded-ui-card divide-y divide-ui-line">
            <li v-for="assignee in detailTask.assignees" :key="assignee.id" class="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div class="flex items-center gap-2.5 min-w-0">
                <Avatar :alt="assignee.name" size="w-7 h-7" icon-size="w-3.5 h-3.5" />
                <p class="text-ui-small text-ui-ink truncate">{{ assignee.name }}</p>
              </div>
              <UiBadge :tone="STATUS_LABELS[assignee.status]?.tone ?? 'neutral'" dot>
                {{ STATUS_LABELS[assignee.status]?.label ?? assignee.status }}
              </UiBadge>
            </li>
          </ul>
        </section>

        <StaffTaskComments :staff-task-id="detailTask.id" :assignees="commentAssignees" :can-comment="canCommentOnDetail" />
      </div>
    </UiModal>
  </div>
</template>

<style scoped>
/* Base .rich-text-content lives in src/assets/css/input.css -- these add
   the same supplementary tag styling MyTasks.vue uses. */
.rich-text-content :deep(p) { margin-bottom: 0.75rem; }
.rich-text-content :deep(ul) { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(ol) { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.rich-text-content :deep(h1) { font-size: 22px; line-height: 30px; font-weight: 600; margin: 0.5rem 0; }
.rich-text-content :deep(h2) { font-size: 17px; line-height: 26px; font-weight: 600; margin: 0.5rem 0; }
.rich-text-content :deep(h3) { font-size: 14px; line-height: 20px; font-weight: 600; margin: 0.5rem 0; }
.rich-text-content :deep(blockquote) { border-left: 3px solid rgb(var(--ui-line-strong)); padding-left: 0.75rem; color: rgb(var(--ui-muted)); margin: 0.5rem 0; }
.rich-text-content :deep(a) { color: rgb(var(--ui-accent)); text-decoration: underline; }
.rich-text-content :deep(hr) { border: none; border-top: 1px solid rgb(var(--ui-line)); margin: 0.75rem 0; }
</style>
