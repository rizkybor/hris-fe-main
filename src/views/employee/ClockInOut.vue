<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import {
  Clock,
  MapPin,
  Camera,
  Video,
  RotateCcw,
  LogIn,
  LogOut,
  Info,
  Globe,
  Building,
  AlertCircle,
  CheckCircle2,
  Circle,
  Timer,
} from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useAttendanceSettingStore } from "@/stores/attendanceSetting";
import { useAuthStore } from "@/stores/auth";
import { useAlertModalStore } from "@/stores/alertModal";
import { storeToRefs } from "pinia";
import { haversineDistanceMeters } from "@/utils/attendanceUtils";
import { UiAlert, UiBadge, UiButton, UiPageHeader, UiSpinner } from "@/components/ui";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const attendanceStore = useAttendanceStore();
const alertModal = useAlertModalStore();
const { loading, todayAttendance } = storeToRefs(attendanceStore);
const { checkIn, checkOut, fetchTodayAttendance } = attendanceStore;

const attendanceSettingStore = useAttendanceSettingStore();
const { setting: attendanceSetting } = storeToRefs(attendanceSettingStore);

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

// Only Work Location = Office employees are geofenced server-side (see
// AttendanceRepository::guardOfficeGeofence()) -- this mirrors that same
// condition so Remote/Hybrid employees aren't shown a distance check that
// will never actually apply to them.
const isOfficeWorker = computed(() => user.value?.employee_profile?.job_information?.work_location === "office");

const hasOfficeCoordinates = computed(
  () => attendanceSetting.value.office_latitude != null && attendanceSetting.value.office_longitude != null
);

// Sat/Sun aren't scheduled work days -- Clock In/Out is disabled on them
// unless Superadmin/Manager opened it up in Settings, in which case a
// weekend clock-in is recorded as overtime instead of a normal day.
const isWeekend = computed(() => {
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
});

const weekendCheckInBlocked = computed(() => isWeekend.value && !attendanceSetting.value.allow_weekend_check_in);

// State
const currentTime = ref("");
const currentDate = ref("");
const currentStream = ref(null);
const capturedPhotoData = ref(null);
const currentLocation = ref(null);
const locationStatus = ref("default");
// Location title/subtitle are kept as message keys (with params) so they
// follow the language switch; a reverse-geocoded address is shown as-is.
const locationName = ref({ key: "clock.location.notDetected" });
const locationAddress = ref({ key: "clock.location.notDetectedHint" });
const showLocationText = (entry) => (entry?.key ? t(entry.key, entry.params || {}) : entry?.text || "");
const locationCoords = ref("");
const isGettingLocation = ref(false);

const distanceFromOffice = computed(() => {
  if (!currentLocation.value || !hasOfficeCoordinates.value) return null;

  return Math.round(
    haversineDistanceMeters(
      Number(attendanceSetting.value.office_latitude),
      Number(attendanceSetting.value.office_longitude),
      currentLocation.value.latitude,
      currentLocation.value.longitude
    )
  );
});

const isWithinOfficeRadius = computed(() => {
  if (distanceFromOffice.value === null) return null;
  return distanceFromOffice.value <= (attendanceSetting.value.office_radius_meters ?? 150);
});

// Computed
const isCheckedIn = computed(() => {
  return todayAttendance.value?.check_in && !todayAttendance.value?.check_out;
});

// Clock Out is only allowed once a full 8-hour shift has elapsed since
// Clock In -- mirrors the same rule enforced server-side in
// AttendanceRepository::checkOut(). `currentTime` (ticking every second via
// updateClock) is read here purely to keep this reactive minute-by-minute.
const MIN_WORK_MINUTES_BEFORE_CHECK_OUT = 8 * 60;

const elapsedWorkMinutes = computed(() => {
  currentTime.value; // eslint-disable-line no-unused-expressions -- tick dependency
  if (!todayAttendance.value?.check_in) return 0;

  const checkInTime = new Date(todayAttendance.value.check_in);
  const endTime = todayAttendance.value.check_out
    ? new Date(todayAttendance.value.check_out)
    : new Date(); // Use current time if still checked in

  return Math.floor((endTime - checkInTime) / (1000 * 60));
});

