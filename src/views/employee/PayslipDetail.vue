<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePayrollStore } from "@/stores/payroll";
import { useAuthStore } from "@/stores/auth";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiBadge, UiButton, UiEmpty } from "@/components/ui";
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  Building,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
} from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const payrollStore = usePayrollStore();
const authStore = useAuthStore();

const payslip = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    payslip.value = await payrollStore.fetchMyPayslip(route.params.id);
  } catch (error) {
    console.error("Error fetching payslip:", error);
  } finally {
    loading.value = false;
  }
});

const handleDownload = async () => {
  try {
    const blob = await payrollStore.downloadPayslip(route.params.id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payslip-${route.params.id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading payslip:", error);
  }
};

const handlePrint = () => {
  window.print();
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatPeriod = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
  });
};
</script>

<template>
  <div class="sm:px-3 sm:py-3 ui-anim-fade-up">
    <div class="max-w-[760px] mx-auto space-y-5">
      <!-- Header + actions -->
      <div class="print:hidden space-y-3">
        <button
          type="button"
          class="ui-press inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline"
          @click="router.back()"
        >
          <ArrowLeft class="w-4 h-4" />Back
        </button>
        <div class="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div class="flex-1 min-w-0">
            <template v-if="loading">
              <Skeleton width="220px" height="28px" rounded="6px" />
              <Skeleton width="160px" height="14px" class="mt-2" />
            </template>
            <template v-else-if="payslip">
              <h1 class="text-ui-h1 text-ui-ink">
                {{ payslip.type === "thr" ? "THR Payslip" : "Payslip" }} · {{ formatPeriod(payslip.period) }}
              </h1>
              <p class="text-ui-small text-ui-muted mt-1">
                Payment Date {{ formatDate(payslip.payment_date || payslip.created_at) }}
              </p>
            </template>
            <h1 v-else class="text-ui-h1 text-ui-ink">Payslip</h1>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UiButton variant="secondary" :icon="Printer" @click="handlePrint">Print</UiButton>
            <UiButton :icon="Download" @click="handleDownload">Download PDF</UiButton>
          </div>
        </div>
      </div>

      <!-- Payslip document (this is what gets printed) -->
      <div class="payslip-print md:bg-ui-surface md:border md:border-ui-line md:rounded-ui-card md:p-9 print:p-0">
        <div v-if="loading" class="space-y-6">
          <div class="flex items-center gap-3">
            <Skeleton width="32px" height="32px" rounded="8px" />
            <Skeleton width="180px" height="16px" />
          </div>
          <Skeleton height="64px" rounded="10px" />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton height="160px" rounded="10px" />
            <Skeleton height="160px" rounded="10px" />
          </div>
          <Skeleton height="56px" rounded="12px" />
        </div>

        <div v-else-if="payslip" class="flex flex-col gap-6">
          <!-- Company -->
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-ui-control bg-ui-ink text-white flex items-center justify-center shrink-0">
              <Building class="w-[18px] h-[18px]" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-ui-h3 text-ui-ink">{{ payslip.company_name || "JCD-HRIS+" }}</p>
                <UiBadge tone="ok" dot>Paid</UiBadge>
                <UiBadge v-if="payslip.type === 'thr'" tone="accent">THR</UiBadge>
              </div>
              <p class="text-ui-cap text-ui-muted">{{ payslip.company_address || "Indonesia" }}</p>
            </div>
          </div>

          <!-- Employee information -->
          <dl class="bg-ui-surface border border-ui-line md:border-0 md:bg-ui-subtle rounded-ui-card px-4 py-3.5 grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-x-6 gap-y-3">
            <div class="min-w-0">
              <dt class="text-ui-cap text-ui-muted">Full Name</dt>
              <dd class="text-ui-small font-medium text-ui-ink truncate">{{ payslip.employee_name }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-ui-cap text-ui-muted">Department</dt>
              <dd class="text-ui-small font-medium text-ui-ink truncate">{{ payslip.department }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-ui-cap text-ui-muted">Email</dt>
              <dd class="text-ui-small font-medium text-ui-ink truncate">{{ payslip.employee_email || authStore.user?.email }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-ui-cap text-ui-muted">Payment Date</dt>
              <dd class="text-ui-small font-medium text-ui-ink">{{ formatDate(payslip.payment_date || payslip.created_at) }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-ui-cap text-ui-muted">Period</dt>
              <dd class="text-ui-small font-medium text-ui-ink">{{ formatPeriod(payslip.period) }}</dd>
            </div>
            <div v-if="payslip.type === 'thr' && payslip.months_of_service != null" class="min-w-0">
              <dt class="text-ui-cap text-ui-muted">Masa kerja</dt>
              <dd class="text-ui-small font-medium text-ui-ink tabular-nums">{{ payslip.months_of_service }}/12 bulan</dd>
            </div>
          </dl>

          <!-- Take-home: first on phones (as in the app), last on wider screens -->
          <div class="take-home order-first md:order-none md:hidden print:hidden bg-ui-ink text-white rounded-ui-card px-5 py-4">
            <p class="text-ui-small text-white/70">Net Salary (Take Home)</p>
            <p class="text-ui-display tabular-nums mt-0.5">{{ formatCurrency(payslip.net_salary) }}</p>
          </div>

          <!-- Salary breakdown -->
          <div class="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 md:gap-8">
            <section>
              <h3 class="text-ui-over uppercase text-ui-muted md:normal-case md:text-ui-h3 md:text-ui-ink md:tracking-normal pb-2 md:border-b md:border-ui-line">Earnings</h3>
              <div class="bg-ui-surface border border-ui-line rounded-ui-card px-4 md:border-0 md:rounded-none md:px-0 divide-y divide-ui-line">
                <div class="flex items-center justify-between gap-3 py-3 md:py-2.5">
                  <span class="text-ui-small text-ui-muted">Basic Salary</span>
                  <span class="text-ui-small text-ui-ink tabular-nums text-right">{{ formatCurrency(payslip.basic_salary) }}</span>
                </div>
                <div v-if="payslip.attendance_deduction > 0" class="flex items-center justify-between gap-3 py-3 md:py-2.5">
                  <span class="text-ui-small text-ui-muted">Attendance Deduction</span>
                  <span class="text-ui-small text-ui-bad tabular-nums text-right">- {{ formatCurrency(payslip.attendance_deduction) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3 py-3 md:py-2.5">
                  <span class="text-ui-small font-semibold text-ui-ink">Gross Salary</span>
                  <span class="text-ui-small font-semibold text-ui-ink tabular-nums text-right">{{ formatCurrency(payslip.gross_salary) }}</span>
                </div>
              </div>
            </section>

            <section>
              <h3 class="text-ui-over uppercase text-ui-muted md:normal-case md:text-ui-h3 md:text-ui-ink md:tracking-normal pb-2 md:border-b md:border-ui-line">Deductions</h3>
              <div class="bg-ui-surface border border-ui-line rounded-ui-card px-4 md:border-0 md:rounded-none md:px-0 divide-y divide-ui-line">
                <div v-if="payslip.bpjs_kesehatan_employee > 0" class="flex items-center justify-between gap-3 py-3 md:py-2.5">
                  <span class="text-ui-small text-ui-muted">BPJS Kesehatan</span>
                  <span class="text-ui-small text-ui-bad tabular-nums text-right">{{ formatCurrency(payslip.bpjs_kesehatan_employee) }}</span>
                </div>
                <div v-if="payslip.bpjs_jht_employee > 0" class="flex items-center justify-between gap-3 py-3 md:py-2.5">
                  <span class="text-ui-small text-ui-muted">BPJS JHT</span>
                  <span class="text-ui-small text-ui-bad tabular-nums text-right">{{ formatCurrency(payslip.bpjs_jht_employee) }}</span>
                </div>
                <div v-if="payslip.bpjs_jp_employee > 0" class="flex items-center justify-between gap-3 py-3 md:py-2.5">
                  <span class="text-ui-small text-ui-muted">BPJS JP</span>
                  <span class="text-ui-small text-ui-bad tabular-nums text-right">{{ formatCurrency(payslip.bpjs_jp_employee) }}</span>
                </div>
                <div v-if="payslip.pph21 > 0" class="flex items-center justify-between gap-3 py-3 md:py-2.5">
                  <span class="text-ui-small text-ui-muted">PPh 21</span>
                  <span class="text-ui-small text-ui-bad tabular-nums text-right">{{ formatCurrency(payslip.pph21) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3 py-3 md:py-2.5">
                  <span class="text-ui-small font-semibold text-ui-ink">Total Deductions</span>
                  <span class="text-ui-small font-semibold text-ui-bad tabular-nums text-right">{{ formatCurrency(payslip.total_deductions) }}</span>
                </div>
              </div>
            </section>
          </div>

          <!-- Take-home (tablet / desktop / print) -->
          <div class="take-home hidden md:flex print:flex items-center justify-between gap-4 bg-ui-ink text-white rounded-ui-card px-5 py-4">
            <p class="text-ui-small text-white/70">Net Salary (Take Home)</p>
            <p class="text-ui-display tabular-nums text-right">{{ formatCurrency(payslip.net_salary) }}</p>
          </div>

          <!-- Notes -->
          <div v-if="payslip.notes" class="bg-ui-surface border border-ui-line md:border-0 md:bg-ui-subtle rounded-ui-card px-4 py-3">
            <p class="text-ui-small font-medium text-ui-ink mb-1">Notes:</p>
            <p class="text-ui-small text-ui-text">{{ payslip.notes }}</p>
          </div>

          <!-- Footer -->
          <div class="md:pt-5 md:border-t md:border-ui-line text-center">
            <p class="text-ui-cap text-ui-muted">This is a computer-generated payslip and does not require a signature.</p>
            <p class="text-ui-cap text-ui-muted mt-1">For any queries, please contact the HR department.</p>
          </div>
        </div>

        <UiEmpty v-else :icon="FileText" title="Payslip not found" compact />
      </div>
    </div>
  </div>
</template>

<style>
/* Print only the payslip document. Scoped to pages that render one
   (:has), so printing any other page is unaffected. */
@media print {
  body:has(.payslip-print) * {
    visibility: hidden;
  }
  body:has(.payslip-print) .payslip-print,
  body:has(.payslip-print) .payslip-print * {
    visibility: visible;
  }
  .payslip-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none !important;
  }
  /* Keep the dark take-home band (and badges) when backgrounds are off. */
  .payslip-print,
  .payslip-print * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
