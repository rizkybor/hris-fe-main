<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { Plus, Trash2, ArrowLeft, Check } from "lucide-vue-next";
import { UiAlert, UiButton, UiCard, UiInput, UiPageHeader, UiSelect } from "@/components/ui";
import { usePurchaseOrderStore } from "@/stores/purchaseOrder";
import SignatureToggle from "@/components/common/SignatureToggle.vue";

const { t } = useI18n();
const store = usePurchaseOrderStore();
const router = useRouter();
const route = useRoute();

const editingId = computed(() => route.params.id || null);
const isEditMode = computed(() => !!editingId.value);
const existingPoNumber = ref("");

const form = ref({
  type: "E",
  date: new Date().toISOString().slice(0, 10),
  title: "",
  client_name: "",
  client_address: "",
  client_phone: "",
  client_wa: "",
  items: [{ description: "", specification: "", qty: "1 Unit", price: 0 }],
  payment_terms: [{ termin: "DP (50%)", amount: 0, description: "" }],
  warranty_months: 12,
  replacement_days: 7,
  buyer_signatory_name: "",
  buyer_signatory_title: "",
  client_signatory_name: "",
  client_signatory_title: "",
  use_signature: false,
});

const submitting = ref(false);
const errorMessage = ref("");

const addItem = () => form.value.items.push({ description: "", specification: "", qty: "1 Unit", price: 0 });
const removeItem = (i) => form.value.items.splice(i, 1);

const addTerm = () => form.value.payment_terms.push({ termin: "", amount: 0, description: "" });
const removeTerm = (i) => form.value.payment_terms.splice(i, 1);

const totalPreview = () => form.value.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

onMounted(async () => {
  if (!isEditMode.value) return;

  try {
    const order = await store.fetchOrder(editingId.value);
    existingPoNumber.value = order.po_number;
    form.value.type = order.type;
    form.value.date = order.date;
    form.value.title = order.title;
    form.value.client_name = order.client_name;
    form.value.client_address = order.client_address || "";
    form.value.client_phone = order.client_phone || "";
    form.value.client_wa = order.client_wa || "";
    form.value.items = order.items?.length ? order.items : form.value.items;
    form.value.payment_terms = order.payment_terms?.length ? order.payment_terms : form.value.payment_terms;
    form.value.warranty_months = order.warranty_months ?? 12;
    form.value.replacement_days = order.replacement_days ?? 7;
    form.value.buyer_signatory_name = order.buyer_signatory_name || "";
    form.value.buyer_signatory_title = order.buyer_signatory_title || "";
    form.value.client_signatory_name = order.client_signatory_name || "";
    form.value.client_signatory_title = order.client_signatory_title || "";
    form.value.use_signature = !!order.use_signature;
  } catch (error) {
    errorMessage.value = t("documents.purchaseOrder.form.errors.load");
  }
});

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    if (isEditMode.value) {
      await store.updateOrder(editingId.value, form.value);
    } else {
      await store.createOrder(form.value);
    }
    router.push({ name: "admin.purchase-orders.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t(isEditMode.value ? "documents.purchaseOrder.form.errors.update" : "documents.purchaseOrder.form.errors.create"));
  } finally {
    submitting.value = false;
  }
};

