<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { ref, onMounted } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { UiAlert, UiButton, UiInput } from "@/components/ui";
import { Lock, ArrowLeft, KeyRound } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import LoadingOverlay from "@/components/common/LoadingOverlay.vue";

const authStore = useAuthStore();
const { loading, success } = storeToRefs(authStore);
const route = useRoute();
const router = useRouter();

const form = ref({
  email: "",
  token: "",
  password: "",
  password_confirmation: "",
});

const errorMessage = ref<string | null>(null);

onMounted(() => {
  authStore.error = null;
  authStore.success = null;
  form.value.email = String(route.query.email ?? "");
  form.value.token = String(route.query.token ?? "");
});

const handleSubmit = async () => {
  errorMessage.value = null;
  try {
    await authStore.resetPassword(form.value);
    setTimeout(() => {
      router.push({ name: "login" });
    }, 2000);
  } catch (e: any) {
    const data = e?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Failed to reset password.");
  }
};
</script>

<template>
  <LoadingOverlay :show="loading" text="Resetting password..." />

  <div class="space-y-7">
    <div>
      <span class="w-11 h-11 rounded-[12px] border border-ui-line bg-ui-surface inline-flex items-center justify-center text-ui-ink mb-5">
        <KeyRound class="w-5 h-5" />
      </span>
      <h1 class="text-ui-display text-ui-ink">Reset password</h1>
      <p class="text-ui-body text-ui-muted mt-1.5">Masukkan password baru untuk akun kamu.</p>
    </div>

    <UiAlert v-if="success" tone="ok" title="Success" :message="success" />
    <UiAlert v-if="errorMessage" tone="bad" title="Failed to Reset Password" :message="errorMessage ?? ''" />

    <form class="space-y-5" @submit.prevent="handleSubmit" v-if="!success">
      <UiInput
        id="password"
        name="password"
        type="password"
        v-model="form.password"
        label="New Password"
        placeholder="Enter new password"
        autocomplete="new-password"
        required
        :icon="Lock"
        hint="Min. 8 karakter, kombinasi huruf besar/kecil, angka, dan simbol. Tidak boleh password yang pernah bocor di data breach."
      />
      <UiInput
        id="password_confirmation"
        name="password_confirmation"
        type="password"
        v-model="form.password_confirmation"
        label="Confirm New Password"
        placeholder="Re-enter new password"
        autocomplete="new-password"
        required
        :icon="Lock"
      />
      <UiButton type="submit" size="lg" block :loading="loading">{{ loading ? "Resetting..." : "Reset Password" }}</UiButton>
    </form>

    <RouterLink :to="{ name: 'login' }" class="inline-flex items-center gap-1.5 text-ui-small font-medium text-ui-accent hover:underline">
      <ArrowLeft class="w-4 h-4" />
      Back to Login
    </RouterLink>
  </div>
</template>
