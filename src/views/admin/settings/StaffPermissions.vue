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
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";

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
  <div class="px-4 py-4">
    <div class="bg-white mb-5">
      <div class="flex items-center gap-3">
        <router-link
          :to="{ name: 'admin.settings.dashboard' }"
          class="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all duration-300 shrink-0"
          aria-label="Back to Settings"
          title="Back to Settings"
        >
          <ArrowLeft class="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
        </router-link>
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <UserCog class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Staff Account Permissions</h3>
          <p class="text-brand-light text-sm">
            Grant extra permissions to individual Staff accounts, on top of what the Staff role already gives everyone
          </p>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <Alert v-if="success" type="success" :title="success" :show="!!success" />
    </Transition>

    <div class="relative mb-6 max-w-md">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search class="w-4 h-4 text-gray-400" />
      </div>
      <input
        v-model="search"
        type="text"
        placeholder="Search staff by name or email..."
        class="w-full pl-9 pr-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none bg-white"
      />
    </div>

    <SkeletonCardGrid v-if="loading && !isModalOpen" :count="6" cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        v-for="staff in staffAccounts"
        :key="staff.employee_id"
        @click="openStaffModal(staff)"
        class="text-left bg-white border border-[#DCDEDD] rounded-[12px] p-4 hover:border-[#0C51D9] hover:shadow-sm transition-all"
      >
        <div class="flex items-center gap-3 mb-3">
          <Avatar :src="staff.profile_photo" :alt="staff.name" size="w-11 h-11" icon-size="w-5 h-5" />
          <div class="min-w-0">
            <p class="text-brand-dark text-sm font-bold truncate">{{ staff.name }}</p>
            <p class="text-brand-light text-xs truncate">{{ staff.job_title || "-" }}</p>
          </div>
        </div>
        <p class="flex items-center gap-1.5 text-xs text-gray-400 truncate mb-2">
          <Mail class="w-3 h-3 shrink-0" /> {{ staff.email }}
        </p>
        <span
          v-if="staff.direct_permissions_count > 0"
          class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 text-[#0C51D9] font-semibold"
        >
          <ShieldCheck class="w-3 h-3" />
          {{ staff.direct_permissions_count }} extra permission{{ staff.direct_permissions_count === 1 ? "" : "s" }}
        </span>
        <span v-else class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-50 text-gray-400 font-medium">
          Role permissions only
        </span>
      </button>

      <div v-if="!loading && staffAccounts.length === 0" class="col-span-full text-center py-12 text-gray-500">
        <p class="text-lg font-semibold">No Staff accounts found</p>
      </div>
    </div>

    <!-- PERMISSIONS MODAL -->
    <Transition name="fade">
      <div v-if="isModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="closeModal"></div>

        <div class="bg-white rounded-[14px] w-full max-w-3xl relative z-10 shadow-2xl max-h-[90vh] flex flex-col">
          <!-- Modal Header -->
          <div class="flex items-start justify-between p-4 sm:p-6 border-b border-[#F1F1F1] shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <Avatar
                v-if="currentStaff"
                :src="currentStaff.profile_photo"
                :alt="currentStaff.name"
                size="w-11 h-11"
                icon-size="w-5 h-5"
              />
              <div class="min-w-0">
                <h3 class="text-base sm:text-xl font-bold text-brand-dark truncate">
                  {{ currentStaff?.name || "Loading..." }}
                </h3>
                <p class="text-brand-light text-xs sm:text-sm truncate">{{ currentStaff?.email }}</p>
              </div>
            </div>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 shrink-0">
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Modal Body -->
          <div v-if="loading" class="flex-1 flex items-center justify-center py-16">
            <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div v-else class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <!-- Role-inherited permissions (read-only) -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <Lock class="w-4 h-4 text-gray-400" />
                <label class="text-sm font-semibold text-brand-dark">
                  Inherited from Staff role
                </label>
                <span class="text-xs text-gray-400">({{ currentStaff?.role_permissions?.length || 0 }})</span>
              </div>
              <div v-if="rolePermissionsByModule.length" class="flex flex-wrap gap-1.5">
                <span
                  v-for="group in rolePermissionsByModule"
                  :key="group.label"
                  :title="group.actions.join(', ')"
                  class="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-500 font-medium"
                >
                  {{ group.label }} ({{ group.actions.length }})
                </span>
              </div>
              <p v-else class="text-xs text-gray-400 italic">No permissions granted by the Staff role.</p>
            </div>

            <!-- Extra, account-specific permissions -->
            <div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between mb-3">
                <label class="text-sm font-semibold text-brand-dark">
                  Extra permissions for this account
                </label>
                <span class="text-xs text-brand-light">{{ formPermissions.length }} selected</span>
              </div>

              <div class="relative mb-3">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search class="w-4 h-4 text-gray-400" />
                </div>
                <input
                  v-model="permissionSearch"
                  type="text"
                  placeholder="Search modules or actions..."
                  class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  v-for="group in extraGroups"
                  :key="group.key"
                  class="border border-[#DCDEDD] rounded-xl p-3"
                >
                  <button
                    type="button"
                    @click="toggleGroup(group)"
                    class="w-full flex items-center justify-between mb-2 group/header"
                  >
                    <span class="flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
                      <CheckSquare
                        v-if="selectedInGroup(group) === group.permissions.length"
                        class="w-4 h-4 text-[#0C51D9]"
                      />
                      <Square v-else class="w-4 h-4 text-gray-300 group-hover/header:text-gray-400" />
                      {{ group.label }}
                    </span>
                    <span class="text-xs text-gray-400 font-medium">
                      {{ selectedInGroup(group) }}/{{ group.permissions.length }}
                    </span>
                  </button>
                  <div class="flex flex-wrap gap-1.5">
                    <label
                      v-for="perm in group.permissions"
                      :key="perm.id"
                      class="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border cursor-pointer transition-colors"
                      :class="
                        formPermissions.includes(perm.name)
                          ? 'bg-blue-50 border-[#0C51D9] text-[#0C51D9]'
                          : 'border-[#DCDEDD] text-brand-dark hover:border-gray-400'
                      "
                    >
                      <input
                        type="checkbox"
                        class="hidden"
                        :checked="formPermissions.includes(perm.name)"
                        @change="togglePermission(perm.name)"
                      />
                      {{ perm.action }}
                    </label>
                  </div>
                </div>

                <div v-if="extraGroups.length === 0" class="sm:col-span-2 text-center py-8 text-sm text-gray-400">
                  {{ permissionSearch ? `No modules match "${permissionSearch}"` : "This account already has every permission via the Staff role." }}
                </div>
              </div>
            </div>

            <p v-if="error" class="text-red-500 text-sm">
              {{ typeof error === "string" ? error : "Something went wrong." }}
            </p>
          </div>

          <!-- Modal Footer -->
          <div class="grid grid-cols-2 gap-3 p-4 sm:p-6 border-t border-[#F1F1F1] shrink-0">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleSave"
              :disabled="saving || loading"
              class="px-4 py-3 rounded-xl bg-[#0C51D9] text-white font-semibold hover:brightness-110 transition disabled:opacity-50"
            >
              {{ saving ? "Saving..." : "Save Permissions" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
