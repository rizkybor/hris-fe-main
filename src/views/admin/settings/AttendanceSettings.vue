<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { CalendarClock, ArrowLeft } from "lucide-vue-next";
import { useAttendanceSettingStore } from "@/stores/attendanceSetting";
import { RouterLink } from "vue-router";

const store = useAttendanceSettingStore();
const { setting, loading } = storeToRefs(store);

const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

onMounted(() => {
  store.fetchSetting();
});

const handleToggle = async () => {
  errorMessage.value = "";
  successMessage.value = "";
  saving.value = true;
  try {
    await store.updateSetting(!setting.value.allow_weekend_check_in);
    successMessage.value = "Attendance setting saved successfully.";
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
      <div class="w-11 h-11 bg-indigo-50 rounded-[12px] flex items-center justify-center shrink-0">
        <CalendarClock class="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <h3 class="text-brand-dark text-lg font-bold">Attendance Settings</h3>
        <p class="text-brand-light text-sm">Control whether staff can Clock In/Out on Saturday & Sunday</p>
      </div>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 max-w-xl">
      <div v-if="loading" class="text-brand-light text-sm">Loading...</div>
      <div v-else class="flex items-start justify-between gap-4">
        <div>
          <p class="text-brand-dark text-sm font-semibold mb-1">Allow Weekend Clock In/Out</p>
          <p class="text-brand-light text-xs">
            By default, Clock In/Out is disabled every Saturday & Sunday since those aren't scheduled work
            days. Turning this on lets staff clock in on weekends -- it's automatically recorded as
            <strong>overtime (lembur)</strong>, not counted toward their regular attendance rate.
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
          :class="setting.allow_weekend_check_in ? 'bg-[#0C51D9]' : 'bg-gray-300'"
        >
          <span
            class="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200"
            :class="setting.allow_weekend_check_in ? 'translate-x-[22px]' : 'translate-x-0.5'"
          ></span>
        </button>
      </div>

      <p v-if="errorMessage" class="text-red-500 text-sm mt-4">{{ errorMessage }}</p>
      <p v-if="successMessage" class="text-green-600 text-sm mt-4">{{ successMessage }}</p>
    </div>
  </div>
</template>
