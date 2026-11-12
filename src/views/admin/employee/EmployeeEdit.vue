<script setup lang="ts">
import { ref, inject, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useEmployeeStore } from "@/stores/employee";
import { storeToRefs } from "pinia";
import { ArrowRight, ArrowLeft, Save } from "lucide-vue-next";
import { UiButton } from "@/components/ui";
import { useLookupStore } from "@/stores/lookups";
import { useToastStore } from "@/stores/toast";
import { invalidate } from "@/composables/useStaleFetch";
import { useUnsavedGuard } from "@/composables/useUnsavedGuard";
import { loadWizardLookups } from "@/components/admin/employee/create/wizardLookups";
import { useI18n } from "vue-i18n";

import Step1PersonalInfo from "@/components/admin/employee/create/steps/Step1PersonalInfo.vue";
import Step2JobInfo from "@/components/admin/employee/create/steps/Step2JobInfo.vue";
import Step3EmergencyContact from "@/components/admin/employee/create/steps/Step3EmergencyContact.vue";
import Step4Preview from "@/components/admin/employee/create/steps/Step4Preview.vue";
import ErrorModal from "@/components/admin/employee/create/ErrorModal.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const employeeStore = useEmployeeStore();
const { loading, error } = storeToRefs(employeeStore);

// Modal state
const showErrorModal = ref(false);

// Inject step management from layout
const currentStep = inject<any>("currentStep");
const totalSteps = inject<any>("totalSteps");
const nextStep = inject<any>("nextStep");
const previousStep = inject<any>("previousStep");

// Form data for Step 1
const step1Data = ref({
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  identity_number: "",
  npwp: "",
  phone: "",
  date_of_birth: "",
  hobby: "",
  place_of_birth: "",
  gender: "",
  address: "",
  city: "",
  postal_code: "",
  profile_photo: null as File | null,
  profile_photo_url: "",
});

// Form data for Step 2
const step2Data = ref({
  job_title: "",
  team_id: "",
  years_experience: "",
  status: "",
  employment_type: "",
  work_location: "",
  start_date: "",
  monthly_salary: "",
  skill_level: "",
  ptkp_status: "TK/0",
  annual_leave_quota: "12",
  probation_end_date: "",
  contract_end_date: "",
  bank_name: "",
  account_number: "",
  account_holder_name: "",
  bank_branch: "",
  account_type: "",
  role: "",
});

// Form data for Step 3
const step3Data = ref({
  emergency_contact_name: "",
  emergency_contact_relationship: "",
  emergency_contact_phone: "",
  emergency_contact_email: "",
  additional_notes: "",
  preferred_language: "",
});

const normalizeRupiah = (value: any) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^0-9]/g, "");
};

// Ask before leaving with unsaved edits. The baseline is taken once the
// employee has loaded (salary compared as digits: the Job step formats it).
const saved = ref(false);
const loadedForm = ref<string | null>(null);
const serializeForm = () =>
  JSON.stringify([
    step1Data.value,
    { ...step2Data.value, monthly_salary: normalizeRupiah(step2Data.value.monthly_salary) },
    step3Data.value,
  ]);
useUnsavedGuard(() => !saved.value && loadedForm.value !== null && serializeForm() !== loadedForm.value);

