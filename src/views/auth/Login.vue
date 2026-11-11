<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { ref, computed, onMounted } from "vue";
import { UiAlert, UiButton, UiInput } from "@/components/ui";
import { AtSign, Lock } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import ButterflyLoader from "@/components/auth/ButterflyLoader.vue";


const authStore = useAuthStore();
const { loading } = storeToRefs(authStore);
const { login } = authStore;

// authStore is a plain (untyped) JS Pinia store initialized with
// `error: null`, so TypeScript infers `error` as `never` inside this
// <script setup lang="ts"> block once it's narrowed -- cast to `any` here
// rather than typing the store itself. At runtime `error` is either a
// plain string message or a Laravel validation-errors object
// (`{ email: string[], password: string[] }`), both handled below.
const error = computed(() => authStore.error as any);

const form = ref({
  email: "",
  password: "",
});

onMounted(() => {
  authStore.error = null;
  authStore.success = null;
  // Warm the loader's logo so the sign-in screen never shows up empty.
  new Image().src = "/images/jcd-logo-light.png";
});

const handleSubmit = async () => {
  await login(form.value);

  if (error.value === "Unauthorized") {
    form.value.password = "";
  }
};
</script>

<template>
  <ButterflyLoader :show="loading" :text="$t('auth.login.authenticating')" />

  <div class="space-y-7">
    <div>
      <h1 class="text-ui-display text-ui-ink">{{ $t("auth.login.title") }}</h1>
    </div>

    <UiAlert
      v-if="error === 'Unauthorized'"
      tone="bad"
      :title="$t('auth.login.invalidTitle')"
      :message="$t('auth.login.invalidMessage')"
    />
    <UiAlert v-else-if="typeof error === 'string'" tone="bad" :title="$t('auth.login.tooManyTitle')" :message="error" />

    <form class="space-y-5" @submit.prevent="handleSubmit">
      <UiInput
        id="email"
        name="email"
        type="email"
        v-model="form.email"
        :label="$t('auth.login.email')"
        :placeholder="$t('auth.login.emailPlaceholder')"
        autocomplete="username"
        required
        :icon="AtSign"
        :error="error?.email?.join(', ')"
      />

      <div>
        <UiInput
          id="password"
          name="password"
          type="password"
          v-model="form.password"
          :label="$t('auth.login.password')"
          :placeholder="$t('auth.login.passwordPlaceholder')"
          autocomplete="current-password"
          required
          :icon="Lock"
          :error="error?.password?.join(', ')"
        />
        <div class="flex items-center justify-between mt-3">
          <label class="flex items-center gap-2 text-ui-small text-ui-text cursor-pointer select-none">
            <input
              type="checkbox"
              id="remember"
              name="remember"
              class="w-4 h-4 rounded border-ui-line-strong text-ui-ink focus:ring-ui-accent"
            />
            {{ $t("auth.login.remember") }}
          </label>
          <RouterLink :to="{ name: 'forgot-password' }" class="text-ui-small font-medium text-ui-accent hover:underline">
            {{ $t("auth.login.forgot") }}
          </RouterLink>
        </div>
      </div>

      <UiButton type="submit" size="lg" block :loading="loading">{{ $t("auth.login.submit") }}</UiButton>
    </form>
  </div>
</template>
