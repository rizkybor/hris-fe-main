<script setup>
// Deleted employees (Superadmin/Manager) with a Restore button. Restoring
// brings back the profile, the original email and the login; it isn't
// possible when that email now belongs to another (newly created) account.
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RotateCcw, UserX } from "lucide-vue-next";
import Avatar from "@/components/common/Avatar.vue";
import { UiButton, UiEmpty, UiModal } from "@/components/ui";
import { useEmployeeStore } from "@/stores/employee";
import { useAlertModalStore } from "@/stores/alertModal";
import { useAuthStore } from "@/stores/auth";
import { formatDate } from "@/utils/dateUtils";

const open = defineModel("open", { type: Boolean, default: false });
const emit = defineEmits(["restored"]);
const { t } = useI18n();
const store = useEmployeeStore();
const alertModal = useAlertModalStore();
const authStore = useAuthStore();

const rows = ref([]);
const loading = ref(false);
const restoringId = ref(null);
const isSuperadmin = () => (authStore.user?.roles || []).includes("superadmin");

const load = async () => {
  loading.value = true;
  try {
    rows.value = await store.fetchDeletedEmployees();
  } catch {
    rows.value = [];
  } finally {
    loading.value = false;
  }
};
watch(open, (isOpen) => isOpen && load(), { immediate: true });

const restore = async (row) => {
  if (!(await alertModal.confirm(t("employees.list.restoreConfirm", { name: row.name }), { type: "info", confirmText: t("employees.list.restore") }))) return;
  restoringId.value = row.id;
  try {
    await store.restoreEmployee(row.id);
    rows.value = rows.value.filter((r) => r.id !== row.id);
    emit("restored", row);
    await alertModal.alert(t("employees.list.restored", { name: row.name }), { type: "success" });
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || t("employees.list.restoreFailed"), { type: "danger" });
  } finally {
    restoringId.value = null;
  }
};
</script>

<template>
  <UiModal v-model:open="open" :title="$t('employees.list.deletedTitle')" :description="$t('employees.list.deletedSubtitle')" size="md">
    <div v-if="loading" class="space-y-2" aria-hidden="true">
      <div v-for="i in 3" :key="i" class="h-14 rounded-ui-control bg-ui-subtle animate-pulse"></div>
    </div>
    <UiEmpty v-else-if="!rows.length" compact :icon="UserX" :title="$t('employees.list.deletedEmpty')" />
    <ul v-else class="divide-y divide-ui-line -my-2">
      <li v-for="row in rows" :key="row.id" class="py-3">
        <div class="flex items-center gap-3">
          <Avatar :alt="row.name" size="w-9 h-9" icon-size="w-4 h-4" />
          <div class="flex-1 min-w-0">
            <p class="text-ui-small font-medium text-ui-ink truncate">{{ row.name }}</p>
            <p class="text-ui-cap text-ui-muted truncate">
              {{ row.email }}<template v-if="row.job_title"> · {{ row.job_title }}</template>
            </p>
            <p class="text-ui-cap text-ui-faint">{{ $t("employees.list.deletedOn", { date: formatDate(row.deleted_at) }) }}</p>
          </div>
          <UiButton
            variant="secondary"
            size="sm"
            :icon="RotateCcw"
            :loading="restoringId === row.id"
            :disabled="row.email_taken || restoringId !== null"
            @click="restore(row)"
          >
            {{ $t("employees.list.restore") }}
          </UiButton>
        </div>
        <p v-if="row.email_taken" class="text-ui-cap text-ui-warn mt-1.5 ml-12">{{ $t("employees.list.emailTaken", { email: row.email }) }}</p>
      </li>
    </ul>
  </UiModal>
</template>
