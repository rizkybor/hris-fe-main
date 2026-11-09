<script setup>
// License Manager overview: KPI totals for all products, one card per
// product (click through to its licenses), product management (add / edit /
// switch on-off / delete) and the "Expiring soon" / "Recent activity"
// panels.
// Permissions: license-manager-list (page), -view (panels), -create
// (Create license), license-manager-create / -edit / -delete (products too).
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  Package,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  MoreHorizontal,
  Layers,
  CheckCircle2,
  Hourglass,
  CalendarX2,
  KeyRound,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import LicenseProductFormModal from "@/components/admin/license-manager/LicenseProductFormModal.vue";
import LicenseKpiCard from "@/components/admin/license-manager/LicenseKpiCard.vue";
import PlanDistributionBar from "@/components/admin/license-manager/PlanDistributionBar.vue";
import ExpiringList from "@/components/admin/license-manager/ExpiringList.vue";
import RecentActivity from "@/components/admin/license-manager/RecentActivity.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { EXPIRING_SOON_DAYS, keyExample } from "@/components/admin/license-manager/licenseHelpers";

const store = useLicenseManagerStore();
const alertModal = useAlertModalStore();

const loading = ref(true);
const error = ref("");
const success = ref("");
const busyCode = ref(null);
const menuCode = ref(null);
const modal = ref({ show: false, product: null });

const canView = computed(() => can("license-manager-view"));
const canCreateLicense = computed(() => can("license-manager-create"));
const canCreateProduct = computed(() => can("license-manager-create"));
const canEditProduct = computed(() => can("license-manager-edit"));
const canDeleteProduct = computed(() => can("license-manager-delete"));
const hasProductMenu = computed(() => canEditProduct.value || canDeleteProduct.value);

const load = async () => {
  try {
    await Promise.all([store.fetchOverview(), store.fetchProducts({ force: true })]);
  } catch (err) {
    error.value = errorMessage(err, "Failed to load the License Manager overview.");
  } finally {
    loading.value = false;
  }
};

// The ⋯ menu closes on any click outside it, or Escape.
const closeMenu = () => (menuCode.value = null);
const onKey = (e) => e.key === "Escape" && closeMenu();
onMounted(() => {
  load();
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", closeMenu);
  document.removeEventListener("keydown", onKey);
});
const toggleMenu = (code) => (menuCode.value = menuCode.value === code ? null : code);

const flash = (message) => {
  success.value = message;
  setTimeout(() => {
    if (success.value === message) success.value = "";
  }, 3000);
};

// Overview counts joined with the product records (description, license
// count incl. deleted, used by edit / delete).
const products = computed(() =>
  (store.overview?.products || []).map((counts) => ({
    ...(store.productByCode(counts.code) || {}),
    ...counts,
    licenses_count: store.productByCode(counts.code)?.licenses_count ?? counts.total,
  }))
);
const all = computed(() => store.overview?.all || null);
const soonDays = computed(() => store.overview?.expiring_soon_days ?? EXPIRING_SOON_DAYS);

const kpis = computed(() => [
  { key: "total", label: "Total licenses", value: all.value?.total, caption: `${products.value.length} product${products.value.length === 1 ? "" : "s"}`, icon: Layers, tone: "violet" },
  { key: "active", label: "Active", value: all.value?.active, caption: "On and in period", icon: CheckCircle2, tone: "emerald" },
  { key: "expiring_soon", label: "Expiring soon", value: all.value?.expiring_soon, caption: `≤ ${soonDays.value} days left`, icon: Hourglass, tone: "amber" },
  { key: "expired", label: "Expired", value: all.value?.expired, caption: "Past end date", icon: CalendarX2, tone: "red" },
  { key: "inactive", label: "Inactive", value: all.value?.inactive, caption: "Switched off", icon: PowerOff, tone: "gray" },
]);