const workingHours = computed(() => {
  const hours = Math.floor(elapsedWorkMinutes.value / 60);
  const minutes = elapsedWorkMinutes.value % 60;
  return t("clock.duration.hm", { h: hours, m: minutes });
});

const remainingUntilCheckOut = computed(() => {
  const remaining = MIN_WORK_MINUTES_BEFORE_CHECK_OUT - elapsedWorkMinutes.value;
  if (remaining <= 0) return null;
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  return t("clock.duration.hm", { h: hours, m: minutes });
});

const canCheckIn = computed(() => {
  return currentLocation.value && capturedPhotoData.value && !isCheckedIn.value && !weekendCheckInBlocked.value;
});

const canCheckOut = computed(() => {
  return (
    currentLocation.value &&
    capturedPhotoData.value &&
    isCheckedIn.value &&
    elapsedWorkMinutes.value >= MIN_WORK_MINUTES_BEFORE_CHECK_OUT
  );
});

const lateInfo = computed(() => {
  if (!todayAttendance.value || todayAttendance.value.status !== "late" || !todayAttendance.value.late_minutes) {
    return null;
  }
  const minutes = todayAttendance.value.late_minutes;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  const duration = hours > 0 ? t("clock.duration.hm", { h: hours, m: remaining }) : t("clock.duration.m", { m: remaining });
  return t("clock.late.notice", { duration });
});

const checkInTime = computed(() => {
  if (!todayAttendance.value?.check_in) return "--:--";
  return new Date(todayAttendance.value.check_in).toLocaleTimeString(localeTag(), {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
});

const checkOutTime = computed(() => {
  if (!todayAttendance.value?.check_out) return "--:--";
  return new Date(todayAttendance.value.check_out).toLocaleTimeString(localeTag(), {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
});

const attendanceStatus = computed(() => {
  if (!todayAttendance.value) {
    return { key: "notClockedIn", class: "bg-red-100 text-red-700" };
  }
  if (todayAttendance.value.status === "overtime") {
    return { key: "overtime", class: "bg-purple-100 text-purple-700" };
  }
  if (todayAttendance.value.check_in && !todayAttendance.value.check_out) {
    return todayAttendance.value.status === "late"
      ? { key: "clockedInLate", class: "bg-amber-100 text-amber-700" }
      : { key: "clockedIn", class: "bg-green-100 text-green-700" };
  }
  if (todayAttendance.value.check_in && todayAttendance.value.check_out) {
    return { key: "completed", class: "bg-blue-100 text-blue-700" };
  }
  return { key: "notClockedIn", class: "bg-red-100 text-red-700" };
});

// Presentation only: badge tone per status label, and the live clock split
// into hours:minutes and the (muted) seconds.
const STATUS_TONE = {
  notClockedIn: "neutral",
  overtime: "accent",
  clockedInLate: "warn",
  clockedIn: "ok",
  completed: "info",
};
const attendanceStatusTone = computed(() => STATUS_TONE[attendanceStatus.value.key] || "neutral");
const clockMain = computed(() => currentTime.value.slice(0, 5));
const clockSeconds = computed(() => currentTime.value.slice(5));
const LOCATION_TONE = {
  loading: "bg-ui-warn-soft text-ui-warn",
  success: "bg-ui-ok-soft text-ui-ok",
  error: "bg-ui-bad-soft text-ui-bad",
  default: "bg-ui-subtle text-ui-muted",
};

// Clock functions
const updateClock = () => {
  const now = new Date();

  const timeOptions = {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  currentTime.value = now.toLocaleTimeString(localeTag(), timeOptions);
  currentDate.value = now.toLocaleDateString(localeTag(), dateOptions);
};

// Location functions
const getCurrentLocation = async () => {
  if (!navigator.geolocation) {
    updateLocationDisplay("error", { key: "clock.location.unsupported" }, { key: "clock.location.unsupportedHint" });
    return;
  }

  updateLocationDisplay("loading", { key: "clock.location.getting" }, { key: "clock.location.gettingHint" });
  isGettingLocation.value = true;

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000,
  };

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const coords = position.coords;
      currentLocation.value = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: new Date().toISOString(),
      };

      updateLocationDisplay(
        "success",
        { key: "clock.location.detected" },
        { key: "clock.location.accuracy", params: { m: Math.round(coords.accuracy) } }
      );

      locationCoords.value = `Lat: ${coords.latitude.toFixed(6)}, Lng: ${coords.longitude.toFixed(6)}`;

      // Try reverse geocoding
      try {
        await reverseGeocode(coords.latitude, coords.longitude);
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
      }

      isGettingLocation.value = false;
    },
    (error) => {
      let errorKey = "";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorKey = "clock.location.errors.denied";
          break;
        case error.POSITION_UNAVAILABLE:
          errorKey = "clock.location.errors.unavailable";
          break;
        case error.TIMEOUT:
          errorKey = "clock.location.errors.timeout";
          break;
        default:
          errorKey = "clock.location.errors.unknown";
          break;
      }

      updateLocationDisplay("error", { key: "clock.location.failed" }, { key: errorKey });
      isGettingLocation.value = false;
    },
    options
  );
};

