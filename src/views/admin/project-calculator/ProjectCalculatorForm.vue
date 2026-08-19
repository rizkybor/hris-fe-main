<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  CalculatorIcon,
  ArrowLeft,
  PlusIcon,
  Trash2,
  Layers3Icon,
  PuzzleIcon,
  Globe,
  InfoIcon,
  Loader2,
  SaveIcon,
  ClockIcon,
  History,
  X,
  Search,
} from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { useAlertModalStore } from "@/stores/alertModal";
import { storeToRefs } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah } from "@/utils/formatUtils";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const route = useRoute();
const router = useRouter();
const store = useProjectCalculatorStore();
const alertModal = useAlertModalStore();
const { rateSetting, landingPageRateSetting, loadingRateSetting, loadingLandingPageRateSetting, saving, pphTypes } = storeToRefs(store);

const isEditing = computed(() => !!route.params.id);
const loadingCalculation = ref(false);

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

const form = ref({
  name: "",
  client_name: "",
  scenario: "feature",
  pm_overhead_percent: 12,
  infra_setup_cost: 0,
  // Landing Page fields -- unused (harmless) unless scenario === 'landing_page'.
  server_type: "shared",
  design_type: "template",
  estimated_hours: 0,
  rate_developer: 0,
  developer_count: 1,
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

// Elevates the sticky list header (shadow + blur) only once it's actually
// pinned to the top of the viewport, rather than looking "stuck" all the
// time -- a tiny sentinel just above it flips isHeaderStuck the instant it
// scrolls out of view.
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

// Inline styles rather than Tailwind classes for the sticky positioning,
// backdrop blur, and shadow specifically -- this project's dev-mode
// Tailwind build was silently failing to compile several of these classes
// (confirmed via the browser's own CSSOM) while everything else compiled
// fine, for reasons that didn't reproduce as a config issue. Inline styles
// sidestep that class-generation step entirely.
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

// "Load from Previous Estimate" -- lets a new estimate reuse the Module
// List / New Feature line items already saved on an earlier one, instead
// of retyping them. Create mode only; kept as a self-contained picker
// (own list/search state) rather than reusing `store.calculations`, which
// belongs to the dashboard list view.
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
  if (hasExistingWork && !(await alertModal.confirm(`Replace the current items with those from "${reference.name}"? This can't be undone.`))) {
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
      form.value.rate_developer = lp.rate_developer ?? landingPageRateSetting.value.default_rate_developer;
      form.value.developer_count = lp.developer_count ?? 1;
      form.value.margin_percent = full.margin_percent ?? landingPageRateSetting.value.margin_percent;
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

onMounted(async () => {
  await Promise.all([store.fetchRateSetting(), store.fetchLandingPageRateSetting(), store.fetchPphTypes()]);
  form.value.pm_overhead_percent = rateSetting.value.pm_overhead_percent;
  form.value.infra_setup_cost = rateSetting.value.default_infra_setup_cost;
  form.value.rate_developer = landingPageRateSetting.value.default_rate_developer;
  form.value.margin_percent = landingPageRateSetting.value.margin_percent;

  if (isEditing.value) {
    loadingCalculation.value = true;
    try {
      const calc = await store.fetchCalculation(route.params.id);
      const lp = calc.scenario === "landing_page" ? (calc.items?.[0] ?? {}) : null;

      form.value = {
        name: calc.name,
        client_name: calc.client_name ?? "",
        scenario: calc.scenario,
        pm_overhead_percent: calc.pm_overhead_percent ?? rateSetting.value.pm_overhead_percent,
        infra_setup_cost: calc.infra_setup_cost ?? rateSetting.value.default_infra_setup_cost,
        server_type: lp?.server_type ?? "shared",
        design_type: lp?.design_type ?? "template",
        estimated_hours: lp?.estimated_hours ?? 0,
        rate_developer: lp?.rate_developer ?? landingPageRateSetting.value.default_rate_developer,
        developer_count: lp?.developer_count ?? 1,
        margin_percent: calc.margin_percent ?? landingPageRateSetting.value.margin_percent,
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
      errorMessage.value = "Estimate not found.";
    } finally {
      loadingCalculation.value = false;
    }
  }
});

const switchScenario = (scenario) => {
  if (form.value.scenario === scenario) return;
  form.value.scenario = scenario;

  if (scenario === "landing_page") {
    form.value.server_type = "shared";
    form.value.design_type = "template";
    form.value.estimated_hours = 0;
    form.value.rate_developer = landingPageRateSetting.value.default_rate_developer;
    form.value.developer_count = 1;
    form.value.margin_percent = landingPageRateSetting.value.margin_percent;
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

// Landing Page's own math -- mirrors ProjectCalculatorService::calculateLandingPage()
// exactly (server cost + design cost + development cost, marked up by its
// own margin), since it isn't an hourly-items scenario like Feature/Build.
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
const landingPageSubtotal = computed(
  () => landingPageServerCost.value + landingPageDesignCost.value + landingPageDevelopmentCost.value
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

const ppnAmount = computed(() =>
  form.value.include_ppn ? grandTotal.value * (Number(form.value.ppn_percent || 0) / 100) : 0
);
const totalWithPpn = computed(() => grandTotal.value + ppnAmount.value);

// PPh is withheld by the client, not added -- it reduces what the vendor
// actually receives in cash (netReceived), it never changes what the
// client is invoiced (totalWithPpn/grandTotal). Its base (DPP) is the
// service fee only, never the PPN portion, since PPN isn't the vendor's
// income.
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
  const capacityPerWeek =
    (rateSetting.value.total_productive_hours_per_month || 0) / 4.33;
  return capacityPerWeek > 0 ? Math.ceil(totalHoursSum.value / capacityPerWeek) : null;
});

const canSave = computed(() => {
  if (!form.value.name) return false;
  if (form.value.include_pph && !form.value.pph_type) return false;
  if (form.value.scenario === "landing_page") {
    return !!form.value.server_type && !!form.value.design_type && Number(form.value.estimated_hours) > 0;
  }
  if (form.value.items.length === 0) return false;
  return form.value.items.every((item) => item.name && item.name.trim().length > 0);
});

const submit = async () => {
  errorMessage.value = "";
  if (!canSave.value) {
    errorMessage.value = "Estimate name and each item name are required.";
    return;
  }

  try {
    const saved = isEditing.value
      ? await store.updateCalculation(route.params.id, form.value)
      : await store.createCalculation(form.value);

    router.push({ name: "admin.project-calculator.detail", params: { id: saved.id } });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value =
      data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Failed to save estimate.");
  }
};
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <button
          @click="router.back()"
          class="w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-blue-400 transition-all flex-shrink-0"
        >
          <ArrowLeft class="w-5 h-5 text-gray-600" />
        </button>
        <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center flex-shrink-0">
          <CalculatorIcon class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-brand-dark text-xl font-bold">
            {{ isEditing ? "Edit Estimate" : "Create New Estimate" }}
          </h1>
          <p class="text-brand-light text-sm">Fill in the details below, the total will be calculated automatically</p>
        </div>
      </div>
    </div>

    <Alert type="danger" :title="errorMessage" message="" :show="!!errorMessage" @close="errorMessage = ''" />

    <div v-if="loadingCalculation || loadingRateSetting || loadingLandingPageRateSetting" class="space-y-4 mt-4">
      <Skeleton height="120px" rounded="14px" />
      <Skeleton height="300px" rounded="14px" />
    </div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
      <!-- Main form -->
      <div class="xl:col-span-2 space-y-6">
        <!-- Basic info -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-brand-dark mb-1">Project Name Example *</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="example: Added WA Monitoring Featured"
                class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-brand-dark mb-1">Client Name (Optional)</label>
              <input
                v-model="form.client_name"
                type="text"
                placeholder="example: PT. Client Name"
                class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
              />
            </div>
          </div>

          <!-- Scenario toggle -->
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-2">Scenario</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                @click="switchScenario('feature')"
                class="flex items-center gap-3 p-4 rounded-[12px] border-2 text-left transition-all"
                :class="
                  form.scenario === 'feature'
                    ? 'border-[#0C51D9] bg-blue-50'
                    : 'border-[#DCDEDD] hover:border-blue-200'
                "
              >
                <div class="w-10 h-10 bg-blue-100 rounded-[10px] flex items-center justify-center flex-shrink-0">
                  <PuzzleIcon class="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p class="text-brand-dark text-sm font-bold">New Feature</p>
                  <p class="text-brand-light text-xs">Adding features to the existing system</p>
                </div>
              </button>
              <button
                type="button"
                @click="switchScenario('build')"
                class="flex items-center gap-3 p-4 rounded-[12px] border-2 text-left transition-all"
                :class="
                  form.scenario === 'build'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-[#DCDEDD] hover:border-violet-200'
                "
              >
                <div class="w-10 h-10 bg-violet-100 rounded-[10px] flex items-center justify-center flex-shrink-0">
                  <Layers3Icon class="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p class="text-brand-dark text-sm font-bold">Build from Scratch</p>
                  <p class="text-brand-light text-xs">Building a new application, per module</p>
                </div>
              </button>
              <button
                type="button"
                @click="switchScenario('landing_page')"
                class="flex items-center gap-3 p-4 rounded-[12px] border-2 text-left transition-all"
                :class="
                  form.scenario === 'landing_page'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-[#DCDEDD] hover:border-emerald-200'
                "
              >
                <div class="w-10 h-10 bg-emerald-100 rounded-[10px] flex items-center justify-center flex-shrink-0">
                  <Globe class="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p class="text-brand-dark text-sm font-bold">Landing Page</p>
                  <p class="text-brand-light text-xs">Server, Design, and Development package</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Items -->
        <div v-if="form.scenario !== 'landing_page'" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
          <!-- Sentinel: a 1px marker just above the sticky header. The
               IntersectionObserver watching it flips isHeaderStuck the
               instant it scrolls out of view, i.e. exactly when the header
               below actually becomes pinned. -->
          <div ref="stickySentinel" style="height: 1px; margin-bottom: -1px"></div>

          <!-- Sticky so "Add Feature/Module" stays reachable while scrolling
               through a long item list, instead of having to scroll back up
               every time. top/margin offsets are inline styles, not
               Tailwind utilities -- negative-value utility classes here
               (-top-3, -mt-6, -mx-6, and their arbitrary-value equivalents)
               were silently not being generated by this project's Tailwind
               build for reasons that didn't reproduce anywhere else in the
               codebase, so inline style sidesteps that entirely. The -12px
               top offset cancels out <main>'s own p-3 page padding (see
               Admin.vue layout) so this specific header sits flush against
               the navbar with zero gap once pinned, rather than floating
               below it. Gains a soft shadow/blur/accent bar only once
               actually pinned (isHeaderStuck), so it doesn't look
               "elevated" while still sitting flush in its normal spot. -->
          <div class="sticky z-10 px-6 pt-6 pb-2 border-b transition-all duration-300 ease-out" :style="stickyHeaderStyle">
            <div
              class="absolute inset-x-0 top-0 h-[3px] transition-opacity duration-300"
              :style="{ background: 'linear-gradient(to right, #0C51D9, #6366F1)', opacity: isHeaderStuck ? 1 : 0 }"
            ></div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <h3 class="text-brand-dark text-base font-bold">
                  {{ form.scenario === "feature" ? "Feature List" : "Module List" }}
                </h3>
                <span class="px-2 py-0.5 rounded-full bg-blue-50 text-[#0C51D9] text-xs font-bold tabular-nums">
                  {{ form.items.length }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="!isEditing"
                  type="button"
                  @click="openReferenceModal"
                  class="border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 transition-all px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <History class="w-3.5 h-3.5 text-gray-600" />
                  <span class="text-brand-dark text-xs font-semibold">Load from Previous Estimate</span>
                </button>
                <button
                  type="button"
                  @click="addItem"
                  class="border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 transition-all px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <PlusIcon class="w-3.5 h-3.5 text-gray-600" />
                  <span class="text-brand-dark text-xs font-semibold">{{ form.scenario === "feature" ? "Add Feature" : "Add Module" }}</span>
                </button>
              </div>
            </div>
            <p class="flex items-center gap-1.5 text-xs mb-3 text-gray-400 pb-2">
              <InfoIcon class="w-3.5 h-3.5" />
              Complexity Factor: Simple = 1.0 &middot; Medium = 1.3&ndash;1.5 &middot; Complex = 1.8&ndash;2.2. Typical risk buffer 15&ndash;20%.
            </p>
          </div>

          <div class="space-y-4 mt-4">
            <div
              v-for="(item, index) in form.items"
              :key="index"
              class="p-4 border border-[#DCDEDD] rounded-[12px] space-y-3"
            >
              <div class="flex items-center gap-2">
                <input
                  v-model="item.name"
                  type="text"
                  :placeholder="form.scenario === 'feature' ? 'Feature name' : 'Module name'"
                  class="flex-1 px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm font-semibold focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
                />
                <button
                  type="button"
                  @click="removeItem(index)"
                  :disabled="form.items.length === 1"
                  class="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl border border-[#DCDEDD] hover:border-red-400 hover:bg-red-50 group transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 class="w-4 h-4 text-gray-500 group-hover:text-red-600" />
                </button>
              </div>

              <div v-if="form.scenario === 'feature'" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Analysis Hours</label>
                  <input v-model.number="item.analysis_hours" type="number" min="0" step="0.5" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Development Hours</label>
                  <input v-model.number="item.dev_hours" type="number" min="0" step="0.5" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Testing Hours</label>
                  <input v-model.number="item.testing_hours" type="number" min="0" step="0.5" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Deployment Hours</label>
                  <input v-model.number="item.deploy_hours" type="number" min="0" step="0.5" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
                </div>
              </div>
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Estimated Hours</label>
                  <input v-model.number="item.estimated_hours" type="number" min="0" step="0.5" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Complexity Factor</label>
                  <input v-model.number="item.complexity_factor" type="number" min="0.1" step="0.1" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Buffer Risk %</label>
                  <input v-model.number="item.buffer_percent" type="number" min="0" max="100" step="1" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
                </div>
              </div>

              <div class="flex items-center justify-between pt-3 border-t border-[#F1F1F1] text-sm">
                <span class="text-gray-500">
                  {{ computedItems[index]?.totalHoursUsed.toFixed(1) }} usage history
                </span>
                <span class="text-brand-dark font-bold">{{ formatRupiah(computedItems[index]?.finalPrice ?? 0) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Landing Page Configuration -->
        <div v-if="form.scenario === 'landing_page'" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 space-y-6">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 bg-emerald-50 rounded-[10px] flex items-center justify-center shrink-0">
              <Globe class="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <h3 class="text-brand-dark text-base font-bold">Landing Page Configuration</h3>
          </div>

          <!-- Server -->
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-2">Server</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                @click="form.server_type = 'dedicated'"
                class="flex items-center justify-between p-3.5 rounded-[10px] border-2 text-left transition-all"
                :class="form.server_type === 'dedicated' ? 'border-emerald-500 bg-emerald-50' : 'border-[#DCDEDD] hover:border-emerald-200'"
              >
                <span class="text-sm font-semibold text-brand-dark">Dedicated</span>
                <span class="text-sm font-bold text-emerald-700">{{ formatRupiah(landingPageRateSetting.server_dedicated_price) }}</span>
              </button>
              <button
                type="button"
                @click="form.server_type = 'shared'"
                class="flex items-center justify-between p-3.5 rounded-[10px] border-2 text-left transition-all"
                :class="form.server_type === 'shared' ? 'border-emerald-500 bg-emerald-50' : 'border-[#DCDEDD] hover:border-emerald-200'"
              >
                <span class="text-sm font-semibold text-brand-dark">Shared</span>
                <span class="text-sm font-bold text-emerald-700">{{ formatRupiah(landingPageRateSetting.server_shared_price) }}</span>
              </button>
            </div>
          </div>

          <!-- Design -->
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-2">Design</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                @click="form.design_type = 'dedicated'"
                class="flex items-center justify-between p-3.5 rounded-[10px] border-2 text-left transition-all"
                :class="form.design_type === 'dedicated' ? 'border-emerald-500 bg-emerald-50' : 'border-[#DCDEDD] hover:border-emerald-200'"
              >
                <span class="text-sm font-semibold text-brand-dark">Dedicated</span>
                <span class="text-sm font-bold text-emerald-700">{{ formatRupiah(landingPageRateSetting.design_dedicated_price) }}</span>
              </button>
              <button
                type="button"
                @click="form.design_type = 'template'"
                class="flex items-center justify-between p-3.5 rounded-[10px] border-2 text-left transition-all"
                :class="form.design_type === 'template' ? 'border-emerald-500 bg-emerald-50' : 'border-[#DCDEDD] hover:border-emerald-200'"
              >
                <span class="text-sm font-semibold text-brand-dark">Template</span>
                <span class="text-sm font-bold text-emerald-700">{{ formatRupiah(landingPageRateSetting.design_template_price) }}</span>
              </button>
            </div>
          </div>

          <!-- Development -->
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-2">Development</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Estimate Final Time (hours)</label>
                <input v-model.number="form.estimated_hours" type="number" min="0" step="0.5" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Rate Developer (Rp/jam)</label>
                <input v-model.number="form.rate_developer" type="number" min="0" step="1000" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Jumlah Developer</label>
                <input v-model.number="form.developer_count" type="number" min="1" step="1" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
              </div>
            </div>
            <div class="flex items-center justify-between pt-3 mt-3 border-t border-[#F1F1F1] text-sm">
              <span class="text-gray-500">Development Cost</span>
              <span class="text-brand-dark font-bold">{{ formatRupiah(landingPageDevelopmentCost) }}</span>
            </div>
          </div>

          <!-- Margin -->
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-2">Margin Jual</label>
            <div class="flex items-center gap-3">
              <input v-model.number="form.margin_percent" type="number" min="0" step="1" class="w-32 px-2.5 py-1.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] outline-none" />
              <span class="text-sm text-gray-500">%</span>
              <span class="ml-auto text-sm text-gray-500">
                Margin Amount: <strong class="text-brand-dark">{{ formatRupiah(landingPageMarginTotal) }}</strong>
              </span>
            </div>
          </div>
        </div>

        <!-- Build-only extra fields -->
        <div v-if="form.scenario === 'build'" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">PM Overhead (%)</label>
            <input v-model.number="form.pm_overhead_percent" type="number" min="0" max="100" step="0.5" class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">Infrastructure Setup Cost (Rp)</label>
            <input v-model.number="form.infra_setup_cost" type="number" min="0" class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none" />
          </div>
        </div>

        <!-- Tax + Notes -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 space-y-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.include_ppn" class="w-4 h-4 rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9]" />
            <span class="text-sm font-semibold text-brand-dark">Include PPN</span>
            <input
              v-if="form.include_ppn"
              v-model.number="form.ppn_percent"
              type="number"
              min="0"
              max="100"
              step="0.5"
              class="w-16 px-2 py-1 border border-[#DCDEDD] rounded-lg text-sm ml-1"
              @click.stop
            />
            <span v-if="form.include_ppn" class="text-sm text-gray-500">%</span>
          </label>

          <div class="pt-1 border-t border-[#F1F1F1]">
            <label class="flex items-center gap-2 cursor-pointer pt-3">
              <input type="checkbox" v-model="form.include_pph" class="w-4 h-4 rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9]" />
              <span class="text-sm font-semibold text-brand-dark">Include PPh (dipotong klien)</span>
            </label>
            <p class="flex items-center gap-1.5 text-xs text-gray-400 mt-1 ml-6">
              <InfoIcon class="w-3.5 h-3.5 shrink-0" />
              PPh dipotong oleh klien dari pembayaran -- mengurangi yang diterima, bukan menambah tagihan.
            </p>

            <div v-if="form.include_pph" class="mt-3 ml-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Jenis PPh</label>
                <select
                  v-model="form.pph_type"
                  @change="handlePphTypeChange"
                  class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
                >
                  <option value="" disabled>Pilih jenis PPh...</option>
                  <option v-for="type in pphTypes" :key="type.value" :value="type.value">
                    {{ type.label }}{{ type.default_rate !== null ? ` (${type.default_rate}%)` : "" }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Tarif PPh (%)</label>
                <input
                  v-model.number="form.pph_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  :disabled="form.pph_type !== 'custom' && form.pph_type !== ''"
                  class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-brand-dark mb-1">Notes (Optional)</label>
            <textarea
              v-model="form.notes"
              rows="3"
              placeholder="Additional notes for this estimate..."
              class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none resize-none"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Summary sidebar -->
      <div class="xl:col-span-1">
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 sticky top-6 space-y-4">
          <h3 class="text-brand-dark text-base font-bold">Summary</h3>

          <div v-if="form.scenario !== 'landing_page'" class="p-3 rounded-[12px] bg-gray-50 border border-[#F1F1F1] flex items-center justify-between text-sm">
            <span class="text-gray-500">Rate Sell / Hour</span>
            <span class="font-semibold text-brand-dark">{{ formatRupiah(rateSetting.rate_sell_per_hour) }}</span>
          </div>

          <div class="space-y-2 text-sm">
            <template v-if="form.scenario === 'landing_page'">
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Server ({{ form.server_type === "dedicated" ? "Dedicated" : "Shared" }})</span>
                <span class="text-brand-dark font-medium">{{ formatRupiah(landingPageServerCost) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Design ({{ form.design_type === "dedicated" ? "Dedicated" : "Template" }})</span>
                <span class="text-brand-dark font-medium">{{ formatRupiah(landingPageDesignCost) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-500">Development</span>
                <span class="text-brand-dark font-medium">{{ formatRupiah(landingPageDevelopmentCost) }}</span>
              </div>
            </template>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Subtotal</span>
              <span class="text-brand-dark font-medium">{{ formatRupiah(subtotalSum) }}</span>
            </div>
            <div v-if="form.scenario !== 'landing_page'" class="flex items-center justify-between">
              <span class="text-gray-500">Buffer Risk</span>
              <span class="text-brand-dark font-medium">{{ formatRupiah(bufferSum) }}</span>
            </div>
            <div v-if="form.scenario === 'build'" class="flex items-center justify-between">
              <span class="text-gray-500">PM Overhead</span>
              <span class="text-brand-dark font-medium">{{ formatRupiah(pmOverheadTotal) }}</span>
            </div>
            <div v-if="form.scenario === 'build'" class="flex items-center justify-between">
              <span class="text-gray-500">Infrastructure Setup Cost</span>
              <span class="text-brand-dark font-medium">{{ formatRupiah(form.infra_setup_cost) }}</span>
            </div>
            <div v-if="form.scenario === 'landing_page'" class="flex items-center justify-between">
              <span class="text-gray-500">Margin Jual ({{ form.margin_percent }}%)</span>
              <span class="text-brand-dark font-medium">{{ formatRupiah(landingPageMarginTotal) }}</span>
            </div>
          </div>

          <div class="pt-3 border-t border-[#F1F1F1]">
            <div class="flex items-center justify-between">
              <span class="text-brand-dark text-sm font-bold">Estimate Total</span>
              <span class="text-brand-dark text-xl font-extrabold">{{ formatRupiah(grandTotal) }}</span>
            </div>
            <div v-if="form.include_ppn" class="flex items-center justify-between mt-2">
              <span class="text-gray-500 text-xs">+ PPN {{ form.ppn_percent }}%</span>
              <span class="text-gray-500 text-xs">{{ formatRupiah(ppnAmount) }}</span>
            </div>
            <div v-if="form.include_ppn" class="flex items-center justify-between mt-1">
              <span class="text-indigo-700 text-sm font-bold">Total + PPN</span>
              <span class="text-indigo-700 text-xl font-extrabold">{{ formatRupiah(totalWithPpn) }}</span>
            </div>
          </div>

          <div v-if="form.include_pph" class="pt-3 border-t border-[#F1F1F1]">
            <div class="flex items-center justify-between">
              <span class="text-red-500 text-xs">- PPh {{ form.pph_percent }}%</span>
              <span class="text-red-500 text-xs">{{ formatRupiah(pphAmount) }}</span>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-green-700 text-sm font-bold">Diterima Bersih</span>
              <span class="text-green-700 text-xl font-extrabold">{{ formatRupiah(netReceived) }}</span>
            </div>
            <p class="text-gray-400 text-xs mt-1">Setelah dipotong PPh oleh klien</p>
          </div>

          <div class="flex items-center gap-2 p-3 rounded-[12px] bg-blue-50 border border-blue-100 text-sm">
            <ClockIcon class="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span v-if="form.scenario === 'landing_page'" class="text-blue-800">
              Estimate Duration: <strong>{{ estimatedDurationWeeks ?? "-" }} weeks</strong>
              ({{ totalHoursSum.toFixed(1) }} hours &middot; {{ form.developer_count }} developer{{ form.developer_count > 1 ? "s" : "" }})
            </span>
            <span v-else class="text-blue-800">
              Estimate Duration: <strong>{{ estimatedDurationWeeks ?? "-" }} weeks</strong>
              ({{ totalHoursSum.toFixed(1) }} hours &middot; team capacity {{ rateSetting.total_productive_hours_per_month }} hours/month)
            </span>
          </div>

          <button
            type="button"
            @click="submit"
            :disabled="saving || !canSave"
            class="w-full rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Loader2 v-if="saving" class="w-4 h-4 text-white animate-spin" />
            <SaveIcon v-else class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">
              {{ saving ? "Saving..." : isEditing ? "Save Changes" : "Save Estimate" }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Load from Previous Estimate modal -->
    <div v-if="referenceModal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center">
              <History class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-base font-bold">Load from Previous Estimate</h3>
              <p class="text-brand-light text-xs">Reuse a saved estimate's item list as a starting point</p>
            </div>
          </div>
          <button type="button" @click="referenceModal = false" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-4 border-b border-[#DCDEDD]">
          <div class="relative">
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="referenceSearch"
              type="text"
              placeholder="Search by estimate or client name..."
              class="w-full pl-9 pr-3 py-2.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
            />
          </div>
        </div>

        <div class="p-4 overflow-y-auto space-y-2">
          <div v-if="loadingReferences" class="space-y-2">
            <Skeleton height="64px" rounded="12px" />
            <Skeleton height="64px" rounded="12px" />
            <Skeleton height="64px" rounded="12px" />
          </div>
          <p v-else-if="filteredReferences.length === 0" class="text-center text-sm text-gray-400 py-8">
            No saved estimates found.
          </p>
          <button
            v-for="reference in filteredReferences"
            :key="reference.id"
            type="button"
            :disabled="applyingReference"
            @click="applyReference(reference)"
            class="w-full text-left border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 transition-all p-4 flex items-center justify-between gap-3 disabled:opacity-50"
          >
            <div class="min-w-0">
              <p class="text-brand-dark text-sm font-bold truncate">{{ reference.name }}</p>
              <p class="text-brand-light text-xs truncate">
                {{ reference.client_name || "No client" }} &middot;
                {{
                  reference.scenario === "feature"
                    ? "New Feature"
                    : reference.scenario === "build"
                      ? "Build from Scratch"
                      : "Landing Page"
                }} &middot;
                {{ reference.scenario === "landing_page" ? "Package" : `${reference.items?.length ?? 0} items` }}
              </p>
            </div>
            <span class="text-brand-dark text-sm font-semibold whitespace-nowrap">{{ formatRupiah(reference.grand_total) }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
