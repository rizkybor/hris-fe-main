<script setup>
import { computed, onMounted, ref } from "vue";
import { useListState } from "@/composables/useListState";
import { useVisitedTabs } from "@/composables/useVisitedTabs";
import { invalidate } from "@/composables/useStaleFetch";
import { useLookupStore } from "@/stores/lookups";
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
import { UiBadge, UiButton, UiEmpty } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const teamStore = useTeamStore();
const { loading, success, error } = storeToRefs(teamStore);
const { fetchTeam, deleteTeam } = teamStore;

const team = ref({});
const showDeleteModal = ref(false);
const showAllMembers = ref(false);

// The tab is in the URL (?tab=members) so a reload or shared link opens it;
// each tab mounts on first open and is then kept (v-show).
const tabState = useListState("team-detail", { tab: "overview" }, { remember: false });
const activeTab = computed({
  get: () => (["overview", "members"].includes(tabState.tab) ? tabState.tab : "overview"),
  set: (v) => (tabState.tab = v),
});
const visited = useVisitedTabs(() => activeTab.value);
const tabs = computed(() => [
  { key: "overview", label: t("teams.detail.tabs.overview") },
  { key: "members", label: t("teams.detail.tabs.members"), count: (team.value.members || []).length },
]);

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
    invalidate("teams");
    useLookupStore().invalidate("teams");
    showDeleteModal.value = false;
    router.push({ name: "admin.teams" });
  }
};

