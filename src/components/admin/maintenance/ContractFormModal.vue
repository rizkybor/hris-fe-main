<script setup>
import { computed, reactive, ref, watch } from "vue";
import { X, Loader2 } from "lucide-vue-next";
import { LEFTOVER_POLICY } from "@/utils/maintenance";

const props = defineProps({
  show: Boolean,
  loading: Boolean,
  data: { type: Object, default: null }, // contract when editing
  clients: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  errors: { type: Object, default: () => ({}) },
  // Pre-selects the client/project when opened from their detail pages.
  presetClientId: { type: [Number, String], default: null },
  presetProjectId: { type: [Number, String], default: null },
});
const emit = defineEmits(["submit", "close"]);

const POLICY_HINT = {
  bank: "Unused hours go to the Development Balance and can be spent on new features before they expire.",
  rollover: "Unused hours are added to next month's quota.",
  expire: "Unused hours are gone at the end of the month.",
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  client_id: props.presetClientId ? String(props.presetClientId) : "",
  project_id: props.presetProjectId ? String(props.presetProjectId) : "",
  name: "",
  monthly_quota_hours: 10,
  start_date: today().slice(0, 8) + "01",
  end_date: "",
  status: "active",
  leftover_policy: "bank",
  bank_cap_hours: 30,
  bank_expiry_months: 6,
  overage_rate: "",
  notes: "",
});

const form = reactive(emptyForm());
// The balance cap follows 3x the quota until it's edited by hand.
const capTouched = ref(false);

watch(
  () => props.show,
  (open) => {
    if (!open) return;
    Object.assign(form, emptyForm());
    capTouched.value = false;
    if (props.data) {
      const c = props.data;
      Object.assign(form, {
        client_id: String(c.client?.id ?? ""),
        project_id: c.project?.id ? String(c.project.id) : "",
        name: c.name,
        monthly_quota_hours: c.monthly_quota_hours,
        start_date: c.start_date,
        end_date: c.end_date || "",
        status: c.status,
        leftover_policy: c.leftover_policy,
        bank_cap_hours: c.bank_cap_hours ?? "",
        bank_expiry_months: c.bank_expiry_months ?? "",
        overage_rate: c.overage_rate ?? "",
        notes: c.notes || "",
      });
      capTouched.value = true;
    }
  },
  { immediate: true }
);

watch(
  () => form.monthly_quota_hours,
  (quota) => {
    if (!capTouched.value && Number(quota) > 0) form.bank_cap_hours = Math.round(Number(quota) * 3 * 100) / 100;
  }
);

// Projects of the chosen client, plus projects not tied to any client.
const projectOptions = computed(() =>
  props.projects.filter((p) => {
    const clientId = p.client_id ?? p.client?.id;
    return !form.client_id || !clientId || String(clientId) === String(form.client_id);
  })
);
watch(
  () => form.client_id,
  () => {
    if (form.project_id && !projectOptions.value.some((p) => String(p.id) === String(form.project_id))) form.project_id = "";
  }
);

const submit = () => {
  emit("submit", {
    ...form,
    client_id: form.client_id ? Number(form.client_id) : null,
    project_id: form.project_id ? Number(form.project_id) : null,
    end_date: form.end_date || null,
    bank_cap_hours: form.leftover_policy === "bank" && form.bank_cap_hours !== "" ? form.bank_cap_hours : null,
    bank_expiry_months: form.leftover_policy === "bank" && form.bank_expiry_months !== "" ? form.bank_expiry_months : null,
    overage_rate: form.overage_rate === "" ? null : form.overage_rate,
    notes: form.notes || null,
  });
};

