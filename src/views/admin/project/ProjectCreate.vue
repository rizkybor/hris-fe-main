<script setup>
import RightSidebar from "@/components/admin/employee/create/RightSidebar.vue";
import Avatar from "@/components/common/Avatar.vue";
import {
  Briefcase,
  Image,
  Upload,
  ImagePlus,
  Eye,
  X,
  Calendar,
  Tag,
  FileText,
  Crown,
  UserCheck,
  ChevronDown,
  Users,
  Code,
  Check,
  Settings,
  DollarSign,
  PlayCircle,
  ClipboardList,
  PauseCircle,
  Plus,
  Minus,
  Flag,
  Zap,
  Search,
  SearchX,
  Building2,
  Link2,
  Trash2,
} from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { debounce } from "lodash-es";
import { useProjectStore } from "@/stores/project";
import { useTeamStore } from "@/stores/team";
import { useEmployeeStore } from "@/stores/employee";
import { useClientStore } from "@/stores/client";
import { storeToRefs } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import router from "@/router";
import { UiPageHeader, UiButton, UiInput, UiSelect, UiModal, UiEmpty, UiBadge } from "@/components/ui";
import { ArrowLeft, Save } from "lucide-vue-next";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// Presentation-only option lists (same values as before).
const TYPE_OPTIONS = computed(() => [
  { value: "web_development", label: t("projects.types.webDevelopment") },
  { value: "mobile_app", label: t("projects.types.mobileApp") },
  { value: "design", label: t("projects.types.design") },
  { value: "marketing", label: t("projects.types.marketing") },
  { value: "research", label: t("projects.types.research") },
  { value: "infrastructure", label: t("projects.types.infrastructure") },
]);
const PRIORITY_OPTIONS = computed(() => [
  { value: "low", label: t("projects.priority.low"), icon: Minus },
  { value: "medium", label: t("projects.priority.medium"), icon: Flag },
  { value: "high", label: t("projects.priority.high"), icon: Zap },
]);
const STATUS_OPTIONS = computed(() => [
  { value: "active", label: t("projects.status.active"), icon: PlayCircle },
  { value: "planning", label: t("projects.status.planning"), icon: ClipboardList },
  { value: "on_hold", label: t("projects.status.onHold"), icon: PauseCircle },
  { value: "draft", label: t("projects.status.draft"), icon: FileText },
]);
// Native input look for fields UiInput can't take 1:1 (min, prefix, rows).
const FIELD =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";

const projectStore = useProjectStore();
const { loading, error, success } = storeToRefs(projectStore);
const { createProject } = projectStore;

const teamStore = useTeamStore();
const { teams } = storeToRefs(teamStore);
const { fetchTeams } = teamStore;

const employeeStore = useEmployeeStore();
const { employees } = storeToRefs(employeeStore);
const { fetchEmployees } = employeeStore;

const clientsStore = useClientStore();
const { clients } = storeToRefs(clientsStore);
const clientOptions = computed(() => clients.value.map((client) => ({ value: client.id, label: client.name })));

const form = ref({
  name: "",
  type: "",
  priority: "",
  status: "",
  start_date: "",
  end_date: "",
  description: "",
  photo: "",
  photo_url: "",
  budget: "",
  warranty_period_months: "",
  retention_period_months: "",
  project_leader_id: "",
  team_assignment_mode: "employee",
  team_id: "",
  member_employee_ids: [],
  client_id: "",
  access_project_name: "",
  access_project_url: "",
  access_github_name: "",
  access_github_url: "",
  access_figma_name: "",
  access_figma_url: "",
  additional_access: [],
});

const addAdditionalAccess = () => form.value.additional_access.push({ name: "", url: "" });
const removeAdditionalAccess = (i) => form.value.additional_access.splice(i, 1);

const projectPhotoInput = ref(null);
const leaderModal = ref(false);
const searchLeader = ref("");
const selectedLeader = ref(null);

