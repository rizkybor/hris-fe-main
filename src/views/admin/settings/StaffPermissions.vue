<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  UserCog,
  Search,
  X,
  Lock,
  CheckSquare,
  Square,
  ShieldCheck,
  Mail,
  ArrowLeft,
} from "lucide-vue-next";
import { useStaffPermissionStore } from "@/stores/staffPermission";
import { useRoleStore } from "@/stores/role";
import Alert from "@/components/common/Alert.vue";
import Avatar from "@/components/common/Avatar.vue";
import { UiBadge, UiButton, UiEmpty, UiInput, UiModal, UiPageHeader, UiSpinner, UiTable } from "@/components/ui";

const staffStore = useStaffPermissionStore();
const { staffAccounts, currentStaff, loading, saving, error, success } = storeToRefs(staffStore);

const roleStore = useRoleStore();
const { permissionGroups } = storeToRefs(roleStore);

const search = ref("");
const isModalOpen = ref(false);
const selectedEmployeeId = ref(null);
const permissionSearch = ref("");
const formPermissions = ref([]);

onMounted(async () => {
  await Promise.all([staffStore.fetchStaffAccounts(), roleStore.fetchPermissions()]);
});

let searchTimeout = null;
watch(search, (value) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => staffStore.fetchStaffAccounts(value), 300);
});

watch(success, (value) => {
  if (value) {
    setTimeout(() => staffStore.$patch({ success: null }), 3000);
  }
});

const permissionMeta = computed(() => {
  const map = new Map();
  for (const group of permissionGroups.value) {
    for (const perm of group.permissions) {
      map.set(perm.name, { moduleLabel: group.label, action: perm.action });
    }
  }
  return map;
});

const rolePermissionSet = computed(() => new Set(currentStaff.value?.role_permissions || []));

const rolePermissionsByModule = computed(() => {
  const grouped = new Map();
  for (const name of currentStaff.value?.role_permissions || []) {
    const meta = permissionMeta.value.get(name);
    const label = meta?.moduleLabel || "Other";
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(meta?.action || name);
  }
  return Array.from(grouped.entries()).map(([label, actions]) => ({ label, actions }));
});

// Only surface permissions the Staff role doesn't already grant -- toggling
// an already-inherited one wouldn't change this account's access.
const extraGroups = computed(() => {
  const query = permissionSearch.value.trim().toLowerCase();
  return permissionGroups.value
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((p) => {
        if (rolePermissionSet.value.has(p.name)) return false;
        if (!query) return true;
        return (
          group.label.toLowerCase().includes(query) ||
          p.action.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query)
        );
      }),
    }))
    .filter((group) => group.permissions.length > 0);
});

const selectedInGroup = (group) =>
  group.permissions.filter((p) => formPermissions.value.includes(p.name)).length;

const togglePermission = (name) => {
  const index = formPermissions.value.indexOf(name);
  if (index === -1) {
    formPermissions.value.push(name);
  } else {
    formPermissions.value.splice(index, 1);
  }
};

const toggleGroup = (group) => {
  const names = group.permissions.map((p) => p.name);
  const allSelected = names.every((n) => formPermissions.value.includes(n));
  if (allSelected) {
    formPermissions.value = formPermissions.value.filter((p) => !names.includes(p));
  } else {
    formPermissions.value = [...new Set([...formPermissions.value, ...names])];
  }
};

const openStaffModal = async (staff) => {
  selectedEmployeeId.value = staff.employee_id;
  permissionSearch.value = "";
  isModalOpen.value = true;
  const data = await staffStore.fetchStaffPermissions(staff.employee_id);
  formPermissions.value = [...(data?.direct_permissions || [])];
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedEmployeeId.value = null;
};

// Presentation only.
const staffColumns = [
  { key: "name", label: "Staff" },
  { key: "email", label: "Email" },
  { key: "extra", label: "Extra permissions" },
  { key: "open", label: "", align: "right", width: 60 },
];
const groupState = (group) => {
  const n = selectedInGroup(group);
  return n === 0 ? "none" : n === group.permissions.length ? "all" : "some";
};

