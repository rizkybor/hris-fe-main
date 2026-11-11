<script setup>
import { computed, ref } from "vue";
import { can } from "@/helpers/permissionHelper";
import { formatDate } from "@/utils/dateUtils";
import { Calendar, Crown, Edit, Eye, Users, ShieldCheck, AlertTriangle, Trash2, Building2, Flag } from "lucide-vue-next";
import { getProjectHealth } from "@/utils/projectHealth";
import { UiBadge, UiButton } from "@/components/ui";
import Avatar from "@/components/common/Avatar.vue";

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["delete"]);

const health = computed(() => getProjectHealth(props.data));

const PRIORITY = {
  high: { label: "High", tone: "bad" },
  medium: { label: "Medium", tone: "warn" },
  low: { label: "Low", tone: "neutral" },
};

const STATUS = {
  draft: { label: "Draft", tone: "neutral" },
  planning: { label: "Planning", tone: "info" },
  active: { label: "Active", tone: "accent" },
  on_hold: { label: "On Hold", tone: "warn" },
  completed: { label: "Completed", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "outline" },
};

const priority = computed(() => PRIORITY[props.data.priority] || PRIORITY.medium);
const status = computed(() => STATUS[props.data.status] || { label: props.data.status, tone: "neutral" });

const progress = computed(() => Math.max(0, Math.min(100, props.data.progress ?? 0)));
const progressColor = computed(() => {
  if (progress.value >= 100) return "bg-ui-ok";
  return "bg-ui-ink";
});

// Health level -> badge tone (always shown with its label).
const HEALTH_TONE = { overdue: "bad", critical: "bad", "at-risk": "warn", behind: "warn" };

// Overdue / at-risk / behind only -- on-track projects need no badge.
const healthText = computed(() => {
  if (!health.value || health.value.level === "on-track") return null;
  const d = health.value.daysRemaining;
  return d >= 0 ? `${health.value.label} · ${d}d left` : `${Math.abs(d)}d overdue`;
});

const team = computed(() => {
  if (props.data.teams?.length) return props.data.teams.map((t) => t.name).join(", ");
  if (props.data.members?.length) return props.data.members.map((m) => m.name).join(", ");
  return null;
});

const timeline = computed(() => {
  const start = props.data.start_date ? formatDate(props.data.start_date) : "-";
  const end = props.data.end_date ? formatDate(props.data.end_date) : "No end date";
  return `${start} – ${end}`;
});

const aftercare = computed(() => {
  const parts = [];
  if (props.data.warranty_period_months) parts.push(`${props.data.warranty_period_months} mo warranty`);
  if (props.data.retention_period_months) parts.push(`${props.data.retention_period_months} mo retention`);
  return parts.join(" · ");
});

// Missing or broken photos fall back to a branded placeholder with the
// project's initials instead of a broken-image icon.
const photoFailed = ref(false);
const initials = computed(() =>
  (props.data.name || "?")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
);
</script>

