<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  ArrowLeft, Building2, FolderKanban, Pencil, Trash2, Share2, Plus, PiggyBank, Sparkles, ClipboardList, History,
  EyeOff, X, Copy, Check, Link2, Mail, MessageCircle, AlertTriangle, Clock, SlidersHorizontal, CheckCircle2, Ban,
} from "lucide-vue-next";
import { useMaintenanceStore } from "@/stores/maintenance";
import { useClientStore } from "@/stores/client";
import { useProjectStore } from "@/stores/project";
import { useEmployeeStore } from "@/stores/employee";
import { useAuthStore } from "@/stores/auth";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import {
  formatHours, formatMonth, CONTRACT_STATUS, LEFTOVER_POLICY, FEATURE_STATUS, BANK_ENTRY_TYPE, categoryLabel, usageColor, leftoverResult,
} from "@/utils/maintenance";
import { copyText } from "@/utils/serverMetrics";
import { UiPageHeader, UiButton, UiBadge, UiSelect, UiStat, UiTable, UiModal, UiInput, UiSpinner, UiSkeleton } from "@/components/ui";
import ContractFormModal from "@/components/admin/maintenance/ContractFormModal.vue";
import LogFormModal from "@/components/admin/maintenance/LogFormModal.vue";
import HoursAdjustModal from "@/components/admin/maintenance/HoursAdjustModal.vue";

const route = useRoute();
const router = useRouter();
const store = useMaintenanceStore();
const { contract, period, detailLoading, periodLoading } = storeToRefs(store);
const clientStore = useClientStore();
const projectStore = useProjectStore();
const employeeStore = useEmployeeStore();
const authStore = useAuthStore();
const alertModal = useAlertModalStore();

const tab = ref("work");
const selectedPeriodId = ref(null);

const load = async ({ silent = false } = {}) => {
  const data = await store.fetchContract(route.params.id, { silent });
  if (!selectedPeriodId.value || !data.periods.some((p) => p.id === selectedPeriodId.value)) {
    selectedPeriodId.value = data.current_period?.id ?? data.periods[0]?.id ?? null;
  }
  if (selectedPeriodId.value) await store.fetchPeriod(selectedPeriodId.value, { silent });
};

const open = async () => {
  store.contract = null;
  store.period = null;
  selectedPeriodId.value = null;
  tab.value = "work";
  try {
    await load();
  } catch (e) {
    if (e?.response?.status === 404) router.replace({ name: "admin.maintenance.dashboard" });
  }
};

// The same page instance is reused when going from one contract to another.
watch(
  () => route.params.id,
  (id, old) => {
    if (id && id !== old) open();
  }
);

onMounted(async () => {
  await open();
  if (!clientStore.clients.length) clientStore.fetchAllClient();
  if (!projectStore.projects.length) projectStore.fetchProjectsPaginated({ row_per_page: 100 });
  if (!employeeStore.employees.length) employeeStore.fetchEmployees({});
});

watch(selectedPeriodId, (id, old) => {
  if (id && old && id !== old) store.fetchPeriod(id);
});

const current = computed(() => contract.value?.current_period);
const selectedPeriod = computed(() => contract.value?.periods.find((p) => p.id === selectedPeriodId.value));
const periodOpen = computed(() => period.value && !period.value.is_closed);
const employees = computed(() =>
  employeeStore.employees.filter((e) => e.user?.id).map((e) => ({ id: e.user.id, name: e.user.name }))
);
const policyLabel = (key) => LEFTOVER_POLICY[key]?.label || "-";

const run = async (fn, failMessage) => {
  try {
    await fn();
    return true;
  } catch (e) {
    const errors = e?.response?.data?.errors;
    const message = errors ? Object.values(errors)[0]?.[0] : e?.response?.data?.message;
    await alertModal.alert(message || failMessage, { type: "danger" });
    return false;
  }
};

// ===== Contract =====
const showContractForm = ref(false);
const contractSaving = ref(false);
const contractErrors = ref({});
const saveContract = async (payload) => {
  contractSaving.value = true;
  contractErrors.value = {};
  try {
    await store.updateContract(contract.value.id, payload);
    showContractForm.value = false;
    await load({ silent: true });
  } catch (e) {
    contractErrors.value = e?.response?.data?.errors || {};
  } finally {
    contractSaving.value = false;
  }
};

const deleteContract = async () => {
  const ok = await alertModal.confirm(
    `Delete "${contract.value.name}"? Its months, work logs and development balance are deleted too, and the client's link stops working.`,
    { type: "danger", confirmText: "Delete" }
  );
  if (!ok) return;
  if (await run(() => store.deleteContract(contract.value.id), "Failed to delete the contract.")) {
    router.push({ name: "admin.maintenance.dashboard" });
  }
};

