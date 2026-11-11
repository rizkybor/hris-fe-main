<script setup>
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { CalendarClock, ArrowLeft, MapPinned } from "lucide-vue-next";
import { useAttendanceSettingStore } from "@/stores/attendanceSetting";
import { RouterLink } from "vue-router";
import HolidayManager from "@/components/admin/attendance/HolidayManager.vue";
import { UiAlert, UiButton, UiPageHeader, UiSkeleton, UiSwitch } from "@/components/ui";

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
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Attendance Settings" subtitle="Control whether staff can Clock In/Out on Saturday & Sunday">
      <template #eyebrow>
        <RouterLink :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" aria-label="Back to Settings" title="Back to Settings">
          <ArrowLeft class="w-4 h-4" /> Settings
        </RouterLink>
      </template>
    </UiPageHeader>

    <!-- Weekend clock in/out -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4 lg:gap-10 p-4 sm:p-5 lg:p-6">
        <div>
          <div class="flex items-center gap-2">
            <CalendarClock class="w-4 h-4 text-ui-muted" />
            <h2 class="text-ui-h2 text-ui-ink">Weekend attendance</h2>
          </div>
          <p class="text-ui-small text-ui-muted mt-1">Saturday & Sunday Clock In/Out.</p>
        </div>
        <div>
          <UiSkeleton v-if="loading" height="64px" />
          <div v-else class="rounded-ui-card border border-ui-line px-4 py-3.5">
            <div class="flex items-start gap-4">
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink">Allow Weekend Clock In/Out</p>
                <p class="text-ui-small text-ui-muted mt-0.5">
                  By default, Clock In/Out is disabled every Saturday & Sunday since those aren't scheduled work
                  days. Turning this on lets staff clock in on weekends -- it's automatically recorded as
                  <strong class="text-ui-text font-medium">overtime (lembur)</strong>, not counted toward their regular attendance rate.
                </p>
                <p v-if="setting.updated_by?.name" class="text-ui-cap text-ui-faint mt-2">
                  Last changed by {{ setting.updated_by.name }}
                </p>
              </div>
              <UiSwitch
                class="mt-0.5"
                :model-value="!!setting.allow_weekend_check_in"
                :disabled="saving"
                aria-label="Allow Weekend Clock In/Out"
                @update:model-value="handleToggle"
              />
            </div>
          </div>

          <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" class="mt-3" />
          <UiAlert v-if="successMessage" tone="ok" :message="successMessage" class="mt-3" />
        </div>
      </div>
    </section>

    <!-- Office geofence -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4 lg:gap-10 p-4 sm:p-5 lg:p-6">
        <div>
          <div class="flex items-center gap-2">
            <MapPinned class="w-4 h-4 text-ui-muted" />
            <h2 class="text-ui-h2 text-ui-ink">Office Location & Radius</h2>
          </div>
          <p class="text-ui-small text-ui-muted mt-1">
            Employees whose Work Location is set to <strong class="text-ui-text font-medium">Office</strong> must Clock In within this radius of
            the office coordinates below. Remote/Hybrid employees are never checked against this.
          </p>
        </div>

        <div>
          <UiSkeleton v-if="loading" height="140px" />
          <div v-else class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="office-latitude" class="block text-ui-small font-medium text-ui-ink mb-1.5">Latitude</label>
                <input id="office-latitude" v-model="geofenceForm.office_latitude" type="number" step="0.00000001" placeholder="-6.34660080" class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus tabular-nums" />
              </div>
              <div>
                <label for="office-longitude" class="block text-ui-small font-medium text-ui-ink mb-1.5">Longitude</label>
                <input id="office-longitude" v-model="geofenceForm.office_longitude" type="number" step="0.00000001" placeholder="106.76173940" class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus tabular-nums" />
              </div>
            </div>

            <div class="sm:max-w-[240px]">
              <label for="office-radius" class="block text-ui-small font-medium text-ui-ink mb-1.5">Radius (meters)</label>
              <input id="office-radius" v-model="geofenceForm.office_radius_meters" type="number" step="1" min="10" max="5000" placeholder="150" class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus tabular-nums" />
            </div>

            <div class="flex flex-col-reverse sm:flex-row sm:items-center gap-2 pt-1">
              <UiButton variant="secondary" :icon="MapPinned" @click="useCurrentLocation">Use My Current Location</UiButton>
              <UiButton :loading="geofenceSaving" :disabled="geofenceSaving" @click="handleGeofenceSave">
                {{ geofenceSaving ? "Saving..." : "Save Location" }}
              </UiButton>
            </div>

            <UiAlert v-if="geofenceError" tone="bad" :message="geofenceError" />
            <UiAlert v-if="geofenceSuccess" tone="ok" :message="geofenceSuccess" />
          </div>
        </div>
      </div>
    </section>

    <HolidayManager />
  </div>
</template>
