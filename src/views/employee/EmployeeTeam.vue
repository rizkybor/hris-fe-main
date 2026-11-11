<script setup>
import { ref, computed, onMounted } from "vue";
import {
  Users,
  Building,
  Calendar,
  Folder,
  TrendingUp,
  User,
  FileText,
  Clock,
  CheckCircle,
  ChevronRight,
} from "lucide-vue-next";
import { useEmployeeStore } from "@/stores/employee";
import CardList from "@/components/admin/project/list/CardList.vue";
import { formatDate as formatDateUtil } from "@/utils/dateUtils.js";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import Avatar from "@/components/common/Avatar.vue";
import { useScrollFade } from "@/composables/useScrollFade";
import { UiBadge, UiCard, UiEmpty, UiSpinner, UiStat } from "@/components/ui";

const employeeStore = useEmployeeStore();
const team = ref(null);
const members = ref([]);
const projects = ref([]);
const activeTab = ref("members");
const { scrollRef: tabScrollRef, showLeftFade: showTabLeftFade, showRightFade: showTabRightFade, updateFade: updateTabFade } = useScrollFade();
const loadingTeam = ref(true);
const loadingMembers = ref(false);
const loadingProjects = ref(false);

const activeMembers = computed(() => {
  if (!members.value) return 0;
  return members.value.filter((m) => !m.left_at).length;
});

const activeMembersStatus = computed(() => {
  const expected = team.value?.expected_size || 0;
  const active = activeMembers.value;
  if (active >= expected) return "Full capacity";
  if (active >= expected * 0.8) return "Nearly full";
  return "Growing";
});

const loadTeam = async () => {
  loadingTeam.value = true;
  try {
    team.value = await employeeStore.fetchMyTeam();
  } catch (error) {
    console.error("Error loading team:", error);
    team.value = null;
  } finally {
    loadingTeam.value = false;
  }
};

const loadMembers = async () => {
  if (members.value.length > 0) return; // Already loaded
  loadingMembers.value = true;
  try {
    members.value = await employeeStore.fetchMyTeamMembers();
  } catch (error) {
    console.error("Error loading team members:", error);
  } finally {
    loadingMembers.value = false;
  }
};

const loadProjects = async () => {
  if (projects.value.length > 0) return; // Already loaded
  loadingProjects.value = true;
  try {
    projects.value = await employeeStore.fetchMyTeamProjects();
  } catch (error) {
    console.error("Error loading team projects:", error);
  } finally {
    loadingProjects.value = false;
  }
};

const getStatusClass = (status) => {
  const statusMap = {
    active: "bg-[#F0FDF4] text-[#166534]",
    inactive: "bg-[#FEE2E2] text-[#991B1B]",
    archived: "bg-[#F3F4F6] text-[#374151]",
  };
  return statusMap[status?.toLowerCase()] || "bg-[#EBF8FF] text-[#1E40AF]";
};

const getMemberStatus = (member) => {
  if (member.left_at) return "Left";
  const isLeader = member.employee?.user?.id === team.value?.leader?.id;
  return isLeader ? "Lead" : "Active";
};

const getMemberStatusClass = (member) => {
  if (member.left_at) return "bg-[#F3F4F6] text-[#374151]";
  const isLeader = member.employee?.user?.id === team.value?.leader?.id;
  return isLeader
    ? "bg-[#FEF3C7] text-[#92400E]"
    : "bg-[#F0FDF4] text-[#166534]";
};

// Presentation-only (redesign): badge tones for team + member status.
const TEAM_STATUS_TONES = { active: "ok", inactive: "bad", archived: "neutral" };
const teamStatusTone = (status) => TEAM_STATUS_TONES[status?.toLowerCase()] || "info";
const MEMBER_STATUS_TONES = { Left: "neutral", Lead: "info", Active: "ok" };
const memberStatusTone = (member) => MEMBER_STATUS_TONES[getMemberStatus(member)] || "neutral";
const teamTabs = [
  { id: "members", label: "Members", icon: Users },
  { id: "projects", label: "Projects", icon: Folder },
  { id: "description", label: "Description", icon: FileText },
];

