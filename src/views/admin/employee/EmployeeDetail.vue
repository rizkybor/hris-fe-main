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
import { can } from "@/helpers/permissionHelper";
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
} from "lucide-vue-next";
import { useScrollFade } from "@/composables/useScrollFade";

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

onMounted(() => {
  loadEmployee();
});
</script>

<template>
  <div class="px-4 py-4">
  <div v-if="loading" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div
        class="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3.5"
      ></div>
      <p class="text-brand-dark text-sm font-medium">
        Loading employee data...
      </p>
    </div>
  </div>

  <div v-else-if="employee">
    <!-- Employee Header -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] mb-5 p-3.5 sm:p-5">
      <div class="flex flex-col sm:flex-row items-center sm:items-center gap-5">
        <div class="relative shrink-0">
          <Avatar
            :src="employee.user?.profile_photo"
            :alt="employee.user?.name"
            size="w-16 h-16 sm:w-20 sm:h-20"
            icon-size="w-7 h-7 sm:w-9 sm:h-9"
          />
          <span
            :class="statusBadgeClass"
            class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap"
          >
            {{ capitalize(statusText) }}
          </span>
        </div>
        <div class="flex-1 text-center sm:text-left min-w-0 w-full">
          <div class="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3.5 mb-1.5">
            <h1 class="text-brand-dark text-lg sm:text-xl font-extrabold truncate max-w-full">
              {{ employee.user?.name }}
            </h1>
            <span
              :class="
                getLevelColor(capitalize(employee.job_information?.skill_level))
              "
              class="px-2.5 py-1 rounded-md text-sm font-semibold shrink-0"
            >
              {{ capitalize(employee.job_information?.skill_level) }}
            </span>
          </div>
          <p class="text-brand-light text-sm sm:text-sm mb-2.5">
            {{ employee.job_information?.job_title }}
          </p>
          <div class="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-5 text-sm sm:text-sm text-gray-600">
            <div class="flex items-center gap-1.5">
              <Building class="w-4 h-4 shrink-0" />
              <span>{{
                capitalize(employee.job_information?.work_location)
              }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <User class="w-4 h-4 shrink-0" />
              <span>{{ employee.code }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <Calendar class="w-4 h-4 shrink-0" />
              <span
                >Joined
                {{ formatDate(employee.job_information?.start_date) }}</span
              >
            </div>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
          <button
            @click="editEmployee"
            class="btn-primary w-full sm:w-auto rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-5 py-2.5 flex items-center justify-center gap-1.5"
          >
            <Edit class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold"
              >Edit Profile</span
            >
          </button>
          <button
            @click="shareProfile"
            class="bg-white border border-[#DCDEDD] text-brand-dark w-full sm:w-auto py-2.5 px-5 rounded-[8px] font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Share2 class="w-4 h-4" />
            Share Profile
          </button>
        </div>
      </div>
    </div>

    <!-- Performance Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Tasks Completed</p>
            <p
              class="text-brand-dark text-lg sm:text-xl font-extrabold leading-tight my-1.5"
            >
              {{ loading ? "..." : performanceStatistics.tasks_completed }}
            </p>
            <p class="text-success text-sm font-medium">This month</p>
          </div>
          <div
            class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center"
          >
            <CheckCircle class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Attendance Rate</p>
            <p
              class="text-brand-dark text-lg sm:text-xl font-extrabold leading-tight my-1.5"
            >
              {{
                loading ? "..." : `${performanceStatistics.attendance_rate}%`
              }}
            </p>
            <p class="text-success text-sm font-medium">
              {{
                performanceStatistics.attendance_rate >= 80
                  ? "Above average"
                  : "Below average"
              }}
            </p>
          </div>
          <div
            class="w-9 h-9 bg-green-50 rounded-[12px] flex items-center justify-center"
          >
            <CalendarCheck class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Projects</p>
            <p
              class="text-brand-dark text-lg sm:text-xl font-extrabold leading-tight my-1.5"
            >
              {{ loading ? "..." : performanceStatistics.projects_count }}
            </p>
            <p class="text-success text-sm font-medium">Active projects</p>
          </div>
          <div
            class="w-9 h-9 bg-purple-50 rounded-[12px] flex items-center justify-center"
          >
            <Folder class="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Performance</p>
            <p
              class="text-brand-dark text-lg sm:text-xl font-extrabold leading-tight my-1.5"
            >
              {{
                loading ? "..." : `${performanceStatistics.performance_score}%`
              }}
            </p>
            <p
              :class="
                performanceStatistics.performance_score >= 80
                  ? 'text-success'
                  : performanceStatistics.performance_score >= 60
                  ? 'text-warning'
                  : 'text-danger'
              "
              class="text-sm font-medium"
            >
              {{
                performanceStatistics.performance_score >= 80
                  ? "Excellent rating"
                  : performanceStatistics.performance_score >= 60
                  ? "Good rating"
                  : "Needs improvement"
              }}
            </p>
          </div>
          <div
            class="w-9 h-9 bg-orange-50 rounded-[12px] flex items-center justify-center"
          >
            <TrendingUp class="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="relative mb-5">
      <div
        ref="tabScrollRef"
        @scroll="updateTabFade"
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-1.5 overflow-x-auto"
      >
        <div class="flex items-center gap-1 min-w-max">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-sm font-semibold transition-all duration-200 whitespace-nowrap',
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
    <div v-show="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
      <!-- Team Information -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
        <div class="flex items-center gap-2.5 mb-3.5">
          <div
            class="w-9 h-9 bg-indigo-50 rounded-[12px] flex items-center justify-center"
          >
            <Users class="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">Team Information</h3>
            <p class="text-brand-light text-sm">
              Current team and reporting structure
            </p>
          </div>
        </div>
        <div class="space-y-3.5">
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Team</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.team?.name || "-" }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Team Members</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.team?.members_count || 0 }} members
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Team Status</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ capitalize(employee.team?.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Contact Details -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
        <div class="flex items-center gap-2.5 mb-3.5">
          <div
            class="w-9 h-9 bg-teal-50 rounded-[12px] flex items-center justify-center"
          >
            <Contact class="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">Contact Details</h3>
            <p class="text-brand-light text-sm">How to reach this employee</p>
          </div>
        </div>
        <div class="space-y-3.5">
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Email</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.user?.email }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Phone</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.phone }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Identity Number</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.identity_number }}
            </span>
          </div>
        </div>
      </div>

      <!-- Personal Information -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
        <div class="flex items-center gap-2.5 mb-3.5">
          <div
            class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center"
          >
            <Calendar class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">
              Personal Information
            </h3>
            <p class="text-brand-light text-sm">Birth and personal details</p>
          </div>
        </div>
        <div class="space-y-3.5">
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Date of Birth</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ formatDate(employee.date_of_birth) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Place of Birth</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.place_of_birth }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Gender</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ capitalize(employee.gender) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Hobby</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.hobby || "-" }}
            </span>
          </div>
        </div>
      </div>

      <!-- Address Information -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
        <div class="flex items-center gap-2.5 mb-3.5">
          <div
            class="w-9 h-9 bg-purple-50 rounded-[12px] flex items-center justify-center"
          >
            <MapPin class="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">
              Address Information
            </h3>
            <p class="text-brand-light text-sm">Location and postal details</p>
          </div>
        </div>
        <div class="space-y-3.5">
          <div class="flex justify-between items-start">
            <span class="text-brand-light text-sm">Address</span>
            <span
              class="text-brand-dark text-sm font-medium text-right max-w-[60%]"
            >
              {{ employee.address }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">City</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.city }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Post Code</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.postal_code }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Employment & Bank Tab -->
    <div v-show="activeTab === 'employment'" class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
      <!-- Employment Details -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
        <div class="flex items-center gap-2.5 mb-3.5">
          <div
            class="w-9 h-9 bg-green-50 rounded-[12px] flex items-center justify-center"
          >
            <Briefcase class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">
              Employment Details
            </h3>
            <p class="text-brand-light text-sm">
              Work arrangement and compensation
            </p>
          </div>
        </div>
        <div class="space-y-3.5">
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Years of Experience</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.job_information?.years_experience }} years
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Employment Type</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ capitalize(employee.job_information?.employment_type) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Start Date</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ formatDate(employee.job_information?.start_date) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Monthly Salary</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ formatCurrency(employee.job_information?.monthly_salary) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Bank Information -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
        <div class="flex items-center gap-2.5 mb-3.5">
          <div
            class="w-9 h-9 bg-cyan-50 rounded-[12px] flex items-center justify-center"
          >
            <Briefcase class="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">Bank Information</h3>
            <p class="text-brand-light text-sm">Banking details for payroll</p>
          </div>
        </div>
        <div class="space-y-3.5">
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Bank Name</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ capitalize(employee.bank_information?.bank_name) || "-" }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Account Number</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.bank_information?.account_number || "-" }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Account Holder</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.bank_information?.account_holder_name || "-" }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Account Type</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ capitalize(employee.bank_information?.account_type) || "-" }}
            </span>
          </div>
        </div>
      </div>

      <!-- Administrative Information -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5 lg:col-span-2">
        <div class="flex items-center gap-2.5 mb-3.5">
          <div
            class="w-9 h-9 bg-orange-50 rounded-[12px] flex items-center justify-center"
          >
            <FileText class="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">
              Administrative Information
            </h3>
            <p class="text-brand-light text-sm">
              System details and preferences
            </p>
          </div>
        </div>
        <div class="space-y-3.5">
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Employee ID</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.code }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Preferred Language</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ capitalize(employee.preferred_language) || "-" }}
            </span>
          </div>
          <div class="space-y-1.5" v-if="employee.additional_notes">
            <span class="text-brand-light text-sm mb-[10px] block"
              >Additional Notes</span
            >
            <div class="bg-gray-50 rounded-[12px] p-3.5 border border-gray-200">
              <p class="text-brand-dark text-sm font-medium leading-relaxed">
                {{ employee.additional_notes }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Emergency Contact Tab -->
    <div v-show="activeTab === 'emergency'" class="mb-5">
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5 max-w-2xl">
        <div class="flex items-center gap-2.5 mb-3.5">
          <div
            class="w-9 h-9 bg-red-50 rounded-[12px] flex items-center justify-center"
          >
            <Phone class="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">Emergency Contact</h3>
            <p class="text-brand-light text-sm">
              Person to contact in emergency
            </p>
          </div>
        </div>
        <div
          class="space-y-3.5"
          v-if="
            employee.emergency_contacts &&
            employee.emergency_contacts.length > 0
          "
        >
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Contact Name</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.emergency_contacts[0].full_name }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Relationship</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ capitalize(employee.emergency_contacts[0].relationship) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Phone</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.emergency_contacts[0].phone }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-brand-light text-sm">Email</span>
            <span class="text-brand-dark text-sm font-medium">
              {{ employee.emergency_contacts[0].email || "-" }}
            </span>
          </div>
        </div>
        <div v-else class="text-center py-3.5">
          <p class="text-brand-light text-sm">
            No emergency contact information
          </p>
        </div>
      </div>
    </div>

    <!-- Documents Tab -->
    <div v-show="activeTab === 'documents'" class="mb-5">
      <EmployeeFiles :employee-id="route.params.id" />
    </div>

    <!-- Performance Tab -->
    <div v-show="activeTab === 'performance'" class="mb-5 space-y-5">
      <!-- Performance Reviews -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3.5">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 bg-yellow-50 rounded-[12px] flex items-center justify-center shrink-0">
              <Star class="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-sm font-bold">Performance Reviews</h3>
              <p class="text-brand-light text-sm">Employee performance review history</p>
            </div>
          </div>
          <button
            v-if="can('performance-review-create')"
            @click="openReviewModal"
            class="btn-primary w-full sm:w-auto rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-3.5 py-1.5 flex items-center justify-center gap-1.5 shrink-0"
          >
            <span class="text-brand-white text-sm font-semibold">Create Review</span>
          </button>
        </div>
        <div v-if="performanceReviews.length === 0" class="text-center py-5 text-sm text-gray-400">
          No performance reviews yet.
        </div>
        <div v-else class="space-y-2.5">
          <div v-for="review in performanceReviews" :key="review.id" class="bg-white border border-[#DCDEDD] rounded-[12px] p-3.5">
            <div class="flex items-center justify-between mb-1.5">
              <p class="text-brand-dark text-sm font-semibold">{{ review.period }}</p>
              <span class="flex items-center gap-0.5">
                <Star
                  v-for="i in 5"
                  :key="i"
                  class="w-3.5 h-3.5"
                  :class="i <= Math.round(review.overall_rating) ? 'text-amber-500' : 'text-gray-200'"
                  :fill="i <= Math.round(review.overall_rating) ? 'currentColor' : 'none'"
                />
                <span class="text-xs font-semibold text-brand-dark ml-1">{{ review.overall_rating }}/5</span>
              </span>
            </div>
            <p v-if="review.strengths" class="text-brand-light text-xs mb-1"><strong>Kelebihan:</strong> {{ review.strengths }}</p>
            <p v-if="review.areas_for_improvement" class="text-brand-light text-xs mb-1"><strong>Area Perbaikan:</strong> {{ review.areas_for_improvement }}</p>
            <p class="text-xs text-gray-400 mt-1.5">By {{ review.reviewer?.name }} • {{ review.status === 'acknowledged' ? 'Read by employee' : 'Awaiting employee read' }}</p>
          </div>
        </div>
      </div>

      <!-- Disciplinary History -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
        <div class="flex items-center gap-2.5 mb-3.5">
          <div class="w-9 h-9 bg-red-50 rounded-[12px] flex items-center justify-center">
            <ShieldAlert class="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">Riwayat Surat Peringatan</h3>
            <p class="text-brand-light text-sm">SP1 / SP2 / SP3 previously issued</p>
          </div>
        </div>
        <div v-if="disciplinaryLetters.length === 0" class="text-center py-5 text-sm text-gray-400">
          Tidak ada riwayat surat peringatan.
        </div>
        <div v-else class="space-y-2.5">
          <div v-for="letter in disciplinaryLetters" :key="letter.id" class="border border-[#DCDEDD] rounded-[12px] p-3.5 flex items-center justify-between">
            <div>
              <p class="text-brand-dark text-sm font-semibold">{{ letter.letter_code?.code }} — {{ letter.subject }}</p>
              <p class="text-brand-light text-xs">{{ letter.letter_number }} • {{ formatDate(letter.date) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Offboarding Tab -->
    <div v-if="can('employee-edit')" v-show="activeTab === 'offboarding'" class="mb-5 space-y-5">
      <!-- Resignation / Offboarding -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3.5">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 bg-orange-50 rounded-[12px] flex items-center justify-center shrink-0">
              <LogOut class="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-sm font-bold">Resignation / Termination</h3>
              <p class="text-brand-light text-sm">Process employee offboarding</p>
            </div>
          </div>
          <button
            v-if="!resignation || resignation.status === 'completed'"
            @click="openResignModal"
            class="w-full sm:w-auto px-3.5 py-1.5 rounded-lg border border-orange-300 text-orange-700 text-sm font-semibold hover:bg-orange-50 shrink-0"
          >
            Start Resignation/Termination Process
          </button>
        </div>

        <div v-if="resignation" class="border border-[#DCDEDD] rounded-[12px] p-3.5 space-y-2.5">
          <div class="flex items-center justify-between">
            <p class="text-brand-dark text-sm font-semibold">
              {{ resignation.type === 'terminated' ? 'Termination' : 'Resignation' }}
            </p>
            <span :class="['px-1.5 py-1 rounded-md text-xs font-semibold', resignation.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700']">
              {{ resignation.status === 'completed' ? 'Selesai' : 'Dalam Proses' }}
            </span>
          </div>
          <p v-if="resignation.reason" class="text-brand-light text-xs">Reason: {{ resignation.reason }}</p>
          <p class="text-brand-light text-xs">
            Tanggal Pengajuan: {{ formatDate(resignation.resignation_date) }}
            <span v-if="resignation.last_working_date"> • Last Working Day: {{ formatDate(resignation.last_working_date) }}</span>
          </p>

          <div v-if="assetsToReturn.length > 0">
            <p class="text-xs font-semibold text-brand-dark mb-1">Assets to be Returned:</p>
            <ul class="list-disc list-inside text-xs text-brand-light">
              <li v-for="asset in assetsToReturn" :key="asset.id">{{ asset.name }} ({{ asset.asset_code }})</li>
            </ul>
          </div>
          <p v-else class="text-xs text-green-600">No assets need to be returned.</p>

          <button
            v-if="resignation.status === 'pending'"
            @click="completeOffboarding"
            class="px-3.5 py-1.5 rounded-lg border border-green-300 text-green-700 text-sm font-semibold hover:bg-green-50"
          >
            Selesaikan Offboarding
          </button>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-white border border-[#FEE2E2] rounded-[12px] p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div
            class="w-9 h-9 bg-red-50 rounded-[12px] flex items-center justify-center"
          >
            <AlertTriangle class="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-sm font-bold">Danger Zone</h3>
            <p class="text-brand-light text-sm">
              Irreversible and destructive actions
            </p>
          </div>
        </div>
        <div
          class="flex flex-col sm:flex-row gap-3.5 justify-between items-start sm:items-center p-3.5 bg-red-50 rounded-[12px]"
        >
          <div class="flex-1">
            <h4 class="text-brand-dark text-sm font-bold mb-1">
              Delete Employee Profile
            </h4>
            <p class="text-brand-light text-sm">
              Permanently remove this employee and all associated data. This
              action cannot be undone.
            </p>
          </div>
          <div class="flex gap-2.5">
            <button
              @click="backupEmployee"
              class="bg-white border border-[#DCDEDD] text-brand-dark py-2.5 px-5 rounded-[8px] font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Download class="w-4 h-4" />
              Backup Data
            </button>
            <button
              @click="showDeleteModal = true"
              class="bg-red-600 border border-red-700 text-white py-2.5 px-5 rounded-[8px] font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5"
            >
              <Trash2 class="w-4 h-4" />
              Delete Employee
            </button>
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
    <div v-if="showReviewModal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-3.5" @click.self="showReviewModal = false">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-4 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-brand-dark text-sm font-bold">Create Performance Review</h3>
          <button @click="showReviewModal = false" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <form @submit.prevent="submitReview" class="p-4 space-y-3.5">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Periode</label>
            <input v-model="reviewForm.period" type="text" required placeholder="e.g. Q1 2026" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Mulai Periode</label>
              <input v-model="reviewForm.period_start" type="date" required class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Akhir Periode</label>
              <input v-model="reviewForm.period_end" type="date" required class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Overall Rating (1-5)</label>
            <input v-model.number="reviewForm.overall_rating" type="number" min="1" max="5" step="0.5" required class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Kelebihan</label>
            <textarea v-model="reviewForm.strengths" rows="2" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Area Perbaikan</label>
            <textarea v-model="reviewForm.areas_for_improvement" rows="2" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Target Periode Berikutnya</label>
            <textarea v-model="reviewForm.goals_next_period" rows="2" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>

          <p v-if="reviewError" class="text-red-500 text-sm">{{ reviewError }}</p>

          <div class="flex items-center gap-2.5 pt-1.5">
            <button type="submit" :disabled="reviewSubmitting" class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-5 py-2 flex items-center gap-1.5 disabled:opacity-50">
              <span class="text-brand-white text-sm font-semibold">{{ reviewSubmitting ? "Saving..." : "Save Review" }}</span>
            </button>
            <button type="button" @click="showReviewModal = false" class="px-5 py-2 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Resignation Modal -->
    <div v-if="showResignModal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-3.5" @click.self="showResignModal = false">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-md">
        <div class="p-4 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-brand-dark text-sm font-bold">Resignation / Termination Process</h3>
          <button @click="showResignModal = false" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <form @submit.prevent="submitResignation" class="p-4 space-y-3.5">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Type</label>
            <div class="relative">
              <select v-model="resignForm.type" class="select-soft">
                <option value="resign">Resignation</option>
                <option value="terminated">Termination</option>
              </select>
              <ChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Reason</label>
            <textarea v-model="resignForm.reason" rows="2" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Submission Date</label>
              <input v-model="resignForm.resignation_date" type="date" required class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Last Working Day</label>
              <input v-model="resignForm.last_working_date" type="date" class="w-full px-2.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
          </div>

          <p v-if="resignError" class="text-red-500 text-sm">{{ resignError }}</p>

          <div class="flex items-center gap-2.5 pt-1.5">
            <button type="submit" :disabled="resignSubmitting" class="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold disabled:opacity-50">
              {{ resignSubmitting ? "Processing..." : "Process" }}
            </button>
            <button type="button" @click="showResignModal = false" class="px-5 py-2 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
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
