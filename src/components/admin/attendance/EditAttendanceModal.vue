<script setup>
import { reactive, ref, watch } from "vue";
import { X, Loader2 } from "lucide-vue-next";
import { useAttendanceStore } from "@/stores/attendance";
import Avatar from "@/components/common/Avatar.vue";
import { UiModal, UiButton, UiInput, UiAlert } from "@/components/ui";

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
  <UiModal :open="!!(show && attendance)" size="sm" @update:open="(v) => !v && emit('close')">
    <template #header>
      <div v-if="attendance" class="flex items-center gap-3 flex-1 min-w-0">
        <Avatar :src="attendance.employee?.user?.profile_photo" :alt="attendance.employee?.user?.name" size="w-10 h-10" icon-size="w-4 h-4" />
        <div class="min-w-0">
          <h2 class="text-ui-h2 text-ui-ink truncate">Edit Attendance</h2>
          <p class="text-ui-cap text-ui-muted truncate">{{ attendance.employee?.user?.name || "-" }} · {{ formatDate(attendance.date) }}</p>
        </div>
      </div>
    </template>

    <form v-if="attendance" id="edit-attendance-form" class="space-y-4" @submit.prevent="submit">
      <fieldset>
        <legend class="block text-ui-small font-medium text-ui-ink mb-1.5">Status</legend>
        <div class="grid grid-cols-3 gap-2">
          <label
            v-for="s in STATUSES"
            :key="s.value"
            class="ui-press text-center border rounded-ui-control h-9 inline-flex items-center justify-center text-ui-small font-medium cursor-pointer transition-colors has-[:focus-visible]:shadow-ui-focus"
            :class="form.status === s.value ? 'border-ui-ink bg-ui-ink text-white' : 'border-ui-line-strong text-ui-text hover:bg-ui-hover'"
          >
            <input v-model="form.status" type="radio" :value="s.value" class="sr-only" />{{ s.label }}
          </label>
        </div>
        <p v-if="err('status')" class="text-ui-cap text-ui-bad mt-1.5">{{ err("status") }}</p>
      </fieldset>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="ea-check-in" class="block text-ui-small font-medium text-ui-ink mb-1.5">Check-in (WIB)</label>
          <input id="ea-check-in" v-model="form.check_in" type="time" class="w-full bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control px-3 focus:outline-none focus:border-ui-accent focus:shadow-ui-focus h-[38px]" :required="!NO_TIME.includes(form.status)" />
          <p v-if="err('check_in')" class="text-ui-cap text-ui-bad mt-1.5">{{ err("check_in") }}</p>
        </div>
        <div>
          <label for="ea-check-out" class="block text-ui-small font-medium text-ui-ink mb-1.5">Check-out (WIB)</label>
          <input id="ea-check-out" v-model="form.check_out" type="time" class="w-full bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control px-3 focus:outline-none focus:border-ui-accent focus:shadow-ui-focus h-[38px]" />
          <p v-if="err('check_out')" class="text-ui-cap text-ui-bad mt-1.5">{{ err("check_out") }}</p>
        </div>
      </div>
      <p v-if="lateHint()" class="text-ui-cap text-ui-warn -mt-2">{{ lateHint() }}</p>
      <p v-if="NO_TIME.includes(form.status)" class="text-ui-cap text-ui-muted -mt-2">Times are optional for this status.</p>

      <div>
        <label for="ea-notes" class="block text-ui-small font-medium text-ui-ink mb-1.5">Reason / notes</label>
        <textarea
          id="ea-notes"
          v-model="form.notes"
          rows="3"
          maxlength="500"
          class="w-full bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control px-3 focus:outline-none focus:border-ui-accent focus:shadow-ui-focus py-2.5 resize-y"
          placeholder="e.g. Forgot to check in, confirmed by the team lead"
        ></textarea>
        <p class="text-ui-cap text-ui-muted mt-1.5">Every change is kept in the activity history.</p>
      </div>

      <UiAlert v-if="err('general')" tone="bad">{{ err("general") }}</UiAlert>
    </form>

    <template #footer>
      <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="emit('close')">Cancel</UiButton>
      <UiButton type="submit" form="edit-attendance-form" class="flex-1 sm:flex-none" :loading="saving">Save Changes</UiButton>
    </template>
  </UiModal>
</template>
