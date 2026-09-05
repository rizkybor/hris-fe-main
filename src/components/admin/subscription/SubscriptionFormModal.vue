<script setup>
import { computed, reactive, ref, watch } from "vue";
import { X, ChevronDown } from "lucide-vue-next";
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

const emptyForm = () => ({
  name: "",
  service_type: "",
  product_name: "",
  project_id: "",
  client_id: "",
  billing_cycle: "monthly",
  amount: "",
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

const ppnAmount = computed(() => Math.round((Number(form.amount) || 0) * ((Number(form.ppn_percentage) || 0) / 100)));
const invoiceTotal = computed(() => (Number(form.amount) || 0) + ppnAmount.value + (Number(form.admin_fee) || 0));
const pph23EstimatedAmount = computed(() => Math.round((invoiceTotal.value * (Number(form.pph23_percent) || 0)) / 100));

// Maintenance is the only service type that's ever tied to a Project --
// clearing project_id when switching away avoids silently submitting a
// stale project link for a domain/SaaS subscription.
watch(
  () => form.service_type,
  (type) => {
    if (type !== "website_maintenance") form.project_id = "";
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
        service_type: props.data.service_type ?? "",
        product_name: props.data.product_name ?? "",
        project_id: props.data.project_id ?? "",
        client_id: props.data.client_id ?? "",
        billing_cycle: props.data.billing_cycle ?? "monthly",
        amount: props.data.amount ?? "",
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
  if (!payload.project_id) delete payload.project_id;
  if (!payload.product_name) delete payload.product_name;
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
          <BaseSelect
            id="subscription-service-type"
            label="Service Type"
            placeholder="Select a service type"
            v-model="form.service_type"
            :options="serviceTypeOptions"
            required
          />
          <p v-if="errors.service_type" class="text-red-500 text-sm mt-1">{{ errors.service_type.join(", ") }}</p>
          <p v-if="serviceTypeOptions.length === 0" class="text-xs text-gray-400 mt-1">
            No service types configured yet. Add one in Settings &rarr; Dropdown Options.
          </p>
        </div>

        <div v-if="form.service_type === 'saas_subscription'">
          <BaseInput
            id="subscription-product-name"
            label="Product Name"
            placeholder="e.g. Ticket Management (Yaap), Jstock"
            v-model="form.product_name"
          />
          <p v-if="errors.product_name" class="text-red-500 text-sm mt-1">{{ errors.product_name.join(", ") }}</p>
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

        <div v-if="form.service_type === 'website_maintenance'">
          <BaseSelect
            id="subscription-project"
            label="Project (optional)"
            placeholder="No project"
            v-model="form.project_id"
            :options="projectOptions"
          />
          <p class="text-brand-light text-xs mt-1">Link this maintenance to the website project it covers, if any.</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <BaseSelect
              id="subscription-billing-cycle"
              label="Billing Cycle"
              v-model="form.billing_cycle"
              :options="BILLING_CYCLE_OPTIONS"
              required
            />
          </div>
          <div>
            <BaseInput
              id="subscription-amount"
              label="Amount (Rp)"
              type="number"
              min="0"
              placeholder="500000"
              v-model="form.amount"
              required
            />
            <p v-if="errors.amount" class="text-red-500 text-sm mt-1">{{ errors.amount.join(", ") }}</p>
          </div>
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
                id="subscription-ppn"
                label="VAT / PPN (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                v-model.number="form.ppn_percentage"
              />
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
            <div class="flex justify-between"><span>Amount</span><span>Rp {{ (Number(form.amount) || 0).toLocaleString("id-ID") }}</span></div>
            <div class="flex justify-between"><span>VAT ({{ form.ppn_percentage || 0 }}%)</span><span>Rp {{ ppnAmount.toLocaleString("id-ID") }}</span></div>
            <div class="flex justify-between"><span>Admin Fee</span><span>Rp {{ (Number(form.admin_fee) || 0).toLocaleString("id-ID") }}</span></div>
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