const stats = (p) => [
  { key: "active", label: "Active", value: p.active ?? 0, dot: "bg-emerald-500" },
  { key: "expiring_soon", label: "Expiring", value: p.expiring_soon ?? 0, dot: "bg-amber-500" },
  { key: "expired", label: "Expired", value: p.expired ?? 0, dot: "bg-red-500" },
  { key: "inactive", label: "Inactive", value: p.inactive ?? 0, dot: "bg-gray-400" },
];
// Status share bar, used when the overview has no per-plan counts.
const statusShare = (p) => {
  const total = stats(p).reduce((s, x) => s + x.value, 0);
  return stats(p).map((s) => ({ ...s, pct: total ? (s.value / total) * 100 : 0 }));
};

const dashboardRoute = (p) => ({ name: "admin.license-manager.licenses.dashboard", params: { product: p.code } });
const createRoute = (p) => ({ name: "admin.license-manager.licenses.create", params: { product: p.code } });

const openAdd = () => (modal.value = { show: true, product: null });
const openEdit = (product) => {
  closeMenu();
  modal.value = { show: true, product: store.productByCode(product.code) || product };
};
const closeModal = () => (modal.value = { show: false, product: null });

const onSaved = async (saved) => {
  const wasEdit = !!modal.value.product;
  closeModal();
  flash(wasEdit ? `${saved.name} updated.` : `${saved.name} added.`);
  await load();
};

const toggleActive = async (product) => {
  closeMenu();
  busyCode.value = product.code;
  try {
    await store.updateProduct(product.code, { is_active: !product.is_active });
    flash(`${product.name} ${product.is_active ? "deactivated" : "activated"}.`);
    await load();
  } catch (err) {
    error.value = errorMessage(err, "Failed to update the product.");
  } finally {
    busyCode.value = null;
  }
};

const remove = async (product) => {
  closeMenu();
  const ok = await alertModal.confirm(`Delete the product "${product.name}"? This cannot be undone.`, {
    title: "Delete Product",
    type: "danger",
    confirmText: "Delete",
  });
  if (!ok) return;
  busyCode.value = product.code;
  try {
    await store.deleteProduct(product.code);
    flash(`${product.name} deleted.`);
    await load();
  } catch (err) {
    await alertModal.alert(errorMessage(err, "Failed to delete the product."), { type: "danger" });
  } finally {
    busyCode.value = null;
  }
};

const primaryBtn =
  "rounded-[12px] border border-violet-800 hover:brightness-110 focus:ring-2 focus:ring-violet-500 transition-all duration-300 px-4 py-2.5 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-700 shadow-[inset_-2px_2px_1px_0_rgba(167,139,250,0.55),inset_2px_2px_1px_0_rgba(167,139,250,0.35)] text-white text-sm font-semibold";
const secondaryBtn =
  "rounded-[12px] border border-[#DCDEDD] bg-white hover:border-violet-400 hover:bg-violet-50/40 transition-all duration-300 px-4 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-brand-dark";
const menuItem =
  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
</script>