// "By Team" locks the leader/members to a single Team's own data (see
// ProjectRepository::applyTeamAssignment on the backend); "By Employee"
// picks both individually. Switching modes clears whichever fields the
// other mode owns so a stale pick from before the switch never gets
// submitted silently.
const setAssignmentMode = (mode) => {
  form.value.team_assignment_mode = mode;
  if (mode === "team") {
    form.value.project_leader_id = "";
    form.value.member_employee_ids = [];
    selectedLeader.value = null;
  } else {
    form.value.team_id = "";
  }
};

// The Team list (fetchTeams) only carries members_count, not the actual
// member roster -- fetch the full detail once a team is picked so the
// preview can show real names.
const selectedTeamDetail = ref(null);
watch(
  () => form.value.team_id,
  async (teamId) => {
    selectedTeamDetail.value = teamId ? await teamStore.fetchTeam(teamId) : null;
  }
);

// Kept separate from employeeStore.employees (driven by the Project Leader
// search modal's own limited/search-scoped fetches) so this full-roster
// member picker doesn't fight it over the same shared state.
const memberCandidates = ref([]);
const memberSearch = ref("");
// The Project Leader shouldn't also be pickable as a Member -- they're
// already the project's owner, so offering them again here would just be
// a confusing duplicate pick.
const selectableMemberCandidates = computed(() =>
  memberCandidates.value.filter((employee) => employee.id !== form.value.project_leader_id)
);
const filteredMemberCandidates = computed(() => {
  if (!memberSearch.value.trim()) return selectableMemberCandidates.value;
  const q = memberSearch.value.trim().toLowerCase();
  return selectableMemberCandidates.value.filter((employee) => (employee.user?.name || "").toLowerCase().includes(q));
});

const toggleMember = (employeeId) => {
  const idx = form.value.member_employee_ids.indexOf(employeeId);
  if (idx === -1) {
    form.value.member_employee_ids.push(employeeId);
  } else {
    form.value.member_employee_ids.splice(idx, 1);
  }
};

const formatRupiahInput = (value) => {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(digits));
};

const formattingBudget = ref(false);

const handleSubmit = async () => {
  const payload = { ...form.value };
  payload.budget =
    parseInt(String(form.value.budget).replace(/[^0-9]/g, "")) || 0;
  payload.warranty_period_months =
    form.value.warranty_period_months === "" || form.value.warranty_period_months === null
      ? null
      : parseInt(form.value.warranty_period_months);
  payload.retention_period_months =
    form.value.retention_period_months === "" || form.value.retention_period_months === null
      ? null
      : parseInt(form.value.retention_period_months);
  // Drop rows the user started but never finished (only name or only url
  // filled in) rather than sending a half-empty pair the backend would
  // reject.
  payload.additional_access = form.value.additional_access.filter((item) => item.name && item.url);
  await createProject(payload);

  if (success.value) {
    router.push({ name: "admin.projects" });
  }
};

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const photoError = ref("");

const handleProjectPhotoSelect = (e) => {
  const file = e.target.files[0];
  photoError.value = "";
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    photoError.value = t("projects.form.photoType");
  } else if (file.size > MAX_PHOTO_BYTES) {
    photoError.value = t("projects.form.photoSize");
  } else {
    if (form.value.photo_url) URL.revokeObjectURL(form.value.photo_url);
    form.value.photo = file;
    form.value.photo_url = URL.createObjectURL(file);
  }
  // Allows picking the same file again after removing it.
  e.target.value = "";
};

const openPhotoPicker = () => projectPhotoInput.value?.click();

const handleRemovePhoto = () => {
  if (form.value.photo_url) URL.revokeObjectURL(form.value.photo_url);
  form.value.photo = "";
  form.value.photo_url = "";
  photoError.value = "";
};

const handleSelectLeader = (employee) => {
  selectedLeader.value = employee;
  form.value.project_leader_id = employee.id;

  // Already the project's owner -- drop any prior explicit member pick so
  // the same person isn't submitted twice.
  const idx = form.value.member_employee_ids.indexOf(employee.id);
  if (idx !== -1) form.value.member_employee_ids.splice(idx, 1);

  leaderModal.value = false;
};

