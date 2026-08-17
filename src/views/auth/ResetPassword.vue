<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { ref, onMounted } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import Alert from "@/components/common/Alert.vue";
import Input from "@/components/common/form/Input.vue";
import { Lock, ArrowLeft } from "lucide-vue-next";
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

  <div
    class="w-full lg:w-1/2 flex items-center justify-center"
    style="padding: 20px"
  >
    <div class="w-full max-w-md space-y-8">
      <div>
        <h1 class="text-brand-dark text-xl font-bold">Reset Password</h1>
        <p class="text-brand-dark text-sm font-normal mt-1">
          Masukkan password baru untuk akun kamu.
        </p>
      </div>

      <Alert
        type="success"
        title="Berhasil"
        :message="success"
        :show="!!success"
      />

      <Alert
        type="danger"
        title="Gagal Reset Password"
        :message="errorMessage ?? ''"
        :show="!!errorMessage"
      />

      <form class="space-y-6" @submit.prevent="handleSubmit" v-if="!success">
        <Input
          id="password"
          name="password"
          type="password"
          v-model="form.password"
          label="New Password"
          placeholder="Enter new password"
          :required="true"
        >
          <template #icon>
            <Lock class="h-5 w-5 text-gray-400" />
          </template>
        </Input>
        <p class="text-xs text-gray-400 -mt-4">
          Min. 8 karakter, kombinasi huruf besar/kecil, angka, dan simbol. Tidak boleh password yang pernah bocor di data breach.
        </p>

        <Input
          id="password_confirmation"
          name="password_confirmation"
          type="password"
          v-model="form.password_confirmation"
          label="Confirm New Password"
          placeholder="Re-enter new password"
          :required="true"
        >
          <template #icon>
            <Lock class="h-5 w-5 text-gray-400" />
          </template>
        </Input>

        <button
          type="submit"
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2 w-full justify-center bg-gradient-to-l from-[#0c51d9] via-[#6f96e3] to-[#0c51d9] shadow-[inset_-2px_2px_1px_0_#6197ff,inset_2px_2px_1px_0_rgba(97,151,255,0.55)] text-white font-plus-jakarta-sans text-[14px] font-semibold cursor-pointer"
          :disabled="loading"
        >
          {{ loading ? "Resetting..." : "Reset Password" }}
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
