<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  ClipboardCheck,
  Plus,
  Pencil,
  Trash2,
  Paperclip,
  CalendarDays,
  ListChecks,
  X,
  AlertCircle,
  StickyNote,
  CheckCircle2,
  Circle,
  Camera,
  MapPin,
  Users,
} from "lucide-vue-next";
import { compressImage, cloudinaryThumb } from "@/utils/fileUtils";
import { useProjectUatStore } from "@/stores/projectUat";
import { useToastStore } from "@/stores/toast";
import { can } from "@/helpers/permissionHelper";
import { formatDate, todayLocal } from "@/utils/dateUtils";
import { UiAlert, UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiInput, UiModal, UiSelect } from "@/components/ui";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  projectId: { type: [String, Number], required: true },
});
const emit = defineEmits(["changed"]);

const store = useProjectUatStore();
const toast = useToastStore();
const { uat, loading, saving } = storeToRefs(store);

const canEdit = computed(() => can("project-edit"));
const canDelete = computed(() => can("project-delete"));

const STATUS_TONES = { scheduled: "neutral", in_progress: "info", passed: "ok", revision: "warn" };
const STATUS_DOTS = { scheduled: "bg-ui-line-strong", in_progress: "bg-ui-accent", passed: "bg-ui-ok", revision: "bg-ui-warn" };
const STATUS_OPTIONS = computed(() =>
  ["scheduled", "in_progress", "revision", "passed"].map((value) => ({ value, label: t(`projects.uat.status.${value}`) }))
);
const statusLabel = (status) => t(`projects.uat.status.${status}`);

// Findings (temuan) and notes (catatan) of a round; feature and menu optional.
const ITEM_TONES = { finding: "warn", note: "neutral" };
let itemKey = 0;
const newItem = (type = "finding", item = {}) => ({
  key: ++itemKey,
  id: item.id || null,
  locationKey: item.locationKey ?? null,
  type: item.type || type,
  feature: item.feature || "",
  menu: item.menu || "",
  description: item.description || "",
});
const where = (item) => [item.feature, item.menu].filter(Boolean).join(" › ");

// Places one UAT round ran at, at the same time (e.g. head office + branch).
let placeKey = 0;
const newPlace = (place = {}, date = "") => ({
  key: ++placeKey,
  id: place.id || null,
  location: place.location || "",
  date: place.date || date || "",
  time: place.time || "",
  participants: place.participants || "",
});
const addPlace = () => form.value.locations.push(newPlace({}, form.value.date));
const removePlace = (index) => {
  const [removed] = form.value.locations.splice(index, 1);
  form.value.items.forEach((item) => item.locationKey === removed.key && (item.locationKey = null));
};
const placeOptions = computed(() => [
  { value: "", label: t("projects.uat.locations.none") },
  ...form.value.locations.map((place, i) => ({ value: place.key, label: place.location.trim() || t("projects.uat.locations.unnamed", { n: i + 1 }) })),
]);
const placeLine = (place) => [place.date ? formatDate(place.date) : null, place.time].filter(Boolean).join(" · ");

// Card filter: all items, or one place's items (when a round ran in several places).
const placeFilter = ref({});
const visibleItems = (session) => {
  const id = placeFilter.value[session.id];
  return id ? session.items.filter((item) => item.location_id === id) : session.items;
};

// ---- Check-off and proof photo, right from the round's card ----
const busyItem = ref(null);
const toggleResolved = async (item) => {
  busyItem.value = item.id;
  try {
    await store.resolveItem(props.projectId, item.id, !item.is_resolved);
    emit("changed", uat.value);
  } catch (error) {
    toast.error(t("projects.uat.items.saveFailed"), error.message);
  } finally {
    busyItem.value = null;
  }
};
// Photos are shrunk in the browser first (max 1600 px, JPEG) and the
// server accepts at most 2 MB.
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const onPhoto = async (item, event) => {
  const picked = event.target.files?.[0];
  event.target.value = "";
  if (!picked) return;
  busyItem.value = item.id;
  try {
    const file = await compressImage(picked);
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error(t("projects.uat.items.photoTooLarge"));
      return;
    }
    await store.uploadItemPhoto(props.projectId, item.id, file);
    toast.success(t("projects.uat.items.photoUploaded"));
  } catch (error) {
    toast.error(t("projects.uat.items.photoFailed"), error.message);
  } finally {
    busyItem.value = null;
  }
};
const removePhoto = async (item) => {
  busyItem.value = item.id;
  try {
    await store.deleteItemPhoto(props.projectId, item.id);
  } catch (error) {
    toast.error(t("projects.uat.items.photoFailed"), error.message);
  } finally {
    busyItem.value = null;
  }
};
const resolvedLabel = (item) => t(`projects.uat.items.resolved.${item.type}`);