<template>
  <div
    class="ui-lift bg-ui-surface border border-ui-line rounded-ui-card hover:border-ui-line-strong flex flex-col h-full min-w-0 p-[18px]"
  >
    <!-- Photo / initials, title, client, status -->
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 shrink-0 rounded-[10px] overflow-hidden bg-ui-subtle border border-ui-line flex items-center justify-center">
        <img
          v-if="data.photo && !photoFailed"
          class="w-full h-full object-cover"
          :src="data.photo"
          :alt="data.name"
          loading="lazy"
          @error="photoFailed = true"
        />
        <span v-else class="text-ui-small font-semibold text-ui-ink">{{ initials }}</span>
      </div>
      <div class="flex-1 min-w-0">
        <RouterLink
          :to="{ name: 'admin.projects.detail', params: { id: data.id } }"
          class="block text-ui-h3 text-ui-ink truncate hover:text-ui-accent"
          :title="data.name"
        >{{ data.name }}</RouterLink>
        <p class="text-ui-cap text-ui-muted flex items-center gap-1 mt-0.5 min-w-0">
          <Building2 class="w-3.5 h-3.5 shrink-0" />
          <span class="truncate">{{ data.client?.name || "No client" }}</span>
        </p>
      </div>
      <UiBadge :tone="status.tone" dot class="shrink-0">{{ status.label }}</UiBadge>
    </div>

    <!-- Two lines reserved so every card's progress bar lines up -->
    <p class="text-ui-cap text-ui-muted mt-3 line-clamp-2 h-8">
      {{ data.description || "No description." }}
    </p>

    <!-- Progress -->
    <div class="mt-3">
      <div class="flex items-center justify-between gap-2 mb-1.5 min-h-[22px]">
        <span class="text-ui-cap text-ui-muted">Progress</span>
        <div class="flex items-center gap-1.5">
          <UiBadge v-if="healthText" :tone="HEALTH_TONE[health.level] || 'warn'">
            <AlertTriangle class="w-3 h-3" />{{ healthText }}
          </UiBadge>
          <span class="text-ui-small font-semibold text-ui-ink tabular-nums">{{ progress }}%</span>
        </div>
      </div>
      <div class="w-full bg-ui-subtle rounded-full h-1.5 overflow-hidden">
        <div class="h-full rounded-full transition-all duration-300" :class="progressColor" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- Details: same rows on every card -->
    <dl class="mt-4 mb-4 space-y-2 text-ui-cap">
      <div class="flex items-center gap-2 min-w-0">
        <dt class="flex items-center gap-1.5 text-ui-muted w-20 shrink-0"><Users class="w-3.5 h-3.5" />Team</dt>
        <dd class="text-ui-ink font-medium truncate" :title="team || ''">{{ team || "Not assigned" }}</dd>
      </div>
      <div class="flex items-center gap-2 min-w-0">
        <dt class="flex items-center gap-1.5 text-ui-muted w-20 shrink-0"><Calendar class="w-3.5 h-3.5" />Timeline</dt>
        <dd class="text-ui-ink font-medium truncate tabular-nums">{{ timeline }}</dd>
      </div>
      <div class="flex items-center gap-2 min-w-0">
        <dt class="flex items-center gap-1.5 text-ui-muted w-20 shrink-0"><ShieldCheck class="w-3.5 h-3.5" />Aftercare</dt>
        <dd class="font-medium truncate" :class="aftercare ? 'text-ui-ink' : 'text-ui-faint'">{{ aftercare || "None" }}</dd>
      </div>
      <div class="flex items-center gap-2 min-w-0">
        <dt class="flex items-center gap-1.5 text-ui-muted w-20 shrink-0"><Flag class="w-3.5 h-3.5" />Priority</dt>
        <dd class="min-w-0"><UiBadge :tone="priority.tone">{{ priority.label }}</UiBadge></dd>
      </div>
    </dl>

    <!-- Leader + actions, pinned to the bottom so they line up across a row -->
    <div class="flex items-center gap-2 pt-3.5 mt-auto border-t border-ui-line">
      <div v-if="data.leader" class="relative shrink-0 mr-1" :title="`${data.leader?.user?.name} · Project Leader`">
        <Avatar :src="data.leader?.user?.profile_photo" :alt="data.leader?.user?.name" size="w-8 h-8" icon-size="w-4 h-4" />
        <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-ui-surface border border-ui-line rounded-full flex items-center justify-center">
          <Crown class="w-2.5 h-2.5 text-ui-warn" />
        </div>
      </div>
      <UiButton
        variant="secondary"
        size="sm"
        class="flex-1"
        :icon="Eye"
        :to="{ name: 'admin.projects.detail', params: { id: data.id } }"
      >
        View Details
      </UiButton>
      <RouterLink
        v-if="can('project-edit')"
        :to="{ name: 'admin.projects.edit', params: { id: data.id } }"
        class="ui-press w-[30px] h-[30px] shrink-0 inline-flex items-center justify-center border border-ui-line-strong rounded-[7px] text-ui-muted hover:text-ui-ink hover:bg-ui-subtle"
        title="Edit"
        aria-label="Edit project"
      >
        <Edit class="w-3.5 h-3.5" />
      </RouterLink>
      <button
        v-if="can('project-delete')"
        type="button"
        @click="emit('delete', data)"
        class="ui-press w-[30px] h-[30px] shrink-0 inline-flex items-center justify-center border border-ui-line-strong rounded-[7px] text-ui-muted hover:text-ui-bad hover:border-ui-bad/30 hover:bg-ui-bad-soft"
        title="Delete"
        aria-label="Delete project"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
