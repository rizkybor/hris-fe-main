<script setup lang="ts">
import { X, AlertCircle } from "lucide-vue-next";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(["close"]);
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click="emit('close')"
      >
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="show"
            @click.stop
            class="bg-white rounded-[20px] border border-[#DCDEDD] w-full max-w-md overflow-hidden"
          >
            <!-- Modal Content -->
            <div class="p-8 text-center">
              <div class="flex justify-center mb-4">
                <div
                  class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center"
                >
                  <AlertCircle class="w-8 h-8 text-red-600" />
                </div>
              </div>

              <h3 class="text-brand-dark text-xl font-bold mb-2">
                Oops! Something's Not Right
              </h3>
              <p class="text-brand-light text-base font-normal mb-6">
                Please check your data again and make sure all required fields are filled correctly.
              </p>

              <button
                type="button"
                @click="emit('close')"
                class="w-full btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-red-600 transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 shadow-lg px-6 py-3"
              >
                <span class="text-white text-base font-semibold">
                  OK, I'll Fix It
                </span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
