<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { debounce } from "lodash";
import Alert from "@/components/common/Alert.vue";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import { can } from "@/helpers/permissionHelper";
import Statistics from "@/components/admin/company-finance/list/Statistic.vue";
import FixedCostsModal from "@/components/admin/company-finance/modals/FixedCostsModal.vue";
import SdmResourcesModal from "@/components/admin/company-finance/modals/SdmResourcesModal.vue";
import InfraToolsModal from "@/components/admin/company-finance/modals/InfraToolsModal.vue";
import DeleteConfirmationModal from "@/components/common/ConfirmationModal.vue";
import { Eye, Edit, Trash2, Wallet, Users, Server, Search, ChevronLeft, ChevronRight, Plus } from "lucide-vue-next";
import { useCompanyFinanceStore } from "@/stores/companyFinance";

const store = useCompanyFinanceStore();

const tabs = [
  { key: "fixed", label: "Fixed Cost", icon: Wallet },
  { key: "sdm", label: "SDM Resource", icon: Users },
  { key: "infra", label: "Infrastructure Tools", icon: Server },
];
const activeTab = ref("fixed");

const showSectionAlert = (section, type, title, message) => {
  section.value = {
    show: true,
    type,
    title,
    message,
  };

  setTimeout(() => {
    section.value.show = false;
  }, 3000);
};

// Fetch data ketika komponen di-mount
onMounted(() => {
  fetchFixedCostData();
  fetchSdmResourcesData();
  fetchInfraToolsData();
});

/* ================= FIX COST ACTION METHODS ================= */
const fetchFixedCostData = async (page = 1) => {
  await store.fetchFixedCostPaginated({
    page,
    per_page: perPage,
    search: fixedSearch.value,
  });
  fixedPage.value = page;
};

const addFixedCost = () => {
  fixedCostMode.value = "add";
  selectedFixedCost.value = null;
  showAddFixedCost.value = true;
};

const submitFixedCost = async ({ mode, id, payload }) => {
  try {
    loading.value = true;

    if (mode === "add") {
      await store.createFixedCost(payload);
      showSectionAlert(
        fixedAlert,
        "success",
        "Fixed Cost item created",
        "Fixed Cost item has been successfully added."
      );
    }

    if (mode === "edit") {
      await store.updateFixedCost(id, payload);
      showSectionAlert(
        fixedAlert,
        "success",
        "Fixed Cost item updated",
        "Fixed Cost item has been successfully updated."
      );
    }

    await fetchFixedCostData();
    showAddFixedCost.value = false;
  } catch (error) {
    showSectionAlert(
      fixedAlert,
      "danger",
      "Failed",
      "Failed to save fixed cost item."
    );
  } finally {
    loading.value = false;
  }
};

const viewFixedCost = (item) => {
  fixedCostMode.value = "view";
  selectedFixedCost.value = item;
  showAddFixedCost.value = true;
};

const editFixedCost = (item) => {
  fixedCostMode.value = "edit";
  selectedFixedCost.value = item;
  showAddFixedCost.value = true;
};

const deleteFixedCostHandler = (item) => {
  openDeleteModal({
    title: "Delete Fixed Cost item",
    message: `Are you sure you want to delete "${item.financial_items}"?`,
    type: "danger",
    onConfirm: async () => {
      try {
        await store.deleteFixedCost(item.id);

        showSectionAlert(
          fixedAlert,
          "success",
          "Deleted",
          `Fixed Cost item "${item.financial_items}" has been deleted.`
        );
      } catch (error) {
        showSectionAlert(
          fixedAlert,
          "danger",
          "Failed",
          `Failed to delete "${item.financial_items}".`
        );
        console.error(error);
      }
    },
  });
};

/* ================= SDM ACTION METHODS ================= */
const fetchSdmResourcesData = async (page = 1) => {
  await store.fetchSdmResourcePaginated({
    page,
    per_page: perPage,
    search: sdmSearch.value,
  });
  sdmPage.value = page;
};

const addSdm = () => {
  sdmResourceMode.value = "add";
  selectedSdmResource.value = null;
  showAddSdmResource.value = true;
};

const submitSdm = async ({ mode, id, payload }) => {
  try {
    loading.value = true;
    if (mode === "add") {
      await store.createSdmResource(payload);
      showSectionAlert(
        sdmAlert,
        "success",
        "SDM Resource item created",
        "SDM Resource item has been successfully added."
      );
    }

    if (mode === "edit") {
      await store.updateSdmResource(id, payload);
      showSectionAlert(
        sdmAlert,
        "success",
        "SDM Resource item updated",
        "SDM Resource item has been successfully updated."
      );
    }

    await fetchSdmResourcesData();
    showAddSdmResource.value = false;
  } catch (error) {
    showSectionAlert(
      sdmAlert,
      "danger",
      "Failed",
      "Failed to save SDM Resource item."
    );
  } finally {
    loading.value = false;
  }
};

