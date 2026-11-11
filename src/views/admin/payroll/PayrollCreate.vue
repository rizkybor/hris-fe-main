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
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { UiAlert, UiButton, UiInput, UiPageHeader } from "@/components/ui";

const { t } = useI18n();

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
  return date.toLocaleDateString(localeTag(), { year: "numeric", month: "long" });
};

const handleSubmit = async () => {
  const label = payrollType.value === "thr" ? "THR" : t("payroll.common.payroll");
  const period = formatMonth(form.value.salary_month);

  try {
    const check = await payrollStore.checkPeriod(form.value.salary_month, payrollType.value);

    let regenerate = false;

    if (check.exists) {
      if (!check.can_regenerate) {
        await alertModal.alert(
          t("payroll.create.existsNoPermission", { label, period, n: check.employee_count ?? 0, status: check.status }),
          { type: "warning" }
        );
        return;
      }

      const ok = await alertModal.confirm(
        t("payroll.create.existsConfirm", { label, period, n: check.employee_count ?? 0, status: check.status }),
        { type: "warning", confirmText: t("payroll.common.regenerate") }
      );
      if (!ok) return;
      regenerate = true;
    } else {
      const ok = await alertModal.confirm(
        t("payroll.create.newConfirm", { label, period }),
        { type: "info", confirmText: t("payroll.create.generate") }
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
const typeOptions = computed(() => [
  { value: "monthly", label: t("payroll.common.monthlyPayroll"), icon: Calendar },
  { value: "thr", label: t("payroll.create.thrFull"), icon: Gift },
]);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="payrollType === 'thr' ? $t('payroll.common.generateThr') : $t('payroll.common.generatePayroll')"
      :subtitle="
        payrollType === 'thr'
          ? $t('payroll.create.subtitleThr')
          : $t('payroll.create.subtitle')
      "
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <!-- Form -->
      <form
        class="lg:col-span-2 bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-6 space-y-5 ui-anim-fade-up"
        @submit.prevent="handleSubmit"
      >
        <div class="pb-4 border-b border-ui-line">
          <h2 class="text-ui-h2 text-ui-ink">{{ $t("payroll.create.periodTitle") }}</h2>
          <p class="text-ui-small text-ui-muted mt-0.5">{{ $t("payroll.create.periodSubtitle") }}</p>
        </div>

        <fieldset>
          <legend class="block text-ui-small font-medium text-ui-ink mb-1.5">
            {{ $t("payroll.create.type") }}<span class="text-ui-bad"> *</span>
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
          <UiInput v-model="form.salary_month" type="month" :label="$t('payroll.create.salaryMonth')" :icon="Calendar" required />
        </div>

        <UiAlert v-if="payrollType === 'thr'" tone="info" :title="$t('payroll.create.autoThrTitle')">
          {{ $t("payroll.create.autoThrBody") }}
        </UiAlert>
        <UiAlert v-else tone="info" :title="$t('payroll.create.autoTitle')">
          {{ $t("payroll.create.autoBody") }}
        </UiAlert>

        <UiAlert v-if="error" tone="bad" :title="$t('payroll.create.error')" :message="error" />
      </form>

      <!-- Summary -->
      <aside class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 lg:sticky lg:top-6 ui-anim-fade-up">
        <div class="flex items-center gap-2">
          <Calculator class="w-4 h-4 text-ui-faint" />
          <h3 class="text-ui-h3 text-ui-ink">{{ $t("payroll.create.summaryTitle") }}</h3>
        </div>
        <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("payroll.create.summarySubtitle") }}</p>

        <dl class="mt-4 divide-y divide-ui-line border-y border-ui-line">
          <div class="flex items-center justify-between gap-3 py-2.5">
            <dt class="text-ui-small text-ui-muted">{{ $t("common.labels.type") }}</dt>
            <dd class="text-ui-small text-ui-ink text-right">{{ payrollType === "thr" ? "THR" : $t("payroll.common.monthlyPayroll") }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2.5">
            <dt class="text-ui-small text-ui-muted">{{ $t("payroll.create.selectedMonth") }}</dt>
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
            {{ loading ? $t("payroll.create.generating") : payrollType === "thr" ? $t("payroll.common.generateThr") : $t("payroll.common.generatePayroll") }}
          </UiButton>
          <UiButton block variant="secondary" :icon="ArrowLeft" :disabled="loading" @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
        </div>
      </aside>
    </div>
  </div>
</template>
