<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { Activity, ChevronDown, ChevronRight, Globe, UserCog, Laptop } from "lucide-vue-next";
import { eventIcon } from "@/components/admin/license-manager/licenseEventIcons";
import { useLoadOnScroll } from "@/components/admin/license-manager/useLoadOnScroll";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiEmpty, UiSpinner } from "@/components/ui";
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

const { t } = useI18n();
const store = useLicenseManagerStore();
const { eventsMeta } = storeToRefs(store);

// Load on scroll: the first PER_PAGE events, more as the list scrolls.
const PER_PAGE = 10;
const filter = ref("");
const page = ref(0);
const lastPage = ref(1);
const events = ref([]);
const loading = ref(false);
const loadingMore = ref(false);
const expanded = ref({});
const scroller = ref(null);
const sentinel = ref(null);
const hasMore = computed(() => page.value < lastPage.value);

// Filter options grouped as Admin / App / Denied (group labels translated).
const GROUP_KEYS = { Admin: "licenses.timeline.groups.admin", App: "licenses.timeline.groups.app", Denied: "licenses.timeline.groups.denied" };
const filterGroups = computed(() => {
  const groups = {};
  for (const [value, def] of Object.entries(EVENT_TYPES)) {
    const group = GROUP_KEYS[def.group] ? t(GROUP_KEYS[def.group]) : def.group;
    (groups[group] ||= []).push({ value, label: def.label });
  }
  return groups;
});

// A token per request so a slow page of an old filter is dropped.
let requestId = 0;
const fetchPage = async (next) => {
  const id = ++requestId;
  const items = await store.fetchEvents(props.licenseId, { event: filter.value, page: next, per_page: PER_PAGE });
  if (id !== requestId) return;
  events.value = next === 1 ? items : [...events.value, ...items.filter((e) => !events.value.some((x) => x.id === e.id))];
  page.value = next;
  lastPage.value = eventsMeta.value?.last_page ?? next;
};

// From the top (first load, filter change, reload after an action).
const load = async () => {
  loading.value = true;
  try {
    await fetchPage(1);
    scroller.value?.scrollTo?.({ top: 0 });
  } catch {
    // The store keeps the error; the list stays as it was.
  } finally {
    loading.value = false;
  }
};

const loadMore = async () => {
  loadingMore.value = true;
  try {
    await fetchPage(page.value + 1);
  } catch {
    // Scrolling again retries.
  } finally {
    loadingMore.value = false;
  }
};

useLoadOnScroll(scroller, sentinel, loadMore, () => hasMore.value && !loading.value && !loadingMore.value);

onMounted(load);
watch(filter, load);

defineExpose({ reload: load });

const isDenied = (event) => event.event?.startsWith("denied_");

const formatValue = (field, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? t("common.labels.yes") : t("common.labels.no");
  if (field === "starts_at" || field === "expires_at") return formatDate(value);
  return String(value);
};

