<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Users,
  Search,
  Lock,
  CheckSquare,
  Square,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useRoleStore } from "@/stores/role";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";

const SYSTEM_ROLES = ["manager", "hr", "finance", "staff"];
const ROLE_COLORS = {
  manager: { bg: "bg-indigo-100", text: "text-indigo-700" },
  hr: { bg: "bg-purple-100", text: "text-purple-700" },
  finance: { bg: "bg-green-100", text: "text-green-700" },
  employee: { bg: "bg-blue-100", text: "text-blue-700" },
};
const DEFAULT_COLOR = { bg: "bg-gray-100", text: "text-gray-700" };

const roleStore = useRoleStore();
const { roles, permissionGroups, loading, error, success } = storeToRefs(roleStore);

const isFormOpen = ref(false);
const isDeleteModalOpen = ref(false);
const roleToDelete = ref(null);
const isSaving = ref(false);
const isDeleting = ref(false);
const permissionSearch = ref("");

const form = ref({ id: null, name: "", permissions: [] });

watch(success, (value) => {
  if (value) {
    setTimeout(() => roleStore.$patch({ success: null }), 3000);
  }
});

onMounted(async () => {
  await Promise.all([roleStore.fetchRoles(), roleStore.fetchPermissions()]);
});

// name -> { moduleLabel, action } lookup, built once permission groups load.
const permissionMeta = computed(() => {
  const map = new Map();
  for (const group of permissionGroups.value) {
    for (const perm of group.permissions) {
      map.set(perm.name, { moduleLabel: group.label, action: perm.action });
    }
  }
  return map;
});

const totalPermissionCount = computed(() =>
  permissionGroups.value.reduce((sum, g) => sum + g.permissions.length, 0)
);

const isSystemRole = (role) => SYSTEM_ROLES.includes(role.name);
const roleColor = (role) => ROLE_COLORS[role.name] ?? DEFAULT_COLOR;
const roleInitials = (role) => role.name.slice(0, 2).toUpperCase();

const roleModuleSummary = (role) => {
  const modules = new Set();
  for (const perm of role.permissions) {
    const meta = permissionMeta.value.get(perm.name);
    if (meta) modules.add(meta.moduleLabel);
  }
  return Array.from(modules).sort();
};

const roleCoverage = (role) => {
  if (!totalPermissionCount.value) return 0;
  return Math.round((role.permissions.length / totalPermissionCount.value) * 100);
};

function openCreateForm() {
  form.value = { id: null, name: "", permissions: [] };
  permissionSearch.value = "";
  isFormOpen.value = true;
}

function openEditForm(role) {
  form.value = {
    id: role.id,
    name: role.name,
    permissions: role.permissions.map((p) => p.name),
  };
  permissionSearch.value = "";
  isFormOpen.value = true;
}

function closeForm() {
  isFormOpen.value = false;
}

const filteredGroups = computed(() => {
  const query = permissionSearch.value.trim().toLowerCase();
  if (!query) return permissionGroups.value;

  return permissionGroups.value.filter((group) => {
    if (group.label.toLowerCase().includes(query)) return true;
    return group.permissions.some(
      (p) => p.action.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
    );
  });
});

const selectedInGroup = (group) =>
  group.permissions.filter((p) => form.value.permissions.includes(p.name)).length;

function togglePermission(name) {
  const index = form.value.permissions.indexOf(name);
  if (index === -1) {
    form.value.permissions.push(name);
  } else {
    form.value.permissions.splice(index, 1);
  }
}

function toggleGroup(group) {
  const names = group.permissions.map((p) => p.name);
  const allSelected = names.every((n) => form.value.permissions.includes(n));

  if (allSelected) {
    form.value.permissions = form.value.permissions.filter((p) => !names.includes(p));
  } else {
    form.value.permissions = [...new Set([...form.value.permissions, ...names])];
  }
}

function selectAll() {
  form.value.permissions = permissionGroups.value.flatMap((g) => g.permissions.map((p) => p.name));
}

function clearAll() {
  form.value.permissions = [];
}

