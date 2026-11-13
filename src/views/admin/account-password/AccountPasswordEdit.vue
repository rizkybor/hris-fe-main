<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  Key,
  Globe,
  FileText,
  Tag,
  User,
  IdCard,
  RotateCw,
} from "lucide-vue-next";
import { UiPageHeader, UiButton, UiCard, UiInput, UiAlert, UiSwitch, UiSpinner } from "@/components/ui";
import { useAccountPasswordStore } from "@/stores/accountPassword";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const store = useAccountPasswordStore();

const loading = ref(true);
const submitting = ref(false);
const error = ref("");
const success = ref("");

const showPassword = ref(false);
const rotatePassword = ref(false);

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

const submit = async () => {
  error.value = "";
  success.value = "";

  if (!form.value.label_password || !form.value.username_email) {
    error.value = t("credentials.form.editRequired");
    return;
  }

  if (rotatePassword.value && !form.value.password) {
    error.value = t("credentials.form.newPasswordRequired");
    return;
  }

  const payload = {
    label_password: form.value.label_password,
    username_email: form.value.username_email,
    website: form.value.website || null,
    notes: form.value.notes || null,
    ...(rotatePassword.value && { password: form.value.password }),
  };

  submitting.value = true;

  try {
    // 🔥 updateAccount SUDAH fetch ulang di store
    await store.updateAccount(route.params.id, payload);

    success.value = t("credentials.form.updateSuccess");

    // reset field sensitif
    form.value.password = "";
    rotatePassword.value = false;

    setTimeout(() => {
      router.push({
        name: "admin.account-password.detail",
        params: { id: route.params.id },
      });
    }, 1200);
  } catch (e) {
    error.value = e?.message || t("credentials.form.updateFailed");
  } finally {
    submitting.value = false;
  }
};

const loadData = async () => {
  loading.value = true;
  error.value = "";

  try {
    await store.fetchAccount(route.params.id);
  } catch {
    error.value = t("credentials.form.notFound");
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

watch(
  () => store.currentAccount,
  (data) => {
    if (!data) return;

    form.value.label_password = data.label_password ?? data.label ?? "";
    form.value.username_email = data.username_email ?? data.username ?? "";
    form.value.website = data.website ?? "";
    form.value.notes = data.notes ?? "";
  },
  { immediate: true }
);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <form @submit.prevent="submit" class="space-y-5">
      <UiPageHeader :title="$t('credentials.form.editTitle')" :subtitle="$t('credentials.form.editSubtitle')">
        <template #eyebrow>
          <button
            type="button"
            @click="router.back()"
            class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
            :aria-label="$t('common.actions.back')"
          >
            <ArrowLeft class="w-4 h-4" />
            {{ $t("common.actions.back") }}
          </button>
        </template>
        <template v-if="!loading" #actions>
          <div class="hidden sm:flex items-center gap-2">
            <UiButton variant="secondary" @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
            <UiButton type="submit" :icon="Save" :loading="submitting">
              {{ submitting ? $t("credentials.form.updating") : $t("credentials.form.updateCredential") }}
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

      <!-- Loading -->
      <div v-if="loading" class="bg-ui-surface border border-ui-line rounded-ui-card">
        <UiSpinner :label="$t('credentials.form.loading')" />
      </div>

      <template v-if="!loading">
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
              <UiInput class="md:col-span-2" v-model="form.label_password" :label="$t('credentials.form.labelRequired')" :icon="Tag" />
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

          <!-- Rotate Password -->
          <UiCard>
            <template #header>
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line text-ui-muted inline-flex items-center justify-center"><RotateCw class="w-4 h-4" /></span>
                <h3 class="text-ui-h2 text-ui-ink">{{ $t("credentials.form.rotation") }}</h3>
              </div>
            </template>
            <UiSwitch v-model="rotatePassword" :label="$t('credentials.form.rotate')" />

            <div v-if="rotatePassword" class="space-y-3 mt-4">
              <UiAlert tone="warn" :message="$t('credentials.form.rotateWarning')" />

              <div class="relative">
                <Key class="absolute left-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  :placeholder="$t('credentials.form.newPassword')"
                  :aria-label="$t('credentials.form.newPassword')"
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
            <UiInput v-model="form.notes" :rows="4" :label="$t('credentials.form.notesOptional')" :icon="FileText" />
          </UiCard>
        </div>

        <!-- Actions (phones) -->
        <div class="sm:hidden grid grid-cols-2 gap-2">
          <UiButton variant="secondary" size="lg" block @click="router.back()">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" size="lg" block :icon="Save" :loading="submitting">
            {{ submitting ? $t("credentials.form.updating") : $t("credentials.form.updateCredential") }}
          </UiButton>
        </div>
      </template>
    </form>
  </div>
</template>
