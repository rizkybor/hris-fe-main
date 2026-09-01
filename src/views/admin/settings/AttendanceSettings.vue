<script setup>
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { CalendarClock, ArrowLeft, MapPinned } from "lucide-vue-next";
import { useAttendanceSettingStore } from "@/stores/attendanceSetting";
import { RouterLink } from "vue-router";

const store = useAttendanceSettingStore();
const { setting, loading } = storeToRefs(store);

const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const geofenceSaving = ref(false);
const geofenceError = ref("");
const geofenceSuccess = ref("");
const geofenceForm = ref({
  office_latitude: "",
  office_longitude: "",
  office_radius_meters: "",
});

onMounted(async () => {
  await store.fetchSetting();
});

// Populate the editable geofence form whenever the fetched setting changes
// (initial load, and after a save round-trips through the API) -- kept
// separate from the form itself so typing doesn't get clobbered mid-edit.
watch(
  setting,
  (value) => {
    geofenceForm.value = {
      office_latitude: value.office_latitude ?? "",
      office_longitude: value.office_longitude ?? "",
      office_radius_meters: value.office_radius_meters ?? "",
    };
  },
  { immediate: true }
);

const handleToggle = async () => {
  errorMessage.value = "";
  successMessage.value = "";
  saving.value = true;
  try {
    await store.updateSetting({ allow_weekend_check_in: !setting.value.allow_weekend_check_in });
    successMessage.value = "Attendance setting saved successfully.";
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Failed to save setting.";
  } finally {
    saving.value = false;
  }
};

const handleGeofenceSave = async () => {
  geofenceError.value = "";
  geofenceSuccess.value = "";
  geofenceSaving.value = true;
  try {
    await store.updateSetting({
      office_latitude: geofenceForm.value.office_latitude,
      office_longitude: geofenceForm.value.office_longitude,
      office_radius_meters: geofenceForm.value.office_radius_meters,
    });
    geofenceSuccess.value = "Office location saved successfully.";
  } catch (error) {
    geofenceError.value = error?.response?.data?.message || "Failed to save office location.";
  } finally {
    geofenceSaving.value = false;
  }
};

// Prefills the form from the browser's own current position -- handy when
// setting this up from inside the office itself.
const useCurrentLocation = () => {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition((position) => {
    geofenceForm.value.office_latitude = position.coords.latitude.toFixed(8);
    geofenceForm.value.office_longitude = position.coords.longitude.toFixed(8);
  });
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

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 max-w-xl mt-5">
      <div class="flex items-center gap-2 mb-3">
        <MapPinned class="w-4 h-4 text-indigo-600" />
        <p class="text-brand-dark text-sm font-semibold">Office Location & Radius</p>
      </div>
      <p class="text-brand-light text-xs mb-4">
        Employees whose Work Location is set to <strong>Office</strong> must Clock In within this radius of
        the office coordinates below. Remote/Hybrid employees are never checked against this.
      </p>

      <div v-if="loading" class="text-brand-light text-sm">Loading...</div>
      <div v-else class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-brand-dark text-xs font-medium mb-1 block">Latitude</label>
            <input
              v-model="geofenceForm.office_latitude"
              type="number"
              step="0.00000001"
              placeholder="-6.34660080"
              class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]"
            />
          </div>
          <div>
            <label class="text-brand-dark text-xs font-medium mb-1 block">Longitude</label>
            <input
              v-model="geofenceForm.office_longitude"
              type="number"
              step="0.00000001"
              placeholder="106.76173940"
              class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]"
            />
          </div>
        </div>

        <div>
          <label class="text-brand-dark text-xs font-medium mb-1 block">Radius (meters)</label>
          <input
            v-model="geofenceForm.office_radius_meters"
            type="number"
            step="1"
            min="10"
            max="5000"
            placeholder="150"
            class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]"
          />
        </div>

        <div class="flex items-center gap-3 pt-1">
          <button
            type="button"
            @click="handleGeofenceSave"
            :disabled="geofenceSaving"
            class="btn-secondary rounded-[10px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2 disabled:opacity-50"
          >
            <span class="text-brand-white text-xs font-semibold">
              {{ geofenceSaving ? "Saving..." : "Save Location" }}
            </span>
          </button>
          <button
            type="button"
            @click="useCurrentLocation"
            class="border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] px-4 py-2 text-brand-dark text-xs font-medium"
          >
            Use My Current Location
          </button>
        </div>

        <p v-if="geofenceError" class="text-red-500 text-sm mt-2">{{ geofenceError }}</p>
        <p v-if="geofenceSuccess" class="text-green-600 text-sm mt-2">{{ geofenceSuccess }}</p>
      </div>
    </div>
  </div>
</template>
