<script setup>
import { computed, reactive, ref, watch } from "vue";
import { UiModal, UiButton, UiSelect } from "@/components/ui";
import { LEFTOVER_POLICY, CONTRACT_STATUS } from "@/utils/maintenance";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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

const POLICY_HINT = computed(() => ({
  bank: t("maintenance.contractForm.policyHint.bank"),
  rollover: t("maintenance.contractForm.policyHint.rollover"),
  expire: t("maintenance.contractForm.policyHint.expire"),
}));

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

// Presentation only: token classes for the native fields.
const LABEL = "block text-ui-small font-medium text-ui-ink mb-1.5";
const FIELD =
  "w-full min-h-[38px] px-3 py-2 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-muted";
const ERR = "text-ui-cap text-ui-bad mt-1.5";
const HINT = "text-ui-cap text-ui-muted mt-1.5";
const clientSelectOptions = computed(() => [{ value: "", label: t("maintenance.contractForm.selectClient") }, ...props.clients.map((c) => ({ value: String(c.id), label: c.name }))]);
const projectSelectOptions = computed(() => [{ value: "", label: t("maintenance.contractForm.noProject") }, ...projectOptions.value.map((p) => ({ value: String(p.id), label: p.name }))]);

</script>

<template>
  <UiModal
    :open="show"
    size="lg"
    :title="data ? $t('maintenance.contractForm.editTitle') : $t('maintenance.contractForm.newTitle')"
    :description="$t('maintenance.contractForm.description')"
    @close="emit('close')"
  >
    <form id="maintenance-contract-form" class="space-y-5" @submit.prevent="submit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiSelect id="mc-client" v-model="form.client_id" :label="$t('common.labels.client')" :options="clientSelectOptions" required :error="err('client_id') || ''" />
        <div>
          <label for="mc-project" :class="LABEL">{{ $t("common.labels.project") }} <span class="text-ui-muted font-normal">{{ $t("maintenance.contractForm.optional") }}</span></label>
          <UiSelect id="mc-project" v-model="form.project_id" :options="projectSelectOptions" :error="err('project_id') || ''" />
        </div>

        <div class="sm:col-span-2">
          <label for="mc-name" :class="LABEL">{{ $t("maintenance.contractForm.name") }}<span class="text-ui-bad"> *</span></label>
          <input id="mc-name" v-model="form.name" :class="FIELD" maxlength="255" :placeholder="$t('maintenance.contractForm.namePlaceholder')" required />
          <p v-if="err('name')" :class="ERR">{{ err("name") }}</p>
        </div>
      </div>

      <div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label for="mc-quota" :class="LABEL">{{ $t("maintenance.contractForm.quota") }}<span class="text-ui-bad"> *</span></label>
            <input id="mc-quota" v-model="form.monthly_quota_hours" type="number" min="0.5" step="any" :class="[FIELD, 'tabular-nums']" required />
            <p v-if="err('monthly_quota_hours')" :class="ERR">{{ err("monthly_quota_hours") }}</p>
          </div>
          <div>
            <label for="mc-start" :class="LABEL">{{ $t("common.labels.startDate") }}<span class="text-ui-bad"> *</span></label>
            <input id="mc-start" v-model="form.start_date" type="date" :class="FIELD" required />
            <p v-if="err('start_date')" :class="ERR">{{ err("start_date") }}</p>
          </div>
          <div>
            <label for="mc-end" :class="LABEL">{{ $t("common.labels.endDate") }} <span class="text-ui-muted font-normal">{{ $t("maintenance.contractForm.optional") }}</span></label>
            <input id="mc-end" v-model="form.end_date" type="date" :class="FIELD" />
            <p v-if="err('end_date')" :class="ERR">{{ err("end_date") }}</p>
          </div>
        </div>
        <p v-if="data" :class="[HINT, '!mt-2']">
          {{ $t("maintenance.contractForm.quotaChangeHint") }}
        </p>
      </div>

      <div>
        <p :class="LABEL">{{ $t("common.labels.status") }}</p>
        <div class="flex gap-1.5" role="radiogroup">
          <label
            v-for="s in ['active', 'paused', 'ended']"
            :key="s"
            class="ui-press inline-flex items-center h-8 px-3 rounded-full border text-ui-small font-medium cursor-pointer has-[:focus-visible]:shadow-ui-focus"
            :class="form.status === s ? 'bg-ui-ink text-white border-ui-ink' : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover'"
          >
            <input v-model="form.status" type="radio" :value="s" class="sr-only" />{{ CONTRACT_STATUS[s].label }}
          </label>
        </div>
        <p :class="HINT">{{ $t("maintenance.contractForm.statusHint") }}</p>
      </div>

      <div>
        <p :class="LABEL">{{ $t("maintenance.contractForm.unusedAtMonthEnd") }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label
            v-for="(policy, key) in LEFTOVER_POLICY"
            :key="key"
            class="border rounded-ui-control p-3 cursor-pointer transition-colors has-[:focus-visible]:shadow-ui-focus"
            :class="form.leftover_policy === key ? 'border-ui-accent bg-ui-accent-soft' : 'border-ui-line-strong hover:bg-ui-subtle'"
          >
            <input v-model="form.leftover_policy" type="radio" :value="key" class="sr-only" />
            <p class="text-ui-small font-medium text-ui-ink">{{ policy.label }}</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ POLICY_HINT[key] }}</p>
          </label>
        </div>
      </div>

      <div v-if="form.leftover_policy === 'bank'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-ui-subtle/60 border border-ui-line rounded-ui-card p-4">
        <div>
          <label for="mc-cap" :class="LABEL">{{ $t("maintenance.contractForm.cap") }}</label>
          <input id="mc-cap" v-model="form.bank_cap_hours" type="number" min="0" step="any" :class="[FIELD, 'tabular-nums']" :placeholder="$t('maintenance.contractForm.noCap')" @input="capTouched = true" />
          <p :class="HINT">{{ $t("maintenance.contractForm.capHint") }}</p>
        </div>
        <div>
          <label for="mc-expiry" :class="LABEL">{{ $t("maintenance.contractForm.expiry") }}</label>
          <input id="mc-expiry" v-model="form.bank_expiry_months" type="number" min="1" max="36" step="1" :class="[FIELD, 'tabular-nums']" :placeholder="$t('maintenance.contractForm.never')" />
          <p :class="HINT">{{ $t("maintenance.contractForm.expiryHint") }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="mc-overage" :class="LABEL">{{ $t("maintenance.contractForm.overageRate") }} <span class="text-ui-muted font-normal">{{ $t("maintenance.contractForm.optional") }}</span></label>
          <input id="mc-overage" v-model="form.overage_rate" type="number" min="0" step="any" :class="[FIELD, 'tabular-nums']" :placeholder="$t('maintenance.contractForm.overagePlaceholder')" />
          <p :class="HINT">{{ $t("maintenance.contractForm.overageHint") }}</p>
        </div>
        <div>
          <label for="mc-notes" :class="LABEL">{{ $t("common.labels.notes") }}</label>
          <textarea id="mc-notes" v-model="form.notes" rows="2" maxlength="2000" :class="FIELD" :placeholder="$t('maintenance.contractForm.notesPlaceholder')"></textarea>
        </div>
      </div>
    </form>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">{{ $t("common.actions.cancel") }}</UiButton>
      <UiButton type="submit" form="maintenance-contract-form" :loading="loading">{{ data ? $t("common.actions.saveChanges") : $t("maintenance.contractForm.create") }}</UiButton>
    </template>
  </UiModal>
</template>
