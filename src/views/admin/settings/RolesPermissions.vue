<script setup>
import { onMounted, ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
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
  ArrowLeft,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useRoleStore } from "@/stores/role";
import { getRoleLabel } from "@/utils/badgeUtils";
import { UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiModal, UiPageHeader, UiTable } from "@/components/ui";

const SYSTEM_ROLES = ["superadmin", "manager", "operational_director", "hr", "finance", "staff"];
const ROLE_COLORS = {
  superadmin: { bg: "bg-red-100", text: "text-red-700" },
  manager: { bg: "bg-indigo-100", text: "text-indigo-700" },
  operational_director: { bg: "bg-amber-100", text: "text-amber-700" },
  hr: { bg: "bg-purple-100", text: "text-purple-700" },
  finance: { bg: "bg-green-100", text: "text-green-700" },
  staff: { bg: "bg-blue-100", text: "text-blue-700" },
};
const DEFAULT_COLOR = { bg: "bg-gray-100", text: "text-gray-700" };

const { t, te } = useI18n();

const camelKey = (value) => String(value).replace(/[-_ ]+([a-z0-9])/gi, (_, c) => c.toUpperCase());
const translated = (key, fallback) => (te(key) ? t(key) : fallback);
const moduleLabel = (group) => translated(`settings.permissions.modules.${camelKey(group.key)}`, group.label);
const sectionLabel = (section) => {
  const key = camelKey(section.charAt(0).toLowerCase() + section.slice(1));
  return translated(`settings.permissions.sections.${key}`, section);
};
const actionLabel = (group, perm) => {
  const suffix = perm.name.startsWith(`${group.key}-`) ? perm.name.slice(group.key.length + 1) : perm.name;
  return translated(`settings.permissions.actions.${camelKey(suffix)}`, perm.action);
};
const matchesQuery = (group, perm, query) =>
  group.label.toLowerCase().includes(query) ||
  moduleLabel(group).toLowerCase().includes(query) ||
  perm.action.toLowerCase().includes(query) ||
  actionLabel(group, perm).toLowerCase().includes(query) ||
  perm.name.toLowerCase().includes(query);

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
      map.set(perm.name, { group });
    }
  }
  return map;
});

const totalPermissionCount = computed(() =>
  permissionGroups.value.reduce((sum, g) => sum + g.permissions.length, 0)
);

// Super Admin is a protected system account, not a regular assignable
// role, so it's hidden from this management list entirely.
const visibleRoles = computed(() => roles.value.filter((role) => role.name !== "superadmin"));

const isSystemRole = (role) => SYSTEM_ROLES.includes(role.name);
const roleColor = (role) => ROLE_COLORS[role.name] ?? DEFAULT_COLOR;
const roleLabel = (role) => getRoleLabel(role.name);
const roleInitials = (role) => roleLabel(role).slice(0, 2).toUpperCase();

const roleModuleSummary = (role) => {
  const modules = new Set();
  for (const perm of role.permissions) {
    const meta = permissionMeta.value.get(perm.name);
    if (meta) modules.add(moduleLabel(meta.group));
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

  return permissionGroups.value.filter((group) => group.permissions.some((p) => matchesQuery(group, p, query)));
});

