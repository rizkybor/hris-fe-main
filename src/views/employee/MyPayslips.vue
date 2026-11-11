<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { usePayrollStore } from "@/stores/payroll";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { debounce } from "lodash-es";
import {
  Search,
  Download,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-vue-next";
import { UiBadge, UiButton, UiCard, UiInput, UiPageHeader, UiPagination, UiSelect, UiStat, UiTable } from "@/components/ui";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const router = useRouter();
const payrollStore = usePayrollStore();
const { payslips, meta, loading } = storeToRefs(payrollStore);
const { fetchMyPayslips, downloadPayslip } = payrollStore;

const serverOptions = ref({
  page: 1,
  row_per_page: 12,
});

const filters = ref({
  search: null,
  year: new Date().getFullYear(),
});

const fetchData = async () => {
  await fetchMyPayslips({
    ...serverOptions.value,
    ...filters.value,
  });
};

onMounted(async () => {
  await fetchData();
});

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
  serverOptions.value.row_per_page = perPage;
  serverOptions.value.page = 1;
  fetchData();
};

const handleDownload = async (id) => {
  try {
    const blob = await downloadPayslip(id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payslip-${id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading payslip:", error);
  }
};

const viewDetails = (id) => {
  router.push({ name: "employee.payslips.detail", params: { id } });
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

// Hidden by default -- salary figures are sensitive, revealed only on demand.
const showAmounts = ref(false);
const maskCurrency = (value) => (showAmounts.value ? formatCurrency(value) : "Rp ••••••••");

const formatDate = (date) => {
  return new Date(date).toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "long",
  });
};

const totalEarnings = computed(() => {
  return payslips.value.reduce((sum, slip) => sum + (slip.gross_salary || 0), 0);
});

// Presentation only.
const currentYear = new Date().getFullYear();
const yearOptions = [currentYear, currentYear - 1, currentYear - 2].map((y) => ({ value: y, label: String(y) }));
const perPageOptions = computed(() => [10, 12, 24, 48].map((n) => ({ value: n, label: t("payslips.list.perPageOption", { n }) })));
const perPageModel = computed({
  get: () => Number(meta.value?.per_page) || serverOptions.value.row_per_page,
  set: (n) => handlePerPageChange(n),
});
const columns = computed(() => [
  { key: "period", label: t("common.labels.period") },
  { key: "type", label: t("common.labels.type") },
  { key: "net_salary", label: t("payslips.list.netSalary"), align: "right" },
  { key: "status", label: t("common.labels.status") },
  { key: "actions", label: "", align: "right", width: 120 },
]);

const totalDeductions = computed(() => {
  return payslips.value.reduce(
    (sum, slip) => sum + (slip.total_deductions || 0),
    0
  );
});
</script>

<template>
  <div class="sm:px-3 sm:py-3 space-y-5 ui-anim-fade-up">
    <UiPageHeader :title="$t('payslips.list.title')" :subtitle="$t('payslips.list.subtitle')">
      <template #actions>
        <UiButton variant="secondary" :icon="showAmounts ? EyeOff : Eye" @click="showAmounts = !showAmounts">
          {{ showAmounts ? $t("common.actions.hideAmounts") : $t("common.actions.showAmounts") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 ui-stagger">
      <UiStat class="col-span-2 md:col-span-1" :label="$t('payslips.list.totalPayslips')" :value="meta.total || 0" :icon="FileText" :loading="loading && !payslips.length" />
      <UiStat :label="$t('payslips.list.totalEarnings')" :value="maskCurrency(totalEarnings)" :icon="ArrowUpRight" :hint="$t('payslips.list.thisYear')" />
      <UiStat :label="$t('payslips.list.totalDeductions')" :value="maskCurrency(totalDeductions)" :icon="ArrowDownRight" :hint="$t('payslips.list.thisYear')" />
    </div>

    <!-- Payslips -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 pt-4 pb-3 flex flex-col md:flex-row md:items-center gap-3 border-b border-ui-line">
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink">{{ $t("payslips.list.allPayslips") }}</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">
            {{ $t("common.pagination.showingItems", { from: meta.from || 0, to: meta.to || 0, total: meta.total || 0, items: $t("payslips.list.itemLabel") }) }}
          </p>
        </div>
        <div class="grid grid-cols-2 md:flex md:items-center gap-2">
          <UiInput
            v-model="filters.search"
            :icon="Search"
            :placeholder="$t('payslips.list.searchPlaceholder')"
            class="col-span-2 md:w-[280px]"
          />
          <UiSelect v-model="filters.year" :options="yearOptions" class="md:w-[110px]" :aria-label="$t('common.labels.year')" />
          <UiSelect v-model="perPageModel" :options="perPageOptions" class="md:w-[120px]" :aria-label="$t('common.pagination.rowsPerPage')" />
        </div>
      </div>

      <UiTable
        :columns="columns"
        :rows="payslips"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="4"
        clickable
        @row-click="(row) => viewDetails(row.id)"
      >
        <template #cell-period="{ row }">
          <span class="inline-flex items-center gap-2 text-ui-ink font-medium">
            <Calendar class="w-4 h-4 text-ui-faint" />{{ formatDate(row.period) }}
          </span>
        </template>
        <template #cell-type="{ row }">
          <UiBadge :tone="row.type === 'thr' ? 'accent' : 'neutral'">{{ row.type === "thr" ? "THR" : $t("payslips.list.monthly") }}</UiBadge>
        </template>
        <template #cell-net_salary="{ row }">
          <span class="tabular-nums text-ui-ink font-medium">{{ maskCurrency(row.net_salary) }}</span>
        </template>
        <template #cell-status>
          <UiBadge tone="ok" dot>{{ $t("payslips.paid") }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UiButton variant="ghost" size="sm" :icon="Eye" @click.stop="viewDetails(row.id)">{{ $t("common.actions.view") }}</UiButton>
            <UiButton variant="secondary" size="sm" :icon="Download" @click.stop="handleDownload(row.id)">PDF</UiButton>
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ formatDate(row.period) }}</p>
              <div class="flex items-center gap-1.5 mt-1.5">
                <UiBadge v-if="row.type === 'thr'" tone="accent">THR</UiBadge>
                <UiBadge tone="ok" dot>{{ $t("payslips.paid") }}</UiBadge>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-ui-body font-medium text-ui-ink tabular-nums">{{ maskCurrency(row.net_salary) }}</p>
              <button
                type="button"
                class="ui-press mt-1 inline-flex items-center gap-1 text-ui-cap font-medium text-ui-accent"
                @click.stop="handleDownload(row.id)"
              >
                <Download class="w-3.5 h-3.5" />PDF
              </button>
            </div>
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center py-4">
            <div class="w-10 h-10 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center mb-3">
              <FileText class="w-5 h-5" />
            </div>
            <p class="text-ui-body font-medium text-ui-ink">{{ $t("payslips.list.empty") }}</p>
            <p class="text-ui-small text-ui-muted mt-1">{{ $t("payslips.list.emptyHint") }}</p>
          </div>
        </template>
      </UiTable>

      <UiPagination v-if="meta.total" :meta="meta" :item-label="$t('payslips.list.itemLabel')" :disabled="loading" @change="handlePageChange" />
    </section>
  </div>
</template>
