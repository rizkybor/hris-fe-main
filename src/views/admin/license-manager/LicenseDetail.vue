<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  User,
  Mail,
  CalendarClock,
  MonitorSmartphone,
  Clock,
  FileText,
  Unplug,
  Laptop,
  Tablet,
  BadgeCheck,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  GraduationCap,
  Building2,
  Users,
  Link2,
  Receipt,
  Contact,
  IdCard,
  Activity,
  FileDown,
  Hash,
  ScrollText,
  ArrowRight,
  MessageCircle,
  KeyRound,
  Share2,
} from "lucide-vue-next";
import ShareLicenseModal from "@/components/admin/license-manager/ShareLicenseModal.vue";
import LicensePeriodCard from "@/components/admin/license-manager/LicensePeriodCard.vue";
import LicenseTrackingTimeline from "@/components/admin/license-manager/LicenseTrackingTimeline.vue";
import Alert from "@/components/common/Alert.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import LicenseProductGate from "@/components/admin/license-manager/LicenseProductGate.vue";
import { useLicenseProduct, onProductReady } from "@/components/admin/license-manager/useLicenseProduct";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import CopyKeyButton from "@/components/admin/license-manager/CopyKeyButton.vue";
import LicenseStatusSwitch from "@/components/admin/license-manager/LicenseStatusSwitch.vue";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import {
  formatDate,
  formatDateTime,
  isExpired,
  platformLabel,
  relativeTime,
  organizationTypeLabel,
  planLabel,
  planChipClass,
  licensePlatformLabel,
  platformChipClass,
  categoryLabel,
  planCategory,
  KEY_STATUS,
  certificateKeyOptions,
} from "@/components/admin/license-manager/licenseHelpers";

const route = useRoute();
const router = useRouter();
const store = useLicenseManagerStore();
const { code: productCode, product, productName, state: productState } = useLicenseProduct();
const toDashboard = () =>
  router.push({ name: "admin.license-manager.licenses.dashboard", params: { product: productCode.value } });
const alertModal = useAlertModalStore();

const loading = ref(true);
const error = ref("");
const success = ref("");
const toggling = ref(false);
const releasingId = ref(null);

const license = computed(() => store.currentLicense);
const activations = computed(() => license.value?.activations || []);
const devicesUsed = computed(() => license.value?.devices_used ?? activations.value.length);
const expired = computed(() => isExpired(license.value));
const isOrganization = computed(() => planCategory(license.value) === "organization");
const timeline = ref(null);

// Detail groups, the same as the form: Individual = Licensee + Location;
// Organization = Organization + Contact person + Address.
const detailGroups = computed(() => {
  const l = license.value;
  if (!l) return [];
  if (isOrganization.value) {
    return [
      {
        title: "Organization",
        icon: Building2,
        items: [
          { label: "Organization Name", value: l.licensee_name, icon: Building2 },
          { label: "Type", value: l.organization_type_label || organizationTypeLabel(l.organization_type), icon: Users },
          { label: "Member Count", value: l.member_count, icon: Users },
          { label: "Website", value: l.website, icon: Link2, href: l.website },
          { label: "Tax ID (NPWP)", value: l.tax_id, icon: Receipt },
        ],
      },
      {
        title: "Contact Person",
        icon: Contact,
        items: [
          { label: "Name", value: l.contact_name, icon: User },
          { label: "Position", value: l.contact_position, icon: Briefcase },
          { label: "Email", value: l.licensee_email, icon: Mail, href: l.licensee_email && `mailto:${l.licensee_email}` },
          { label: "Phone / WhatsApp", value: l.phone, icon: Phone, href: l.phone && `tel:${l.phone.replace(/[^0-9+]/g, "")}` },
        ],
      },
      {
        title: "Address",
        icon: MapPin,
        items: locationItems(l),
      },
    ];
  }
  return [
    {
      title: "Licensee",
      icon: IdCard,
      items: [
        { label: "Full Name", value: l.licensee_name, icon: User },
        { label: "Email", value: l.licensee_email, icon: Mail, href: l.licensee_email && `mailto:${l.licensee_email}` },
        { label: "Phone / WhatsApp", value: l.phone, icon: Phone, href: l.phone && `tel:${l.phone.replace(/[^0-9+]/g, "")}` },
        { label: "Occupation", value: l.occupation, icon: Briefcase },
        { label: "Affiliation", value: l.affiliation, icon: GraduationCap },
      ],
    },
    {
      title: "Location",
      icon: MapPin,
      items: locationItems(l),
    },
  ];
});

