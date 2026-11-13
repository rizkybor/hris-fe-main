<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  PlusIcon,
  Trash2,
  Layers3Icon,
  PuzzleIcon,
  Globe,
  InfoIcon,
  SaveIcon,
  ClockIcon,
  History,
  Search,
} from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { useAlertModalStore } from "@/stores/alertModal";
import { useLookupStore } from "@/stores/lookups";
import { useUnsavedGuard } from "@/composables/useUnsavedGuard";
import { storeToRefs } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah } from "@/utils/formatUtils";
import { calculateMarketingFee } from "@/utils/marketingFee";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiSelect, UiSwitch, UiModal, UiEmpty } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const store = useProjectCalculatorStore();
const alertModal = useAlertModalStore();
const lookups = useLookupStore();
const { rateSetting, landingPageRateSetting, loadingRateSetting, loadingLandingPageRateSetting, saving } = storeToRefs(store);
// PPh types come from the shared lookups cache (also used by the documents).
const pphTypes = computed(() => lookups.pphTypes);

const isEditing = computed(() => !!route.params.id);
const loadingCalculation = ref(false);

const DEFAULT_RATE_DEVELOPER = 100000;
const DEFAULT_MARGIN_PERCENT = 30;

const newFeatureItem = () => ({
  name: "",
  analysis_hours: 0,
  dev_hours: 0,
  testing_hours: 0,
  deploy_hours: 0,
  complexity_factor: 1,
  buffer_percent: 15,
});

const newModuleItem = () => ({
  name: "",
  estimated_hours: 0,
  complexity_factor: 1,
  buffer_percent: 15,
});

const newAdditionalItem = () => ({
  description: "",
  amount: 1,
  price: 0,
});

const form = ref({
  name: "",
  client_name: "",
  scenario: "feature",
  pm_overhead_percent: 12,
  infra_setup_cost: 0,
  // Feature/Build: people actually working on this project -- the duration
  // uses their share of the team's capacity, not the whole team's.
  allocated_developers: 1,
  // Landing Page fields -- unused (harmless) unless scenario === 'landing_page'.
  server_type: "shared",
  design_type: "template",
  estimated_hours: 0,
  rate_developer: 0,
  developer_count: 1,
  additional_items: [],
  margin_percent: 0,
  include_ppn: false,
  ppn_percent: 11,
  include_pph: false,
  pph_type: "",
  pph_percent: 0,
  notes: "",
  items: [newFeatureItem()],
});

const errorMessage = ref("");

const stickySentinel = ref(null);
const isHeaderStuck = ref(false);
let stickyObserver = null;

onMounted(() => {
  if (stickySentinel.value) {
    stickyObserver = new IntersectionObserver(([entry]) => (isHeaderStuck.value = !entry.isIntersecting), {
      threshold: 1,
    });
    stickyObserver.observe(stickySentinel.value);
  }
});
onUnmounted(() => stickyObserver?.disconnect());

const stickyHeaderStyle = computed(() => ({
  top: "-12px",
  marginLeft: "-24px",
  marginRight: "-24px",
  marginTop: "-24px",
  transitionProperty: "background-color, box-shadow, border-color, backdrop-filter",
  ...(isHeaderStuck.value
    ? {
        backgroundColor: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderColor: "rgba(12,81,217,0.15)",
        boxShadow: "0 12px 28px -16px rgba(12,81,217,0.35)",
      }
    : {
        backgroundColor: "#fff",
        borderColor: "#F1F1F1",
      }),
}));

const referenceModal = ref(false);
const referenceCalculations = ref([]);
const referenceSearch = ref("");
const loadingReferences = ref(false);
const applyingReference = ref(false);

const openReferenceModal = async () => {
  referenceModal.value = true;
  loadingReferences.value = true;
  try {
    const { data } = await axiosInstance.get("/project-calculations", {
      params: { row_per_page: 50 },
    });
    referenceCalculations.value = data.data.data;
  } catch {
    referenceCalculations.value = [];
  } finally {
    loadingReferences.value = false;
  }
};

const filteredReferences = computed(() => {
  if (!referenceSearch.value.trim()) return referenceCalculations.value;
  const q = referenceSearch.value.trim().toLowerCase();
  return referenceCalculations.value.filter(
    (c) => c.name?.toLowerCase().includes(q) || c.client_name?.toLowerCase().includes(q)
  );
});

const applyReference = async (reference) => {
  const hasExistingWork =
    form.value.scenario === "landing_page"
      ? !!Number(form.value.estimated_hours)
      : form.value.items.some((item) => item.name?.trim());
  if (hasExistingWork && !(await alertModal.confirm(t("calculator.form.replaceConfirm", { name: reference.name })))) {
    return;
  }

  applyingReference.value = true;
  try {
    const full = await store.fetchCalculation(reference.id);
    form.value.scenario = full.scenario;

    if (full.scenario === "landing_page") {
      const lp = full.items?.[0] ?? {};
      form.value.server_type = lp.server_type ?? "shared";
      form.value.design_type = lp.design_type ?? "template";
      form.value.estimated_hours = lp.estimated_hours ?? 0;
      form.value.rate_developer = lp.rate_developer ?? DEFAULT_RATE_DEVELOPER;
      form.value.developer_count = lp.developer_count ?? 1;
      form.value.additional_items = (lp.additional_items ?? []).map((i) => ({
        description: i.description,
        amount: i.amount,
        price: i.price,
      }));
      form.value.margin_percent = full.margin_percent ?? DEFAULT_MARGIN_PERCENT;
      form.value.items = [];
    } else {
      form.value.items = full.items.map((item) =>
        full.scenario === "feature"
          ? {
              name: item.name,
              analysis_hours: item.analysis_hours,
              dev_hours: item.dev_hours,
              testing_hours: item.testing_hours,
              deploy_hours: item.deploy_hours,
              complexity_factor: item.complexity_factor,
              buffer_percent: item.buffer_percent,
            }
          : {
              name: item.name,
              estimated_hours: item.estimated_hours,
              complexity_factor: item.complexity_factor,
              buffer_percent: item.buffer_percent,
            }
      );
    }
    referenceModal.value = false;
  } finally {
    applyingReference.value = false;
  }
};

// Unsaved-changes guard: compares the form with how it looked once loaded
// (or right after saving).
const baseline = ref(null);
const markClean = () => (baseline.value = JSON.stringify(form.value));
useUnsavedGuard(() => baseline.value !== null && JSON.stringify(form.value) !== baseline.value);

