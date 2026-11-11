<script setup>
import { ref, onMounted, computed } from "vue";
import { usePayrollStore } from "@/stores/payroll";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  DollarSign,
  UserCheck,
  Clock,
  Banknote,
  Plus,
  FileText,
  Calendar,
  Users,
  Eye,
  EyeOff,
  Gift,
  Trash2,
  RefreshCw,
  CheckCircle,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { can, hasAnyRole } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { UiBadge, UiButton, UiEmpty, UiPageHeader, UiStat, UiTable } from "@/components/ui";

const { t } = useI18n();

const router = useRouter();
const payrollStore = usePayrollStore();
const alertModal = useAlertModalStore();
const { payrolls, statistics, loading, success } = storeToRefs(payrollStore);

const fetchList = () => payrollStore.fetchPayrolls({ page: 1, row_per_page: 10 });

onMounted(async () => {
  await payrollStore.fetchStatistics();
  await fetchList();
});

// Deleting a paid payroll, or re-generating one that already has details,
// overrides data that's already been processed/paid out -- restricted to
// the same trusted roles server-side enforces.
const canManagePayroll = computed(() => hasAnyRole(["superadmin", "manager", "finance"]));

const handleDeletePayroll = async (payroll) => {
  const label = payroll.type === "thr" ? "THR" : t("payroll.common.payroll");
  const ok = await alertModal.confirm(
    t("payroll.dashboard.deleteConfirm", { label, period: formatDate(payroll.period || payroll.salary_month) }),
    { type: "danger", confirmText: t("common.actions.delete") }
  );
  if (!ok) return;

  try {
    await payrollStore.deletePayroll(payroll.id);
    await payrollStore.fetchStatistics();
    await fetchList();
  } catch (error) {
    await alertModal.alert(
      error?.response?.data?.message || t("payroll.dashboard.deleteFailed"),
      { type: "danger" }
    );
  }
};

const handleRegenerate = async (payroll) => {
  const label = payroll.type === "thr" ? "THR" : t("payroll.common.payroll");
  const ok = await alertModal.confirm(
    t("payroll.dashboard.regenerateConfirm", { label, period: formatDate(payroll.period || payroll.salary_month) }),
    { type: "warning", confirmText: t("payroll.common.regenerate") }
  );
  if (!ok) return;

  const salaryMonth = new Date(payroll.salary_month).toISOString().slice(0, 7);
  const payload = { salary_month: salaryMonth, regenerate: true };

  try {
    if (payroll.type === "thr") {
      await payrollStore.generateThrPayroll(payload);
    } else {
      await payrollStore.generatePayroll(payload);
    }
    await alertModal.alert(
      t("payroll.dashboard.regenerateQueued", { label }),
      { type: "success" }
    );
    await payrollStore.fetchStatistics();
    await fetchList();
  } catch (error) {
    await alertModal.alert(
      error?.response?.data?.message || t("payroll.dashboard.regenerateFailed", { label }),
      { type: "danger" }
    );
  }
};

// Hidden by default -- payroll amounts are sensitive, revealed only on demand.
const isTotalAmountVisible = ref(false);
const isAverageSalaryVisible = ref(false);

const formatDate = (date) => {
  return new Date(date).toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "long",
  });
};

