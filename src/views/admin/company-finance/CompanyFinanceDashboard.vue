<script setup>
import { ref, computed, watch } from "vue";
import { debounce } from "lodash";
import { Briefcase } from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { can } from "@/helpers/permissionHelper";
import Statistics from "@/components/admin/company-finance/list/Statistic.vue";

/* =======================
   STATE
======================= */
const loading = ref(false);
// const success = ref("Operational cost loaded successfully");

/* =======================
   DUMMY DATA
======================= */
const fixedCosts = ref(
  Array.from({ length: 23 }, (_, i) => ({
    id: i + 1,
    financial_items: `Service ${i + 1}`,
    budget: 10000000 + i * 1000000,
    actual: 8000000 + i * 900000,
    notes: "Operational cost",
  }))
);

const sdmResources = ref(
  Array.from({ length: 17 }, (_, i) => ({
    id: i + 1,
    sdm_component: `Engineer ${i + 1}`,
    metrik: "Man Power",
    capacity_target: 3,
    rag_status: i % 3 === 0 ? "red" : i % 2 ? "amber" : "green",
    budget: 15000000,
    actual: 14000000,
  }))
);

const infrastructures = ref(
  Array.from({ length: 14 }, (_, i) => ({
    id: i + 1,
    tech_stack_component: `Tool ${i + 1}`,
    vendor: "Vendor X",
    monthly_fee: 3000000,
    annual_fee: 36000000,
    expired_date: "2026-06-30",
    status: "active",
  }))
);

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

/* =======================
   COMPUTED
======================= */
const filteredFixed = computed(() =>
  fixedCosts.value.filter((item) =>
    item.financial_items.toLowerCase().includes(fixedSearch.value.toLowerCase())
  )
);
const filteredSdm = computed(() =>
  sdmResources.value.filter((item) =>
    item.sdm_component.toLowerCase().includes(sdmSearch.value.toLowerCase())
  )
);
const filteredInfra = computed(() =>
  infrastructures.value.filter((item) =>
    item.tech_stack_component.toLowerCase().includes(infraSearch.value.toLowerCase())
  )
);

const fixedPaginated = computed(() => paginate(filteredFixed.value, fixedPage.value));
const sdmPaginated = computed(() => paginate(filteredSdm.value, sdmPage.value));
const infraPaginated = computed(() => paginate(filteredInfra.value, infraPage.value));

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

  <!-- ================= FIXED COST ================= -->
  <section class="mb-12 mt-10">
    <h4 class="text-lg font-bold mb-4">Fixed Cost</h4>

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
            <th class="px-3 py-2 text-left">Item</th>
            <th class="px-3 py-2 text-right">Budget</th>
            <th class="px-3 py-2 text-right">Actual</th>
            <th class="px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in fixedPaginated" :key="item.id" class="border-t">
            <td class="px-3 py-2 font-medium">{{ item.financial_items }}</td>
            <td class="px-3 py-2 text-right">{{ item.budget }}</td>
            <td class="px-3 py-2 text-right">{{ item.actual }}</td>
            <td class="px-3 py-2 text-gray-500">{{ item.notes }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap justify-between items-center mt-4 gap-2 text-sm sm:text-base">
      <span>Page {{ fixedPage }} of {{ pageCount(filteredFixed) }}</span>
      <div class="flex gap-2">
        <button class="px-3 py-1 border rounded" :disabled="fixedPage === 1" @click="fixedPage--">Prev</button>
        <button class="px-3 py-1 border rounded" :disabled="fixedPage === pageCount(filteredFixed)" @click="fixedPage++">Next</button>
      </div>
    </div>
  </section>

  <!-- ================= SDM ================= -->
  <section class="mb-12">
    <h4 class="text-lg font-bold mb-4">SDM Resource</h4>

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
            <th class="px-3 py-2">Component</th>
            <th class="px-3 py-2">Metric</th>
            <th class="px-3 py-2">Capacity</th>
            <th class="px-3 py-2">RAG</th>
            <th class="px-3 py-2 text-right">Budget</th>
            <th class="px-3 py-2 text-right">Actual</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sdmPaginated" :key="item.id" class="border-t">
            <td class="px-3 py-2 font-medium">{{ item.sdm_component }}</td>
            <td class="px-3 py-2">{{ item.metrik }}</td>
            <td class="px-3 py-2">{{ item.capacity_target }}</td>
            <td class="px-3 py-2">
              <span
                class="px-2 py-1 rounded text-xs font-semibold"
                :class="{
                  'bg-green-100 text-green-700': item.rag_status === 'green',
                  'bg-yellow-100 text-yellow-700': item.rag_status === 'amber',
                  'bg-red-100 text-red-700': item.rag_status === 'red',
                }"
              >
                {{ item.rag_status }}
              </span>
            </td>
            <td class="px-3 py-2 text-right">{{ item.budget }}</td>
            <td class="px-3 py-2 text-right">{{ item.actual }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap justify-between items-center mt-4 gap-2 text-sm sm:text-base">
      <span>Page {{ sdmPage }} of {{ pageCount(filteredSdm) }}</span>
      <div class="flex gap-2">
        <button class="px-3 py-1 border rounded" :disabled="sdmPage === 1" @click="sdmPage--">Prev</button>
        <button class="px-3 py-1 border rounded" :disabled="sdmPage === pageCount(filteredSdm)" @click="sdmPage++">Next</button>
      </div>
    </div>
  </section>

  <!-- ================= INFRA ================= -->
  <section>
    <h4 class="text-lg font-bold mb-4">Infrastructure Tools</h4>

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
            <th class="px-3 py-2">Tech Stack</th>
            <th class="px-3 py-2">Vendor</th>
            <th class="px-3 py-2 text-right">Monthly</th>
            <th class="px-3 py-2 text-right">Annual</th>
            <th class="px-3 py-2">Expired</th>
            <th class="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in infraPaginated" :key="item.id" class="border-t">
            <td class="px-3 py-2 font-medium">{{ item.tech_stack_component }}</td>
            <td class="px-3 py-2">{{ item.vendor }}</td>
            <td class="px-3 py-2 text-right">{{ item.monthly_fee }}</td>
            <td class="px-3 py-2 text-right">{{ item.annual_fee }}</td>
            <td class="px-3 py-2">{{ item.expired_date }}</td>
            <td class="px-3 py-2">{{ item.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap justify-between items-center mt-4 gap-2 text-sm sm:text-base">
      <span>Page {{ infraPage }} of {{ pageCount(filteredInfra) }}</span>
      <div class="flex gap-2">
        <button class="px-3 py-1 border rounded" :disabled="infraPage === 1" @click="infraPage--">Prev</button>
        <button class="px-3 py-1 border rounded" :disabled="infraPage === pageCount(filteredInfra)" @click="infraPage++">Next</button>
      </div>
    </div>
  </section>
</template>