// Load employee data
const loadEmployeeData = async () => {
  try {
    const employeeId = route.params.id as string;
    const employee = await employeeStore.fetchEmployee(employeeId);

    if (employee) {
      // Step 1 - Personal Information
      // Full name with titles/degrees (the API's `name` is only how it shows).
      step1Data.value.name = employee.user?.full_name || employee.user?.name || "";
      step1Data.value.email = employee.user?.email || "";
      step1Data.value.identity_number = employee.identity_number || "";
      step1Data.value.npwp = employee.npwp || "";
      step1Data.value.phone = employee.phone || "";
      step1Data.value.date_of_birth = employee.date_of_birth || "";
      step1Data.value.hobby = employee.hobby || "";
      step1Data.value.place_of_birth = employee.place_of_birth || "";
      step1Data.value.gender = employee.gender || "";
      step1Data.value.address = employee.address || "";
      step1Data.value.city = employee.city || "";
      step1Data.value.postal_code = employee.postal_code || "";
      step1Data.value.profile_photo_url = employee.user?.profile_photo || "";

      // Step 2 - Job Information & Bank Information
      step2Data.value.job_title = employee.job_information?.job_title || "";
      step2Data.value.team_id = employee.job_information?.team_id || "";
      step2Data.value.years_experience =
        employee.job_information?.years_experience || "";
      step2Data.value.status = employee.job_information?.status || "";
      step2Data.value.employment_type =
        employee.job_information?.employment_type || "";
      step2Data.value.work_location =
        employee.job_information?.work_location || "";
      step2Data.value.start_date = employee.job_information?.start_date || "";
      step2Data.value.monthly_salary =
        employee.job_information?.monthly_salary || "";
      step2Data.value.skill_level = employee.job_information?.skill_level || "";
      step2Data.value.ptkp_status =
        employee.job_information?.ptkp_status || "TK/0";
      step2Data.value.annual_leave_quota =
        employee.job_information?.annual_leave_quota ?? "12";
      step2Data.value.probation_end_date =
        employee.job_information?.probation_end_date || "";
      step2Data.value.contract_end_date =
        employee.job_information?.contract_end_date || "";
      step2Data.value.bank_name = employee.bank_information?.bank_name || "";
      step2Data.value.account_number =
        employee.bank_information?.account_number || "";
      step2Data.value.account_holder_name =
        employee.bank_information?.account_holder_name || "";
      step2Data.value.bank_branch =
        employee.bank_information?.bank_branch || "";
      step2Data.value.account_type =
        employee.bank_information?.account_type || "";
      step2Data.value.role = employee.user?.roles?.[0] || "";

      // Step 3 - Emergency Contact
      if (
        employee.emergency_contacts &&
        employee.emergency_contacts.length > 0
      ) {
        const contact = employee.emergency_contacts[0];
        step3Data.value.emergency_contact_name = contact.full_name || "";
        step3Data.value.emergency_contact_relationship =
          contact.relationship || "";
        step3Data.value.emergency_contact_phone = contact.phone || "";
        step3Data.value.emergency_contact_email = contact.email || "";
      }
      step3Data.value.preferred_language = employee.preferred_language || "";
      step3Data.value.additional_notes = employee.additional_notes || "";
      loadedForm.value = serializeForm();
    }
  } catch (err) {
    console.error("Error loading employee data:", err);
    router.push({ name: "admin.employees" });
  }
};

// Form submission
const handleSubmit = async () => {
  try {
    const formData = new FormData();

    // Step 1 data (User & Employee Profile)
    formData.append("name", step1Data.value.name);
    formData.append("email", step1Data.value.email);

    // Only append password if it's changed
    if (step1Data.value.password) {
      formData.append("password", step1Data.value.password);
    }

    formData.append("identity_number", step1Data.value.identity_number);
    formData.append("npwp", step1Data.value.npwp);
    formData.append("phone", step1Data.value.phone);
    formData.append("date_of_birth", step1Data.value.date_of_birth);
    formData.append("hobby", step1Data.value.hobby);
    formData.append("place_of_birth", step1Data.value.place_of_birth);
    formData.append("gender", step1Data.value.gender);
    formData.append("address", step1Data.value.address);
    formData.append("city", step1Data.value.city);
    formData.append("postal_code", step1Data.value.postal_code);

    if (step1Data.value.profile_photo) {
      formData.append("profile_photo", step1Data.value.profile_photo);
    }

    // Step 2 data (Job Information & Bank Information)
    formData.append("job_title", step2Data.value.job_title);
    formData.append("team_id", step2Data.value.team_id);
    formData.append("years_experience", step2Data.value.years_experience);
    formData.append("status", step2Data.value.status);
    formData.append("employment_type", step2Data.value.employment_type);
    formData.append("work_location", step2Data.value.work_location);
    formData.append("start_date", step2Data.value.start_date);
    formData.append(
      "monthly_salary",
      normalizeRupiah(step2Data.value.monthly_salary)
    );
    formData.append("skill_level", step2Data.value.skill_level);
    formData.append("ptkp_status", step2Data.value.ptkp_status);
    formData.append("annual_leave_quota", step2Data.value.annual_leave_quota);
    if (step2Data.value.probation_end_date) {
      formData.append("probation_end_date", step2Data.value.probation_end_date);
    }
    if (step2Data.value.contract_end_date) {
      formData.append("contract_end_date", step2Data.value.contract_end_date);
    }
    formData.append("bank_name", step2Data.value.bank_name);
    formData.append("account_number", step2Data.value.account_number);
    formData.append("account_holder_name", step2Data.value.account_holder_name);
    formData.append("bank_branch", step2Data.value.bank_branch);
    formData.append("account_type", step2Data.value.account_type);
    formData.append("roles[]", step2Data.value.role);

    // Step 3 data (Emergency Contacts & Additional Info)
    formData.append(
      "emergency_contacts[0][full_name]",
      step3Data.value.emergency_contact_name
    );
    formData.append(
      "emergency_contacts[0][relationship]",
      step3Data.value.emergency_contact_relationship
    );
    formData.append(
      "emergency_contacts[0][phone]",
      step3Data.value.emergency_contact_phone
    );
    formData.append(
      "emergency_contacts[0][email]",
      step3Data.value.emergency_contact_email
    );

    formData.append("preferred_language", step3Data.value.preferred_language);
    formData.append("additional_notes", step3Data.value.additional_notes);

    const employeeId = route.params.id as string;
    await employeeStore.updateEmployee(employeeId, formData);

    // Lists that show this employee are stale now.
    invalidate("adm-employees:");
    const lookups = useLookupStore();
    lookups.invalidate("employees");
    lookups.invalidate("teams"); // member counts

    // Back to the employee's profile, with a toast instead of the list banner.
    employeeStore.clearMessages();
    useToastStore().success(t("employees.wizard.edit.saved"));
    saved.value = true;
    router.push({ name: "admin.employees.detail", params: { id: employeeId } });
  } catch (err) {
    console.error("Error updating employee:", err);
    // Show error modal when validation fails
    if (error.value) {
      showErrorModal.value = true;
    }
  }
};

