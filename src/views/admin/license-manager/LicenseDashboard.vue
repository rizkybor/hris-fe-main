<script setup>
// Licenses of one product: KPI cards, plan distribution, filters and the
// license table (stacked cards below md).
// Permissions: license-manager-list (page, KPIs), -view (open a license),
// -create, -edit (edit action + status switch), -delete.
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import {
  Plus,
  Search,
  SearchX,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  Layers,
  CheckCircle2,
  Hourglass,
  CalendarX2,
  PowerOff,
  ArrowRight,
  LayoutGrid,
  Infinity as InfinityIcon,
  KeyRound,
  X,
  Clock,
  PieChart,
  History,
  SlidersHorizontal,
  Laptop,
  Tablet,
  Check,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import Pagination from "@/components/common/Pagination.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiBadge, UiChips, UiEmpty, UiInput, UiSelect, UiModal, firstRowNumber } from "@/components/ui";
import CopyKeyButton from "@/components/admin/license-manager/CopyKeyButton.vue";
import LicenseStatusSwitch from "@/components/admin/license-manager/LicenseStatusSwitch.vue";
import LicenseKpiCard from "@/components/admin/license-manager/LicenseKpiCard.vue";
import PlanDistributionBar from "@/components/admin/license-manager/PlanDistributionBar.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import LicenseProductGate from "@/components/admin/license-manager/LicenseProductGate.vue";
import { useLicenseProduct, onProductReady } from "@/components/admin/license-manager/useLicenseProduct";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import {
  STATUS_OPTIONS,
  PLAN_OPTIONS,
  EXPIRING_SOON_DAYS,
  planLabel,
  planChipClass,
  planCategory,
  PLATFORM_OPTIONS,
  licensePlatformLabel,
  platformChipClass,
  organizationTypeLabel,
  formatDate,
  formatDateTime,
  isLifetimeLicense,
  remainingBadgeClass,
  relativeTime,
  maskLicenseKey,
  remainingLabel,
} from "@/components/admin/license-manager/licenseHelpers";

const { t } = useI18n();
const router = useRouter();
const store = useLicenseManagerStore();
const { code: productCode, product, productName, state: productState } = useLicenseProduct();
const { licenses, meta, loading, summary } = storeToRefs(store);
const alertModal = useAlertModalStore();

const canView = computed(() => can("license-manager-view"));
const canCreate = computed(() => can("license-manager-create"));
const canEdit = computed(() => can("license-manager-edit"));
const canDelete = computed(() => can("license-manager-delete"));
const canSeeVersions = computed(() => can("license-release-menu"));

const serverOptions = ref({ page: 1, per_page: 10 });
const filters = ref({ search: "", status: "", type: "", plan: "", platform: "", sort: "" });
const success = ref("");
const error = ref("");
const togglingId = ref(null);
const summaryLoading = ref(true);
const loadedOnce = ref(false);

const SORTS = computed(() => [
  { value: "", label: t("licenses.dashboard.sort.newest") },
  { value: "expires_at:asc", label: t("licenses.dashboard.sort.expiringFirst") },
  { value: "expires_at:desc", label: t("licenses.dashboard.sort.expiringLast") },
]);

const fetchData = async () => {
  const [sortBy, sortDir] = (filters.value.sort || "").split(":");
  await store.fetchLicensesPaginated({
    ...serverOptions.value,
    ...filters.value,
    sort_by: sortBy || undefined,
    sort_dir: sortDir || undefined,
  });
  loadedOnce.value = true;
};

const loadSummary = async () => {
  await store.fetchSummary();
  summaryLoading.value = false;
};

// Loads once the product from the URL is known (and again for another product).
onProductReady(
  productState,
  () => {
    serverOptions.value.page = 1;
    summaryLoading.value = true;
    fetchData();
    loadSummary();
  },
  () => productCode.value
);

const soonDays = computed(() => summary.value?.expiring_soon_days ?? EXPIRING_SOON_DAYS);
const totalLicenses = computed(() => summary.value?.total ?? meta.value?.total ?? 0);

// KPI cards; clicking one filters the table by that status.
const kpis = computed(() => [
  { key: "", label: t("common.labels.total"), value: summary.value?.total, caption: t("licenses.dashboard.allLicenses"), icon: Layers, tone: "violet" },
  { key: "active", label: t("licenses.status.active"), value: summary.value?.active, caption: t("licenses.kpi.activeCaption"), icon: CheckCircle2, tone: "emerald" },
  {
    key: "expiring_soon",
    label: t("licenses.status.expiringSoon"),
    value: summary.value?.expiring_soon,
    caption: t("licenses.kpi.expiringCaption", { n: soonDays.value }, soonDays.value),
    icon: Hourglass,
    tone: "amber",
  },
  { key: "expired", label: t("licenses.status.expired"), value: summary.value?.expired, caption: t("licenses.kpi.expiredCaption"), icon: CalendarX2, tone: "red" },
  { key: "inactive", label: t("licenses.status.inactive"), value: summary.value?.inactive, caption: t("licenses.kpi.inactiveCaption"), icon: PowerOff, tone: "gray" },
]);

const filterByStatus = (status) => {
  filters.value.status = filters.value.status === status ? "" : status;
};
const filterByPlan = (plan) => {
  filters.value.plan = filters.value.plan === plan ? "" : plan;
};

watch(
  filters,
  debounce(() => {
    serverOptions.value.page = 1;
    fetchData();
  }, 300),
  { deep: true }
);

const handlePageChange = (page) => {
  serverOptions.value.page = page;
  fetchData();
};

const handlePerPageChange = (perPage) => {
  serverOptions.value.per_page = perPage;
  serverOptions.value.page = 1;
  fetchData();
};

// Pagination shows "from - to"; fill them in if the API omits them.
const paginationMeta = computed(() => {
  const m = meta.value || {};
  const perPage = m.per_page || serverOptions.value.per_page;
  const page = m.current_page || 1;
  const from = m.from ?? (m.total ? (page - 1) * perPage + 1 : 0);
  const to = m.to ?? Math.min(page * perPage, m.total || 0);
  return { ...m, from, to };
});

const hasFilters = computed(
  () => !!(filters.value.search || filters.value.status || filters.value.type || filters.value.plan || filters.value.platform)
);

const clearFilters = () => {
  filters.value = { ...filters.value, search: "", status: "", type: "", plan: "", platform: "" };
};

const flash = (message) => {
  success.value = message;
  setTimeout(() => {
    if (success.value === message) success.value = "";
  }, 3000);
};

/* ---------- Row helpers ---------- */

const detailRoute = (license) => ({
  name: "admin.license-manager.licenses.detail",
  params: { product: productCode.value, id: license.id },
});
const editRoute = (license) => ({
  name: "admin.license-manager.licenses.edit",
  params: { product: productCode.value, id: license.id },
});
// Rows open the detail page only with license-manager-view.
const openLicense = (license) => {
  if (canView.value) router.push(detailRoute(license));
};

// "OC02-••••-••••-••••-0001": first and last group visible.
const maskKey = maskLicenseKey;

const initials = (name) => {
  const words = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "?") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
};
// One quiet avatar tone (the redesign keeps avatars neutral).
const avatarTone = () => "bg-ui-accent-soft text-ui-accent";

