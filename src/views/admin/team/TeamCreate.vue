<script setup>
import {
  UiPageHeader,
  UiButton,
  UiInput,
  UiSelect,
  UiModal,
  UiAlert,
  UiEmpty,
  UiBadge,
} from "@/components/ui";
import RightSidebarForm from "@/components/admin/team/RightSidebarForm.vue";
import Alert from "@/components/common/Alert.vue";
import Avatar from "@/components/common/Avatar.vue";
import {
  Tag,
  User,
  UserPlus,
  Users,
  FileText,
  Upload,
  X,
  Crown,
  UserCheck,
  ListCheck,
  CheckCircle,
  PlusCircle,
  Trash2,
  Settings,
  UsersRound,
  ClipboardList,
  PauseCircle,
  Plus,
  Search,
  SearchX,
  ChevronDown,
  Camera,
  Users2,
  Check,
} from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { debounce } from "lodash-es";
import { useTeamStore } from "@/stores/team";
import { useOptionStore } from "@/stores/option";
import { useEmployeeStore } from "@/stores/employee";
import { storeToRefs } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import router from "@/router";

// Presentation-only: the four status option cards (value, label, icon, tint).
const { t } = useI18n();
const statusChoices = computed(() => [
  { value: "active", label: t("teams.status.active"), icon: CheckCircle, tint: "bg-ui-ok-soft text-ui-ok" },
  { value: "forming", label: t("teams.status.forming"), icon: UsersRound, tint: "bg-ui-info-soft text-ui-info" },
  { value: "planning", label: t("teams.status.planning"), icon: ClipboardList, tint: "bg-ui-warn-soft text-ui-warn" },
  { value: "dormant", label: t("teams.status.dormant"), icon: PauseCircle, tint: "bg-ui-subtle text-ui-muted" },
]);

const teamStore = useTeamStore();
const { loading, error, success } = storeToRefs(teamStore);
const { createTeam } = teamStore;

const employeeStore = useEmployeeStore();
const { employees } = storeToRefs(employeeStore);
const { fetchEmployees } = employeeStore;

const optionStore = useOptionStore();
const { departments } = storeToRefs(optionStore);
const { fetchDepartments } = optionStore;

const form = ref({
  name: "",
  expected_size: "",
  description: "",
  icon: "",
  icon_url: "",
  department: "",
  status: "",
  team_lead_id: "",
  responsibilities: ["", "", ""],
  member_employee_ids: [],
});

const teamIconInput = ref(null);
const leadModal = ref(false);
const searchLead = ref("");
const selectedLead = ref(null);

// Kept separate from employeeStore.employees (used by the Team Lead
// search modal, which fetches a limited/filtered slice) so this
// full-roster member picker doesn't fight it over the same shared state.
const memberCandidates = ref([]);
const memberSearch = ref("");
// The Team Lead is already implicitly a member (the backend auto-adds
// them as one on create), so offering them again in this picker would
// just be a confusing duplicate pick.
const selectableMemberCandidates = computed(() => {
  const leadEmployeeId = selectedLead.value?.id;
  return memberCandidates.value.filter(
    (employee) => employee.id !== leadEmployeeId,
  );
});
const filteredMemberCandidates = computed(() => {
  if (!memberSearch.value.trim()) return selectableMemberCandidates.value;
  const q = memberSearch.value.trim().toLowerCase();
  return selectableMemberCandidates.value.filter((employee) =>
    (employee.user?.name || "").toLowerCase().includes(q),
  );
});

const toggleMember = (employeeId) => {
  const idx = form.value.member_employee_ids.indexOf(employeeId);
  if (idx === -1) {
    form.value.member_employee_ids.push(employeeId);
  } else {
    form.value.member_employee_ids.splice(idx, 1);
  }
};

const handleSubmit = async () => {
  await createTeam(form.value);

  if (success.value) {
    router.push({ name: "admin.teams" });
  }
};

const handleTeamIconSelect = (e) => {
  const file = e.target.files[0];

  if (file) {
    form.value.icon = file;
    form.value.icon_url = URL.createObjectURL(file);
  }
};

