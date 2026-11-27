<script setup>
import { computed, onMounted, ref, watch } from "vue";
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
  MapPin,
  Users,
  FileDown,
  Upload,
  FileText,
  FileSignature,
  ExternalLink,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import ProjectExportModal from "@/components/admin/project/detail/ProjectExportModal.vue";
import { useAlertModalStore } from "@/stores/alertModal";
import { compressImage, cloudinaryThumb } from "@/utils/fileUtils";
import { useProjectUatStore } from "@/stores/projectUat";
import { useToastStore } from "@/stores/toast";
import { can } from "@/helpers/permissionHelper";
import { formatDate, todayLocal } from "@/utils/dateUtils";
import { UiAlert, UiBadge, UiButton, UiConfirmDialog, UiEmpty, UiImageViewer, UiInput, UiModal, UiSelect, UiSpinner } from "@/components/ui";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  projectId: { type: [String, Number], required: true },
  projectName: { type: String, default: "" },
});
const emit = defineEmits(["changed"]);

const store = useProjectUatStore();
const toast = useToastStore();
const { uat, loading, saving } = storeToRefs(store);

const canEdit = computed(() => can("project-edit"));
const canDelete = computed(() => can("project-delete"));
const canExport = computed(() => can("project-export"));
const alertModal = useAlertModalStore();

const STATUS_TONES = { scheduled: "neutral", in_progress: "info", passed: "ok", revision: "warn" };
const STATUS_DOTS = { scheduled: "bg-ui-line-strong", in_progress: "bg-ui-accent", passed: "bg-ui-ok", revision: "bg-ui-warn" };
const STATUS_OPTIONS = computed(() =>
  ["scheduled", "in_progress", "revision", "passed"].map((value) => ({ value, label: t(`projects.uat.status.${value}`) }))
);
const statusLabel = (status) => t(`projects.uat.status.${status}`);

// Findings (temuan) and notes (catatan) belong to a session; feature and menu optional.
const ITEM_TONES = { finding: "warn", note: "neutral" };
const where = (item) => [item.feature, item.menu].filter(Boolean).join(" › ");

// Sessions of a UAT: held at the same time in different places. Every UAT
// has at least one; the place name is optional ("Sesi 1").
let placeKey = 0;
const newPlace = (place = {}, date = "") => ({
  key: ++placeKey,
  id: place.id || null,
  location: place.location || "",
  date: place.date || date || "",
  time: place.time || "",
  participants: place.participants || "",
  itemsCount: (place.findings_count || 0) + (place.notes_count || 0),
});
const addPlace = () => form.value.locations.push(newPlace({}, form.value.date));
const removePlace = async (index) => {
  const place = form.value.locations[index];
  if (place.itemsCount && !(await alertModal.confirm(t("projects.uat.locations.removeConfirm", { n: place.itemsCount }, place.itemsCount), { type: "danger", confirmText: t("projects.uat.locations.remove") }))) return;
  form.value.locations.splice(index, 1);
};
const placeTitle = (place, index) => {
  const n = place.number ?? index + 1;
  return place.location ? t("projects.uat.locations.titled", { n, name: place.location }) : t("projects.uat.locations.unnamed", { n });
};
const placeLine = (place) => [place.date ? formatDate(place.date) : null, place.time].filter(Boolean).join(" · ");

// ---- Add / edit a finding or note right in its session ----
const itemOpen = ref(false);
const itemError = ref("");
const itemForm = ref({});
const itemSession = ref(null);
const openItem = (session, place, type = "finding", item = null) => {
  itemSession.value = session;
  itemError.value = "";
  itemForm.value = {
    file: null,
    removeAttachment: false,
    attachment: item?.attachment || null,
    id: item?.id || null,
    locationId: place.id,
    type: item?.type || type,
    feature: item?.feature || "",
    menu: item?.menu || "",
    description: item?.description || "",
  };
  itemOpen.value = true;
};
const itemPlaceOptions = computed(() => (itemSession.value?.locations || []).map((place, i) => ({ value: place.id, label: placeTitle(place, i) })));
const saveItem = async () => {
  const f = itemForm.value;
  if (!f.description.trim()) {
    itemError.value = t("projects.uat.items.descriptionRequired");
    return;
  }
  const body = new FormData();
  body.append("type", f.type);
  body.append("feature", f.feature.trim());
  body.append("menu", f.menu.trim());
  body.append("description", f.description.trim());
  if (f.file) body.append("attachment", f.file);
  else if (f.removeAttachment) body.append("remove_attachment", "1");
  try {
    if (f.id) {
      body.append("location_id", Number(f.locationId));
      await store.updateItem(props.projectId, f.id, body);
      notify(t("projects.uat.items.updated"));
    } else {
      await store.addItem(props.projectId, f.locationId, body);
      notify(t(f.type === "finding" ? "projects.uat.items.findingAdded" : "projects.uat.items.noteAdded"));
    }
    itemOpen.value = false;
  } catch (error) {
    itemError.value = error.message;
  }
};
// Files on an item (issue evidence, revision proof): images are shrunk in
// the browser first; images or PDF, at most 2 MB.
const FILE_TYPES = "image/jpeg,image/png,image/webp,application/pdf";
const prepareFile = async (picked) => {
  const file = picked.type === "application/pdf" ? picked : await compressImage(picked);
  if (file.size > PHOTO_MAX_BYTES) throw new Error(t("projects.uat.items.fileTooLarge"));
  return file;
};
const onItemFile = async (event) => {
  const picked = event.target.files?.[0];
  event.target.value = "";
  if (!picked) return;
  try {
    itemForm.value.file = await prepareFile(picked);
    itemForm.value.removeAttachment = false;
    itemError.value = "";
  } catch (error) {
    itemError.value = error.message;
  }
};

