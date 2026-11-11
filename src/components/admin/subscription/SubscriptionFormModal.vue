<script setup>
import { computed, reactive, ref, watch } from "vue";
import { ChevronDown, Plus, Trash2 } from "lucide-vue-next";
import { UiModal, UiInput, UiSelect, UiButton } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  show: Boolean,
  loading: Boolean,
  mode: { type: String, default: "add" }, // "add" | "edit"
  data: { type: Object, default: () => ({}) },
  clients: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  bankAccounts: { type: Array, default: () => [] },
  pphTypes: { type: Array, default: () => [] },
  // Configurable via Settings -> Dropdown Options (category
  // "subscription_service_type") instead of a fixed list.
  serviceTypeOptions: { type: Array, default: () => [] },
  errors: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["submit", "close"]);

const BILLING_CYCLE_OPTIONS = computed(() => [
  { value: "monthly", label: t("subscriptions.cycle.monthly") },
  { value: "yearly", label: t("subscriptions.cycle.yearly") },
]);

const STATUS_OPTIONS = computed(() => [
  { value: "active", label: t("subscriptions.status.active") },
  { value: "postponed", label: t("subscriptions.status.postponed") },
  { value: "cancelled", label: t("subscriptions.status.cancelled") },
]);

const clientOptions = computed(() => props.clients.map((c) => ({ value: c.id, label: c.name })));
const projectOptions = computed(() => props.projects.map((p) => ({ value: p.id, label: p.name })));

const emptyService = () => ({
  service_type: "",
  product_name: "",
  amount: "",
  ppn_percentage: "",
  icann_fee: "",
  notes: "",
});

const emptyForm = () => ({
  name: "",
  services: [emptyService()],
  project_id: "",
  client_id: "",
  billing_cycle: "monthly",
  start_date: "",
  next_due_date: "",
  status: "active",
  notes: "",
  ppn_percentage: 0,
  admin_fee: 0,
  bank_name: "",
  bank_account: "",
  terms: "Payment is due within 7 days of the invoice date.\nServices may be suspended if payment is not received.\nPayments already made are non-refundable.",
  pph23_type: null,
  pph23_percent: null,
});

const form = reactive(emptyForm());

const totalAmount = computed(() => form.services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0));

const addService = () => form.services.push(emptyService());
const removeService = (index) => {
  if (form.services.length <= 1) return;
  form.services.splice(index, 1);
};

const serviceErrors = (index, field) => props.errors[`services.${index}.${field}`];

// Collapsible so the (now required) invoice-billing fields don't crowd out
// the subscription's own details by default -- expanded by default since
// Bank Account/Account Number here are required to save.
const showInvoiceConfig = ref(true);

// Purely informational heads-up that the client is expected to withhold
// PPh 23 on payment -- never touches subtotal/total, mirroring the same
// toggle on the manual Invoice Create form.
const applyPph23 = ref(false);

const handleBankNameChange = () => {
  const selected = props.bankAccounts.find((a) => a.bank_name === form.bank_name);
  form.bank_account = selected?.account_number || "";
};

const handlePph23TypeChange = () => {
  const type = props.pphTypes.find((p) => p.value === form.pph23_type);
  if (type?.default_rate != null) {
    form.pph23_percent = type.default_rate;
  }
};

const toggleApplyPph23 = () => {
  if (applyPph23.value && !form.pph23_type) {
    form.pph23_type = "pph23_npwp";
    form.pph23_percent = 2;
  } else if (!applyPph23.value) {
    form.pph23_type = null;
    form.pph23_percent = null;
  }
};

// With several services, each optionally carries its own VAT/PPN% (0% if
// left blank) -- the invoice-level field becomes a computed "Total VAT /
// PPN (%)" (blended rate) instead of one flat user-entered rate. With a
// single service, form.ppn_percentage is that one rate as before.
const isMultiService = computed(() => form.services.length > 1);

