<script setup>
import BaseInput from "@/components/common/form/Input.vue";
import BaseSelect from "@/components/common/form/Select.vue";
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
  <div>
    <BaseSelect
      id="usage_status"
      label="Status"
      placeholder="Pilih status"
      v-model="status"
      :options="OPERATIONAL_COST_STATUSES"
      :required="!readonly"
      :readonly="readonly"
    />
    <p v-if="errors.status" class="text-red-500 text-sm mt-1">{{ errors.status }}</p>
    <p v-else-if="!readonly" class="text-gray-400 text-xs mt-1">
      Hanya item berstatus Digunakan yang dihitung ke total Operational Cost.
    </p>
  </div>

  <div>
    <BaseInput
      id="expired_date"
      type="date"
      :label="status === 'active' ? 'Expired' : 'Expired (opsional)'"
      v-model="expiredDate"
      :readonly="readonly"
      :required="!readonly && status === 'active'"
    />
    <p v-if="errors.expired_date" class="text-red-500 text-sm mt-1">{{ errors.expired_date }}</p>
  </div>
</template>
