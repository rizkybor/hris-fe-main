<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { Plus, Search, SearchX, Inbox, PiggyBank, AlertTriangle, ChevronRight } from "lucide-vue-next";
import { useMaintenanceStore } from "@/stores/maintenance";
import { useLookupStore } from "@/stores/lookups";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { can } from "@/helpers/permissionHelper";
import { formatHours, CONTRACT_STATUS } from "@/utils/maintenance";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiSelect, UiChips, UiTable, UiEmpty, UiAlert } from "@/components/ui";
import ContractFormModal from "@/components/admin/maintenance/ContractFormModal.vue";
import MaintenanceRecap from "@/components/admin/maintenance/MaintenanceRecap.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const store = useMaintenanceStore();
const { contracts, loading, error } = storeToRefs(store);
const lookups = useLookupStore();
const clients = computed(() => lookups.clients);

// Search, status, client and the "needs attention" view live in the URL and
// are remembered; the list shows what the store has and refreshes quietly.
const list = useListState("maintenance", { q: "", status: "", client: "", attention: false });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));
const statusFilter = computed({ get: () => list.status, set: (v) => (list.status = v) });
const clientFilter = computed({ get: () => list.client, set: (v) => (list.client = v) });

const params = computed(() => ({ search: list.q || undefined, status: list.status || undefined, client_id: list.client || undefined }));
const { refreshing } = useStaleFetch(() => store.fetchContracts(params.value), {
  key: () => ["maintenance-list", params.value],
  hasData: () => contracts.value.length > 0,
});

// The client filter needs the client names (shared, cached lookup).
lookups.ensure("clients").catch(() => {});

// Contracts that need a look this month: over quota, from 75% used, or
// balance hours about to expire. Counted from the loaded list (it isn't
// paginated), so the chip and the filter always agree.
const needsAttention = (c) => (c.current_period && (c.current_period.overage > 0 || c.current_period.used_percent >= 75)) || c.expiring_soon?.hours > 0;
const attentionCount = computed(() => contracts.value.filter(needsAttention).length);
const rows = computed(() => (list.attention ? contracts.value.filter(needsAttention) : contracts.value));

// "New contract" from a client's or project's detail page:
// ?new=1&client_id=..&project_id=.. opens the form once; only those keys
// are removed from the URL so the list's own filters stay.
const NEW_KEYS = ["new", "client_id", "project_id"];
onMounted(async () => {
  if (!route.query.new) return;
  const { new: isNew, client_id: clientId, project_id: projectId } = route.query;
  const query = { ...route.query };
  NEW_KEYS.forEach((k) => delete query[k]);
  // Written out here too: a restored view may still be on its way into the
  // URL, and this replace would otherwise drop it.
  for (const key of ["q", "status", "client"]) {
    if (list[key]) query[key] = list[key];
    else delete query[key];
  }
  if (list.attention) query.attention = "1";
  else delete query.attention;
  router.replace({ query });
  if (!isNew || !can("maintenance-create")) return;
  let project = null;
  if (projectId && !clientId) {
    const projects = await lookups.ensure("projects").catch(() => []);
    project = projects.find((p) => String(p.id) === String(projectId));
  }
  presetClientId.value = clientId || project?.client_id || project?.client?.id || null;
  presetProjectId.value = projectId || null;
  openCreate();
});

