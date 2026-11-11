<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { Plus, Trash2, ArrowLeft, Check } from "lucide-vue-next";
import { UiAlert, UiButton, UiCard, UiInput, UiPageHeader, UiSelect, UiSwitch } from "@/components/ui";
import { useInvoiceStore } from "@/stores/invoice";
import { useBankAccountStore } from "@/stores/bankAccount";
import { useProjectStore } from "@/stores/project";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";

const store = useInvoiceStore();
const router = useRouter();
const route = useRoute();
const bankAccountStore = useBankAccountStore();
const { bankAccounts } = storeToRefs(bankAccountStore);
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);
const calculatorStore = useProjectCalculatorStore();
const { pphTypes } = storeToRefs(calculatorStore);

const editingId = computed(() => route.params.id || null);
const isEditMode = computed(() => !!editingId.value);
const existingInvoiceNumber = ref("");

onMounted(async () => {
  await Promise.all([
    bankAccountStore.fetchBankAccounts(),
    projectStore.fetchProjects(),
    calculatorStore.fetchPphTypes(),
  ]);

  if (isEditMode.value) {
    try {
      const invoice = await store.fetchInvoice(editingId.value);
      existingInvoiceNumber.value = invoice.invoice_number;
      form.value.project_id = invoice.project_id || "";
      form.value.faktur_pajak_number = invoice.faktur_pajak_number || "";
      form.value.client_code = invoice.client_code || "";
      form.value.client_name = invoice.client_name || "";
      form.value.client_pic = invoice.client_pic || "";
      form.value.client_email = invoice.client_email || "";
      form.value.client_phone = invoice.client_phone || "";
      form.value.client_npwp = invoice.client_npwp || "";
      form.value.date = invoice.date;
      form.value.items = invoice.items?.length ? invoice.items : form.value.items;
      form.value.ppn_percentage = invoice.ppn_percentage || 0;
      form.value.admin_fee = invoice.admin_fee || 0;
      form.value.icann_fee = invoice.icann_fee || 0;
      form.value.bank_name = invoice.bank_name || "";
      form.value.bank_account = invoice.bank_account || "";
      form.value.terms = invoice.terms || "";
      form.value.pph23_type = invoice.pph23_type;
      form.value.pph23_percent = invoice.pph23_percent;

      if (invoice.pph23_type) {
        applyPph23.value = true;
      }
    } catch (error) {
      errorMessage.value = "Failed to load invoice.";
    }
  }
});

// Purely informational heads-up that the client is expected to withhold
// PPh 23 on payment -- never touches subtotal/total, which stay the
// actual invoiced amount. The real withholding is recorded later on the
// Payment Receipt once payment actually happens.
const applyPph23 = ref(false);

const form = ref({
  project_id: "",
  faktur_pajak_number: "",
  numbering_mode: "automatic",
  client_code: "",
  invoice_number: "",
  client_name: "",
  client_pic: "",
  client_email: "",
  client_phone: "",
  client_npwp: "",
  date: new Date().toISOString().slice(0, 10),
  items: [{ description: "", quantity: "", rate: "", total: 0 }],
  ppn_percentage: 0,
  admin_fee: 0,
  icann_fee: 0,
  bank_name: "",
  bank_account: "",
  terms: "Payment is due within 7 days of the invoice date.\nServices may be suspended if payment is not received.\nPayments already made are non-refundable.",
  pph23_type: null,
  pph23_percent: null,
});

const submitting = ref(false);
const errorMessage = ref("");

const addItem = () => form.value.items.push({ description: "", quantity: "", rate: "", total: 0 });
const removeItem = (i) => form.value.items.splice(i, 1);

const handleBankNameChange = () => {
  const selected = bankAccounts.value.find((a) => a.bank_name === form.value.bank_name);
  form.value.bank_account = selected?.account_number || "";
};

