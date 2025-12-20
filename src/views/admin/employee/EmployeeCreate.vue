<script setup lang="ts">
import { ref, inject } from "vue";
import { useRouter } from "vue-router";
import { useEmployeeStore } from "@/stores/employee";
import { storeToRefs } from "pinia";
import { ArrowRight, ArrowLeft, UserPlus } from "lucide-vue-next";

import Step1PersonalInfo from "@/components/admin/employee/create/steps/Step1PersonalInfo.vue";
import Step2JobInfo from "@/components/admin/employee/create/steps/Step2JobInfo.vue";
import Step3EmergencyContact from "@/components/admin/employee/create/steps/Step3EmergencyContact.vue";
import Step4Preview from "@/components/admin/employee/create/steps/Step4Preview.vue";
import ErrorModal from "@/components/admin/employee/create/ErrorModal.vue";

const router = useRouter();
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

// Form submission
const handleSubmit = async () => {
  try {
    const formData = new FormData();

    // Step 1 data (User & Employee Profile)
    formData.append("name", step1Data.value.name);
    formData.append("email", step1Data.value.email);
    formData.append("password", step1Data.value.password);
    formData.append("identity_number", step1Data.value.identity_number);
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
    if (step3Data.value.emergency_contact_email) {
      formData.append(
        "emergency_contacts[0][email]",
        step3Data.value.emergency_contact_email
      );
    }

    formData.append("preferred_language", step3Data.value.preferred_language);
    formData.append("additional_notes", step3Data.value.additional_notes);

    await employeeStore.createEmployee(formData);

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
  <form @submit.prevent="handleSubmit" class="space-y-6">
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

    <!-- Form Navigation -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">
            {{
              currentStep === 4
                ? "Ready to add this employee?"
                : `Step ${currentStep} of ${totalSteps}`
            }}
          </p>
          <p class="text-brand-light text-xs font-normal mt-1">
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
        <div class="flex items-center gap-3">
          <button
            v-if="currentStep > 1"
            type="button"
            @click="previousStep"
            class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 flex items-center gap-2"
          >
            <ArrowLeft class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-base font-semibold"
              >Previous</span
            >
          </button>
          <button
            v-else
            type="button"
            @click="previousStep"
            class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 flex items-center gap-2"
          >
            <span class="text-brand-dark text-base font-semibold">Cancel</span>
          </button>

          <button
            v-if="currentStep < totalSteps"
            type="button"
            @click="nextStep"
            class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center gap-2"
          >
            <span class="text-brand-white text-base font-semibold">
              Next:
              {{
                currentStep === 1
                  ? "Job Info"
                  : currentStep === 2
                  ? "Emergency Contact"
                  : "Review"
              }}
            </span>
            <ArrowRight class="w-4 h-4 text-white" />
          </button>
          <button
            v-else
            type="submit"
            :disabled="loading"
            class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-base font-semibold">
              {{ loading ? "Adding..." : "Add Employee" }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </form>

  <!-- Error Modal -->
  <ErrorModal :show="showErrorModal" @close="closeErrorModal" />
</template>
