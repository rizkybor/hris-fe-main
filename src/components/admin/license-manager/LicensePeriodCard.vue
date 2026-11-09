<script setup>
import { computed } from "vue";
import { CalendarRange, Infinity as InfinityIcon, ArrowRight } from "lucide-vue-next";
import { formatDate, formatDuration, isLifetimeLicense } from "@/components/admin/license-manager/licenseHelpers";

const props = defineProps({
  license: { type: Object, required: true },
});

const lifetime = computed(() => isLifetimeLicense(props.license));
const status = computed(() => props.license.status);
const remaining = computed(() => props.license.remaining_days ?? 0);
const percent = computed(() => Math.min(100, Math.max(0, Number(props.license.elapsed_percent ?? 0))));

const tone = computed(() => {
  if (status.value === "expired") return { text: "text-red-600", bar: "bg-red-500", chip: "bg-red-50 text-red-600", label: "Expired" };
  if (status.value === "expiring_soon") return { text: "text-amber-600", bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700", label: "Expiring soon" };
  if (status.value === "inactive") return { text: "text-gray-500", bar: "bg-gray-400", chip: "bg-gray-100 text-gray-500", label: "Inactive" };
  return { text: "text-emerald-600", bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", label: "Active" };
});
</script>

<template>
  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-6">
    <div class="flex items-center gap-2 mb-5">
      <div class="w-9 h-9 bg-violet-50 rounded-[10px] flex items-center justify-center shrink-0">
        <CalendarRange class="w-[18px] h-[18px] text-violet-600" />
      </div>
      <h4 class="text-brand-dark font-bold flex-1">Active Period</h4>
      <span class="text-xs font-semibold px-2.5 py-1 rounded-full" :class="tone.chip">{{ tone.label }}</span>
    </div>

    <!-- Lifetime -->
    <div v-if="lifetime" class="flex items-center gap-4">
      <div class="w-14 h-14 rounded-[14px] bg-violet-100 flex items-center justify-center shrink-0">
        <InfinityIcon class="w-7 h-7 text-violet-600" />
      </div>
      <div>
        <p class="text-2xl font-bold text-brand-dark">Lifetime &middot; no end date</p>
        <p class="text-sm text-brand-light">Since {{ formatDate(license.starts_at || license.created_at) }}</p>
      </div>
    </div>

    <!-- Term -->
    <div v-else class="space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-5xl font-extrabold leading-none" :class="tone.text">{{ remaining }}</p>
          <p class="text-sm text-brand-light mt-1">
            {{ remaining === 1 ? "day" : "days" }} remaining
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs text-gray-500">Total duration</p>
          <p class="text-sm font-semibold text-brand-dark">{{ formatDuration(license.duration_days) }}</p>
        </div>
      </div>

      <div>
        <div
          class="h-2.5 w-full bg-white border border-[#DCDEDD] rounded-full overflow-hidden"
          role="progressbar"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Share of the active period used"
        >
          <div class="h-full rounded-full transition-all duration-500" :class="tone.bar" :style="{ width: `${percent}%` }"></div>
        </div>
        <div class="flex items-center justify-between text-xs text-brand-light mt-2">
          <span>{{ percent }}% used</span>
          <span>{{ Math.round((100 - percent) * 10) / 10 }}% left</span>
        </div>
      </div>

      <div class="flex items-center gap-3 text-sm">
        <div>
          <p class="text-xs text-gray-500">Start</p>
          <p class="font-semibold text-brand-dark">{{ formatDate(license.starts_at || license.created_at) }}</p>
        </div>
        <ArrowRight class="w-4 h-4 text-gray-400 mt-3" />
        <div>
          <p class="text-xs text-gray-500">End</p>
          <p class="font-semibold" :class="status === 'expired' ? 'text-red-600' : 'text-brand-dark'">{{ formatDate(license.expires_at) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
