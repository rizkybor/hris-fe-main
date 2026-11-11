<script setup>
import { onMounted, watch, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import {
  ShieldCheck,
  Key,
  Lock,
  Trash2,
  Eye,
  Copy,
  Check,
  Pencil,
  Search,
  Plus,
  Globe,
  FileText,
} from "lucide-vue-next";
import {
  UiPageHeader,
  UiStat,
  UiButton,
  UiBadge,
  UiInput,
  UiTable,
  UiEmpty,
  UiAlert,
  UiConfirmDialog,
} from "@/components/ui";
import { useAccountPasswordStore } from "@/stores/accountPassword";

const passwordStore = useAccountPasswordStore();
const { accounts, statistics, loading, success } = storeToRefs(passwordStore);
const searchQuery = ref("");
const isDeleteModalOpen = ref(false);
const accountToDelete = ref(null);
const isDeleting = ref(false);
const copiedId = ref(null);

// Fungsi filter pencarian
const filteredAccounts = computed(() => {
  if (!searchQuery.value) return accounts.value;

  const query = searchQuery.value.toLowerCase();
  return accounts.value.filter((account) => {
    const label = (account.label_password || account.label || "").toLowerCase();
    const username = (
      account.username_email ||
      account.username ||
      ""
    ).toLowerCase();
    return label.includes(query) || username.includes(query);
  });
});

watch(success, (newValue) => {
  if (newValue) {
    setTimeout(() => {
      passwordStore.$patch({ success: null });
    }, 3000);
  }
});

onMounted(async () => {
  // await passwordStore.fetchStatistics();
  await passwordStore.fetchAccounts();
});

const confirmDelete = (account) => {
  accountToDelete.value = account;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!accountToDelete.value) return;

  isDeleting.value = true;
  try {
    await passwordStore.deleteAccount(accountToDelete.value.id);
    isDeleteModalOpen.value = false;
    accountToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};

const copyPassword = (account) => {
  navigator.clipboard.writeText(account.password);
  copiedId.value = account.id;
  setTimeout(() => {
    if (copiedId.value === account.id) copiedId.value = null;
  }, 1500);
};

// Presentation only: table columns and the small tallies on the tiles.
const columns = [
  { key: "label", label: "Credential" },
  { key: "username", label: "Username / Email" },
  { key: "password", label: "Password" },
  { key: "tags", label: "Info" },
  { key: "updated", label: "Updated", class: "hidden 2xl:table-cell" }, // shown on the detail page too
  { key: "actions", label: "", align: "right", width: 168 },
];
// Quiet icon button (view / edit / copy / delete).
const iconBtn =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted transition-colors hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus";
const withWebsite = computed(() => accounts.value.filter((a) => a.website).length);
const withNotes = computed(() => accounts.value.filter((a) => a.notes).length);
const deleteMessage = computed(
  () =>
    `Are you sure you want to delete "${
      accountToDelete.value?.label_password || accountToDelete.value?.label || ""
    }"? This action cannot be undone.`
);

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Credential Vault" subtitle="Internal systems & services · Restricted Access">
      <template #actions>
        <UiButton :to="{ name: 'admin.account-password.create' }" :icon="Plus">Create Credential</UiButton>
      </template>
    </UiPageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 ui-stagger">
      <UiStat
        class="col-span-2 lg:col-span-1"
        label="Stored Accounts"
        :value="statistics.total_accounts"
        hint="Internal systems & services"
        :icon="Key"
        :loading="loading"
      />
      <UiStat label="Has Website" :value="withWebsite" :icon="Globe" :loading="loading" />
      <UiStat label="Has Notes" :value="withNotes" :icon="FileText" :loading="loading" />
    </div>

    <Transition name="ui-fade">
      <UiAlert v-if="success" tone="ok" :title="success" />
    </Transition>

    <!-- ================= ACCOUNT LIST ================= -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-ui-line">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <h3 class="text-ui-h3 text-ui-ink">Accounts</h3>
          <UiBadge v-if="!loading" tone="neutral">{{ filteredAccounts.length }}</UiBadge>
        </div>
        <UiInput
          v-model="searchQuery"
          class="w-full sm:w-72"
          :icon="Search"
          placeholder="Search by name or email..."
        />
      </div>

      <UiTable :columns="columns" :rows="filteredAccounts" :loading="loading" :skeleton-rows="4">
        <template #cell-label="{ row }">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-8 h-8 shrink-0 rounded-ui-control bg-ui-subtle text-ui-muted inline-flex items-center justify-center">
              <Key class="w-4 h-4" />
            </span>
            <span class="text-ui-body font-medium text-ui-ink truncate">{{ row.label_password || row.label }}</span>
          </div>
        </template>
        <template #cell-username="{ row }">
          <span class="font-mono text-ui-small text-ui-text whitespace-nowrap">{{ row.username_email || row.username }}</span>
        </template>
        <template #cell-password>
          <span class="inline-flex items-center gap-1.5 font-mono text-ui-small tracking-widest text-ui-muted whitespace-nowrap">
            <Lock class="w-3.5 h-3.5 text-ui-faint" />••••••••
          </span>
        </template>
        <template #cell-tags="{ row }">
          <div class="flex items-center gap-1.5 whitespace-nowrap">
            <UiBadge v-if="row.website" tone="ok">Has Website</UiBadge>
            <UiBadge v-if="row.notes" tone="warn">Has Notes</UiBadge>
            <span v-if="!row.website && !row.notes" class="text-ui-faint">—</span>
          </div>
        </template>
        <template #cell-updated="{ row }">
          <span class="text-ui-small text-ui-muted whitespace-nowrap">{{ formatDate(row.updated_at) }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5">
            <router-link
              :to="{ name: 'admin.account-password.detail', params: { id: row.id } }"
              :class="iconBtn"
              title="View Credential"
              aria-label="View Credential"
            >
              <Eye class="w-4 h-4" />
            </router-link>
            <router-link
              :to="{ name: 'admin.account-password.edit', params: { id: row.id } }"
              :class="iconBtn"
              title="Edit Credential"
              aria-label="Edit Credential"
            >
              <Pencil class="w-4 h-4" />
            </router-link>
            <button type="button" @click="copyPassword(row)" :class="iconBtn" title="Copy Password" aria-label="Copy Password">
              <Check v-if="copiedId === row.id" class="w-4 h-4 text-ui-ok" />
              <Copy v-else class="w-4 h-4" />
            </button>
            <button
              type="button"
              @click="confirmDelete(row)"
              :class="[iconBtn, 'hover:!bg-ui-bad-soft hover:!text-ui-bad']"
              title="Delete Credential"
              aria-label="Delete Credential"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.label_password || row.label }}</p>
              <p class="font-mono text-ui-small text-ui-text break-all mt-0.5">{{ row.username_email || row.username }}</p>
              <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span class="inline-flex items-center gap-1 font-mono text-ui-cap tracking-widest text-ui-muted">
                  <Lock class="w-3 h-3 text-ui-faint" />••••••••
                </span>
                <UiBadge v-if="row.website" tone="ok">Has Website</UiBadge>
                <UiBadge v-if="row.notes" tone="warn">Has Notes</UiBadge>
              </div>
              <p class="text-ui-cap text-ui-muted mt-1.5">Updated on {{ formatDate(row.updated_at) }}</p>
              <div class="flex items-center gap-1 mt-2 -ml-1.5">
                <router-link
                  :to="{ name: 'admin.account-password.detail', params: { id: row.id } }"
                  :class="iconBtn"
                  title="View Credential"
                  aria-label="View Credential"
                >
                  <Eye class="w-4 h-4" />
                </router-link>
                <router-link
                  :to="{ name: 'admin.account-password.edit', params: { id: row.id } }"
                  :class="iconBtn"
                  title="Edit Credential"
                  aria-label="Edit Credential"
                >
                  <Pencil class="w-4 h-4" />
                </router-link>
                <button type="button" @click="copyPassword(row)" :class="iconBtn" title="Copy Password" aria-label="Copy Password">
                  <Check v-if="copiedId === row.id" class="w-4 h-4 text-ui-ok" />
                  <Copy v-else class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  @click="confirmDelete(row)"
                  :class="[iconBtn, 'hover:!bg-ui-bad-soft hover:!text-ui-bad']"
                  title="Delete Credential"
                  aria-label="Delete Credential"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty
            v-if="accounts.length === 0"
            compact
            :icon="ShieldCheck"
            title="No account data found"
            message="No stored credentials available"
          />
          <UiEmpty
            v-else
            compact
            :icon="Search"
            title="No results found"
            :message="`Try searching with a different keyword for &quot;${searchQuery}&quot;`"
          />
        </template>
      </UiTable>
    </section>

    <!-- MODAL -->
    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      type="danger"
      title="Delete Credential?"
      :message="deleteMessage"
      cancel-text="Cancel"
      :confirm-text="isDeleting ? 'Deleting...' : 'Yes, Delete'"
      :loading="isDeleting"
      @confirm="handleDelete"
    />
  </div>
</template>
