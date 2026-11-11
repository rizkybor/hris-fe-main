<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useEmployeeStore } from "@/stores/employee";
import { useTaskStore } from "@/stores/task";
import { useAssetStore } from "@/stores/asset";
import { usePerformanceReviewStore } from "@/stores/performanceReview";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { getJobStatusColor, getLevelColor } from "@/utils/styleHelpers.js";
import { formatDateLong as formatDate } from "@/utils/dateUtils.js";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";
import Avatar from "@/components/common/Avatar.vue";
import {
  formatRupiah as formatCurrency,
  capitalize,
} from "@/utils/formatUtils.js";
import {
  Edit,
  CheckCircle,
  CalendarCheck,
  Folder,
  TrendingUp,
  Contact,
  Briefcase,
  MapPin,
  Phone,
  Users,
  ListChecks,
  Calendar,
  Code,
  Building,
  User,
  Clock,
  Laptop,
  Star,
  LayoutGrid,
  Wallet,
  ChevronRight,
  CreditCardIcon,
  Download,
} from "lucide-vue-next";
import { useScrollFade } from "@/composables/useScrollFade";
import { UiBadge, UiButton, UiCard, UiEmpty, UiStat } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";

const employeeStore = useEmployeeStore();
const { loading, performanceStatistics } = storeToRefs(employeeStore);
const taskStore = useTaskStore();
const { myTasks } = storeToRefs(taskStore);
const assetStore = useAssetStore();
const reviewStore = usePerformanceReviewStore();

// assetStore/reviewStore are plain (untyped) JS Pinia stores, so their
// state infers as never[] when consumed from this <script setup lang="ts">
// block -- cast to any[] here rather than typing the stores themselves.
const myAssets = computed(() => assetStore.myAssets as any[]);
const myReviews = computed(() => reviewStore.myReviews as any[]);
const router = useRouter();

const acknowledgeReview = async (id: number) => {
  try {
    await reviewStore.acknowledgeReview(id);
    await reviewStore.fetchMyReviews();
  } catch (error) {}
};

const profile = ref<any>(null);
const profileNotFound = ref(false);

// These three mirror PHP behavior exactly (ucwords() and Str::limit()'s
// defaults) so the ID card preview's job title/phone/email match the
// downloaded PDF's content character-for-character, rather than relying on
// this app's own capitalize() helper (which only capitalizes the first
// letter of the whole string, not each word) or CSS ellipsis (which
// truncates by pixel width, not by the same character count as the PDF).
const idCardUcwords = (str: string) => (str || "").replace(/(^|\s)\S/g, (c: string) => c.toUpperCase());
const idCardStrLimit = (str: string, limit: number, end = "...") => (str.length > limit ? str.slice(0, limit) + end : str);
const idCardJobTitle = computed(() => idCardStrLimit(idCardUcwords(profile.value?.job_information?.job_title || "-"), 32));
const idCardPhone = computed(() => idCardStrLimit(profile.value?.phone || "-", 26));
const idCardEmail = computed(() => idCardStrLimit(profile.value?.user?.email || "-", 30));
// Profile photo printed on the card, if the user has one.
const idCardPhoto = computed(() => profile.value?.user?.profile_photo || "");
// Same rule as id-card.blade.php: no photo -> nothing drawn, name moves up.
const idCardNameTop = computed(() => (idCardPhoto.value && !idCardPhotoFailed.value ? 139 : 90));
const idCardPhotoFailed = ref(false);

// Mirrors the PHP line-splitting in id-card.blade.php exactly, so the ID
// card preview breaks the name onto the same two lines, at the same
// position, as the downloaded PDF -- rather than leaving it to the
// browser's own text wrapping, which could pick different break points.
//
// The degree/title suffix (e.g. ", S.Kom.") is treated as part of the word
// it's attached to, never split from it. Line 1 always takes the first two
// name words; everything after that -- including the trailing degree --
// goes to line 2. A name of two words or fewer (with or without a degree)
// fits entirely on line 1.
const ID_CARD_NAME_MAX_CHARS = 28; // = $maxChars in id-card.blade.php
const idCardNameLines = computed(() => {
  const name = (profile.value?.user?.name ?? "-").trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { line1: "-", line2: "" };

  const commaIdx = words.findIndex((word: string) => word.includes(","));
  const nameWordCount = commaIdx === -1 ? words.length : commaIdx + 1;

  let line1, line2;
  if (nameWordCount > 2) {
    line1 = words.slice(0, 2).join(" ");
    line2 = words.slice(2).join(" ");
  } else {
    line1 = words.join(" ");
    line2 = "";
  }

  if (line1.length > ID_CARD_NAME_MAX_CHARS) {
    line1 = line1.slice(0, ID_CARD_NAME_MAX_CHARS - 1) + "…";
  }
  if (line2.length > ID_CARD_NAME_MAX_CHARS) {
    line2 = line2.slice(0, ID_CARD_NAME_MAX_CHARS - 1) + "…";
  }
  return { line1, line2 };
});

