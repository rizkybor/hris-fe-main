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
import { debounce } from "lodash";
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
const filteredMemberCandidates = computed(() => {
  if (!memberSearch.value.trim()) return memberCandidates.value;
  const q = memberSearch.value.trim().toLowerCase();
  return memberCandidates.value.filter((employee) => (employee.user?.name || "").toLowerCase().includes(q));
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
  <div>
    <!-- Header -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Users2 class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-brand-dark text-xl font-bold">Create New Team</h1>
          <p class="text-brand-light text-sm">Set up a new team and assign a leader</p>
        </div>
      </div>
    </div>

    <div class="mb-6" v-if="typeof error === 'string'">
      <Transition name="fade">
        <Alert type="danger" :title="error" message="" :show="true" />
      </Transition>
    </div>

    <div class="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">
    <!-- Form Section -->
    <div class="flex-1">
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Team Information Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
            >
              <User class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">
                Team Information
              </h3>
              <p class="text-brand-light text-sm font-normal">
                Basic team details and description
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <!-- Team Icon -->
            <div class="md:col-span-2">
              <label class="block text-brand-dark text-base font-semibold mb-1"
                >Team Icon</label
              >
              <div class="flex flex-col sm:flex-row items-center gap-4">
                <div class="w-24 h-24 sm:w-32 sm:h-32">
                  <!-- Icon Container with Blue Gradient Background -->
                  <div class="relative w-24 h-24 sm:w-32 sm:h-32">
                    <!-- Blue gradient background -->
                    <div
                      class="w-24 h-24 sm:w-32 sm:h-32 absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-full"
                    ></div>

                    <!-- Icon Display (uploaded or default) -->
                    <div
                      id="teamIconDisplay"
                      class="w-24 h-24 sm:w-32 sm:h-32 relative z-10 flex items-center justify-center"
                    >
                      <img
                        id="uploadedTeamIcon"
                        :src="form.icon_url"
                        alt="Team Icon"
                        class="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                        v-if="form.icon_url"
                      />
                      <Users2
                        v-else
                        class="w-10 h-10 sm:w-14 sm:h-14 text-white/90"
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
                <div class="flex flex-col gap-2">
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
                    class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center gap-2 cursor-pointer w-full sm:w-auto"
                    @click="teamIconInput.click()"
                  >
                    <Upload class="w-4 h-4 text-gray-600" />
                    <span class="text-brand-dark text-base font-semibold"
                      >Upload Icon</span
                    >
                  </button>
                  <button
                    type="button"
                    v-if="form.icon_url"
                    @click="handleRemoveIcon"
                    class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    <X class="w-4 h-4 text-gray-600" />
                    <span class="text-brand-dark text-base font-semibold"
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
            <div class="md:col-span-2 mb-4">
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
            <div class="mb-4">
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
            <div class="mb-4">
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
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-green-50 rounded-[12px] flex items-center justify-center"
            >
              <Crown class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">Team Lead</h3>
              <p class="text-brand-light text-sm font-normal">
                Assign a team leader to manage this team
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <!-- Team Lead Selection -->
            <div class="md:col-span-2">
              <label class="block text-brand-dark text-base font-semibold mb-1"
                >Select Team Lead</label
              >
              <button
                type="button"
                class="w-full border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-3 flex items-center gap-3 text-left"
                @click="leadModal = true"
              >
                <UserCheck class="w-5 h-5 text-gray-400" />
                <span class="text-[#0D2929] font-normal flex-1">
                  {{ selectedLead?.user?.name || "Select team lead" }}
                </span>
                <ChevronDown class="w-4 h-4 text-gray-400" />
              </button>

              <div
                class="mt-3 p-4 bg-gray-50 rounded-[12px] border border-[#DCDEDD]"
                v-if="selectedLead"
              >
                <div class="flex items-center gap-3">
                  <Avatar
                    :src="selectedLead?.user?.profile_photo"
                    :alt="selectedLead?.user?.name"
                    size="w-12 h-12"
                    icon-size="w-5 h-5"
                  />
                  <div class="flex-1">
                    <h4 class="text-brand-dark text-base font-semibold">
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
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
            >
              <Users class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">Team Members</h3>
              <p class="text-brand-light text-sm font-normal">
                Pick employees who will be part of this team
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between mb-1.5">
            <label class="text-sm font-semibold text-brand-dark block">Members</label>
            <span v-if="form.member_employee_ids.length" class="text-xs text-[#0C51D9] font-semibold flex items-center gap-1">
              <Users class="w-3.5 h-3.5" />
              {{ form.member_employee_ids.length }} selected
            </span>
          </div>
          <div class="border border-[#DCDEDD] rounded-xl overflow-hidden">
            <div v-if="memberCandidates.length > 8" class="relative border-b border-[#DCDEDD] bg-gray-50 p-2">
              <Search class="w-3.5 h-3.5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                v-model="memberSearch"
                type="text"
                placeholder="Search employees..."
                class="w-full pl-7 pr-2 py-1.5 border border-[#DCDEDD] rounded-lg text-xs bg-white focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
              />
            </div>
            <div class="p-3 max-h-64 overflow-y-auto space-y-1">
              <label
                v-for="employee in filteredMemberCandidates"
                :key="employee.id"
                class="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  :checked="form.member_employee_ids.includes(employee.id)"
                  @change="toggleMember(employee.id)"
                  class="rounded border-gray-300 text-[#0C51D9] focus:ring-[#0C51D9] shrink-0"
                />
                <span class="truncate">{{ employee.user?.name }}</span>
              </label>
              <p v-if="memberCandidates.length === 0" class="text-sm text-gray-400 italic py-2">No staff data yet.</p>
              <p v-else-if="filteredMemberCandidates.length === 0" class="text-sm text-gray-400 italic py-2">No employees match "{{ memberSearch }}".</p>
            </div>
          </div>
        </div>

        <!-- Team Responsibilities Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-orange-50 rounded-[12px] flex items-center justify-center"
            >
              <ListCheck class="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">
                Team Responsibilities
              </h3>
              <p class="text-brand-light text-sm font-normal">
                Define the key responsibilities and duties for this team
              </p>
            </div>
          </div>

          <div class="space-y-4" id="responsibilitiesContainer">
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
                class="responsibility-item mt-4"
                :id="`responsibility_field_${index + 1}`"
              >
                <label
                  class="block mb-2 text-gray-700 font-semibold font-jakarta text-[14px]"
                >
                  Responsibility {{ index + 1 }}
                </label>
                <div class="flex flex-col sm:flex-row sm:items-start gap-3 justify-center">
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
                    class="w-12 h-12 border border-[#DCDEDD] rounded-[12px] hover:border-red-500 hover:bg-red-50 transition-all duration-300 flex items-center justify-center mt-7 cursor-pointer"
                    @click="removeResponsibility(index)"
                  >
                    <Trash2 class="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- Add New Responsibility -->
          <div class="mt-4">
            <button
              type="button"
              class="w-full border-2 border-dashed border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300 px-4 py-3 flex items-center gap-3 text-left cursor-pointer"
              @click="addNewResponsibility()"
            >
              <PlusCircle class="w-5 h-5 text-gray-400" />
              <span class="text-brand-dark text-base font-medium"
                >Add Another Responsibility</span
              >
            </button>
          </div>
        </div>

        <!-- Team Settings Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-purple-50 rounded-[12px] flex items-center justify-center"
            >
              <Settings class="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">Team Settings</h3>
              <p class="text-brand-light text-sm font-normal">
                Configure team status
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Initial Team Status (Full Width) -->
            <div class="md:col-span-2 mb-4">
              <label class="block text-brand-dark text-base font-semibold mb-1"
                >Initial Team Status</label
              >
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Active Option -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-green-50 rounded-[12px] flex items-center justify-center"
                    >
                      <CheckCircle class="w-5 h-5 text-green-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">
                        Active
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-2 px-3 gap-2"
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
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-blue-50 rounded-[12px] flex items-center justify-center"
                    >
                      <UsersRound class="w-5 h-5 text-blue-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">
                        Forming
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-2 px-3 gap-2"
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
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-purple-50 rounded-[12px] flex items-center justify-center"
                    >
                      <ClipboardList class="w-5 h-5 text-purple-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">
                        Planning
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-2 px-3 gap-2"
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
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-gray-50 rounded-[12px] flex items-center justify-center"
                    >
                      <PauseCircle class="w-5 h-5 text-gray-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">
                        Dormant
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-2 px-3 gap-2"
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
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-6">
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full sm:w-auto rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center gap-2"
          >
            <span class="text-brand-white text-base font-semibold"
              >Create Team</span
            >
            <Plus class="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onclick="window.history.back()"
            class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 flex items-center gap-2 w-full sm:w-auto"
          >
            <span class="text-brand-dark text-base font-semibold">Cancel</span>
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
      class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="p-6 border-b border-[#DCDEDD]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-green-50 rounded-[12px] flex items-center justify-center"
            >
              <Crown class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">
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
      <div class="p-6 border-b border-[#DCDEDD]">
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            id="leadSearch"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
            placeholder="Search employees..."
            v-model="searchLead"
          />
        </div>
      </div>

      <!-- Employees List -->
      <div class="p-6 overflow-y-auto max-h-96">
        <div id="leadList" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Employee Option 1 -->
          <div
            class="lead-card border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-4 cursor-pointer"
            v-for="employee in employees"
            :key="employee.id"
            @click="handleSelectLead(employee)"
          >
            <div class="flex items-center gap-4">
              <Avatar
                :src="employee.user?.profile_photo"
                :alt="employee.user?.name"
                size="w-14 h-14"
                icon-size="w-5 h-5"
                rounded="rounded-[12px]"
              />
              <div class="flex-1">
                <h4 class="text-brand-dark text-base font-bold">
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
        <div class="text-center py-8" v-if="employees.length === 0">
          <SearchX class="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 class="text-brand-dark text-base font-semibold mb-1">
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