const isOrganization = (license) => planCategory(license) === "organization";

const remainingText = (license) => {
  if (isLifetimeLicense(license)) return "∞";
  const days = license.remaining_days;
  if (license.status === "expired" || days === null || days === undefined || days <= 0) return t("licenses.status.expired");
  return t("licenses.period.days", { n: days }, days);
};

const elapsed = (license) => Math.min(100, Math.max(0, Number(license.elapsed_percent ?? 0)));
const periodBarClass = (license) => {
  if (license.status === "expired") return "bg-ui-bad";
  if (license.status === "expiring_soon") return "bg-ui-warn";
  if (license.status === "inactive") return "bg-ui-faint";
  return "bg-ui-ink";
};


// A Mac + iPad bundle is one row: one "lane" per platform (Mac first),
// each with its key, keys and devices. A single license has one lane.
const lanes = (license) =>
  [
    {
      id: license.id,
      platform: license.platform,
      platform_label: licensePlatformLabel(license),
      plan: license.plan,
      key: license.key,
      keys_summary: license.keys_summary,
      devices_used: license.devices_used ?? 0,
      max_devices: license.max_devices,
    },
    ...(license.bundle || []).map((b) => ({
      id: b.id,
      platform: b.platform,
      platform_label: b.platform_label,
      plan: b.plan,
      key: b.key,
      keys_summary: b.keys_summary,
      devices_used: b.devices_used ?? 0,
      max_devices: b.max_devices ?? license.max_devices,
    })),
  ].sort((a, b) => (a.platform === "mac" ? -1 : b.platform === "mac" ? 1 : 0));
// One plan for every lane (the usual case), else null (shown per lane).
const commonPlan = (license) => {
  const plans = [...new Set(lanes(license).map((l) => l.plan))];
  return plans.length === 1 ? plans[0] : null;
};
const platformsText = (license) => lanes(license).map((l) => l.platform_label).join(" + ");
const laneUsed = (lane) => (lane.keys_summary ? lane.keys_summary.in_use + lane.keys_summary.used : null);
const lanePercent = (lane) => (lane.max_devices ? Math.min(100, Math.round((lane.devices_used / lane.max_devices) * 100)) : 0);
const laneFull = (lane) => lane.devices_used >= lane.max_devices;

const lastActivity = (license) => license.last_activity_at || license.last_activated_at;

/* ---------- Actions ---------- */

const toggleActive = async (license, value) => {
  togglingId.value = license.id;
  error.value = "";
  try {
    // Partial update: only is_active is sent. A bundle row switches every
    // license of the bundle (the row's own last, so its data is fresh).
    for (const sibling of license.bundle || []) await store.setActive(sibling.id, value);
    await store.setActive(license.id, value);
    flash(value ? t("licenses.dashboard.activated") : t("licenses.dashboard.deactivated"));
    store.fetchSummary();
  } catch (err) {
    error.value = errorMessage(err, t("licenses.dashboard.statusFailed"));
  } finally {
    togglingId.value = null;
  }
};

