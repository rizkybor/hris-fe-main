<script setup>
import { ref, computed } from "vue";
import { usePayrollStore } from "@/stores/payroll";
import { useRouter, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import {
  Calendar,
  Calculator,
  Plus,
  ArrowLeft,
  Gift,
  Check,
} from "lucide-vue-next";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiAlert, UiButton, UiInput, UiPageHeader } from "@/components/ui";

const router = useRouter();
const route = useRoute();
const payrollStore = usePayrollStore();
const alertModal = useAlertModalStore();
const { loading, error } = storeToRefs(payrollStore);

// "?type=thr" lets the dashboard's "Generate THR" shortcut land here
// pre-selected, without needing a whole separate page for what's really
// the same one-field form.
const payrollType = ref(route.query.type === "thr" ? "thr" : "monthly");

const form = ref({
  salary_month: new Date().toISOString().slice(0, 7),
});

const formatMonth = (month) => {
  if (!month) return "-";
  const [year, monthNum] = month.split("-");
  const date = new Date(year, monthNum - 1);
  return date.toLocaleDateString("id-ID", { year: "numeric", month: "long" });
};

const handleSubmit = async () => {
  const label = payrollType.value === "thr" ? "THR" : "Payroll";
  const period = formatMonth(form.value.salary_month);

  try {
    const check = await payrollStore.checkPeriod(form.value.salary_month, payrollType.value);

    let regenerate = false;

    if (check.exists) {
      if (!check.can_regenerate) {
        await alertModal.alert(
          `A ${label} for ${period} already exists (${check.employee_count ?? 0} employees, status: ${check.status}). Only Superadmin, Manager, or Finance can regenerate it.`,
          { type: "warning" }
        );
        return;
      }

      const ok = await alertModal.confirm(
        `A ${label} for ${period} already exists (${check.employee_count ?? 0} employees, status: ${check.status}). Generating again will REPLACE all its employee details with freshly computed ones. Continue?`,
        { type: "warning", confirmText: "Regenerate" }
      );
      if (!ok) return;
      regenerate = true;
    } else {
      const ok = await alertModal.confirm(
        `Generate a new ${label} for ${period}? This is a brand-new period with no existing data.`,
        { type: "info", confirmText: "Generate" }
      );
      if (!ok) return;
    }

    const payload = { ...form.value, regenerate };
    if (payrollType.value === "thr") {
      await payrollStore.generateThrPayroll(payload);
    } else {
      await payrollStore.generatePayroll(payload);
    }
    router.push({ name: "admin.payroll.dashboard" });
  } catch (error) {
    console.error("Error creating payroll:", error);
  }
};

// Presentation only: the two run types as option cards.
const typeOptions = [
  { value: "monthly", label: "Monthly Payroll", icon: Calendar },
  { value: "thr", label: "THR (Tunjangan Hari Raya)", icon: Gift },
];
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="payrollType === 'thr' ? 'Generate THR' : 'Generate Payroll'"
      :subtitle="
        payrollType === 'thr'
          ? 'Select the month to generate THR (Tunjangan Hari Raya) for eligible employees'
          : 'Select the salary month to generate payroll for all active employees'
      "
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <!-- Form -->
      <form
        class="lg:col-span-2 bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-6 space-y-5 ui-anim-fade-up"
        @submit.prevent="handleSubmit"
      >
        <div class="pb-4 border-b border-ui-line">
          <h2 class="text-ui-h2 text-ui-ink">Payroll Period</h2>
          <p class="text-ui-small text-ui-muted mt-0.5">Choose the run type and the salary month.</p>
        </div>

        <fieldset>
          <legend class="block text-ui-small font-medium text-ui-ink mb-1.5">
            Payroll Type<span class="text-ui-bad"> *</span>
          </legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
            <button
              v-for="opt in typeOptions"
              :key="opt.value"
              type="button"
              role="radio"
              :aria-checked="payrollType === opt.value"
              :class="[
                'ui-press flex items-center gap-3 text-left px-4 py-3 rounded-ui-control border transition-colors',
                'focus:outline-none focus-visible:shadow-ui-focus',
                payrollType === opt.value
                  ? 'border-ui-accent bg-ui-accent-soft text-ui-ink'
                  : 'border-ui-line-strong bg-ui-surface text-ui-text hover:bg-ui-subtle',
              ]"
              @click="payrollType = opt.value"
            >
              <component
                :is="opt.icon"
                :class="['w-[18px] h-[18px] shrink-0', payrollType === opt.value ? 'text-ui-accent' : 'text-ui-faint']"
              />
              <span class="flex-1 text-ui-body font-medium">{{ opt.label }}</span>
              <span
                :class="[
                  'w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0',
                  payrollType === opt.value ? 'bg-ui-accent border-ui-accent text-white' : 'border-ui-line-strong',
                ]"
              >
                <Check v-if="payrollType === opt.value" class="w-3 h-3" />
              </span>
            </button>
          </div>
        </fieldset>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="form.salary_month" type="month" label="Salary Month" :icon="Calendar" required />
        </div>

        <UiAlert v-if="payrollType === 'thr'" tone="info" title="Automatic Generation (THR)">
          THR will be generated for every employee with at least 1 month of continuous service, prorated by
          tenure (full amount at 12+ months). This is a separate run from the regular monthly payroll -- both
          can exist for the same month.
        </UiAlert>
        <UiAlert v-else tone="info" title="Automatic Generation">
          Payroll will be automatically generated for all active employees based on their attendance records for the selected month. Salaries will be calculated based on attendance, sick days, and absences.
        </UiAlert>

        <UiAlert v-if="error" tone="bad" title="Error" :message="error" />
      </form>

      <!-- Summary -->
      <aside class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 lg:sticky lg:top-6 ui-anim-fade-up">
        <div class="flex items-center gap-2">
          <Calculator class="w-4 h-4 text-ui-faint" />
          <h3 class="text-ui-h3 text-ui-ink">Payroll Summary</h3>
        </div>
        <p class="text-ui-cap text-ui-muted mt-0.5">Generation details</p>

        <dl class="mt-4 divide-y divide-ui-line border-y border-ui-line">
          <div class="flex items-center justify-between gap-3 py-2.5">
            <dt class="text-ui-small text-ui-muted">Type</dt>
            <dd class="text-ui-small text-ui-ink text-right">{{ payrollType === "thr" ? "THR" : "Monthly Payroll" }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2.5">
            <dt class="text-ui-small text-ui-muted">Selected Month:</dt>
            <dd class="text-ui-small font-medium text-ui-ink text-right">{{ formatMonth(form.salary_month) }}</dd>
          </div>
        </dl>

        <div class="mt-4 space-y-2">
          <UiButton
            block
            :loading="loading"
            :disabled="!form.salary_month"
            :icon="payrollType === 'thr' ? Gift : Plus"
            @click="handleSubmit"
          >
            {{ loading ? "Generating..." : payrollType === "thr" ? "Generate THR" : "Generate Payroll" }}
          </UiButton>
          <UiButton block variant="secondary" :icon="ArrowLeft" :disabled="loading" @click="router.back()">Cancel</UiButton>
        </div>
      </aside>
    </div>
  </div>
</template>
