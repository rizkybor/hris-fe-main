<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { ArrowLeft, Check } from "lucide-vue-next";
import { UiAlert, UiButton, UiCard, UiInput, UiPageHeader, UiSelect, UiSwitch } from "@/components/ui";
import { usePaymentReceiptStore } from "@/stores/paymentReceipt";
import SignatureToggle from "@/components/common/SignatureToggle.vue";
import { SIGNATORIES } from "@/utils/signatories";
import { bareName } from "@/utils/personName";
import { useInvoiceStore } from "@/stores/invoice";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";

const { t } = useI18n();
const store = usePaymentReceiptStore();
const invoiceStore = useInvoiceStore();
const { invoices } = storeToRefs(invoiceStore);
const calculatorStore = useProjectCalculatorStore();
const { pphTypes } = storeToRefs(calculatorStore);
const router = useRouter();
const route = useRoute();

const editingId = computed(() => route.params.id || null);
const isEditMode = computed(() => !!editingId.value);
const existingReceiptNumber = ref("");

const form = ref({
  numbering_mode: "automatic",
  client_code: "",
  receipt_number: "",
  date: new Date().toISOString().slice(0, 10),
  amount: 0,
  pph23_type: null,
  pph23_percent: null,
  pph23_amount: null,
  received_from: "",
  for_payment_of: "",
  invoice_id: "",
  payment_status: "paid",
  recipient_name: "",
  use_signature: false,
});

// The amount before any PPh 23 withholding -- `form.amount` (what the DB
// stores) always means "amount actually received", so when PPh 23 applies
// this is the base the withholding is computed from, kept separately so
// toggling PPh 23 on/off doesn't lose the original figure.
const grossAmount = ref(0);
const applyPph23 = ref(false);

const submitting = ref(false);
const errorMessage = ref("");

onMounted(async () => {
  await Promise.all([
    invoiceStore.fetchInvoices({ row_per_page: 100 }),
    calculatorStore.fetchPphTypes(),
  ]);

  if (isEditMode.value) {
    try {
      const receipt = await store.fetchReceipt(editingId.value);
      existingReceiptNumber.value = receipt.receipt_number;
      form.value.client_code = receipt.client_code || "";
      form.value.date = receipt.date;
      form.value.amount = receipt.amount;
      form.value.pph23_type = receipt.pph23_type;
      form.value.pph23_percent = receipt.pph23_percent;
      form.value.pph23_amount = receipt.pph23_amount;
      form.value.received_from = receipt.received_from || "";
      form.value.for_payment_of = receipt.for_payment_of || "";
      form.value.invoice_id = receipt.invoice_id || "";
      form.value.payment_status = receipt.payment_status || "paid";
      form.value.recipient_name = receipt.recipient_name || "";
      form.value.use_signature = !!receipt.use_signature;

      if (receipt.pph23_amount) {
        applyPph23.value = true;
        grossAmount.value = Number(receipt.amount) + Number(receipt.pph23_amount);
      } else {
        grossAmount.value = Number(receipt.amount);
      }
    } catch (error) {
      errorMessage.value = t("documents.receipt.form.errors.load");
    }
  }
});

const recomputePph23 = () => {
  if (!applyPph23.value) {
    form.value.pph23_type = null;
    form.value.pph23_percent = null;
    form.value.pph23_amount = null;
    form.value.amount = grossAmount.value;
    return;
  }
  const percent = Number(form.value.pph23_percent) || 0;
  const pphAmount = Math.round((grossAmount.value * percent) / 100);
  form.value.pph23_amount = pphAmount;
  form.value.amount = grossAmount.value - pphAmount;
};

const toggleApplyPph23 = () => {
  if (applyPph23.value && !form.value.pph23_type) {
    form.value.pph23_type = "pph23_npwp";
    form.value.pph23_percent = 2;
  }
  recomputePph23();
};

const handlePph23TypeChange = () => {
  const type = pphTypes.value.find((t) => t.value === form.value.pph23_type);
  if (type?.default_rate != null) {
    form.value.pph23_percent = type.default_rate;
  }
  recomputePph23();
};

// Cancelled invoices can't be paid against, so they're left out -- except
// the one an existing receipt is already linked to, so editing it doesn't
// silently blank the select.
const invoiceOptions = computed(() =>
  invoices.value.filter((i) => i.status !== "cancelled" || i.id === Number(form.value.invoice_id))
);

