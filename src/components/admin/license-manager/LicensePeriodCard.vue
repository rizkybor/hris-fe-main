<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { CalendarRange, Infinity as InfinityIcon, ArrowRight } from "lucide-vue-next";
import { UiBadge } from "@/components/ui";
import { formatDate, formatDuration, isLifetimeLicense } from "@/components/admin/license-manager/licenseHelpers";

const props = defineProps({
  license: { type: Object, required: true },
});

const { t } = useI18n();

const lifetime = computed(() => isLifetimeLicense(props.license));
const status = computed(() => props.license.status);
const remaining = computed(() => props.license.remaining_days ?? 0);
const percent = computed(() => Math.min(100, Math.max(0, Number(props.license.elapsed_percent ?? 0))));

const tone = computed(() => {
  if (status.value === "expired") return { text: "text-ui-bad", bar: "bg-ui-bad", badge: "bad", label: t("licenses.status.expired") };
  if (status.value === "expiring_soon") return { text: "text-ui-warn", bar: "bg-ui-warn", badge: "warn", label: t("licenses.status.expiringSoon") };
  if (status.value === "inactive") return { text: "text-ui-muted", bar: "bg-ui-faint", badge: "neutral", label: t("licenses.status.inactive") };
  return { text: "text-ui-ink", bar: "bg-ui-accent", badge: "ok", label: t("licenses.status.active") };
});
</script>

<template>
  <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center shrink-0">
        <CalendarRange class="w-4 h-4 text-ui-muted" />
      </div>
      <h3 class="text-ui-h2 text-ui-ink flex-1">{{ $t("licenses.period.title") }}</h3>
      <UiBadge :tone="tone.badge" dot>{{ tone.label }}</UiBadge>
    </div>

    <!-- Lifetime -->
    <div v-if="lifetime" class="flex items-center gap-4">
      <div class="w-11 h-11 rounded-ui-card bg-ui-accent-soft flex items-center justify-center shrink-0">
        <InfinityIcon class="w-5 h-5 text-ui-accent" />
      </div>
      <div>
        <p class="text-ui-h2 text-ui-ink">{{ $t("licenses.period.lifetimeNoEnd") }}</p>
        <p class="text-ui-small text-ui-muted">{{ $t("licenses.period.since", { date: formatDate(license.starts_at || license.created_at) }) }}</p>
      </div>
    </div>

    <!-- Term -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-8 gap-y-4 items-end">
      <div>
        <p class="text-ui-display tabular-nums leading-none" :class="tone.text">{{ remaining }}</p>
        <p class="text-ui-small text-ui-muted mt-1">{{ $t("licenses.period.daysRemaining", remaining) }}</p>
      </div>

      <div class="min-w-0">
        <div class="flex items-center justify-between gap-3 text-ui-small mb-2">
          <span class="flex items-center gap-2 text-ui-ink tabular-nums min-w-0">
            <span><span class="text-ui-muted">{{ $t("licenses.period.start") }}</span> {{ formatDate(license.starts_at || license.created_at) }}</span>
            <ArrowRight class="w-3.5 h-3.5 text-ui-faint shrink-0" />
            <span :class="status === 'expired' ? 'text-ui-bad' : ''"><span class="text-ui-muted">{{ $t("licenses.period.end") }}</span> {{ formatDate(license.expires_at) }}</span>
          </span>
          <span class="text-ui-muted text-right whitespace-nowrap">{{ formatDuration(license.duration_days) }}</span>
        </div>
        <div
          class="h-1.5 w-full bg-ui-subtle rounded-full overflow-hidden"
          role="progressbar"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="$t('licenses.period.progressLabel')"
        >
          <div class="h-full rounded-full transition-all duration-500" :class="tone.bar" :style="{ width: `${percent}%` }"></div>
        </div>
        <div class="flex items-center justify-between text-ui-cap text-ui-muted mt-1.5 tabular-nums">
          <span>{{ $t("licenses.period.percentUsed", { n: percent }) }}</span>
          <span>{{ $t("licenses.period.percentLeft", { n: Math.round((100 - percent) * 10) / 10 }) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