onMounted(async () => {
  if (isEditing.value) loadingCalculation.value = true;
  const [, , calcResult] = await Promise.allSettled([
    store.ensureRateSettings(),
    lookups.ensure("pphTypes"),
    isEditing.value ? store.fetchCalculation(route.params.id, { maxAge: 30_000 }) : null,
  ]);
  form.value.pm_overhead_percent = rateSetting.value.pm_overhead_percent;
  form.value.infra_setup_cost = rateSetting.value.default_infra_setup_cost;
  form.value.rate_developer = DEFAULT_RATE_DEVELOPER;
  form.value.margin_percent = DEFAULT_MARGIN_PERCENT;

  if (isEditing.value) {
    try {
      if (calcResult.status === "rejected") throw calcResult.reason;
      const calc = calcResult.value;
      const lp = calc.scenario === "landing_page" ? (calc.items?.[0] ?? {}) : null;

      form.value = {
        name: calc.name,
        client_name: calc.client_name ?? "",
        scenario: calc.scenario,
        pm_overhead_percent: calc.pm_overhead_percent ?? rateSetting.value.pm_overhead_percent,
        infra_setup_cost: calc.infra_setup_cost ?? rateSetting.value.default_infra_setup_cost,
        // Estimates saved before this field existed assumed the whole team.
        allocated_developers: calc.allocated_developers ?? (rateSetting.value.team_size || 1),
        server_type: lp?.server_type ?? "shared",
        design_type: lp?.design_type ?? "template",
        estimated_hours: lp?.estimated_hours ?? 0,
        rate_developer: lp?.rate_developer ?? DEFAULT_RATE_DEVELOPER,
        developer_count: lp?.developer_count ?? 1,
        additional_items: (lp?.additional_items ?? []).map((i) => ({
          description: i.description,
          amount: i.amount,
          price: i.price,
        })),
        margin_percent: calc.margin_percent ?? DEFAULT_MARGIN_PERCENT,
        include_ppn: calc.include_ppn,
        ppn_percent: calc.ppn_percent,
        include_pph: calc.include_pph,
        pph_type: calc.pph_type ?? "",
        pph_percent: calc.pph_percent ?? 0,
        notes: calc.notes ?? "",
        items:
          calc.scenario === "landing_page"
            ? []
            : calc.items.map((item) =>
                calc.scenario === "feature"
                  ? {
                      name: item.name,
                      analysis_hours: item.analysis_hours,
                      dev_hours: item.dev_hours,
                      testing_hours: item.testing_hours,
                      deploy_hours: item.deploy_hours,
                      complexity_factor: item.complexity_factor,
                      buffer_percent: item.buffer_percent,
                    }
                  : {
                      name: item.name,
                      estimated_hours: item.estimated_hours,
                      complexity_factor: item.complexity_factor,
                      buffer_percent: item.buffer_percent,
                    }
              ),
      };
    } catch (error) {
      errorMessage.value = t("calculator.detail.notFound");
    } finally {
      loadingCalculation.value = false;
    }
  }
  markClean();
});

const switchScenario = (scenario) => {
  if (form.value.scenario === scenario) return;
  form.value.scenario = scenario;

  if (scenario === "landing_page") {
    form.value.server_type = "shared";
    form.value.design_type = "template";
    form.value.estimated_hours = 0;
    form.value.rate_developer = DEFAULT_RATE_DEVELOPER;
    form.value.developer_count = 1;
    form.value.additional_items = [];
    form.value.margin_percent = DEFAULT_MARGIN_PERCENT;
    form.value.items = [];
  } else {
    form.value.items = [scenario === "feature" ? newFeatureItem() : newModuleItem()];
  }
};

const addItem = () => {
  form.value.items.push(form.value.scenario === "feature" ? newFeatureItem() : newModuleItem());
};

const removeItem = (index) => {
  if (form.value.items.length === 1) return;
  form.value.items.splice(index, 1);
};

const addAdditionalItem = () => {
  form.value.additional_items.push(newAdditionalItem());
};

const removeAdditionalItem = (index) => {
  form.value.additional_items.splice(index, 1);
};

// Live client-side calculation mirroring the backend service exactly, so
// the totals update as the user types instead of waiting on a round trip.
const computedItems = computed(() => {
  const rate = rateSetting.value.rate_sell_per_hour;
  return form.value.items.map((item) => {
    const baseHours =
      form.value.scenario === "feature"
        ? Number(item.analysis_hours || 0) +
          Number(item.dev_hours || 0) +
          Number(item.testing_hours || 0) +
          Number(item.deploy_hours || 0)
        : Number(item.estimated_hours || 0);

    const complexityFactor = Number(item.complexity_factor || 1);
    const totalHoursUsed = baseHours * complexityFactor;
    const subtotal = totalHoursUsed * rate;
    const bufferPercent = Number(item.buffer_percent || 0);
    const bufferAmount = subtotal * (bufferPercent / 100);
    const finalPrice = subtotal + bufferAmount;

    return { baseHours, totalHoursUsed, subtotal, bufferAmount, finalPrice };
  });
});

const landingPageServerCost = computed(() =>
  form.value.server_type === "dedicated"
    ? Number(landingPageRateSetting.value.server_dedicated_price || 0)
    : Number(landingPageRateSetting.value.server_shared_price || 0)
);
const landingPageDesignCost = computed(() =>
  form.value.design_type === "dedicated"
    ? Number(landingPageRateSetting.value.design_dedicated_price || 0)
    : Number(landingPageRateSetting.value.design_template_price || 0)
);
const landingPageDevelopmentCost = computed(
  () =>
    Number(form.value.estimated_hours || 0) *
    Number(form.value.rate_developer || 0) *
    Math.max(1, Number(form.value.developer_count || 1))
);
const landingPageAdditionalItemsTotal = computed(() =>
  form.value.additional_items.reduce((sum, i) => sum + Number(i.amount || 0) * Number(i.price || 0), 0)
);
const landingPageSubtotal = computed(
  () =>
    landingPageServerCost.value +
    landingPageDesignCost.value +
    landingPageDevelopmentCost.value +
    landingPageAdditionalItemsTotal.value
);
const landingPageMarginTotal = computed(() => landingPageSubtotal.value * (Number(form.value.margin_percent || 0) / 100));

const itemsTotal = computed(() =>
  form.value.scenario === "landing_page"
    ? landingPageSubtotal.value
    : computedItems.value.reduce((sum, i) => sum + i.finalPrice, 0)
);
const subtotalSum = computed(() =>
  form.value.scenario === "landing_page"
    ? landingPageSubtotal.value
    : computedItems.value.reduce((sum, i) => sum + i.subtotal, 0)
);
const bufferSum = computed(() =>
  form.value.scenario === "landing_page" ? 0 : computedItems.value.reduce((sum, i) => sum + i.bufferAmount, 0)
);
const totalHoursSum = computed(() =>
  form.value.scenario === "landing_page"
    ? Number(form.value.estimated_hours || 0)
    : computedItems.value.reduce((sum, i) => sum + i.totalHoursUsed, 0)
);

