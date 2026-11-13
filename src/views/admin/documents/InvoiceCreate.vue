<script setup>
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { Plus, Trash2, ArrowLeft, Check } from "lucide-vue-next";
import { UiAlert, UiButton, UiCard, UiInput, UiPageHeader, UiSelect, UiSwitch } from "@/components/ui";
import { useInvoiceStore } from "@/stores/invoice";
import { useLookupStore } from "@/stores/lookups";
import { useUnsavedGuard } from "@/composables/useUnsavedGuard";

const { t } = useI18n();
const store = useInvoiceStore();
const router = useRouter();
const route = useRoute();
// Pickers come from the shared lookup cache (no request when fresh) --
// never from projectStore.projects, which is the Projects page's list.
const lookups = useLookupStore();
const bankAccounts = computed(() => lookups.bankAccounts);
const projects = computed(() => lookups.projects);
const pphTypes = computed(() => lookups.pphTypes);

const editingId = computed(() => route.params.id || null);
const isEditMode = computed(() => !!editingId.value);
const existingInvoiceNumber = ref("");

const fillForm = (invoice) => {
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
  if (invoice.pph23_type) applyPph23.value = true;
};

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

// Everything the page needs in one wave: the pickers and, when editing,
// the invoice itself.
const loadingRecord = ref(isEditMode.value);
lookups.ensureAll(["bankAccounts", "projects", "pphTypes"]).catch(() => {});
if (isEditMode.value) {
  store
    .fetchInvoice(editingId.value)
    .then(fillForm)
    .catch(() => (errorMessage.value = t("documents.invoice.form.errors.load")))
    .finally(() => {
      loadingRecord.value = false;
      markSaved();
    });
}

