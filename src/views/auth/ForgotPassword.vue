<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { UiAlert, UiButton, UiInput } from "@/components/ui";
import { AtSign, ArrowLeft, Mail } from "lucide-vue-next";
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

  <div class="space-y-7">
    <div>
      <span class="w-11 h-11 rounded-[12px] border border-ui-line bg-ui-surface inline-flex items-center justify-center text-ui-ink mb-5">
        <Mail class="w-5 h-5" />
      </span>
      <h1 class="text-ui-display text-ui-ink">Forgot password?</h1>
      <p class="text-ui-body text-ui-muted mt-1.5">Masukkan email kamu, kami akan kirimkan link untuk reset password.</p>
    </div>

    <UiAlert v-if="success" tone="ok" title="Email Terkirim" :message="success" />
    <UiAlert
      v-if="error"
      tone="bad"
      title="Failed to Send"
      :message="typeof error === 'string' ? error : 'An error occurred, please try again.'"
    />

    <form class="space-y-5" @submit.prevent="handleSubmit">
      <UiInput
        id="email"
        name="email"
        type="email"
        v-model="email"
        label="Email Address"
        placeholder="name@company.com"
        autocomplete="email"
        required
        :icon="AtSign"
      />
      <UiButton type="submit" size="lg" block :loading="loading">{{ loading ? "Sending..." : "Send Reset Link" }}</UiButton>
    </form>

    <RouterLink :to="{ name: 'login' }" class="inline-flex items-center gap-1.5 text-ui-small font-medium text-ui-accent hover:underline">
      <ArrowLeft class="w-4 h-4" />
      Back to Login
    </RouterLink>
  </div>
</template>