const ppnAmount = computed(() => {
  if (isMultiService.value) {
    return Math.round(
      form.services.reduce((sum, s) => sum + (Number(s.amount) || 0) * ((Number(s.ppn_percentage) || 0) / 100), 0)
    );
  }
  return Math.round(totalAmount.value * ((Number(form.ppn_percentage) || 0) / 100));
});

const totalPpnPercentage = computed(() => {
  if (!isMultiService.value) return Number(form.ppn_percentage) || 0;
  return totalAmount.value > 0 ? Math.round((ppnAmount.value / totalAmount.value) * 10000) / 100 : 0;
});

// One service's own amount + its own VAT/PPN + its own ICANN fee, shown
// inline on its row so it's clear each service is taxed (and surcharged)
// on its own amount rather than the whole subscription.
const serviceTotal = (service) =>
  Math.round((Number(service.amount) || 0) * (1 + (Number(service.ppn_percentage) || 0) / 100)) +
  (Number(service.icann_fee) || 0);

// With several services, "Subtotal" is the sum of each service's own
// amount + its own VAT/PPN (i.e. sum of serviceTotal() above minus ICANN
// fees, which are shown as their own line) rather than summing amounts
// and VAT separately -- same total, presented the way a multi-service
// invoice is actually itemized.
const servicesSubtotal = computed(() => totalAmount.value + ppnAmount.value);

// Optional pass-through registrar fee (e.g. ICANN's fee on a domain) --
// not taxed, added on top same as Admin Fee, available regardless of how
// many services there are since even a single domain service can have one.
const icannFeeTotal = computed(() => form.services.reduce((sum, s) => sum + (Number(s.icann_fee) || 0), 0));

const invoiceTotal = computed(
  () => totalAmount.value + ppnAmount.value + (Number(form.admin_fee) || 0) + icannFeeTotal.value
);
const pph23EstimatedAmount = computed(() => Math.round((invoiceTotal.value * (Number(form.pph23_percent) || 0)) / 100));

// Maintenance is the only service type that's ever tied to a Project --
// clearing project_id when no row is website_maintenance anymore avoids
// silently submitting a stale project link for a domain/SaaS-only
// subscription.
watch(
  () => form.services.map((s) => s.service_type),
  (types) => {
    if (!types.includes("website_maintenance")) form.project_id = "";
  }
);

const toDateInputValue = (dateString) => (dateString ? String(dateString).slice(0, 10) : "");

watch(
  () => [props.show, props.mode, props.data],
  ([show]) => {
    if (!show) return;
    if (props.mode === "edit") {
      Object.assign(form, {
        name: props.data.name ?? "",
        services:
          props.data.services?.length > 0
            ? props.data.services.map((s) => ({
                service_type: s.service_type ?? "",
                product_name: s.product_name ?? "",
                amount: s.amount ?? "",
                ppn_percentage: s.ppn_percentage ?? "",
                icann_fee: s.icann_fee ?? "",
                notes: s.notes ?? "",
              }))
            : [emptyService()],
        project_id: props.data.project_id ?? "",
        client_id: props.data.client_id ?? "",
        billing_cycle: props.data.billing_cycle ?? "monthly",
        start_date: toDateInputValue(props.data.start_date),
        next_due_date: toDateInputValue(props.data.next_due_date),
        status: props.data.status ?? "active",
        notes: props.data.notes ?? "",
        ppn_percentage: props.data.ppn_percentage ?? 0,
        admin_fee: props.data.admin_fee ?? 0,
        bank_name: props.data.bank_name ?? "",
        bank_account: "",
        terms: props.data.terms ?? emptyForm().terms,
        pph23_type: props.data.pph23_type ?? null,
        pph23_percent: props.data.pph23_percent ?? null,
      });
      handleBankNameChange();
      applyPph23.value = !!props.data.pph23_type;
    } else {
      Object.assign(form, emptyForm());
      applyPph23.value = false;
    }
  },
  { immediate: true }
);

