<script setup>
import Stepper from "@/components/admin/employee/create/Stepper.vue";
import Avatar from "@/components/common/Avatar.vue";
import { ChevronDownIcon, ArrowLeft } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import { ref, provide, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const router = useRouter();
const route = useRoute();

// Check if editing or creating
const isEditing = computed(() => route.name === "admin.employees.edit");

// Main content ref for scrolling
const mainContentRef = ref(null);

// Step management
const currentStep = ref(1);
const totalSteps = 4;

const scrollToTop = () => {
  if (mainContentRef.value) {
    mainContentRef.value.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
};

const goToStep = (step) => {
  if (step >= 1 && step <= totalSteps) {
    currentStep.value = step;
    scrollToTop();
  }
};

const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++;
    scrollToTop();
  }
};

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
    scrollToTop();
  } else {
    router.push({ name: "admin.employees" });
  }
};

// Provide step management to child components
provide("currentStep", currentStep);
provide("totalSteps", totalSteps);
provide("goToStep", goToStep);
provide("nextStep", nextStep);
provide("previousStep", previousStep);

const getStepTitle = () => {
  switch (currentStep.value) {
    case 1:
      return "Personal Information";
    case 2:
      return "Job Information";
    case 3:
      return "Emergency Contact";
    case 4:
      return "Review & Submit";
    default:
      return "Personal Information";
  }
};

// Reset step when route changes
watch(
  () => route.params.id,
  () => {
    currentStep.value = 1;
    scrollToTop();
  }
);

</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <Stepper :current-step="currentStep" />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Top Navbar -->
      <header class="page-header bg-white border-b border-[#DCDEDD] px-2.5 sm:px-4 py-2.5 sm:py-3.5">
        <div class="flex items-center justify-between gap-3.5">
          <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              @click="previousStep"
              class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-2.5 py-1.5 flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft class="w-4 h-4 text-gray-600" />
              <span class="text-brand-dark text-sm font-semibold hidden sm:inline">Back</span>
            </button>
            <div class="min-w-0">
              <h2 class="text-brand-dark text-sm sm:text-lg font-extrabold truncate">
                {{ isEditing ? "Edit Employee" : "Add New Employee" }}
              </h2>
              <p class="text-brand-light text-xs sm:text-sm font-normal mt-1 truncate">
                Step {{ currentStep }} of {{ totalSteps }} &middot; {{ getStepTitle() }}
              </p>
            </div>
          </div>

          <!-- User Profile -->
          <div class="flex items-center gap-2.5 shrink-0">
            <Avatar
              :src="user?.profile_photo"
              :alt="user?.name"
              size="w-9 h-9 sm:w-11 sm:h-11"
            />
            <div class="text-left hidden md:block">
              <p class="text-brand-dark text-sm font-semibold">
                {{ user?.name }}
              </p>
              <p class="text-brand-light text-xs font-normal">
                {{ user?.roles.join(", ") }}
              </p>
            </div>
            <ChevronDownIcon class="w-4 h-4 text-gray-400 hidden md:block" />
          </div>
        </div>

        <!-- Step Progress Bar -->
        <div class="mt-3.5 flex items-center gap-1.5">
          <div
            v-for="step in totalSteps"
            :key="step"
            class="h-1.5 flex-1 rounded-full transition-all duration-300"
            :class="step <= currentStep ? 'bg-[#0C51D9]' : 'bg-[#EDEFF3]'"
          ></div>
        </div>

        <!-- Mobile step label (Stepper sidebar is hidden below lg) -->
        <p class="lg:hidden text-brand-light text-xs font-medium mt-1.5">
          Step {{ currentStep }} of {{ totalSteps }}: {{ getStepTitle() }}
        </p>
      </header>
      <!-- Dashboard Content -->
      <main ref="mainContentRef" class="main-content flex-1 overflow-auto p-2.5 sm:p-4">
        <RouterView />
      </main>
    </div>
  </div>
</template>
