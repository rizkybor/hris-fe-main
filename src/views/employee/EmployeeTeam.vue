<script setup>
import { computed } from "vue";
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
  Mail,
  Phone,
  UserRound,
  AlertTriangle,
} from "lucide-vue-next";
import { useEmployeeStore } from "@/stores/employee";
import { useAuthStore } from "@/stores/auth";
import { formatDate as formatDateUtil } from "@/utils/dateUtils.js";
import { getProjectHealth } from "@/utils/projectHealth";
import { canOneOf } from "@/helpers/permissionHelper";
import Avatar from "@/components/common/Avatar.vue";
import { useScrollFade } from "@/composables/useScrollFade";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { UiBadge, UiCard, UiEmpty, UiSpinner, UiStat } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t, te } = useI18n();

const employeeStore = useEmployeeStore();
const authStore = useAuthStore();
const myUserId = computed(() => authStore.user?.id ?? null);

// Team, members and projects live in the employee store (one parallel
// load), so coming back shows them at once and refreshes quietly.
const { loading, refreshing } = useStaleFetch(() => employeeStore.loadMyTeamBundle(myUserId.value), {
  key: () => ["ws-my-team", myUserId.value],
  hasData: () => employeeStore.myTeamLoaded && employeeStore.myTeamFor === myUserId.value,
  maxAge: 60_000,
});
const ready = computed(() => employeeStore.myTeamLoaded && employeeStore.myTeamFor === myUserId.value);
const team = computed(() => (ready.value ? employeeStore.myTeam : null));
const members = computed(() => (ready.value ? employeeStore.myTeamMembers || [] : []));
const projects = computed(() => (ready.value ? employeeStore.myTeamProjects || [] : []));

// Tab in the URL (?tab=) so back/reload keep it.
const TAB_IDS = ["members", "projects", "description"];
const tabState = useListState("my-team", { tab: "members" }, { remember: false });
const activeTab = computed({
  get: () => (TAB_IDS.includes(tabState.tab) ? tabState.tab : "members"),
  set: (v) => (tabState.tab = v),
});
const { scrollRef: tabScrollRef, showLeftFade: showTabLeftFade, showRightFade: showTabRightFade, updateFade: updateTabFade } = useScrollFade();

const activeMembers = computed(() => members.value.filter((m) => !m.left_at).length);

const activeMembersStatus = computed(() => {
  const expected = team.value?.expected_size || 0;
  const active = activeMembers.value;
  if (active >= expected) return t("myTeam.capacity.full");
  if (active >= expected * 0.8) return t("myTeam.capacity.nearlyFull");
  return t("myTeam.capacity.growing");
});

// Returns a status key (left / lead / active); label: myTeam.memberStatus.<key>.
const getMemberStatus = (member) => {
  if (member.left_at) return "left";
  const isLeader = member.employee?.user?.id === team.value?.leader?.id;
  return isLeader ? "lead" : "active";
};

// The API sends job_information (older code read jobInformation).
const memberJob = (member) => member.employee?.job_information || member.employee?.jobInformation || {};

// Lead first, then active members, people who left last.
const STATUS_ORDER = { lead: 0, active: 1, left: 2 };
const sortedMembers = computed(() =>
  [...members.value].sort((a, b) => STATUS_ORDER[getMemberStatus(a)] - STATUS_ORDER[getMemberStatus(b)])
);

// Quick actions on a member: mail, call, and their employee page when the
// user may open it (same permission the employee detail API checks).
const canViewEmployee = computed(() => canOneOf(["employee-list", "employee-create", "employee-edit", "employee-delete"]));
const canOpenProject = computed(() => canOneOf(["project-list", "project-create", "project-edit", "project-delete"]));
const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;

// Presentation-only (redesign): badge tones for team + member status.
const TEAM_STATUS_TONES = { active: "ok", inactive: "bad", archived: "neutral" };
const teamStatusTone = (status) => TEAM_STATUS_TONES[status?.toLowerCase()] || "info";
const MEMBER_STATUS_TONES = { left: "neutral", lead: "info", active: "ok" };
const memberStatusTone = (member) => MEMBER_STATUS_TONES[getMemberStatus(member)] || "neutral";
const teamTabs = computed(() => [
  { id: "members", label: t("myTeam.tabs.members"), icon: Users },
  { id: "projects", label: t("myTeam.tabs.projects"), icon: Folder },
  { id: "description", label: t("myTeam.tabs.description"), icon: FileText },
]);
// Team status display label; unknown values show as sent.
const teamStatusLabel = (status) =>
  te(`profile.enums.teamStatus.${status}`) ? t(`profile.enums.teamStatus.${status}`) : status;

// ---- Projects: compact rows, open work first (soonest end date first) ----
const PROJECT_STATUS_TONE = { draft: "neutral", planning: "info", active: "accent", on_hold: "warn", completed: "ok", cancelled: "outline" };
const projectStatusLabel = (status) =>
  te(`myTeam.projectStatus.${status}`) ? t(`myTeam.projectStatus.${status}`) : status || "-";
