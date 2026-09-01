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
  Loader2,
  AlertCircle,
  UserCheck,
  CheckCircle2,
  Circle,
  Timer,
  CalendarOff,
  Zap,
} from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useAttendanceSettingStore } from "@/stores/attendanceSetting";
import { useAuthStore } from "@/stores/auth";
import { useAlertModalStore } from "@/stores/alertModal";
import { storeToRefs } from "pinia";
import { haversineDistanceMeters } from "@/utils/attendanceUtils";

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
const locationName = ref("Location not detected");
const locationAddress = ref("Click 'Get Location' to detect your current position");
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
  return `${hours}h ${minutes}m`;
});

const remainingUntilCheckOut = computed(() => {
  const remaining = MIN_WORK_MINUTES_BEFORE_CHECK_OUT - elapsedWorkMinutes.value;
  if (remaining <= 0) return null;
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  return `${hours}h ${minutes}m`;
});

const canCheckIn = computed(() => {
  return currentLocation.value && capturedPhotoData.value && !isCheckedIn.value && !weekendCheckInBlocked.value;
});

const canCheckOut = computed(() => {
  return (
    currentLocation.value &&
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
  const duration = hours > 0 ? `${hours}h ${remaining}m` : `${remaining}m`;
  return `Terlambat ${duration} (batas jam masuk 09:00 WIB)`;
});

const checkInTime = computed(() => {
  if (!todayAttendance.value?.check_in) return "--:--";
  return new Date(todayAttendance.value.check_in).toLocaleTimeString("id-ID", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
});

const checkOutTime = computed(() => {
  if (!todayAttendance.value?.check_out) return "--:--";
  return new Date(todayAttendance.value.check_out).toLocaleTimeString("id-ID", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
});

const attendanceStatus = computed(() => {
  if (!todayAttendance.value) {
    return { text: "Not Clocked In", class: "bg-red-100 text-red-700" };
  }
  if (todayAttendance.value.status === "overtime") {
    return { text: "Overtime (Lembur)", class: "bg-purple-100 text-purple-700" };
  }
  if (todayAttendance.value.check_in && !todayAttendance.value.check_out) {
    return todayAttendance.value.status === "late"
      ? { text: "Clocked In (Late)", class: "bg-amber-100 text-amber-700" }
      : { text: "Clocked In", class: "bg-green-100 text-green-700" };
  }
  if (todayAttendance.value.check_in && todayAttendance.value.check_out) {
    return { text: "Completed", class: "bg-blue-100 text-blue-700" };
  }
  return { text: "Not Clocked In", class: "bg-red-100 text-red-700" };
});

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

  currentTime.value = now.toLocaleTimeString("id-ID", timeOptions);
  currentDate.value = now.toLocaleDateString("id-ID", dateOptions);
};

// Location functions
const getCurrentLocation = async () => {
  if (!navigator.geolocation) {
    updateLocationDisplay(
      "error",
      "Geolocation not supported",
      "Your browser does not support location services"
    );
    return;
  }

  updateLocationDisplay(
    "loading",
    "Getting location...",
    "Please wait while we detect your position"
  );
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
        "Location detected",
        `Accuracy: ±${Math.round(coords.accuracy)}m`
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
      let errorMessage = "";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied. Please enable location permissions.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          break;
        default:
          errorMessage = "An unknown error occurred while retrieving location.";
          break;
      }

      updateLocationDisplay("error", "Location failed", errorMessage);
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
      locationAddress.value = shortAddress;
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
    await alertModal.alert("Unable to access camera. Please check permissions and try again.", {
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
    await alertModal.alert("Please get your current location first!", { type: "warning" });
    return;
  }

  if (!capturedPhotoData.value) {
    await alertModal.alert("Please take a photo before clocking in.", { type: "warning" });
    return;
  }

  try {
    const attendance = await checkIn({
      check_in_lat: currentLocation.value.latitude,
      check_in_long: currentLocation.value.longitude,
      check_in_photo: capturedPhotoData.value,
    });

    if (attendance?.status === "overtime") {
      await alertModal.alert("Clocked in for overtime (lembur) -- today is a weekend.", { type: "success" });
    } else if (attendance?.status === "late" && attendance?.late_minutes) {
      await alertModal.alert(`Clocked in, but you're late by ${attendance.late_minutes} minute(s) (cut-off is 09:00 WIB).`, { type: "warning" });
    } else {
      await alertModal.alert("Successfully clocked in!", { type: "success" });
    }
    resetForNextAction();
    await fetchTodayAttendance();
  } catch (error) {
    console.error("Check in failed:", error);
    const message = error?.response?.data?.message || "Failed to check in. Please try again.";
    await alertModal.alert(message, { type: "danger" });
  }
};

const handleCheckOut = async () => {
  if (!currentLocation.value) {
    await alertModal.alert("Please get your current location first!", { type: "warning" });
    return;
  }

  try {
    await checkOut({
      check_out_lat: currentLocation.value.latitude,
      check_out_long: currentLocation.value.longitude,
    });

    await alertModal.alert("Successfully clocked out!", { type: "success" });
    resetForNextAction();
    await fetchTodayAttendance();
  } catch (error) {
    console.error("Check out failed:", error);
    const message = error?.response?.data?.message || "Failed to check out. Please try again.";
    await alertModal.alert(message, { type: "danger" });
  }
};

const resetForNextAction = () => {
  retakePhoto();
  currentLocation.value = null;
  updateLocationDisplay(
    "default",
    "Location not detected",
    "Please get location again for next attendance action"
  );
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
  <div class="p-3 sm:p-5">
    <!-- Hero: Live Clock + Today's Status -->
    <div class="main-card rounded-[14px] mb-4 sm:mb-6 p-5 sm:p-8 relative overflow-hidden">
      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6 sm:gap-8">
        <!-- Live Clock -->
        <div class="flex-1 text-center lg:text-left">
          <div class="flex items-center justify-center lg:justify-start gap-2 mb-3">
            <div class="w-8 h-8 sm:w-9 sm:h-9 bg-white/10 rounded-[10px] flex items-center justify-center shrink-0">
              <Clock class="w-4 h-4 text-white" />
            </div>
            <p class="text-brand-white-70 text-xs sm:text-sm font-semibold uppercase tracking-wide">
              Live Clock &middot; Jakarta
            </p>
          </div>
          <div class="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tabular-nums leading-none mb-2 break-all">
            {{ currentTime }}
          </div>
          <div class="flex flex-wrap items-center justify-center lg:justify-start gap-x-2 gap-y-1 text-brand-white-80">
            <span class="text-sm sm:text-lg font-medium">{{ currentDate }}</span>
            <span class="text-brand-white-70 text-sm hidden sm:inline">&bull;</span>
            <span class="flex items-center gap-1 text-xs sm:text-sm">
              <Globe class="w-3.5 h-3.5" /> GMT+7
            </span>
          </div>
        </div>

        <!-- Today's Status -->
        <div class="w-full lg:w-auto lg:min-w-[320px]">
          <div class="flex items-center justify-between mb-3 sm:mb-4">
            <p class="text-brand-white-70 text-xs sm:text-sm font-semibold uppercase tracking-wide">
              Today's Status
            </p>
            <span
              :class="attendanceStatus.class"
              class="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap"
            >
              {{ attendanceStatus.text }}
            </span>
          </div>
          <div class="grid grid-cols-3 gap-2 sm:gap-3">
            <div class="bg-white/10 backdrop-blur-sm rounded-[12px] p-2.5 sm:p-3 text-center">
              <p class="text-brand-white-70 text-[10px] sm:text-xs font-medium mb-1">Clock In</p>
              <p class="text-white text-sm sm:text-lg font-bold tabular-nums">{{ checkInTime }}</p>
            </div>
            <div class="bg-white/10 backdrop-blur-sm rounded-[12px] p-2.5 sm:p-3 text-center">
              <p class="text-brand-white-70 text-[10px] sm:text-xs font-medium mb-1">Clock Out</p>
              <p class="text-white text-sm sm:text-lg font-bold tabular-nums">{{ checkOutTime }}</p>
            </div>
            <div class="bg-white/10 backdrop-blur-sm rounded-[12px] p-2.5 sm:p-3 text-center">
              <p class="text-brand-white-70 text-[10px] sm:text-xs font-medium mb-1">Worked</p>
              <p class="text-white text-sm sm:text-lg font-bold tabular-nums">{{ workingHours }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Location and Actions Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 items-start">
      <!-- Location and Camera -->
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-6"
      >
        <div class="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
          <div
            class="w-7 h-7 sm:w-9 sm:h-9 bg-blue-600 rounded-full flex items-center justify-center shrink-0 text-white text-xs sm:text-sm font-bold"
          >
            1
          </div>
          <div
            class="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-[12px] flex items-center justify-center shrink-0"
          >
            <MapPin class="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base sm:text-base font-bold truncate">Location & Photo</h3>
            <p class="text-brand-light text-xs sm:text-sm truncate">Verify where you're working from</p>
          </div>
        </div>

        <!-- Location Info -->
        <div class="mb-6">
          <!-- Current Location Display -->
          <div
            :class="{
              'bg-yellow-50': locationStatus === 'loading',
              'bg-green-50': locationStatus === 'success',
              'bg-red-50': locationStatus === 'error',
              'bg-white': locationStatus === 'default',
            }"
            class="p-3 sm:p-4 rounded-[12px] border border-[#DCDEDD] mb-3"
          >
            <div class="flex items-start sm:items-center gap-3">
              <Loader2
                v-if="locationStatus === 'loading'"
                class="w-5 h-5 text-yellow-600 animate-spin shrink-0 mt-0.5 sm:mt-0"
              />
              <MapPin
                v-else-if="locationStatus === 'success'"
                class="w-5 h-5 text-green-600 shrink-0 mt-0.5 sm:mt-0"
              />
              <AlertCircle
                v-else-if="locationStatus === 'error'"
                class="w-5 h-5 text-red-600 shrink-0 mt-0.5 sm:mt-0"
              />
              <MapPin v-else class="w-5 h-5 text-gray-600 shrink-0 mt-0.5 sm:mt-0" />

              <div class="flex-1 min-w-0">
                <p class="text-brand-dark text-sm sm:text-base font-semibold break-words">
                  {{ locationName }}
                </p>
                <p class="text-brand-light text-xs sm:text-sm break-words">{{ locationAddress }}</p>
                <p v-if="locationCoords" class="text-brand-light text-[11px] sm:text-xs mt-1 break-words">
                  {{ locationCoords }}
                </p>
              </div>
            </div>
          </div>

          <!-- Get Location Button -->
          <button
            @click="getCurrentLocation"
            :disabled="isGettingLocation"
            class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 sm:px-8 py-3.5 sm:py-4 flex items-center justify-center gap-3 disabled:opacity-50 mb-3 disabled:cursor-not-allowed"
          >
            <MapPin class="w-4 h-4 text-brand-white shrink-0" />
            <span class="text-brand-white text-sm font-semibold text-center">
              {{ isGettingLocation ? "Getting Location..." : currentLocation ? "Refresh Location" : "Get Current Location" }}
            </span>
          </button>

          <!-- Office Location Reference -- only meaningful for Work
               Location = Office employees, who are the only ones actually
               geofenced server-side (see AttendanceRepository::
               guardOfficeGeofence()). -->
          <div
            v-if="isOfficeWorker && hasOfficeCoordinates"
            class="p-3 sm:p-4 rounded-[12px] border border-[#DCDEDD]"
            :class="{
              'bg-green-50': isWithinOfficeRadius === true,
              'bg-red-50': isWithinOfficeRadius === false,
              'bg-white': isWithinOfficeRadius === null,
            }"
          >
            <div class="flex items-start sm:items-center gap-3">
              <Building class="w-5 h-5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
              <div class="min-w-0">
                <p class="text-brand-dark text-sm sm:text-base font-semibold">
                  Office Radius: {{ attendanceSetting.office_radius_meters ?? 150 }}m
                </p>
                <p v-if="distanceFromOffice !== null" class="text-xs sm:text-sm break-words" :class="isWithinOfficeRadius ? 'text-green-700' : 'text-red-700'">
                  You're {{ distanceFromOffice }}m from the office --
                  {{ isWithinOfficeRadius ? "within range" : "outside the allowed radius" }}
                </p>
                <p v-else class="text-brand-light text-xs sm:text-sm break-words">
                  Get your location to check distance from the office
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Webcam Section -->
        <div class="space-y-3 sm:space-y-4">
          <div class="relative">
            <video
              id="webcamPreview"
              :class="{ hidden: !currentStream || capturedPhotoData }"
              class="w-full h-40 sm:h-48 bg-gray-100 rounded-[12px] object-cover"
              autoplay
              muted
            ></video>
            <canvas id="photoCanvas" class="hidden"></canvas>

            <div
              v-if="!currentStream && !capturedPhotoData"
              class="w-full h-40 sm:h-48 bg-gray-100 rounded-[12px] flex items-center justify-center border-2 border-dashed border-gray-300"
            >
              <div class="text-center px-4">
                <Camera class="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
                <p class="text-gray-500 text-xs sm:text-sm">
                  Camera preview will appear here
                </p>
              </div>
            </div>

            <img
              v-if="capturedPhotoData"
              :src="capturedPhotoData"
              class="w-full h-40 sm:h-48 rounded-[12px] object-cover"
              alt="Captured photo"
            />
          </div>

          <!-- Camera Controls -->
          <div v-if="!capturedPhotoData" class="flex flex-col sm:flex-row gap-3">
            <button
              v-if="!currentStream"
              @click="startCamera"
              class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 sm:px-8 py-3.5 sm:py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Video class="w-4 h-4 text-brand-white" />
              <span class="text-brand-white text-sm font-semibold"
                >Start Camera</span
              >
            </button>
            <button
              v-if="currentStream"
              @click="capturePhoto"
              class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 sm:px-8 py-3.5 sm:py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera class="w-4 h-4 text-white" />
              <span class="text-white text-sm font-semibold">Take Photo</span>
            </button>
          </div>

          <button
            v-if="capturedPhotoData"
            @click="retakePhoto"
            class="w-full border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-4 sm:py-4 flex items-center justify-center gap-2"
          >
            <RotateCcw class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-semibold"
              >Retake Photo</span
            >
          </button>
        </div>
      </div>

      <!-- Clock In/Out Action -->
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-8"
      >
        <div class="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
          <div
            class="w-7 h-7 sm:w-9 sm:h-9 bg-blue-600 rounded-full flex items-center justify-center shrink-0 text-white text-xs sm:text-sm font-bold"
          >
            2
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base sm:text-base font-bold truncate">Confirm & Submit</h3>
            <p class="text-brand-light text-xs sm:text-sm truncate">Review readiness, then clock in or out</p>
          </div>
        </div>

        <!-- Readiness Checklist -->
        <div class="space-y-2 mb-6 bg-white">
          <div
            class="flex items-center gap-2.5 px-4 py-2.5 rounded-[10px] border"
            :class="currentLocation ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-[#DCDEDD]'"
          >
            <CheckCircle2 v-if="currentLocation" class="w-5 h-5 text-green-600 shrink-0" />
            <Circle v-else class="w-5 h-5 text-gray-300 shrink-0" />
            <span
              class="text-sm font-semibold"
              :class="currentLocation ? 'text-green-700' : 'text-brand-light'"
            >
              Location detected
            </span>
          </div>
          <div
            class="flex items-center gap-2.5 px-4 py-2.5 rounded-[10px] border"
            :class="capturedPhotoData ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-[#DCDEDD]'"
          >
            <CheckCircle2 v-if="capturedPhotoData" class="w-5 h-5 text-green-600 shrink-0" />
            <Circle v-else class="w-5 h-5 text-gray-300 shrink-0" />
            <span
              class="text-sm font-semibold"
              :class="capturedPhotoData ? 'text-green-700' : 'text-brand-light'"
            >
              Photo captured
              <span v-if="!capturedPhotoData" class="font-normal text-red-500">(required)</span>
            </span>
          </div>
        </div>

        <!-- Weekend blocked notice -->
        <div
          v-if="weekendCheckInBlocked && !isCheckedIn"
          class="flex items-start gap-2.5 px-4 py-3 rounded-[10px] border border-red-100 bg-red-50 mb-4"
        >
          <CalendarOff class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p class="text-red-700 text-xs sm:text-sm">
            Clock In tidak tersedia hari ini (Sabtu/Minggu). Hubungi Superadmin/Manager di menu Settings jika Anda perlu masuk lembur.
          </p>
        </div>

        <!-- Overtime notice (weekend, but allowed) -->
        <div
          v-else-if="isWeekend && !isCheckedIn"
          class="flex items-start gap-2.5 px-4 py-3 rounded-[10px] border border-purple-100 bg-purple-50 mb-4"
        >
          <Zap class="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <p class="text-purple-700 text-xs sm:text-sm">
            Hari ini Sabtu/Minggu -- clock in akan tercatat sebagai lembur (overtime).
          </p>
        </div>

        <!-- Late arrival notice -->
        <div
          v-if="lateInfo"
          class="flex items-start gap-2.5 px-4 py-3 rounded-[10px] border border-amber-100 bg-amber-50 mb-4"
        >
          <Timer class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p class="text-amber-700 text-xs sm:text-sm">{{ lateInfo }}</p>
        </div>

        <!-- Icon + Prompt -->
        <div class="text-center mb-6">
          <div
            class="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4"
          >
            <LogIn v-if="!isCheckedIn" class="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <LogOut v-else class="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <h4 class="text-brand-dark text-base sm:text-xl font-bold mb-1.5 sm:mb-2">
            {{ isCheckedIn ? "Ready to Clock Out?" : "Ready to Clock In?" }}
          </h4>
          <p class="text-brand-light text-sm sm:text-base px-2">
            {{
              isCheckedIn
                ? "Mark your departure with location"
                : "Mark your attendance with location"
            }}
          </p>
        </div>

        <button
          v-if="!isCheckedIn"
          @click="handleCheckIn"
          :disabled="!canCheckIn || loading"
          class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 sm:px-8 py-3.5 sm:py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogIn class="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
          <span class="text-white text-base sm:text-lg font-bold">
            {{ loading ? "Processing..." : "Clock In" }}
          </span>
        </button>

        <button
          v-else
          @click="handleCheckOut"
          :disabled="!canCheckOut || loading"
          class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 sm:px-8 py-3.5 sm:py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut class="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
          <span class="text-white text-base sm:text-lg font-bold">
            {{ loading ? "Processing..." : "Clock Out" }}
          </span>
        </button>

        <p
          v-if="isCheckedIn && remainingUntilCheckOut"
          class="text-amber-600 text-xs sm:text-sm mt-3 text-center px-2 font-medium"
        >
          <Timer class="w-4 h-4 inline mr-1 -mt-0.5" />
          Clock Out available in {{ remainingUntilCheckOut }} (min. 8 hours worked)
        </p>

        <p class="text-brand-light text-xs sm:text-sm mt-4 text-center px-2">
          <Info class="w-4 h-4 inline mr-1 -mt-0.5" />
          Please get your location and take a photo before clocking in/out
        </p>
      </div>
    </div>
  </div>
</template>