// The pickers load when the modal opens: fill the account number in once
// the bank accounts arrive.
watch(
  () => props.bankAccounts,
  () => {
    if (props.show && form.bank_name && !form.bank_account) handleBankNameChange();
  }
);

const title = computed(() => (props.mode === "edit" ? t("subscriptions.form.editTitle") : t("subscriptions.form.addTitle")));

// Presentation only: token classes for the native number fields (they keep
// their min / max / step) and the "No project" choice.
const LABEL = "block text-ui-small font-medium text-ui-ink mb-1.5";
const FIELD =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus read-only:bg-ui-subtle read-only:text-ui-muted";
const ERR = "text-ui-cap text-ui-bad mt-1.5";
const projectSelectOptions = computed(() => [{ value: "", label: t("subscriptions.form.noProject") }, ...projectOptions.value]);
const bankOptions = computed(() => props.bankAccounts.map((a) => ({ value: a.bank_name, label: a.bank_name })));
const pphTypeOptions = computed(() => props.pphTypes.map((p) => ({ value: p.value, label: p.label })));

const submit = () => {
  const payload = { ...form };
  payload.services = form.services.map((s) => {
    const service = { ...s };
    if (!service.product_name) delete service.product_name;
    if (service.ppn_percentage === "" || service.ppn_percentage === null) delete service.ppn_percentage;
    if (service.icann_fee === "" || service.icann_fee === null) delete service.icann_fee;
    if (!service.notes) delete service.notes;
    return service;
  });
  // With multiple services, the invoice-level rate is a computed blend of
  // each service's own -- the backend recomputes this too, but send the
  // same number so what's displayed here matches what gets saved.
  if (isMultiService.value) payload.ppn_percentage = totalPpnPercentage.value;
  if (!payload.project_id) delete payload.project_id;
  if (!payload.notes) delete payload.notes;
  // bank_account is a read-only display field derived from bank_name on
  // the backend at invoice-generation time -- only bank_name is stored.
  delete payload.bank_account;

  emit("submit", {
    mode: props.mode,
    id: props.data?.id,
    payload,
  });
};
</script>

