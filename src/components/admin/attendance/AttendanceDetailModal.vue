<script setup>
import { computed } from "vue";
import { MapPin, Timer, Camera } from "lucide-vue-next";
import { UiBadge, UiModal } from "@/components/ui";
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
const STATUS_TONE = { present: "ok", late: "warn", absent: "bad", remote: "info", overtime: "accent" };
const statusTone = computed(() => STATUS_TONE[props.attendance?.status] || "neutral");

// Mirrors ClockInOut.vue's lateInfo formatting.
const lateInfo = computed(() => {
  const a = props.attendance;
  if (!a || a.status !== "late" || !a.late_minutes) return null;
  const hours = Math.floor(a.late_minutes / 60);
  const minutes = a.late_minutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

const mapLink = (lat, long) => (lat != null && long != null ? `https://www.google.com/maps?q=${lat},${long}` : null);

// Check-in and check-out render the same block.
const sides = computed(() => {
  const a = props.attendance;
  if (!a) return [];
  return [
    { key: "in", label: "Check In", time: formatTime(a.check_in), show: true, photo: a.check_in_photo, map: mapLink(a.check_in_lat, a.check_in_long) },
    { key: "out", label: "Check Out", time: a.check_out ? formatTime(a.check_out) : "-", show: !!a.check_out, photo: a.check_out_photo, map: mapLink(a.check_out_lat, a.check_out_long) },
  ];
});
</script>

<template>
  <UiModal :open="!!(show && attendance)" title="Attendance Detail" :description="attendance ? formatDateLong(attendance.date) : ''" size="md" @update:open="(v) => !v && emit('close')">
    <div v-if="attendance" class="space-y-4">
      <div class="flex items-center gap-3">
        <Avatar :src="attendance.employee?.user?.profile_photo" :alt="attendance.employee?.user?.name" size="w-10 h-10" icon-size="w-5 h-5" />
        <div class="min-w-0 flex-1">
          <p class="text-ui-body font-medium text-ui-ink truncate">{{ attendance.employee?.user?.name || "-" }}</p>
          <p class="text-ui-cap text-ui-muted truncate">{{ attendance.employee?.job_information?.team?.name || "N/A" }}</p>
        </div>
        <UiBadge :tone="statusTone" dot class="shrink-0">{{ capitalize(attendance.status) || "-" }}</UiBadge>
      </div>

      <div v-if="lateInfo" class="flex items-start gap-2.5 px-3.5 py-2.5 rounded-ui-control bg-ui-warn-soft">
        <Timer class="w-4 h-4 text-ui-warn shrink-0 mt-px" />
        <p class="text-ui-small text-ui-text">Terlambat {{ lateInfo }} (batas jam masuk 09:00 WIB)</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section v-for="side in sides" :key="side.key" class="border border-ui-line rounded-ui-card p-3 space-y-2.5 min-w-0">
          <div class="flex items-center justify-between">
            <p class="text-ui-h3 text-ui-ink">{{ side.label }}</p>
            <p class="text-ui-small font-medium text-ui-ink tabular-nums">{{ side.time }}</p>
          </div>
          <template v-if="side.show">
            <img v-if="side.photo" :src="side.photo" :alt="`${side.label} photo`" class="w-full h-36 rounded-ui-control object-cover bg-ui-subtle" />
            <div v-else class="w-full h-36 rounded-ui-control bg-ui-subtle border border-dashed border-ui-line-strong flex flex-col items-center justify-center text-ui-faint">
              <Camera class="w-5 h-5 mb-1" />
              <p class="text-ui-cap">No photo</p>
            </div>
            <a v-if="side.map" :href="side.map" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-ui-cap font-medium text-ui-accent hover:underline">
              <MapPin class="w-3.5 h-3.5" /> View location on map
            </a>
            <p v-else class="text-ui-cap text-ui-faint">No location recorded</p>
          </template>
          <p v-else class="text-ui-cap text-ui-faint">Not clocked out yet</p>
        </section>
      </div>

      <dl v-if="attendance.total_hours || attendance.notes" class="space-y-3">
        <div v-if="attendance.total_hours" class="flex items-center justify-between">
          <dt class="text-ui-small text-ui-muted">Total Hours</dt>
          <dd class="text-ui-small font-medium text-ui-ink tabular-nums">{{ attendance.total_hours }}</dd>
        </div>
        <div v-if="attendance.notes">
          <dt class="text-ui-small text-ui-muted mb-1">Notes</dt>
          <dd class="text-ui-small text-ui-text whitespace-pre-line">{{ attendance.notes }}</dd>
        </div>
      </dl>
    </div>
  </UiModal>
</template>