// Presentation only.
const field =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const lbl = "block text-ui-small font-medium text-ui-ink mb-1.5";
const miniLbl = "block text-ui-cap text-ui-muted mb-1";
const rp = (n) => `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`;
const typeOptions = computed(() => [
  { value: "E", label: t("documents.purchaseOrder.types.E") },
  { value: "I", label: t("documents.purchaseOrder.types.I") },
]);
const termsTotal = computed(() => form.value.payment_terms.reduce((sum, t) => sum + (Number(t.amount) || 0), 0));
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="isEditMode ? $t('documents.purchaseOrder.form.editTitle') : $t('documents.purchaseOrder.form.createTitle')">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.purchase-orders.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1">
          <ArrowLeft class="w-4 h-4" />{{ $t("documents.purchaseOrder.list.title") }}
        </router-link>
      </template>
      <template #subtitle>
        <span :class="isEditMode ? 'font-mono' : ''">{{ isEditMode ? existingPoNumber : $t("documents.purchaseOrder.form.autoNumber") }}</span>
      </template>
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" :to="{ name: 'admin.purchase-orders.dashboard' }">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="po-form" :icon="Check" :loading="submitting">
            {{ submitting ? $t("common.actions.saving") : (isEditMode ? $t("documents.purchaseOrder.form.update") : $t("documents.purchaseOrder.form.save")) }}
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <form id="po-form" @submit.prevent="handleSubmit" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
      <div class="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0 ui-stagger">
        <UiCard :title="$t('documents.shared.generalInfo')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiSelect v-model="form.type" :options="typeOptions" :label="$t('common.labels.type')" required />
            <UiInput v-model="form.date" type="date" :label="$t('common.labels.date')" required />
            <UiInput v-model="form.title" :label="$t('documents.purchaseOrder.fields.titleSubject')" required :placeholder="$t('documents.purchaseOrder.form.titlePlaceholder')" class="md:col-span-2" />
            <UiInput v-model="form.client_name" :label="$t('documents.shared.clientName')" required class="md:col-span-2" />
            <UiInput v-model="form.client_address" :rows="2" :label="$t('common.labels.address')" class="md:col-span-2" />
            <UiInput v-model="form.client_phone" :label="$t('common.labels.phone')" />
            <UiInput v-model="form.client_wa" label="WhatsApp" />
          </div>
        </UiCard>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
          <header class="flex items-center gap-3 px-5 sm:px-6 pt-[18px] pb-3.5">
            <h3 class="flex-1 text-ui-h2 text-ui-ink">{{ $t("documents.purchaseOrder.form.itemsTitle") }}</h3>
            <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("documents.shared.itemCount", { n: form.items.length }, form.items.length) }}</span>
          </header>
          <ul class="divide-y divide-ui-line border-t border-ui-line">
            <li v-for="(item, i) in form.items" :key="i" class="flex items-start gap-3 px-5 sm:px-6 py-4">
              <span class="pt-7 text-ui-cap text-ui-faint tabular-nums w-5 shrink-0">{{ i + 1 }}</span>
              <div class="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
                <div class="col-span-2 md:col-span-1">
                  <label :class="miniLbl" :for="`po-desc-${i}`">{{ $t("common.labels.description") }} <span class="text-ui-bad">*</span></label>
                  <input :id="`po-desc-${i}`" v-model="item.description" type="text" required :class="field" />
                </div>
                <div>
                  <label :class="miniLbl" :for="`po-qty-${i}`">{{ $t("documents.shared.quantity") }} <span class="text-ui-bad">*</span></label>
                  <input :id="`po-qty-${i}`" v-model="item.qty" type="text" required :class="field" />
                </div>
                <div>
                  <label :class="miniLbl" :for="`po-price-${i}`">{{ $t("documents.shared.priceRp") }} <span class="text-ui-bad">*</span></label>
                  <input :id="`po-price-${i}`" v-model.number="item.price" type="number" min="0" required :class="[field, 'text-right tabular-nums']" />
                </div>
                <div class="col-span-2 md:col-span-3">
                  <label :class="miniLbl" :for="`po-spec-${i}`">{{ $t("documents.purchaseOrder.form.specification") }}</label>
                  <textarea
                    :id="`po-spec-${i}`"
                    v-model="item.specification"
                    rows="3"
                    class="w-full px-3 py-2 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
                  ></textarea>
                </div>
              </div>
              <div class="w-8 shrink-0 pt-6">
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
          <div class="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 border-t border-ui-line">
            <UiButton variant="ghost" size="sm" :icon="Plus" @click="addItem">{{ $t("documents.shared.addItem") }}</UiButton>
            <p class="pr-2 text-ui-small text-ui-muted">{{ $t("common.labels.total") }}: <span class="text-ui-ink font-medium tabular-nums">{{ rp(totalPreview()) }}</span></p>
          </div>
        </section>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
          <header class="flex items-center gap-3 px-5 sm:px-6 pt-[18px] pb-3.5">
            <h3 class="flex-1 text-ui-h2 text-ui-ink">{{ $t("documents.purchaseOrder.form.paymentSchema") }}</h3>
          </header>
          <div v-if="form.payment_terms.length" class="hidden md:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)_32px] gap-3 px-5 sm:px-6 h-9 items-center border-y border-ui-line bg-ui-subtle/50 text-ui-cap font-medium text-ui-muted">
            <span>{{ $t("documents.purchaseOrder.form.term") }}</span>
            <span class="text-right">{{ $t("documents.shared.amountRp") }}</span>
            <span>{{ $t("common.labels.description") }}</span>
            <span></span>
          </div>
          <ul class="divide-y divide-ui-line border-t border-ui-line md:border-t-0">
            <li
              v-for="(term, i) in form.payment_terms"
              :key="i"
              class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)_32px] gap-x-3 gap-y-2 px-5 sm:px-6 py-3 items-center"
            >
              <input v-model="term.termin" type="text" :placeholder="$t('documents.purchaseOrder.form.termPlaceholder')" :aria-label="$t('documents.purchaseOrder.form.term')" :class="field" />
              <input v-model.number="term.amount" type="number" min="0" :placeholder="$t('documents.shared.amountRp')" :aria-label="$t('documents.shared.amountRp')" :class="[field, 'text-right tabular-nums']" />
              <input v-model="term.description" type="text" :placeholder="$t('common.labels.description')" :aria-label="$t('common.labels.description')" :class="[field, 'col-span-2 md:col-span-1 row-start-2 md:row-start-auto']" />
              <button
                type="button"
                @click="removeTerm(i)"
                class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-faint hover:text-ui-bad hover:bg-ui-bad-soft col-start-3 row-start-1 md:col-start-auto md:row-start-auto"
                :title="$t('documents.purchaseOrder.form.removeTerm')"
                :aria-label="$t('documents.purchaseOrder.form.removeTerm')"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </li>
          </ul>
          <div class="px-3 sm:px-4 py-2 border-t border-ui-line">
            <UiButton variant="ghost" size="sm" :icon="Plus" @click="addTerm">{{ $t("documents.purchaseOrder.form.addTerm") }}</UiButton>
          </div>
        </section>

        <UiCard :title="$t('documents.purchaseOrder.form.termsSignatures')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label :class="lbl" for="po-warranty">{{ $t("documents.purchaseOrder.form.warranty") }}</label>
              <input id="po-warranty" v-model.number="form.warranty_months" type="number" min="0" :class="[field, 'tabular-nums']" />
            </div>
            <div>
              <label :class="lbl" for="po-replace">{{ $t("documents.purchaseOrder.form.replacement") }}</label>
              <input id="po-replace" v-model.number="form.replacement_days" type="number" min="0" :class="[field, 'tabular-nums']" />
            </div>
            <UiInput v-model="form.buyer_signatory_name" :label="$t('documents.purchaseOrder.form.buyerSignatory')" />
            <UiInput v-model="form.buyer_signatory_title" :label="$t('documents.shared.position')" />
            <UiInput v-model="form.client_signatory_name" :label="$t('documents.purchaseOrder.form.clientSignatory')" />
            <UiInput v-model="form.client_signatory_title" :label="$t('documents.shared.position')" />
            <SignatureToggle v-model="form.use_signature" class="md:col-span-2" :hint="$t('documents.purchaseOrder.form.signatureHint')" />
          </div>
        </UiCard>
      </div>

      <aside class="lg:sticky lg:top-4 space-y-4 min-w-0">
        <UiCard :title="$t('documents.shared.summary')">
          <dl class="text-ui-small space-y-2.5">
            <div class="flex justify-between gap-3"><dt class="text-ui-muted">{{ $t("common.labels.type") }}</dt><dd class="text-ui-ink">{{ form.type === "I" ? $t("documents.purchaseOrder.types.I") : $t("documents.purchaseOrder.types.E") }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ui-muted">{{ $t("documents.shared.items") }}</dt><dd class="text-ui-ink tabular-nums">{{ form.items.length }}</dd></div>
            <div v-if="form.payment_terms.length" class="flex justify-between gap-3"><dt class="text-ui-muted">{{ $t("documents.purchaseOrder.form.paymentTermsCount", { n: form.payment_terms.length }) }}</dt><dd class="text-ui-ink tabular-nums">{{ rp(termsTotal) }}</dd></div>
            <div class="flex items-baseline justify-between gap-3 pt-3 mt-1 border-t border-ui-line">
              <dt class="text-ui-body font-medium text-ui-ink">{{ $t("common.labels.total") }}</dt>
              <dd class="text-ui-h2 text-ui-ink tabular-nums">{{ rp(totalPreview()) }}</dd>
            </div>
          </dl>
          <UiAlert v-if="errorMessage" tone="bad" :title="errorMessage" class="mt-4" />
          <div class="mt-5 grid gap-2">
            <UiButton type="submit" size="lg" block :icon="Check" :loading="submitting">
              {{ submitting ? $t("common.actions.saving") : (isEditMode ? $t("documents.purchaseOrder.form.update") : $t("documents.purchaseOrder.form.save")) }}
            </UiButton>
            <UiButton variant="secondary" block :to="{ name: 'admin.purchase-orders.dashboard' }">{{ $t("common.actions.cancel") }}</UiButton>
          </div>
        </UiCard>
      </aside>
    </form>
  </div>
</template>
