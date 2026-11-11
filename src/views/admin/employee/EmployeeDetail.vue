<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { getStatusColor, getLevelColor } from "@/utils/styleHelpers.js";
import { formatDateLong as formatDate } from "@/utils/dateUtils.js";
import {
  formatRupiah as formatCurrency,
  capitalize,
  getJobStatusText,
} from "@/utils/formatUtils.js";
import ConfirmationModal from "@/components/common/ConfirmationModal.vue";
import EmployeeFiles from "@/components/admin/employee/EmployeeFiles.vue";
import Avatar from "@/components/common/Avatar.vue";
import { useRoute, useRouter } from "vue-router";
import { useEmployeeStore } from "@/stores/employee";
import { useLetterStore } from "@/stores/letter";
import { usePerformanceReviewStore } from "@/stores/performanceReview";
import { useResignationStore } from "@/stores/resignation";
import { can, hasAnyRole } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { storeToRefs } from "pinia";
import {
  Edit,
  Share2,
  CheckCircle,
  CalendarCheck,
  Folder,
  TrendingUp,
  Users,
  Contact,
  Calendar,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Download,
  Trash2,
  Building,
  User,
  Clock,
  AlertTriangle,
  Star,
  ShieldAlert,
  LogOut,
  X,
  LayoutGrid,
  Wallet,
  Images,
  Award,
  DoorOpen,
  ChevronRight,
  ChevronDown,
  UserX,
  UserCheck,
} from "lucide-vue-next";
import { useScrollFade } from "@/composables/useScrollFade";
import { UiAlert, UiBadge, UiButton, UiCard, UiEmpty, UiInput, UiModal, UiSelect, UiStat } from "@/components/ui";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";

const route = useRoute();
const router = useRouter();
const employeeStore = useEmployeeStore();
const { loading, performanceStatistics, success } = storeToRefs(employeeStore);
const alertModal = useAlertModalStore();

const letterStore = useLetterStore();
const disciplinaryLetters = ref<any[]>([]);

const reviewStore = usePerformanceReviewStore();
const { reviews: performanceReviews } = storeToRefs(reviewStore);
const showReviewModal = ref(false);
const reviewForm = ref({
  period: "",
  period_start: "",
  period_end: "",
  overall_rating: 4,
  strengths: "",
  areas_for_improvement: "",
  goals_next_period: "",
});
const reviewSubmitting = ref(false);
const reviewError = ref("");

const resignationStore = useResignationStore();
const { current: resignation, assetsToReturn } = storeToRefs(resignationStore);
const showResignModal = ref(false);
const resignForm = ref({
  type: "resign",
  reason: "",
  resignation_date: new Date().toISOString().slice(0, 10),
  last_working_date: "",
});
const resignSubmitting = ref(false);
const resignError = ref("");

const employee = ref<any>(null);
const showDeleteModal = ref(false);

const activeTab = ref("overview");
const { scrollRef: tabScrollRef, showLeftFade: showTabLeftFade, showRightFade: showTabRightFade, updateFade: updateTabFade } = useScrollFade();
const tabs = computed(() => {
  const list = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "employment", label: "Employment & Bank", icon: Wallet },
    { id: "emergency", label: "Emergency Contact", icon: Phone },
    { id: "documents", label: "Documents", icon: Images },
    { id: "performance", label: "Performance", icon: Award },
  ];
  if (can("employee-edit")) {
    list.push({ id: "offboarding", label: "Offboarding", icon: DoorOpen });
  }
  return list;
});

// Load employee data
const loadEmployee = async () => {
  try {
    const employeeId = route.params.id as string;
    employee.value = await employeeStore.fetchEmployee(employeeId);
    // Load performance statistics
    await employeeStore.fetchPerformanceStatistics(employeeId);

    const [letters] = await Promise.all([
      letterStore.fetchLetters({ employee_id: employeeId, row_per_page: 50 }),
      reviewStore.fetchReviews({ employee_id: employeeId, row_per_page: 20 }),
      resignationStore.fetchEmployeeResignation(employeeId).catch(() => {}),
    ]);
    disciplinaryLetters.value = (letterStore.letters ?? []).filter((l: any) =>
      ["SP1", "SP2", "SP3"].includes(l.letter_code?.code)
    );
  } catch (error) {
    console.error("Error loading employee:", error);
    router.push({ name: "admin.employees" });
  }
};