const viewSdm = (item) => {
  sdmResourceMode.value = "view";
  selectedSdmResource.value = item;
  showAddSdmResource.value = true;
};

const editSdm = (item) => {
  sdmResourceMode.value = "edit";
  selectedSdmResource.value = item;
  showAddSdmResource.value = true;
};

const deleteSdmHandler = (item) => {
  openDeleteModal({
    title: "Delete SDM Resource item",
    message: `Are you sure you want to delete "${item.sdm_component}"?`,
    type: "danger",
    onConfirm: async () => {
      try {
        await store.deleteSdmResource(item.id);

        showSectionAlert(
          sdmAlert,
          "success",
          "Deleted",
          `SDM Resource item "${item.sdm_component}" has been deleted.`
        );
      } catch (error) {
        showSectionAlert(
          sdmAlert,
          "danger",
          "Failed",
          `Failed to delete "${item.sdm_component}".`
        );
        console.error(error);
      }
    },
  });
};

/* ================= INFRA ACTION METHODS ================= */
const fetchInfraToolsData = async (page = 1) => {
  await store.fetchInfraToolsPaginated({
    page,
    per_page: perPage,
    search: infraSearch.value,
  });
  infraPage.value = page;
};

const addInfra = () => {
  infraMode.value = "add";
  selectedInfra.value = null;
  showAddInfra.value = true;
};

const submitInfra = async ({ mode, id, payload }) => {
  try {
    loading.value = true;

    if (mode === "add") {
      await store.createInfraTools(payload);
      showSectionAlert(
        infraAlert,
        "success",
        "Infrastructure Tool item created",
        "Infrastructure Tool item has been successfully added."
      );
    }

    if (mode === "edit") {
      await store.updateInfraTools(id, payload);
      showSectionAlert(
        infraAlert,
        "success",
        "Infrastructure Tool item updated",
        "Infrastructure Tool item has been successfully updated."
      );
    }

    await fetchInfraToolsData();
    showAddInfra.value = false;
  } catch (error) {
    showSectionAlert(
      infraAlert,
      "danger",
      "Failed",
      "Failed to save Infrastructure Tool item."
    );
  } finally {
    loading.value = false;
  }
};

const viewInfra = (item) => {
  infraMode.value = "view";
  selectedInfra.value = item;
  showAddInfra.value = true;
};

const editInfra = (item) => {
  infraMode.value = "edit";
  selectedInfra.value = item;
  showAddInfra.value = true;
};

const deleteInfraHandler = (item) => {
  openDeleteModal({
    title: "Delete Infrastructure Tool Item",
    message: `Are you sure you want to delete "${item.tech_stack_component}"?`,
    type: "danger",
    onConfirm: async () => {
      try {
        await store.deleteInfraTools(item.id);

        showSectionAlert(
          infraAlert,
          "success",
          "Deleted",
          `Fixed Cost "${item.tech_stack_component}" has been deleted.`
        );
      } catch (error) {
        showSectionAlert(
          infraAlert,
          "danger",
          "Failed",
          `Failed to delete "${item.tech_stack_component}".`
        );
        console.error(error);
      }
    },
  });
};

/* =======================
   STATE
======================= */
const loading = ref(false);
const showAddFixedCost = ref(false);
const fixedCostMode = ref("add");
const selectedFixedCost = ref(null);
const showAddSdmResource = ref(false);
const sdmResourceMode = ref("add");
const selectedSdmResource = ref(null);
const showAddInfra = ref(false);
const infraMode = ref("add");
const selectedInfra = ref(null);
const fixedAlert = ref({
  show: false,
  type: "success",
  title: "",
  message: "",
});

const sdmAlert = ref({
  show: false,
  type: "success",
  title: "",
  message: "",
});

const infraAlert = ref({
  show: false,
  type: "success",
  title: "",
  message: "",
});
const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const deletePayload = ref({
  title: "",
  message: "",
  type: "danger",
  onConfirm: null,
});

/* =======================
   PAGINATION STATE
======================= */
const perPage = 5;
const fixedPage = ref(1);
const sdmPage = ref(1);
const infraPage = ref(1);

/* =======================
   SEARCH STATE
======================= */
const fixedSearch = ref("");
const sdmSearch = ref("");
const infraSearch = ref("");

