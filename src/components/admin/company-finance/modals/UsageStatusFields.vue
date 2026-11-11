<script setup>
import { UiInput, UiSelect } from "@/components/ui";
import { OPERATIONAL_COST_STATUSES } from "@/utils/operationalCostStatus";

// Status + Expired pair used by every Operational Cost form. Expired is
// required only while the item is in use ("Digunakan").
defineProps({
  readonly: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
});

const status = defineModel("status", { type: String, default: "active" });
const expiredDate = defineModel("expiredDate", { type: String, default: "" });
</script>

<template>
  <UiSelect
    id="usage_status"
    label="Status"
    placeholder="Pilih status"
    v-model="status"
    :options="OPERATIONAL_COST_STATUSES"
    :required="!readonly"
    :disabled="readonly"
    :error="errors.status"
    :hint="readonly ? '' : 'Hanya item berstatus Digunakan yang dihitung ke total Operational Cost.'"
  />

  <UiInput
    id="expired_date"
    type="date"
    :label="status === 'active' ? 'Expired' : 'Expired (opsional)'"
    v-model="expiredDate"
    :readonly="readonly"
    :required="!readonly && status === 'active'"
    :error="errors.expired_date"
  />
</template>