const openReviewModal = () => {
  reviewError.value = "";
  reviewForm.value = {
    period: "",
    period_start: "",
    period_end: "",
    overall_rating: 4,
    strengths: "",
    areas_for_improvement: "",
    goals_next_period: "",
  };
  showReviewModal.value = true;
};

const submitReview = async () => {
  reviewError.value = "";
  reviewSubmitting.value = true;
  try {
    await reviewStore.createReview({
      ...reviewForm.value,
      employee_id: route.params.id,
    });
    showReviewModal.value = false;
    await reviewStore.fetchReviews({ employee_id: route.params.id, row_per_page: 20 });
  } catch (error: any) {
    const data = error?.response?.data;
    reviewError.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Gagal menyimpan review.");
  } finally {
    reviewSubmitting.value = false;
  }
};

const openResignModal = () => {
  resignError.value = "";
  resignForm.value = {
    type: "resign",
    reason: "",
    resignation_date: new Date().toISOString().slice(0, 10),
    last_working_date: "",
  };
  showResignModal.value = true;
};

const submitResignation = async () => {
  resignError.value = "";
  resignSubmitting.value = true;
  try {
    await resignationStore.initiateResignation(route.params.id as string, resignForm.value);
    showResignModal.value = false;
    await Promise.all([loadEmployee(), resignationStore.fetchEmployeeResignation(route.params.id as string)]);
  } catch (error: any) {
    const data = error?.response?.data;
    resignError.value = data?.message || "Failed to process resignation/termination.";
  } finally {
    resignSubmitting.value = false;
  }
};

const completeOffboarding = async () => {
  if (!resignation.value) return;
  if (!(await alertModal.confirm("Mark offboarding process as complete?"))) return;
  try {
    await resignationStore.completeOffboarding(resignation.value.id);
    await resignationStore.fetchEmployeeResignation(route.params.id as string);
  } catch (error) {
    await alertModal.alert("Failed to complete offboarding process.", { type: "danger" });
  }
};

// Computed properties
const statusBadgeClass = computed(() => {
  return getStatusColor(employee.value?.job_information?.status);
});

const statusText = computed(() => {
  return getJobStatusText(employee.value?.job_information?.status);
});

// Actions
const editEmployee = () => {
  router.push({
    name: "admin.employees.edit",
    params: { id: route.params.id },
  });
};

const shareProfile = async () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
  await alertModal.alert("Profile link copied to clipboard!", { type: "success" });
};

const backupEmployee = async () => {
  if (
    await alertModal.confirm(
      `Create backup for ${employee.value?.user?.name}? This will download all employee data.`,
      { type: "info", confirmText: "Create Backup" }
    )
  ) {
    await alertModal.alert("Backup feature will be implemented soon.");
  }
};

const handleDeleteEmployee = async () => {
  try {
    await employeeStore.deleteEmployee(route.params.id as string);
    if (success.value) {
      showDeleteModal.value = false;
      router.push({ name: "admin.employees" });
    }
  } catch (error) {}
};

// Blocking login is separate from Resignation/Termination and from
// job_information.status (which only affects payroll/reporting) --
// Superadmin/Manager/Finance/Operational Director only; the elevated-role
// restriction below is a UI-side hint, the real rule is enforced server-side.
const canManageAccountStatus = computed(() =>
  hasAnyRole(["superadmin", "manager", "finance", "operational_director"])
);
const targetIsElevated = computed(() =>
  (employee.value?.user?.roles || []).some((r: string) =>
    ["manager", "finance", "operational_director"].includes(r)
  )
);
const canToggleThisAccount = computed(
  () => canManageAccountStatus.value && (!targetIsElevated.value || hasAnyRole(["superadmin"]))
);
const togglingAccountStatus = ref(false);

