<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTeamStore } from "@/stores/team";
import { storeToRefs } from "pinia";
import {
  Calendar,
  Users,
  Mail,
  Crown,
  Phone,
  UserCheck,
  ListCheck,
  Check,
  Eye,
  Clock,
  AlertTriangle,
  Trash2,
} from "lucide-vue-next";
import { formatToClientTimezone } from "@/helpers/format";
import Alert from "@/components/common/Alert.vue";
import Avatar from "@/components/common/Avatar.vue";
import ConfirmationModal from "@/components/common/ConfirmationModal.vue";
import Header from "@/components/admin/team/detail/Header.vue";
import Statistic from "@/components/admin/team/detail/Statistic.vue";
import Chart from "@/components/admin/team/detail/Chart.vue";

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const teamStore = useTeamStore();
const { loading, success, error } = storeToRefs(teamStore);
const { fetchTeam, deleteTeam } = teamStore;

const team = ref({});
const showDeleteModal = ref(false);
const showAllMembers = ref(false);

// The grid can get long for large teams, so only the first page is shown
// until "View More" is clicked -- there's no separate members endpoint to
// paginate against, the full list already comes with the team payload.
const MEMBERS_PAGE_SIZE = 8;
const visibleMembers = computed(() => {
  const members = team.value.members || [];
  return showAllMembers.value ? members : members.slice(0, MEMBERS_PAGE_SIZE);
});
const hasMoreMembers = computed(
  () => (team.value.members || []).length > MEMBERS_PAGE_SIZE
);

const isTeamLead = (member) =>
  !!team.value.leader && member.employee?.user?.id === team.value.leader.id;

const handleFetchTeam = async () => {
  const response = await fetchTeam(id);

  team.value = response;
};

const handleDeleteTeam = async () => {
  await deleteTeam(id);

  if (success.value) {
    showDeleteModal.value = false;
    router.push({ name: "admin.teams" });
  }
};

onMounted(async () => {
  await handleFetchTeam();
});
</script>

