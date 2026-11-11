<script setup>
// License Manager overview: KPI totals for all products, one card per
// product (click through to its licenses), product management (add / edit /
// switch on-off / delete) and the "Expiring soon" / "Recent activity"
// panels.
// Permissions: license-manager-list (page), -view (panels), -create
// (Create license), license-manager-create / -edit / -delete (products too).
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
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
import { UiPageHeader, UiButton, UiBadge, UiEmpty } from "@/components/ui";
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

const { t } = useI18n();
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
    error.value = errorMessage(err, t("licenses.overview.loadFailed"));
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
  {
    key: "total",
    label: t("licenses.kpi.total"),
    value: all.value?.total,
    caption: t("licenses.overview.productCount", { n: products.value.length }, products.value.length),
    icon: Layers,
    tone: "violet",
  },
  { key: "active", label: t("licenses.status.active"), value: all.value?.active, caption: t("licenses.kpi.activeCaption"), icon: CheckCircle2, tone: "emerald" },
  {
    key: "expiring_soon",
    label: t("licenses.status.expiringSoon"),
    value: all.value?.expiring_soon,
    caption: t("licenses.kpi.expiringCaption", { n: soonDays.value }, soonDays.value),
    icon: Hourglass,
    tone: "amber",
  },
  { key: "expired", label: t("licenses.status.expired"), value: all.value?.expired, caption: t("licenses.kpi.expiredCaption"), icon: CalendarX2, tone: "red" },
  { key: "inactive", label: t("licenses.status.inactive"), value: all.value?.inactive, caption: t("licenses.kpi.inactiveCaption"), icon: PowerOff, tone: "gray" },
]);

const stats = (p) => [
  { key: "active", label: t("licenses.status.active"), value: p.active ?? 0, dot: "bg-ui-ok" },
  { key: "expiring_soon", label: t("licenses.overview.expiring"), value: p.expiring_soon ?? 0, dot: "bg-ui-warn" },
  { key: "expired", label: t("licenses.status.expired"), value: p.expired ?? 0, dot: "bg-ui-bad" },
  { key: "inactive", label: t("licenses.status.inactive"), value: p.inactive ?? 0, dot: "bg-ui-faint" },
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
  flash(wasEdit ? t("licenses.overview.updated", { name: saved.name }) : t("licenses.overview.added", { name: saved.name }));
  await load();
};

const toggleActive = async (product) => {
  closeMenu();
  busyCode.value = product.code;
  try {
    await store.updateProduct(product.code, { is_active: !product.is_active });
    flash(
      product.is_active
        ? t("licenses.overview.deactivated", { name: product.name })
        : t("licenses.overview.activated", { name: product.name })
    );
    await load();
  } catch (err) {
    error.value = errorMessage(err, t("licenses.overview.updateFailed"));
  } finally {
    busyCode.value = null;
  }
};

const remove = async (product) => {
  closeMenu();
  const ok = await alertModal.confirm(t("licenses.overview.deleteConfirm", { name: product.name }), {
    title: t("licenses.overview.deleteTitle"),
    type: "danger",
    confirmText: t("common.actions.delete"),
  });
  if (!ok) return;
  busyCode.value = product.code;
  try {
    await store.deleteProduct(product.code);
    flash(t("licenses.overview.deleted", { name: product.name }));
    await load();
  } catch (err) {
    await alertModal.alert(errorMessage(err, t("licenses.overview.deleteFailed")), { type: "danger" });
  } finally {
    busyCode.value = null;
  }
};

