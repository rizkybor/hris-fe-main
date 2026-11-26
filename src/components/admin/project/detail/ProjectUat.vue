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
} from "lucide-vue-next";
import { useProjectUatStore } from "@/stores/projectUat";
import { useToastStore } from "@/stores/toast";
import { can } from "@/helpers/permissionHelper";
import { formatDate } from "@/utils/dateUtils";
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

const findingList = (session) =>
  String(session.findings || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

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
const today = () => new Date().toISOString().slice(0, 10);

const openForm = (session = null) => {
  editing.value = session;
  formError.value = "";
  form.value = session
    ? { date: session.date || "", status: session.status, notes: session.notes || "", findings: session.findings || "", file: null, removeAttachment: false }
    : { date: today(), status: "scheduled", notes: "", findings: "", file: null, removeAttachment: false };
  if (fileInputRef.value) fileInputRef.value.value = "";
  formOpen.value = true;
};
const nextRound = computed(() => (uat.value.sessions.at(-1)?.round || 0) + 1);
const formTitle = computed(() =>
  editing.value ? t("projects.uat.form.editTitle", { n: editing.value.round }) : t("projects.uat.form.addTitle", { n: nextRound.value })
);
const formOverPlan = computed(() => !editing.value && uat.value.planned != null && nextRound.value > uat.value.planned);

const onFile = (event) => {
  form.value.file = event.target.files[0] ?? null;
  if (form.value.file) form.value.removeAttachment = false;
};

const submit = async () => {
  formError.value = "";
  const payload = new FormData();
  payload.append("date", form.value.date || "");
  payload.append("status", form.value.status);
  payload.append("notes", form.value.notes || "");
  payload.append("findings", form.value.findings || "");
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

        <div v-if="session.notes || session.findings_count || session.attachment" class="mt-3 sm:pl-[52px] space-y-3">
          <p v-if="session.notes" class="text-ui-small text-ui-text whitespace-pre-line break-words">{{ session.notes }}</p>
          <div v-if="session.findings_count">
            <p class="text-ui-cap font-medium text-ui-muted mb-1">{{ $t("projects.uat.findings") }}</p>
            <ol class="list-decimal pl-5 space-y-0.5 text-ui-small text-ui-text marker:text-ui-faint">
              <li v-for="(finding, index) in findingList(session)" :key="index" class="break-words">{{ finding }}</li>
            </ol>
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
    <UiModal :open="formOpen" :title="formTitle" size="md" @update:open="(value) => !value && (formOpen = false)">
      <form id="project-uat-form" class="space-y-4" @submit.prevent="submit">
        <UiAlert v-if="formOverPlan" tone="warn">
          {{ $t("projects.uat.form.overPlanWarning", { n: uat.planned }) }}
        </UiAlert>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="form.date" type="date" :label="$t('projects.uat.form.date')" :icon="CalendarDays" />
          <UiSelect v-model="form.status" :options="STATUS_OPTIONS" :label="$t('projects.uat.form.status')" required />
        </div>
        <UiInput v-model="form.notes" :rows="3" :label="$t('projects.uat.form.notes')" :placeholder="$t('projects.uat.form.notesPlaceholder')" />
        <UiInput v-model="form.findings" :rows="5" :label="$t('projects.uat.findings')" :hint="$t('projects.uat.form.findingsHint')" :placeholder="$t('projects.uat.form.findingsPlaceholder')" />

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