// One slot per agreed round (plus any extra rounds), for the progress strip.
const slots = computed(() => {
  const count = Math.max(uat.value.planned || 0, uat.value.sessions.length);
  return Array.from({ length: count }, (_, index) => {
    const session = uat.value.sessions[index];
    return { round: index + 1, status: session?.status || null, extra: uat.value.planned != null && index + 1 > uat.value.planned };
  });
});

const summaryText = computed(() => {
  const { planned, done } = uat.value;
  if (planned == null) return t("projects.uat.summary.noPlan", { done }, done);
  if (done > planned) return t("projects.uat.summary.overPlan", { done, planned });
  return t("projects.uat.summary.ofPlan", { done, planned });
});

const notify = (title) => {
  toast.success(title);
  emit("changed", uat.value);
};

// ---- Agreed rounds ----
const editingPlan = ref(false);
const planInput = ref("");
const planError = ref("");
const startPlanEdit = () => {
  planInput.value = uat.value.planned ?? "";
  planError.value = "";
  editingPlan.value = true;
};
const savePlan = async () => {
  const raw = String(planInput.value).trim();
  const planned = raw === "" ? null : Number(raw);
  if (planned !== null && (!Number.isInteger(planned) || planned < 1 || planned > 20)) {
    planError.value = t("projects.uat.plan.invalid");
    return;
  }
  try {
    await store.setPlan(props.projectId, planned);
    editingPlan.value = false;
    notify(t("projects.uat.plan.saved"));
  } catch (error) {
    planError.value = error.message;
  }
};

// ---- Round form ----
const formOpen = ref(false);
const editing = ref(null);
const formError = ref("");
const fileInputRef = ref(null);
const form = ref({});
const today = () => todayLocal();

const openForm = (session = null) => {
  editing.value = session;
  formError.value = "";
  if (session) {
    const locations = (session.locations || []).map((place) => newPlace(place));
    const keyOf = Object.fromEntries(locations.map((place) => [place.id, place.key]));
    form.value = {
      date: session.date || "",
      status: session.status,
      notes: session.notes || "",
      locations,
      items: (session.items || []).map((item) => newItem(item.type, { ...item, locationKey: keyOf[item.location_id] ?? null })),
      file: null,
      removeAttachment: false,
    };
  } else {
    form.value = { date: today(), status: "scheduled", notes: "", locations: [], items: [], file: null, removeAttachment: false };
  }
  if (fileInputRef.value) fileInputRef.value.value = "";
  formOpen.value = true;
};
const nextRound = computed(() => (uat.value.sessions.at(-1)?.round || 0) + 1);
const formTitle = computed(() =>
  editing.value ? t("projects.uat.form.editTitle", { n: editing.value.round }) : t("projects.uat.form.addTitle", { n: nextRound.value })
);
const formOverPlan = computed(() => !editing.value && uat.value.planned != null && nextRound.value > uat.value.planned);

const addItem = (type) => form.value.items.push(newItem(type));
const removeItem = (index) => form.value.items.splice(index, 1);

const onFile = (event) => {
  form.value.file = event.target.files[0] ?? null;
  if (form.value.file) form.value.removeAttachment = false;
};

