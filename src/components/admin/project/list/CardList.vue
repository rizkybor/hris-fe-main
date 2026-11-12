<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { can } from "@/helpers/permissionHelper";
import { formatDate } from "@/utils/dateUtils";
import { localeTag } from "@/i18n";
import { AlertTriangle, Building2, Calendar, Edit, Flag, MoreHorizontal, Trash2, Users } from "lucide-vue-next";
import { getProjectHealth } from "@/utils/projectHealth";
import { UiBadge } from "@/components/ui";
import Avatar from "@/components/common/Avatar.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["delete"]);

const detailRoute = computed(() => ({ name: "admin.projects.detail", params: { id: props.data.id } }));

const STATUS = {
  draft: { key: "draft", tone: "neutral" },
  planning: { key: "planning", tone: "info" },
  active: { key: "active", tone: "accent" },
  on_hold: { key: "onHold", tone: "warn" },
  completed: { key: "completed", tone: "ok" },
  cancelled: { key: "cancelled", tone: "outline" },
};
const status = computed(() => {
  const s = STATUS[props.data.status];
  return s
    ? { label: t(`projects.status.${s.key}`), tone: s.tone }
    : { label: props.data.status, tone: "neutral" };
});

// Priority is only worth a badge when it asks for attention.
const priorityLabel = computed(() =>
  ["high", "urgent"].includes(props.data.priority) ? t(`projects.priority.${props.data.priority}`) : null
);

const progress = computed(() => Math.max(0, Math.min(100, props.data.progress ?? 0)));

// Overdue / critical / at-risk / behind only -- on-track projects get no chip.
const health = computed(() => getProjectHealth(props.data));
const HEALTH_TONE = { overdue: "bad", critical: "bad", "at-risk": "warn", behind: "warn" };
const healthText = computed(() => {
  if (!health.value || health.value.level === "on-track") return null;
  const d = health.value.daysRemaining;
  return d >= 0
    ? t("projects.card.healthLeft", { label: health.value.label, n: d })
    : t("projects.card.healthOverdue", { n: Math.abs(d) });
});

const team = computed(() => {
  if (props.data.teams?.length) return props.data.teams.map((x) => x.name).join(", ");
  if (props.data.members?.length) return props.data.members.map((m) => m.name).join(", ");
  return null;
});
const leaderName = computed(() => props.data.leader?.user?.name || null);

// "15 Jul – 6 Nov 2026" when both dates fall in the same year; "Since 13 Sep
// 2026" when there is no end date yet.
const timeline = computed(() => {
  const { start_date: start, end_date: end } = props.data;
  if (!start && !end) return null;
  if (!end) return t("projects.card.since", { date: formatDate(start) });
  const endText = formatDate(end);
  if (!start) return `– ${endText}`;
  const sameYear = end && new Date(start).getFullYear() === new Date(end).getFullYear();
  const startText = sameYear
    ? new Date(start).toLocaleDateString(localeTag(), { day: "numeric", month: "short" })
    : formatDate(start);
  return `${startText} – ${endText}`;
});

// Missing or broken photos fall back to the project's initials.
const photoFailed = ref(false);
const initials = computed(() =>
  (props.data.name || "?")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
);

// ----- ⋯ actions menu (edit / delete) -----
const canEdit = computed(() => can("project-edit"));
const canDelete = computed(() => can("project-delete"));
const hasActions = computed(() => canEdit.value || canDelete.value);

const menuOpen = ref(false);
const root = ref(null);
const trigger = ref(null);
const menu = ref(null);
const items = () => [...(menu.value?.querySelectorAll('[role="menuitem"]') ?? [])];

const onDocPointer = (e) => {
  if (!root.value?.contains(e.target)) closeMenu(false);
};
const openMenu = async () => {
  menuOpen.value = true;
  document.addEventListener("pointerdown", onDocPointer);
  await nextTick();
  items()[0]?.focus();
};
const closeMenu = (refocus = true) => {
  if (!menuOpen.value) return;
  menuOpen.value = false;
  document.removeEventListener("pointerdown", onDocPointer);
  if (refocus) trigger.value?.focus();
};
const toggleMenu = () => (menuOpen.value ? closeMenu() : openMenu());
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocPointer));

const onMenuKey = (e) => {
  const list = items();
  const i = list.indexOf(document.activeElement);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    list[(i + step + list.length) % list.length]?.focus();
  } else if (e.key === "Home" || e.key === "End") {
    e.preventDefault();
    list[e.key === "Home" ? 0 : list.length - 1]?.focus();
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeMenu();
  } else if (e.key === "Tab") {
    closeMenu(false);
  }
};

const onEdit = () => {
  closeMenu(false);
  router.push({ name: "admin.projects.edit", params: { id: props.data.id } });
};
const onDelete = () => {
  closeMenu();
  emit("delete", props.data);
};
</script>

