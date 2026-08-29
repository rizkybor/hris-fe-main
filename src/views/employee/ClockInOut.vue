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
} from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { useAlertModalStore } from "@/stores/alertModal";
import { storeToRefs } from "pinia";

const attendanceStore = useAttendanceStore();
const alertModal = useAlertModalStore();
const { loading, todayAttendance } = storeToRefs(attendanceStore);
const { checkIn, checkOut, fetchTodayAttendance } = attendanceStore;

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

// Computed
const isCheckedIn = computed(() => {
  return todayAttendance.value?.check_in && !todayAttendance.value?.check_out;
});

const workingHours = computed(() => {
  if (!todayAttendance.value?.check_in) {
    return "0h 0m";
  }

  const checkInTime = new Date(todayAttendance.value.check_in);
  const endTime = todayAttendance.value.check_out
    ? new Date(todayAttendance.value.check_out)
    : new Date(); // Use current time if still checked in

  const diffMs = endTime - checkInTime;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;

  return `${hours}h ${minutes}m`;
});

const canCheckIn = computed(() => {
  return currentLocation.value && !isCheckedIn.value;
});

const canCheckOut = computed(() => {
  return currentLocation.value && isCheckedIn.value;
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
  if (todayAttendance.value.check_in && !todayAttendance.value.check_out) {
    return { text: "Clocked In", class: "bg-green-100 text-green-700" };
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

  try {
    await checkIn({
      check_in_lat: currentLocation.value.latitude,
      check_in_long: currentLocation.value.longitude,
    });

    await alertModal.alert("Successfully clocked in!", { type: "success" });
    resetForNextAction();
    await fetchTodayAttendance();
  } catch (error) {
    console.error("Check in failed:", error);
    await alertModal.alert("Failed to check in. Please try again.", { type: "danger" });
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
    await alertModal.alert("Failed to check out. Please try again.", { type: "danger" });
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
  await fetchTodayAttendance();
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

          <!-- Office Location Reference -->
          <div class="p-3 sm:p-4 bg-green-50 rounded-[12px] border border-[#DCDEDD]">
            <div class="flex items-start sm:items-center gap-3">
              <Building class="w-5 h-5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
              <div class="min-w-0">
                <p class="text-brand-dark text-sm sm:text-base font-semibold">
                  Jakarta Office
                </p>
                <p class="text-brand-light text-xs sm:text-sm break-words">
                  Jl. Sudirman No. 123, Jakarta
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
              <span class="font-normal text-gray-400">(optional)</span>
            </span>
          </div>
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

        <p class="text-brand-light text-xs sm:text-sm mt-4 text-center px-2">
          <Info class="w-4 h-4 inline mr-1 -mt-0.5" />
          Please get your location before clocking in/out
        </p>
      </div>
    </div>
  </div>
</template>
