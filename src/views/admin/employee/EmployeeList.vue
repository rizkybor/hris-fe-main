<script setup>
import Statisctics from "@/components/admin/employee/list/Statisctics.vue";
import CardList from "@/components/admin/employee/list/CardList.vue";
import { useEmployeeStore } from "@/stores/employee";
import { useLookupStore } from "@/stores/lookups";
import { storeToRefs } from "pinia";
import { ref, onMounted, watch, computed } from "vue";
import { debounce } from "lodash-es";
import { Search, UserPlus, AlertTriangle, Users, X } from "lucide-vue-next";
import Pagination from "@/components/admin/team/Pagination.vue";
import { can } from "@/helpers/permissionHelper";
import Alert from "@/components/common/Alert.vue";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import { UiButton, UiEmpty, UiInput, UiPageHeader, UiSelect } from "@/components/ui";
import { useListState } from "@/composables/useListState";
import { useStaleFetch, invalidate } from "@/composables/useStaleFetch";
import { useI18n } from "vue-i18n";

const { t, te } = useI18n();

const employeeStore = useEmployeeStore();
// listRows/listMeta belong to this page only (employees is shared with pickers).
const { listRows: employees, listMeta: meta, contractAlerts, success } = storeToRefs(employeeStore);

const lookups = useLookupStore();
const employmentTypes = computed(() => lookups.systemOptionsFor("employment-types"));
const jobStatuses = computed(() => lookups.systemOptionsFor("job-statuses"));

// Search, filters, page and page size survive leaving and coming back (URL + remembered).
const list = useListState("employees", { q: "", type: "", status: "", page: 1, per: 10 });

const params = computed(() => ({
  page: list.page,
  row_per_page: list.per,
  ...(list.q ? { search: list.q } : {}),
  type: list.type,
  status: list.status,
}));

// Show what the store already has (instant back-navigation), refresh quietly.
// Only the last loaded query counts as fresh: the store holds one page at a time.
const { loading, refreshing } = useStaleFetch(
  async () => {
    await employeeStore.fetchEmployeeList(params.value);
    invalidate("adm-employees:list");
  },
  {
    key: () => ["adm-employees:list", params.value],
    hasData: () => employeeStore.listLoaded,
    maxAge: 30_000,
  }
);

useStaleFetch(() => employeeStore.fetchContractAlerts().catch(() => {}), {
  key: () => "adm-employees:alerts",
  hasData: () => employeeStore.contractAlertsLoaded,
  maxAge: 5 * 60_000,
});

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

// Filter options are cached lookups (shared with the wizard), loaded alongside the list.
onMounted(() => {
  lookups.ensureAll([
    ["systemOptions", "employment-types"],
    ["systemOptions", "job-statuses"],
  ]).catch(() => {});
});

// Typing is debounced before it becomes list state (and a request).
const searchText = ref(list.q);
const applySearch = debounce((value) => {
  list.q = (value ?? "").trim();
}, 300);
watch(searchText, applySearch);
watch(
  () => list.q,
  (q) => {
    if (q !== (searchText.value ?? "").trim()) searchText.value = q;
  }
);

const handlePageChange = (page) => {
  list.page = page;
};

const handlePerPageChange = (perPage) => {
  list.per = perPage; // resets the page to 1
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
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('employees.list.title')">
      <template #subtitle>
        {{ $t("employees.list.subtitle", { from: meta.from, to: meta.to, total: meta.total }) }}
      </template>
      <template #actions>
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

    <Alert type="success" :title="success" :show="!!success" @close="employeeStore.clearMessages()" />

    <!-- Employee list: one card (toolbar, cards on a tray, pagination), same as Projects and Teams -->
    <section class="sm:bg-ui-surface sm:border sm:border-ui-line sm:rounded-ui-card">
    <!-- Toolbar -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:p-4 sm:px-5 sm:border-b sm:border-ui-line">
      <UiInput
        v-model="searchText"
        :icon="Search"
        :placeholder="$t('employees.list.searchPlaceholder')"
        class="flex-1 lg:max-w-md"
      />
      <div class="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
        <UiSelect v-model="list.type" :options="typeOptions" class="sm:w-44" />
        <UiSelect v-model="list.status" :options="statusOptions" class="sm:w-44" />
      </div>
    </div>

    <div class="pt-4 sm:p-5 sm:ui-tray">
    <!-- Employee Grid -->
    <SkeletonCardGrid
      v-if="loading"
      :count="8"
      cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    />

    <UiEmpty
      v-else-if="employees.length === 0"
      :icon="Users"
      :title="$t('employees.list.empty')"
    />

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ui-stagger transition-opacity"
      :class="refreshing ? 'opacity-60' : ''"
      :aria-busy="refreshing"
    >
      <CardList
        v-for="employee in employees"
        :key="employee.id"
        :data="employee"
      />
    </div>
    </div>

    <!-- Pagination -->
    <div class="pt-4 sm:py-3.5 sm:px-5 sm:border-t sm:border-ui-line">
      <Pagination
        :meta="meta"
        :loading="loading || refreshing"
        @page-change="handlePageChange"
        @per-page-change="handlePerPageChange"
      />
    </div>
    </section>
  </div>
</template>
