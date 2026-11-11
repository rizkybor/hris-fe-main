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
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

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
    t("maintenance.detail.confirm.deleteContract", { name: contract.value.name }),
    { type: "danger", confirmText: t("common.actions.delete") }
  );
  if (!ok) return;
  if (await run(() => store.deleteContract(contract.value.id), t("maintenance.detail.confirm.deleteContractFailed"))) {
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
  }, t("maintenance.detail.confirm.createLinkFailed"));
  shareBusy.value = false;
};
const revokeLink = async () => {
  const ok = await alertModal.confirm(t("maintenance.detail.confirm.revoke"), {
    type: "warning",
    confirmText: t("maintenance.detail.confirm.revokeAction"),
  });
  if (!ok) return;
  await run(async () => {
    await store.unshare(contract.value.id);
    contract.value.share_url = null;
  }, t("maintenance.detail.confirm.revokeFailed"));
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
    if (await run(() => store.setLeftoverAction(period.value.id, value || null), t("maintenance.detail.confirm.updateFailed"))) await load({ silent: true });
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
  const ok = await alertModal.confirm(t("maintenance.detail.confirm.removeAdjustment", { hours: formatHours(adjustment.hours), reason: adjustment.reason }), { confirmText: t("common.actions.remove") });
  if (ok && (await run(() => store.deleteAdjustment(adjustment.id), t("maintenance.detail.confirm.removeFailed")))) await load({ silent: true });
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
  const ok = await alertModal.confirm(t("maintenance.detail.confirm.deleteLog", { title: log.title, hours: formatHours(log.hours) }), { type: "danger", confirmText: t("common.actions.delete") });
  if (ok && (await run(() => store.deleteLog(log.id), t("maintenance.detail.confirm.deleteFailed")))) await load({ silent: true });
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
        ? t("maintenance.detail.confirm.approve", { title: feature.title, estimate: formatHours(feature.estimated_hours), balance: formatHours(balance) })
        : t("maintenance.detail.confirm.approveShort", { title: feature.title, estimate: formatHours(feature.estimated_hours), balance: formatHours(balance) }),
    complete:
      used < feature.reserved_hours
        ? t("maintenance.detail.confirm.complete", { title: feature.title, used: formatHours(used), unused: formatHours(feature.reserved_hours - used) })
        : t("maintenance.detail.confirm.completeFull", { title: feature.title, used: formatHours(used) }),
    cancel:
      feature.status === "proposed"
        ? t("maintenance.detail.confirm.cancelProposed", { title: feature.title })
        : t("maintenance.detail.confirm.cancel", { title: feature.title, used: formatHours(used) }),
    delete: t("maintenance.detail.confirm.delete", { title: feature.title }),
  };
  const ok = await alertModal.confirm(messages[action], {
    type: action === "delete" || action === "cancel" ? "danger" : "info",
    confirmText: { approve: t("common.actions.approve"), complete: t("maintenance.detail.confirm.markDone"), cancel: t("maintenance.detail.cancelFeature"), delete: t("common.actions.delete") }[action],
  });
  if (ok && (await run(() => store.featureAction(feature.id, action), t("maintenance.detail.confirm.actionFailed")))) await load({ silent: true });
};
const expandedFeature = ref(null);

const formatDate = (value) =>
  value ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" }) : "-";

