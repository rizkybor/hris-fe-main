<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { Wrench, Plus, Search, SearchX, Inbox, ChevronDown, Building2, FolderKanban, PiggyBank, Sparkles, AlertTriangle, ChevronRight } from "lucide-vue-next";
import { useMaintenanceStore } from "@/stores/maintenance";
import { useClientStore } from "@/stores/client";
import { useProjectStore } from "@/stores/project";
import { can } from "@/helpers/permissionHelper";
import { formatHours, formatMonth, CONTRACT_STATUS, usageColor } from "@/utils/maintenance";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import ContractFormModal from "@/components/admin/maintenance/ContractFormModal.vue";
import MaintenanceRecap from "@/components/admin/maintenance/MaintenanceRecap.vue";

const route = useRoute();
const router = useRouter();
const store = useMaintenanceStore();
const { contracts, loading, error } = storeToRefs(store);
const clientStore = useClientStore();
const { clients } = storeToRefs(clientStore);
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);

const search = ref("");
const statusFilter = ref("");
const clientFilter = ref("");

const fetchData = () =>
  store.fetchContracts({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    client_id: clientFilter.value || undefined,
  });

onMounted(async () => {
  fetchData();
  if (clients.value.length === 0) await clientStore.fetchAllClient();
  if (projects.value.length === 0) await projectStore.fetchProjectsPaginated({ row_per_page: 100 });
  // "New contract" from a client's or project's detail page.
  if (route.query.new && can("maintenance-create")) {
    const project = projects.value.find((p) => String(p.id) === String(route.query.project_id));
    presetClientId.value = route.query.client_id || project?.client_id || project?.client?.id || null;
    presetProjectId.value = route.query.project_id || null;
    router.replace({ query: {} });
    openCreate();
  }
});
watch([search, statusFilter, clientFilter], debounce(fetchData, 300));


