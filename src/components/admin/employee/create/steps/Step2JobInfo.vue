<script setup lang="ts">
import { Input, Select } from "@/components/common/form";
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
import { ref, computed, onMounted, watch } from "vue";
import { useTeamStore } from "@/stores/team";
import { useOptionStore } from "@/stores/option";
import { useRoleStore } from "@/stores/role";
import { getRoleLabel } from "@/utils/badgeUtils";
import { storeToRefs } from "pinia";
import RightSidebarStep2 from "@/components/admin/employee/create/RightSidebarStep2.vue";

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

// Team store
const teamStore = useTeamStore();
const { teams } = storeToRefs(teamStore);

// Option store
const optionStore = useOptionStore();
const { employmentTypes, jobStatuses, workLocations, skillLevels, ptkpStatuses, bankNames } =
  storeToRefs(optionStore);

// Role store -- system roles are manager-configurable via Settings > Roles & Permissions
const roleStore = useRoleStore();
const { roles: systemRoles } = storeToRefs(roleStore);
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

onMounted(async () => {
  await teamStore.fetchTeams();
  await optionStore.fetchEmploymentTypes();
  await optionStore.fetchJobStatuses();
  await optionStore.fetchWorkLocations();
  await optionStore.fetchSkillLevels();
  await optionStore.fetchPtkpStatuses();
  await optionStore.fetchBankNames();
  await roleStore.fetchRoles();
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
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-4 items-start lg:pr-4">
    <div class="flex-1 w-full space-y-5">
      <!-- Job Information Section -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div
            class="w-9 h-9 bg-green-50 rounded-[12px] flex items-center justify-center"
          >
            <Briefcase class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base font-bold">Job Information</h3>
            <p class="text-brand-light text-sm font-normal">
              Role, department, and employment details
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="mb-3.5">
            <Input
              id="job_title"
              name="job_title"
              type="text"
              v-model="form.job_title"
              label="Job Title"
              placeholder="e.g. Senior Developer"
              :error="errors?.job_title?.join(', ')"
              required
            >
              <template #icon>
                <Briefcase class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <!-- Role -->
          <div class="mb-3.5">
            <Select
              id="role"
              name="role"
              v-model="form.role"
              label="Role"
              placeholder="Select role"
              :options="roleOptions"
              :error="errors?.role?.join(', ')"
              required
            >
              <template #icon>
                <Crown class="h-5 w-5 text-gray-400" />
              </template>
            </Select>
          </div>

          <!-- Team -->
          <div class="mb-3.5">
            <label class="block text-brand-dark text-sm font-semibold mb-1"
              >Team</label
            >
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
              >
                <Building2 class="h-5 w-5 text-gray-400" />
              </div>
              <div
                @click="teamModal = true"
                class="w-full pl-12 pr-8 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 cursor-pointer bg-white"
              >
                <span
                  :class="[selectedTeam ? 'text-brand-dark' : 'text-gray-500']"
                >
                  {{ selectedTeam ? selectedTeam.name : "Select team" }}
                </span>
              </div>
              <div
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none"
              >
                <ChevronDown class="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <!-- Selected Team Display -->
            <div
              v-if="selectedTeam"
              class="mt-2.5 p-2.5 bg-gray-50 rounded-[12px] border border-gray-200"
            >
              <div class="flex items-center gap-2.5">
                <div
                  class="w-10 h-10 relative flex items-center justify-center rounded-[8px] overflow-hidden"
                >
                  <div
                    class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-[8px]"
                  ></div>
                  <Building2 class="w-5 h-5 text-white relative z-10" />
                </div>
                <div class="flex-1">
                  <p class="text-brand-dark text-sm font-semibold">
                    {{ selectedTeam.name }}
                  </p>
                  <p class="text-brand-light text-xs font-normal">
                    {{ selectedTeam.members_count || 0 }} members
                  </p>
                </div>
                <button
                  type="button"
                  @click="handleRemoveTeam"
                  class="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="mb-3.5">
            <Input
              id="years_experience"
              name="years_experience"
              type="number"
              v-model="form.years_experience"
              label="Years of Experience"
              placeholder="e.g. 3"
              :error="errors?.years_experience?.join(', ')"
              required
            >
              <template #icon>
                <Calendar class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Select
              id="status"
              name="status"
              v-model="form.status"
              label="Status"
              placeholder="Select status"
              :options="jobStatuses"
              :error="errors?.status?.join(', ')"
              required
            >
              <template #icon>
                <UserCheck class="h-5 w-5 text-gray-400" />
              </template>
            </Select>
          </div>

          <div class="mb-3.5">
            <Select
              id="employment_type"
              name="employment_type"
              v-model="form.employment_type"
              label="Employment Type"
              placeholder="Select employment type"
              :options="employmentTypes"
              :error="errors?.employment_type?.join(', ')"
              required
            >
              <template #icon>
                <Clock class="h-5 w-5 text-gray-400" />
              </template>
            </Select>
          </div>

          <div class="mb-3.5">
            <Select
              id="work_location"
              name="work_location"
              v-model="form.work_location"
              label="Work Location"
              placeholder="Select work location"
              :options="workLocations"
              :error="errors?.work_location?.join(', ')"
              required
            >
              <template #icon>
                <MapPin class="h-5 w-5 text-gray-400" />
              </template>
            </Select>
          </div>

          <div class="mb-3.5">
            <Input
              id="start_date"
              name="start_date"
              type="date"
              v-model="form.start_date"
              label="Start Date"
              :error="errors?.start_date?.join(', ')"
              required
            >
              <template #icon>
                <CalendarPlus class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="monthly_salary"
              name="monthly_salary"
              type="text"
              v-model="form.monthly_salary"
              label="Monthly Salary (optional)"
              placeholder="Rp 5.000.000"
              :error="errors?.monthly_salary?.join(', ')"
            >
              <template #icon> Rp </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Select
              id="ptkp_status"
              name="ptkp_status"
              v-model="form.ptkp_status"
              label="PTKP Status (for PPh21 Tax)"
              placeholder="Select PTKP status"
              :options="ptkpStatuses"
              :error="errors?.ptkp_status?.join(', ')"
            >
              <template #icon>
                <DollarSign class="h-5 w-5 text-gray-400" />
              </template>
            </Select>
          </div>

          <div class="mb-3.5">
            <Input
              id="annual_leave_quota"
              name="annual_leave_quota"
              type="number"
              v-model="form.annual_leave_quota"
              label="Annual Leave Quota (days)"
              placeholder="12"
            >
              <template #icon>
                <Calendar class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="probation_end_date"
              name="probation_end_date"
              type="date"
              v-model="form.probation_end_date"
              label="Probation End Date (optional)"
            >
              <template #icon>
                <CalendarPlus class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="contract_end_date"
              name="contract_end_date"
              type="date"
              v-model="form.contract_end_date"
              label="Contract End Date (optional)"
            >
              <template #icon>
                <CalendarPlus class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <!-- Skill Level (Full Width) -->
          <div class="md:col-span-2 mb-3.5">
            <label class="block text-brand-dark text-sm font-semibold mb-1"
              >Skill Level<span class="text-red-600 ml-1">*</span></label
            >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <!-- Beginner Option -->
              <label
                class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
              >
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-10 h-10 bg-green-50 rounded-[12px] flex items-center justify-center"
                  >
                    <PlayCircle class="w-5 h-5 text-green-600" />
                  </div>
                  <div class="flex flex-col">
                    <p class="text-brand-dark text-sm font-semibold">
                      Beginner
                    </p>
                  </div>
                </div>
                <div
                  class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                >
                  <input
                    type="radio"
                    name="skill_level"
                    value="beginner"
                    class="hidden"
                    v-model="form.skill_level"
                  />
                  <div
                    class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                  ></div>
                  <p
                    class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                  ></p>
                </div>
              </label>

              <!-- Intermediate Option -->
              <label
                class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
              >
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-10 h-10 bg-yellow-50 rounded-[12px] flex items-center justify-center"
                  >
                    <Zap class="w-5 h-5 text-yellow-600" />
                  </div>
                  <div class="flex flex-col">
                    <p class="text-brand-dark text-sm font-semibold">
                      Intermediate
                    </p>
                  </div>
                </div>
                <div
                  class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                >
                  <input
                    type="radio"
                    name="skill_level"
                    value="intermediate"
                    class="hidden"
                    v-model="form.skill_level"
                  />
                  <div
                    class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                  ></div>
                  <p
                    class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                  ></p>
                </div>
              </label>

              <!-- Advanced Option -->
              <label
                class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
              >
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-10 h-10 bg-purple-50 rounded-[12px] flex items-center justify-center"
                  >
                    <Award class="w-5 h-5 text-purple-600" />
                  </div>
                  <div class="flex flex-col">
                    <p class="text-brand-dark text-sm font-semibold">
                      Advanced
                    </p>
                  </div>
                </div>
                <div
                  class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                >
                  <input
                    type="radio"
                    name="skill_level"
                    value="advanced"
                    class="hidden"
                    v-model="form.skill_level"
                  />
                  <div
                    class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                  ></div>
                  <p
                    class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                  ></p>
                </div>
              </label>

              <!-- Expert Option -->
              <label
                class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
              >
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-10 h-10 bg-red-50 rounded-[12px] flex items-center justify-center"
                  >
                    <Crown class="w-5 h-5 text-red-600" />
                  </div>
                  <div class="flex flex-col">
                    <p class="text-brand-dark text-sm font-semibold">
                      Expert
                    </p>
                  </div>
                </div>
                <div
                  class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                >
                  <input
                    type="radio"
                    name="skill_level"
                    value="expert"
                    class="hidden"
                    v-model="form.skill_level"
                  />
                  <div
                    class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                  ></div>
                  <p
                    class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                  ></p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Bank Information Section -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div
            class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center"
          >
            <CreditCard class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base font-bold">Bank Information</h3>
            <p class="text-brand-light text-sm font-normal">
              Optional -- employee banking details for payroll processing. Can be left blank for interns/students without a payroll account yet.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="mb-3.5">
            <Select
              id="bank_name"
              name="bank_name"
              v-model="form.bank_name"
              label="Bank Name (optional)"
              placeholder="Select bank"
              :options="bankNames"
              :error="errors?.bank_name?.join(', ')"
            >
              <template #icon>
                <Building2 class="h-5 w-5 text-gray-400" />
              </template>
            </Select>
          </div>

          <div class="mb-3.5">
            <Input
              id="account_number"
              name="account_number"
              type="text"
              v-model="form.account_number"
              label="Account Number (optional)"
              placeholder="e.g. 1234567890"
              :error="errors?.account_number?.join(', ')"
            >
              <template #icon>
                <Hash class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
            <p class="text-brand-light text-xs font-normal mt-1">
              Enter only numbers (8-20 digits)
            </p>
          </div>

          <div class="mb-3.5 md:col-span-2">
            <Input
              id="account_holder_name"
              name="account_holder_name"
              type="text"
              v-model="form.account_holder_name"
              label="Account Holder Name (optional)"
              placeholder="e.g. Andy Saputra"
              :error="errors?.account_holder_name?.join(', ')"
            >
              <template #icon>
                <User class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
            <p class="text-brand-light text-xs font-normal mt-1">
              Name should match the bank account holder exactly
            </p>
          </div>

          <div class="mb-3.5">
            <Input
              id="bank_branch"
              name="bank_branch"
              type="text"
              v-model="form.bank_branch"
              label="Bank Branch (optional)"
              placeholder="e.g. Jakarta Pusat"
              :error="errors?.bank_branch?.join(', ')"
            >
              <template #icon>
                <MapPin class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Select
              id="account_type"
              name="account_type"
              v-model="form.account_type"
              label="Account Type (optional)"
              placeholder="Select account type"
              :options="[
                { value: 'savings', label: 'Savings Account' },
                { value: 'checking', label: 'Checking Account' },
                { value: 'current', label: 'Current Account' },
              ]"
              :error="errors?.account_type?.join(', ')"
            >
              <template #icon>
                <Wallet class="h-5 w-5 text-gray-400" />
              </template>
            </Select>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Sidebar Tips -->
    <RightSidebarStep2 />
  </div>

  <!-- Team Selection Modal -->
  <div
    class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
    v-if="teamModal"
    @click="teamModal = false"
  >
    <div
      @click.stop
      class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-4xl mx-3.5 max-h-[80vh] overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="p-5 border-b border-[#DCDEDD]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div
              class="w-9 h-9 bg-green-50 rounded-[12px] flex items-center justify-center"
            >
              <Users class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-base font-bold">Select Team</h3>
              <p class="text-brand-light text-sm font-normal">
                Choose the team for this employee
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="teamModal = false"
            class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150"
          >
            <X class="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="p-5 border-b border-[#DCDEDD]">
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
          >
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
            placeholder="Search teams..."
            v-model="searchTeam"
          />
        </div>
      </div>

      <!-- Teams List -->
      <div class="p-5 overflow-y-auto max-h-96">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div
            class="border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-3.5 cursor-pointer"
            v-for="team in filteredTeams"
            :key="team.id"
            @click="handleSelectTeam(team)"
          >
            <div class="flex items-center gap-3.5">
              <div
                class="w-10 h-10 relative flex items-center justify-center rounded-[12px] overflow-hidden"
              >
                <div
                  class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-[12px]"
                ></div>
                <Building2 class="w-6 h-6 text-white relative z-10" />
              </div>
              <div class="flex-1">
                <h4 class="text-brand-dark text-sm font-bold">
                  {{ team.name }}
                </h4>
                <p class="text-brand-light text-sm font-normal">
                  {{ team.members_count || 0 }} members
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- No Results Message -->
        <div class="text-center py-6" v-if="filteredTeams.length === 0">
          <SearchX class="w-9 h-9 text-gray-400 mx-auto mb-2.5" />
          <h4 class="text-brand-dark text-sm font-semibold mb-1">
            No teams found
          </h4>
          <p class="text-brand-light text-sm">
            Try adjusting your search terms
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
