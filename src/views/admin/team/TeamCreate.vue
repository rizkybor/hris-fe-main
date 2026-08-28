<script setup>
import { Input, Select, TextArea } from "@/components/common/form";
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
  Users2,
} from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { debounce } from "lodash-es";
import { useTeamStore } from "@/stores/team";
import { useOptionStore } from "@/stores/option";
import { useEmployeeStore } from "@/stores/employee";
import { storeToRefs } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import router from "@/router";

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
  return memberCandidates.value.filter((employee) => employee.id !== leadEmployeeId);
});
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
  { deep: true }
);
</script>

<template>
  <div class="px-4 py-4">
    <!-- Header -->
    <div class="bg-white mb-5">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Users2 class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-brand-dark text-base font-bold">Create New Team</h1>
          <p class="text-brand-light text-sm">Set up a new team and assign a leader</p>
        </div>
      </div>
    </div>

    <div class="mb-5" v-if="typeof error === 'string'">
      <Transition name="fade">
        <Alert type="danger" :title="error" message="" :show="true" />
      </Transition>
    </div>

    <div class="flex flex-col lg:flex-row gap-3.5 sm:gap-4 items-start">
    <!-- Form Section -->
    <div class="flex-1">
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <!-- Team Information Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
          <div class="flex items-center gap-2.5 mb-5">
            <div
              class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center"
            >
              <User class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-base font-bold">
                Team Information
              </h3>
              <p class="text-brand-light text-sm font-normal">
                Basic team details and description
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            <!-- Team Icon -->
            <div class="md:col-span-2">
              <label class="block text-brand-dark text-sm font-semibold mb-1"
                >Team Icon</label
              >
              <div class="flex flex-col sm:flex-row items-center gap-3.5">
                <div class="w-16 h-16 sm:w-20 sm:h-20">
                  <!-- Icon Container with Blue Gradient Background -->
                  <div class="relative w-16 h-16 sm:w-20 sm:h-20">
                    <!-- Blue gradient background -->
                    <div
                      class="w-16 h-16 sm:w-20 sm:h-20 absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-full"
                    ></div>

                    <!-- Icon Display (uploaded or default) -->
                    <div
                      id="teamIconDisplay"
                      class="w-16 h-16 sm:w-20 sm:h-20 relative z-10 flex items-center justify-center"
                    >
                      <img
                        id="uploadedTeamIcon"
                        :src="form.icon_url"
                        alt="Team Icon"
                        class="w-7 h-7 sm:w-9 sm:h-9 object-contain"
                        v-if="form.icon_url"
                      />
                      <Users2
                        v-else
                        class="w-8 h-8 sm:w-10 sm:h-10 text-white/90"
                      />
                    </div>

                    <!-- Upload overlay (shown on hover) -->
                    <div
                      class="absolute inset-0 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer z-20 group"
                    >
                      <div
                        class="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 rounded-full transition-opacity duration-300"
                      ></div>
                      <Upload
                        class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 relative z-10"
                        @click="teamIconInput.click()"
                      />
                    </div>
                  </div>
                </div>
                <div class="flex flex-col gap-1.5">
                  <input
                    type="file"
                    id="teamIconInput"
                    accept="image/*,.svg"
                    class="hidden"
                    ref="teamIconInput"
                    @change="handleTeamIconSelect"
                  />
                  <button
                    type="button"
                    class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer w-full sm:w-auto"
                    @click="teamIconInput.click()"
                  >
                    <Upload class="w-4 h-4 text-gray-600" />
                    <span class="text-brand-dark text-sm font-semibold"
                      >Upload Icon</span
                    >
                  </button>
                  <button
                    type="button"
                    v-if="form.icon_url"
                    @click="handleRemoveIcon"
                    class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer w-full sm:w-auto"
                  >
                    <X class="w-4 h-4 text-gray-600" />
                    <span class="text-brand-dark text-sm font-semibold"
                      >Remove Icon</span
                    >
                  </button>
                  <p class="text-brand-light text-xs">
                    SVG, PNG up to 1MB (recommended: icon format)
                  </p>
                </div>
              </div>
            </div>

            <!-- Team Name -->
            <div class="md:col-span-2 mb-3.5">
              <Input
                id="name"
                name="name"
                type="name"
                v-model="form.name"
                label="Name *"
                placeholder="Enter team name "
                :error="error?.name?.join(', ')"
              >
                <template #icon>
                  <Users class="h-5 w-5 text-gray-400" />
                </template>
              </Input>
            </div>

            <!-- Team Type -->
            <div class="mb-3.5">
              <Select
                id="department"
                name="department"
                v-model="form.department"
                label="Department *"
                placeholder="Select department"
                :options="departments"
                :error="error?.department?.join(', ')"
              >
                <template #icon>
                  <Tag class="h-5 w-5 text-gray-400" />
                </template>
              </Select>
            </div>

            <!-- Team Size -->
            <div class="mb-3.5">
              <Input
                id="expected_size"
                name="expected_size"
                type="number"
                v-model="form.expected_size"
                label="Expected Team Size"
                placeholder="Enter expected team size"
                :error="error?.expected_size?.join(', ')"
              >
                <template #icon>
                  <UserPlus class="h-5 w-5 text-gray-400" />
                </template>
              </Input>
            </div>

            <!-- Team Description -->
            <div class="md:col-span-2">
              <TextArea
                id="teamPurpose"
                name="team_purpose"
                v-model="form.description"
                label="Team Purpose"
                placeholder="Describe the team's purpose and goals..."
                :error="error?.description?.join(', ')"
              >
                <template #icon>
                  <FileText class="h-5 w-5 text-gray-400" />
                </template>
              </TextArea>
            </div>
          </div>
        </div>

        <!-- Team Lead Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
          <div class="flex items-center gap-2.5 mb-5">
            <div
              class="w-9 h-9 bg-green-50 rounded-[12px] flex items-center justify-center"
            >
              <Crown class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-base font-bold">Team Lead</h3>
              <p class="text-brand-light text-sm font-normal">
                Assign a team leader to manage this team
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            <!-- Team Lead Selection -->
            <div class="md:col-span-2">
              <label class="block text-brand-dark text-sm font-semibold mb-1"
                >Select Team Lead</label
              >
              <button
                type="button"
                class="w-full border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3.5 py-2.5 flex items-center gap-2.5 text-left"
                @click="leadModal = true"
              >
                <UserCheck class="w-5 h-5 text-gray-400" />
                <span class="text-[#0D2929] font-normal flex-1">
                  {{ selectedLead?.user?.name || "Select team lead" }}
                </span>
                <ChevronDown class="w-4 h-4 text-gray-400" />
              </button>

              <div
                class="mt-2.5 p-3.5 bg-gray-50 rounded-[12px] border border-[#DCDEDD]"
                v-if="selectedLead"
              >
                <div class="flex items-center gap-2.5">
                  <Avatar
                    :src="selectedLead?.user?.profile_photo"
                    :alt="selectedLead?.user?.name"
                    size="w-9 h-9"
                    icon-size="w-5 h-5"
                  />
                  <div class="flex-1">
                    <h4 class="text-brand-dark text-sm font-semibold">
                      {{ selectedLead?.user?.name }}
                    </h4>
                    <p class="text-brand-light text-sm">
                      {{ selectedLead?.job_information?.job_title }}
                    </p>
                  </div>
                  <button
                    type="button"
                    @click="handleRemoveLead"
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Team Members Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
          <div class="flex items-center gap-2.5 mb-5">
            <div
              class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center"
            >
              <Users class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-base font-bold">Team Members</h3>
              <p class="text-brand-light text-sm font-normal">
                Pick employees who will be part of this team
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between mb-1">
            <label class="text-sm font-semibold text-brand-dark block">Members</label>
            <span v-if="form.member_employee_ids.length" class="text-xs text-[#0C51D9] font-semibold flex items-center gap-1">
              <Users class="w-3.5 h-3.5" />
              {{ form.member_employee_ids.length }} selected
            </span>
          </div>
          <div class="border border-[#DCDEDD] rounded-xl overflow-hidden">
            <div v-if="selectableMemberCandidates.length > 8" class="relative border-b border-[#DCDEDD] bg-gray-50 p-1.5">
              <Search class="w-3.5 h-3.5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                v-model="memberSearch"
                type="text"
                placeholder="Search employees..."
                class="w-full pl-6 pr-1.5 py-1 border border-[#DCDEDD] rounded-lg text-xs bg-white focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
              />
            </div>
            <div class="p-2.5 max-h-64 overflow-y-auto space-y-1">
              <label
                v-for="employee in filteredMemberCandidates"
                :key="employee.id"
                class="flex items-center gap-1.5 text-sm px-1.5 py-1 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  :checked="form.member_employee_ids.includes(employee.id)"
                  @change="toggleMember(employee.id)"
                  class="rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9] shrink-0"
                />
                <span class="truncate">{{ employee.user?.name }}</span>
              </label>
              <p v-if="selectableMemberCandidates.length === 0" class="text-sm text-gray-400 italic py-1.5">No staff data yet.</p>
              <p v-else-if="filteredMemberCandidates.length === 0" class="text-sm text-gray-400 italic py-1.5">No employees match "{{ memberSearch }}".</p>
            </div>
          </div>
        </div>

        <!-- Team Responsibilities Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
          <div class="flex items-center gap-2.5 mb-5">
            <div
              class="w-9 h-9 bg-orange-50 rounded-[12px] flex items-center justify-center"
            >
              <ListCheck class="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-base font-bold">
                Team Responsibilities
              </h3>
              <p class="text-brand-light text-sm font-normal">
                Define the key responsibilities and duties for this team
              </p>
            </div>
          </div>

          <div class="space-y-3.5" id="responsibilitiesContainer">
            <div
              class="responsibility-item"
              v-for="index in 3"
              :key="`responsibility-${index - 1}`"
            >
              <Input
                :id="`responsibility_${index - 1}`"
                :name="`responsibility_${index - 1}`"
                type="text"
                v-model="form.responsibilities[index - 1]"
                :label="`Responsibility ${index} *`"
                :error="error?.responsibilities?.[index - 1]?.join(', ')"
                :required="true"
                placeholder="e.g., Develop and maintain software applications"
              >
                <template #icon>
                  <CheckCircle class="h-5 w-5 text-gray-400" />
                </template>
              </Input>
            </div>
          </div>

          <div id="dynamicResponsibilitiesContainer">
            <template
              v-for="(responsibility, index) in form.responsibilities"
              :key="`responsibility-${index}`"
            >
              <div
                v-if="index >= 3"
                class="responsibility-item mt-3.5"
                :id="`responsibility_field_${index + 1}`"
              >
                <label
                  class="block mb-1.5 text-gray-700 font-semibold font-jakarta text-[14px]"
                >
                  Responsibility {{ index + 1 }}
                </label>
                <div class="flex flex-col sm:flex-row sm:items-start gap-2.5 justify-center">
                  <Input
                    :id="`responsibility_${index}`"
                    :name="`responsibility_${index}`"
                    type="text"
                    v-model="form.responsibilities[index]"
                    :error="error?.responsibilities?.[index]?.join(', ')"
                    :required="true"
                    placeholder="Enter additional responsibility"
                    class="flex-1"
                  >
                    <template #icon>
                      <CheckCircle class="h-5 w-5 text-gray-400" />
                    </template>
                  </Input>
                  <button
                    type="button"
                    class="w-9 h-9 border border-[#DCDEDD] rounded-[12px] hover:border-red-500 hover:bg-red-50 transition-all duration-300 flex items-center justify-center mt-6 cursor-pointer"
                    @click="removeResponsibility(index)"
                  >
                    <Trash2 class="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- Add New Responsibility -->
          <div class="mt-3.5">
            <button
              type="button"
              class="w-full border-2 border-dashed border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300 px-3.5 py-2.5 flex items-center gap-2.5 text-left cursor-pointer"
              @click="addNewResponsibility()"
            >
              <PlusCircle class="w-5 h-5 text-gray-400" />
              <span class="text-brand-dark text-sm font-medium"
                >Add Another Responsibility</span
              >
            </button>
          </div>
        </div>

        <!-- Team Settings Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
          <div class="flex items-center gap-2.5 mb-5">
            <div
              class="w-9 h-9 bg-purple-50 rounded-[12px] flex items-center justify-center"
            >
              <Settings class="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-base font-bold">Team Settings</h3>
              <p class="text-brand-light text-sm font-normal">
                Configure team status
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Initial Team Status (Full Width) -->
            <div class="md:col-span-2 mb-3.5">
              <label class="block text-brand-dark text-sm font-semibold mb-1"
                >Initial Team Status</label
              >
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <!-- Active Option -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-10 h-10 bg-green-50 rounded-[12px] flex items-center justify-center"
                    >
                      <CheckCircle class="w-5 h-5 text-green-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-sm font-semibold">
                        Active
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                  >
                    <input
                      type="radio"
                      name="team_status"
                      value="active"
                      class="hidden"
                      v-model="form.status"
                    />
                    <div
                      class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                    ></div>
                    <p
                      class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                    ></p>
                  </div>
                </label>
                <!-- Forming Option -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-10 h-10 bg-blue-50 rounded-[12px] flex items-center justify-center"
                    >
                      <UsersRound class="w-5 h-5 text-blue-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-sm font-semibold">
                        Forming
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                  >
                    <input
                      type="radio"
                      name="team_status"
                      value="forming"
                      class="hidden"
                      v-model="form.status"
                    />
                    <div
                      class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                    ></div>
                    <p
                      class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                    ></p>
                  </div>
                </label>
                <!-- Planning Option -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-10 h-10 bg-purple-50 rounded-[12px] flex items-center justify-center"
                    >
                      <ClipboardList class="w-5 h-5 text-purple-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-sm font-semibold">
                        Planning
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                  >
                    <input
                      type="radio"
                      name="team_status"
                      value="planning"
                      class="hidden"
                      v-model="form.status"
                    />
                    <div
                      class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                    ></div>
                    <p
                      class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                    ></p>
                  </div>
                </label>
                <!-- Dormant Option -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-10 h-10 bg-gray-50 rounded-[12px] flex items-center justify-center"
                    >
                      <PauseCircle class="w-5 h-5 text-gray-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-sm font-semibold">
                        Dormant
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                  >
                    <input
                      type="radio"
                      name="team_status"
                      value="dormant"
                      class="hidden"
                      v-model="form.status"
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

        <!-- Form Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3.5 pb-5">
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full sm:w-auto rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-5 py-2.5 flex items-center gap-1.5"
          >
            <span class="text-brand-white text-sm font-semibold"
              >Create Team</span
            >
            <Plus class="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onclick="window.history.back()"
            class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-5 py-2.5 flex items-center gap-1.5 w-full sm:w-auto"
          >
            <span class="text-brand-dark text-sm font-semibold">Cancel</span>
          </button>
        </div>
      </form>
    </div>

    <RightSidebarForm @browse-employees="leadModal = true" />
    </div>
  </div>

  <div
    class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
    v-if="leadModal"
  >
    <div
      class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-4xl mx-3.5 max-h-[80vh] overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="p-5 border-b border-[#DCDEDD]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div
              class="w-9 h-9 bg-green-50 rounded-[12px] flex items-center justify-center"
            >
              <Crown class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-base font-bold">
                Select Team Lead
              </h3>
              <p class="text-brand-light text-sm font-normal">
                Choose an employee to lead this team
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="leadModal = false"
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
            id="leadSearch"
            class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
            placeholder="Search employees..."
            v-model="searchLead"
          />
        </div>
      </div>

      <!-- Employees List -->
      <div class="p-5 overflow-y-auto max-h-96">
        <div id="leadList" class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <!-- Employee Option 1 -->
          <div
            class="lead-card border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-3.5 cursor-pointer"
            v-for="employee in employees"
            :key="employee.id"
            @click="handleSelectLead(employee)"
          >
            <div class="flex items-center gap-3.5">
              <Avatar
                :src="employee.user?.profile_photo"
                :alt="employee.user?.name"
                size="w-10 h-10"
                icon-size="w-5 h-5"
                rounded="rounded-[12px]"
              />
              <div class="flex-1">
                <h4 class="text-brand-dark text-sm font-bold">
                  {{ employee.user?.name }}
                </h4>
                <p class="text-brand-light text-sm font-normal">
                  {{ employee.job_information?.job_title }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- No Results Message -->
        <div class="text-center py-6" v-if="employees.length === 0">
          <SearchX class="w-9 h-9 text-gray-400 mx-auto mb-2.5" />
          <h4 class="text-brand-dark text-sm font-semibold mb-1">
            No employees found
          </h4>
          <p class="text-brand-light text-sm">
            Try adjusting your search terms
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
