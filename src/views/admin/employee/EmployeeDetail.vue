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
import { useI18n } from "vue-i18n";

const { t, te } = useI18n();
// Known enum values get a translated label; anything else keeps capitalize().
const enumLabel = (group: string, value: any) => {
  const key = `employees.enums.${group}.${value}`;
  return value && te(key) ? t(key) : capitalize(value);
};

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
    { id: "overview", label: t("employees.detail.tabs.overview"), icon: LayoutGrid },
    { id: "employment", label: t("employees.detail.tabs.employment"), icon: Wallet },
    { id: "emergency", label: t("employees.detail.tabs.emergency"), icon: Phone },
    { id: "documents", label: t("employees.detail.tabs.documents"), icon: Images },
    { id: "performance", label: t("employees.detail.tabs.performance"), icon: Award },
  ];
  if (can("employee-edit")) {
    list.push({ id: "offboarding", label: t("employees.detail.tabs.offboarding"), icon: DoorOpen });
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
    reviewError.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t("employees.detail.reviews.saveFailed"));
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
    resignError.value = data?.message || t("employees.detail.offboarding.processFailed");
  } finally {
    resignSubmitting.value = false;
  }
};

const completeOffboarding = async () => {
  if (!resignation.value) return;
  if (!(await alertModal.confirm(t("employees.detail.offboarding.confirmComplete")))) return;
  try {
    await resignationStore.completeOffboarding(resignation.value.id);
    await resignationStore.fetchEmployeeResignation(route.params.id as string);
  } catch (error) {
    await alertModal.alert(t("employees.detail.offboarding.completeFailed"), { type: "danger" });
  }
};

// Computed properties
const statusBadgeClass = computed(() => {
  return getStatusColor(employee.value?.job_information?.status);
});

