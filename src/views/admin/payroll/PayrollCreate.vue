<script setup>
import { ref, computed } from "vue";
import { usePayrollStore } from "@/stores/payroll";
import { useRouter, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import {
  Calendar,
  Calculator,
  Plus,
  ArrowLeft,
  AlertCircle,
  Gift,
} from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const payrollStore = usePayrollStore();
const { loading, error } = storeToRefs(payrollStore);

// "?type=thr" lets the dashboard's "Generate THR" shortcut land here
// pre-selected, without needing a whole separate page for what's really
// the same one-field form.
const payrollType = ref(route.query.type === "thr" ? "thr" : "monthly");

const form = ref({
  salary_month: new Date().toISOString().slice(0, 7),
});

const handleSubmit = async () => {
  try {
    if (payrollType.value === "thr") {
      await payrollStore.generateThrPayroll(form.value);
    } else {
      await payrollStore.generatePayroll(form.value);
    }
    router.push({ name: "admin.payroll.dashboard" });
  } catch (error) {
    console.error("Error creating payroll:", error);
  }
};

const formatMonth = (month) => {
  if (!month) return "-";
  const [year, monthNum] = month.split("-");
  const date = new Date(year, monthNum - 1);
  return date.toLocaleDateString("id-ID", { year: "numeric", month: "long" });
};
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-5 px-4 py-4 items-start">
    <!-- Form Section -->
    <div class="flex-1 w-full">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Payroll Period Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
            >
              <Calendar class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">
                {{ payrollType === "thr" ? "Generate THR" : "Generate Payroll" }}
              </h3>
              <p class="text-brand-light text-sm font-normal">
                {{
                  payrollType === "thr"
                    ? "Select the month to generate THR (Tunjangan Hari Raya) for eligible employees"
                    : "Select the salary month to generate payroll for all active employees"
                }}
              </p>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-brand-dark text-base font-semibold mb-1">Payroll Type *</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="payrollType = 'monthly'"
                :class="[
                  'px-4 py-3 rounded-[12px] border-2 text-sm font-semibold transition-all duration-300',
                  payrollType === 'monthly'
                    ? 'border-[#0C51D9] bg-blue-50 text-[#0C51D9]'
                    : 'border-[#DCDEDD] text-brand-dark hover:border-[#0C51D9]',
                ]"
              >
                Monthly Payroll
              </button>
              <button
                type="button"
                @click="payrollType = 'thr'"
                :class="[
                  'px-4 py-3 rounded-[12px] border-2 text-sm font-semibold transition-all duration-300',
                  payrollType === 'thr'
                    ? 'border-[#0C51D9] bg-blue-50 text-[#0C51D9]'
                    : 'border-[#DCDEDD] text-brand-dark hover:border-[#0C51D9]',
                ]"
              >
                THR (Tunjangan Hari Raya)
              </button>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-brand-dark text-base font-semibold mb-1"
              >Salary Month *</label
            >
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
              >
                <Calendar class="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="month"
                v-model="form.salary_month"
                required
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <!-- Info Box -->
          <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-[12px] flex items-start gap-3">
            <AlertCircle class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div v-if="payrollType === 'thr'">
              <h4 class="text-blue-900 text-sm font-semibold mb-1">Automatic Generation (THR)</h4>
              <p class="text-blue-800 text-sm">
                THR will be generated for every employee with at least 1 month of continuous service, prorated by
                tenure (full amount at 12+ months). This is a separate run from the regular monthly payroll -- both
                can exist for the same month.
              </p>
            </div>
            <div v-else>
              <h4 class="text-blue-900 text-sm font-semibold mb-1">Automatic Generation</h4>
              <p class="text-blue-800 text-sm">
                Payroll will be automatically generated for all active employees based on their attendance records for the selected month. Salaries will be calculated based on attendance, sick days, and absences.
              </p>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-[12px] p-4 flex items-start gap-3">
          <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 class="text-red-900 text-sm font-semibold mb-1">Error</h4>
            <p class="text-red-800 text-sm">{{ error }}</p>
          </div>
        </div>
      </form>
    </div>

    <!-- Right Sidebar -->
    <div class="w-full lg:w-80 flex-shrink-0">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-6 lg:sticky lg:top-6">
        <div class="flex items-center gap-3 mb-6">
          <div
            class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
          >
            <Calculator class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-xl font-bold">Payroll Summary</h3>
            <p class="text-brand-light text-sm font-normal">Generation details</p>
          </div>
        </div>

        <div class="space-y-4">
          <div
            class="flex justify-between items-center py-2 bg-blue-50 px-3 rounded-[8px] mb-4"
          >
            <span class="text-blue-700 text-base font-semibold"
              >Selected Month:</span
            >
            <span class="text-blue-700 text-base font-bold">{{
              formatMonth(form.salary_month)
            }}</span>
          </div>

          <!-- Form Actions -->
          <div class="space-y-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              @click="handleSubmit"
              :disabled="loading || !form.salary_month"
              class="btn-primary w-full rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="text-brand-white text-sm sm:text-base font-semibold">{{
                loading ? "Generating..." : payrollType === "thr" ? "Generate THR" : "Generate Payroll"
              }}</span>
              <Gift v-if="payrollType === 'thr'" class="w-4 h-4 text-white" />
              <Plus v-else class="w-4 h-4 text-white" />
            </button>
            <button
              type="button"
              @click="router.back()"
              :disabled="loading"
              class="w-full border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft class="w-4 h-4 text-gray-600" />
              <span class="text-brand-dark text-sm sm:text-base font-semibold">Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