const handleRemoveLeader = () => {
  selectedLeader.value = null;
  form.value.project_leader_id = "";
};

onMounted(async () => {
  await fetchTeams();
  await fetchEmployees({
    limit: 6,
  });
  await clientsStore.fetchAllClient();

  const { data } = await axiosInstance.get("employees");
  memberCandidates.value = data.data;

  if (form.value.budget) {
    form.value.budget = formatRupiahInput(form.value.budget);
  }
});

watch(
  searchLeader,
  debounce(() => {
    fetchEmployees({
      limit: 6,
      search: searchLeader.value,
    });
  }, 300),
  { deep: true }
);

watch(
  () => form.value.budget,
  (val) => {
    if (formattingBudget.value) return;
    const formatted = formatRupiahInput(val);
    if (formatted !== val) {
      formattingBudget.value = true;
      form.value.budget = formatted;
      formattingBudget.value = false;
    }
  }
);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('projects.form.createTitle')" :subtitle="$t('projects.form.createSubtitle')">
      <template #eyebrow>
        <button
          type="button"
          @click="router.back()"
          class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
        >
          <ArrowLeft class="w-4 h-4" />
          {{ $t("common.actions.back") }}
        </button>
      </template>
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="project-form" :icon="Plus" :loading="loading">{{ $t("projects.form.createSubmit") }}</UiButton>
        </div>
      </template>
    </UiPageHeader>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      <!-- Form Section -->
      <form id="project-form" class="space-y-5 min-w-0 ui-stagger" @submit.prevent="handleSubmit">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
          <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
            <span class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted shrink-0">
              <Briefcase class="w-4 h-4" />
            </span>
            <div class="min-w-0">
              <h2 class="text-ui-h2 text-ui-ink">{{ $t("projects.detail.info.title") }}</h2>
              <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.form.infoSubtitle") }}</p>
            </div>
          </header>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
            <!-- Project Photo -->
            <div class="md:col-span-2">
              <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.form.photoOptional") }}</p>
              <div class="flex flex-col sm:flex-row items-start gap-4">
                <button
                  type="button"
                  class="group relative w-full sm:w-64 h-40 shrink-0 rounded-ui-card overflow-hidden border border-dashed border-ui-line-strong bg-ui-subtle flex items-center justify-center focus:outline-none focus-visible:shadow-ui-focus"
                  :aria-label="$t('projects.form.selectPhotoLabel')"
                  @click="openPhotoPicker"
                >
                  <img :src="form.photo_url" :alt="$t('projects.form.photo')" class="w-full h-full object-cover" v-if="form.photo_url" />
                  <span v-else class="flex flex-col items-center justify-center text-ui-faint">
                    <Image class="w-8 h-8 mb-2" />
                    <span class="text-ui-small font-medium text-ui-muted">{{ $t("projects.form.photo") }}</span>
                  </span>
                  <span class="absolute inset-0 bg-ui-scrim/0 group-hover:bg-ui-scrim/30 transition-colors flex items-center justify-center">
                    <Upload class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </button>
                <div class="flex flex-col items-start gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="hidden"
                    ref="projectPhotoInput"
                    @change="handleProjectPhotoSelect"
                  />
                  <UiButton variant="secondary" size="sm" :icon="ImagePlus" @click="openPhotoPicker">{{ $t("projects.form.selectPhoto") }}</UiButton>
                  <UiButton v-if="form.photo_url" variant="secondary" size="sm" :icon="X" @click="handleRemovePhoto">{{ $t("projects.form.removePhoto") }}</UiButton>
                  <p class="text-ui-cap text-ui-muted">{{ $t("projects.form.photoHint") }}</p>
                  <p v-if="photoError" class="text-ui-cap text-ui-bad">{{ photoError }}</p>
                </div>
              </div>
            </div>

            <!-- Project Name -->
            <UiInput
              id="name"
              name="name"
              type="text"
              v-model="form.name"
              :label="$t('projects.form.name')"
              :placeholder="$t('projects.form.namePlaceholder')"
              :icon="Briefcase"
              required :error="error?.name?.join(', ')"
            />

            <!-- Client (optional) -->
            <UiSelect
              id="client_id"
              v-model="form.client_id"
              :label="$t('projects.form.clientOptional')"
              :options="[{ value: '', label: $t('projects.card.noClient') }, ...clientOptions]"
              :hint="$t('projects.form.clientHint')"
            />

            <!-- Priority -->
            <div class="md:col-span-2">
              <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.fields.priority") }} <span class="text-ui-bad">*</span></p>
              <div class="grid grid-cols-3 gap-2 sm:gap-3">
                <label
                  v-for="opt in PRIORITY_OPTIONS"
                  :key="opt.value"
                  class="group flex items-center gap-2 sm:gap-3 min-h-[48px] sm:min-h-[52px] rounded-ui-control border border-ui-line bg-ui-surface px-3 sm:px-3.5 py-2.5 cursor-pointer transition-colors hover:bg-ui-subtle has-[:checked]:border-ui-ink has-[:checked]:ring-1 has-[:checked]:ring-ui-ink has-[:focus-visible]:shadow-ui-focus"
                >
                  <input type="radio" name="project_priority" :value="opt.value" class="sr-only" v-model="form.priority" />
                  <span class="w-8 h-8 rounded-ui-control bg-ui-subtle hidden sm:flex items-center justify-center text-ui-muted shrink-0">
                    <component :is="opt.icon" class="w-4 h-4" />
                  </span>
                  <span class="flex-1 text-ui-small font-medium text-ui-ink">{{ opt.label }}</span>
                  <Check class="w-4 h-4 text-ui-ink hidden group-has-[:checked]:block shrink-0" />
                </label>
              </div>
            </div>

            <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
              <!-- Project Type -->
              <UiSelect
                id="type"
                v-model="form.type"
                :label="$t('projects.form.type')"
                :placeholder="$t('projects.form.typePlaceholder')"
                :options="TYPE_OPTIONS"
                required :error="error?.type?.join(', ')"
              />

              <!-- Start Date -->
              <UiInput
                id="start_date"
                name="start_date"
                type="date"
                v-model="form.start_date"
                :label="$t('projects.fields.startDate')"
                required :error="error?.start_date?.join(', ')"
              />

              <!-- End Date -->
              <UiInput
                id="end_date"
                name="end_date"
                type="date"
                v-model="form.end_date"
                :label="$t('projects.form.endDateOptional')" :error="error?.end_date?.join(', ')"
              />
            </div>

            <!-- Project Description -->
            <div class="md:col-span-2">
              <UiInput
                id="description"
                name="description"
                v-model="form.description"
                :label="$t('projects.form.descriptionOptional')"
                :placeholder="$t('projects.form.descriptionPlaceholder')"
                :rows="4" :error="error?.description?.join(', ')"
              />
            </div>
          </div>
        </section>

        <section id="project-access-section" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
          <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
            <span class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted shrink-0">
              <Link2 class="w-4 h-4" />
            </span>
            <div class="min-w-0">
              <h2 class="text-ui-h2 text-ui-ink">{{ $t("projects.access.title") }}</h2>
              <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.form.accessSubtitle") }}</p>
            </div>
          </header>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <UiInput
              id="access_project_name"
              name="access_project_name"
              v-model="form.access_project_name"
              :label="$t('projects.form.accessProjectName')"
              :placeholder="$t('projects.form.accessProjectNamePlaceholder')"
            />
            <UiInput
              id="access_project_url"
              name="access_project_url"
              type="url"
              v-model="form.access_project_url"
              :label="$t('projects.form.accessProjectUrl')"
              placeholder="https://..."
            />

            <UiInput
              id="access_github_name"
              name="access_github_name"
              v-model="form.access_github_name"
              :label="$t('projects.form.accessGithubName')"
              :placeholder="$t('projects.form.accessGithubNamePlaceholder')"
            />
            <UiInput
              id="access_github_url"
              name="access_github_url"
              type="url"
              v-model="form.access_github_url"
              :label="$t('projects.form.accessGithubUrl')"
              placeholder="https://github.com/..."
            />

            <UiInput
              id="access_figma_name"
              name="access_figma_name"
              v-model="form.access_figma_name"
              :label="$t('projects.form.accessFigmaName')"
              :placeholder="$t('projects.form.accessFigmaNamePlaceholder')"
            />
            <UiInput
              id="access_figma_url"
              name="access_figma_url"
              type="url"
              v-model="form.access_figma_url"
              :label="$t('projects.form.accessFigmaUrl')"
              placeholder="https://figma.com/..."
            />
          </div>

          <div class="mt-6 pt-5 border-t border-ui-line">
            <div class="flex items-center justify-between mb-3">
              <p class="text-ui-small font-medium text-ui-ink">{{ $t("projects.form.additionalAccess") }}</p>
              <UiButton variant="ghost" size="sm" :icon="Plus" class="text-ui-accent" @click="addAdditionalAccess">{{ $t("projects.form.addLink") }}</UiButton>
            </div>
            <div
              v-for="(item, i) in form.additional_access"
              :key="i"
              class="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_auto] gap-3 mb-3 items-start"
            >
              <input
                v-model="item.name"
                type="text"
                :placeholder="$t('projects.form.linkNamePlaceholder')"
                :aria-label="$t('projects.form.linkName')"
                :class="FIELD"
                class="col-span-2 md:col-span-1"
              />
              <input
                v-model="item.url"
                type="url"
                placeholder="https://..."
                :aria-label="$t('projects.form.linkUrl')"
                :class="FIELD"
              />
              <button
                type="button"
                @click="removeAdditionalAccess(i)"
                class="ui-press w-[38px] h-[38px] inline-flex items-center justify-center rounded-ui-control border border-ui-line-strong text-ui-muted hover:text-ui-bad hover:border-ui-bad/30 hover:bg-ui-bad-soft"
                :aria-label="$t('projects.form.removeLink')"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <p v-if="form.additional_access.length === 0" class="text-ui-cap text-ui-faint">
              {{ $t("projects.form.noLinks") }}
            </p>
          </div>
        </section>

        <section id="team-assignment-section" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
          <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
            <span class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted shrink-0">
              <Users class="w-4 h-4" />
            </span>
            <div class="min-w-0">
              <h2 class="text-ui-h2 text-ui-ink">{{ $t("projects.form.teamAssignment") }}</h2>
              <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.form.teamAssignmentSubtitle") }}</p>
            </div>
          </header>
          <!-- Mode Toggle -->
          <div class="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              @click="setAssignmentMode('employee')"
              class="ui-press rounded-ui-control border p-3.5 sm:p-4 text-left transition-colors"
              :class="form.team_assignment_mode === 'employee' ? 'border-ui-ink ring-1 ring-ui-ink bg-ui-surface' : 'border-ui-line bg-ui-surface hover:bg-ui-subtle'"
              :aria-pressed="form.team_assignment_mode === 'employee'"
            >
              <span class="flex items-center justify-between gap-2">
                <span class="text-ui-small font-semibold text-ui-ink">{{ $t("projects.form.byEmployee") }}</span>
                <Check v-if="form.team_assignment_mode === 'employee'" class="w-4 h-4 text-ui-ink shrink-0" />
              </span>
              <span class="block text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.form.byEmployeeHint") }}</span>
            </button>
            <button
              type="button"
              @click="setAssignmentMode('team')"
              class="ui-press rounded-ui-control border p-3.5 sm:p-4 text-left transition-colors"
              :class="form.team_assignment_mode === 'team' ? 'border-ui-ink ring-1 ring-ui-ink bg-ui-surface' : 'border-ui-line bg-ui-surface hover:bg-ui-subtle'"
              :aria-pressed="form.team_assignment_mode === 'team'"
            >
              <span class="flex items-center justify-between gap-2">
                <span class="text-ui-small font-semibold text-ui-ink">{{ $t("projects.form.byTeam") }}</span>
                <Check v-if="form.team_assignment_mode === 'team'" class="w-4 h-4 text-ui-ink shrink-0" />
              </span>
              <span class="block text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.form.byTeamHint") }}</span>
            </button>
          </div>

          <!-- By Team -->
          <div v-if="form.team_assignment_mode === 'team'" class="space-y-5">
            <div>
              <p class="block text-ui-small font-medium text-ui-ink mb-2">{{ $t("projects.form.selectTeam") }} <span class="text-ui-bad">*</span></p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  class="group flex items-center gap-3 w-full min-h-[64px] rounded-ui-control border border-ui-line bg-ui-surface px-3.5 py-3 cursor-pointer transition-colors hover:bg-ui-subtle has-[:checked]:border-ui-ink has-[:checked]:ring-1 has-[:checked]:ring-ui-ink has-[:focus-visible]:shadow-ui-focus"
                  v-for="team in teams"
                  :key="team.id"
                >
                  <span class="w-10 h-10 rounded-[10px] bg-ui-subtle flex items-center justify-center text-ui-muted shrink-0">
                    <Code class="w-4 h-4" />
                  </span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-ui-small font-medium text-ui-ink truncate">{{ team.name }}</span>
                    <span class="block text-ui-cap text-ui-muted truncate">{{ $t("projects.form.teamMembers", { n: team.members_count }, team.members_count) }} • {{ team.leader?.name || $t("projects.form.noLead") }}</span>
                  </span>
                  <input type="radio" name="team_id" :value="team.id" class="w-4 h-4 accent-ui-ink shrink-0" v-model="form.team_id" />
                </label>
              </div>
              <p v-if="teams.length === 0" class="text-ui-small text-ui-faint py-2">{{ $t("projects.form.noTeams") }}</p>
            </div>

            <!-- Preview of the selected Team's leader + members -->
            <div v-if="selectedTeamDetail" class="rounded-ui-control bg-ui-subtle border border-ui-line p-4">
              <p class="text-ui-small font-medium text-ui-ink mb-1">
                {{ $t("projects.form.leaderWillBe") }} <span class="text-ui-accent">{{ selectedTeamDetail.leader?.name || $t("projects.form.leaderUnset") }}</span>
              </p>
              <p class="text-ui-cap text-ui-muted mb-2">{{ $t("projects.form.membersFromTeam", { n: selectedTeamDetail.members?.length || 0 }) }}</p>
              <div class="flex flex-wrap gap-1.5">
                <UiBadge v-for="member in selectedTeamDetail.members" :key="member.id" tone="outline">
                  {{ member.employee?.user?.name }}
                </UiBadge>
              </div>
            </div>
          </div>

          <!-- By Employee -->
          <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <!-- Project Leader -->
            <div class="min-w-0">
              <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.form.selectLeaderOptional") }}</p>
              <button
                type="button"
                @click="leaderModal = true"
                class="w-full h-[38px] bg-ui-surface border border-ui-line-strong rounded-ui-control hover:bg-ui-subtle focus:outline-none focus-visible:border-ui-accent focus-visible:shadow-ui-focus transition-colors px-3 flex items-center gap-2.5 text-left"
              >
                <UserCheck class="w-4 h-4 text-ui-faint shrink-0" />
                <span class="flex-1 truncate text-ui-body" :class="selectedLeader?.user?.name ? 'text-ui-ink' : 'text-ui-faint'">
                  {{ selectedLeader?.user?.name || $t("projects.form.selectLeaderPlaceholder") }}
                </span>
                <ChevronDown class="w-4 h-4 text-ui-faint shrink-0" />
              </button>

              <div class="mt-3 p-3.5 bg-ui-subtle rounded-ui-control border border-ui-line" v-if="selectedLeader">
                <div class="flex items-center gap-3">
                  <Avatar
                    :src="selectedLeader?.user?.profile_photo"
                    :alt="selectedLeader?.user?.name"
                    size="w-10 h-10"
                    icon-size="w-4 h-4"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-ui-small font-medium text-ui-ink truncate">{{ selectedLeader?.user?.name }}</p>
                    <p class="text-ui-cap text-ui-muted truncate">{{ selectedLeader?.job_information?.job_title }}</p>
                  </div>
                  <button
                    type="button"
                    @click="handleRemoveLeader"
                    class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:text-ui-ink hover:bg-ui-hover"
                    :aria-label="$t('projects.form.removeLeader')"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Members -->
            <div class="min-w-0">
              <div class="flex items-center justify-between mb-1.5">
                <p class="text-ui-small font-medium text-ui-ink">{{ $t("projects.form.membersOptional") }}</p>
                <span v-if="form.member_employee_ids.length" class="text-ui-cap text-ui-accent font-medium flex items-center gap-1 tabular-nums">
                  <Users class="w-3.5 h-3.5" />
                  {{ $t("projects.form.selected", { n: form.member_employee_ids.length }) }}
                </span>
              </div>
              <div class="border border-ui-line-strong rounded-ui-control overflow-hidden">
                <div v-if="selectableMemberCandidates.length > 8" class="relative border-b border-ui-line bg-ui-subtle p-2">
                  <Search class="w-3.5 h-3.5 text-ui-faint absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    v-model="memberSearch"
                    type="text"
                    :placeholder="$t('projects.tasks.detail.searchEmployees')"
                    :aria-label="$t('projects.form.searchEmployees')"
                    class="w-full h-8 pl-7 pr-2 bg-ui-surface border border-ui-line-strong rounded-[7px] text-ui-small text-ui-ink placeholder:text-ui-faint focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
                  />
                </div>
                <div class="p-1.5 max-h-64 overflow-y-auto">
                  <label
                    v-for="employee in filteredMemberCandidates"
                    :key="employee.id"
                    class="flex items-center gap-2.5 text-ui-small text-ui-text px-2.5 py-2 rounded-[7px] cursor-pointer hover:bg-ui-hover"
                  >
                    <input
                      type="checkbox"
                      :checked="form.member_employee_ids.includes(employee.id)"
                      @change="toggleMember(employee.id)"
                      class="w-4 h-4 rounded accent-ui-ink shrink-0"
                    />
                    <span class="truncate">{{ employee.user?.name }}</span>
                  </label>
                  <p v-if="selectableMemberCandidates.length === 0" class="text-ui-small text-ui-faint px-2.5 py-2">{{ $t("projects.form.noStaff") }}</p>
                  <p v-else-if="filteredMemberCandidates.length === 0" class="text-ui-small text-ui-faint px-2.5 py-2">{{ $t("projects.form.noMatch", { q: memberSearch }) }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
          <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
            <span class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted shrink-0">
              <Settings class="w-4 h-4" />
            </span>
            <div class="min-w-0">
              <h2 class="text-ui-h2 text-ui-ink">{{ $t("projects.form.settings") }}</h2>
              <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("projects.form.settingsSubtitle") }}</p>
            </div>
          </header>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <!-- Budget -->
            <div class="min-w-0">
              <label for="budget" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.form.budgetOptional") }}</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ui-small text-ui-muted pointer-events-none">Rp</span>
                <input
                  id="budget"
                  name="budget"
                  type="text"
                  inputmode="numeric"
                  v-model="form.budget"
                  placeholder="100.000.000"
                  :class="[FIELD, 'pl-9 text-right tabular-nums', error?.budget ? 'border-ui-bad/50' : '']"
                />
              </div>
              <p v-if="error?.budget" class="text-ui-cap text-ui-bad mt-1.5">{{ error?.budget?.join(", ") }}</p>
            </div>

            <!-- Warranty & Retention Period -->
              <div class="min-w-0">
                <label for="warranty_period_months" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.form.warrantyOptional") }}</label>
                <input
                  id="warranty_period_months"
                  name="warranty_period_months"
                  type="number"
                  min="0"
                  v-model="form.warranty_period_months"
                  :placeholder="$t('projects.form.examplePlaceholder', { n: 12 })"
                  :class="[FIELD, 'tabular-nums', error?.warranty_period_months ? 'border-ui-bad/50' : '']"
                />
                <p v-if="error?.warranty_period_months" class="text-ui-cap text-ui-bad mt-1.5">{{ error?.warranty_period_months?.join(", ") }}</p>
              </div>
              <div class="min-w-0">
                <label for="retention_period_months" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.form.retentionOptional") }}</label>
                <input
                  id="retention_period_months"
                  name="retention_period_months"
                  type="number"
                  min="0"
                  v-model="form.retention_period_months"
                  :placeholder="$t('projects.form.examplePlaceholder', { n: 6 })"
                  :class="[FIELD, 'tabular-nums', error?.retention_period_months ? 'border-ui-bad/50' : '']"
                />
                <p v-if="error?.retention_period_months" class="text-ui-cap text-ui-bad mt-1.5">{{ error?.retention_period_months?.join(", ") }}</p>
              </div>

            <!-- Initial Project Status (Full Width) -->
            <div class="md:col-span-3">
              <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("projects.form.initialStatus") }} <span class="text-ui-bad">*</span></p>
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <label
                  v-for="opt in STATUS_OPTIONS"
                  :key="opt.value"
                  class="group flex items-center gap-2 sm:gap-3 min-h-[48px] sm:min-h-[52px] rounded-ui-control border border-ui-line bg-ui-surface px-3 sm:px-3.5 py-2.5 cursor-pointer transition-colors hover:bg-ui-subtle has-[:checked]:border-ui-ink has-[:checked]:ring-1 has-[:checked]:ring-ui-ink has-[:focus-visible]:shadow-ui-focus"
                >
                  <input type="radio" name="project_status" :value="opt.value" class="sr-only" v-model="form.status" />
                  <span class="w-8 h-8 rounded-ui-control bg-ui-subtle hidden sm:flex items-center justify-center text-ui-muted shrink-0">
                    <component :is="opt.icon" class="w-4 h-4" />
                  </span>
                  <span class="flex-1 text-ui-small font-medium text-ui-ink">{{ opt.label }}</span>
                  <Check class="w-4 h-4 text-ui-ink hidden group-has-[:checked]:block shrink-0" />
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Form Actions -->
        <div class="flex items-center gap-3 sm:justify-end">
          <UiButton variant="secondary" size="lg" class="flex-1 sm:flex-none" @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" size="lg" class="flex-1 sm:flex-none" :icon="Plus" :loading="loading">{{ $t("projects.form.createSubmit") }}</UiButton>
        </div>
      </form>

      <RightSidebar />
    </div>

    <!-- Project Leader Selection Modal -->
    <UiModal
      v-model:open="leaderModal"
      size="lg"
      :title="$t('projects.form.selectLeader')"
      :description="$t('projects.form.selectLeaderDescription')"
    >
      <UiInput
        v-model="searchLeader"
        :icon="Search"
        :placeholder="$t('projects.tasks.detail.searchEmployees')"
        :aria-label="$t('projects.form.searchEmployees')"
      />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
        <button
          type="button"
          class="ui-press flex items-center gap-3 border border-ui-line rounded-ui-control hover:bg-ui-hover hover:border-ui-line-strong transition-colors p-3 text-left min-w-0"
          v-for="employee in employees"
          :key="employee.id"
          @click="handleSelectLeader(employee)"
        >
          <Avatar
            :src="employee.user?.profile_photo"
            :alt="employee.user?.name"
            size="w-10 h-10"
            icon-size="w-4 h-4"
          />
          <span class="flex-1 min-w-0">
            <span class="block text-ui-small font-medium text-ui-ink truncate">{{ employee.user?.name }}</span>
            <span class="block text-ui-cap text-ui-muted truncate">{{ employee.job_information?.job_title }}</span>
          </span>
          <Crown v-if="employee.id === form.project_leader_id" class="w-4 h-4 text-ui-warn shrink-0" />
        </button>
      </div>

      <!-- No Results Message -->
      <UiEmpty
        v-if="employees.length === 0"
        compact
        :icon="SearchX"
        :title="$t('projects.tasks.detail.noEmployees')"
        :message="$t('projects.form.noEmployeesHint')"
      />
    </UiModal>
  </div>
</template>
