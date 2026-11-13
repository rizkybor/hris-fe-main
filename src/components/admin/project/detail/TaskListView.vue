<script setup>
import { computed, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { AlertCircle, ChevronDown, ChevronRight, Clock, Inbox, Plus } from "lucide-vue-next";
import Avatar from "@/components/common/Avatar.vue";
import { UiBadge, UiSelect, UiStatusSelect } from "@/components/ui";
import { getTaskTypeColorClasses } from "@/utils/styleHelpers";
import { formatDate } from "@/utils/dateUtils";
import { can } from "@/helpers/permissionHelper";

const props = defineProps({
  tasks: { type: Array, required: true }, // already filtered by the board
  columns: { type: Array, required: true }, // [{ status, labelKey }]
  loading: { type: Boolean, default: false },
  isOverdue: { type: Function, required: true },
  sort: { type: String, default: "position" },
  // A side panel is open beside the list: use the stacked (phone) row layout.
  compact: { type: Boolean, default: false },
  selectedId: { type: [Number, String], default: null }, // the task open in the panel
});
const emit = defineEmits(["open", "create", "status", "update:sort"]);
const { t } = useI18n();

const PAGE_SIZE = 50;
const DOT = { todo: "bg-ui-faint", in_progress: "bg-ui-accent", review: "bg-ui-warn", done: "bg-ui-ok", cancelled: "bg-ui-line-strong" };
const STATUS_TONE = { todo: "neutral", in_progress: "accent", review: "warn", done: "ok", cancelled: "neutral" };
const PRIORITY_TONE = { urgent: "bad", high: "warn", medium: "info", low: "neutral" };
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

const statusOptions = computed(() => props.columns.map((c) => ({ value: c.status, label: t(c.labelKey), tone: STATUS_TONE[c.status] })));
const sortOptions = computed(() => [
  { value: "position", label: t("projects.tasks.list.sortPosition") },
  { value: "due", label: t("projects.tasks.list.sortDue") },
  { value: "priority", label: t("projects.tasks.list.sortPriority") },
]);

const byDue = (a, b) => (a.due_date ? String(a.due_date) : "9999").localeCompare(b.due_date ? String(b.due_date) : "9999");
const SORTERS = {
  position: (a, b) => (a.position ?? 0) - (b.position ?? 0),
  due: (a, b) => byDue(a, b) || (a.position ?? 0) - (b.position ?? 0),
  priority: (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || byDue(a, b),
};

const groups = computed(() =>
  props.columns.map((c) => ({
    ...c,
    tasks: props.tasks.filter((task) => task.status === c.status).sort(SORTERS[props.sort] || SORTERS.position),
  }))
);

// Folded groups and how many rows each shows (large lists grow in pages).
const folded = reactive({ cancelled: true });
const shown = reactive({});
const visible = (group) => group.tasks.slice(0, shown[group.status] ?? PAGE_SIZE);
const showMore = (group) => (shown[group.status] = (shown[group.status] ?? PAGE_SIZE) + PAGE_SIZE);

const priorityLabel = (p) => (PRIORITY_TONE[p?.toLowerCase()] ? t(`projects.priority.${p.toLowerCase()}`) : p || "-");
const canEditStatus = can("task-edit");
</script>

<template>
  <div class="space-y-3">
    <!-- Sort -->
    <div class="flex items-center justify-end gap-2">
      <span class="text-ui-cap text-ui-muted">{{ $t("projects.tasks.list.sortBy") }}</span>
      <UiSelect :model-value="sort" :options="sortOptions" class="w-44" :aria-label="$t('projects.tasks.list.sortBy')" @update:model-value="(v) => emit('update:sort', v)" />
    </div>

    <div v-if="loading" class="space-y-2" aria-hidden="true">
      <div v-for="i in 4" :key="i" class="h-12 rounded-ui-control bg-ui-subtle animate-pulse"></div>
    </div>

    <section v-for="group in groups" v-else :key="group.status" class="bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden">
      <!-- Group header -->
      <div class="flex items-center gap-2 pl-2 pr-3 h-11 bg-ui-subtle/70" :class="folded[group.status] ? '' : 'border-b border-ui-line'">
        <button
          type="button"
          class="ui-press flex items-center gap-2 min-w-0 h-9 px-2 rounded-ui-control hover:bg-ui-hover focus:outline-none focus-visible:shadow-ui-focus"
          :aria-expanded="!folded[group.status]"
          @click="folded[group.status] = !folded[group.status]"
        >
          <component :is="folded[group.status] ? ChevronRight : ChevronDown" class="w-4 h-4 text-ui-faint" />
          <span class="w-2 h-2 rounded-full shrink-0" :class="DOT[group.status]" aria-hidden="true"></span>
          <span class="text-ui-h3 text-ui-ink truncate">{{ $t(group.labelKey) }}</span>
          <span class="text-ui-cap text-ui-muted tabular-nums">{{ group.tasks.length }}</span>
        </button>
        <button
          v-if="can('task-create')"
          type="button"
          class="ml-auto w-8 h-8 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-hover hover:text-ui-ink"
          :title="$t('projects.tasks.addToColumn', { column: $t(group.labelKey) })"
          :aria-label="$t('projects.tasks.addToColumn', { column: $t(group.labelKey) })"
          @click="emit('create', group.status)"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>

      <template v-if="!folded[group.status]">
        <p v-if="group.tasks.length === 0" class="flex items-center gap-2 px-4 py-3.5 text-ui-cap text-ui-muted">
          <Inbox class="w-4 h-4 text-ui-faint" />{{ $t("projects.tasks.emptyColumn") }}
        </p>

        <template v-else>
          <!-- Column titles (desktop) -->
          <div v-if="!compact" class="hidden md:grid grid-cols-[minmax(0,1fr)_200px_110px_130px_150px] gap-3 px-4 h-9 items-center text-ui-cap font-medium text-ui-muted border-b border-ui-line">
            <span>{{ $t("projects.tasks.list.task") }}</span>
            <span>{{ $t("projects.tasks.detail.assignee") }}</span>
            <span>{{ $t("projects.fields.priority") }}</span>
            <span>{{ $t("projects.tasks.list.due") }}</span>
            <span>{{ $t("common.labels.status") }}</span>
          </div>

          <ul class="divide-y divide-ui-line">
            <li
              v-for="task in visible(group)"
              :key="task.id"
              role="button"
              tabindex="0"
              class="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 items-center px-4 py-3 cursor-pointer hover:bg-ui-hover/60 focus:outline-none focus-visible:bg-ui-hover"
              :class="[!compact && 'md:grid-cols-[minmax(0,1fr)_200px_110px_130px_150px] md:py-2.5', task.id === selectedId && 'bg-ui-accent-soft/60 shadow-[inset_3px_0_0_rgb(var(--ui-accent))]']"
              :aria-current="task.id === selectedId ? 'true' : undefined"
              @click="emit('open', task)"
              @keydown.enter.prevent="emit('open', task)"
            >
              <!-- Task -->
              <div class="min-w-0">
                <p class="text-ui-body font-medium text-ui-ink truncate group-hover:text-ui-accent" :title="task.name">{{ task.name }}</p>
                <p v-if="task.type" class="flex items-center gap-1.5 mt-0.5 text-ui-cap text-ui-muted min-w-0">
                  <span v-if="task.color" class="w-1.5 h-1.5 rounded-full shrink-0" :class="getTaskTypeColorClasses(task.color).dot" aria-hidden="true"></span>
                  <span class="truncate">{{ task.type }}</span>
                </p>
              </div>

              <!-- Status (phones: top right) -->
              <div class="justify-self-end" :class="!compact && 'md:order-last md:justify-self-start'" @click.stop @keydown.stop>
                <UiStatusSelect
                  v-if="canEditStatus"
                  :model-value="task.status"
                  :options="statusOptions"
                  :label="$t('common.labels.status')"
                  @change="(v) => emit('status', task, v)"
                />
                <UiBadge v-else :tone="STATUS_TONE[task.status]" dot>{{ statusOptions.find((o) => o.value === task.status)?.label }}</UiBadge>
              </div>

              <!-- Assignee -->
              <div class="flex items-center gap-2 min-w-0 col-span-2 row-start-2" :class="!compact && 'md:col-span-1 md:row-start-auto'">
                <Avatar :src="task.assignee?.user?.profile_photo" :alt="task.assignee?.user?.name || $t('projects.tasks.unassigned')" size="w-6 h-6" icon-size="w-3 h-3" rounded="rounded-full" />
                <span class="text-ui-small truncate" :class="task.assignee ? 'text-ui-text' : 'text-ui-faint'">{{ task.assignee?.user?.name || $t("projects.tasks.unassigned") }}</span>
                <!-- Priority + due inline on phones -->
                <span class="ml-auto flex items-center gap-2 shrink-0" :class="!compact && 'md:hidden'">
                  <UiBadge :tone="PRIORITY_TONE[task.priority?.toLowerCase()] || 'neutral'">{{ priorityLabel(task.priority) }}</UiBadge>
                  <span v-if="task.due_date" class="inline-flex items-center gap-1 text-ui-cap tabular-nums" :class="isOverdue(task) ? 'text-ui-bad font-medium' : 'text-ui-muted'">
                    <AlertCircle v-if="isOverdue(task)" class="w-3.5 h-3.5" />{{ formatDate(task.due_date) }}
                  </span>
                </span>
              </div>

              <!-- Priority (desktop) -->
              <div v-if="!compact" class="hidden md:block">
                <UiBadge :tone="PRIORITY_TONE[task.priority?.toLowerCase()] || 'neutral'">{{ priorityLabel(task.priority) }}</UiBadge>
              </div>

              <!-- Due (desktop) -->
              <div v-if="!compact" class="hidden md:flex items-center gap-1.5 text-ui-small tabular-nums" :class="isOverdue(task) ? 'text-ui-bad font-medium' : 'text-ui-muted'">
                <AlertCircle v-if="isOverdue(task)" class="w-3.5 h-3.5 shrink-0" />
                <Clock v-else-if="task.due_date" class="w-3.5 h-3.5 shrink-0 text-ui-faint" />
                <span>{{ task.due_date ? formatDate(task.due_date) : "-" }}</span>
              </div>
            </li>
          </ul>

          <button
            v-if="group.tasks.length > visible(group).length"
            type="button"
            class="ui-press w-full flex items-center justify-center gap-1.5 h-10 border-t border-ui-line text-ui-cap font-medium text-ui-muted hover:text-ui-ink hover:bg-ui-hover tabular-nums"
            @click="showMore(group)"
          >
            <ChevronDown class="w-3.5 h-3.5" />
            {{ $t("projects.tasks.loadMore", { shown: visible(group).length, total: group.tasks.length }) }}
          </button>
        </template>
      </template>
    </section>
  </div>
</template>