const handleDelete = async (license) => {
  const keys = lanes(license).map((l) => `${l.key} (${l.platform_label})`);
  const ok = await alertModal.confirm(
    keys.length > 1
      ? t("licenses.dashboard.deleteBundleConfirm", { keys: keys.join(t("licenses.dashboard.and")), name: license.licensee_name })
      : t("licenses.dashboard.deleteConfirm", { key: license.key, name: license.licensee_name }),
    {
      title: keys.length > 1 ? t("licenses.dashboard.deleteBundleTitle") : t("licenses.dashboard.deleteTitle"),
      type: "danger",
      confirmText: t("common.actions.delete"),
    }
  );
  if (!ok) return;

  try {
    for (const sibling of license.bundle || []) await store.deleteLicense(sibling.id);
    await store.deleteLicense(license.id);
    flash(t("licenses.dashboard.deleted"));
    store.fetchSummary();
    if (licenses.value.length === 0 && serverOptions.value.page > 1) {
      serverOptions.value.page -= 1;
    }
    await fetchData();
  } catch (err) {
    await alertModal.alert(errorMessage(err, t("licenses.dashboard.deleteFailed")), { type: "danger" });
  }
};

/* ---------- Presentation ---------- */

// Status of the period (active / expiring / expired / inactive) as a badge.
const STATUS_TONE = { active: "ok", expiring_soon: "warn", expired: "bad", inactive: "neutral" };
const STATUS_SHORT = {
  active: "licenses.status.active",
  expiring_soon: "licenses.overview.expiring",
  expired: "licenses.status.expired",
  inactive: "licenses.status.inactive",
};
const statusKey = (license) => (STATUS_TONE[license.status] ? license.status : license.is_active ? "active" : "inactive");
const statusTone = (license) => STATUS_TONE[statusKey(license)];
const statusText = (license) => t(STATUS_SHORT[statusKey(license)]);
const statusCaption = (license) => {
  if (!license.is_active) return t("licenses.kpi.inactiveCaption");
  if (isLifetimeLicense(license)) return t("licenses.plans.lifetime.label");
  return remainingLabel(license.remaining_days);
};

// Phones: "OC31-•••••0002" (first and last group).
const shortKey = (key) => {
  const parts = String(key || "").split("-");
  return parts.length > 2 ? `${parts[0]}-•••••${parts[parts.length - 1]}` : maskKey(key);
};
const platformIcon = (platform) => (platform === "ipad" ? Tablet : Laptop);
const PLATFORM_FILTERS = computed(() => [{ value: "", label: t("licenses.dashboard.allPlatforms") }, ...PLATFORM_OPTIONS]);
const planChipOptions = computed(() => [
  { value: "", label: t("common.labels.all"), count: summary.value?.total ?? undefined },
  ...PLAN_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label, count: summary.value?.by_plan?.[opt.value] ?? undefined })),
]);
const setPlan = (value) => (value ? filterByPlan(value) : (filters.value.plan = ""));
const statusSelectOptions = computed(() => [
  { value: "", label: t("common.labels.allStatuses") },
  ...STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
]);
const startNumber = computed(() => firstRowNumber(paginationMeta.value));

