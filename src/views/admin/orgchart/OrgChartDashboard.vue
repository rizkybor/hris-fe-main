<script setup>
import { ref, onMounted } from "vue";
import { Network, Crown, User, Users } from "lucide-vue-next";
import { useTeamStore } from "@/stores/team";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import Avatar from "@/components/common/Avatar.vue";
import { UiPageHeader, UiEmpty } from "@/components/ui";

const teamStore = useTeamStore();
const departments = ref([]);
const loading = ref(true);

const departmentLabels = {
  development: "Development",
  design: "Design",
  marketing: "Marketing",
  sales: "Sales",
  support: "Support",
  management: "Management",
};

onMounted(async () => {
  try {
    departments.value = await teamStore.fetchOrgChart();
  } catch (error) {
    console.error("Failed to fetch org chart:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Organization Chart" subtitle="Company structure by department and team" class="ui-anim-fade-up" />

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="space-y-2.5">
        <Skeleton height="88px" rounded="12px" />
        <Skeleton height="120px" rounded="12px" />
      </div>
    </div>

    <UiEmpty
      v-else-if="departments.length === 0"
      :icon="Network"
      title="No active teams available."
      class="bg-ui-surface border border-ui-line rounded-ui-card"
    />

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-6 items-start ui-stagger">
      <section v-for="dept in departments" :key="dept.department" class="min-w-0">
        <!-- Phones: section label (app list style) -->
        <h2 class="sm:hidden px-1 mb-2 text-ui-over uppercase text-ui-muted">
          {{ departmentLabels[dept.department] ?? dept.department }} · {{ dept.teams.length }} teams
        </h2>
        <!-- Tablet / desktop: department node -->
        <header class="hidden sm:block bg-ui-surface border border-ui-ink rounded-ui-card px-4 py-3.5">
          <p class="text-ui-over uppercase text-ui-muted">Department</p>
          <h2 class="text-ui-h2 text-ui-ink truncate mt-0.5">{{ departmentLabels[dept.department] ?? dept.department }}</h2>
          <p class="text-ui-cap text-ui-muted mt-1 tabular-nums">{{ dept.teams.length }} teams</p>
        </header>

        <!-- Teams: grouped card on phones, a branch of cards from sm up -->
        <ul
          class="bg-ui-surface border border-ui-line rounded-ui-card divide-y divide-ui-line overflow-hidden sm:overflow-visible sm:bg-transparent sm:rounded-none sm:divide-y-0 sm:border-y-0 sm:border-r-0 sm:border-ui-line-strong sm:ml-3 sm:pl-3 sm:pt-3 space-y-0 sm:space-y-2.5"
        >
          <li v-for="team in dept.teams" :key="team.id" class="px-4 py-3.5 sm:bg-ui-surface sm:border sm:border-ui-line sm:rounded-ui-card">
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-ui-h3 text-ui-ink truncate">{{ team.name }}</p>
                <p class="flex items-center gap-1.5 mt-1 text-ui-cap text-ui-muted min-w-0">
                  <Crown class="w-3.5 h-3.5 text-ui-faint shrink-0" />
                  <span class="truncate">Lead: {{ team.lead ?? '-' }}</span>
                </p>
              </div>
              <span class="inline-flex items-center gap-1 text-ui-cap text-ui-muted tabular-nums shrink-0">
                <Users class="w-3.5 h-3.5 text-ui-faint" />{{ team.members.length }}
              </span>
            </div>

            <ul v-if="team.members.length" class="mt-3 pt-3 border-t border-ui-line space-y-2">
              <li v-for="member in team.members" :key="member.employee_id" class="flex items-center gap-2.5 min-w-0">
                <Avatar :alt="member.name" size="w-7 h-7" icon-size="w-3.5 h-3.5" />
                <div class="min-w-0">
                  <p class="text-ui-small font-medium text-ui-ink truncate">{{ member.name }}</p>
                  <p class="text-ui-cap text-ui-muted truncate">{{ member.job_title }}</p>
                </div>
              </li>
            </ul>
            <p v-else class="mt-3 pt-3 border-t border-ui-line flex items-center gap-1.5 text-ui-cap text-ui-faint">
              <User class="w-3.5 h-3.5" />No members yet
            </p>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