const pmOverheadTotal = computed(() =>
  form.value.scenario === "build" ? itemsTotal.value * (Number(form.value.pm_overhead_percent || 0) / 100) : 0
);

const grandTotal = computed(() => {
  if (form.value.scenario === "build") {
    return itemsTotal.value + pmOverheadTotal.value + Number(form.value.infra_setup_cost || 0);
  }
  if (form.value.scenario === "landing_page") {
    return landingPageSubtotal.value + landingPageMarginTotal.value;
  }
  return itemsTotal.value;
});

// Reference only -- a fair starting point for whoever brought in this deal
// (Marketing / B2B-B2C Sales), never added to the client-facing total.
const marketingFee = computed(() => calculateMarketingFee(grandTotal.value));

const ppnAmount = computed(() =>
  form.value.include_ppn ? grandTotal.value * (Number(form.value.ppn_percent || 0) / 100) : 0
);
const totalWithPpn = computed(() => grandTotal.value + ppnAmount.value);

const handlePphTypeChange = () => {
  const selected = pphTypes.value.find((t) => t.value === form.value.pph_type);
  if (selected?.default_rate !== null && selected?.default_rate !== undefined) {
    form.value.pph_percent = selected.default_rate;
  }
};
const pphAmount = computed(() =>
  form.value.include_pph ? grandTotal.value * (Number(form.value.pph_percent || 0) / 100) : 0
);
const netReceived = computed(() => (form.value.include_ppn ? totalWithPpn.value : grandTotal.value) - pphAmount.value);

const estimatedDurationWeeks = computed(() => {
  if (form.value.scenario === "landing_page") {
    const devCount = Math.max(1, Number(form.value.developer_count || 1));
    const hours = Number(form.value.estimated_hours || 0);
    return hours > 0 ? Math.ceil(hours / devCount / 40) : null;
  }
  const capacityPerWeek = allocatedCapacityPerMonth.value / 4.33;
  return capacityPerWeek > 0 ? Math.ceil(totalHoursSum.value / capacityPerWeek) : null;
});

// Mirrors ProjectCalculatorService: average productive hours per person in
// the Team Rate Setup x people allocated to this project.
const hoursPerPerson = computed(() => {
  const size = Number(rateSetting.value.team_size || 0);
  return size > 0 ? Number(rateSetting.value.total_productive_hours_per_month || 0) / size : 0;
});

const allocatedCapacityPerMonth = computed(() => {
  const allocated = Math.max(1, Number(form.value.allocated_developers || 1));
  return hoursPerPerson.value > 0
    ? hoursPerPerson.value * allocated
    : Number(rateSetting.value.total_productive_hours_per_month || 0);
});

const estimatedDurationMonths = computed(() =>
  estimatedDurationWeeks.value ? (estimatedDurationWeeks.value / 4.33).toFixed(1).replace(".", ",") : null
);

const canSave = computed(() => {
  if (!form.value.name) return false;
  if (form.value.include_pph && !form.value.pph_type) return false;
  if (form.value.scenario === "landing_page") {
    return !!form.value.server_type && !!form.value.design_type && Number(form.value.estimated_hours) > 0;
  }
  if (form.value.items.length === 0) return false;
  return form.value.items.every((item) => item.name && item.name.trim().length > 0);
});

// ---- Presentation-only helpers (no calculation logic) ----
const scenarioCards = computed(() => [
  { value: "feature", label: t("calculator.scenario.feature"), desc: t("calculator.form.scenarioDesc.feature"), icon: PuzzleIcon },
  { value: "build", label: t("calculator.scenario.build"), desc: t("calculator.form.scenarioDesc.build"), icon: Layers3Icon },
  { value: "landing_page", label: t("calculator.scenario.landingPage"), desc: t("calculator.form.scenarioDesc.landingPage"), icon: Globe },
]);
const scenarioLabel = (s) =>
  s === "feature" ? t("calculator.scenario.feature") : s === "build" ? t("calculator.scenario.build") : t("calculator.scenario.landingPage");
const serverOptions = computed(() => [
  { value: "dedicated", label: t("calculator.form.lp.dedicated"), price: landingPageRateSetting.value.server_dedicated_price },
  { value: "shared", label: t("calculator.form.lp.shared"), price: landingPageRateSetting.value.server_shared_price },
]);
const designOptions = computed(() => [
  { value: "dedicated", label: t("calculator.form.lp.dedicated"), price: landingPageRateSetting.value.design_dedicated_price },
  { value: "template", label: t("calculator.form.lp.template"), price: landingPageRateSetting.value.design_template_price },
]);
const pphOptions = computed(() =>
  pphTypes.value.map((type) => ({
    value: type.value,
    label: `${type.label}${type.default_rate !== null ? ` (${type.default_rate}%)` : ""}`,
  }))
);
const noSpin = "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const cellInput =
  noSpin +
  " w-full h-8 px-2 text-right tabular-nums text-ui-small text-ui-ink bg-ui-surface border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const cellText =
  "w-full h-8 px-2.5 text-ui-small font-medium text-ui-ink placeholder:text-ui-faint placeholder:font-normal bg-ui-surface border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const fieldInput =
  "w-full h-[38px] px-3 text-right tabular-nums text-ui-body text-ui-ink bg-ui-surface border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-muted";
const fieldLabel = "block text-ui-small font-medium text-ui-ink mb-1.5";
const cellLabel = "block text-ui-cap text-ui-muted mb-1";
const iconBtn =
  "ui-press w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-faint hover:bg-ui-bad-soft hover:text-ui-bad disabled:opacity-30 disabled:pointer-events-none";

