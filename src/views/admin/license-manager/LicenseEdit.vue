<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft } from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import LicenseProductGate from "@/components/admin/license-manager/LicenseProductGate.vue";
import { useLicenseProduct, onProductReady } from "@/components/admin/license-manager/useLicenseProduct";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import LicenseForm from "@/components/admin/license-manager/LicenseForm.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { errorMessage } from "@/helpers/errorHelper";
import {
  licenseToForm,
  validateLicenseForm,
  validationErrors,
} from "@/components/admin/license-manager/licenseHelpers";

const route = useRoute();
const router = useRouter();
const store = useLicenseManagerStore();
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

  saving.value = true;
  try {
    await store.updateLicense(license.value.id, form.value);
    success.value = "License updated successfully.";
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
  <div class="w-full">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <div v-if="loadingPage" class="space-y-5">
        <Skeleton height="72px" rounded="16px" />
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div class="lg:col-span-8 space-y-5">
            <Skeleton height="160px" rounded="16px" />
            <Skeleton height="220px" rounded="16px" />
          </div>
          <div class="lg:col-span-4"><Skeleton height="420px" rounded="16px" /></div>
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
        subtitle="The license key cannot be changed"
        :license-key="license.key"
        submit-label="Save Changes"
        @submit="submit"
        @cancel="goToDetail"
      >
        <template #alerts>
          <Transition name="fade">
            <div v-if="error" class="mb-5">
              <Alert type="danger" :title="error" message="" :show="!!error" @close="error = ''" />
            </div>
          </Transition>
          <Transition name="fade">
            <div v-if="success" class="mb-5">
              <Alert type="success" :title="success" message="" :show="!!success" />
            </div>
          </Transition>
        </template>
      </LicenseForm>

      <div v-else class="bg-white border border-[#DCDEDD] rounded-[16px] p-6">
        <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" />
        <button type="button" @click="goToDetail" class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-700">
          <ArrowLeft class="w-4 h-4" /> Back
        </button>
      </div>
    </LicenseProductGate>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