const HEALTH_TONE = { overdue: "bad", critical: "bad", "at-risk": "warn", behind: "warn" };
const isClosed = (p) => p.status === "completed" || p.status === "cancelled";
const projectRows = computed(() =>
  [...projects.value]
    .sort((a, b) => {
      if (isClosed(a) !== isClosed(b)) return isClosed(a) ? 1 : -1;
      return String(a.end_date || "9999").localeCompare(String(b.end_date || "9999"));
    })
    .map((p) => {
      const health = getProjectHealth(p);
      return {
        ...p,
        progressPct: Math.max(0, Math.min(100, Math.round(p.progress ?? 0))),
        health: health && health.level !== "on-track" ? { label: health.label, tone: HEALTH_TONE[health.level] || "warn" } : null,
      };
    })
);
const openProjects = computed(() => projects.value.filter((p) => !isClosed(p)).length);
</script>

<template>
  <div class="px-1 py-2 sm:px-4 sm:py-4 lg:px-5">
    <!-- Loading State -->
    <UiSpinner v-if="loading && !ready" size="28px" :label="$t('myTeam.loading')" class="py-24" />

    <!-- No Team Assigned -->
    <div v-else-if="!team" class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
      <UiEmpty
        :icon="Users"
        :title="$t('myTeam.noTeam.title')"
        :message="$t('myTeam.noTeam.message')"
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
            <UiBadge v-if="team?.status" :tone="teamStatusTone(team.status)" dot>{{ teamStatusLabel(team.status) }}</UiBadge>
            <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted" role="status">
              <UiSpinner size="14px" />{{ $t("myTeam.refreshing") }}
            </span>
          </div>
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-2 text-ui-small text-ui-muted">
            <span class="inline-flex items-center gap-1.5"><Users class="w-3.5 h-3.5 text-ui-faint" />{{ $t("profile.view.team.members", { n: members?.length || 0 }, members?.length || 0) }}</span>
            <span class="inline-flex items-center gap-1.5"><Building class="w-3.5 h-3.5 text-ui-faint" />{{ team?.department || $t("common.duration.na") }}</span>
            <span class="inline-flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5 text-ui-faint" />{{ team?.created_at ? formatDateUtil(team.created_at) : $t("common.duration.na") }}</span>
          </div>
        </div>
      </div>

      <!-- Team Statistics -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 ui-stagger">
        <UiStat :label="$t('myTeam.stats.activeMembers')" :icon="Users" :value="activeMembers" :hint="activeMembersStatus" />
        <UiStat :label="$t('myTeam.stats.projectsAssigned')" :icon="Folder" :value="projects?.length || 0" :hint="$t('myTeam.stats.openCount', { n: openProjects })" />
        <UiStat :label="$t('myTeam.stats.expectedSize')" :icon="TrendingUp" :value="team?.expected_size || 0" :hint="$t('myTeam.stats.teamCapacity')" />
        <UiStat :label="$t('profile.view.team.lead')" :icon="User" :hint="$t('myTeam.stats.leader')">
          <span class="text-ui-h2">{{ team?.leader?.name || $t("common.duration.na") }}</span>
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
          <h3 class="text-ui-h2 text-ui-ink">{{ $t("myTeam.members.title") }}</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("myTeam.members.subtitle") }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ui-stagger">
          <div
            v-for="member in sortedMembers"
            :key="member.id"
            class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-[18px] min-w-0 flex flex-col"
            :class="member.left_at ? 'opacity-70' : ''"
          >
            <div class="flex items-center gap-3">
              <Avatar
                :src="member.employee?.user?.profile_photo"
                :alt="member.employee?.user?.name"
                size="w-10 h-10"
                icon-size="w-5 h-5"
              />
              <div class="min-w-0 flex-1">
                <RouterLink
                  v-if="canViewEmployee && member.employee?.id"
                  :to="{ name: 'admin.employees.detail', params: { id: member.employee.id } }"
                  class="block text-ui-h3 text-ui-ink truncate hover:text-ui-accent"
                >{{ member.employee?.user?.name || $t("common.duration.na") }}</RouterLink>
                <h4 v-else class="text-ui-h3 text-ui-ink truncate">{{ member.employee?.user?.name || $t("common.duration.na") }}</h4>
                <p class="text-ui-cap text-ui-muted truncate">{{ memberJob(member).job_title || $t("common.duration.na") }}</p>
              </div>
              <UiBadge :tone="memberStatusTone(member)" dot class="shrink-0">{{ $t(`myTeam.memberStatus.${getMemberStatus(member)}`) }}</UiBadge>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-3 border-t border-ui-line text-ui-cap text-ui-muted">
              <span class="inline-flex items-center gap-1.5">
                <Calendar class="w-3.5 h-3.5 text-ui-faint" />
                {{ member.joined_at ? $t("profile.view.joined", { date: formatDateUtil(member.joined_at) }) : $t("common.duration.na") }}
              </span>
              <span class="inline-flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-ui-faint" />
                {{ $t("myTeam.members.experience", { n: memberJob(member).years_experience || 0 }, memberJob(member).years_experience || 0) }}
              </span>
            </div>
            <!-- Quick actions: always visible (phones have no hover) -->
            <div
              v-if="member.employee?.user?.email || member.employee?.phone || (canViewEmployee && member.employee?.id)"
              class="flex items-center gap-1.5 mt-3"
            >
              <a
                v-if="member.employee?.user?.email"
                :href="`mailto:${member.employee.user.email}`"
                class="ui-press inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-ui-control border border-ui-line text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
                :title="member.employee.user.email"
                :aria-label="$t('myTeam.members.emailTo', { name: member.employee?.user?.name })"
              ><Mail class="w-4 h-4" /></a>
              <a
                v-if="member.employee?.phone"
                :href="telHref(member.employee.phone)"
                class="ui-press inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-ui-control border border-ui-line text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
                :title="member.employee.phone"
                :aria-label="$t('myTeam.members.callTo', { name: member.employee?.user?.name })"
              ><Phone class="w-4 h-4" /></a>
              <RouterLink
                v-if="canViewEmployee && member.employee?.id"
                :to="{ name: 'admin.employees.detail', params: { id: member.employee.id } }"
                class="ui-press ml-auto inline-flex items-center justify-center gap-1.5 h-10 sm:h-8 px-2.5 rounded-ui-control text-ui-small font-medium text-ui-accent hover:bg-ui-hover"
              ><UserRound class="w-4 h-4" />{{ $t("myTeam.members.viewProfile") }}</RouterLink>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="members.length === 0"
          class="bg-ui-surface border border-ui-line rounded-ui-card"
        >
          <UiEmpty :icon="Users" :title="$t('myTeam.members.empty')" :message="$t('myTeam.members.emptyHint')" />
        </div>
      </section>

      <!-- Projects Section -->
      <section v-if="activeTab === 'projects'" class="mb-6">
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">{{ $t("myTeam.projects.title") }}</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("myTeam.projects.subtitle", { name: team?.name }) }}</p>
          </div>
          <UiBadge tone="outline" class="shrink-0">{{ $t("myTeam.projects.count", { n: projects?.length || 0 }, projects?.length || 0) }}</UiBadge>
        </div>

        <ul v-if="projectRows.length" class="bg-ui-surface border border-ui-line rounded-ui-card divide-y divide-ui-line overflow-hidden ui-stagger">
          <li v-for="project in projectRows" :key="project.id">
            <component
              :is="canOpenProject ? 'RouterLink' : 'div'"
              :to="canOpenProject ? { name: 'admin.projects.detail', params: { id: project.id } } : undefined"
              class="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 min-w-0"
              :class="canOpenProject ? 'group hover:bg-ui-hover focus:outline-none focus-visible:bg-ui-hover' : ''"
            >
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p class="text-ui-h3 text-ui-ink truncate" :class="canOpenProject ? 'group-hover:text-ui-accent' : ''">{{ project.name }}</p>
                  <UiBadge :tone="PROJECT_STATUS_TONE[project.status] || 'neutral'" dot>{{ projectStatusLabel(project.status) }}</UiBadge>
                  <UiBadge v-if="project.health" :tone="project.health.tone"><AlertTriangle class="w-3 h-3" />{{ project.health.label }}</UiBadge>
                </div>
                <p class="text-ui-cap text-ui-muted truncate mt-0.5">
                  {{ project.client?.name || $t("myTeam.projects.noClient") }}
                  <span class="text-ui-faint">·</span>
                  {{ project.end_date ? $t("myTeam.projects.ends", { date: formatDateUtil(project.end_date) }) : $t("myTeam.projects.noEndDate") }}
                </p>
              </div>
              <div class="w-24 sm:w-36 shrink-0">
                <div class="flex justify-end text-ui-cap font-semibold text-ui-ink tabular-nums mb-1">{{ project.progressPct }}%</div>
                <div class="w-full bg-ui-subtle rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full" :class="project.progressPct >= 100 ? 'bg-ui-ok' : 'bg-ui-ink'" :style="{ width: `${project.progressPct}%` }"></div>
                </div>
              </div>
              <ChevronRight v-if="canOpenProject" class="w-4 h-4 text-ui-faint shrink-0" />
            </component>
          </li>
        </ul>

        <!-- Empty State -->
        <div
          v-if="projects.length === 0"
          class="bg-ui-surface border border-ui-line rounded-ui-card"
        >
          <UiEmpty :icon="Folder" :title="$t('myTeam.projects.empty')" :message="$t('myTeam.projects.emptyHint')" />
        </div>
      </section>

      <!-- Description Section -->
      <UiCard v-if="activeTab === 'description'" :title="$t('myTeam.description.title')" :subtitle="$t('myTeam.description.subtitle')" class="mb-6 ui-anim-fade-up">
        <div class="space-y-5">
          <div>
            <h4 class="text-ui-h3 text-ui-ink mb-1.5">{{ $t("common.labels.description") }}</h4>
            <p class="text-ui-body text-ui-text leading-relaxed">
              {{ team?.description || $t("myTeam.description.empty") }}
            </p>
          </div>

          <div v-if="team?.responsibilities?.length">
            <h4 class="text-ui-h3 text-ui-ink mb-2">{{ $t("myTeam.description.responsibilities") }}</h4>
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