const statusText = computed(() => {
  const status = employee.value?.job_information?.status;
  return status && te(`employees.enums.jobStatus.${status}`) ? t(`employees.enums.jobStatus.${status}`) : getJobStatusText(status);
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
  await alertModal.alert(t("employees.detail.share.copied"), { type: "success" });
};

const backupEmployee = async () => {
  if (
    await alertModal.confirm(
      t("employees.detail.backup.confirm", { name: employee.value?.user?.name }),
      { type: "info", confirmText: t("employees.detail.backup.confirmText") }
    )
  ) {
    await alertModal.alert(t("employees.detail.backup.soon"));
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
  const name = employee.value?.user?.name;
  const ok = await alertModal.confirm(
    isActive
      ? t("employees.detail.account.confirmDeactivate", { name })
      : t("employees.detail.account.confirmActivate", { name }),
    {
      type: isActive ? "danger" : "info",
      confirmText: isActive ? t("employees.detail.account.deactivateShort") : t("employees.detail.account.activateShort"),
    }
  );
  if (!ok) return;

  togglingAccountStatus.value = true;
  try {
    const updated = await employeeStore.toggleAccountStatus(route.params.id as string);
    if (employee.value && updated?.user) {
      employee.value.user.is_active = updated.user.is_active;
    }
    await alertModal.alert(
      isActive ? t("employees.detail.account.deactivatedOk") : t("employees.detail.account.activatedOk"),
      { type: "success" }
    );
  } catch (error: any) {
    await alertModal.alert(error?.response?.data?.message ||
        (isActive ? t("employees.detail.account.deactivateFailed") : t("employees.detail.account.activateFailed")), { type: "danger" });
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
const resignTypeOptions = computed(() => [
  { value: "resign", label: t("employees.detail.offboarding.resignation") },
  { value: "terminated", label: t("employees.detail.offboarding.termination") },
]);
const fieldClass =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";

const teamRows = computed(() => [
  { label: t("employees.detail.fields.team"), value: employee.value?.team?.name || "-" },
  {
    label: t("employees.detail.fields.teamMembers"),
    value: t("employees.detail.fields.membersCount", { n: employee.value?.team?.members_count || 0 }, employee.value?.team?.members_count || 0),
  },
  { label: t("employees.detail.fields.teamStatus"), value: enumLabel("teamStatus", employee.value?.team?.status) },
]);
const contactRows = computed(() => [
  { label: t("common.labels.email"), value: employee.value?.user?.email },
  { label: t("common.labels.phone"), value: employee.value?.phone },
  { label: t("employees.detail.fields.identityNumber"), value: employee.value?.identity_number },
]);
const personalRows = computed(() => [
  { label: t("employees.detail.fields.dateOfBirth"), value: formatDate(employee.value?.date_of_birth) },
  { label: t("employees.detail.fields.placeOfBirth"), value: employee.value?.place_of_birth },
  { label: t("employees.detail.fields.gender"), value: enumLabel("gender", employee.value?.gender) },
  { label: t("employees.detail.fields.hobby"), value: employee.value?.hobby || "-" },
]);
const addressRows = computed(() => [
  { label: t("common.labels.address"), value: employee.value?.address },
  { label: t("common.labels.city"), value: employee.value?.city },
  { label: t("employees.detail.fields.postCode"), value: employee.value?.postal_code },
]);
const employmentRows = computed(() => [
  {
    label: t("employees.detail.fields.yearsExperience"),
    value: t(
      "employees.detail.fields.years",
      { n: employee.value?.job_information?.years_experience },
      Number(employee.value?.job_information?.years_experience) || 0
    ),
  },
  { label: t("employees.detail.fields.employmentType"), value: enumLabel("employmentType", employee.value?.job_information?.employment_type) },
  { label: t("employees.detail.fields.startDate"), value: formatDate(employee.value?.job_information?.start_date) },
  { label: t("employees.detail.fields.monthlySalary"), value: formatCurrency(employee.value?.job_information?.monthly_salary), num: true },
]);
const bankRows = computed(() => [
  { label: t("employees.detail.fields.bankName"), value: capitalize(employee.value?.bank_information?.bank_name) || "-" },
  { label: t("employees.detail.fields.accountNumber"), value: employee.value?.bank_information?.account_number || "-", num: true },
  { label: t("employees.detail.fields.accountHolder"), value: employee.value?.bank_information?.account_holder_name || "-" },
  { label: t("employees.detail.fields.accountType"), value: enumLabel("accountType", employee.value?.bank_information?.account_type) || "-" },
]);
const adminRows = computed(() => [
  { label: t("employees.detail.fields.employeeId"), value: employee.value?.code },
  { label: t("employees.detail.fields.preferredLanguage"), value: enumLabel("language", employee.value?.preferred_language) || "-" },
]);
const emergencyRows = computed(() => {
  const c = employee.value?.emergency_contacts?.[0];
  if (!c) return [];
  return [
    { label: t("employees.detail.fields.contactName"), value: c.full_name },
    { label: t("employees.detail.fields.relationship"), value: capitalize(c.relationship) },
    { label: t("common.labels.phone"), value: c.phone },
    { label: t("common.labels.email"), value: c.email || "-" },
  ];
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
  <!-- Loading -->
  <div v-if="loading" role="status" :aria-label="$t('employees.detail.loading')" class="space-y-5">
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
    <span class="sr-only">{{ $t("employees.detail.loading") }}</span>
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
            {{ enumLabel("skillLevel", employee.job_information?.skill_level) }}
          </UiBadge>
          <UiBadge v-if="employee.user?.is_active === false" tone="bad">{{ $t("employees.detail.loginDisabled") }}</UiBadge>
        </div>
        <p class="text-ui-small text-ui-muted mt-1">{{ employee.job_information?.job_title }}</p>
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-2 text-ui-small text-ui-muted">
          <span class="inline-flex items-center gap-1.5"><Building class="w-3.5 h-3.5 text-ui-faint" />{{ enumLabel("workLocation", employee.job_information?.work_location) }}</span>
          <span class="inline-flex items-center gap-1.5"><User class="w-3.5 h-3.5 text-ui-faint" />{{ employee.code }}</span>
          <span class="inline-flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5 text-ui-faint" />{{ $t("employees.detail.joined", { date: formatDate(employee.job_information?.start_date) }) }}</span>
        </div>
      </div>
      <div class="flex gap-2 w-full sm:w-auto shrink-0">
        <UiButton variant="secondary" :icon="Share2" class="flex-1 sm:flex-none" @click="shareProfile">{{ $t("employees.detail.shareProfile") }}</UiButton>
        <UiButton :icon="Edit" class="flex-1 sm:flex-none" @click="editEmployee">{{ $t("employees.detail.editProfile") }}</UiButton>
      </div>
    </div>

    <!-- Performance Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ui-stagger">
      <UiStat :label="$t('employees.detail.stats.tasksCompleted')" :icon="CheckCircle" :value="performanceStatistics.tasks_completed" :hint="$t('employees.detail.stats.thisMonth')" />
      <UiStat
        :label="$t('employees.detail.stats.attendanceRate')"
        :icon="CalendarCheck"
        :value="`${performanceStatistics.attendance_rate}%`"
        :hint="performanceStatistics.attendance_rate >= 80 ? $t('employees.detail.stats.aboveAverage') : $t('employees.detail.stats.belowAverage')"
      />
      <UiStat :label="$t('employees.detail.stats.projects')" :icon="Folder" :value="performanceStatistics.projects_count" :hint="$t('employees.detail.stats.activeProjects')" />
      <UiStat
        :label="$t('employees.detail.stats.performance')"
        :icon="TrendingUp"
        :value="`${performanceStatistics.performance_score}%`"
        :tone="performanceTone"
        :hint="
          performanceStatistics.performance_score >= 80
            ? $t('employees.detail.stats.excellent')
            : performanceStatistics.performance_score >= 60
            ? $t('employees.detail.stats.good')
            : $t('employees.detail.stats.needsImprovement')
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
          { key: 'team', title: $t('employees.detail.sections.team.title'), subtitle: $t('employees.detail.sections.team.subtitle'), icon: Users, rows: teamRows },
          { key: 'contact', title: $t('employees.detail.sections.contact.title'), subtitle: $t('employees.detail.sections.contact.subtitle'), icon: Contact, rows: contactRows },
          { key: 'personal', title: $t('employees.detail.sections.personal.title'), subtitle: $t('employees.detail.sections.personal.subtitle'), icon: Calendar, rows: personalRows },
          { key: 'address', title: $t('employees.detail.sections.address.title'), subtitle: $t('employees.detail.sections.address.subtitle'), icon: MapPin, rows: addressRows },
        ]"
        :key="section.key"
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
          { key: 'employment', title: $t('employees.detail.sections.employment.title'), subtitle: $t('employees.detail.sections.employment.subtitle'), icon: Briefcase, rows: employmentRows },
          { key: 'bank', title: $t('employees.detail.sections.bank.title'), subtitle: $t('employees.detail.sections.bank.subtitle'), icon: Wallet, rows: bankRows },
        ]"
        :key="section.key"
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
      <UiCard :title="$t('employees.detail.sections.admin.title')" :subtitle="$t('employees.detail.sections.admin.subtitle')" class="lg:col-span-2">
        <template #actions><FileText class="w-4 h-4 text-ui-faint mt-1" /></template>
        <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-x-6 sm:gap-y-5 divide-y divide-ui-line sm:divide-y-0 -my-3 sm:my-0">
          <div v-for="row in adminRows" :key="row.label" class="flex justify-between gap-4 py-3 sm:block sm:py-0 min-w-0">
            <dt class="text-ui-small text-ui-muted shrink-0">{{ row.label }}</dt>
            <dd class="text-ui-body text-ui-ink text-right sm:text-left sm:mt-1 break-words min-w-0">{{ row.value }}</dd>
          </div>
        </dl>
        <div v-if="employee.additional_notes" class="mt-5 pt-4 border-t border-ui-line">
          <p class="text-ui-small text-ui-muted mb-2">{{ $t("employees.detail.fields.additionalNotes") }}</p>
          <p class="text-ui-body text-ui-ink bg-ui-subtle border border-ui-line rounded-ui-control px-3.5 py-3 whitespace-pre-line">
            {{ employee.additional_notes }}
          </p>
        </div>
      </UiCard>
    </div>

    <!-- Emergency Contact Tab -->
    <div v-show="activeTab === 'emergency'" class="ui-anim-fade-up">
      <UiCard :title="$t('employees.detail.sections.emergency.title')" :subtitle="$t('employees.detail.sections.emergency.subtitle')">
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
        <UiEmpty v-else compact :icon="Phone" :title="$t('employees.detail.noEmergencyContact')" />
      </UiCard>
    </div>

    <!-- Documents Tab -->
    <div v-show="activeTab === 'documents'" class="ui-anim-fade-up">
      <EmployeeFiles :employee-id="route.params.id" />
    </div>

    <!-- Performance Tab -->
    <div v-show="activeTab === 'performance'" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start ui-stagger">
      <!-- Performance Reviews -->
      <UiCard :title="$t('employees.detail.reviews.title')" :subtitle="$t('employees.detail.reviews.subtitle')" :padded="false">
        <template #actions>
          <UiButton v-if="can('performance-review-create')" size="sm" :icon="Star" @click="openReviewModal">
            {{ $t("employees.detail.reviews.create") }}
          </UiButton>
          <Star v-else class="w-4 h-4 text-ui-faint mt-1" />
        </template>
        <UiEmpty v-if="performanceReviews.length === 0" compact :icon="Star" :title="$t('employees.detail.reviews.empty')" />
        <ul v-else class="divide-y divide-ui-line border-t border-ui-line">
          <li v-for="review in performanceReviews" :key="review.id" class="px-5 sm:px-6 py-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-ui-h3 text-ui-ink min-w-0 truncate">{{ review.period }}</p>
              <span class="flex items-center gap-0.5 shrink-0" :aria-label="$t('employees.detail.reviews.ratingOf', { rating: review.overall_rating })">
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
            <p v-if="review.strengths" class="text-ui-small text-ui-text mt-1.5"><span class="font-medium text-ui-ink">{{ $t("employees.detail.reviews.strengths") }}</span> {{ review.strengths }}</p>
            <p v-if="review.areas_for_improvement" class="text-ui-small text-ui-text mt-1"><span class="font-medium text-ui-ink">{{ $t("employees.detail.reviews.improvements") }}</span> {{ review.areas_for_improvement }}</p>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span class="text-ui-cap text-ui-muted">{{ $t("employees.detail.reviews.by", { name: review.reviewer?.name }) }}</span>
              <UiBadge :tone="review.status === 'acknowledged' ? 'ok' : 'neutral'" dot>
                {{ review.status === 'acknowledged' ? $t('employees.detail.reviews.acknowledged') : $t('employees.detail.reviews.awaiting') }}
              </UiBadge>
            </div>
          </li>
        </ul>
      </UiCard>

      <!-- Disciplinary History -->
      <UiCard :title="$t('employees.detail.warnings.title')" :subtitle="$t('employees.detail.warnings.subtitle')" :padded="false">
        <template #actions><ShieldAlert class="w-4 h-4 text-ui-faint mt-1" /></template>
        <UiEmpty v-if="disciplinaryLetters.length === 0" compact :icon="ShieldAlert" :title="$t('employees.detail.warnings.empty')" />
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
      <UiCard :title="$t('employees.detail.offboarding.title')" :subtitle="$t('employees.detail.offboarding.subtitle')">
        <template #actions>
          <UiButton
            v-if="!resignation || resignation.status === 'completed'"
            variant="secondary"
            size="sm"
            :icon="LogOut"
            class="hidden sm:inline-flex"
            @click="openResignModal"
          >
            {{ $t("employees.detail.offboarding.start") }}
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
          {{ $t("employees.detail.offboarding.start") }}
        </UiButton>

        <div v-if="resignation" class="border border-ui-line rounded-ui-card p-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-ui-h3 text-ui-ink">
              {{ resignation.type === 'terminated' ? $t('employees.detail.offboarding.termination') : $t('employees.detail.offboarding.resignation') }}
            </p>
            <UiBadge :tone="resignation.status === 'completed' ? 'ok' : 'warn'" dot>
              {{ resignation.status === 'completed' ? $t('employees.detail.offboarding.completed') : $t('employees.detail.offboarding.inProgress') }}
            </UiBadge>
          </div>
          <p v-if="resignation.reason" class="text-ui-small text-ui-text">{{ $t("employees.detail.offboarding.reason", { reason: resignation.reason }) }}</p>
          <p class="text-ui-small text-ui-muted">
            {{ $t("employees.detail.offboarding.submittedOn", { date: formatDate(resignation.resignation_date) }) }}
            <span v-if="resignation.last_working_date"> • {{ $t("employees.detail.offboarding.lastWorkingDay", { date: formatDate(resignation.last_working_date) }) }}</span>
          </p>

          <div v-if="assetsToReturn.length > 0" class="pt-3 border-t border-ui-line">
            <p class="text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("employees.detail.offboarding.assetsToReturn") }}</p>
            <ul class="space-y-1">
              <li v-for="asset in assetsToReturn" :key="asset.id" class="text-ui-small text-ui-text flex items-center gap-2">
                <span class="w-1 h-1 rounded-full bg-ui-muted shrink-0"></span>
                {{ asset.name }} <span class="font-mono text-ui-cap text-ui-muted">({{ asset.asset_code }})</span>
              </li>
            </ul>
          </div>
          <p v-else class="text-ui-small text-ui-ok inline-flex items-center gap-1.5">
            <CheckCircle class="w-3.5 h-3.5" /> {{ $t("employees.detail.offboarding.noAssets") }}
          </p>

          <div v-if="resignation.status === 'pending'" class="pt-1">
            <UiButton variant="secondary" :icon="CheckCircle" class="w-full sm:w-auto" @click="completeOffboarding">
              {{ $t("employees.detail.offboarding.complete") }}
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
                <h3 class="text-ui-h3 text-ui-ink">{{ $t("employees.detail.account.title") }}</h3>
                <UiBadge :tone="employee.user?.is_active ? 'ok' : 'bad'" dot>
                  {{ employee.user?.is_active ? $t("employees.detail.account.active") : $t("employees.detail.account.deactivated") }}
                </UiBadge>
              </div>
              <p class="text-ui-small text-ui-muted mt-0.5">
                {{ employee.user?.is_active ? $t("employees.detail.account.canLogin") : $t("employees.detail.account.cannotLogin") }}
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
            {{
              togglingAccountStatus
                ? $t("employees.detail.account.processing")
                : employee.user?.is_active
                ? $t("employees.detail.account.deactivate")
                : $t("employees.detail.account.activate")
            }}
          </UiButton>
          <p v-else class="text-ui-cap text-ui-muted">{{ $t("employees.detail.account.superadminOnly") }}</p>
        </div>
      </div>

      <!-- Danger Zone -->
      <div v-if="hasAnyRole(['superadmin'])" class="bg-ui-surface border border-ui-bad/30 rounded-ui-card px-5 py-4 sm:px-6 sm:py-5">
        <div class="flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 text-ui-bad" />
          <h3 class="text-ui-h3 text-ui-bad">{{ $t("employees.detail.danger.title") }}</h3>
        </div>
        <p class="text-ui-small text-ui-muted mt-0.5">{{ $t("employees.detail.danger.subtitle") }}</p>
        <div class="flex flex-col sm:flex-row gap-3.5 justify-between items-start sm:items-center mt-4 pt-4 border-t border-ui-line">
          <div class="flex-1 min-w-0">
            <h4 class="text-ui-body font-medium text-ui-ink">{{ $t("employees.detail.danger.deleteTitle") }}</h4>
            <p class="text-ui-small text-ui-muted mt-0.5">
              {{ $t("employees.detail.danger.deleteText") }}
            </p>
          </div>
          <div class="flex gap-2 w-full sm:w-auto shrink-0">
            <UiButton variant="secondary" :icon="Download" class="flex-1 sm:flex-none" @click="backupEmployee">
              {{ $t("employees.detail.danger.backup") }}
            </UiButton>
            <UiButton variant="danger" :icon="Trash2" class="flex-1 sm:flex-none" @click="showDeleteModal = true">
              {{ $t("employees.detail.danger.delete") }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <ConfirmationModal
      :show="showDeleteModal"
      :title="$t('employees.detail.danger.delete')"
      :message="$t('employees.detail.danger.deleteConfirm', { name: employee.user?.name })"
      :confirmText="$t('employees.detail.danger.delete')"
      :cancelText="$t('common.actions.cancel')"
      type="danger"
      :loading="loading"
      @confirm="handleDeleteEmployee"
      @cancel="showDeleteModal = false"
    />

    <!-- Performance Review Modal -->
    <UiModal v-model:open="showReviewModal" :title="$t('employees.detail.reviews.modalTitle')" size="md">
      <form id="employeeReviewForm" @submit.prevent="submitReview" class="space-y-4">
        <UiInput v-model="reviewForm.period" :label="$t('employees.detail.reviews.period')" required :placeholder="$t('employees.detail.reviews.periodPlaceholder')" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="reviewForm.period_start" type="date" :label="$t('employees.detail.reviews.periodStart')" required />
          <UiInput v-model="reviewForm.period_end" type="date" :label="$t('employees.detail.reviews.periodEnd')" required />
        </div>
        <div>
          <label for="review-overall-rating" class="block text-ui-small font-medium text-ui-ink mb-1.5">
            {{ $t("employees.detail.reviews.overallRating") }}<span class="text-ui-bad"> *</span>
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
        <UiInput v-model="reviewForm.strengths" :label="$t('employees.detail.reviews.strengthsLabel')" :rows="2" />
        <UiInput v-model="reviewForm.areas_for_improvement" :label="$t('employees.detail.reviews.improvementsLabel')" :rows="2" />
        <UiInput v-model="reviewForm.goals_next_period" :label="$t('employees.detail.reviews.goalsLabel')" :rows="2" />

        <UiAlert v-if="reviewError" tone="bad" :message="reviewError" />
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="showReviewModal = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="employeeReviewForm" :loading="reviewSubmitting" class="flex-1 sm:flex-none">
          {{ reviewSubmitting ? $t("common.actions.saving") : $t("employees.detail.reviews.save") }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Resignation Modal -->
    <UiModal v-model:open="showResignModal" :title="$t('employees.detail.offboarding.modalTitle')" size="sm">
      <form id="employeeResignForm" @submit.prevent="submitResignation" class="space-y-4">
        <UiSelect v-model="resignForm.type" :label="$t('employees.detail.offboarding.typeLabel')" :options="resignTypeOptions" />
        <UiInput v-model="resignForm.reason" :label="$t('employees.detail.offboarding.reasonLabel')" :rows="2" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="resignForm.resignation_date" type="date" :label="$t('employees.detail.offboarding.submissionDate')" required />
          <UiInput v-model="resignForm.last_working_date" type="date" :label="$t('employees.detail.offboarding.lastWorkingDayLabel')" />
        </div>

        <UiAlert v-if="resignError" tone="bad" :message="resignError" />
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="showResignModal = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="employeeResignForm" :loading="resignSubmitting" class="flex-1 sm:flex-none">
          {{ resignSubmitting ? $t("employees.detail.offboarding.processing") : $t("employees.detail.offboarding.process") }}
        </UiButton>
      </template>
    </UiModal>
  </div>
  </div>
</template>
