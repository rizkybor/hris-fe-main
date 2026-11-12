<script setup lang="ts">
import { UiInput, UiSelect, UiModal } from "@/components/ui";
import {
  User,
  Hash,
  Building2,
  Briefcase,
  UserCheck,
  Clock,
  CalendarPlus,
  DollarSign,
  PlayCircle,
  Zap,
  Award,
  Crown,
  CreditCard,
  Wallet,
  MapPin,
  Calendar,
  X,
  ChevronDown,
  Search,
  SearchX,
  Users,
} from "lucide-vue-next";
import { ref, computed, onMounted, watch, h } from "vue";
import { useLookupStore } from "@/stores/lookups";
import { loadWizardLookups } from "@/components/admin/employee/create/wizardLookups";
import { getRoleLabel } from "@/utils/badgeUtils";
import RightSidebarStep2 from "@/components/admin/employee/create/RightSidebarStep2.vue";
import { useI18n } from "vue-i18n";

const { t, te } = useI18n();

interface Props {
  modelValue: any;
  errors?: any;
}

const props = defineProps<Props>();
const emit = defineEmits(["update:modelValue"]);

const form = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Teams, roles and option lists come from the shared lookups cache (the
// wizard loads them once in parallel when it opens; see wizardLookups.js).
// System roles are manager-configurable via Settings > Roles & Permissions.
const lookups = useLookupStore();
const teams = computed<any[]>(() => lookups.teams);
const systemRoles = computed<any[]>(() => lookups.roles);
const employmentTypes = computed(() => lookups.systemOptionsFor("employment-types"));
const jobStatuses = computed(() => lookups.systemOptionsFor("job-statuses"));
const workLocations = computed(() => lookups.systemOptionsFor("work-locations"));
const ptkpStatuses = computed(() => lookups.systemOptionsFor("ptkp-statuses"));
const bankNames = computed(() => lookups.systemOptionsFor("bank-names"));
const roleOptions = computed(() =>
  systemRoles.value
    // Super Admin is a single, fixed system account (seeded directly) --
    // it's never something assignable to a regular employee from here.
    .filter((role) => role.name !== "superadmin")
    .map((role) => ({
      value: role.name,
      label: getRoleLabel(role.name),
    }))
);

// Team modal
const teamModal = ref(false);
const searchTeam = ref("");
const selectedTeam = ref<any>(null);

const filteredTeams = computed(() => {
  if (!searchTeam.value) return teams.value;
  return teams.value.filter((team) =>
    team.name.toLowerCase().includes(searchTeam.value.toLowerCase())
  );
});

const handleSelectTeam = (team: any) => {
  selectedTeam.value = team;
  form.value.team_id = team.id;
  teamModal.value = false;
};

const handleRemoveTeam = () => {
  selectedTeam.value = null;
  form.value.team_id = "";
};

onMounted(() => {
  loadWizardLookups(); // no request when the wizard already loaded them
  if (form.value.monthly_salary) {
    form.value.monthly_salary = formatRupiah(form.value.monthly_salary);
  }
});

const formatRupiah = (value: any) => {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  const formatted = new Intl.NumberFormat("id-ID").format(parseInt(digits));
  return `${formatted}`;
};

const formattingSalary = ref(false);
watch(
  () => form.value.monthly_salary,
  (val) => {
    if (formattingSalary.value) return;
    const formatted = formatRupiah(val);
    if (formatted !== val) {
      formattingSalary.value = true;
      form.value.monthly_salary = formatted;
      formattingSalary.value = false;
    }
  }
);

// ---- Presentation-only helpers (redesign) ----
// "Rp" prefix in the leading-icon slot of the salary field.
const RpPrefix = () => h("span", { class: "text-ui-cap font-medium leading-4 text-ui-muted" }, "Rp");
// Optional selects keep a blank, re-selectable first option.
const withBlank = (placeholder: string, options: any[]) => [
  { value: "", label: placeholder },
  ...(options || []),
];
// Known option values get a translated label; anything else keeps the API label.
const translateOptions = (group: string, options: any[]) =>
  (options || []).map((o: any) => {
    const key = `employees.enums.${group}.${o.value}`;
    return te(key) ? { ...o, label: t(key) } : o;
  });
const jobStatusOptions = computed(() => translateOptions("jobStatus", jobStatuses.value));
const employmentTypeOptions = computed(() => translateOptions("employmentType", employmentTypes.value));
const workLocationOptions = computed(() => translateOptions("workLocation", workLocations.value));
const accountTypeOptions = computed(() =>
  ["savings", "checking", "current"].map((value) => ({ value, label: t(`employees.enums.accountType.${value}`) }))
);
const skillOptions = computed(() =>
  [
    { value: "beginner", icon: PlayCircle },
    { value: "intermediate", icon: Zap },
    { value: "advanced", icon: Award },
    { value: "expert", icon: Crown },
  ].map((o) => ({ ...o, label: t(`employees.enums.skillLevel.${o.value}`) }))
);
// Show the picked team; when editing, fall back to the team matching team_id.
const displayTeam = computed(
  () =>
    selectedTeam.value ||
    (form.value.team_id
      ? teams.value.find((t: any) => String(t.id) === String(form.value.team_id)) || null
      : null)
);
</script>

<template>
  <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
    <div class="min-w-0 space-y-5 ui-stagger">
      <!-- Job Information Section -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
        <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
          <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
            <Briefcase class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.form.job.title") }}</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.form.job.subtitle") }}</p>
          </div>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <UiInput
            id="job_title"
            name="job_title"
            type="text"
            v-model="form.job_title"
            :label="$t('employees.form.fields.jobTitle')"
            :placeholder="$t('employees.form.fields.jobTitlePlaceholder')"
            :icon="Briefcase"
            :error="errors?.job_title?.join(', ')"
            required
          />

          <!-- Role -->
          <UiSelect
            id="role"
            v-model="form.role"
            :label="$t('employees.form.fields.role')"
            :placeholder="$t('employees.form.fields.rolePlaceholder')"
            :options="roleOptions"
            :error="errors?.role?.join(', ')"
            required
          />

          <!-- Team -->
          <div class="min-w-0">
            <label for="team_picker" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("employees.form.fields.team") }}</label>
            <button
              id="team_picker"
              type="button"
              @click="teamModal = true"
              class="relative w-full h-[38px] pl-9 pr-9 text-left bg-ui-surface border border-ui-line-strong rounded-ui-control text-ui-body transition-shadow hover:bg-ui-subtle focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            >
              <Building2 class="absolute left-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
              <span class="block truncate" :class="displayTeam ? 'text-ui-ink' : 'text-ui-faint'">
                {{ displayTeam ? displayTeam.name : $t("employees.form.fields.teamPlaceholder") }}
              </span>
              <ChevronDown class="absolute right-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
            </button>

            <!-- Selected Team Display -->
            <div
              v-if="displayTeam"
              class="mt-2 flex items-center gap-3 p-2.5 bg-ui-subtle border border-ui-line rounded-ui-control"
            >
              <span class="w-8 h-8 shrink-0 rounded-ui-control bg-ui-surface border border-ui-line text-ui-text flex items-center justify-center">
                <Building2 class="w-4 h-4" />
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-small font-medium text-ui-ink truncate">{{ displayTeam.name }}</p>
                <p class="text-ui-cap text-ui-muted">{{ $t("employees.form.membersCount", { n: displayTeam.members_count || 0 }, displayTeam.members_count || 0) }}</p>
              </div>
              <button
                type="button"
                @click="handleRemoveTeam"
                class="w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
                :aria-label="$t('employees.form.fields.removeTeam')"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <UiInput
            id="years_experience"
            name="years_experience"
            type="number"
            v-model="form.years_experience"
            :label="$t('employees.form.fields.yearsExperience')"
            :placeholder="$t('employees.form.fields.yearsExperiencePlaceholder')"
            :icon="Calendar"
            :error="errors?.years_experience?.join(', ')"
            required
          />
          <UiSelect
            id="status"
            v-model="form.status"
            :label="$t('employees.form.fields.status')"
            :placeholder="$t('employees.form.fields.statusPlaceholder')"
            :options="jobStatusOptions"
            :error="errors?.status?.join(', ')"
            required
          />
          <UiSelect
            id="employment_type"
            v-model="form.employment_type"
            :label="$t('employees.form.fields.employmentType')"
            :placeholder="$t('employees.form.fields.employmentTypePlaceholder')"
            :options="employmentTypeOptions"
            :error="errors?.employment_type?.join(', ')"
            required
          />
          <UiSelect
            id="work_location"
            v-model="form.work_location"
            :label="$t('employees.form.fields.workLocation')"
            :placeholder="$t('employees.form.fields.workLocationPlaceholder')"
            :options="workLocationOptions"
            :error="errors?.work_location?.join(', ')"
            required
          />
          <UiInput
            id="start_date"
            name="start_date"
            type="date"
            v-model="form.start_date"
            :label="$t('employees.form.fields.startDate')"
            :icon="CalendarPlus"
            :error="errors?.start_date?.join(', ')"
            required
          />
          <UiInput
            id="monthly_salary"
            name="monthly_salary"
            type="text"
            v-model="form.monthly_salary"
            :label="$t('employees.form.fields.monthlySalary')"
            placeholder="Rp 5.000.000"
            :icon="RpPrefix"
            :error="errors?.monthly_salary?.join(', ')"
          />
          <UiSelect
            id="ptkp_status"
            v-model="form.ptkp_status"
            :label="$t('employees.form.fields.ptkpStatus')"
            :options="withBlank($t('employees.form.fields.ptkpStatusPlaceholder'), ptkpStatuses)"
            :error="errors?.ptkp_status?.join(', ')"
          />
          <UiInput
            id="annual_leave_quota"
            name="annual_leave_quota"
            type="number"
            v-model="form.annual_leave_quota"
            :label="$t('employees.form.fields.annualLeaveQuota')"
            placeholder="12"
            :icon="Calendar"
          />
          <UiInput
            id="probation_end_date"
            name="probation_end_date"
            type="date"
            v-model="form.probation_end_date"
            :label="$t('employees.form.fields.probationEndDate')"
            :icon="CalendarPlus"
          />
          <UiInput
            id="contract_end_date"
            name="contract_end_date"
            type="date"
            v-model="form.contract_end_date"
            :label="$t('employees.form.fields.contractEndDate')"
            :icon="CalendarPlus"
          />

          <!-- Skill Level (Full Width) -->
          <fieldset class="md:col-span-2 min-w-0">
            <legend class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("employees.form.fields.skillLevel") }}<span class="text-ui-bad"> *</span></legend>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                v-for="opt in skillOptions"
                :key="opt.value"
                class="group relative flex items-center justify-between gap-3 w-full min-h-[56px] rounded-ui-card bg-ui-surface border border-ui-line-strong px-3.5 py-3 cursor-pointer transition-colors duration-ui-base hover:bg-ui-subtle has-[:checked]:border-ui-accent has-[:checked]:bg-ui-accent-soft/40 has-[:focus-visible]:shadow-ui-focus"
              >
                <span class="flex items-center gap-3">
                  <span class="w-8 h-8 rounded-ui-control bg-ui-subtle text-ui-text flex items-center justify-center">
                    <component :is="opt.icon" class="w-4 h-4" />
                  </span>
                  <span class="text-ui-body font-medium text-ui-ink">{{ opt.label }}</span>
                </span>
                <span class="flex items-center gap-1.5 h-7 shrink-0 rounded-full border border-ui-line px-2.5 bg-ui-surface">
                  <input
                    type="radio"
                    name="skill_level"
                    :value="opt.value"
                    class="sr-only"
                    v-model="form.skill_level"
                  />
                  <span
                    class="flex size-4 rounded-full border border-ui-line-strong group-has-[:checked]:border-[5px] group-has-[:checked]:border-ui-accent transition-all duration-ui-base"
                  ></span>
                  <span class="text-ui-cap font-medium text-ui-muted group-has-[:checked]:text-ui-accent">
                    {{ form.skill_level === opt.value ? $t("employees.form.selected") : $t("employees.form.select") }}
                  </span>
                </span>
              </label>
            </div>
            <p v-if="errors?.skill_level" class="text-ui-cap text-ui-bad mt-1.5">{{ errors?.skill_level?.join(', ') }}</p>
          </fieldset>
        </div>
      </section>

      <!-- Bank Information Section -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
        <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
          <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
            <CreditCard class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.form.bank.title") }}</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.form.bank.subtitle") }}</p>
          </div>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <UiSelect
            id="bank_name"
            v-model="form.bank_name"
            :label="$t('employees.form.fields.bankName')"
            :options="withBlank($t('employees.form.fields.bankNamePlaceholder'), bankNames)"
            :error="errors?.bank_name?.join(', ')"
          />
          <UiInput
            id="account_number"
            name="account_number"
            type="text"
            v-model="form.account_number"
            :label="$t('employees.form.fields.accountNumber')"
            :placeholder="$t('employees.form.fields.accountNumberPlaceholder')"
            :icon="Hash"
            :error="errors?.account_number?.join(', ')"
            :hint="$t('employees.form.fields.accountNumberHint')"
          />
          <div class="md:col-span-2 min-w-0">
            <UiInput
            id="account_holder_name"
            name="account_holder_name"
            type="text"
            v-model="form.account_holder_name"
            :label="$t('employees.form.fields.accountHolder')"
            :placeholder="$t('employees.form.fields.accountHolderPlaceholder')"
            :icon="User"
            :error="errors?.account_holder_name?.join(', ')"
            :hint="$t('employees.form.fields.accountHolderHint')"
          />
          </div>
          <UiInput
            id="bank_branch"
            name="bank_branch"
            type="text"
            v-model="form.bank_branch"
            :label="$t('employees.form.fields.bankBranch')"
            :placeholder="$t('employees.form.fields.bankBranchPlaceholder')"
            :icon="MapPin"
            :error="errors?.bank_branch?.join(', ')"
          />
          <UiSelect
            id="account_type"
            v-model="form.account_type"
            :label="$t('employees.form.fields.accountType')"
            :options="withBlank($t('employees.form.fields.accountTypePlaceholder'), accountTypeOptions)"
            :error="errors?.account_type?.join(', ')"
          />
        </div>
      </section>
    </div>

    <!-- Right Sidebar Tips -->
    <RightSidebarStep2 />
  </div>

  <!-- Team Selection Modal -->
  <UiModal
    v-model:open="teamModal"
    :title="$t('employees.form.teamModal.title')"
    :description="$t('employees.form.teamModal.description')"
    size="lg"
  >
    <UiInput
      v-model="searchTeam"
      type="text"
      :placeholder="$t('employees.form.teamModal.search')"
      :icon="Search"
    />

    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
      <button
        v-for="team in filteredTeams"
        :key="team.id"
        type="button"
        @click="handleSelectTeam(team)"
        class="ui-lift flex items-center gap-3 p-3 text-left bg-ui-surface border rounded-ui-card hover:bg-ui-subtle focus:outline-none focus-visible:shadow-ui-focus"
        :class="String(form.team_id) === String(team.id) ? 'border-ui-accent' : 'border-ui-line'"
      >
        <span class="w-9 h-9 shrink-0 rounded-ui-control bg-ui-subtle text-ui-text flex items-center justify-center">
          <Building2 class="w-4 h-4" />
        </span>
        <span class="flex-1 min-w-0">
          <span class="block text-ui-small font-medium text-ui-ink truncate">{{ team.name }}</span>
          <span class="block text-ui-cap text-ui-muted">{{ $t("employees.form.membersCount", { n: team.members_count || 0 }, team.members_count || 0) }}</span>
        </span>
      </button>
    </div>

    <!-- No Results Message -->
    <div class="text-center py-8" v-if="filteredTeams.length === 0">
      <SearchX class="w-8 h-8 text-ui-faint mx-auto mb-2" />
      <h4 class="text-ui-h3 text-ui-ink">{{ $t("employees.form.teamModal.empty") }}</h4>
      <p class="text-ui-small text-ui-muted mt-0.5">{{ $t("employees.form.teamModal.emptyHint") }}</p>
    </div>
  </UiModal>
</template>