// Location rows: the full one-line address first, then the parts.
const locationItems = (l) => [
  { label: "Full Address", value: l.full_address, icon: MapPin, wide: true },
  { label: "Street Address", value: l.address, icon: MapPin, wide: true },
  { label: "Village (Kelurahan / Desa)", value: l.village, icon: MapPin },
  { label: "District (Kecamatan)", value: l.district, icon: MapPin },
  { label: "City / Regency", value: l.regency, icon: MapPin },
  { label: "Province", value: l.province, icon: MapPin },
  { label: "Postal Code", value: l.postal_code, icon: MapPin },
  { label: "Country", value: l.country, icon: Globe },
];

// LIC-OCCA-MAC-0001 / LIC-OCCA-IPAD-0001, the same reference as on the
// certificate (Mac and iPad number their licenses separately).
const reference = computed(() => {
  const l = license.value;
  if (!l) return "-";
  const code = String(l.product?.code || productCode.value || "").toUpperCase();
  const platform = String(l.platform || "mac").toUpperCase();
  return `LIC-${code}-${platform}-${String(l.sequence ?? l.id).padStart(4, "0")}`;
});

// Share the certificate by email (PDF attached) or WhatsApp (7-day link).
const shareTab = ref(null);
// One key per device: the certificate of the whole license (null) or of
// one key, for Download / Email / WhatsApp.
const certKeyOptions = computed(() => certificateKeyOptions(license.value));
const certKeyId = ref(null);
const certKey = computed(() => certKeyOptions.value.find((k) => k.id === certKeyId.value) || null);
const certKeyLabel = (k) =>
  `${license.value?.bundle?.length ? `${k.platform_label} ` : ""}Key ${k.position} · ${k.key}${k.status === "in_use" ? " (in use)" : ""}`;
const shareKeyId = ref(null);
const openShare = (tab, keyId = certKeyId.value) => {
  shareKeyId.value = keyId;
  shareTab.value = tab;
};
const onShared = () => timeline.value?.reload();

// Key card: status as a dot + word, the rest as one neutral line.
const keyStatus = computed(() => {
  if (expired.value) return { label: "Expired", dot: "bg-red-500", text: "text-red-600" };
  return license.value?.is_active
    ? { label: "Active", dot: "bg-emerald-500", text: "text-emerald-700" }
    : { label: "Inactive", dot: "bg-gray-400", text: "text-gray-500" };
});
const keyMeta = computed(() => {
  const l = license.value;
  if (!l) return "";
  const parts = [l.product?.name || productName.value, licensePlatformLabel(l), planLabel(l)];
  if (categoryLabel(l) !== planLabel(l)) parts.push(categoryLabel(l));
  return parts.filter(Boolean).join(" · ");
});

// One key per device: every key with its status (available / in use on a
// device / used: its device was released, the key never works again).
const perDevice = computed(() => license.value?.key_mode === "per_device");
const deviceKeys = computed(() => license.value?.keys || []);
const keysSummary = computed(() => {
  const s = license.value?.keys_summary;
  if (s) return s;
  const keys = deviceKeys.value;
  return {
    total: keys.length,
    available: keys.filter((k) => k.status === "available").length,
    in_use: keys.filter((k) => k.status === "in_use").length,
    used: keys.filter((k) => k.status === "used").length,
  };
});
const keyFilter = ref("all");
const keyFilters = computed(() => [
  { value: "all", label: "All", count: keysSummary.value.total },
  { value: "available", label: "Available", count: keysSummary.value.available },
  { value: "in_use", label: "In use", count: keysSummary.value.in_use },
  { value: "used", label: "Used", count: keysSummary.value.used },
]);
const filteredKeys = computed(() =>
  keyFilter.value === "all" ? deviceKeys.value : deviceKeys.value.filter((k) => k.status === keyFilter.value)
);
const keyOfActivation = (activation) => deviceKeys.value.find((k) => k.id === activation.license_key_id) || null;
const keyStatusOf = (key) => KEY_STATUS[key.status] || KEY_STATUS.available;
const segmentWidth = (count) => (keysSummary.value.total ? `${(count / keysSummary.value.total) * 100}%` : "0%");

