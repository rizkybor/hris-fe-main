<script setup>
import { reactive, ref, watch } from "vue";
import { X, Loader2 } from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import Avatar from "@/components/common/Avatar.vue";

// Correct one staff member's attendance record. The date stays fixed (one
// record per day); times are entered in WIB.
const props = defineProps({
  show: Boolean,
  attendance: { type: Object, default: null },
});
const emit = defineEmits(["close", "saved"]);

const STATUSES = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "overtime", label: "Overtime" },
  { value: "remote", label: "Remote" },
  { value: "sick_leave", label: "Sick" },
];
// No check-in needed for these.
const NO_TIME = ["absent", "sick_leave"];

const store = useAttendanceStore();
const form = reactive({ check_in: "", check_out: "", status: "present", notes: "" });
const errors = ref({});
const saving = ref(false);

const toWibTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso))
    : "";

watch(
  () => props.show,
  (open) => {
    if (!open || !props.attendance) return;
    const a = props.attendance;
    Object.assign(form, { check_in: toWibTime(a.check_in), check_out: toWibTime(a.check_out), status: a.status || "present", notes: a.notes || "" });
    errors.value = {};
  },
  { immediate: true }
);

// Picking "late" with an on-time check-in (or the reverse) is allowed, but
// show what the record will say.
const lateHint = () => {
  if (form.status !== "late" || !form.check_in) return "";
  const [h, m] = form.check_in.split(":").map(Number);
  const minutes = h * 60 + m - 9 * 60;
  return minutes > 0 ? `${minutes} min after 09:00` : "Check-in is not after 09:00, so no late minutes will be recorded.";
};

const formatDate = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "-";

const submit = async () => {
  saving.value = true;
  errors.value = {};
  try {
    const updated = await store.updateAttendance(props.attendance.id, {
      check_in: form.check_in || null,
      check_out: form.check_out || null,
      status: form.status,
      notes: form.notes?.trim() || null,
    });
    emit("saved", updated);
    emit("close");
  } catch (e) {
    errors.value = e?.response?.data?.errors || { general: [e?.response?.data?.message || "Failed to save. Please try again."] };
  } finally {
    saving.value = false;
  }
};
const err = (k) => errors.value?.[k]?.[0];
</script>

<template>
  <div v-if="show && attendance" class="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="emit('close')">
    <form class="bg-white w-full sm:max-w-md rounded-t-[16px] sm:rounded-[14px] border border-[#DCDEDD] max-h-[92vh] overflow-y-auto" @submit.prevent="submit">
      <div class="p-4 sm:p-5 border-b border-[#DCDEDD] flex items-start justify-between gap-3 sticky top-0 bg-white">
        <div class="flex items-center gap-3 min-w-0">
          <Avatar :src="attendance.employee?.user?.profile_photo" :alt="attendance.employee?.user?.name" size="w-10 h-10" icon-size="w-4 h-4" />
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold truncate">Edit Attendance</h3>
            <p class="text-brand-light text-xs truncate">{{ attendance.employee?.user?.name || "-" }} · {{ formatDate(attendance.date) }}</p>
          </div>
        </div>
        <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0" aria-label="Close" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 sm:p-5 space-y-4">
        <div>
          <label class="ea-label">Status</label>
          <div class="grid grid-cols-3 gap-2">
            <label
              v-for="s in STATUSES"
              :key="s.value"
              class="text-center border rounded-[10px] py-2 text-sm font-semibold cursor-pointer transition-colors"
              :class="form.status === s.value ? 'border-[#0C51D9] bg-blue-50 text-[#0C51D9]' : 'border-[#DCDEDD] text-brand-dark hover:border-[#0C51D9]'"
            >
              <input v-model="form.status" type="radio" :value="s.value" class="sr-only" />{{ s.label }}
            </label>
          </div>
          <p v-if="err('status')" class="ea-err">{{ err("status") }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="ea-label">Check-in (WIB)</label>
            <input v-model="form.check_in" type="time" class="ea-input" :required="!NO_TIME.includes(form.status)" />
            <p v-if="err('check_in')" class="ea-err">{{ err("check_in") }}</p>
          </div>
          <div>
            <label class="ea-label">Check-out (WIB)</label>
            <input v-model="form.check_out" type="time" class="ea-input" />
            <p v-if="err('check_out')" class="ea-err">{{ err("check_out") }}</p>
          </div>
        </div>
        <p v-if="lateHint()" class="text-xs text-amber-700 -mt-2">{{ lateHint() }}</p>
        <p v-if="NO_TIME.includes(form.status)" class="text-xs text-brand-light -mt-2">Times are optional for this status.</p>

        <div>
          <label class="ea-label">Reason / notes</label>
          <textarea v-model="form.notes" rows="3" maxlength="500" class="ea-input" placeholder="e.g. Forgot to check in, confirmed by the team lead"></textarea>
          <p class="text-[11px] text-brand-light mt-1">Every change is kept in the activity history.</p>
        </div>

        <p v-if="err('general')" class="ea-err">{{ err("general") }}</p>
      </div>

      <div class="p-4 sm:p-5 border-t border-[#DCDEDD] grid grid-cols-2 gap-2.5">
        <button type="button" class="rounded-[10px] border border-[#DCDEDD] px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-gray-50" @click="emit('close')">Cancel</button>
        <button type="submit" :disabled="saving" class="btn-primary rounded-[10px] border border-[#2151A0] blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-60">
          <Loader2 v-if="saving" class="w-4 h-4 text-white animate-spin" />
          <span class="text-brand-white text-sm font-semibold">Save Changes</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.ea-label { display: block; font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 6px; }
.ea-input { width: 100%; border: 1px solid #dcdedd; border-radius: 10px; padding: 9px 12px; font-size: 14px; color: #0f172a; background: #fff; outline: none; }
.ea-input:hover, .ea-input:focus { border-color: #0c51d9; }
.ea-err { color: #ef4444; font-size: 12px; margin-top: 4px; }
</style>
