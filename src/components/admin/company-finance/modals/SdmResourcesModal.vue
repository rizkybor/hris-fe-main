<script setup>
import UsageStatusFields from "./UsageStatusFields.vue";
import { UiModal, UiInput, UiSelect, UiButton } from "@/components/ui";
import { useI18n } from "vue-i18n";
import { reactive, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import { useSdmFieldStore } from "@/stores/sdmField";

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

const sdmFieldStore = useSdmFieldStore();
const { fields } = storeToRefs(sdmFieldStore);

// The field list is only needed once the modal opens (cached afterwards).
watch(
  () => props.show,
  (show) => show && sdmFieldStore.ensureFields(),
  { immediate: true }
);

const fieldOptions = computed(() => fields.value.map((f) => ({ value: f.id, label: f.name })));

const { t } = useI18n();
const emit = defineEmits(["submit", "close"]);

const form = reactive({
  sdm_field_id: "",
  productive_hours_per_month: "",
  actual: "",
  status: "active",
  expired_date: "",
  notes: "",
});

const buildPayload = () => ({
  sdm_field_id: Number(form.sdm_field_id),
  productive_hours_per_month: Number(form.productive_hours_per_month),
  actual: Number(form.actual),
  status: form.status,
  expired_date: form.expired_date || null,
  notes: form.notes,
});

// Error state
const errors = reactive({
  sdm_field_id: "",
  productive_hours_per_month: "",
  status: "",
  expired_date: "",
});

watch(
  () => [props.show, props.mode, props.data],
  ([show]) => {
    if (show && (props.mode === "view" || props.mode === "edit")) {
      Object.assign(form, {
        ...props.data,
        sdm_field_id: props.data.sdm_field_id ?? "",
        productive_hours_per_month: props.data.productive_hours_per_month ?? "",
        actual: props.data.actual ?? "",
        status: props.data.status || "active",
        expired_date: props.data.expired_date ? String(props.data.expired_date).slice(0, 10) : "",
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

// Computed: actual dengan read-only protection
const actualModel = computed({
  get: () => formatRupiah(form.actual),
  set: (val) => {
    if (props.mode !== "view") form.actual = parseRupiah(val);
  },
});

// ===== Validation =====
const validate = () => {
  let valid = true;

  errors.sdm_field_id = form.sdm_field_id ? "" : t("finance.modals.validation.fieldRequired");
  errors.productive_hours_per_month =
    form.productive_hours_per_month !== "" ? "" : t("finance.modals.validation.hoursRequired");
  // Expired is required while the item is in use (mirrors the API rule).
  errors.status = form.status ? "" : t("finance.modals.validation.statusRequired");
  errors.expired_date =
    form.status === "active" && !form.expired_date ? t("finance.modals.validation.expiredRequired") : "";

  Object.values(errors).forEach((e) => {
    if (e) valid = false;
  });

  return valid;
};

// Submit
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
    :title="$t(`finance.modals.sdm.title.${props.mode}`)"
    :description="$t(`finance.modals.sdm.description.${props.mode}`)"
    size="lg"
    @update:open="(v) => !v && $emit('close')"
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UiSelect
        id="sdm_field_id"
        :label="$t('finance.modals.fields.field')"
        :placeholder="$t('finance.modals.fields.fieldPlaceholder')"
        v-model="form.sdm_field_id"
        :options="fieldOptions"
        :required="props.mode !== 'view'"
        :disabled="props.mode === 'view'"
        :error="errors.sdm_field_id"
      />

      <UiInput
        id="productive_hours_per_month"
        :label="$t('finance.modals.fields.hours')"
        :placeholder="$t('finance.modals.fields.hoursPlaceholder')"
        v-model="form.productive_hours_per_month"
        :readonly="props.mode === 'view'"
        :required="props.mode !== 'view'"
        type="number"
        :error="errors.productive_hours_per_month"
      />

      <UiInput
        id="actual"
        :label="$t('finance.modals.fields.actual')"
        :placeholder="$t('finance.modals.fields.actualPlaceholder')"
        v-model="actualModel"
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