// Leaving with unsaved edits asks first.
const snapshot = () => JSON.stringify([form.value, applyPph23.value]);
const savedState = ref(snapshot());
const markSaved = () => (savedState.value = snapshot());
useUnsavedGuard(() => !loadingRecord.value && snapshot() !== savedState.value);

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
      const updated = await store.updateInvoice(editingId.value, payload);
      // The list shows the saved row without reloading (the response has
      // no relations, so the project name comes from the picker).
      const project = projects.value.find((p) => String(p.id) === String(payload.project_id));
      store.patchRow(editingId.value, { ...updated, project: project ? { id: project.id, name: project.name } : null });
      markSaved();
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
    markSaved();
    router.push({ name: "admin.invoices.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t(isEditMode.value ? "documents.invoice.form.errors.update" : "documents.invoice.form.errors.create"));
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
const projectOptions = computed(() => [{ value: "", label: t("documents.invoice.form.noProject") }, ...projects.value.map((p) => ({ value: p.id, label: p.name }))]);
const bankOptions = computed(() => bankAccounts.value.map((a) => ({ value: a.bank_name, label: a.bank_name })));
const pphTypeOptions = computed(() => pphTypes.value.map((t) => ({ value: t.value, label: t.label })));
const onApplyPph23 = (value) => {
  applyPph23.value = value;
  toggleApplyPph23();
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="isEditMode ? $t('documents.invoice.form.editTitle') : $t('documents.invoice.list.create')">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.invoices.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1">
          <ArrowLeft class="w-4 h-4" />{{ $t("documents.invoice.list.title") }}
        </router-link>
      </template>
      <template #subtitle>
        <span :class="isEditMode ? 'font-mono' : ''">{{ isEditMode ? existingInvoiceNumber : (form.numbering_mode === "manual" ? $t("documents.invoice.form.manualNumber") : $t("documents.invoice.form.autoNumber")) }}</span>
      </template>
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" :to="{ name: 'admin.invoices.dashboard' }">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="invoice-form" :icon="Check" :loading="submitting" :disabled="loadingRecord">
            {{ submitting ? $t("common.actions.saving") : (isEditMode ? $t("documents.invoice.form.update") : $t("documents.invoice.form.save")) }}
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <form id="invoice-form" @submit.prevent="handleSubmit" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
      <div class="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0 ui-stagger">
        <UiCard :title="$t('documents.invoice.form.projectLink')">
          <UiSelect v-model="form.project_id" :options="projectOptions" :label="$t('common.labels.project')" :hint="$t('documents.invoice.form.projectHint')" />
        </UiCard>

        <UiCard :title="$t('documents.shared.clientInfo')">
          <div v-if="!isEditMode" class="mb-4">
            <p :class="lbl">{{ $t("documents.invoice.form.numbering") }}</p>
            <div class="inline-flex p-0.5 rounded-ui-control bg-ui-subtle border border-ui-line" role="radiogroup">
              <label
                v-for="mode in [{ value: 'automatic', label: $t('documents.shared.numberingAuto') }, { value: 'manual', label: $t('documents.shared.numberingManual') }]"
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
              :label="$t('documents.invoice.form.clientCode')"
              required
              :placeholder="$t('documents.invoice.form.clientCodePlaceholder')"
              class="[&_input]:uppercase"
              :hint="!isEditMode ? $t('documents.invoice.form.clientCodeHint') : ''"
            />
            <UiInput
              v-else
              v-model="form.invoice_number"
              :label="$t('documents.invoice.form.invoiceNumber')"
              required
              :placeholder="$t('documents.invoice.form.invoiceNumberPlaceholder')"
              :hint="$t('documents.shared.manualNumberHint')"
            />
            <UiInput v-model="form.date" type="date" :label="$t('common.labels.date')" required />
            <UiInput v-model="form.client_name" :label="$t('documents.shared.clientName')" required />
            <UiInput v-model="form.client_pic" label="PIC" />
            <UiInput v-model="form.client_email" type="email" :label="$t('documents.invoice.form.emailOptional')" />
            <UiInput v-model="form.client_phone" :label="$t('common.labels.phone')" />
            <UiInput v-model="form.client_npwp" :label="$t('documents.invoice.form.npwp')" placeholder="00.000.000.0-000.000" />
            <UiInput v-model="form.faktur_pajak_number" :label="$t('documents.invoice.form.fakturPajak')" placeholder="010.000-26.00000001" />
          </div>
        </UiCard>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
          <header class="flex items-center gap-3 px-5 sm:px-6 pt-[18px] pb-3.5">
            <h3 class="flex-1 text-ui-h2 text-ui-ink">{{ $t("documents.invoice.form.itemsTitle") }}</h3>
            <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("documents.shared.itemCount", { n: form.items.length }, form.items.length) }}</span>
          </header>
          <div class="hidden md:grid grid-cols-[28px_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_32px] gap-3 px-5 sm:px-6 h-9 items-center border-y border-ui-line bg-ui-subtle/50 text-ui-cap font-medium text-ui-muted">
            <span>#</span>
            <span>{{ $t("common.labels.description") }} <span class="text-ui-bad">*</span></span>
            <span>{{ $t("documents.shared.qty") }}</span>
            <span>{{ $t("documents.shared.rate") }}</span>
            <span class="text-right">{{ $t("documents.shared.totalRp") }} <span class="text-ui-bad">*</span></span>
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
                  :placeholder="$t('common.labels.description')"
                  required
                  rows="1"
                  :aria-label="$t('common.labels.description')"
                  class="w-full min-h-[38px] px-3 py-2 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
                ></textarea>
              </div>
              <input v-model="item.quantity" type="text" :placeholder="$t('documents.invoice.form.qtyPlaceholder')" :aria-label="$t('documents.shared.qty')" :class="field" />
              <input v-model="item.rate" type="text" :placeholder="$t('documents.shared.rate')" :aria-label="$t('documents.shared.rate')" :class="field" />
              <input v-model.number="item.total" type="number" min="0" :placeholder="$t('documents.shared.totalRp')" required :aria-label="$t('documents.shared.totalRp')" :class="[field, 'text-right tabular-nums']" />
              <div class="flex justify-end md:pt-1">
                <button
                  v-if="form.items.length > 1"
                  type="button"
                  @click="removeItem(i)"
                  class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-faint hover:text-ui-bad hover:bg-ui-bad-soft"
                  :title="$t('documents.shared.removeLine')"
                  :aria-label="$t('documents.shared.removeLine')"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </li>
          </ul>
          <div class="px-3 sm:px-4 py-2 border-t border-ui-line">
            <UiButton variant="ghost" size="sm" :icon="Plus" @click="addItem">{{ $t("documents.shared.addItem") }}</UiButton>
          </div>
        </section>

        <UiCard :title="$t('documents.invoice.form.paymentTax')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label :class="lbl" for="inv-ppn">{{ $t("documents.invoice.form.vatPercent") }}</label>
              <input id="inv-ppn" v-model.number="form.ppn_percentage" type="number" min="0" max="100" step="0.01" :class="[field, 'tabular-nums']" />
            </div>
            <div>
              <label :class="lbl" for="inv-admin">{{ $t("documents.invoice.form.adminFeeRp") }}</label>
              <input id="inv-admin" v-model.number="form.admin_fee" type="number" min="0" :class="[field, 'tabular-nums']" />
            </div>
            <div>
              <label :class="lbl" for="inv-icann">{{ $t("documents.invoice.form.icannFeeRp") }}</label>
              <input id="inv-icann" v-model.number="form.icann_fee" type="number" min="0" placeholder="0" :class="[field, 'tabular-nums']" />
              <p :class="hintCls">{{ $t("documents.invoice.form.icannHint") }}</p>
            </div>
            <UiSelect
              v-model="form.bank_name"
              :options="bankOptions"
              :label="$t('documents.shared.bankName')"
              :placeholder="$t('documents.shared.selectBank')"
              :hint="bankAccounts.length === 0 ? $t('documents.shared.noBankAccounts') : ''"
              @change="handleBankNameChange"
            />
            <UiInput v-model="form.bank_account" :label="$t('documents.shared.accountNumber')" readonly mono />
            <UiInput v-model="form.terms" :rows="3" :label="$t('documents.invoice.form.terms')" class="md:col-span-2" />
            <div class="md:col-span-2 rounded-ui-control border border-ui-line p-3.5">
              <UiSwitch
                :model-value="applyPph23"
                :label="$t('documents.invoice.form.pph23Switch')"
                :description="$t('documents.invoice.form.pph23Description')"
                @update:model-value="onApplyPph23"
              />
            </div>
            <template v-if="applyPph23">
              <UiSelect v-model="form.pph23_type" :options="pphTypeOptions" :label="$t('documents.shared.pph23Type')" @change="handlePph23TypeChange" />
              <div>
                <label :class="lbl" for="inv-pph">PPh 23 (%)</label>
                <input id="inv-pph" v-model.number="form.pph23_percent" type="number" min="0" max="100" step="0.1" :class="[field, 'tabular-nums']" />
                <p :class="hintCls">{{ $t("documents.invoice.form.estimatedWithholding") }} <span class="tabular-nums">Rp {{ pph23EstimatedAmount.toLocaleString("id-ID") }}</span></p>
              </div>
            </template>
          </div>
        </UiCard>
      </div>

      <aside class="lg:sticky lg:top-4 space-y-4 min-w-0">
        <UiCard :title="$t('documents.shared.summary')">
          <dl class="text-ui-small space-y-2.5">
            <div class="flex justify-between gap-3"><dt class="text-ui-muted">Subtotal</dt><dd class="text-ui-ink tabular-nums">{{ rp(subtotal) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ui-muted">{{ $t("documents.invoice.form.vatLine", { pct: form.ppn_percentage || 0 }) }}</dt><dd class="text-ui-ink tabular-nums">{{ rp(ppnAmount) }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ui-muted">{{ $t("documents.invoice.form.adminFee") }}</dt><dd class="text-ui-ink tabular-nums">{{ rp(form.admin_fee) }}</dd></div>
            <div v-if="Number(form.icann_fee) > 0" class="flex justify-between gap-3"><dt class="text-ui-muted">{{ $t("documents.invoice.form.icannFee") }}</dt><dd class="text-ui-ink tabular-nums">{{ rp(form.icann_fee) }}</dd></div>
            <div class="flex items-baseline justify-between gap-3 pt-3 mt-1 border-t border-ui-line">
              <dt class="text-ui-body font-medium text-ui-ink">{{ $t("common.labels.total") }}</dt>
              <dd class="text-ui-h2 text-ui-ink tabular-nums">{{ rp(total) }}</dd>
            </div>
            <p v-if="applyPph23" class="text-ui-cap text-ui-muted">{{ $t("documents.invoice.form.pph23Note") }} <span class="tabular-nums">Rp {{ pph23EstimatedAmount.toLocaleString("id-ID") }}</span></p>
          </dl>
          <UiAlert v-if="errorMessage" tone="bad" :title="errorMessage" class="mt-4" />
          <div class="mt-5 grid gap-2">
            <UiButton type="submit" size="lg" block :icon="Check" :loading="submitting" :disabled="loadingRecord">
              {{ submitting ? $t("common.actions.saving") : (isEditMode ? $t("documents.invoice.form.update") : $t("documents.invoice.form.save")) }}
            </UiButton>
            <UiButton variant="secondary" block :to="{ name: 'admin.invoices.dashboard' }">{{ $t("common.actions.cancel") }}</UiButton>
          </div>
        </UiCard>
      </aside>
    </form>
  </div>
</template>