const sectionedGroups = computed(() => {
  const sections = [];
  const bySection = new Map();
  for (const group of filteredGroups.value) {
    const key = group.section || "Other";
    if (!bySection.has(key)) {
      bySection.set(key, { section: key, groups: [] });
      sections.push(bySection.get(key));
    }
    bySection.get(key).groups.push(group);
  }
  return sections;
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

const MATRIX_ACTIONS = [
  { label: "Menu Access", key: "menu", shortKey: "menuShort" },
  { label: "List", key: "list", shortKey: "list" },
  { label: "View", key: "view", shortKey: "view" },
  { label: "Create", key: "create", shortKey: "create" },
  { label: "Edit", key: "edit", shortKey: "edit" },
  { label: "Delete", key: "delete", shortKey: "delete" },
];
const MATRIX_LABELS = MATRIX_ACTIONS.map((a) => a.label);
const matrixColumns = computed(() =>
  MATRIX_ACTIONS.filter((a) => permissionGroups.value.some((g) => g.permissions.some((p) => p.action === a.label))).map((a) => ({
    ...a,
    name: t(`settings.permissions.actions.${a.key}`),
    short: t(`settings.permissions.actions.${a.shortKey}`),
  }))
);
const permByAction = (group, label) => group.permissions.find((p) => p.action === label);
const otherPerms = (group) => group.permissions.filter((p) => !MATRIX_LABELS.includes(p.action));
// Modules with none of the standard actions (e.g. Dashboard Widgets) spread
// their own permissions across the whole row instead of one narrow column.
const hasMatrix = (group) => matrixColumns.value.some((col) => permByAction(group, col.label));
const groupState = (group) => {
  const n = selectedInGroup(group);
  return n === 0 ? "none" : n === group.permissions.length ? "all" : "some";
};
const roleColumns = computed(() => [
  { key: "role", label: t("settings.roles.columns.role") },
  { key: "users", label: t("settings.roles.columns.users"), align: "right", width: 90 },
  { key: "coverage", label: t("settings.roles.columns.permissions"), width: 220 },
  { key: "modules", label: t("settings.roles.columns.modules") },
  { key: "actions", label: "", align: "right", width: 110 },
]);

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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('settings.roles.title')" :subtitle="$t('settings.roles.subtitle')">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" :aria-label="$t('settings.backToSettings')" :title="$t('settings.backToSettings')">
          <ArrowLeft class="w-4 h-4" /> {{ $t("settings.settings") }}
        </router-link>
      </template>
      <template #actions>
        <UiButton :icon="Plus" @click="openCreateForm">{{ $t("settings.roles.add") }}</UiButton>
      </template>
    </UiPageHeader>

    <Alert v-if="success" type="success" :title="success" :show="!!success" />

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <div class="px-4 sm:px-5 pt-4 pb-3 border-b border-ui-line flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink">{{ $t("settings.roles.listTitle") }}</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">{{ $t("settings.roles.summary", { roles: visibleRoles.length, permissions: totalPermissionCount }) }}</p>
        </div>
      </div>

      <UiTable :columns="roleColumns" :rows="visibleRoles" :loading="loading" :skeleton-rows="4">
        <template #cell-role="{ row }">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-9 h-9 rounded-ui-control bg-ui-subtle text-ui-text text-ui-cap font-semibold flex items-center justify-center shrink-0">{{ roleInitials(row) }}</span>
            <div class="min-w-0">
              <p class="flex items-center gap-1.5 text-ui-body font-medium text-ui-ink truncate">
                {{ roleLabel(row) }}
                <Lock v-if="isSystemRole(row)" class="w-3 h-3 text-ui-faint shrink-0" />
              </p>
              <p class="text-ui-cap text-ui-muted">{{ isSystemRole(row) ? $t("settings.roles.systemRole") : $t("settings.roles.customRole") }}</p>
            </div>
          </div>
        </template>
        <template #cell-users="{ row }">
          <span class="tabular-nums text-ui-ink">{{ row.users_count }}</span>
        </template>
        <template #cell-coverage="{ row }">
          <div class="min-w-[160px]">
            <div class="flex items-center justify-between text-ui-cap mb-1">
              <span class="text-ui-muted tabular-nums">{{ $t("settings.roles.permissionCount", { n: row.permissions.length }, row.permissions.length) }} · {{ $t("settings.roles.moduleCount", { n: roleModuleSummary(row).length }, roleModuleSummary(row).length) }}</span>
              <span class="text-ui-ink font-medium tabular-nums">{{ roleCoverage(row) }}%</span>
            </div>
            <div class="w-full bg-ui-subtle rounded-full h-1.5">
              <div class="ui-bar-fill h-1.5 rounded-full bg-ui-ink transition-all duration-300" :style="{ width: `${roleCoverage(row)}%` }"></div>
            </div>
          </div>
        </template>
        <template #cell-modules="{ row }">
          <div class="flex flex-wrap gap-1">
            <UiBadge v-for="mod in roleModuleSummary(row).slice(0, 3)" :key="mod">{{ mod }}</UiBadge>
            <UiBadge v-if="roleModuleSummary(row).length > 3" tone="outline">{{ $t("settings.roles.more", { n: roleModuleSummary(row).length - 3 }) }}</UiBadge>
            <span v-if="roleModuleSummary(row).length === 0" class="text-ui-cap text-ui-faint italic">{{ $t("settings.roles.noPermissions") }}</span>
          </div>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UiButton variant="ghost" size="sm" :icon="Pencil" :title="$t('settings.roles.editAria')" :aria-label="$t('settings.roles.editAria')" @click="openEditForm(row)" />
            <UiButton v-if="!isSystemRole(row)" variant="ghost" size="sm" :icon="Trash2" :title="$t('settings.roles.deleteAria')" :aria-label="$t('settings.roles.deleteAria')" class="hover:text-ui-bad" @click="confirmDelete(row)" />
            <span v-else :title="$t('settings.roles.cannotDelete')" class="w-8 h-8 inline-flex items-center justify-center text-ui-faint opacity-40 cursor-not-allowed">
              <Trash2 class="w-4 h-4" />
            </span>
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-2.5">{{ number }}</span>
            <span class="w-9 h-9 rounded-ui-control bg-ui-subtle text-ui-text text-ui-cap font-semibold flex items-center justify-center shrink-0">{{ roleInitials(row) }}</span>
            <div class="flex-1 min-w-0">
              <p class="flex items-center gap-1.5 text-ui-body font-medium text-ui-ink truncate">
                {{ roleLabel(row) }}
                <Lock v-if="isSystemRole(row)" class="w-3 h-3 text-ui-faint shrink-0" />
              </p>
              <p class="text-ui-cap text-ui-muted tabular-nums flex items-center gap-1">
                <Users class="w-3 h-3" />{{ $t("settings.roles.userCount", { n: row.users_count }, row.users_count) }} · {{ $t("settings.roles.permissionCount", { n: row.permissions.length }, row.permissions.length) }} · {{ roleCoverage(row) }}%
              </p>
              <div class="w-full bg-ui-subtle rounded-full h-1 mt-2">
                <div class="ui-bar-fill h-1 rounded-full bg-ui-ink" :style="{ width: `${roleCoverage(row)}%` }"></div>
              </div>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              <UiButton variant="ghost" size="sm" :icon="Pencil" :aria-label="$t('settings.roles.editAria')" @click="openEditForm(row)" />
              <UiButton v-if="!isSystemRole(row)" variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('settings.roles.deleteAria')" @click="confirmDelete(row)" />
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="ShieldCheck" :title="$t('settings.roles.empty')" compact />
        </template>
      </UiTable>
    </section>

    <!-- FORM MODAL -->
    <UiModal
      v-model:open="isFormOpen"
      size="lg"
      :title="form.id ? $t('settings.roles.edit') : $t('settings.roles.addNew')"
      :description="$t('settings.roles.selectedOf', { selected: form.permissions.length, total: totalPermissionCount })"
    >
      <div class="space-y-5">
        <UiInput
          v-model="form.name"
          :label="$t('settings.roles.roleName')"
          required
          :placeholder="$t('settings.roles.roleNamePlaceholder')"
          :disabled="!!(form.id && SYSTEM_ROLES.includes(form.name))"
        />

        <div>
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <p class="flex-1 text-ui-small font-medium text-ui-ink">{{ $t("settings.roles.permissions") }}</p>
            <div class="flex items-center gap-1">
              <UiButton variant="ghost" size="sm" :icon="CheckSquare" @click="selectAll">{{ $t("common.actions.selectAll") }}</UiButton>
              <UiButton variant="ghost" size="sm" :icon="Square" @click="clearAll">{{ $t("settings.roles.clearAll") }}</UiButton>
            </div>
          </div>

          <UiInput v-model="permissionSearch" :icon="Search" :placeholder="$t('settings.permissions.searchPlaceholder')" class="mb-4" />

          <!-- Desktop: module x action matrix -->
          <div v-if="filteredGroups.length" class="hidden sm:block border border-ui-line rounded-ui-card">
            <table class="w-full border-collapse table-fixed">
              <colgroup>
                <col class="w-10" />
                <col class="w-[30%]" />
                <col v-for="col in matrixColumns" :key="col.label" class="w-12" />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th class="sticky -top-5 z-10 bg-ui-surface w-10 pl-3 h-10 text-left text-ui-cap font-medium text-ui-muted border-b border-ui-line rounded-tl-ui-card">#</th>
                  <th class="sticky -top-5 z-10 bg-ui-surface px-3 h-10 text-left text-ui-cap font-medium text-ui-muted border-b border-ui-line">{{ $t("settings.roles.module") }}</th>
                  <th v-for="col in matrixColumns" :key="col.label" class="sticky -top-5 z-10 bg-ui-surface px-1 h-10 text-center text-ui-cap font-medium text-ui-muted border-b border-ui-line truncate" :title="col.name">{{ col.short }}</th>
                  <th class="sticky -top-5 z-10 bg-ui-surface px-3 h-10 text-left text-ui-cap font-medium text-ui-muted border-b border-ui-line rounded-tr-ui-card">{{ $t("settings.roles.other") }}</th>
                </tr>
              </thead>
              <tbody v-for="(section, sIndex) in sectionedGroups" :key="section.section">
                <tr>
                  <th :colspan="matrixColumns.length + 3" class="px-3 pt-3 pb-1.5 text-left text-ui-over uppercase tracking-wider text-ui-faint bg-ui-subtle/60 border-b border-ui-line">
                    {{ sectionLabel(section.section) }}
                  </th>
                </tr>
                <tr v-for="(group, gIndex) in section.groups" :key="group.key" class="hover:bg-ui-subtle/60 transition-colors">
                  <td class="pl-3 h-11 text-ui-cap text-ui-faint tabular-nums border-b border-ui-line">
                    {{ sectionedGroups.slice(0, sIndex).reduce((n, s) => n + s.groups.length, 0) + gIndex + 1 }}
                  </td>
                  <td class="px-3 py-1.5 h-11 border-b border-ui-line">
                    <label class="flex items-center gap-2 min-w-0 text-ui-small font-medium text-ui-ink">
                      <input
                        type="checkbox"
                        class="w-4 h-4 accent-[rgb(var(--ui-ink))]"
                        :checked="groupState(group) === 'all'"
                        :indeterminate.prop="groupState(group) === 'some'"
                        @change="toggleGroup(group)"
                      />
                      <!-- Name over its count, so the name gets the full width. -->
                      <span class="flex-1 min-w-0 leading-tight">
                        <span class="block truncate" :title="moduleLabel(group)">{{ moduleLabel(group) }}</span>
                        <span class="block text-ui-cap text-ui-faint font-normal tabular-nums">{{ selectedInGroup(group) }}/{{ group.permissions.length }}</span>
                      </span>
                    </label>
                  </td>
                  <!-- No standard actions: its permissions span the row, two per line. -->
                  <td v-if="!hasMatrix(group)" :colspan="matrixColumns.length + 1" class="px-3 py-2 border-b border-ui-line">
                    <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <label v-for="perm in otherPerms(group)" :key="perm.id" class="flex items-center gap-1.5 min-w-0 text-ui-cap text-ui-text" :title="actionLabel(group, perm)">
                        <input
                          type="checkbox"
                          class="w-3.5 h-3.5 shrink-0 accent-[rgb(var(--ui-ink))]"
                          :checked="form.permissions.includes(perm.name)"
                          @change="togglePermission(perm.name)"
                        />
                        <span class="truncate">{{ actionLabel(group, perm) }}</span>
                      </label>
                    </div>
                  </td>
                  <td v-for="col in (hasMatrix(group) ? matrixColumns : [])" :key="col.label" class="px-1 h-11 text-center border-b border-ui-line">
                    <input
                      v-if="permByAction(group, col.label)"
                      type="checkbox"
                      class="w-4 h-4 align-middle accent-[rgb(var(--ui-ink))]"
                      :aria-label="`${moduleLabel(group)}: ${col.name}`"
                      :checked="form.permissions.includes(permByAction(group, col.label).name)"
                      @change="togglePermission(permByAction(group, col.label).name)"
                    />
                    <span v-else class="text-ui-line-strong" aria-hidden="true">–</span>
                  </td>
                  <td v-if="hasMatrix(group)" class="px-3 py-2 border-b border-ui-line">
                    <div class="flex flex-col gap-1">
                      <label v-for="perm in otherPerms(group)" :key="perm.id" class="flex items-center gap-1.5 min-w-0 text-ui-cap text-ui-text" :title="actionLabel(group, perm)">
                        <input
                          type="checkbox"
                          class="w-3.5 h-3.5 shrink-0 accent-[rgb(var(--ui-ink))]"
                          :checked="form.permissions.includes(perm.name)"
                          @change="togglePermission(perm.name)"
                        />
                        <span class="truncate">{{ actionLabel(group, perm) }}</span>
                      </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Phones: stacked module cards -->
          <div v-if="filteredGroups.length" class="sm:hidden space-y-4">
            <div v-for="section in sectionedGroups" :key="section.section">
              <p class="text-ui-over uppercase tracking-wider text-ui-faint mb-2">{{ sectionLabel(section.section) }}</p>
              <div class="space-y-2">
                <div v-for="group in section.groups" :key="group.key" class="border border-ui-line rounded-ui-card">
                  <label class="flex items-center gap-2.5 px-3 py-2.5 border-b border-ui-line">
                    <input
                      type="checkbox"
                      class="w-4 h-4 accent-[rgb(var(--ui-ink))]"
                      :checked="groupState(group) === 'all'"
                      :indeterminate.prop="groupState(group) === 'some'"
                      @change="toggleGroup(group)"
                    />
                    <span class="flex-1 min-w-0 text-ui-body font-medium text-ui-ink truncate">{{ moduleLabel(group) }}</span>
                    <span class="text-ui-cap text-ui-faint tabular-nums">{{ selectedInGroup(group) }}/{{ group.permissions.length }}</span>
                  </label>
                  <div class="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2.5">
                    <label v-for="perm in group.permissions" :key="perm.id" class="flex items-center gap-2 min-w-0 text-ui-small text-ui-text" :title="actionLabel(group, perm)">
                      <input
                        type="checkbox"
                        class="w-4 h-4 accent-[rgb(var(--ui-ink))]"
                        :checked="form.permissions.includes(perm.name)"
                        @change="togglePermission(perm.name)"
                      />
                      <span class="truncate">{{ actionLabel(group, perm) }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p v-if="filteredGroups.length === 0" class="text-center py-8 text-ui-small text-ui-muted">
            {{ $t("settings.roles.noMatch", { query: permissionSearch }) }}
          </p>
        </div>

        <p v-if="error" class="text-ui-small text-ui-bad">
          {{ typeof error === "string" ? error : $t("settings.roles.checkForm") }}
        </p>
      </div>

      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="closeForm">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton class="flex-1 sm:flex-none" :loading="isSaving" :disabled="isSaving || !form.name" @click="handleSubmit">
          {{ isSaving ? $t("common.actions.saving") : $t("settings.roles.save") }}
        </UiButton>
      </template>
    </UiModal>

    <!-- DELETE MODAL -->
    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      :title="$t('settings.roles.deleteConfirm.title')"
      :message="$t('settings.roles.deleteConfirm.message', { name: roleToDelete?.name })"
      :confirm-text="isDeleting ? $t('common.actions.deleting') : $t('settings.roles.deleteConfirm.confirm')"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>