// Statistics and chart data only need the id from the route, so all three
// load at once instead of waiting for the team.
onMounted(() => {
  teamStore.fetchTeamStatistics(id);
  teamStore.fetchTeamChartData(id);
  handleFetchTeam();
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <Alert type="success" :title="success" :show="success" @close="teamStore.clearMessages()" />

    <Header :team="team" />

    <!-- Tabs -->
    <div class="border-b border-ui-line -mt-1">
      <nav class="flex gap-6 overflow-x-auto [scrollbar-width:none]" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          class="relative shrink-0 inline-flex items-center gap-1.5 pb-3 pt-1 text-ui-body font-medium whitespace-nowrap transition-colors"
          :class="activeTab === tab.key ? 'text-ui-ink' : 'text-ui-muted hover:text-ui-ink'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count !== undefined" class="text-ui-cap tabular-nums text-ui-faint">{{ tab.count }}</span>
          <span
            v-if="activeTab === tab.key"
            class="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-ui-ink"
          ></span>
        </button>
      </nav>
    </div>

    <!-- Overview -->
    <div v-if="visited.has('overview')" v-show="activeTab === 'overview'" class="space-y-5">
      <Statistic :team="team" :team-id="id" />

      <Chart :team="team" :team-id="id" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
        <!-- Team Responsibilities -->
        <section class="lg:col-span-2 bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
          <div class="flex items-start gap-3 mb-4">
            <ListCheck class="w-4 h-4 text-ui-faint mt-0.5 shrink-0" />
            <div>
              <h3 class="text-ui-h2 text-ui-ink">{{ $t("teams.form.responsibilities.title") }}</h3>
              <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("teams.detail.responsibilitiesSubtitle") }}</p>
            </div>
          </div>
          <ul class="divide-y divide-ui-line">
            <li
              class="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              v-for="responsibility in team.responsibilities"
              :key="responsibility.id"
            >
              <span
                class="w-5 h-5 shrink-0 mt-px rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center"
              >
                <Check class="w-3 h-3" />
              </span>
              <span class="text-ui-body text-ui-ink">{{ responsibility }}</span>
            </li>
          </ul>
        </section>

        <div class="space-y-4 sm:space-y-5">
          <!-- Team Lead Information -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
            <div class="flex items-start justify-between gap-3 mb-4">
              <div class="flex items-start gap-3">
                <Crown class="w-4 h-4 text-ui-faint mt-0.5 shrink-0" />
                <div>
                  <h3 class="text-ui-h3 text-ui-ink">{{ $t("teams.form.lead.title") }}</h3>
                  <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("teams.detail.leadSubtitle") }}</p>
                </div>
              </div>
              <UiBadge tone="ok" dot>{{ $t("common.labels.active") }}</UiBadge>
            </div>

            <div v-if="team.leader">
              <!-- Team Lead Profile -->
              <div class="flex items-center gap-3">
                <div class="relative shrink-0">
                  <Avatar
                    :src="team.leader.profile_photo"
                    :alt="team.leader.name"
                    size="w-10 h-10"
                    icon-size="w-5 h-5"
                  />
                  <span
                    class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-ui-ok border-2 border-ui-surface rounded-full"
                  ></span>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-ui-h3 text-ui-ink truncate">{{ team.leader?.name }}</h4>
                  <p class="text-ui-small text-ui-muted truncate">
                    {{ team.leader?.employee_profile?.job_information?.job_title }}
                  </p>
                </div>
                <UiBadge tone="accent" class="shrink-0">{{ $t("teams.form.lead.title") }}</UiBadge>
              </div>

              <!-- Contact Information -->
              <h5 class="text-ui-over uppercase text-ui-faint mt-5 mb-1">{{ $t("teams.detail.contactInfo") }}</h5>
              <dl class="divide-y divide-ui-line">
                <div class="flex items-center gap-3 py-2.5">
                  <Mail class="w-4 h-4 text-ui-faint shrink-0" />
                  <div class="min-w-0 flex-1">
                    <dt class="text-ui-cap text-ui-muted">{{ $t("teams.detail.emailAddress") }}</dt>
                    <dd class="text-ui-body text-ui-ink truncate">{{ team.leader.email }}</dd>
                  </div>
                </div>
                <div class="flex items-center gap-3 py-2.5">
                  <Phone class="w-4 h-4 text-ui-faint shrink-0" />
                  <div class="min-w-0 flex-1">
                    <dt class="text-ui-cap text-ui-muted">{{ $t("teams.detail.phoneNumber") }}</dt>
                    <dd class="text-ui-body text-ui-ink tabular-nums">{{ team?.leader?.employee_profile?.phone }}</dd>
                  </div>
                </div>
              </dl>

              <!-- Action Buttons -->
              <UiButton
                variant="secondary"
                block
                class="mt-3"
                :icon="UserCheck"
                :to="{
                  name: 'admin.employees.detail',
                  params: { id: team.leader?.employee_profile?.id },
                }"
              >
                {{ $t("teams.detail.viewProfile") }}
              </UiButton>
            </div>

            <UiEmpty
              v-else
              compact
              :icon="Crown"
              :title="$t('teams.detail.noLead')"
              :message="$t('teams.detail.noLeadHint')"
            />
          </section>

          <!-- Danger Zone -->
          <section class="bg-ui-surface border border-ui-bad/30 rounded-ui-card p-5">
            <div class="flex items-start gap-3 mb-3">
              <AlertTriangle class="w-4 h-4 text-ui-bad mt-0.5 shrink-0" />
              <div>
                <h3 class="text-ui-h3 text-ui-bad">{{ $t("teams.detail.dangerZone") }}</h3>
                <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("teams.detail.dangerZoneHint") }}</p>
              </div>
            </div>
            <h4 class="text-ui-small font-medium text-ui-ink">{{ $t("teams.detail.disband") }}</h4>
            <p class="text-ui-small text-ui-muted mt-0.5 mb-3.5">
              {{ $t("teams.detail.disbandHint") }}
            </p>
            <UiButton variant="danger" :icon="Trash2" class="w-full sm:w-auto" @click="showDeleteModal = true">
              {{ $t("teams.detail.disband") }}
            </UiButton>
          </section>
        </div>
      </div>
    </div>

    <!-- Team Members -->
    <section v-if="visited.has('members')" v-show="activeTab === 'members'" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-start gap-3">
          <Users class="w-4 h-4 text-ui-faint mt-0.5 shrink-0" />
          <div>
            <h3 class="text-ui-h2 text-ui-ink">{{ $t("teams.detail.tabs.members") }}</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("teams.detail.membersSubtitle") }}</p>
          </div>
        </div>
        <UiButton
          v-if="hasMoreMembers"
          variant="secondary"
          size="sm"
          :icon="Eye"
          @click="showAllMembers = !showAllMembers"
        >
          {{ showAllMembers ? $t("teams.detail.viewLess") : $t("teams.detail.viewMore") }}
        </UiButton>
      </div>

      <!-- Members Grid -->
      <div
        v-if="visibleMembers.length"
        class="ui-tray rounded-ui-control p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
      >
        <!-- Team Member Card -->
        <div
          class="ui-lift bg-ui-surface border border-ui-line rounded-ui-card hover:border-ui-line-strong p-4 flex flex-col"
          v-for="member in visibleMembers"
          :key="member.id"
        >
          <div class="flex items-start gap-3">
            <Avatar
              :src="member.employee.user?.profile_photo"
              :alt="member.employee.user?.name"
              size="w-10 h-10"
              icon-size="w-5 h-5"
            />
            <div class="flex-1 min-w-0">
              <h4 class="text-ui-h3 text-ui-ink truncate">
                {{ member.employee.user.name }}
              </h4>
              <p class="text-ui-small text-ui-muted truncate">
                {{ member.employee.job_information.job_title }}
              </p>
              <UiBadge v-if="isTeamLead(member)" tone="accent" class="mt-1.5 gap-1">
                <Crown class="w-3 h-3" />
                {{ $t("teams.form.lead.title") }}
              </UiBadge>
            </div>
          </div>
          <div class="space-y-1 mt-3 mb-4 text-ui-small text-ui-muted">
            <div class="flex items-center gap-2">
              <Calendar class="w-3.5 h-3.5 text-ui-faint shrink-0" />
              <span>{{ $t("teams.detail.joined", { date: formatToClientTimezone(member.joined_at) }) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Clock class="w-3.5 h-3.5 text-ui-faint shrink-0" />
              <span class="tabular-nums">{{ $t("teams.detail.experience", { n: member.employee.job_information.experience }, Number(member.employee.job_information.experience) || 0) }}</span>
            </div>
          </div>
          <UiButton
            variant="secondary"
            size="sm"
            block
            class="mt-auto"
            :icon="Eye"
            :to="{
              name: 'admin.employees.detail',
              params: { id: member.employee.id },
            }"
          >
            {{ $t("teams.detail.viewProfile") }}
          </UiButton>
        </div>
      </div>
      <UiEmpty v-else compact :icon="Users" :title="$t('teams.detail.noMembers')" />
    </section>

    <!-- Confirmation Modal -->
    <ConfirmationModal
      :show="showDeleteModal"
      :title="$t('teams.detail.disband')"
      :message="$t('teams.detail.disbandConfirm', { name: team.name })"
      :confirmText="$t('teams.detail.disband')"
      :cancelText="$t('common.actions.cancel')"
      type="danger"
      :loading="loading"
      @confirm="handleDeleteTeam"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