const submit = async () => {
  formError.value = "";
  // Fully empty rows are dropped; a row with a feature/menu needs a description.
  const items = form.value.items.filter((item) => item.description.trim() || item.feature.trim() || item.menu.trim());
  if (items.some((item) => !item.description.trim())) {
    formError.value = t("projects.uat.items.descriptionRequired");
    return;
  }
  const places = form.value.locations;
  if (places.some((place) => !place.location.trim())) {
    formError.value = t("projects.uat.locations.nameRequired");
    return;
  }
  const payload = new FormData();
  payload.append("date", form.value.date || "");
  payload.append("locations_sent", "1");
  places.forEach((place, i) => {
    if (place.id) payload.append(`locations[${i}][id]`, place.id);
    payload.append(`locations[${i}][location]`, place.location.trim());
    payload.append(`locations[${i}][date]`, place.date || "");
    payload.append(`locations[${i}][time]`, place.time || "");
    payload.append(`locations[${i}][participants]`, place.participants.trim());
  });
  payload.append("status", form.value.status);
  payload.append("notes", form.value.notes || "");
  payload.append("items_sent", "1");
  items.forEach((item, i) => {
    if (item.id) payload.append(`items[${i}][id]`, item.id);
    payload.append(`items[${i}][type]`, item.type);
    payload.append(`items[${i}][feature]`, item.feature.trim());
    payload.append(`items[${i}][menu]`, item.menu.trim());
    payload.append(`items[${i}][description]`, item.description.trim());
    const placeIndex = places.findIndex((place) => place.key === item.locationKey);
    if (placeIndex >= 0) payload.append(`items[${i}][location_index]`, placeIndex);
  });
  if (form.value.file) payload.append("attachment", form.value.file);
  if (form.value.removeAttachment) payload.append("remove_attachment", "1");
  try {
    if (editing.value) {
      await store.updateSession(props.projectId, editing.value.id, payload);
      notify(t("projects.uat.form.updated"));
    } else {
      await store.createSession(props.projectId, payload);
      notify(t("projects.uat.form.created"));
    }
    formOpen.value = false;
  } catch (error) {
    formError.value = error.message;
  }
};

// ---- Delete ----
const toDelete = ref(null);
const deleteOpen = ref(false);
const askDelete = (session) => {
  toDelete.value = session;
  deleteOpen.value = true;
};
const confirmDelete = async () => {
  try {
    await store.deleteSession(props.projectId, toDelete.value.id);
    deleteOpen.value = false;
    notify(t("projects.uat.deleted"));
  } catch (error) {
    toast.error(t("projects.uat.deleteFailed"), error.message);
  }
};

const loadError = ref(false);
onMounted(async () => {
  try {
    await store.fetch(props.projectId);
  } catch {
    loadError.value = true;
  }
});
</script>

