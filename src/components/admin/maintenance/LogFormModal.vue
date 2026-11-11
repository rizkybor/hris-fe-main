<script setup>
import { computed, reactive, watch } from "vue";
import { UiModal, UiButton, UiSelect } from "@/components/ui";
import { LOG_CATEGORIES } from "@/utils/maintenance";

const props = defineProps({
  show: Boolean,
  loading: Boolean,
  log: { type: Object, default: null }, // when editing
  // Work on a new feature (paid from the development balance) instead of
  // the month's quota.
  feature: { type: Object, default: null },
  defaultDate: { type: String, default: "" },
  employees: { type: Array, default: () => [] }, // [{ id: userId, name }]
  defaultPerformer: { type: [Number, String], default: null },
  errors: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["submit", "close"]);

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const form = reactive({});
watch(
  () => props.show,
  (open) => {
    if (!open) return;
    const log = props.log;
    Object.assign(form, {
      work_date: log?.work_date || props.defaultDate || localToday(),
      title: log?.title || "",
      description: log?.description || "",
      hours: log?.hours ?? 1,
      category: log?.category || (props.feature ? "minor_feature" : "bug_fix"),
      performed_by: log?.performed_by ?? props.defaultPerformer ?? "",
      visible_to_client: log ? log.visible_to_client : true,
    });
  },
  { immediate: true }
);

const submit = () =>
  emit("submit", {
    ...form,
    performed_by: form.performed_by ? Number(form.performed_by) : null,
    description: form.description || null,
    maintenance_feature_id: props.feature?.id ?? props.log?.maintenance_feature_id ?? null,
  });

const err = (field) => props.errors?.[field]?.[0];

// Presentation only: token classes for the native fields.
const LABEL = "block text-ui-small font-medium text-ui-ink mb-1.5";
const FIELD =
  "w-full min-h-[38px] px-3 py-2 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-muted";
const ERR = "text-ui-cap text-ui-bad mt-1.5";
const HINT = "text-ui-cap text-ui-muted mt-1.5";
const employeeOptions = computed(() => [{ value: "", label: "-" }, ...props.employees.map((e) => ({ value: e.id, label: e.name }))]);

</script>

<template>
  <UiModal
    :open="show"
    :title="log ? 'Edit Work Log' : 'Log Work'"
    :description="feature ? `Feature &quot;${feature.title}&quot; · paid from the development balance` : 'Counts against the quota of the month it was done in'"
    :z-index="110"
    @close="emit('close')"
  >
    <form id="maintenance-log-form" class="space-y-4" @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="ml-date" :class="LABEL">Date<span class="text-ui-bad"> *</span></label>
          <input id="ml-date" v-model="form.work_date" type="date" :max="localToday()" :class="FIELD" required />
          <p v-if="err('work_date')" :class="ERR">{{ err("work_date") }}</p>
        </div>
        <div>
          <label for="ml-hours" :class="LABEL">Hours<span class="text-ui-bad"> *</span></label>
          <input id="ml-hours" v-model="form.hours" type="number" min="0.1" max="24" step="any" :class="[FIELD, 'tabular-nums']" required />
          <p v-if="err('hours')" :class="ERR">{{ err("hours") }}</p>
        </div>
      </div>
      <div>
        <label for="ml-title" :class="LABEL">Work done<span class="text-ui-bad"> *</span></label>
        <input id="ml-title" v-model="form.title" :class="FIELD" maxlength="255" placeholder="e.g. Fix product photo upload" required />
        <p v-if="err('title')" :class="ERR">{{ err("title") }}</p>
      </div>
      <div>
        <label for="ml-details" :class="LABEL">Details</label>
        <textarea id="ml-details" v-model="form.description" rows="3" maxlength="2000" :class="FIELD" placeholder="What was changed, for whom, any follow-up..."></textarea>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiSelect id="ml-category" v-model="form.category" label="Category" :options="LOG_CATEGORIES" />
        <UiSelect id="ml-by" v-model="form.performed_by" label="Done by" :options="employeeOptions" />
      </div>
      <label class="flex items-start gap-2.5 cursor-pointer">
        <input v-model="form.visible_to_client" type="checkbox" class="mt-0.5 w-4 h-4 accent-ui-ink" />
        <span class="text-ui-small font-medium text-ui-ink">
          Show to client
          <span class="block text-ui-cap font-normal text-ui-muted">Untick for internal work the client shouldn't see listed (the hours still count).</span>
        </span>
      </label>
    </form>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">Cancel</UiButton>
      <UiButton type="submit" form="maintenance-log-form" :loading="loading">{{ log ? "Save" : "Log Work" }}</UiButton>
    </template>
  </UiModal>
</template>