// One-line summary under the label for events with simple meta.
const summaryLine = (event) => {
  const meta = event.meta || {};
  if (event.event === "extended") {
    const noEnd = t("licenses.timeline.noEndDate");
    return `${meta.old_expires_at ? formatDate(meta.old_expires_at) : noEnd} → ${meta.new_expires_at ? formatDate(meta.new_expires_at) : noEnd}`;
  }
  if (event.event === "plan_changed") {
    const parts = [`${planLabel({ plan: meta.old_plan })} → ${planLabel({ plan: meta.new_plan })}`];
    // Since a plan change replaces the key.
    if (meta.new_key) parts.push(t("licenses.timeline.newKey", { key: meta.new_key }));
    if (meta.devices_signed_out)
      parts.push(t("licenses.timeline.devicesSignedOut", { n: meta.devices_signed_out }, meta.devices_signed_out));
    return parts.join(" · ");
  }
  if (event.event === "created" && meta.plan) {
    const parts = [planLabel({ plan: meta.plan })];
    parts.push(meta.expires_at ? t("licenses.timeline.until", { date: formatDate(meta.expires_at) }) : t("licenses.timeline.lifetime"));
    if (meta.max_devices) parts.push(t("licenses.timeline.devices", { n: meta.max_devices }, meta.max_devices));
    if (meta.source === "cli") parts.push(t("licenses.timeline.viaCli"));
    return parts.join(" · ");
  }
  if (event.event === "app_updated" && (meta.from || meta.to)) {
    return `${meta.from || "?"} → ${meta.to || "?"}`;
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
  <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 px-5 pt-5 sm:px-6 pb-3">
      <div class="flex items-baseline gap-2 flex-1">
        <h3 class="text-ui-h2 text-ui-ink">{{ $t("licenses.timeline.title") }}</h3>
        <span class="text-ui-small text-ui-muted tabular-nums">{{ eventsMeta.total ?? 0 }}</span>
      </div>
      <div class="relative w-full sm:w-56">
        <select
          v-model="filter"
          class="w-full h-9 pl-3 pr-8 appearance-none bg-ui-surface text-ui-small text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
          :aria-label="$t('licenses.timeline.filterLabel')"
        >
          <option value="">{{ $t("licenses.timeline.allEvents") }}</option>
          <optgroup v-for="(options, group) in filterGroups" :key="group" :label="group">
            <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </optgroup>
        </select>
        <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
      </div>
    </div>

    <div v-if="loading && !events.length" class="px-5 sm:px-6 pb-5 space-y-3">
      <Skeleton v-for="i in 4" :key="i" height="48px" rounded="8px" />
    </div>

    <UiEmpty
      v-else-if="!events.length"
      compact
      :icon="Activity"
      :title="filter ? $t('licenses.timeline.emptyFiltered') : $t('licenses.timeline.empty')"
      :message="$t('licenses.timeline.emptyMessage')"
      class="pb-6"
    />

    <div v-else ref="scroller" class="max-h-[620px] overflow-y-auto scroll-soft px-5 sm:px-6 pb-3">
      <ol class="divide-y divide-ui-line border-t border-ui-line" :class="{ 'opacity-60': loading }">
        <li v-for="event in events" :key="event.id" class="flex gap-3.5 py-3.5">
          <div class="w-8 h-8 rounded-ui-control ring-1 flex items-center justify-center shrink-0" :class="eventToneClass(event)">
            <component :is="eventIcon(event)" class="w-4 h-4" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
              <div class="min-w-0">
                <p class="text-ui-body font-medium" :class="isDenied(event) ? 'text-ui-bad' : 'text-ui-ink'">
                  {{ eventLabel(event) }}
                </p>
                <p v-if="summaryLine(event)" class="text-ui-cap text-ui-muted mt-0.5 break-words">{{ summaryLine(event) }}</p>
              </div>
              <p class="text-ui-cap text-ui-muted whitespace-nowrap tabular-nums" :title="formatDateTime(event.created_at)">
                {{ relativeTime(event.created_at) }}
                <span class="text-ui-faint">&middot; {{ formatDateTime(event.created_at) }}</span>
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-ui-cap text-ui-muted">
              <span v-if="event.device_id" class="inline-flex items-center gap-1 min-w-0" :title="event.device_id">
                <Laptop class="w-3.5 h-3.5 shrink-0" />
                <span class="truncate max-w-[220px]">
                  {{ event.device_name || event.device_id }}
                  <template v-if="event.platform"> &middot; {{ platformLabel(event.platform) }}</template>
                  <template v-if="event.app_version"> &middot; v{{ event.app_version }}</template>
                </span>
              </span>
              <span v-if="event.user_name || event.user_id" class="inline-flex items-center gap-1">
                <UserCog class="w-3.5 h-3.5" /> {{ event.user_name || $t("licenses.timeline.userId", { id: event.user_id }) }}
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
                class="mt-1.5 inline-flex items-center gap-1 text-ui-cap font-medium text-ui-accent hover:underline"
                :aria-expanded="!!expanded[event.id]"
              >
                <component :is="expanded[event.id] ? ChevronDown : ChevronRight" class="w-3.5 h-3.5" />
                {{ expanded[event.id] ? $t("licenses.timeline.hideChanges") : $t("licenses.timeline.showChanges") }}
              </button>
              <div v-if="expanded[event.id]" class="mt-2 overflow-x-auto border border-ui-line rounded-ui-control">
                <table class="min-w-full text-ui-cap">
                  <thead class="bg-ui-subtle">
                    <tr class="text-left text-ui-muted">
                      <th class="py-1.5 px-3 font-medium">{{ $t("licenses.timeline.field") }}</th>
                      <th class="py-1.5 px-3 font-medium">{{ $t("licenses.timeline.old") }}</th>
                      <th class="py-1.5 px-3 font-medium">{{ $t("licenses.timeline.new") }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(change, field) in event.meta.changes" :key="field" class="border-t border-ui-line align-top">
                      <td class="py-1.5 px-3 font-medium text-ui-ink whitespace-nowrap">{{ FIELD_LABELS[field] || field }}</td>
                      <td class="py-1.5 px-3 text-ui-muted line-through break-words">{{ formatValue(field, change.old) }}</td>
                      <td class="py-1.5 px-3 text-ui-ink break-words">{{ formatValue(field, change.new) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
        </li>
      </ol>
      <div ref="sentinel" class="h-px"></div>
      <p v-if="loadingMore" class="flex items-center justify-center gap-2 py-3 text-ui-cap text-ui-muted">
        <UiSpinner size="14px" :center="false" :label="$t('licenses.timeline.loadingMore')" />
      </p>
      <p v-else-if="!hasMore && events.length > PER_PAGE" class="py-3 text-center text-ui-cap text-ui-faint">
        {{ $t("licenses.timeline.allLoaded", { n: events.length }) }}
      </p>
    </div>
  </section>
</template>