const err = (field) => props.errors?.[field]?.[0];
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="emit('close')">
    <form class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl max-h-[92vh] flex flex-col" @submit.prevent="submit">
      <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between shrink-0">
        <div>
          <h3 class="text-brand-dark text-base font-bold">{{ data ? "Edit Maintenance Contract" : "New Maintenance Contract" }}</h3>
          <p class="text-brand-light text-xs">Monthly hour quota for a client, optionally tied to one of their projects.</p>
        </div>
        <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" @click="emit('close')"><X class="w-5 h-5" /></button>
      </div>

      <div class="p-5 space-y-4 overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="mt-label">Client <span class="text-red-500">*</span></label>
            <select v-model="form.client_id" class="mt-input" required>
              <option value="">Select client</option>
              <option v-for="c in clients" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
            </select>
            <p v-if="err('client_id')" class="mt-err">{{ err("client_id") }}</p>
          </div>
          <div>
            <label class="mt-label">Project <span class="text-brand-light font-normal">(optional)</span></label>
            <select v-model="form.project_id" class="mt-input">
              <option value="">Not tied to a project</option>
              <option v-for="p in projectOptions" :key="p.id" :value="String(p.id)">{{ p.name }}</option>
            </select>
            <p v-if="err('project_id')" class="mt-err">{{ err("project_id") }}</p>
          </div>
        </div>

        <div>
          <label class="mt-label">Contract name <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="mt-input" maxlength="255" placeholder="e.g. Website Maintenance 2026" required />
          <p v-if="err('name')" class="mt-err">{{ err("name") }}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="mt-label">Quota per month (hours) <span class="text-red-500">*</span></label>
            <input v-model="form.monthly_quota_hours" type="number" min="0.5" step="any" class="mt-input" required />
            <p v-if="err('monthly_quota_hours')" class="mt-err">{{ err("monthly_quota_hours") }}</p>
          </div>
          <div>
            <label class="mt-label">Start date <span class="text-red-500">*</span></label>
            <input v-model="form.start_date" type="date" class="mt-input" required />
            <p v-if="err('start_date')" class="mt-err">{{ err("start_date") }}</p>
          </div>
          <div>
            <label class="mt-label">End date <span class="text-brand-light font-normal">(optional)</span></label>
            <input v-model="form.end_date" type="date" class="mt-input" />
            <p v-if="err('end_date')" class="mt-err">{{ err("end_date") }}</p>
          </div>
        </div>
        <p v-if="data" class="text-xs text-brand-light -mt-2">
          A new quota applies from next month (and to this month only while nothing has been logged or adjusted yet). Use "Adjust quota" to change this month.
        </p>

        <div>
          <label class="mt-label">Status</label>
          <div class="flex gap-2">
            <label v-for="s in ['active', 'paused', 'ended']" :key="s" class="mt-chip" :class="{ 'mt-chip--on': form.status === s }">
              <input v-model="form.status" type="radio" :value="s" class="sr-only" />{{ s.charAt(0).toUpperCase() + s.slice(1) }}
            </label>
          </div>
          <p class="text-xs text-brand-light mt-1">Paused and ended contracts don't get a quota for new months.</p>
        </div>

        <div>
          <label class="mt-label">Unused hours at month end</label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label
              v-for="(policy, key) in LEFTOVER_POLICY"
              :key="key"
              class="border rounded-[10px] p-3 cursor-pointer transition-colors"
              :class="form.leftover_policy === key ? 'border-[#0C51D9] bg-blue-50/60' : 'border-[#DCDEDD] hover:border-[#0C51D9]'"
            >
              <input v-model="form.leftover_policy" type="radio" :value="key" class="sr-only" />
              <p class="text-sm font-semibold text-brand-dark">{{ policy.label }}</p>
              <p class="text-xs text-brand-light mt-0.5">{{ POLICY_HINT[key] }}</p>
            </label>
          </div>
        </div>

        <div v-if="form.leftover_policy === 'bank'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-4">
          <div>
            <label class="mt-label">Balance cap (hours)</label>
            <input v-model="form.bank_cap_hours" type="number" min="0" step="any" class="mt-input bg-white" placeholder="No cap" @input="capTouched = true" />
            <p class="text-xs text-brand-light mt-1">Leftover beyond this expires. Default 3× the monthly quota; empty = no cap.</p>
          </div>
          <div>
            <label class="mt-label">Hours expire after (months)</label>
            <input v-model="form.bank_expiry_months" type="number" min="1" max="36" step="1" class="mt-input bg-white" placeholder="Never" />
            <p class="text-xs text-brand-light mt-1">Unused balance expires after this. Empty = never.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="mt-label">Overage rate per hour (Rp) <span class="text-brand-light font-normal">(optional)</span></label>
            <input v-model="form.overage_rate" type="number" min="0" step="any" class="mt-input" placeholder="e.g. 150000" />
            <p class="text-xs text-brand-light mt-1">Shown next to hours worked beyond the quota.</p>
          </div>
          <div>
            <label class="mt-label">Notes</label>
            <textarea v-model="form.notes" rows="2" maxlength="2000" class="mt-input" placeholder="Scope, SLA, contact person..."></textarea>
          </div>
        </div>
      </div>

      <div class="p-5 border-t border-[#DCDEDD] flex justify-end gap-2.5 shrink-0">
        <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-gray-50" @click="emit('close')">Cancel</button>
        <button type="submit" :disabled="loading" class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-1.5 disabled:opacity-60">
          <Loader2 v-if="loading" class="w-4 h-4 text-white animate-spin" />
          <span class="text-brand-white text-sm font-semibold">{{ data ? "Save Changes" : "Create Contract" }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.mt-label { display: block; font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 6px; }
.mt-input { width: 100%; border: 1px solid #dcdedd; border-radius: 12px; padding: 9px 12px; font-size: 14px; color: #0f172a; background: #fff; outline: none; transition: border-color 0.2s; }
.mt-input:hover, .mt-input:focus { border-color: #0c51d9; }
.mt-err { color: #ef4444; font-size: 12px; margin-top: 4px; }
.mt-chip { border: 1px solid #dcdedd; border-radius: 9px; padding: 7px 14px; font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; }
.mt-chip--on { border-color: #0c51d9; color: #0c51d9; background: #eff4ff; }
</style>
