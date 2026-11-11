<script setup>
import { Building, Calendar, Edit, Share, Users, Users2 } from "lucide-vue-next";
import { capitalize } from "lodash-es";
import { formatToClientTimezone } from "@/helpers/format";
import { UiBadge, UiButton } from "@/components/ui";

const props = defineProps({
  team: {
    type: Object,
    required: true,
  },
});
</script>
<template>
  <div class="flex flex-col sm:flex-row sm:items-center gap-4">
    <div class="flex items-center gap-4 min-w-0 flex-1">
      <div
        class="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full bg-ui-accent-soft text-ui-accent flex items-center justify-center overflow-hidden"
      >
        <img
          v-if="team.icon"
          class="w-7 h-7 sm:w-8 sm:h-8 object-contain"
          :src="team.icon"
          :alt="$t('teams.form.icon.label')"
        />
        <Users2 v-else class="w-7 h-7" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2.5 flex-wrap min-w-0">
          <h1 class="text-ui-h1 text-ui-ink break-words min-w-0">
            {{ team.name }}
          </h1>
          <UiBadge tone="info" dot>{{ $t("teams.detail.verified") }}</UiBadge>
        </div>
        <div
          class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-ui-small text-ui-muted"
        >
          <span class="inline-flex items-center gap-1.5">
            <Users class="w-3.5 h-3.5 text-ui-faint" />
            <span class="tabular-nums">{{ $t("teams.detail.membersOf", { n: team.members_count, size: team.expected_size }) }}</span>
          </span>
          <span class="inline-flex items-center gap-1.5">
            <Building class="w-3.5 h-3.5 text-ui-faint" />
            {{ team.department && $te(`orgchart.departments.${team.department}`) ? $t(`orgchart.departments.${team.department}`) : capitalize(team.department) }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <Calendar class="w-3.5 h-3.5 text-ui-faint" />
            {{ formatToClientTimezone(team.created_at) }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex gap-2 shrink-0">
      <UiButton variant="secondary" :icon="Share" class="flex-1 sm:flex-none">
        {{ $t("teams.detail.share") }}
      </UiButton>
      <UiButton
        :icon="Edit"
        :to="{ name: 'admin.team.edit', params: { id: team.id } }"
        class="flex-1 sm:flex-none"
      >
        {{ $t("teams.detail.edit") }}
      </UiButton>
    </div>
  </div>
</template>
