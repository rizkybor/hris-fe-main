<script setup>
import BaseInput from "@/components/common/form/Input.vue";
import BaseSelect from "@/components/common/form/Select.vue";
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
  capacity_target: "",
  actual: "",
  notes: "",
});

const buildPayload = () => ({
  sdm_field_id: Number(form.sdm_field_id),
  productive_hours_per_month: Number(form.productive_hours_per_month),
  capacity_target: form.capacity_target || null,
  actual: Number(form.actual),
  notes: form.notes,
});

// Error state
const errors = reactive({
  sdm_field_id: "",
  productive_hours_per_month: "",
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
  <div
    v-if="show"
    class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  >
    <div
      class="bg-slate-50 rounded-[14px] w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-xl"
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
            ? "add a team member as an SDM resource record."
            : props.mode === "edit"
            ? "modify the sdm resource details."
            : "details of the selected sdm resource."
        }}
      </h6>

      <div class="space-y-4">
        <div>
          <BaseSelect
            id="sdm_field_id"
            label="Bidang"
            placeholder="Select bidang / role"
            v-model="form.sdm_field_id"
            :options="fieldOptions"
            :required="props.mode !== 'view'"
            :readonly="props.mode === 'view'"
          />
          <p v-if="errors.sdm_field_id" class="text-red-500 text-sm mt-1">
            {{ errors.sdm_field_id }}
          </p>
        </div>

        <div>
          <BaseInput
            id="productive_hours_per_month"
            label="Jam Produktif / Bulan"
            placeholder="cth. 120"
            v-model="form.productive_hours_per_month"
            :readonly="props.mode === 'view'"
            :required="props.mode !== 'view'"
            type="number"
          />
          <p v-if="errors.productive_hours_per_month" class="text-red-500 text-sm mt-1">
            {{ errors.productive_hours_per_month }}
          </p>
        </div>

        <BaseInput
          id="actual"
          label="Actual (Rp.)"
          placeholder="add price actual item"
          v-model="actualModel"
          :readonly="props.mode === 'view'"
          only-number
        />

        <BaseInput
          id="capacity_target"
          label="Capacity Target (Opsional)"
          placeholder="add capacity of target"
          v-model="form.capacity_target"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="notes"
          label="Notes"
          placeholder="add notes item"
          v-model="form.notes"
          :readonly="props.mode === 'view'"
        />
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button class="bg-white px-4 py-2 border rounded-lg" @click="$emit('close')">
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