const closeErrorModal = () => {
  showErrorModal.value = false;
};

// The employee and the wizard's option lists load in parallel.
onMounted(() => {
  loadEmployeeData();
  loadWizardLookups();
});
</script>

<template>
  <div class="p-4 sm:p-5 lg:p-6 ui-anim-fade-up">
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Step 1: Personal Information -->
      <Step1PersonalInfo
        v-if="currentStep === 1"
        v-model="step1Data"
        :errors="error"
        :is-editing="true"
      />

      <!-- Step 2: Job Information -->
      <Step2JobInfo
        v-if="currentStep === 2"
        v-model="step2Data"
        :errors="error"
      />

      <!-- Step 3: Emergency Contact -->
      <Step3EmergencyContact
        v-if="currentStep === 3"
        v-model="step3Data"
        :errors="error"
        :is-editing="true"
        :employee-id="route.params.id"
      />

      <!-- Step 4: Preview -->
      <Step4Preview
        v-if="currentStep === 4"
        :step1Data="step1Data"
        :step2Data="step2Data"
        :step3Data="step3Data"
      />

      <!-- Form Navigation: a card on desktop, a bar pinned to the bottom on phones -->
      <div
        class="sticky bottom-0 z-10 -mx-4 sm:mx-0 sm:static bg-ui-surface border-t sm:border border-ui-line sm:rounded-ui-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:p-5"
      >
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="hidden sm:block min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">
              {{
                currentStep === 4
                  ? $t("employees.wizard.edit.ready")
                  : $t("employees.wizard.stepOf", { current: currentStep, total: totalSteps })
              }}
            </p>
            <p class="text-ui-cap text-ui-muted mt-0.5">
              {{
                currentStep === 4
                  ? $t("employees.wizard.edit.reviewHint")
                  : currentStep === 1
                  ? $t("employees.wizard.edit.personalHint")
                  : currentStep === 2
                  ? $t("employees.wizard.edit.jobHint")
                  : $t("employees.wizard.edit.emergencyHint")
              }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UiButton
              v-if="currentStep > 1"
              variant="secondary"
              size="lg"
              :icon="ArrowLeft"
              :aria-label="$t('common.actions.previous')"
              class="shrink-0 w-11 !px-0 sm:w-auto sm:!px-3.5 sm:h-9 sm:px-3.5 sm:text-ui-small"
              @click="previousStep"
            >
              <span class="hidden sm:inline">{{ $t("common.actions.previous") }}</span>
            </UiButton>
            <UiButton
              v-else
              variant="secondary"
              size="lg"
              class="flex-1 sm:flex-none sm:h-9 sm:px-3.5 sm:text-ui-small"
              @click="router.push({ name: 'admin.employees' })"
            >
              {{ $t("common.actions.cancel") }}
            </UiButton>

            <UiButton
              v-if="currentStep < totalSteps"
              size="lg"
              :icon-right="ArrowRight"
              class="flex-1 min-w-0 sm:flex-none sm:h-9 sm:px-3.5 sm:text-ui-small"
              @click="nextStep"
            >
              {{
                $t("employees.wizard.next", {
                  step: $t(
                    `employees.wizard.nextSteps.${currentStep === 1 ? "job" : currentStep === 2 ? "emergency" : "review"}`
                  ),
                })
              }}
            </UiButton>
            <UiButton
              v-else
              type="submit"
              size="lg"
              :icon="Save"
              :loading="loading"
              class="flex-1 min-w-0 sm:flex-none sm:h-9 sm:px-3.5 sm:text-ui-small"
            >
              {{ loading ? $t("employees.wizard.edit.submitting") : $t("employees.wizard.edit.submit") }}
            </UiButton>
          </div>
        </div>
      </div>
    </form>

    <!-- Error Modal -->
    <ErrorModal :show="showErrorModal" @close="closeErrorModal" />
  </div>
</template>
