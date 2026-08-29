<script setup>
import CardList from "@/components/admin/vendor/list/CardList.vue";
import Statistics from "@/components/admin/vendor/list/Statistics.vue";
import Pagination from "@/components/admin/team/Pagination.vue";
import Alert from "@/components/common/Alert.vue";
import { storeToRefs } from "pinia";
import { ref, onMounted, watch, computed } from "vue";
import { debounce } from "lodash-es";
import { can } from "@/helpers/permissionHelper";
import { Plus, Briefcase, Search, SearchX } from "lucide-vue-next";
import { useVendorsStore } from "@/stores/vendor";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";

const vendorsStore = useVendorsStore();
const { vendorsData, success, loading } = storeToRefs(vendorsStore);
const { fetchVendorsPaginated } = vendorsStore;

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
  await fetchVendorsPaginated({
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
const vendorsList = computed(() => vendorsData.value?.items || []);
const vendorsMeta = computed(() => vendorsData.value?.meta || {});
</script>

<template>
  <div class="px-4 py-4">
  <!-- Statistics -->
  <Statistics v-if="can('project-statistic')" />

  <!-- Success Alert -->
  <Alert type="success" :title="success" :show="!!success" />

  <!-- Error Alert -->
  <Alert type="error" :title="error" :show="!!error" />

  <!-- Vendors Grid Section -->
  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
          <Briefcase class="w-6 h-6 text-blue-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">All Vendors</h3>
          <p class="text-brand-light text-sm font-normal">
            View and manage all vendor information
          </p>
        </div>
      </div>

      <!-- Add Vendor Button -->
      <div class="flex items-center gap-3.5" v-if="can('vendors-create')">
        <RouterLink
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
          :to="{ name: 'admin.vendors.create' }"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Add Vendor</span>
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
            placeholder="Search vendors..."
            v-model="filters.search"
          />
        </div>
        <select
          class="w-full sm:w-auto px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
          v-model="filters.status"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on-hold">On Hold</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <SkeletonCardGrid v-if="loading" :count="6" cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-5" />

    <!-- Vendors Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-4">
      <CardList v-for="vendor in vendorsList" :key="vendor.id" :data="vendor" />
    </div>

     <!-- Pagination -->
    <Pagination
      :meta="vendorsMeta"
      :loading="loading"
      @page-change="handlePageChange"
      @per-page-change="handlePerPageChange"
    />
    </div>

    <!-- No Data Message -->
    <div class="text-center py-12" v-if="vendorsList.length === 0 && !loading">
      <SearchX class="w-9 h-9 text-gray-400 mx-auto mb-3.5" />
      <h4 class="text-brand-dark text-sm font-semibold mb-1.5">
        No vendors found
      </h4>
      <p class="text-brand-light text-sm">
        Try adjusting your search terms or filters
      </p>
    </div>
  </div>

</template>