onMounted(() => {
  Promise.all([loadTeam(), loadMembers(), loadProjects()]);
});
</script>

<template>
  <div class="px-1 py-2 sm:px-4 sm:py-4 lg:px-5">
    <!-- Loading State -->
    <UiSpinner v-if="loadingTeam" size="28px" label="Loading your team..." class="py-24" />

    <!-- No Team Assigned -->
    <div v-else-if="!team" class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
      <UiEmpty
        :icon="Users"
        title="No team assigned yet"
        message="You're not currently a member of any team. Reach out to your manager or HR if you think this is a mistake."
      />
    </div>

    <div v-else class="ui-anim-fade-up">
      <!-- Team Header -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 mb-6 text-center sm:text-left">
        <div class="w-16 h-16 rounded-full bg-ui-accent-soft text-ui-accent flex items-center justify-center shrink-0 self-center sm:self-auto">
          <Users class="w-7 h-7" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5">
            <h1 class="text-ui-h1 text-ui-ink break-words">{{ team.name }}</h1>
            <UiBadge v-if="team?.status" :tone="teamStatusTone(team.status)" dot>{{ team.status }}</UiBadge>
          </div>
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-2 text-ui-small text-ui-muted">
            <span class="inline-flex items-center gap-1.5"><Users class="w-3.5 h-3.5 text-ui-faint" />{{ members?.length || 0 }} members</span>
            <span class="inline-flex items-center gap-1.5"><Building class="w-3.5 h-3.5 text-ui-faint" />{{ team?.department || "N/A" }}</span>
            <span class="inline-flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5 text-ui-faint" />{{ team?.created_at ? formatDateUtil(team.created_at) : "N/A" }}</span>
          </div>
        </div>
      </div>

      <!-- Team Statistics -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 ui-stagger">
        <UiStat label="Active Members" :icon="Users" :value="activeMembers" :hint="activeMembersStatus" />
        <UiStat label="Projects Assigned" :icon="Folder" :value="projects?.length || 0" hint="Active projects" />
        <UiStat label="Expected Size" :icon="TrendingUp" :value="team?.expected_size || 0" hint="Team capacity" />
        <UiStat label="Team Lead" :icon="User" hint="Leader">
          <span class="text-ui-h2">{{ team?.leader?.name || "N/A" }}</span>
        </UiStat>
      </div>

      <!-- Tab Navigation: underline on desktop, scrolling chips on phones -->
      <div class="relative mb-5 sm:mb-6">
        <div
          ref="tabScrollRef"
          @scroll="updateTabFade"
          class="overflow-x-auto [scrollbar-width:none] sm:border-b sm:border-ui-line"
        >
          <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
            <button
              v-for="tab in teamTabs"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              @click="activeTab = tab.id"
              :class="[
                'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:shadow-ui-focus',
                'h-8 px-3 rounded-full border text-ui-small',
                'sm:h-auto sm:px-0.5 sm:pt-1 sm:pb-3 sm:rounded-none sm:border-0 sm:border-b-2 sm:-mb-px sm:text-ui-body',
                activeTab === tab.id
                  ? 'bg-ui-ink text-white border-ui-ink sm:bg-transparent sm:text-ui-ink sm:border-ui-ink'
                  : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover sm:bg-transparent sm:text-ui-muted sm:border-transparent sm:hover:bg-transparent sm:hover:text-ui-ink',
              ]"
            >
              <component :is="tab.icon" class="w-4 h-4 hidden sm:block" />
              {{ tab.label }}
              <span v-if="tab.id === 'members'" class="tabular-nums text-ui-cap" :class="activeTab === tab.id ? 'text-white/70 sm:text-ui-muted' : 'text-ui-faint'">{{ members?.length || 0 }}</span>
              <span v-else-if="tab.id === 'projects'" class="tabular-nums text-ui-cap" :class="activeTab === tab.id ? 'text-white/70 sm:text-ui-muted' : 'text-ui-faint'">{{ projects?.length || 0 }}</span>
            </button>
          </div>
        </div>
        <Transition name="ui-fade">
          <div v-if="showTabRightFade" class="sm:hidden pointer-events-none absolute inset-y-0 right-0 flex items-center">
            <span class="w-7 h-7 rounded-full bg-ui-surface border border-ui-line shadow-ui-raised flex items-center justify-center">
              <ChevronRight class="w-4 h-4 text-ui-accent scroll-hint-nudge" />
            </span>
          </div>
        </Transition>
      </div>

      <!-- Team Members Section -->
      <section v-if="activeTab === 'members'" class="mb-6">
        <div class="mb-4">
          <h3 class="text-ui-h2 text-ui-ink">Team Members</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">Current team composition</p>
        </div>

        <SkeletonCardGrid
          v-if="loadingMembers"
          :count="4"
          cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        />
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ui-stagger"
        >
          <div
            v-for="member in members"
            :key="member.id"
            class="ui-lift bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-[18px] min-w-0"
          >
            <div class="flex items-center gap-3">
              <Avatar
                :src="member.employee?.user?.profile_photo"
                :alt="member.employee?.user?.name"
                size="w-10 h-10"
                icon-size="w-5 h-5"
              />
              <div class="min-w-0 flex-1">
                <h4 class="text-ui-h3 text-ui-ink truncate">{{ member.employee?.user?.name || "N/A" }}</h4>
                <p class="text-ui-cap text-ui-muted truncate">{{ member.employee?.jobInformation?.job_title || "N/A" }}</p>
              </div>
              <UiBadge :tone="memberStatusTone(member)" dot class="shrink-0">{{ getMemberStatus(member) }}</UiBadge>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-3 border-t border-ui-line text-ui-cap text-ui-muted">
              <span class="inline-flex items-center gap-1.5">
                <Calendar class="w-3.5 h-3.5 text-ui-faint" />
                {{ member.joined_at ? `Joined ${formatDateUtil(member.joined_at)}` : "N/A" }}
              </span>
              <span class="inline-flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-ui-faint" />
                {{ member.employee?.jobInformation?.years_experience || 0 }} years experience
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="!loadingMembers && (!members || members.length === 0)"
          class="bg-ui-surface border border-ui-line rounded-ui-card"
        >
          <UiEmpty :icon="Users" title="No team members" message="Team members will appear here" />
        </div>
      </section>

      <!-- Projects Section -->
      <section v-if="activeTab === 'projects'" class="mb-6">
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">Team Projects</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">Projects assigned to {{ team?.name }}</p>
          </div>
          <UiBadge tone="outline" class="shrink-0">{{ projects?.length || 0 }} Projects</UiBadge>
        </div>

        <SkeletonCardGrid
          v-if="loadingProjects"
          :count="4"
          cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        />
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ui-stagger"
        >
          <CardList
            v-for="project in projects"
            :key="project.id"
            :data="project"
          />
        </div>

        <!-- Empty State -->
        <div
          v-if="!loadingProjects && (!projects || projects.length === 0)"
          class="bg-ui-surface border border-ui-line rounded-ui-card"
        >
          <UiEmpty :icon="Folder" title="No projects assigned" message="Projects assigned to your team will appear here" />
        </div>
      </section>

      <!-- Description Section -->
      <UiCard v-if="activeTab === 'description'" title="Team Description" subtitle="Team overview and details" class="mb-6 ui-anim-fade-up">
        <div class="space-y-5">
          <div>
            <h4 class="text-ui-h3 text-ui-ink mb-1.5">Description</h4>
            <p class="text-ui-body text-ui-text leading-relaxed">
              {{ team?.description || "No description available" }}
            </p>
          </div>

          <div v-if="team?.responsibilities?.length">
            <h4 class="text-ui-h3 text-ui-ink mb-2">Responsibilities</h4>
            <ul class="space-y-2">
              <li
                v-for="(responsibility, index) in team.responsibilities"
                :key="index"
                class="flex items-start gap-2.5 text-ui-body text-ui-text"
              >
                <CheckCircle class="w-4 h-4 text-ui-ok mt-0.5 shrink-0" />
                <span>{{ responsibility }}</span>
              </li>
            </ul>
          </div>
        </div>
      </UiCard>
    </div>
  </div>
</template>