<template>
  <section class="space-y-4 sm:space-y-5">
    <!-- Summary -->
    <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-ui-h2 text-ui-ink">{{ $t("projects.uat.title") }}</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.uat.subtitle") }}</p>
        </div>
        <UiButton v-if="canEdit" :icon="Plus" :variant="uat.passed_round ? 'secondary' : 'primary'" class="w-full sm:w-auto shrink-0" :disabled="loading" @click="openForm()">
          {{ $t("projects.uat.add", { n: nextRound }) }}
        </UiButton>
      </div>

      <div v-if="loading && !uat.sessions.length && uat.planned == null" class="mt-5 space-y-3" aria-busy="true">
        <Skeleton width="40%" height="16px" />
        <Skeleton width="100%" height="10px" />
      </div>

      <template v-else>
        <div class="mt-5 grid grid-cols-1 sm:grid-cols-[minmax(0,220px)_1fr] gap-4 sm:gap-6 items-start">
          <!-- Agreement -->
          <div class="rounded-ui-control bg-ui-subtle px-4 py-3">
            <p class="text-ui-cap text-ui-muted">{{ $t("projects.uat.plan.label") }}</p>
            <form v-if="editingPlan" class="mt-1.5 space-y-2" @submit.prevent="savePlan">
              <div class="flex items-center gap-2">
                <label for="project-uat-plan" class="sr-only">{{ $t("projects.uat.plan.label") }}</label>
                <UiInput id="project-uat-plan" v-model="planInput" type="number" :placeholder="$t('projects.uat.plan.placeholder')" class="w-24" />
                <span class="text-ui-small text-ui-muted">× UAT</span>
              </div>
              <p class="text-ui-cap text-ui-muted">{{ $t("projects.uat.plan.hint") }}</p>
              <p v-if="planError" class="text-ui-cap text-ui-bad">{{ planError }}</p>
              <div class="flex gap-2">
                <UiButton size="sm" type="submit" :loading="saving">{{ $t("common.actions.save") }}</UiButton>
                <UiButton size="sm" variant="ghost" @click="editingPlan = false">{{ $t("common.actions.cancel") }}</UiButton>
              </div>
            </form>
            <div v-else class="flex items-center justify-between gap-2 mt-0.5">
              <p class="text-ui-h2 text-ui-ink tabular-nums">
                {{ uat.planned != null ? $t("projects.uat.plan.value", { n: uat.planned }) : $t("projects.uat.plan.none") }}
              </p>
              <UiButton v-if="canEdit" variant="ghost" size="sm" :icon="Pencil" :aria-label="$t('projects.uat.plan.edit')" :title="$t('projects.uat.plan.edit')" @click="startPlanEdit" />
            </div>
          </div>

          <!-- Progress -->
          <div class="min-w-0">
            <div class="flex items-baseline justify-between gap-3">
              <p class="text-ui-body font-medium text-ui-ink">{{ summaryText }}</p>
              <p v-if="uat.remaining != null && !uat.passed_round" class="text-ui-cap text-ui-muted tabular-nums shrink-0">
                {{ $t("projects.uat.summary.remaining", { n: uat.remaining }, uat.remaining) }}
              </p>
            </div>
            <div v-if="slots.length" class="flex gap-1.5 mt-2.5" role="list">
              <div
                v-for="slot in slots"
                :key="slot.round"
                role="listitem"
                class="flex-1 min-w-0"
                :title="`UAT ${slot.round}: ${slot.status ? statusLabel(slot.status) : $t('projects.uat.notYet')}`"
              >
                <div
                  class="h-2 rounded-full"
                  :class="[slot.status ? STATUS_DOTS[slot.status] : 'bg-ui-subtle border border-dashed border-ui-line-strong', slot.extra ? 'opacity-70' : '']"
                ></div>
                <p class="text-ui-cap mt-1 truncate tabular-nums" :class="slot.extra ? 'text-ui-warn' : 'text-ui-muted'">UAT {{ slot.round }}</p>
              </div>
            </div>
            <p v-else class="text-ui-cap text-ui-muted mt-2">{{ $t("projects.uat.summary.setPlanHint") }}</p>
          </div>
        </div>

        <UiAlert v-if="uat.passed_round" tone="ok" class="mt-4">
          {{ $t("projects.uat.passedBanner", { n: uat.passed_round }) }}
        </UiAlert>
        <UiAlert v-else-if="uat.over_plan" tone="warn" class="mt-4">
          {{ $t("projects.uat.overPlanBanner", { n: uat.planned }) }}
        </UiAlert>
      </template>
    </div>

    <p v-if="loadError" class="text-ui-small text-ui-bad">{{ $t("projects.uat.loadFailed") }}</p>

    <!-- Rounds -->
    <UiEmpty
      v-else-if="!loading && !uat.sessions.length"
      :icon="ClipboardCheck"
      :title="$t('projects.uat.emptyTitle')"
      :message="$t('projects.uat.emptyMessage')"
      class="bg-ui-surface border border-ui-line rounded-ui-card"
    />

    <ol v-else class="space-y-3 ui-stagger">
      <li
        v-for="session in [...uat.sessions].reverse()"
        :key="session.id"
        class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5"
      >
        <div class="flex items-start gap-3">
          <span class="w-10 h-10 rounded-ui-control bg-ui-subtle text-ui-ink flex flex-col items-center justify-center shrink-0 leading-none">
            <span class="text-[9px] uppercase tracking-wide text-ui-muted">UAT</span>
            <span class="text-ui-body font-semibold tabular-nums">{{ session.round }}</span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-ui-body font-medium text-ui-ink">{{ $t("projects.uat.roundTitle", { n: session.round }) }}</p>
              <UiBadge :tone="STATUS_TONES[session.status] || 'neutral'" dot>{{ statusLabel(session.status) }}</UiBadge>
              <UiBadge v-if="session.over_plan" tone="warn">{{ $t("projects.uat.overPlanBadge") }}</UiBadge>
            </div>
            <div class="flex items-center gap-3 flex-wrap mt-1 text-ui-cap text-ui-muted">
              <span class="inline-flex items-center gap-1 tabular-nums"><CalendarDays class="w-3.5 h-3.5" />{{ session.date ? formatDate(session.date) : $t("projects.uat.noDate") }}</span>
              <span v-if="session.findings_count" class="inline-flex items-center gap-1"><ListChecks class="w-3.5 h-3.5" />{{ $t("projects.uat.findingsCount", { n: session.findings_count }, session.findings_count) }}</span>
              <span v-if="session.notes_count" class="inline-flex items-center gap-1"><StickyNote class="w-3.5 h-3.5" />{{ $t("projects.uat.notesCount", { n: session.notes_count }, session.notes_count) }}</span>
              <span v-if="session.items?.length" class="inline-flex items-center gap-1" :class="session.resolved_count === session.items.length ? 'text-ui-ok' : ''">
                <CheckCircle2 class="w-3.5 h-3.5" />{{ $t("projects.uat.items.resolvedCount", { done: session.resolved_count, total: session.items.length }) }}
              </span>
            </div>
            <!-- Places held at the same time -->
            <ul v-if="session.locations?.length" class="mt-2 flex flex-wrap gap-1.5">
              <li v-for="place in session.locations" :key="place.id" class="inline-flex items-center gap-1.5 max-w-full rounded-ui-control bg-ui-subtle px-2 py-1 text-ui-cap text-ui-text">
                <MapPin class="w-3.5 h-3.5 text-ui-muted shrink-0" />
                <span class="font-medium text-ui-ink truncate">{{ place.location }}</span>
                <span v-if="placeLine(place)" class="text-ui-muted tabular-nums whitespace-nowrap">{{ placeLine(place) }}</span>
                <span v-if="place.participants" class="inline-flex items-center gap-1 text-ui-muted truncate" :title="place.participants"><Users class="w-3 h-3 shrink-0" />{{ place.participants }}</span>
              </li>
            </ul>
          </div>
          <div v-if="canEdit || canDelete" class="flex items-center gap-0.5 shrink-0">
            <button
              v-if="canEdit"
              type="button"
              class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
              :title="$t('common.actions.edit')"
              :aria-label="$t('common.actions.edit')"
              @click="openForm(session)"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              v-if="canDelete"
              type="button"
              class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
              :title="$t('common.actions.delete')"
              :aria-label="$t('common.actions.delete')"
              @click="askDelete(session)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="session.notes || session.items?.length || session.attachment" class="mt-3 sm:pl-[52px] space-y-3">
          <p v-if="session.notes" class="text-ui-small text-ui-text whitespace-pre-line break-words">{{ session.notes }}</p>
          <div v-if="session.items?.length && session.locations?.length > 1" class="flex flex-wrap gap-1.5" role="group" :aria-label="$t('projects.uat.locations.filter')">
            <button
              v-for="option in [{ id: null, location: $t('projects.uat.locations.all'), items_count: session.items.length }, ...session.locations]"
              :key="option.id ?? 'all'"
              type="button"
              :aria-pressed="(placeFilter[session.id] ?? null) === option.id"
              class="h-7 px-2.5 rounded-full border text-ui-cap font-medium"
              :class="(placeFilter[session.id] ?? null) === option.id ? 'bg-ui-ink text-white border-ui-ink' : 'border-ui-line text-ui-muted hover:text-ui-ink'"
              @click="placeFilter = { ...placeFilter, [session.id]: option.id }"
            >
              {{ option.location }} <span class="tabular-nums opacity-70">{{ option.items_count }}</span>
            </button>
          </div>
          <ol v-if="session.items?.length" class="border border-ui-line rounded-ui-control divide-y divide-ui-line">
            <li v-for="(item, index) in visibleItems(session)" :key="item.id" class="flex items-start gap-3 px-3 py-2.5" :class="item.is_resolved ? 'bg-ui-ok-soft/40' : ''">
              <span class="text-ui-cap text-ui-faint tabular-nums w-4 shrink-0 pt-0.5">{{ index + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <UiBadge :tone="ITEM_TONES[item.type]">{{ $t(`projects.uat.items.type.${item.type}`) }}</UiBadge>
                  <span v-if="where(item)" class="text-ui-cap font-medium text-ui-muted break-words">{{ where(item) }}</span>
                  <span v-if="item.location && session.locations?.length > 1" class="inline-flex items-center gap-1 text-ui-cap text-ui-muted"><MapPin class="w-3 h-3" />{{ item.location }}</span>
                </div>
                <p class="text-ui-small mt-1 whitespace-pre-line break-words" :class="item.is_resolved ? 'text-ui-muted' : 'text-ui-text'">{{ item.description }}</p>
                <p v-if="item.is_resolved" class="text-ui-cap text-ui-ok mt-1">
                  {{ resolvedLabel(item) }}<template v-if="item.resolved_by"> · {{ item.resolved_by }}</template><template v-if="item.resolved_at"> · {{ formatDate(item.resolved_at) }}</template>
                </p>
                <!-- Optional proof photo -->
                <div v-if="item.photo" class="mt-2 flex items-center gap-2">
                  <a :href="item.photo.url" target="_blank" rel="noopener" class="block w-16 h-16 rounded-ui-control overflow-hidden border border-ui-line shrink-0" :title="$t('projects.uat.items.openPhoto')">
                    <img :src="cloudinaryThumb(item.photo.url, { width: 128, height: 128 })" :alt="item.photo.name || $t('projects.uat.items.photo')" class="w-full h-full object-cover" loading="lazy" />
                  </a>
                  <button v-if="canEdit" type="button" class="inline-flex items-center gap-1 text-ui-cap text-ui-muted hover:text-ui-bad disabled:opacity-50" :disabled="busyItem === item.id" @click="removePhoto(item)">
                    <X class="w-3.5 h-3.5" />{{ $t("projects.uat.items.removePhoto") }}
                  </button>
                </div>
              </div>
              <div v-if="canEdit" class="flex flex-col sm:flex-row items-end sm:items-center gap-1 shrink-0">
                <label
                  class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink cursor-pointer"
                  :class="busyItem === item.id ? 'opacity-50 pointer-events-none' : ''"
                  :title="item.photo ? $t('projects.uat.items.replacePhoto') : $t('projects.uat.items.addPhoto')"
                >
                  <Camera class="w-4 h-4" />
                  <span class="sr-only">{{ item.photo ? $t("projects.uat.items.replacePhoto") : $t("projects.uat.items.addPhoto") }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onPhoto(item, $event)" />
                </label>
                <button
                  type="button"
                  role="checkbox"
                  :aria-checked="item.is_resolved"
                  :disabled="busyItem === item.id"
                  class="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-ui-control border text-ui-cap font-medium whitespace-nowrap disabled:opacity-50"
                  :class="item.is_resolved ? 'border-ui-ok/30 bg-ui-ok-soft text-ui-ok' : 'border-ui-line text-ui-muted hover:text-ui-ink hover:bg-ui-subtle'"
                  @click="toggleResolved(item)"
                >
                  <component :is="item.is_resolved ? CheckCircle2 : Circle" class="w-3.5 h-3.5" />{{ resolvedLabel(item) }}
                </button>
              </div>
              <span v-else-if="item.is_resolved" class="shrink-0 text-ui-ok" :title="resolvedLabel(item)"><CheckCircle2 class="w-4 h-4" /></span>
            </li>
          </ol>
          <a
            v-if="session.attachment"
            :href="session.attachment.url"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 max-w-full h-8 px-2.5 rounded-ui-control border border-ui-line text-ui-small text-ui-ink hover:bg-ui-subtle"
          >
            <Paperclip class="w-3.5 h-3.5 text-ui-muted shrink-0" />
            <span class="truncate">{{ session.attachment.name }}</span>
            <span v-if="session.attachment.size" class="text-ui-cap text-ui-muted tabular-nums shrink-0">{{ session.attachment.size }}</span>
          </a>
        </div>
      </li>
    </ol>

    <!-- Round form -->
    <UiModal :open="formOpen" :title="formTitle" size="lg" @update:open="(value) => !value && (formOpen = false)">
      <form id="project-uat-form" class="space-y-4" @submit.prevent="submit">
        <UiAlert v-if="formOverPlan" tone="warn">
          {{ $t("projects.uat.form.overPlanWarning", { n: uat.planned }) }}
        </UiAlert>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="form.date" type="date" :label="$t('projects.uat.form.date')" :icon="CalendarDays" />
          <UiSelect v-model="form.status" :options="STATUS_OPTIONS" :label="$t('projects.uat.form.status')" required />
        </div>
        <UiInput v-model="form.notes" :rows="2" :label="$t('projects.uat.form.notes')" :placeholder="$t('projects.uat.form.notesPlaceholder')" />

        <!-- Places: the same UAT held at several places at the same time -->
        <div>
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <p class="text-ui-small font-medium text-ui-ink">{{ $t("projects.uat.locations.title") }}</p>
            <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("projects.uat.locations.count", { n: form.locations.length }, form.locations.length) }}</span>
          </div>
          <p class="text-ui-cap text-ui-muted mb-2">{{ $t("projects.uat.locations.hint") }}</p>
          <ol class="space-y-2.5">
            <li v-for="(place, index) in form.locations" :key="place.key" class="rounded-ui-control border border-ui-line p-3 space-y-2.5">
              <div class="flex items-center gap-2">
                <MapPin class="w-4 h-4 text-ui-muted shrink-0" />
                <span class="text-ui-small font-medium text-ui-ink">{{ $t("projects.uat.locations.unnamed", { n: index + 1 }) }}</span>
                <button
                  type="button"
                  class="ml-auto w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                  :title="$t('projects.uat.locations.remove')"
                  :aria-label="$t('projects.uat.locations.remove')"
                  @click="removePlace(index)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
              <UiInput v-model="place.location" :label="$t('projects.uat.locations.location')" :placeholder="$t('projects.uat.locations.locationPlaceholder')" />
              <div class="grid grid-cols-2 gap-2.5">
                <UiInput v-model="place.date" type="date" :label="$t('projects.uat.locations.date')" />
                <UiInput v-model="place.time" type="time" :label="$t('projects.uat.locations.time')" />
              </div>
              <UiInput v-model="place.participants" :label="$t('projects.uat.locations.participants')" :placeholder="$t('projects.uat.locations.participantsPlaceholder')" />
            </li>
          </ol>
          <UiButton variant="secondary" size="sm" :icon="MapPin" class="mt-2.5" :disabled="form.locations.length >= 10" @click="addPlace">{{ $t("projects.uat.locations.add") }}</UiButton>
        </div>

        <!-- Findings / notes: one card per item -->
        <div>
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <p class="text-ui-small font-medium text-ui-ink">{{ $t("projects.uat.items.title") }}</p>
            <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("projects.uat.items.count", { n: form.items.length }, form.items.length) }}</span>
          </div>
          <p v-if="!form.items.length" class="text-ui-cap text-ui-muted mb-2">{{ $t("projects.uat.items.empty") }}</p>
          <ol class="space-y-2.5">
            <li v-for="(item, index) in form.items" :key="item.key" class="rounded-ui-control border border-ui-line p-3 space-y-2.5">
              <div class="flex items-center gap-2">
                <span class="text-ui-cap text-ui-faint tabular-nums w-4 shrink-0">{{ index + 1 }}</span>
                <div class="inline-flex rounded-ui-control border border-ui-line p-0.5" role="radiogroup" :aria-label="$t('projects.uat.items.typeLabel')">
                  <button
                    v-for="type in ['finding', 'note']"
                    :key="type"
                    type="button"
                    role="radio"
                    :aria-checked="item.type === type"
                    class="h-7 px-2.5 rounded-[6px] text-ui-cap font-medium"
                    :class="item.type === type ? (type === 'finding' ? 'bg-ui-warn-soft text-ui-warn' : 'bg-ui-subtle text-ui-ink') : 'text-ui-muted hover:text-ui-ink'"
                    @click="item.type = type"
                  >
                    {{ $t(`projects.uat.items.type.${type}`) }}
                  </button>
                </div>
                <button
                  type="button"
                  class="ml-auto w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                  :title="$t('projects.uat.items.remove')"
                  :aria-label="$t('projects.uat.items.remove')"
                  @click="removeItem(index)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <UiInput v-model="item.feature" :label="$t('projects.uat.items.feature')" :placeholder="$t('projects.uat.items.featurePlaceholder')" />
                <UiInput v-model="item.menu" :label="$t('projects.uat.items.menu')" :placeholder="$t('projects.uat.items.menuPlaceholder')" />
              </div>
              <UiSelect
                v-if="form.locations.length"
                :model-value="item.locationKey ?? ''"
                :options="placeOptions"
                :label="$t('projects.uat.locations.itemLocation')"
                @update:model-value="(value) => (item.locationKey = value === '' ? null : Number(value))"
              />
              <UiInput v-model="item.description" :rows="2" :label="$t('projects.uat.items.description')" :placeholder="$t(`projects.uat.items.descriptionPlaceholder.${item.type}`)" />
            </li>
          </ol>
          <div class="flex flex-wrap gap-2 mt-2.5">
            <UiButton variant="secondary" size="sm" :icon="AlertCircle" @click="addItem('finding')">{{ $t("projects.uat.items.addFinding") }}</UiButton>
            <UiButton variant="secondary" size="sm" :icon="StickyNote" @click="addItem('note')">{{ $t("projects.uat.items.addNote") }}</UiButton>
          </div>
        </div>

        <div v-file-drop>
          <label for="project-uat-file" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.uat.form.attachment") }}</label>
          <div v-if="editing?.attachment && !form.removeAttachment && !form.file" class="flex items-center gap-2 mb-2 min-w-0">
            <Paperclip class="w-3.5 h-3.5 text-ui-muted shrink-0" />
            <a :href="editing.attachment.url" target="_blank" rel="noopener" class="text-ui-small text-ui-accent hover:underline truncate">{{ editing.attachment.name }}</a>
            <button type="button" class="ml-auto inline-flex items-center gap-1 text-ui-cap text-ui-muted hover:text-ui-bad shrink-0" @click="form.removeAttachment = true">
              <X class="w-3.5 h-3.5" />{{ $t("projects.uat.form.removeAttachment") }}
            </button>
          </div>
          <input
            id="project-uat-file"
            ref="fileInputRef"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            class="block w-full text-ui-small text-ui-text cursor-pointer file:mr-3 file:h-9 file:px-3.5 file:rounded-ui-control file:border file:border-solid file:border-ui-line-strong file:bg-ui-surface file:text-ui-small file:font-medium file:text-ui-ink hover:file:bg-ui-subtle"
            @change="onFile"
          />
          <p class="text-ui-cap text-ui-muted mt-1.5">{{ $t("projects.uat.form.attachmentHint") }}</p>
        </div>

        <p v-if="formError" class="text-ui-cap text-ui-bad">{{ formError }}</p>
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="formOpen = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="project-uat-form" :loading="saving" class="flex-1 sm:flex-none">{{ $t("common.actions.save") }}</UiButton>
      </template>
    </UiModal>

    <UiConfirmDialog
      v-model:open="deleteOpen"
      type="danger"
      :title="$t('projects.uat.deleteTitle', { n: toDelete?.round ?? '' })"
      :message="$t('projects.uat.deleteMessage')"
      :confirm-text="$t('common.actions.delete')"
      :loading="saving"
      @confirm="confirmDelete"
    />
  </section>
</template>