// ---- Session blocks fold open/closed (remembered per project in this browser) ----
const foldKey = computed(() => `opus.uat.folded.${props.projectId}`);
const readFolded = () => {
  try {
    return JSON.parse(localStorage.getItem(foldKey.value) || "{}") || {};
  } catch {
    return {};
  }
};
const folded = ref(readFolded());
watch(foldKey, () => (folded.value = readFolded()));
const saveFolded = () => {
  try {
    localStorage.setItem(foldKey.value, JSON.stringify(folded.value));
  } catch {
    // storage unavailable: folding still works for this visit
  }
};
const isFolded = (place) => !!folded.value[place.id];
const toggleFold = (place) => {
  const next = { ...folded.value };
  if (next[place.id]) delete next[place.id];
  else next[place.id] = true;
  folded.value = next;
  saveFolded();
};
const allFolded = (session) => (session.locations || []).every((place) => isFolded(place));
const setFoldAll = (session, fold) => {
  const next = { ...folded.value };
  (session.locations || []).forEach((place) => (fold ? (next[place.id] = true) : delete next[place.id]));
  folded.value = next;
  saveFolded();
};

const filesOf = (item) =>
  [
    item.attachment && { key: "attachment", file: item.attachment, label: t("projects.uat.items.attachment") },
    item.photo && { key: "proof", file: item.photo, label: t("projects.uat.items.revisionProof") },
  ].filter(Boolean);

// Images open in a viewer (zoom, full screen) instead of a new tab; an
// item's issue photo and revision proof are browsed together.
const viewer = ref({ open: false, index: 0, images: [] });
const viewImages = (item, key) => {
  const images = filesOf(item)
    .filter((entry) => entry.file.is_image)
    .map((entry) => ({ key: entry.key, url: entry.file.url, name: entry.file.name, label: entry.label }));
  viewer.value = { open: true, images, index: Math.max(0, images.findIndex((image) => image.key === key)) };
};
const viewFile = (file, label) => (viewer.value = { open: true, index: 0, images: [{ url: file.url, name: file.name, label }] });

const deleteItem = async (item) => {
  if (!(await alertModal.confirm(t("projects.uat.items.deleteConfirm"), { type: "danger", confirmText: t("common.actions.delete") }))) return;
  try {
    await store.deleteItem(props.projectId, item.id);
    notify(t("projects.uat.items.deleted"));
  } catch (error) {
    toast.error(t("projects.uat.items.saveFailed"), error.message);
  }
};

