<script setup>
// Licenses of one product: KPI cards, plan distribution, filters and the
// license table (stacked cards below md).
// Permissions: license-manager-list (page, KPIs), -view (open a license),
// -create, -edit (edit action + status switch), -delete.
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
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
  Monitor,
  Clock,
  PieChart,
  History,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import Pagination from "@/components/common/Pagination.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
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
} from "@/components/admin/license-manager/licenseHelpers";

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

const SORTS = [
  { value: "", label: "Newest" },
  { value: "expires_at:asc", label: "Expiring first" },
  { value: "expires_at:desc", label: "Expiring last" },
];

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
  { key: "", label: "Total", value: summary.value?.total, caption: "All licenses", icon: Layers, tone: "violet" },
  { key: "active", label: "Active", value: summary.value?.active, caption: "On and in period", icon: CheckCircle2, tone: "emerald" },
  {
    key: "expiring_soon",
    label: "Expiring soon",
    value: summary.value?.expiring_soon,
    caption: `≤ ${soonDays.value} days left`,
    icon: Hourglass,
    tone: "amber",
  },
  { key: "expired", label: "Expired", value: summary.value?.expired, caption: "Past end date", icon: CalendarX2, tone: "red" },
  { key: "inactive", label: "Inactive", value: summary.value?.inactive, caption: "Switched off", icon: PowerOff, tone: "gray" },
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

const AVATAR_TONES = [
  "bg-violet-100 text-violet-700",
  "bg-indigo-100 text-indigo-700",
  "bg-sky-100 text-sky-700",
  "bg-teal-100 text-teal-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-fuchsia-100 text-fuchsia-700",
];
const initials = (name) => {
  const words = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "?") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
};
const avatarTone = (name) => {
  let hash = 0;
  for (const ch of String(name || "")) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};

const isOrganization = (license) => planCategory(license) === "organization";

const remainingText = (license) => {
  if (isLifetimeLicense(license)) return "∞";
  const days = license.remaining_days;
  if (license.status === "expired" || days === null || days === undefined || days <= 0) return "Expired";
  return `${days} day${days === 1 ? "" : "s"}`;
};

const elapsed = (license) => Math.min(100, Math.max(0, Number(license.elapsed_percent ?? 0)));
const periodBarClass = (license) => {
  if (license.status === "expired") return "bg-red-500";
  if (license.status === "expiring_soon") return "bg-amber-500";
  if (license.status === "inactive") return "bg-gray-400";
  return "bg-violet-500";
};

const devicePercent = (license) =>
  license.max_devices ? Math.min(100, ((license.devices_used ?? 0) / license.max_devices) * 100) : 0;
const devicesFull = (license) => (license.devices_used ?? 0) >= license.max_devices;

const lastActivity = (license) => license.last_activity_at || license.last_activated_at;

/* ---------- Actions ---------- */

const toggleActive = async (license, value) => {
  togglingId.value = license.id;
  error.value = "";
  try {
    // Partial update: only is_active is sent.
    await store.setActive(license.id, value);
    flash(`License ${value ? "activated" : "deactivated"}.`);
    store.fetchSummary();
  } catch (err) {
    error.value = errorMessage(err, "Failed to update license status.");
  } finally {
    togglingId.value = null;
  }
};

const handleDelete = async (license) => {
  const ok = await alertModal.confirm(
    `Delete license ${license.key} for "${license.licensee_name}"? Devices using it will lose access. This action cannot be undone.`,
    { title: "Delete License", type: "danger", confirmText: "Delete" }
  );
  if (!ok) return;

  try {
    await store.deleteLicense(license.id);
    flash("License deleted.");
    store.fetchSummary();
    if (licenses.value.length === 0 && serverOptions.value.page > 1) {
      serverOptions.value.page -= 1;
    }
    await fetchData();
  } catch (err) {
    await alertModal.alert(errorMessage(err, "Failed to delete license."), { type: "danger" });
  }
};

const primaryBtn =
  "rounded-[12px] border border-violet-800 hover:brightness-110 focus:ring-2 focus:ring-violet-500 transition-all duration-300 px-4 py-2.5 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-700 shadow-[inset_-2px_2px_1px_0_rgba(167,139,250,0.55),inset_2px_2px_1px_0_rgba(167,139,250,0.35)] text-white text-sm font-semibold";
