<script setup>
import { UiInput, UiSelect } from "@/components/ui";
import { computed } from "vue";
import { operationalCostStatuses } from "@/utils/operationalCostStatus";
import { useI18n } from "vue-i18n";

// Status + Expired pair used by every Operational Cost form. Expired is
// required only while the item is in use ("Digunakan").
defineProps({
  readonly: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
});

const status = defineModel("status", { type: String, default: "active" });
const expiredDate = defineModel("expiredDate", { type: String, default: "" });

const { locale } = useI18n();
const statusOptions = computed(() => (locale.value, operationalCostStatuses()));
</script>

<template>
  <UiSelect
    id="usage_status"
    :label="$t('common.labels.status')"
    :placeholder="$t('finance.modals.usage.statusPlaceholder')"
    v-model="status"
    :options="statusOptions"
    :required="!readonly"
    :disabled="readonly"
    :error="errors.status"
    :hint="readonly ? '' : $t('finance.modals.usage.statusHint')"
  />

  <UiInput
    id="expired_date"
    type="date"
    :label="status === 'active' ? $t('finance.modals.usage.expired') : $t('finance.modals.usage.expiredOptional')"
    v-model="expiredDate"
    :readonly="readonly"
    :required="!readonly && status === 'active'"
    :error="errors.expired_date"
  />
</template>
