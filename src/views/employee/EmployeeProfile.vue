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
const idCardJobTitle = computed(() => idCardStrLimit(idCardUcwords(profile.value?.job_information?.job_title || "-"), 28));
const idCardPhone = computed(() => idCardStrLimit(profile.value?.phone || "-", 24));
const idCardEmail = computed(() => idCardStrLimit(profile.value?.user?.email || "-", 26));

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
const ID_CARD_NAME_MAX_CHARS = 25;
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

onMounted(() => {
  loadProfile();
  taskStore.fetchMyTasks(5);
  assetStore.fetchMyAssets();
  reviewStore.fetchMyReviews();
});
</script>

<template>
  <div class="px-4 py-4">
  <div v-if="loading">
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] mb-6 p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-6">
        <Skeleton width="96px" height="96px" rounded="9999px" class="self-center sm:self-auto" />
        <div class="flex-1 space-y-3">
          <Skeleton width="220px" height="24px" />
          <Skeleton width="140px" height="16px" />
          <Skeleton width="260px" height="14px" />
        </div>
      </div>
    </div>
    <SkeletonStatCards :count="4" class="mb-6" />
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-3">
        <Skeleton v-for="i in 5" :key="i" width="100%" height="16px" />
      </div>
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-3">
        <Skeleton v-for="i in 5" :key="i" width="100%" height="16px" />
      </div>
    </div>
  </div>

  <div v-else-if="profile">
    <!-- Employee Header -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] mb-6 p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-6">
        <div class="relative self-center sm:self-auto flex-shrink-0">
          <Avatar
            :src="profile?.user?.profile_photo"
            :alt="profile?.user?.name"
            size="w-24 h-24 sm:w-32 sm:h-32"
            icon-size="w-10 h-10 sm:w-14 sm:h-14"
          />
          <span
            :class="statusBadgeClass"
            class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap"
          >
            {{ capitalize(profile?.job_information?.status) }}
          </span>
        </div>
        <div class="flex-1 min-w-0 text-center sm:text-left">
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 mb-2">
            <h1 class="text-brand-dark text-2xl sm:text-3xl font-extrabold">
              {{ profile?.user?.name }}
            </h1>
            <span
              :class="skillLevelBadgeClass"
              class="px-3 py-1 rounded-md text-sm font-semibold"
            >
              {{ capitalize(profile?.job_information?.skill_level) }}
            </span>
          </div>
          <p class="text-brand-light text-sm mb-3">
            {{ capitalize(profile?.job_information?.job_title) }}
          </p>
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-sm text-gray-600">
            <div class="flex items-center gap-2">
              <Building class="w-4 h-4" />
              <span>{{
                capitalize(profile?.job_information?.work_location)
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <User class="w-4 h-4" />
              <span>{{ profile?.code }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Calendar class="w-4 h-4" />
              <span
                >Joined
                {{ formatDate(profile?.job_information?.start_date) }}</span
              >
            </div>
          </div>
        </div>
        <div class="flex items-center justify-center sm:justify-end">
          <RouterLink
            :to="{ name: 'employee.profile.edit' }"
            class="w-full sm:w-auto btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2"
          >
            <Edit class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Edit Profile</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Tasks Completed Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Tasks Completed</p>
            <p
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-none my-2"
            >
              {{ performanceStatistics?.tasks_completed || 0 }}
            </p>
            <p class="text-success text-sm font-medium">This month</p>
          </div>
          <div
            class="w-14 h-14 bg-blue-50 rounded-[12px] flex items-center justify-center"
          >
            <CheckCircle class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <!-- Attendance Rate Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Attendance Rate</p>
            <p
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-none my-2"
            >
              {{ performanceStatistics?.attendance_rate || 0 }}%
            </p>
            <p class="text-success text-sm font-medium">Above average</p>
          </div>
          <div
            class="w-14 h-14 bg-green-50 rounded-[12px] flex items-center justify-center"
          >
            <CalendarCheck class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Active Projects Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Active Projects</p>
            <p
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-none my-2"
            >
              {{ performanceStatistics?.projects_count || 0 }}
            </p>
            <p class="text-success text-sm font-medium">Current projects</p>
          </div>
          <div
            class="w-14 h-14 bg-purple-50 rounded-[12px] flex items-center justify-center"
          >
            <Folder class="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      <!-- Performance Rating Card -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Performance</p>
            <p
              class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-none my-2"
            >
              {{ performanceStatistics?.performance_score || 0 }}%
            </p>
            <p class="text-success text-sm font-medium">Excellent rating</p>
          </div>
          <div
            class="w-14 h-14 bg-orange-50 rounded-[12px] flex items-center justify-center"
          >
            <TrendingUp class="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="relative mb-6">
      <div
        ref="tabScrollRef"
        @scroll="updateTabFade"
        class="bg-white border border-[#DCDEDD] rounded-[14px] p-2 overflow-x-auto"
      >
        <div class="flex items-center gap-1 min-w-max">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold transition-all duration-200 whitespace-nowrap',
              activeTab === tab.id
                ? 'blue-gradient blue-btn-shadow text-white'
                : 'text-brand-light hover:bg-gray-50 hover:text-brand-dark',
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>
      </div>
      <Transition name="fade">
        <div
          v-if="showTabRightFade"
          class="sm:hidden pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[14px] bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-end pr-1"
        >
          <ChevronRight class="w-4 h-4 text-[#0C51D9] scroll-hint-nudge" />
        </div>
      </Transition>
      <Transition name="fade">
        <div
          v-if="showTabLeftFade"
          class="sm:hidden pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-[14px] bg-gradient-to-r from-white via-white/80 to-transparent"
        ></div>
      </Transition>
    </div>

    <!-- Overview Tab -->
    <div v-show="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-start">
        <!-- Personal Information -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-12 h-12 bg-teal-50 rounded-[12px] flex items-center justify-center"
            >
              <Contact class="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-md font-bold">
                Personal Information
              </h3>
              <p class="text-brand-light text-sm">
                Your contact and profile details
              </p>
            </div>
          </div>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Email</span>
              <span class="text-brand-dark text-sm font-medium">{{
                profile?.user?.email
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Phone</span>
              <span class="text-brand-dark text-sm font-medium">{{
                profile?.phone || "-"
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Date of Birth</span>
              <span class="text-brand-dark text-sm font-medium">{{
                formatDate(profile?.date_of_birth)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Employee ID</span>
              <span class="text-brand-dark text-sm font-medium">{{
                profile?.code
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Office Location</span>
              <span class="text-brand-dark text-sm font-medium">{{
                capitalize(profile?.job_information?.work_location)
              }}</span>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-brand-light text-sm">Hobbies</span>
              <span
                class="text-brand-dark text-sm font-medium text-right max-w-[60%]"
                >{{ profile?.hobby || "-" }}</span
              >
            </div>
          </div>
        </div>

        <!-- Location Details -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-12 h-12 bg-purple-50 rounded-[12px] flex items-center justify-center"
            >
              <MapPin class="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-md font-bold">
                Location Details
              </h3>
              <p class="text-brand-light text-sm">
                Address and location information
              </p>
            </div>
          </div>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Gender</span>
              <span class="text-brand-dark text-sm font-medium">{{
                capitalize(profile?.gender)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Place of Birth</span>
              <span class="text-brand-dark text-sm font-medium">{{
                profile?.place_of_birth || "-"
              }}</span>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-brand-light text-sm">Address</span>
              <span
                class="text-brand-dark text-sm font-medium text-right max-w-[60%]"
                >{{ profile?.address || "-" }}</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">City</span>
              <span class="text-brand-dark text-sm font-medium">{{
                profile?.city || "-"
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Post Code</span>
              <span class="text-brand-dark text-sm font-medium">{{
                profile?.postal_code || "-"
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Country</span>
              <span class="text-brand-dark text-sm font-medium"
                >Indonesia</span
              >
            </div>
          </div>
        </div>

    </div>

    <!-- Employment & Team Tab -->
    <div v-show="activeTab === 'employment'" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-start">
        <!-- Employment Details -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-12 h-12 bg-green-50 rounded-[12px] flex items-center justify-center"
            >
              <Briefcase class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-md font-bold">
                Employment Details
              </h3>
              <p class="text-brand-light text-sm">
                Work and compensation information
              </p>
            </div>
          </div>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Job Title</span>
              <span class="text-brand-dark text-sm font-medium">{{
                capitalize(profile?.job_information?.job_title)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Start Date</span>
              <span class="text-brand-dark text-sm font-medium">{{
                formatDate(profile?.job_information?.start_date)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Employment Type</span>
              <span class="text-brand-dark text-sm font-medium">{{
                capitalize(profile?.job_information?.employment_type)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Monthly Salary</span>
              <span class="text-brand-dark text-sm font-medium">{{
                formatCurrency(profile?.job_information?.monthly_salary)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Skill Level</span>
              <span
                :class="skillLevelBadgeClass"
                class="px-2 py-1 rounded-md text-sm font-semibold"
                >{{ capitalize(profile?.job_information?.skill_level) }}</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Work Location</span>
              <span class="text-brand-dark text-sm font-medium">{{
                capitalize(profile?.job_information?.work_location)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Team Information -->
        <div
          class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 h-fit"
          v-if="profile?.job_information?.team"
        >
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 bg-indigo-50 rounded-[12px] flex items-center justify-center shrink-0"
              >
                <Users class="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 class="text-brand-dark text-sm font-bold">My Team</h3>
                <p class="text-brand-light text-sm">Team information</p>
              </div>
            </div>
            <button
              @click="goToMyTeam"
              class="w-full sm:w-auto border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2 flex items-center justify-center gap-2"
            >
              <Users class="w-4 h-4 text-gray-600" />
              <span class="text-brand-dark text-sm font-semibold"
                >View Team</span
              >
            </button>
          </div>

          <!-- Team Header -->
          <div
            class="flex items-center gap-3 sm:gap-4 mb-4 p-3 sm:p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-[12px]"
          >
            <div
              class="w-12 h-12 sm:w-16 sm:h-16 relative flex items-center justify-center rounded-[12px] overflow-hidden shrink-0"
            >
              <div
                class="w-full h-full absolute bg-white/20 rounded-[12px]"
              ></div>
              <Code class="w-6 h-6 sm:w-8 sm:h-8 text-white relative z-10" />
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-white text-sm sm:text-xl font-bold truncate">
                {{ profile.job_information.team.name }}
              </h4>
              <p class="text-white/80 text-sm sm:text-sm font-normal">
                {{ profile.job_information.team.members_count ?? 0 }} members •
                {{ capitalize(profile.job_information.team.status) }}
              </p>
            </div>
          </div>

          <!-- Team Details -->
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Team Lead</span>
              <div class="flex items-center gap-2">
                <span class="text-brand-dark text-sm font-medium">{{
                  profile.job_information.team.leader?.name || "-"
                }}</span>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Department</span>
              <span class="text-brand-dark text-sm font-medium">{{
                capitalize(profile.job_information.team.department)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-brand-light text-sm">Team Size</span>
              <span class="text-brand-dark text-sm font-medium"
                >{{ profile.job_information.team.members_count ?? 0 }} members</span
              >
            </div>
          </div>
        </div>
    </div>

    <!-- Emergency Contact Tab -->
    <div v-show="activeTab === 'emergency'" class="mb-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 max-w-2xl">
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-12 h-12 bg-red-50 rounded-[12px] flex items-center justify-center"
          >
            <Phone class="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-md font-bold">
              Emergency Contact
            </h3>
            <p class="text-brand-light text-sm">
              Person to contact in case of emergency
            </p>
          </div>
        </div>
        <div
          class="space-y-4"
          v-if="
            profile?.emergency_contacts &&
            profile.emergency_contacts.length > 0
          "
        >
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Contact Name</span>
            <span class="text-brand-dark text-sm font-medium">{{
              profile.emergency_contacts[0]?.full_name || "-"
            }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Relationship</span>
            <span class="text-brand-dark text-sm font-medium">{{
              capitalize(profile.emergency_contacts[0]?.relationship)
            }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Phone Number</span>
            <span class="text-brand-dark text-sm font-medium">{{
              profile.emergency_contacts[0]?.phone || "-"
            }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Email</span>
            <span class="text-brand-dark text-sm font-medium">{{
              profile.emergency_contacts[0]?.email || "-"
            }}</span>
          </div>
        </div>
        <div v-else class="text-center text-gray-500 py-4">
          No emergency contact added
        </div>
      </div>
    </div>

    <!-- Tasks Tab -->
    <div v-show="activeTab === 'tasks'" class="mb-6">
        <!-- Latest 5 Tasks Assigned -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 bg-orange-50 rounded-[12px] flex items-center justify-center"
              >
                <ListChecks class="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 class="text-brand-dark text-md font-bold">Latest Tasks</h3>
                <p class="text-brand-light text-sm">Recently assigned tasks</p>
              </div>
            </div>
            <button
              @click="goToAllTasks"
              class="text-[#0C51D9] text-sm font-medium hover:underline"
            >
              View All
            </button>
          </div>

          <div v-if="taskStore.loading" class="space-y-4">
            <Skeleton v-for="i in 3" :key="i" height="90px" rounded="12px" />
          </div>

          <div v-else-if="latestTasks.length === 0" class="text-center py-6 text-sm text-gray-400">
            No active tasks assigned
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="task in latestTasks"
              :key="task.id"
              class="border border-[#DCDEDD] rounded-[12px] p-4 hover:border-[#0C51D9] hover:border-2 transition-all duration-300"
            >
              <div class="flex items-start justify-between mb-2">
                <h4 class="text-brand-dark text-sm font-semibold">
                  {{ task.title }}
                </h4>
                <span
                  :class="task.statusClass"
                  class="px-2 py-1 rounded-md text-xs font-semibold flex-shrink-0"
                  >{{ task.status }}</span
                >
              </div>
              <p class="text-brand-light text-sm mb-3">
                {{ task.description }}
              </p>
              <div class="flex items-center gap-4 text-xs text-gray-600">
                <div class="flex items-center gap-1">
                  <Calendar class="w-3 h-3" />
                  <span>{{ task.dueDate }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <Folder class="w-3 h-3" />
                  <span>{{ task.project }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>

    <!-- Assets & Reviews Tab -->
    <div v-show="activeTab === 'more'" class="mb-6 space-y-6">
        <!-- My Assets -->
        <div v-if="myAssets.length > 0" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center">
              <Laptop class="w-6 h-6 text-[#0C51D9]" />
            </div>
            <div>
              <h3 class="text-brand-dark text-md font-bold">My Assets</h3>
              <p class="text-brand-light text-sm">Company equipment assigned to you</p>
            </div>
          </div>
          <div class="space-y-3">
            <div
              v-for="asset in myAssets"
              :key="asset.id"
              class="border border-[#DCDEDD] rounded-[12px] p-4 flex items-center justify-between"
            >
              <div>
                <p class="text-brand-dark text-sm font-semibold">{{ asset.name }}</p>
                <p class="text-brand-light text-xs">{{ asset.asset_code }}<span v-if="asset.brand"> • {{ asset.brand }}</span></p>
              </div>
              <span class="px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700">{{ asset.condition }}</span>
            </div>
          </div>
        </div>

        <!-- My Performance Reviews -->
        <div v-if="myReviews.length > 0" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 bg-yellow-50 rounded-[12px] flex items-center justify-center">
              <Star class="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-sm font-bold">My Performance Reviews</h3>
              <p class="text-brand-light text-sm">Feedback and ratings from your reviewer</p>
            </div>
          </div>
          <div class="space-y-3">
            <div v-for="review in myReviews" :key="review.id" class="border border-[#DCDEDD] rounded-[12px] p-4">
              <div class="flex items-center justify-between mb-2">
                <p class="text-brand-dark text-sm font-semibold">{{ review.period }}</p>
                <span class="px-2 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-700">{{ review.overall_rating }} / 5</span>
              </div>
              <p v-if="review.strengths" class="text-brand-light text-xs mb-1"><strong>Strengths:</strong> {{ review.strengths }}</p>
              <p v-if="review.areas_for_improvement" class="text-brand-light text-xs mb-1"><strong>To Improve:</strong> {{ review.areas_for_improvement }}</p>
              <p v-if="review.goals_next_period" class="text-brand-light text-xs mb-2"><strong>Goals:</strong> {{ review.goals_next_period }}</p>
              <button
                v-if="review.status !== 'acknowledged'"
                @click="acknowledgeReview(review.id)"
                class="text-[#0C51D9] text-xs font-semibold hover:underline"
              >
                Mark as Read
              </button>
              <span v-else class="text-green-600 text-xs font-semibold">Acknowledged</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="myAssets.length === 0 && myReviews.length === 0"
          class="bg-white border border-[#DCDEDD] rounded-[14px] p-12 text-center"
        >
          <Star class="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p class="text-brand-light text-sm font-medium">
            No asset & reviews assigned
          </p>
        </div>
    </div>

    <!-- ID Card Tab -->
    <div v-show="activeTab === 'idcard'" class="mb-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-indigo-50 rounded-[12px] flex items-center justify-center">
              <CreditCardIcon class="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-md font-bold">Digital ID Card</h3>
              <p class="text-brand-light text-sm">Preview and download your employee ID card</p>
            </div>
          </div>
          <button
            @click="downloadIdCard"
            :disabled="downloadingIdCard"
            class="w-full sm:w-auto btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">
              {{ downloadingIdCard ? "Preparing..." : "Download PDF" }}
            </span>
          </button>
        </div>

        <!-- Card Preview -->
        <div class="flex flex-col sm:flex-row items-center sm:items-start justify-center" style="gap: 3rem;">
          <div class="text-center">
            <p class="text-brand-light text-xs font-semibold uppercase tracking-wide mb-2">Front</p>
            <!-- Card, front: the design team's own background artwork,
                 with the employee's name/title/id/contact overlaid. -->
            <div class="relative rounded-[3px] overflow-hidden shadow-xl" style="width: 54mm; height: 85.6mm;">
              <img src="/images/idcard-front-bg.png" class="absolute inset-0 w-full h-full object-cover pointer-events-none" />

              <div
                class="absolute text-white font-bold text-left whitespace-nowrap overflow-hidden"
                style="top: 31.75mm; left: 4.94mm; right: 4.23mm; font-family: 'Anton', 'Helvetica', sans-serif; font-size: 4mm; line-height: 1;"
              >
                {{ idCardNameLines.line1 }}
              </div>
              <div
                v-if="idCardNameLines.line2 !== ''"
                class="absolute text-white font-bold text-left whitespace-nowrap overflow-hidden"
                style="top: 38.1mm; left: 4.94mm; right: 4.23mm; font-family: 'Anton', 'Helvetica', sans-serif; font-size: 4mm; line-height: 1;"
              >
                {{ idCardNameLines.line2 }}
              </div>

              <div class="absolute bg-white" style="top: 52.92mm; left: 4.94mm; width: 8.47mm; height: 0.71mm;"></div>
              <p class="absolute text-white text-left whitespace-nowrap overflow-hidden" style="top: 55.04mm; left: 4.94mm; right: 4.94mm; font-size: 3.18mm; font-family: 'Helvetica', 'Arial', sans-serif;">
                {{ idCardJobTitle }}
              </p>

              <!-- Contact panel (background already part of the artwork) -->
              <span class="absolute text-left font-bold text-[#1a1a2e]" style="top: 73.31mm; left: 4.94mm; font-size: 1.94mm; font-family: 'Helvetica', 'Arial', sans-serif;">Employee Id</span>
              <span class="absolute text-left text-[#1a1a2e]" style="top: 73.31mm; left: 18.35mm; font-size: 1.94mm; font-family: 'Helvetica', 'Arial', sans-serif;">:</span>
              <span class="absolute text-left text-[#1a1a2e] whitespace-nowrap overflow-hidden" style="top: 73.31mm; left: 20.46mm; right: 2.12mm; font-size: 1.94mm; font-family: 'Helvetica', 'Arial', sans-serif;">{{ profile?.code }}</span>

              <span class="absolute text-left font-bold text-[#1a1a2e]" style="top: 76.49mm; left: 4.94mm; font-size: 1.94mm; font-family: 'Helvetica', 'Arial', sans-serif;">Phone</span>
              <span class="absolute text-left text-[#1a1a2e]" style="top: 76.49mm; left: 18.35mm; font-size: 1.94mm; font-family: 'Helvetica', 'Arial', sans-serif;">:</span>
              <span class="absolute text-left text-[#1a1a2e] whitespace-nowrap overflow-hidden" style="top: 76.49mm; left: 20.46mm; right: 2.12mm; font-size: 1.94mm; font-family: 'Helvetica', 'Arial', sans-serif;">{{ idCardPhone }}</span>

              <span class="absolute text-left font-bold text-[#1a1a2e]" style="top: 79.66mm; left: 4.94mm; font-size: 1.94mm; font-family: 'Helvetica', 'Arial', sans-serif;">Email</span>
              <span class="absolute text-left text-[#1a1a2e]" style="top: 79.66mm; left: 18.35mm; font-size: 1.94mm; font-family: 'Helvetica', 'Arial', sans-serif;">:</span>
              <span class="absolute text-left text-[#1a1a2e] whitespace-nowrap overflow-hidden" style="top: 79.66mm; left: 20.46mm; right: 2.12mm; font-size: 1.94mm; font-family: 'Helvetica', 'Arial', sans-serif;">{{ idCardEmail }}</span>
            </div>
          </div>

          <div class="text-center">
            <p class="text-brand-light text-xs font-semibold uppercase tracking-wide mb-2">Back</p>
            <!-- Card, back: the design team's own artwork, unchanged. -->
            <div class="relative rounded-[3px] overflow-hidden shadow-xl" style="width: 54mm; height: 85.6mm;">
              <img src="/images/idcard-back-bg.png" class="absolute inset-0 w-full h-full object-cover pointer-events-none" />
            </div>
          </div>
        </div>
        <p class="text-brand-light text-xs text-center mt-6">
          Shown at true size &mdash; 54mm &times; 85.6mm each side, the same portrait badge size used for physical printing.
        </p>
      </div>
    </div>
  </div>

  <!-- No Employee Profile (e.g. Super Admin / other system accounts) -->
  <div v-else-if="profileNotFound" class="bg-white border border-[#DCDEDD] rounded-[14px] p-12 text-center">
    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <User class="w-8 h-8 text-gray-400" />
    </div>
    <p class="text-brand-dark text-sm font-bold mb-1">No profile to show</p>
    <p class="text-brand-light text-sm">
      This account doesn't have an employee profile -- that's expected for system accounts like Super Admin.
    </p>
  </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