// ===== Create =====
const showForm = ref(false);
const presetClientId = ref(null);
const presetProjectId = ref(null);
const saving = ref(false);
const formErrors = ref({});
const openCreate = () => {
  formErrors.value = {};
  showForm.value = true;
};
const handleSubmit = async (payload) => {
  saving.value = true;
  formErrors.value = {};
  try {
    const contract = await store.createContract(payload);
    showForm.value = false;
    router.push({ name: "admin.maintenance.detail", params: { id: contract.id } });
  } catch (err) {
    formErrors.value = err?.response?.data?.errors || {};
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <!-- The admin layout already pads the page, so phones get little extra. -->
  <div class="px-0.5 py-1 sm:px-4 sm:py-4">
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5 mb-4 sm:mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 bg-teal-50 rounded-[12px] flex items-center justify-center shrink-0">
            <Wrench class="w-5 h-5 text-teal-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold">Maintenance</h3>
            <p class="text-brand-light text-xs font-normal">Monthly hour quotas for maintenance clients</p>
          </div>
        </div>
        <button
          v-if="can('maintenance-create')"
          type="button"
          @click="openCreate"
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">New Contract</span>
        </button>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            v-model="search"
            type="text"
            class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
            placeholder="Search contract, client or project..."
          />
        </div>
        <div class="grid grid-cols-2 sm:flex gap-2 sm:gap-3.5">
        <div class="relative w-full sm:w-56 min-w-0">
          <select v-model="clientFilter" class="select-soft w-full">
            <option value="">All Clients</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div class="relative w-full sm:w-auto min-w-0">
          <select v-model="statusFilter" class="select-soft w-full">
            <option value="">All Status</option>
            <option v-for="(s, key) in CONTRACT_STATUS" :key="key" :value="key">{{ s.label }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        </div>
      </div>
    </div>

    <MaintenanceRecap />

    <div v-if="error && typeof error === 'string'" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-[12px] p-3.5 mb-4">{{ error }}</div>

    <div v-if="loading && !contracts.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Skeleton v-for="i in 3" :key="i" height="190px" rounded="14px" />
    </div>

    <div
      v-else-if="contracts.length === 0"
      class="flex flex-col items-center justify-center text-center py-16 rounded-[14px] border border-dashed border-[#DCDEDD] bg-gray-50/60"
    >
      <template v-if="search || statusFilter || clientFilter">
        <SearchX class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No contracts match your filters</h4>
      </template>
      <template v-else>
        <Inbox class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No maintenance contracts yet</h4>
        <p class="text-brand-light text-xs mb-4 max-w-md">
          Create a contract with a monthly hour quota, then log the work you do. The client can follow their remaining quota through a private link.
        </p>
        <button
          v-if="can('maintenance-create')"
          type="button"
          @click="openCreate"
          class="px-4 py-2.5 rounded-[8px] border border-[#DCDEDD] text-sm font-semibold text-brand-dark hover:border-[#0C51D9] hover:bg-white"
        >
          Create your first contract
        </button>
      </template>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <router-link
        v-for="(contract, index) in contracts"
        :key="contract.id"
        :to="{ name: 'admin.maintenance.detail', params: { id: contract.id } }"
        class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 hover:border-[#0C51D9] hover:shadow-sm transition-all flex flex-col"
      >
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <h4 class="text-brand-dark text-sm font-bold leading-snug min-w-0 break-words">
            <span class="text-gray-400 text-xs font-semibold tabular-nums mr-1">{{ index + 1 }}.</span>{{ contract.name }}
          </h4>
          <span class="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0" :class="CONTRACT_STATUS[contract.status]?.class">
            {{ CONTRACT_STATUS[contract.status]?.label }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3.5 min-w-0">
          <span class="inline-flex items-center gap-1 min-w-0 max-w-full"><Building2 class="w-3 h-3 shrink-0" /> <span class="truncate">{{ contract.client?.name || "-" }}</span></span>
          <span v-if="contract.project" class="inline-flex items-center gap-1 min-w-0 max-w-full"><FolderKanban class="w-3 h-3 shrink-0" /> <span class="truncate">{{ contract.project.name }}</span></span>
        </div>

        <template v-if="contract.current_period">
          <div class="flex items-baseline justify-between gap-2">
            <p class="text-brand-dark text-lg font-bold">
              {{ formatHours(contract.current_period.remaining) }}
              <span class="text-brand-light text-xs font-medium">left of {{ formatHours(contract.current_period.total) }}</span>
            </p>
            <span class="text-xs text-brand-light">{{ formatMonth(contract.current_period.month) }}</span>
          </div>
          <div class="w-full bg-gray-100 rounded-full overflow-hidden mt-1.5" style="height: 8px">
            <div
              class="h-full rounded-full"
              :style="{ width: `${Math.min(contract.current_period.used_percent, 100)}%`, backgroundColor: usageColor(contract.current_period) }"
            ></div>
          </div>
          <p v-if="contract.current_period.overage > 0" class="text-xs text-red-600 font-semibold mt-1.5">
            {{ formatHours(contract.current_period.overage) }} over quota
          </p>
        </template>
        <p v-else class="text-xs text-brand-light bg-gray-50 rounded-lg p-2.5">No quota this month ({{ CONTRACT_STATUS[contract.status]?.label.toLowerCase() }}).</p>

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-3 border-t border-[#F1F1F1] text-xs text-gray-500" :class="{ 'mt-3': true }">
          <span class="inline-flex items-center gap-1"><PiggyBank class="w-3.5 h-3.5" /> {{ formatHours(contract.balance_hours) }} balance</span>
          <span v-if="contract.open_features" class="inline-flex items-center gap-1"><Sparkles class="w-3.5 h-3.5" /> {{ contract.open_features }} feature{{ contract.open_features > 1 ? "s" : "" }}</span>
          <span v-if="contract.expiring_soon?.hours > 0" class="inline-flex items-center gap-1 text-amber-700">
            <AlertTriangle class="w-3.5 h-3.5" /> {{ formatHours(contract.expiring_soon.hours) }} expiring
          </span>
          <ChevronRight class="w-4 h-4 ml-auto" />
        </div>
      </router-link>
    </div>

    <ContractFormModal
      :show="showForm"
      :loading="saving"
      :clients="clients"
      :projects="projects"
      :errors="formErrors"
      :preset-client-id="presetClientId"
      :preset-project-id="presetProjectId"
      @submit="handleSubmit"
      @close="showForm = false"
    />
  </div>
</template>
