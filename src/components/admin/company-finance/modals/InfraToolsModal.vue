<script setup>
import UsageStatusFields from "./UsageStatusFields.vue";
import { UiModal, UiInput, UiButton } from "@/components/ui";
import { useI18n } from "vue-i18n";
import { reactive, watch, computed } from "vue";

const props = defineProps({
  show: Boolean,
  loading: Boolean,
  mode: {
    type: String,
    default: "add",
  },
  data: {
    type: Object,
    default: () => ({}),
  },
});


const { t } = useI18n();
const emit = defineEmits(["submit", "close"]);

const form = reactive({
  tech_stack_component: "",
  vendor: "",
  monthly_fee: "",
  annual_fee: "",
  expired_date: "",
  status: "",
  notes: "",
});

const buildPayload = () => ({
  tech_stack_component: form.tech_stack_component,
  vendor: form.vendor,
  monthly_fee: Number(form.monthly_fee),
  annual_fee: Number(form.annual_fee),
  expired_date: form.expired_date || null,
  status: form.status,
  notes: form.notes,
});

// Error state
const errors = reactive({
  tech_stack_component: "",
  vendor: "",
  expired_date: "",
  status: "",
});

watch(
  () => [props.show, props.mode, props.data],
  ([show]) => {
    if (show && (props.mode === "view" || props.mode === "edit")) {
      Object.assign(form, {
        ...props.data,
        monthly_fee: props.data.monthly_fee ?? "",
        annual_fee: props.data.annual_fee ?? "",
        expired_date: props.data.expired_date ? String(props.data.expired_date).slice(0, 10) : "",
        status: props.data.status || "active",
      });
    }

    if (show && props.mode === "add") {
      Object.keys(form).forEach((key) => (form[key] = ""));
      form.status = "active";
    }
  },
  { immediate: true }
);

// ===== Rupiah formatting =====
const formatRupiah = (value) => {
  if (!value && value !== 0) return "";
  const number = Number(value.toString().replace(/\D/g, ""));
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};

const parseRupiah = (value) => {
  if (!value) return "";
  return Number(value.toString().replace(/[^0-9]/g, ""));
};

// Computed: budget & actual dengan read-only protection
const monthlyModel = computed({
  get: () => formatRupiah(form.monthly_fee),
  set: (val) => {
    if (props.mode !== "view") form.monthly_fee = parseRupiah(val);
  },
});

const annualModel = computed({
  get: () => formatRupiah(form.annual_fee),
  set: (val) => {
    if (props.mode !== "view") form.annual_fee = parseRupiah(val);
  },
});

// ===== Validation =====
const validate = () => {
  let valid = true;

  errors.tech_stack_component = form.tech_stack_component
    ? ""
    : t("finance.modals.validation.techStackRequired");
  errors.vendor = form.vendor !== "" ? "" : t("finance.modals.validation.vendorRequired");
  // Expired is required while the item is in use (mirrors the API rule).
  errors.status = form.status ? "" : t("finance.modals.validation.statusRequired");
  errors.expired_date =
    form.status === "active" && !form.expired_date ? t("finance.modals.validation.expiredRequired") : "";

  Object.values(errors).forEach((e) => {
    if (e) valid = false;
  });

  return valid;
};

const submit = () => {
  if (!validate()) return;

  emit("submit", {
    mode: props.mode,
    id: props.data?.id,
    payload: buildPayload(),
  });

  emit("close");
};
</script>

<template>
  <UiModal
    :open="show"
    :title="$t(`finance.modals.infra.title.${props.mode}`)"
    :description="$t(`finance.modals.infra.description.${props.mode}`)"
    size="lg"
    @update:open="(v) => !v && $emit('close')"
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UiInput
        id="tech"
        :label="$t('finance.modals.fields.techStack')"
        :placeholder="$t('finance.modals.fields.techStackPlaceholder')"
        v-model="form.tech_stack_component"
        :readonly="props.mode === 'view'"
        :required="props.mode !== 'view'"
        :error="errors.tech_stack_component"
      />

      <UiInput
        id="vendor"
        :label="$t('finance.modals.fields.vendor')"
        :placeholder="$t('finance.modals.fields.vendorPlaceholder')"
        v-model="form.vendor"
        :readonly="props.mode === 'view'"
        :required="props.mode !== 'view'"
        :error="errors.vendor"
      />

      <UiInput
        id="monthly"
        :label="$t('finance.modals.fields.monthlyFee')"
        :placeholder="$t('finance.modals.fields.monthlyFeePlaceholder')"
        v-model="monthlyModel"
        :readonly="props.mode === 'view'"
        class="[&_input]:tabular-nums"
      />

      <UiInput
        id="annual"
        :label="$t('finance.modals.fields.annualFee')"
        :placeholder="$t('finance.modals.fields.annualFeePlaceholder')"
        v-model="annualModel"
        :readonly="props.mode === 'view'"
        class="[&_input]:tabular-nums"
      />

      <UsageStatusFields
        v-model:status="form.status"
        v-model:expired-date="form.expired_date"
        :readonly="props.mode === 'view'"
        :errors="errors"
      />

      <UiInput
        id="notes"
        :label="$t('common.labels.notes')"
        :placeholder="$t('finance.modals.fields.notesPlaceholder')"
        v-model="form.notes"
        :readonly="props.mode === 'view'"
        class="sm:col-span-2"
      />
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="$emit('close')">
        {{ props.mode === "view" ? $t("common.actions.close") : $t("common.actions.cancel") }}
      </UiButton>
      <UiButton v-if="props.mode !== 'view'" :loading="loading" :disabled="loading" @click="submit">
        {{ $t("common.actions.save") }}
      </UiButton>
    </template>
  </UiModal>
</template>
