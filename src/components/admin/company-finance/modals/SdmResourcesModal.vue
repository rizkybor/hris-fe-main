<script setup>
import BaseInput from "@/components/common/form/Input.vue";
import { reactive, watch } from "vue";

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
  sdm_component: "",
  metrik: "",
  capacity_target: "",
  budget: "",
  actual: "",
  rag_status: "",
  notes: "",
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

const submit = () => {
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
            ? "Add SDM Resource"
            : props.mode === "edit"
            ? "Edit SDM Resource"
            : "SDM Resource Detail"
        }}
      </h3>

      <div class="space-y-4">
        <BaseInput
          id="sdm_component"
          label="Component"
          v-model="form.sdm_component"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="metrik"
          label="Metric"
          v-model="form.metrik"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="capacity_target"
          label="Capacity Target"
          v-model="form.capacity_target"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="budget"
          type="number"
          label="Budget"
          v-model="form.budget"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="actual"
          type="number"
          label="Actual"
          v-model="form.actual"
          :readonly="props.mode === 'view'"
        />

        <BaseInput
          id="rag_status"
          label="RAG Status"
          v-model="form.rag_status"
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
