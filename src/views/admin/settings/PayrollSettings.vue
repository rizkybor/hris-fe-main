<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Wallet, ArrowLeft } from "lucide-vue-next";
import { usePayrollSettingStore } from "@/stores/payrollSetting";
import { RouterLink } from "vue-router";

const store = usePayrollSettingStore();
const { setting, loading } = storeToRefs(store);

const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

onMounted(async () => {
  await store.fetchSetting();
});

const handleToggle = async () => {
  errorMessage.value = "";
  successMessage.value = "";
  saving.value = true;
  try {
    await store.updateSetting({
      attendance_exempt_roles_enabled: !setting.value.attendance_exempt_roles_enabled,
    });
    successMessage.value = "Payroll setting saved successfully.";
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Failed to save setting.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="px-4 py-4">
    <div class="flex items-center gap-3 mb-5">
      <RouterLink
        :to="{ name: 'admin.settings.dashboard' }"
        class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] shrink-0"
      >
        <ArrowLeft class="w-4 h-4 text-gray-600" />
      </RouterLink>
      <div class="w-11 h-11 bg-green-50 rounded-[12px] flex items-center justify-center shrink-0">
        <Wallet class="w-5 h-5 text-green-600" />
      </div>
      <div>
        <h3 class="text-brand-dark text-lg font-bold">Payroll Settings</h3>
        <p class="text-brand-light text-sm">Control how Payroll is automatically generated</p>
      </div>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 max-w-xl">
      <div v-if="loading" class="text-brand-light text-sm">Loading...</div>
      <div v-else class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <p class="text-brand-dark text-sm font-semibold mb-1">Attendance Exemption</p>
          <p class="text-brand-light text-xs">
            By default, generating Payroll requires an employee to have at least one attendance
            record for that month, or they're left out entirely. Turning this on keeps
            <strong>Manager, Finance, and Operational Director</strong> employees included even with
            zero attendance records -- full attendance is assumed for them, with no deduction.
            Everyone else still needs actual attendance records regardless of this setting.
          </p>
          <p v-if="setting.updated_by?.name" class="text-gray-400 text-xs mt-2">
            Last changed by {{ setting.updated_by.name }}
          </p>
        </div>
        <button
          type="button"
          @click="handleToggle"
          :disabled="saving"
          class="shrink-0 w-12 h-7 rounded-full transition-colors duration-200 relative disabled:opacity-50"
          :class="setting.attendance_exempt_roles_enabled ? 'bg-[#0C51D9]' : 'bg-gray-300'"
        >
          <span
            class="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200"
            :class="setting.attendance_exempt_roles_enabled ? 'translate-x-[22px]' : 'translate-x-0'"
          ></span>
        </button>
      </div>

      <p v-if="errorMessage" class="text-red-500 text-sm mt-4">{{ errorMessage }}</p>
      <p v-if="successMessage" class="text-green-600 text-sm mt-4">{{ successMessage }}</p>
    </div>
  </div>
</template>
