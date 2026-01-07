<script setup>
import BaseInput from "@/components/common/form/Input.vue";
import BaseSelect from "@/components/common/form/Select.vue";
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

const ragOptions = [
  { value: "red", label: "🔴 Red (Critical)" },
  { value: "amber", label: "🟡 Amber (At Risk)" },
  { value: "green", label: "🟢 Green (On Track)" },
];

const emit = defineEmits(["submit", "close"]);

const form = reactive({
  sdm_component: "",
  metrik: "",
  capacity_target: "",
  budget: "",
  actual: "",
  rag_status: "",
  notes: "",
});

// Error state
const errors = reactive({
  sdm_component: "",
  metrik: "",
  capacity_target: "",
  budget: "",
  rag_status: "",
});

watch(
  () => [props.show, props.mode, props.data],
  ([show]) => {
    if (show && (props.mode === "view" || props.mode === "edit")) {
      Object.assign(form, {
        ...props.data,
        budget: props.data.budget ?? "",
        actual: props.data.actual ?? "",
      });
    }

    if (show && props.mode === "add") {
      Object.keys(form).forEach((key) => (form[key] = ""));
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

  errors.sdm_component = form.sdm_component ? "" : "Item is required";
  errors.metrik = form.metrik ? "" : "Metrik is required";
  errors.capacity_target = form.capacity_target
    ? ""
    : "Capacity of Target is required";
  errors.budget = form.budget !== "" ? "" : "Budget is required";
  errors.rag_status = form.rag_status ? "" : "Status is required";

  Object.values(errors).forEach((e) => {
    if (e) valid = false;
  });

  return valid;
};

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
      <h3 class="text-xl font-bold">
        {{
          props.mode === "add"
            ? "Add SDM Resource"
            : props.mode === "edit"
            ? "Edit SDM Resource"
            : "SDM Resource Detail"
        }}
      </h3>

      <h6 class="text-sm text-gray-400 italic mb-4">
        {{
          props.mode === "add"
            ? "create a new sdm resource record."
            : props.mode === "edit"
            ? "modify the sdm resource details."
            : "details of the selected sdm resource."
        }}
      </h6>

      <div class="space-y-4">
        <div>
          <BaseInput
            id="sdm_component"
            label="Component"
            placeholder="add your component sdm item"
            v-model="form.sdm_component"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
          />
          <p v-if="errors.sdm_component" class="text-red-500 text-sm mt-1">
            {{ errors.sdm_component }}
          </p>
        </div>

        <div>
          <BaseInput
            id="metrik"
            label="Metric"
            placeholder="add metric item"
            v-model="form.metrik"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
          />
          <p v-if="errors.metrik" class="text-red-500 text-sm mt-1">
            {{ errors.metrik }}
          </p>
        </div>

        <div>
          <BaseInput
            id="capacity_target"
            label="Capacity Target"
            placeholder="add capacity of target"
            v-model="form.capacity_target"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
          />
          <p v-if="errors.capacity_target" class="text-red-500 text-sm mt-1">
            {{ errors.capacity_target }}
          </p>
        </div>

        <div>
          <BaseInput
            id="budget"
            label="Budget"
            placeholder="add price budget item"
            v-model="budgetModel"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
            only-number
          />
          <p v-if="errors.budget" class="text-red-500 text-sm mt-1">
            {{ errors.budget }}
          </p>
        </div>

        <BaseInput
          id="actual"
          label="Actual"
          placeholder="add price actual item"
          v-model="actualModel"
          :readonly="props.mode === 'view'"
          only-number
        />

        <div>
          <BaseSelect
            id="rag_status"
            label="RAG Status"
            placeholder="Select RAG status"
            v-model="form.rag_status"
            :options="ragOptions"
            :required="props.mode !== 'view'"
            :readonly="props.mode === 'view'"
          />
          <p v-if="errors.rag_status" class="text-red-500 text-sm mt-1">
            {{ errors.rag_status }}
          </p>
        </div>

        <BaseInput
          id="notes"
          label="Notes"
          placeholder="add notes item"
          v-model="form.notes"
          :readonly="props.mode === 'view'"
        />
      </div>

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
