<script setup>
import UsageStatusFields from "./UsageStatusFields.vue";
import { UiModal, UiInput, UiSelect, UiButton } from "@/components/ui";
import { reactive, watch, computed, onMounted } from "vue";
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

onMounted(() => {
  if (fields.value.length === 0) sdmFieldStore.fetchFields();
});

const fieldOptions = computed(() => fields.value.map((f) => ({ value: f.id, label: f.name })));

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

  errors.sdm_field_id = form.sdm_field_id ? "" : "Bidang is required";
  errors.productive_hours_per_month =
    form.productive_hours_per_month !== "" ? "" : "Jam Produktif / Bulan is required";
  // Expired is required while the item is in use (mirrors the API rule).
  errors.status = form.status ? "" : "Status wajib dipilih";
  errors.expired_date =
    form.status === "active" && !form.expired_date ? "Expired wajib diisi untuk item yang Digunakan" : "";

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
    :title="props.mode === 'add' ? 'Add SDM Resource' : props.mode === 'edit' ? 'Edit SDM Resource' : 'SDM Resource Detail'"
    :description="props.mode === 'add' ? 'add a team member as an SDM resource record.' : props.mode === 'edit' ? 'modify the sdm resource details.' : 'details of the selected sdm resource.'"
    size="lg"
    @update:open="(v) => !v && $emit('close')"
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UiSelect
        id="sdm_field_id"
        label="Bidang"
        placeholder="Select bidang / role"
        v-model="form.sdm_field_id"
        :options="fieldOptions"
        :required="props.mode !== 'view'"
        :disabled="props.mode === 'view'"
        :error="errors.sdm_field_id"
      />

      <UiInput
        id="productive_hours_per_month"
        label="Jam Produktif / Bulan"
        placeholder="cth. 120"
        v-model="form.productive_hours_per_month"
        :readonly="props.mode === 'view'"
        :required="props.mode !== 'view'"
        type="number"
        :error="errors.productive_hours_per_month"
      />

      <UiInput
        id="actual"
        label="Actual (Rp.)"
        placeholder="add price actual item"
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
        label="Notes"
        placeholder="add notes item"
        v-model="form.notes"
        :readonly="props.mode === 'view'"
        class="sm:col-span-2"
      />
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="$emit('close')">
        {{ props.mode === "view" ? "Close" : "Cancel" }}
      </UiButton>
      <UiButton v-if="props.mode !== 'view'" :loading="loading" :disabled="loading" @click="submit">
        Save
      </UiButton>
    </template>
  </UiModal>
</template>
