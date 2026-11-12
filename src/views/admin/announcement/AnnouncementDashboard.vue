<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Megaphone, Plus, Pin, Pencil, Trash2, Eye, CalendarClock } from "lucide-vue-next";
import { useAnnouncementStore } from "@/stores/announcement";
import { useAuthStore } from "@/stores/auth";
import { can } from "@/helpers/permissionHelper";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import Pagination from "@/components/common/Pagination.vue";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiPageHeader, UiButton, UiBadge, UiModal, UiInput, UiSelect, UiSwitch, UiEmpty, UiAlert } from "@/components/ui";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import Avatar from "@/components/common/Avatar.vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const store = useAnnouncementStore();
const authStore = useAuthStore();
const alertModal = useAlertModalStore();
const { announcements, meta, loading, loadingDetail } = storeToRefs(store);

// Mirrors the backend's canManage() rule: the announcement's own creator,
// or a manager/superadmin, may edit or delete it -- everyone else shouldn't
// even see the buttons, since clicking them would just 403.
const canManage = (announcement) => {
  const roles = authStore.user?.roles || [];
  return (
    announcement.created_by?.id === authStore.user?.id ||
    roles.includes("manager") ||
    roles.includes("superadmin")
  );
};

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

const showViewModal = ref(false);
const viewingAnnouncement = ref(null);

const audienceOptions = computed(() => [
  { value: "all", label: t("announcements.audience.all") },
  { value: "manager", label: t("announcements.audience.manager") },
  { value: "operational_director", label: t("announcements.audience.operationalDirector") },
  { value: "hr", label: t("announcements.audience.hr") },
  { value: "finance", label: t("announcements.audience.finance") },
  { value: "staff", label: t("announcements.audience.staff") },
]);

const audienceLabel = (value) =>
  audienceOptions.value.find((o) => o.value === value)?.label ?? value;

// A date-only string in the same YYYY-MM-DD shape the <input type="date">
// and the backend's date column both use, so this can compare directly
// without pulling in a date library.
const todayIso = new Date().toISOString().slice(0, 10);
const isExpiredForPin = computed(
  () => !!form.value.expires_at && form.value.expires_at < todayIso
);

// Picking a past date while already pinned leaves a checked-but-disabled
// box, which reads as "still pinned" -- clear it so the form matches what
// the backend will actually accept.
watch(isExpiredForPin, (expired) => {
  if (expired) form.value.is_pinned = false;
});

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
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t("announcements.errors.save"));
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (id) => {
  if (!(await alertModal.confirm(t("announcements.confirm.delete")))) return;
  try {
    await store.deleteAnnouncement(id);
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || t("announcements.errors.delete"), { type: "danger" });
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(localeTag(), { day: "numeric", month: "long", year: "numeric" });
};

const load = (page = 1) => {
  store.fetchAnnouncements({ page, row_per_page: meta.value.per_page || 10 });
};

const openViewModal = async (id) => {
  viewingAnnouncement.value = null;
  showViewModal.value = true;
  try {
    viewingAnnouncement.value = await store.fetchAnnouncement(id);
  } catch (error) {
    showViewModal.value = false;
    await alertModal.alert(error?.response?.data?.message || t("announcements.errors.load"), { type: "danger" });
  }
};

const closeViewModal = () => {
  showViewModal.value = false;
  viewingAnnouncement.value = null;
};

