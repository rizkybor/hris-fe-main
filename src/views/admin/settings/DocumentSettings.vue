<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { RouterLink } from "vue-router";
import { ArrowLeft, FileSignature, Check } from "lucide-vue-next";
import { useDocumentSettingStore } from "@/stores/documentSetting";

const store = useDocumentSettingStore();
const { setting, loading } = storeToRefs(store);

const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

// Same example the PDFs would print, so the choice is concrete.
const options = [
  {
    value: true,
    title: "Name with degree",
    description: "Prints the signatory name exactly as typed on the document.",
    example: "Rizky Ajie Kurniawan, S.Kom",
  },
  {
    value: false,
    title: "Name only",
    description: "Drops titles before the name (Dr., Ir., Prof., ...) and degrees after the comma.",
    example: "Rizky Ajie Kurniawan",
  },
];

onMounted(() => store.fetchSetting());

const choose = async (value) => {
  if (saving.value || setting.value.signatory_show_degree === value) return;
  errorMessage.value = "";
  successMessage.value = "";
  saving.value = true;
  try {
    await store.updateSetting({ signatory_show_degree: value });
    successMessage.value = "Document setting saved. It applies to PDFs generated from now on.";
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Failed to save setting.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="px-4 py-4">
    <div class="flex items-center gap-3 mb-5">
      <RouterLink
        :to="{ name: 'admin.settings.dashboard' }"
        class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] shrink-0"
        aria-label="Back to Settings"
      >
        <ArrowLeft class="w-4 h-4 text-gray-600" />
      </RouterLink>
      <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
        <FileSignature class="w-5 h-5 text-[#0C51D9]" />
      </div>
      <div>
        <h3 class="text-brand-dark text-lg font-bold">Document Settings</h3>
        <p class="text-brand-light text-sm">How generated PDF documents are printed</p>
      </div>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 max-w-xl">
      <p class="text-brand-dark text-sm font-semibold mb-1">Signatory Name</p>
      <p class="text-brand-light text-xs mb-4">
        Applies to every signature block: Letters, BAST, Official Memo, Purchase Order, Payment Receipt,
        Proposal, Certificate and Staff Raport.
      </p>

      <div v-if="loading" class="text-brand-light text-sm">Loading...</div>
      <div v-else class="space-y-3">
        <button
          v-for="option in options"
          :key="String(option.value)"
          type="button"
          :disabled="saving"
          @click="choose(option.value)"
          class="w-full text-left border rounded-[12px] p-4 flex items-start gap-3 transition-all duration-200 disabled:opacity-50"
          :class="setting.signatory_show_degree === option.value ? 'border-[#0C51D9] bg-blue-50' : 'border-[#DCDEDD] hover:border-[#0C51D9]'"
        >
          <span
            class="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5"
            :class="setting.signatory_show_degree === option.value ? 'bg-[#0C51D9] border-[#0C51D9]' : 'border-gray-300 bg-white'"
          >
            <Check v-if="setting.signatory_show_degree === option.value" class="w-3 h-3 text-white" />
          </span>
          <span class="min-w-0">
            <span class="block text-brand-dark text-sm font-semibold">{{ option.title }}</span>
            <span class="block text-brand-light text-xs mt-0.5">{{ option.description }}</span>
            <span class="inline-block mt-2 px-2 py-1 rounded-md bg-white border border-[#DCDEDD] text-xs text-brand-dark">
              {{ option.example }}
            </span>
          </span>
        </button>
      </div>

      <p v-if="errorMessage" class="text-red-500 text-sm mt-4">{{ errorMessage }}</p>
      <p v-if="successMessage" class="text-green-600 text-sm mt-4">{{ successMessage }}</p>
    </div>
  </div>
</template>
