<script setup lang="ts">
import { ref, inject } from "vue";
import { useRouter } from "vue-router";
import { useEmployeeStore } from "@/stores/employee";
import { useEmployeeFileStore } from "@/stores/employeeFile";
import { storeToRefs } from "pinia";
import { ArrowRight, ArrowLeft, UserPlus } from "lucide-vue-next";
import { UiButton } from "@/components/ui";

import Step1PersonalInfo from "@/components/admin/employee/create/steps/Step1PersonalInfo.vue";
import Step2JobInfo from "@/components/admin/employee/create/steps/Step2JobInfo.vue";
import Step3EmergencyContact from "@/components/admin/employee/create/steps/Step3EmergencyContact.vue";
import Step4Preview from "@/components/admin/employee/create/steps/Step4Preview.vue";
import ErrorModal from "@/components/admin/employee/create/ErrorModal.vue";

const router = useRouter();
const employeeStore = useEmployeeStore();
const { loading, error } = storeToRefs(employeeStore);
const employeeFileStore = useEmployeeFileStore();

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
  documents: [] as File[],
  document_names: [] as string[],
});

const normalizeRupiah = (value: any) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^0-9]/g, "");
};

// Form submission
const handleSubmit = async () => {
  try {
    const formData = new FormData();

    // Step 1 data (User & Employee Profile)
    formData.append("name", step1Data.value.name);
    formData.append("email", step1Data.value.email);
    formData.append("password", step1Data.value.password);
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
    formData.append("monthly_salary", normalizeRupiah(step2Data.value.monthly_salary));
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
    // Emergency contacts as array (required format by API)
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

    const createdEmployee = await employeeStore.createEmployee(formData);

    // Documents are attached after creation since they belong to the new
    // employee record, which doesn't exist until this point. A failure here
    // shouldn't block the (already successful) employee creation.
    if (createdEmployee?.id && step3Data.value.documents.length > 0) {
      try {
        await employeeFileStore.uploadFiles(
          createdEmployee.id,
          step3Data.value.documents,
          step3Data.value.document_names
        );
      } catch (uploadErr) {
        console.error("Error uploading employee documents:", uploadErr);
      }
    }

    // Redirect to success page on success
    router.push({ name: "admin.employees.success" });
  } catch (err) {
    console.error("Error creating employee:", err);
    // Show error modal when validation fails
    if (error.value) {
      showErrorModal.value = true;
    }
  }
};

const closeErrorModal = () => {
  showErrorModal.value = false;
};
</script>

<template>
  <div class="p-4 sm:p-5 lg:p-6 ui-anim-fade-up">
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Step 1: Personal Information -->
      <Step1PersonalInfo
        v-if="currentStep === 1"
        v-model="step1Data"
        :errors="error"
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
                  ? "Ready to add this employee?"
                  : `Step ${currentStep} of ${totalSteps}`
              }}
            </p>
            <p class="text-ui-cap text-ui-muted mt-0.5">
              {{
                currentStep === 4
                  ? "Review and confirm all information before submitting"
                  : currentStep === 1
                  ? "Fill in the personal information"
                  : currentStep === 2
                  ? "Fill in the job information"
                  : "Fill in the emergency contact information"
              }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UiButton
              v-if="currentStep > 1"
              variant="secondary"
              size="lg"
              :icon="ArrowLeft"
              aria-label="Previous"
              class="shrink-0 w-11 !px-0 sm:w-auto sm:!px-3.5 sm:h-9 sm:px-3.5 sm:text-ui-small"
              @click="previousStep"
            >
              <span class="hidden sm:inline">Previous</span>
            </UiButton>
            <UiButton
              v-else
              variant="secondary"
              size="lg"
              class="flex-1 sm:flex-none sm:h-9 sm:px-3.5 sm:text-ui-small"
              @click="previousStep"
            >
              Cancel
            </UiButton>

            <UiButton
              v-if="currentStep < totalSteps"
              size="lg"
              :icon-right="ArrowRight"
              class="flex-1 min-w-0 sm:flex-none sm:h-9 sm:px-3.5 sm:text-ui-small"
              @click="nextStep"
            >
              Next:
              {{
                currentStep === 1
                  ? "Job Info"
                  : currentStep === 2
                  ? "Emergency Contact"
                  : "Review"
              }}
            </UiButton>
            <UiButton
              v-else
              type="submit"
              size="lg"
              :icon="UserPlus"
              :loading="loading"
              class="flex-1 min-w-0 sm:flex-none sm:h-9 sm:px-3.5 sm:text-ui-small"
            >
              {{ loading ? "Adding..." : "Add Employee" }}
            </UiButton>
          </div>
        </div>
      </div>
    </form>

    <!-- Error Modal -->
    <ErrorModal :show="showErrorModal" @close="closeErrorModal" />
  </div>
</template>
