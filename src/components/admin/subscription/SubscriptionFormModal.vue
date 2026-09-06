<script setup>
import { computed, reactive, ref, watch } from "vue";
import { X, ChevronDown, Plus, Trash2 } from "lucide-vue-next";
import BaseInput from "@/components/common/form/Input.vue";
import BaseSelect from "@/components/common/form/Select.vue";

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

const BILLING_CYCLE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Not Active" },
];

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
  terms: "Payment is due within 14 days of the invoice date.\nServices may be suspended if payment is not received.\nPayments already made are non-refundable.",
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
  const type = props.pphTypes.find((t) => t.value === form.pph23_type);
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

const title = computed(() => (props.mode === "edit" ? "Edit Subscription" : "Add Subscription"));

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
  <div
    v-if="show"
    class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
        <div>
          <h3 class="text-brand-dark text-lg font-bold">{{ title }}</h3>
          <p class="text-brand-light text-xs mt-0.5">
            Manual recurring billing -- click "Generate Invoice" on the list each period.
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] shrink-0"
        >
          <X class="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div class="p-5 space-y-4">
        <div>
          <BaseInput
            id="subscription-name"
            label="Name"
            placeholder="e.g. Website Maintenance - PT ABC"
            v-model="form.name"
            required
          />
          <p v-if="errors.name" class="text-red-500 text-sm mt-1">{{ errors.name.join(", ") }}</p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-brand-dark text-sm font-semibold">Services</label>
            <button
              type="button"
              @click="addService"
              class="inline-flex items-center gap-1 text-xs font-semibold text-[#0C51D9] hover:underline"
            >
              <Plus class="w-3.5 h-3.5" /> Add Service
            </button>
          </div>
          <p v-if="errors.services" class="text-red-500 text-sm mb-2">{{ errors.services.join(", ") }}</p>
          <p v-if="serviceTypeOptions.length === 0" class="text-xs text-gray-400 mb-2">
            No service types configured yet. Add one in Settings &rarr; Dropdown Options.
          </p>

          <div class="space-y-3">
            <div
              v-for="(service, index) in form.services"
              :key="index"
              class="relative bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-3 space-y-3"
            >
              <button
                v-if="form.services.length > 1"
                type="button"
                @click="removeService(index)"
                title="Remove service"
                class="absolute top-2 right-2 w-6 h-6 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[6px] bg-white hover:border-red-400 hover:bg-red-50 group/delete transition-colors"
              >
                <Trash2 class="w-3 h-3 text-gray-500 group-hover/delete:text-red-600" />
              </button>

              <div class="pr-8">
                <BaseSelect
                  :id="`subscription-service-type-${index}`"
                  label="Service Type"
                  placeholder="Select a service type"
                  v-model="service.service_type"
                  :options="serviceTypeOptions"
                  required
                />
                <p v-if="serviceErrors(index, 'service_type')" class="text-red-500 text-sm mt-1">
                  {{ serviceErrors(index, "service_type").join(", ") }}
                </p>
              </div>

              <div v-if="service.service_type === 'saas_subscription'">
                <BaseInput
                  :id="`subscription-product-name-${index}`"
                  label="Product Name"
                  placeholder="e.g. Ticket Management (Yaap), Jstock"
                  v-model="service.product_name"
                />
                <p v-if="serviceErrors(index, 'product_name')" class="text-red-500 text-sm mt-1">
                  {{ serviceErrors(index, "product_name").join(", ") }}
                </p>
              </div>

              <div>
                <BaseInput
                  :id="`subscription-service-amount-${index}`"
                  label="Amount (Rp)"
                  type="number"
                  min="0"
                  placeholder="500000"
                  v-model="service.amount"
                  required
                />
                <p v-if="serviceErrors(index, 'amount')" class="text-red-500 text-sm mt-1">
                  {{ serviceErrors(index, "amount").join(", ") }}
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-if="form.services.length > 1">
                  <label :for="`subscription-service-ppn-${index}`" class="block mb-2 text-gray-700 font-semibold font-jakarta text-[14px]">
                    VAT / PPN (%)
                  </label>
                  <input
                    :id="`subscription-service-ppn-${index}`"
                    v-model="service.ppn_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    class="w-full border rounded-[12px] border-[#DCDEDD] px-3.5 py-3 text-sm"
                  />
                  <p v-if="serviceErrors(index, 'ppn_percentage')" class="text-red-500 text-sm mt-1">
                    {{ serviceErrors(index, "ppn_percentage").join(", ") }}
                  </p>
                </div>
                <div>
                  <label :for="`subscription-service-icann-${index}`" class="block mb-2 text-gray-700 font-semibold font-jakarta text-[14px]">
                    ICANN Fee (Rp) (optional)
                  </label>
                  <input
                    :id="`subscription-service-icann-${index}`"
                    v-model="service.icann_fee"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full border rounded-[12px] border-[#DCDEDD] px-3.5 py-3 text-sm"
                  />
                  <p class="text-xs text-brand-light mt-1">Pass-through registrar fee (e.g. domain) -- not taxed.</p>
                  <p v-if="serviceErrors(index, 'icann_fee')" class="text-red-500 text-sm mt-1">
                    {{ serviceErrors(index, "icann_fee").join(", ") }}
                  </p>
                </div>
              </div>

              <p v-if="Number(service.amount) > 0" class="text-xs text-brand-light">
                Rp {{ (Number(service.amount) || 0).toLocaleString("id-ID") }}
                <template v-if="Number(service.ppn_percentage) > 0"> + VAT {{ service.ppn_percentage }}%</template>
                <template v-if="Number(service.icann_fee) > 0"> + ICANN Fee Rp {{ Number(service.icann_fee).toLocaleString("id-ID") }}</template>
                <template v-if="Number(service.ppn_percentage) > 0 || Number(service.icann_fee) > 0">
                  = <span class="font-semibold text-brand-dark">Rp {{ serviceTotal(service).toLocaleString("id-ID") }}</span>
                </template>
              </p>
            </div>
          </div>
        </div>

        <div>
          <BaseSelect
            id="subscription-client"
            label="Client"
            placeholder="Select a client"
            v-model="form.client_id"
            :options="clientOptions"
            required
          />
          <p v-if="errors.client_id" class="text-red-500 text-sm mt-1">{{ errors.client_id.join(", ") }}</p>
        </div>

        <div v-if="form.services.some((s) => s.service_type === 'website_maintenance')">
          <BaseSelect
            id="subscription-project"
            label="Project (optional)"
            placeholder="No project"
            v-model="form.project_id"
            :options="projectOptions"
          />
          <p class="text-brand-light text-xs mt-1">Link this maintenance to the website project it covers, if any.</p>
        </div>

        <div>
          <BaseSelect
            id="subscription-billing-cycle"
            label="Billing Cycle"
            v-model="form.billing_cycle"
            :options="BILLING_CYCLE_OPTIONS"
            required
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <BaseInput
              id="subscription-start-date"
              label="Start Date"
              type="date"
              v-model="form.start_date"
              required
            />
            <p v-if="errors.start_date" class="text-red-500 text-sm mt-1">{{ errors.start_date.join(", ") }}</p>
          </div>
          <div>
            <BaseInput
              id="subscription-next-due-date"
              label="Next Due Date"
              type="date"
              v-model="form.next_due_date"
              required
            />
            <p v-if="errors.next_due_date" class="text-red-500 text-sm mt-1">{{ errors.next_due_date.join(", ") }}</p>
          </div>
        </div>

        <div v-if="mode === 'edit'">
          <BaseSelect
            id="subscription-status"
            label="Status"
            v-model="form.status"
            :options="STATUS_OPTIONS"
          />
        </div>

        <div>
          <label class="block text-brand-dark text-sm font-semibold mb-1">Notes (optional)</label>
          <textarea
            v-model="form.notes"
            rows="2"
            placeholder="Any internal notes about this subscription..."
            class="w-full border rounded-[12px] transition-all duration-300 hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white border-[#DCDEDD] px-3.5 py-3 text-sm"
          ></textarea>
        </div>

        <div class="bg-blue-50/60 border border-blue-100 rounded-[12px] p-4">
          <button
            type="button"
            class="w-full flex items-center justify-between bg-transparent border-0 outline-none cursor-pointer text-left"
            @click="showInvoiceConfig = !showInvoiceConfig"
          >
            <span class="block">
              <span class="block text-brand-dark text-sm font-bold">Invoice Configuration</span>
              <span class="block text-brand-light text-xs mt-0.5">
                Applied to every invoice generated from this subscription -- configure once instead of re-entering it each period.
              </span>
            </span>
            <ChevronDown
              class="w-4 h-4 shrink-0 text-brand-dark transition-transform duration-150"
              :class="{ '-rotate-180': !showInvoiceConfig }"
            />
          </button>

          <div v-show="showInvoiceConfig" class="mt-4">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <BaseInput
                v-if="!isMultiService"
                id="subscription-ppn"
                label="VAT / PPN (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                v-model.number="form.ppn_percentage"
              />
              <template v-else>
                <label class="block text-brand-dark text-sm font-semibold mb-1">Total VAT / PPN (%)</label>
                <input
                  :value="`${totalPpnPercentage}%`"
                  type="text"
                  readonly
                  class="w-full border rounded-[12px] border-[#DCDEDD] px-3.5 py-3 text-sm bg-gray-50"
                />
                <p class="text-xs text-brand-light mt-1">Blended from each service's own VAT / PPN (%) above.</p>
              </template>
            </div>
            <div>
              <BaseInput
                id="subscription-admin-fee"
                label="Admin Fee (Rp)"
                type="number"
                min="0"
                v-model.number="form.admin_fee"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-1">Bank Account <span class="text-red-600">*</span></label>
              <div class="relative w-full">
                <select v-model="form.bank_name" @change="handleBankNameChange" required class="select-soft">
                  <option value="" disabled>Select a bank account</option>
                  <option v-for="account in bankAccounts" :key="account.id" :value="account.bank_name">{{ account.bank_name }}</option>
                </select>
                <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              <p v-if="errors.bank_name" class="text-red-500 text-sm mt-1">{{ errors.bank_name.join(", ") }}</p>
              <p v-if="bankAccounts.length === 0" class="text-xs text-gray-400 mt-1">
                No bank accounts configured yet. Add one in Settings &rarr; Bank Accounts.
              </p>
            </div>
            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-1">Account Number <span class="text-red-600">*</span></label>
              <input v-model="form.bank_account" type="text" readonly required class="w-full border rounded-[12px] border-[#DCDEDD] px-3.5 py-3 text-sm bg-gray-50" />
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-brand-dark text-sm font-semibold mb-1">Terms & Conditions</label>
            <textarea
              v-model="form.terms"
              rows="3"
              class="w-full border rounded-[12px] transition-all duration-300 hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white border-[#DCDEDD] px-3.5 py-3 text-sm resize-none"
            ></textarea>
          </div>

          <div class="mb-4">
            <label class="flex items-center gap-2 text-sm font-semibold text-brand-dark">
              <input type="checkbox" v-model="applyPph23" @change="toggleApplyPph23" />
              Subject to PPh 23 withholding?
            </label>
            <p class="text-xs text-brand-light mt-1">
              Informational only -- adds a note to the invoice PDF. Does not change Total Amount Due.
            </p>
          </div>

          <div v-if="applyPph23" class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-1">PPh 23 Type</label>
              <div class="relative w-full">
                <select v-model="form.pph23_type" @change="handlePph23TypeChange" class="select-soft">
                  <option v-for="type in pphTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
                </select>
                <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-1">PPh 23 (%)</label>
              <input v-model.number="form.pph23_percent" type="number" min="0" max="100" step="0.1" class="w-full border rounded-[12px] border-[#DCDEDD] px-3.5 py-3 text-sm" />
              <p class="text-xs text-brand-light mt-1">Estimated: Rp {{ pph23EstimatedAmount.toLocaleString("id-ID") }}</p>
            </div>
          </div>

          <div class="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
            <template v-if="isMultiService">
              <!-- Each service is taxed on its own amount at its own rate
                   (see the per-row total above) -- Subtotal here is the
                   sum of those, not amount and VAT summed separately. -->
              <div class="flex justify-between"><span>Subtotal (services incl. VAT)</span><span>Rp {{ servicesSubtotal.toLocaleString("id-ID") }}</span></div>
            </template>
            <template v-else>
              <div class="flex justify-between"><span>Amount</span><span>Rp {{ totalAmount.toLocaleString("id-ID") }}</span></div>
              <div class="flex justify-between"><span>VAT ({{ totalPpnPercentage }}%)</span><span>Rp {{ ppnAmount.toLocaleString("id-ID") }}</span></div>
            </template>
            <div class="flex justify-between"><span>Admin Fee</span><span>Rp {{ (Number(form.admin_fee) || 0).toLocaleString("id-ID") }}</span></div>
            <div v-if="icannFeeTotal > 0" class="flex justify-between"><span>ICANN Fee</span><span>Rp {{ icannFeeTotal.toLocaleString("id-ID") }}</span></div>
            <div class="flex justify-between font-bold text-brand-dark pt-1 border-t border-gray-200"><span>Total per Invoice</span><span>Rp {{ invoiceTotal.toLocaleString("id-ID") }}</span></div>
          </div>
          </div>
        </div>
      </div>

      <div class="p-5 border-t border-[#DCDEDD] flex justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2.5 border border-[#DCDEDD] rounded-[10px] text-sm font-semibold hover:border-[#0C51D9] transition-colors"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="loading"
          @click="submit"
        >
          {{ loading ? "Saving..." : "Save" }}
        </button>
      </div>
    </div>
  </div>
</template>
