<script setup>
import { computed, ref } from "vue";
import { can } from "@/helpers/permissionHelper";
import { formatDate } from "@/utils/dateUtils";
import { Calendar, Crown, Edit, Eye, Users, ShieldCheck, AlertTriangle, Trash2, Building2 } from "lucide-vue-next";
import { getProjectHealth, PROJECT_HEALTH_BADGE_CLASS } from "@/utils/projectHealth";
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
  high: { label: "High", class: "bg-red-50 text-red-700" },
  medium: { label: "Medium", class: "bg-amber-50 text-amber-700" },
  low: { label: "Low", class: "bg-green-50 text-green-700" },
};

const STATUS = {
  draft: { label: "Draft", class: "bg-gray-100 text-gray-600" },
  planning: { label: "Planning", class: "bg-violet-50 text-violet-700" },
  active: { label: "Active", class: "bg-blue-50 text-[#1E40AF]" },
  on_hold: { label: "On Hold", class: "bg-amber-50 text-amber-800" },
  completed: { label: "Completed", class: "bg-green-50 text-green-800" },
  cancelled: { label: "Cancelled", class: "bg-gray-100 text-gray-500" },
};

const priority = computed(() => PRIORITY[props.data.priority] || PRIORITY.medium);
const status = computed(() => STATUS[props.data.status] || { label: props.data.status, class: "bg-gray-100 text-gray-600" });

const progress = computed(() => Math.max(0, Math.min(100, props.data.progress ?? 0)));
const progressColor = computed(() => {
  if (progress.value >= 100) return "bg-green-500";
  if (progress.value >= 50) return "bg-[#0C51D9]";
  if (progress.value > 0) return "bg-amber-500";
  return "bg-gray-300";
});

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
    class="bg-white border border-[#DCDEDD] rounded-[16px] overflow-hidden hover:border-[#0C51D9] hover:shadow-lg transition-all duration-300 group flex flex-col h-full"
  >
    <!-- Cover -->
    <div class="relative h-36 shrink-0 overflow-hidden bg-gradient-to-br from-[#E8EEFC] to-[#F3EEFD]">
      <img
        v-if="data.photo && !photoFailed"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        :src="data.photo"
        :alt="data.name"
        loading="lazy"
        @error="photoFailed = true"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <span class="text-[#0C51D9]/70 text-3xl font-extrabold tracking-wide">{{ initials }}</span>
      </div>

      <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
        <span class="px-2 py-0.5 rounded-md text-xs font-semibold shadow-sm ring-1 ring-black/5" :class="priority.class">
          {{ priority.label }}
        </span>
        <span class="px-2 py-0.5 rounded-md text-xs font-semibold shadow-sm ring-1 ring-black/5" :class="status.class">
          {{ status.label }}
        </span>
      </div>
    </div>

    <div class="p-4 flex flex-col flex-1">
      <!-- Title, client, leader -->
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <h4 class="text-brand-dark text-base font-bold leading-snug truncate" :title="data.name">{{ data.name }}</h4>
          <p class="text-brand-light text-xs flex items-center gap-1 mt-0.5 truncate">
            <Building2 class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{{ data.client?.name || "No client" }}</span>
          </p>
        </div>
        <div v-if="data.leader" class="relative shrink-0" :title="`${data.leader?.user?.name} · Project Leader`">
          <Avatar :src="data.leader?.user?.profile_photo" :alt="data.leader?.user?.name" size="w-9 h-9" icon-size="w-4 h-4" />
          <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-100 border-2 border-white rounded-full flex items-center justify-center">
            <Crown class="w-2.5 h-2.5 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Two lines reserved so every card's progress bar lines up -->
      <p class="text-brand-light text-xs leading-[1.125rem] mt-2 line-clamp-2 h-9">
        {{ data.description || "No description." }}
      </p>

      <!-- Progress -->
      <div class="mt-3">
        <div class="flex items-center justify-between gap-2 text-xs mb-1.5 h-5">
          <span class="text-brand-light font-medium">Progress</span>
          <div class="flex items-center gap-1.5">
            <span
              v-if="healthText"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold"
              :class="PROJECT_HEALTH_BADGE_CLASS[health.level]"
            >
              <AlertTriangle class="w-3 h-3" />{{ healthText }}
            </span>
            <span class="text-brand-dark font-bold">{{ progress }}%</span>
          </div>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-300" :class="progressColor" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>

      <!-- Details: same three rows on every card -->
      <dl class="mt-4 mb-4 space-y-2 text-xs">
        <div class="flex items-center gap-2 min-w-0">
          <dt class="flex items-center gap-1.5 text-brand-light w-20 shrink-0"><Users class="w-3.5 h-3.5" />Team</dt>
          <dd class="text-brand-dark font-medium truncate" :title="team || ''">{{ team || "Not assigned" }}</dd>
        </div>
        <div class="flex items-center gap-2 min-w-0">
          <dt class="flex items-center gap-1.5 text-brand-light w-20 shrink-0"><Calendar class="w-3.5 h-3.5" />Timeline</dt>
          <dd class="text-brand-dark font-medium truncate">{{ timeline }}</dd>
        </div>
        <div class="flex items-center gap-2 min-w-0">
          <dt class="flex items-center gap-1.5 text-brand-light w-20 shrink-0"><ShieldCheck class="w-3.5 h-3.5" />Aftercare</dt>
          <dd class="font-medium truncate" :class="aftercare ? 'text-brand-dark' : 'text-gray-400'">{{ aftercare || "None" }}</dd>
        </div>
      </dl>

      <!-- Actions, pinned to the bottom so they line up across a row -->
      <div class="flex items-center gap-2 pt-3.5 mt-auto border-t border-[#EEF1F5]">
        <RouterLink :to="{ name: 'admin.projects.detail', params: { id: data.id } }" class="flex-1 btn-view-soft h-9">
          <Eye class="w-3.5 h-3.5" />
          <span>View Details</span>
        </RouterLink>
        <RouterLink
          v-if="can('project-edit')"
          :to="{ name: 'admin.projects.edit', params: { id: data.id } }"
          class="w-9 h-9 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300"
          title="Edit"
          aria-label="Edit project"
        >
          <Edit class="w-4 h-4 text-gray-600" />
        </RouterLink>
        <button
          v-if="can('project-delete')"
          type="button"
          @click="emit('delete', data)"
          class="w-9 h-9 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-red-400 hover:bg-red-50 group/delete transition-all duration-300"
          title="Delete"
          aria-label="Delete project"
        >
          <Trash2 class="w-4 h-4 text-gray-500 group-hover/delete:text-red-600" />
        </button>
      </div>
    </div>
  </div>
</template>