const submit = async () => {
  errorMessage.value = "";
  if (!canSave.value) {
    errorMessage.value = t("calculator.form.requiredError");
    return;
  }

  try {
    const saved = isEditing.value
      ? await store.updateCalculation(route.params.id, form.value)
      : await store.createCalculation(form.value);

    markClean();
    router.push({ name: "admin.project-calculator.detail", params: { id: saved.id } });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value =
      data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t("calculator.form.saveFailed"));
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="isEditing ? $t('calculator.form.editTitle') : $t('calculator.dashboard.createNew')"
      :subtitle="$t('calculator.form.subtitle')"
    >
      <template #eyebrow>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
          :aria-label="$t('common.actions.back')"
          @click="router.back()"
        >
          <ArrowLeft class="w-4 h-4" /> {{ $t("common.actions.back") }}
        </button>
      </template>
      <template #actions>
        <UiButton variant="secondary" @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton :icon="SaveIcon" :loading="saving" :disabled="!canSave" @click="submit">
          {{ saving ? $t("common.actions.saving") : isEditing ? $t("common.actions.saveChanges") : $t("calculator.form.saveEstimate") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <Alert type="danger" :title="errorMessage" message="" :show="!!errorMessage" @close="errorMessage = ''" />

    <div
      v-if="loadingCalculation || loadingRateSetting || loadingLandingPageRateSetting"
      class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5"
    >
      <div class="space-y-5">
        <Skeleton height="180px" rounded="12px" />
        <Skeleton height="320px" rounded="12px" />
      </div>
      <Skeleton height="420px" rounded="12px" />
    </div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
      <!-- Main form -->
      <div class="space-y-5 min-w-0">
        <!-- Basic info -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card px-4 sm:px-6 py-5 space-y-5">
          <h2 class="text-ui-h2 text-ui-ink">{{ $t("calculator.form.details") }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.name" :label="$t('calculator.form.name')" required :placeholder="$t('calculator.form.namePlaceholder')" />
            <UiInput v-model="form.client_name" :label="$t('calculator.form.clientName')" :placeholder="$t('calculator.form.clientPlaceholder')" />
          </div>

          <!-- Scenario toggle -->
          <div>
            <p :class="fieldLabel">{{ $t("calculator.dashboard.columns.scenario") }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                v-for="card in scenarioCards"
                :key="card.value"
                type="button"
                :aria-pressed="form.scenario === card.value"
                class="ui-press flex items-start gap-3 p-3.5 rounded-ui-card border text-left transition-colors"
                :class="
                  form.scenario === card.value
                    ? 'border-ui-accent bg-ui-accent-soft shadow-ui-focus'
                    : 'border-ui-line bg-ui-surface hover:bg-ui-hover'
                "
                @click="switchScenario(card.value)"
              >
                <span
                  class="w-9 h-9 rounded-ui-control flex items-center justify-center shrink-0"
                  :class="form.scenario === card.value ? 'bg-ui-surface text-ui-accent' : 'bg-ui-subtle text-ui-muted'"
                >
                  <component :is="card.icon" class="w-[18px] h-[18px]" />
                </span>
                <span class="min-w-0">
                  <span class="block text-ui-h3 text-ui-ink">{{ card.label }}</span>
                  <span class="block text-ui-cap text-ui-muted mt-0.5">{{ card.desc }}</span>
                </span>
              </button>
            </div>
          </div>
        </section>

        <!-- Items -->
        <section v-if="form.scenario !== 'landing_page'" class="bg-ui-surface border border-ui-line rounded-ui-card">
          <div ref="stickySentinel" class="h-px -mb-px"></div>

          <div
            class="sticky top-0 z-10 bg-ui-surface border-b border-ui-line px-4 sm:px-6 pt-4 pb-3 transition-shadow duration-ui-base"
            :class="isHeaderStuck ? 'shadow-ui-raised' : 'rounded-t-ui-card'"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <h2 class="text-ui-h2 text-ui-ink">{{ form.scenario === "feature" ? $t("calculator.form.featureList") : $t("calculator.form.moduleList") }}</h2>
                <UiBadge class="tabular-nums">{{ form.items.length }}</UiBadge>
              </div>
              <div class="flex items-center gap-1.5">
                <UiButton v-if="!isEditing" variant="secondary" size="sm" :icon="History" @click="openReferenceModal">
                  {{ $t("calculator.form.loadPrevious") }}
                </UiButton>
                <UiButton variant="secondary" size="sm" :icon="PlusIcon" @click="addItem">
                  {{ form.scenario === "feature" ? $t("calculator.form.addFeature") : $t("calculator.form.addModule") }}
                </UiButton>
              </div>
            </div>
            <p class="flex items-start gap-1.5 text-ui-cap text-ui-muted mt-2">
              <InfoIcon class="w-3.5 h-3.5 shrink-0 mt-px" />
              {{ $t("calculator.form.complexityHint") }}
            </p>
          </div>

          <!-- Desktop: editable line table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full border-collapse table-fixed min-w-[620px]">
              <colgroup>
                <col class="w-10" />
                <col />
                <template v-if="form.scenario === 'feature'">
                  <col class="w-[74px]" /><col class="w-[74px]" /><col class="w-[74px]" /><col class="w-[74px]" />
                </template>
                <col v-else class="w-[110px]" />
                <col class="w-[68px]" />
                <col class="w-[64px]" />
                <col class="w-[120px]" />
                <col class="w-11" />
              </colgroup>
              <thead>
                <tr class="text-ui-cap font-medium text-ui-muted align-bottom">
                  <th class="pl-5 pr-0 py-2.5 text-left font-medium border-b border-ui-line">#</th>
                  <th class="px-2 py-2.5 text-left font-medium border-b border-ui-line">
                    {{ form.scenario === "feature" ? $t("calculator.form.featureName") : $t("calculator.form.moduleName") }}
                  </th>
                  <template v-if="form.scenario === 'feature'">
                    <th class="px-1 py-2.5 text-right font-medium border-b border-ui-line leading-tight">{{ $t("calculator.form.hours.analysis") }}</th>
                    <th class="px-1 py-2.5 text-right font-medium border-b border-ui-line leading-tight">{{ $t("calculator.form.hours.development") }}</th>
                    <th class="px-1 py-2.5 text-right font-medium border-b border-ui-line leading-tight">{{ $t("calculator.form.hours.testing") }}</th>
                    <th class="px-1 py-2.5 text-right font-medium border-b border-ui-line leading-tight">{{ $t("calculator.form.hours.deployment") }}</th>
                  </template>
                  <th v-else class="px-1 py-2.5 text-right font-medium border-b border-ui-line leading-tight">{{ $t("calculator.form.hours.estimated") }}</th>
                  <th class="px-1 py-2.5 text-right font-medium border-b border-ui-line leading-tight">{{ $t("calculator.form.complexity") }}</th>
                  <th class="px-1 py-2.5 text-right font-medium border-b border-ui-line leading-tight">{{ $t("calculator.form.bufferPercent") }}</th>
                  <th class="px-2 py-2.5 text-right font-medium border-b border-ui-line">{{ $t("calculator.form.finalPrice") }}</th>
                  <th class="pr-3 py-2.5 border-b border-ui-line"><span class="sr-only">{{ $t("common.actions.remove") }}</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in form.items" :key="index" class="border-b border-ui-line last:border-b-0 hover:bg-ui-subtle/60">
                  <td class="pl-5 pr-0 py-2.5 text-ui-cap text-ui-faint tabular-nums">{{ index + 1 }}</td>
                  <td class="px-2 py-2.5">
                    <input
                      v-model="item.name"
                      type="text"
                      :placeholder="form.scenario === 'feature' ? $t('calculator.form.featureName') : $t('calculator.form.moduleName')"
                      :aria-label="form.scenario === 'feature' ? $t('calculator.form.featureName') : $t('calculator.form.moduleName')"
                      :class="cellText"
                    />
                  </td>
                  <template v-if="form.scenario === 'feature'">
                    <td class="px-1 py-2.5"><input v-model.number="item.analysis_hours" type="number" min="0" step="0.5" :aria-label="$t('calculator.form.hours.analysis')" :class="cellInput" /></td>
                    <td class="px-1 py-2.5"><input v-model.number="item.dev_hours" type="number" min="0" step="0.5" :aria-label="$t('calculator.form.hours.development')" :class="cellInput" /></td>
                    <td class="px-1 py-2.5"><input v-model.number="item.testing_hours" type="number" min="0" step="0.5" :aria-label="$t('calculator.form.hours.testing')" :class="cellInput" /></td>
                    <td class="px-1 py-2.5"><input v-model.number="item.deploy_hours" type="number" min="0" step="0.5" :aria-label="$t('calculator.form.hours.deployment')" :class="cellInput" /></td>
                  </template>
                  <td v-else class="px-1 py-2.5">
                    <input v-model.number="item.estimated_hours" type="number" min="0" step="0.5" :aria-label="$t('calculator.form.hours.estimated')" :class="cellInput" />
                  </td>
                  <td class="px-1 py-2.5"><input v-model.number="item.complexity_factor" type="number" min="0.1" step="0.1" :aria-label="$t('calculator.form.complexity')" :class="cellInput" /></td>
                  <td class="px-1 py-2.5"><input v-model.number="item.buffer_percent" type="number" min="0" max="100" step="1" :aria-label="$t('calculator.form.bufferPercent')" :class="cellInput" /></td>
                  <td class="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                    <span class="block text-ui-small font-semibold text-ui-ink">{{ formatRupiah(computedItems[index]?.finalPrice ?? 0) }}</span>
                    <span class="block text-ui-cap text-ui-muted">{{ computedItems[index]?.totalHoursUsed.toFixed(1) }}h</span>
                  </td>
                  <td class="pr-3 py-2.5 text-right">
                    <button
                      type="button"
                      :class="iconBtn"
                      :disabled="form.items.length === 1"
                      :aria-label="$t('common.actions.remove')"
                      :title="$t('common.actions.remove')"
                      @click="removeItem(index)"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Phones: stacked item cards -->
          <ul class="md:hidden divide-y divide-ui-line">
            <li v-for="(item, index) in form.items" :key="index" class="px-4 py-4 space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ index + 1 }}</span>
                <input
                  v-model="item.name"
                  type="text"
                  :placeholder="form.scenario === 'feature' ? $t('calculator.form.featureName') : $t('calculator.form.moduleName')"
                  :aria-label="form.scenario === 'feature' ? $t('calculator.form.featureName') : $t('calculator.form.moduleName')"
                  :class="[cellText, 'h-[38px] flex-1']"
                />
                <button
                  type="button"
                  :class="iconBtn"
                  :disabled="form.items.length === 1"
                  :aria-label="$t('common.actions.remove')"
                  @click="removeItem(index)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2.5 pl-7">
                <template v-if="form.scenario === 'feature'">
                  <label><span :class="cellLabel">{{ $t("calculator.form.hours.analysis") }}</span><input v-model.number="item.analysis_hours" type="number" min="0" step="0.5" :class="[cellInput, 'h-[38px]']" /></label>
                  <label><span :class="cellLabel">{{ $t("calculator.form.hours.development") }}</span><input v-model.number="item.dev_hours" type="number" min="0" step="0.5" :class="[cellInput, 'h-[38px]']" /></label>
                  <label><span :class="cellLabel">{{ $t("calculator.form.hours.testing") }}</span><input v-model.number="item.testing_hours" type="number" min="0" step="0.5" :class="[cellInput, 'h-[38px]']" /></label>
                  <label><span :class="cellLabel">{{ $t("calculator.form.hours.deployment") }}</span><input v-model.number="item.deploy_hours" type="number" min="0" step="0.5" :class="[cellInput, 'h-[38px]']" /></label>
                </template>
                <label v-else class="col-span-2">
                  <span :class="cellLabel">{{ $t("calculator.form.hours.estimated") }}</span>
                  <input v-model.number="item.estimated_hours" type="number" min="0" step="0.5" :class="[cellInput, 'h-[38px]']" />
                </label>
                <label><span :class="cellLabel">{{ $t("calculator.form.complexity") }}</span><input v-model.number="item.complexity_factor" type="number" min="0.1" step="0.1" :class="[cellInput, 'h-[38px]']" /></label>
                <label><span :class="cellLabel">{{ $t("calculator.form.bufferPercent") }}</span><input v-model.number="item.buffer_percent" type="number" min="0" max="100" step="1" :class="[cellInput, 'h-[38px]']" /></label>
              </div>
              <div class="flex items-center justify-between pl-7 text-ui-small">
                <span class="text-ui-muted tabular-nums">{{ $t("calculator.form.hoursUsed", { n: computedItems[index]?.totalHoursUsed.toFixed(1) }) }}</span>
                <span class="text-ui-ink font-semibold tabular-nums">{{ formatRupiah(computedItems[index]?.finalPrice ?? 0) }}</span>
              </div>
            </li>
          </ul>

          <div class="border-t border-ui-line px-3 sm:px-4 py-2">
            <UiButton variant="ghost" size="sm" :icon="PlusIcon" @click="addItem">
              {{ form.scenario === "feature" ? $t("calculator.form.addFeature") : $t("calculator.form.addModule") }}
            </UiButton>
          </div>
        </section>

        <!-- Landing Page Configuration -->
        <section v-if="form.scenario === 'landing_page'" class="bg-ui-surface border border-ui-line rounded-ui-card">
          <div class="px-4 sm:px-6 pt-5 pb-4 border-b border-ui-line">
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("calculator.form.lp.title") }}</h2>
          </div>

          <div class="px-4 sm:px-6 py-5 space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <!-- Server -->
              <div>
                <p :class="fieldLabel">{{ $t("calculator.lpModal.server") }}</p>
                <div class="grid grid-cols-2 gap-2.5">
                  <button
                    v-for="opt in serverOptions"
                    :key="opt.value"
                    type="button"
                    :aria-pressed="form.server_type === opt.value"
                    class="ui-press flex flex-col items-start gap-0.5 p-3 rounded-ui-control border text-left transition-colors"
                    :class="form.server_type === opt.value ? 'border-ui-accent bg-ui-accent-soft shadow-ui-focus' : 'border-ui-line bg-ui-surface hover:bg-ui-hover'"
                    @click="form.server_type = opt.value"
                  >
                    <span class="text-ui-small font-medium text-ui-ink">{{ opt.label }}</span>
                    <span class="text-ui-small tabular-nums" :class="form.server_type === opt.value ? 'text-ui-accent' : 'text-ui-muted'">{{ formatRupiah(opt.price) }}</span>
                  </button>
                </div>
              </div>

              <!-- Design -->
              <div>
                <p :class="fieldLabel">{{ $t("calculator.lpModal.design") }}</p>
                <div class="grid grid-cols-2 gap-2.5">
                  <button
                    v-for="opt in designOptions"
                    :key="opt.value"
                    type="button"
                    :aria-pressed="form.design_type === opt.value"
                    class="ui-press flex flex-col items-start gap-0.5 p-3 rounded-ui-control border text-left transition-colors"
                    :class="form.design_type === opt.value ? 'border-ui-accent bg-ui-accent-soft shadow-ui-focus' : 'border-ui-line bg-ui-surface hover:bg-ui-hover'"
                    @click="form.design_type = opt.value"
                  >
                    <span class="text-ui-small font-medium text-ui-ink">{{ opt.label }}</span>
                    <span class="text-ui-small tabular-nums" :class="form.design_type === opt.value ? 'text-ui-accent' : 'text-ui-muted'">{{ formatRupiah(opt.price) }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Development -->
            <div>
              <p class="text-ui-h3 text-ui-ink mb-2.5">{{ $t("calculator.form.lp.development") }}</p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label class="block">
                  <span :class="fieldLabel">{{ $t("calculator.form.lp.estimatedHours") }}</span>
                  <input v-model.number="form.estimated_hours" type="number" min="0" step="0.5" :class="fieldInput" />
                </label>
                <label class="block">
                  <span :class="fieldLabel">{{ $t("calculator.form.lp.rateDeveloper") }}</span>
                  <input v-model.number="form.rate_developer" type="number" min="0" step="1000" :class="fieldInput" />
                </label>
                <label class="block">
                  <span :class="fieldLabel">{{ $t("calculator.form.lp.developerCount") }}</span>
                  <input v-model.number="form.developer_count" type="number" min="1" step="1" :class="fieldInput" />
                </label>
              </div>
              <div class="flex items-center justify-between mt-3 pt-3 border-t border-ui-line text-ui-small">
                <span class="text-ui-muted">{{ $t("calculator.form.lp.developmentCost") }}</span>
                <span class="text-ui-ink font-semibold tabular-nums">{{ formatRupiah(landingPageDevelopmentCost) }}</span>
              </div>
            </div>

            <!-- Additional Items (optional) -->
            <div>
              <div class="flex items-center justify-between gap-2 mb-2.5">
                <p class="text-ui-h3 text-ui-ink">{{ $t("calculator.form.lp.additionalOptional") }}</p>
                <UiButton variant="secondary" size="sm" :icon="PlusIcon" @click="addAdditionalItem">{{ $t("calculator.form.lp.addItem") }}</UiButton>
              </div>

              <div
                v-if="form.additional_items.length === 0"
                class="text-ui-cap text-ui-muted border border-dashed border-ui-line-strong rounded-ui-control py-4 px-3 text-center"
              >
                {{ $t("calculator.form.lp.noAdditional") }}
              </div>

              <div v-else class="border border-ui-line rounded-ui-control overflow-hidden">
                <div class="hidden sm:grid grid-cols-[28px_minmax(0,1fr)_88px_150px_120px_32px] gap-2 items-center px-3 h-9 bg-ui-subtle text-ui-cap font-medium text-ui-muted border-b border-ui-line">
                  <span>#</span><span>{{ $t("common.labels.description") }}</span><span class="text-right">{{ $t("calculator.form.lp.qty") }}</span><span class="text-right">{{ $t("calculator.form.lp.price") }}</span><span class="text-right">{{ $t("calculator.form.subtotal") }}</span><span></span>
                </div>
                <div
                  v-for="(item, index) in form.additional_items"
                  :key="index"
                  class="grid grid-cols-[28px_minmax(0,1fr)_32px] sm:grid-cols-[28px_minmax(0,1fr)_88px_150px_120px_32px] gap-2 items-center px-3 py-2.5 border-b border-ui-line last:border-b-0"
                >
                  <span class="text-ui-cap text-ui-faint tabular-nums">{{ index + 1 }}</span>
                  <input v-model="item.description" type="text" :placeholder="$t('calculator.form.lp.itemPlaceholder')" :aria-label="$t('common.labels.description')" :class="cellText" />
                  <button type="button" :class="[iconBtn, 'sm:order-last']" :aria-label="$t('common.actions.remove')" :title="$t('common.actions.remove')" @click="removeAdditionalItem(index)">
                    <Trash2 class="w-4 h-4" />
                  </button>
                  <label class="col-start-2 sm:col-start-auto">
                    <span class="sm:sr-only text-ui-cap text-ui-muted">{{ $t("calculator.form.lp.qty") }}</span>
                    <input v-model.number="item.amount" type="number" min="0" step="1" :class="cellInput" />
                  </label>
                  <label class="col-start-2 sm:col-start-auto">
                    <span class="sm:sr-only text-ui-cap text-ui-muted">{{ $t("calculator.form.lp.price") }}</span>
                    <input v-model.number="item.price" type="number" min="0" step="1000" :class="cellInput" />
                  </label>
                  <span class="col-start-2 sm:col-start-auto text-right text-ui-small font-medium text-ui-ink tabular-nums whitespace-nowrap">
                    {{ formatRupiah(Number(item.amount || 0) * Number(item.price || 0)) }}
                  </span>
                </div>
                <div class="flex items-center justify-between px-3 py-2.5 bg-ui-subtle text-ui-small border-t border-ui-line">
                  <span class="text-ui-muted">{{ $t("calculator.form.lp.additionalTotal") }}</span>
                  <span class="text-ui-ink font-semibold tabular-nums">{{ formatRupiah(landingPageAdditionalItemsTotal) }}</span>
                </div>
              </div>
            </div>

            <!-- Margin -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <label class="block">
                <span :class="fieldLabel">{{ $t("calculator.form.lp.marginPercent") }}</span>
                <input v-model.number="form.margin_percent" type="number" min="0" step="1" :class="fieldInput" />
              </label>
              <p class="flex items-center justify-between sm:justify-end gap-2 h-[38px] text-ui-small text-ui-muted">
                {{ $t("calculator.form.lp.marginAmount") }}: <strong class="text-ui-ink font-semibold tabular-nums">{{ formatRupiah(landingPageMarginTotal) }}</strong>
              </p>
            </div>
          </div>
        </section>

        <!-- Build-only extra fields -->
        <section v-if="form.scenario === 'build'" class="bg-ui-surface border border-ui-line rounded-ui-card px-4 sm:px-6 py-5">
          <h2 class="text-ui-h2 text-ui-ink mb-4">{{ $t("calculator.form.overhead.title") }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="block">
              <span :class="fieldLabel">{{ $t("calculator.form.overhead.pmPercent") }}</span>
              <input v-model.number="form.pm_overhead_percent" type="number" min="0" max="100" step="0.5" :class="fieldInput" />
            </label>
            <label class="block">
              <span :class="fieldLabel">{{ $t("calculator.form.overhead.infraSetup") }}</span>
              <input v-model.number="form.infra_setup_cost" type="number" min="0" :class="fieldInput" />
            </label>
          </div>
        </section>

        <!-- Tax + Notes -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card px-4 sm:px-6 py-5 space-y-4">
          <h2 class="text-ui-h2 text-ui-ink">{{ $t("calculator.form.tax.title") }}</h2>

          <div class="border border-ui-line rounded-ui-control divide-y divide-ui-line">
            <div class="px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <UiSwitch v-model="form.include_ppn" :label="$t('calculator.form.tax.includePpn')" class="flex-1" />
              </div>
              <div v-if="form.include_ppn" class="flex items-center gap-2 mt-3">
                <span class="w-24"><input v-model.number="form.ppn_percent" type="number" min="0" max="100" step="0.5" :aria-label="$t('calculator.form.tax.ppnPercent')" :class="fieldInput" /></span>
                <span class="text-ui-small text-ui-muted">%</span>
              </div>
            </div>

            <div class="px-4 py-3">
              <UiSwitch
                v-model="form.include_pph"
                :label="$t('calculator.form.tax.includePph')"
                :description="$t('calculator.form.tax.includePphHint')"
              />
              <div v-if="form.include_pph" class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UiSelect
                  v-model="form.pph_type"
                  :label="$t('calculator.form.tax.pphType')"
                  :placeholder="$t('calculator.form.tax.pphTypePlaceholder')"
                  :options="pphOptions"
                  @update:model-value="handlePphTypeChange"
                />
                <label class="block">
                  <span :class="fieldLabel">{{ $t("calculator.form.tax.pphRate") }}</span>
                  <input
                    v-model.number="form.pph_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    :disabled="form.pph_type !== 'custom' && form.pph_type !== ''"
                    :class="fieldInput"
                  />
                </label>
              </div>
            </div>
          </div>

          <UiInput v-model="form.notes" :label="$t('calculator.form.notes')" :rows="3" :placeholder="$t('calculator.form.notesPlaceholder')" />
        </section>
      </div>

      <!-- Summary sidebar -->
      <aside class="space-y-4 xl:sticky xl:top-4">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4">
          <div class="flex items-center justify-between gap-2 mb-3">
            <h2 class="text-ui-h3 text-ui-ink">{{ $t("calculator.form.summary.title") }}</h2>
            <UiBadge tone="outline">{{ scenarioLabel(form.scenario) }}</UiBadge>
          </div>

          <dl class="space-y-2 text-ui-small">
            <div v-if="form.scenario !== 'landing_page'" class="flex items-center justify-between gap-3 pb-2 border-b border-ui-line">
              <dt class="text-ui-muted">{{ $t("calculator.form.summary.rateSell") }}</dt>
              <dd class="text-ui-ink font-medium tabular-nums">{{ formatRupiah(rateSetting.rate_sell_per_hour) }}</dd>
            </div>
            <template v-if="form.scenario === 'landing_page'">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">{{ $t("calculator.lpModal.server") }} ({{ form.server_type === "dedicated" ? $t("calculator.form.lp.dedicated") : $t("calculator.form.lp.shared") }})</dt>
                <dd class="text-ui-ink tabular-nums">{{ formatRupiah(landingPageServerCost) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">{{ $t("calculator.lpModal.design") }} ({{ form.design_type === "dedicated" ? $t("calculator.form.lp.dedicated") : $t("calculator.form.lp.template") }})</dt>
                <dd class="text-ui-ink tabular-nums">{{ formatRupiah(landingPageDesignCost) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">{{ $t("calculator.form.lp.development") }}</dt>
                <dd class="text-ui-ink tabular-nums">{{ formatRupiah(landingPageDevelopmentCost) }}</dd>
              </div>
              <div v-if="form.additional_items.length > 0" class="flex items-center justify-between gap-3">
                <dt class="text-ui-muted">{{ $t("calculator.form.lp.additional") }} ({{ form.additional_items.length }})</dt>
                <dd class="text-ui-ink tabular-nums">{{ formatRupiah(landingPageAdditionalItemsTotal) }}</dd>
              </div>
            </template>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-ui-muted">{{ $t("calculator.form.subtotal") }}</dt>
              <dd class="text-ui-ink tabular-nums">{{ formatRupiah(subtotalSum) }}</dd>
            </div>
            <div v-if="form.scenario !== 'landing_page'" class="flex items-center justify-between gap-3">
              <dt class="text-ui-muted">{{ $t("calculator.form.summary.buffer") }}</dt>
              <dd class="text-ui-ink tabular-nums">{{ formatRupiah(bufferSum) }}</dd>
            </div>
            <div v-if="form.scenario === 'build'" class="flex items-center justify-between gap-3">
              <dt class="text-ui-muted">{{ $t("calculator.form.summary.pmOverhead") }}</dt>
              <dd class="text-ui-ink tabular-nums">{{ formatRupiah(pmOverheadTotal) }}</dd>
            </div>
            <div v-if="form.scenario === 'build'" class="flex items-center justify-between gap-3">
              <dt class="text-ui-muted">{{ $t("calculator.form.summary.infraSetup") }}</dt>
              <dd class="text-ui-ink tabular-nums">{{ formatRupiah(form.infra_setup_cost) }}</dd>
            </div>
            <div v-if="form.scenario === 'landing_page'" class="flex items-center justify-between gap-3">
              <dt class="text-ui-muted">{{ $t("calculator.form.summary.margin") }} ({{ form.margin_percent }}%)</dt>
              <dd class="text-ui-ink tabular-nums">{{ formatRupiah(landingPageMarginTotal) }}</dd>
            </div>
          </dl>

          <div class="mt-3 pt-3 border-t border-ui-line space-y-1.5">
            <div class="flex items-baseline justify-between gap-3">
              <span class="text-ui-h3 text-ui-ink">{{ $t("calculator.form.summary.total") }}</span>
              <span class="text-ui-h2 text-ui-ink tabular-nums">{{ formatRupiah(grandTotal) }}</span>
            </div>
            <div v-if="form.include_ppn" class="flex items-center justify-between gap-3 text-ui-cap text-ui-muted">
              <span>+ PPN {{ form.ppn_percent }}%</span>
              <span class="tabular-nums">{{ formatRupiah(ppnAmount) }}</span>
            </div>
            <div v-if="form.include_ppn" class="flex items-baseline justify-between gap-3">
              <span class="text-ui-h3 text-ui-ink">{{ $t("calculator.form.summary.totalPpn") }}</span>
              <span class="text-ui-h2 text-ui-ink tabular-nums">{{ formatRupiah(totalWithPpn) }}</span>
            </div>
          </div>

          <div v-if="form.include_pph" class="mt-3 pt-3 border-t border-ui-line space-y-1.5">
            <div class="flex items-center justify-between gap-3 text-ui-cap text-ui-bad">
              <span>- PPh {{ form.pph_percent }}%</span>
              <span class="tabular-nums">{{ formatRupiah(pphAmount) }}</span>
            </div>
            <div class="flex items-baseline justify-between gap-3">
              <span class="text-ui-h3 text-ui-ok">{{ $t("calculator.form.summary.netReceived") }}</span>
              <span class="text-ui-h3 text-ui-ok tabular-nums">{{ formatRupiah(netReceived) }}</span>
            </div>
            <p class="text-ui-cap text-ui-faint">{{ $t("calculator.form.summary.afterPph") }}</p>
          </div>

          <UiButton class="mt-4 hidden xl:flex" block :icon="SaveIcon" :loading="saving" :disabled="!canSave" @click="submit">
            {{ saving ? $t("common.actions.saving") : isEditing ? $t("common.actions.saveChanges") : $t("calculator.form.saveEstimate") }}
          </UiButton>
        </section>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 space-y-3">
          <div class="flex items-start gap-2 text-ui-small">
            <ClockIcon class="w-4 h-4 text-ui-faint shrink-0 mt-px" />
            <span v-if="form.scenario === 'landing_page'" class="text-ui-text">
              {{ $t("calculator.form.duration.label") }}: <strong class="font-semibold text-ui-ink tabular-nums">{{ $t("calculator.dashboard.weeks", { n: estimatedDurationWeeks ?? "-" }) }}</strong>
              <span class="block text-ui-cap text-ui-muted tabular-nums">
                ({{ $t("calculator.form.duration.hours", { n: totalHoursSum.toFixed(1) }) }} &middot; {{ $t("calculator.form.duration.developers", { n: form.developer_count }, Number(form.developer_count) || 1) }})
              </span>
            </span>
            <span v-else class="text-ui-text">
              {{ $t("calculator.form.duration.label") }}: <strong class="font-semibold text-ui-ink tabular-nums">{{ $t("calculator.dashboard.weeks", { n: estimatedDurationWeeks ?? "-" }) }}</strong>
              <template v-if="estimatedDurationMonths"> (&asymp; {{ $t("calculator.dashboard.months", { n: estimatedDurationMonths }) }})</template>
              <span class="block text-ui-cap text-ui-muted tabular-nums">
                {{ $t("calculator.form.duration.hours", { n: totalHoursSum.toFixed(1) }) }} &middot; {{ $t("calculator.form.duration.developers", { n: form.allocated_developers }, Number(form.allocated_developers) || 1) }}
                &middot; {{ $t("calculator.form.duration.hoursPerMonth", { n: Math.round(allocatedCapacityPerMonth) }) }}
              </span>
            </span>
          </div>

          <div v-if="form.scenario !== 'landing_page'" class="pt-3 border-t border-ui-line">
            <label class="flex items-center justify-between gap-3 text-ui-small font-medium text-ui-ink">
              {{ $t("calculator.form.allocated.label") }}
              <span class="w-16 shrink-0">
                <input
                  v-model.number="form.allocated_developers"
                  type="number"
                  min="1"
                  :max="Math.max(1, rateSetting.team_size || 1)"
                  step="1"
                  :class="cellInput"
                />
              </span>
            </label>
            <p class="text-ui-cap text-ui-muted mt-1.5">
              {{ $t("calculator.form.allocated.hint", { team: rateSetting.team_size || 0, hours: Math.round(hoursPerPerson) }) }}
            </p>
          </div>
        </section>

        <section class="bg-ui-subtle border border-ui-line rounded-ui-card px-5 py-3.5 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">{{ $t("calculator.fee.title") }}</p>
            <p class="text-ui-cap text-ui-muted">{{ $t("calculator.fee.hint") }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-ui-small font-semibold text-ui-ink tabular-nums">{{ marketingFee.percent }}%</p>
            <p class="text-ui-cap text-ui-muted tabular-nums">{{ formatRupiah(marketingFee.amount) }}</p>
          </div>
        </section>

        <UiButton class="xl:hidden" size="lg" block :icon="SaveIcon" :loading="saving" :disabled="!canSave" @click="submit">
          {{ saving ? $t("common.actions.saving") : isEditing ? $t("common.actions.saveChanges") : $t("calculator.form.saveEstimate") }}
        </UiButton>
      </aside>
    </div>

    <!-- Load from Previous Estimate modal -->
    <UiModal
      v-model:open="referenceModal"
      size="lg"
      :title="$t('calculator.form.loadPrevious')"
      :description="$t('calculator.form.reference.description')"
    >
      <UiInput v-model="referenceSearch" :icon="Search" :placeholder="$t('calculator.form.reference.search')" class="mb-3" />

      <div v-if="loadingReferences" class="space-y-2">
        <Skeleton v-for="i in 3" :key="i" height="60px" rounded="10px" />
      </div>
      <UiEmpty v-else-if="filteredReferences.length === 0" compact :icon="History" :title="$t('calculator.form.reference.empty')" />
      <ul v-else class="border border-ui-line rounded-ui-control divide-y divide-ui-line overflow-hidden">
        <li v-for="(reference, index) in filteredReferences" :key="reference.id">
          <button
            type="button"
            :disabled="applyingReference"
            class="w-full text-left px-3.5 py-3 flex items-center gap-3 hover:bg-ui-hover transition-colors disabled:opacity-50"
            @click="applyReference(reference)"
          >
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 shrink-0">{{ index + 1 }}</span>
            <span class="flex-1 min-w-0">
              <span class="block text-ui-small font-medium text-ui-ink truncate">{{ reference.name }}</span>
              <span class="block text-ui-cap text-ui-muted truncate">
                {{ reference.client_name || $t("calculator.form.reference.noClient") }} &middot;
                {{ scenarioLabel(reference.scenario) }} &middot;
                {{ reference.scenario === "landing_page" ? $t("calculator.form.reference.package") : $t("calculator.form.reference.items", { n: reference.items?.length ?? 0 }, reference.items?.length ?? 0) }}
              </span>
            </span>
            <span class="text-ui-small font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(reference.grand_total) }}</span>
          </button>
        </li>
      </ul>
    </UiModal>
  </div>
</template>