// ---- Berita Acara (a numbered BA letter per UAT) ----
const baOpen = ref(false);
const baLoading = ref(false);
const baError = ref("");
const baOptions = ref(null);
const baForm = ref({});
const baSession = ref(null);
const BA_TEMPLATES = computed(() => [
  { value: "secondary", label: t("documents.letter.form.templateSecondary"), preview: "/images/template-letter-secondary.png" },
  { value: "primary", label: t("documents.letter.form.templatePrimary"), preview: "/images/template-letter-primary.png" },
]);
const openBeritaAcara = async (session) => {
  baSession.value = session;
  baError.value = "";
  baOptions.value = null;
  baOpen.value = true;
  baLoading.value = true;
  try {
    const { data } = await axiosInstance.get(`/projects/${props.projectId}/uat/sessions/${session.id}/berita-acara/options`);
    baOptions.value = data.data;
    baForm.value = { ...data.data.draft, division_code_id: data.data.draft.division_code_id || data.data.divisions?.[0]?.id || "" };
  } catch {
    baError.value = t("projects.uat.ba.loadFailed");
  } finally {
    baLoading.value = false;
  }
};
const baDivisionOptions = computed(() => (baOptions.value?.divisions || []).map((d) => ({ value: d.id, label: `${d.code} - ${d.name}` })));
// Opens the Berita Acara PDF in a new tab (opened inside the click, filled when ready).
const viewBeritaAcara = async (session, tab = window.open("", "_blank")) => {
  try {
    const response = await axiosInstance.get(`/projects/${props.projectId}/uat/sessions/${session.id}/berita-acara`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch {
    tab?.close();
    toast.error(t("projects.uat.ba.viewFailed"));
  }
};
const saveBeritaAcara = async () => {
  baError.value = "";
  if (!baForm.value.second_party_name?.trim()) return (baError.value = t("projects.uat.ba.clientRequired"));
  const tab = window.open("", "_blank");
  try {
    const letter = await store.generateBeritaAcara(props.projectId, baSession.value.id, baForm.value);
    baOpen.value = false;
    toast.success(t("projects.uat.ba.generated"), letter.letter_number);
    viewBeritaAcara(baSession.value, tab);
  } catch (error) {
    tab?.close();
    baError.value = error.message;
  }
};

// ---- Export a UAT document for the client: its result, or the revision result ----
const exportState = ref({ open: false, session: null, kind: "result" });
const openExport = (session, kind) => (exportState.value = { open: true, session, kind });
const exportProps = computed(() => {
  const { session, kind } = exportState.value;
  if (!session) return {};
  const n = session.round;
  return {
    optionsUrl: `/projects/${props.projectId}/uat/sessions/${session.id}/export-options`,
    exportUrl: `/projects/${props.projectId}/uat/sessions/${session.id}/export`,
    extra: { kind },
    title: t(`projects.uat.export.${kind}.title`, { n }),
    description: t(`projects.uat.export.${kind}.description`),
    reportLabel: t(`projects.uat.export.${kind}.report`, { n }),
    reportHint: t(`projects.uat.export.${kind}.reportHint`),
    fileBase: `${kind === "revision" ? "Laporan-Revisi-UAT" : "Laporan-UAT"}-${n}-${props.projectName || "proyek"}`,
  };
});

// ---- Long sessions: the UAT carries each session's first 5 items; the list
// scrolls inside its box and the next ones are fetched near its end. ----
const FIRST_PAGE = 5;
const PAGE = 10;
const more = ref({}); // location id -> { items, loading }
const itemsOf = (place) => {
  const extra = more.value[place.id]?.items || [];
  const seen = new Set(place.items.map((item) => item.id));
  return [...place.items, ...extra.filter((item) => !seen.has(item.id))];
};
const hasMore = (place) => itemsOf(place).length < (place.items_total ?? place.items.length);
const fetchItems = (place, offset, limit) =>
  axiosInstance.get(`/projects/${props.projectId}/uat/locations/${place.id}/items`, { params: { offset, limit } }).then(({ data }) => data.data.items);
const loadMore = async (place) => {
  const state = more.value[place.id] || { items: [] };
  if (state.loading || !hasMore(place)) return;
  more.value = { ...more.value, [place.id]: { ...state, loading: true } };
  try {
    const items = await fetchItems(place, itemsOf(place).length, PAGE);
    more.value = { ...more.value, [place.id]: { items: [...state.items, ...items], loading: false } };
  } catch {
    more.value = { ...more.value, [place.id]: { ...state, loading: false } };
    toast.error(t("projects.uat.items.loadMoreFailed"));
  }
};
// After any change the UAT comes back with only the first page: reload what
// was already showing (the old rows stay until the fresh ones arrive).
watch(
  () => uat.value,
  async (value) => {
    const places = value.sessions.flatMap((session) => session.locations || []);
    const refreshed = {};
    await Promise.all(
      places.map(async (place) => {
        const count = more.value[place.id]?.items.length;
        if (!count) return;
        try {
          refreshed[place.id] = { items: await fetchItems(place, place.items.length, Math.min(count, 50)), loading: false };
        } catch {
          refreshed[place.id] = more.value[place.id];
        }
      })
    );
    more.value = refreshed;
  }
);
// Scrolling near the end of a session's box fetches the next page.
const onListScroll = (event, place) => {
  const el = event.target;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) loadMore(place);
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
    const file = await prepareFile(picked);
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
    form.value = {
      date: session.date || "",
      status: session.status,
      notes: session.notes || "",
      locations: (session.locations || []).map((place) => newPlace(place)),
      file: null,
      removeAttachment: false,
    };
  } else {
    const date = today();
    form.value = { date, status: "scheduled", notes: "", locations: [newPlace({}, date)], file: null, removeAttachment: false };
  }
  if (fileInputRef.value) fileInputRef.value.value = "";
  formOpen.value = true;
};
const nextRound = computed(() => (uat.value.sessions.at(-1)?.round || 0) + 1);
const formTitle = computed(() =>
  editing.value ? t("projects.uat.form.editTitle", { n: editing.value.round }) : t("projects.uat.form.addTitle", { n: nextRound.value })
);
const formOverPlan = computed(() => !editing.value && uat.value.planned != null && nextRound.value > uat.value.planned);


