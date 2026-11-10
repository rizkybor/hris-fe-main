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

const downloading = ref(false);
const downloadPdf = async () => {
  downloading.value = true;
  error.value = "";
  try {
    // A Mac + iPad bundle shares one PDF with both keys (Mac first).
    const keys = [license.value, ...(license.value.bundle || [])]
      .sort((a, b) => (a.platform === "mac" ? -1 : b.platform === "mac" ? 1 : 0))
      .map((l) => l.key)
      .join("_");
    await store.downloadCertificate(license.value.id, `${productName.value}-License-${keys}.pdf`);
    timeline.value?.reload();
  } catch (err) {
    error.value = errorMessage(err, "Failed to download the license PDF.");
  } finally {
    downloading.value = false;
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
    `Release "${activation.device_name || activation.device_id}"? The device will be signed out of this license and the slot becomes free for another device.`,
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
              <p class="text-[11px] font-semibold uppercase tracking-wider text-brand-light">License key</p>
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
            <p class="text-xs text-brand-light mt-3">{{ keyMeta }}</p>
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
              <button
                type="button"
                @click="downloadPdf"
                :disabled="downloading"
                class="w-full rounded-[12px] bg-[#F2821F] hover:brightness-110 transition-all px-4 py-3 flex items-center justify-center gap-2 text-white text-sm font-bold disabled:opacity-60"
              >
                <FileDown class="w-4 h-4" />
                {{ downloading ? "Preparing PDF..." : "Download License PDF" }}
              </button>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-brand-light mt-3 mb-1.5">Share certificate</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="shareTab = 'email'"
                  class="rounded-[12px] border border-[#DCDEDD] hover:border-[#0C51D9] transition-all px-3 py-2.5 flex items-center justify-center gap-2 text-brand-dark text-xs font-semibold whitespace-nowrap"
                  title="Share the certificate by email"
                >
                  <Mail class="w-4 h-4 text-[#0C51D9]" /> Email
                </button>
                <button
                  type="button"
                  @click="shareTab = 'whatsapp'"
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
              <p class="text-xs text-brand-light px-4">Devices appear here once the key is entered in {{ productName }}.</p>
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
