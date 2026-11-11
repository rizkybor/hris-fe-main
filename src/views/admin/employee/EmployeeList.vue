<script setup>
import Statisctics from "@/components/admin/employee/list/Statisctics.vue";
import CardList from "@/components/admin/employee/list/CardList.vue";
import { useEmployeeStore } from "@/stores/employee";
import { useOptionStore } from "@/stores/option";
import { storeToRefs } from "pinia";
import { ref, onMounted, watch, computed } from "vue";
import { debounce } from "lodash-es";
import {
  Search,
  Building,
  Briefcase,
  CheckCircle,
  ChevronDown,
  Upload,
  UserPlus,
  AlertTriangle,
  Users,
  X,
} from "lucide-vue-next";
import Pagination from "@/components/admin/team/Pagination.vue";
import { can } from "@/helpers/permissionHelper";
import Alert from "@/components/common/Alert.vue";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import { UiButton, UiEmpty, UiInput, UiPageHeader, UiSelect } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t, te } = useI18n();

const employeeStore = useEmployeeStore();
const { employees, meta, loading, success } = storeToRefs(employeeStore);
const { fetchEmployeesPaginated, fetchContractAlerts } = employeeStore;

const contractAlerts = ref([]);
const showContractAlerts = ref(true);

const alertLabel = (row) => {
  const parts = [];
  if (row.probation_days_left !== null) {
    parts.push(t("employees.list.probationEnds", { n: row.probation_days_left }, row.probation_days_left));
  }
  if (row.contract_days_left !== null) {
    parts.push(t("employees.list.contractEnds", { n: row.contract_days_left }, row.contract_days_left));
  }
  return parts.join(" • ");
};

const optionStore = useOptionStore();
const { employmentTypes, jobStatuses } = storeToRefs(optionStore);
const { fetchEmploymentTypes, fetchJobStatuses } = optionStore;

const serverOptions = ref({
  page: 1,
  row_per_page: 10,
});

const filters = ref({
  search: null,
  type: "",
  status: "",
});

const fetchData = async () => {
  await fetchEmployeesPaginated({
    ...serverOptions.value,
    ...filters.value,
  });
};

onMounted(async () => {
  await fetchData();
  await fetchEmploymentTypes();
  await fetchJobStatuses();
  try {
    contractAlerts.value = await fetchContractAlerts();
  } catch (error) {
    console.error("Failed to fetch contract alerts:", error);
  }
});

watch(
  filters,
  debounce(() => {
    serverOptions.value.page = 1; // Reset to first page when filtering
    fetchData();
  }, 300),
  { deep: true }
);

const handlePageChange = (page) => {
  serverOptions.value.page = page;
  fetchData();
};

// Known option values get a translated label; anything else keeps the API label.
const enumLabel = (group, option) => {
  const key = `employees.enums.${group}.${option.value}`;
  return te(key) ? t(key) : option.label;
};

// Presentation only: filter selects with an "All" option first.
const typeOptions = computed(() => [
  { value: "", label: t("employees.list.allTypes") },
  ...(employmentTypes.value || []).map((o) => ({ value: o.value, label: enumLabel("employmentType", o) })),
]);
const statusOptions = computed(() => [
  { value: "", label: t("employees.list.allStatus") },
  ...(jobStatuses.value || []).map((s) => ({ value: s.value, label: enumLabel("jobStatus", s) })),
]);

const handlePerPageChange = (perPage) => {
  serverOptions.value.row_per_page = perPage;
  serverOptions.value.page = 1;
  fetchData();
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('employees.list.title')">
      <template #subtitle>
        {{ $t("employees.list.subtitle", { from: meta.from, to: meta.to, total: meta.total }) }}
      </template>
      <template #actions>
        <UiButton variant="secondary" :icon="Upload" class="flex-1 sm:flex-none">{{ $t("employees.list.importCsv") }}</UiButton>
        <UiButton
          v-if="can('employee-create')"
          :icon="UserPlus"
          :to="{ name: 'admin.employees.create' }"
          class="flex-1 sm:flex-none"
        >
          {{ $t("employees.list.addEmployee") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <Statisctics />

    <!-- Contract / probation alerts -->
    <div
      v-if="showContractAlerts && contractAlerts.length > 0"
      class="ui-anim-fade-up bg-ui-warn-soft border border-ui-warn/20 rounded-ui-card px-4 py-3.5 sm:px-5"
      role="status"
    >
      <div class="flex items-start gap-3">
        <AlertTriangle class="w-[18px] h-[18px] text-ui-warn shrink-0 mt-px" />
        <div class="flex-1 min-w-0">
          <h4 class="text-ui-small font-semibold text-ui-warn">
            {{ $t("employees.list.alertsTitle", { n: contractAlerts.length }, contractAlerts.length) }}
          </h4>
          <ul class="mt-1.5 space-y-1">
            <li v-for="row in contractAlerts" :key="row.employee_id" class="text-ui-small text-ui-text">
              <span class="font-medium text-ui-ink">{{ row.employee_name }}</span>
              ({{ row.job_title }}) — {{ alertLabel(row) }}
            </li>
          </ul>
        </div>
        <UiButton variant="ghost" size="sm" :icon="X" class="shrink-0 -mr-1.5 -mt-1" @click="showContractAlerts = false">
          {{ $t("common.actions.close") }}
        </UiButton>
      </div>
    </div>

    <Alert type="success" :title="success" :show="success" @close="employeeStore.clearMessages()" />

    <!-- Toolbar -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-2.5">
      <UiInput
        :model-value="filters.search ?? ''"
        @update:model-value="filters.search = $event"
        :icon="Search"
        :placeholder="$t('employees.list.searchPlaceholder')"
        class="flex-1 lg:max-w-md"
      />
      <div class="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
        <UiSelect v-model="filters.type" :options="typeOptions" class="sm:w-44" />
        <UiSelect v-model="filters.status" :options="statusOptions" class="sm:w-44" />
      </div>
    </div>

    <!-- Employee Grid -->
    <SkeletonCardGrid
      v-if="loading"
      :count="8"
      cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    />

    <div v-else-if="employees.length === 0" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty
        :icon="Users"
        :title="$t('employees.list.empty')"
      />
    </div>

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ui-stagger"
    >
      <CardList
        v-for="employee in employees"
        :key="employee.id"
        :data="employee"
      />
    </div>

    <!-- Pagination -->
    <div class="bg-ui-surface border border-ui-line rounded-ui-card px-4 py-3 sm:px-5">
      <Pagination
        :meta="meta"
        :loading="loading"
        @page-change="handlePageChange"
        @per-page-change="handlePerPageChange"
      />
    </div>
  </div>
</template>
