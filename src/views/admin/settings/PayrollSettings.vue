<script setup>
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { Wallet, ArrowLeft } from "lucide-vue-next";
import { usePayrollSettingStore } from "@/stores/payrollSetting";
import { RouterLink } from "vue-router";
import { UiAlert, UiPageHeader, UiSkeleton, UiSwitch } from "@/components/ui";

const { t } = useI18n();
const store = usePayrollSettingStore();
const { setting, loading } = storeToRefs(store);

const saving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

onMounted(async () => {
  await store.fetchSetting();
});

const handleToggle = async () => {
  errorMessage.value = "";
  successMessage.value = "";
  saving.value = true;
  try {
    await store.updateSetting({
      attendance_exempt_roles_enabled: !setting.value.attendance_exempt_roles_enabled,
    });
    successMessage.value = t("settings.payroll.saved");
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("settings.saveFailed");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('settings.payroll.title')" :subtitle="$t('settings.payroll.subtitle')">
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
            <Wallet class="w-4 h-4 text-ui-muted" />
            <h2 class="text-ui-h2 text-ui-ink">{{ $t("settings.payroll.generationTitle") }}</h2>
          </div>
          <p class="text-ui-small text-ui-muted mt-1">{{ $t("settings.payroll.generationHint") }}</p>
        </div>
        <div>
          <UiSkeleton v-if="loading" height="96px" />
          <div v-else class="rounded-ui-card border border-ui-line px-4 py-3.5">
            <div class="flex items-start gap-4">
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink">{{ $t("settings.payroll.exemption") }}</p>
                <p class="text-ui-small text-ui-muted mt-0.5">
                  {{ $t("settings.payroll.exemptionBefore") }}
                  <strong class="text-ui-text font-medium">{{ $t("settings.payroll.exemptionRoles") }}</strong>
                  {{ $t("settings.payroll.exemptionAfter") }}
                </p>
                <p v-if="setting.updated_by?.name" class="text-ui-cap text-ui-faint mt-2">
                  {{ $t("settings.lastChangedBy", { name: setting.updated_by.name }) }}
                </p>
              </div>
              <UiSwitch
                class="mt-0.5"
                :model-value="!!setting.attendance_exempt_roles_enabled"
                :disabled="saving"
                :aria-label="$t('settings.payroll.exemption')"
                @update:model-value="handleToggle"
              />
            </div>
          </div>

          <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" class="mt-3" />
          <UiAlert v-if="successMessage" tone="ok" :message="successMessage" class="mt-3" />
        </div>
      </div>
    </section>
  </div>
</template>