onMounted(() => {
  load();
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('announcements.title')" :subtitle="$t('announcements.subtitle')">
      <template #actions>
        <UiButton v-if="can('announcement-create')" :icon="Plus" class="w-full sm:w-auto" @click="openCreateModal">
          {{ $t("announcements.create") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <SkeletonCardGrid v-if="loading" :count="4" cols="grid-cols-1 lg:grid-cols-2" />

    <div v-else class="space-y-4">
      <div v-if="announcements.length" class="grid grid-cols-1 lg:grid-cols-2 gap-4 ui-stagger">
        <article
          v-for="(announcement, index) in announcements"
          :key="announcement.id"
          class="ui-lift bg-ui-surface border border-ui-line rounded-ui-card p-5 flex flex-col min-w-0"
        >
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
              <span class="text-ui-cap text-ui-faint tabular-nums">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</span>
              <UiBadge v-if="announcement.is_pinned" tone="accent"><Pin class="w-3 h-3" />{{ $t("announcements.pinned") }}</UiBadge>
              <UiBadge tone="outline">{{ audienceLabel(announcement.audience) }}</UiBadge>
            </div>
            <div class="flex items-center gap-0.5 shrink-0 -mr-1.5 -my-1">
              <button
                type="button"
                class="ui-press w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
:title="$t('common.actions.view')"
                :aria-label="$t('common.actions.view')"
                @click="openViewModal(announcement.id)"
              >
                <Eye class="w-4 h-4" />
              </button>
              <button
                v-if="can('announcement-edit') && canManage(announcement)"
                type="button"
                class="ui-press w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
:title="$t('common.actions.edit')"
                :aria-label="$t('common.actions.edit')"
                @click="openEditModal(announcement)"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                v-if="can('announcement-delete') && canManage(announcement)"
                type="button"
                class="ui-press w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
:title="$t('common.actions.delete')"
                :aria-label="$t('common.actions.delete')"
                @click="handleDelete(announcement.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 class="text-ui-h3 text-ui-ink mt-3 break-words">{{ announcement.title }}</h3>
          <p class="text-ui-body text-ui-text whitespace-pre-line break-words line-clamp-4 mt-1.5 flex-1">{{ announcement.body }}</p>

          <div class="flex items-center gap-2 mt-4 pt-3 border-t border-ui-line text-ui-cap text-ui-muted min-w-0">
            <Avatar :alt="announcement.created_by?.name ?? ''" size="w-6 h-6" icon-size="w-3 h-3" />
            <span class="truncate">{{ $t("announcements.by", { name: announcement.created_by?.name ?? '-' }) }} · {{ formatDate(announcement.created_at) }}</span>
            <span v-if="announcement.expires_at" class="ml-auto inline-flex items-center gap-1 shrink-0">
              <CalendarClock class="w-3.5 h-3.5" />{{ $t("announcements.validUntilDate", { date: formatDate(announcement.expires_at) }) }}
            </span>
          </div>
        </article>
      </div>

      <div v-if="announcements.length === 0" class="bg-ui-surface border border-ui-line rounded-ui-card">
        <UiEmpty :icon="Megaphone" :title="$t('announcements.empty')" />
      </div>

      <Pagination :meta="meta" :loading="loading" :item-label="$t('announcements.itemLabel')" @page-change="load" />
    </div>

    <!-- Create/Edit Modal -->
    <UiModal v-model:open="showModal" :title="editingId ? $t('announcements.edit') : $t('announcements.create')" size="lg">
      <form id="announcement-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
        <UiInput v-model="form.title" :label="$t('announcements.form.title')" required class="sm:col-span-2" />
        <UiInput v-model="form.body" :label="$t('announcements.form.content')" :rows="6" required class="sm:col-span-2" />
        <UiSelect v-model="form.audience" :label="$t('announcements.form.audience')" :options="audienceOptions" />
        <UiInput v-model="form.expires_at" type="date" :label="$t('announcements.form.validUntilOptional')" />
        <div class="sm:col-span-2 rounded-ui-control border border-ui-line px-3.5 py-3" :class="isExpiredForPin ? 'opacity-60' : ''">
          <UiSwitch v-model="form.is_pinned" :label="$t('announcements.form.pinToTop')" :disabled="isExpiredForPin" />
          <p v-if="isExpiredForPin" class="text-ui-cap text-ui-bad mt-1">
            {{ $t("announcements.form.pinExpired") }}
          </p>
        </div>
        <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" class="sm:col-span-2" />
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="closeModal">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="announcement-form" :loading="submitting">{{ submitting ? $t("common.actions.saving") : $t("common.actions.save") }}</UiButton>
      </template>
    </UiModal>

    <!-- View Modal -->
    <UiModal v-model:open="showViewModal" :title="$t('announcements.detailTitle')" @close="closeViewModal">
      <div v-if="loadingDetail" class="space-y-3">
        <Skeleton width="60%" height="18px" />
        <Skeleton width="100%" height="14px" />
        <Skeleton width="90%" height="14px" />
        <Skeleton width="40%" height="14px" />
      </div>

      <div v-else-if="viewingAnnouncement" class="space-y-4">
        <div class="space-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            <UiBadge v-if="viewingAnnouncement.is_pinned" tone="accent"><Pin class="w-3 h-3" />{{ $t("announcements.pinned") }}</UiBadge>
            <UiBadge tone="outline">{{ audienceLabel(viewingAnnouncement.audience) }}</UiBadge>
          </div>
          <h3 class="text-ui-h2 text-ui-ink break-words">{{ viewingAnnouncement.title }}</h3>
        </div>

        <p class="text-ui-body text-ui-text whitespace-pre-line">{{ viewingAnnouncement.body }}</p>

        <div class="border-t border-ui-line pt-3 space-y-1.5 text-ui-cap text-ui-muted">
          <p>{{ $t("announcements.createdBy", { name: viewingAnnouncement.created_by?.name ?? '-' }) }} · {{ formatDate(viewingAnnouncement.created_at) }}</p>
          <p v-if="viewingAnnouncement.expires_at">{{ $t("announcements.validUntilDate", { date: formatDate(viewingAnnouncement.expires_at) }) }}</p>
        </div>
      </div>

      <template #footer>
        <UiButton variant="secondary" block class="sm:w-auto" @click="closeViewModal">{{ $t("common.actions.close") }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>