const secondaryBtn =
  "rounded-[12px] border border-[#DCDEDD] bg-white hover:border-violet-400 hover:bg-violet-50/40 transition-all duration-300 px-4 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-brand-dark shadow-sm";
const iconBtn =
  "flex justify-center items-center w-8 h-8 border border-[#DCDEDD] bg-white rounded-lg hover:border-violet-400 hover:ring-2 hover:ring-violet-400/30 transition-all";
const th =
  "sticky top-0 z-10 bg-gray-50 py-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-brand-light whitespace-nowrap border-b border-[#DCDEDD]";
const statusBadge = (license) =>
  license.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500";
</script>

<template>
  <div class="px-4 py-4">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <Transition name="fade">
        <Alert v-if="success" type="success" :title="success" message="" :show="!!success" @close="success = ''" />
      </Transition>
      <Transition name="fade">
        <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />
      </Transition>

      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="flex items-center gap-3.5 min-w-0">
            <ProductIcon :product="product" :size="48" class="shadow-sm" />
            <div class="min-w-0">
              <h1 class="text-brand-dark text-xl font-bold leading-tight truncate">{{ productName }} Licenses</h1>
              <p class="text-brand-light text-sm flex items-center gap-1.5 flex-wrap mt-0.5">
                <span
                  v-if="product?.key_prefix"
                  class="inline-flex items-center gap-1 font-mono text-xs font-semibold text-brand-dark bg-white border border-[#DCDEDD] rounded-md px-1.5 py-0.5"
                >
                  <KeyRound class="w-3 h-3 text-violet-500" />{{ product.key_prefix }}
                </span>
                <span v-if="product?.key_prefix" class="text-gray-300">·</span>
                <span class="tabular-nums">{{ totalLicenses }} license{{ totalLicenses === 1 ? "" : "s" }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2.5 w-full md:w-auto">
            <RouterLink :to="{ name: 'admin.license-manager.overview' }" :class="[secondaryBtn, 'flex-1 md:flex-none']">
              <LayoutGrid class="w-4 h-4 text-gray-500" />
              Overview
            </RouterLink>
            <RouterLink
              v-if="canSeeVersions"
              :to="{ name: 'admin.license-manager.versions', params: { product: productCode } }"
              :class="[secondaryBtn, 'flex-1 md:flex-none']"
            >
              <History class="w-4 h-4 text-gray-500" />
              Versions
            </RouterLink>
            <RouterLink
              v-if="canCreate"
              :to="{ name: 'admin.license-manager.licenses.create', params: { product: productCode } }"
              :class="[primaryBtn, 'flex-1 md:flex-none']"
            >
              <Plus class="w-4 h-4" />
              Create License
            </RouterLink>
          </div>
        </div>

        <!-- KPI row -->
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
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

        <!-- Plan distribution -->
        <div class="bg-white border border-[#DCDEDD] rounded-[16px] shadow-sm px-5 py-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2">
              <PieChart class="w-4 h-4 text-violet-500" />
              <h2 class="text-sm font-bold text-brand-dark">Plan distribution</h2>
            </div>
            <span v-if="summary?.by_plan" class="text-xs text-brand-light tabular-nums">{{ summary.total ?? 0 }} total</span>
          </div>
          <Skeleton v-if="summaryLoading" height="8px" rounded="999px" />
          <PlanDistributionBar
            v-else-if="summary?.by_plan"
            :counts="summary.by_plan"
            :active-plan="filters.plan"
            selectable
            @select="filterByPlan"
          />
          <p v-else class="text-xs text-brand-light">No plan data yet.</p>
        </div>

        <!-- Toolbar + table -->
        <div class="bg-white border border-[#DCDEDD] rounded-[16px] shadow-sm">
          <div class="p-4 sm:p-5 space-y-4 border-b border-[#F1F1F1]">
            <div class="flex flex-col lg:flex-row lg:items-center gap-3">
              <div class="relative flex-1 min-w-0">
                <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 pointer-events-none" />
                <input
                  v-model="filters.search"
                  type="text"
                  placeholder="Search key, name or email..."
                  class="w-full pl-11 pr-9 py-2.5 text-sm border border-[#DCDEDD] rounded-[12px] hover:border-violet-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all duration-300 font-medium"
                />
                <button
                  v-if="filters.search"
                  type="button"
                  @click="filters.search = ''"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100"
                  aria-label="Clear search"
                >
                  <X class="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
              <div class="grid grid-cols-2 gap-3 lg:flex lg:items-center">
                <div class="relative lg:w-44">
                  <select v-model="filters.status" class="select-soft !rounded-[12px] !py-2.5" aria-label="Filter by status">
                    <option value="">All statuses</option>
                    <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                <div class="relative lg:w-44">
                  <select v-model="filters.sort" class="select-soft !rounded-[12px] !py-2.5" aria-label="Sort">
                    <option v-for="opt in SORTS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="flex flex-wrap items-center gap-1.5">
              <div class="flex items-center gap-1 p-0.5 rounded-full bg-slate-100" role="group" aria-label="Filter by platform">
                <button
                  v-for="opt in [{ value: '', label: 'All platforms' }, ...PLATFORM_OPTIONS]"
                  :key="opt.value || 'all'"
                  type="button"
                  @click="filters.platform = opt.value"
                  class="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  :class="filters.platform === opt.value ? 'bg-white text-brand-dark shadow-sm' : 'text-brand-light hover:text-brand-dark'"
                  :aria-pressed="filters.platform === opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
              <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by plan">
                <button
                  type="button"
                  @click="filters.plan = ''"
                  class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                  :class="!filters.plan ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-brand-dark border-[#DCDEDD] hover:border-violet-300'"
                  :aria-pressed="!filters.plan"
                >
                  All
                </button>
                <button
                  v-for="opt in PLAN_OPTIONS"
                  :key="opt.value"
                  type="button"
                  @click="filterByPlan(opt.value)"
                  class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all inline-flex items-center gap-1.5"
                  :class="
                    filters.plan === opt.value
                      ? [planChipClass(opt.value), 'border-current']
                      : 'bg-white text-brand-dark border-[#DCDEDD] hover:border-violet-300'
                  "
                  :aria-pressed="filters.plan === opt.value"
                >
                  {{ opt.label }}
                  <span v-if="summary?.by_plan" class="tabular-nums opacity-60">{{ summary.by_plan[opt.value] ?? 0 }}</span>
                </button>
              </div>
              </div>
              <div class="flex items-center gap-3 text-xs text-brand-light shrink-0">
                <button v-if="hasFilters" type="button" @click="clearFilters" class="font-semibold text-violet-600 hover:text-violet-700">
                  Clear filters
                </button>
                <span class="tabular-nums">
                  <span class="font-semibold text-brand-dark">{{ meta.total ?? 0 }}</span>
                  result{{ meta.total === 1 ? "" : "s" }}
                </span>
              </div>
            </div>
          </div>

          <!-- Loading (first load) -->
          <div v-if="!loadedOnce || (loading && !licenses.length)" class="divide-y divide-[#F1F1F1]">
            <div v-for="i in 6" :key="i" class="flex items-center gap-4 px-5 py-4">
              <Skeleton width="36px" height="36px" rounded="999px" />
              <div class="flex-1 space-y-2">
                <Skeleton width="30%" height="12px" />
                <Skeleton width="20%" height="10px" />
              </div>
              <Skeleton width="80px" height="20px" rounded="999px" class="hidden md:block" />
              <Skeleton width="140px" height="12px" class="hidden md:block" />
              <Skeleton width="60px" height="20px" rounded="999px" />
            </div>
          </div>

          <!-- Empty -->
          <div v-else-if="!licenses.length" class="text-center px-6 py-16">
            <div class="relative w-20 h-20 mx-auto mb-5">
              <div class="absolute inset-0 rounded-[24px] bg-gradient-to-br from-violet-100 to-indigo-50 rotate-6"></div>
              <div class="absolute inset-0 rounded-[24px] bg-white border border-[#DCDEDD] shadow-sm flex items-center justify-center">
                <component :is="hasFilters ? SearchX : KeyRound" class="w-9 h-9 text-violet-500" />
              </div>
            </div>
            <h3 class="text-brand-dark text-base font-bold mb-1">
              {{ hasFilters ? "No matching licenses" : "No licenses yet" }}
            </h3>
            <p class="text-brand-light text-sm mb-5">
              {{ hasFilters ? "Try another search term or clear the filters." : `Create the first ${productName} license to get started.` }}
            </p>
            <button v-if="hasFilters" type="button" @click="clearFilters" :class="secondaryBtn">
              <X class="w-4 h-4" /> Clear filters
            </button>
            <RouterLink
              v-else-if="canCreate"
              :to="{ name: 'admin.license-manager.licenses.create', params: { product: productCode } }"
              :class="primaryBtn"
            >
              <Plus class="w-4 h-4" /> Create License
            </RouterLink>
          </div>

          <template v-else>
            <!-- Table (md and up). Sticky headers need a non-scrolling
                 wrapper, so it only scrolls sideways below xl. -->
            <div
              class="hidden md:block overflow-x-auto xl:overflow-x-visible transition-opacity"
              :class="{ 'opacity-60 pointer-events-none': loading }"
            >
              <!-- Fixed layout: the columns have set widths and the licensee
                   column takes the rest (truncated), so the table fits the
                   content width from xl (no horizontal scroll at >= 1280px). -->
              <table class="w-full min-w-[980px] table-fixed text-sm">
                <thead>
                  <tr class="text-left">
                    <th :class="th">Licensee</th>
                    <th :class="[th, 'w-[104px]']">Plan</th>
                    <th :class="[th, 'w-[212px]']">License key</th>
                    <th :class="[th, 'w-[152px]']">Active period</th>
                    <th :class="[th, 'w-[108px]']">Remaining</th>
                    <th :class="[th, 'w-[76px]']">Devices</th>
                    <th :class="[th, 'w-[104px]']">Status</th>
                    <th :class="[th, 'hidden 2xl:table-cell w-[112px]']">Last activity</th>
                    <th :class="[th, 'text-right w-[100px]']"><span class="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#F1F1F1]">
                  <tr
                    v-for="license in licenses"
                    :key="license.id"
                    class="group transition-colors hover:bg-violet-50/30"
                    :class="{ 'cursor-pointer': canView }"
                    @click="openLicense(license)"
                  >
                    <!-- Licensee -->
                    <td class="py-3.5 px-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <span
                          class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          :class="avatarTone(license.licensee_name)"
                        >
                          {{ initials(license.licensee_name) }}
                        </span>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5 min-w-0">
                            <p
                              class="font-semibold text-brand-dark truncate min-w-0 transition-colors"
                              :class="{ 'group-hover:text-violet-700': canView }"
                            >
                              {{ license.licensee_name }}
                            </p>
                            <span
                              v-if="isOrganization(license)"
                              class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 whitespace-nowrap shrink-0"
                            >
                              Org · {{ organizationTypeLabel(license.organization_type) }}
                            </span>
                          </div>
                          <p class="text-xs text-brand-light truncate">{{ license.licensee_email || "-" }}</p>
                          <!-- Last activity folds under the name below 2xl -->
                          <p class="2xl:hidden text-[11px] text-gray-400 truncate">
                            <template v-if="lastActivity(license)">
                              Active <span :title="formatDateTime(lastActivity(license))">{{ relativeTime(lastActivity(license)) }}</span>
                            </template>
                            <template v-else>No activity yet</template>
                          </p>
                        </div>
                      </div>
                    </td>

                    <!-- Plan -->
                    <td class="py-3.5 px-3">
                      <!-- Platform over plan: both fit the narrow column -->
                      <div class="flex flex-col items-start gap-1">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" :class="platformChipClass(license.platform)">
                          {{ licensePlatformLabel(license) }}
                        </span>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" :class="planChipClass(license.plan)">
                          {{ planLabel(license) }}
                        </span>
                      </div>
                    </td>

                    <!-- Key -->
                    <td class="py-3.5 px-3">
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-[11px] font-semibold whitespace-nowrap text-brand-dark">
                          {{ maskKey(license.key) }}
                        </span>
                        <CopyKeyButton :value="license.key" class="opacity-60 group-hover:opacity-100" />
                      </div>
                    </td>

                    <!-- Period -->
                    <td class="py-3.5 px-3">
                      <div v-if="isLifetimeLicense(license)" class="whitespace-nowrap">
                        <p class="text-[11px] text-brand-dark">{{ formatDate(license.starts_at || license.created_at) }}</p>
                        <p class="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 mt-0.5">
                          <InfinityIcon class="w-3.5 h-3.5" /> Lifetime
                        </p>
                      </div>
                      <div v-else class="w-full">
                        <p class="flex items-center gap-1 text-[11px] text-brand-dark whitespace-nowrap">
                          {{ formatDate(license.starts_at || license.created_at) }}
                          <ArrowRight class="w-3 h-3 text-gray-400" />
                          <span :class="license.status === 'expired' ? 'text-red-600 font-semibold' : ''">{{ formatDate(license.expires_at) }}</span>
                        </p>
                        <div class="mt-1.5 h-1 w-full rounded-full bg-gray-100 overflow-hidden" :title="`${elapsed(license)}% of the period used`">
                          <div class="h-full rounded-full transition-all" :class="periodBarClass(license)" :style="{ width: `${elapsed(license)}%` }"></div>
                        </div>
                      </div>
                    </td>

                    <!-- Remaining -->
                    <td class="py-3.5 px-3 whitespace-nowrap">
                      <span
                        class="text-xs font-semibold px-2 py-1 rounded-full tabular-nums"
                        :class="remainingBadgeClass(license)"
                        :title="isLifetimeLicense(license) ? 'No end date' : `${elapsed(license)}% of the period used`"
                      >
                        {{ remainingText(license) }}
                      </span>
                    </td>

                    <!-- Devices -->
                    <td class="py-3.5 px-3 whitespace-nowrap">
                      <div class="w-[52px]">
                        <p class="text-xs font-semibold tabular-nums" :class="devicesFull(license) ? 'text-amber-600' : 'text-brand-dark'">
                          {{ license.devices_used ?? 0 }} <span class="text-brand-light font-normal">/ {{ license.max_devices }}</span>
                        </p>
                        <div class="mt-1.5 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            class="h-full rounded-full"
                            :class="devicesFull(license) ? 'bg-amber-500' : 'bg-sky-500'"
                            :style="{ width: `${devicePercent(license)}%` }"
                          ></div>
                        </div>
                      </div>
                    </td>

                    <!-- Status: switch with license-manager-edit, else a badge -->
                    <td class="py-3.5 px-3">
                      <LicenseStatusSwitch
                        v-if="canEdit"
                        :model-value="!!license.is_active"
                        :disabled="togglingId === license.id"
                        @update:model-value="(value) => toggleActive(license, value)"
                      />
                      <span v-else class="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap" :class="statusBadge(license)">
                        {{ license.is_active ? "Active" : "Inactive" }}
                      </span>
                    </td>

                    <!-- Last activity -->
                    <td class="py-3.5 px-3 whitespace-nowrap text-xs text-brand-light hidden 2xl:table-cell">
                      <span v-if="lastActivity(license)" :title="formatDateTime(lastActivity(license))">{{ relativeTime(lastActivity(license)) }}</span>
                      <span v-else class="text-gray-400">Never</span>
                    </td>

                    <!-- Actions (revealed on hover from lg) -->
                    <td class="py-3.5 px-3">
                      <div
                        class="flex items-center justify-end gap-1.5 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                      >
                        <RouterLink v-if="canView" :to="detailRoute(license)" @click.stop :class="iconBtn" title="View license" aria-label="View license">
                          <Eye class="w-4 h-4 text-gray-600" />
                        </RouterLink>
                        <RouterLink v-if="canEdit" :to="editRoute(license)" @click.stop :class="iconBtn" title="Edit license" aria-label="Edit license">
                          <Pencil class="w-4 h-4 text-gray-600" />
                        </RouterLink>
                        <button
                          v-if="canDelete"
                          type="button"
                          @click.stop="handleDelete(license)"
                          :class="iconBtn"
                          class="hover:bg-red-50 group/del"
                          title="Delete license"
                          aria-label="Delete license"
                        >
                          <Trash2 class="w-4 h-4 text-gray-600 group-hover/del:text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Stacked cards (below md) -->
            <ul class="md:hidden divide-y divide-[#F1F1F1]" :class="{ 'opacity-60': loading }">
              <li
                v-for="license in licenses"
                :key="license.id"
                class="p-4"
                :class="{ 'cursor-pointer active:bg-violet-50/40': canView }"
                @click="openLicense(license)"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    :class="avatarTone(license.licensee_name)"
                  >
                    {{ initials(license.licensee_name) }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="font-semibold text-brand-dark truncate">{{ license.licensee_name }}</p>
                        <p class="text-xs text-brand-light truncate">{{ license.licensee_email || "-" }}</p>
                      </div>
                      <LicenseStatusSwitch
                        v-if="canEdit"
                        :model-value="!!license.is_active"
                        :disabled="togglingId === license.id"
                        @update:model-value="(value) => toggleActive(license, value)"
                      />
                      <span v-else class="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" :class="statusBadge(license)">
                        {{ license.is_active ? "Active" : "Inactive" }}
                      </span>
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5 mt-2">
                      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="platformChipClass(license.platform)">{{ licensePlatformLabel(license) }}</span>
                      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="planChipClass(license.plan)">{{ planLabel(license) }}</span>
                      <span v-if="isOrganization(license)" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700">
                        Org · {{ organizationTypeLabel(license.organization_type) }}
                      </span>
                      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums" :class="remainingBadgeClass(license)">
                        {{ remainingText(license) }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2 mt-2.5">
                      <span class="font-mono text-xs font-semibold text-brand-dark truncate">{{ maskKey(license.key) }}</span>
                      <CopyKeyButton :value="license.key" />
                    </div>

                    <div v-if="!isLifetimeLicense(license)" class="mt-2.5">
                      <div class="flex items-center justify-between text-[11px] text-brand-light">
                        <span>{{ formatDate(license.starts_at || license.created_at) }}</span>
                        <span :class="license.status === 'expired' ? 'text-red-600 font-semibold' : ''">{{ formatDate(license.expires_at) }}</span>
                      </div>
                      <div class="mt-1 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div class="h-full rounded-full" :class="periodBarClass(license)" :style="{ width: `${elapsed(license)}%` }"></div>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[11px] text-brand-light">
                      <span class="inline-flex items-center gap-1 tabular-nums" :class="devicesFull(license) ? 'text-amber-600 font-semibold' : ''">
                        <Monitor class="w-3.5 h-3.5" /> {{ license.devices_used ?? 0 }} / {{ license.max_devices }}
                      </span>
                      <span class="inline-flex items-center gap-1">
                        <Clock class="w-3.5 h-3.5" /> {{ lastActivity(license) ? relativeTime(lastActivity(license)) : "Never" }}
                      </span>
                      <span v-if="isLifetimeLicense(license)" class="inline-flex items-center gap-1 text-violet-700 font-semibold">
                        <InfinityIcon class="w-3.5 h-3.5" /> Lifetime
                      </span>
                      <RouterLink
                        v-if="canEdit"
                        :to="editRoute(license)"
                        @click.stop
                        class="ml-auto inline-flex items-center gap-1 font-semibold text-violet-600"
                      >
                        <Pencil class="w-3.5 h-3.5" /> Edit
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </template>

          <div v-if="loadedOnce && (meta.total ?? 0) > 0" class="px-4 sm:px-5 pb-4 border-t border-[#F1F1F1]">
            <Pagination
              :meta="paginationMeta"
              :loading="loading"
              item-label="licenses"
              :show-per-page="true"
              @page-change="handlePageChange"
              @per-page-change="handlePerPageChange"
            />
          </div>
        </div>
      </div>
    </LicenseProductGate>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
thead th:first-child {
  border-top-left-radius: 16px;
}
thead th:last-child {
  border-top-right-radius: 16px;
}
</style>
