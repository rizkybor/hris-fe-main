<script setup>
import BaseInput from "@/components/common/form/Input.vue";
import { reactive } from "vue";
import { watch } from "vue";

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

const submit = () => {
  emit("submit", { ...form });
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
            ? "Add Infrastructure Tool"
            : props.mode === "edit"
            ? "Edit Infrastructure Tool"
            : "Infrastructure Detail"
        }}
      </h3>

      <div class="space-y-4">
        <BaseInput
          id="tech"
          label="Tech Stack Component"
          v-model="form.tech_stack_component"
          :readonly="props.mode === 'view'"
        />

        <BaseInput id="vendor" label="Vendor" v-model="form.vendor" />

        <BaseInput
          id="monthly"
          type="number"
          label="Monthly Fee"
          v-model="form.monthly_fee"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="annual"
          type="number"
          label="Annual Fee"
          v-model="form.annual_fee"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="expired"
          type="date"
          label="Expired Date"
          v-model="form.expired_date"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="status"
          label="Status"
          v-model="form.status"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="notes"
          label="Notes"
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