const handleRemoveIcon = () => {
  form.value.icon = "";
  form.value.icon_url = "";
  if (teamIconInput.value) teamIconInput.value.value = "";
};

const handleSelectLead = (employee) => {
  selectedLead.value = employee;
  form.value.team_lead_id = employee.user.id;

  // Already implicitly a member -- drop any prior explicit pick so the
  // same person isn't submitted twice.
  const idx = form.value.member_employee_ids.indexOf(employee.id);
  if (idx !== -1) form.value.member_employee_ids.splice(idx, 1);

  leadModal.value = false;
};

const handleRemoveLead = () => {
  selectedLead.value = null;
  form.value.team_lead_id = null;
};

const addNewResponsibility = () => {
  form.value.responsibilities.push("");
};

const removeResponsibility = (idx) => {
  form.value.responsibilities.splice(idx, 1);
};

onMounted(async () => {
  await fetchDepartments();
  await fetchEmployees({
    limit: 6,
  });

  const { data } = await axiosInstance.get("employees");
  memberCandidates.value = data.data;
});

watch(
  searchLead,
  debounce(() => {
    fetchEmployees({
      limit: 6,
      search: searchLead.value,
    });
  }, 300),
  { deep: true },
);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('teams.create.title')" :subtitle="$t('teams.create.subtitle')">
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="team-form" :loading="loading" :icon-right="Plus" >
            {{ $t("teams.create.submit") }}
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <div v-if="typeof error === 'string'">
      <Transition name="ui-fade">
        <UiAlert :key="error" tone="bad" :title="error" />
      </Transition>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
      <!-- Form Section -->
      <div class="lg:col-span-2 min-w-0">

        <form id="team-form" class="space-y-4 sm:space-y-5 ui-stagger" @submit.prevent="handleSubmit" >
          <!-- Team Information Section -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted">
                <User class="w-4 h-4" />
              </span>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">{{ $t("teams.form.info.title") }}</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("teams.form.info.subtitle") }}</p>
              </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <!-- Team Icon -->
              <div class="md:col-span-2">
                <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("teams.form.icon.label") }}</p>
                <div class="flex items-center gap-4">
                  <div class="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                    <!-- Icon Display (uploaded or default) -->
                    <div
                      id="teamIconDisplay"
                      class="w-full h-full rounded-full bg-ui-accent-soft text-ui-accent flex items-center justify-center overflow-hidden"
                    >
                      <img
                        id="uploadedTeamIcon"
                        :src="form.icon_url"
                        :alt="$t('teams.form.icon.label')"
                        class="w-7 h-7 sm:w-10 sm:h-10 object-contain"
                        v-if="form.icon_url"
                      />
                      <Camera v-else class="w-7 h-7" />
                    </div>

                    <!-- Upload overlay (shown on hover) -->
                    <button
                      type="button"
                      :aria-label="$t('teams.form.icon.upload')"
                      class="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer group bg-ui-scrim/0 hover:bg-ui-scrim/40 transition-colors focus:outline-none focus-visible:shadow-ui-focus"
                      @click="teamIconInput?.click()"
                    >
                      <Upload class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                  <div class="flex flex-col gap-2 min-w-0">
                    <input
                      type="file"
                      id="teamIconInput"
                      accept="image/*,.svg"
                      class="hidden"
                      ref="teamIconInput"
                      @change="handleTeamIconSelect"
                    />
                    <div class="flex flex-wrap gap-2">
                      <UiButton variant="secondary" size="sm" :icon="Upload" @click="teamIconInput?.click()">
                        {{ $t("teams.form.icon.upload") }}
                      </UiButton>
                      <UiButton
                        v-if="form.icon_url"
                        variant="ghost"
                        size="sm"
                        :icon="X"
                        @click="handleRemoveIcon"
                      >
                        {{ $t("teams.form.icon.remove") }}
                      </UiButton>
                    </div>
                    <p class="text-ui-cap text-ui-muted">
                      {{ $t("teams.form.icon.hint") }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Team Name -->
              <UiInput
                class="md:col-span-2"
                id="name"
                name="name"
                type="text"
                v-model="form.name"
                :label="$t('teams.form.name') + ' *'"
                :placeholder="$t('teams.form.namePlaceholder')"
                :icon="Users"
                :error="error?.name?.join(', ')"
              />

              <!-- Team Type -->
              <UiSelect
                id="department"
                v-model="form.department"
                :label="$t('teams.form.department') + ' *'"
                :placeholder="$t('teams.form.departmentPlaceholder')"
                :options="departments"
                :error="error?.department?.join(', ')"
              />

              <!-- Team Size -->
              <UiInput
                id="expected_size"
                name="expected_size"
                type="number"
                v-model="form.expected_size"
                :label="$t('teams.form.expectedSize')"
                :placeholder="$t('teams.form.expectedSizePlaceholder')"
                :icon="UserPlus"
                :error="error?.expected_size?.join(', ')"
              />

              <!-- Team Description -->
              <UiInput
                class="md:col-span-2"
                id="teamPurpose"
                name="team_purpose"
                :rows="4"
                v-model="form.description"
                :label="$t('teams.form.purpose')"
                :placeholder="$t('teams.form.purposePlaceholder')"
                :error="error?.description?.join(', ')"
              />
            </div>
          </section>

          <!-- Team Lead Section -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted">
                <Crown class="w-4 h-4" />
              </span>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">{{ $t("teams.form.lead.title") }}</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("teams.form.lead.subtitle") }}</p>
              </div>
            </header>

            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("teams.form.lead.select") }}</p>
            <button
              type="button"
              class="w-full h-[38px] bg-ui-surface border border-ui-line-strong rounded-ui-control hover:bg-ui-hover transition-colors px-3 flex items-center gap-2.5 text-left focus:outline-none focus-visible:border-ui-accent focus-visible:shadow-ui-focus"
              @click="leadModal = true"
            >
              <UserCheck class="w-4 h-4 text-ui-faint shrink-0" />
              <span
                class="text-ui-body flex-1 truncate"
                :class="selectedLead?.user?.name ? 'text-ui-ink' : 'text-ui-faint'"
              >
                {{ selectedLead?.user?.name || $t("teams.form.lead.placeholder") }}
              </span>
              <ChevronDown class="w-4 h-4 text-ui-faint shrink-0" />
            </button>

            <div
              class="mt-3 p-3 bg-ui-subtle rounded-ui-control border border-ui-line"
              v-if="selectedLead"
            >
              <div class="flex items-center gap-3">
                <Avatar
                  :src="selectedLead?.user?.profile_photo"
                  :alt="selectedLead?.user?.name"
                  size="w-9 h-9"
                  icon-size="w-5 h-5"
                />
                <div class="flex-1 min-w-0">
                  <h4 class="text-ui-h3 text-ui-ink truncate">
                    {{ selectedLead?.user?.name }}
                  </h4>
                  <p class="text-ui-small text-ui-muted truncate">
                    {{ selectedLead?.job_information?.job_title }}
                  </p>
                </div>
                <button
                  type="button"
                  @click="handleRemoveLead"
                  :aria-label="$t('teams.form.lead.remove')"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          <!-- Team Members Section -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted">
                <Users class="w-4 h-4" />
              </span>
              <div class="min-w-0 flex-1">
                <h3 class="text-ui-h2 text-ui-ink">{{ $t("teams.form.members.title") }}</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("teams.create.membersSubtitle") }}</p>
              </div>
            </header>

            <div class="flex items-center justify-between mb-1.5">
              <p class="text-ui-small font-medium text-ui-ink">{{ $t("teams.form.members.label") }}</p>
              <UiBadge v-if="form.member_employee_ids.length" tone="accent" class="tabular-nums">
                <Users class="w-3.5 h-3.5" />
                {{ $t("teams.form.members.selected", { n: form.member_employee_ids.length }) }}
              </UiBadge>
            </div>
            <div class="border border-ui-line rounded-ui-control overflow-hidden">
              <div
                v-if="selectableMemberCandidates.length > 8"
                class="border-b border-ui-line bg-ui-subtle p-2"
              >
                <UiInput
                  v-model="memberSearch"
                  :icon="Search"
                  :placeholder="$t('teams.form.searchEmployees')"
                />
              </div>
              <div class="p-1.5 max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-2">
                <label
                  v-for="employee in filteredMemberCandidates"
                  :key="employee.id"
                  class="flex items-center gap-2.5 text-ui-body text-ui-ink px-2.5 py-2 rounded-ui-control cursor-pointer hover:bg-ui-hover"
                >
                  <input
                    type="checkbox"
                    :checked="form.member_employee_ids.includes(employee.id)"
                    @change="toggleMember(employee.id)"
                    class="w-4 h-4 shrink-0 accent-ui-ink cursor-pointer"
                  />
                  <span class="truncate">{{ employee.user?.name }}</span>
                </label>
                <p
                  v-if="selectableMemberCandidates.length === 0"
                  class="sm:col-span-2 text-ui-small text-ui-faint px-2.5 py-2"
                >
                  {{ $t("teams.form.members.empty") }}
                </p>
                <p
                  v-else-if="filteredMemberCandidates.length === 0"
                  class="sm:col-span-2 text-ui-small text-ui-faint px-2.5 py-2"
                >
                  {{ $t("teams.form.members.noMatch", { q: memberSearch }) }}
                </p>
              </div>
            </div>
          </section>

          <!-- Team Responsibilities Section -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted">
                <ListCheck class="w-4 h-4" />
              </span>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">{{ $t("teams.form.responsibilities.title") }}</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("teams.form.responsibilities.subtitle") }}</p>
              </div>
            </header>

            <div class="space-y-4" id="responsibilitiesContainer">
              <div
                class="responsibility-item"
                v-for="index in 3"
                :key="`responsibility-${index - 1}`"
              >
                <UiInput
                  :id="`responsibility_${index - 1}`"
                  :name="`responsibility_${index - 1}`"
                  type="text"
                  v-model="form.responsibilities[index - 1]"
                  :label="$t('teams.form.responsibilities.item', { n: index })"
                  :error="error?.responsibilities?.[index - 1]?.join(', ')"
                  :required="true"
                  :icon="CheckCircle"
                  :placeholder="$t('teams.form.responsibilities.placeholder')"
                />
              </div>
            </div>

            <div id="dynamicResponsibilitiesContainer">
              <template
                v-for="(responsibility, index) in form.responsibilities"
                :key="`responsibility-${index}`"
              >
                <div
                  v-if="index >= 3"
                  class="responsibility-item mt-4"
                  :id="`responsibility_field_${index + 1}`"
                >
                  <div class="flex items-start gap-2">
                    <UiInput
                      :id="`responsibility_${index}`"
                      :name="`responsibility_${index}`"
                      type="text"
                      v-model="form.responsibilities[index]"
                      :label="$t('teams.form.responsibilities.item', { n: index + 1 })"
                      :error="error?.responsibilities?.[index]?.join(', ')"
                      :required="true"
                      :icon="CheckCircle"
                      :placeholder="$t('teams.form.responsibilities.additionalPlaceholder')"
                      class="flex-1"
                    />
                    <button
                      type="button"
                      :aria-label="$t('teams.form.responsibilities.remove')"
                      class="ui-press w-[38px] h-[38px] mt-[26px] shrink-0 border border-ui-line-strong rounded-ui-control text-ui-muted hover:text-ui-bad hover:bg-ui-bad-soft hover:border-ui-bad/30 transition-colors flex items-center justify-center"
                      @click="removeResponsibility(index)"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </template>
            </div>

            <!-- Add New Responsibility -->
            <button
              type="button"
              class="ui-press mt-4 w-full border border-dashed border-ui-line-strong rounded-ui-control hover:bg-ui-hover transition-colors px-3.5 py-2.5 flex items-center justify-center gap-2 text-ui-small font-medium text-ui-text focus:outline-none focus-visible:shadow-ui-focus"
              @click="addNewResponsibility()"
            >
              <PlusCircle class="w-4 h-4 text-ui-muted" />
              {{ $t("teams.form.responsibilities.add") }}
            </button>
          </section>

          <!-- Team Settings Section -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted">
                <Settings class="w-4 h-4" />
              </span>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">{{ $t("teams.form.settings.title") }}</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("teams.form.settings.subtitle") }}</p>
              </div>
            </header>

            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("teams.form.settings.initialStatus") }}</p>
            <div class="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
              <label
                v-for="option in statusChoices"
                :key="option.value"
                :class="[
                  'ui-press relative flex items-center gap-3 rounded-ui-control border p-3.5 cursor-pointer transition-colors',
                  form.status === option.value
                    ? 'border-ui-ink bg-ui-surface shadow-ui-raised'
                    : 'border-ui-line bg-ui-surface hover:bg-ui-hover hover:border-ui-line-strong',
                ]"
              >
                <input
                  type="radio"
                  name="team_status"
                  :value="option.value"
                  class="sr-only"
                  v-model="form.status"
                />
                <span
                  class="w-8 h-8 shrink-0 rounded-ui-control flex items-center justify-center"
                  :class="option.tint"
                >
                  <component :is="option.icon" class="w-4 h-4" />
                </span>
                <span class="flex-1 min-w-0">
                  <span class="block text-ui-small font-medium text-ui-ink">{{ option.label }}</span>
                  <span
                    class="block text-ui-cap"
                    :class="form.status === option.value ? 'text-ui-accent' : 'text-ui-muted'"
                  >
                    {{ form.status === option.value ? $t("teams.form.settings.selected") : $t("common.actions.select") }}
                  </span>
                </span>
                <span
                  class="w-4 h-4 shrink-0 rounded-full border transition-all"
                  :class="form.status === option.value ? 'border-[5px] border-ui-ink' : 'border-ui-line-strong'"
                ></span>
              </label>
            </div>
          </section>

          <!-- Form Actions -->
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <!-- Cancel -->
            <UiButton variant="secondary" class="w-full sm:w-auto" size="lg" @click="router.back()">
              {{ $t("common.actions.cancel") }}
            </UiButton>
            <!-- Create Team -->
            <UiButton
              type="submit"
              size="lg"
              class="w-full sm:w-auto"
              :loading="loading"
              :icon-right="Plus"
            >
              {{ $t("teams.create.submit") }}
            </UiButton>
          </div>
        </form>
      </div>

      <RightSidebarForm @browse-employees="leadModal = true" />
    </div>

    <!-- Team Lead picker -->
    <UiModal
      v-model:open="leadModal"
      size="lg"
      :title="$t('teams.form.lead.select')"
      :description="$t('teams.form.lead.modalSubtitle')"
    >
      <!-- Search Bar -->
      <UiInput
        id="leadSearch"
        :icon="Search"
        :placeholder="$t('teams.form.searchEmployees')"
        v-model="searchLead"
      />

      <!-- Employees List -->
      <div id="leadList" class="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
        <button
          type="button"
          class="lead-card ui-press w-full text-left border border-ui-line rounded-ui-control hover:bg-ui-hover hover:border-ui-line-strong transition-colors p-3 cursor-pointer focus:outline-none focus-visible:shadow-ui-focus"
          :class="selectedLead?.id === employee.id ? 'border-ui-ink' : ''"
          v-for="employee in employees"
          :key="employee.id"
          @click="handleSelectLead(employee)"
        >
          <div class="flex items-center gap-3">
            <Avatar
              :src="employee.user?.profile_photo"
              :alt="employee.user?.name"
              size="w-10 h-10"
              icon-size="w-5 h-5"
            />
            <div class="flex-1 min-w-0">
              <h4 class="text-ui-h3 text-ui-ink truncate">
                {{ employee.user?.name }}
              </h4>
              <p class="text-ui-small text-ui-muted truncate">
                {{ employee.job_information?.job_title }}
              </p>
            </div>
          </div>
        </button>
      </div>

      <!-- No Results Message -->
      <UiEmpty
        v-if="employees.length === 0"
        compact
        :icon="SearchX"
        :title="$t('teams.form.lead.noEmployees')"
        :message="$t('teams.form.lead.noEmployeesHint')"
      />
    </UiModal>
  </div>
</template>
