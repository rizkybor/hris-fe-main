<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { RouterLink } from "vue-router";
import { ArrowLeft, FileSignature, Check } from "lucide-vue-next";
import { useDocumentSettingStore } from "@/stores/documentSetting";
import { UiAlert, UiPageHeader, UiSkeleton } from "@/components/ui";

const { t } = useI18n();
const store = useDocumentSettingStore();
const { setting, loading } = storeToRefs(store);

const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

// Same example the PDFs would print, so the choice is concrete.
const options = computed(() => [
  {
    value: true,
    title: t("settings.documents.withDegree.title"),
    description: t("settings.documents.withDegree.description"),
    example: "Budi Santoso, S.H.",
  },
  {
    value: false,
    title: t("settings.documents.nameOnly.title"),
    description: t("settings.documents.nameOnly.description"),
    example: "Budi Santoso",
  },
]);

onMounted(() => store.fetchSetting());

const choose = async (value) => {
  if (saving.value || setting.value.signatory_show_degree === value) return;
  errorMessage.value = "";
  successMessage.value = "";
  saving.value = true;
  try {
    await store.updateSetting({ signatory_show_degree: value });
    successMessage.value = t("settings.documents.saved");
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("settings.saveFailed");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('settings.documents.title')" :subtitle="$t('settings.documents.subtitle')">
      <template #eyebrow>
        <RouterLink :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" :aria-label="$t('settings.backToSettings')" :title="$t('settings.backToSettings')">
          <ArrowLeft class="w-4 h-4" /> {{ $t("settings.settings") }}
        </RouterLink>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4 lg:gap-10 p-4 sm:p-5 lg:p-6">
        <div>
          <div class="flex items-center gap-2">
            <FileSignature class="w-4 h-4 text-ui-muted" />
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("settings.documents.signatoryName") }}</h2>
          </div>
          <p class="text-ui-small text-ui-muted mt-1">{{ $t("settings.documents.signatoryHint") }}</p>
        </div>

        <div>
          <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UiSkeleton height="120px" /><UiSkeleton height="120px" />
          </div>
          <div v-else role="radiogroup" :aria-label="$t('settings.documents.signatoryName')" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="option in options"
              :key="String(option.value)"
              type="button"
              role="radio"
              :aria-checked="setting.signatory_show_degree === option.value"
              :disabled="saving"
              @click="choose(option.value)"
              class="ui-press w-full text-left border rounded-ui-card p-4 flex items-start gap-3 transition-colors disabled:opacity-50"
              :class="setting.signatory_show_degree === option.value ? 'border-ui-ink bg-ui-subtle/60' : 'border-ui-line hover:border-ui-line-strong'"
            >
              <span
                class="w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 mt-0.5"
                :class="setting.signatory_show_degree === option.value ? 'bg-ui-ink border-ui-ink' : 'border-ui-line-strong bg-ui-surface'"
              >
                <Check v-if="setting.signatory_show_degree === option.value" class="w-3 h-3 text-white" />
              </span>
              <span class="min-w-0">
                <span class="block text-ui-body font-medium text-ui-ink">{{ option.title }}</span>
                <span class="block text-ui-small text-ui-muted mt-0.5">{{ option.description }}</span>
                <span class="inline-block mt-2.5 px-2 py-1 rounded-md bg-ui-surface border border-ui-line text-ui-cap text-ui-ink">
                  {{ option.example }}
                </span>
              </span>
            </button>
          </div>

          <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" class="mt-3" />
          <UiAlert v-if="successMessage" tone="ok" :message="successMessage" class="mt-3" />
        </div>
      </div>
    </section>
  </div>
</template>