async function handleSubmit() {
  isSaving.value = true;
  try {
    if (form.value.id) {
      await roleStore.updateRole(form.value.id, {
        name: form.value.name,
        permissions: form.value.permissions,
      });
    } else {
      await roleStore.createRole({
        name: form.value.name,
        permissions: form.value.permissions,
      });
    }
    isFormOpen.value = false;
  } catch (err) {
    console.error(err);
  } finally {
    isSaving.value = false;
  }
}

function confirmDelete(role) {
  roleToDelete.value = role;
  isDeleteModalOpen.value = true;
}

async function handleDelete() {
  if (!roleToDelete.value) return;
  isDeleting.value = true;
  try {
    await roleStore.deleteRole(roleToDelete.value.id);
    isDeleteModalOpen.value = false;
    roleToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div>
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <ShieldCheck class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Roles & Permissions</h3>
          <p class="text-brand-light text-sm">
            Control which modules and actions each role can access
          </p>
        </div>
      </div>

      <button
        @click="openCreateForm"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Add Role</span>
      </button>
    </div>

    <Transition name="fade">
      <Alert v-if="success" type="success" :title="success" :show="!!success" />
    </Transition>

    <SkeletonCardGrid v-if="loading" :count="4" cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="role in roles"
        :key="role.id"
        class="bg-white border border-[#DCDEDD] rounded-[12px] p-5 hover:border-[#0C51D9] hover:shadow-sm transition-all"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 font-bold text-sm"
              :class="[roleColor(role).bg, roleColor(role).text]"
            >
              {{ roleInitials(role) }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="text-brand-dark text-base font-bold capitalize truncate">
                  {{ role.name }}
                </p>
                <Lock v-if="isSystemRole(role)" class="w-3 h-3 text-gray-400 shrink-0" />
              </div>
              <div class="flex items-center gap-1 text-brand-light text-xs mt-0.5">
                <Users class="w-3 h-3" />
                <span>{{ role.users_count }} user{{ role.users_count === 1 ? "" : "s" }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              @click="openEditForm(role)"
              title="Edit role"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:ring-2 hover:ring-[#0C51D9]"
            >
              <Pencil class="w-4 h-4 text-gray-600" />
            </button>
            <button
              v-if="!isSystemRole(role)"
              @click="confirmDelete(role)"
              title="Delete role"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group"
            >
              <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
            </button>
            <span
              v-else
              title="System role — cannot be deleted"
              class="flex justify-center items-center border border-[#F1F1F1] rounded-xl p-2 opacity-40 cursor-not-allowed"
            >
              <Trash2 class="w-4 h-4 text-gray-400" />
            </span>
          </div>
        </div>

        <div class="mb-3">
          <div class="flex items-center justify-between text-xs mb-1.5">
            <span class="text-brand-light">
              {{ role.permissions.length }} permission{{ role.permissions.length === 1 ? "" : "s" }}
              · {{ roleModuleSummary(role).length }} modules
            </span>
            <span class="text-brand-dark font-semibold">{{ roleCoverage(role) }}%</span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-1.5">
            <div
              class="h-1.5 rounded-full bg-[#0C51D9] transition-all duration-300"
              :style="{ width: `${roleCoverage(role)}%` }"
            ></div>
          </div>
        </div>

        <div class="flex flex-wrap gap-1">
          <span
            v-for="mod in roleModuleSummary(role).slice(0, 5)"
            :key="mod"
            class="text-xs px-2 py-1 rounded-md bg-blue-50 text-[#0C51D9] font-medium"
          >
            {{ mod }}
          </span>
          <span
            v-if="roleModuleSummary(role).length > 5"
            class="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-500 font-medium"
          >
            +{{ roleModuleSummary(role).length - 5 }} more
          </span>
          <span
            v-if="roleModuleSummary(role).length === 0"
            class="text-xs px-2 py-1 rounded-md bg-gray-50 text-gray-400 font-medium italic"
          >
            No permissions granted
          </span>
        </div>
      </div>

      <div
        v-if="!loading && roles.length === 0"
        class="col-span-full text-center py-12 text-gray-500"
      >
        <p class="text-lg font-semibold">No roles found</p>
      </div>
    </div>

    <!-- FORM MODAL -->
    <Transition name="fade">
      <div v-if="isFormOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="closeForm"></div>

        <div
          class="bg-white rounded-[14px] w-full max-w-3xl relative z-10 shadow-2xl max-h-[90vh] flex flex-col"
        >
          <!-- Modal Header -->
          <div class="flex items-start justify-between p-6 border-b border-[#F1F1F1] shrink-0">
            <div>
              <h3 class="text-xl font-bold text-brand-dark">
                {{ form.id ? "Edit Role" : "Add New Role" }}
              </h3>
              <p class="text-brand-light text-sm mt-0.5">
                {{ form.permissions.length }} of {{ totalPermissionCount }} permissions selected
              </p>
            </div>
            <button @click="closeForm" class="text-gray-400 hover:text-gray-600 shrink-0">
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Modal Body (scrollable) -->
          <div class="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Role Name</label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="e.g. supervisor"
                :disabled="form.id && ['manager', 'hr', 'finance', 'staff'].includes(form.name)"
                class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            <div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between mb-3">
                <label class="text-sm font-semibold text-brand-dark">Permissions</label>
                <div class="flex items-center gap-3">
                  <button type="button" @click="selectAll" class="text-xs text-[#0C51D9] font-semibold hover:underline">
                    Select all
                  </button>
                  <span class="text-gray-300">|</span>
                  <button type="button" @click="clearAll" class="text-xs text-gray-500 font-semibold hover:underline">
                    Clear all
                  </button>
                </div>
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
                  v-for="group in filteredGroups"
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
                        form.permissions.includes(perm.name)
                          ? 'bg-blue-50 border-[#0C51D9] text-[#0C51D9]'
                          : 'border-[#DCDEDD] text-brand-dark hover:border-gray-400'
                      "
                    >
                      <input
                        type="checkbox"
                        class="hidden"
                        :checked="form.permissions.includes(perm.name)"
                        @change="togglePermission(perm.name)"
                      />
                      {{ perm.action }}
                    </label>
                  </div>
                </div>

                <div v-if="filteredGroups.length === 0" class="sm:col-span-2 text-center py-8 text-sm text-gray-400">
                  No modules match "{{ permissionSearch }}"
                </div>
              </div>
            </div>

            <p v-if="error" class="text-red-500 text-sm">
              {{ typeof error === "string" ? error : "Please check the form." }}
            </p>
          </div>

          <!-- Modal Footer -->
          <div class="grid grid-cols-2 gap-3 p-6 border-t border-[#F1F1F1] shrink-0">
            <button
              type="button"
              @click="closeForm"
              class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleSubmit"
              :disabled="isSaving || !form.name"
              class="px-4 py-3 rounded-xl bg-[#0C51D9] text-white font-semibold hover:brightness-110 transition disabled:opacity-50"
            >
              {{ isSaving ? "Saving..." : "Save Role" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- DELETE MODAL -->
    <Transition name="fade">
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-[99] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="isDeleteModalOpen = false"></div>

        <div class="bg-white rounded-[24px] p-6 w-full max-w-sm relative z-10 shadow-2xl">
          <button
            @click="isDeleteModalOpen = false"
            class="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          >
            <X class="w-5 h-5" />
          </button>

          <div class="text-center">
            <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle class="w-8 h-8 text-red-500" />
            </div>

            <h3 class="text-xl font-bold text-brand-dark mb-2">Delete Role?</h3>
            <p class="text-gray-500 text-sm mb-6">
              Are you sure you want to delete
              <span class="font-bold text-brand-dark">"{{ roleToDelete?.name }}"</span>? This
              action cannot be undone.
            </p>

            <div class="grid grid-cols-2 gap-3">
              <button
                @click="isDeleteModalOpen = false"
                class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                @click="handleDelete"
                :disabled="isDeleting"
                class="px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 v-if="!isDeleting" class="w-4 h-4" />
                {{ isDeleting ? "Deleting..." : "Yes, Delete" }}
              </button>
            </div>
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
