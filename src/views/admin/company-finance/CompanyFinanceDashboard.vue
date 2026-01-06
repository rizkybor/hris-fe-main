<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { debounce } from "lodash";
import { Briefcase } from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { can } from "@/helpers/permissionHelper";
import Statistics from "@/components/admin/company-finance/list/Statistic.vue";
import FixedCostsModal from "@/components/admin/company-finance/modals/FixedCostsModal.vue";
import SdmResourcesModal from "@/components/admin/company-finance/modals/SdmResourcesModal.vue";
import InfraToolsModal from "@/components/admin/company-finance/modals/InfraToolsModal.vue";

import { Eye, Edit, Trash2 } from "lucide-vue-next";
import { useCompanyFinanceStore } from "@/stores/companyFinance";

const store = useCompanyFinanceStore();

// Fetch data ketika komponen di-mount
onMounted(() => {
  fetchFixedCostData();
  fetchSdmResourcesData();
  fetchInfraToolsData();
});

/* ================= FIX COST ACTION METHODS ================= */
const fetchFixedCostData = async () => {
  const params = { page: 1, per_page: 5 };
  await store.fetchFixedCostPaginated(params);
};

const addFixCost = () => {
  fixedCostMode.value = "add";
  selectedFixedCost.value = null;
  showAddFixedCost.value = true;
};

