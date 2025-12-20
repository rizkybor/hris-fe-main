<script setup>
import { ref, computed } from "vue";
import { usePayrollStore } from "@/stores/payroll";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  Calendar,
  Calculator,
  Plus,
  ArrowLeft,
  AlertCircle,
} from "lucide-vue-next";

const router = useRouter();
const payrollStore = usePayrollStore();
const { loading, error } = storeToRefs(payrollStore);

const form = ref({
  salary_month: new Date().toISOString().slice(0, 7),
});

const handleSubmit = async () => {
  try {
    await payrollStore.generatePayroll(form.value);
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
  <div class="flex gap-5 items-start">
    <!-- Form Section -->
    <div class="flex-1">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Payroll Period Section -->
        <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
            >
              <Calendar class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-xl font-bold">Generate Payroll</h3>
              <p class="text-brand-light text-sm font-normal">
                Select the salary month to generate payroll for all active employees
              </p>
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
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <!-- Info Box -->
          <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-[12px] flex items-start gap-3">
            <AlertCircle class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 class="text-blue-900 text-sm font-semibold mb-1">Automatic Generation</h4>
              <p class="text-blue-800 text-sm">
                Payroll will be automatically generated for all active employees based on their attendance records for the selected month. Salaries will be calculated based on attendance, sick days, and absences.
              </p>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-[16px] p-4 flex items-start gap-3">
          <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 class="text-red-900 text-sm font-semibold mb-1">Error</h4>
            <p class="text-red-800 text-sm">{{ error }}</p>
          </div>
        </div>
      </form>
    </div>

    <!-- Right Sidebar -->
    <div class="w-100 flex-shrink-0">
      <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6 sticky top-6">
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
              type="submit"
              @click="handleSubmit"
              :disabled="loading || !form.salary_month"
              class="btn-primary w-full rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="text-brand-white text-base font-semibold">{{
                loading ? "Generating..." : "Generate Payroll"
              }}</span>
              <Plus class="w-4 h-4 text-white" />
            </button>
            <button
              type="button"
              @click="router.back()"
              :disabled="loading"
              class="w-full border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft class="w-4 h-4 text-gray-600" />
              <span class="text-brand-dark text-base font-semibold">Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