const handleToggleAccountStatus = async () => {
  const isActive = employee.value?.user?.is_active;
  const action = isActive ? "deactivate" : "activate";
  const ok = await alertModal.confirm(
    isActive
      ? `Deactivate ${employee.value?.user?.name}'s account? They will be immediately logged out and unable to log in until reactivated.`
      : `Activate ${employee.value?.user?.name}'s account? They will be able to log in again.`,
    { type: isActive ? "danger" : "info", confirmText: isActive ? "Deactivate" : "Activate" }
  );
  if (!ok) return;

  togglingAccountStatus.value = true;
  try {
    const updated = await employeeStore.toggleAccountStatus(route.params.id as string);
    if (employee.value && updated?.user) {
      employee.value.user.is_active = updated.user.is_active;
    }
    await alertModal.alert(`Account ${action}d successfully.`, { type: "success" });
  } catch (error: any) {
    await alertModal.alert(error?.response?.data?.message || `Failed to ${action} account.`, { type: "danger" });
  } finally {
    togglingAccountStatus.value = false;
  }
};

onMounted(() => {
  loadEmployee();
});

// ---- Presentation-only helpers (template layout) ----
const JOB_STATUS_TONES: Record<string, string> = { active: "ok", on_leave: "warn", resigned: "bad" };
const jobStatusTone = computed(() => JOB_STATUS_TONES[employee.value?.job_information?.status] || "neutral");
const performanceTone = computed(() => {
  const score = performanceStatistics.value?.performance_score;
  return score >= 80 ? "ok" : score >= 60 ? "warn" : "bad";
});
const resignTypeOptions = [
  { value: "resign", label: "Resignation" },
  { value: "terminated", label: "Termination" },
];
const fieldClass =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";

