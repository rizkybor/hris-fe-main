<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { debounce } from "lodash-es";
import Alert from "@/components/common/Alert.vue";
import { can } from "@/helpers/permissionHelper";
import Statistics from "@/components/admin/company-finance/list/Statistic.vue";
import FixedCostsModal from "@/components/admin/company-finance/modals/FixedCostsModal.vue";
import SdmResourcesModal from "@/components/admin/company-finance/modals/SdmResourcesModal.vue";
import InfraToolsModal from "@/components/admin/company-finance/modals/InfraToolsModal.vue";
import DeleteConfirmationModal from "@/components/common/ConfirmationModal.vue";
import { Eye, Edit, Trash2, Wallet, Users, Server, Search, Plus } from "lucide-vue-next";
import { UiPageHeader, UiInput, UiButton, UiBadge, UiTable } from "@/components/ui";
import { useCompanyFinanceStore } from "@/stores/companyFinance";
import Pagination from "@/components/common/Pagination.vue";
import { operationalCostStatusLabel, expiryState } from "@/utils/operationalCostStatus";

const store = useCompanyFinanceStore();

const tabs = [
  { key: "fixed", label: "Fixed Cost", icon: Wallet },
  { key: "sdm", label: "SDM Resource", icon: Users },
  { key: "infra", label: "Infrastructure Tools", icon: Server },
];
const activeTab = ref("fixed");