// ===== Create =====
const showForm = ref(false);
const presetClientId = ref(null);
const presetProjectId = ref(null);
const saving = ref(false);
const formErrors = ref({});
const openCreate = () => {
  formErrors.value = {};
  // The form's pickers load when it opens (shared cache).
  lookups.ensureAll(["clients", "projects"]).catch(() => {});
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
// One muted line under the contract name: client · project.
const subline = (row) => [row.client?.name || "-", row.project?.name].filter(Boolean).join(" · ");

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
        <div class="flex items-center gap-1.5 min-w-0 overflow-x-auto [scrollbar-width:none]">
          <UiChips v-model="statusFilter" :options="statusChips" class="min-w-0" />
          <button
            v-if="attentionCount || list.attention"
            type="button"
            :aria-pressed="list.attention"
            class="ui-press shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-ui-small font-medium whitespace-nowrap"
            :class="list.attention ? 'bg-ui-warn text-white border-ui-warn' : 'bg-ui-warn-soft text-ui-warn border-ui-warn/30 hover:bg-ui-hover'"
            @click="list.attention = !list.attention"
          >
            <AlertTriangle class="w-3.5 h-3.5" /> {{ $t("maintenance.list.needsAttention") }}
            <span class="tabular-nums" :class="list.attention ? 'text-white/80' : ''">{{ attentionCount }}</span>
          </button>
        </div>
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="rows"
        :loading="loading && !contracts.length"
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
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
            <p class="mt-0.5 text-ui-cap text-ui-muted truncate" :title="subline(row)">{{ subline(row) }}</p>
          </div>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot>{{ CONTRACT_STATUS[row.status]?.label }}</UiBadge>
        </template>
        <template #cell-quota="{ row }">
          <div v-if="row.current_period" class="min-w-[200px] py-2">
            <!-- One line: hours left, or the overage in red when over quota -->
            <p v-if="row.current_period.overage > 0" class="text-ui-cap text-ui-bad font-medium tabular-nums flex items-center gap-1">
              <AlertTriangle class="w-3 h-3 shrink-0" />{{ $t("maintenance.common.overQuota", { hours: formatHours(row.current_period.overage) }) }}
            </p>
            <p v-else class="text-ui-cap text-ui-muted tabular-nums">
              <strong class="text-ui-ink font-medium">{{ formatHours(row.current_period.remaining) }}</strong>
              {{ $t("maintenance.common.leftOf", { total: formatHours(row.current_period.total) }) }}
            </p>
            <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden mt-1.5">
              <div class="h-full rounded-full" :class="barClass(row.current_period)" :style="{ width: `${Math.min(row.current_period.used_percent, 100)}%` }"></div>
            </div>
          </div>
          <p v-else class="text-ui-cap text-ui-muted">{{ $t("maintenance.common.noQuotaThisMonth", { status: CONTRACT_STATUS[row.status]?.label.toLowerCase() }) }}</p>
        </template>
        <template #cell-balance="{ row }">
          <p class="text-ui-ink font-medium tabular-nums whitespace-nowrap inline-flex items-center gap-1.5">
            <PiggyBank class="w-3.5 h-3.5 text-ui-faint" />{{ formatHours(row.balance_hours) }}
          </p>
          <!-- One note at most: hours about to expire beat the open-feature count -->
          <p v-if="row.expiring_soon?.hours > 0" class="text-ui-cap text-ui-warn font-medium whitespace-nowrap">
            {{ $t("maintenance.common.expiring", { hours: formatHours(row.expiring_soon.hours) }) }}
          </p>
          <p v-else-if="row.open_features" class="text-ui-cap text-ui-muted whitespace-nowrap">
            {{ $t("maintenance.common.features", { n: row.open_features }, row.open_features) }}
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
                <p class="text-ui-cap text-ui-muted truncate mt-0.5">{{ subline(row) }}</p>

                <div v-if="row.current_period" class="mt-2.5">
                  <div class="flex items-baseline justify-between gap-2 text-ui-cap tabular-nums">
                    <span v-if="row.current_period.overage > 0" class="text-ui-bad font-medium">
                      {{ $t("maintenance.common.overQuota", { hours: formatHours(row.current_period.overage) }) }}
                    </span>
                    <span v-else class="text-ui-muted">
                      <strong class="text-ui-ink font-medium">{{ formatHours(row.current_period.remaining) }}</strong>
                      {{ $t("maintenance.common.leftOf", { total: formatHours(row.current_period.total) }) }}
                    </span>
                    <span class="text-ui-muted shrink-0 inline-flex items-center gap-1"><PiggyBank class="w-3.5 h-3.5 text-ui-faint" />{{ formatHours(row.balance_hours) }}</span>
                  </div>
                  <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden mt-1.5">
                    <div class="h-full rounded-full" :class="barClass(row.current_period)" :style="{ width: `${Math.min(row.current_period.used_percent, 100)}%` }"></div>
                  </div>
                </div>
                <p v-else class="text-ui-cap text-ui-muted mt-2">
                  {{ $t("maintenance.common.noQuotaThisMonth", { status: CONTRACT_STATUS[row.status]?.label.toLowerCase() }) }}
                  · {{ $t("maintenance.common.balance", { hours: formatHours(row.balance_hours) }) }}
                </p>

                <p v-if="row.expiring_soon?.hours > 0" class="mt-1.5 text-ui-cap text-ui-warn font-medium inline-flex items-center gap-1">
                  <AlertTriangle class="w-3.5 h-3.5" /> {{ $t("maintenance.common.expiring", { hours: formatHours(row.expiring_soon.hours) }) }}
                </p>
                <p v-else-if="row.open_features" class="mt-1.5 text-ui-cap text-ui-muted">
                  {{ $t("maintenance.common.features", { n: row.open_features }, row.open_features) }}
                </p>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="list.isDirty" :icon="SearchX" :title="$t('maintenance.list.emptyFiltered')" compact>
            <UiButton variant="secondary" @click="(search = ''), list.reset()">{{ $t("maintenance.list.clearFilters") }}</UiButton>
          </UiEmpty>
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
      :projects="lookups.projects"
      :errors="formErrors"
      :preset-client-id="presetClientId"
      :preset-project-id="presetProjectId"
      @submit="handleSubmit"
      @close="showForm = false"
    />
  </div>
</template>
