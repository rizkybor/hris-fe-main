<script setup>
import BaseInput from "@/components/common/form/Input.vue";
import { reactive, watch, computed } from "vue";

// Props
const props = defineProps({
  show: Boolean,
  loading: Boolean,
  mode: {
    type: String,
    default: "add", // add | edit | view
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
  budget: "",
  actual: "",
  notes: "",
});

// Error state
const errors = reactive({
  financial_items: "",
  budget: "",
  actual: "",
});

// Watcher: reset form saat modal dibuka atau data berubah
watch(
  () => [props.show, props.mode, props.data],
  ([show]) => {
    if (show) {
      if (props.mode === "edit" || props.mode === "view") {
        Object.assign(form, {
          ...props.data,
          budget: props.data.budget ?? "",
          actual: props.data.actual ?? "",
        });
      } else if (props.mode === "add") {
        Object.keys(form).forEach((key) => (form[key] = ""));
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

// Computed: budget & actual dengan read-only protection
const budgetModel = computed({
  get: () => formatRupiah(form.budget),
  set: (val) => {
    if (props.mode !== "view") form.budget = parseRupiah(val);
  },
});

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
  errors.budget = form.budget !== "" ? "" : "Budget is required";
  errors.actual = form.actual !== "" ? "" : "Actual is required";

  Object.values(errors).forEach((e) => {
    if (e) valid = false;
  });

  return valid;
};

// Submit
const submit = () => {
  if (!validate()) return;

  emit("submit", {
    ...form,
    budget: Number(form.budget),
    actual: Number(form.actual),
  });
};
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  >
    <div
      class="bg-white rounded-[20px] w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-xl"
    >
      <h3 class="text-xl font-bold mb-4">
        {{
          props.mode === "add"
            ? "Add Fixed Cost"
            : props.mode === "edit"
            ? "Edit Fixed Cost"
            : "Fixed Cost Detail"
        }}
      </h3>

      <div class="space-y-4">
        <!-- Item -->
        <div>
          <BaseInput
            id="financial_items"
            label="Item"
            v-model="form.financial_items"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
          />
          <p v-if="errors.financial_items" class="text-red-500 text-sm mt-1">
            {{ errors.financial_items }}
          </p>
        </div>

        <!-- Description -->
        <div>
          <BaseInput
            id="description"
            label="Description"
            v-model="form.description"
            :readonly="props.mode === 'view'"
          />
        </div>

        <!-- Budget -->
        <div>
          <BaseInput
            id="budget"
            label="Budget"
            v-model="budgetModel"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
          />
          <p v-if="errors.budget" class="text-red-500 text-sm mt-1">
            {{ errors.budget }}
          </p>
        </div>

        <!-- Actual -->
        <div>
          <BaseInput
            id="actual"
            label="Actual"
            v-model="actualModel"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
          />
          <p v-if="errors.actual" class="text-red-500 text-sm mt-1">
            {{ errors.actual }}
          </p>
        </div>

        <!-- Notes -->
        <fiv>
          <BaseInput
            id="notes"
            label="Notes"
            v-model="form.notes"
            :readonly="props.mode === 'view'"
          />
        </fiv>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end gap-3 mt-6">
        <button class="px-4 py-2 border rounded-lg" @click="$emit('close')">
          {{ props.mode === "view" ? "Close" : "Cancel" }}
        </button>

        <button
          v-if="props.mode !== 'view'"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg"
          @click="submit"
          :disabled="loading"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>
