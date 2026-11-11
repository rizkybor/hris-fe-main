<script setup>
import CardList from "@/components/admin/client/list/CardList.vue";
import Statistics from "@/components/admin/client/list/Statistics.vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import Alert from "@/components/common/Alert.vue";
import { storeToRefs } from "pinia";
import { ref, onMounted, watch, computed } from "vue";
import { debounce } from "lodash-es";
import { can } from "@/helpers/permissionHelper";
import { useRouter } from "vue-router";
import { Plus, Briefcase, Search, SearchX, ChevronDown, Edit, Trash2, Star, Mail, Phone } from "lucide-vue-next";
import { UiPageHeader, UiButton, UiInput, UiSelect, UiTable, UiBadge, UiEmpty } from "@/components/ui";
import { useClientStore } from "@/stores/client";
import { useAlertModalStore } from "@/stores/alertModal";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const clientsStore = useClientStore();
const { clientsData, clients, success, error, loading } = storeToRefs(clientsStore);
const { fetchClientPaginated, deleteClient } = clientsStore;
const alertModal = useAlertModalStore();

const serverOptions = ref({
  page: 1,
  row_per_page: 10,
});

const filters = ref({
  search: "",
  type: "",
  field: "",
});

// Options for the Type/Field filters -- drawn from the full (unpaginated)
// client list, which is already fetched for pickers elsewhere, so every
// value in use shows up here even if it's not on the current page.
const uniqueValues = (key) =>
  [...new Set(clients.value.map((c) => c[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const clientTypeOptions = computed(() => uniqueValues("type"));
const clientFieldOptions = computed(() => uniqueValues("field"));

// Fetch data
const fetchData = async () => {
  await fetchClientPaginated({
    ...serverOptions.value,
    ...filters.value,
  });
};

onMounted(() => {
  fetchData();
  if (clients.value.length === 0) clientsStore.fetchAllClient();
});

// Watch filters with debounce
watch(
  filters,
  debounce(() => {
    serverOptions.value.page = 1;
    fetchData();
  }, 300),
  { deep: true }
);

// Pagination handlers
const handlePageChange = (page) => {
  serverOptions.value.page = page;
  fetchData();
};

const handlePerPageChange = (perPage) => {
  serverOptions.value.row_per_page = perPage;
  serverOptions.value.page = 1;
  fetchData();
};

// Computed properties sesuai store
const clientsList = computed(() => clientsData.value?.items || []);
const clientsMeta = computed(() => clientsData.value?.meta || {});

// Presentation only: table columns, filter options, row navigation.
const router = useRouter();
const columns = [
  { key: "name", label: "Client" },
  { key: "type", label: "Type" },
  { key: "pic_name", label: "PIC" },
  { key: "email", label: "Email" },
  { key: "average_rating", label: "Rating", align: "right" },
  { key: "actions", label: "", align: "right", width: 96 },
];
const typeSelectOptions = computed(() => [{ value: "", label: "All Types" }, ...clientTypeOptions.value.map((v) => ({ value: v, label: v }))]);
const fieldSelectOptions = computed(() => [{ value: "", label: "All Fields" }, ...clientFieldOptions.value.map((v) => ({ value: v, label: v }))]);
const goToDetail = (client) => router.push({ name: "admin.clients.detail", params: { id: client.id } });
const goToEdit = (client) => router.push({ name: "admin.clients.edit", params: { id: client.id } });

const handleDelete = async (client) => {
  const ok = await alertModal.confirm(
    `Delete client "${client.name}"? This action cannot be undone.`,
    {
      type: "danger",
      confirmText: "Delete",
    },
  );
  if (!ok) return;

  try {
    await deleteClient(client.id);
    await fetchData();
  } catch (error) {
    await alertModal.alert("Failed to delete client.", { type: "danger" });
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="All Client" subtitle="View and manage all client information">
      <template #actions>
        <UiButton v-if="can('clients-create')" :icon="Plus" :to="{ name: 'admin.clients.create' }" class="w-full sm:w-auto">Add Client</UiButton>
      </template>
    </UiPageHeader>

    <!-- Statistics -->
    <Statistics v-if="can('project-statistic')" />

    <!-- Success / error -->
    <Alert type="success" :title="success" :show="!!success" @close="clientsStore.clearMessages()" />
    <Alert type="error" :title="error" :show="!!error" @close="clientsStore.clearMessages()" />

    <!-- Clients -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 py-3.5 grid grid-cols-2 md:flex md:items-center gap-2 border-b border-ui-line">
        <UiInput v-model="filters.search" :icon="Search" placeholder="Search clients..." class="col-span-2 md:flex-1 md:max-w-[360px]" />
        <span class="hidden md:block md:flex-1"></span>
        <UiSelect v-model="filters.type" :options="typeSelectOptions" class="md:w-[180px]" aria-label="Type" />
        <UiSelect v-model="filters.field" :options="fieldSelectOptions" class="md:w-[180px]" aria-label="Field" />
      </div>

      <UiTable
        :columns="columns"
        :rows="clientsList"
        :meta="clientsMeta"
        :loading="loading"
        :skeleton-rows="6"
        clickable
        @row-click="goToDetail"
      >
        <template #cell-name="{ row }">
          <p class="text-ui-body font-medium text-ui-ink truncate max-w-[280px]">{{ row.name || "Unnamed Client" }}</p>
          <p v-if="row.field" class="text-ui-cap text-ui-muted truncate max-w-[280px]">{{ row.field }}</p>
        </template>
        <template #cell-type="{ row }">
          <UiBadge v-if="row.type" tone="neutral">{{ row.type }}</UiBadge>
          <span v-else class="text-ui-faint">—</span>
        </template>
        <template #cell-pic_name="{ row }">
          <p class="text-ui-text truncate">{{ row.pic_name || "-" }}</p>
          <p v-if="row.pic_phone" class="text-ui-cap text-ui-muted tabular-nums inline-flex items-center gap-1"><Phone class="w-3 h-3" />{{ row.pic_phone }}</p>
        </template>
        <template #cell-email="{ row }">
          <span class="text-ui-text truncate inline-block max-w-[240px] align-middle">{{ row.email || "-" }}</span>
        </template>
        <template #cell-average_rating="{ row }">
          <span v-if="row.average_rating" class="inline-flex items-center gap-1 tabular-nums text-ui-ink font-medium">
            <Star class="w-3.5 h-3.5 text-ui-warn" fill="currentColor" />{{ row.average_rating }}
          </span>
          <span v-else class="text-ui-faint">—</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <button
              v-if="can('clients-edit')"
              type="button"
              title="Edit"
              aria-label="Edit"
              class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
              @click="goToEdit(row)"
            >
              <Edit class="w-4 h-4" />
            </button>
            <button
              v-if="can('clients-delete')"
              type="button"
              title="Delete"
              aria-label="Delete"
              class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
              @click="handleDelete(row)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <template #mobile="{ row, number }">
          <CardList :data="row" :number="number" @delete="handleDelete" />
        </template>

        <template #empty>
          <UiEmpty :icon="SearchX" title="No clients found" message="Try adjusting your search terms or filters" compact />
        </template>
      </UiTable>

      <div class="border-t border-ui-line px-4 sm:px-5 py-3">
        <Pagination :meta="clientsMeta" :loading="loading" @page-change="handlePageChange" @per-page-change="handlePerPageChange" />
      </div>
    </section>
  </div>
</template>
