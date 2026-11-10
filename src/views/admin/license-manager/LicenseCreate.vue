<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, CheckCircle2, Eye, Plus, FileDown } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";
import Alert from "@/components/common/Alert.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import LicenseProductGate from "@/components/admin/license-manager/LicenseProductGate.vue";
import { useLicenseProduct, onProductReady } from "@/components/admin/license-manager/useLicenseProduct";
import LicenseForm from "@/components/admin/license-manager/LicenseForm.vue";
import CopyKeyButton from "@/components/admin/license-manager/CopyKeyButton.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { errorMessage } from "@/helpers/errorHelper";
import {
  licenseToForm,
  validateLicenseForm,
  validationErrors,
  formatDate,
  planLabel,
  planChipClass,
  categoryLabel,
} from "@/components/admin/license-manager/licenseHelpers";

const router = useRouter();
const store = useLicenseManagerStore();
const { code: productCode, product, productName, state: productState } = useLicenseProduct();
const toDashboard = () =>
  router.push({ name: "admin.license-manager.licenses.dashboard", params: { product: productCode.value } });

const form = ref(licenseToForm(null));
const loading = ref(false);
const error = ref("");
const errors = ref({});
// Set once the server has generated the key; swaps the form for the key panel.
const created = ref(null);

const submit = async () => {
  error.value = "";
  errors.value = validateLicenseForm(form.value);
  if (Object.keys(errors.value).length) {
    error.value = "Please fix the highlighted fields.";
    return;
  }

  loading.value = true;
  try {
    created.value = await store.createLicense(form.value);
    // Start the License PDF download(s) right away (a failure is shown, the
    // buttons below stay available). "Mac + iPad" makes two keys.
    if (can("license-manager-view")) createdKeys.value.forEach((license) => downloadPdf(license));
  } catch (err) {
    errors.value = validationErrors(err);
    error.value = errorMessage(err, "Failed to create license.");
  } finally {
    loading.value = false;
  }
};

// The created license plus, for "Mac + iPad", the other key of the bundle.
const createdKeys = computed(() =>
  created.value
    ? [
        { id: created.value.id, key: created.value.key, platform: created.value.platform, platform_label: created.value.platform_label },
        ...(created.value.bundle || []),
      ]
    : []
);

const downloading = ref(null);
const downloadError = ref("");
const downloadPdf = async (license) => {
  if (!license) return;
  downloading.value = license.id;
  downloadError.value = "";
  try {
    await store.downloadCertificate(license.id, `${productName.value}-License-${license.key}.pdf`);
  } catch (err) {
    downloadError.value = errorMessage(err, "The license PDF could not be downloaded.");
  } finally {
    downloading.value = null;
  }
};

const createAnother = () => {
  created.value = null;
  form.value = licenseToForm(null);
  errors.value = {};
};
</script>