<template>
  <!-- The name link stretches over the whole card (after:inset-0), so the card
       is one link target without nesting the menu button inside an <a>. -->
  <article
    ref="root"
    data-project-card
    class="group relative ui-lift bg-ui-surface border border-ui-line rounded-ui-card hover:border-ui-line-strong flex flex-col h-full min-w-0 p-4 sm:p-[18px]"
    :class="{ 'z-20': menuOpen }"
  >
    <!-- Header: photo / initials, name, client, status, actions -->
    <div class="flex items-start gap-3">
      <div class="w-9 h-9 shrink-0 rounded-[9px] overflow-hidden bg-ui-subtle border border-ui-line flex items-center justify-center">
        <img
          v-if="data.photo && !photoFailed"
          class="w-full h-full object-cover"
          :src="data.photo"
          alt=""
          loading="lazy"
          @error="photoFailed = true"
        />
        <span v-else class="text-ui-cap font-semibold text-ui-ink" aria-hidden="true">{{ initials }}</span>
      </div>
      <div class="flex-1 min-w-0">
        <RouterLink
          :to="detailRoute"
          class="block text-ui-h3 text-ui-ink truncate group-hover:text-ui-accent focus:outline-none after:absolute after:inset-0 after:rounded-ui-card after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ui-accent"
          :title="data.name"
        >{{ data.name }}</RouterLink>
        <p class="text-ui-cap flex items-center gap-1 mt-0.5 min-w-0" :class="data.client?.name ? 'text-ui-muted' : 'text-ui-faint'">
          <Building2 class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ data.client?.name || $t("projects.card.noClient") }}</span>
          <!-- Priority only when it needs attention, inline so the header stays one height -->
          <span v-if="priorityLabel" class="shrink-0 inline-flex items-center gap-0.5 ml-1.5 text-ui-bad font-medium">
            <Flag class="w-3 h-3" aria-hidden="true" /><span class="sr-only">{{ $t("projects.fields.priority") }}:</span>{{ priorityLabel }}
          </span>
        </p>
      </div>
      <UiBadge :tone="status.tone" dot class="shrink-0">{{ status.label }}</UiBadge>

      <div v-if="hasActions" class="relative z-10 -mr-1.5 -mt-1 shrink-0">
        <button
          ref="trigger"
          type="button"
          class="ui-press w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:text-ui-ink hover:bg-ui-hover focus:outline-none focus-visible:shadow-ui-focus"
          :class="{ 'bg-ui-hover text-ui-ink': menuOpen }"
          aria-haspopup="menu"
          :aria-expanded="menuOpen"
          :aria-label="$t('projects.card.actions', { name: data.name })"
          @click="toggleMenu"
          @keydown.down.prevent="openMenu"
        >
          <MoreHorizontal class="w-4 h-4" />
        </button>
        <Transition name="ui-pop">
          <div
            v-if="menuOpen"
            ref="menu"
            role="menu"
            class="absolute right-0 top-full mt-1 w-40 bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay p-1 origin-top-right"
            @keydown="onMenuKey"
          >
            <button
              v-if="canEdit"
              type="button"
              role="menuitem"
              tabindex="-1"
              class="w-full flex items-center gap-2.5 px-2.5 h-9 text-ui-small text-left rounded-[6px] text-ui-ink hover:bg-ui-hover focus:bg-ui-hover focus:outline-none"
              @click="onEdit"
            >
              <Edit class="w-4 h-4 text-ui-muted" /> {{ $t("common.actions.edit") }}
            </button>
            <button
              v-if="canDelete"
              type="button"
              role="menuitem"
              tabindex="-1"
              class="w-full flex items-center gap-2.5 px-2.5 h-9 text-ui-small text-left rounded-[6px] text-ui-bad hover:bg-ui-bad-soft focus:bg-ui-bad-soft focus:outline-none"
              @click="onDelete"
            >
              <Trash2 class="w-4 h-4" /> {{ $t("common.actions.delete") }}
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <p v-if="data.description" class="text-ui-cap text-ui-muted mt-2.5 line-clamp-2">{{ data.description }}</p>

    <!-- Progress and meta sit at the bottom so cards in a row line up -->
    <div class="mt-auto pt-4">
      <div class="flex items-center gap-2.5">
        <div
          class="flex-1 min-w-[48px] bg-ui-subtle rounded-full h-1.5 overflow-hidden"
          role="progressbar"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="$t('projects.card.progress')"
        >
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="progress >= 100 ? 'bg-ui-ok' : 'bg-ui-ink'"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <UiBadge v-if="healthText" :tone="HEALTH_TONE[health.level] || 'warn'" class="shrink-0">
          <AlertTriangle class="w-3 h-3" aria-hidden="true" />{{ healthText }}
        </UiBadge>
        <span class="text-ui-small font-semibold text-ui-ink tabular-nums shrink-0 min-w-[2.25rem] text-right">{{ progress }}%</span>
      </div>

      <div class="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-ui-line text-ui-cap min-w-0">
        <span
          v-if="leaderName"
          class="shrink-0"
          :title="$t('projects.card.ledBy', { name: leaderName })"
        >
          <Avatar :src="data.leader?.user?.profile_photo" :alt="leaderName" size="w-6 h-6" icon-size="w-3 h-3" />
          <span class="sr-only">{{ $t("projects.card.ledBy", { name: leaderName }) }}</span>
        </span>
        <Users v-else class="w-3.5 h-3.5 text-ui-faint shrink-0" aria-hidden="true" />
        <span
          class="truncate min-w-0 flex-1"
          :class="team ? 'text-ui-text' : 'text-ui-faint'"
          :title="team || ''"
        >{{ team || $t("projects.card.notAssigned") }}</span>
        <span v-if="timeline" class="shrink-0 inline-flex items-center gap-1 text-ui-muted tabular-nums whitespace-nowrap">
          <Calendar class="w-3.5 h-3.5 text-ui-faint" aria-hidden="true" />{{ timeline }}
        </span>
      </div>
    </div>
  </article>
</template>
