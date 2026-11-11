<script setup>
import { can } from "@/helpers/permissionHelper";
import { capitalize } from "lodash-es";
import { Building, User, Calendar, Eye, Edit } from "lucide-vue-next";
import { useRouter } from "vue-router";
import Avatar from "@/components/common/Avatar.vue";
import { UiBadge, UiButton } from "@/components/ui";
import { getJobStatusText } from "@/utils/formatUtils.js";

// Presentation only: job status -> badge tone.
const STATUS_TONES = { active: "ok", on_leave: "warn", resigned: "bad" };
const statusTone = (status) => STATUS_TONES[status] || "neutral";

const router = useRouter();

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const goToEdit = () => {
  router.push({ name: "admin.employees.edit", params: { id: props.data.id } });
};

const goToDetail = () => {
  router.push({
    name: "admin.employees.detail",
    params: { id: props.data.id },
  });
};
</script>

<template>
  <div class="ui-lift group flex flex-col bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-[18px] hover:border-ui-line-strong">
    <div class="flex items-start gap-3">
      <Avatar
        :src="data?.user?.profile_photo"
        :alt="data?.user?.name"
        size="w-10 h-10"
        icon-size="w-5 h-5"
        class="shrink-0"
      />
      <div class="flex-1 min-w-0">
        <h4 class="text-ui-h3 text-ui-ink truncate" :title="data?.user?.name">
          <button type="button" class="text-left hover:underline focus:outline-none focus-visible:shadow-ui-focus rounded" @click="goToDetail">
            {{ data?.user?.name }}
          </button>
        </h4>
        <p class="text-ui-small text-ui-muted truncate">
          {{ capitalize(data?.job_information?.job_title) }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 mt-3">
      <UiBadge v-if="data?.job_information?.skill_level" tone="neutral">
        {{ capitalize(data?.job_information?.skill_level) }}
      </UiBadge>
      <UiBadge :tone="statusTone(data?.job_information?.status)" dot>
        {{ getJobStatusText(data?.job_information?.status) }}
      </UiBadge>
      <UiBadge v-if="data?.user?.is_active === false" tone="bad">
        Login Disabled
      </UiBadge>
    </div>

    <!-- Employee Details -->
    <div class="mt-3.5 pt-3.5 border-t border-ui-line flex flex-wrap gap-x-4 gap-y-1.5 sm:block sm:space-y-1.5 text-ui-small text-ui-muted">
      <div class="flex items-center gap-2 min-w-0">
        <Building class="w-3.5 h-3.5 text-ui-faint shrink-0" />
        <span class="truncate">{{ capitalize(data?.job_information?.work_location) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <User class="w-3.5 h-3.5 text-ui-faint shrink-0" />
        <span>{{ capitalize(data?.gender) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <Calendar class="w-3.5 h-3.5 text-ui-faint shrink-0" />
        <span class="tabular-nums">{{ data?.job_information?.years_experience }} years experience</span>
      </div>
    </div>

    <div class="flex-1"></div>
    <div class="flex gap-2 mt-4">
      <UiButton variant="secondary" size="sm" :icon="Eye" class="flex-1" @click="goToDetail">
        View
      </UiButton>
      <UiButton v-if="can('employee-edit')" variant="ghost" size="sm" :icon="Edit" class="flex-1" @click="goToEdit">
        Edit
      </UiButton>
    </div>
  </div>
</template>
