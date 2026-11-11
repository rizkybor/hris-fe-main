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
import { UiBadge, UiButton, UiEmpty, UiPageHeader, UiStat, UiTable } from "@/components/ui";

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
  const label = payroll.type === "thr" ? "THR" : "Payroll";
  const ok = await alertModal.confirm(
    `Delete this ${label} period (${formatDate(payroll.period || payroll.salary_month)})? This permanently removes it and all its employee details.`,
    { type: "danger", confirmText: "Delete" }
  );
  if (!ok) return;

  try {
    await payrollStore.deletePayroll(payroll.id);
    await payrollStore.fetchStatistics();
    await fetchList();
  } catch (error) {
    await alertModal.alert(
      error?.response?.data?.message || "Failed to delete payroll.",
      { type: "danger" }
    );
  }
};

const handleRegenerate = async (payroll) => {
  const label = payroll.type === "thr" ? "THR" : "Payroll";
  const ok = await alertModal.confirm(
    `Re-generate ${label} for ${formatDate(payroll.period || payroll.salary_month)}? This replaces the existing employee details for this period with freshly computed ones.`,
    { type: "warning", confirmText: "Regenerate" }
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
      `${label} regeneration is being processed in the background. Please check back shortly.`,
      { type: "success" }
    );
    await payrollStore.fetchStatistics();
    await fetchList();
  } catch (error) {
    await alertModal.alert(
      error?.response?.data?.message || `Failed to regenerate ${label}.`,
      { type: "danger" }
    );
  }
};

// Hidden by default -- payroll amounts are sensitive, revealed only on demand.
const isTotalAmountVisible = ref(false);
const isAverageSalaryVisible = ref(false);

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
  });
};

const formatProcessedDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Presentation only: payroll status -> badge tone + label.
const STATUS = {
  draft: { tone: "neutral", label: "Draft" },
  pending: { tone: "warn", label: "Pending" },
  processing: { tone: "warn", label: "Processing" },
  approved: { tone: "info", label: "Approved" },
  paid: { tone: "ok", label: "Paid" },
  cancelled: { tone: "bad", label: "Cancelled" },
};
const statusOf = (status) => STATUS[status] || { tone: "neutral", label: status || "Pending" };

const salaryChangeHint = computed(() => {
  const change = statistics.value?.salary_change ?? 0;
  return `${change >= 0 ? "+" : ""}${change}% this month`;
});

const columns = computed(() => [
  { key: "period", label: "Period" },
  { key: "employees", label: "Employees" },
  { key: "processed", label: "Processed on" },
  { key: "status", label: "Status" },
  { key: "total_amount", label: "Total payroll", align: "right" },
  ...(canManagePayroll.value ? [{ key: "actions", label: "", align: "right", width: 96 }] : []),
]);

const viewDetails = (id) => {
  router.push({ name: "admin.payroll.detail", params: { id } });
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Payroll" subtitle="Monthly payroll and THR periods, with totals and approval status.">
      <template #actions>
        <UiButton variant="secondary" :icon="FileText" :to="{ name: 'admin.report.dashboard' }">Generate Reports</UiButton>
        <UiButton
          v-if="can('payroll-create')"
          variant="secondary"
          :icon="Gift"
          :to="{ name: 'admin.payroll.create', query: { type: 'thr' } }"
        >Generate THR</UiButton>
        <UiButton v-if="can('payroll-create')" :icon="Plus" :to="{ name: 'admin.payroll.create' }">Create New Payroll</UiButton>
      </template>
    </UiPageHeader>

    <!-- KPI tiles -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 ui-stagger">
      <UiStat
        class="col-span-2 lg:col-span-1"
        label="Total Payroll Amount"
        :icon="DollarSign"
        :loading="loading"
        :hint="salaryChangeHint"
      >
        <span class="inline-flex items-center gap-1.5">
          <span>{{ isTotalAmountVisible ? formatRupiahCompact(statistics.total_amount) : "Rp ••••••" }}</span>
          <button
            type="button"
            class="ui-press w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
            :title="isTotalAmountVisible ? 'Hide amount' : 'Show amount'"
            :aria-label="isTotalAmountVisible ? 'Hide amount' : 'Show amount'"
            @click="isTotalAmountVisible = !isTotalAmountVisible"
          >
            <EyeOff v-if="isTotalAmountVisible" class="w-4 h-4" /><Eye v-else class="w-4 h-4" />
          </button>
        </span>
      </UiStat>
      <UiStat label="Employees Paid" :icon="UserCheck" :loading="loading" :value="statistics.total_payroll ?? 0" hint="This month" />
      <UiStat
        label="Pending Payments"
        :icon="Clock"
        :loading="loading"
        :value="statistics.pending_review ?? 0"
        :tone="statistics.pending_review ? 'warn' : ''"
        hint="Need approval"
      />
      <UiStat label="Average Salary" :icon="Banknote" :loading="loading" hint="Per employee">
        <span class="inline-flex items-center gap-1.5">
          <span>{{ isAverageSalaryVisible ? formatRupiahCompact(statistics.average_salary) : "Rp ••••••" }}</span>
          <button
            type="button"
            class="ui-press w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
            :title="isAverageSalaryVisible ? 'Hide salary' : 'Show salary'"
            :aria-label="isAverageSalaryVisible ? 'Hide salary' : 'Show salary'"
            @click="isAverageSalaryVisible = !isAverageSalaryVisible"
          >
            <EyeOff v-if="isAverageSalaryVisible" class="w-4 h-4" /><Eye v-else class="w-4 h-4" />
          </button>
        </span>
      </UiStat>
      <UiStat label="Finalized" :icon="CheckCircle" :loading="loading" :value="statistics.finalized ?? 0" hint="This month" />
    </div>

    <Alert type="success" :title="success" :show="success" @close="payrollStore.clearMessages()" />

    <!-- Monthly Payroll Periods -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 pt-4 pb-3 border-b border-ui-line">
        <h2 class="text-ui-h2 text-ui-ink">Monthly Payroll Periods</h2>
        <p class="text-ui-cap text-ui-muted">All departments · click a period to open its employee breakdown</p>
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
            <Users class="w-3.5 h-3.5 text-ui-faint" />{{ row.employee_count || 0 }} employees
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
            <UiButton variant="ghost" size="sm" :icon="RefreshCw" title="Regenerate" aria-label="Regenerate" @click.stop="handleRegenerate(row)" />
            <UiButton variant="ghost" size="sm" :icon="Trash2" title="Delete" aria-label="Delete" class="!text-ui-bad" @click.stop="handleDeletePayroll(row)" />
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ formatDate(row.period) }}</p>
              <p class="text-ui-cap text-ui-muted mt-0.5 tabular-nums">
                {{ row.employee_count || 0 }} employees · {{ formatProcessedDate(row.created_at) }}
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
                  title="Regenerate"
                  aria-label="Regenerate"
                  @click.stop="handleRegenerate(row)"
                >
                  <RefreshCw class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-bad hover:bg-ui-bad-soft"
                  title="Delete"
                  aria-label="Delete"
                  @click.stop="handleDeletePayroll(row)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="Calendar" title="No payroll data found" message="Create your first payroll to get started" compact>
            <UiButton v-if="can('payroll-create')" :icon="Plus" size="sm" :to="{ name: 'admin.payroll.create' }">Create New Payroll</UiButton>
          </UiEmpty>
        </template>
      </UiTable>
    </section>
  </div>
</template>
