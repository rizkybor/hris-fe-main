<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Sparkles,
  PencilLine,
  Power,
  PowerOff,
  CalendarPlus,
  BadgeCheck,
  Unplug,
  Trash2,
  MonitorCheck,
  RefreshCw,
  RotateCcw,
  LogOut,
  ShieldX,
  CircleSlash,
  CalendarX2,
  Globe,
  UserCog,
  Laptop,
} from "lucide-vue-next";
import Pagination from "@/components/common/Pagination.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import {
  EVENT_TYPES,
  FIELD_LABELS,
  eventLabel,
  eventToneClass,
  formatDate,
  formatDateTime,
  planLabel,
  platformLabel,
  relativeTime,
} from "@/components/admin/license-manager/licenseHelpers";

const props = defineProps({
  licenseId: { type: [Number, String], required: true },
});

const store = useLicenseManagerStore();
const { events, eventsMeta, eventsLoading } = storeToRefs(store);

const filter = ref("");
const page = ref(1);
const perPage = ref(15);
const expanded = ref({});

const ICONS = {
  created: Sparkles,
  updated: PencilLine,
  activated_by_admin: Power,
  deactivated_by_admin: PowerOff,
  extended: CalendarPlus,
  plan_changed: BadgeCheck,
  device_released_by_admin: Unplug,
  deleted: Trash2,
  device_activated: MonitorCheck,
  device_reactivated: RotateCcw,
  refreshed: RefreshCw,
  device_released: LogOut,
  denied_device_limit: ShieldX,
  denied_inactive: CircleSlash,
  denied_expired: CalendarX2,
};

// Filter options grouped as Admin / App / Denied.
const filterGroups = computed(() => {
  const groups = {};
  for (const [value, def] of Object.entries(EVENT_TYPES)) {
    (groups[def.group] ||= []).push({ value, label: def.label });
  }
  return groups;
});

const load = () =>
  store.fetchEvents(props.licenseId, { event: filter.value, page: page.value, per_page: perPage.value }).catch(() => {});

onMounted(load);
watch(filter, () => {
  page.value = 1;
  load();
});

const onPage = (p) => {
  page.value = p;
  load();
};
const onPerPage = (n) => {
  perPage.value = n;
  page.value = 1;
  load();
};

defineExpose({ reload: load });

const isDenied = (event) => event.event?.startsWith("denied_");

const formatValue = (field, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field === "starts_at" || field === "expires_at") return formatDate(value);
  return String(value);
};

// One-line summary under the label for events with simple meta.
const summaryLine = (event) => {
  const meta = event.meta || {};
  if (event.event === "extended") {
    return `${meta.old_expires_at ? formatDate(meta.old_expires_at) : "No end date"} → ${meta.new_expires_at ? formatDate(meta.new_expires_at) : "No end date"}`;
  }
  if (event.event === "plan_changed") {
    return `${planLabel({ plan: meta.old_plan })} → ${planLabel({ plan: meta.new_plan })}`;
  }
  if (event.event === "created" && meta.plan) {
    const parts = [planLabel({ plan: meta.plan })];
    parts.push(meta.expires_at ? `until ${formatDate(meta.expires_at)}` : "lifetime");
    if (meta.max_devices) parts.push(`${meta.max_devices} device(s)`);
    if (meta.source === "cli") parts.push("via command line");
    return parts.join(" · ");
  }
  if (event.event === "updated" && meta.changes) {
    const fields = Object.keys(meta.changes).map((f) => FIELD_LABELS[f] || f);
    return fields.join(", ");
  }
  return "";
};

const hasChanges = (event) => event.event === "updated" && event.meta?.changes && Object.keys(event.meta.changes).length;
const toggle = (id) => (expanded.value = { ...expanded.value, [id]: !expanded.value[id] });
</script>

