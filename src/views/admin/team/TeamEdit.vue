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
import { debounce } from "lodash-es";
import { useTeamStore } from "@/stores/team";
import { useOptionStore } from "@/stores/option";
import { useEmployeeStore } from "@/stores/employee";
import { storeToRefs } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import router from "@/router";
import { useRoute } from "vue-router";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const route = useRoute();
const id = route.params.id;

// Presentation-only: the four status option cards (value, label, icon, tint).
const statusChoices = [
  { value: "active", label: "Active", icon: CheckCircle, tint: "bg-ui-ok-soft text-ui-ok" },
  { value: "forming", label: "Forming", icon: UsersRound, tint: "bg-ui-info-soft text-ui-info" },
  { value: "planning", label: "Planning", icon: ClipboardList, tint: "bg-ui-warn-soft text-ui-warn" },
  { value: "dormant", label: "Dormant", icon: PauseCircle, tint: "bg-ui-subtle text-ui-muted" },
];

const teamStore = useTeamStore();
const { loading, error, success } = storeToRefs(teamStore);
const { updateTeam, fetchTeam, addMember, removeMember } = teamStore;

const employeeStore = useEmployeeStore();
const { employees } = storeToRefs(employeeStore);
const { fetchEmployees } = employeeStore;

const optionStore = useOptionStore();
const { departments } = storeToRefs(optionStore);
const { fetchDepartments } = optionStore;

