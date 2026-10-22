<script setup>
import { reactive, watch } from "vue";
import { X, Loader2 } from "lucide-vue-next";
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
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4" @click.self="emit('close')">
    <form class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg max-h-[92vh] flex flex-col" @submit.prevent="submit">
      <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between shrink-0">
        <div>
          <h3 class="text-brand-dark text-base font-bold">{{ log ? "Edit Work Log" : "Log Work" }}</h3>
          <p class="text-brand-light text-xs">
            {{ feature ? `Feature "${feature.title}" · paid from the development balance` : "Counts against the quota of the month it was done in" }}
          </p>
        </div>
        <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" @click="emit('close')"><X class="w-5 h-5" /></button>
      </div>

      <div class="p-5 space-y-4 overflow-y-auto">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mt-label">Date <span class="text-red-500">*</span></label>
            <input v-model="form.work_date" type="date" :max="localToday()" class="mt-input" required />
            <p v-if="err('work_date')" class="mt-err">{{ err("work_date") }}</p>
          </div>
          <div>
            <label class="mt-label">Hours <span class="text-red-500">*</span></label>
            <input v-model="form.hours" type="number" min="0.1" max="24" step="any" class="mt-input" required />
            <p v-if="err('hours')" class="mt-err">{{ err("hours") }}</p>
          </div>
        </div>
        <div>
          <label class="mt-label">Work done <span class="text-red-500">*</span></label>
          <input v-model="form.title" class="mt-input" maxlength="255" placeholder="e.g. Fix product photo upload" required />
          <p v-if="err('title')" class="mt-err">{{ err("title") }}</p>
        </div>
        <div>
          <label class="mt-label">Details</label>
          <textarea v-model="form.description" rows="3" maxlength="2000" class="mt-input" placeholder="What was changed, for whom, any follow-up..."></textarea>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="mt-label">Category</label>
            <select v-model="form.category" class="mt-input">
              <option v-for="c in LOG_CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div>
            <label class="mt-label">Done by</label>
            <select v-model="form.performed_by" class="mt-input">
              <option value="">-</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option>
            </select>
          </div>
        </div>
        <label class="flex items-start gap-2.5 cursor-pointer">
          <input v-model="form.visible_to_client" type="checkbox" class="mt-0.5 w-4 h-4 accent-[#0C51D9]" />
          <span class="text-sm text-brand-dark">
            Show to client
            <span class="block text-xs text-brand-light">Untick for internal work the client shouldn't see listed (the hours still count).</span>
          </span>
        </label>
      </div>

      <div class="p-5 border-t border-[#DCDEDD] flex justify-end gap-2.5 shrink-0">
        <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-gray-50" @click="emit('close')">Cancel</button>
        <button type="submit" :disabled="loading" class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-1.5 disabled:opacity-60">
          <Loader2 v-if="loading" class="w-4 h-4 text-white animate-spin" />
          <span class="text-brand-white text-sm font-semibold">{{ log ? "Save" : "Log Work" }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.mt-label { display: block; font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 6px; }
.mt-input { width: 100%; border: 1px solid #dcdedd; border-radius: 12px; padding: 9px 12px; font-size: 14px; color: #0f172a; background: #fff; outline: none; }
.mt-input:hover, .mt-input:focus { border-color: #0c51d9; }
.mt-err { color: #ef4444; font-size: 12px; margin-top: 4px; }
</style>