// ----- Presentation only -----
const statusTone = (status) => (status === "active" ? "ok" : "neutral");
// expiryState() returns a legacy colour class; map it onto tokens.
const expiryTextClass = (state) => (state?.class?.includes("red") ? "text-ui-bad" : "text-ui-warn");
const inactiveTitle = (item) => (item.status !== "active" ? "Tidak Digunakan — tidak dihitung ke total" : "");
const fixedColumns = [
  { key: "financial_items", label: "Item" },
  { key: "actual", label: "Actual", align: "right" },
  { key: "expired_date", label: "Expired" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
  { key: "actions", label: "Action", align: "right" },
];
const sdmColumns = [
  { key: "field", label: "Bidang" },
  { key: "productive_hours_per_month", label: "Jam/Bulan", align: "right" },
  { key: "actual", label: "Actual", align: "right" },
  { key: "expired_date", label: "Expired" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes" },
  { key: "actions", label: "Action", align: "right" },
];
const infraColumns = [
  { key: "tech_stack_component", label: "Tech Stack" },
  { key: "vendor", label: "Vendor" },
  { key: "monthly_fee", label: "Monthly", align: "right" },
  { key: "annual_fee", label: "Annual", align: "right" },
  { key: "expired_date", label: "Expired" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Action", align: "right" },
];

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
  if (!date) return "-";
  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Operational Cost" subtitle="Company Operational Cost Overview" />

    <Statistics v-if="can('company-finance-statistic')" />

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Tabs: underline on desktop, scrolling chips on phones -->
      <div class="px-4 sm:px-5 pt-4 sm:pt-3 sm:border-b sm:border-ui-line">
        <div class="tabs-scroll overflow-x-auto -mx-1 px-1">
          <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.key"
              @click="activeTab = tab.key"
              :class="[
                'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:shadow-ui-focus',
                'h-8 px-3 rounded-full border text-ui-small',
                'sm:h-auto sm:px-0.5 sm:pt-2 sm:pb-3 sm:rounded-none sm:border-0 sm:border-b-2 sm:-mb-px sm:text-ui-body',
                activeTab === tab.key
                  ? 'bg-ui-ink text-white border-ui-ink sm:bg-transparent sm:text-ui-ink sm:border-ui-ink'
                  : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover sm:bg-transparent sm:text-ui-muted sm:border-transparent sm:hover:bg-transparent sm:hover:text-ui-ink',
              ]"
            >
              <component :is="tab.icon" class="w-4 h-4 hidden sm:block" />
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- ================= FIXED COST ================= -->
      <div v-if="activeTab === 'fixed'" class="ui-anim-fade-up">
        <div class="px-4 sm:px-5 py-3 space-y-3 border-b border-ui-line">
          <Alert
            v-if="fixedAlert.show"
            :type="fixedAlert.type"
            :title="fixedAlert.title"
            :message="fixedAlert.message"
            :show="fixedAlert.show"
          />
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <UiInput v-model="fixedSearch" :icon="Search" placeholder="Search fixed cost..." class="w-full sm:w-[280px]" />
            <UiButton v-if="can('fixed-cost-create')" :icon="Plus" class="w-full sm:w-auto" @click="addFixedCost">Fixed Cost</UiButton>
          </div>
        </div>

        <UiTable
          :columns="fixedColumns"
          :rows="fixedCostPaginated"
          :meta="{ current_page: fixedPage, per_page: perPage }"
          :loading="store.loading"
          :skeleton-rows="4"
          empty-text="No Fixed Cost data found."
        >
          <template #cell-financial_items="{ row }">
            <span class="font-medium" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'" :title="inactiveTitle(row)">{{ row.financial_items }}</span>
          </template>
          <template #cell-actual="{ row }">
            <span class="tabular-nums whitespace-nowrap" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.actual.toLocaleString() }}</span>
          </template>
          <template #cell-expired_date="{ row }">
            <div class="whitespace-nowrap">
              <p class="tabular-nums">{{ formatDate(row.expired_date) }}</p>
              <p v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</p>
            </div>
          </template>
          <template #cell-status="{ row }">
            <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
          </template>
          <template #cell-notes="{ row }">
            <span class="text-ui-muted">{{ row.notes }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-0.5">
              <button type="button" @click="viewFixedCost(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" title="View" aria-label="View"><Eye class="w-4 h-4" /></button>
              <button v-if="can('fixed-cost-edit')" type="button" @click="editFixedCost(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" title="Edit" aria-label="Edit"><Edit class="w-4 h-4" /></button>
              <button v-if="can('fixed-cost-delete')" type="button" @click="deleteFixedCostHandler(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad" title="Delete" aria-label="Delete"><Trash2 class="w-4 h-4" /></button>
            </div>
          </template>

          <template #mobile="{ row, number }">
            <div class="flex items-start gap-3 px-4 py-3.5" :title="inactiveTitle(row)">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-ui-body font-medium truncate" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'">{{ row.financial_items }}</p>
                  <p class="text-ui-body font-medium tabular-nums text-right shrink-0" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.actual.toLocaleString() }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
                  <span class="text-ui-cap text-ui-muted tabular-nums">Exp. {{ formatDate(row.expired_date) }}</span>
                  <span v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</span>
                </div>
                <p v-if="row.notes" class="text-ui-cap text-ui-muted mt-1 line-clamp-2">{{ row.notes }}</p>
                <div class="flex items-center gap-1 mt-2 -ml-2">
                  <UiButton variant="ghost" size="sm" :icon="Eye" @click="viewFixedCost(row)">View</UiButton>
                  <UiButton v-if="can('fixed-cost-edit')" variant="ghost" size="sm" :icon="Edit" @click="editFixedCost(row)">Edit</UiButton>
                  <UiButton v-if="can('fixed-cost-delete')" variant="ghost" size="sm" :icon="Trash2" class="!text-ui-bad" @click="deleteFixedCostHandler(row)">Delete</UiButton>
                </div>
              </div>
            </div>
          </template>
        </UiTable>

        <div v-if="store.fixedCostData.meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
          <Pagination :meta="store.fixedCostData.meta" :loading="store.loading" item-label="item" @page-change="fetchFixedCostData" />
        </div>
      </div>

      <!-- ================= SDM ================= -->
      <div v-if="activeTab === 'sdm'" class="ui-anim-fade-up">
        <div class="px-4 sm:px-5 py-3 space-y-3 border-b border-ui-line">
          <Alert
            v-if="sdmAlert.show"
            :type="sdmAlert.type"
            :title="sdmAlert.title"
            :message="sdmAlert.message"
            :show="sdmAlert.show"
          />
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <UiInput v-model="sdmSearch" :icon="Search" placeholder="Search SDM resource..." class="w-full sm:w-[280px]" />
            <UiButton v-if="can('sdm-resource-create')" :icon="Plus" class="w-full sm:w-auto" @click="addSdm">SDM Resource</UiButton>
          </div>
        </div>

        <UiTable
          :columns="sdmColumns"
          :rows="sdmResourcePaginated"
          :meta="{ current_page: sdmPage, per_page: perPage }"
          :loading="store.loading"
          :skeleton-rows="4"
          empty-text="No SDM Resource data found."
        >
          <template #cell-field="{ row }">
            <span class="font-medium" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'" :title="inactiveTitle(row)">{{ row.sdm_field_name ?? row.sdm_component }}</span>
          </template>
          <template #cell-productive_hours_per_month="{ row }">
            <span class="tabular-nums">{{ row.productive_hours_per_month ?? "-" }}</span>
          </template>
          <template #cell-actual="{ row }">
            <span class="tabular-nums whitespace-nowrap" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.actual.toLocaleString() }}</span>
          </template>
          <template #cell-expired_date="{ row }">
            <div class="whitespace-nowrap">
              <p class="tabular-nums">{{ formatDate(row.expired_date) }}</p>
              <p v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</p>
            </div>
          </template>
          <template #cell-status="{ row }">
            <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
          </template>
          <template #cell-notes="{ row }">
            <span class="text-ui-muted">{{ row.notes }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-0.5">
              <button type="button" @click="viewSdm(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" title="View" aria-label="View"><Eye class="w-4 h-4" /></button>
              <button v-if="can('sdm-resource-edit')" type="button" @click="editSdm(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" title="Edit" aria-label="Edit"><Edit class="w-4 h-4" /></button>
              <button v-if="can('sdm-resource-delete')" type="button" @click="deleteSdmHandler(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad" title="Delete" aria-label="Delete"><Trash2 class="w-4 h-4" /></button>
            </div>
          </template>

          <template #mobile="{ row, number }">
            <div class="flex items-start gap-3 px-4 py-3.5" :title="inactiveTitle(row)">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-ui-body font-medium truncate" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'">{{ row.sdm_field_name ?? row.sdm_component }}</p>
                  <p class="text-ui-body font-medium tabular-nums text-right shrink-0" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.actual.toLocaleString() }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
                  <span class="text-ui-cap text-ui-muted tabular-nums">{{ row.productive_hours_per_month ?? "-" }} Jam/Bulan</span>
                  <span class="text-ui-cap text-ui-muted tabular-nums">Exp. {{ formatDate(row.expired_date) }}</span>
                  <span v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</span>
                </div>
                <p v-if="row.notes" class="text-ui-cap text-ui-muted mt-1 line-clamp-2">{{ row.notes }}</p>
                <div class="flex items-center gap-1 mt-2 -ml-2">
                  <UiButton variant="ghost" size="sm" :icon="Eye" @click="viewSdm(row)">View</UiButton>
                  <UiButton v-if="can('sdm-resource-edit')" variant="ghost" size="sm" :icon="Edit" @click="editSdm(row)">Edit</UiButton>
                  <UiButton v-if="can('sdm-resource-delete')" variant="ghost" size="sm" :icon="Trash2" class="!text-ui-bad" @click="deleteSdmHandler(row)">Delete</UiButton>
                </div>
              </div>
            </div>
          </template>
        </UiTable>

        <div v-if="store.sdmResourceData.meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
          <Pagination :meta="store.sdmResourceData.meta" :loading="store.loading" item-label="item" @page-change="fetchSdmResourcesData" />
        </div>
      </div>

      <!-- ================= INFRA ================= -->
      <div v-if="activeTab === 'infra'" class="ui-anim-fade-up">
        <div class="px-4 sm:px-5 py-3 space-y-3 border-b border-ui-line">
          <Alert
            v-if="infraAlert.show"
            :type="infraAlert.type"
            :title="infraAlert.title"
            :message="infraAlert.message"
            :show="infraAlert.show"
          />
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <UiInput v-model="infraSearch" :icon="Search" placeholder="Search infrastructure..." class="w-full sm:w-[280px]" />
            <UiButton v-if="can('infrastructure-tool-create')" :icon="Plus" class="w-full sm:w-auto" @click="addInfra">Infrastructure Tool</UiButton>
          </div>
        </div>

        <UiTable
          :columns="infraColumns"
          :rows="infraPaginated"
          :meta="{ current_page: infraPage, per_page: perPage }"
          :loading="store.loading"
          :skeleton-rows="4"
          empty-text="No Infrastructure Tools data found."
        >
          <template #cell-tech_stack_component="{ row }">
            <span class="font-medium" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'" :title="inactiveTitle(row)">{{ row.tech_stack_component }}</span>
          </template>
          <template #cell-monthly_fee="{ row }">
            <span class="tabular-nums whitespace-nowrap" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.monthly_fee.toLocaleString() }}</span>
          </template>
          <template #cell-annual_fee="{ row }">
            <span class="tabular-nums whitespace-nowrap" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.annual_fee.toLocaleString() }}</span>
          </template>
          <template #cell-expired_date="{ row }">
            <div class="whitespace-nowrap">
              <p class="tabular-nums">{{ formatDate(row.expired_date) }}</p>
              <p v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</p>
            </div>
          </template>
          <template #cell-status="{ row }">
            <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
          </template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-0.5">
              <button type="button" @click="viewInfra(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" title="View" aria-label="View"><Eye class="w-4 h-4" /></button>
              <button v-if="can('infrastructure-tool-edit')" type="button" @click="editInfra(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink" title="Edit" aria-label="Edit"><Edit class="w-4 h-4" /></button>
              <button v-if="can('infrastructure-tool-delete')" type="button" @click="deleteInfraHandler(row)" class="ui-press w-8 h-8 rounded-ui-control inline-flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad" title="Delete" aria-label="Delete"><Trash2 class="w-4 h-4" /></button>
            </div>
          </template>

          <template #mobile="{ row, number }">
            <div class="flex items-start gap-3 px-4 py-3.5" :title="inactiveTitle(row)">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-ui-body font-medium truncate" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-muted'">{{ row.tech_stack_component }}</p>
                    <p class="text-ui-cap text-ui-muted truncate">{{ row.vendor }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-ui-body font-medium tabular-nums" :class="row.status === 'active' ? 'text-ui-ink' : 'text-ui-faint'">Rp {{ row.monthly_fee.toLocaleString() }}</p>
                    <p class="text-ui-cap text-ui-muted tabular-nums">Annual Rp {{ row.annual_fee.toLocaleString() }}</p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                  <UiBadge :tone="statusTone(row.status)" dot>{{ operationalCostStatusLabel(row.status) }}</UiBadge>
                  <span class="text-ui-cap text-ui-muted tabular-nums">Exp. {{ formatDate(row.expired_date) }}</span>
                  <span v-if="expiryState(row)" class="text-ui-cap font-medium" :class="expiryTextClass(expiryState(row))">{{ expiryState(row).label }}</span>
                </div>
                <div class="flex items-center gap-1 mt-2 -ml-2">
                  <UiButton variant="ghost" size="sm" :icon="Eye" @click="viewInfra(row)">View</UiButton>
                  <UiButton v-if="can('infrastructure-tool-edit')" variant="ghost" size="sm" :icon="Edit" @click="editInfra(row)">Edit</UiButton>
                  <UiButton v-if="can('infrastructure-tool-delete')" variant="ghost" size="sm" :icon="Trash2" class="!text-ui-bad" @click="deleteInfraHandler(row)">Delete</UiButton>
                </div>
              </div>
            </div>
          </template>
        </UiTable>

        <div v-if="store.infraToolsData.meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
          <Pagination :meta="store.infraToolsData.meta" :loading="store.loading" item-label="item" @page-change="fetchInfraToolsData" />
        </div>
      </div>
    </section>

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
  </div>
</template>

<style scoped>
/* 3 finance tabs no longer risk overflowing the card on narrow screens --
   they scroll horizontally in one row instead, scrollbar hidden. */
.tabs-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tabs-scroll::-webkit-scrollbar {
  display: none;
}
</style>
