<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
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
      error.value = errorMessage(err, "License not found.");
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
    error.value = "Please fix the highlighted fields.";
    return;
  }

  // A new plan gets a new key: the current key(s) stop working.
  const planChanged = form.value.plan !== license.value.plan;
  if (planChanged) {
    const devices = license.value.devices_used ?? 0;
    const ok = await alertModal.confirm(
      `Change the plan from ${planLabel(license.value)} to ${planLabel({ plan: form.value.plan })}? A new license key is generated; ` +
        `the current key${license.value.key_mode === "per_device" ? "s" : ""} stop working` +
        (devices ? ` and ${devices} device(s) are signed out and must activate again with the new key` : "") +
        ". Send the licensee the new certificate.",
      { title: "New License Key", type: "warning", confirmText: "Change plan" }
    );
    if (!ok) return;
  }

  saving.value = true;
  try {
    await store.updateLicense(license.value.id, form.value);
    success.value = planChanged ? "Plan changed. A new license key was generated." : "License updated successfully.";
    setTimeout(goToDetail, 1000);
  } catch (err) {
    errors.value = validationErrors(err);
    error.value = errorMessage(err, "Failed to update license.");
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
        :title="`Edit ${productName} License`"
        subtitle="Changing the plan generates a new license key"
        :license-key="license.key"
        :original-plan="license.plan"
        submit-label="Save Changes"
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

      <UiEmpty v-else :icon="FileX" title="License not available" :message="error" class="bg-ui-surface border border-ui-line rounded-ui-card">
        <UiButton variant="secondary" :icon="ArrowLeft" @click="goToDetail">Back</UiButton>
      </UiEmpty>
    </LicenseProductGate>
  </div>
</template>