const form = ref({
  id: "",
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
const initialLoading = ref(true);

// Full roster for the member picker, kept separate from employeeStore.employees
// (used by the Team Lead search modal, which fetches a limited/filtered slice)
// so this picker doesn't fight it over the same shared state.
const memberCandidates = ref([]);
const memberSearch = ref("");
// Set while a checkbox's add-member/remove-member request is in flight, so
// that row can be disabled and the click can't be double-fired.
const togglingMemberId = ref(null);

// The Team Lead is already implicitly a member, so offering them again in
// this picker would just be a confusing duplicate pick.
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

const toggleMember = async (employeeId) => {
  if (togglingMemberId.value) return;

  const idx = form.value.member_employee_ids.indexOf(employeeId);
  togglingMemberId.value = employeeId;

  try {
    if (idx === -1) {
      await addMember(id, employeeId);
      form.value.member_employee_ids.push(employeeId);
    } else {
      await removeMember(id, employeeId);
      form.value.member_employee_ids.splice(idx, 1);
    }
  } catch (err) {
    console.error("Failed to update team member:", err);
  } finally {
    togglingMemberId.value = null;
  }
};

const handleFetchTeam = async () => {
  const response = await fetchTeam(id);

  form.value = response;

  form.value.icon_url = response.icon;
  form.value.icon = null;

  form.value.team_lead_id = response.team_lead_id;
  form.value.member_employee_ids = (response.members || []).map(
    (member) => member.employee.id,
  );

  selectedLead.value = {
    user: response.leader,
    job_information: response.leader?.employee_profile?.job_information,
  };
};

const handleSubmit = async () => {
  await updateTeam(id, form.value);

  if (success.value) {
    router.back();
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
  const { selectedLead: sl, team_lead_id } =
    teamStore.selectLeadPayload(employee);
  selectedLead.value = sl;
  form.value.team_lead_id = team_lead_id;
  leadModal.value = false;
};

const handleRemoveLead = () => {
  const { selectedLead: sl, team_lead_id } = teamStore.removeLeadPayload();
  selectedLead.value = sl;
  form.value.team_lead_id = team_lead_id;
};

const addNewResponsibility = () => {
  form.value.responsibilities = teamStore.addResponsibility(
    form.value.responsibilities,
  );
};

const removeResponsibility = (idx) => {
  form.value.responsibilities = teamStore.removeResponsibility(
    form.value.responsibilities,
    idx,
  );
};

onMounted(async () => {
  try {
    await fetchDepartments();
    await fetchEmployees({
      limit: 6,
    });

    const { data } = await axiosInstance.get("employees");
    memberCandidates.value = data.data;

    await handleFetchTeam();
  } finally {
    initialLoading.value = false;
  }
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
    <UiPageHeader title="Edit Team" subtitle="Update team details and leadership">
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" @click="router.back()">Cancel</UiButton>
          <UiButton type="submit" form="team-form" :loading="loading" :icon-right="Check" :disabled="initialLoading">
            Update Team
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
        <div v-if="initialLoading" class="space-y-4 sm:space-y-5" role="status" aria-label="Loading">
          <div v-for="i in 2" :key="i" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 space-y-4">
            <Skeleton width="200px" height="20px" />
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <Skeleton height="38px" />
              <Skeleton height="38px" />
            </div>
            <Skeleton height="90px" />
          </div>
        </div>
        <form id="team-form" class="space-y-4 sm:space-y-5 ui-stagger" @submit.prevent="handleSubmit" v-else>
          <!-- Team Information Section -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted">
                <User class="w-4 h-4" />
              </span>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">Team Information</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">Basic team details and description</p>
              </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <!-- Team Icon -->
              <div class="md:col-span-2">
                <p class="block text-ui-small font-medium text-ui-ink mb-1.5">Team Icon</p>
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
                        alt="Team Icon"
                        class="w-7 h-7 sm:w-10 sm:h-10 object-contain"
                        v-if="form.icon_url"
                      />
                      <Camera v-else class="w-7 h-7" />
                    </div>

                    <!-- Upload overlay (shown on hover) -->
                    <button
                      type="button"
                      aria-label="Upload Icon"
                      class="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer group bg-ui-ink/0 hover:bg-ui-ink/40 transition-colors focus:outline-none focus-visible:shadow-ui-focus"
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
                        Upload Icon
                      </UiButton>
                      <UiButton
                        v-if="form.icon_url"
                        variant="ghost"
                        size="sm"
                        :icon="X"
                        @click="handleRemoveIcon"
                      >
                        Remove Icon
                      </UiButton>
                    </div>
                    <p class="text-ui-cap text-ui-muted">
                      SVG, PNG up to 1MB (recommended: icon format)
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
                label="Name *"
                placeholder="Enter team name "
                :icon="Users"
                :error="error?.name?.join(', ')"
              />

              <!-- Team Type -->
              <UiSelect
                id="department"
                v-model="form.department"
                label="Department *"
                placeholder="Select department"
                :options="departments"
                :error="error?.department?.join(', ')"
              />

              <!-- Team Size -->
              <UiInput
                id="expected_size"
                name="expected_size"
                type="number"
                v-model="form.expected_size"
                label="Expected Team Size"
                placeholder="Enter expected team size"
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
                label="Team Purpose"
                placeholder="Describe the team's purpose and goals..."
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
                <h3 class="text-ui-h2 text-ui-ink">Team Lead</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">Assign a team leader to manage this team</p>
              </div>
            </header>

            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">Select Team Lead</p>
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
                {{ selectedLead?.user?.name || "Select team lead" }}
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
                  aria-label="Remove team lead"
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
                <h3 class="text-ui-h2 text-ui-ink">Team Members</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">Add or remove employees from this team</p>
              </div>
            </header>

            <div class="flex items-center justify-between mb-1.5">
              <p class="text-ui-small font-medium text-ui-ink">Members</p>
              <UiBadge v-if="form.member_employee_ids.length" tone="accent" class="tabular-nums">
                <Users class="w-3.5 h-3.5" />
                {{ form.member_employee_ids.length }} selected
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
                  placeholder="Search employees..."
                />
              </div>
              <div class="p-1.5 max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-2">
                <label
                  v-for="employee in filteredMemberCandidates"
                  :key="employee.id"
                  class="flex items-center gap-2.5 text-ui-body text-ui-ink px-2.5 py-2 rounded-ui-control cursor-pointer hover:bg-ui-hover"
                  :class="{
                    'opacity-60 pointer-events-none':
                      togglingMemberId === employee.id,
                  }"
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
                  No staff data yet.
                </p>
                <p
                  v-else-if="filteredMemberCandidates.length === 0"
                  class="sm:col-span-2 text-ui-small text-ui-faint px-2.5 py-2"
                >
                  No employees match "{{ memberSearch }}".
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
                <h3 class="text-ui-h2 text-ui-ink">Team Responsibilities</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">Define the key responsibilities and duties for this team</p>
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
                  :label="`Responsibility ${index}`"
                  :error="error?.responsibilities?.[index - 1]?.join(', ')"
                  :required="true"
                  :icon="CheckCircle"
                  placeholder="e.g., Develop and maintain software applications"
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
                      :label="`Responsibility ${index + 1}`"
                      :error="error?.responsibilities?.[index]?.join(', ')"
                      :required="true"
                      :icon="CheckCircle"
                      placeholder="Enter additional responsibility"
                      class="flex-1"
                    />
                    <button
                      type="button"
                      aria-label="Remove responsibility"
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
              Add Another Responsibility
            </button>
          </section>

          <!-- Team Settings Section -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line flex items-center justify-center text-ui-muted">
                <Settings class="w-4 h-4" />
              </span>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">Team Settings</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">Configure team status</p>
              </div>
            </header>

            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">Initial Team Status</p>
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
                    {{ form.status === option.value ? "Selected" : "Select" }}
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
              Cancel
            </UiButton>
            <!-- Update Team -->
            <UiButton
              type="submit"
              size="lg"
              class="w-full sm:w-auto"
              :loading="loading"
              :icon-right="Check"
            >
              Update Team
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
      title="Select Team Lead"
      description="Choose an employee to lead this team"
    >
      <!-- Search Bar -->
      <UiInput
        id="leadSearch"
        :icon="Search"
        placeholder="Search employees..."
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
        title="No employees found"
        message="Try adjusting your search terms"
      />
    </UiModal>
  </div>
</template>