const activeTab = ref("overview");
const { scrollRef: tabScrollRef, showLeftFade: showTabLeftFade, showRightFade: showTabRightFade, updateFade: updateTabFade } = useScrollFade();
const tabs = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "employment", label: "Employment & Team", icon: Wallet },
  { id: "emergency", label: "Emergency Contact", icon: Phone },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "more", label: "Assets & Reviews", icon: Star },
  { id: "idcard", label: "ID Card", icon: CreditCardIcon },
];

const downloadingIdCard = ref(false);
const downloadIdCard = async () => {
  downloadingIdCard.value = true;
  try {
    await employeeStore.downloadIdCard(profile.value?.code);
  } catch (error) {
    console.error("Error downloading ID card:", error);
  } finally {
    downloadingIdCard.value = false;
  }
};

const loadProfile = async () => {
  profileNotFound.value = false;
  try {
    profile.value = await employeeStore.fetchMyProfile();
    if (profile.value?.id) {
      await employeeStore.fetchPerformanceStatistics(profile.value.id);
    }
  } catch (error) {
    // System accounts (e.g. Super Admin) have no employee profile -- that's
    // expected, not a failure, so show an explanation instead of a blank page.
    profileNotFound.value = true;
  }
};

const taskStatusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Waiting",
  done: "Completed",
};

const taskStatusClasses: Record<string, string> = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-[#FEF3C7] text-[#D97706]",
  review: "bg-[#EBF8FF] text-[#1E40AF]",
  done: "bg-[#F0FDF4] text-[#166534]",
};

const latestTasks = computed(() =>
  myTasks.value.map((task: any) => ({
    id: task.id,
    title: task.name,
    description: task.description,
    status: taskStatusLabels[task.status] ?? task.status,
    statusClass: taskStatusClasses[task.status] ?? "bg-gray-100 text-gray-600",
    dueDate: task.due_date ? formatDate(task.due_date) : "No due date",
    project: task.project?.name ?? "N/A",
  }))
);

const goToAllTasks = () => {
  router.push({ name: "employee.tasks" });
};

const goToMyTeam = () => {
  router.push({ name: "employee.team" });
};

const statusBadgeClass = computed(() => {
  return getJobStatusColor(profile.value?.job_information?.status);
});

const skillLevelBadgeClass = computed(() => {
  return getLevelColor(capitalize(profile.value?.job_information?.skill_level));
});

// ---- Presentation-only helpers (redesign): badge tones + label/value rows ----
const JOB_STATUS_TONES: Record<string, string> = { active: "ok", on_leave: "warn", resigned: "bad" };
const jobStatusTone = computed(
  () => JOB_STATUS_TONES[String(profile.value?.job_information?.status || "").toLowerCase()] || "neutral"
);
const TASK_TONES: Record<string, string> = { "To Do": "neutral", "In Progress": "warn", Waiting: "info", Completed: "ok" };
const taskTone = (label: string) => TASK_TONES[label] || "neutral";
const assetConditionTone = (condition: string) => {
  const c = String(condition || "").toLowerCase();
  if (["good", "new", "excellent"].includes(c)) return "ok";
  if (["fair", "needs_repair", "maintenance"].includes(c)) return "warn";
  if (["damaged", "broken", "lost", "poor"].includes(c)) return "bad";
  return "neutral";
};

