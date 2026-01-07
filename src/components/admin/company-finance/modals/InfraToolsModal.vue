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

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "active_monitoring_required", label: "Active – Monitoring" },
  { value: "active_non_critical", label: "Active – Non-Critical" },
  { value: "inactive", label: "Inactive" },
];

watch(
  () => [props.show, props.mode, props.data],
  ([show]) => {
    if (show && (props.mode === "view" || props.mode === "edit")) {
      Object.assign(form, {
        ...props.data,
        expired_date: props.data.expired_date
          ? props.data.expired_date.split("T")[0]
          : "",
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

// Error state
const errors = reactive({
  tech_stack_component: "",
  vendor: "",
  expired_date: "",
  status: "",
});

// ===== Validation =====
const validate = () => {
  let valid = true;

  errors.tech_stack_component = form.tech_stack_component
    ? ""
    : "Tech Stack is required";
  errors.vendor = form.vendor !== "" ? "" : "Vendor is required";
  errors.expired_date =
    form.expired_date !== "" ? "" : "Expired Date is required";
  errors.status = form.status !== "" ? "" : "Status is required";

  Object.values(errors).forEach((e) => {
    if (e) valid = false;
  });

  return valid;
};

const submit = () => {
  if (!validate()) return;

  emit("submit", {
    ...form,
    monthly_fee: Number(form.monthly_fee),
    annual_fee: Number(form.annual_fee),
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
            ? "Add Infrastructure Tool"
            : props.mode === "edit"
            ? "Edit Infrastructure Tool"
            : "Infrastructure Detail"
        }}
      </h3>

      <h6 class="text-sm text-gray-400 italic mb-4">
        {{
          props.mode === "add"
            ? "create a new infra tools record."
            : props.mode === "edit"
            ? "modify the infra tools details."
            : "details of the selected infra tools."
        }}
      </h6>

      <div class="space-y-4">
        <div>
          <BaseInput
            id="tech"
            label="Tech Stack Component"
            placeholder="add your tech stack item"
            v-model="form.tech_stack_component"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
          />
          <p
            v-if="errors.tech_stack_component"
            class="text-red-500 text-sm mt-1"
          >
            {{ errors.tech_stack_component }}
          </p>
        </div>

        <div>
          <BaseInput
            id="vendor"
            label="Vendor"
            placeholder="add vendor item"
            v-model="form.vendor"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
          />
          <p v-if="errors.vendor" class="text-red-500 text-sm mt-1">
            {{ errors.vendor }}
          </p>
        </div>

        <BaseInput
          id="monthly"
          label="Monthly Fee"
          placeholder="add price monthly fee item"
          v-model="monthlyModel"
          :readonly="props.mode === 'view'"
          only-number
        />

        <BaseInput
          id="annual"
          label="Annual Fee"
          placeholder="add price annual fee item"
          v-model="annualModel"
          :readonly="props.mode === 'view'"
          only-number
        />

        <div>
          <BaseInput
            id="expired"
            type="date"
            label="Expired Date"
            v-model="form.expired_date"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
          />
          <p v-if="errors.expired_date" class="text-red-500 text-sm mt-1">
            {{ errors.expired_date }}
          </p>
        </div>

        <div>
          <BaseSelect
            id="status"
            label="Status"
            placeholder="Select status"
            v-model="form.status"
            :options="statusOptions"
            :required="props.mode !== 'view'"
            :readonly="props.mode === 'view'"
          />
          <p v-if="errors.status" class="text-red-500 text-sm mt-1">
            {{ errors.status }}
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