const formatProcessedDate = (date) => {
  return new Date(date).toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Presentation only: payroll status -> badge tone + label.
const STATUS_TONES = {
  draft: "neutral",
  pending: "warn",
  processing: "warn",
  approved: "info",
  paid: "ok",
  cancelled: "bad",
};
const statusOf = (status) =>
  STATUS_TONES[status]
    ? { tone: STATUS_TONES[status], label: t(`payroll.status.${status}`) }
    : { tone: "neutral", label: status || t("payroll.status.pending") };

const salaryChangeHint = computed(() => {
  const change = statistics.value?.salary_change ?? 0;
  return t("payroll.dashboard.changeThisMonth", { change: `${change >= 0 ? "+" : ""}${change}` });
});

const columns = computed(() => [
  { key: "period", label: t("common.labels.period") },
  { key: "employees", label: t("payroll.dashboard.columns.employees") },
  { key: "processed", label: t("payroll.dashboard.columns.processed") },
  { key: "status", label: t("common.labels.status") },
  { key: "total_amount", label: t("payroll.dashboard.columns.total"), align: "right" },
  ...(canManagePayroll.value ? [{ key: "actions", label: "", align: "right", width: 96 }] : []),
]);

const viewDetails = (id) => {
  router.push({ name: "admin.payroll.detail", params: { id } });
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('payroll.dashboard.title')" :subtitle="$t('payroll.dashboard.subtitle')">
      <template #actions>
        <UiButton variant="secondary" :icon="FileText" :to="{ name: 'admin.report.dashboard' }">{{ $t("payroll.dashboard.generateReports") }}</UiButton>
        <UiButton
          v-if="can('payroll-create')"
          variant="secondary"
          :icon="Gift"
          :to="{ name: 'admin.payroll.create', query: { type: 'thr' } }"
        >{{ $t("payroll.common.generateThr") }}</UiButton>
        <UiButton v-if="can('payroll-create')" :icon="Plus" :to="{ name: 'admin.payroll.create' }">{{ $t("payroll.dashboard.createNew") }}</UiButton>
      </template>
    </UiPageHeader>

    <!-- KPI tiles -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 ui-stagger">
      <UiStat
        class="col-span-2 lg:col-span-1"
        :label="$t('payroll.dashboard.stats.totalAmount')"
        :icon="DollarSign"
        :loading="loading"
        :hint="salaryChangeHint"
      >
        <span class="inline-flex items-center gap-1.5">
          <span>{{ isTotalAmountVisible ? formatRupiahCompact(statistics.total_amount) : "Rp ••••••" }}</span>
          <button
            type="button"
            class="ui-press w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
            :title="isTotalAmountVisible ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
            :aria-label="isTotalAmountVisible ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
            @click="isTotalAmountVisible = !isTotalAmountVisible"
          >
            <EyeOff v-if="isTotalAmountVisible" class="w-4 h-4" /><Eye v-else class="w-4 h-4" />
          </button>
        </span>
      </UiStat>
      <UiStat :label="$t('payroll.dashboard.stats.employeesPaid')" :icon="UserCheck" :loading="loading" :value="statistics.total_payroll ?? 0" :hint="$t('payroll.dashboard.stats.thisMonth')" />
      <UiStat
        :label="$t('payroll.dashboard.stats.pending')"
        :icon="Clock"
        :loading="loading"
        :value="statistics.pending_review ?? 0"
        :tone="statistics.pending_review ? 'warn' : ''"
        :hint="$t('payroll.dashboard.stats.needApproval')"
      />
      <UiStat :label="$t('payroll.dashboard.stats.averageSalary')" :icon="Banknote" :loading="loading" :hint="$t('payroll.dashboard.stats.perEmployee')">
        <span class="inline-flex items-center gap-1.5">
          <span>{{ isAverageSalaryVisible ? formatRupiahCompact(statistics.average_salary) : "Rp ••••••" }}</span>
          <button
            type="button"
            class="ui-press w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
            :title="isAverageSalaryVisible ? $t('payroll.dashboard.hideSalary') : $t('payroll.dashboard.showSalary')"
            :aria-label="isAverageSalaryVisible ? $t('payroll.dashboard.hideSalary') : $t('payroll.dashboard.showSalary')"
            @click="isAverageSalaryVisible = !isAverageSalaryVisible"
          >
            <EyeOff v-if="isAverageSalaryVisible" class="w-4 h-4" /><Eye v-else class="w-4 h-4" />
          </button>
        </span>
      </UiStat>
      <UiStat :label="$t('payroll.dashboard.stats.finalized')" :icon="CheckCircle" :loading="loading" :value="statistics.finalized ?? 0" :hint="$t('payroll.dashboard.stats.thisMonth')" />
    </div>

    <Alert type="success" :title="success" :show="success" @close="payrollStore.clearMessages()" />

    <!-- Monthly Payroll Periods -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 pt-4 pb-3 border-b border-ui-line">
        <h2 class="text-ui-h2 text-ui-ink">{{ $t("payroll.dashboard.periodsTitle") }}</h2>
        <p class="text-ui-cap text-ui-muted">{{ $t("payroll.dashboard.periodsSubtitle") }}</p>
      </div>

      <UiTable
        :columns="columns"
        :rows="payrolls"
        :loading="loading"
        :skeleton-rows="4"
        clickable
        @row-click="(row) => viewDetails(row.id)"
      >
        <template #cell-period="{ row }">
          <span class="inline-flex items-center gap-2">
            <Calendar class="w-4 h-4 text-ui-faint shrink-0" />
            <span class="text-ui-ink font-medium">{{ formatDate(row.period) }}</span>
            <UiBadge v-if="row.type === 'thr'" tone="accent">THR</UiBadge>
          </span>
        </template>
        <template #cell-employees="{ row }">
          <span class="inline-flex items-center gap-1.5 tabular-nums">
            <Users class="w-3.5 h-3.5 text-ui-faint" />{{ $t("payroll.common.employeesCount", { n: row.employee_count || 0 }, row.employee_count || 0) }}
          </span>
        </template>
        <template #cell-processed="{ row }">
          <span class="text-ui-muted">{{ formatProcessedDate(row.created_at) }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="statusOf(row.status).tone" dot>{{ statusOf(row.status).label }}</UiBadge>
        </template>
        <template #cell-total_amount="{ row }">
          <span class="tabular-nums text-ui-ink font-medium">{{ isTotalAmountVisible ? formatRupiahCompact(row.total_amount) : "Rp ••••••" }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UiButton variant="ghost" size="sm" :icon="RefreshCw" :title="$t('payroll.common.regenerate')" :aria-label="$t('payroll.common.regenerate')" @click.stop="handleRegenerate(row)" />
            <UiButton variant="ghost" size="sm" :icon="Trash2" :title="$t('common.actions.delete')" :aria-label="$t('common.actions.delete')" class="!text-ui-bad" @click.stop="handleDeletePayroll(row)" />
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ formatDate(row.period) }}</p>
              <p class="text-ui-cap text-ui-muted mt-0.5 tabular-nums">
                {{ $t("payroll.common.employeesCount", { n: row.employee_count || 0 }, row.employee_count || 0) }} · {{ formatProcessedDate(row.created_at) }}
              </p>
              <div class="flex items-center gap-1.5 mt-1.5">
                <UiBadge v-if="row.type === 'thr'" tone="accent">THR</UiBadge>
                <UiBadge :tone="statusOf(row.status).tone" dot>{{ statusOf(row.status).label }}</UiBadge>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-ui-body font-medium text-ui-ink tabular-nums">
                {{ isTotalAmountVisible ? formatRupiahCompact(row.total_amount) : "Rp ••••••" }}
              </p>
              <div v-if="canManagePayroll" class="flex items-center justify-end gap-0.5 mt-1">
                <button
                  type="button"
                  class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover"
                  :title="$t('payroll.common.regenerate')"
                  :aria-label="$t('payroll.common.regenerate')"
                  @click.stop="handleRegenerate(row)"
                >
                  <RefreshCw class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-bad hover:bg-ui-bad-soft"
                  :title="$t('common.actions.delete')"
                  :aria-label="$t('common.actions.delete')"
                  @click.stop="handleDeletePayroll(row)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="Calendar" :title="$t('payroll.dashboard.empty.title')" :message="$t('payroll.dashboard.empty.message')" compact>
            <UiButton v-if="can('payroll-create')" :icon="Plus" size="sm" :to="{ name: 'admin.payroll.create' }">{{ $t("payroll.dashboard.createNew") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>
    </section>
  </div>
</template>