<template>
  <div class="px-4 py-4 space-y-6">
    <Alert v-if="success" type="success" :title="success" message="" :show="!!success" @close="success = ''" />
    <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-[14px] bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-sm">
          <KeyRound class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-brand-dark text-xl font-bold leading-tight">License Manager</h1>
          <p class="text-brand-light text-sm mt-0.5">Licenses for all your apps</p>
        </div>
      </div>
      <button v-if="canCreateProduct" type="button" @click="openAdd" :class="[primaryBtn, 'w-full md:w-auto']">
        <Plus class="w-4 h-4" />
        Add Product
      </button>
    </div>

    <!-- KPI row (all products) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      <LicenseKpiCard
        v-for="kpi in kpis"
        :key="kpi.key"
        :label="kpi.label"
        :value="kpi.value"
        :caption="kpi.caption"
        :icon="kpi.icon"
        :tone="kpi.tone"
        :loading="loading"
        :class="kpi.key === 'total' ? 'col-span-2 sm:col-span-1' : ''"
      />
    </div>

    <!-- Products -->
    <section>
      <div class="flex items-center justify-between gap-3 mb-4">
        <h2 class="text-base font-bold text-brand-dark">Products</h2>
        <span v-if="!loading" class="text-xs text-brand-light tabular-nums">{{ products.length }} product{{ products.length === 1 ? "" : "s" }}</span>
      </div>

      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="bg-white border border-[#DCDEDD] rounded-[16px] p-5 space-y-4">
          <div class="flex items-center gap-3">
            <Skeleton width="56px" height="56px" rounded="13px" />
            <div class="flex-1 space-y-2">
              <Skeleton width="45%" height="14px" />
              <Skeleton width="30%" height="10px" />
            </div>
          </div>
          <Skeleton height="36px" />
          <Skeleton height="6px" rounded="999px" />
          <Skeleton height="38px" rounded="12px" />
        </div>
      </div>

      <div v-else-if="products.length || canCreateProduct" class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        <article
          v-for="p in products"
          :key="p.code"
          class="relative flex flex-col border rounded-[16px] shadow-sm transition-all duration-200"
          :class="[
            p.is_active ? 'bg-white border-[#DCDEDD] hover:shadow-md hover:border-violet-300' : 'bg-gray-50 border-[#E5E7EB]',
            menuCode === p.code ? 'z-20' : '',
          ]"
        >
          <div class="p-5 flex-1" :class="{ 'opacity-60 grayscale': !p.is_active }">
            <!-- Identity -->
            <div class="flex items-start gap-3.5" :class="{ 'pr-10': hasProductMenu }">
              <ProductIcon :product="p" :size="56" class="shadow-sm" />
              <div class="flex-1 min-w-0 pt-0.5">
                <div class="flex items-center gap-2">
                  <h3 class="text-brand-dark text-base font-bold truncate">{{ p.name }}</h3>
                  <span v-if="!p.is_active" class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 shrink-0">Inactive</span>
                </div>
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span class="text-[11px] font-mono font-semibold text-brand-light bg-gray-50 border border-[#EEEEEE] rounded px-1.5 py-0.5">{{ p.code }}</span>
                  <span class="text-[11px] font-mono font-semibold text-violet-700 bg-violet-50 rounded px-1.5 py-0.5">{{ keyExample(p.key_prefix) }}</span>
                </div>
              </div>
            </div>

            <!-- Counts -->
            <div class="mt-5 flex items-end justify-between gap-3">
              <div>
                <p class="text-3xl font-bold text-brand-dark leading-none tabular-nums">{{ p.total ?? 0 }}</p>
                <p class="text-xs text-brand-light mt-1">license{{ p.total === 1 ? "" : "s" }}</p>
              </div>
              <div class="flex flex-wrap justify-end gap-x-3 gap-y-1">
                <span v-for="s in stats(p)" :key="s.key" class="inline-flex items-center gap-1.5 text-xs" :title="s.label">
                  <span class="w-1.5 h-1.5 rounded-full" :class="s.dot"></span>
                  <span class="text-brand-light">{{ s.label }}</span>
                  <span class="font-semibold text-brand-dark tabular-nums">{{ s.value }}</span>
                </span>
              </div>
            </div>

            <!-- Per-plan bar (status share when the API has no plan counts) -->
            <div class="mt-4">
              <PlanDistributionBar v-if="p.by_plan" :counts="p.by_plan" :height="6" :legend="false" />
              <div v-else class="flex w-full h-1.5 overflow-hidden rounded-full bg-gray-100 gap-px" role="img" aria-label="Licenses by status">
                <template v-for="s in statusShare(p)" :key="s.key">
                  <div v-if="s.value" class="h-full" :class="s.dot" :style="{ width: `${s.pct}%` }" :title="`${s.label}: ${s.value}`"></div>
                </template>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="px-5 pb-5 flex items-center gap-2.5">
            <RouterLink v-if="p.is_active" :to="dashboardRoute(p)" :class="[primaryBtn, 'flex-1 !py-2']">
              Open licenses
              <ArrowRight class="w-4 h-4" />
            </RouterLink>
            <span v-else class="flex-1 text-xs text-brand-light py-2">Switch it on to manage its licenses.</span>
            <RouterLink v-if="p.is_active && canCreateLicense" :to="createRoute(p)" :class="[secondaryBtn, '!py-2']" title="Create license">
              <Plus class="w-4 h-4 text-violet-600" />
              <span class="hidden sm:inline">Create license</span>
            </RouterLink>
          </div>

          <!-- ⋯ menu -->
          <div v-if="hasProductMenu" class="absolute top-4 right-4" @click.stop>
            <button
              type="button"
              @click="toggleMenu(p.code)"
              :disabled="busyCode === p.code"
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent hover:border-[#DCDEDD] hover:bg-white transition-all disabled:opacity-40"
              :class="{ 'border-[#DCDEDD] bg-white': menuCode === p.code }"
              aria-label="Product actions"
              :aria-expanded="menuCode === p.code"
            >
              <MoreHorizontal class="w-4 h-4 text-gray-600" />
            </button>
            <Transition name="menu">
              <div
                v-if="menuCode === p.code"
                class="absolute right-0 mt-1.5 w-52 bg-white border border-[#DCDEDD] rounded-[12px] shadow-lg p-1.5 z-30"
                role="menu"
              >
                <button v-if="canEditProduct" type="button" role="menuitem" @click="openEdit(p)" :class="[menuItem, 'text-brand-dark hover:bg-gray-50']">
                  <Pencil class="w-4 h-4 text-gray-500" /> Edit
                </button>
                <button
                  v-if="canEditProduct"
                  type="button"
                  role="menuitem"
                  @click="toggleActive(p)"
                  :class="[menuItem, 'text-brand-dark hover:bg-gray-50']"
                >
                  <PowerOff v-if="p.is_active" class="w-4 h-4 text-amber-600" />
                  <Power v-else class="w-4 h-4 text-emerald-600" />
                  {{ p.is_active ? "Deactivate" : "Activate" }}
                </button>
                <template v-if="canDeleteProduct">
                  <div v-if="canEditProduct" class="my-1 border-t border-[#F1F1F1]"></div>
                  <!-- Wrapper keeps the tooltip working while the button is disabled -->
                  <span class="block" :title="p.licenses_count > 0 ? 'Products with licenses cannot be deleted. Deactivate it instead.' : ''">
                    <button
                      type="button"
                      role="menuitem"
                      @click="remove(p)"
                      :disabled="p.licenses_count > 0"
                      :class="[menuItem, 'text-red-600 hover:bg-red-50 disabled:hover:bg-transparent']"
                    >
                      <Trash2 class="w-4 h-4" /> Delete
                    </button>
                  </span>
                </template>
              </div>
            </Transition>
          </div>
        </article>

        <!-- Add product placeholder -->
        <button
          v-if="canCreateProduct"
          type="button"
          @click="openAdd"
          class="group min-h-[220px] flex flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed border-[#DCDEDD] text-brand-light hover:border-violet-400 hover:bg-violet-50/40 hover:text-violet-700 transition-all"
        >
          <span class="w-12 h-12 rounded-full bg-white border border-[#DCDEDD] flex items-center justify-center shadow-sm group-hover:border-violet-300 transition-colors">
            <Plus class="w-5 h-5" />
          </span>
          <span class="text-sm font-semibold">Add product</span>
          <span class="text-xs text-brand-light">Register another app for license keys</span>
        </button>
      </div>

      <div v-else class="text-center py-14 bg-white rounded-[16px] border border-dashed border-[#DCDEDD]">
        <Package class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-sm font-semibold text-brand-dark">No products yet</p>
        <p class="text-xs text-brand-light">Products appear here once they are added.</p>
      </div>
    </section>

    <!-- Panels (license-manager-view) -->
    <div v-if="canView" class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <ExpiringList :days="30" :limit="10" />
      <RecentActivity :limit="15" />
    </div>

    <LicenseProductFormModal
      v-if="canCreateProduct || canEditProduct"
      :show="modal.show"
      :product="modal.product"
      @close="closeModal"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