const teamRows = computed(() => [
  { label: "Team", value: employee.value?.team?.name || "-" },
  { label: "Team Members", value: `${employee.value?.team?.members_count || 0} members` },
  { label: "Team Status", value: capitalize(employee.value?.team?.status) },
]);
const contactRows = computed(() => [
  { label: "Email", value: employee.value?.user?.email },
  { label: "Phone", value: employee.value?.phone },
  { label: "Identity Number", value: employee.value?.identity_number },
]);
const personalRows = computed(() => [
  { label: "Date of Birth", value: formatDate(employee.value?.date_of_birth) },
  { label: "Place of Birth", value: employee.value?.place_of_birth },
  { label: "Gender", value: capitalize(employee.value?.gender) },
  { label: "Hobby", value: employee.value?.hobby || "-" },
]);
const addressRows = computed(() => [
  { label: "Address", value: employee.value?.address },
  { label: "City", value: employee.value?.city },
  { label: "Post Code", value: employee.value?.postal_code },
]);
const employmentRows = computed(() => [
  { label: "Years of Experience", value: `${employee.value?.job_information?.years_experience} years` },
  { label: "Employment Type", value: capitalize(employee.value?.job_information?.employment_type) },
  { label: "Start Date", value: formatDate(employee.value?.job_information?.start_date) },
  { label: "Monthly Salary", value: formatCurrency(employee.value?.job_information?.monthly_salary), num: true },
]);
const bankRows = computed(() => [
  { label: "Bank Name", value: capitalize(employee.value?.bank_information?.bank_name) || "-" },
  { label: "Account Number", value: employee.value?.bank_information?.account_number || "-", num: true },
  { label: "Account Holder", value: employee.value?.bank_information?.account_holder_name || "-" },
  { label: "Account Type", value: capitalize(employee.value?.bank_information?.account_type) || "-" },
]);
const adminRows = computed(() => [
  { label: "Employee ID", value: employee.value?.code },
  { label: "Preferred Language", value: capitalize(employee.value?.preferred_language) || "-" },
]);
const emergencyRows = computed(() => {
  const c = employee.value?.emergency_contacts?.[0];
  if (!c) return [];
  return [
    { label: "Contact Name", value: c.full_name },
    { label: "Relationship", value: capitalize(c.relationship) },
    { label: "Phone", value: c.phone },
    { label: "Email", value: c.email || "-" },
  ];
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
  <!-- Loading -->
  <div v-if="loading" role="status" aria-label="Loading employee data..." class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
      <Skeleton width="64px" height="64px" rounded="9999px" class="self-center sm:self-auto" />
      <div class="flex-1 space-y-2.5 flex flex-col items-center sm:items-start">
        <Skeleton width="220px" height="22px" />
        <Skeleton width="300px" height="14px" />
      </div>
    </div>
    <SkeletonStatCards :count="4" cols="grid-cols-2 lg:grid-cols-4" />
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
      <div v-for="n in 2" :key="n" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
        <Skeleton v-for="i in 4" :key="i" width="100%" height="16px" />
      </div>
    </div>
    <span class="sr-only">Loading employee data...</span>
  </div>

  <div v-else-if="employee" class="space-y-5 ui-anim-fade-up">
    <!-- Employee Header -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
      <Avatar
        :src="employee.user?.profile_photo"
        :alt="employee.user?.name"
        size="w-16 h-16"
        icon-size="w-7 h-7"
        class="self-center sm:self-auto shrink-0"
      />
      <div class="flex-1 min-w-0 text-center sm:text-left">
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5">
          <h1 class="text-ui-h1 text-ui-ink break-words">{{ employee.user?.name }}</h1>
          <UiBadge :tone="jobStatusTone" dot>{{ capitalize(statusText) }}</UiBadge>
          <UiBadge v-if="employee.job_information?.skill_level" tone="outline">
            {{ capitalize(employee.job_information?.skill_level) }}
          </UiBadge>
          <UiBadge v-if="employee.user?.is_active === false" tone="bad">Login Disabled</UiBadge>
        </div>
        <p class="text-ui-small text-ui-muted mt-1">{{ employee.job_information?.job_title }}</p>
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-2 text-ui-small text-ui-muted">
          <span class="inline-flex items-center gap-1.5"><Building class="w-3.5 h-3.5 text-ui-faint" />{{ capitalize(employee.job_information?.work_location) }}</span>
          <span class="inline-flex items-center gap-1.5"><User class="w-3.5 h-3.5 text-ui-faint" />{{ employee.code }}</span>
          <span class="inline-flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5 text-ui-faint" />Joined {{ formatDate(employee.job_information?.start_date) }}</span>
        </div>
      </div>
      <div class="flex gap-2 w-full sm:w-auto shrink-0">
        <UiButton variant="secondary" :icon="Share2" class="flex-1 sm:flex-none" @click="shareProfile">Share Profile</UiButton>
        <UiButton :icon="Edit" class="flex-1 sm:flex-none" @click="editEmployee">Edit Profile</UiButton>
      </div>
    </div>

    <!-- Performance Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ui-stagger">
      <UiStat label="Tasks Completed" :icon="CheckCircle" :value="performanceStatistics.tasks_completed" hint="This month" />
      <UiStat
        label="Attendance Rate"
        :icon="CalendarCheck"
        :value="`${performanceStatistics.attendance_rate}%`"
        :hint="performanceStatistics.attendance_rate >= 80 ? 'Above average' : 'Below average'"
      />
      <UiStat label="Projects" :icon="Folder" :value="performanceStatistics.projects_count" hint="Active projects" />
      <UiStat
        label="Performance"
        :icon="TrendingUp"
        :value="`${performanceStatistics.performance_score}%`"
        :tone="performanceTone"
        :hint="
          performanceStatistics.performance_score >= 80
            ? 'Excellent rating'
            : performanceStatistics.performance_score >= 60
            ? 'Good rating'
            : 'Needs improvement'
        "
      />
    </div>

    <!-- Tab Bar: underline on desktop, scrolling chips on phones -->
    <div class="relative">
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
    <div v-show="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start ui-stagger">
      <UiCard
        v-for="section in [
          { title: 'Team Information', subtitle: 'Current team and reporting structure', icon: Users, rows: teamRows },
          { title: 'Contact Details', subtitle: 'How to reach this employee', icon: Contact, rows: contactRows },
          { title: 'Personal Information', subtitle: 'Birth and personal details', icon: Calendar, rows: personalRows },
          { title: 'Address Information', subtitle: 'Location and postal details', icon: MapPin, rows: addressRows },
        ]"
        :key="section.title"
        :title="section.title"
        :subtitle="section.subtitle"
      >
        <template #actions><component :is="section.icon" class="w-4 h-4 text-ui-faint mt-1" /></template>
        <dl class="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0">
          <div v-for="row in section.rows" :key="row.label" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
            <dt class="text-ui-small text-ui-muted shrink-0">{{ row.label }}</dt>
            <dd class="text-ui-body text-ui-ink text-right sm:text-left sm:mt-1 break-words min-w-0">{{ row.value }}</dd>
          </div>
        </dl>
      </UiCard>
    </div>

    <!-- Employment & Bank Tab -->
    <div v-show="activeTab === 'employment'" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start ui-stagger">
      <UiCard
        v-for="section in [
          { title: 'Employment Details', subtitle: 'Work arrangement and compensation', icon: Briefcase, rows: employmentRows },
          { title: 'Bank Information', subtitle: 'Banking details for payroll', icon: Wallet, rows: bankRows },
        ]"
        :key="section.title"
        :title="section.title"
        :subtitle="section.subtitle"
      >
        <template #actions><component :is="section.icon" class="w-4 h-4 text-ui-faint mt-1" /></template>
        <dl class="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0">
          <div v-for="row in section.rows" :key="row.label" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
            <dt class="text-ui-small text-ui-muted shrink-0">{{ row.label }}</dt>
            <dd class="text-ui-body text-ui-ink text-right sm:text-left sm:mt-1 break-words min-w-0" :class="row.num ? 'tabular-nums' : ''">{{ row.value }}</dd>
          </div>
        </dl>
      </UiCard>

      <!-- Administrative Information -->
      <UiCard title="Administrative Information" subtitle="System details and preferences" class="lg:col-span-2">
        <template #actions><FileText class="w-4 h-4 text-ui-faint mt-1" /></template>
        <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0">
          <div v-for="row in adminRows" :key="row.label" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
            <dt class="text-ui-small text-ui-muted shrink-0">{{ row.label }}</dt>
            <dd class="text-ui-body text-ui-ink text-right sm:text-left sm:mt-1 break-words min-w-0">{{ row.value }}</dd>
          </div>
        </dl>
        <div v-if="employee.additional_notes" class="mt-5 pt-4 border-t border-ui-line">
          <p class="text-ui-small text-ui-muted mb-2">Additional Notes</p>
          <p class="text-ui-body text-ui-ink bg-ui-subtle border border-ui-line rounded-ui-control px-3.5 py-3 whitespace-pre-line">
            {{ employee.additional_notes }}
          </p>
        </div>
      </UiCard>
    </div>

    <!-- Emergency Contact Tab -->
    <div v-show="activeTab === 'emergency'" class="ui-anim-fade-up">
      <UiCard title="Emergency Contact" subtitle="Person to contact in emergency">
        <template #actions><Phone class="w-4 h-4 text-ui-faint mt-1" /></template>
        <dl
          v-if="employee.emergency_contacts && employee.emergency_contacts.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0"
        >
          <div v-for="row in emergencyRows" :key="row.label" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
            <dt class="text-ui-small text-ui-muted shrink-0">{{ row.label }}</dt>
            <dd class="text-ui-body text-ui-ink text-right sm:text-left sm:mt-1 break-words min-w-0">{{ row.value }}</dd>
          </div>
        </dl>
        <UiEmpty v-else compact :icon="Phone" title="No emergency contact information" />
      </UiCard>
    </div>

    <!-- Documents Tab -->
    <div v-show="activeTab === 'documents'" class="ui-anim-fade-up">
      <EmployeeFiles :employee-id="route.params.id" />
    </div>

    <!-- Performance Tab -->
    <div v-show="activeTab === 'performance'" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start ui-stagger">
      <!-- Performance Reviews -->
      <UiCard title="Performance Reviews" subtitle="Employee performance review history" :padded="false">
        <template #actions>
          <UiButton v-if="can('performance-review-create')" size="sm" :icon="Star" @click="openReviewModal">
            Create Review
          </UiButton>
          <Star v-else class="w-4 h-4 text-ui-faint mt-1" />
        </template>
        <UiEmpty v-if="performanceReviews.length === 0" compact :icon="Star" title="No performance reviews yet." />
        <ul v-else class="divide-y divide-ui-line border-t border-ui-line">
          <li v-for="review in performanceReviews" :key="review.id" class="px-5 sm:px-6 py-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-ui-h3 text-ui-ink min-w-0 truncate">{{ review.period }}</p>
              <span class="flex items-center gap-0.5 shrink-0" :aria-label="`${review.overall_rating} of 5`">
                <Star
                  v-for="i in 5"
                  :key="i"
                  class="w-3.5 h-3.5"
                  :class="i <= Math.round(review.overall_rating) ? 'text-ui-warn' : 'text-ui-line-strong'"
                  :fill="i <= Math.round(review.overall_rating) ? 'currentColor' : 'none'"
                />
                <span class="text-ui-cap font-medium text-ui-ink tabular-nums ml-1">{{ review.overall_rating }}/5</span>
              </span>
            </div>
            <p v-if="review.strengths" class="text-ui-small text-ui-text mt-1.5"><span class="font-medium text-ui-ink">Kelebihan:</span> {{ review.strengths }}</p>
            <p v-if="review.areas_for_improvement" class="text-ui-small text-ui-text mt-1"><span class="font-medium text-ui-ink">Area Perbaikan:</span> {{ review.areas_for_improvement }}</p>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span class="text-ui-cap text-ui-muted">By {{ review.reviewer?.name }}</span>
              <UiBadge :tone="review.status === 'acknowledged' ? 'ok' : 'neutral'" dot>
                {{ review.status === 'acknowledged' ? 'Read by employee' : 'Awaiting employee read' }}
              </UiBadge>
            </div>
          </li>
        </ul>
      </UiCard>

      <!-- Disciplinary History -->
      <UiCard title="Riwayat Surat Peringatan" subtitle="SP1 / SP2 / SP3 previously issued" :padded="false">
        <template #actions><ShieldAlert class="w-4 h-4 text-ui-faint mt-1" /></template>
        <UiEmpty v-if="disciplinaryLetters.length === 0" compact :icon="ShieldAlert" title="Tidak ada riwayat surat peringatan." />
        <ul v-else class="divide-y divide-ui-line border-t border-ui-line">
          <li v-for="letter in disciplinaryLetters" :key="letter.id" class="px-5 sm:px-6 py-3.5 flex items-start gap-3">
            <ShieldAlert class="w-4 h-4 text-ui-bad shrink-0 mt-0.5" />
            <div class="min-w-0">
              <p class="text-ui-body font-medium text-ui-ink">{{ letter.letter_code?.code }} — {{ letter.subject }}</p>
              <p class="text-ui-cap text-ui-muted mt-0.5"><span class="font-mono">{{ letter.letter_number }}</span> • {{ formatDate(letter.date) }}</p>
            </div>
          </li>
        </ul>
      </UiCard>
    </div>

    <!-- Offboarding Tab -->
    <div v-if="can('employee-edit')" v-show="activeTab === 'offboarding'" class="space-y-4 sm:space-y-5 ui-stagger">
      <!-- Resignation / Offboarding -->
      <UiCard title="Resignation / Termination" subtitle="Process employee offboarding">
        <template #actions>
          <UiButton
            v-if="!resignation || resignation.status === 'completed'"
            variant="secondary"
            size="sm"
            :icon="LogOut"
            class="hidden sm:inline-flex"
            @click="openResignModal"
          >
            Start Resignation/Termination Process
          </UiButton>
          <LogOut v-else class="w-4 h-4 text-ui-faint mt-1" />
        </template>

        <UiButton
          v-if="!resignation || resignation.status === 'completed'"
          variant="secondary"
          :icon="LogOut"
          block
          class="sm:hidden"
          :class="resignation ? 'mb-4' : ''"
          @click="openResignModal"
        >
          Start Resignation/Termination Process
        </UiButton>

        <div v-if="resignation" class="border border-ui-line rounded-ui-card p-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-ui-h3 text-ui-ink">
              {{ resignation.type === 'terminated' ? 'Termination' : 'Resignation' }}
            </p>
            <UiBadge :tone="resignation.status === 'completed' ? 'ok' : 'warn'" dot>
              {{ resignation.status === 'completed' ? 'Selesai' : 'Dalam Proses' }}
            </UiBadge>
          </div>
          <p v-if="resignation.reason" class="text-ui-small text-ui-text">Reason: {{ resignation.reason }}</p>
          <p class="text-ui-small text-ui-muted">
            Tanggal Pengajuan: {{ formatDate(resignation.resignation_date) }}
            <span v-if="resignation.last_working_date"> • Last Working Day: {{ formatDate(resignation.last_working_date) }}</span>
          </p>

          <div v-if="assetsToReturn.length > 0" class="pt-3 border-t border-ui-line">
            <p class="text-ui-small font-medium text-ui-ink mb-1.5">Assets to be Returned:</p>
            <ul class="space-y-1">
              <li v-for="asset in assetsToReturn" :key="asset.id" class="text-ui-small text-ui-text flex items-center gap-2">
                <span class="w-1 h-1 rounded-full bg-ui-muted shrink-0"></span>
                {{ asset.name }} <span class="font-mono text-ui-cap text-ui-muted">({{ asset.asset_code }})</span>
              </li>
            </ul>
          </div>
          <p v-else class="text-ui-small text-ui-ok inline-flex items-center gap-1.5">
            <CheckCircle class="w-3.5 h-3.5" /> No assets need to be returned.
          </p>

          <div v-if="resignation.status === 'pending'" class="pt-1">
            <UiButton variant="secondary" :icon="CheckCircle" class="w-full sm:w-auto" @click="completeOffboarding">
              Selesaikan Offboarding
            </UiButton>
          </div>
        </div>
      </UiCard>

      <!-- Account Access -->
      <div v-if="canManageAccountStatus" class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 sm:px-6">
        <div class="flex flex-col sm:flex-row gap-3.5 justify-between items-start sm:items-center">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-9 h-9 rounded-ui-control bg-ui-subtle border border-ui-line flex items-center justify-center shrink-0">
              <UserCheck v-if="employee.user?.is_active" class="w-[18px] h-[18px] text-ui-ok" />
              <UserX v-else class="w-[18px] h-[18px] text-ui-bad" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-ui-h3 text-ui-ink">Account Login Access</h3>
                <UiBadge :tone="employee.user?.is_active ? 'ok' : 'bad'" dot>
                  {{ employee.user?.is_active ? "Active" : "Deactivated" }}
                </UiBadge>
              </div>
              <p class="text-ui-small text-ui-muted mt-0.5">
                {{ employee.user?.is_active ? "This account can currently log in." : "This account is deactivated and cannot log in." }}
              </p>
            </div>
          </div>
          <UiButton
            v-if="canToggleThisAccount"
            :variant="employee.user?.is_active ? 'danger' : 'secondary'"
            :icon="employee.user?.is_active ? UserX : UserCheck"
            :disabled="togglingAccountStatus"
            class="w-full sm:w-auto shrink-0"
            @click="handleToggleAccountStatus"
          >
            {{ togglingAccountStatus ? "Processing..." : employee.user?.is_active ? "Deactivate Account" : "Activate Account" }}
          </UiButton>
          <p v-else class="text-ui-cap text-ui-muted">Only Superadmin can change this account's status.</p>
        </div>
      </div>

      <!-- Danger Zone -->
      <div v-if="hasAnyRole(['superadmin'])" class="bg-ui-surface border border-ui-bad/30 rounded-ui-card px-5 py-4 sm:px-6 sm:py-5">
        <div class="flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 text-ui-bad" />
          <h3 class="text-ui-h3 text-ui-bad">Danger Zone</h3>
        </div>
        <p class="text-ui-small text-ui-muted mt-0.5">Irreversible and destructive actions</p>
        <div class="flex flex-col sm:flex-row gap-3.5 justify-between items-start sm:items-center mt-4 pt-4 border-t border-ui-line">
          <div class="flex-1 min-w-0">
            <h4 class="text-ui-body font-medium text-ui-ink">Delete Employee Profile</h4>
            <p class="text-ui-small text-ui-muted mt-0.5">
              Permanently remove this employee and all associated data. This
              action cannot be undone.
            </p>
          </div>
          <div class="flex gap-2 w-full sm:w-auto shrink-0">
            <UiButton variant="secondary" :icon="Download" class="flex-1 sm:flex-none" @click="backupEmployee">
              Backup Data
            </UiButton>
            <UiButton variant="danger" :icon="Trash2" class="flex-1 sm:flex-none" @click="showDeleteModal = true">
              Delete Employee
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <ConfirmationModal
      :show="showDeleteModal"
      title="Delete Employee"
      :message="`Are you sure you want to delete '${employee.user?.name}'? This action cannot be undone.`"
      confirmText="Delete Employee"
      cancelText="Cancel"
      type="danger"
      :loading="loading"
      @confirm="handleDeleteEmployee"
      @cancel="showDeleteModal = false"
    />

    <!-- Performance Review Modal -->
    <UiModal v-model:open="showReviewModal" title="Create Performance Review" size="md">
      <form id="employeeReviewForm" @submit.prevent="submitReview" class="space-y-4">
        <UiInput v-model="reviewForm.period" label="Periode" required placeholder="e.g. Q1 2026" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="reviewForm.period_start" type="date" label="Mulai Periode" required />
          <UiInput v-model="reviewForm.period_end" type="date" label="Akhir Periode" required />
        </div>
        <div>
          <label for="review-overall-rating" class="block text-ui-small font-medium text-ui-ink mb-1.5">
            Overall Rating (1-5)<span class="text-ui-bad"> *</span>
          </label>
          <input
            id="review-overall-rating"
            v-model.number="reviewForm.overall_rating"
            type="number"
            min="1"
            max="5"
            step="0.5"
            required
            :class="[fieldClass, 'tabular-nums']"
          />
        </div>
        <UiInput v-model="reviewForm.strengths" label="Kelebihan" :rows="2" />
        <UiInput v-model="reviewForm.areas_for_improvement" label="Area Perbaikan" :rows="2" />
        <UiInput v-model="reviewForm.goals_next_period" label="Target Periode Berikutnya" :rows="2" />

        <UiAlert v-if="reviewError" tone="bad" :message="reviewError" />
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="showReviewModal = false">Cancel</UiButton>
        <UiButton type="submit" form="employeeReviewForm" :loading="reviewSubmitting" class="flex-1 sm:flex-none">
          {{ reviewSubmitting ? "Saving..." : "Save Review" }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Resignation Modal -->
    <UiModal v-model:open="showResignModal" title="Resignation / Termination Process" size="sm">
      <form id="employeeResignForm" @submit.prevent="submitResignation" class="space-y-4">
        <UiSelect v-model="resignForm.type" label="Type" :options="resignTypeOptions" />
        <UiInput v-model="resignForm.reason" label="Reason" :rows="2" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="resignForm.resignation_date" type="date" label="Submission Date" required />
          <UiInput v-model="resignForm.last_working_date" type="date" label="Last Working Day" />
        </div>

        <UiAlert v-if="resignError" tone="bad" :message="resignError" />
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="showResignModal = false">Cancel</UiButton>
        <UiButton type="submit" form="employeeResignForm" :loading="resignSubmitting" class="flex-1 sm:flex-none">
          {{ resignSubmitting ? "Processing..." : "Process" }}
        </UiButton>
      </template>
    </UiModal>
  </div>
  </div>
</template>
