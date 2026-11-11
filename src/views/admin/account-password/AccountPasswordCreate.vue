<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import {
  Eye,
  EyeOff,
  Save,
  Globe,
  FileText,
  Key,
  Tag,
  User,
  IdCard,
  Lock,
  ArrowLeft,
} from "lucide-vue-next";
import { UiPageHeader, UiButton, UiCard, UiInput, UiAlert } from "@/components/ui";
import { useAccountPasswordStore } from "@/stores/accountPassword";
import { errorMessage } from "@/helpers/errorHelper";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const router = useRouter();
const passwordStore = useAccountPasswordStore();

const loading = ref(false);
const showPassword = ref(false);
const error = ref("");
const success = ref("");

const form = ref({
  label_password: "",
  username_email: "",
  website: "",
  password: "",
  notes: "",
});

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

// Purely visual guidance -- the vault stores arbitrary third-party
// passwords, so strength isn't enforced here, just hinted at.
const passwordStrength = computed(() => {
  const value = form.value.password || "";
  if (!value) return { score: 0, label: "", color: "" };

  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  if (score <= 1) return { score: 1, label: t("credentials.strength.weak"), color: "bg-red-500" };
  if (score <= 3) return { score: 2, label: t("credentials.strength.fair"), color: "bg-amber-500" };
  return { score: 3, label: t("credentials.strength.strong"), color: "bg-emerald-500" };
});

// Strength meter segments in token colours (score 1-3 from passwordStrength).
const STRENGTH_TONE = {
  1: { bar: "bg-ui-bad", text: "text-ui-bad" },
  2: { bar: "bg-ui-warn", text: "text-ui-warn" },
  3: { bar: "bg-ui-ok", text: "text-ui-ok" },
};

const submit = async () => {
  error.value = "";
  success.value = "";

  if (
    !form.value.label_password ||
    !form.value.username_email ||
    !form.value.password
  ) {
    error.value = t("credentials.form.createRequired");
    return;
  }

  loading.value = true;
  try {
    await passwordStore.createAccount(form.value);

    success.value = t("credentials.form.saveSuccess");

    setTimeout(() => {
      router.push({ name: "admin.account-password.dashboard" });
    }, 1200);
  } catch (err) {
    error.value = errorMessage(err, t("credentials.form.saveFailed"));
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <form @submit.prevent="submit" class="space-y-5">
      <UiPageHeader :title="$t('credentials.form.createTitle')" :subtitle="$t('credentials.form.createSubtitle')">
        <template #eyebrow>
          <button
            type="button"
            @click="$router.back()"
            class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
            :aria-label="$t('common.actions.back')"
          >
            <ArrowLeft class="w-4 h-4" />
            {{ $t("common.actions.back") }}
          </button>
        </template>
        <template #actions>
          <div class="hidden sm:flex items-center gap-2">
            <UiButton variant="secondary" @click="$router.back()">{{ $t("common.actions.cancel") }}</UiButton>
            <UiButton type="submit" :icon="Save" :loading="loading">
              {{ loading ? $t("common.actions.saving") : $t("credentials.form.saveCredential") }}
            </UiButton>
          </div>
        </template>
      </UiPageHeader>

      <div v-if="error || success" class="space-y-3">
        <Transition name="ui-fade">
          <UiAlert v-if="error" tone="bad" :title="error" />
        </Transition>
        <Transition name="ui-fade">
          <UiAlert v-if="success" tone="ok" :title="success" />
        </Transition>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start ui-stagger">
        <!-- Account Detail -->
        <UiCard>
          <template #header>
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line text-ui-muted inline-flex items-center justify-center"><IdCard class="w-4 h-4" /></span>
              <h3 class="text-ui-h2 text-ui-ink">{{ $t("credentials.form.accountDetail") }}</h3>
            </div>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <UiInput
              class="md:col-span-2"
              v-model="form.label_password"
              :label="$t('credentials.form.labelRequired')"
              :icon="Tag"
              :placeholder="$t('credentials.form.labelPlaceholder')"
            />
            <UiInput
              v-model="form.username_email"
              :label="$t('credentials.form.usernameRequired')"
              mono
              :icon="User"
              :placeholder="$t('credentials.form.usernamePlaceholder')"
            />
            <UiInput
              v-model="form.website"
              type="url"
              :label="$t('credentials.form.websiteOptional')"
              mono
              :icon="Globe"
              placeholder="https://example.com"
            />
          </div>
        </UiCard>

        <!-- Password -->
        <UiCard>
          <template #header>
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line text-ui-muted inline-flex items-center justify-center"><Lock class="w-4 h-4" /></span>
              <h3 class="text-ui-h2 text-ui-ink">{{ $t("credentials.fields.password") }}</h3>
            </div>
          </template>
          <label for="credential-password" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("credentials.form.passwordRequired") }}</label>
          <div class="relative">
            <Key class="absolute left-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
            <input
              id="credential-password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :placeholder="$t('credentials.form.passwordPlaceholder')"
              class="w-full h-[38px] pl-9 pr-10 bg-ui-surface font-mono text-ui-small text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            />
            <button
              type="button"
              @click="togglePassword"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-faint hover:text-ui-ink hover:bg-ui-hover"
              :aria-label="showPassword ? $t('common.a11y.hidePassword') : $t('common.a11y.showPassword')"
              :aria-pressed="showPassword"
            >
              <Eye v-if="!showPassword" class="w-4 h-4" />
              <EyeOff v-else class="w-4 h-4" />
            </button>
          </div>

          <div v-if="form.password" class="flex items-center gap-2.5 mt-3">
            <div class="flex-1 flex gap-1">
              <div
                v-for="i in 3"
                :key="i"
                class="flex-1 h-1.5 rounded-full transition-colors"
                :class="i <= passwordStrength.score ? STRENGTH_TONE[passwordStrength.score].bar : 'bg-ui-subtle'"
              ></div>
            </div>
            <span class="text-ui-cap font-medium shrink-0" :class="STRENGTH_TONE[passwordStrength.score]?.text">{{ passwordStrength.label }}</span>
          </div>
        </UiCard>

        <!-- Notes -->
        <UiCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line text-ui-muted inline-flex items-center justify-center"><FileText class="w-4 h-4" /></span>
              <h3 class="text-ui-h2 text-ui-ink">{{ $t("common.labels.notes") }}</h3>
            </div>
          </template>
          <UiInput
            v-model="form.notes"
            :rows="4"
            :label="$t('credentials.form.notesOptional')"
            :icon="FileText"
            :placeholder="$t('credentials.form.notesPlaceholder')"
          />
        </UiCard>
      </div>

      <!-- Actions (phones) -->
      <div class="sm:hidden grid grid-cols-2 gap-2">
        <UiButton variant="secondary" size="lg" block @click="$router.back()">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" size="lg" block :icon="Save" :loading="loading">
          {{ loading ? $t("common.actions.saving") : $t("credentials.form.saveCredential") }}
        </UiButton>
      </div>
    </form>
  </div>
</template>