const submit = async () => {
  formError.value = "";
  const places = form.value.locations;
  const payload = new FormData();
  payload.append("date", form.value.date || "");
  payload.append("status", form.value.status);
  payload.append("notes", form.value.notes || "");
  payload.append("locations_sent", "1");
  places.forEach((place, i) => {
    if (place.id) payload.append(`locations[${i}][id]`, place.id);
    payload.append(`locations[${i}][location]`, place.location.trim());
    payload.append(`locations[${i}][date]`, place.date || "");
    payload.append(`locations[${i}][time]`, place.time || "");
    payload.append(`locations[${i}][participants]`, place.participants.trim());
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
              <span v-if="session.items_count" class="inline-flex items-center gap-1" :class="session.resolved_count === session.items_count ? 'text-ui-ok' : ''">
                <CheckCircle2 class="w-3.5 h-3.5" />{{ $t("projects.uat.items.resolvedCount", { done: session.resolved_count, total: session.items_count }) }}
              </span>
            </div>
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

        <div class="mt-3 sm:pl-[52px] space-y-3">
          <p v-if="session.notes" class="text-ui-small text-ui-text whitespace-pre-line break-words">{{ session.notes }}</p>

          <!-- Several sessions: open or close them all at once -->
          <div v-if="(session.locations || []).length > 1" class="flex justify-end -mb-1">
            <button
              type="button"
              class="inline-flex items-center gap-1 h-7 px-2 rounded-ui-control text-ui-cap font-medium text-ui-muted hover:text-ui-ink hover:bg-ui-subtle"
              @click="setFoldAll(session, !allFolded(session))"
            >
              <ChevronsUpDown class="w-3.5 h-3.5" />{{ allFolded(session) ? $t("projects.uat.fold.showAll") : $t("projects.uat.fold.hideAll") }}
            </button>
          </div>

          <!-- One block per session, each with its own findings & notes; folds open/closed -->
          <section
            v-for="(place, placeIndex) in session.locations"
            :key="place.id"
            class="border border-ui-line rounded-ui-control overflow-hidden"
            :aria-label="placeTitle(place, placeIndex)"
          >
            <header class="bg-ui-subtle">
              <button
                type="button"
                class="w-full px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-left hover:bg-ui-hover focus:outline-none focus-visible:shadow-ui-focus"
                :aria-expanded="!isFolded(place)"
                :aria-controls="`uat-place-${place.id}`"
                :title="isFolded(place) ? $t('projects.uat.fold.show') : $t('projects.uat.fold.hide')"
                @click="toggleFold(place)"
              >
              <p class="inline-flex items-center gap-1.5 text-ui-small font-medium text-ui-ink min-w-0">
                <ChevronDown class="w-4 h-4 text-ui-muted shrink-0 transition-transform duration-200" :class="isFolded(place) ? '-rotate-90' : ''" />
                <MapPin class="w-3.5 h-3.5 text-ui-muted shrink-0" /><span class="truncate">{{ placeTitle(place, placeIndex) }}</span>
              </p>
              <span v-if="placeLine(place)" class="text-ui-cap text-ui-muted tabular-nums">{{ placeLine(place) }}</span>
              <span v-if="place.participants" class="inline-flex items-center gap-1 text-ui-cap text-ui-muted min-w-0" :title="place.participants"><Users class="w-3 h-3 shrink-0" /><span class="truncate">{{ place.participants }}</span></span>
              <span class="sm:ml-auto text-ui-cap text-ui-muted tabular-nums">
                {{ $t("projects.uat.findingsCount", { n: place.findings_count }, place.findings_count) }} · {{ $t("projects.uat.notesCount", { n: place.notes_count }, place.notes_count) }}<template v-if="place.items.length"> · <span :class="place.resolved_count === (place.items_total ?? place.items.length) ? 'text-ui-ok' : ''">{{ $t("projects.uat.items.resolvedCount", { done: place.resolved_count, total: place.items_total ?? place.items.length }) }}</span></template>
              </span>
              </button>
            </header>
            <div v-show="!isFolded(place)" :id="`uat-place-${place.id}`">
            <div
              v-if="place.items.length"
              class="border-t border-ui-line"
              :class="(place.items_total ?? 0) > FIRST_PAGE ? 'max-h-[360px] overflow-y-auto overscroll-contain' : ''"
              @scroll.passive="onListScroll($event, place)"
              :aria-label="$t('projects.uat.items.listLabel', { n: place.items_total ?? place.items.length })"
            >
            <ol class="divide-y divide-ui-line">
            <li v-for="(item, index) in itemsOf(place)" :key="item.id" class="flex items-start gap-3 px-3 py-2.5" :class="item.is_resolved ? 'bg-ui-ok-soft/40' : ''">
              <span class="text-ui-cap text-ui-faint tabular-nums w-4 shrink-0 pt-0.5">{{ index + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <UiBadge :tone="ITEM_TONES[item.type]">{{ $t(`projects.uat.items.type.${item.type}`) }}</UiBadge>
                  <span v-if="where(item)" class="text-ui-cap font-medium text-ui-muted break-words">{{ where(item) }}</span>
                </div>
                <p class="text-ui-small mt-1 whitespace-pre-line break-words" :class="item.is_resolved ? 'text-ui-muted' : 'text-ui-text'">{{ item.description }}</p>
                <p v-if="item.is_resolved" class="text-ui-cap text-ui-ok mt-1">
                  {{ resolvedLabel(item) }}<template v-if="item.resolved_by"> · {{ item.resolved_by }}</template><template v-if="item.resolved_at"> · {{ formatDate(item.resolved_at) }}</template>
                </p>
                <!-- Files: what was found (attachment) and the revision proof -->
                <div v-if="item.attachment || item.photo" class="mt-2 flex flex-wrap gap-4">
                  <figure v-for="entry in filesOf(item)" :key="entry.key" class="min-w-0">
                    <figcaption class="text-ui-cap text-ui-muted mb-1">{{ entry.label }}</figcaption>
                    <div class="flex items-center gap-2">
                      <button v-if="entry.file.is_image" type="button" class="ui-press block w-16 h-16 rounded-ui-control overflow-hidden border border-ui-line shrink-0 cursor-zoom-in hover:border-ui-line-strong focus:outline-none focus-visible:shadow-ui-focus" :title="$t('projects.uat.items.openFile')" :aria-label="`${entry.label}: ${entry.file.name || ''}`" @click="viewImages(item, entry.key)">
                        <img :src="cloudinaryThumb(entry.file.url, { width: 128, height: 128 })" :alt="entry.file.name || entry.label" class="w-full h-full object-cover" loading="lazy" />
                      </button>
                      <a v-else :href="entry.file.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 h-8 max-w-[220px] px-2.5 rounded-ui-control border border-ui-line text-ui-cap text-ui-ink hover:bg-ui-subtle" :title="$t('projects.uat.items.openFile')">
                        <FileText class="w-3.5 h-3.5 text-ui-muted shrink-0" /><span class="truncate">{{ entry.file.name }}</span>
                      </a>
                      <button v-if="canEdit && entry.key === 'proof'" type="button" class="inline-flex items-center gap-1 text-ui-cap text-ui-muted hover:text-ui-bad disabled:opacity-50" :disabled="busyItem === item.id" @click="removePhoto(item)">
                        <X class="w-3.5 h-3.5" />{{ $t("projects.uat.items.removePhoto") }}
                      </button>
                    </div>
                  </figure>
                </div>
              </div>
              <div v-if="canEdit" class="flex flex-col sm:flex-row items-end sm:items-center gap-1 shrink-0">
                <button
                  type="button"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
                  :title="$t('common.actions.edit')"
                  :aria-label="$t('common.actions.edit')"
                  @click="openItem(session, place, item.type, item)"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                  :title="$t('common.actions.delete')"
                  :aria-label="$t('common.actions.delete')"
                  @click="deleteItem(item)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
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
                <!-- Revision result, next to the check-off (optional) -->
                <label
                  class="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-ui-control border border-ui-line text-ui-cap font-medium text-ui-muted hover:text-ui-ink hover:bg-ui-subtle cursor-pointer whitespace-nowrap"
                  :class="busyItem === item.id ? 'opacity-50 pointer-events-none' : ''"
                  :title="$t('projects.uat.items.uploadRevisionHint')"
                >
                  <Upload class="w-3.5 h-3.5" />{{ item.photo ? $t("projects.uat.items.replaceRevision") : $t("projects.uat.items.uploadRevision") }}
                  <input type="file" :accept="FILE_TYPES" class="sr-only" @change="onPhoto(item, $event)" />
                </label>
              </div>
              <span v-else-if="item.is_resolved" class="shrink-0 text-ui-ok" :title="resolvedLabel(item)"><CheckCircle2 class="w-4 h-4" /></span>
            </li>
            </ol>
            <div v-if="hasMore(place)" class="px-3 py-2.5 border-t border-ui-line flex items-center gap-2 text-ui-cap text-ui-muted">
              <template v-if="more[place.id]?.loading"><UiSpinner size="14px" :center="false" />{{ $t("projects.uat.items.loadingMore", { shown: itemsOf(place).length, total: place.items_total }) }}</template>
              <button v-else type="button" class="font-medium text-ui-accent hover:underline" @click="loadMore(place)">{{ $t("projects.uat.items.showMore", { n: place.items_total - itemsOf(place).length }) }}</button>
            </div>
            </div>
            <p v-else class="px-3 py-2.5 border-t border-ui-line text-ui-cap text-ui-muted">{{ $t("projects.uat.items.emptySession") }}</p>
            <p v-if="(place.items_total ?? 0) > FIRST_PAGE" class="px-3 py-1.5 border-t border-ui-line text-ui-cap text-ui-faint tabular-nums">
              {{ hasMore(place) ? $t("projects.uat.items.showing", { shown: itemsOf(place).length, total: place.items_total }) : $t("projects.uat.items.showingAll", { n: place.items_total }) }}
            </p>
            <div v-if="canEdit" class="px-2 py-1.5 border-t border-ui-line flex flex-wrap gap-1">
              <UiButton variant="ghost" size="sm" :icon="AlertCircle" @click="openItem(session, place, 'finding')">{{ $t("projects.uat.items.addFinding") }}</UiButton>
              <UiButton variant="ghost" size="sm" :icon="StickyNote" @click="openItem(session, place, 'note')">{{ $t("projects.uat.items.addNote") }}</UiButton>
            </div>
            </div>
          </section>

          <!-- Berita Acara and documents for the client -->
          <p v-if="session.berita_acara" class="text-ui-cap text-ui-muted">{{ $t("projects.uat.ba.number", { number: session.berita_acara.letter_number }) }}</p>
          <div v-if="canExport || canEdit || session.berita_acara" class="flex flex-wrap items-center gap-2">
            <template v-if="session.berita_acara">
              <UiButton variant="secondary" size="sm" :icon="ExternalLink" @click="viewBeritaAcara(session)">{{ $t("projects.uat.ba.view") }}</UiButton>
              <UiButton v-if="canEdit" variant="ghost" size="sm" :icon="FileSignature" @click="openBeritaAcara(session)">{{ $t("projects.uat.ba.refresh") }}</UiButton>
            </template>
            <UiButton v-else-if="canEdit" variant="secondary" size="sm" :icon="FileSignature" @click="openBeritaAcara(session)">{{ $t("projects.uat.ba.generate") }}</UiButton>
            <UiButton v-if="canExport" variant="secondary" size="sm" :icon="FileDown" @click="openExport(session, 'result')">{{ $t("projects.uat.export.result.button") }}</UiButton>
            <UiButton v-if="canExport" variant="secondary" size="sm" :icon="FileDown" :disabled="!session.items_count" @click="openExport(session, 'revision')">{{ $t("projects.uat.export.revision.button") }}</UiButton>
          </div>
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
                <span v-if="place.itemsCount" class="text-ui-cap text-ui-muted">{{ $t("projects.uat.items.count", { n: place.itemsCount }, place.itemsCount) }}</span>
                <button
                  v-if="form.locations.length > 1"
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

        <p v-if="formError" class="text-ui-cap text-ui-bad">{{ formError }}</p>
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="formOpen = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="project-uat-form" :loading="saving" class="flex-1 sm:flex-none">{{ $t("common.actions.save") }}</UiButton>
      </template>
    </UiModal>

    <!-- Finding / note form -->
    <UiModal :open="itemOpen" :title="itemForm.id ? $t('projects.uat.items.editTitle') : $t(itemForm.type === 'finding' ? 'projects.uat.items.addFinding' : 'projects.uat.items.addNote')" size="md" @update:open="(value) => !value && (itemOpen = false)">
      <form id="project-uat-item-form" class="space-y-3.5" @submit.prevent="saveItem">
        <div class="inline-flex rounded-ui-control border border-ui-line p-0.5" role="radiogroup" :aria-label="$t('projects.uat.items.typeLabel')">
          <button
            v-for="type in ['finding', 'note']"
            :key="type"
            type="button"
            role="radio"
            :aria-checked="itemForm.type === type"
            class="h-8 px-3 rounded-[6px] text-ui-small font-medium"
            :class="itemForm.type === type ? (type === 'finding' ? 'bg-ui-warn-soft text-ui-warn' : 'bg-ui-subtle text-ui-ink') : 'text-ui-muted hover:text-ui-ink'"
            @click="itemForm.type = type"
          >
            {{ $t(`projects.uat.items.type.${type}`) }}
          </button>
        </div>
        <UiSelect v-if="itemForm.id && itemPlaceOptions.length > 1" v-model="itemForm.locationId" :options="itemPlaceOptions" :label="$t('projects.uat.items.session')" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UiInput v-model="itemForm.feature" :label="$t('projects.uat.items.feature')" :placeholder="$t('projects.uat.items.featurePlaceholder')" />
          <UiInput v-model="itemForm.menu" :label="$t('projects.uat.items.menu')" :placeholder="$t('projects.uat.items.menuPlaceholder')" />
        </div>
        <UiInput v-model="itemForm.description" :rows="3" :label="$t('projects.uat.items.description')" :placeholder="$t(`projects.uat.items.descriptionPlaceholder.${itemForm.type || 'finding'}`)" />
        <div v-file-drop>
          <label for="project-uat-item-file" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.uat.items.attachmentLabel") }}</label>
          <div v-if="(itemForm.attachment && !itemForm.removeAttachment) || itemForm.file" class="flex items-center gap-2 mb-2 min-w-0">
            <FileText class="w-3.5 h-3.5 text-ui-muted shrink-0" />
            <button v-if="!itemForm.file && itemForm.attachment.is_image" type="button" class="text-ui-small text-ui-accent hover:underline truncate" @click="viewFile(itemForm.attachment, $t('projects.uat.items.attachment'))">{{ itemForm.attachment.name }}</button>
            <a v-else-if="!itemForm.file" :href="itemForm.attachment.url" target="_blank" rel="noopener" class="text-ui-small text-ui-accent hover:underline truncate">{{ itemForm.attachment.name }}</a>
            <span v-else class="text-ui-small text-ui-ink truncate">{{ itemForm.file.name }}</span>
            <button type="button" class="ml-auto inline-flex items-center gap-1 text-ui-cap text-ui-muted hover:text-ui-bad shrink-0" @click="itemForm.file ? (itemForm.file = null) : (itemForm.removeAttachment = true)">
              <X class="w-3.5 h-3.5" />{{ $t("projects.uat.items.removeFile") }}
            </button>
          </div>
          <input
            id="project-uat-item-file"
            type="file"
            :accept="FILE_TYPES"
            class="block w-full text-ui-small text-ui-text cursor-pointer file:mr-3 file:h-9 file:px-3.5 file:rounded-ui-control file:border file:border-solid file:border-ui-line-strong file:bg-ui-surface file:text-ui-small file:font-medium file:text-ui-ink hover:file:bg-ui-subtle"
            @change="onItemFile"
          />
          <p class="text-ui-cap text-ui-muted mt-1.5">{{ $t("projects.uat.items.fileHint") }}</p>
        </div>
        <p v-if="itemError" class="text-ui-cap text-ui-bad">{{ itemError }}</p>
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="itemOpen = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="project-uat-item-form" :loading="saving" class="flex-1 sm:flex-none">{{ $t("common.actions.save") }}</UiButton>
      </template>
    </UiModal>

    <!-- Berita Acara: numbered BA letter, signed by both parties -->
    <UiModal :open="baOpen" :title="$t('projects.uat.ba.title', { n: baSession?.round ?? '' })" :description="$t('projects.uat.ba.description')" size="lg" @update:open="(value) => !value && (baOpen = false)">
      <div v-if="baLoading" class="space-y-3" aria-busy="true">
        <Skeleton height="40px" />
        <Skeleton height="120px" />
      </div>
      <UiAlert v-else-if="baOptions && !baOptions.can_create" tone="warn">{{ $t("projects.uat.ba.noLetterAccess") }}</UiAlert>
      <form v-else-if="baOptions" id="project-uat-ba-form" class="space-y-4" @submit.prevent="saveBeritaAcara">
        <UiAlert v-if="baOptions.existing" tone="info">{{ $t("projects.uat.ba.refreshHint", { number: baOptions.existing.letter_number }) }}</UiAlert>
        <div>
          <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.letter.form.letterhead") }}</p>
          <div class="grid grid-cols-2 gap-3">
            <label
              v-for="opt in BA_TEMPLATES"
              :key="opt.value"
              class="ui-press cursor-pointer rounded-ui-control border overflow-hidden transition-colors"
              :class="baForm.template === opt.value ? 'border-ui-accent shadow-ui-focus' : 'border-ui-line hover:border-ui-line-strong'"
            >
              <input v-model="baForm.template" type="radio" :value="opt.value" class="sr-only" />
              <div class="h-24 w-full overflow-hidden bg-white border-b border-ui-line">
                <img :src="opt.preview" alt="" class="w-full h-full object-cover object-top" />
              </div>
              <div class="px-3 py-2 flex items-center justify-between bg-ui-subtle">
                <span class="text-ui-small font-medium text-ui-ink">{{ opt.label }}</span>
                <CheckCircle2 v-if="baForm.template === opt.value" class="w-4 h-4 text-ui-accent" />
              </div>
            </label>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiSelect v-model="baForm.division_code_id" :options="baDivisionOptions" :label="$t('documents.letter.fields.divisionCode')" required :disabled="!!baOptions.existing" />
          <UiInput v-model="baForm.date" type="date" :label="$t('projects.uat.ba.date')" required />
        </div>

        <fieldset class="rounded-ui-control border border-ui-line p-3 space-y-3">
          <legend class="px-1 text-ui-small font-medium text-ui-ink">{{ $t("projects.uat.ba.firstParty") }}</legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UiSelect
              v-if="baForm.use_signature"
              v-model="baForm.signatory_name"
              :options="(baOptions.signatories || []).map((p) => ({ value: p.name, label: p.name }))"
              :label="$t('projects.uat.ba.signatory')"
              @update:model-value="(name) => (baForm.signatory_title = (baOptions.signatories || []).find((p) => p.name === name)?.title || baForm.signatory_title)"
            />
            <UiInput v-else v-model="baForm.signatory_name" :label="$t('projects.uat.ba.signatoryName')" />
            <UiInput v-model="baForm.signatory_title" :label="$t('projects.uat.ba.signatoryTitle')" />
          </div>
          <label class="inline-flex items-center gap-2 text-ui-small text-ui-ink cursor-pointer">
            <input v-model="baForm.use_signature" type="checkbox" class="w-4 h-4 rounded border-ui-line-strong accent-[rgb(var(--ui-ink))]" :disabled="!(baOptions.signatories || []).length" />
            {{ $t("projects.uat.ba.useSignature") }}
          </label>
        </fieldset>

        <fieldset class="rounded-ui-control border border-ui-line p-3 space-y-3">
          <legend class="px-1 text-ui-small font-medium text-ui-ink">{{ $t("projects.uat.ba.secondParty") }}</legend>
          <UiInput v-model="baForm.second_party_name" :label="$t('projects.uat.ba.clientName')" required />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UiInput v-model="baForm.second_party_signatory_name" :label="$t('projects.uat.ba.clientSignatory')" />
            <UiInput v-model="baForm.second_party_signatory_title" :label="$t('projects.uat.ba.clientTitle')" />
          </div>
        </fieldset>
      </form>
      <p v-if="baError" class="text-ui-cap text-ui-bad mt-3">{{ baError }}</p>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="baOpen = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton v-if="baOptions?.can_create" type="submit" form="project-uat-ba-form" :icon="FileSignature" :loading="saving" class="flex-1 sm:flex-none">{{ $t("projects.uat.ba.save") }}</UiButton>
      </template>
    </UiModal>

    <ProjectExportModal
      v-if="canExport && exportState.session"
      v-model:open="exportState.open"
      :project-id="projectId"
      :project-name="projectName"
      v-bind="exportProps"
    />

    <UiConfirmDialog
      v-model:open="deleteOpen"
      type="danger"
      :title="$t('projects.uat.deleteTitle', { n: toDelete?.round ?? '' })"
      :message="$t('projects.uat.deleteMessage')"
      :confirm-text="$t('common.actions.delete')"
      :loading="saving"
      @confirm="confirmDelete"
    />

    <UiImageViewer v-model:open="viewer.open" v-model:index="viewer.index" :images="viewer.images" />
  </section>
</template>