<template>
  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-6">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      <div class="flex items-center gap-2 flex-1">
        <div class="w-9 h-9 bg-violet-50 rounded-[10px] flex items-center justify-center shrink-0">
          <Activity class="w-[18px] h-[18px] text-violet-600" />
        </div>
        <h4 class="text-brand-dark font-bold">Tracking</h4>
        <span class="text-xs text-brand-light">({{ eventsMeta.total ?? 0 }})</span>
      </div>
      <div class="relative w-full sm:w-64">
        <select v-model="filter" class="select-soft" aria-label="Filter by event type">
          <option value="">All events</option>
          <optgroup v-for="(options, group) in filterGroups" :key="group" :label="group">
            <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </optgroup>
        </select>
        <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>

    <div v-if="eventsLoading && !events.length" class="space-y-3">
      <Skeleton v-for="i in 4" :key="i" height="56px" rounded="12px" />
    </div>

    <div v-else-if="!events.length" class="text-center py-10 bg-white rounded-[12px] border border-dashed border-[#DCDEDD]">
      <Activity class="w-9 h-9 text-gray-300 mx-auto mb-3" />
      <p class="text-sm font-semibold text-brand-dark">No events {{ filter ? "of this type" : "yet" }}</p>
      <p class="text-xs text-brand-light">Admin changes, device activity and denied attempts appear here.</p>
    </div>

    <ol v-else class="relative" :class="{ 'opacity-60': eventsLoading }">
      <li v-for="(event, index) in events" :key="event.id" class="relative flex gap-4 pb-5 last:pb-0">
        <!-- Rail -->
        <span
          v-if="index < events.length - 1"
          class="absolute left-[17px] top-10 bottom-0 w-px bg-[#DCDEDD]"
          aria-hidden="true"
        ></span>
        <div class="w-9 h-9 rounded-full ring-4 flex items-center justify-center shrink-0 z-10" :class="eventToneClass(event)">
          <component :is="ICONS[event.event] || Activity" class="w-4 h-4" />
        </div>

        <div
          class="flex-1 min-w-0 bg-white border rounded-[12px] px-4 py-3"
          :class="isDenied(event) ? 'border-red-200' : 'border-[#DCDEDD]'"
        >
          <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div class="min-w-0">
              <p class="text-sm font-semibold" :class="isDenied(event) ? 'text-red-700' : 'text-brand-dark'">
                {{ eventLabel(event) }}
              </p>
              <p v-if="summaryLine(event)" class="text-xs text-brand-light mt-0.5 break-words">{{ summaryLine(event) }}</p>
            </div>
            <p class="text-xs text-brand-light whitespace-nowrap" :title="formatDateTime(event.created_at)">
              {{ relativeTime(event.created_at) }}
              <span class="text-gray-400">&middot; {{ formatDateTime(event.created_at) }}</span>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-brand-light">
            <span v-if="event.device_id" class="inline-flex items-center gap-1 min-w-0" :title="event.device_id">
              <Laptop class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate max-w-[220px]">
                {{ event.device_name || event.device_id }}
                <template v-if="event.platform"> &middot; {{ platformLabel(event.platform) }}</template>
                <template v-if="event.app_version"> &middot; v{{ event.app_version }}</template>
              </span>
            </span>
            <span v-if="event.user_name || event.user_id" class="inline-flex items-center gap-1">
              <UserCog class="w-3.5 h-3.5" /> {{ event.user_name || `User #${event.user_id}` }}
            </span>
            <span v-if="event.ip" class="inline-flex items-center gap-1 font-mono">
              <Globe class="w-3.5 h-3.5" /> {{ event.ip }}
            </span>
          </div>

          <!-- Field changes (updated) -->
          <template v-if="hasChanges(event)">
            <button
              type="button"
              @click="toggle(event.id)"
              class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
              :aria-expanded="!!expanded[event.id]"
            >
              <component :is="expanded[event.id] ? ChevronDown : ChevronRight" class="w-3.5 h-3.5" />
              {{ expanded[event.id] ? "Hide changes" : "Show changes" }}
            </button>
            <div v-if="expanded[event.id]" class="mt-2 overflow-x-auto">
              <table class="min-w-full text-xs">
                <thead>
                  <tr class="text-left text-brand-light">
                    <th class="py-1 pr-4 font-semibold">Field</th>
                    <th class="py-1 pr-4 font-semibold">Old</th>
                    <th class="py-1 font-semibold">New</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(change, field) in event.meta.changes" :key="field" class="border-t border-[#F1F1F1] align-top">
                    <td class="py-1.5 pr-4 font-semibold text-brand-dark whitespace-nowrap">{{ FIELD_LABELS[field] || field }}</td>
                    <td class="py-1.5 pr-4 text-red-600 line-through decoration-red-300 break-words">{{ formatValue(field, change.old) }}</td>
                    <td class="py-1.5 text-emerald-700 break-words">{{ formatValue(field, change.new) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </li>
    </ol>

    <Pagination
      v-if="eventsMeta.total > 0"
      :meta="eventsMeta"
      :loading="eventsLoading"
      item-label="events"
      :show-per-page="true"
      @page-change="onPage"
      @per-page-change="onPerPage"
    />
  </div>
</template>
