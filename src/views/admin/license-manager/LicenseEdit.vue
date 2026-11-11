<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ArrowLeft, FileX } from "lucide-vue-next";
import { UiButton, UiEmpty } from "@/components/ui";
import Alert from "@/components/common/Alert.vue";
import LicenseProductGate from "@/components/admin/license-manager/LicenseProductGate.vue";
import { useLicenseProduct, onProductReady } from "@/components/admin/license-manager/useLicenseProduct";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import LicenseForm from "@/components/admin/license-manager/LicenseForm.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { useAlertModalStore } from "@/stores/alertModal";
import { errorMessage } from "@/helpers/errorHelper";
import {
  licenseToForm,
  validateLicenseForm,
  validationErrors,
  planLabel,
} from "@/components/admin/license-manager/licenseHelpers";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useLicenseManagerStore();
const alertModal = useAlertModalStore();
const { code: productCode, product, productName, state: productState } = useLicenseProduct();

const license = ref(null);
const form = ref(licenseToForm(null));
const loadingPage = ref(true);
const saving = ref(false);
const error = ref("");
const success = ref("");
const errors = ref({});

const goToDetail = () =>
  router.push({ name: "admin.license-manager.licenses.detail", params: { product: productCode.value, id: route.params.id } });

onProductReady(
  productState,
  async () => {
    loadingPage.value = true;
    try {
      license.value = await store.fetchLicense(route.params.id);
      form.value = licenseToForm(license.value);
    } catch (err) {
      license.value = null;
      error.value = errorMessage(err, t("licenses.edit.notFound"));
    } finally {
      loadingPage.value = false;
    }
  },
  () => `${productCode.value}/${route.params.id}`
);

const submit = async () => {
  error.value = "";
  success.value = "";
  errors.value = validateLicenseForm(form.value);
  if (Object.keys(errors.value).length) {
    error.value = t("licenses.fixFields");
    return;
  }

  // A new plan gets a new key: the current key(s) stop working.
  const planChanged = form.value.plan !== license.value.plan;
  if (planChanged) {
    const devices = license.value.devices_used ?? 0;
    const params = { from: planLabel(license.value), to: planLabel({ plan: form.value.plan }), n: devices };
    const keys = license.value.key_mode === "per_device" ? "Keys" : "Key";
    const ok = await alertModal.confirm(
      devices ? t(`licenses.edit.planConfirm${keys}Devices`, params, devices) : t(`licenses.edit.planConfirm${keys}`, params),
      { title: t("licenses.edit.newKeyTitle"), type: "warning", confirmText: t("licenses.edit.changePlan") }
    );
    if (!ok) return;
  }

  saving.value = true;
  try {
    await store.updateLicense(license.value.id, form.value);
    success.value = planChanged ? t("licenses.edit.planChanged") : t("licenses.edit.updated");
    setTimeout(goToDetail, 1000);
  } catch (err) {
    errors.value = validationErrors(err);
    error.value = errorMessage(err, t("licenses.edit.failed"));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <div v-if="loadingPage" class="space-y-5">
        <Skeleton width="40%" height="30px" rounded="8px" />
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div class="lg:col-span-8 space-y-5">
            <Skeleton height="220px" rounded="12px" />
            <Skeleton height="260px" rounded="12px" />
          </div>
          <div class="lg:col-span-4"><Skeleton height="420px" rounded="12px" /></div>
        </div>
      </div>

      <LicenseForm
        v-else-if="license"
        v-model="form"
        :loading="saving"
        :errors="errors"
        :is-edit="true"
        :product="product"
        :title="$t('licenses.edit.title', { product: productName })"
        :subtitle="$t('licenses.edit.subtitle')"
        :license-key="license.key"
        :original-plan="license.plan"
        :submit-label="$t('common.actions.saveChanges')"
        @submit="submit"
        @cancel="goToDetail"
      >
        <template #alerts>
          <Transition name="ui-fade">
            <Alert class="!mb-0" v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />
          </Transition>
          <Transition name="ui-fade">
            <Alert class="!mb-0" v-if="success" type="success" :title="success" message="" :show="!!success" />
          </Transition>
        </template>
      </LicenseForm>

      <UiEmpty v-else :icon="FileX" :title="$t('licenses.edit.unavailable')" :message="error" class="bg-ui-surface border border-ui-line rounded-ui-card">
        <UiButton variant="secondary" :icon="ArrowLeft" @click="goToDetail">{{ $t("common.actions.back") }}</UiButton>
      </UiEmpty>
    </LicenseProductGate>
  </div>
</template>