// Older receipts may carry a free-typed name from before this was a
// dropdown -- keep it selectable so editing doesn't drop it.
// A saved name with degrees ("Aldi PP, S.Ikom") stands in for its plain
// entry instead of showing twice.
const signatoryOptions = computed(() => {
  const current = form.value.recipient_name;
  if (!current || SIGNATORIES.includes(current)) return SIGNATORIES;
  return [current, ...SIGNATORIES.filter((n) => bareName(n).toLowerCase() !== bareName(current).toLowerCase())];
});

// The printed receipt adds "berdasarkan Invoice No. ..." for a linked
// invoice by itself, so the suggestion only describes what's being paid
// (from the invoice items) -- and never overwrites text the user typed.
const lastSuggestion = ref("");
const suggestForPayment = (invoice) => {
  const items = (invoice.items || []).map((i) => i.description).filter(Boolean);
  if (!items.length) return "Pembayaran";
  return `Pembayaran ${items.slice(0, 2).join(", ")}${items.length > 2 ? ", dll." : ""}`;
};

const handleInvoiceSelect = () => {
  const invoice = invoices.value.find((i) => i.id === Number(form.value.invoice_id));
  if (invoice) {
    form.value.client_code = invoice.client_code || "";
    grossAmount.value = Number(invoice.total);
    const current = form.value.for_payment_of.trim();
    if (!current || current === lastSuggestion.value) {
      lastSuggestion.value = suggestForPayment(invoice);
      form.value.for_payment_of = lastSuggestion.value;
    }
    recomputePph23();
  }
};

const selectedInvoiceNumber = computed(
  () => invoices.value.find((i) => i.id === Number(form.value.invoice_id))?.invoice_number || ""
);

// Same rule as PaymentReceipt::forPaymentLine() on the API, so the preview
// matches the PDF: a trailing invoice reference is dropped (the PDF adds its
// own); text naming the invoice mid-sentence is printed as written.
const escapeRegex = (v) => v.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const printedForPayment = computed(() => {
  const number = selectedInvoiceNumber.value;
  let text = form.value.for_payment_of.trim();
  if (!number) return { text, appendInvoice: false };
  const trailing = new RegExp(`[\\s,.;-]*(berdasarkan\\s+|sesuai\\s+|for\\s+)?(invoice|inv)\\.?\\s*(no\\.?|nomor|number|#)?\\s*:?\\s*${escapeRegex(number)}[\\s.]*$`, "i");
  text = text.replace(trailing, "").replace(/^[\s,.;-]+|[\s,.;-]+$/g, "");
  if (text.toLowerCase().includes(number.toLowerCase())) return { text, appendInvoice: false };
  return { text: text || "Pembayaran", appendInvoice: true };
});

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    if (isEditMode.value) {
      // Numbering mode / receipt_number aren't editable once issued -- only
      // the content fields PaymentReceiptUpdateRequest actually validates.
      const payload = {
        client_code: form.value.client_code,
        date: form.value.date,
        received_from: form.value.received_from,
        amount: form.value.amount,
        pph23_type: form.value.pph23_type,
        pph23_percent: form.value.pph23_percent,
        pph23_amount: form.value.pph23_amount,
        for_payment_of: form.value.for_payment_of,
        invoice_id: form.value.invoice_id || null,
        payment_status: form.value.payment_status,
        recipient_name: form.value.recipient_name,
        use_signature: form.value.use_signature,
      };
      await store.updateReceipt(editingId.value, payload);
      router.push({ name: "admin.payment-receipts.dashboard" });
      return;
    }

    const payload = { ...form.value, invoice_id: form.value.invoice_id || null };
    if (payload.numbering_mode === "manual") {
      delete payload.client_code;
    } else {
      delete payload.receipt_number;
    }
    await store.createReceipt(payload);
    router.push({ name: "admin.payment-receipts.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t(isEditMode.value ? "documents.receipt.form.errors.update" : "documents.receipt.form.errors.create"));
  } finally {
    submitting.value = false;
  }
};

