<script setup>
import CardList from "@/components/admin/client/list/CardList.vue";
import Statistics from "@/components/admin/client/list/Statistics.vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import Alert from "@/components/common/Alert.vue";
import { storeToRefs } from "pinia";
import { ref, onMounted, watch, computed } from "vue";
import { debounce } from "lodash-es";
import { can } from "@/helpers/permissionHelper";
import { Plus, Briefcase, Search, SearchX, ChevronDown } from "lucide-vue-next";
import { useClientStore } from "@/stores/client";
import { useAlertModalStore } from "@/stores/alertModal";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const clientsStore = useClientStore();
const { clientsData, success, loading } = storeToRefs(clientsStore);
const { fetchClientPaginated, deleteClient } = clientsStore;
const alertModal = useAlertModalStore();

const serverOptions = ref({
  page: 1,
  row_per_page: 10,
});

const filters = ref({
  search: "",
  status: "",
});

// Fetch data
const fetchData = async () => {
  await fetchClientPaginated({
    ...serverOptions.value,
    ...filters.value,
  });
};

onMounted(fetchData);

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
  <div class="px-4 py-4">
  <!-- Statistics -->
  <Statistics v-if="can('project-statistic')" />

  <!-- Success Alert -->
  <Alert type="success" :title="success" :show="!!success" />

  <!-- Error Alert -->
  <Alert type="error" :title="error" :show="!!error" />

  <!-- Client Grid Section -->
  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
          <Briefcase class="w-6 h-6 text-blue-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">All Client</h3>
          <p class="text-brand-light text-xs font-normal">
            View and manage all client information
          </p>
        </div>
      </div>

      <!-- Add Client Button -->
      <div class="flex items-center gap-3.5" v-if="can('clients-create')">
        <RouterLink
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
          :to="{ name: 'admin.clients.create' }"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Add Client</span>
        </RouterLink>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="mb-5">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
            placeholder="Search clients..."
            v-model="filters.search"
          />
        </div>
        <div class="relative w-full sm:w-auto">
          <select
            class="select-soft"
            v-model="filters.status"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
            <option value="overdue">Overdue</option>
          </select>
          <ChevronDown
            class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          />
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3 mb-4">
      <Skeleton v-for="i in 6" :key="i" height="90px" rounded="12px" />
    </div>

    <!-- Client List -->
    <div v-else class="space-y-3 mb-4">
      <CardList v-for="client in clientsList" :key="client.id" :data="client" @delete="handleDelete" />
    </div>

     <!-- Pagination -->
    <Pagination
      :meta="clientsMeta"
      :loading="loading"
      @page-change="handlePageChange"
      @per-page-change="handlePerPageChange"
    />
    </div>

    <!-- No Data Message -->
    <div class="text-center py-12" v-if="clientsList.length === 0 && !loading">
      <SearchX class="w-9 h-9 text-gray-400 mx-auto mb-3.5" />
      <h4 class="text-brand-dark text-sm font-semibold mb-1.5">
        No clients found
      </h4>
      <p class="text-brand-light text-sm">
        Try adjusting your search terms or filters
      </p>
    </div>
  </div>

</template>