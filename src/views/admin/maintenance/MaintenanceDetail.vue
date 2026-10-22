<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  ArrowLeft, Wrench, Building2, FolderKanban, Pencil, Trash2, Share2, Plus, PiggyBank, Sparkles, ClipboardList, History,
  EyeOff, Loader2, X, Copy, Check, Link2, Mail, MessageCircle, AlertTriangle, Clock, SlidersHorizontal, CheckCircle2, Ban,
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
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
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
</script>

<template>
  <div class="px-4 py-4">
    <router-link
      :to="{ name: 'admin.maintenance.dashboard' }"
      class="inline-flex items-center gap-1.5 text-brand-light hover:text-[#0C51D9] text-xs font-semibold mb-3 transition-colors"
    >
      <ArrowLeft class="w-3.5 h-3.5" /> Back to Maintenance
    </router-link>

    <div v-if="detailLoading && !contract" class="space-y-4">
      <Skeleton height="120px" rounded="14px" />
      <Skeleton height="260px" rounded="14px" />
    </div>

    <template v-else-if="contract">
      <!-- Header -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-11 h-11 bg-teal-50 rounded-[12px] flex items-center justify-center shrink-0">
            <Wrench class="w-5 h-5 text-teal-600" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-brand-dark text-lg font-bold">{{ contract.name }}</h3>
              <span class="px-2 py-0.5 rounded-md text-xs font-semibold" :class="CONTRACT_STATUS[contract.status]?.class">{{ CONTRACT_STATUS[contract.status]?.label }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
              <router-link v-if="contract.client" :to="{ name: 'admin.clients.detail', params: { id: contract.client.id } }" class="inline-flex items-center gap-1 hover:text-[#0C51D9]">
                <Building2 class="w-3 h-3" /> {{ contract.client.name }}
              </router-link>
              <router-link v-if="contract.project" :to="{ name: 'admin.projects.detail', params: { id: contract.project.id } }" class="inline-flex items-center gap-1 hover:text-[#0C51D9]">
                <FolderKanban class="w-3 h-3" /> {{ contract.project.name }}
              </router-link>
              <span class="inline-flex items-center gap-1"><Clock class="w-3 h-3" /> {{ formatHours(contract.monthly_quota_hours) }} / month</span>
              <span>{{ formatDate(contract.start_date) }} – {{ contract.end_date ? formatDate(contract.end_date) : "ongoing" }}</span>
            </div>
            <p class="text-xs text-brand-light mt-1">
              Unused hours: <span class="text-brand-dark font-medium">{{ policyLabel(contract.leftover_policy) }}</span>
              <template v-if="contract.leftover_policy === 'bank'">
                · cap {{ contract.bank_cap_hours != null ? formatHours(contract.bank_cap_hours) : "none" }}
                · expire after {{ contract.bank_expiry_months ? `${contract.bank_expiry_months} months` : "never" }}
              </template>
              <template v-if="contract.overage_rate"> · overage {{ formatRupiah(contract.overage_rate) }}/h</template>
            </p>
            <p v-if="contract.notes" class="text-xs text-brand-light mt-1 whitespace-pre-line">{{ contract.notes }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" class="mt-btn" @click="openShare"><Share2 class="w-4 h-4" /> Client Link</button>
          <button v-if="can('maintenance-edit')" type="button" class="mt-btn" @click="(contractErrors = {}), (showContractForm = true)"><Pencil class="w-4 h-4" /> Edit</button>
          <button v-if="can('maintenance-delete')" type="button" class="mt-btn mt-btn--danger" @click="deleteContract"><Trash2 class="w-4 h-4" /> Delete</button>
        </div>
      </div>

      <!-- Key numbers -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:col-span-2">
          <template v-if="current">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-brand-light text-xs font-medium">Left this month · {{ formatMonth(current.month) }}</p>
              <p class="text-xs text-brand-light">{{ formatHours(current.used) }} used of {{ formatHours(current.total) }}</p>
            </div>
            <p class="text-brand-dark text-2xl font-extrabold mt-1">{{ formatHours(current.remaining) }}</p>
            <div class="w-full bg-gray-100 rounded-full overflow-hidden mt-2" style="height: 10px">
              <div class="h-full rounded-full" :style="{ width: `${Math.min(current.used_percent, 100)}%`, backgroundColor: usageColor(current) }"></div>
            </div>
            <p v-if="current.overage > 0" class="text-xs text-red-600 font-semibold mt-1.5">
              {{ formatHours(current.overage) }} over quota<template v-if="contract.overage_rate"> · {{ formatRupiah(current.overage * contract.overage_rate) }} billable</template>
            </p>
          </template>
          <p v-else class="text-sm text-brand-light">No quota this month — the contract is {{ CONTRACT_STATUS[contract.status]?.label.toLowerCase() }}.</p>
        </div>
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
          <p class="text-brand-light text-xs font-medium">Development balance</p>
          <p class="text-brand-dark text-2xl font-extrabold mt-1">{{ formatHours(contract.balance_hours) }}</p>
          <p v-if="contract.expiring_soon?.hours > 0" class="text-xs text-amber-700 mt-1 flex items-center gap-1">
            <AlertTriangle class="w-3.5 h-3.5" /> {{ formatHours(contract.expiring_soon.hours) }} expires from {{ formatDate(contract.expiring_soon.first_date) }}
          </p>
        </div>
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
          <p class="text-brand-light text-xs font-medium">Open features</p>
          <p class="text-brand-dark text-2xl font-extrabold mt-1">{{ contract.open_features }}</p>
          <p class="text-xs text-brand-light mt-1">Paid from the development balance</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px]">
        <div class="flex gap-1 border-b border-[#DCDEDD] px-3 overflow-x-auto">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            class="px-3 py-3 text-sm font-semibold inline-flex items-center gap-1.5 border-b-2 -mb-px whitespace-nowrap"
            :class="tab === t.key ? 'border-[#0C51D9] text-[#0C51D9]' : 'border-transparent text-brand-light hover:text-brand-dark'"
            @click="tab = t.key"
          >
            <component :is="t.icon" class="w-4 h-4" /> {{ t.label }}
          </button>
        </div>

        <!-- Work log -->
        <div v-if="tab === 'work'" class="p-4 sm:p-5">
          <div v-if="!contract.periods.length" class="text-sm text-brand-light py-6 text-center">No months yet — the contract hasn't started.</div>
          <template v-else>
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div class="flex flex-wrap items-center gap-2">
                <select v-model="selectedPeriodId" class="mt-input !w-auto font-semibold">
                  <option v-for="p in contract.periods" :key="p.id" :value="p.id">{{ formatMonth(p.month) }}{{ p.is_closed ? " (closed)" : "" }}</option>
                </select>
                <Loader2 v-if="periodLoading" class="w-4 h-4 animate-spin text-[#0C51D9]" />
              </div>
              <div class="flex flex-wrap gap-2">
                <button v-if="periodOpen && can('maintenance-adjust')" type="button" class="mt-btn" @click="openAdjust('period')">
                  <SlidersHorizontal class="w-4 h-4" /> Adjust Quota
                </button>
                <button
                  v-if="can('maintenance-log') && (periodOpen || current)"
                  type="button"
                  class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-3.5 py-2 flex items-center gap-1.5"
                  @click="openLog()"
                >
                  <Plus class="w-4 h-4 text-white" /><span class="text-brand-white text-sm font-semibold">Log Work</span>
                </button>
              </div>
            </div>

            <div v-if="period" class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4 text-xs">
              <div class="mt-stat"><p>Quota</p><strong>{{ formatHours(period.quota) }}</strong></div>
              <div class="mt-stat"><p>Rolled over</p><strong>{{ formatHours(period.carried) }}</strong></div>
              <div class="mt-stat"><p>Adjustments</p><strong>{{ period.adjusted > 0 ? "+" : "" }}{{ formatHours(period.adjusted) }}</strong></div>
              <div class="mt-stat"><p>Used</p><strong>{{ formatHours(period.used) }} / {{ formatHours(period.total) }}</strong></div>
              <div class="mt-stat" :class="{ '!border-red-200 !bg-red-50': period.overage > 0 }">
                <p>{{ period.overage > 0 ? "Over quota" : "Left" }}</p>
                <strong :class="{ 'text-red-600': period.overage > 0 }">{{ formatHours(period.overage > 0 ? period.overage : period.remaining) }}</strong>
              </div>
            </div>

            <div v-if="period && periodOpen" class="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 border border-[#DCDEDD] rounded-[10px] px-3 py-2.5 mb-4 text-sm">
              <span class="text-brand-dark">At month end, unused hours will</span>
              <select v-model="leftoverChoice" class="mt-input !w-auto !py-1.5 text-sm" :disabled="!can('maintenance-adjust')">
                <option value="">{{ policyLabel(contract.leftover_policy).toLowerCase() }} (contract default)</option>
                <option v-for="(p, key) in LEFTOVER_POLICY" :key="key" :value="key">{{ p.label.toLowerCase() }}</option>
              </select>
            </div>
            <p v-else-if="period" class="text-sm bg-slate-50 border border-[#DCDEDD] rounded-[10px] px-3 py-2.5 mb-4 text-brand-dark">
              Closed · unused hours: <strong>{{ leftoverResult(period) }}</strong>
            </p>

            <div v-if="period?.logs?.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs text-brand-light border-b border-[#DCDEDD]">
                    <th class="py-2 pr-3 font-semibold">Date</th>
                    <th class="py-2 pr-3 font-semibold">Work</th>
                    <th class="py-2 pr-3 font-semibold hidden md:table-cell">Category</th>
                    <th class="py-2 pr-3 font-semibold hidden md:table-cell">By</th>
                    <th class="py-2 pr-3 font-semibold text-right">Hours</th>
                    <th class="py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in period.logs" :key="log.id" class="border-b border-[#F1F1F1] align-top">
                    <td class="py-2.5 pr-3 whitespace-nowrap text-brand-dark">{{ formatDate(log.work_date) }}</td>
                    <td class="py-2.5 pr-3">
                      <p class="font-semibold text-brand-dark flex items-center gap-1.5">
                        {{ log.title }}
                        <EyeOff v-if="!log.visible_to_client" class="w-3.5 h-3.5 text-gray-400" title="Hidden from client" />
                      </p>
                      <p v-if="log.description" class="text-xs text-brand-light whitespace-pre-line">{{ log.description }}</p>
                    </td>
                    <td class="py-2.5 pr-3 hidden md:table-cell"><span class="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium whitespace-nowrap">{{ categoryLabel(log.category) }}</span></td>
                    <td class="py-2.5 pr-3 hidden md:table-cell text-xs text-brand-light">{{ log.performer || "-" }}</td>
                    <td class="py-2.5 pr-3 text-right font-semibold text-brand-dark whitespace-nowrap">{{ formatHours(log.hours) }}</td>
                    <td class="py-2.5 text-right whitespace-nowrap">
                      <template v-if="periodOpen && can('maintenance-log')">
                        <button type="button" class="mt-icon" title="Edit" @click="openLog(log)"><Pencil class="w-3.5 h-3.5" /></button>
                        <button type="button" class="mt-icon hover:!text-red-600" title="Delete" @click="deleteLog(log)"><Trash2 class="w-3.5 h-3.5" /></button>
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else-if="period" class="text-sm text-brand-light text-center py-8 border border-dashed border-[#DCDEDD] rounded-[12px]">No work logged in {{ formatMonth(period.month) }} yet.</p>

            <div v-if="period?.adjustments?.length" class="mt-5">
              <p class="text-xs font-bold text-brand-dark uppercase tracking-wide mb-2">Quota adjustments</p>
              <div class="space-y-1.5">
                <div v-for="a in period.adjustments" :key="a.id" class="flex items-center gap-3 text-sm border border-[#F1F1F1] rounded-[10px] px-3 py-2">
                  <span class="font-bold whitespace-nowrap" :class="a.hours > 0 ? 'text-green-700' : 'text-red-600'">{{ a.hours > 0 ? "+" : "−" }}{{ formatHours(Math.abs(a.hours)) }}</span>
                  <span class="text-brand-dark flex-1 min-w-0">{{ a.reason }}</span>
                  <span class="text-xs text-brand-light whitespace-nowrap hidden sm:inline">{{ a.created_by || "-" }} · {{ formatDate(a.created_at) }}</span>
                  <button v-if="periodOpen && can('maintenance-adjust')" type="button" class="mt-icon hover:!text-red-600" title="Remove" @click="deleteAdjustment(a)"><X class="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Features -->
        <div v-else-if="tab === 'features'" class="p-4 sm:p-5">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <p class="text-sm text-brand-light">
              New features paid from the development balance ({{ formatHours(contract.balance_hours) }} available). Approving reserves the estimate.
            </p>
            <button v-if="can('maintenance-edit')" type="button" class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-3.5 py-2 flex items-center gap-1.5 shrink-0" @click="openFeature()">
              <Plus class="w-4 h-4 text-white" /><span class="text-brand-white text-sm font-semibold">Add Feature</span>
            </button>
          </div>

          <p v-if="!contract.features.length" class="text-sm text-brand-light text-center py-8 border border-dashed border-[#DCDEDD] rounded-[12px]">No features yet.</p>
          <div v-else class="space-y-3">
            <div v-for="f in contract.features" :key="f.id" class="border border-[#DCDEDD] rounded-[12px] p-4">
              <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-brand-dark text-sm font-bold">{{ f.title }}</p>
                    <span class="px-2 py-0.5 rounded-md text-xs font-semibold" :class="FEATURE_STATUS[f.status]?.class">{{ FEATURE_STATUS[f.status]?.label }}</span>
                    <EyeOff v-if="!f.visible_to_client" class="w-3.5 h-3.5 text-gray-400" title="Hidden from client" />
                  </div>
                  <p v-if="f.description" class="text-xs text-brand-light mt-1 whitespace-pre-line">{{ f.description }}</p>
                  <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-light mt-2">
                    <span>Estimate <strong class="text-brand-dark">{{ formatHours(f.estimated_hours) }}</strong></span>
                    <span v-if="f.status !== 'proposed'">Reserved <strong class="text-brand-dark">{{ formatHours(f.reserved_hours) }}</strong></span>
                    <span>Used <strong class="text-brand-dark">{{ formatHours(f.used_hours) }}</strong></span>
                    <span v-if="f.billable_hours > 0" class="text-red-600 font-semibold">
                      {{ formatHours(f.billable_hours) }} billable<template v-if="contract.overage_rate"> · {{ formatRupiah(f.billable_hours * contract.overage_rate) }}</template>
                    </span>
                    <span v-if="['approved', 'in_progress'].includes(f.status) && f.reserved_hours < f.estimated_hours" class="text-amber-700">
                      {{ formatHours(f.estimated_hours - f.reserved_hours) }} not covered by the balance
                    </span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-1.5 shrink-0">
                  <template v-if="can('maintenance-edit')">
                    <button v-if="f.status === 'proposed'" type="button" class="mt-btn mt-btn--sm mt-btn--primary" @click="featureAction(f, 'approve')"><CheckCircle2 class="w-3.5 h-3.5" /> Approve</button>
                    <button v-if="['approved', 'in_progress'].includes(f.status) && can('maintenance-log')" type="button" class="mt-btn mt-btn--sm" @click="openLog(null, f)"><Plus class="w-3.5 h-3.5" /> Log Hours</button>
                    <button v-if="['approved', 'in_progress'].includes(f.status)" type="button" class="mt-btn mt-btn--sm mt-btn--primary" @click="featureAction(f, 'complete')"><CheckCircle2 class="w-3.5 h-3.5" /> Mark Done</button>
                    <button v-if="!['done', 'cancelled'].includes(f.status)" type="button" class="mt-btn mt-btn--sm" @click="openFeature(f)"><Pencil class="w-3.5 h-3.5" /></button>
                    <button v-if="!['done', 'cancelled'].includes(f.status)" type="button" class="mt-btn mt-btn--sm" title="Cancel feature" @click="featureAction(f, 'cancel')"><Ban class="w-3.5 h-3.5" /></button>
                    <button v-if="f.status === 'proposed'" type="button" class="mt-btn mt-btn--sm mt-btn--danger" title="Delete" @click="featureAction(f, 'delete')"><Trash2 class="w-3.5 h-3.5" /></button>
                  </template>
                </div>
              </div>

              <div v-if="f.logs?.length" class="mt-3 border-t border-[#F1F1F1] pt-2">
                <button type="button" class="text-xs font-semibold text-[#0C51D9]" @click="expandedFeature = expandedFeature === f.id ? null : f.id">
                  {{ expandedFeature === f.id ? "Hide" : "Show" }} {{ f.logs.length }} work log{{ f.logs.length > 1 ? "s" : "" }}
                </button>
                <div v-if="expandedFeature === f.id" class="mt-2 space-y-1">
                  <div v-for="log in f.logs" :key="log.id" class="flex items-center gap-3 text-xs py-1">
                    <span class="text-brand-light w-24 shrink-0">{{ formatDate(log.work_date) }}</span>
                    <span class="text-brand-dark flex-1 min-w-0">{{ log.title }}<span v-if="log.performer" class="text-brand-light"> · {{ log.performer }}</span></span>
                    <span class="font-semibold text-brand-dark">{{ formatHours(log.hours) }}</span>
                    <template v-if="['approved', 'in_progress'].includes(f.status) && can('maintenance-log')">
                      <button type="button" class="mt-icon" title="Edit" @click="openLog(log, f)"><Pencil class="w-3 h-3" /></button>
                      <button type="button" class="mt-icon hover:!text-red-600" title="Delete" @click="deleteLog(log)"><Trash2 class="w-3 h-3" /></button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Balance -->
        <div v-else-if="tab === 'balance'" class="p-4 sm:p-5">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <p class="text-3xl font-extrabold text-brand-dark">{{ formatHours(contract.balance_hours) }}</p>
              <p class="text-sm text-brand-light max-w-xl">
                Unused quota moved here at month end, spent on new features oldest-expiry first.
                <template v-if="contract.bank_expiry_months"> Hours expire {{ contract.bank_expiry_months }} months after the month they came from.</template>
              </p>
              <p v-if="contract.expiring_soon?.hours > 0" class="text-sm text-amber-700 mt-1 flex items-center gap-1">
                <AlertTriangle class="w-4 h-4" /> {{ formatHours(contract.expiring_soon.hours) }} expires from {{ formatDate(contract.expiring_soon.first_date) }} unless used.
              </p>
            </div>
            <button v-if="can('maintenance-adjust')" type="button" class="mt-btn shrink-0" @click="openAdjust('balance')"><SlidersHorizontal class="w-4 h-4" /> Adjust Balance</button>
          </div>

          <p v-if="!contract.bank_entries.length" class="text-sm text-brand-light text-center py-8 border border-dashed border-[#DCDEDD] rounded-[12px]">
            No movements yet. Unused hours arrive here when a month closes{{ contract.leftover_policy !== "bank" ? " (if the month is set to move them here)" : "" }}.
          </p>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-brand-light border-b border-[#DCDEDD]">
                  <th class="py-2 pr-3 font-semibold">Date</th>
                  <th class="py-2 pr-3 font-semibold">Movement</th>
                  <th class="py-2 pr-3 font-semibold text-right">Hours</th>
                  <th class="py-2 font-semibold text-right hidden md:table-cell">Unused / expires</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in contract.bank_entries" :key="e.id" class="border-b border-[#F1F1F1] align-top">
                  <td class="py-2.5 pr-3 whitespace-nowrap text-brand-dark">{{ formatDate(e.created_at) }}</td>
                  <td class="py-2.5 pr-3">
                    <p class="font-semibold text-brand-dark">{{ BANK_ENTRY_TYPE[e.type] || e.type }}</p>
                    <p class="text-xs text-brand-light">{{ e.note }}<template v-if="e.created_by"> · {{ e.created_by }}</template></p>
                  </td>
                  <td class="py-2.5 pr-3 text-right font-bold whitespace-nowrap" :class="e.hours >= 0 ? 'text-green-700' : 'text-red-600'">
                    {{ e.hours >= 0 ? "+" : "−" }}{{ formatHours(Math.abs(e.hours)) }}
                  </td>
                  <td class="py-2.5 text-right text-xs text-brand-light whitespace-nowrap hidden md:table-cell">
                    <template v-if="e.remaining_hours !== null">{{ formatHours(e.remaining_hours) }} · {{ e.expires_at ? formatDate(e.expires_at) : "never" }}</template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- History -->
        <div v-else class="p-4 sm:p-5 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-brand-light border-b border-[#DCDEDD]">
                <th class="py-2 pr-3 font-semibold">Month</th>
                <th class="py-2 pr-3 font-semibold text-right">Quota</th>
                <th class="py-2 pr-3 font-semibold text-right hidden sm:table-cell">Rolled over</th>
                <th class="py-2 pr-3 font-semibold text-right hidden sm:table-cell">Adjusted</th>
                <th class="py-2 pr-3 font-semibold text-right">Used</th>
                <th class="py-2 font-semibold">Unused hours</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in contract.periods" :key="p.id" class="border-b border-[#F1F1F1] hover:bg-gray-50 cursor-pointer" @click="openMonth(p.id)">
                <td class="py-2.5 pr-3 font-semibold text-[#0C51D9] whitespace-nowrap">{{ formatMonth(p.month) }}</td>
                <td class="py-2.5 pr-3 text-right">{{ formatHours(p.quota) }}</td>
                <td class="py-2.5 pr-3 text-right hidden sm:table-cell">{{ formatHours(p.carried) }}</td>
                <td class="py-2.5 pr-3 text-right hidden sm:table-cell">{{ p.adjusted > 0 ? "+" : "" }}{{ formatHours(p.adjusted) }}</td>
                <td class="py-2.5 pr-3 text-right whitespace-nowrap" :class="{ 'text-red-600 font-semibold': p.overage > 0 }">
                  {{ formatHours(p.used) }} / {{ formatHours(p.total) }}
                </td>
                <td class="py-2.5 text-xs text-brand-dark">{{ p.overage > 0 && p.is_closed ? `${formatHours(p.overage)} over quota` : leftoverResult(p) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Client link modal -->
      <div v-if="showShare" class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4" @click.self="showShare = false">
        <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg">
          <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
            <div>
              <h3 class="text-brand-dark text-base font-bold">Client Link</h3>
              <p class="text-brand-light text-xs">The client sees this month's quota, the work done, the development balance and features. No login needed.</p>
            </div>
            <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" @click="showShare = false"><X class="w-5 h-5" /></button>
          </div>
          <div class="p-5 space-y-4">
            <div v-if="shareBusy" class="py-6 flex justify-center"><Loader2 class="w-6 h-6 animate-spin text-[#0C51D9]" /></div>
            <template v-else-if="shareUrl">
              <div class="flex items-center gap-2 border border-[#DCDEDD] rounded-[10px] p-1.5 pl-3">
                <Link2 class="w-4 h-4 text-gray-400 shrink-0" />
                <span class="text-sm text-brand-dark truncate flex-1">{{ shareUrl }}</span>
                <button type="button" class="mt-btn mt-btn--sm shrink-0" @click="copyLink">
                  <Check v-if="copied" class="w-3.5 h-3.5 text-green-600" /><Copy v-else class="w-3.5 h-3.5" /> {{ copied ? "Copied" : "Copy" }}
                </button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a :href="shareUrl" target="_blank" rel="noopener" class="mt-btn justify-center"><Link2 class="w-4 h-4" /> Open</a>
                <a :href="whatsappUrl" target="_blank" rel="noopener" class="mt-btn justify-center"><MessageCircle class="w-4 h-4" /> WhatsApp</a>
                <a :href="mailUrl" class="mt-btn justify-center"><Mail class="w-4 h-4" /> Email</a>
              </div>
              <p class="text-xs text-brand-light">
                Hidden work logs and features aren't shown to the client.
                <template v-if="contract.share_last_viewed_at"> Last opened {{ formatDate(contract.share_last_viewed_at) }}.</template>
              </p>
              <button v-if="can('maintenance-share')" type="button" class="text-xs font-semibold text-red-600 hover:underline" @click="revokeLink">Revoke link</button>
            </template>
            <template v-else>
              <p class="text-sm text-brand-light">There's no active link for this contract.</p>
              <button v-if="can('maintenance-share')" type="button" class="mt-btn" @click="createLink"><Link2 class="w-4 h-4" /> Create Link</button>
            </template>
          </div>
        </div>
      </div>

      <!-- Feature modal -->
      <div v-if="showFeature" class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4" @click.self="showFeature = false">
        <form class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg" @submit.prevent="saveFeature">
          <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
            <div>
              <h3 class="text-brand-dark text-base font-bold">{{ editingFeature ? "Edit Feature" : "New Feature" }}</h3>
              <p class="text-brand-light text-xs">Built with hours from the development balance ({{ formatHours(contract.balance_hours) }} available).</p>
            </div>
            <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" @click="showFeature = false"><X class="w-5 h-5" /></button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="mt-label">Feature <span class="text-red-500">*</span></label>
              <input v-model="featureForm.title" class="mt-input" maxlength="255" placeholder="e.g. Export orders to Excel" required />
              <p v-if="featureErrors.title" class="mt-err">{{ featureErrors.title[0] }}</p>
            </div>
            <div>
              <label class="mt-label">Description</label>
              <textarea v-model="featureForm.description" rows="3" class="mt-input" placeholder="Scope and acceptance criteria"></textarea>
            </div>
            <div>
              <label class="mt-label">Estimated hours <span class="text-red-500">*</span></label>
              <input
                v-model="featureForm.estimated_hours"
                type="number"
                min="0.5"
                step="any"
                class="mt-input"
                :disabled="editingFeature && editingFeature.status !== 'proposed'"
                required
              />
              <p v-if="editingFeature && editingFeature.status !== 'proposed'" class="text-xs text-brand-light mt-1">Fixed after approval — it's what was reserved.</p>
              <p v-else-if="Number(featureForm.estimated_hours) > contract.balance_hours" class="text-xs text-amber-700 mt-1">
                More than the current balance — the difference would be billable unless the balance grows first.
              </p>
              <p v-if="featureErrors.estimated_hours" class="mt-err">{{ featureErrors.estimated_hours[0] }}</p>
            </div>
            <label class="flex items-center gap-2.5 cursor-pointer text-sm text-brand-dark">
              <input v-model="featureForm.visible_to_client" type="checkbox" class="w-4 h-4 accent-[#0C51D9]" /> Show to client
            </label>
          </div>
          <div class="p-5 border-t border-[#DCDEDD] flex justify-end gap-2.5">
            <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-gray-50" @click="showFeature = false">Cancel</button>
            <button type="submit" :disabled="featureBusy" class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-1.5 disabled:opacity-60">
              <Loader2 v-if="featureBusy" class="w-4 h-4 text-white animate-spin" />
              <span class="text-brand-white text-sm font-semibold">Save</span>
            </button>
          </div>
        </form>
      </div>

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

<style scoped>
.mt-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #dcdedd; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0f172a; background: #fff; transition: border-color 0.2s; }
.mt-btn:hover { border-color: #0c51d9; }
.mt-btn--sm { padding: 5px 9px; font-size: 12px; }
.mt-btn--primary { color: #0c51d9; border-color: #bfd3fb; background: #f5f8ff; }
.mt-btn--danger { color: #dc2626; border-color: #fecaca; }
.mt-btn--danger:hover { background: #fef2f2; border-color: #fca5a5; }
.mt-icon { display: inline-flex; padding: 5px; border-radius: 6px; color: #64748b; }
.mt-icon:hover { background: #f1f5f9; color: #0c51d9; }
.mt-stat { border: 1px solid #eef1f5; border-radius: 10px; padding: 8px 10px; }
.mt-stat p { color: #64748b; }
.mt-stat strong { color: #0f172a; font-size: 14px; }
.mt-label { display: block; font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 6px; }
.mt-input { width: 100%; border: 1px solid #dcdedd; border-radius: 12px; padding: 9px 12px; font-size: 14px; color: #0f172a; background: #fff; outline: none; }
.mt-input:hover, .mt-input:focus { border-color: #0c51d9; }
.mt-input:disabled { background: #f8fafc; color: #94a3b8; }
.mt-err { color: #ef4444; font-size: 12px; margin-top: 4px; }
</style>
