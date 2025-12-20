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
} from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import { storeToRefs } from "pinia";

const attendanceStore = useAttendanceStore();
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
  return new Date(todayAttendance.value.check_in).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
});

const checkOutTime = computed(() => {
  if (!todayAttendance.value?.check_out) return "--:--";
  return new Date(todayAttendance.value.check_out).toLocaleTimeString("en-US", {
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

  currentTime.value = now.toLocaleTimeString("en-US", timeOptions);
  currentDate.value = now.toLocaleDateString("en-US", dateOptions);
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
    alert("Unable to access camera. Please check permissions and try again.");
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
    alert("Please get your current location first!");
    return;
  }

  try {
    await checkIn({
      check_in_lat: currentLocation.value.latitude,
      check_in_long: currentLocation.value.longitude,
    });

    alert("Successfully clocked in!");
    resetForNextAction();
    await fetchTodayAttendance();
  } catch (error) {
    console.error("Check in failed:", error);
    alert("Failed to check in. Please try again.");
  }
};

const handleCheckOut = async () => {
  if (!currentLocation.value) {
    alert("Please get your current location first!");
    return;
  }

  try {
    await checkOut({
      check_out_lat: currentLocation.value.latitude,
      check_out_long: currentLocation.value.longitude,
    });

    alert("Successfully clocked out!");
    resetForNextAction();
    await fetchTodayAttendance();
  } catch (error) {
    console.error("Check out failed:", error);
    alert("Failed to check out. Please try again.");
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
  <div class="p-5">
    <!-- Current Time and Status Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Clock Section -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-8 text-center"
      >
        <div class="mb-6">
          <div class="flex items-center justify-center gap-3 mb-4">
            <div
              class="w-16 h-16 bg-blue-50 rounded-[16px] flex items-center justify-center"
            >
              <Clock class="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-2xl font-bold">Current Time</h3>
              <p class="text-brand-light text-base">Jakarta, Indonesia</p>
            </div>
          </div>

          <!-- Live Clock Display -->
          <div
            class="bg-gradient-to-br from-primary-500 to-primary-600 rounded-[20px] p-8 text-white mb-4"
          >
            <div class="text-6xl font-extrabold mb-2">{{ currentTime }}</div>
            <div class="text-xl font-medium opacity-90">{{ currentDate }}</div>
          </div>

          <!-- Time Zone Info -->
          <p class="text-brand-light text-sm">
            <Globe class="w-4 h-4 inline mr-1" />
            GMT+7 (Western Indonesia Time)
          </p>
        </div>
      </div>

      <!-- Attendance Status -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6"
      >
        <div class="flex items-center gap-3 mb-6">
          <div
            class="w-12 h-12 bg-green-50 rounded-[12px] flex items-center justify-center"
          >
            <UserCheck class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Today's Status</h3>
            <p class="text-brand-light text-sm">Your attendance for today</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Current Status -->
          <div class="p-4 bg-gray-50 rounded-[12px] border border-[#DCDEDD]">
            <div class="flex items-center justify-between">
              <span class="text-brand-dark text-base font-medium">Status</span>
              <span
                :class="attendanceStatus.class"
                class="px-3 py-1 rounded-md text-sm font-semibold"
              >
                {{ attendanceStatus.text }}
              </span>
            </div>
          </div>

          <!-- Clock In Time -->
          <div class="p-4 bg-gray-50 rounded-[12px] border border-[#DCDEDD]">
            <div class="flex items-center justify-between">
              <span class="text-brand-dark text-base font-medium">Clock In</span>
              <span class="text-brand-light text-base">{{ checkInTime }}</span>
            </div>
          </div>

          <!-- Clock Out Time -->
          <div class="p-4 bg-gray-50 rounded-[12px] border border-[#DCDEDD]">
            <div class="flex items-center justify-between">
              <span class="text-brand-dark text-base font-medium">Clock Out</span>
              <span class="text-brand-light text-base">{{ checkOutTime }}</span>
            </div>
          </div>

          <!-- Working Hours -->
          <div class="p-4 bg-blue-50 rounded-[12px] border border-[#DCDEDD]">
            <div class="flex items-center justify-between">
              <span class="text-brand-dark text-base font-medium"
                >Working Hours</span
              >
              <span class="text-blue-600 text-base font-semibold">{{
                workingHours
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Location and Actions Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Location and Camera -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-6"
      >
        <div class="flex items-center gap-3 mb-6">
          <div
            class="w-12 h-12 bg-orange-50 rounded-[12px] flex items-center justify-center"
          >
            <MapPin class="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Location & Photo</h3>
            <p class="text-brand-light text-sm">Capture your work location</p>
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
              'bg-gray-50': locationStatus === 'default',
            }"
            class="p-4 rounded-[12px] border border-[#DCDEDD] mb-3"
          >
            <div class="flex items-center gap-3">
              <Loader2
                v-if="locationStatus === 'loading'"
                class="w-5 h-5 text-yellow-600 animate-spin"
              />
              <MapPin
                v-else-if="locationStatus === 'success'"
                class="w-5 h-5 text-green-600"
              />
              <AlertCircle
                v-else-if="locationStatus === 'error'"
                class="w-5 h-5 text-red-600"
              />
              <MapPin v-else class="w-5 h-5 text-gray-600" />

              <div class="flex-1">
                <p class="text-brand-dark text-base font-semibold">
                  {{ locationName }}
                </p>
                <p class="text-brand-light text-sm">{{ locationAddress }}</p>
                <p v-if="locationCoords" class="text-brand-light text-xs mt-1">
                  {{ locationCoords }}
                </p>
              </div>
            </div>
          </div>

          <!-- Get Location Button -->
          <button
            @click="getCurrentLocation"
            :disabled="isGettingLocation"
            class="w-full border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
          >
            <MapPin class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-semibold">
              {{ isGettingLocation ? "Getting Location..." : currentLocation ? "Refresh Location" : "Get Current Location" }}
            </span>
          </button>

          <!-- Office Location Reference -->
          <div class="p-4 bg-blue-50 rounded-[12px] border border-[#DCDEDD]">
            <div class="flex items-center gap-3">
              <Building class="w-5 h-5 text-blue-600" />
              <div>
                <p class="text-brand-dark text-base font-semibold">
                  Jakarta Office
                </p>
                <p class="text-brand-light text-sm">
                  Jl. Sudirman No. 123, Jakarta
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Webcam Section -->
        <div class="space-y-4">
          <div class="relative">
            <video
              id="webcamPreview"
              :class="{ hidden: !currentStream || capturedPhotoData }"
              class="w-full h-48 bg-gray-100 rounded-[12px] object-cover"
              autoplay
              muted
            ></video>
            <canvas id="photoCanvas" class="hidden"></canvas>

            <div
              v-if="!currentStream && !capturedPhotoData"
              class="w-full h-48 bg-gray-100 rounded-[12px] flex items-center justify-center border-2 border-dashed border-gray-300"
            >
              <div class="text-center">
                <Camera class="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p class="text-gray-500 text-sm">
                  Camera preview will appear here
                </p>
              </div>
            </div>

            <img
              v-if="capturedPhotoData"
              :src="capturedPhotoData"
              class="w-full h-48 rounded-[12px] object-cover"
              alt="Captured photo"
            />
          </div>

          <!-- Camera Controls -->
          <div v-if="!capturedPhotoData" class="flex gap-3">
            <button
              v-if="!currentStream"
              @click="startCamera"
              class="flex-1 border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center justify-center gap-2"
            >
              <Video class="w-4 h-4 text-gray-600" />
              <span class="text-brand-dark text-sm font-semibold"
                >Start Camera</span
              >
            </button>
            <button
              v-if="currentStream"
              @click="capturePhoto"
              class="flex-1 btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2 flex items-center justify-center gap-2"
            >
              <Camera class="w-4 h-4 text-white" />
              <span class="text-white text-sm font-semibold">Take Photo</span>
            </button>
          </div>

          <button
            v-if="capturedPhotoData"
            @click="retakePhoto"
            class="w-full border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center justify-center gap-2"
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
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-8 text-center"
      >
        <div class="mb-6">
          <div
            class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <LogIn v-if="!isCheckedIn" class="w-10 h-10 text-blue-600" />
            <LogOut v-else class="w-10 h-10 text-blue-600" />
          </div>
          <h3 class="text-brand-dark text-2xl font-bold mb-2">
            {{ isCheckedIn ? "Ready to Clock Out?" : "Ready to Clock In?" }}
          </h3>
          <p class="text-brand-light text-base">
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
          class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-8 py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogIn class="w-6 h-6 text-white" />
          <span class="text-white text-lg font-bold">
            {{ loading ? "Processing..." : "Clock In" }}
          </span>
        </button>

        <button
          v-else
          @click="handleCheckOut"
          :disabled="!canCheckOut || loading"
          class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-8 py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut class="w-6 h-6 text-white" />
          <span class="text-white text-lg font-bold">
            {{ loading ? "Processing..." : "Clock Out" }}
          </span>
        </button>

        <p class="text-brand-light text-sm mt-4">
          <Info class="w-4 h-4 inline mr-1" />
          Please get your location before clocking in/out
        </p>
      </div>
    </div>
  </div>
</template>
