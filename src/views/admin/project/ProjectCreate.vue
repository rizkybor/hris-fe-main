<script setup>
import { Input, Select, TextArea } from "@/components/common/form";
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
} from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { debounce } from "lodash";
import { useProjectStore } from "@/stores/project";
import { useTeamStore } from "@/stores/team";
import { useEmployeeStore } from "@/stores/employee";
import { useVendorsStore } from "@/stores/vendor";
import { storeToRefs } from "pinia";
import { axiosInstance } from "@/plugins/axios";
import router from "@/router";

const projectStore = useProjectStore();
const { loading, error, success } = storeToRefs(projectStore);
const { createProject } = projectStore;

const teamStore = useTeamStore();
const { teams } = storeToRefs(teamStore);
const { fetchTeams } = teamStore;

const employeeStore = useEmployeeStore();
const { employees } = storeToRefs(employeeStore);
const { fetchEmployees } = employeeStore;

const vendorsStore = useVendorsStore();
const { vendors } = storeToRefs(vendorsStore);
const vendorOptions = computed(() => vendors.value.map((vendor) => ({ value: vendor.id, label: vendor.name })));

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
  project_leader_id: "",
  team_assignment_mode: "employee",
  team_id: "",
  member_employee_ids: [],
  vendor_id: "",
});

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
  await createProject(payload);

  if (success.value) {
    router.push({ name: "admin.projects" });
  }
};

const handleProjectPhotoSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    form.value.photo = file;
    form.value.photo_url = URL.createObjectURL(file);
  }
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
  await vendorsStore.fetchAllVendors();

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
  <div class="px-4 py-4">
  <div class="flex flex-col lg:flex-row gap-5 items-start">
    <!-- Form Section -->
    <div class="flex-1 w-full">
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Project Information Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
            >
              <Briefcase class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">
                Project Information
              </h3>
              <p class="text-brand-light text-sm font-normal">
                Basic project details and description
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Project Photo -->
            <div class="md:col-span-2 mb-4">
              <label class="block text-brand-dark text-base font-semibold mb-1"
                >Project Photo</label
              >
              <div class="flex flex-col sm:flex-row items-start gap-4">
                <div class="w-full sm:w-64 h-40">
                  <!-- Photo Container with Default Background -->
                  <div class="relative w-full sm:w-64 h-40">
                    <!-- Default background -->
                    <div
                      class="w-full sm:w-64 h-40 absolute bg-gray-50 rounded-[12px] border-2 border-dashed border-[#DCDEDD]"
                    ></div>

                    <div
                      class="w-full sm:w-64 h-40 relative z-10 flex items-center justify-center rounded-[12px] overflow-hidden"
                    >
                      <img
                        :src="form.photo_url"
                        alt="Project Photo"
                        class="w-full sm:w-64 h-40 object-cover rounded-[12px]"
                        v-if="form.photo_url"
                      />
                      <div
                        v-else
                        class="flex flex-col items-center justify-center text-gray-400"
                      >
                        <Image class="w-10 h-10 mb-2" />
                        <span class="text-sm font-medium">Project Photo</span>
                      </div>
                    </div>

                    <!-- Upload overlay (shown on hover) - only when no photo uploaded -->
                    <div
                      class="absolute inset-0 rounded-[12px] flex items-center justify-center transition-all duration-300 cursor-pointer z-20 group"
                    >
                      <div
                        class="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 rounded-[12px] transition-opacity duration-300"
                      ></div>
                      <Upload
                        class="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 relative z-10"
                        @click="projectPhotoInput.click()"
                      />
                    </div>
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    ref="projectPhotoInput"
                    @change="handleProjectPhotoSelect"
                  />
                  <button
                    type="button"
                    class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center gap-2"
                  >
                    <ImagePlus class="w-4 h-4 text-gray-600" />
                    <span class="text-brand-dark text-base font-semibold"
                      >Select Photo</span
                    >
                  </button>
                  <button
                    type="button"
                    class="hidden border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center gap-2"
                  >
                    <Eye class="w-4 h-4 text-gray-600" />
                    <span class="text-brand-dark text-base font-semibold"
                      >Preview Photo</span
                    >
                  </button>
                  <button
                    type="button"
                    class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center gap-2"
                  >
                    <X class="w-4 h-4 text-gray-600" />
                    <span class="text-brand-dark text-base font-semibold"
                      >Remove Photo</span
                    >
                  </button>
                  <p class="text-brand-light text-xs">
                    JPG, PNG up to 2MB (recommended: 640x424px)
                  </p>
                </div>
              </div>
            </div>

            <!-- Project Name -->
            <div class="md:col-span-2 mb-4">
              <Input
                id="name"
                name="name"
                type="text"
                v-model="form.name"
                label="Project Name *"
                placeholder="Enter project name"
                :required="true"
              >
                <template #icon>
                  <Briefcase class="h-5 w-5 text-gray-400" />
                </template>
              </Input>
            </div>

            <!-- Priority -->
            <div class="md:col-span-2 mb-4">
              <label class="block text-brand-dark text-base font-semibold mb-1"
                >Priority *</label
              >
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Low Priority -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-gray-50 rounded-[12px] flex items-center justify-center"
                    >
                      <Minus class="w-5 h-5 text-gray-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">Low</p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-2 px-3 gap-2"
                  >
                    <input
                      type="radio"
                      name="project_priority"
                      value="low"
                      class="hidden"
                      v-model="form.priority"
                    />
                    <div
                      class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                    ></div>
                    <p
                      class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                    ></p>
                  </div>
                </label>

                <!-- Medium Priority -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-yellow-50 rounded-[12px] flex items-center justify-center"
                    >
                      <Flag class="w-5 h-5 text-yellow-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">
                        Medium
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-2 px-3 gap-2"
                  >
                    <input
                      type="radio"
                      name="project_priority"
                      value="medium"
                      class="hidden"
                      v-model="form.priority"
                    />
                    <div
                      class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                    ></div>
                    <p
                      class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                    ></p>
                  </div>
                </label>

                <!-- High Priority -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-red-50 rounded-[12px] flex items-center justify-center"
                    >
                      <Zap class="w-5 h-5 text-red-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">
                        High
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-2 px-3 gap-2"
                  >
                    <input
                      type="radio"
                      name="project_priority"
                      value="high"
                      class="hidden"
                      v-model="form.priority"
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

            <div
              class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5 mb-4"
            >
              <!-- Project Type -->
              <div>
                <Select
                  id="type"
                  name="type"
                  v-model="form.type"
                  label="Project Type *"
                  placeholder="Select project type"
                  :options="[
                    { value: 'web_development', label: 'Web Development' },
                    { value: 'mobile_app', label: 'Mobile App' },
                    { value: 'design', label: 'Design' },
                    { value: 'marketing', label: 'Marketing' },
                    { value: 'research', label: 'Research' },
                    { value: 'infrastructure', label: 'Infrastructure' },
                  ]"
                  :required="true"
                >
                  <template #icon>
                    <Tag class="h-5 w-5 text-gray-400" />
                  </template>
                </Select>
              </div>

              <!-- Start Date -->
              <div>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  v-model="form.start_date"
                  label="Start Date *"
                  :required="true"
                >
                  <template #icon>
                    <Calendar class="h-5 w-5 text-gray-400" />
                  </template>
                </Input>
              </div>

              <!-- End Date -->
              <div>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  v-model="form.end_date"
                  label="End Date *"
                  :required="true"
                >
                  <template #icon>
                    <Calendar class="h-5 w-5 text-gray-400" />
                  </template>
                </Input>
              </div>
            </div>

            <!-- Vendor (optional) -->
            <div class="md:col-span-2 mb-4">
              <Select
                id="vendor_id"
                name="vendor_id"
                v-model="form.vendor_id"
                label="Vendor (optional)"
                placeholder="No vendor"
                :options="vendorOptions"
              >
                <template #icon>
                  <Building2 class="h-5 w-5 text-gray-400" />
                </template>
              </Select>
              <p class="text-brand-light text-xs mt-1">Link this project to the vendor it's contracted through, if any.</p>
            </div>

            <!-- Project Description -->
            <div class="md:col-span-2">
              <TextArea
                id="description"
                name="description"
                v-model="form.description"
                label="Project Description"
                placeholder="Describe the project's objectives and scope..."
                :rows="4"
              >
                <template #icon>
                  <FileText class="h-5 w-5 text-gray-400" />
                </template>
              </TextArea>
            </div>
          </div>
        </div>

        <!-- Team Assignment Section -->
        <div id="team-assignment-section" class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-purple-50 rounded-[12px] flex items-center justify-center"
            >
              <Users class="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">Team Assignment</h3>
              <p class="text-brand-light text-sm font-normal">
                Assign a whole Team, or pick a leader and members individually
              </p>
            </div>
          </div>

          <!-- Mode Toggle -->
          <div class="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              @click="setAssignmentMode('employee')"
              class="rounded-[12px] border p-4 text-left transition-all duration-300"
              :class="form.team_assignment_mode === 'employee' ? 'border-[#0C51D9] border-2 bg-blue-50/50' : 'border-[#DCDEDD] hover:border-[#0C51D9] hover:border-2'"
            >
              <p class="text-brand-dark text-sm font-bold">By Employee</p>
              <p class="text-brand-light text-xs mt-0.5">Pick a leader and members one by one</p>
            </button>
            <button
              type="button"
              @click="setAssignmentMode('team')"
              class="rounded-[12px] border p-4 text-left transition-all duration-300"
              :class="form.team_assignment_mode === 'team' ? 'border-[#0C51D9] border-2 bg-blue-50/50' : 'border-[#DCDEDD] hover:border-[#0C51D9] hover:border-2'"
            >
              <p class="text-brand-dark text-sm font-bold">By Team</p>
              <p class="text-brand-light text-xs mt-0.5">Leader and members come from a Team</p>
            </button>
          </div>

          <!-- By Team -->
          <div v-if="form.team_assignment_mode === 'team'" class="space-y-4">
            <div>
              <label class="block text-brand-dark text-base font-semibold mb-3">Select a Team</label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label
                  class="group team-card flex items-center justify-between w-full min-h-[70px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer hover:border-[#0C51D9] hover:border-2"
                  v-for="team in teams"
                  :key="team.id"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 relative flex items-center justify-center rounded-[12px] overflow-hidden">
                      <div class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-[12px]"></div>
                      <Code class="w-5 h-5 text-white relative z-10" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">{{ team.name }}</p>
                      <p class="text-brand-light text-sm">{{ team.members_count }} members • {{ team.leader?.name || "No lead" }}</p>
                    </div>
                  </div>
                  <input type="radio" name="team_id" :value="team.id" class="w-4 h-4 accent-[#0C51D9]" v-model="form.team_id" />
                </label>
              </div>
              <p v-if="teams.length === 0" class="text-sm text-gray-400 italic py-2">No teams yet.</p>
            </div>

            <!-- Preview of the selected Team's leader + members -->
            <div v-if="selectedTeamDetail" class="border-t border-[#DCDEDD] pt-4">
              <p class="text-brand-dark text-sm font-semibold mb-2">
                Project Leader will be <span class="text-[#0C51D9]">{{ selectedTeamDetail.leader?.name || "unset (Team has no lead)" }}</span>
              </p>
              <p class="text-brand-light text-xs mb-2">Members ({{ selectedTeamDetail.members?.length || 0 }}) come directly from this Team:</p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="member in selectedTeamDetail.members"
                  :key="member.id"
                  class="px-2 py-1 rounded-md bg-blue-50 text-[#0C51D9] text-xs font-medium"
                >
                  {{ member.employee?.user?.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- By Employee -->
          <div v-else class="space-y-6">
            <!-- Project Leader -->
            <div>
              <label class="block text-brand-dark text-base font-semibold mb-1">Select Project Leader</label>
              <button
                type="button"
                @click="leaderModal = true"
                class="w-full border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-3 flex items-center gap-3 text-left"
              >
                <UserCheck class="w-5 h-5 text-gray-400" />
                <span class="text-[#0D2929] font-normal flex-1">
                  {{ selectedLeader?.user?.name || "Select project leader" }}
                </span>
                <ChevronDown class="w-4 h-4 text-gray-400" />
              </button>

              <div class="mt-3 p-4 bg-gray-50 rounded-[12px] border border-[#DCDEDD]" v-if="selectedLeader">
                <div class="flex items-center gap-3">
                  <Avatar
                    :src="selectedLeader?.user?.profile_photo"
                    :alt="selectedLeader?.user?.name"
                    size="w-12 h-12"
                    icon-size="w-5 h-5"
                  />
                  <div class="flex-1">
                    <h4 class="text-brand-dark text-base font-semibold">{{ selectedLeader?.user?.name }}</h4>
                    <p class="text-brand-light text-sm">{{ selectedLeader?.job_information?.job_title }}</p>
                  </div>
                  <button type="button" @click="handleRemoveLeader" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Members -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-base font-semibold text-brand-dark block">Members</label>
                <span v-if="form.member_employee_ids.length" class="text-xs text-[#0C51D9] font-semibold flex items-center gap-1">
                  <Users class="w-3.5 h-3.5" />
                  {{ form.member_employee_ids.length }} selected
                </span>
              </div>
              <div class="border border-[#DCDEDD] rounded-xl overflow-hidden">
                <div v-if="selectableMemberCandidates.length > 8" class="relative border-b border-[#DCDEDD] bg-gray-50 p-2">
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
                  <p v-if="selectableMemberCandidates.length === 0" class="text-sm text-gray-400 italic py-2">No staff data yet.</p>
                  <p v-else-if="filteredMemberCandidates.length === 0" class="text-sm text-gray-400 italic py-2">No employees match "{{ memberSearch }}".</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Project Settings Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-orange-50 rounded-[12px] flex items-center justify-center"
            >
              <Settings class="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">
                Project Settings
              </h3>
              <p class="text-brand-light text-sm font-normal">
                Configure project status, budget
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-5">
            <!-- Budget -->
            <div class="mb-4">
              <Input
                id="budget"
                name="budget"
                type="text"
                v-model="form.budget"
                label="Budget"
                placeholder="100.000.000"
              >
                <template #icon> Rp </template>
              </Input>
            </div>

            <!-- Initial Project Status (Full Width) -->
            <div class="md:col-span-2 mb-4">
              <label class="block text-brand-dark text-base font-semibold mb-1"
                >Initial Project Status</label
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
                      <PlayCircle class="w-5 h-5 text-green-600" />
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
                      name="project_status"
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

                <!-- Planning Option -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-blue-50 rounded-[12px] flex items-center justify-center"
                    >
                      <ClipboardList class="w-5 h-5 text-blue-600" />
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
                      name="project_status"
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

                <!-- On Hold Option -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-yellow-50 rounded-[12px] flex items-center justify-center"
                    >
                      <PauseCircle class="w-5 h-5 text-yellow-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">
                        On Hold
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-2 px-3 gap-2"
                  >
                    <input
                      type="radio"
                      name="project_status"
                      value="on_hold"
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

                <!-- Draft Option -->
                <label
                  class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] border border-[#DCDEDD] p-4 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-gray-50 rounded-[12px] flex items-center justify-center"
                    >
                      <FileText class="w-5 h-5 text-gray-600" />
                    </div>
                    <div class="flex flex-col">
                      <p class="text-brand-dark text-base font-semibold">
                        Draft
                      </p>
                    </div>
                  </div>
                  <div
                    class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-2 px-3 gap-2"
                  >
                    <input
                      type="radio"
                      name="project_status"
                      value="draft"
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
        <div class="flex items-center gap-3 sm:gap-4 pb-6">
          <button
            type="submit"
            class="flex-1 sm:flex-none btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-center gap-2"
          >
            <span class="text-brand-white text-sm sm:text-base font-semibold"
              >Create Project</span
            >
            <Plus class="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onclick="window.history.back()"
            class="flex-1 sm:flex-none border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-center gap-2"
          >
            <span class="text-brand-dark text-sm sm:text-base font-semibold">Cancel</span>
          </button>
        </div>
      </form>
    </div>

    <RightSidebar />
  </div>

  <!-- Project Leader Selection Modal -->
  <div
    class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
    v-if="leaderModal"
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
                Select Project Leader
              </h3>
              <p class="text-brand-light text-sm font-normal">
                Choose an employee to lead this project
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="leaderModal = false"
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
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
            placeholder="Search employees..."
            v-model="searchLeader"
          />
        </div>
      </div>

      <!-- Employees List -->
      <div class="p-6 overflow-y-auto max-h-96">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="leader-card border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-4 cursor-pointer"
            v-for="employee in employees"
            :key="employee.id"
            @click="handleSelectLeader(employee)"
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
  </div>
</template>
