<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { ref, onMounted } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { UiAlert, UiButton, UiInput } from "@/components/ui";
import { Lock, ArrowLeft, KeyRound } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import LoadingOverlay from "@/components/common/LoadingOverlay.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : t("auth.reset.failedFallback"));
  }
};
</script>

<template>
  <LoadingOverlay :show="loading" :text="$t('auth.reset.resettingOverlay')" />

  <div class="space-y-7">
    <div>
      <span class="w-11 h-11 rounded-[12px] border border-ui-line bg-ui-surface inline-flex items-center justify-center text-ui-ink mb-5">
        <KeyRound class="w-5 h-5" />
      </span>
      <h1 class="text-ui-display text-ui-ink">{{ $t("auth.reset.title") }}</h1>
      <p class="text-ui-body text-ui-muted mt-1.5">{{ $t("auth.reset.subtitle") }}</p>
    </div>

    <UiAlert v-if="success" tone="ok" :title="$t('auth.reset.successTitle')" :message="success" />
    <UiAlert v-if="errorMessage" tone="bad" :title="$t('auth.reset.failedTitle')" :message="errorMessage ?? ''" />

    <form class="space-y-5" @submit.prevent="handleSubmit" v-if="!success">
      <UiInput
        id="password"
        name="password"
        type="password"
        v-model="form.password"
        :label="$t('auth.reset.newPassword')"
        :placeholder="$t('auth.reset.newPasswordPlaceholder')"
        autocomplete="new-password"
        required
        :icon="Lock"
        :hint="$t('auth.reset.hint')"
      />
      <UiInput
        id="password_confirmation"
        name="password_confirmation"
        type="password"
        v-model="form.password_confirmation"
        :label="$t('auth.reset.confirm')"
        :placeholder="$t('auth.reset.confirmPlaceholder')"
        autocomplete="new-password"
        required
        :icon="Lock"
      />
      <UiButton type="submit" size="lg" block :loading="loading">{{ loading ? $t("auth.reset.resetting") : $t("auth.reset.submit") }}</UiButton>
    </form>

    <RouterLink :to="{ name: 'login' }" class="inline-flex items-center gap-1.5 text-ui-small font-medium text-ui-accent hover:underline">
      <ArrowLeft class="w-4 h-4" />
      {{ $t("auth.backToLogin") }}
    </RouterLink>
  </div>
</template>
