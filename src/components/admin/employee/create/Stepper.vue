<script setup lang="ts">
import { Building, User, Briefcase, Phone, Check, Eye } from "lucide-vue-next";

interface Props {
  currentStep?: number;
}

const props = withDefaults(defineProps<Props>(), {
  currentStep: 1,
});
</script>

<template>
  <!-- Vertical Step Progress -->
  <aside class="w-80 bg-white border-r border-[#DCDEDD] flex flex-col">
    <!-- Logo Section -->
    <div class="px-6 py-4 border-b border-[#DCDEDD]">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 relative flex items-center justify-center">
          <!-- <div
            class="w-14 h-14 absolute bg-gradient-to-br from-primary-100 to-primary-200 rounded-full"
          ></div>
          <div
            class="w-10 h-10 absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-full opacity-90"
          ></div>
          <Building class="w-5 h-5 text-white relative z-10" /> -->
          <img
            src="/images/jcd-only-color.png"
            alt="Company Logo"
            class="w-12 h-12 relative z-10 object-contain"
          />
        </div>
        <div>
          <h1 class="text-brand-dark text-lg font-bold">HRIS
            <span class="text-xs font-medium text-gray-400 ml-1"> v1.0 </span></h1>
          <p class="text-brand-dark text-xs font-normal">Jendela Cakra Digital</p>
        </div>
      </div>
    </div>

    <!-- Step Progress -->
    <div class="space-y-8 flex-1 mt-10 px-6">
      <!-- Step 1 -->
      <div class="flex items-center gap-4">
        <div
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
            currentStep > 1
              ? 'bg-green-600 text-white'
              : currentStep === 1
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-500',
          ]"
        >
          <User class="w-6 h-6" v-if="currentStep <= 1" />
          <Check class="w-6 h-6" v-else />
        </div>
        <div class="flex-1">
          <h3
            :class="[
              'text-lg font-bold',
              currentStep > 1
                ? 'text-green-600'
                : currentStep === 1
                ? 'text-blue-600'
                : 'text-gray-500',
            ]"
          >
            Personal Information
          </h3>
          <p
            :class="[
              'text-sm font-medium mt-1',
              currentStep > 1
                ? 'text-green-600'
                : currentStep === 1
                ? 'text-blue-600'
                : 'text-gray-500',
            ]"
          >
            Basic employee details and contact info
          </p>
        </div>
      </div>

      <!-- Connector Line 1 -->
      <div
        :class="[
          'ml-6 w-0.5 h-8',
          currentStep > 1
            ? 'bg-green-600'
            : currentStep === 1
            ? 'bg-blue-600'
            : 'bg-gray-200',
        ]"
      ></div>

      <!-- Step 2 -->
      <div class="flex items-center gap-4">
        <div
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
            currentStep > 2
              ? 'bg-green-600 text-white'
              : currentStep === 2
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-500',
          ]"
        >
          <Briefcase class="w-6 h-6" v-if="currentStep <= 2" />
          <Check class="w-6 h-6" v-else />
        </div>
        <div class="flex-1">
          <h3
            :class="[
              'text-lg font-bold',
              currentStep > 2
                ? 'text-green-600'
                : currentStep === 2
                ? 'text-blue-600'
                : 'text-gray-500',
            ]"
          >
            Job Information
          </h3>
          <p
            :class="[
              'text-sm font-medium mt-1',
              currentStep > 2
                ? 'text-green-600'
                : currentStep === 2
                ? 'text-blue-600'
                : 'text-gray-500',
            ]"
          >
            Role, department, and employment details
          </p>
        </div>
      </div>

      <!-- Connector Line 2 -->
      <div
        :class="[
          'ml-6 w-0.5 h-8',
          currentStep > 2
            ? 'bg-green-600'
            : currentStep === 2
            ? 'bg-blue-600'
            : 'bg-gray-200',
        ]"
      ></div>

      <!-- Step 3 -->
      <div class="flex items-center gap-4">
        <div
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
            currentStep > 3
              ? 'bg-green-600 text-white'
              : currentStep === 3
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-500',
          ]"
        >
          <Phone class="w-6 h-6" v-if="currentStep <= 3" />
          <Check class="w-6 h-6" v-else />
        </div>
        <div class="flex-1">
          <h3
            :class="[
              'text-lg font-bold',
              currentStep > 3
                ? 'text-green-600'
                : currentStep === 3
                ? 'text-blue-600'
                : 'text-gray-500',
            ]"
          >
            Emergency Contact
          </h3>
          <p
            :class="[
              'text-sm font-medium mt-1',
              currentStep > 3
                ? 'text-green-600'
                : currentStep === 3
                ? 'text-blue-600'
                : 'text-gray-500',
            ]"
          >
            Person to contact in case of emergency
          </p>
        </div>
      </div>

      <!-- Connector Line 3 -->
      <div
        :class="[
          'ml-6 w-0.5 h-8',
          currentStep > 3
            ? 'bg-green-600'
            : currentStep === 3
            ? 'bg-blue-600'
            : 'bg-gray-200',
        ]"
      ></div>

      <!-- Step 4 -->
      <div class="flex items-center gap-4">
        <div
          :class="[
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
            currentStep === 4
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-500',
          ]"
        >
          <Eye class="w-6 h-6" />
        </div>
        <div class="flex-1">
          <h3
            :class="[
              'text-lg font-bold',
              currentStep === 4 ? 'text-blue-600' : 'text-gray-500',
            ]"
          >
            Review & Submit
          </h3>
          <p
            :class="[
              'text-sm font-medium mt-1',
              currentStep === 4 ? 'text-blue-600' : 'text-gray-500',
            ]"
          >
            Review all information before submitting
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