const subtotal = computed(() => form.value.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
const ppnAmount = computed(() => Math.round(subtotal.value * ((Number(form.value.ppn_percentage) || 0) / 100)));
const total = computed(
  () => subtotal.value + ppnAmount.value + (Number(form.value.admin_fee) || 0) + (Number(form.value.icann_fee) || 0)
);
const pph23EstimatedAmount = computed(() => Math.round((total.value * (Number(form.value.pph23_percent) || 0)) / 100));

const toggleApplyPph23 = () => {
  if (applyPph23.value && !form.value.pph23_type) {
    form.value.pph23_type = "pph23_npwp";
    form.value.pph23_percent = 2;
  } else if (!applyPph23.value) {
    form.value.pph23_type = null;
    form.value.pph23_percent = null;
  }
};

const handlePph23TypeChange = () => {
  const type = pphTypes.value.find((t) => t.value === form.value.pph23_type);
  if (type?.default_rate != null) {
    form.value.pph23_percent = type.default_rate;
  }
};

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    if (isEditMode.value) {
      // Numbering mode / invoice_number aren't editable once issued -- only
      // the content fields InvoiceUpdateRequest actually validates.
      const payload = {
        project_id: form.value.project_id || null,
        faktur_pajak_number: form.value.faktur_pajak_number,
        client_code: form.value.client_code,
        client_name: form.value.client_name,
        client_pic: form.value.client_pic,
        client_email: form.value.client_email,
        client_phone: form.value.client_phone,
        client_npwp: form.value.client_npwp,
        date: form.value.date,
        items: form.value.items,
        ppn_percentage: form.value.ppn_percentage,
        admin_fee: form.value.admin_fee,
        icann_fee: form.value.icann_fee,
        bank_name: form.value.bank_name,
        bank_account: form.value.bank_account,
        terms: form.value.terms,
        pph23_type: form.value.pph23_type,
        pph23_percent: form.value.pph23_percent,
      };
      await store.updateInvoice(editingId.value, payload);
      router.push({ name: "admin.invoices.dashboard" });
      return;
    }

    const payload = { ...form.value };
    if (payload.numbering_mode === "manual") {
      delete payload.client_code;
    } else {
      delete payload.invoice_number;
    }
    await store.createInvoice(payload);
    router.push({ name: "admin.invoices.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : `Failed to ${isEditMode.value ? "update" : "create"} Invoice.`);
  } finally {
    submitting.value = false;
  }
};

// Presentation only.
const field =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus read-only:bg-ui-subtle read-only:text-ui-muted";
const lbl = "block text-ui-small font-medium text-ui-ink mb-1.5";
const hintCls = "text-ui-cap text-ui-muted mt-1.5";
const rp = (n) => `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`;
const projectOptions = computed(() => [{ value: "", label: "No project" }, ...projects.value.map((p) => ({ value: p.id, label: p.name }))]);
const bankOptions = computed(() => bankAccounts.value.map((a) => ({ value: a.bank_name, label: a.bank_name })));
const pphTypeOptions = computed(() => pphTypes.value.map((t) => ({ value: t.value, label: t.label })));
const onApplyPph23 = (value) => {
  applyPph23.value = value;
  toggleApplyPph23();
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="isEditMode ? 'Edit Invoice' : 'Create Invoice'">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.invoices.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1">
          <ArrowLeft class="w-4 h-4" />Invoice
        </router-link>
      </template>
      <template #subtitle>
        <span :class="isEditMode ? 'font-mono' : ''">{{ isEditMode ? existingInvoiceNumber : (form.numbering_mode === "manual" ? "Invoice number will be used exactly as entered" : "Invoice number will be generated automatically when saved") }}</span>
      </template>
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" :to="{ name: 'admin.invoices.dashboard' }">Cancel</UiButton>
          <UiButton type="submit" form="invoice-form" :icon="Check" :loading="submitting">
            {{ submitting ? "Saving..." : (isEditMode ? "Update Invoice" : "Save Invoice") }}
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <form id="invoice-form" @submit.prevent="handleSubmit" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
      <div class="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0 ui-stagger">
        <UiCard title="Project Link (Optional)">
          <UiSelect v-model="form.project_id" :options="projectOptions" label="Project" hint="Link this invoice to a project so it shows up on that project's page." />
        </UiCard>

        <UiCard title="Client Information">
          <div v-if="!isEditMode" class="mb-4">
            <p :class="lbl">Invoice Numbering</p>
            <div class="inline-flex p-0.5 rounded-ui-control bg-ui-subtle border border-ui-line" role="radiogroup">
              <label
                v-for="mode in [{ value: 'automatic', label: 'Automatic' }, { value: 'manual', label: 'Manual' }]"
                :key="mode.value"
                class="px-3 h-8 inline-flex items-center rounded-[6px] text-ui-small font-medium transition-colors"
                :class="form.numbering_mode === mode.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
              >
                <input type="radio" class="sr-only" :value="mode.value" v-model="form.numbering_mode" />
                {{ mode.label }}
              </label>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput
              v-if="isEditMode || form.numbering_mode === 'automatic'"
              v-model="form.client_code"
              label="Client Code"
              required
              placeholder="e.g. ZACO"
              class="[&_input]:uppercase"
              :hint="!isEditMode ? 'A short code only (no &quot;/&quot;) — combined with the date and sequence, e.g. INV/JCD-ZACO/1805/26.001' : ''"
            />
            <UiInput
              v-else
              v-model="form.invoice_number"
              label="Invoice Number"
              required
              placeholder="e.g. INV/JCD-FASTTRACK/1805/26.001"
              hint="Used exactly as entered — must be unique."
            />
            <UiInput v-model="form.date" type="date" label="Date" required />
            <UiInput v-model="form.client_name" label="Client Name" required />
            <UiInput v-model="form.client_pic" label="PIC" />
            <UiInput v-model="form.client_email" type="email" label="Email (optional)" />
            <UiInput v-model="form.client_phone" label="Phone" />
            <UiInput v-model="form.client_npwp" label="Client NPWP (optional)" placeholder="00.000.000.0-000.000" />
            <UiInput v-model="form.faktur_pajak_number" label="Faktur Pajak Number (optional)" placeholder="010.000-26.00000001" />
          </div>
        </UiCard>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
          <header class="flex items-center gap-3 px-5 sm:px-6 pt-[18px] pb-3.5">
            <h3 class="flex-1 text-ui-h2 text-ui-ink">Billing Items</h3>
            <span class="text-ui-cap text-ui-muted tabular-nums">{{ form.items.length }} {{ form.items.length === 1 ? "item" : "items" }}</span>
          </header>
          <div class="hidden md:grid grid-cols-[28px_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_32px] gap-3 px-5 sm:px-6 h-9 items-center border-y border-ui-line bg-ui-subtle/50 text-ui-cap font-medium text-ui-muted">
            <span>#</span>
            <span>Description <span class="text-ui-bad">*</span></span>
            <span>Qty</span>
            <span>Rate</span>
            <span class="text-right">Total (Rp) <span class="text-ui-bad">*</span></span>
            <span></span>
          </div>
          <ul class="divide-y divide-ui-line border-t border-ui-line md:border-t-0">
            <li
              v-for="(item, i) in form.items"
              :key="i"
              class="grid grid-cols-2 md:grid-cols-[28px_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_32px] gap-x-3 gap-y-2 px-5 sm:px-6 py-3 items-start"
            >
              <span class="hidden md:block pt-2.5 text-ui-cap text-ui-faint tabular-nums">{{ i + 1 }}</span>
              <div class="col-span-2 md:col-span-1 flex items-start gap-2">
                <span class="md:hidden pt-2.5 text-ui-cap text-ui-faint tabular-nums w-4">{{ i + 1 }}</span>
                <textarea
                  v-model="item.description"
                  placeholder="Description"
                  required
                  rows="1"
                  aria-label="Description"
                  class="w-full min-h-[38px] px-3 py-2 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
                ></textarea>
              </div>
              <input v-model="item.quantity" type="text" placeholder="Qty (e.g. 1 tahun)" aria-label="Qty" :class="field" />
              <input v-model="item.rate" type="text" placeholder="Rate" aria-label="Rate" :class="field" />
              <input v-model.number="item.total" type="number" min="0" placeholder="Total (Rp)" required aria-label="Total (Rp)" :class="[field, 'text-right tabular-nums']" />
              <div class="flex justify-end md:pt-1">
                <button
                  v-if="form.items.length > 1"
                  type="button"
                  @click="removeItem(i)"
                  class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-faint hover:text-ui-bad hover:bg-ui-bad-soft"
                  title="Remove item"
                  aria-label="Remove item"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </li>
          </ul>
          <div class="px-3 sm:px-4 py-2 border-t border-ui-line">
            <UiButton variant="ghost" size="sm" :icon="Plus" @click="addItem">Add Item</UiButton>
          </div>
        </section>

        <UiCard title="Payment & Tax">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label :class="lbl" for="inv-ppn">VAT (%)</label>
              <input id="inv-ppn" v-model.number="form.ppn_percentage" type="number" min="0" max="100" step="0.01" :class="[field, 'tabular-nums']" />
            </div>
            <div>
              <label :class="lbl" for="inv-admin">Admin Fee (Rp)</label>
              <input id="inv-admin" v-model.number="form.admin_fee" type="number" min="0" :class="[field, 'tabular-nums']" />
            </div>
            <div>
              <label :class="lbl" for="inv-icann">ICANN Fee (Rp) (optional)</label>
              <input id="inv-icann" v-model.number="form.icann_fee" type="number" min="0" placeholder="0" :class="[field, 'tabular-nums']" />
              <p :class="hintCls">Pass-through registrar fee, e.g. for a domain -- not part of VAT.</p>
            </div>
            <UiSelect
              v-model="form.bank_name"
              :options="bankOptions"
              label="Bank Name"
              placeholder="Select a bank"
              :hint="bankAccounts.length === 0 ? 'No bank accounts configured yet. Add one in Settings → Bank Accounts.' : ''"
              @change="handleBankNameChange"
            />
            <UiInput v-model="form.bank_account" label="Account Number" readonly mono />
            <UiInput v-model="form.terms" :rows="3" label="Terms & Conditions" class="md:col-span-2" />
            <div class="md:col-span-2 rounded-ui-control border border-ui-line p-3.5">
              <UiSwitch
                :model-value="applyPph23"
                label="Subject to PPh 23 withholding?"
                description="Informational only — adds a note to the PDF that the client is expected to withhold PPh 23 on payment. Does not change Total Amount Due; the actual withholding is recorded later on the Payment Receipt."
                @update:model-value="onApplyPph23"
              />
            </div>
            <template v-if="applyPph23">
              <UiSelect v-model="form.pph23_type" :options="pphTypeOptions" label="PPh 23 Type" @change="handlePph23TypeChange" />
              <div>
                <label :class="lbl" for="inv-pph">PPh 23 (%)</label>
                <input id="inv-pph" v-model.number="form.pph23_percent" type="number" min="0" max="100" step="0.1" :class="[field, 'tabular-nums']" />
                <p :class="hintCls">Estimated withholding: <span class="tabular-nums">Rp {{ pph23EstimatedAmount.toLocaleString("id-ID") }}</span></p>
              </div>
            </template>
          </div>
        </UiCard>
      </div>

      <aside class="lg:sticky lg:top-4 space-y-4 min-w-0">
        <UiCard title="Summary">
          <dl class="text-ui-small space-y-2.5">
            <div class="flex justify-between gap-3"><dt class="text-ui-muted">Subtotal</dt><dd class="text-ui-ink tabular-nums">{{ rp(subtotal) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ui-muted">VAT ({{ form.ppn_percentage || 0 }}%)</dt><dd class="text-ui-ink tabular-nums">{{ rp(ppnAmount) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ui-muted">Admin Fee</dt><dd class="text-ui-ink tabular-nums">{{ rp(form.admin_fee) }}</dd></div>
            <div v-if="Number(form.icann_fee) > 0" class="flex justify-between gap-3"><dt class="text-ui-muted">ICANN Fee</dt><dd class="text-ui-ink tabular-nums">{{ rp(form.icann_fee) }}</dd></div>
            <div class="flex items-baseline justify-between gap-3 pt-3 mt-1 border-t border-ui-line">
              <dt class="text-ui-body font-medium text-ui-ink">Total</dt>
              <dd class="text-ui-h2 text-ui-ink tabular-nums">{{ rp(total) }}</dd>
            </div>
            <p v-if="applyPph23" class="text-ui-cap text-ui-muted">PPh 23 note on PDF · est. withholding <span class="tabular-nums">Rp {{ pph23EstimatedAmount.toLocaleString("id-ID") }}</span></p>
          </dl>
          <UiAlert v-if="errorMessage" tone="bad" :title="errorMessage" class="mt-4" />
          <div class="mt-5 grid gap-2">
            <UiButton type="submit" size="lg" block :icon="Check" :loading="submitting">
              {{ submitting ? "Saving..." : (isEditMode ? "Update Invoice" : "Save Invoice") }}
            </UiButton>
            <UiButton variant="secondary" block :to="{ name: 'admin.invoices.dashboard' }">Cancel</UiButton>
          </div>
        </UiCard>
      </aside>
    </form>
  </div>
</template>