<template>
    <div class="px-4 py-4">
  <Alert type="success" :title="success" :show="success" />

  <Header :team="team" />

  <Statistic :team="team" />

  <Chart :team="team" />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
    <!-- Team Lead Information -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
      <!-- Header Section -->
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 bg-green-50 rounded-[12px] flex items-center justify-center"
          >
            <Crown class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">Team Lead</h3>
            <p class="text-brand-light text-sm">
              Team leadership and management
            </p>
          </div>
        </div>
        <span
          class="px-1.5 py-1 rounded-md text-xs font-semibold bg-[#F0FDF4] text-[#166534]"
          >Active</span
        >
      </div>

      <div class="flex flex-col gap-3.5" v-if="team.leader">
        <!-- Team Lead Profile -->
        <div class="bg-white border border-[#DCDEDD] rounded-[12px] p-3.5 mb-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3.5">
              <div class="relative">
                <Avatar
                  :src="team.leader.profile_photo"
                  :alt="team.leader.name"
                  size="w-9 h-9"
                  icon-size="w-6 h-6"
                />
                <div
                  class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"
                ></div>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-brand-dark text-sm font-bold truncate">
                  {{ team.leader?.name }}
                </h4>
                <p class="text-brand-light text-sm">
                  {{
                    team.leader?.employee_profile?.job_information?.job_title
                  }}
                </p>
              </div>
            </div>
            <span
              class="px-1.5 py-1 rounded-md text-xs font-semibold bg-[#EBF8FF] text-[#1E40AF]"
              >Team Lead</span
            >
          </div>
        </div>

        <!-- Contact Information -->
        <div class="space-y-2.5">
          <h5 class="text-brand-dark text-sm font-semibold mb-2.5">
            Contact Information
          </h5>
          <div class="space-y-1.5">
            <div
              class="flex items-center gap-2.5 p-1.5 rounded-[8px] hover:bg-gray-50 transition-all duration-300"
            >
              <div
                class="w-8 h-8 bg-blue-50 rounded-[8px] flex items-center justify-center"
              >
                <Mail class="w-4 h-4 text-blue-600" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-brand-light text-xs font-medium">
                  Email Address
                </p>
                <p class="text-brand-dark text-sm font-semibold truncate">
                  {{ team.leader.email }}
                </p>
              </div>
            </div>
            <div
              class="flex items-center gap-2.5 p-1.5 rounded-[8px] hover:bg-gray-50 transition-all duration-300"
            >
              <div
                class="w-8 h-8 bg-green-50 rounded-[8px] flex items-center justify-center"
              >
                <Phone class="w-4 h-4 text-green-600" />
              </div>
              <div class="flex-1">
                <p class="text-brand-light text-xs font-medium">Phone Number</p>
                <p class="text-brand-dark text-sm font-semibold">
                  {{ team?.leader?.employee_profile?.phone }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-1.5 mt-3.5 pt-3.5 border-t border-[#DCDEDD]">
          <RouterLink
            :to="{
              name: 'admin.employees.detail',
              params: { id: team.leader?.employee_profile?.id },
            }"
            class="w-full
           bg-white
           border border-[#DCDEDD]
           rounded-[8px]
           hover:border-[#0C51D9]
           hover:bg-blue-100
           transition-all duration-300
           px-2.5 py-2.5
           flex items-center justify-center gap-1.5"
          >
            <UserCheck class="w-5 h-5 text-brand-light" />
            <span class="text-brand-dark text-sm font-semibold"
              >View Profile</span
            >
          </RouterLink>
        </div>
      </div>

      <div class="flex flex-1 items-center justify-center min-h-[250px]" v-else>
        <div class="flex flex-col items-center justify-center">
          <Crown class="w-9 h-9 text-gray-300 mb-3.5" />
          <h3 class="text-brand-dark text-sm font-bold mb-1.5">
            No Team Lead Assigned
          </h3>
          <p class="text-brand-light text-sm mb-3.5 text-center">
            This team does not currently have a leader assigned.
          </p>
        </div>
      </div>
    </div>

    <!-- Team Responsibilities -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
      <div class="flex items-center gap-2.5 mb-5">
        <div
          class="w-9 h-9 bg-orange-50 rounded-[12px] flex items-center justify-center"
        >
          <ListCheck class="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-sm font-bold">Team Responsibilities</h3>
          <p class="text-brand-light text-sm">Key duties and objectives</p>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-3.5">
        <div
          class="flex items-start gap-2.5 p-3.5 bg-gray-50 rounded-[12px]"
          v-for="responsibility in team.responsibilities"
          :key="responsibility.id"
        >
          <div
            class="w-8 h-8 min-w-[32px] bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0"
          >
            <Check class="w-4 h-4 text-green-600" />
          </div>
          <span class="text-brand-dark text-sm font-medium">{{
            responsibility
          }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Team Members Section -->
  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5 mb-5">
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <div
          class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <Users class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-sm font-bold">Team Members</h3>
          <p class="text-brand-light text-sm">Current team composition</p>
        </div>
      </div>
      <div class="flex items-center gap-3.5" v-if="hasMoreMembers">
        <button
          @click="showAllMembers = !showAllMembers"
          class="bg-white border border-[#DCDEDD] text-brand-dark py-2.5 px-3.5 rounded-[8px] font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <Eye class="w-4 h-4" />
          <span class="text-sm font-semibold">{{ showAllMembers ? "View Less" : "View More" }}</span>
        </button>
      </div>
    </div>

    <!-- Members Grid -->
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5"
    >
      <!-- Team Member Card -->
      <div
        class="bg-white relative border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300 p-3.5"
        v-for="member in visibleMembers"
        :key="member.id"
      >
        <span
          v-if="isTeamLead(member)"
          class="absolute top-3 right-3 px-1.5 py-1 rounded-md text-xs font-semibold bg-[#EBF8FF] text-[#1E40AF] flex items-center gap-1"
        >
          <Crown class="w-3 h-3" />
          Team Lead
        </span>
        <div class="flex flex-col items-center mb-2.5">
          <div class="relative">
            <Avatar
              :src="member.employee.user?.profile_photo"
              :alt="member.employee.user?.name"
              size="w-[100px] h-[100px] mb-2.5"
              icon-size="w-8 h-8"
            />
          </div>
        </div>
        <div class="text-center mb-2.5">
          <h4 class="text-brand-dark text-sm font-bold">
            {{ member.employee.user.name }}
          </h4>
          <p class="text-brand-light text-sm">
            {{ member.employee.job_information.job_title }}
          </p>
        </div>
        <div class="space-y-1 mb-2.5">
          <div class="flex items-center gap-1.5 text-sm text-gray-500">
            <Calendar class="w-4 h-4" />
            <span>Joined {{ formatToClientTimezone(member.joined_at) }}</span>
          </div>
          <div class="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock class="w-4 h-4" />
            <span
              >{{ member.employee.job_information.experience }} years
              experience</span
            >
          </div>
        </div>
        <RouterLink
          :to="{
            name: 'admin.employees.detail',
            params: { id: member.employee.id },
          }"
          class="w-full btn-view-soft"
        >
          <Eye class="w-5 h-5" />
          <span>View Profile</span>
        </RouterLink>
      </div>
    </div>
  </div>

  <!-- Danger Zone -->
  <div class="bg-white border border-[#FEE2E2] rounded-[12px] p-5">
    <div class="flex items-center gap-2.5 mb-5">
      <div
        class="w-9 h-9 bg-red-50 rounded-[12px] flex items-center justify-center"
      >
        <AlertTriangle class="w-6 h-6 text-red-600" />
      </div>
      <div>
        <h3 class="text-brand-dark text-sm font-bold">Danger Zone</h3>
        <p class="text-brand-light text-sm">
          Irreversible and destructive actions
        </p>
      </div>
    </div>
    <div
      class="flex flex-col sm:flex-row gap-3.5 justify-between items-start sm:items-center p-3.5 bg-red-50 rounded-[12px]"
    >
      <div class="flex-1">
        <h4 class="text-brand-dark text-sm font-bold mb-1">Disband Team</h4>
        <p class="text-brand-light text-sm">
          Permanently remove this team and reassign all members. This action
          cannot be undone.
        </p>
      </div>
      <button
        @click="showDeleteModal = true"
        class="btn-primary rounded-[8px] border border-[#A02121] hover:brightness-110 focus:ring-2 focus:ring-[#D90C0C] transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 shadow-lg px-5 py-2.5 flex items-center gap-1.5"
      >
        <Trash2 class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Disband Team</span>
      </button>
    </div>
  </div>

  <!-- Confirmation Modal -->
  <ConfirmationModal
    :show="showDeleteModal"
    title="Disband Team"
    :message="`Are you sure you want to disband '${team.name}'? This will permanently remove the team and reassign all members. This action cannot be undone.`"
    confirmText="Disband Team"
    cancelText="Cancel"
    type="danger"
    :loading="loading"
    @confirm="handleDeleteTeam"
    @cancel="showDeleteModal = false"
  />

</div>
</template>
