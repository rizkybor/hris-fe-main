<script setup>
import { computed } from "vue";
import { X, MapPin, Timer, Camera } from "lucide-vue-next";
import Avatar from "@/components/common/Avatar.vue";
import { formatDateLong, formatTime } from "@/utils/dateUtils";
import { capitalize } from "@/utils/formatUtils";

const props = defineProps({
  show: Boolean,
  attendance: { type: Object, default: null },
});

const emit = defineEmits(["close"]);

// Shared across Attendance Records and Reporting -> Attendance so both
// pages read status the same way (same palette as
// AttendanceRecords.vue's statusBadgeClass()).
const STATUS_CLASS = {
  present: "bg-green-50 text-green-700",
  late: "bg-amber-50 text-amber-700",
  absent: "bg-red-50 text-red-700",
  remote: "bg-blue-50 text-blue-700",
  overtime: "bg-purple-50 text-purple-700",
};

const statusClass = computed(() => STATUS_CLASS[props.attendance?.status] || "bg-gray-100 text-gray-600");

// Mirrors ClockInOut.vue's lateInfo formatting.
const lateInfo = computed(() => {
  const a = props.attendance;
  if (!a || a.status !== "late" || !a.late_minutes) return null;
  const hours = Math.floor(a.late_minutes / 60);
  const minutes = a.late_minutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

const mapLink = (lat, long) => (lat != null && long != null ? `https://www.google.com/maps?q=${lat},${long}` : null);
</script>

<template>
  <div
    v-if="show && attendance"
    class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between sticky top-0 bg-white">
        <div class="min-w-0">
          <h3 class="text-brand-dark text-sm sm:text-lg font-bold truncate">Attendance Detail</h3>
          <p class="text-brand-light text-xs mt-0.5">{{ formatDateLong(attendance.date) }}</p>
        </div>
        <button @click="emit('close')" class="w-9 h-9 shrink-0 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
          <X class="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div class="p-5 space-y-4">
        <div class="flex items-center gap-3">
          <Avatar :src="attendance.employee?.user?.profile_photo" :alt="attendance.employee?.user?.name" size="w-10 h-10" icon-size="w-5 h-5" />
          <div class="min-w-0 flex-1">
            <p class="text-brand-dark font-semibold truncate">{{ attendance.employee?.user?.name || "-" }}</p>
            <p class="text-brand-light text-xs truncate">{{ attendance.employee?.job_information?.team?.name || "N/A" }}</p>
          </div>
          <span class="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0" :class="statusClass">
            {{ capitalize(attendance.status) || "-" }}
          </span>
        </div>

        <div v-if="lateInfo" class="flex items-start gap-2.5 px-4 py-3 rounded-[10px] border border-amber-100 bg-amber-50">
          <Timer class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p class="text-amber-700 text-xs sm:text-sm">Terlambat {{ lateInfo }} (batas jam masuk 09:00 WIB)</p>
        </div>

        <!-- Check In -->
        <div class="border border-[#DCDEDD] rounded-[12px] p-3 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-brand-dark text-sm font-bold">Check In</p>
            <p class="text-brand-dark text-sm font-semibold tabular-nums">{{ formatTime(attendance.check_in) }}</p>
          </div>

          <img
            v-if="attendance.check_in_photo"
            :src="attendance.check_in_photo"
            alt="Check-in photo"
            class="w-full h-40 rounded-[10px] object-cover bg-gray-100"
          />
          <div v-else class="w-full h-40 rounded-[10px] bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center">
            <div class="text-center">
              <Camera class="w-6 h-6 text-gray-300 mx-auto mb-1" />
              <p class="text-gray-400 text-xs">No photo</p>
            </div>
          </div>

          <a
            v-if="mapLink(attendance.check_in_lat, attendance.check_in_long)"
            :href="mapLink(attendance.check_in_lat, attendance.check_in_long)"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1.5 text-xs text-[#0C51D9] font-semibold hover:underline"
          >
            <MapPin class="w-3.5 h-3.5" /> View location on map
          </a>
          <p v-else class="text-xs text-gray-400">No location recorded</p>
        </div>

        <!-- Check Out -->
        <div class="border border-[#DCDEDD] rounded-[12px] p-3 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-brand-dark text-sm font-bold">Check Out</p>
            <p class="text-brand-dark text-sm font-semibold tabular-nums">{{ attendance.check_out ? formatTime(attendance.check_out) : "-" }}</p>
          </div>

          <template v-if="attendance.check_out">
            <img
              v-if="attendance.check_out_photo"
              :src="attendance.check_out_photo"
              alt="Check-out photo"
              class="w-full h-40 rounded-[10px] object-cover bg-gray-100"
            />
            <div v-else class="w-full h-40 rounded-[10px] bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center">
              <div class="text-center">
                <Camera class="w-6 h-6 text-gray-300 mx-auto mb-1" />
                <p class="text-gray-400 text-xs">No photo</p>
              </div>
            </div>

            <a
              v-if="mapLink(attendance.check_out_lat, attendance.check_out_long)"
              :href="mapLink(attendance.check_out_lat, attendance.check_out_long)"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1.5 text-xs text-[#0C51D9] font-semibold hover:underline"
            >
              <MapPin class="w-3.5 h-3.5" /> View location on map
            </a>
            <p v-else class="text-xs text-gray-400">No location recorded</p>
          </template>
          <p v-else class="text-xs text-gray-400">Not clocked out yet</p>
        </div>

        <div v-if="attendance.total_hours">
          <p class="text-brand-light text-xs">Total Hours</p>
          <p class="text-brand-dark text-sm font-semibold">{{ attendance.total_hours }}</p>
        </div>

        <div v-if="attendance.notes">
          <p class="text-brand-dark text-sm font-semibold mb-1">Notes</p>
          <p class="text-gray-500 text-xs whitespace-pre-line">{{ attendance.notes }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