/* =======================
   HELPERS
======================= */
const paginate = (data, page) =>
  data.slice((page - 1) * perPage, page * perPage);

const pageCount = (data) => Math.ceil(data.length / perPage);

const formatDate = (date) => {
  if (!date) return "";
  return date.split("T")[0];
};

const openDeleteModal = ({ title, message, type = "danger", onConfirm }) => {
  deletePayload.value = { title, message, type, onConfirm };
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!deletePayload.value.onConfirm) return;

  try {
    deleteLoading.value = true;
    await deletePayload.value.onConfirm();
  } finally {
    deleteLoading.value = false;
    showDeleteModal.value = false;
  }
};

/* =======================
   COMPUTED
======================= */
const filteredFixed = computed(() => {
  if (store.fixedCostData && store.fixedCostData.items) {
    return store.fixedCostData.items.filter((item) =>
      item.financial_items
        .toLowerCase()
        .includes(fixedSearch.value.toLowerCase())
    );
  }
  return [];
});

const filteredSdm = computed(() => {
  if (store.sdmResourceData && store.sdmResourceData.items) {
    return store.sdmResourceData.items.filter((item) =>
      item.sdm_component.toLowerCase().includes(sdmSearch.value.toLowerCase())
    );
  }
  return [];
});

const filteredInfra = computed(() => {
  if (store.infraToolsData && store.infraToolsData.items) {
    return store.infraToolsData.items.filter((item) =>
      item.tech_stack_component
        .toLowerCase()
        .includes(infraSearch.value.toLowerCase())
    );
  }
  return [];
});

const fixedPageCount = computed(
  () => store.fixedCostData?.meta?.last_page || 1
);

const fixedCostPaginated = computed(() => store.fixedCostData.items || []);
const sdmResourcePaginated = computed(() => store.sdmResourceData.items || []);
const infraPaginated = computed(() => store.infraToolsData.items || []);

/* =======================
   WATCH SEARCH DEBOUNCE
======================= */
watch(
  fixedSearch,
  debounce(() => {
    fetchFixedCostData(1);
  }, 300)
);
watch(
  sdmSearch,
  debounce(() => {
    fetchSdmResourcesData(1);
  }, 300)
);
watch(
  infraSearch,
  debounce(() => {
    fetchInfraToolsData(1);
  }, 300)
);
</script>

