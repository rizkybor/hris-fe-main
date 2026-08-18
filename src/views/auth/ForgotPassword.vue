<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import Alert from "@/components/common/Alert.vue";
import Input from "@/components/common/form/Input.vue";
import { AtSign, ArrowLeft } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import LoadingOverlay from "@/components/common/LoadingOverlay.vue";

const authStore = useAuthStore();
const { loading, error, success } = storeToRefs(authStore);

const email = ref("");

onMounted(() => {
  authStore.error = null;
  authStore.success = null;
});

const handleSubmit = async () => {
  try {
    await authStore.forgotPassword(email.value);
  } catch (e) {}
};
</script>

<template>
  <LoadingOverlay :show="loading" text="Sending reset link..." />

  <div
    class="w-full lg:w-1/2 flex items-center justify-center"
    style="padding: 20px"
  >
    <div class="w-full max-w-md space-y-8">
      <div>
        <h1 class="text-brand-dark text-xl font-bold">Forgot Password</h1>
        <p class="text-brand-dark text-sm font-normal mt-1">
          Masukkan email kamu, kami akan kirimkan link untuk reset password.
        </p>
      </div>

      <Alert
        type="success"
        title="Email Terkirim"
        :message="success"
        :show="!!success"
      />

      <Alert
        type="danger"
        title="Failed to Send"
        :message="typeof error === 'string' ? error : 'An error occurred, please try again.'"
        :show="!!error"
      />

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <Input
          id="email"
          name="email"
          type="email"
          v-model="email"
          label="Email Address"
          placeholder="Enter your email"
          :required="true"
        >
          <template #icon>
            <AtSign class="h-5 w-5 text-gray-400" />
          </template>
        </Input>

        <button
          type="submit"
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2 w-full justify-center bg-gradient-to-l from-[#0c51d9] via-[#6f96e3] to-[#0c51d9] shadow-[inset_-2px_2px_1px_0_#6197ff,inset_2px_2px_1px_0_rgba(97,151,255,0.55)] text-white font-plus-jakarta-sans text-[14px] font-semibold cursor-pointer"
          :disabled="loading"
        >
          {{ loading ? "Sending..." : "Send Reset Link" }}
        </button>
      </form>

      <div class="text-center">
        <RouterLink
          :to="{ name: 'login' }"
          class="inline-flex items-center gap-2 text-[#3b82f6] font-plus-jakarta-sans text-[14px] font-semibold hover:brightness-110 transition-all duration-300"
        >
          <ArrowLeft class="w-4 h-4" />
          Back to Login
        </RouterLink>
      </div>
    </div>
  </div>
</template>
