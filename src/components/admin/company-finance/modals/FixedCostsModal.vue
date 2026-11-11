<script setup>
import UsageStatusFields from "./UsageStatusFields.vue";
import { UiModal, UiInput, UiButton } from "@/components/ui";
import { reactive, watch, computed } from "vue";

// Props
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

// Emit
const emit = defineEmits(["submit", "close"]);

// Form state
const form = reactive({
  financial_items: "",
  description: "",
  actual: "",
  status: "active",
  expired_date: "",
  notes: "",
});

const buildPayload = () => ({
  financial_items: form.financial_items,
  description: form.description,
  actual: Number(form.actual),
  status: form.status,
  expired_date: form.expired_date || null,
  notes: form.notes,
});

// Error state
const errors = reactive({
  financial_items: "",
  description: "",
  actual: "",
  status: "",
  expired_date: "",
});

// Watcher: reset form saat modal dibuka atau data berubah
watch(
  () => [props.show, props.mode, props.data],
  ([show]) => {
    if (show) {
      if (props.mode === "edit" || props.mode === "view") {
        Object.assign(form, {
          ...props.data,
          actual: props.data.actual ?? "",
          status: props.data.status || "active",
          expired_date: props.data.expired_date ? String(props.data.expired_date).slice(0, 10) : "",
        });
      } else if (props.mode === "add") {
        Object.keys(form).forEach((key) => (form[key] = ""));
        form.status = "active";
      }
      // Reset errors
      Object.keys(errors).forEach((key) => (errors[key] = ""));
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

  errors.financial_items = form.financial_items ? "" : "Item is required";
  errors.description = form.description ? "" : "Description is required";
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
    :title="props.mode === 'add' ? 'Add Fixed Cost' : props.mode === 'edit' ? 'Edit Fixed Cost' : 'Fixed Cost Detail'"
    :description="props.mode === 'add' ? 'create a new fixed cost record.' : props.mode === 'edit' ? 'modify the fixed cost details.' : 'details of the selected fixed cost.'"
    size="lg"
    @update:open="(v) => !v && $emit('close')"
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UiInput
        id="financial_items"
        label="Item"
        placeholder="add your financial item"
        v-model="form.financial_items"
        :readonly="props.mode === 'view'"
        :required="props.mode !== 'view'"
        :error="errors.financial_items"
      />

      <UiInput
        id="description"
        label="Description"
        placeholder="add description item"
        v-model="form.description"
        :readonly="props.mode === 'view'"
        :required="props.mode !== 'view'"
        :error="errors.description"
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