const downloading = ref(false);
const downloadingKeyId = ref(null);
const downloadPdf = async (key = certKey.value) => {
  downloading.value = true;
  downloadingKeyId.value = key?.id ?? null;
  error.value = "";
  try {
    // A Mac + iPad bundle shares one PDF with both keys (Mac first); one
    // key gets a certificate of its own.
    const keys = key
      ? key.key
      : [license.value, ...(license.value.bundle || [])]
          .sort((a, b) => (a.platform === "mac" ? -1 : b.platform === "mac" ? 1 : 0))
          .map((l) => l.key)
          .join("_");
    await store.downloadCertificate(license.value.id, `${productName.value}-License-${keys}.pdf`, key?.id ?? null);
    timeline.value?.reload();
  } catch (err) {
    error.value = errorMessage(err, "Failed to download the license PDF.");
  } finally {
    downloading.value = false;
    downloadingKeyId.value = null;
  }
};

const flash = (message) => {
  success.value = message;
  setTimeout(() => {
    if (success.value === message) success.value = "";
  }, 3000);
};

onProductReady(
  productState,
  async () => {
    loading.value = true;
    error.value = "";
    try {
      await store.fetchLicense(route.params.id);
    } catch (err) {
      store.currentLicense = null;
      error.value = errorMessage(err, "License not found.");
    } finally {
      loading.value = false;
    }
  },
  () => `${productCode.value}/${route.params.id}`
);

const toggleActive = async (value) => {
  toggling.value = true;
  error.value = "";
  try {
    await store.setActive(license.value.id, value);
    flash(`License ${value ? "activated" : "deactivated"}.`);
    timeline.value?.reload();
  } catch (err) {
    error.value = errorMessage(err, "Failed to update license status.");
  } finally {
    toggling.value = false;
  }
};

const releaseDevice = async (activation) => {
  const ok = await alertModal.confirm(
    perDevice.value
      ? `Release "${activation.device_name || activation.device_id}"? The device will be signed out and the key it used can never be used again; another device can use one of the remaining keys.`
      : `Release "${activation.device_name || activation.device_id}"? The device will be signed out of this license and the slot becomes free for another device.`,
    { title: "Release Device", type: "warning", confirmText: "Release" }
  );
  if (!ok) return;

  releasingId.value = activation.id;
  try {
    await store.releaseActivation(license.value.id, activation.id);
    flash("Device released.");
    timeline.value?.reload();
  } catch (err) {
    error.value = errorMessage(err, "Failed to release device.");
  } finally {
    releasingId.value = null;
  }
};

const handleDelete = async () => {
  const ok = await alertModal.confirm(
    `Delete license ${license.value.key} for "${license.value.licensee_name}"? Devices using it will lose access. This action cannot be undone.`,
    { title: "Delete License", type: "danger", confirmText: "Delete" }
  );
  if (!ok) return;

  try {
    await store.deleteLicense(license.value.id);
    toDashboard();
  } catch (err) {
    error.value = errorMessage(err, "Failed to delete license.");
  }
};

const isMac = (platform) => /mac/i.test(platform || "");
</script>