// Presentation only.
const field =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus read-only:bg-ui-subtle read-only:text-ui-muted";
const lbl = "block text-ui-small font-medium text-ui-ink mb-1.5";
const rp = (n) => `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`;
const invoiceSelectOptions = computed(() => [
  { value: "", label: t("documents.receipt.form.noInvoice") },
  ...invoiceOptions.value.map((i) => ({ value: i.id, label: `${i.invoice_number} - ${i.client_name}` })),
]);
const paymentStatusOptions = computed(() => [
  { value: "paid", label: t("documents.shared.status.paid") },
  { value: "partial", label: t("documents.receipt.form.partial") },
]);
const pphTypeOptions = computed(() => pphTypes.value.map((t) => ({ value: t.value, label: t.label })));
const signatorySelectOptions = computed(() => [{ value: "", label: t("documents.shared.selectSignatory") }, ...signatoryOptions.value.map((n) => ({ value: n, label: n }))]);
const onApplyPph23 = (value) => {
  applyPph23.value = value;
  toggleApplyPph23();
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="isEditMode ? $t('documents.receipt.form.editTitle') : $t('documents.receipt.form.createTitle')">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.payment-receipts.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1">
          <ArrowLeft class="w-4 h-4" />{{ $t("documents.receipt.list.title") }}
        </router-link>
      </template>
      <template #subtitle>
        <span :class="isEditMode ? 'font-mono' : ''">{{ isEditMode ? existingReceiptNumber : (form.numbering_mode === "manual" ? $t("documents.receipt.form.manualNumber") : $t("documents.receipt.form.autoNumber")) }}</span>
      </template>
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" :to="{ name: 'admin.payment-receipts.dashboard' }">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="receipt-form" :icon="Check" :loading="submitting">
            {{ submitting ? $t("common.actions.saving") : (isEditMode ? $t("documents.receipt.form.update") : $t("documents.receipt.form.save")) }}
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <form id="receipt-form" @submit.prevent="handleSubmit" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
      <div class="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0 ui-stagger">
        <UiCard :title="$t('documents.receipt.form.paymentDetails')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiSelect
              v-model="form.invoice_id"
              :options="invoiceSelectOptions"
              :label="$t('documents.receipt.form.relatedInvoice')"
              class="md:col-span-2"
              @change="handleInvoiceSelect"
            />
            <template v-if="!isEditMode">
              <div class="md:col-span-2">
                <p :class="lbl">{{ $t("documents.receipt.form.numbering") }}</p>
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
              <UiInput
                v-if="form.numbering_mode === 'automatic'"
                v-model="form.client_code"
                :label="$t('documents.invoice.form.clientCode')"
                required
                :placeholder="$t('documents.invoice.form.clientCodePlaceholder')"
                class="[&_input]:uppercase"
                :hint="$t('documents.receipt.form.clientCodeHint')"
              />
              <UiInput
                v-else
                v-model="form.receipt_number"
                :label="$t('documents.receipt.form.receiptNumber')"
                required
                :placeholder="$t('documents.receipt.form.receiptNumberPlaceholder')"
                :hint="$t('documents.shared.manualNumberHint')"
              />
            </template>
            <UiInput v-else v-model="form.client_code" :label="$t('documents.invoice.form.clientCode')" required :placeholder="$t('documents.invoice.form.clientCodePlaceholder')" class="[&_input]:uppercase" />
            <UiInput v-model="form.date" type="date" :label="$t('common.labels.date')" required />
            <UiInput v-model="form.received_from" :label="$t('documents.receipt.fields.receivedFrom')" required :placeholder="$t('documents.receipt.form.receivedFromPlaceholder')" class="md:col-span-2" />
            <div>
              <label :class="lbl" for="rcp-amount">{{ applyPph23 ? $t("documents.receipt.form.grossAmountRp") : $t("documents.shared.amountRp") }}<span class="text-ui-bad"> *</span></label>
              <input id="rcp-amount" v-model.number="grossAmount" @input="recomputePph23" type="number" min="0" required :class="[field, 'text-right tabular-nums']" />
            </div>
            <UiSelect v-model="form.payment_status" :options="paymentStatusOptions" :label="$t('documents.receipt.form.paymentStatus')" required />
          </div>
        </UiCard>

        <UiCard title="PPh 23">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2 rounded-ui-control border border-ui-line p-3.5">
              <UiSwitch
                :model-value="applyPph23"
                :label="$t('documents.receipt.form.pph23Switch')"
                :description="$t('documents.receipt.form.pph23Description')"
                @update:model-value="onApplyPph23"
              />
            </div>
            <template v-if="applyPph23">
              <UiSelect v-model="form.pph23_type" :options="pphTypeOptions" :label="$t('documents.shared.pph23Type')" @change="handlePph23TypeChange" />
              <div>
                <label :class="lbl" for="rcp-pph">PPh 23 (%)</label>
                <input id="rcp-pph" v-model.number="form.pph23_percent" @input="recomputePph23" type="number" min="0" max="100" step="0.1" :class="[field, 'tabular-nums']" />
              </div>
              <div>
                <label :class="lbl" for="rcp-pph-amt">{{ $t("documents.receipt.form.pph23Amount") }}</label>
                <input id="rcp-pph-amt" :value="form.pph23_amount" type="text" readonly :class="[field, 'text-right tabular-nums']" />
              </div>
              <div>
                <label :class="lbl" for="rcp-net">{{ $t("documents.receipt.form.netAmount") }}</label>
                <input id="rcp-net" :value="form.amount" type="text" readonly :class="[field, 'text-right tabular-nums font-medium']" />
              </div>
            </template>
          </div>
        </UiCard>

        <UiCard :title="$t('documents.receipt.form.descriptionSignatory')">
          <div class="grid grid-cols-1 gap-4">
            <div>
              <UiInput v-model="form.for_payment_of" :rows="2" :label="$t('documents.receipt.form.forPaymentOf')" required />
              <p v-if="selectedInvoiceNumber" class="text-ui-cap text-ui-muted mt-1.5">
                {{ $t("documents.receipt.form.printedAs") }} <span class="text-ui-ink">{{ printedForPayment.text }}<template v-if="printedForPayment.appendInvoice"> berdasarkan Invoice No. <strong class="font-medium">{{ selectedInvoiceNumber }}</strong>.</template></span>
                {{ $t("documents.receipt.form.printedAsHint") }}
              </p>
            </div>
            <UiSelect v-model="form.recipient_name" :options="signatorySelectOptions" :label="$t('documents.receipt.form.recipientName')" />
            <SignatureToggle v-model="form.use_signature" :hint="$t('documents.receipt.form.signatureHint')" />
          </div>
        </UiCard>
      </div>

      <aside class="lg:sticky lg:top-4 space-y-4 min-w-0">
        <UiCard :title="$t('documents.shared.summary')">
          <dl class="text-ui-small space-y-2.5">
            <div v-if="selectedInvoiceNumber" class="flex justify-between gap-3"><dt class="text-ui-muted">{{ $t("documents.invoice.list.title") }}</dt><dd class="text-ui-ink font-mono text-ui-cap truncate">{{ selectedInvoiceNumber }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ui-muted">{{ applyPph23 ? $t("documents.receipt.form.grossAmount") : $t("common.labels.amount") }}</dt><dd class="text-ui-ink tabular-nums">{{ rp(grossAmount) }}</dd></div>
            <div v-if="applyPph23" class="flex justify-between gap-3"><dt class="text-ui-muted">PPh 23 ({{ form.pph23_percent || 0 }}%)</dt><dd class="text-ui-ink tabular-nums">− {{ rp(form.pph23_amount) }}</dd></div>
            <div class="flex items-baseline justify-between gap-3 pt-3 mt-1 border-t border-ui-line">
              <dt class="text-ui-body font-medium text-ui-ink">{{ applyPph23 ? $t("documents.receipt.form.netAmount") : $t("common.labels.total") }}</dt>
              <dd class="text-ui-h2 text-ui-ink tabular-nums">{{ rp(applyPph23 ? form.amount : grossAmount) }}</dd>
            </div>
          </dl>
          <UiAlert v-if="errorMessage" tone="bad" :title="errorMessage" class="mt-4" />
          <div class="mt-5 grid gap-2">
            <UiButton type="submit" size="lg" block :icon="Check" :loading="submitting">
              {{ submitting ? $t("common.actions.saving") : (isEditMode ? $t("documents.receipt.form.update") : $t("documents.receipt.form.save")) }}
            </UiButton>
            <UiButton variant="secondary" block :to="{ name: 'admin.payment-receipts.dashboard' }">{{ $t("common.actions.cancel") }}</UiButton>
          </div>
        </UiCard>
      </aside>
    </form>
  </div>
</template>
