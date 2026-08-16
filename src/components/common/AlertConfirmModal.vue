<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { X, AlertTriangle, CheckCircle2, Info } from "lucide-vue-next";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useAlertModalStore();
const { visible, mode, title, message, confirmText, cancelText, type } = storeToRefs(store);

const icon = computed(() => {
  if (type.value === "success") return CheckCircle2;
  if (type.value === "info") return Info;
  return AlertTriangle;
});

const iconWrapClass = computed(
  () =>
    ({
      success: "bg-green-50",
      danger: "bg-red-50",
      warning: "bg-yellow-50",
      info: "bg-blue-50",
    })[type.value] || "bg-blue-50"
);

const iconClass = computed(
  () =>
    ({
      success: "text-green-600",
      danger: "text-red-600",
      warning: "text-yellow-600",
      info: "text-blue-600",
    })[type.value] || "text-blue-600"
);

const confirmBtnClass = computed(
  () =>
    ({
      success:
        "border-[#15803D] bg-gradient-to-r from-green-500 to-green-600 shadow-lg focus:ring-green-500",
      danger:
        "border-[#A02121] bg-gradient-to-r from-red-500 to-red-600 shadow-lg focus:ring-red-500",
      warning:
        "border-[#A07621] bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-lg focus:ring-yellow-500",
      info: "border-[#2151A0] blue-gradient blue-btn-shadow focus:ring-[#0C51D9]",
    })[type.value] || "border-[#2151A0] blue-gradient blue-btn-shadow focus:ring-[#0C51D9]"
);
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 backdrop-blur-sm bg-black/30 z-[999] flex items-center justify-center p-4"
    @click.self="store.handleCancel()"
  >
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-md overflow-hidden">
      <!-- Header -->
      <div class="p-6 border-b border-[#DCDEDD]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0"
              :class="iconWrapClass"
            >
              <component :is="icon" class="w-6 h-6" :class="iconClass" />
            </div>
            <h3 class="text-brand-dark text-xl font-bold">{{ title }}</h3>
          </div>
          <button
            type="button"
            @click="store.handleCancel()"
            class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150 flex-shrink-0"
          >
            <X class="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p class="text-brand-light text-base whitespace-pre-line">{{ message }}</p>
      </div>

      <!-- Actions -->
      <div class="p-6 border-t border-[#DCDEDD] flex gap-3 justify-end">
        <button
          v-if="mode === 'confirm'"
          type="button"
          @click="store.handleCancel()"
          class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3"
        >
          <span class="text-brand-dark text-base font-semibold">{{ cancelText }}</span>
        </button>
        <button
          type="button"
          @click="store.handleConfirm()"
          class="rounded-[8px] border hover:brightness-110 focus:ring-2 transition-all duration-300 px-6 py-3"
          :class="confirmBtnClass"
        >
          <span class="text-brand-white text-base font-semibold">{{ confirmText }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
