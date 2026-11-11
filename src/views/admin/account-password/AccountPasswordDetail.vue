<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  ArrowLeft,
  Clock,
  Key,
  Globe,
  FileText,
  User,
  Lock,
  Check,
} from "lucide-vue-next";
import { useAccountPasswordStore } from "@/stores/accountPassword";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiCard, UiEmpty } from "@/components/ui";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const store = useAccountPasswordStore();

const account = ref(null);
const loading = ref(true);
const error = ref("");
const showPassword = ref(false);
const copied = ref(false);

const formatDate = (date) =>
  new Date(date).toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const copyPassword = async () => {
  await navigator.clipboard.writeText(account.value.password);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
};

onMounted(async () => {
  try {
    await store.fetchAccount(route.params.id);
    account.value = store.currentAccount;
  } catch (err) {
    error.value = t("credentials.form.notFound");
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="account && !loading ? account.label_password || account.label : $t('credentials.detail.title')"
      :subtitle="$t('credentials.detail.subtitle')"
    >
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
      <template #actions>
        <UiButton
          variant="secondary"
          :icon="Pencil"
          :disabled="!account"
          @click="
            router.push({
              name: 'admin.account-password.edit',
              params: { id: account?.id },
            })
          "
        >
          {{ $t("common.actions.edit") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
      <div class="lg:col-span-2 bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 space-y-5">
        <Skeleton width="40%" height="18px" />
        <Skeleton height="44px" rounded="8px" />
        <Skeleton width="60%" height="18px" />
        <Skeleton height="72px" rounded="8px" />
      </div>
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 space-y-4">
        <Skeleton width="50%" height="18px" />
        <Skeleton height="16px" />
        <Skeleton height="16px" />
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!account && error" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="ShieldCheck" :title="error" />
    </div>

    <!-- Content -->
    <div v-if="account && !loading" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start ui-stagger">
      <div class="lg:col-span-2 space-y-4 sm:space-y-5">
        <UiCard>
          <template #header>
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line text-ui-muted inline-flex items-center justify-center"><Lock class="w-4 h-4" /></span>
              <h3 class="text-ui-h2 text-ui-ink">{{ $t("credentials.columns.credential") }}</h3>
            </div>
          </template>

          <div class="space-y-5">
            <div>
              <p class="text-ui-cap text-ui-muted mb-1.5">{{ $t("credentials.fields.usernameEmail") }}</p>
              <div class="flex items-center gap-2.5 min-w-0">
                <User class="w-4 h-4 text-ui-faint shrink-0" />
                <p class="font-mono text-ui-small text-ui-ink break-all">{{ account.username_email || account.username || "—" }}</p>
              </div>
            </div>

            <div>
              <p class="text-ui-cap text-ui-muted mb-1.5">{{ $t("credentials.fields.password") }}</p>
              <div class="flex items-center gap-2 pl-3 pr-1.5 h-11 bg-ui-subtle border border-ui-line rounded-ui-control">
                <Key class="w-4 h-4 text-ui-faint shrink-0" />
                <span class="font-mono text-ui-small text-ui-ink tracking-widest flex-1 min-w-0 truncate">
                  {{ showPassword ? account.password : "••••••••••••" }}
                </span>
                <button
                  type="button"
                  @click="togglePassword"
                  class="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
                  :aria-label="showPassword ? $t('common.a11y.hidePassword') : $t('common.a11y.showPassword')"
                  :title="showPassword ? $t('common.a11y.hidePassword') : $t('common.a11y.showPassword')"
                >
                  <Eye v-if="!showPassword" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  @click="copyPassword"
                  class="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
:aria-label="$t('credentials.actions.copyPassword')"
                  :title="$t('credentials.actions.copyPassword')"
                >
                  <Check v-if="copied" class="w-4 h-4 text-ui-ok" />
                  <Copy v-else class="w-4 h-4" />
                </button>
              </div>
              <p v-if="copied" class="text-ui-cap text-ui-ok mt-1.5">{{ $t("credentials.detail.copied") }}</p>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line text-ui-muted inline-flex items-center justify-center"><FileText class="w-4 h-4" /></span>
              <h3 class="text-ui-h2 text-ui-ink">{{ $t("credentials.detail.additional") }}</h3>
            </div>
          </template>

          <div class="space-y-5">
            <div>
              <p class="text-ui-cap text-ui-muted mb-1">{{ $t("credentials.fields.website") }}</p>
              <div class="flex items-center gap-2.5 min-w-0">
                <Globe class="w-4 h-4 text-ui-faint shrink-0" />
                <a
                  v-if="account.website"
                  :href="account.website"
                  target="_blank"
                  class="font-mono text-ui-small text-ui-accent hover:underline truncate"
                >
                  {{ account.website }}
                </a>
                <span v-else class="text-ui-faint">—</span>
              </div>
            </div>

            <div>
              <p class="text-ui-cap text-ui-muted mb-1">{{ $t("common.labels.notes") }}</p>
              <p class="text-ui-body text-ui-ink whitespace-pre-line px-3.5 py-3 bg-ui-subtle border border-ui-line rounded-ui-control">{{ account.notes || "—" }}</p>
            </div>
          </div>
        </UiCard>
      </div>

      <UiCard :title="$t('credentials.detail.activity')">
        <dl class="divide-y divide-ui-line">
          <div class="flex items-center justify-between gap-3 py-2.5 first:pt-0">
            <dt class="inline-flex items-center gap-2 text-ui-small text-ui-muted"><Clock class="w-4 h-4 text-ui-faint" />{{ $t("credentials.detail.createdAt") }}</dt>
            <dd class="text-ui-small font-medium text-ui-ink text-right">{{ formatDate(account.created_at) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2.5 last:pb-0">
            <dt class="inline-flex items-center gap-2 text-ui-small text-ui-muted"><Clock class="w-4 h-4 text-ui-faint" />{{ $t("common.labels.updatedAt") }}</dt>
            <dd class="text-ui-small font-medium text-ui-ink text-right">{{ formatDate(account.updated_at) }}</dd>
          </div>
        </dl>
      </UiCard>
    </div>
  </div>
</template>
