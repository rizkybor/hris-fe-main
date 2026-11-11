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
  <div class="flex h-screen overflow-hidden bg-ui-bg">
    <Stepper :current-step="currentStep" />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top bar -->
      <header class="page-header bg-ui-surface border-b border-ui-line px-4 sm:px-6 pt-3 pb-3 lg:py-3.5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <button
              type="button"
              @click="previousStep"
              class="ui-press h-9 shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-ui-control border border-ui-line-strong bg-ui-surface text-ui-ink hover:bg-ui-subtle focus:outline-none focus-visible:shadow-ui-focus"
              aria-label="Back"
            >
              <ArrowLeft class="w-4 h-4" />
              <span class="text-ui-small font-medium hidden sm:inline">Back</span>
            </button>
            <div class="min-w-0">
              <h1 class="text-ui-h3 sm:text-ui-h2 text-ui-ink truncate">
                {{ isEditing ? "Edit Employee" : "Add New Employee" }}
              </h1>
              <p class="text-ui-cap sm:text-ui-small text-ui-muted truncate">
                Step {{ currentStep }} of {{ totalSteps }} &middot; {{ getStepTitle() }}
              </p>
            </div>
          </div>

          <!-- Compact step counter (phones) -->
          <span class="sm:hidden shrink-0 text-ui-cap font-medium text-ui-muted tabular-nums">
            {{ currentStep }} of {{ totalSteps }}
          </span>

          <!-- User Profile -->
          <div class="hidden sm:flex items-center gap-2.5 shrink-0">
            <Avatar
              :src="user?.profile_photo"
              :alt="user?.name"
              size="w-9 h-9"
            />
            <div class="text-left hidden md:block min-w-0">
              <p class="text-ui-small font-medium text-ui-ink truncate max-w-[180px]">
                {{ user?.name }}
              </p>
              <p class="text-ui-cap text-ui-muted truncate max-w-[180px]">
                {{ user?.roles.join(", ") }}
              </p>
            </div>
            <ChevronDownIcon class="w-4 h-4 text-ui-faint hidden md:block" />
          </div>
        </div>

        <!-- Step progress (the vertical stepper takes over from lg up) -->
        <div
          class="lg:hidden mt-3 flex items-center gap-1"
          role="progressbar"
          :aria-valuenow="currentStep"
          aria-valuemin="1"
          :aria-valuemax="totalSteps"
          :aria-label="`Step ${currentStep} of ${totalSteps}`"
        >
          <div
            v-for="step in totalSteps"
            :key="step"
            class="h-1 flex-1 rounded-full transition-colors duration-ui-base"
            :class="step <= currentStep ? 'bg-ui-ink' : 'bg-ui-line'"
          ></div>
        </div>
      </header>

      <!-- Wizard content (scroll container) -->
      <main ref="mainContentRef" class="main-content flex-1 overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
