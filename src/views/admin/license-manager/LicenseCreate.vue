<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ChevronLeft, CheckCircle2, Eye, Plus, Download } from "lucide-vue-next";
import { UiPageHeader, UiButton } from "@/components/ui";
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
    // Start the License PDF download right away (a failure is shown, the
    // button below stays available). A Mac + iPad bundle has one PDF with
    // both keys.
    if (can("license-manager-view")) downloadPdf();
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
        { id: created.value.id, key: created.value.key, platform: created.value.platform, platform_label: created.value.platform_label, keys: created.value.keys },
        ...(created.value.bundle || []),
      ]
    : []
);

// One key per device: keys 2..N under the main key (the first 10; the
// rest are on the detail page and the certificate).
const perDevice = computed(() => created.value?.key_mode === "per_device");
const MAX_SHOWN_KEYS = 10;
const otherKeys = (license) => (license.keys || []).filter((k) => k.position > 1);

const downloading = ref(false);
const downloadError = ref("");
const downloadPdf = async () => {
  if (!created.value) return;
  downloading.value = true;
  downloadError.value = "";
  try {
    const keys = createdKeys.value.map((license) => license.key).join("_");
    await store.downloadCertificate(created.value.id, `${productName.value}-License-${keys}.pdf`);
  } catch (err) {
    downloadError.value = errorMessage(err, "The license PDF could not be downloaded.");
  } finally {
    downloading.value = false;
  }
};

const createAnother = () => {
  created.value = null;
  form.value = licenseToForm(null);
  errors.value = {};
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <!-- Generated key -->
      <div v-if="created" class="space-y-5">
        <UiPageHeader :title="`Create ${productName} License`" subtitle="The license key has been generated" class="ui-anim-fade-up">
          <template #eyebrow>
            <button type="button" @click="toDashboard" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1.5">
              <ChevronLeft class="w-4 h-4" /> {{ productName }} &middot; Licenses
            </button>
          </template>
        </UiPageHeader>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-8 sm:px-8 sm:py-10 ui-anim-fade-up">
          <div class="flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-full bg-ui-ok-soft flex items-center justify-center mb-3">
              <CheckCircle2 class="w-6 h-6 text-ui-ok" />
            </div>
            <p class="text-ui-h1 text-ui-ink">License created for {{ created.licensee_name }}</p>
            <div class="flex flex-wrap items-center justify-center gap-2 mt-2 mb-7">
              <ProductIcon :product="product" :size="20" />
              <span class="text-ui-small text-ui-muted">{{ productName }}</span>
              <span class="text-ui-cap font-medium px-2 py-0.5 rounded-full" :class="planChipClass(created.plan)">
                {{ planLabel(created) }} &middot; {{ categoryLabel(created) }}
              </span>
            </div>

            <div class="w-full max-w-3xl space-y-5">
              <div v-for="license in createdKeys" :key="license.id" class="flex flex-col items-center max-w-full">
                <p class="text-ui-over uppercase text-ui-muted mb-2">
                  {{ createdKeys.length > 1 ? `${license.platform_label} License Key` : "License Key" }}<template v-if="perDevice && license.keys?.length"> &middot; key 1 of {{ license.keys.length }}</template>
                </p>
                <div class="flex items-center gap-3 bg-ui-subtle border border-ui-line rounded-ui-card pl-5 pr-2 py-3 max-w-full">
                  <span class="font-mono text-ui-h1 sm:text-ui-display font-semibold tracking-wider text-ui-ink break-all select-all">
                    {{ license.key }}
                  </span>
                  <CopyKeyButton :value="license.key" size="md" />
                </div>
                <div v-if="perDevice && otherKeys(license).length" class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <div
                    v-for="k in otherKeys(license).slice(0, MAX_SHOWN_KEYS - 1)"
                    :key="k.position"
                    class="flex items-center gap-2 bg-ui-surface border border-ui-line rounded-ui-control pl-3 pr-1 py-1"
                  >
                    <span class="text-ui-cap text-ui-faint tabular-nums w-5 text-left">{{ k.position }}</span>
                    <span class="font-mono text-ui-cap font-medium tracking-wide text-ui-ink flex-1 text-left select-all">{{ k.key }}</span>
                    <CopyKeyButton :value="k.key" class="!border-0" />
                  </div>
                </div>
                <p v-if="perDevice && otherKeys(license).length > MAX_SHOWN_KEYS - 1" class="text-ui-cap text-ui-muted mt-2">
                  + {{ otherKeys(license).length - (MAX_SHOWN_KEYS - 1) }} more keys on the license page and the certificate.
                </p>
              </div>
            </div>

            <p class="text-ui-small text-ui-muted mt-6 max-w-xl">
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
              <template v-if="perDevice">
                {{ created.max_devices }} unique key(s){{ createdKeys.length > 1 ? " per platform" : "" }}, one per device; a released key can't be used again.
              </template>
              <template v-else>Up to {{ created.max_devices }} device(s){{ createdKeys.length > 1 ? " per key" : "" }}.</template>
            </p>

            <UiButton v-if="can('license-manager-view')" size="lg" :icon="Download" :loading="downloading" class="mt-6 w-full sm:w-auto" @click="downloadPdf">
              {{ downloading ? "Preparing PDF..." : createdKeys.length > 1 ? "Download License PDF (Mac + iPad)" : "Download License PDF" }}
            </UiButton>
            <p v-if="downloadError" class="text-ui-cap text-ui-bad mt-2">{{ downloadError }}</p>

            <div class="flex flex-col sm:flex-row gap-2 mt-3 w-full sm:w-auto">
              <UiButton variant="secondary" size="lg" :icon="Plus" class="w-full sm:w-auto" @click="createAnother">Create Another</UiButton>
              <UiButton
                v-if="can('license-manager-view')"
                variant="secondary"
                size="lg"
                :icon="Eye"
                class="w-full sm:w-auto"
                @click="router.push({ name: 'admin.license-manager.licenses.detail', params: { product: productCode, id: created.id } })"
              >
                View License
              </UiButton>
            </div>
          </div>
        </section>
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
          <Transition name="ui-fade">
            <Alert class="!mb-0" v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />
          </Transition>
        </template>
      </LicenseForm>
    </LicenseProductGate>
  </div>
</template>