<template>
  <div class="w-full">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <!-- Header row: back, product icon, title + key, actions -->
      <div class="bg-white border border-[#DCDEDD] rounded-[16px] px-4 py-4 sm:px-5 mb-5">
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            @click="toDashboard"
            class="bg-white w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-violet-400 transition-all shrink-0"
            aria-label="Back"
          >
            <ArrowLeft class="w-5 h-5 text-gray-600" />
          </button>
          <ProductIcon :product="product" :size="40" />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-violet-600">
              <RouterLink :to="{ name: 'admin.license-manager.licenses.dashboard', params: { product: productCode } }" class="hover:underline">
                {{ productName }} &middot; Licenses
              </RouterLink>
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-brand-dark text-xl font-bold truncate">{{ license?.licensee_name || "License Detail" }}</h1>
              <span v-if="license" class="inline-flex items-center gap-1.5 bg-slate-50 border border-[#DCDEDD] rounded-[10px] pl-3 pr-1 py-0.5">
                <span class="font-mono text-xs font-bold tracking-wider text-brand-dark">{{ license.key }}</span>
                <CopyKeyButton :value="license.key" />
              </span>
            </div>
            <p class="text-brand-light text-sm flex items-center gap-1.5">
              <Activity class="w-3.5 h-3.5" />
              <template v-if="license?.last_activity_at">
                Last activity
                <span class="font-semibold text-brand-dark" :title="formatDateTime(license.last_activity_at)">
                  {{ relativeTime(license.last_activity_at) }}
                </span>
              </template>
              <template v-else>No activity from the app yet</template>
            </p>
          </div>

          <div v-if="license" class="flex flex-wrap items-center gap-2">
            <button
              v-if="can('license-manager-delete')"
              type="button"
              @click="handleDelete"
              class="rounded-[12px] border border-[#DCDEDD] bg-white hover:border-red-500 hover:bg-red-50 transition-all px-4 py-2.5 flex items-center gap-2 group"
            >
              <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
              <span class="text-sm font-semibold text-brand-dark group-hover:text-red-600">Delete</span>
            </button>
            <button
              v-if="can('license-manager-edit')"
              type="button"
              @click="router.push({ name: 'admin.license-manager.licenses.edit', params: { product: productCode, id: license.id } })"
              class="btn-primary rounded-[12px] border border-violet-800 hover:brightness-110 focus:ring-2 focus:ring-violet-500 transition-all duration-300 bg-gradient-to-r from-violet-600 to-indigo-700 shadow-[inset_-2px_2px_1px_0_rgba(167,139,250,0.55),inset_2px_2px_1px_0_rgba(167,139,250,0.35)] px-4 py-2.5 flex items-center gap-2"
            >
              <Pencil class="w-4 h-4 text-white" />
              <span class="text-brand-white font-semibold text-sm">Edit</span>
            </button>
          </div>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="success" class="mb-5"><Alert type="success" :title="success" message="" :show="!!success" @close="success = ''" /></div>
      </Transition>
      <Transition name="fade">
        <div v-if="error" class="mb-5"><Alert type="danger" :title="error" message="" :show="!!error" @close="error = ''" /></div>
      </Transition>

      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div class="lg:col-span-8 space-y-5">
          <Skeleton height="150px" rounded="16px" />
          <Skeleton height="220px" rounded="16px" />
        </div>
        <div class="lg:col-span-4"><Skeleton height="360px" rounded="16px" /></div>
      </div>

      <div v-else-if="license" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <!-- ===================== Left: 8 columns ===================== -->
        <div class="lg:col-span-8 space-y-5 min-w-0">
          <!-- Key: a plain card -- label + status, the key, one quiet meta line -->
          <div class="bg-white border border-[#DCDEDD] rounded-[16px] p-5 sm:p-6">
            <div class="flex items-center justify-between gap-3 mb-2.5">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-brand-light">
                License key<template v-if="perDevice && keysSummary.total"> &middot; key 1 of {{ keysSummary.total }}</template>
              </p>
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold" :class="keyStatus.text">
                <span class="w-1.5 h-1.5 rounded-full" :class="keyStatus.dot"></span>
                {{ keyStatus.label }}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-mono text-lg sm:text-2xl font-bold tracking-wider text-brand-dark break-all flex-1 select-all">
                {{ license.key }}
              </span>
              <CopyKeyButton :value="license.key" size="md" />
            </div>
            <p class="text-xs text-brand-light mt-3">
              {{ keyMeta }}<template v-if="license.key_mode_label"> &middot; {{ license.key_mode_label }}</template>
            </p>
          </div>

          <!-- Device keys: one per device, with which ones are taken -->
          <div v-if="perDevice" class="bg-white border border-[#DCDEDD] rounded-[16px] p-5 sm:p-6">
            <div class="flex flex-wrap items-center gap-2.5 mb-4">
              <div class="w-9 h-9 bg-violet-50 rounded-[10px] flex items-center justify-center shrink-0">
                <KeyRound class="w-[18px] h-[18px] text-violet-600" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-brand-dark font-bold">Device keys</h4>
                <p class="text-xs text-brand-light">One key per device. A key whose device was released can't be used again.</p>
              </div>
              <span class="text-sm font-semibold text-brand-dark tabular-nums">
                {{ keysSummary.in_use + keysSummary.used }} / {{ keysSummary.total }} used
              </span>
            </div>

            <!-- Usage bar: in use, used, available -->
            <div class="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 gap-[2px] mb-2">
              <div class="bg-blue-500" :style="{ width: segmentWidth(keysSummary.in_use) }"></div>
              <div class="bg-gray-400" :style="{ width: segmentWidth(keysSummary.used) }"></div>
              <div class="bg-emerald-400" :style="{ width: segmentWidth(keysSummary.available) }"></div>
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-light mb-4">
              <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-blue-500"></span> In use <b class="text-brand-dark tabular-nums">{{ keysSummary.in_use }}</b></span>
              <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-gray-400"></span> Used <b class="text-brand-dark tabular-nums">{{ keysSummary.used }}</b></span>
              <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> Available <b class="text-brand-dark tabular-nums">{{ keysSummary.available }}</b></span>
            </div>

            <div class="inline-flex flex-wrap p-1 bg-slate-100 border border-[#DCDEDD] rounded-[12px] mb-3" role="tablist" aria-label="Filter keys">
              <button
                v-for="f in keyFilters"
                :key="f.value"
                type="button"
                role="tab"
                :aria-selected="keyFilter === f.value"
                @click="keyFilter = f.value"
                class="px-3 py-1.5 rounded-[9px] text-xs font-semibold transition-all"
                :class="keyFilter === f.value ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-200' : 'text-brand-light hover:text-brand-dark'"
              >
                {{ f.label }} <span class="tabular-nums opacity-70">{{ f.count }}</span>
              </button>
            </div>

            <div class="overflow-x-auto -mx-1">
              <table class="w-full text-sm min-w-[640px]">
                <thead>
                  <tr class="text-left text-[11px] uppercase tracking-wider text-brand-light border-b border-[#DCDEDD]">
                    <th class="font-semibold py-2 px-1 w-10">#</th>
                    <th class="font-semibold py-2 px-1">Key</th>
                    <th class="font-semibold py-2 px-1">Status</th>
                    <th class="font-semibold py-2 px-1">Device</th>
                    <th v-if="can('license-manager-view')" class="font-semibold py-2 px-1 text-right">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="key in filteredKeys" :key="key.id" class="border-b border-[#F1F1F1] last:border-0 align-top">
                    <td class="py-2.5 px-1 text-brand-light tabular-nums">{{ key.position }}</td>
                    <td class="py-2.5 px-1">
                      <span class="inline-flex items-center gap-1">
                        <span
                          class="font-mono text-xs font-bold tracking-wider"
                          :class="key.status === 'used' ? 'text-gray-400 line-through' : 'text-brand-dark'"
                        >{{ key.key }}</span>
                        <CopyKeyButton v-if="key.status !== 'used'" :value="key.key" />
                      </span>
                    </td>
                    <td class="py-2.5 px-1 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" :class="keyStatusOf(key).chip">
                        <span class="w-1.5 h-1.5 rounded-full" :class="keyStatusOf(key).dot"></span>
                        {{ keyStatusOf(key).label }}
                      </span>
                    </td>
                    <td class="py-2.5 px-1 min-w-0">
                      <template v-if="key.device_id || key.device_name">
                        <p class="text-xs font-semibold text-brand-dark truncate max-w-[220px]" :title="key.device_id">
                          <template v-if="key.status === 'used'">was </template>{{ key.device_name || "Unnamed device" }}
                        </p>
                        <p class="text-[11px] text-brand-light">
                          <template v-if="key.platform">{{ platformLabel(key.platform) }} &middot; </template>
                          <template v-if="key.status === 'used' && key.used_at">released {{ formatDate(key.used_at) }}</template>
                          <template v-else-if="key.activated_at">since {{ formatDate(key.activated_at) }}</template>
                        </p>
                      </template>
                      <span v-else class="text-xs text-gray-300">—</span>
                    </td>
                    <td v-if="can('license-manager-view')" class="py-2 px-1 text-right whitespace-nowrap">
                      <template v-if="key.status !== 'used'">
                        <button
                          type="button"
                          @click="downloadPdf(certKeyOptions.find((k) => k.id === key.id))"
                          :disabled="downloading"
                          class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#DCDEDD] hover:border-[#F2821F] hover:bg-orange-50 transition-all disabled:opacity-50"
                          :title="`Download the certificate of key ${key.position}`"
                          :aria-label="`Download the certificate of key ${key.position}`"
                        >
                          <FileDown class="w-4 h-4" :class="downloadingKeyId === key.id ? 'text-[#F2821F] animate-pulse' : 'text-gray-600'" />
                        </button>
                        <button
                          type="button"
                          @click="openShare('email', key.id)"
                          class="inline-flex items-center justify-center w-8 h-8 ml-1 rounded-lg border border-[#DCDEDD] hover:border-violet-400 hover:bg-violet-50 transition-all"
                          :title="`Share the certificate of key ${key.position}`"
                          :aria-label="`Share the certificate of key ${key.position}`"
                        >
                          <Share2 class="w-4 h-4 text-gray-600" />
                        </button>
                      </template>
                      <span v-else class="text-[11px] text-gray-300" title="A used key gets no certificate">—</span>
                    </td>
                  </tr>
                  <tr v-if="!filteredKeys.length">
                    <td :colspan="can('license-manager-view') ? 5 : 4" class="py-6 text-center text-xs text-brand-light">No {{ keyFilter === "in_use" ? "keys in use" : `${keyFilter} keys` }}.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Active period -->
          <LicensePeriodCard :license="license" />

          <!-- Licensee / Organization / Contact / Location, grouped like the form -->
          <div v-for="group in detailGroups" :key="group.title" class="bg-white border border-[#DCDEDD] rounded-[16px] p-5 sm:p-6">
            <div class="flex items-center gap-2.5 mb-5">
              <div class="w-9 h-9 bg-violet-50 rounded-[10px] flex items-center justify-center shrink-0">
                <component :is="group.icon" class="w-[18px] h-[18px] text-violet-600" />
              </div>
              <h4 class="text-brand-dark font-bold">{{ group.title }}</h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div v-for="item in group.items" :key="item.label" class="flex items-start gap-3" :class="{ 'md:col-span-2': item.wide }">
                <component :is="item.icon" class="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-gray-500">{{ item.label }}</p>
                  <a
                    v-if="item.href && item.value"
                    :href="item.href"
                    target="_blank"
                    rel="noopener"
                    class="text-sm font-semibold text-violet-700 hover:underline break-all"
                  >{{ item.value }}</a>
                  <p v-else class="text-sm font-semibold text-brand-dark break-words whitespace-pre-line">{{ item.value === null || item.value === undefined || item.value === "" ? "-" : item.value }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tracking -->
          <LicenseTrackingTimeline ref="timeline" :license-id="license.id" />
        </div>

        <!-- ===================== Right: 4 columns, sticky ===================== -->
        <aside class="lg:col-span-4 lg:sticky lg:top-3 space-y-5 min-w-0">
          <!-- License terms -->
          <div class="bg-white border border-[#DCDEDD] rounded-[16px] overflow-hidden">
            <div class="flex items-center gap-2.5 px-5 py-4 border-b border-[#DCDEDD] bg-gradient-to-br from-violet-50 to-white">
              <BadgeCheck class="w-[18px] h-[18px] text-violet-600" />
              <h4 class="text-brand-dark font-bold">License</h4>
            </div>
            <dl class="px-5 py-4 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-brand-light">Platform</dt>
                <dd>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="platformChipClass(license.platform)">{{ licensePlatformLabel(license) }}</span>
                </dd>
              </div>
              <!-- Mac + iPad generated together: the other key of the bundle -->
              <div v-for="sibling in license.bundle || []" :key="sibling.id" class="flex items-start justify-between gap-3">
                <dt class="text-brand-light shrink-0">Paired {{ sibling.platform_label }} key</dt>
                <dd class="text-right min-w-0">
                  <router-link
                    :to="{ name: 'admin.license-manager.licenses.detail', params: { product: productCode, id: sibling.id } }"
                    class="font-mono text-xs font-semibold text-violet-700 hover:underline break-all"
                  >
                    {{ sibling.key }}
                  </router-link>
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-brand-light">Plan</dt>
                <dd class="flex items-center gap-1.5">
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="planChipClass(license.plan)">{{ planLabel(license) }}</span>
                  <span v-if="categoryLabel(license) !== planLabel(license)" class="text-xs text-brand-light">{{ categoryLabel(license) }}</span>
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-brand-light">Type</dt>
                <dd class="font-semibold text-brand-dark">{{ license.type === "lifetime" ? "Lifetime" : "Term" }}</dd>
              </div>
              <div v-if="license.updates_label" class="flex items-start justify-between gap-3">
                <dt class="text-brand-light shrink-0">Updates</dt>
                <dd class="font-semibold text-brand-dark text-right">{{ license.updates_label }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-brand-light">Max devices</dt>
                <dd class="font-semibold text-brand-dark tabular-nums">{{ devicesUsed }} / {{ license.max_devices }} used</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-brand-light flex items-center gap-1.5"><KeyRound class="w-4 h-4" /> Keys</dt>
                <dd class="font-semibold text-brand-dark text-right">
                  <template v-if="perDevice">{{ keysSummary.total }} &middot; {{ keysSummary.available }} available</template>
                  <template v-else>One shared key</template>
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-brand-light flex items-center gap-1.5"><ScrollText class="w-4 h-4" /> Terms</dt>
                <dd class="font-semibold text-brand-dark">{{ license.terms_version ? `v${license.terms_version}` : "—" }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-brand-light flex items-center gap-1.5"><Hash class="w-4 h-4" /> Reference</dt>
                <dd class="font-mono text-xs font-semibold text-brand-dark">{{ reference }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-brand-light">Last activated</dt>
                <dd class="text-brand-dark text-right">{{ license.last_activated_at ? formatDateTime(license.last_activated_at) : "Never" }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-brand-light">Created</dt>
                <dd class="text-brand-dark text-right">{{ formatDateTime(license.created_at) }}</dd>
              </div>
              <div class="pt-3 border-t border-[#F1F1F1]">
                <dt class="text-brand-light flex items-center gap-1.5 mb-1"><FileText class="w-4 h-4" /> Notes</dt>
                <dd class="text-brand-dark whitespace-pre-line break-words">{{ license.notes || "—" }}</dd>
              </div>
              <div v-if="can('license-manager-edit')" class="flex items-center justify-between gap-4 pt-3 border-t border-[#F1F1F1]">
                <dt class="font-semibold text-brand-dark">License status</dt>
                <dd><LicenseStatusSwitch :model-value="!!license.is_active" :disabled="toggling" @update:model-value="toggleActive" /></dd>
              </div>
            </dl>
            <div v-if="can('license-manager-view')" class="px-5 pb-5">
              <div v-if="certKeyOptions.length" class="mb-3">
                <label for="cert-key" class="text-[11px] font-semibold uppercase tracking-wider text-brand-light mb-1.5 block">Certificate for</label>
                <select
                  id="cert-key"
                  v-model="certKeyId"
                  class="w-full px-3 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm font-semibold text-brand-dark bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                >
                  <option :value="null">Licensee · all keys</option>
                  <option v-for="k in certKeyOptions" :key="k.id" :value="k.id">{{ certKeyLabel(k) }}</option>
                </select>
                <p class="text-[11px] text-brand-light mt-1">
                  {{ certKey ? "A certificate with only this key, e.g. for the member who uses it." : "One certificate with every key, for the licensee." }}
                </p>
              </div>
              <button
                type="button"
                @click="downloadPdf()"
                :disabled="downloading"
                class="w-full rounded-[12px] bg-[#F2821F] hover:brightness-110 transition-all px-4 py-3 flex items-center justify-center gap-2 text-white text-sm font-bold disabled:opacity-60"
              >
                <FileDown class="w-4 h-4" />
                {{ downloading && downloadingKeyId === (certKey?.id ?? null) ? "Preparing PDF..." : certKey ? `Download Key ${certKey.position} PDF` : "Download License PDF" }}
              </button>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-brand-light mt-3 mb-1.5">Share certificate</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="openShare('email')"
                  class="rounded-[12px] border border-[#DCDEDD] hover:border-[#0C51D9] transition-all px-3 py-2.5 flex items-center justify-center gap-2 text-brand-dark text-xs font-semibold whitespace-nowrap"
                  title="Share the certificate by email"
                >
                  <Mail class="w-4 h-4 text-[#0C51D9]" /> Email
                </button>
                <button
                  type="button"
                  @click="openShare('whatsapp')"
                  class="rounded-[12px] border border-[#DCDEDD] hover:border-[#25D366] transition-all px-3 py-2.5 flex items-center justify-center gap-2 text-brand-dark text-xs font-semibold whitespace-nowrap"
                  title="Share the certificate via WhatsApp"
                >
                  <MessageCircle class="w-4 h-4 text-[#25D366]" /> WhatsApp
                </button>
              </div>
            </div>
          </div>

          <!-- Devices -->
          <div class="bg-white border border-[#DCDEDD] rounded-[16px] p-5">
            <div class="flex items-center gap-2.5 mb-4">
              <MonitorSmartphone class="w-[18px] h-[18px] text-violet-600" />
              <h4 class="text-brand-dark font-bold flex-1">Devices</h4>
              <span class="text-xs font-semibold text-brand-light tabular-nums">{{ activations.length }} / {{ license.max_devices }}</span>
            </div>

            <ul v-if="activations.length" class="space-y-2.5">
              <li v-for="activation in activations" :key="activation.id" class="border border-[#DCDEDD] rounded-[12px] p-3">
                <div class="flex items-start gap-2.5">
                  <Laptop v-if="isMac(activation.platform)" class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <Tablet v-else class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-sm text-brand-dark truncate">{{ activation.device_name || "Unnamed device" }}</p>
                    <p v-if="keyOfActivation(activation)" class="font-mono text-[10px] font-semibold text-violet-700 truncate">
                      Key {{ keyOfActivation(activation).position }} &middot; {{ keyOfActivation(activation).key }}
                    </p>
                    <p class="text-xs text-brand-light">
                      {{ platformLabel(activation.platform) }}<template v-if="activation.app_version"> &middot; v{{ activation.app_version }}</template>
                    </p>
                    <p class="font-mono text-[10px] text-gray-400 truncate" :title="activation.device_id">{{ activation.device_id }}</p>
                    <p class="text-[11px] text-brand-light mt-1" :title="formatDateTime(activation.last_seen_at)">
                      Seen <span class="font-semibold text-brand-dark">{{ relativeTime(activation.last_seen_at) }}</span>
                      &middot; since {{ formatDate(activation.activated_at) }}
                    </p>
                  </div>
                </div>
                <button
                  v-if="can('license-manager-edit')"
                  type="button"
                  @click="releaseDevice(activation)"
                  :disabled="releasingId === activation.id"
                  class="mt-2.5 w-full flex items-center justify-center gap-1.5 border border-[#DCDEDD] rounded-lg px-3 py-1.5 hover:border-amber-500 hover:bg-amber-50 transition-all disabled:opacity-50 group"
                >
                  <Unplug class="w-4 h-4 text-gray-600 group-hover:text-amber-600" />
                  <span class="text-xs font-semibold text-brand-dark">{{ releasingId === activation.id ? "Releasing..." : "Release device" }}</span>
                </button>
              </li>
            </ul>
            <div v-else class="text-center py-8 rounded-[12px] border border-dashed border-[#DCDEDD]">
              <MonitorSmartphone class="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p class="text-sm font-semibold text-brand-dark">No devices yet</p>
              <p class="text-xs text-brand-light px-4">Devices appear here once {{ perDevice ? "a key" : "the key" }} is entered in {{ productName }}.</p>
            </div>
          </div>
        </aside>
      </div>
    </LicenseProductGate>

    <ShareLicenseModal
      v-if="shareTab && license"
      :license="license"
      :product-name="productName"
      :initial-tab="shareTab"
      :initial-key-id="shareKeyId"
      @shared="onShared"
      @close="shareTab = null"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
