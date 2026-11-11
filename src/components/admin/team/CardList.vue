<script setup>
import { CheckCircle, Eye, Edit, Users2 } from "lucide-vue-next";
import Avatar from "@/components/common/Avatar.vue";
import { UiBadge, UiButton } from "@/components/ui";

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

// Team status -> badge tone (the label is always shown next to it).
const STATUS_TONE = { active: "ok", forming: "info", planning: "warn", dormant: "neutral" };
const statusTone = (status) => STATUS_TONE[status] || "neutral";
</script>
<template>
  <div
    class="ui-lift bg-ui-surface border border-ui-line rounded-ui-card hover:border-ui-line-strong p-[18px] flex flex-col"
  >
    <div class="flex items-start gap-3">
      <div
        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-[10px] bg-ui-accent-soft text-ui-accent overflow-hidden"
      >
        <img
          v-if="data.icon"
          :src="data.icon"
          alt="Team Icon"
          class="w-6 h-6 object-contain"
        />
        <Users2 v-else class="w-5 h-5" />
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-ui-h3 text-ui-ink truncate">{{ data.name }}</h4>
        <p class="text-ui-small text-ui-muted">
          {{ data.members_count }} members
        </p>
      </div>
      <UiBadge :tone="statusTone(data.status)" dot class="capitalize shrink-0">
        {{ data.status }}
      </UiBadge>
    </div>

    <div class="border-t border-ui-line my-3.5"></div>

    <!-- Team Leader Section -->
    <div class="flex items-center gap-2.5" v-if="data.leader">
      <Avatar
        :src="data.leader.profile_photo"
        :alt="data.leader.name"
        size="w-9 h-9"
        icon-size="w-5 h-5"
      />
      <div class="flex-1 min-w-0">
        <h5 class="text-ui-small font-medium text-ui-ink truncate">
          {{ data.leader.name }}
        </h5>
        <p class="text-ui-cap text-ui-muted truncate">
          {{ data.leader?.employee_profile?.job_information?.job_title }}
        </p>
      </div>
      <UiBadge tone="accent" class="shrink-0">Team Leader</UiBadge>
    </div>

    <!-- Team Leader Section Not Found -->
    <div
      v-else
      class="h-9 rounded-ui-control border border-dashed border-ui-line-strong flex items-center justify-center text-ui-cap text-ui-faint"
    >
      No Leader
    </div>

    <!-- Stats Section -->
    <ul class="space-y-1.5 mt-3.5 mb-4 text-ui-small text-ui-muted">
      <li class="flex items-center gap-2">
        <CheckCircle class="w-4 h-4 text-ui-faint shrink-0" />
        <span class="tabular-nums">{{ data.responsibilities?.length }} responsibilities</span>
      </li>
      <li class="flex items-center gap-2">
        <CheckCircle class="w-4 h-4 text-ui-faint shrink-0" />
        <span class="tabular-nums">{{ data.projects_count }} active projects</span>
      </li>
      <li class="flex items-center gap-2">
        <CheckCircle class="w-4 h-4 text-ui-faint shrink-0" />
        <span class="tabular-nums">0 completed tasks</span>
      </li>
    </ul>

    <div class="flex gap-2 mt-auto">
      <UiButton
        variant="secondary"
        size="sm"
        class="flex-1"
        :icon="Eye"
        :to="{ name: 'admin.team.detail', params: { id: data.id } }"
      >
        View
      </UiButton>
      <UiButton
        variant="secondary"
        size="sm"
        class="flex-1"
        :icon="Edit"
        :to="{ name: 'admin.team.edit', params: { id: data.id } }"
      >
        Edit
      </UiButton>
    </div>
  </div>
</template>