const updateLocationDisplay = (status, name, address) => {
  locationStatus.value = status;
  locationName.value = name;
  locationAddress.value = address;
};

const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    if (data && data.display_name) {
      const parts = data.display_name.split(",");
      const shortAddress = parts.slice(0, 3).join(",").trim();
      locationAddress.value = { text: shortAddress };
    }
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
  }
};

// Camera functions
const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    currentStream.value = stream;
    const video = document.getElementById("webcamPreview");
    video.srcObject = stream;
  } catch (error) {
    console.error("Error accessing camera:", error);
    await alertModal.alert(t("clock.camera.error"), {
      type: "danger",
    });
  }
};

const capturePhoto = () => {
  const video = document.getElementById("webcamPreview");
  const canvas = document.getElementById("photoCanvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  capturedPhotoData.value = canvas.toDataURL("image/jpeg", 0.8);

  if (currentStream.value) {
    currentStream.value.getTracks().forEach((track) => track.stop());
    currentStream.value = null;
  }
};

const retakePhoto = () => {
  capturedPhotoData.value = null;
  if (currentStream.value) {
    currentStream.value.getTracks().forEach((track) => track.stop());
    currentStream.value = null;
  }
};

// Attendance actions
const handleCheckIn = async () => {
  if (!currentLocation.value) {
    await alertModal.alert(t("clock.alerts.needLocation"), { type: "warning" });
    return;
  }

  if (!capturedPhotoData.value) {
    await alertModal.alert(t("clock.alerts.needPhotoIn"), { type: "warning" });
    return;
  }

  try {
    const attendance = await checkIn({
      check_in_lat: currentLocation.value.latitude,
      check_in_long: currentLocation.value.longitude,
      check_in_photo: capturedPhotoData.value,
    });

    if (attendance?.status === "overtime") {
      await alertModal.alert(t("clock.alerts.overtimeIn"), { type: "success", celebrate: true });
    } else if (attendance?.status === "late" && attendance?.late_minutes) {
      await alertModal.alert(t("clock.alerts.lateIn", { n: attendance.late_minutes }, attendance.late_minutes), { type: "warning" });
    } else {
      await alertModal.alert(t("clock.alerts.successIn"), { type: "success", celebrate: true });
    }
    resetForNextAction();
    await fetchTodayAttendance();
  } catch (error) {
    console.error("Check in failed:", error);
    const message = error?.response?.data?.message || t("clock.alerts.failedIn");
    await alertModal.alert(message, { type: "danger" });
  }
};

const handleCheckOut = async () => {
  if (!currentLocation.value) {
    await alertModal.alert(t("clock.alerts.needLocation"), { type: "warning" });
    return;
  }

  if (!capturedPhotoData.value) {
    await alertModal.alert(t("clock.alerts.needPhotoOut"), { type: "warning" });
    return;
  }

  try {
    await checkOut({
      check_out_lat: currentLocation.value.latitude,
      check_out_long: currentLocation.value.longitude,
      check_out_photo: capturedPhotoData.value,
    });

    await alertModal.alert(t("clock.alerts.successOut"), { type: "success", celebrate: true });
    resetForNextAction();
    await fetchTodayAttendance();
  } catch (error) {
    console.error("Check out failed:", error);
    const message = error?.response?.data?.message || t("clock.alerts.failedOut");
    await alertModal.alert(message, { type: "danger" });
  }
};

const resetForNextAction = () => {
  retakePhoto();
  currentLocation.value = null;
  updateLocationDisplay("default", { key: "clock.location.notDetected" }, { key: "clock.location.againHint" });
  locationCoords.value = "";
};

// Lifecycle
let clockInterval;

onMounted(async () => {
  await Promise.all([fetchTodayAttendance(), attendanceSettingStore.fetchSetting()]);
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
  if (currentStream.value) {
    currentStream.value.getTracks().forEach((track) => track.stop());
  }
});
</script>


<template>
  <!-- Bottom padding below lg: main's own bottom padding (room for the tab
       bar) is lost once the page overflows its h-full wrapper. -->
  <div class="p-1 sm:p-3 lg:p-5 space-y-4 sm:space-y-5">
    <UiPageHeader :title="$t('clock.title')" class="ui-anim-fade-up">
      <template #subtitle>
        {{ currentDate }}
        <span class="inline-flex items-center gap-1 ml-1.5 text-ui-faint"><Globe class="w-3.5 h-3.5" /> GMT+7</span>
      </template>
      <template #actions>
        <UiBadge :tone="attendanceStatusTone" dot>{{ $t(`clock.status.${attendanceStatus.key}`) }}</UiBadge>
      </template>
    </UiPageHeader>

    <div
      class="ui-anim-fade-up bg-ui-surface border border-ui-line rounded-ui-card p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 sm:gap-6"
    >
      <!-- Camera -->
      <div
        class="relative bg-ui-ink rounded-[10px] overflow-hidden aspect-[4/3] sm:aspect-video lg:aspect-auto lg:min-h-[460px]"
      >
        <video
          id="webcamPreview"
          :class="{ hidden: !currentStream || capturedPhotoData }"
          class="absolute inset-0 w-full h-full object-cover"
          autoplay
          muted
          playsinline
        ></video>
        <canvas id="photoCanvas" class="hidden"></canvas>

        <img
          v-if="capturedPhotoData"
          :src="capturedPhotoData"
          class="absolute inset-0 w-full h-full object-cover"
          :alt="$t('clock.camera.capturedAlt')"
        />

        <!-- Face guide -->
        <div
          v-if="!capturedPhotoData"
          class="absolute inset-0 flex flex-col items-center justify-center gap-4 pb-12 pointer-events-none"
        >
          <div
            class="w-[38%] max-w-[180px] aspect-[3/4] rounded-[50%] border-2 border-dashed border-white/40"
            aria-hidden="true"
          ></div>
          <p v-if="!currentStream" class="text-ui-small text-white/70 text-center px-4 flex items-center gap-1.5">
            <Camera class="w-4 h-4 shrink-0" /> {{ $t("clock.camera.previewHint") }}
          </p>
        </div>

        <div v-if="capturedPhotoData" class="absolute top-3 left-3">
          <UiBadge tone="ok" dot>{{ $t("clock.camera.captured") }}</UiBadge>
        </div>

        <!-- Camera controls -->
        <div class="absolute inset-x-0 bottom-0 p-3 sm:p-4 flex justify-center">
          <UiButton v-if="!capturedPhotoData && !currentStream" variant="secondary" :icon="Video" @click="startCamera">
            {{ $t("clock.camera.start") }}
          </UiButton>
          <UiButton v-else-if="!capturedPhotoData && currentStream" variant="secondary" size="lg" :icon="Camera" @click="capturePhoto">
            {{ $t("clock.camera.take") }}
          </UiButton>
          <UiButton v-else variant="secondary" :icon="RotateCcw" @click="retakePhoto">{{ $t("clock.camera.retake") }}</UiButton>
        </div>
      </div>

      <!-- Details + action -->
      <div class="flex flex-col gap-4 min-w-0">
        <!-- Live clock -->
        <div class="flex items-end justify-between gap-3">
          <div class="min-w-0">
            <p class="text-ui-over uppercase text-ui-faint flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5" /> {{ $t("clock.liveClock") }} &middot; Jakarta
            </p>
            <p class="text-ui-display text-ui-ink tabular-nums mt-1">
              {{ clockMain }}<span class="text-ui-faint">{{ clockSeconds }}</span>
            </p>
          </div>
        </div>

        <!-- Today's status -->
        <div>
          <p class="text-ui-over uppercase text-ui-faint mb-2">{{ $t("clock.todayStatus") }}</p>
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-ui-subtle rounded-ui-control px-3 py-2.5 min-w-0">
              <p class="text-ui-cap text-ui-muted">{{ $t("clock.clockIn") }}</p>
              <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5 truncate">{{ checkInTime }}</p>
            </div>
            <div class="bg-ui-subtle rounded-ui-control px-3 py-2.5 min-w-0">
              <p class="text-ui-cap text-ui-muted">{{ $t("clock.clockOut") }}</p>
              <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5 truncate">{{ checkOutTime }}</p>
            </div>
            <div class="bg-ui-subtle rounded-ui-control px-3 py-2.5 min-w-0">
              <p class="text-ui-cap text-ui-muted">{{ $t("clock.worked") }}</p>
              <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5 truncate">{{ workingHours }}</p>
            </div>
          </div>
        </div>

        <!-- Location -->
        <div class="border border-ui-line rounded-ui-card p-3.5 sm:p-4 space-y-3">
          <div class="flex items-start gap-3">
            <div
              class="w-9 h-9 rounded-ui-control flex items-center justify-center shrink-0"
              :class="LOCATION_TONE[locationStatus] || LOCATION_TONE.default"
            >
              <UiSpinner v-if="locationStatus === 'loading'" size="16px" :center="false" />
              <AlertCircle v-else-if="locationStatus === 'error'" class="w-[18px] h-[18px]" />
              <MapPin v-else class="w-[18px] h-[18px]" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-ui-h3 text-ui-ink break-words">{{ showLocationText(locationName) }}</p>
              <p class="text-ui-small text-ui-muted break-words">{{ showLocationText(locationAddress) }}</p>
              <p v-if="locationCoords" class="text-ui-cap text-ui-faint font-mono mt-1 break-words">{{ locationCoords }}</p>
            </div>
          </div>

          <!-- Office Location Reference -- only meaningful for Work
               Location = Office employees, who are the only ones actually
               geofenced server-side (see AttendanceRepository::
               guardOfficeGeofence()). -->
          <div
            v-if="isOfficeWorker && hasOfficeCoordinates"
            class="flex items-start gap-3 pt-3 border-t border-ui-line"
          >
            <div class="w-9 h-9 rounded-ui-control bg-ui-accent-soft text-ui-accent flex items-center justify-center shrink-0">
              <Building class="w-[18px] h-[18px]" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-ui-h3 text-ui-ink">{{ $t("clock.office.radius", { m: attendanceSetting.office_radius_meters ?? 150 }) }}</p>
              <p
                v-if="distanceFromOffice !== null"
                class="text-ui-small break-words"
                :class="isWithinOfficeRadius ? 'text-ui-ok' : 'text-ui-bad'"
              >
                {{ $t("clock.office.distance", { m: distanceFromOffice }) }} --
                {{ isWithinOfficeRadius ? $t("clock.office.withinRange") : $t("clock.office.outsideRange") }}
              </p>
              <p v-else class="text-ui-small text-ui-muted break-words">
                {{ $t("clock.office.getLocationHint") }}
              </p>
            </div>
          </div>

          <UiButton variant="secondary" block :icon="MapPin" :loading="isGettingLocation" @click="getCurrentLocation">
            {{ isGettingLocation ? $t("clock.location.gettingButton") : currentLocation ? $t("clock.location.refresh") : $t("clock.location.get") }}
          </UiButton>
        </div>

        <!-- Readiness Checklist -->
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <li
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-ui-control border"
            :class="currentLocation ? 'bg-ui-ok-soft border-ui-ok/20' : 'bg-ui-surface border-ui-line'"
          >
            <CheckCircle2 v-if="currentLocation" class="w-[18px] h-[18px] text-ui-ok shrink-0" />
            <Circle v-else class="w-[18px] h-[18px] text-ui-faint shrink-0" />
            <span class="text-ui-small font-medium" :class="currentLocation ? 'text-ui-ok' : 'text-ui-muted'">
              {{ $t("clock.location.detected") }}
            </span>
          </li>
          <li
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-ui-control border"
            :class="capturedPhotoData ? 'bg-ui-ok-soft border-ui-ok/20' : 'bg-ui-surface border-ui-line'"
          >
            <CheckCircle2 v-if="capturedPhotoData" class="w-[18px] h-[18px] text-ui-ok shrink-0" />
            <Circle v-else class="w-[18px] h-[18px] text-ui-faint shrink-0" />
            <span class="text-ui-small font-medium" :class="capturedPhotoData ? 'text-ui-ok' : 'text-ui-muted'">
              {{ $t("clock.camera.captured") }}
              <span v-if="!capturedPhotoData" class="font-normal text-ui-bad">{{ $t("clock.requiredTag") }}</span>
            </span>
          </li>
        </ul>

        <!-- Weekend blocked notice -->
        <UiAlert v-if="weekendCheckInBlocked && !isCheckedIn" tone="bad">
          {{ $t("clock.weekend.blocked") }}
        </UiAlert>

        <!-- Overtime notice (weekend, but allowed) -->
        <UiAlert v-else-if="isWeekend && !isCheckedIn" tone="info">
          {{ $t("clock.weekend.overtime") }}
        </UiAlert>

        <!-- Late arrival notice -->
        <UiAlert v-if="lateInfo" tone="warn">{{ lateInfo }}</UiAlert>

        <!-- Action: sticks just above the tab bar on phones so it stays in
             thumb reach (sticky offsets count from main's bottom padding,
             which already clears the tab bar). -->
        <div
          class="mt-auto sticky -bottom-4 lg:static z-10 -mx-3 sm:mx-0 px-3 sm:px-0 pt-3 pb-1 lg:pt-1 bg-ui-surface border-t border-ui-line lg:border-0 space-y-3"
        >
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="text-ui-h2 text-ui-ink">
              {{ isCheckedIn ? $t("clock.ready.out") : $t("clock.ready.in") }}
            </h2>
            <p class="hidden sm:block text-ui-small text-ui-muted text-right">
              {{ isCheckedIn ? $t("clock.ready.outHint") : $t("clock.ready.inHint") }}
            </p>
          </div>

          <UiButton
            v-if="!isCheckedIn"
            size="lg"
            block
            class="h-[52px]"
            :icon="LogIn"
            :loading="loading"
            :disabled="!canCheckIn"
            @click="handleCheckIn"
          >
            {{ loading ? $t("clock.processing") : $t("clock.clockIn") }}
          </UiButton>
          <UiButton
            v-else
            size="lg"
            block
            class="h-[52px]"
            :icon="LogOut"
            :loading="loading"
            :disabled="!canCheckOut"
            @click="handleCheckOut"
          >
            {{ loading ? $t("clock.processing") : $t("clock.clockOut") }}
          </UiButton>

          <p v-if="isCheckedIn && remainingUntilCheckOut" class="text-ui-small text-ui-warn text-center flex items-center justify-center gap-1.5">
            <Timer class="w-4 h-4 shrink-0" />
            {{ $t("clock.checkOutAvailableIn", { duration: remainingUntilCheckOut }) }}
          </p>
          <p class="text-ui-cap text-ui-muted text-center flex items-center justify-center gap-1.5">
            <Info class="w-3.5 h-3.5 shrink-0" />
            {{ $t("clock.footerHint") }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
