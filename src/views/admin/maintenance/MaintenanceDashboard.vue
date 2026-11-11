<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { Plus, Search, SearchX, Inbox, Building2, FolderKanban, PiggyBank, Sparkles, AlertTriangle, ChevronRight } from "lucide-vue-next";
import { useMaintenanceStore } from "@/stores/maintenance";
import { useClientStore } from "@/stores/client";
import { useProjectStore } from "@/stores/project";
import { can } from "@/helpers/permissionHelper";
import { formatHours, formatMonth, CONTRACT_STATUS } from "@/utils/maintenance";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiSelect, UiChips, UiTable, UiEmpty, UiAlert } from "@/components/ui";
import ContractFormModal from "@/components/admin/maintenance/ContractFormModal.vue";
import MaintenanceRecap from "@/components/admin/maintenance/MaintenanceRecap.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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

// ===== Presentation =====
const STATUS_TONE = { active: "ok", paused: "warn", ended: "neutral" };
// Same thresholds as the dashboard widget: over quota bad, from 75% warn.
const barClass = (p) => (p.overage > 0 ? "bg-ui-bad" : p.used_percent >= 75 ? "bg-ui-warn" : "bg-ui-accent");
const statusChips = computed(() => [
  { value: "", label: t("common.labels.all") },
  ...Object.entries(CONTRACT_STATUS).map(([value, s]) => ({ value, label: s.label })),
]);
const clientOptions = computed(() => [{ value: "", label: t("maintenance.list.allClients") }, ...clients.value.map((c) => ({ value: c.id, label: c.name }))]);
const COLUMNS = computed(() => [
  { key: "name", label: t("maintenance.list.columns.contract") },
  { key: "status", label: t("common.labels.status") },
  { key: "quota", label: t("maintenance.list.columns.thisMonth"), width: "32%" },
  { key: "balance", label: t("maintenance.list.columns.balance"), align: "right" },
  { key: "go", label: "", align: "right", width: 48 },
]);
const openContract = (contract) => router.push({ name: "admin.maintenance.detail", params: { id: contract.id } });
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('maintenance.list.title')" :subtitle="$t('maintenance.list.subtitle')">
      <template v-if="can('maintenance-create')" #actions>
        <UiButton :icon="Plus" class="w-full sm:w-auto" @click="openCreate">{{ $t("maintenance.list.newContract") }}</UiButton>
      </template>
    </UiPageHeader>

    <MaintenanceRecap />

    <UiAlert v-if="error && typeof error === 'string'" tone="bad" :message="error" />

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Toolbar -->
      <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <div class="flex flex-col sm:flex-row gap-2 lg:contents">
          <UiInput v-model="search" :icon="Search" :placeholder="$t('maintenance.list.searchPlaceholder')" class="flex-1 lg:flex-none lg:w-[300px]" :aria-label="$t('maintenance.list.searchAria')" />
          <UiSelect v-model="clientFilter" :options="clientOptions" class="sm:w-[220px] lg:order-last lg:ml-auto" :aria-label="$t('common.labels.client')" />
        </div>
        <UiChips v-model="statusFilter" :options="statusChips" class="min-w-0" />
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="contracts"
        :loading="loading && !contracts.length"
        :skeleton-rows="3"
        clickable
        @row-click="openContract"
      >
        <template #cell-name="{ row }">
          <div class="min-w-0 max-w-[360px] py-2">
            <RouterLink
              :to="{ name: 'admin.maintenance.detail', params: { id: row.id } }"
              class="block text-ui-ink font-medium truncate hover:text-ui-accent"
              @click.stop
            >{{ row.name }}</RouterLink>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-ui-cap text-ui-muted min-w-0">
              <span class="inline-flex items-center gap-1 min-w-0 max-w-full"><Building2 class="w-3 h-3 shrink-0 text-ui-faint" /><span class="truncate">{{ row.client?.name || "-" }}</span></span>
              <span v-if="row.project" class="inline-flex items-center gap-1 min-w-0 max-w-full"><FolderKanban class="w-3 h-3 shrink-0 text-ui-faint" /><span class="truncate">{{ row.project.name }}</span></span>
            </div>
          </div>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot>{{ CONTRACT_STATUS[row.status]?.label }}</UiBadge>
        </template>
        <template #cell-quota="{ row }">
          <div v-if="row.current_period" class="min-w-[200px] py-2">
            <div class="flex items-baseline justify-between gap-2 text-ui-cap">
              <span class="text-ui-muted tabular-nums">
                <strong class="text-ui-ink font-medium">{{ formatHours(row.current_period.remaining) }}</strong>
                {{ $t("maintenance.common.leftOf", { total: formatHours(row.current_period.total) }) }}
              </span>
              <span class="text-ui-faint">{{ formatMonth(row.current_period.month) }}</span>
            </div>
            <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden mt-1.5">
              <div class="h-full rounded-full" :class="barClass(row.current_period)" :style="{ width: `${Math.min(row.current_period.used_percent, 100)}%` }"></div>
            </div>
            <p v-if="row.current_period.overage > 0" class="text-ui-cap text-ui-bad font-medium mt-1 flex items-center gap-1">
              <AlertTriangle class="w-3 h-3 shrink-0" />{{ $t("maintenance.common.overQuota", { hours: formatHours(row.current_period.overage) }) }}
            </p>
          </div>
          <p v-else class="text-ui-cap text-ui-muted">{{ $t("maintenance.common.noQuotaThisMonth", { status: CONTRACT_STATUS[row.status]?.label.toLowerCase() }) }}</p>
        </template>
        <template #cell-balance="{ row }">
          <p class="text-ui-ink font-medium tabular-nums whitespace-nowrap inline-flex items-center gap-1.5">
            <PiggyBank class="w-3.5 h-3.5 text-ui-faint" />{{ formatHours(row.balance_hours) }}
          </p>
          <p v-if="row.open_features" class="text-ui-cap text-ui-muted whitespace-nowrap">
            {{ $t("maintenance.common.features", { n: row.open_features }, row.open_features) }}
          </p>
          <p v-if="row.expiring_soon?.hours > 0" class="text-ui-cap text-ui-warn font-medium whitespace-nowrap">
            {{ $t("maintenance.common.expiring", { hours: formatHours(row.expiring_soon.hours) }) }}
          </p>
        </template>
        <template #cell-go>
          <ChevronRight class="w-4 h-4 text-ui-faint inline-block" />
        </template>

        <!-- Phones: stacked contract cards -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5">
            <div class="flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-ui-body font-medium text-ui-ink line-clamp-2 break-words">{{ row.name }}</p>
                  <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot class="shrink-0">{{ CONTRACT_STATUS[row.status]?.label }}</UiBadge>
                </div>
                <p class="text-ui-cap text-ui-muted truncate mt-0.5">
                  {{ row.client?.name || "-" }}<template v-if="row.project"> · {{ row.project.name }}</template>
                </p>

                <div v-if="row.current_period" class="mt-2.5">
                  <div class="flex items-baseline justify-between gap-2 text-ui-cap">
                    <span class="text-ui-muted tabular-nums">
                      <strong class="text-ui-ink font-medium">{{ formatHours(row.current_period.remaining) }}</strong>
                      {{ $t("maintenance.common.leftOf", { total: formatHours(row.current_period.total) }) }}
                    </span>
                    <span class="text-ui-faint">{{ formatMonth(row.current_period.month) }}</span>
                  </div>
                  <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden mt-1.5">
                    <div class="h-full rounded-full" :class="barClass(row.current_period)" :style="{ width: `${Math.min(row.current_period.used_percent, 100)}%` }"></div>
                  </div>
                  <p v-if="row.current_period.overage > 0" class="text-ui-cap text-ui-bad font-medium mt-1">
                    {{ $t("maintenance.common.overQuota", { hours: formatHours(row.current_period.overage) }) }}
                  </p>
                </div>
                <p v-else class="text-ui-cap text-ui-muted bg-ui-subtle rounded-ui-control px-2.5 py-2 mt-2.5">
                  {{ $t("maintenance.common.noQuotaThisMonth", { status: CONTRACT_STATUS[row.status]?.label.toLowerCase() }) }}
                </p>

                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-ui-cap text-ui-muted">
                  <span class="inline-flex items-center gap-1 tabular-nums"><PiggyBank class="w-3.5 h-3.5 text-ui-faint" /> {{ $t("maintenance.common.balance", { hours: formatHours(row.balance_hours) }) }}</span>
                  <span v-if="row.open_features" class="inline-flex items-center gap-1"><Sparkles class="w-3.5 h-3.5 text-ui-faint" /> {{ $t("maintenance.common.features", { n: row.open_features }, row.open_features) }}</span>
                  <span v-if="row.expiring_soon?.hours > 0" class="inline-flex items-center gap-1 text-ui-warn font-medium">
                    <AlertTriangle class="w-3.5 h-3.5" /> {{ $t("maintenance.common.expiring", { hours: formatHours(row.expiring_soon.hours) }) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="search || statusFilter || clientFilter" :icon="SearchX" :title="$t('maintenance.list.emptyFiltered')" compact />
          <UiEmpty
            v-else
            :icon="Inbox"
            :title="$t('maintenance.list.emptyTitle')"
            :message="$t('maintenance.list.emptyHint')"
            compact
          >
            <UiButton v-if="can('maintenance-create')" variant="secondary" :icon="Plus" @click="openCreate">{{ $t("maintenance.list.createFirst") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>
    </section>

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