// Phones: the filters live in a bottom sheet.
const showFilters = ref(false);
const activeFilterCount = computed(() => [filters.value.status, filters.value.plan, filters.value.platform].filter(Boolean).length);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <div class="space-y-5">
        <Alert v-if="success" type="success" :title="success" message="" :show="!!success" @close="success = ''" />
        <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />

        <!-- Header -->
        <UiPageHeader :title="$t('licenses.dashboard.title', { product: productName })">
          <template #eyebrow>
            <div class="flex items-center gap-2 mb-2">
              <ProductIcon :product="product" :size="24" />
              <RouterLink :to="{ name: 'admin.license-manager.overview' }" class="text-ui-small text-ui-muted hover:text-ui-ink">{{ $t("licenses.title") }}</RouterLink>
              <span class="text-ui-faint">/</span>
              <span class="text-ui-small text-ui-ink font-medium truncate">{{ productName }}</span>
            </div>
          </template>
          <template #subtitle>
            <span class="inline-flex items-center gap-1.5 flex-wrap">
              <span
                v-if="product?.key_prefix"
                class="inline-flex items-center gap-1 font-mono text-ui-cap font-medium text-ui-ink bg-ui-surface border border-ui-line rounded-md px-1.5 py-px"
              >
                <KeyRound class="w-3 h-3 text-ui-faint" />{{ product.key_prefix }}
              </span>
              <span v-if="product?.key_prefix" class="text-ui-faint">·</span>
              <span class="tabular-nums">{{ $t("licenses.dashboard.licenseCount", { n: totalLicenses }, totalLicenses) }}</span>
            </span>
          </template>
          <template #actions>
            <UiButton variant="secondary" :icon="LayoutGrid" :to="{ name: 'admin.license-manager.overview' }" class="flex-1 sm:flex-none">{{ $t("licenses.dashboard.overview") }}</UiButton>
            <UiButton
              v-if="canSeeVersions"
              variant="secondary"
              :icon="History"
              :to="{ name: 'admin.license-manager.versions', params: { product: productCode } }"
              class="flex-1 sm:flex-none"
            >
              {{ $t("licenses.dashboard.versions") }}
            </UiButton>
            <UiButton
              v-if="canCreate"
              :icon="Plus"
              :to="{ name: 'admin.license-manager.licenses.create', params: { product: productCode } }"
              class="w-full sm:w-auto"
            >
              {{ $t("licenses.create.submit") }}
            </UiButton>
          </template>
        </UiPageHeader>

        <!-- KPI row: a tile filters the table by that status -->
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 ui-stagger">
          <LicenseKpiCard
            v-for="kpi in kpis"
            :key="kpi.key || 'total'"
            :label="kpi.label"
            :value="kpi.value"
            :caption="kpi.caption"
            :icon="kpi.icon"
            :tone="kpi.tone"
            :loading="summaryLoading"
            clickable
            :active="filters.status === kpi.key"
            :class="kpi.key === '' ? 'col-span-2 sm:col-span-1' : ''"
            @select="filterByStatus(kpi.key)"
          />
        </div>

        <!-- Plan distribution (legend filters by plan) -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2">
              <PieChart class="w-4 h-4 text-ui-faint" />
              <h2 class="text-ui-h3 text-ui-ink">{{ $t("licenses.dashboard.planDistribution") }}</h2>
            </div>
            <span v-if="summary?.by_plan" class="text-ui-cap text-ui-muted tabular-nums">{{ $t("licenses.dashboard.totalCount", { n: summary.total ?? 0 }) }}</span>
          </div>
          <Skeleton v-if="summaryLoading" height="8px" rounded="999px" />
          <PlanDistributionBar
            v-else-if="summary?.by_plan"
            :counts="summary.by_plan"
            :active-plan="filters.plan"
            selectable
            @select="filterByPlan"
          />
          <p v-else class="text-ui-cap text-ui-muted">{{ $t("licenses.dashboard.noPlanData") }}</p>
        </section>

        <!-- Toolbar + table -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
          <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line space-y-3">
            <div class="flex flex-col lg:flex-row lg:items-center gap-2">
              <div class="flex items-center gap-2 lg:w-[280px] shrink-0">
                <div class="relative flex-1 min-w-0">
                  <UiInput v-model="filters.search" :icon="Search" :placeholder="$t('licenses.dashboard.searchPlaceholder')" :aria-label="$t('licenses.dashboard.searchLabel')" />
                  <button
                    v-if="filters.search"
                    type="button"
                    @click="filters.search = ''"
                    class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-hover hover:text-ui-ink"
                    :aria-label="$t('licenses.dashboard.clearSearch')"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
                <!-- Phones: filters in a bottom sheet -->
                <button
                  type="button"
                  @click="showFilters = true"
                  class="md:hidden relative shrink-0 w-[38px] h-[38px] inline-flex items-center justify-center rounded-ui-control border border-ui-line-strong bg-ui-surface text-ui-ink"
                  :aria-label="$t('licenses.dashboard.filters')"
                >
                  <SlidersHorizontal class="w-4 h-4" />
                  <span
                    v-if="activeFilterCount"
                    class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ui-ink text-white text-ui-cap leading-[18px] text-center tabular-nums"
                  >{{ activeFilterCount }}</span>
                </button>
              </div>

              <div class="hidden md:flex items-center gap-2 flex-1 min-w-0">
                <div class="inline-flex items-center p-0.5 rounded-ui-control bg-ui-subtle shrink-0" role="tablist" :aria-label="$t('licenses.dashboard.filterPlatform')">
                  <button
                    v-for="opt in PLATFORM_FILTERS"
                    :key="opt.value || 'all'"
                    type="button"
                    role="tab"
                    @click="filters.platform = opt.value"
                    class="h-[34px] px-3 rounded-[6px] text-ui-small font-medium whitespace-nowrap transition-colors"
                    :class="filters.platform === opt.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
                    :aria-selected="filters.platform === opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <div class="flex-1"></div>
                <UiSelect v-model="filters.status" :options="statusSelectOptions" class="w-40" :aria-label="$t('licenses.dashboard.filterStatus')" />
                <UiSelect v-model="filters.sort" :options="SORTS" class="w-40" :aria-label="$t('licenses.dashboard.sortLabel')" />
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Plan chips (scroll sideways on phones) -->
              <UiChips :model-value="filters.plan" :options="planChipOptions" size="sm" class="flex-1 min-w-0" :aria-label="$t('licenses.dashboard.filterPlan')" @update:model-value="setPlan" />
              <div class="hidden sm:flex items-center gap-3 text-ui-cap text-ui-muted shrink-0">
                <button v-if="hasFilters" type="button" @click="clearFilters" class="font-medium text-ui-accent hover:underline">{{ $t("common.actions.clearFilters") }}</button>
                <i18n-t keypath="licenses.dashboard.results" :plural="meta.total ?? 0" tag="span" scope="global" class="tabular-nums">
                  <template #n><span class="font-medium text-ui-ink">{{ meta.total ?? 0 }}</span></template>
                </i18n-t>
              </div>
            </div>
            <div class="sm:hidden flex items-center justify-between gap-3 text-ui-cap text-ui-muted">
              <i18n-t keypath="licenses.dashboard.results" :plural="meta.total ?? 0" tag="span" scope="global" class="tabular-nums">
                <template #n><span class="font-medium text-ui-ink">{{ meta.total ?? 0 }}</span></template>
              </i18n-t>
              <button v-if="hasFilters" type="button" @click="clearFilters" class="font-medium text-ui-accent hover:underline">{{ $t("common.actions.clearFilters") }}</button>
            </div>
          </div>

          <!-- Loading (first load) -->
          <div v-if="!loadedOnce || (loading && !licenses.length)" class="divide-y divide-ui-line">
            <div v-for="i in 6" :key="i" class="flex items-center gap-4 px-5 py-4">
              <Skeleton width="16px" height="10px" class="hidden md:block" />
              <Skeleton width="32px" height="32px" rounded="999px" />
              <div class="flex-1 space-y-2">
                <Skeleton width="30%" height="12px" />
                <Skeleton width="20%" height="10px" />
              </div>
              <Skeleton width="80px" height="20px" rounded="6px" class="hidden md:block" />
              <Skeleton width="160px" height="12px" class="hidden md:block" />
              <Skeleton width="60px" height="20px" rounded="6px" />
            </div>
          </div>

          <!-- Empty -->
          <UiEmpty
            v-else-if="!licenses.length"
            :icon="hasFilters ? SearchX : KeyRound"
            :title="hasFilters ? $t('licenses.dashboard.emptyFilteredTitle') : $t('licenses.dashboard.emptyTitle')"
            :message="hasFilters ? $t('licenses.dashboard.emptyFilteredMessage') : $t('licenses.dashboard.emptyMessage', { product: productName })"
          >
            <UiButton v-if="hasFilters" variant="secondary" :icon="X" @click="clearFilters">{{ $t("common.actions.clearFilters") }}</UiButton>
            <UiButton
              v-else-if="canCreate"
              :icon="Plus"
              :to="{ name: 'admin.license-manager.licenses.create', params: { product: productCode } }"
            >
              {{ $t("licenses.create.submit") }}
            </UiButton>
          </UiEmpty>

          <template v-else>
            <!-- Table (md and up). Fixed layout: the licensee column takes
                 the rest (truncated); scrolls sideways below xl. -->
            <div class="hidden md:block overflow-x-auto transition-opacity" :class="{ 'opacity-60 pointer-events-none': loading }">
              <table class="w-full min-w-[960px] table-fixed border-collapse">
                <thead>
                  <tr class="text-left">
                    <th class="w-11 pl-5 pr-0 h-10 text-ui-cap font-medium text-ui-muted border-b border-ui-line">#</th>
                    <th class="px-3 h-10 text-ui-cap font-medium text-ui-muted border-b border-ui-line">{{ $t("licenses.form.licensee") }}</th>
                    <th class="w-[108px] px-3 h-10 text-ui-cap font-medium text-ui-muted border-b border-ui-line">{{ $t("licenses.form.plan") }}</th>
                    <th class="w-[300px] px-3 h-10 text-ui-cap font-medium text-ui-muted border-b border-ui-line whitespace-nowrap">{{ $t("licenses.dashboard.keyDevices") }}</th>
                    <th class="w-[196px] px-3 h-10 text-ui-cap font-medium text-ui-muted border-b border-ui-line whitespace-nowrap">{{ $t("licenses.form.activePeriod") }}</th>
                    <th class="w-[108px] px-3 h-10 text-ui-cap font-medium text-ui-muted border-b border-ui-line">{{ $t("common.labels.status") }}</th>
                    <th class="hidden 2xl:table-cell w-[112px] px-3 h-10 text-ui-cap font-medium text-ui-muted border-b border-ui-line whitespace-nowrap">{{ $t("licenses.dashboard.lastActivity") }}</th>
                    <th class="w-[150px] pl-2 pr-4 h-10 border-b border-ui-line"><span class="sr-only">{{ $t("common.labels.actions") }}</span></th>
                  </tr>
                </thead>
                <tbody class="ui-stagger">
                  <tr
                    v-for="(license, index) in licenses"
                    :key="license.id"
                    class="group align-middle transition-colors hover:bg-ui-hover"
                    :class="{ 'cursor-pointer': canView }"
                    @click="openLicense(license)"
                  >
                    <td class="pl-5 pr-0 py-3.5 text-ui-cap text-ui-faint tabular-nums border-b border-ui-line group-last:border-b-0">{{ startNumber + index }}</td>

                    <!-- Licensee -->
                    <td class="px-3 py-3.5 border-b border-ui-line group-last:border-b-0">
                      <div class="flex items-center gap-3 min-w-0">
                        <span class="w-8 h-8 rounded-full flex items-center justify-center text-ui-cap font-semibold shrink-0" :class="avatarTone(license.licensee_name)">
                          {{ initials(license.licensee_name) }}
                        </span>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5 min-w-0">
                            <p class="text-ui-small font-semibold text-ui-ink truncate min-w-0">{{ license.licensee_name }}</p>
                          </div>
                          <p class="text-ui-cap text-ui-muted truncate">{{ license.licensee_email || "-" }}</p>
                          <!-- Last activity folds under the name below 2xl -->
                          <p class="2xl:hidden text-ui-cap text-ui-faint truncate">
                            <template v-if="lastActivity(license)">
                              <i18n-t keypath="licenses.dashboard.activeAgo" tag="span" scope="global">
                                <template #time><span :title="formatDateTime(lastActivity(license))">{{ relativeTime(lastActivity(license)) }}</span></template>
                              </i18n-t>
                            </template>
                            <template v-else>{{ $t("licenses.dashboard.noActivity") }}</template>
                          </p>
                        </div>
                      </div>
                    </td>

                    <!-- Plan: the plan, the platform(s) under it -->
                    <td class="px-3 py-3.5 border-b border-ui-line group-last:border-b-0">
                      <div v-if="commonPlan(license)" class="flex flex-col items-start gap-1">
                        <span class="inline-flex items-center h-[22px] px-2 rounded-md text-ui-cap font-medium whitespace-nowrap" :class="planChipClass(commonPlan(license))">
                          {{ planLabel({ plan: commonPlan(license) }) }}
                        </span>
                        <span class="text-ui-cap text-ui-muted whitespace-nowrap">{{ platformsText(license) }}</span>
                        <span v-if="isOrganization(license)" class="text-ui-cap text-ui-faint whitespace-nowrap truncate max-w-full">{{ $t("licenses.dashboard.org", { type: organizationTypeLabel(license.organization_type) }) }}</span>
                      </div>
                      <!-- A bundle whose licenses have different plans -->
                      <div v-else class="flex flex-col items-start gap-1">
                        <span
                          v-for="lane in lanes(license)"
                          :key="lane.id"
                          class="inline-flex items-center h-[22px] px-2 rounded-md text-ui-cap font-medium whitespace-nowrap"
                          :class="planChipClass(lane.plan)"
                        >
                          {{ lane.platform_label }} &middot; {{ planLabel({ plan: lane.plan }) }}
                        </span>
                        <span v-if="isOrganization(license)" class="text-ui-cap text-ui-faint whitespace-nowrap truncate max-w-full">{{ $t("licenses.dashboard.org", { type: organizationTypeLabel(license.organization_type) }) }}</span>
                      </div>
                    </td>

                    <!-- Key: one lane per platform, key on top, devices under it -->
                    <td class="px-3 py-3.5 border-b border-ui-line group-last:border-b-0">
                      <div class="space-y-2.5">
                        <div v-for="lane in lanes(license)" :key="lane.id" class="min-w-0">
                          <div class="flex items-center gap-2">
                            <span
                              class="w-[52px] shrink-0 inline-flex items-center justify-center gap-1 h-5 rounded-md border border-ui-line bg-ui-surface text-ui-cap text-ui-text"
                            >
                              <component :is="platformIcon(lane.platform)" class="w-3 h-3 text-ui-faint" />{{ lane.platform === "ipad" ? "iPad" : "Mac" }}
                            </span>
                            <span class="font-mono text-ui-cap font-medium whitespace-nowrap text-ui-ink">{{ maskKey(lane.key) }}</span>
                            <CopyKeyButton :value="lane.key" class="opacity-60 group-hover:opacity-100" />
                          </div>
                          <div class="flex items-center gap-1.5 mt-1 pl-[60px]">
                            <div class="w-8 h-1 rounded-full bg-ui-subtle overflow-hidden shrink-0">
                              <div class="ui-bar-fill h-full rounded-full" :class="laneFull(lane) ? 'bg-ui-warn' : 'bg-ui-ink'" :style="{ width: `${lanePercent(lane)}%` }"></div>
                            </div>
                            <span class="text-ui-cap text-ui-muted whitespace-nowrap tabular-nums">
                              <span class="font-medium" :class="laneFull(lane) ? 'text-ui-warn' : 'text-ui-ink'">{{ lane.devices_used }}/{{ lane.max_devices }}</span> {{ $t("licenses.dashboard.devices") }}<template v-if="lane.keys_summary"> &middot; {{ $t("licenses.dashboard.keysUsed", { total: lane.keys_summary.total, used: laneUsed(lane) }) }}</template>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Period -->
                    <td class="px-3 py-3.5 border-b border-ui-line group-last:border-b-0">
                      <div v-if="isLifetimeLicense(license)" class="whitespace-nowrap">
                        <p class="text-ui-small text-ui-text">{{ $t("licenses.period.since", { date: formatDate(license.starts_at || license.created_at) }) }}</p>
                        <p class="inline-flex items-center gap-1 text-ui-cap text-ui-muted mt-0.5"><InfinityIcon class="w-3.5 h-3.5" /> {{ $t("licenses.plans.lifetime.label") }}</p>
                      </div>
                      <div v-else class="w-full">
                        <p class="flex items-center gap-1 text-ui-small text-ui-text whitespace-nowrap tabular-nums">
                          {{ formatDate(license.starts_at || license.created_at) }}
                          <ArrowRight class="w-3 h-3 text-ui-faint shrink-0" />
                          <span :class="license.status === 'expired' ? 'text-ui-bad font-medium' : ''">{{ formatDate(license.expires_at) }}</span>
                        </p>
                        <div class="mt-1.5 h-1 w-full rounded-full bg-ui-subtle overflow-hidden" :title="$t('licenses.dashboard.periodUsed', { n: elapsed(license) })">
                          <div class="ui-bar-fill h-full rounded-full transition-all" :class="periodBarClass(license)" :style="{ width: `${elapsed(license)}%` }"></div>
                        </div>
                      </div>
                    </td>

                    <!-- Status + remaining -->
                    <td class="px-3 py-3.5 border-b border-ui-line group-last:border-b-0">
                      <UiBadge :tone="statusTone(license)" dot>{{ statusText(license) }}</UiBadge>
                      <p
                        class="text-ui-cap text-ui-muted mt-1 whitespace-nowrap tabular-nums"
                        :title="isLifetimeLicense(license) ? $t('licenses.timeline.noEndDate') : $t('licenses.dashboard.periodUsed', { n: elapsed(license) })"
                      >
                        {{ statusCaption(license) }}
                      </p>
                    </td>

                    <!-- Last activity -->
                    <td class="hidden 2xl:table-cell px-3 py-3.5 whitespace-nowrap text-ui-cap text-ui-muted border-b border-ui-line group-last:border-b-0">
                      <span v-if="lastActivity(license)" :title="formatDateTime(lastActivity(license))">{{ relativeTime(lastActivity(license)) }}</span>
                      <span v-else class="text-ui-faint">{{ $t("licenses.dashboard.never") }}</span>
                    </td>

                    <!-- On/off switch (license-manager-edit) + actions (revealed on hover from lg) -->
                    <td class="pl-2 pr-4 py-3.5 border-b border-ui-line group-last:border-b-0">
                      <div class="flex items-center justify-end gap-1">
                        <LicenseStatusSwitch
                          v-if="canEdit"
                          :model-value="!!license.is_active"
                          :disabled="togglingId === license.id"
                          :label="null"
                          class="mr-1"
                          @update:model-value="(value) => toggleActive(license, value)"
                        />
                        <div class="flex items-center gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <RouterLink
                            v-if="canView"
                            :to="detailRoute(license)"
                            @click.stop
                            class="w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-subtle hover:text-ui-ink"
                            :title="$t('licenses.dashboard.viewLicense')"
                            :aria-label="$t('licenses.dashboard.viewLicense')"
                          >
                            <Eye class="w-4 h-4" />
                          </RouterLink>
                          <RouterLink
                            v-if="canEdit"
                            :to="editRoute(license)"
                            @click.stop
                            class="w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-subtle hover:text-ui-ink"
                            :title="$t('licenses.dashboard.editLicense')"
                            :aria-label="$t('licenses.dashboard.editLicense')"
                          >
                            <Pencil class="w-4 h-4" />
                          </RouterLink>
                          <button
                            v-if="canDelete"
                            type="button"
                            @click.stop="handleDelete(license)"
                            class="w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                            :title="$t('licenses.dashboard.deleteLicense')"
                            :aria-label="$t('licenses.dashboard.deleteLicense')"
                          >
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Stacked cards (below md) -->
            <ul class="md:hidden divide-y divide-ui-line ui-stagger" :class="{ 'opacity-60': loading }">
              <li
                v-for="(license, index) in licenses"
                :key="license.id"
                class="px-3.5 py-3.5"
                :class="{ 'cursor-pointer active:bg-ui-hover': canView }"
                @click="openLicense(license)"
              >
                <div class="flex items-start gap-2.5">
                  <span class="w-8 h-8 rounded-full flex items-center justify-center text-ui-cap font-semibold shrink-0" :class="avatarTone(license.licensee_name)">
                    {{ initials(license.licensee_name) }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-ui-body font-semibold text-ui-ink truncate">
                          <span class="text-ui-cap font-normal text-ui-faint tabular-nums mr-1">{{ startNumber + index }}.</span>{{ license.licensee_name }}
                        </p>
                        <p class="text-ui-cap text-ui-muted truncate">
                          <template v-if="commonPlan(license)">{{ planLabel({ plan: commonPlan(license) }) }}</template>
                          <template v-else>{{ lanes(license).map((l) => `${l.platform_label} ${planLabel({ plan: l.plan })}`).join(" + ") }}</template>
                          · {{ statusCaption(license) }}
                        </p>
                      </div>
                      <UiBadge :tone="statusTone(license)" dot class="shrink-0">{{ statusText(license) }}</UiBadge>
                    </div>

                    <div v-if="isOrganization(license)" class="mt-2">
                      <UiBadge tone="outline">{{ $t("licenses.dashboard.org", { type: organizationTypeLabel(license.organization_type) }) }}</UiBadge>
                    </div>

                    <div class="mt-2.5 pt-2.5 border-t border-ui-line space-y-1.5">
                      <div v-for="lane in lanes(license)" :key="lane.id" class="min-w-0">
                        <div class="flex items-center gap-1.5 min-w-0">
                          <span class="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded-md border border-ui-line bg-ui-surface text-ui-cap text-ui-text">
                            <component :is="platformIcon(lane.platform)" class="w-3 h-3 text-ui-faint" />{{ lane.platform === "ipad" ? "iPad" : "Mac" }}
                          </span>
                          <span class="font-mono text-ui-cap font-medium text-ui-ink whitespace-nowrap shrink-0" :title="maskKey(lane.key)">{{ shortKey(lane.key) }}</span>
                          <CopyKeyButton :value="lane.key" />
                          <span class="ml-auto min-w-0 truncate text-ui-cap text-ui-muted whitespace-nowrap tabular-nums">
                            <span :class="laneFull(lane) ? 'text-ui-warn font-medium' : 'text-ui-ink font-medium'">{{ lane.devices_used }}/{{ lane.max_devices }}</span> {{ $t("licenses.dashboard.devices") }}
                          </span>
                        </div>
                        <p v-if="lane.keys_summary" class="text-ui-cap text-ui-faint pl-[54px] tabular-nums">
                          {{ $t("licenses.dashboard.keysUsed", { total: lane.keys_summary.total, used: laneUsed(lane) }) }}
                        </p>
                      </div>
                    </div>

                    <div v-if="!isLifetimeLicense(license)" class="mt-2.5">
                      <div class="flex items-center justify-between text-ui-cap text-ui-muted tabular-nums">
                        <span>{{ formatDate(license.starts_at || license.created_at) }}</span>
                        <span :class="license.status === 'expired' ? 'text-ui-bad font-medium' : ''">{{ formatDate(license.expires_at) }}</span>
                      </div>
                      <div class="mt-1 h-1 w-full rounded-full bg-ui-subtle overflow-hidden">
                        <div class="ui-bar-fill h-full rounded-full" :class="periodBarClass(license)" :style="{ width: `${elapsed(license)}%` }"></div>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-ui-cap text-ui-muted">
                      <span class="inline-flex items-center gap-1">
                        <Clock class="w-3.5 h-3.5" /> {{ lastActivity(license) ? relativeTime(lastActivity(license)) : $t("licenses.dashboard.never") }}
                      </span>
                      <span v-if="isLifetimeLicense(license)" class="inline-flex items-center gap-1 text-ui-ink font-medium">
                        <InfinityIcon class="w-3.5 h-3.5" /> {{ $t("licenses.plans.lifetime.label") }}
                      </span>
                      <div class="ml-auto flex items-center gap-3">
                        <LicenseStatusSwitch
                          v-if="canEdit"
                          :model-value="!!license.is_active"
                          :disabled="togglingId === license.id"
                          @update:model-value="(value) => toggleActive(license, value)"
                        />
                        <RouterLink v-if="canEdit" :to="editRoute(license)" @click.stop class="inline-flex items-center gap-1 font-medium text-ui-accent">
                          <Pencil class="w-3.5 h-3.5" /> {{ $t("common.actions.edit") }}
                        </RouterLink>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </template>

          <div v-if="loadedOnce && (meta.total ?? 0) > 0" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
            <Pagination
              :meta="paginationMeta"
              :loading="loading"
              :item-label="$t('licenses.dashboard.itemLabel')"
              :show-per-page="true"
              @page-change="handlePageChange"
              @per-page-change="handlePerPageChange"
            />
          </div>
        </section>
      </div>

      <!-- Phones: filter sheet -->
      <UiModal v-model:open="showFilters" :title="$t('common.actions.filter')">
        <template #header>
          <div class="flex-1 flex items-center gap-3 min-w-0">
            <button type="button" class="text-ui-small font-medium text-ui-accent" @click="clearFilters">{{ $t("common.actions.reset") }}</button>
            <h2 class="flex-1 text-center text-ui-h2 text-ui-ink">{{ $t("common.actions.filter") }}</h2>
          </div>
        </template>
        <div class="space-y-5">
          <div>
            <p class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("licenses.form.platform") }}</p>
            <div class="grid grid-cols-3 p-0.5 rounded-ui-control bg-ui-subtle" role="tablist" :aria-label="$t('licenses.dashboard.filterPlatform')">
              <button
                v-for="opt in PLATFORM_FILTERS"
                :key="opt.value || 'all'"
                type="button"
                role="tab"
                @click="filters.platform = opt.value"
                class="h-9 rounded-[6px] text-ui-small font-medium transition-colors"
                :class="filters.platform === opt.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted'"
                :aria-selected="filters.platform === opt.value"
              >
                {{ opt.value ? opt.label : $t("common.labels.all") }}
              </button>
            </div>
          </div>
          <div>
            <p class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("licenses.form.plan") }}</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="opt in planChipOptions"
                :key="opt.value || 'all'"
                type="button"
                @click="setPlan(opt.value)"
                class="h-8 px-3 rounded-full border text-ui-small font-medium"
                :class="filters.plan === opt.value ? 'bg-ui-ink text-white border-ui-ink' : 'bg-ui-surface text-ui-text border-ui-line'"
                :aria-pressed="filters.plan === opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div>
            <p class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("common.labels.status") }}</p>
            <div class="border border-ui-line rounded-ui-card divide-y divide-ui-line overflow-hidden" role="radiogroup" :aria-label="$t('licenses.dashboard.filterStatus')">
              <button
                v-for="opt in statusSelectOptions"
                :key="opt.value || 'all'"
                type="button"
                role="radio"
                :aria-checked="filters.status === opt.value"
                @click="filters.status = opt.value"
                class="w-full flex items-center justify-between h-11 px-4 text-left text-ui-body text-ui-ink hover:bg-ui-hover"
              >
                {{ opt.label }}
                <Check v-if="filters.status === opt.value" class="w-4 h-4 text-ui-accent" />
              </button>
            </div>
          </div>
          <div>
            <p class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("licenses.dashboard.sortLabel") }}</p>
            <UiSelect v-model="filters.sort" :options="SORTS" :aria-label="$t('licenses.dashboard.sortLabel')" />
          </div>
        </div>
        <template #footer>
          <UiButton block size="lg" :loading="loading" @click="showFilters = false">
            {{ $t("licenses.dashboard.showCount", { n: meta.total ?? 0 }, meta.total ?? 0) }}
          </UiButton>
        </template>
      </UiModal>
    </LicenseProductGate>
  </div>
</template>