<template>
  <UiModal
    :open="show"
    size="lg"
    :title="title"
    :description="$t('subscriptions.form.description')"
    @close="$emit('close')"
  >
    <div class="space-y-5">
      <UiInput
        id="subscription-name"
        :label="$t('common.labels.name')"
        :placeholder="$t('subscriptions.form.namePlaceholder')"
        v-model="form.name"
        required
        :error="errors.name ? errors.name.join(', ') : ''"
      />

      <!-- Services -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5">
            <span class="text-ui-small font-medium text-ui-ink">{{ $t("subscriptions.form.services") }}</span>
            <span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md bg-ui-subtle text-ui-cap font-medium text-ui-text tabular-nums">
              {{ form.services.length }}
            </span>
          </div>
          <UiButton variant="ghost" size="sm" :icon="Plus" class="!text-ui-accent" @click="addService">{{ $t("subscriptions.form.addService") }}</UiButton>
        </div>
        <p v-if="errors.services" :class="[ERR, 'mb-2 !mt-0']">{{ errors.services.join(", ") }}</p>
        <p v-if="serviceTypeOptions.length === 0" class="text-ui-cap text-ui-muted mb-2">
          {{ $t("subscriptions.form.noServiceTypes") }}
        </p>

        <div class="space-y-3">
          <div
            v-for="(service, index) in form.services"
            :key="index"
            class="relative bg-ui-subtle/60 border border-ui-line rounded-ui-card p-3.5 sm:p-4"
          >
            <button
              v-if="form.services.length > 1"
              type="button"
              @click="removeService(index)"
              :title="$t('subscriptions.form.removeService')"
              :aria-label="$t('subscriptions.form.removeService')"
              class="ui-press absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-ui-control text-ui-muted hover:text-ui-bad hover:bg-ui-bad-soft"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div :class="form.services.length > 1 ? 'pr-8 sm:pr-0' : ''">
                <UiSelect
                  :id="`subscription-service-type-${index}`"
                  :label="$t('subscriptions.form.serviceType')"
                  :placeholder="$t('subscriptions.form.selectServiceType')"
                  v-model="service.service_type"
                  :options="serviceTypeOptions"
                  required
                  :error="serviceErrors(index, 'service_type') ? serviceErrors(index, 'service_type').join(', ') : ''"
                />
              </div>

              <div :class="form.services.length > 1 ? 'sm:pr-8' : ''">
                <label :for="`subscription-service-amount-${index}`" :class="LABEL">{{ $t("subscriptions.form.amountRp") }}<span class="text-ui-bad"> *</span></label>
                <input
                  :id="`subscription-service-amount-${index}`"
                  v-model="service.amount"
                  type="number"
                  min="0"
                  placeholder="500000"
                  required
                  :class="[FIELD, 'tabular-nums']"
                />
                <p v-if="serviceErrors(index, 'amount')" :class="ERR">{{ serviceErrors(index, "amount").join(", ") }}</p>
              </div>

              <div v-if="service.service_type === 'saas_subscription'" class="sm:col-span-2">
                <UiInput
                  :id="`subscription-product-name-${index}`"
                  :label="$t('subscriptions.form.productName')"
                  :placeholder="$t('subscriptions.form.productNamePlaceholder')"
                  v-model="service.product_name"
                  :error="serviceErrors(index, 'product_name') ? serviceErrors(index, 'product_name').join(', ') : ''"
                />
              </div>

              <div v-if="form.services.length > 1">
                <label :for="`subscription-service-ppn-${index}`" :class="LABEL">{{ $t("subscriptions.form.vat") }}</label>
                <input
                  :id="`subscription-service-ppn-${index}`"
                  v-model="service.ppn_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  :class="[FIELD, 'tabular-nums']"
                />
                <p v-if="serviceErrors(index, 'ppn_percentage')" :class="ERR">{{ serviceErrors(index, "ppn_percentage").join(", ") }}</p>
              </div>
              <div>
                <label :for="`subscription-service-icann-${index}`" :class="LABEL">{{ $t("subscriptions.form.icannFeeRp") }}</label>
                <input
                  :id="`subscription-service-icann-${index}`"
                  v-model="service.icann_fee"
                  type="number"
                  min="0"
                  placeholder="0"
                  :class="[FIELD, 'tabular-nums']"
                />
                <p v-if="serviceErrors(index, 'icann_fee')" :class="ERR">{{ serviceErrors(index, "icann_fee").join(", ") }}</p>
              </div>
            </div>

            <p v-if="Number(service.amount) > 0" class="text-ui-cap text-ui-muted mt-3 tabular-nums">
              Rp {{ (Number(service.amount) || 0).toLocaleString("id-ID") }}
              <template v-if="Number(service.ppn_percentage) > 0">{{ $t("subscriptions.form.plusVat", { n: service.ppn_percentage }) }}</template>
              <template v-if="Number(service.icann_fee) > 0">{{ $t("subscriptions.form.plusIcann", { amount: Number(service.icann_fee).toLocaleString("id-ID") }) }}</template>
              <template v-if="Number(service.ppn_percentage) > 0 || Number(service.icann_fee) > 0">
                = <span class="font-medium text-ui-ink">Rp {{ serviceTotal(service).toLocaleString("id-ID") }}</span>
              </template>
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiSelect
          id="subscription-client"
          :label="$t('common.labels.client')"
          :placeholder="$t('subscriptions.form.selectClient')"
          v-model="form.client_id"
          :options="clientOptions"
          required
          :error="errors.client_id ? errors.client_id.join(', ') : ''"
        />

        <UiSelect
          v-if="form.services.some((s) => s.service_type === 'website_maintenance')"
          id="subscription-project"
          :label="$t('subscriptions.form.projectOptional')"
          v-model="form.project_id"
          :options="projectSelectOptions"
          :hint="$t('subscriptions.form.projectHint')"
        />

        <UiSelect
          id="subscription-billing-cycle"
          :label="$t('subscriptions.form.billingCycle')"
          v-model="form.billing_cycle"
          :options="BILLING_CYCLE_OPTIONS"
          required
        />

        <UiSelect v-if="mode === 'edit'" id="subscription-status" :label="$t('common.labels.status')" v-model="form.status" :options="STATUS_OPTIONS" />

        <UiInput
          id="subscription-start-date"
          :label="$t('subscriptions.form.startDate')"
          type="date"
          v-model="form.start_date"
          required
          :error="errors.start_date ? errors.start_date.join(', ') : ''"
        />
        <UiInput
          id="subscription-next-due-date"
          :label="$t('subscriptions.form.nextDueDate')"
          type="date"
          v-model="form.next_due_date"
          required
          :error="errors.next_due_date ? errors.next_due_date.join(', ') : ''"
        />
      </div>

      <UiInput v-model="form.notes" :label="$t('subscriptions.form.notesOptional')" :rows="2" :placeholder="$t('subscriptions.form.notesPlaceholder')" />

      <!-- Invoice configuration -->
      <div class="border border-ui-line rounded-ui-card">
        <button
          type="button"
          class="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left rounded-ui-card hover:bg-ui-subtle/60 focus:outline-none focus-visible:shadow-ui-focus"
          :aria-expanded="showInvoiceConfig"
          @click="showInvoiceConfig = !showInvoiceConfig"
        >
          <span class="block min-w-0">
            <span class="block text-ui-h3 text-ui-ink">{{ $t("subscriptions.form.invoiceConfig") }}</span>
            <span class="block text-ui-cap text-ui-muted mt-0.5">
              {{ $t("subscriptions.form.invoiceConfigHint") }}
            </span>
          </span>
          <ChevronDown
            class="w-4 h-4 shrink-0 text-ui-muted transition-transform duration-150"
            :class="{ '-rotate-180': showInvoiceConfig }"
          />
        </button>

        <div v-show="showInvoiceConfig" class="px-4 pb-4 pt-1 space-y-4 border-t border-ui-line">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <div>
              <template v-if="!isMultiService">
                <label for="subscription-ppn" :class="LABEL">{{ $t("subscriptions.form.vat") }}</label>
                <input
                  id="subscription-ppn"
                  v-model.number="form.ppn_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  :class="[FIELD, 'tabular-nums']"
                />
              </template>
              <template v-else>
                <label :class="LABEL">{{ $t("subscriptions.form.totalVat") }}</label>
                <input :value="`${totalPpnPercentage}%`" type="text" readonly :class="[FIELD, 'tabular-nums']" />
                <p class="text-ui-cap text-ui-muted mt-1.5">{{ $t("subscriptions.form.blendedHint") }}</p>
              </template>
            </div>
            <div>
              <label for="subscription-admin-fee" :class="LABEL">{{ $t("subscriptions.form.adminFeeRp") }}</label>
              <input id="subscription-admin-fee" v-model.number="form.admin_fee" type="number" min="0" :class="[FIELD, 'tabular-nums']" />
            </div>

            <div>
              <UiSelect
                :label="$t('subscriptions.form.bankAccount')"
                :placeholder="$t('subscriptions.form.selectBank')"
                v-model="form.bank_name"
                :options="bankOptions"
                required
                :error="errors.bank_name ? errors.bank_name.join(', ') : ''"
                @change="handleBankNameChange"
              />
              <p v-if="bankAccounts.length === 0" class="text-ui-cap text-ui-muted mt-1.5">
                {{ $t("subscriptions.form.noBanks") }}
              </p>
            </div>
            <div>
              <label :class="LABEL">{{ $t("subscriptions.form.accountNumber") }}<span class="text-ui-bad"> *</span></label>
              <input v-model="form.bank_account" type="text" readonly required :class="[FIELD, 'tabular-nums']" />
            </div>
          </div>

          <UiInput v-model="form.terms" :label="$t('subscriptions.form.terms')" :rows="3" />

          <div>
            <label class="flex items-center gap-2.5 text-ui-small font-medium text-ui-ink cursor-pointer">
              <input type="checkbox" v-model="applyPph23" @change="toggleApplyPph23" class="w-4 h-4 accent-ui-ink" />
              {{ $t("subscriptions.form.pph23") }}
            </label>
            <p class="text-ui-cap text-ui-muted mt-1 pl-[26px]">
              {{ $t("subscriptions.form.pph23Hint") }}
            </p>
          </div>

          <div v-if="applyPph23" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiSelect :label="$t('subscriptions.form.pph23Type')" v-model="form.pph23_type" :options="pphTypeOptions" @change="handlePph23TypeChange" />
            <div>
              <label :class="LABEL">PPh 23 (%)</label>
              <input v-model.number="form.pph23_percent" type="number" min="0" max="100" step="0.1" :class="[FIELD, 'tabular-nums']" />
              <p class="text-ui-cap text-ui-muted mt-1.5 tabular-nums">{{ $t("subscriptions.form.estimated", { amount: pph23EstimatedAmount.toLocaleString("id-ID") }) }}</p>
            </div>
          </div>

          <!-- Totals -->
          <dl class="bg-ui-subtle rounded-ui-control px-4 py-3 text-ui-small text-ui-text space-y-1.5">
            <template v-if="isMultiService">
              <!-- Each service is taxed on its own amount at its own rate
                   (see the per-row total above) -- Subtotal here is the
                   sum of those, not amount and VAT summed separately. -->
              <div class="flex justify-between gap-3"><dt>{{ $t("subscriptions.form.subtotalServices") }}</dt><dd class="tabular-nums text-right">Rp {{ servicesSubtotal.toLocaleString("id-ID") }}</dd></div>
            </template>
            <template v-else>
              <div class="flex justify-between gap-3"><dt>{{ $t("subscriptions.form.amount") }}</dt><dd class="tabular-nums text-right">Rp {{ totalAmount.toLocaleString("id-ID") }}</dd></div>
              <div class="flex justify-between gap-3"><dt>{{ $t("subscriptions.form.vatN", { n: totalPpnPercentage }) }}</dt><dd class="tabular-nums text-right">Rp {{ ppnAmount.toLocaleString("id-ID") }}</dd></div>
            </template>
            <div class="flex justify-between gap-3"><dt>{{ $t("subscriptions.form.adminFee") }}</dt><dd class="tabular-nums text-right">Rp {{ (Number(form.admin_fee) || 0).toLocaleString("id-ID") }}</dd></div>
            <div v-if="icannFeeTotal > 0" class="flex justify-between gap-3"><dt>{{ $t("subscriptions.form.icannFee") }}</dt><dd class="tabular-nums text-right">Rp {{ icannFeeTotal.toLocaleString("id-ID") }}</dd></div>
            <div class="flex justify-between gap-3 font-semibold text-ui-ink pt-1.5 border-t border-ui-line">
              <dt>{{ $t("subscriptions.form.totalPerInvoice") }}</dt><dd class="tabular-nums text-right">Rp {{ invoiceTotal.toLocaleString("id-ID") }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="$emit('close')">{{ $t("common.actions.cancel") }}</UiButton>
      <UiButton :loading="loading" @click="submit">{{ loading ? $t("common.actions.saving") : $t("common.actions.save") }}</UiButton>
    </template>
  </UiModal>
</template>