// ===== Client link =====
const showShare = ref(false);
const shareBusy = ref(false);
const copied = ref(false);
const shareUrl = computed(() => contract.value?.share_url);
const openShare = async () => {
  showShare.value = true;
  if (!shareUrl.value && can("maintenance-share")) await createLink();
};
const createLink = async () => {
  shareBusy.value = true;
  await run(async () => {
    contract.value.share_url = await store.share(contract.value.id);
  }, "Failed to create the link.");
  shareBusy.value = false;
};
const revokeLink = async () => {
  const ok = await alertModal.confirm("Revoke this link? The client can no longer open it. A new link can be created any time.", {
    type: "warning",
    confirmText: "Revoke",
  });
  if (!ok) return;
  await run(async () => {
    await store.unshare(contract.value.id);
    contract.value.share_url = null;
  }, "Failed to revoke the link.");
};
const copyLink = async () => {
  await copyText(shareUrl.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1800);
};
const shareMessage = computed(() => {
  const c = contract.value;
  if (!c) return "";
  const lines = [
    `Yth. ${c.client?.name || "Bapak/Ibu"},`,
    "",
    `Berikut link untuk memantau kuota maintenance "${c.name}" (sisa jam bulan ini, daftar pekerjaan, dan Saldo Pengembangan):`,
    shareUrl.value,
    "",
    "Link ini bersifat pribadi, mohon tidak dibagikan ke pihak lain.",
    "",
    "Terima kasih,",
    "PT Jendela Cakra Digital",
  ];
  return lines.join("\n");
});
const whatsappUrl = computed(() => {
  const phone = (contract.value?.client?.pic_phone || "").replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${phone}?text=${encodeURIComponent(shareMessage.value)}`;
});
const mailUrl = computed(
  () =>
    `mailto:${contract.value?.client?.email || ""}?subject=${encodeURIComponent(`Kuota Maintenance - ${contract.value?.name}`)}&body=${encodeURIComponent(shareMessage.value)}`
);

// ===== Month: leftover handling, quota adjustments =====
const leftoverChoice = computed({
  get: () => period.value?.leftover_action ?? "",
  set: async (value) => {
    if (await run(() => store.setLeftoverAction(period.value.id, value || null), "Failed to update.")) await load({ silent: true });
  },
});

const showAdjust = ref(false);
const adjustBusy = ref(false);
const adjustErrors = ref({});
const adjustTarget = ref("period"); // period | balance
const openAdjust = (target) => {
  adjustTarget.value = target;
  adjustErrors.value = {};
  showAdjust.value = true;
};
const saveAdjust = async (payload) => {
  adjustBusy.value = true;
  adjustErrors.value = {};
  try {
    if (adjustTarget.value === "period") await store.addAdjustment(period.value.id, payload);
    else await store.adjustBalance(contract.value.id, payload);
    showAdjust.value = false;
    await load({ silent: true });
  } catch (e) {
    adjustErrors.value = e?.response?.data?.errors || {};
  } finally {
    adjustBusy.value = false;
  }
};
const deleteAdjustment = async (adjustment) => {
  const ok = await alertModal.confirm(`Remove the ${formatHours(adjustment.hours)} adjustment ("${adjustment.reason}")?`, { confirmText: "Remove" });
  if (ok && (await run(() => store.deleteAdjustment(adjustment.id), "Failed to remove."))) await load({ silent: true });
};

// ===== Work logs =====
const showLog = ref(false);
const logBusy = ref(false);
const logErrors = ref({});
const editingLog = ref(null);
const logFeature = ref(null);
const openLog = (log = null, feature = null) => {
  editingLog.value = log;
  logFeature.value = feature;
  logErrors.value = {};
  showLog.value = true;
};
const saveLog = async (payload) => {
  logBusy.value = true;
  logErrors.value = {};
  try {
    const saved = await store.saveLog(contract.value.id, payload, editingLog.value?.id);
    showLog.value = false;
    // Jump to the month the work was logged in.
    if (!payload.maintenance_feature_id && saved.maintenance_period_id) selectedPeriodId.value = saved.maintenance_period_id;
    await load({ silent: true });
  } catch (e) {
    logErrors.value = e?.response?.data?.errors || {};
  } finally {
    logBusy.value = false;
  }
};
const deleteLog = async (log) => {
  const ok = await alertModal.confirm(`Delete "${log.title}" (${formatHours(log.hours)})?`, { type: "danger", confirmText: "Delete" });
  if (ok && (await run(() => store.deleteLog(log.id), "Failed to delete."))) await load({ silent: true });
};
const defaultLogDate = computed(() => {
  // Logging from a past month that's still open defaults to that month;
  // otherwise today (a closed month can't take new work).
  if (!periodOpen.value || period.value.month === current.value?.month) return "";
  return `${period.value.month}-01`;
});

// ===== Features =====
const showFeature = ref(false);
const featureBusy = ref(false);
const featureErrors = ref({});
const editingFeature = ref(null);
const featureForm = ref({ title: "", description: "", estimated_hours: 4, visible_to_client: true });
const openFeature = (feature = null) => {
  editingFeature.value = feature;
  featureErrors.value = {};
  featureForm.value = feature
    ? { title: feature.title, description: feature.description || "", estimated_hours: feature.estimated_hours, visible_to_client: feature.visible_to_client }
    : { title: "", description: "", estimated_hours: 4, visible_to_client: true };
  showFeature.value = true;
};
const saveFeature = async () => {
  featureBusy.value = true;
  featureErrors.value = {};
  const payload = { ...featureForm.value, description: featureForm.value.description || null };
  if (editingFeature.value && editingFeature.value.status !== "proposed") delete payload.estimated_hours;
  try {
    await store.saveFeature(contract.value.id, payload, editingFeature.value?.id);
    showFeature.value = false;
    await load({ silent: true });
  } catch (e) {
    featureErrors.value = e?.response?.data?.errors || {};
  } finally {
    featureBusy.value = false;
  }
};
const featureAction = async (feature, action) => {
  const balance = contract.value.balance_hours;
  const used = feature.used_hours;
  const messages = {
    approve:
      balance >= feature.estimated_hours
        ? `Approve "${feature.title}"? ${formatHours(feature.estimated_hours)} will be reserved from the development balance (${formatHours(balance)} available).`
        : `The balance (${formatHours(balance)}) doesn't cover the estimate (${formatHours(feature.estimated_hours)}). Approve anyway? ${formatHours(balance)} is reserved now; hours beyond what the balance holds when the feature is finished are marked billable.`,
    complete:
      used < feature.reserved_hours
        ? `Mark "${feature.title}" done? ${formatHours(used)} was used; the unused ${formatHours(feature.reserved_hours - used)} goes back to the balance.`
        : `Mark "${feature.title}" done with ${formatHours(used)} logged?`,
    cancel:
      feature.status === "proposed"
        ? `Cancel "${feature.title}"?`
        : `Cancel "${feature.title}"? Hours already logged (${formatHours(used)}) stay spent; the rest of the reservation goes back to the balance.`,
    delete: `Delete "${feature.title}"?`,
  };
  const ok = await alertModal.confirm(messages[action], {
    type: action === "delete" || action === "cancel" ? "danger" : "info",
    confirmText: { approve: "Approve", complete: "Mark done", cancel: "Cancel feature", delete: "Delete" }[action],
  });
  if (ok && (await run(() => store.featureAction(feature.id, action), "Action failed."))) await load({ silent: true });
};
const expandedFeature = ref(null);