const menuItem =
  "w-full flex items-center gap-2.5 px-2.5 h-9 text-ui-small text-left rounded-[6px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <Alert v-if="success" type="success" :title="success" message="" :show="!!success" @close="success = ''" />
    <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />

    <!-- Header -->
    <UiPageHeader :title="$t('licenses.title')" :subtitle="$t('licenses.overview.subtitle')">
      <template #actions>
        <UiButton v-if="canCreateProduct" :icon="Plus" class="w-full sm:w-auto" @click="openAdd">{{ $t("licenses.product.addTitle") }}</UiButton>
      </template>
    </UiPageHeader>

    <!-- KPI row (all products) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 ui-stagger">
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
      <div class="flex items-center justify-between gap-3 mb-3">
        <h2 class="text-ui-h2 text-ui-ink">{{ $t("licenses.overview.products") }}</h2>
        <span v-if="!loading" class="text-ui-cap text-ui-muted tabular-nums">{{ $t("licenses.overview.productCount", { n: products.length }, products.length) }}</span>
      </div>

      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
        <div v-for="i in 3" :key="i" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-4">
          <div class="flex items-center gap-3">
            <Skeleton width="48px" height="48px" rounded="11px" />
            <div class="flex-1 space-y-2">
              <Skeleton width="45%" height="14px" />
              <Skeleton width="30%" height="10px" />
            </div>
          </div>
          <Skeleton height="36px" />
          <Skeleton height="6px" rounded="999px" />
          <Skeleton height="36px" rounded="8px" />
        </div>
      </div>

      <div v-else-if="products.length || canCreateProduct" class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 ui-stagger">
        <article
          v-for="p in products"
          :key="p.code"
          class="relative flex flex-col border rounded-ui-card transition-colors"
          :class="[
            p.is_active ? 'bg-ui-surface border-ui-line hover:border-ui-line-strong' : 'bg-ui-subtle border-ui-line',
            menuCode === p.code ? 'z-20' : '',
          ]"
        >
          <div class="p-5 flex-1" :class="{ 'opacity-60 grayscale': !p.is_active }">
            <!-- Identity -->
            <div class="flex items-start gap-3.5" :class="{ 'pr-10': hasProductMenu }">
              <ProductIcon :product="p" :size="48" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="text-ui-h2 text-ui-ink truncate">{{ p.name }}</h3>
                  <UiBadge v-if="!p.is_active" tone="neutral" class="shrink-0">{{ $t("licenses.status.inactive") }}</UiBadge>
                </div>
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span class="text-ui-cap font-mono text-ui-muted bg-ui-subtle border border-ui-line rounded-md px-1.5 py-px">{{ p.code }}</span>
                  <span class="text-ui-cap font-mono text-ui-accent bg-ui-accent-soft rounded-md px-1.5 py-px">{{ keyExample(p.key_prefix) }}</span>
                </div>
              </div>
            </div>

            <!-- Counts -->
            <div class="mt-5 flex items-end justify-between gap-3">
              <div>
                <p class="text-ui-display text-ui-ink tabular-nums">{{ p.total ?? 0 }}</p>
                <p class="text-ui-cap text-ui-muted">{{ $t("licenses.overview.licenseWord", p.total ?? 0) }}</p>
              </div>
              <div class="flex flex-wrap justify-end gap-x-3 gap-y-1">
                <span v-for="s in stats(p)" :key="s.key" class="inline-flex items-center gap-1.5 text-ui-cap" :title="s.label">
                  <span class="w-1.5 h-1.5 rounded-full" :class="s.dot"></span>
                  <span class="text-ui-muted">{{ s.label }}</span>
                  <span class="font-medium text-ui-ink tabular-nums">{{ s.value }}</span>
                </span>
              </div>
            </div>

            <!-- Per-plan bar (status share when the API has no plan counts) -->
            <div class="mt-4">
              <PlanDistributionBar v-if="p.by_plan" :counts="p.by_plan" :height="6" :legend="false" />
              <div v-else class="flex w-full h-1.5 overflow-hidden rounded-full bg-ui-subtle gap-px" role="img" :aria-label="$t('licenses.overview.byStatus')">
                <template v-for="s in statusShare(p)" :key="s.key">
                  <div v-if="s.value" class="h-full" :class="s.dot" :style="{ width: `${s.pct}%` }" :title="`${s.label}: ${s.value}`"></div>
                </template>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="px-5 pb-5 flex items-center gap-2">
            <UiButton v-if="p.is_active" :to="dashboardRoute(p)" :icon-right="ArrowRight" class="flex-1">{{ $t("licenses.overview.openLicenses") }}</UiButton>
            <span v-else class="flex-1 text-ui-cap text-ui-muted py-2">{{ $t("licenses.overview.switchOnHint") }}</span>
            <UiButton v-if="p.is_active && canCreateLicense" variant="secondary" :icon="Plus" :to="createRoute(p)" :title="$t('licenses.overview.createLicense')">
              <span class="hidden sm:inline">{{ $t("licenses.overview.createLicense") }}</span>
            </UiButton>
          </div>

          <!-- ⋯ menu -->
          <div v-if="hasProductMenu" class="absolute top-4 right-4" @click.stop>
            <button
              type="button"
              @click="toggleMenu(p.code)"
              :disabled="busyCode === p.code"
              class="w-8 h-8 flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink transition-colors disabled:opacity-40"
              :class="{ 'bg-ui-hover text-ui-ink': menuCode === p.code }"
              :aria-label="$t('licenses.overview.productActions')"
              :aria-expanded="menuCode === p.code"
            >
              <MoreHorizontal class="w-4 h-4" />
            </button>
            <Transition name="ui-pop">
              <div
                v-if="menuCode === p.code"
                class="absolute right-0 mt-1 w-52 bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay p-1 z-30"
                role="menu"
              >
                <button v-if="canEditProduct" type="button" role="menuitem" @click="openEdit(p)" :class="[menuItem, 'text-ui-ink hover:bg-ui-hover']">
                  <Pencil class="w-4 h-4 text-ui-muted" /> {{ $t("common.actions.edit") }}
                </button>
                <button v-if="canEditProduct" type="button" role="menuitem" @click="toggleActive(p)" :class="[menuItem, 'text-ui-ink hover:bg-ui-hover']">
                  <PowerOff v-if="p.is_active" class="w-4 h-4 text-ui-warn" />
                  <Power v-else class="w-4 h-4 text-ui-ok" />
                  {{ p.is_active ? $t("licenses.overview.deactivate") : $t("licenses.overview.activate") }}
                </button>
                <template v-if="canDeleteProduct">
                  <div v-if="canEditProduct" class="my-1 border-t border-ui-line"></div>
                  <!-- Wrapper keeps the tooltip working while the button is disabled -->
                  <span class="block" :title="p.licenses_count > 0 ? $t('licenses.overview.cannotDelete') : ''">
                    <button
                      type="button"
                      role="menuitem"
                      @click="remove(p)"
                      :disabled="p.licenses_count > 0"
                      :class="[menuItem, 'text-ui-bad hover:bg-ui-bad-soft disabled:hover:bg-transparent']"
                    >
                      <Trash2 class="w-4 h-4" /> {{ $t("common.actions.delete") }}
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
          class="group min-h-[220px] flex flex-col items-center justify-center gap-2 rounded-ui-card border border-dashed border-ui-line-strong text-ui-muted hover:bg-ui-surface hover:text-ui-ink transition-colors"
        >
          <span class="w-10 h-10 rounded-full bg-ui-surface border border-ui-line flex items-center justify-center group-hover:border-ui-line-strong transition-colors">
            <Plus class="w-5 h-5" />
          </span>
          <span class="text-ui-small font-medium text-ui-ink">{{ $t("licenses.overview.addProduct") }}</span>
          <span class="text-ui-cap text-ui-muted">{{ $t("licenses.overview.addProductHint") }}</span>
        </button>
      </div>

      <div v-else class="bg-ui-surface border border-dashed border-ui-line-strong rounded-ui-card">
        <UiEmpty :icon="Package" :title="$t('licenses.overview.emptyTitle')" :message="$t('licenses.overview.emptyMessage')" />
      </div>
    </section>

    <!-- Panels (license-manager-view) -->
    <div v-if="canView" class="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
      <ExpiringList :days="30" :limit="10" />
      <RecentActivity :limit="10" />
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