const personalRows = computed(() => [
  { label: "Email", value: profile.value?.user?.email },
  { label: "Phone", value: profile.value?.phone || "-" },
  { label: "Date of Birth", value: formatDate(profile.value?.date_of_birth) },
  { label: "Employee ID", value: profile.value?.code },
  { label: "Office Location", value: capitalize(profile.value?.job_information?.work_location) },
  { label: "Hobbies", value: profile.value?.hobby || "-" },
]);
const locationRows = computed(() => [
  { label: "Gender", value: capitalize(profile.value?.gender) },
  { label: "Place of Birth", value: profile.value?.place_of_birth || "-" },
  { label: "Address", value: profile.value?.address || "-" },
  { label: "City", value: profile.value?.city || "-" },
  { label: "Post Code", value: profile.value?.postal_code || "-" },
  { label: "Country", value: "Indonesia" },
]);
const employmentRows = computed(() => [
  { label: "Job Title", value: capitalize(profile.value?.job_information?.job_title) },
  { label: "Start Date", value: formatDate(profile.value?.job_information?.start_date) },
  { label: "Employment Type", value: capitalize(profile.value?.job_information?.employment_type) },
  { label: "Monthly Salary", value: formatCurrency(profile.value?.job_information?.monthly_salary) },
  { label: "Skill Level", value: capitalize(profile.value?.job_information?.skill_level), badge: true },
  { label: "Work Location", value: capitalize(profile.value?.job_information?.work_location) },
]);
const emergencyRows = computed(() => {
  const c = profile.value?.emergency_contacts?.[0];
  return [
    { label: "Contact Name", value: c?.full_name || "-" },
    { label: "Relationship", value: capitalize(c?.relationship) },
    { label: "Phone Number", value: c?.phone || "-" },
    { label: "Email", value: c?.email || "-" },
  ];
});

onMounted(() => {
  loadProfile();
  taskStore.fetchMyTasks(5);
  assetStore.fetchMyAssets();
  reviewStore.fetchMyReviews();
});
</script>