const formatDate = (value) =>
  value ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-";

const TABS = [
  { key: "work", label: "Work Log", icon: ClipboardList },
  { key: "features", label: "New Features", icon: Sparkles },
  { key: "balance", label: "Development Balance", icon: PiggyBank },
  { key: "history", label: "History", icon: History },
];
const openMonth = (id) => {
  selectedPeriodId.value = id;
  tab.value = "work";
};

// ===== Presentation =====
const STATUS_TONE = { active: "ok", paused: "warn", ended: "neutral" };
const FEATURE_TONE = { proposed: "neutral", approved: "accent", in_progress: "warn", done: "ok", cancelled: "neutral" };
// Same thresholds as the dashboard widget: over quota bad, from 75% warn.
const barClass = (p) => (p.overage > 0 ? "bg-ui-bad" : p.used_percent >= 75 ? "bg-ui-warn" : "bg-ui-accent");
const periodOptions = computed(() =>
  (contract.value?.periods ?? []).map((p) => ({ value: p.id, label: `${formatMonth(p.month)}${p.is_closed ? " (closed)" : ""}` }))
);
const leftoverOptions = computed(() => [
  { value: "", label: `${policyLabel(contract.value?.leftover_policy).toLowerCase()} (contract default)` },
  ...Object.entries(LEFTOVER_POLICY).map(([value, p]) => ({ value, label: p.label.toLowerCase() })),
]);
const LOG_COLUMNS = [
  { key: "work_date", label: "Date", width: 120 },
  { key: "title", label: "Work" },
  { key: "category", label: "Category" },
  { key: "performer", label: "By" },
  { key: "hours", label: "Hours", align: "right" },
  { key: "actions", label: "", align: "right", width: 88 },
];
const BANK_COLUMNS = [
  { key: "created_at", label: "Date", width: 120 },
  { key: "type", label: "Movement" },
  { key: "hours", label: "Hours", align: "right" },
  { key: "remaining_hours", label: "Unused / expires", align: "right" },
];
const HISTORY_COLUMNS = [
  { key: "month", label: "Month" },
  { key: "quota", label: "Quota", align: "right" },
  { key: "carried", label: "Rolled over", align: "right" },
  { key: "adjusted", label: "Adjusted", align: "right" },
  { key: "used", label: "Used", align: "right" },
  { key: "leftover", label: "Unused hours" },
];
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <div v-if="detailLoading && !contract" class="space-y-5">
      <router-link
        :to="{ name: 'admin.maintenance.dashboard' }"
        class="inline-flex items-center gap-1.5 text-ui-small text-ui-muted hover:text-ui-ink transition-colors"
      >
        <ArrowLeft class="w-3.5 h-3.5" /> Back to Maintenance
      </router-link>
      <UiSkeleton height="72px" rounded="12px" />
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <UiSkeleton class="col-span-2" height="112px" rounded="12px" />
        <UiSkeleton height="112px" rounded="12px" />
        <UiSkeleton height="112px" rounded="12px" />
      </div>
      <UiSkeleton height="260px" rounded="12px" />
    </div>

    <template v-else-if="contract">
      <!-- Header -->
      <UiPageHeader :title="contract.name">
        <template #eyebrow>
          <router-link
            :to="{ name: 'admin.maintenance.dashboard' }"
            class="inline-flex items-center gap-1.5 text-ui-small text-ui-muted hover:text-ui-ink transition-colors mb-2"
          >
            <ArrowLeft class="w-3.5 h-3.5" /> Back to Maintenance
          </router-link>
        </template>
        <template #subtitle>
          <span class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <UiBadge :tone="STATUS_TONE[contract.status] || 'neutral'" dot>{{ CONTRACT_STATUS[contract.status]?.label }}</UiBadge>
            <router-link v-if="contract.client" :to="{ name: 'admin.clients.detail', params: { id: contract.client.id } }" class="inline-flex items-center gap-1 hover:text-ui-accent">
              <Building2 class="w-3.5 h-3.5 text-ui-faint" /> {{ contract.client.name }}
            </router-link>
            <router-link v-if="contract.project" :to="{ name: 'admin.projects.detail', params: { id: contract.project.id } }" class="inline-flex items-center gap-1 hover:text-ui-accent">
              <FolderKanban class="w-3.5 h-3.5 text-ui-faint" /> {{ contract.project.name }}
            </router-link>
            <span class="inline-flex items-center gap-1"><Clock class="w-3.5 h-3.5 text-ui-faint" /> {{ formatHours(contract.monthly_quota_hours) }} / month</span>
            <span class="tabular-nums">{{ formatDate(contract.start_date) }} – {{ contract.end_date ? formatDate(contract.end_date) : "ongoing" }}</span>
          </span>
          <span class="block mt-1.5 text-ui-cap">
            Unused hours: <span class="text-ui-ink font-medium">{{ policyLabel(contract.leftover_policy) }}</span>
            <template v-if="contract.leftover_policy === 'bank'">
              · cap {{ contract.bank_cap_hours != null ? formatHours(contract.bank_cap_hours) : "none" }}
              · expire after {{ contract.bank_expiry_months ? `${contract.bank_expiry_months} months` : "never" }}
            </template>
            <template v-if="contract.overage_rate"> · overage <span class="tabular-nums">{{ formatRupiah(contract.overage_rate) }}</span>/h</template>
          </span>
          <span v-if="contract.notes" class="block mt-1 text-ui-cap whitespace-pre-line">{{ contract.notes }}</span>
        </template>
        <template #actions>
          <UiButton variant="secondary" :icon="Share2" @click="openShare">Client Link</UiButton>
          <UiButton v-if="can('maintenance-edit')" variant="secondary" :icon="Pencil" @click="(contractErrors = {}), (showContractForm = true)">Edit</UiButton>
          <UiButton v-if="can('maintenance-delete')" variant="danger" :icon="Trash2" @click="deleteContract">Delete</UiButton>
        </template>
      </UiPageHeader>

      <!-- Key numbers -->
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 ui-stagger">
        <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 col-span-2 min-w-0">
          <template v-if="current">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-ui-small text-ui-muted truncate">Left this month · {{ formatMonth(current.month) }}</p>
              <p class="text-ui-cap text-ui-muted tabular-nums shrink-0">{{ formatHours(current.used) }} used of {{ formatHours(current.total) }}</p>
            </div>
            <p class="text-ui-h1 tabular-nums mt-1.5" :class="current.overage > 0 ? 'text-ui-bad' : 'text-ui-ink'">{{ formatHours(current.remaining) }}</p>
            <div class="w-full h-2 bg-ui-subtle rounded-full overflow-hidden mt-2.5">
              <div class="h-full rounded-full" :class="barClass(current)" :style="{ width: `${Math.min(current.used_percent, 100)}%` }"></div>
            </div>
            <p v-if="current.overage > 0" class="text-ui-cap text-ui-bad font-medium mt-1.5 flex items-center gap-1">
              <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
              {{ formatHours(current.overage) }} over quota<template v-if="contract.overage_rate"> · <span class="tabular-nums">{{ formatRupiah(current.overage * contract.overage_rate) }}</span> billable</template>
            </p>
          </template>
          <p v-else class="text-ui-small text-ui-muted py-2">No quota this month — the contract is {{ CONTRACT_STATUS[contract.status]?.label.toLowerCase() }}.</p>
        </div>
        <UiStat label="Development balance" :icon="PiggyBank" :value="formatHours(contract.balance_hours)">
          <template v-if="contract.expiring_soon?.hours > 0" #hint>
            <span class="text-ui-warn font-medium inline-flex items-center gap-1">
              <AlertTriangle class="w-3.5 h-3.5 shrink-0" /> {{ formatHours(contract.expiring_soon.hours) }} expires from {{ formatDate(contract.expiring_soon.first_date) }}
            </span>
          </template>
        </UiStat>
        <UiStat label="Open features" :icon="Sparkles" :value="contract.open_features" hint="Paid from the development balance" />
      </div>

      <!-- Tabs: underline on desktop, scrolling chips on phones -->
      <div class="overflow-x-auto [scrollbar-width:none] sm:border-b sm:border-ui-line -mx-1 px-1 sm:mx-0 sm:px-0">
        <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="tab === t.key"
            @click="tab = t.key"
            :class="[
              'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:shadow-ui-focus',
              'h-8 px-3 rounded-full border text-ui-small',
              'sm:h-auto sm:px-0.5 sm:pt-1 sm:pb-3 sm:rounded-none sm:border-0 sm:border-b-2 sm:-mb-px sm:text-ui-body',
              tab === t.key
                ? 'bg-ui-ink text-white border-ui-ink sm:bg-transparent sm:text-ui-ink sm:border-ui-ink'
                : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover sm:bg-transparent sm:text-ui-muted sm:border-transparent sm:hover:bg-transparent sm:hover:text-ui-ink',
            ]"
          >
            <component :is="t.icon" class="w-4 h-4 hidden sm:block" /> {{ t.label }}
          </button>
        </div>
      </div>

      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
        <!-- Work log -->
        <div v-if="tab === 'work'" class="p-4 sm:p-5 space-y-4">
          <div v-if="!contract.periods.length" class="text-ui-small text-ui-muted py-6 text-center">No months yet — the contract hasn't started.</div>
          <template v-else>
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <UiSelect v-model="selectedPeriodId" :options="periodOptions" class="w-full sm:w-[220px]" aria-label="Month" />
                <UiSpinner v-if="periodLoading" size="16px" :center="false" />
              </div>
              <div class="flex flex-wrap gap-2">
                <UiButton v-if="periodOpen && can('maintenance-adjust')" variant="secondary" :icon="SlidersHorizontal" @click="openAdjust('period')">Adjust Quota</UiButton>
                <UiButton v-if="can('maintenance-log') && (periodOpen || current)" :icon="Plus" class="flex-1 sm:flex-none" @click="openLog()">Log Work</UiButton>
              </div>
            </div>

            <div v-if="period" class="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
                <p class="text-ui-cap text-ui-muted">Quota</p>
                <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ formatHours(period.quota) }}</p>
              </div>
              <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
                <p class="text-ui-cap text-ui-muted">Rolled over</p>
                <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ formatHours(period.carried) }}</p>
              </div>
              <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
                <p class="text-ui-cap text-ui-muted">Adjustments</p>
                <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ period.adjusted > 0 ? "+" : "" }}{{ formatHours(period.adjusted) }}</p>
              </div>
              <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
                <p class="text-ui-cap text-ui-muted">Used</p>
                <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5 truncate">{{ formatHours(period.used) }} / {{ formatHours(period.total) }}</p>
              </div>
              <div class="rounded-ui-control px-3 py-2.5 min-w-0 col-span-2 md:col-span-1" :class="period.overage > 0 ? 'bg-ui-bad-soft' : 'bg-ui-subtle'">
                <p class="text-ui-cap" :class="period.overage > 0 ? 'text-ui-bad' : 'text-ui-muted'">{{ period.overage > 0 ? "Over quota" : "Left" }}</p>
                <p class="text-ui-h3 tabular-nums mt-0.5" :class="period.overage > 0 ? 'text-ui-bad' : 'text-ui-ink'">{{ formatHours(period.overage > 0 ? period.overage : period.remaining) }}</p>
              </div>
            </div>

            <div v-if="period && periodOpen" class="flex flex-col sm:flex-row sm:items-center gap-2 border border-ui-line rounded-ui-control px-3 py-2.5 text-ui-small">
              <span class="text-ui-text">At month end, unused hours will</span>
              <UiSelect v-model="leftoverChoice" :options="leftoverOptions" :disabled="!can('maintenance-adjust')" class="sm:w-[380px]" aria-label="Unused hours at month end" />
            </div>
            <p v-else-if="period" class="text-ui-small text-ui-text border border-ui-line rounded-ui-control px-3 py-2.5">
              Closed · unused hours: <strong class="text-ui-ink font-medium">{{ leftoverResult(period) }}</strong>
            </p>

            <div v-if="period?.logs?.length" class="border border-ui-line rounded-ui-card overflow-hidden">
              <UiTable :columns="LOG_COLUMNS" :rows="period.logs">
                <template #cell-work_date="{ row }"><span class="text-ui-ink whitespace-nowrap tabular-nums">{{ formatDate(row.work_date) }}</span></template>
                <template #cell-title="{ row }">
                  <div class="py-2 min-w-[180px]">
                    <p class="text-ui-ink font-medium flex items-center gap-1.5">
                      {{ row.title }}
                      <EyeOff v-if="!row.visible_to_client" class="w-3.5 h-3.5 text-ui-faint shrink-0" title="Hidden from client" aria-label="Hidden from client" />
                    </p>
                    <p v-if="row.description" class="text-ui-cap text-ui-muted whitespace-pre-line">{{ row.description }}</p>
                  </div>
                </template>
                <template #cell-category="{ row }"><UiBadge>{{ categoryLabel(row.category) }}</UiBadge></template>
                <template #cell-performer="{ row }"><span class="text-ui-cap text-ui-muted">{{ row.performer || "-" }}</span></template>
                <template #cell-hours="{ row }"><span class="text-ui-ink font-medium whitespace-nowrap tabular-nums">{{ formatHours(row.hours) }}</span></template>
                <template #cell-actions="{ row }">
                  <div v-if="periodOpen && can('maintenance-log')" class="flex items-center justify-end gap-0.5">
                    <UiButton variant="ghost" size="sm" :icon="Pencil" title="Edit" aria-label="Edit" @click="openLog(row)" />
                    <UiButton variant="ghost" size="sm" :icon="Trash2" class="hover:!text-ui-bad" title="Delete" aria-label="Delete" @click="deleteLog(row)" />
                  </div>
                </template>
                <template #mobile="{ row, number }">
                  <div class="flex items-start gap-3 px-4 py-3.5">
                    <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-ui-body font-medium text-ui-ink flex items-center gap-1.5">
                        <span class="min-w-0 break-words">{{ row.title }}</span>
                        <EyeOff v-if="!row.visible_to_client" class="w-3.5 h-3.5 text-ui-faint shrink-0" aria-label="Hidden from client" />
                      </p>
                      <p v-if="row.description" class="text-ui-cap text-ui-muted whitespace-pre-line mt-0.5">{{ row.description }}</p>
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-ui-cap text-ui-muted">
                        <span class="tabular-nums">{{ formatDate(row.work_date) }}</span>
                        <UiBadge>{{ categoryLabel(row.category) }}</UiBadge>
                        <span v-if="row.performer">{{ row.performer }}</span>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-ui-body font-medium text-ui-ink tabular-nums">{{ formatHours(row.hours) }}</p>
                      <div v-if="periodOpen && can('maintenance-log')" class="flex items-center justify-end gap-0.5 mt-1 -mr-1.5">
                        <UiButton variant="ghost" size="sm" :icon="Pencil" aria-label="Edit" @click="openLog(row)" />
                        <UiButton variant="ghost" size="sm" :icon="Trash2" aria-label="Delete" @click="deleteLog(row)" />
                      </div>
                    </div>
                  </div>
                </template>
              </UiTable>
            </div>
            <p v-else-if="period" class="text-ui-small text-ui-muted text-center py-8 border border-dashed border-ui-line-strong rounded-ui-card">No work logged in {{ formatMonth(period.month) }} yet.</p>

            <div v-if="period?.adjustments?.length" class="pt-1">
              <p class="text-ui-over uppercase text-ui-muted mb-2">Quota adjustments</p>
              <div class="border border-ui-line rounded-ui-card divide-y divide-ui-line">
                <div v-for="a in period.adjustments" :key="a.id" class="flex items-center gap-3 text-ui-small px-3.5 py-2.5">
                  <UiBadge :tone="a.hours > 0 ? 'ok' : 'bad'" class="tabular-nums">{{ a.hours > 0 ? "+" : "−" }}{{ formatHours(Math.abs(a.hours)) }}</UiBadge>
                  <span class="text-ui-ink flex-1 min-w-0">{{ a.reason }}</span>
                  <span class="text-ui-cap text-ui-muted whitespace-nowrap hidden sm:inline">{{ a.created_by || "-" }} · {{ formatDate(a.created_at) }}</span>
                  <UiButton v-if="periodOpen && can('maintenance-adjust')" variant="ghost" size="sm" :icon="X" class="hover:!text-ui-bad" title="Remove" aria-label="Remove" @click="deleteAdjustment(a)" />
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Features -->
        <div v-else-if="tab === 'features'" class="p-4 sm:p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p class="text-ui-small text-ui-muted">
              New features paid from the development balance (<span class="tabular-nums">{{ formatHours(contract.balance_hours) }}</span> available). Approving reserves the estimate.
            </p>
            <UiButton v-if="can('maintenance-edit')" :icon="Plus" class="shrink-0" @click="openFeature()">Add Feature</UiButton>
          </div>

          <p v-if="!contract.features.length" class="text-ui-small text-ui-muted text-center py-8 border border-dashed border-ui-line-strong rounded-ui-card">No features yet.</p>
          <div v-else class="space-y-3 ui-stagger">
            <div v-for="f in contract.features" :key="f.id" class="border border-ui-line rounded-ui-card p-4">
              <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-ui-h3 text-ui-ink">{{ f.title }}</p>
                    <UiBadge :tone="FEATURE_TONE[f.status] || 'neutral'" dot>{{ FEATURE_STATUS[f.status]?.label }}</UiBadge>
                    <EyeOff v-if="!f.visible_to_client" class="w-3.5 h-3.5 text-ui-faint" title="Hidden from client" aria-label="Hidden from client" />
                  </div>
                  <p v-if="f.description" class="text-ui-small text-ui-muted mt-1 whitespace-pre-line">{{ f.description }}</p>
                  <div class="flex flex-wrap gap-x-4 gap-y-1 text-ui-cap text-ui-muted mt-2 tabular-nums">
                    <span>Estimate <strong class="text-ui-ink font-medium">{{ formatHours(f.estimated_hours) }}</strong></span>
                    <span v-if="f.status !== 'proposed'">Reserved <strong class="text-ui-ink font-medium">{{ formatHours(f.reserved_hours) }}</strong></span>
                    <span>Used <strong class="text-ui-ink font-medium">{{ formatHours(f.used_hours) }}</strong></span>
                    <span v-if="f.billable_hours > 0" class="text-ui-bad font-medium">
                      {{ formatHours(f.billable_hours) }} billable<template v-if="contract.overage_rate"> · {{ formatRupiah(f.billable_hours * contract.overage_rate) }}</template>
                    </span>
                    <span v-if="['approved', 'in_progress'].includes(f.status) && f.reserved_hours < f.estimated_hours" class="text-ui-warn font-medium">
                      {{ formatHours(f.estimated_hours - f.reserved_hours) }} not covered by the balance
                    </span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-1.5 shrink-0">
                  <template v-if="can('maintenance-edit')">
                    <UiButton v-if="f.status === 'proposed'" size="sm" :icon="CheckCircle2" @click="featureAction(f, 'approve')">Approve</UiButton>
                    <UiButton v-if="['approved', 'in_progress'].includes(f.status) && can('maintenance-log')" variant="secondary" size="sm" :icon="Plus" @click="openLog(null, f)">Log Hours</UiButton>
                    <UiButton v-if="['approved', 'in_progress'].includes(f.status)" size="sm" :icon="CheckCircle2" @click="featureAction(f, 'complete')">Mark Done</UiButton>
                    <UiButton v-if="!['done', 'cancelled'].includes(f.status)" variant="secondary" size="sm" :icon="Pencil" title="Edit" aria-label="Edit feature" @click="openFeature(f)" />
                    <UiButton v-if="!['done', 'cancelled'].includes(f.status)" variant="secondary" size="sm" :icon="Ban" title="Cancel feature" aria-label="Cancel feature" @click="featureAction(f, 'cancel')" />
                    <UiButton v-if="f.status === 'proposed'" variant="danger" size="sm" :icon="Trash2" title="Delete" aria-label="Delete feature" @click="featureAction(f, 'delete')" />
                  </template>
                </div>
              </div>

              <div v-if="f.logs?.length" class="mt-3 border-t border-ui-line pt-2.5">
                <button type="button" class="text-ui-cap font-medium text-ui-accent hover:underline" :aria-expanded="expandedFeature === f.id" @click="expandedFeature = expandedFeature === f.id ? null : f.id">
                  {{ expandedFeature === f.id ? "Hide" : "Show" }} {{ f.logs.length }} work log{{ f.logs.length > 1 ? "s" : "" }}
                </button>
                <ol v-if="expandedFeature === f.id" class="mt-2 divide-y divide-ui-line">
                  <li v-for="(log, i) in f.logs" :key="log.id" class="flex items-center gap-3 text-ui-cap py-1.5">
                    <span class="text-ui-faint tabular-nums w-4 shrink-0">{{ i + 1 }}</span>
                    <span class="text-ui-muted w-24 shrink-0 tabular-nums">{{ formatDate(log.work_date) }}</span>
                    <span class="text-ui-ink flex-1 min-w-0">{{ log.title }}<span v-if="log.performer" class="text-ui-muted"> · {{ log.performer }}</span></span>
                    <span class="font-medium text-ui-ink tabular-nums">{{ formatHours(log.hours) }}</span>
                    <template v-if="['approved', 'in_progress'].includes(f.status) && can('maintenance-log')">
                      <UiButton variant="ghost" size="sm" :icon="Pencil" title="Edit" aria-label="Edit" @click="openLog(log, f)" />
                      <UiButton variant="ghost" size="sm" :icon="Trash2" class="hover:!text-ui-bad" title="Delete" aria-label="Delete" @click="deleteLog(log)" />
                    </template>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <!-- Balance -->
        <div v-else-if="tab === 'balance'" class="p-4 sm:p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p class="text-ui-display text-ui-ink tabular-nums">{{ formatHours(contract.balance_hours) }}</p>
              <p class="text-ui-small text-ui-muted max-w-xl mt-1">
                Unused quota moved here at month end, spent on new features oldest-expiry first.
                <template v-if="contract.bank_expiry_months"> Hours expire {{ contract.bank_expiry_months }} months after the month they came from.</template>
              </p>
              <p v-if="contract.expiring_soon?.hours > 0" class="text-ui-small text-ui-warn font-medium mt-1.5 flex items-center gap-1">
                <AlertTriangle class="w-4 h-4" /> {{ formatHours(contract.expiring_soon.hours) }} expires from {{ formatDate(contract.expiring_soon.first_date) }} unless used.
              </p>
            </div>
            <UiButton v-if="can('maintenance-adjust')" variant="secondary" :icon="SlidersHorizontal" class="shrink-0" @click="openAdjust('balance')">Adjust Balance</UiButton>
          </div>

          <p v-if="!contract.bank_entries.length" class="text-ui-small text-ui-muted text-center py-8 px-4 border border-dashed border-ui-line-strong rounded-ui-card">
            No movements yet. Unused hours arrive here when a month closes{{ contract.leftover_policy !== "bank" ? " (if the month is set to move them here)" : "" }}.
          </p>
          <div v-else class="border border-ui-line rounded-ui-card overflow-hidden">
            <UiTable :columns="BANK_COLUMNS" :rows="contract.bank_entries">
              <template #cell-created_at="{ row }"><span class="text-ui-ink whitespace-nowrap tabular-nums">{{ formatDate(row.created_at) }}</span></template>
              <template #cell-type="{ row }">
                <div class="py-2">
                  <p class="text-ui-ink font-medium">{{ BANK_ENTRY_TYPE[row.type] || row.type }}</p>
                  <p class="text-ui-cap text-ui-muted">{{ row.note }}<template v-if="row.created_by"> · {{ row.created_by }}</template></p>
                </div>
              </template>
              <template #cell-hours="{ row }">
                <span class="font-medium whitespace-nowrap tabular-nums" :class="row.hours >= 0 ? 'text-ui-ok' : 'text-ui-bad'">
                  {{ row.hours >= 0 ? "+" : "−" }}{{ formatHours(Math.abs(row.hours)) }}
                </span>
              </template>
              <template #cell-remaining_hours="{ row }">
                <span class="text-ui-cap text-ui-muted whitespace-nowrap tabular-nums">
                  <template v-if="row.remaining_hours !== null">{{ formatHours(row.remaining_hours) }} · {{ row.expires_at ? formatDate(row.expires_at) : "never" }}</template>
                </span>
              </template>
              <template #mobile="{ row, number }">
                <div class="flex items-start gap-3 px-4 py-3.5">
                  <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-ui-body font-medium text-ui-ink">{{ BANK_ENTRY_TYPE[row.type] || row.type }}</p>
                    <p class="text-ui-cap text-ui-muted">{{ row.note }}<template v-if="row.created_by"> · {{ row.created_by }}</template></p>
                    <p class="text-ui-cap text-ui-muted tabular-nums mt-0.5">
                      {{ formatDate(row.created_at) }}<template v-if="row.remaining_hours !== null"> · {{ formatHours(row.remaining_hours) }} unused · {{ row.expires_at ? formatDate(row.expires_at) : "never" }}</template>
                    </p>
                  </div>
                  <span class="text-ui-body font-medium whitespace-nowrap tabular-nums shrink-0" :class="row.hours >= 0 ? 'text-ui-ok' : 'text-ui-bad'">
                    {{ row.hours >= 0 ? "+" : "−" }}{{ formatHours(Math.abs(row.hours)) }}
                  </span>
                </div>
              </template>
            </UiTable>
          </div>
        </div>

        <!-- History -->
        <div v-else class="p-4 sm:p-5">
          <div class="border border-ui-line rounded-ui-card overflow-hidden">
            <UiTable :columns="HISTORY_COLUMNS" :rows="contract.periods" clickable @row-click="(p) => openMonth(p.id)">
              <template #cell-month="{ row }"><span class="font-medium text-ui-accent whitespace-nowrap">{{ formatMonth(row.month) }}</span></template>
              <template #cell-quota="{ row }"><span class="tabular-nums">{{ formatHours(row.quota) }}</span></template>
              <template #cell-carried="{ row }"><span class="tabular-nums">{{ formatHours(row.carried) }}</span></template>
              <template #cell-adjusted="{ row }"><span class="tabular-nums">{{ row.adjusted > 0 ? "+" : "" }}{{ formatHours(row.adjusted) }}</span></template>
              <template #cell-used="{ row }">
                <span class="whitespace-nowrap tabular-nums" :class="row.overage > 0 ? 'text-ui-bad font-medium' : ''">{{ formatHours(row.used) }} / {{ formatHours(row.total) }}</span>
              </template>
              <template #cell-leftover="{ row }">
                <UiBadge v-if="row.overage > 0 && row.is_closed" tone="bad">{{ formatHours(row.overage) }} over quota</UiBadge>
                <UiBadge v-else-if="!row.is_closed" tone="accent">{{ leftoverResult(row) }}</UiBadge>
                <span v-else class="text-ui-cap text-ui-text">{{ leftoverResult(row) }}</span>
              </template>
              <template #mobile="{ row, number }">
                <div class="flex items-start gap-3 px-4 py-3.5">
                  <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-ui-body font-medium text-ui-accent">{{ formatMonth(row.month) }}</p>
                    <p class="text-ui-cap text-ui-muted tabular-nums mt-0.5">
                      Quota {{ formatHours(row.quota) }} · rolled over {{ formatHours(row.carried) }} · adjusted {{ row.adjusted > 0 ? "+" : "" }}{{ formatHours(row.adjusted) }}
                    </p>
                    <p class="text-ui-cap mt-1" :class="row.overage > 0 && row.is_closed ? 'text-ui-bad font-medium' : 'text-ui-text'">
                      {{ row.overage > 0 && row.is_closed ? `${formatHours(row.overage)} over quota` : leftoverResult(row) }}
                    </p>
                  </div>
                  <span class="text-ui-body whitespace-nowrap tabular-nums shrink-0" :class="row.overage > 0 ? 'text-ui-bad font-medium' : 'text-ui-ink'">
                    {{ formatHours(row.used) }} / {{ formatHours(row.total) }}
                  </span>
                </div>
              </template>
            </UiTable>
          </div>
        </div>
      </section>

      <!-- Client link modal -->
      <UiModal
        v-model:open="showShare"
        title="Client Link"
        description="The client sees this month's quota, the work done, the development balance and features. No login needed."
      >
        <UiSpinner v-if="shareBusy" />
        <div v-else-if="shareUrl" class="space-y-4">
          <div class="flex items-center gap-2 border border-ui-line-strong rounded-ui-control p-1.5 pl-3 min-w-0">
            <Link2 class="w-4 h-4 text-ui-faint shrink-0" />
            <span class="text-ui-small text-ui-ink truncate flex-1 font-mono">{{ shareUrl }}</span>
            <UiButton variant="secondary" size="sm" :icon="copied ? Check : Copy" class="shrink-0" @click="copyLink">{{ copied ? "Copied" : "Copy" }}</UiButton>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <UiButton variant="secondary" :icon="Link2" :href="shareUrl" target="_blank" rel="noopener">Open</UiButton>
            <UiButton variant="secondary" :icon="MessageCircle" :href="whatsappUrl" target="_blank" rel="noopener">WhatsApp</UiButton>
            <UiButton variant="secondary" :icon="Mail" :href="mailUrl">Email</UiButton>
          </div>
          <p class="text-ui-cap text-ui-muted">
            Hidden work logs and features aren't shown to the client.
            <template v-if="contract.share_last_viewed_at"> Last opened {{ formatDate(contract.share_last_viewed_at) }}.</template>
          </p>
          <button v-if="can('maintenance-share')" type="button" class="text-ui-cap font-medium text-ui-bad hover:underline" @click="revokeLink">Revoke link</button>
        </div>
        <div v-else class="space-y-3">
          <p class="text-ui-small text-ui-muted">There's no active link for this contract.</p>
          <UiButton v-if="can('maintenance-share')" variant="secondary" :icon="Link2" @click="createLink">Create Link</UiButton>
        </div>
      </UiModal>

      <!-- Feature modal -->
      <UiModal
        v-model:open="showFeature"
        :title="editingFeature ? 'Edit Feature' : 'New Feature'"
        :description="`Built with hours from the development balance (${formatHours(contract.balance_hours)} available).`"
      >
        <form id="maintenance-feature-form" class="space-y-4" @submit.prevent="saveFeature">
          <div>
            <label for="mf-title" class="block text-ui-small font-medium text-ui-ink mb-1.5">Feature<span class="text-ui-bad"> *</span></label>
            <input
              id="mf-title"
              v-model="featureForm.title"
              maxlength="255"
              placeholder="e.g. Export orders to Excel"
              required
              class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            />
            <p v-if="featureErrors.title" class="text-ui-cap text-ui-bad mt-1.5">{{ featureErrors.title[0] }}</p>
          </div>
          <UiInput v-model="featureForm.description" label="Description" :rows="3" placeholder="Scope and acceptance criteria" />
          <div>
            <label for="mf-estimate" class="block text-ui-small font-medium text-ui-ink mb-1.5">Estimated hours<span class="text-ui-bad"> *</span></label>
            <input
              id="mf-estimate"
              v-model="featureForm.estimated_hours"
              type="number"
              min="0.5"
              step="any"
              class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink tabular-nums border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-muted"
              :disabled="editingFeature && editingFeature.status !== 'proposed'"
              required
            />
            <p v-if="editingFeature && editingFeature.status !== 'proposed'" class="text-ui-cap text-ui-muted mt-1.5">Fixed after approval — it's what was reserved.</p>
            <p v-else-if="Number(featureForm.estimated_hours) > contract.balance_hours" class="text-ui-cap text-ui-warn mt-1.5">
              More than the current balance — the difference would be billable unless the balance grows first.
            </p>
            <p v-if="featureErrors.estimated_hours" class="text-ui-cap text-ui-bad mt-1.5">{{ featureErrors.estimated_hours[0] }}</p>
          </div>
          <label class="flex items-center gap-2.5 cursor-pointer text-ui-small font-medium text-ui-ink">
            <input v-model="featureForm.visible_to_client" type="checkbox" class="w-4 h-4 accent-ui-ink" /> Show to client
          </label>
        </form>
        <template #footer>
          <UiButton variant="secondary" @click="showFeature = false">Cancel</UiButton>
          <UiButton type="submit" form="maintenance-feature-form" :loading="featureBusy">Save</UiButton>
        </template>
      </UiModal>

      <ContractFormModal
        :show="showContractForm"
        :loading="contractSaving"
        :data="contract"
        :clients="clientStore.clients"
        :projects="projectStore.projects"
        :errors="contractErrors"
        @submit="saveContract"
        @close="showContractForm = false"
      />
      <LogFormModal
        :show="showLog"
        :loading="logBusy"
        :log="editingLog"
        :feature="logFeature"
        :default-date="defaultLogDate"
        :employees="employees"
        :default-performer="authStore.user?.id"
        :errors="logErrors"
        @submit="saveLog"
        @close="showLog = false"
      />
      <HoursAdjustModal
        :show="showAdjust"
        :loading="adjustBusy"
        :title="adjustTarget === 'period' ? `Adjust ${formatMonth(period?.month)} Quota` : 'Adjust Development Balance'"
        :description="adjustTarget === 'period' ? 'Applies to this month only; the contract default stays the same.' : 'Top-ups expire like month leftovers do.'"
        :max-deduct="adjustTarget === 'balance' ? contract.balance_hours : null"
        :errors="adjustErrors"
        @submit="saveAdjust"
        @close="showAdjust = false"
      />
    </template>
  </div>
</template>