const handleSave = async () => {
  try {
    await staffStore.updateStaffPermissions(selectedEmployeeId.value, formPermissions.value);
    await staffStore.fetchStaffAccounts(search.value);
    closeModal();
  } catch (err) {
    console.error(err);
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      title="Staff Account Permissions"
      subtitle="Grant extra permissions to individual Staff accounts, on top of what the Staff role already gives everyone"
    >
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" aria-label="Back to Settings" title="Back to Settings">
          <ArrowLeft class="w-4 h-4" /> Settings
        </router-link>
      </template>
    </UiPageHeader>

    <Alert v-if="success" type="success" :title="success" :show="!!success" />

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <div class="px-4 sm:px-5 pt-4 pb-3 flex flex-col md:flex-row md:items-center gap-3 border-b border-ui-line">
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink">Staff accounts</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">{{ staffAccounts.length }} accounts</p>
        </div>
        <UiInput v-model="search" :icon="Search" placeholder="Search staff by name or email..." class="md:w-[300px]" />
      </div>

      <UiTable
        :columns="staffColumns"
        :rows="staffAccounts"
        row-key="employee_id"
        :loading="loading && !isModalOpen"
        :skeleton-rows="6"
        clickable
        @row-click="openStaffModal"
      >
        <template #cell-name="{ row }">
          <div class="flex items-center gap-3 min-w-0">
            <Avatar :src="row.profile_photo" :alt="row.name" size="w-9 h-9" icon-size="w-4 h-4" />
            <div class="min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate">{{ row.job_title || "-" }}</p>
            </div>
          </div>
        </template>
        <template #cell-email="{ row }">
          <span class="text-ui-muted truncate">{{ row.email }}</span>
        </template>
        <template #cell-extra="{ row }">
          <UiBadge v-if="row.direct_permissions_count > 0" tone="accent">
            <ShieldCheck class="w-3 h-3" />
            {{ row.direct_permissions_count }} extra permission{{ row.direct_permissions_count === 1 ? "" : "s" }}
          </UiBadge>
          <UiBadge v-else tone="neutral">Role permissions only</UiBadge>
        </template>
        <template #cell-open>
          <UserCog class="w-4 h-4 text-ui-faint inline" />
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-center gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
            <Avatar :src="row.profile_photo" :alt="row.name" size="w-10 h-10" icon-size="w-4 h-4" />
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate flex items-center gap-1"><Mail class="w-3 h-3 shrink-0" />{{ row.email }}</p>
              <div class="mt-1.5">
                <UiBadge v-if="row.direct_permissions_count > 0" tone="accent">
                  {{ row.direct_permissions_count }} extra permission{{ row.direct_permissions_count === 1 ? "" : "s" }}
                </UiBadge>
                <UiBadge v-else tone="neutral">Role permissions only</UiBadge>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="UserCog" title="No Staff accounts found" compact />
        </template>
      </UiTable>
    </section>

    <!-- PERMISSIONS MODAL -->
    <UiModal :open="isModalOpen" size="lg" @update:open="(v) => !v && closeModal()">
      <template #header>
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <Avatar v-if="currentStaff" :src="currentStaff.profile_photo" :alt="currentStaff.name" size="w-10 h-10" icon-size="w-5 h-5" />
          <div class="min-w-0">
            <h2 class="text-ui-h2 text-ui-ink truncate">{{ currentStaff?.name || "Loading..." }}</h2>
            <p class="text-ui-small text-ui-muted truncate">{{ currentStaff?.email }}</p>
          </div>
        </div>
      </template>

      <div v-if="loading" class="flex items-center justify-center py-16">
        <UiSpinner />
      </div>
      <div v-else class="space-y-6">
        <!-- Role-inherited permissions (read-only) -->
        <div>
          <div class="flex items-center gap-2 mb-2.5">
            <Lock class="w-4 h-4 text-ui-faint" />
            <p class="text-ui-small font-medium text-ui-ink">Inherited from Staff role</p>
            <span class="text-ui-cap text-ui-faint tabular-nums">({{ currentStaff?.role_permissions?.length || 0 }})</span>
          </div>
          <div v-if="rolePermissionsByModule.length" class="flex flex-wrap gap-1.5">
            <UiBadge v-for="group in rolePermissionsByModule" :key="group.label" :title="group.actions.join(', ')">
              {{ group.label }} ({{ group.actions.length }})
            </UiBadge>
          </div>
          <p v-else class="text-ui-cap text-ui-muted italic">No permissions granted by the Staff role.</p>
        </div>

        <!-- Extra, account-specific permissions -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <p class="flex-1 text-ui-small font-medium text-ui-ink">Extra permissions for this account</p>
            <span class="text-ui-cap text-ui-muted tabular-nums">{{ formPermissions.length }} selected</span>
          </div>

          <UiInput v-model="permissionSearch" :icon="Search" placeholder="Search modules or actions..." class="mb-3" />

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div v-for="group in extraGroups" :key="group.key" class="border border-ui-line rounded-ui-card">
              <label class="flex items-center gap-2.5 px-3 py-2.5 border-b border-ui-line">
                <input
                  type="checkbox"
                  class="w-4 h-4 accent-[rgb(var(--ui-ink))]"
                  :checked="groupState(group) === 'all'"
                  :indeterminate.prop="groupState(group) === 'some'"
                  @change="toggleGroup(group)"
                />
                <span class="flex-1 min-w-0 text-ui-small font-medium text-ui-ink truncate">{{ group.label }}</span>
                <span class="text-ui-cap text-ui-faint tabular-nums">{{ selectedInGroup(group) }}/{{ group.permissions.length }}</span>
              </label>
              <div class="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2.5">
                <label v-for="perm in group.permissions" :key="perm.id" class="flex items-center gap-2 text-ui-small text-ui-text">
                  <input
                    type="checkbox"
                    class="w-4 h-4 accent-[rgb(var(--ui-ink))]"
                    :checked="formPermissions.includes(perm.name)"
                    @change="togglePermission(perm.name)"
                  />
                  <span class="truncate">{{ perm.action }}</span>
                </label>
              </div>
            </div>

            <p v-if="extraGroups.length === 0" class="sm:col-span-2 text-center py-8 text-ui-small text-ui-muted">
              {{ permissionSearch ? `No modules match "${permissionSearch}"` : "This account already has every permission via the Staff role." }}
            </p>
          </div>
        </div>

        <p v-if="error" class="text-ui-small text-ui-bad">
          {{ typeof error === "string" ? error : "Something went wrong." }}
        </p>
      </div>

      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="closeModal">Cancel</UiButton>
        <UiButton class="flex-1 sm:flex-none" :loading="saving" :disabled="saving || loading" @click="handleSave">
          {{ saving ? "Saving..." : "Save Permissions" }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