const TABS = computed(() => [
  { key: "work", label: t("maintenance.detail.tabs.work"), icon: ClipboardList },
  { key: "features", label: t("maintenance.detail.tabs.features"), icon: Sparkles },
  { key: "balance", label: t("maintenance.detail.tabs.balance"), icon: PiggyBank },
  { key: "history", label: t("maintenance.detail.tabs.history"), icon: History },
]);
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
  (contract.value?.periods ?? []).map((p) => ({ value: p.id, label: `${formatMonth(p.month)}${p.is_closed ? t("maintenance.detail.closedSuffix") : ""}` }))
);
const leftoverOptions = computed(() => [
  { value: "", label: t("maintenance.detail.contractDefault", { policy: policyLabel(contract.value?.leftover_policy).toLowerCase() }) },
  ...Object.entries(LEFTOVER_POLICY).map(([value, p]) => ({ value, label: p.label.toLowerCase() })),
]);
const LOG_COLUMNS = computed(() => [
  { key: "work_date", label: t("common.labels.date"), width: 120 },
  { key: "title", label: t("maintenance.detail.columns.work") },
  { key: "category", label: t("common.labels.category") },
  { key: "performer", label: t("maintenance.detail.columns.by") },
  { key: "hours", label: t("maintenance.detail.columns.hours"), align: "right" },
  { key: "actions", label: "", align: "right", width: 88 },
]);
const BANK_COLUMNS = computed(() => [
  { key: "created_at", label: t("common.labels.date"), width: 120 },
  { key: "type", label: t("maintenance.detail.columns.movement") },
  { key: "hours", label: t("maintenance.detail.columns.hours"), align: "right" },
  { key: "remaining_hours", label: t("maintenance.detail.columns.unusedExpires"), align: "right" },
]);
const HISTORY_COLUMNS = computed(() => [
  { key: "month", label: t("maintenance.detail.columns.month") },
  { key: "quota", label: t("maintenance.detail.columns.quota"), align: "right" },
  { key: "carried", label: t("maintenance.detail.columns.rolledOver"), align: "right" },
  { key: "adjusted", label: t("maintenance.detail.columns.adjusted"), align: "right" },
  { key: "used", label: t("maintenance.detail.columns.used"), align: "right" },
  { key: "leftover", label: t("maintenance.detail.columns.unusedHours") },
]);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <div v-if="detailLoading && !contract" class="space-y-5">
      <router-link
        :to="{ name: 'admin.maintenance.dashboard' }"
        class="inline-flex items-center gap-1.5 text-ui-small text-ui-muted hover:text-ui-ink transition-colors"
      >
        <ArrowLeft class="w-3.5 h-3.5" /> {{ $t("maintenance.detail.back") }}
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
            <ArrowLeft class="w-3.5 h-3.5" /> {{ $t("maintenance.detail.back") }}
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
            <span class="inline-flex items-center gap-1"><Clock class="w-3.5 h-3.5 text-ui-faint" /> {{ $t("maintenance.common.perMonth", { hours: formatHours(contract.monthly_quota_hours) }) }}</span>
            <span class="tabular-nums">{{ formatDate(contract.start_date) }} – {{ contract.end_date ? formatDate(contract.end_date) : $t("maintenance.detail.ongoing") }}</span>
          </span>
          <span class="block mt-1.5 text-ui-cap">
            {{ $t("maintenance.detail.unusedHours") }} <span class="text-ui-ink font-medium">{{ policyLabel(contract.leftover_policy) }}</span>
            <template v-if="contract.leftover_policy === 'bank'">
              {{ $t("maintenance.detail.cap", { value: contract.bank_cap_hours != null ? formatHours(contract.bank_cap_hours) : $t("maintenance.detail.none") }) }}
              {{ $t("maintenance.detail.expireAfter", { value: contract.bank_expiry_months ? $t("maintenance.detail.months", { n: contract.bank_expiry_months }, contract.bank_expiry_months) : $t("maintenance.common.never") }) }}
            </template>
            <template v-if="contract.overage_rate"><span class="tabular-nums">{{ $t("maintenance.detail.overage", { rate: formatRupiah(contract.overage_rate) }) }}</span></template>
          </span>
          <span v-if="contract.notes" class="block mt-1 text-ui-cap whitespace-pre-line">{{ contract.notes }}</span>
        </template>
        <template #actions>
          <UiButton variant="secondary" :icon="Share2" @click="openShare">{{ $t("maintenance.detail.clientLink") }}</UiButton>
          <UiButton v-if="can('maintenance-edit')" variant="secondary" :icon="Pencil" @click="(contractErrors = {}), (showContractForm = true)">{{ $t("common.actions.edit") }}</UiButton>
          <UiButton v-if="can('maintenance-delete')" variant="danger" :icon="Trash2" @click="deleteContract">{{ $t("common.actions.delete") }}</UiButton>
        </template>
      </UiPageHeader>

      <!-- Key numbers -->
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 ui-stagger">
        <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 col-span-2 min-w-0">
          <template v-if="current">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-ui-small text-ui-muted truncate">{{ $t("maintenance.detail.leftThisMonth", { month: formatMonth(current.month) }) }}</p>
              <p class="text-ui-cap text-ui-muted tabular-nums shrink-0">{{ $t("maintenance.detail.usedOf", { used: formatHours(current.used), total: formatHours(current.total) }) }}</p>
            </div>
            <p class="text-ui-h1 tabular-nums mt-1.5" :class="current.overage > 0 ? 'text-ui-bad' : 'text-ui-ink'">{{ formatHours(current.remaining) }}</p>
            <div class="w-full h-2 bg-ui-subtle rounded-full overflow-hidden mt-2.5">
              <div class="h-full rounded-full" :class="barClass(current)" :style="{ width: `${Math.min(current.used_percent, 100)}%` }"></div>
            </div>
            <p v-if="current.overage > 0" class="text-ui-cap text-ui-bad font-medium mt-1.5 flex items-center gap-1">
              <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
              {{ $t("maintenance.common.overQuota", { hours: formatHours(current.overage) }) }}<template v-if="contract.overage_rate"> · <span class="tabular-nums">{{ $t("maintenance.detail.billable", { amount: formatRupiah(current.overage * contract.overage_rate) }) }}</span></template>
            </p>
          </template>
          <p v-else class="text-ui-small text-ui-muted py-2">{{ $t("maintenance.detail.noQuotaContract", { status: CONTRACT_STATUS[contract.status]?.label.toLowerCase() }) }}</p>
        </div>
        <UiStat :label="$t('maintenance.detail.devBalance')" :icon="PiggyBank" :value="formatHours(contract.balance_hours)">
          <template v-if="contract.expiring_soon?.hours > 0" #hint>
            <span class="text-ui-warn font-medium inline-flex items-center gap-1">
              <AlertTriangle class="w-3.5 h-3.5 shrink-0" /> {{ $t("maintenance.detail.expiresFrom", { hours: formatHours(contract.expiring_soon.hours), date: formatDate(contract.expiring_soon.first_date) }) }}
            </span>
          </template>
        </UiStat>
        <UiStat :label="$t('maintenance.detail.openFeatures')" :icon="Sparkles" :value="contract.open_features" :hint="$t('maintenance.detail.openFeaturesHint')" />
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
          <div v-if="!contract.periods.length" class="text-ui-small text-ui-muted py-6 text-center">{{ $t("maintenance.detail.noMonths") }}</div>
          <template v-else>
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <UiSelect v-model="selectedPeriodId" :options="periodOptions" class="w-full sm:w-[220px]" :aria-label="$t('maintenance.detail.month')" />
                <UiSpinner v-if="periodLoading" size="16px" :center="false" />
              </div>
              <div class="flex flex-wrap gap-2">
                <UiButton v-if="periodOpen && can('maintenance-adjust')" variant="secondary" :icon="SlidersHorizontal" @click="openAdjust('period')">{{ $t("maintenance.detail.adjustQuota") }}</UiButton>
                <UiButton v-if="can('maintenance-log') && (periodOpen || current)" :icon="Plus" class="flex-1 sm:flex-none" @click="openLog()">{{ $t("maintenance.detail.logWork") }}</UiButton>
              </div>
            </div>

            <div v-if="period" class="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
                <p class="text-ui-cap text-ui-muted">{{ $t("maintenance.detail.quota") }}</p>
                <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ formatHours(period.quota) }}</p>
              </div>
              <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
                <p class="text-ui-cap text-ui-muted">{{ $t("maintenance.detail.rolledOver") }}</p>
                <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ formatHours(period.carried) }}</p>
              </div>
              <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
                <p class="text-ui-cap text-ui-muted">{{ $t("maintenance.detail.adjustments") }}</p>
                <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ period.adjusted > 0 ? "+" : "" }}{{ formatHours(period.adjusted) }}</p>
              </div>
              <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
                <p class="text-ui-cap text-ui-muted">{{ $t("maintenance.detail.used") }}</p>
                <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5 truncate">{{ formatHours(period.used) }} / {{ formatHours(period.total) }}</p>
              </div>
              <div class="rounded-ui-control px-3 py-2.5 min-w-0 col-span-2 md:col-span-1" :class="period.overage > 0 ? 'bg-ui-bad-soft' : 'bg-ui-subtle'">
                <p class="text-ui-cap" :class="period.overage > 0 ? 'text-ui-bad' : 'text-ui-muted'">{{ period.overage > 0 ? $t("maintenance.detail.overQuota") : $t("maintenance.detail.left") }}</p>
                <p class="text-ui-h3 tabular-nums mt-0.5" :class="period.overage > 0 ? 'text-ui-bad' : 'text-ui-ink'">{{ formatHours(period.overage > 0 ? period.overage : period.remaining) }}</p>
              </div>
            </div>

            <div v-if="period && periodOpen" class="flex flex-col sm:flex-row sm:items-center gap-2 border border-ui-line rounded-ui-control px-3 py-2.5 text-ui-small">
              <span class="text-ui-text">{{ $t("maintenance.detail.atMonthEnd") }}</span>
              <UiSelect v-model="leftoverChoice" :options="leftoverOptions" :disabled="!can('maintenance-adjust')" class="sm:w-[380px]" :aria-label="$t('maintenance.detail.unusedAtMonthEnd')" />
            </div>
            <p v-else-if="period" class="text-ui-small text-ui-text border border-ui-line rounded-ui-control px-3 py-2.5">
              {{ $t("maintenance.detail.closedUnused") }} <strong class="text-ui-ink font-medium">{{ leftoverResult(period) }}</strong>
            </p>

            <div v-if="period?.logs?.length" class="border border-ui-line rounded-ui-card overflow-hidden">
              <UiTable :columns="LOG_COLUMNS" :rows="period.logs">
                <template #cell-work_date="{ row }"><span class="text-ui-ink whitespace-nowrap tabular-nums">{{ formatDate(row.work_date) }}</span></template>
                <template #cell-title="{ row }">
                  <div class="py-2 min-w-[180px]">
                    <p class="text-ui-ink font-medium flex items-center gap-1.5">
                      {{ row.title }}
                      <EyeOff v-if="!row.visible_to_client" class="w-3.5 h-3.5 text-ui-faint shrink-0" :title="$t('maintenance.detail.hiddenFromClient')" :aria-label="$t('maintenance.detail.hiddenFromClient')" />
                    </p>
                    <p v-if="row.description" class="text-ui-cap text-ui-muted whitespace-pre-line">{{ row.description }}</p>
                  </div>
                </template>
                <template #cell-category="{ row }"><UiBadge>{{ categoryLabel(row.category) }}</UiBadge></template>
                <template #cell-performer="{ row }"><span class="text-ui-cap text-ui-muted">{{ row.performer || "-" }}</span></template>
                <template #cell-hours="{ row }"><span class="text-ui-ink font-medium whitespace-nowrap tabular-nums">{{ formatHours(row.hours) }}</span></template>
                <template #cell-actions="{ row }">
                  <div v-if="periodOpen && can('maintenance-log')" class="flex items-center justify-end gap-0.5">
                    <UiButton variant="ghost" size="sm" :icon="Pencil" :title="$t('common.actions.edit')" :aria-label="$t('common.actions.edit')" @click="openLog(row)" />
                    <UiButton variant="ghost" size="sm" :icon="Trash2" class="hover:!text-ui-bad" :title="$t('common.actions.delete')" :aria-label="$t('common.actions.delete')" @click="deleteLog(row)" />
                  </div>
                </template>
                <template #mobile="{ row, number }">
                  <div class="flex items-start gap-3 px-4 py-3.5">
                    <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-ui-body font-medium text-ui-ink flex items-center gap-1.5">
                        <span class="min-w-0 break-words">{{ row.title }}</span>
                        <EyeOff v-if="!row.visible_to_client" class="w-3.5 h-3.5 text-ui-faint shrink-0" :aria-label="$t('maintenance.detail.hiddenFromClient')" />
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
                        <UiButton variant="ghost" size="sm" :icon="Pencil" :aria-label="$t('common.actions.edit')" @click="openLog(row)" />
                        <UiButton variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('common.actions.delete')" @click="deleteLog(row)" />
                      </div>
                    </div>
                  </div>
                </template>
              </UiTable>
            </div>
            <p v-else-if="period" class="text-ui-small text-ui-muted text-center py-8 border border-dashed border-ui-line-strong rounded-ui-card">{{ $t("maintenance.detail.noWorkIn", { month: formatMonth(period.month) }) }}</p>

            <div v-if="period?.adjustments?.length" class="pt-1">
              <p class="text-ui-over uppercase text-ui-muted mb-2">{{ $t("maintenance.detail.quotaAdjustments") }}</p>
              <div class="border border-ui-line rounded-ui-card divide-y divide-ui-line">
                <div v-for="a in period.adjustments" :key="a.id" class="flex items-center gap-3 text-ui-small px-3.5 py-2.5">
                  <UiBadge :tone="a.hours > 0 ? 'ok' : 'bad'" class="tabular-nums">{{ a.hours > 0 ? "+" : "−" }}{{ formatHours(Math.abs(a.hours)) }}</UiBadge>
                  <span class="text-ui-ink flex-1 min-w-0">{{ a.reason }}</span>
                  <span class="text-ui-cap text-ui-muted whitespace-nowrap hidden sm:inline">{{ a.created_by || "-" }} · {{ formatDate(a.created_at) }}</span>
                  <UiButton v-if="periodOpen && can('maintenance-adjust')" variant="ghost" size="sm" :icon="X" class="hover:!text-ui-bad" :title="$t('common.actions.remove')" :aria-label="$t('common.actions.remove')" @click="deleteAdjustment(a)" />
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Features -->
        <div v-else-if="tab === 'features'" class="p-4 sm:p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p class="text-ui-small text-ui-muted">
              {{ $t("maintenance.detail.featuresIntro", { hours: formatHours(contract.balance_hours) }) }}
            </p>
            <UiButton v-if="can('maintenance-edit')" :icon="Plus" class="shrink-0" @click="openFeature()">{{ $t("maintenance.detail.addFeature") }}</UiButton>
          </div>

          <p v-if="!contract.features.length" class="text-ui-small text-ui-muted text-center py-8 border border-dashed border-ui-line-strong rounded-ui-card">{{ $t("maintenance.detail.noFeatures") }}</p>
          <div v-else class="space-y-3 ui-stagger">
            <div v-for="f in contract.features" :key="f.id" class="border border-ui-line rounded-ui-card p-4">
              <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-ui-h3 text-ui-ink">{{ f.title }}</p>
                    <UiBadge :tone="FEATURE_TONE[f.status] || 'neutral'" dot>{{ FEATURE_STATUS[f.status]?.label }}</UiBadge>
                    <EyeOff v-if="!f.visible_to_client" class="w-3.5 h-3.5 text-ui-faint" :title="$t('maintenance.detail.hiddenFromClient')" :aria-label="$t('maintenance.detail.hiddenFromClient')" />
                  </div>
                  <p v-if="f.description" class="text-ui-small text-ui-muted mt-1 whitespace-pre-line">{{ f.description }}</p>
                  <div class="flex flex-wrap gap-x-4 gap-y-1 text-ui-cap text-ui-muted mt-2 tabular-nums">
                    <span>{{ $t("maintenance.detail.estimate") }} <strong class="text-ui-ink font-medium">{{ formatHours(f.estimated_hours) }}</strong></span>
                    <span v-if="f.status !== 'proposed'">{{ $t("maintenance.detail.reserved") }} <strong class="text-ui-ink font-medium">{{ formatHours(f.reserved_hours) }}</strong></span>
                    <span>{{ $t("maintenance.detail.featureUsed") }} <strong class="text-ui-ink font-medium">{{ formatHours(f.used_hours) }}</strong></span>
                    <span v-if="f.billable_hours > 0" class="text-ui-bad font-medium">
                      {{ $t("maintenance.detail.billableHours", { hours: formatHours(f.billable_hours) }) }}<template v-if="contract.overage_rate"> · {{ formatRupiah(f.billable_hours * contract.overage_rate) }}</template>
                    </span>
                    <span v-if="['approved', 'in_progress'].includes(f.status) && f.reserved_hours < f.estimated_hours" class="text-ui-warn font-medium">
                      {{ $t("maintenance.detail.notCovered", { hours: formatHours(f.estimated_hours - f.reserved_hours) }) }}
                    </span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-1.5 shrink-0">
                  <template v-if="can('maintenance-edit')">
                    <UiButton v-if="f.status === 'proposed'" size="sm" :icon="CheckCircle2" @click="featureAction(f, 'approve')">{{ $t("common.actions.approve") }}</UiButton>
                    <UiButton v-if="['approved', 'in_progress'].includes(f.status) && can('maintenance-log')" variant="secondary" size="sm" :icon="Plus" @click="openLog(null, f)">{{ $t("maintenance.detail.logHours") }}</UiButton>
                    <UiButton v-if="['approved', 'in_progress'].includes(f.status)" size="sm" :icon="CheckCircle2" @click="featureAction(f, 'complete')">{{ $t("maintenance.detail.markDone") }}</UiButton>
                    <UiButton v-if="!['done', 'cancelled'].includes(f.status)" variant="secondary" size="sm" :icon="Pencil" :title="$t('common.actions.edit')" :aria-label="$t('maintenance.detail.editFeature')" @click="openFeature(f)" />
                    <UiButton v-if="!['done', 'cancelled'].includes(f.status)" variant="secondary" size="sm" :icon="Ban" :title="$t('maintenance.detail.cancelFeature')" :aria-label="$t('maintenance.detail.cancelFeature')" @click="featureAction(f, 'cancel')" />
                    <UiButton v-if="f.status === 'proposed'" variant="danger" size="sm" :icon="Trash2" :title="$t('common.actions.delete')" :aria-label="$t('maintenance.detail.deleteFeature')" @click="featureAction(f, 'delete')" />
                  </template>
                </div>
              </div>

              <div v-if="f.logs?.length" class="mt-3 border-t border-ui-line pt-2.5">
                <button type="button" class="text-ui-cap font-medium text-ui-accent hover:underline" :aria-expanded="expandedFeature === f.id" @click="expandedFeature = expandedFeature === f.id ? null : f.id">
                  {{ $t(expandedFeature === f.id ? "maintenance.detail.hideLogs" : "maintenance.detail.showLogs", { n: f.logs.length }, f.logs.length) }}
                </button>
                <ol v-if="expandedFeature === f.id" class="mt-2 divide-y divide-ui-line">
                  <li v-for="(log, i) in f.logs" :key="log.id" class="flex items-center gap-3 text-ui-cap py-1.5">
                    <span class="text-ui-faint tabular-nums w-4 shrink-0">{{ i + 1 }}</span>
                    <span class="text-ui-muted w-24 shrink-0 tabular-nums">{{ formatDate(log.work_date) }}</span>
                    <span class="text-ui-ink flex-1 min-w-0">{{ log.title }}<span v-if="log.performer" class="text-ui-muted"> · {{ log.performer }}</span></span>
                    <span class="font-medium text-ui-ink tabular-nums">{{ formatHours(log.hours) }}</span>
                    <template v-if="['approved', 'in_progress'].includes(f.status) && can('maintenance-log')">
                      <UiButton variant="ghost" size="sm" :icon="Pencil" :title="$t('common.actions.edit')" :aria-label="$t('common.actions.edit')" @click="openLog(log, f)" />
                      <UiButton variant="ghost" size="sm" :icon="Trash2" class="hover:!text-ui-bad" :title="$t('common.actions.delete')" :aria-label="$t('common.actions.delete')" @click="deleteLog(log)" />
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
                {{ $t("maintenance.detail.balanceIntro") }}
                <template v-if="contract.bank_expiry_months">{{ $t("maintenance.detail.balanceExpiry", { n: contract.bank_expiry_months }) }}</template>
              </p>
              <p v-if="contract.expiring_soon?.hours > 0" class="text-ui-small text-ui-warn font-medium mt-1.5 flex items-center gap-1">
                <AlertTriangle class="w-4 h-4" /> {{ $t("maintenance.detail.expiresUnlessUsed", { hours: formatHours(contract.expiring_soon.hours), date: formatDate(contract.expiring_soon.first_date) }) }}
              </p>
            </div>
            <UiButton v-if="can('maintenance-adjust')" variant="secondary" :icon="SlidersHorizontal" class="shrink-0" @click="openAdjust('balance')">{{ $t("maintenance.detail.adjustBalance") }}</UiButton>
          </div>

          <p v-if="!contract.bank_entries.length" class="text-ui-small text-ui-muted text-center py-8 px-4 border border-dashed border-ui-line-strong rounded-ui-card">
            {{ contract.leftover_policy !== "bank" ? $t("maintenance.detail.noMovementsNotBank") : $t("maintenance.detail.noMovements") }}
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
                  <template v-if="row.remaining_hours !== null">{{ formatHours(row.remaining_hours) }} · {{ row.expires_at ? formatDate(row.expires_at) : $t("maintenance.common.never") }}</template>
                </span>
              </template>
              <template #mobile="{ row, number }">
                <div class="flex items-start gap-3 px-4 py-3.5">
                  <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-ui-body font-medium text-ui-ink">{{ BANK_ENTRY_TYPE[row.type] || row.type }}</p>
                    <p class="text-ui-cap text-ui-muted">{{ row.note }}<template v-if="row.created_by"> · {{ row.created_by }}</template></p>
                    <p class="text-ui-cap text-ui-muted tabular-nums mt-0.5">
                      {{ formatDate(row.created_at) }}<template v-if="row.remaining_hours !== null"> · {{ $t("maintenance.detail.unused", { hours: formatHours(row.remaining_hours) }) }} · {{ row.expires_at ? formatDate(row.expires_at) : $t("maintenance.common.never") }}</template>
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
                <UiBadge v-if="row.overage > 0 && row.is_closed" tone="bad">{{ $t("maintenance.common.overQuota", { hours: formatHours(row.overage) }) }}</UiBadge>
                <UiBadge v-else-if="!row.is_closed" tone="accent">{{ leftoverResult(row) }}</UiBadge>
                <span v-else class="text-ui-cap text-ui-text">{{ leftoverResult(row) }}</span>
              </template>
              <template #mobile="{ row, number }">
                <div class="flex items-start gap-3 px-4 py-3.5">
                  <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-ui-body font-medium text-ui-accent">{{ formatMonth(row.month) }}</p>
                    <p class="text-ui-cap text-ui-muted tabular-nums mt-0.5">
                      {{ $t("maintenance.detail.historyMobile", { quota: formatHours(row.quota), carried: formatHours(row.carried), adjusted: (row.adjusted > 0 ? "+" : "") + formatHours(row.adjusted) }) }}
                    </p>
                    <p class="text-ui-cap mt-1" :class="row.overage > 0 && row.is_closed ? 'text-ui-bad font-medium' : 'text-ui-text'">
                      {{ row.overage > 0 && row.is_closed ? $t("maintenance.common.overQuota", { hours: formatHours(row.overage) }) : leftoverResult(row) }}
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
        :title="$t('maintenance.detail.clientLink')"
        :description="$t('maintenance.detail.shareDescription')"
      >
        <UiSpinner v-if="shareBusy" />
        <div v-else-if="shareUrl" class="space-y-4">
          <div class="flex items-center gap-2 border border-ui-line-strong rounded-ui-control p-1.5 pl-3 min-w-0">
            <Link2 class="w-4 h-4 text-ui-faint shrink-0" />
            <span class="text-ui-small text-ui-ink truncate flex-1 font-mono">{{ shareUrl }}</span>
            <UiButton variant="secondary" size="sm" :icon="copied ? Check : Copy" class="shrink-0" @click="copyLink">{{ copied ? $t("common.actions.copied") : $t("common.actions.copy") }}</UiButton>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <UiButton variant="secondary" :icon="Link2" :href="shareUrl" target="_blank" rel="noopener">{{ $t("common.actions.open") }}</UiButton>
            <UiButton variant="secondary" :icon="MessageCircle" :href="whatsappUrl" target="_blank" rel="noopener">WhatsApp</UiButton>
            <UiButton variant="secondary" :icon="Mail" :href="mailUrl">{{ $t("common.labels.email") }}</UiButton>
          </div>
          <p class="text-ui-cap text-ui-muted">
            {{ $t("maintenance.detail.hiddenNotShown") }}
            <template v-if="contract.share_last_viewed_at">{{ $t("maintenance.detail.lastOpened", { date: formatDate(contract.share_last_viewed_at) }) }}</template>
          </p>
          <button v-if="can('maintenance-share')" type="button" class="text-ui-cap font-medium text-ui-bad hover:underline" @click="revokeLink">{{ $t("maintenance.detail.revokeLink") }}</button>
        </div>
        <div v-else class="space-y-3">
          <p class="text-ui-small text-ui-muted">{{ $t("maintenance.detail.noLink") }}</p>
          <UiButton v-if="can('maintenance-share')" variant="secondary" :icon="Link2" @click="createLink">{{ $t("maintenance.detail.createLink") }}</UiButton>
        </div>
      </UiModal>

      <!-- Feature modal -->
      <UiModal
        v-model:open="showFeature"
        :title="editingFeature ? $t('maintenance.detail.featureModal.editTitle') : $t('maintenance.detail.featureModal.newTitle')"
        :description="$t('maintenance.detail.featureModal.description', { hours: formatHours(contract.balance_hours) })"
      >
        <form id="maintenance-feature-form" class="space-y-4" @submit.prevent="saveFeature">
          <div>
            <label for="mf-title" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("maintenance.detail.featureModal.feature") }}<span class="text-ui-bad"> *</span></label>
            <input
              id="mf-title"
              v-model="featureForm.title"
              maxlength="255"
              :placeholder="$t('maintenance.detail.featureModal.featurePlaceholder')"
              required
              class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            />
            <p v-if="featureErrors.title" class="text-ui-cap text-ui-bad mt-1.5">{{ featureErrors.title[0] }}</p>
          </div>
          <UiInput v-model="featureForm.description" :label="$t('common.labels.description')" :rows="3" :placeholder="$t('maintenance.detail.featureModal.descriptionPlaceholder')" />
          <div>
            <label for="mf-estimate" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("maintenance.detail.featureModal.estimatedHours") }}<span class="text-ui-bad"> *</span></label>
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
            <p v-if="editingFeature && editingFeature.status !== 'proposed'" class="text-ui-cap text-ui-muted mt-1.5">{{ $t("maintenance.detail.featureModal.fixedHint") }}</p>
            <p v-else-if="Number(featureForm.estimated_hours) > contract.balance_hours" class="text-ui-cap text-ui-warn mt-1.5">
              {{ $t("maintenance.detail.featureModal.overBalance") }}
            </p>
            <p v-if="featureErrors.estimated_hours" class="text-ui-cap text-ui-bad mt-1.5">{{ featureErrors.estimated_hours[0] }}</p>
          </div>
          <label class="flex items-center gap-2.5 cursor-pointer text-ui-small font-medium text-ui-ink">
            <input v-model="featureForm.visible_to_client" type="checkbox" class="w-4 h-4 accent-ui-ink" /> {{ $t("maintenance.logForm.showToClient") }}
          </label>
        </form>
        <template #footer>
          <UiButton variant="secondary" @click="showFeature = false">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="maintenance-feature-form" :loading="featureBusy">{{ $t("common.actions.save") }}</UiButton>
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
        :title="adjustTarget === 'period' ? $t('maintenance.detail.adjustPeriodTitle', { month: formatMonth(period?.month) }) : $t('maintenance.detail.adjustBalanceTitle')"
        :description="adjustTarget === 'period' ? $t('maintenance.detail.adjustPeriodHint') : $t('maintenance.detail.adjustBalanceHint')"
        :max-deduct="adjustTarget === 'balance' ? contract.balance_hours : null"
        :errors="adjustErrors"
        @submit="saveAdjust"
        @close="showAdjust = false"
      />
    </template>
  </div>
</template>