<template>
  <div class="px-1 py-2 sm:px-4 sm:py-4 lg:px-5">
  <!-- Loading -->
  <div v-if="loading" role="status" aria-label="Loading">
    <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 mb-6">
      <Skeleton width="64px" height="64px" rounded="9999px" class="self-center sm:self-auto" />
      <div class="flex-1 space-y-2.5 flex flex-col items-center sm:items-start">
        <Skeleton width="220px" height="22px" />
        <Skeleton width="300px" height="14px" />
      </div>
    </div>
    <SkeletonStatCards :count="4" class="mb-6" />
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
        <Skeleton v-for="i in 5" :key="i" width="100%" height="16px" />
      </div>
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
        <Skeleton v-for="i in 5" :key="i" width="100%" height="16px" />
      </div>
    </div>
  </div>

  <div v-else-if="profile" class="ui-anim-fade-up">
    <!-- Detail header: avatar, name + status, meta line, action -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 mb-6">
      <Avatar
        :src="profile?.user?.profile_photo"
        :alt="profile?.user?.name"
        size="w-16 h-16"
        icon-size="w-7 h-7"
        class="self-center sm:self-auto"
      />
      <div class="flex-1 min-w-0 text-center sm:text-left">
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5">
          <h1 class="text-ui-h1 text-ui-ink break-words">{{ profile?.user?.name }}</h1>
          <UiBadge :tone="jobStatusTone" dot>{{ capitalize(profile?.job_information?.status) }}</UiBadge>
          <UiBadge v-if="profile?.job_information?.skill_level" tone="outline">
            {{ capitalize(profile?.job_information?.skill_level) }}
          </UiBadge>
        </div>
        <p class="text-ui-small text-ui-muted mt-1">{{ capitalize(profile?.job_information?.job_title) }}</p>
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-2 text-ui-small text-ui-muted">
          <span class="inline-flex items-center gap-1.5"><Building class="w-3.5 h-3.5 text-ui-faint" />{{ capitalize(profile?.job_information?.work_location) }}</span>
          <span class="inline-flex items-center gap-1.5"><User class="w-3.5 h-3.5 text-ui-faint" />{{ profile?.code }}</span>
          <span class="inline-flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5 text-ui-faint" />Joined {{ formatDate(profile?.job_information?.start_date) }}</span>
        </div>
      </div>
      <div class="flex justify-center sm:justify-end shrink-0">
        <UiButton variant="secondary" :icon="Edit" :to="{ name: 'employee.profile.edit' }" class="w-full sm:w-auto">
          Edit Profile
        </UiButton>
      </div>
    </div>

    <!-- Statistics -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 ui-stagger">
      <UiStat label="Tasks Completed" :icon="CheckCircle" :value="performanceStatistics?.tasks_completed || 0" hint="This month" />
      <UiStat label="Attendance Rate" :icon="CalendarCheck" :value="`${performanceStatistics?.attendance_rate || 0}%`" hint="Above average" />
      <UiStat label="Active Projects" :icon="Folder" :value="performanceStatistics?.projects_count || 0" hint="Current projects" />
      <UiStat label="Performance" :icon="TrendingUp" :value="`${performanceStatistics?.performance_score || 0}%`" hint="Excellent rating" />
    </div>

    <!-- Tabs: underline on desktop, scrolling chips on phones -->
    <div class="relative mb-5 sm:mb-6">
      <div
        ref="tabScrollRef"
        @scroll="updateTabFade"
        class="overflow-x-auto [scrollbar-width:none] sm:border-b sm:border-ui-line"
      >
        <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
          <button
            v-for="tab in tabs"
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
          </button>
        </div>
      </div>
      <Transition name="ui-fade">
        <div
          v-if="showTabRightFade"
          class="sm:hidden pointer-events-none absolute inset-y-0 right-0 flex items-center"
        >
          <span class="w-7 h-7 rounded-full bg-ui-surface border border-ui-line shadow-ui-raised flex items-center justify-center">
            <ChevronRight class="w-4 h-4 text-ui-accent scroll-hint-nudge" />
          </span>
        </div>
      </Transition>
    </div>

    <!-- Overview Tab -->
    <div v-show="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6 items-start ui-stagger">
      <UiCard title="Personal Information" subtitle="Your contact and profile details">
        <template #actions><Contact class="w-4 h-4 text-ui-faint mt-1" /></template>
        <dl class="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0">
          <div v-for="row in personalRows" :key="row.label" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
            <dt class="text-ui-small text-ui-muted shrink-0">{{ row.label }}</dt>
            <dd class="text-ui-body text-ui-ink text-right sm:text-left sm:mt-1 break-words min-w-0">{{ row.value }}</dd>
          </div>
        </dl>
      </UiCard>

      <UiCard title="Location Details" subtitle="Address and location information">
        <template #actions><MapPin class="w-4 h-4 text-ui-faint mt-1" /></template>
        <dl class="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0">
          <div v-for="row in locationRows" :key="row.label" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
            <dt class="text-ui-small text-ui-muted shrink-0">{{ row.label }}</dt>
            <dd class="text-ui-body text-ui-ink text-right sm:text-left sm:mt-1 break-words min-w-0">{{ row.value }}</dd>
          </div>
        </dl>
      </UiCard>
    </div>

    <!-- Employment & Team Tab -->
    <div v-show="activeTab === 'employment'" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6 items-start ui-stagger">
      <UiCard title="Employment Details" subtitle="Work and compensation information">
        <template #actions><Briefcase class="w-4 h-4 text-ui-faint mt-1" /></template>
        <dl class="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0">
          <div v-for="row in employmentRows" :key="row.label" class="flex justify-between items-center sm:items-start gap-4 py-3 sm:block sm:py-0 min-w-0">
            <dt class="text-ui-small text-ui-muted shrink-0">{{ row.label }}</dt>
            <dd class="text-ui-body text-ui-ink text-right sm:text-left sm:mt-1 break-words min-w-0">
              <UiBadge v-if="row.badge" tone="outline">{{ row.value }}</UiBadge>
              <template v-else>{{ row.value }}</template>
            </dd>
          </div>
        </dl>
      </UiCard>

      <UiCard v-if="profile?.job_information?.team" title="My Team" subtitle="Team information">
        <template #actions>
          <UiButton variant="secondary" size="sm" :icon="Users" @click="goToMyTeam">View Team</UiButton>
        </template>
        <div class="flex items-center gap-3 p-3 mb-4 rounded-[10px] bg-ui-subtle border border-ui-line">
          <div class="w-10 h-10 rounded-[10px] bg-ui-surface border border-ui-line flex items-center justify-center shrink-0">
            <Code class="w-5 h-5 text-ui-muted" />
          </div>
          <div class="min-w-0">
            <p class="text-ui-h3 text-ui-ink truncate">{{ profile.job_information.team.name }}</p>
            <p class="text-ui-cap text-ui-muted">
              {{ profile.job_information.team.members_count ?? 0 }} members •
              {{ capitalize(profile.job_information.team.status) }}
            </p>
          </div>
        </div>
        <dl class="divide-y divide-ui-line">
          <div class="flex justify-between gap-4 py-2.5">
            <dt class="text-ui-small text-ui-muted">Team Lead</dt>
            <dd class="text-ui-body text-ui-ink text-right">{{ profile.job_information.team.leader?.name || "-" }}</dd>
          </div>
          <div class="flex justify-between gap-4 py-2.5">
            <dt class="text-ui-small text-ui-muted">Department</dt>
            <dd class="text-ui-body text-ui-ink text-right">{{ capitalize(profile.job_information.team.department) }}</dd>
          </div>
          <div class="flex justify-between gap-4 pt-2.5">
            <dt class="text-ui-small text-ui-muted">Team Size</dt>
            <dd class="text-ui-body text-ui-ink text-right">{{ profile.job_information.team.members_count ?? 0 }} members</dd>
          </div>
        </dl>
      </UiCard>
    </div>

    <!-- Emergency Contact Tab -->
    <div v-show="activeTab === 'emergency'" class="mb-6 ui-anim-fade-up">
      <UiCard title="Emergency Contact" subtitle="Person to contact in case of emergency">
        <template #actions><Phone class="w-4 h-4 text-ui-faint mt-1" /></template>
        <dl
          v-if="profile?.emergency_contacts && profile.emergency_contacts.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0"
        >
          <div v-for="row in emergencyRows" :key="row.label" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
            <dt class="text-ui-small text-ui-muted shrink-0">{{ row.label }}</dt>
            <dd class="text-ui-body text-ui-ink text-right sm:text-left sm:mt-1 break-words min-w-0">{{ row.value }}</dd>
          </div>
        </dl>
        <UiEmpty v-else compact :icon="Phone" title="No emergency contact added" />
      </UiCard>
    </div>

    <!-- Tasks Tab -->
    <div v-show="activeTab === 'tasks'" class="mb-6 ui-anim-fade-up">
      <UiCard title="Latest Tasks" subtitle="Recently assigned tasks" :padded="false">
        <template #actions>
          <button type="button" @click="goToAllTasks" class="text-ui-small font-medium text-ui-accent hover:underline mt-1">
            View All
          </button>
        </template>

        <div v-if="taskStore.loading" class="p-4 sm:p-5">
          <SkeletonList :rows="3" />
        </div>

        <UiEmpty v-else-if="latestTasks.length === 0" compact :icon="ListChecks" title="No active tasks assigned" />

        <ul v-else class="divide-y divide-ui-line border-t border-ui-line ui-stagger">
          <li v-for="task in latestTasks" :key="task.id" class="px-5 sm:px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <h4 class="text-ui-h3 text-ui-ink min-w-0 break-words">{{ task.title }}</h4>
              <UiBadge :tone="taskTone(task.status)" dot class="shrink-0">{{ task.status }}</UiBadge>
            </div>
            <p v-if="task.description" class="text-ui-small text-ui-muted mt-1 line-clamp-2">{{ task.description }}</p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-ui-cap text-ui-muted">
              <span class="inline-flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5 text-ui-faint" />{{ task.dueDate }}</span>
              <span class="inline-flex items-center gap-1.5"><Folder class="w-3.5 h-3.5 text-ui-faint" />{{ task.project }}</span>
            </div>
          </li>
        </ul>
      </UiCard>
    </div>

    <!-- Assets & Reviews Tab -->
    <div v-show="activeTab === 'more'" class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start ui-stagger">
      <!-- My Assets -->
      <UiCard v-if="myAssets.length > 0" title="My Assets" subtitle="Company equipment assigned to you" :padded="false">
        <template #actions><Laptop class="w-4 h-4 text-ui-faint mt-1" /></template>
        <ul class="divide-y divide-ui-line border-t border-ui-line">
          <li v-for="asset in myAssets" :key="asset.id" class="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ asset.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate">{{ asset.asset_code }}<span v-if="asset.brand"> • {{ asset.brand }}</span></p>
            </div>
            <UiBadge :tone="assetConditionTone(asset.condition)" class="shrink-0">{{ asset.condition }}</UiBadge>
          </li>
        </ul>
      </UiCard>

      <!-- My Performance Reviews -->
      <UiCard v-if="myReviews.length > 0" title="My Performance Reviews" subtitle="Feedback and ratings from your reviewer" :padded="false">
        <template #actions><Star class="w-4 h-4 text-ui-faint mt-1" /></template>
        <ul class="divide-y divide-ui-line border-t border-ui-line">
          <li v-for="review in myReviews" :key="review.id" class="px-5 sm:px-6 py-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <p class="text-ui-h3 text-ui-ink">{{ review.period }}</p>
              <span class="flex items-center gap-0.5 shrink-0" :aria-label="`Rating ${review.overall_rating} of 5`">
                <Star
                  v-for="i in 5"
                  :key="i"
                  class="w-3.5 h-3.5"
                  :class="i <= Math.round(review.overall_rating) ? 'text-ui-warn' : 'text-ui-line-strong'"
                  :fill="i <= Math.round(review.overall_rating) ? 'currentColor' : 'none'"
                />
                <span class="text-ui-cap font-semibold text-ui-ink ml-1 tabular-nums">{{ review.overall_rating }}/5</span>
              </span>
            </div>
            <div class="space-y-1 text-ui-small text-ui-text">
              <p v-if="review.strengths"><span class="font-medium text-ui-ink">Strengths:</span> {{ review.strengths }}</p>
              <p v-if="review.areas_for_improvement"><span class="font-medium text-ui-ink">To Improve:</span> {{ review.areas_for_improvement }}</p>
              <p v-if="review.goals_next_period"><span class="font-medium text-ui-ink">Goals:</span> {{ review.goals_next_period }}</p>
            </div>
            <div class="mt-3">
              <UiButton
                v-if="review.status !== 'acknowledged'"
                variant="secondary"
                size="sm"
                :icon="CheckCircle"
                @click="acknowledgeReview(review.id)"
              >
                Mark as Read
              </UiButton>
              <UiBadge v-else tone="ok" dot>Acknowledged</UiBadge>
            </div>
          </li>
        </ul>
      </UiCard>

      <!-- Empty State -->
      <div
        v-if="myAssets.length === 0 && myReviews.length === 0"
        class="lg:col-span-2 bg-ui-surface border border-ui-line rounded-ui-card"
      >
        <UiEmpty :icon="Star" title="No asset & reviews assigned" />
      </div>
    </div>

    <!-- ID Card Tab -->
    <div v-show="activeTab === 'idcard'" class="mb-6 ui-anim-fade-up">
      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <!-- Stage: both sides at true size (54 x 85.6 mm). The card
             coordinates are the pt values of id-card.blade.php, so the
             preview and the PDF line up exactly. -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden">
          <header class="flex items-start gap-3 px-5 pt-[18px] pb-3.5 border-b border-ui-line">
            <div class="flex-1 min-w-0">
              <h3 class="text-ui-h2 text-ui-ink">Digital ID Card</h3>
              <p class="text-ui-cap text-ui-muted mt-0.5">Front and back at true size — 54 × 85.6 mm, as printed</p>
            </div>
          </header>
          <div class="bg-ui-subtle/60 px-4 py-8 overflow-x-auto">
            <div class="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 sm:gap-12 sm:min-w-max mx-auto">
              <figure class="text-center">
                <div class="idcard relative overflow-hidden shadow-ui-overlay">
                  <img src="/images/idcard-front-bg.png" alt="" class="absolute inset-0 w-full h-full object-cover pointer-events-none" />

                  <img
                    v-if="idCardPhoto && !idCardPhotoFailed"
                    :src="idCardPhoto"
                    alt=""
                    class="absolute object-cover"
                    style="top: 62pt; left: 14pt; width: 56pt; height: 67pt; border: 1.5pt solid #fff; border-radius: 6pt"
                    @error="idCardPhotoFailed = true"
                  />

                  <p class="idcard-name" :style="{ top: `${idCardNameTop}pt` }">{{ idCardNameLines.line1 }}</p>
                  <p v-if="idCardNameLines.line2 !== ''" class="idcard-name" :style="{ top: `${idCardNameTop + 16}pt` }">{{ idCardNameLines.line2 }}</p>
                  <p class="idcard-job" :style="{ top: `${idCardNameTop + (idCardNameLines.line2 !== '' ? 36 : 20)}pt` }">{{ idCardJobTitle }}</p>

                  <div class="idcard-row" style="top: 204pt"><span class="idcard-label">Employee ID</span><span class="idcard-value idcard-mono">{{ profile?.code }}</span></div>
                  <div class="idcard-row" style="top: 216pt"><span class="idcard-label">Phone</span><span class="idcard-value">{{ idCardPhone }}</span></div>
                  <div class="idcard-row" style="top: 228pt"><span class="idcard-label">Email</span><span class="idcard-value">{{ idCardEmail }}</span></div>
                </div>
                <figcaption class="text-ui-over uppercase text-ui-muted mt-3">Front</figcaption>
              </figure>

              <figure class="text-center">
                <div class="idcard relative overflow-hidden shadow-ui-overlay">
                  <img src="/images/idcard-back-bg.png" alt="" class="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                </div>
                <figcaption class="text-ui-over uppercase text-ui-muted mt-3">Back</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <!-- Details and download -->
        <aside class="space-y-5 xl:sticky xl:top-0">
          <UiCard title="On the card" subtitle="Taken from your profile">
            <dl class="divide-y divide-ui-line -my-1">
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="text-ui-small text-ui-muted">Photo</dt>
                <dd class="text-ui-small text-right">
                  <UiBadge v-if="idCardPhoto && !idCardPhotoFailed" tone="ok" dot>Profile photo</UiBadge>
                  <UiBadge v-else tone="neutral">No photo</UiBadge>
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="text-ui-small text-ui-muted">Employee ID</dt>
                <dd class="text-ui-small font-medium text-ui-ink font-mono">{{ profile?.code || "-" }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="text-ui-small text-ui-muted shrink-0">Job title</dt>
                <dd class="text-ui-small font-medium text-ui-ink truncate">{{ idCardJobTitle }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="text-ui-small text-ui-muted shrink-0">Phone</dt>
                <dd class="text-ui-small font-medium text-ui-ink truncate">{{ idCardPhone }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3 py-2.5">
                <dt class="text-ui-small text-ui-muted shrink-0">Email</dt>
                <dd class="text-ui-small font-medium text-ui-ink truncate">{{ idCardEmail }}</dd>
              </div>
            </dl>
            <p class="text-ui-cap text-ui-muted mt-4">
              {{ idCardPhoto && !idCardPhotoFailed ? "Want a different photo?" : "No profile photo yet — the card is printed without one." }}
              <RouterLink :to="{ name: 'employee.profile.edit' }" class="font-medium text-ui-accent hover:underline">
                {{ idCardPhoto && !idCardPhotoFailed ? "Change it in Edit Profile" : "Add one in Edit Profile" }}
              </RouterLink>
            </p>
          </UiCard>

          <UiButton :icon="Download" :loading="downloadingIdCard" block size="lg" @click="downloadIdCard">
            {{ downloadingIdCard ? "Preparing..." : "Download PDF" }}
          </UiButton>
          <p class="text-ui-cap text-ui-muted text-center -mt-2">Print at 100% on card stock, then cut along the edge.</p>
        </aside>
      </div>
    </div>
  </div>

  <!-- No Employee Profile (e.g. Super Admin / other system accounts) -->
  <div v-else-if="profileNotFound" class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
    <UiEmpty
      :icon="User"
      title="No profile to show"
      message="This account doesn't have an employee profile -- that's expected for system accounts like Super Admin."
    />
  </div>
  </div>
</template>

<style scoped>
/* ID card preview: pt values copied from id-card.blade.php. */
.idcard {
  width: 153.07pt;
  height: 242.69pt;
  border-radius: 3pt;
}
.idcard-name {
  position: absolute;
  left: 14pt;
  right: 12pt;
  margin: 0;
  font-family: "Anton", "Helvetica", sans-serif;
  font-size: 13pt;
  line-height: 1;
  color: #fff;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
}
.idcard-job {
  position: absolute;
  left: 14pt;
  right: 14pt;
  margin: 0;
  font-family: "Helvetica", "Arial", sans-serif;
  font-size: 8pt;
  line-height: 1.2;
  color: #c9d3ee;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
}
.idcard-row {
  position: absolute;
  left: 14pt;
  right: 10pt;
  height: 9pt;
  font-family: "Helvetica", "Arial", sans-serif;
  text-align: left;
}
.idcard-label {
  position: absolute;
  left: 0;
  width: 44pt;
  font-size: 5pt;
  letter-spacing: 0.4pt;
  text-transform: uppercase;
  color: #667085;
}
.idcard-value {
  position: absolute;
  left: 47pt;
  right: 0;
  font-size: 6pt;
  color: #0f1b2d;
  white-space: nowrap;
  overflow: hidden;
}
.idcard-mono {
  font-family: "Courier New", Courier, monospace;
  font-weight: 700;
  font-size: 6.5pt;
}
</style>