<template>
  <Statistics v-if="can('company-finance-statistic')" class="mb-6" />

  <div class="bg-white border border-[#DCDEDD] rounded-[14px] overflow-hidden">
    <!-- Tabs -->
    <div class="flex items-center gap-1 px-3 pt-3 border-b border-[#DCDEDD]">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-[10px] transition-colors duration-150 border-b-2"
        :class="activeTab === tab.key
          ? 'text-[#0C51D9] border-[#0C51D9] bg-blue-50/50'
          : 'text-gray-500 border-transparent hover:bg-gray-50'"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <div class="p-5">
      <!-- ================= FIXED COST ================= -->
      <section v-if="activeTab === 'fixed'">
        <Alert
          v-if="fixedAlert.show"
          :type="fixedAlert.type"
          :title="fixedAlert.title"
          :message="fixedAlert.message"
          :show="fixedAlert.show"
        />

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div class="relative w-full sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-blue-400" />
            </div>
            <input
              v-model="fixedSearch"
              type="text"
              placeholder="Search fixed cost..."
              class="w-full pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            />
          </div>
          <button
            v-if="can('fixed-cost-create')"
            @click="addFixedCost"
            class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 shrink-0"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Fixed Cost</span>
          </button>
        </div>

        <SkeletonTable v-if="store.loading" :rows="4" :cols="6" />

        <div v-else class="overflow-x-auto rounded-[12px] border border-[#DCDEDD]">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2.5 text-xs uppercase text-gray-500 font-semibold">No</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Item</th>
                <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Budget</th>
                <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Actual</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Notes</th>
                <th class="px-3 py-2.5 text-center text-xs uppercase text-gray-500 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in fixedCostPaginated"
                :key="item.id"
                class="border-t border-[#DCDEDD] hover:bg-gray-50/60"
              >
                <td class="px-3 py-2.5 text-gray-500">
                  {{ (fixedPage - 1) * perPage + index + 1 }}
                </td>
                <td class="px-3 py-2.5 font-medium text-brand-dark">{{ item.financial_items }}</td>
                <td class="px-3 py-2.5 text-right">
                  Rp {{ item.budget.toLocaleString() }}
                </td>
                <td class="px-3 py-2.5 text-right text-success">
                  Rp {{ item.actual.toLocaleString() }}
                </td>
                <td class="px-3 py-2.5 text-gray-500">{{ item.notes }}</td>
                <td class="px-3 py-2.5">
                  <div class="flex justify-center gap-1">
                    <button @click="viewFixedCost(item)" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors" title="View">
                      <Eye class="w-4 h-4" />
                    </button>
                    <button v-if="can('fixed-cost-edit')" @click="editFixedCost(item)" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors" title="Edit">
                      <Edit class="w-4 h-4" />
                    </button>
                    <button v-if="can('fixed-cost-delete')" @click="deleteFixedCostHandler(item)" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredFixed.length === 0">
                <td colspan="6" class="text-center py-8 text-gray-400 text-sm">
                  No Fixed Cost data found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap justify-between items-center mt-4 gap-2">
          <span class="text-xs text-gray-500 font-medium">
            Page {{ fixedPage }} of {{ store.fixedCostData.meta.last_page }}
          </span>
          <div class="flex gap-2">
            <button
              class="px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              :disabled="fixedPage === 1"
              @click="fetchFixedCostData(fixedPage - 1)"
            >
              <ChevronLeft class="w-4 h-4" /> Prev
            </button>
            <button
              class="px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              :disabled="fixedPage === store.fixedCostData.meta.last_page"
              @click="fetchFixedCostData(fixedPage + 1)"
            >
              Next <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <!-- ================= SDM ================= -->
      <section v-if="activeTab === 'sdm'">
        <Alert
          v-if="sdmAlert.show"
          :type="sdmAlert.type"
          :title="sdmAlert.title"
          :message="sdmAlert.message"
          :show="sdmAlert.show"
        />

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div class="relative w-full sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-blue-400" />
            </div>
            <input
              v-model="sdmSearch"
              type="text"
              placeholder="Search SDM resource..."
              class="w-full pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            />
          </div>
          <button
            v-if="can('sdm-resource-create')"
            @click="addSdm"
            class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 shrink-0"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">SDM Resource</span>
          </button>
        </div>

        <SkeletonTable v-if="store.loading" :rows="4" :cols="8" />

        <div v-else class="overflow-x-auto rounded-[12px] border border-[#DCDEDD]">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2.5 text-xs uppercase text-gray-500 font-semibold">No</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Component</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Metric</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Capacity</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">RAG</th>
                <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Budget</th>
                <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Actual</th>
                <th class="px-3 py-2.5 text-center text-xs uppercase text-gray-500 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in sdmResourcePaginated"
                :key="item.id"
                class="border-t border-[#DCDEDD] hover:bg-gray-50/60"
              >
                <td class="px-3 py-2.5 text-gray-500">
                  {{ (sdmPage - 1) * perPage + index + 1 }}
                </td>
                <td class="px-3 py-2.5 font-medium text-brand-dark">{{ item.sdm_component }}</td>
                <td class="px-3 py-2.5">{{ item.metrik }}</td>
                <td class="px-3 py-2.5">{{ item.capacity_target }}</td>
                <td class="px-3 py-2.5">
                  <span
                    class="px-2 py-1 rounded-md text-xs font-semibold"
                    :class="{
                      'bg-green-100 text-green-700': item.rag_status === 'green',
                      'bg-yellow-100 text-yellow-700':
                        item.rag_status === 'amber',
                      'bg-red-100 text-red-700': item.rag_status === 'red',
                    }"
                  >
                    {{ item.rag_status }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-right">
                  Rp {{ item.budget.toLocaleString() }}
                </td>
                <td class="px-3 py-2.5 text-right text-success">
                  Rp {{ item.actual.toLocaleString() }}
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex justify-center gap-1">
                    <button @click="viewSdm(item)" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors" title="View">
                      <Eye class="w-4 h-4" />
                    </button>
                    <button v-if="can('sdm-resource-edit')" @click="editSdm(item)" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors" title="Edit">
                      <Edit class="w-4 h-4" />
                    </button>
                    <button v-if="can('sdm-resource-delete')" @click="deleteSdmHandler(item)" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredSdm.length === 0">
                <td colspan="8" class="text-center py-8 text-gray-400 text-sm">
                  No SDM Resource data found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap justify-between items-center mt-4 gap-2">
          <span class="text-xs text-gray-500 font-medium">
            Page {{ sdmPage }} of {{ store.sdmResourceData.meta.last_page }}
          </span>
          <div class="flex gap-2">
            <button
              class="px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              :disabled="sdmPage === 1"
              @click="fetchSdmResourcesData(sdmPage - 1)"
            >
              <ChevronLeft class="w-4 h-4" /> Prev
            </button>
            <button
              class="px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              :disabled="sdmPage === store.sdmResourceData.meta.last_page"
              @click="fetchSdmResourcesData(sdmPage + 1)"
            >
              Next <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <!-- ================= INFRA ================= -->
      <section v-if="activeTab === 'infra'">
        <Alert
          v-if="infraAlert.show"
          :type="infraAlert.type"
          :title="infraAlert.title"
          :message="infraAlert.message"
          :show="infraAlert.show"
        />

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div class="relative w-full sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="w-4 h-4 text-blue-400" />
            </div>
            <input
              v-model="infraSearch"
              type="text"
              placeholder="Search infrastructure..."
              class="w-full pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            />
          </div>
          <button
            v-if="can('infrastructure-tool-create')"
            @click="addInfra"
            class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 shrink-0"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Infrastructure Tool</span>
          </button>
        </div>

        <SkeletonTable v-if="store.loading" :rows="4" :cols="8" />

        <div v-else class="overflow-x-auto rounded-[12px] border border-[#DCDEDD]">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2.5 text-xs uppercase text-gray-500 font-semibold">No</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Tech Stack</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Vendor</th>
                <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Monthly</th>
                <th class="px-3 py-2.5 text-right text-xs uppercase text-gray-500 font-semibold">Annual</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Expired</th>
                <th class="px-3 py-2.5 text-left text-xs uppercase text-gray-500 font-semibold">Status</th>
                <th class="px-3 py-2.5 text-center text-xs uppercase text-gray-500 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in infraPaginated"
                :key="item.id"
                class="border-t border-[#DCDEDD] hover:bg-gray-50/60"
              >
                <td class="px-3 py-2.5 text-gray-500">
                  {{ (infraPage - 1) * perPage + index + 1 }}
                </td>
                <td class="px-3 py-2.5 font-medium text-brand-dark">
                  {{ item.tech_stack_component }}
                </td>
                <td class="px-3 py-2.5">{{ item.vendor }}</td>
                <td class="px-3 py-2.5 text-right">
                  Rp {{ item.monthly_fee.toLocaleString() }}
                </td>
                <td class="px-3 py-2.5 text-right">
                  Rp {{ item.annual_fee.toLocaleString() }}
                </td>
                <td class="px-3 py-2.5">{{ formatDate(item.expired_date) }}</td>
                <td class="px-3 py-2.5">{{ item.status }}</td>
                <td class="px-3 py-2.5">
                  <div class="flex justify-center gap-1">
                    <button @click="viewInfra(item)" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors" title="View">
                      <Eye class="w-4 h-4" />
                    </button>
                    <button v-if="can('infrastructure-tool-edit')" @click="editInfra(item)" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors" title="Edit">
                      <Edit class="w-4 h-4" />
                    </button>
                    <button v-if="can('infrastructure-tool-delete')" @click="deleteInfraHandler(item)" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredInfra.length === 0">
                <td colspan="8" class="text-center py-8 text-gray-400 text-sm">
                  No Infrastructure Tools data found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap justify-between items-center mt-4 gap-2">
          <span class="text-xs text-gray-500 font-medium">
            Page {{ infraPage }} of {{ store.infraToolsData.meta.last_page }}
          </span>
          <div class="flex gap-2">
            <button
              class="px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              :disabled="infraPage === 1"
              @click="fetchInfraToolsData(infraPage - 1)"
            >
              <ChevronLeft class="w-4 h-4" /> Prev
            </button>
            <button
              class="px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              :disabled="infraPage === store.infraToolsData.meta.last_page"
              @click="fetchInfraToolsData(infraPage + 1)"
            >
              Next <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>

  <FixedCostsModal
    :show="showAddFixedCost"
    :loading="loading"
    :mode="fixedCostMode"
    :data="selectedFixedCost"
    @close="showAddFixedCost = false"
    @submit="submitFixedCost"
  />

  <SdmResourcesModal
    :show="showAddSdmResource"
    :loading="loading"
    :mode="sdmResourceMode"
    :data="selectedSdmResource"
    @close="showAddSdmResource = false"
    @submit="submitSdm"
  />

  <InfraToolsModal
    :show="showAddInfra"
    :loading="loading"
    :mode="infraMode"
    :data="selectedInfra"
    @close="showAddInfra = false"
    @submit="submitInfra"
  />

  <DeleteConfirmationModal
    :show="showDeleteModal"
    :title="deletePayload.title"
    :message="deletePayload.message"
    :loading="deleteLoading"
    :type="deletePayload.type"
    confirmText="Delete"
    cancelText="Cancel"
    @confirm="confirmDelete"
    @cancel="showDeleteModal = false"
  >
  </DeleteConfirmationModal>
</template>