<template>
  <div class="w-full">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <!-- Generated key -->
      <div v-if="created" class="space-y-5">
        <div class="bg-white border border-[#DCDEDD] rounded-[16px] px-5 py-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            @click="toDashboard"
            class="bg-white w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-violet-400 transition-all"
            aria-label="Back"
          >
            <ArrowLeft class="w-5 h-5 text-gray-600" />
          </button>
          <ProductIcon :product="product" :size="40" />
          <div>
            <h1 class="text-brand-dark text-xl font-bold">Create {{ productName }} License</h1>
            <p class="text-brand-light text-sm">The license key has been generated</p>
          </div>
        </div>

        <div class="relative overflow-hidden bg-gradient-to-br from-[#1e1147] via-[#150c33] to-[#0f0a24] rounded-[16px] px-5 py-10 sm:py-14">
          <div class="absolute -top-16 -right-16 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-20 -left-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div class="relative z-10 flex flex-col items-center text-center">
            <div class="w-14 h-14 rounded-full bg-emerald-400/15 flex items-center justify-center mb-4">
              <CheckCircle2 class="w-8 h-8 text-emerald-400" />
            </div>
            <p class="text-white text-lg font-bold">License created for {{ created.licensee_name }}</p>
            <div class="flex flex-wrap items-center justify-center gap-2 mt-2 mb-8">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white">{{ productName }}</span>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full" :class="planChipClass(created.plan, true)">
                {{ planLabel(created) }} &middot; {{ categoryLabel(created) }}
              </span>
            </div>

            <div v-for="license in createdKeys" :key="license.id" class="flex flex-col items-center max-w-full mb-5 last:mb-0">
              <p class="text-violet-200 text-xs font-semibold uppercase tracking-wider mb-3">
                {{ createdKeys.length > 1 ? `${license.platform_label} License Key` : "License Key" }}
              </p>
              <div class="flex items-center gap-3 bg-white rounded-[16px] pl-5 pr-3 py-4 shadow-lg max-w-full">
                <span class="font-mono text-xl sm:text-3xl lg:text-4xl font-bold tracking-wider text-brand-dark break-all select-all">
                  {{ license.key }}
                </span>
                <CopyKeyButton :value="license.key" size="md" />
              </div>
            </div>

            <p class="text-violet-200/80 text-sm mt-5 max-w-xl">
              <template v-if="createdKeys.length > 1">
                Send both keys to the licensee: the Mac key activates {{ productName }} {{ planLabel(created) }} on a Mac, the iPad key on an iPad.
              </template>
              <template v-else>
                Send this key to the licensee to activate {{ productName }} {{ planLabel(created) }} on {{ created.platform_label || "Mac" }}.
              </template>
              <template v-if="created.type === 'term' && created.expires_at">
                Valid until {{ formatDate(created.expires_at) }}.
              </template>
              <template v-else>Lifetime license, never expires.</template>
              Up to {{ created.max_devices }} device(s){{ createdKeys.length > 1 ? " per key" : "" }}.
            </p>

            <div v-if="can('license-manager-view')" class="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                v-for="license in createdKeys"
                :key="license.id"
                type="button"
                @click="downloadPdf(license)"
                :disabled="downloading === license.id"
                class="w-full sm:w-auto rounded-[14px] bg-[#F2821F] hover:brightness-110 transition-all px-8 py-4 flex items-center justify-center gap-2.5 text-white text-base font-bold shadow-lg disabled:opacity-60"
              >
                <FileDown class="w-5 h-5" />
                {{
                  downloading === license.id
                    ? "Preparing PDF..."
                    : createdKeys.length > 1
                      ? `Download ${license.platform_label} PDF`
                      : "Download License PDF"
                }}
              </button>
            </div>
            <p v-if="downloadError" class="text-red-300 text-xs mt-2">{{ downloadError }}</p>

            <div class="flex flex-col sm:flex-row gap-3 mt-5 w-full sm:w-auto">
              <button
                type="button"
                @click="createAnother"
                class="w-full sm:w-auto border border-white/25 bg-white/5 rounded-[12px] hover:bg-white/10 transition-all duration-300 px-6 py-3 text-white font-semibold flex items-center justify-center gap-2"
              >
                <Plus class="w-4 h-4" /> Create Another
              </button>
              <button
                v-if="can('license-manager-view')"
                type="button"
                @click="router.push({ name: 'admin.license-manager.licenses.detail', params: { product: productCode, id: created.id } })"
                class="w-full sm:w-auto rounded-[12px] bg-white hover:bg-violet-50 transition-all duration-300 px-6 py-3 flex items-center justify-center gap-2 text-violet-700 font-semibold"
              >
                <Eye class="w-4 h-4" /> View License
              </button>
            </div>
          </div>
        </div>
      </div>

      <LicenseForm
        v-else
        v-model="form"
        :loading="loading"
        :errors="errors"
        :product="product"
        :title="`Create ${productName} License`"
        subtitle="The license key is generated automatically"
        submit-label="Create License"
        @submit="submit"
        @cancel="toDashboard"
      >
        <template #alerts>
          <Transition name="fade">
            <div v-if="error" class="mb-5">
              <Alert type="danger" :title="error" message="" :show="!!error" @close="error = ''" />
            </div>
          </Transition>
        </template>
      </LicenseForm>
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