const submitFixedCost = async (payload) => {
  try {
    console.log(payload, "<<<<< PAYLOAD");
    // loading.value = true;

    // // OPTIONAL: casting number
    // payload.monthly_fee = Number(payload.monthly_fee);
    // payload.annual_fee = Number(payload.annual_fee);

    // await store.createInfraTool(payload); // pastikan ada di store

    // // refresh list
    // await fetchInfraToolsData();

    // showAddInfra.value = false;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const viewFixedCost = (item) => {
  fixedCostMode.value = "view";
  selectedFixedCost.value = null;
  showAddFixedCost.value = true;
};

const editFixedCost = (item) => {
  fixedCostMode.value = "edit";
  selectedFixedCost.value = null;
  showAddFixedCost.value = true;
};

const deleteFixedCost = (item) => {
  if (confirm(`Are you sure you want to delete "${item.financial_items}"?`)) {
    store.fixedCostData.items = store.fixedCostData.items.filter(
      (i) => i.id !== item.id
    );
  }
};

/* ================= SDM ACTION METHODS ================= */
const fetchSdmResourcesData = async () => {
  const params = { page: 1, per_page: 5 };
  await store.fetchSdmResourcePaginated(params);
};

const addSdm = () => {
  sdmResourceMode.value = "add";
  selectedSdmResource.value = null;
  showAddSdmResource.value = true;
};

const submitSdm = async (payload) => {
  try {
    console.log(payload, "<<<<< PAYLOAD");
    // loading.value = true;

    // // OPTIONAL: casting number
    // payload.monthly_fee = Number(payload.monthly_fee);
    // payload.annual_fee = Number(payload.annual_fee);

    // await store.createInfraTool(payload); // pastikan ada di store

    // // refresh list
    // await fetchInfraToolsData();

    // showAddInfra.value = false;
  } catch (error) {
    console.error(error);
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

const deleteSdm = (item) => {
  if (confirm(`Are you sure you want to delete "${item.sdm_component}"?`)) {
    sdmResources.value = sdmResources.value.filter((i) => i.id !== item.id);
  }
};

/* ================= INFRA ACTION METHODS ================= */
const fetchInfraToolsData = async () => {
  const params = { page: 1, per_page: 5 };
  await store.fetchInfraToolsPaginated(params);
};

const addInfra = () => {
  infraMode.value = "add";
  selectedInfra.value = null;
  showAddInfra.value = true;
};

const submitInfra = async (payload) => {
  try {
    console.log(payload, "<<<<< PAYLOAD");
    // loading.value = true;

    // // OPTIONAL: casting number
    // payload.monthly_fee = Number(payload.monthly_fee);
    // payload.annual_fee = Number(payload.annual_fee);

    // await store.createInfraTool(payload); // pastikan ada di store

    // // refresh list
    // await fetchInfraToolsData();

    // showAddInfra.value = false;
  } catch (error) {
    console.error(error);
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

const deleteInfra = (item) => {
  if (
    confirm(`Are you sure you want to delete "${item.tech_stack_component}"?`)
  ) {
    infrastructures.value = infrastructures.value.filter(
      (i) => i.id !== item.id
    );
  }
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
const fixedPaginated = computed(() =>
  paginate(filteredFixed.value, fixedPage.value)
);

const filteredSdm = computed(() => {
  if (store.sdmResourceData && store.sdmResourceData.items) {
    return store.sdmResourceData.items.filter((item) =>
      item.sdm_component.toLowerCase().includes(sdmSearch.value.toLowerCase())
    );
  }
  return [];
});
const sdmPaginated = computed(() => paginate(filteredSdm.value, sdmPage.value));

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
const infraPaginated = computed(() =>
  paginate(filteredInfra.value, infraPage.value)
);

/* =======================
   WATCH SEARCH DEBOUNCE
======================= */
watch(
  fixedSearch,
  debounce(() => (fixedPage.value = 1), 300)
);
watch(
  sdmSearch,
  debounce(() => (sdmPage.value = 1), 300)
);
watch(
  infraSearch,
  debounce(() => (infraPage.value = 1), 300)
);
</script>

<template>
  <Statistics v-if="can('project-statistic')" />
  <!-- <Alert type="success" :title="success" :show="success" /> -->
  <br />
  <br />

  <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6">
    <!-- ================= FIXED COST ================= -->
    <section class="mb-12">
      <div class="flex justify-between items-center mb-4">
        <h4 class="text-lg font-bold">Fixed Cost</h4>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          + Add Data
        </button>
      </div>

      <!-- SEARCH -->
      <div class="mb-4 max-w-md">
        <input
          v-model="fixedSearch"
          type="text"
          placeholder="Search Fixed Cost..."
          class="w-full pl-4 pr-4 py-2 border border-[#DCDEDD] rounded-[12px] focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] transition-all font-semibold text-sm sm:text-base"
        />
      </div>

      <div class="overflow-x-auto rounded-[12px] border border-gray-200">
        <table class="w-full text-sm sm:text-base">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2">No</th>
              <th class="px-3 py-2 text-left">Item</th>
              <th class="px-3 py-2 text-right">Budget</th>
              <th class="px-3 py-2 text-right">Actual</th>
              <th class="px-3 py-2 text-left">Notes</th>
              <th class="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in fixedPaginated"
              :key="item.id"
              class="border-t"
            >
              <td class="px-3 py-2">
                {{ (fixedPage - 1) * perPage + index + 1 }}
              </td>
              <td class="px-3 py-2 font-medium">{{ item.financial_items }}</td>
              <td class="px-3 py-2 text-right">
                {{ item.budget.toLocaleString() }}
              </td>
              <td class="px-3 py-2 text-right">
                {{ item.actual.toLocaleString() }}
              </td>
              <td class="px-3 py-2 text-gray-500">{{ item.notes }}</td>
              <td class="px-3 py-2 text-center flex justify-center gap-2">
                <Eye
                  class="w-5 h-5 text-blue-500 cursor-pointer"
                  @click="viewItem(item)"
                />
                <Edit
                  class="w-5 h-5 text-yellow-500 cursor-pointer"
                  @click="editItem(item)"
                />
                <Trash2
                  class="w-5 h-5 text-red-500 cursor-pointer"
                  @click="deleteItem(item)"
                />
              </td>
            </tr>

            <tr v-if="filteredFixed.length === 0">
              <td colspan="6" class="text-center py-4 text-gray-500">
                No Fixed Cost data found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="flex flex-wrap justify-between items-center mt-4 gap-2 text-sm sm:text-base"
      >
        <span>Page {{ fixedPage }} of {{ pageCount(filteredFixed) }}</span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 border rounded"
            :disabled="fixedPage === 1"
            @click="fixedPage--"
          >
            Prev
          </button>
          <button
            class="px-3 py-1 border rounded"
            :disabled="fixedPage === pageCount(filteredFixed)"
            @click="fixedPage++"
          >
            Next
          </button>
        </div>
      </div>
    </section>

    <hr class="border-t border-gray-200 my-5" />

    <!-- ================= SDM ================= -->
    <section class="mb-12">
      <div class="flex justify-between items-center mb-4">
        <h4 class="text-lg font-bold">SDM Resource</h4>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
          @click="addSdm"
        >
          + Add Data
        </button>
      </div>

      <!-- SEARCH -->
      <div class="mb-4 max-w-md">
        <input
          v-model="sdmSearch"
          type="text"
          placeholder="Search SDM Resource..."
          class="w-full pl-4 pr-4 py-2 border border-[#DCDEDD] rounded-[12px] focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] transition-all font-semibold text-sm sm:text-base"
        />
      </div>

      <div class="overflow-x-auto rounded-[12px] border border-gray-200">
        <table class="w-full text-sm sm:text-base">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2">No</th>
              <th class="px-3 py-2">Component</th>
              <th class="px-3 py-2">Metric</th>
              <th class="px-3 py-2">Capacity</th>
              <th class="px-3 py-2">RAG</th>
              <th class="px-3 py-2 text-right">Budget</th>
              <th class="px-3 py-2 text-right">Actual</th>
              <th class="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in sdmPaginated"
              :key="item.id"
              class="border-t"
            >
              <td class="px-3 py-2">
                {{ (sdmPage - 1) * perPage + index + 1 }}
              </td>
              <td class="px-3 py-2 font-medium">{{ item.sdm_component }}</td>
              <td class="px-3 py-2">{{ item.metrik }}</td>
              <td class="px-3 py-2">{{ item.capacity_target }}</td>
              <td class="px-3 py-2">
                <span
                  class="px-2 py-1 rounded text-xs font-semibold"
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
              <td class="px-3 py-2 text-right">
                {{ item.budget.toLocaleString() }}
              </td>
              <td class="px-3 py-2 text-right">
                {{ item.actual.toLocaleString() }}
              </td>
              <td class="px-3 py-2 text-center flex justify-center gap-2">
                <Eye
                  class="w-5 h-5 text-blue-500 cursor-pointer"
                  @click="viewSdm(item)"
                />
                <Edit
                  class="w-5 h-5 text-yellow-500 cursor-pointer"
                  @click="editSdm(item)"
                />
                <Trash2
                  class="w-5 h-5 text-red-500 cursor-pointer"
                  @click="deleteSdm(item)"
                />
              </td>
            </tr>

            <!-- Jika tidak ada data -->
            <tr v-if="filteredSdm.length === 0">
              <td colspan="7" class="text-center py-4 text-gray-500">
                No SDM Resource data found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        class="flex flex-wrap justify-between items-center mt-4 gap-2 text-sm sm:text-base"
      >
        <span>Page {{ sdmPage }} of {{ pageCount(filteredSdm) }}</span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 border rounded"
            :disabled="sdmPage === 1"
            @click="sdmPage--"
          >
            Prev
          </button>
          <button
            class="px-3 py-1 border rounded"
            :disabled="sdmPage === pageCount(filteredSdm)"
            @click="sdmPage++"
          >
            Next
          </button>
        </div>
      </div>
    </section>

    <hr class="border-t border-gray-200 my-5" />

    <!-- ================= INFRA ================= -->
    <section>
      <div class="flex justify-between items-center mb-4">
        <h4 class="text-lg font-bold">Infrastructure Tools</h4>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
          @click="addInfra"
        >
          + Add Data
        </button>
      </div>

      <!-- SEARCH -->
      <div class="mb-4 max-w-md">
        <input
          v-model="infraSearch"
          type="text"
          placeholder="Search Infrastructure..."
          class="w-full pl-4 pr-4 py-2 border border-[#DCDEDD] rounded-[12px] focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] transition-all font-semibold text-sm sm:text-base"
        />
      </div>

      <div class="overflow-x-auto rounded-[12px] border border-gray-200">
        <table class="w-full text-sm sm:text-base">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2">No</th>
              <th class="px-3 py-2">Tech Stack</th>
              <th class="px-3 py-2">Vendor</th>
              <th class="px-3 py-2 text-right">Monthly</th>
              <th class="px-3 py-2 text-right">Annual</th>
              <th class="px-3 py-2">Expired</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in infraPaginated"
              :key="item.id"
              class="border-t"
            >
              <td class="px-3 py-2">
                {{ (infraPage - 1) * perPage + index + 1 }}
              </td>
              <td class="px-3 py-2 font-medium">
                {{ item.tech_stack_component }}
              </td>
              <td class="px-3 py-2">{{ item.vendor }}</td>
              <td class="px-3 py-2 text-right">
                Rp. {{ item.monthly_fee.toLocaleString() }}
              </td>
              <td class="px-3 py-2 text-right">
                Rp. {{ item.annual_fee.toLocaleString() }}
              </td>
              <td class="px-3 py-2">{{ formatDate(item.expired_date) }}</td>
              <td class="px-3 py-2">{{ item.status }}</td>
              <td class="px-3 py-2 text-center flex justify-center gap-2">
                <Eye
                  class="w-5 h-5 text-blue-500 cursor-pointer"
                  @click="viewInfra(item)"
                />
                <Edit
                  class="w-5 h-5 text-yellow-500 cursor-pointer"
                  @click="editInfra(item)"
                />
                <Trash2
                  class="w-5 h-5 text-red-500 cursor-pointer"
                  @click="deleteInfra(item)"
                />
              </td>
            </tr>

            <!-- Jika tidak ada data -->
            <tr v-if="filteredInfra.length === 0">
              <td colspan="7" class="text-center py-4 text-gray-500">
                No Infrastructure Tools data found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        class="flex flex-wrap justify-between items-center mt-4 gap-2 text-sm sm:text-base"
      >
        <span>Page {{ infraPage }} of {{ pageCount(filteredInfra) }}</span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 border rounded"
            :disabled="infraPage === 1"
            @click="infraPage--"
          >
            Prev
          </button>
          <button
            class="px-3 py-1 border rounded"
            :disabled="infraPage === pageCount(filteredInfra)"
            @click="infraPage++"
          >
            Next
          </button>
        </div>
      </div>
    </section>
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
</template>
