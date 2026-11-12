<script setup>
import { ref, computed, onMounted } from "vue";
import { useListState } from "@/composables/useListState";
import { invalidate } from "@/composables/useStaleFetch";
import { useRoute, useRouter } from "vue-router";
import {
  Briefcase,
  ArrowLeft,
  Pencil,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  Layers,
  FileText,
  Clock,
  FolderKanban,
  ScrollText,
  Star,
  Plus,
  Trash2,
  X,
  Building2,
} from "lucide-vue-next";
import { UiButton, UiBadge, UiEmpty, UiModal, UiInput } from "@/components/ui";
import { useClientStore } from "@/stores/client";
import Spinner from "@/components/common/skeleton/Spinner.vue";
import { getProjectStatusColor } from "@/utils/badgeUtils";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import MaintenancePanel from "@/components/admin/maintenance/MaintenancePanel.vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t, te } = useI18n();

const route = useRoute();
const router = useRouter();
const clientsStore = useClientStore();
const alertModal = useAlertModalStore();

const client = ref(null);
const loading = ref(true);
const error = ref("");

const evaluations = ref([]);
const evaluationsLoading = ref(true);
const showEvaluationModal = ref(false);
const submittingEvaluation = ref(false);
const evaluationForm = ref({
  rating: 5,
  notes: "",
  evaluated_at: new Date().toISOString().split("T")[0],
});

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString(localeTag(), {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

// true once the full evaluation list is here, so the average can be
// worked out locally after adding or deleting one.
const evaluationsLoaded = ref(false);
const loadEvaluations = async () => {
  evaluationsLoading.value = true;
  try {
    evaluations.value = await clientsStore.fetchClientEvaluations(route.params.id);
    evaluationsLoaded.value = true;
  } catch (err) {
    // Non-fatal -- the client detail itself can still load.
  } finally {
    evaluationsLoading.value = false;
  }
};

// The client and its evaluations load at once.
onMounted(async () => {
  const evaluationsRequest = loadEvaluations();
  try {
    client.value = await clientsStore.fetchClientById(route.params.id);
    if (!client.value) {
      error.value = t("clients.form.notFound");
      return;
    }
  } catch (err) {
    error.value = t("clients.detail.loadFailed");
  } finally {
    loading.value = false;
  }
  await evaluationsRequest;
});

// Same ordering as the API (newest evaluation date first).
const byDateDesc = (a, b) => String(b.evaluated_at || "").localeCompare(String(a.evaluated_at || "")) || (b.id || 0) - (a.id || 0);

// Average and count from the list we hold (the API rounds to 2 decimals
// too). Without the list, ask the server quietly instead.
const syncRating = async () => {
  if (evaluationsLoaded.value) {
    const n = evaluations.value.length;
    const avg = n ? Math.round((evaluations.value.reduce((sum, e) => sum + Number(e.rating || 0), 0) / n) * 100) / 100 : null;
    client.value = { ...client.value, average_rating: avg, evaluations_count: n };
  } else {
    const fresh = await clientsStore.fetchClientById(route.params.id);
    if (fresh) client.value = fresh;
  }
  // The client list shows the rating: patch its row, and let it refresh
  // on the next visit.
  const id = String(route.params.id);
  clientsStore.clientsData.items = clientsStore.clientsData.items.map((item) =>
    String(item.id) === id ? { ...item, average_rating: client.value.average_rating, evaluations_count: client.value.evaluations_count } : item
  );
  invalidate("clients");
};

const openEvaluationModal = () => {
  evaluationForm.value = { rating: 5, notes: "", evaluated_at: new Date().toISOString().split("T")[0] };
  showEvaluationModal.value = true;
};

const closeEvaluationModal = () => {
  showEvaluationModal.value = false;
};

const submitEvaluation = async () => {
  submittingEvaluation.value = true;
  try {
    const saved = await clientsStore.createClientEvaluation({
      client_id: route.params.id,
      ...evaluationForm.value,
    });
    if (saved) evaluations.value = [...evaluations.value, saved].sort(byDateDesc);
    else await loadEvaluations();
    closeEvaluationModal();
    syncRating();
  } catch (err) {
    await alertModal.alert(
      err?.response?.data?.message || t("clients.detail.saveEvaluationFailed"),
      { type: "danger" }
    );
  } finally {
    submittingEvaluation.value = false;
  }
};

const deleteEvaluation = async (id) => {
  const confirmed = await alertModal.confirm(
    t("clients.detail.deleteEvaluationConfirm"),
    { type: "danger" }
  );
  if (!confirmed) return;

  try {
    await clientsStore.deleteClientEvaluation(id);
    evaluations.value = evaluations.value.filter((e) => e.id !== id);
    syncRating();
  } catch (err) {
    await alertModal.alert(
      err?.response?.data?.message || t("clients.detail.deleteEvaluationFailed"),
      { type: "danger" }
    );
  }
};

// The tab is in the URL (?tab=evaluations) so a reload or shared link opens it.
const tabState = useListState("client-detail", { tab: "overview" }, { remember: false });
const activeTab = computed({
  get: () => (["overview", "evaluations", "projects"].includes(tabState.tab) ? tabState.tab : "overview"),
  set: (v) => (tabState.tab = v),
});

// Presentation only: project status tones, header initials.
const PROJECT_TONE = { active: "info", completed: "ok", cancelled: "bad", "on-hold": "warn", overdue: "bad" };
const clientInitials = (name) =>
  (name || "").replace(/^(PT|CV)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "—";
const projectStatusLabel = (status) =>
  te(`clients.detail.projectStatus.${status}`) ? t(`clients.detail.projectStatus.${status}`) : status;
const todayISO = new Date().toISOString().split("T")[0];
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex items-center gap-4 flex-1 min-w-0">
        <div
          class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-ui-accent-soft text-ui-accent text-ui-h2 flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <template v-if="client">{{ clientInitials(client.name) }}</template>
          <Briefcase v-else class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <button type="button" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline" :aria-label="$t('common.actions.back')" @click="router.back()">
            <ArrowLeft class="w-4 h-4" /> {{ $t("clients.detail.title") }}
          </button>
          <div class="flex items-center gap-2 flex-wrap mt-0.5">
            <h1 class="text-ui-h1 text-ui-ink truncate">{{ client?.name || $t("clients.detail.title") }}</h1>
            <UiBadge v-if="client?.type" tone="neutral">{{ client.type }}</UiBadge>
            <UiBadge v-if="client?.field" tone="outline">{{ client.field }}</UiBadge>
          </div>
          <p class="text-ui-small text-ui-muted truncate">{{ $t("clients.detail.readOnly") }}</p>
        </div>
      </div>
      <UiButton variant="secondary" :icon="Pencil" :to="{ name: 'admin.clients.edit', params: { id: route.params.id } }" class="w-full sm:w-auto shrink-0">
        {{ $t("common.actions.edit") }}
      </UiButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <Spinner :label="$t('clients.detail.loading')" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="Briefcase" :title="error" />
    </div>

    <!-- Content -->
    <template v-else-if="client">
      <!-- Tabs: underline on desktop, scrolling chips on phones -->
      <div class="overflow-x-auto [scrollbar-width:none] sm:border-b sm:border-ui-line -mx-1 px-1 sm:mx-0 sm:px-0">
        <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
          <button
            v-for="tab in [
              { id: 'overview', label: $t('clients.detail.tabs.overview'), icon: Building2 },
              { id: 'evaluations', label: $t('clients.detail.tabs.evaluations'), icon: Star },
              { id: 'projects', label: $t('clients.detail.tabs.projects'), icon: FolderKanban, count: client.projects?.length || 0 },
            ]"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :class="[
              'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:shadow-ui-focus',
              'h-8 px-3 rounded-full border text-ui-small',
              'sm:h-auto sm:px-0.5 sm:pt-1 sm:pb-3 sm:rounded-none sm:border-0 sm:border-b-2 sm:-mb-px sm:text-ui-body',
              activeTab === tab.id
                ? 'bg-ui-ink text-white border-ui-ink sm:bg-transparent sm:text-ui-ink sm:border-ui-ink'
                : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover sm:bg-transparent sm:text-ui-muted sm:border-transparent sm:hover:bg-transparent sm:hover:text-ui-ink',
            ]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
            <span v-if="tab.count" class="tabular-nums text-ui-cap" :class="activeTab === tab.id ? 'opacity-70' : 'text-ui-faint'">{{ tab.count }}</span>
          </button>
        </div>
      </div>

      <!-- ===== Overview ===== -->
      <div v-if="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div class="lg:col-span-2 space-y-5 ui-stagger min-w-0">
          <!-- Contact -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("clients.form.sections.pic") }}</h2>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
              <div class="min-w-0">
                <dt class="text-ui-cap text-ui-muted inline-flex items-center gap-1.5"><User class="w-3.5 h-3.5" />{{ $t("clients.fields.picName") }}</dt>
                <dd class="text-ui-body text-ui-ink mt-1 truncate">{{ client.pic_name || "-" }}</dd>
              </div>
              <div class="min-w-0">
                <dt class="text-ui-cap text-ui-muted inline-flex items-center gap-1.5"><Phone class="w-3.5 h-3.5" />{{ $t("clients.fields.picPhone") }}</dt>
                <dd class="text-ui-body text-ui-ink mt-1 truncate tabular-nums">{{ client.pic_phone || "-" }}</dd>
              </div>
              <div class="min-w-0 sm:col-span-2">
                <dt class="text-ui-cap text-ui-muted inline-flex items-center gap-1.5"><Mail class="w-3.5 h-3.5" />{{ $t("common.labels.email") }}</dt>
                <dd class="text-ui-body text-ui-ink mt-1 truncate">{{ client.email || "-" }}</dd>
              </div>
            </dl>
          </section>

          <!-- Legalitas -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("clients.detail.legal") }}</h2>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("clients.detail.legalHint") }}</p>
            <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 mt-4">
              <div v-for="row in [
                { label: $t('clients.fields.npwp'), value: client.npwp },
                { label: $t('clients.fields.siup'), value: client.siup_number },
                { label: $t('clients.fields.nib'), value: client.nib_number },
              ]" :key="row.label" class="min-w-0">
                <dt class="text-ui-cap text-ui-muted">{{ row.label }}</dt>
                <dd class="text-ui-body text-ui-ink mt-1 truncate tabular-nums">{{ row.value || "-" }}</dd>
              </div>
            </dl>
          </section>

          <!-- Additional -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("clients.form.sections.additional") }}</h2>
            <dl class="space-y-4 mt-4">
              <div>
                <dt class="text-ui-cap text-ui-muted inline-flex items-center gap-1.5"><MapPin class="w-3.5 h-3.5" />{{ $t("common.labels.address") }}</dt>
                <dd class="text-ui-body text-ui-ink mt-1">{{ client.address || "-" }}</dd>
              </div>
              <div>
                <dt class="text-ui-cap text-ui-muted inline-flex items-center gap-1.5"><FileText class="w-3.5 h-3.5" />{{ $t("common.labels.notes") }}</dt>
                <dd class="text-ui-body text-ui-text mt-1.5 whitespace-pre-line bg-ui-subtle rounded-ui-control px-3.5 py-2.5">{{ client.notes || "-" }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <!-- Side -->
        <aside class="space-y-5 min-w-0">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
            <h3 class="text-ui-h3 text-ui-ink">{{ $t("clients.detail.tabs.evaluations") }}</h3>
            <div class="flex items-end gap-2 mt-3">
              <p class="text-ui-display text-ui-ink tabular-nums">{{ client.average_rating || "—" }}</p>
              <p v-if="client.average_rating" class="text-ui-small text-ui-muted pb-1.5">/ 5</p>
            </div>
            <div class="flex items-center gap-0.5 mt-1" aria-hidden="true">
              <Star
                v-for="n in 5"
                :key="n"
                class="w-4 h-4"
                :class="n <= Math.round(client.average_rating || 0) ? 'text-ui-warn' : 'text-ui-line-strong'"
                :fill="n <= Math.round(client.average_rating || 0) ? 'currentColor' : 'none'"
              />
            </div>
            <p class="text-ui-small text-ui-muted mt-2">
              <span v-if="client.average_rating">{{ $t("clients.detail.ratingSummary", { avg: client.average_rating, n: client.evaluations_count }, client.evaluations_count || 0) }}</span>
              <span v-else>{{ $t("clients.detail.noEvaluations") }}</span>
            </p>
            <button type="button" class="mt-3 text-ui-small font-medium text-ui-accent hover:underline" @click="activeTab = 'evaluations'">{{ $t("clients.detail.viewEvaluations") }}</button>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
            <dl class="divide-y divide-ui-line text-ui-small -my-2">
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="text-ui-muted inline-flex items-center gap-1.5"><Clock class="w-3.5 h-3.5" />{{ $t("common.labels.createdAt") }}</dt>
                <dd class="text-ui-ink text-right">{{ formatDate(client.created_at) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="text-ui-muted inline-flex items-center gap-1.5"><Clock class="w-3.5 h-3.5" />{{ $t("common.labels.updatedAt") }}</dt>
                <dd class="text-ui-ink text-right">{{ formatDate(client.updated_at) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="text-ui-muted inline-flex items-center gap-1.5"><FolderKanban class="w-3.5 h-3.5" />{{ $t("clients.detail.projectsCount") }}</dt>
                <dd class="text-ui-ink tabular-nums">{{ client.projects?.length || 0 }}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <!-- ===== Rating & Evaluation ===== -->
      <section v-else-if="activeTab === 'evaluations'" class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
        <header class="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 border-b border-ui-line">
          <div class="flex-1 min-w-0">
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("clients.detail.tabs.evaluations") }}</h2>
            <p class="text-ui-cap text-ui-muted">
              <span v-if="client.average_rating">{{ $t("clients.detail.ratingSummary", { avg: client.average_rating, n: client.evaluations_count }, client.evaluations_count || 0) }}</span>
              <span v-else>{{ $t("clients.detail.noEvaluations") }}</span>
            </p>
          </div>
          <UiButton v-if="can('clients-evaluation-create')" :icon="Plus" class="w-full sm:w-auto" @click="openEvaluationModal">{{ $t("clients.detail.addEvaluation") }}</UiButton>
        </header>

        <Spinner v-if="evaluationsLoading" :label="$t('common.states.loading')" />
        <UiEmpty v-else-if="evaluations.length === 0" :icon="Star" :title="$t('clients.detail.noEvaluationsForClient')" compact />
        <ul v-else class="divide-y divide-ui-line ui-stagger">
          <li v-for="evaluation in evaluations" :key="evaluation.id" class="flex items-start gap-3 px-5 sm:px-6 py-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-0.5">
                <Star
                  v-for="n in 5"
                  :key="n"
                  class="w-4 h-4"
                  :class="n <= evaluation.rating ? 'text-ui-warn' : 'text-ui-line-strong'"
                  :fill="n <= evaluation.rating ? 'currentColor' : 'none'"
                />
                <span class="text-ui-small font-medium text-ui-ink ml-1.5 tabular-nums">{{ evaluation.rating }}/5</span>
              </div>
              <p v-if="evaluation.notes" class="text-ui-body text-ui-text mt-1.5">{{ evaluation.notes }}</p>
              <p class="text-ui-cap text-ui-muted mt-1">
                {{ formatDate(evaluation.evaluated_at) }}
                <span v-if="evaluation.evaluated_by?.name"> &middot; {{ $t("clients.detail.by", { name: evaluation.evaluated_by.name }) }}</span>
              </p>
            </div>
            <button
              v-if="can('clients-evaluation-delete')"
              type="button"
              class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad shrink-0"
              :aria-label="$t('clients.detail.deleteEvaluation')"
              @click="deleteEvaluation(evaluation.id)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </li>
        </ul>
      </section>

      <!-- ===== Projects + Maintenance ===== -->
      <div v-else class="space-y-5">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
          <header class="px-5 sm:px-6 py-4 border-b border-ui-line">
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("clients.detail.tabs.projects") }}</h2>
            <p class="text-ui-cap text-ui-muted">{{ $t("clients.detail.projectsHint") }}</p>
          </header>
          <UiEmpty v-if="!client.projects || client.projects.length === 0" :icon="FolderKanban" :title="$t('clients.detail.noProjects')" compact />
          <ul v-else class="divide-y divide-ui-line ui-stagger">
            <li v-for="(project, idx) in client.projects" :key="project.id">
              <router-link
                :to="{ name: 'admin.projects.detail', params: { id: project.id } }"
                class="flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-ui-hover transition-colors"
              >
                <span class="text-ui-cap text-ui-faint tabular-nums w-5 shrink-0">{{ idx + 1 }}</span>
                <p class="flex-1 min-w-0 text-ui-body font-medium text-ui-ink truncate">{{ project.name }}</p>
                <UiBadge :tone="PROJECT_TONE[project.status] || 'neutral'" dot class="capitalize">{{ projectStatusLabel(project.status) }}</UiBadge>
              </router-link>
            </li>
          </ul>
        </section>
      </div>

      <!-- Maintenance contracts (optional) -->
      <MaintenancePanel v-if="activeTab === 'projects' && (can('maintenance-menu') || can('maintenance-list'))" :client-id="client.id" />
    </template>

    <!-- Add Evaluation Modal -->
    <UiModal v-model:open="showEvaluationModal" :title="$t('clients.detail.evaluationModal.title')" size="sm">
      <form id="client-evaluation-form" class="space-y-4" @submit.prevent="submitEvaluation">
        <div>
          <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("clients.detail.evaluationModal.rating") }}</p>
          <div class="flex items-center gap-1">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="ui-press p-1 rounded-ui-control focus:outline-none focus-visible:shadow-ui-focus"
              :aria-label="`${n}/5`"
              @click="evaluationForm.rating = n"
            >
              <Star
                class="w-7 h-7 transition-colors"
                :class="n <= evaluationForm.rating ? 'text-ui-warn' : 'text-ui-line-strong'"
                :fill="n <= evaluationForm.rating ? 'currentColor' : 'none'"
              />
            </button>
            <span class="text-ui-small font-medium text-ui-ink ml-2 tabular-nums">{{ evaluationForm.rating }}/5</span>
          </div>
        </div>

        <div>
          <label for="client-evaluation-date" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("clients.detail.evaluationModal.date") }}</label>
          <input
            id="client-evaluation-date"
            v-model="evaluationForm.evaluated_at"
            type="date"
            :max="todayISO"
            class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
          />
        </div>

        <UiInput v-model="evaluationForm.notes" :label="$t('clients.detail.evaluationModal.notes')" :rows="3" :placeholder="$t('clients.detail.evaluationModal.notesPlaceholder')" />
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="closeEvaluationModal">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="client-evaluation-form" class="flex-1 sm:flex-none" :loading="submittingEvaluation">
          {{ submittingEvaluation ? $t("common.actions.saving") : $t("clients.detail.evaluationModal.save") }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
