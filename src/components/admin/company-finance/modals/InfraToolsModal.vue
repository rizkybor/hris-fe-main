<script setup>
import UsageStatusFields from "./UsageStatusFields.vue";
import { UiModal, UiInput, UiButton } from "@/components/ui";
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
    : "Tech Stack is required";
  errors.vendor = form.vendor !== "" ? "" : "Vendor is required";
  // Expired is required while the item is in use (mirrors the API rule).
  errors.status = form.status ? "" : "Status wajib dipilih";
  errors.expired_date =
    form.status === "active" && !form.expired_date ? "Expired wajib diisi untuk item yang Digunakan" : "";

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
    :title="props.mode === 'add' ? 'Add Infrastructure Tool' : props.mode === 'edit' ? 'Edit Infrastructure Tool' : 'Infrastructure Detail'"
    :description="props.mode === 'add' ? 'create a new infra tools record.' : props.mode === 'edit' ? 'modify the infra tools details.' : 'details of the selected infra tools.'"
    size="lg"
    @update:open="(v) => !v && $emit('close')"
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UiInput
        id="tech"
        label="Tech Stack Component"
        placeholder="add your tech stack item"
        v-model="form.tech_stack_component"
        :readonly="props.mode === 'view'"
        :required="props.mode !== 'view'"
        :error="errors.tech_stack_component"
      />

      <UiInput
        id="vendor"
        label="Vendor"
        placeholder="add vendor item"
        v-model="form.vendor"
        :readonly="props.mode === 'view'"
        :required="props.mode !== 'view'"
        :error="errors.vendor"
      />

      <UiInput
        id="monthly"
        label="Monthly Fee (Rp.)"
        placeholder="add price monthly fee item"
        v-model="monthlyModel"
        :readonly="props.mode === 'view'"
        class="[&_input]:tabular-nums"
      />

      <UiInput
        id="annual"
        label="Annual Fee (Rp.)"
        placeholder="add price annual fee item"
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
