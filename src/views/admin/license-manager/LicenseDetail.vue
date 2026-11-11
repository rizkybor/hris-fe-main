<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  Pencil,
  Trash2,
  User,
  Mail,
  MonitorSmartphone,
  Unplug,
  Laptop,
  Tablet,
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
  MessageCircle,
  Share2,
  ChevronLeft,
  MoreHorizontal,
  Download,
} from "lucide-vue-next";
import { UiPageHeader, UiButton, UiBadge, UiSelect, UiEmpty } from "@/components/ui";
import ShareLicenseModal from "@/components/admin/license-manager/ShareLicenseModal.vue";
import LicensePeriodCard from "@/components/admin/license-manager/LicensePeriodCard.vue";
import LicenseTrackingTimeline from "@/components/admin/license-manager/LicenseTrackingTimeline.vue";
import Alert from "@/components/common/Alert.vue";
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
  KEY_MODE_OPTIONS,
  certificateKeyOptions,
} from "@/components/admin/license-manager/licenseHelpers";

const { t } = useI18n();
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
// Mac + iPad: the devices of both licenses, each tagged with its license.
const activations = computed(() => {
  const own = (license.value?.activations || []).map((a) => ({ ...a, license_id: a.license_id ?? license.value.id }));
  const siblings = (license.value?.bundle || []).flatMap((b) => (b.activations || []).map((a) => ({ ...a, license_id: a.license_id ?? b.id })));
  return [...own, ...siblings];
});
const isBundle = computed(() => (license.value?.bundle || []).length > 0);
const totalMaxDevices = computed(() =>
  (license.value?.max_devices || 0) + (license.value?.bundle || []).reduce((sum, b) => sum + (b.max_devices || 0), 0)
);
// The license (this one or its bundle sibling) a device belongs to.
const activationOwner = (activation) =>
  activation.license_id === license.value?.id
    ? { platform: license.value.platform, label: licensePlatformLabel(license.value) }
    : (() => {
        const b = (license.value?.bundle || []).find((x) => x.id === activation.license_id);
        return { platform: b?.platform, label: b?.platform_label || "" };
      })();
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
        title: t("licenses.form.sections.organization.title"),
        icon: Building2,
        items: [
          { label: t("licenses.form.organizationName"), value: l.licensee_name, icon: Building2 },
          { label: t("licenses.form.orgType"), value: organizationTypeLabel(l.organization_type) !== "-" ? organizationTypeLabel(l.organization_type) : l.organization_type_label, icon: Users },
          { label: t("licenses.form.memberCount"), value: l.member_count, icon: Users },
          { label: t("licenses.fields.website"), value: l.website, icon: Link2, href: l.website },
          { label: t("licenses.form.taxId"), value: l.tax_id, icon: Receipt },
        ],
      },
      {
        title: t("licenses.form.sections.contact.title"),
        icon: Contact,
        items: [
          { label: t("common.labels.name"), value: l.contact_name, icon: User },
          { label: t("licenses.form.position"), value: l.contact_position, icon: Briefcase },
          { label: t("common.labels.email"), value: l.licensee_email, icon: Mail, href: l.licensee_email && `mailto:${l.licensee_email}` },
          { label: t("licenses.checklist.phone"), value: l.phone, icon: Phone, href: l.phone && `tel:${l.phone.replace(/[^0-9+]/g, "")}` },
        ],
      },
      {
        title: t("licenses.form.sections.address.title"),
        icon: MapPin,
        items: locationItems(l),
      },
    ];
  }
  return [
    {
      title: t("licenses.form.sections.licensee.title"),
      icon: IdCard,
      items: [
        { label: t("licenses.form.fullName"), value: l.licensee_name, icon: User },
        { label: t("common.labels.email"), value: l.licensee_email, icon: Mail, href: l.licensee_email && `mailto:${l.licensee_email}` },
        { label: t("licenses.checklist.phone"), value: l.phone, icon: Phone, href: l.phone && `tel:${l.phone.replace(/[^0-9+]/g, "")}` },
        { label: t("licenses.fields.occupation"), value: l.occupation, icon: Briefcase },
        { label: t("licenses.fields.affiliation"), value: l.affiliation, icon: GraduationCap },
      ],
    },
    {
      title: t("licenses.form.sections.location.title"),
      icon: MapPin,
      items: locationItems(l),
    },
  ];
});

// Location rows: the full one-line address first, then the parts.
const locationItems = (l) => [
  { label: t("licenses.detail.fullAddress"), value: l.full_address, icon: MapPin, wide: true },
  { label: t("licenses.location.address"), value: l.address, icon: MapPin, wide: true },
  { label: t("licenses.location.villageId"), value: l.village, icon: MapPin },
  { label: t("licenses.location.districtId"), value: l.district, icon: MapPin },
  { label: t("licenses.location.regency"), value: l.regency, icon: MapPin },
  { label: t("licenses.location.province"), value: l.province, icon: MapPin },
  { label: t("licenses.location.postalCode"), value: l.postal_code, icon: MapPin },
  { label: t("licenses.location.country"), value: l.country, icon: Globe },
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
  `${license.value?.bundle?.length ? `${k.platform_label} ` : ""}${t("licenses.detail.keyN", { n: k.position })} · ${k.key}${
    k.status === "in_use" ? ` (${t("licenses.keyStatus.inUse").toLowerCase()})` : ""
  }`;
const certSelectOptions = computed(() => [
  { value: null, label: t("licenses.detail.allKeys") },
  ...certKeyOptions.value.map((k) => ({ value: k.id, label: certKeyLabel(k) })),
]);
// API's key_mode_label is English; the local label follows the language.
const keyModeLabel = computed(
  () => KEY_MODE_OPTIONS.find((o) => o.value === license.value?.key_mode)?.label || license.value?.key_mode_label || ""
);
const shareKeyId = ref(null);
const openShare = (tab, keyId = certKeyId.value) => {
  shareKeyId.value = keyId;
  shareTab.value = tab;
};
const onShared = () => timeline.value?.reload();

// Key card: status as a dot + word, the rest as one neutral line.
const keyStatus = computed(() => {
  if (expired.value) return { label: t("licenses.status.expired"), tone: "bad" };
  return license.value?.is_active
    ? { label: t("licenses.status.active"), tone: "ok" }
    : { label: t("licenses.status.inactive"), tone: "neutral" };
});

// Presentation only: header line, the main key(s) of this license and its
// bundle (Mac first), phone tabs and the "more" menu.
const headerMeta = computed(() => {
  const l = license.value;
  if (!l) return "";
  const platforms = isBundle.value ? keyGroups.value.map((g) => g.label).join(" + ") : licensePlatformLabel(l);
  const parts = [categoryLabel(l) !== planLabel(l) ? categoryLabel(l) : ""];
  if (isOrganization.value && (l.organization_type_label || l.organization_type))
    parts.push(l.organization_type ? organizationTypeLabel(l.organization_type) : l.organization_type_label);
  parts.push(platforms, l.licensee_email);
  parts.push(
    l.last_activity_at
      ? t("licenses.detail.lastActivity", { time: relativeTime(l.last_activity_at) })
      : t("licenses.detail.noAppActivity")
  );
  return parts.filter(Boolean).join(" · ");
});
const mainKeys = computed(() => {
  const l = license.value;
  if (!l) return [];
  return [l, ...(l.bundle || [])]
    .map((x) => ({ id: x.id, key: x.key, platform: x.platform, label: x.id === l.id ? licensePlatformLabel(l) : x.platform_label }))
    .sort((a, b) => (a.platform === "mac" ? -1 : b.platform === "mac" ? 1 : 0));
});
const platformsLabel = computed(() => mainKeys.value.map((k) => k.label).join(" + "));
const mobileTab = ref("overview");
const mobileTabs = computed(() => [
  { value: "overview", label: t("licenses.dashboard.overview") },
  ...(perDevice.value ? [{ value: "keys", label: t("licenses.form.keys") }] : []),
  { value: "devices", label: t("licenses.detail.devices") },
  { value: "activity", label: t("licenses.timeline.title") },
]);
// Below lg only the picked tab's cards show; lg and up shows everything.
const onTab = (name) => (mobileTab.value === name ? "" : "hidden lg:block");
const mobileKeyGroup = ref(0);
const moreOpen = ref(false);
const periodLabel = computed(() => {
  const l = license.value;
  if (!l) return "-";
  if (!l.expires_at) return `${formatDate(l.starts_at || l.created_at)} → ${t("licenses.plans.lifetime.label")}`;
  return `${formatDate(l.starts_at || l.created_at)} → ${formatDate(l.expires_at)}`;
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
const summarize = (keys) => ({
  total: keys.length,
  available: keys.filter((k) => k.status === "available").length,
  in_use: keys.filter((k) => k.status === "in_use").length,
  used: keys.filter((k) => k.status === "used").length,
});
// The keys per platform: this license, plus the iPad (or Mac) license of a
// Mac + iPad bundle, Mac first.
const keyGroups = computed(() => {
  const l = license.value;
  if (!l) return [];
  return [
    { licenseId: l.id, platform: l.platform, label: licensePlatformLabel(l), keys: l.keys || [] },
    ...(l.bundle || [])
      .filter((b) => Array.isArray(b.keys))
      .map((b) => ({ licenseId: b.id, platform: b.platform, label: b.platform_label, keys: b.keys })),
  ]
    .sort((a, b) => (a.platform === "mac" ? -1 : b.platform === "mac" ? 1 : 0))
    .map((g) => ({ ...g, summary: summarize(g.keys) }));
});
const deviceKeys = computed(() => keyGroups.value.flatMap((g) => g.keys));
const keysSummary = computed(() => summarize(deviceKeys.value));
const keyFilter = ref("all");
const keyFilters = computed(() => [
  { value: "all", label: t("common.labels.all"), count: keysSummary.value.total },
  { value: "available", label: t("licenses.keyStatus.available"), count: keysSummary.value.available },
  { value: "in_use", label: t("licenses.keyStatus.inUse"), count: keysSummary.value.in_use },
  { value: "used", label: t("licenses.keyStatus.used"), count: keysSummary.value.used },
]);
const filterKeys = (keys) => (keyFilter.value === "all" ? keys : keys.filter((k) => k.status === keyFilter.value));
const filteredKeys = computed(() => filterKeys(keyGroups.value[0]?.keys || []));
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
    error.value = errorMessage(err, t("licenses.detail.pdfFailed"));
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
      error.value = errorMessage(err, t("licenses.edit.notFound"));
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
    flash(value ? t("licenses.dashboard.activated") : t("licenses.dashboard.deactivated"));
    timeline.value?.reload();
  } catch (err) {
    error.value = errorMessage(err, t("licenses.dashboard.statusFailed"));
  } finally {
    toggling.value = false;
  }
};

const releaseDevice = async (activation) => {
  const ok = await alertModal.confirm(
    perDevice.value
      ? t("licenses.detail.releaseConfirmPerDevice", { name: activation.device_name || activation.device_id })
      : t("licenses.detail.releaseConfirm", { name: activation.device_name || activation.device_id }),
    { title: t("licenses.detail.releaseTitle"), type: "warning", confirmText: t("licenses.detail.release") }
  );
  if (!ok) return;

  releasingId.value = activation.id;
  try {
    // An iPad device of a Mac + iPad license is released on the iPad license.
    await store.releaseActivation(activation.license_id || license.value.id, activation.id);
    // Reload: a released per-device key turns "used", and an iPad device
    // lives on the bundle's other license.
    if (perDevice.value || isBundle.value) await store.fetchLicense(license.value.id);
    flash(t("licenses.detail.released"));
    timeline.value?.reload();
  } catch (err) {
    error.value = errorMessage(err, t("licenses.detail.releaseFailed"));
  } finally {
    releasingId.value = null;
  }
};

const handleDelete = async () => {
  const ok = await alertModal.confirm(
    t("licenses.dashboard.deleteConfirm", { key: license.value.key, name: license.value.licensee_name }),
    { title: t("licenses.dashboard.deleteTitle"), type: "danger", confirmText: t("common.actions.delete") }
  );
  if (!ok) return;

  try {
    await store.deleteLicense(license.value.id);
    toDashboard();
  } catch (err) {
    error.value = errorMessage(err, t("licenses.dashboard.deleteFailed"));
  }
};

const isMac = (platform) => /mac/i.test(platform || "");
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <div class="space-y-5">
        <!-- Header: back link, licensee, status + plan, one meta line, actions -->
        <UiPageHeader :title="license?.licensee_name || $t('licenses.detail.title')" class="ui-anim-fade-up">
          <template #eyebrow>
            <button type="button" @click="toDashboard" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1.5">
              <ChevronLeft class="w-4 h-4" /> {{ productName }} &middot; {{ $t("licenses.licenses") }}
            </button>
          </template>
          <template #subtitle>
            <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <template v-if="license">
                <UiBadge :tone="keyStatus.tone" dot>{{ keyStatus.label }}</UiBadge>
                <span class="text-ui-cap font-medium px-2 py-0.5 rounded-full" :class="planChipClass(license.plan)">{{ planLabel(license) }}</span>
                <span class="min-w-0" :title="license.last_activity_at ? formatDateTime(license.last_activity_at) : ''">{{ headerMeta }}</span>
              </template>
            </span>
          </template>
          <template v-if="license" #actions>
            <UiButton
              v-if="can('license-manager-edit')"
              variant="secondary"
              :icon="Pencil"
              @click="router.push({ name: 'admin.license-manager.licenses.edit', params: { product: productCode, id: license.id } })"
            >
              {{ $t("common.actions.edit") }}
            </UiButton>
            <div v-if="can('license-manager-delete')" class="relative">
              <UiButton variant="secondary" :icon="MoreHorizontal" :aria-label="$t('licenses.detail.moreActions')" :aria-expanded="moreOpen" class="!px-2.5" @click="moreOpen = !moreOpen" />
              <div v-if="moreOpen" class="fixed inset-0 z-30" aria-hidden="true" @click="moreOpen = false"></div>
              <Transition name="ui-pop">
                <div v-if="moreOpen" class="absolute right-0 top-full mt-1.5 z-40 w-48 bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay p-1" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    class="w-full flex items-center gap-2 px-3 py-2 rounded-ui-control text-ui-small font-medium text-ui-bad hover:bg-ui-bad-soft"
                    @click="moreOpen = false; handleDelete()"
                  >
                    <Trash2 class="w-4 h-4" /> {{ $t("licenses.dashboard.deleteLicense") }}
                  </button>
                </div>
              </Transition>
            </div>
          </template>
        </UiPageHeader>

        <Transition name="ui-fade">
          <Alert class="!mb-0" v-if="success" type="success" :title="success" message="" :show="!!success" @close="success = ''" />
        </Transition>
        <Transition name="ui-fade">
          <Alert class="!mb-0" v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />
        </Transition>

        <!-- Loading -->
        <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div class="lg:col-span-8 space-y-5">
            <Skeleton height="110px" rounded="12px" />
            <Skeleton height="320px" rounded="12px" />
          </div>
          <div class="lg:col-span-4 space-y-5">
            <Skeleton height="300px" rounded="12px" />
            <Skeleton height="200px" rounded="12px" />
          </div>
        </div>

        <!-- Below lg the columns dissolve (display: contents) so each card
             can be ordered and shown per phone tab. -->
        <div v-else-if="license" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start ui-stagger">
          <!-- ===================== Left: 8 columns ===================== -->
          <div class="contents lg:block lg:col-span-8 lg:space-y-5 min-w-0">
            <!-- Main key(s) -->
            <section class="order-1 lg:order-none bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 sm:px-6 sm:py-5 min-w-0">
              <div class="flex items-center justify-between gap-3 mb-2">
                <p class="text-ui-over uppercase text-ui-muted">
                  {{ mainKeys.length > 1 ? $t("licenses.detail.licenseKeys") : $t("licenses.detail.licenseKey") }}<template v-if="perDevice && keysSummary.total">
                    &middot;
                    {{
                      mainKeys.length > 1
                        ? $t("licenses.detail.key1OfEach", { total: keyGroups[0]?.summary.total })
                        : $t("licenses.create.key1Of", { total: keysSummary.total })
                    }}</template>
                </p>
                <p class="hidden sm:block text-ui-cap text-ui-muted text-right truncate">
                  {{ mainKeys.length > 1 ? keyModeLabel || keyMeta : keyMeta }}<template v-if="mainKeys.length === 1 && keyModeLabel"> &middot; {{ keyModeLabel }}</template>
                </p>
              </div>
              <div v-for="k in mainKeys" :key="k.id" class="flex items-center gap-3 py-1">
                <span v-if="mainKeys.length > 1" class="text-ui-cap font-medium px-2 py-0.5 rounded-ui-control shrink-0 w-12 text-center" :class="platformChipClass(k.platform)">{{ k.label }}</span>
                <span class="font-mono text-ui-body sm:text-ui-h1 font-semibold tracking-wider text-ui-ink break-all flex-1 select-all">{{ k.key }}</span>
                <CopyKeyButton :value="k.key" size="md" />
              </div>
            </section>

            <!-- Phone tabs -->
            <div class="order-2 lg:hidden flex p-1 bg-ui-subtle border border-ui-line rounded-ui-card" role="tablist" :aria-label="$t('licenses.detail.sections')">
              <button
                v-for="t in mobileTabs"
                :key="t.value"
                type="button"
                role="tab"
                :aria-selected="mobileTab === t.value"
                class="flex-1 h-8 rounded-ui-control text-ui-small font-medium transition-colors"
                :class="mobileTab === t.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
                @click="mobileTab = t.value"
              >
                {{ t.label }}
              </button>
            </div>

            <!-- Device keys: one per device, with which ones are taken -->
            <section v-if="perDevice" class="order-3 lg:order-none bg-ui-surface border border-ui-line rounded-ui-card min-w-0" :class="onTab('keys')">
              <div class="px-5 pt-5 sm:px-6">
                <div class="flex items-start gap-3">
                  <div class="flex-1 min-w-0">
                    <h3 class="text-ui-h2 text-ui-ink">{{ $t("licenses.detail.deviceKeys") }}</h3>
                    <p class="text-ui-cap text-ui-muted mt-0.5">
                      {{
                        keyGroups.length > 1
                          ? $t("licenses.detail.sideBySide", { platforms: keyGroups.map((g) => g.label).join($t("licenses.dashboard.and")) })
                          : $t("licenses.detail.onePerDevice")
                      }}
                      {{ $t("licenses.detail.releasedKeyDead") }}
                    </p>
                  </div>
                  <p class="text-ui-small text-ui-muted whitespace-nowrap tabular-nums pt-1">
                    <i18n-t keypath="licenses.detail.usedOf" tag="span" scope="global">
                      <template #used><b class="text-ui-ink font-semibold">{{ keysSummary.in_use + keysSummary.used }}</b></template>
                      <template #total>{{ keysSummary.total }}</template>
                    </i18n-t>
                  </p>
                </div>

                <!-- Usage bar: in use, used, available -->
                <div class="flex h-1.5 w-full rounded-full overflow-hidden bg-ui-subtle gap-[2px] mt-4" role="img" :aria-label="$t('licenses.detail.usageAria', { inUse: keysSummary.in_use, used: keysSummary.used, available: keysSummary.available })">
                  <div class="bg-ui-accent" :style="{ width: segmentWidth(keysSummary.in_use) }"></div>
                  <div class="bg-ui-faint" :style="{ width: segmentWidth(keysSummary.used) }"></div>
                  <div class="bg-ui-ok/40" :style="{ width: segmentWidth(keysSummary.available) }"></div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 mt-3">
                  <div class="flex flex-wrap gap-x-4 gap-y-1 text-ui-cap text-ui-muted">
                    <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-ui-accent"></span> {{ $t("licenses.keyStatus.inUse") }} <b class="text-ui-ink font-semibold tabular-nums">{{ keysSummary.in_use }}</b></span>
                    <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-ui-faint"></span> {{ $t("licenses.keyStatus.used") }} <b class="text-ui-ink font-semibold tabular-nums">{{ keysSummary.used }}</b></span>
                    <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-ui-ok/60"></span> {{ $t("licenses.keyStatus.available") }} <b class="text-ui-ink font-semibold tabular-nums">{{ keysSummary.available }}</b></span>
                  </div>
                  <div class="max-w-full overflow-x-auto [scrollbar-width:none]">
                    <div class="inline-flex p-1 bg-ui-subtle border border-ui-line rounded-ui-card" role="tablist" :aria-label="$t('licenses.detail.filterKeys')">
                      <button
                        v-for="f in keyFilters"
                        :key="f.value"
                        type="button"
                        role="tab"
                        :aria-selected="keyFilter === f.value"
                        @click="keyFilter = f.value"
                        class="px-3 h-7 rounded-ui-control text-ui-small font-medium whitespace-nowrap transition-colors"
                        :class="keyFilter === f.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
                      >
                        {{ f.label }} <span class="tabular-nums" :class="keyFilter === f.value ? 'text-ui-muted' : 'text-ui-faint'">{{ f.count }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Mac + iPad: one list per platform, side by side -->
              <div v-if="keyGroups.length > 1" class="p-5 sm:p-6 pt-4 sm:pt-4">
                <!-- Phones: pick the platform -->
                <div class="md:hidden flex items-center gap-2 mb-3">
                  <button
                    v-for="(group, gi) in keyGroups"
                    :key="group.licenseId"
                    type="button"
                    class="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-ui-small font-medium"
                    :class="mobileKeyGroup === gi ? 'bg-ui-ink text-white border-ui-ink' : 'bg-ui-surface text-ui-text border-ui-line'"
                    :aria-pressed="mobileKeyGroup === gi"
                    @click="mobileKeyGroup = gi"
                  >
                    <component :is="isMac(group.platform) ? Laptop : Tablet" class="w-4 h-4" />
                    {{ group.label }}
                    <span class="tabular-nums" :class="mobileKeyGroup === gi ? 'text-white/70' : 'text-ui-faint'">{{ group.summary.in_use + group.summary.used }}/{{ group.summary.total }}</span>
                  </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  <div
                    v-for="(group, gi) in keyGroups"
                    :key="group.licenseId"
                    class="border border-ui-line rounded-ui-card overflow-hidden min-w-0"
                    :class="mobileKeyGroup === gi ? '' : 'hidden md:block'"
                  >
                    <div class="flex items-center gap-2 px-4 py-2.5 bg-ui-subtle border-b border-ui-line">
                      <span class="inline-flex items-center gap-1 text-ui-cap font-medium px-2 py-0.5 rounded-ui-control bg-ui-surface border border-ui-line text-ui-text">
                        <component :is="isMac(group.platform) ? Laptop : Tablet" class="w-3.5 h-3.5" /> {{ group.label }}
                      </span>
                      <span class="text-ui-cap text-ui-muted">{{ $t("licenses.detail.keysWord") }}</span>
                      <span class="ml-auto text-ui-cap text-ui-muted tabular-nums">
                        <i18n-t keypath="licenses.detail.usedOf" tag="span" scope="global">
                          <template #used><b class="text-ui-ink font-semibold">{{ group.summary.in_use + group.summary.used }}</b></template>
                          <template #total>{{ group.summary.total }}</template>
                        </i18n-t>
                      </span>
                    </div>
                    <ul class="divide-y divide-ui-line">
                      <li v-for="key in filterKeys(group.keys)" :key="key.id" class="flex items-start gap-3 px-4 py-3">
                        <span class="text-ui-cap text-ui-faint tabular-nums w-4 pt-0.5 shrink-0">{{ key.position }}</span>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-1 min-w-0">
                            <span
                              class="font-mono text-ui-cap font-medium whitespace-nowrap truncate"
                              :class="key.status === 'used' ? 'text-ui-faint line-through' : 'text-ui-ink'"
                            >{{ key.key }}</span>
                            <CopyKeyButton v-if="key.status !== 'used'" :value="key.key" class="!w-6 !h-6 !border-0" />
                          </div>
                          <div class="flex items-center gap-2 mt-1 min-w-0">
                            <span class="inline-flex items-center gap-1 text-ui-cap font-medium px-2 py-0.5 rounded-full shrink-0" :class="keyStatusOf(key).chip">
                              <span v-if="key.status !== 'used'" class="w-1.5 h-1.5 rounded-full" :class="keyStatusOf(key).dot"></span>
                              {{ keyStatusOf(key).label }}
                            </span>
                            <span v-if="key.device_id || key.device_name" class="text-ui-cap text-ui-muted truncate" :title="key.device_id">
                              <template v-if="key.status === 'used'">{{ $t("licenses.detail.was") }} </template>{{ key.device_name || $t("licenses.detail.unnamedDevice") }}
                              <template v-if="key.status === 'used' && key.used_at"> &middot; {{ formatDate(key.used_at) }}</template>
                              <template v-else-if="key.activated_at"> &middot; {{ formatDate(key.activated_at) }}</template>
                            </span>
                          </div>
                        </div>
                        <div v-if="can('license-manager-view') && key.status !== 'used'" class="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            @click="downloadPdf(certKeyOptions.find((k) => k.id === key.id))"
                            :disabled="downloading"
                            class="w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:text-ui-ink hover:bg-ui-hover disabled:opacity-50"
                            :title="$t('licenses.detail.downloadPlatformKeyCert', { platform: group.label, n: key.position })"
                            :aria-label="$t('licenses.detail.downloadPlatformKeyCert', { platform: group.label, n: key.position })"
                          >
                            <Download class="w-4 h-4" :class="downloadingKeyId === key.id ? 'text-ui-accent animate-pulse' : ''" />
                          </button>
                          <button
                            type="button"
                            @click="openShare('email', key.id)"
                            class="w-7 h-7 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:text-ui-ink hover:bg-ui-hover"
                            :title="$t('licenses.detail.sharePlatformKeyCert', { platform: group.label, n: key.position })"
                            :aria-label="$t('licenses.detail.sharePlatformKeyCert', { platform: group.label, n: key.position })"
                          >
                            <Share2 class="w-4 h-4" />
                          </button>
                        </div>
                        <span v-else-if="can('license-manager-view')" class="w-[58px] shrink-0"></span>
                      </li>
                      <li v-if="!filterKeys(group.keys).length" class="px-4 py-6 text-center text-ui-cap text-ui-muted">
                        {{ $t(`licenses.detail.noKeys.${keyFilter}`) }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- One platform: a table from sm, stacked rows on phones -->
              <div v-else class="mt-4">
                <table class="hidden sm:table w-full text-ui-small">
                  <thead>
                    <tr class="text-left text-ui-cap text-ui-muted border-y border-ui-line">
                      <th class="font-medium py-2.5 pl-5 sm:pl-6 pr-2 w-12">#</th>
                      <th class="font-medium py-2.5 px-2">{{ $t("licenses.form.key") }}</th>
                      <th class="font-medium py-2.5 px-2">{{ $t("common.labels.status") }}</th>
                      <th class="font-medium py-2.5 px-2">{{ $t("licenses.detail.device") }}</th>
                      <th v-if="can('license-manager-view')" class="font-medium py-2.5 pl-2 pr-5 sm:pr-6 text-right">{{ $t("licenses.detail.certificate") }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-ui-line">
                    <tr v-for="key in filteredKeys" :key="key.id" class="align-middle hover:bg-ui-subtle/60">
                      <td class="py-3 pl-5 sm:pl-6 pr-2 text-ui-faint tabular-nums">{{ key.position }}</td>
                      <td class="py-3 px-2">
                        <span class="inline-flex items-center gap-1">
                          <span
                            class="font-mono text-ui-cap font-medium tracking-wide whitespace-nowrap"
                            :class="key.status === 'used' ? 'text-ui-faint line-through' : 'text-ui-ink'"
                          >{{ key.key }}</span>
                          <CopyKeyButton v-if="key.status !== 'used'" :value="key.key" class="!w-6 !h-6 !border-0" />
                        </span>
                      </td>
                      <td class="py-3 px-2 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1.5 text-ui-cap font-medium px-2 py-0.5 rounded-full" :class="keyStatusOf(key).chip">
                          <span v-if="key.status !== 'used'" class="w-1.5 h-1.5 rounded-full" :class="keyStatusOf(key).dot"></span>
                          {{ keyStatusOf(key).label }}
                        </span>
                      </td>
                      <td class="py-3 px-2 min-w-0">
                        <template v-if="key.device_id || key.device_name">
                          <p class="text-ui-small text-ui-ink truncate max-w-[220px]" :title="key.device_id">
                            <template v-if="key.status === 'used'">{{ $t("licenses.detail.was") }} </template>{{ key.device_name || $t("licenses.detail.unnamedDevice") }}
                          </p>
                          <p class="text-ui-cap text-ui-muted">
                            <template v-if="key.platform">{{ platformLabel(key.platform) }} &middot; </template>
                            <template v-if="key.status === 'used' && key.used_at">{{ $t("licenses.detail.releasedOn", { date: formatDate(key.used_at) }) }}</template>
                            <template v-else-if="key.activated_at">{{ $t("licenses.detail.sinceDate", { date: formatDate(key.activated_at) }) }}</template>
                          </p>
                        </template>
                        <span v-else class="text-ui-faint">—</span>
                      </td>
                      <td v-if="can('license-manager-view')" class="py-2 pl-2 pr-5 sm:pr-6 text-right whitespace-nowrap">
                        <template v-if="key.status !== 'used'">
                          <button
                            type="button"
                            @click="downloadPdf(certKeyOptions.find((k) => k.id === key.id))"
                            :disabled="downloading"
                            class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:text-ui-ink hover:bg-ui-hover disabled:opacity-50"
                            :title="$t('licenses.detail.downloadKeyCert', { n: key.position })"
                            :aria-label="$t('licenses.detail.downloadKeyCert', { n: key.position })"
                          >
                            <Download class="w-4 h-4" :class="downloadingKeyId === key.id ? 'text-ui-accent animate-pulse' : ''" />
                          </button>
                          <button
                            type="button"
                            @click="openShare('email', key.id)"
                            class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:text-ui-ink hover:bg-ui-hover"
                            :title="$t('licenses.detail.shareKeyCert', { n: key.position })"
                            :aria-label="$t('licenses.detail.shareKeyCert', { n: key.position })"
                          >
                            <Share2 class="w-4 h-4" />
                          </button>
                        </template>
                        <span v-else class="text-ui-faint" :title="$t('licenses.detail.usedNoCert')">—</span>
                      </td>
                    </tr>
                    <tr v-if="!filteredKeys.length">
                      <td :colspan="can('license-manager-view') ? 5 : 4" class="py-8 text-center text-ui-cap text-ui-muted">{{ $t(`licenses.detail.noKeys.${keyFilter}`) }}</td>
                    </tr>
                  </tbody>
                </table>

                <ul class="sm:hidden divide-y divide-ui-line border-t border-ui-line">
                  <li v-for="key in filteredKeys" :key="key.id" class="flex items-start gap-3 px-5 py-3">
                    <span class="text-ui-cap text-ui-faint tabular-nums w-4 pt-0.5 shrink-0">{{ key.position }}</span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1 min-w-0">
                        <span class="font-mono text-ui-cap font-medium truncate" :class="key.status === 'used' ? 'text-ui-faint line-through' : 'text-ui-ink'">{{ key.key }}</span>
                        <CopyKeyButton v-if="key.status !== 'used'" :value="key.key" class="!w-6 !h-6 !border-0" />
                      </div>
                      <div class="flex items-center gap-2 mt-1 min-w-0">
                        <span class="inline-flex items-center gap-1 text-ui-cap font-medium px-2 py-0.5 rounded-full shrink-0" :class="keyStatusOf(key).chip">
                          <span v-if="key.status !== 'used'" class="w-1.5 h-1.5 rounded-full" :class="keyStatusOf(key).dot"></span>
                          {{ keyStatusOf(key).label }}
                        </span>
                        <span v-if="key.device_id || key.device_name" class="text-ui-cap text-ui-muted truncate">
                          <template v-if="key.status === 'used'">{{ $t("licenses.detail.was") }} </template>{{ key.device_name || $t("licenses.detail.unnamedDevice") }}
                          <template v-if="key.status === 'used' && key.used_at"> &middot; {{ formatDate(key.used_at) }}</template>
                          <template v-else-if="key.activated_at"> &middot; {{ formatDate(key.activated_at) }}</template>
                        </span>
                      </div>
                    </div>
                    <div v-if="can('license-manager-view') && key.status !== 'used'" class="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        @click="downloadPdf(certKeyOptions.find((k) => k.id === key.id))"
                        :disabled="downloading"
                        class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover disabled:opacity-50"
                        :aria-label="$t('licenses.detail.downloadKeyCert', { n: key.position })"
                      >
                        <Download class="w-4 h-4" :class="downloadingKeyId === key.id ? 'text-ui-accent animate-pulse' : ''" />
                      </button>
                      <button
                        type="button"
                        @click="openShare('email', key.id)"
                        class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover"
                        :aria-label="$t('licenses.detail.shareKeyCert', { n: key.position })"
                      >
                        <Share2 class="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                  <li v-if="!filteredKeys.length" class="py-8 text-center text-ui-cap text-ui-muted">{{ $t(`licenses.detail.noKeys.${keyFilter}`) }}</li>
                </ul>
              </div>
            </section>

            <!-- Tracking -->
            <LicenseTrackingTimeline ref="timeline" :license-id="license.id" class="order-3 lg:order-none" :class="onTab('activity')" />

            <!-- Active period -->
            <LicensePeriodCard :license="license" class="order-5 lg:order-none" :class="onTab('overview')" />

            <!-- Licensee / Organization / Contact / Location, grouped like the form -->
            <section
              v-for="group in detailGroups"
              :key="group.title"
              class="order-6 lg:order-none bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0"
              :class="onTab('overview')"
            >
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-ui-control border border-ui-line bg-ui-surface flex items-center justify-center shrink-0">
                  <component :is="group.icon" class="w-4 h-4 text-ui-muted" />
                </div>
                <h3 class="text-ui-h2 text-ui-ink">{{ group.title }}</h3>
              </div>
              <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div v-for="item in group.items" :key="item.label" class="min-w-0" :class="{ 'md:col-span-2': item.wide }">
                  <dt class="text-ui-cap text-ui-muted">{{ item.label }}</dt>
                  <dd class="mt-0.5">
                    <a
                      v-if="item.href && item.value"
                      :href="item.href"
                      target="_blank"
                      rel="noopener"
                      class="text-ui-body text-ui-accent hover:underline break-all"
                    >{{ item.value }}</a>
                    <span v-else class="text-ui-body text-ui-ink break-words whitespace-pre-line">{{ item.value === null || item.value === undefined || item.value === "" ? "-" : item.value }}</span>
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <!-- ===================== Right: 4 columns, sticky ===================== -->
          <!-- Sticky on lg; scrolls on its own when taller than the screen. -->
          <aside class="contents lg:block lg:col-span-4 lg:sticky lg:top-3 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto scroll-soft lg:-mr-2 lg:pr-1 lg:space-y-5 min-w-0">
            <!-- License terms -->
            <section class="order-3 lg:order-none bg-ui-surface border border-ui-line rounded-ui-card px-5 pt-5 pb-2 min-w-0" :class="onTab('overview')">
              <h3 class="text-ui-h2 text-ui-ink mb-1">{{ $t("licenses.detail.license") }}</h3>
              <dl class="divide-y divide-ui-line text-ui-small">
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted">{{ $t("licenses.form.plan") }}</dt>
                  <dd class="text-ui-ink text-right">
                    {{ planLabel(license) }}<span v-if="categoryLabel(license) !== planLabel(license)" class="text-ui-muted"> &middot; {{ categoryLabel(license) }}</span>
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted">{{ isBundle ? $t("licenses.releaseForm.platforms") : $t("licenses.form.platform") }}</dt>
                  <dd class="text-ui-ink">{{ platformsLabel }}</dd>
                </div>
                <!-- Mac + iPad generated together: the other key of the bundle -->
                <div v-for="sibling in license.bundle || []" :key="sibling.id" class="flex items-start justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted shrink-0">{{ $t("licenses.detail.pairedKey", { platform: sibling.platform_label }) }}</dt>
                  <dd class="text-right min-w-0">
                    <router-link
                      :to="{ name: 'admin.license-manager.licenses.detail', params: { product: productCode, id: sibling.id } }"
                      class="font-mono text-ui-cap text-ui-accent hover:underline break-all"
                    >
                      {{ sibling.key }}
                    </router-link>
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted">{{ $t("licenses.form.keys") }}</dt>
                  <dd class="text-ui-ink text-right">
                    <template v-if="perDevice">{{ $t("licenses.keyMode.perDevice.label") }} &middot; {{ keysSummary.total }} <span class="text-ui-muted">({{ $t("licenses.detail.nAvailable", { n: keysSummary.available }) }})</span></template>
                    <template v-else>{{ $t("licenses.keyMode.shared.label") }}</template>
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted">{{ $t("licenses.detail.devices") }}</dt>
                  <dd class="text-ui-ink tabular-nums">{{ $t("licenses.detail.usedOf", { used: devicesUsed, total: license.max_devices }) }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted">{{ $t("licenses.fields.type") }}</dt>
                  <dd class="text-ui-ink">{{ license.type === "lifetime" ? $t("licenses.type.lifetime") : $t("licenses.type.term") }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted shrink-0">{{ $t("common.labels.period") }}</dt>
                  <dd class="text-ui-ink text-right tabular-nums">{{ periodLabel }}</dd>
                </div>
                <div v-if="license.updates_label" class="flex items-start justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted shrink-0">{{ $t("licenses.detail.updates") }}</dt>
                  <dd class="text-ui-ink text-right">{{ license.updates_label }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted">{{ $t("licenses.detail.terms") }}</dt>
                  <dd class="text-ui-ink">{{ license.terms_version ? `v${license.terms_version}` : "—" }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted shrink-0">{{ $t("licenses.detail.reference") }}</dt>
                  <dd class="font-mono text-ui-cap text-ui-ink text-right break-all">{{ reference }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted shrink-0">{{ $t("licenses.detail.lastActivated") }}</dt>
                  <dd class="text-ui-ink text-right tabular-nums">{{ license.last_activated_at ? formatDateTime(license.last_activated_at) : $t("licenses.dashboard.never") }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <dt class="text-ui-muted">{{ $t("common.labels.createdAt") }}</dt>
                  <dd class="text-ui-ink text-right tabular-nums">{{ formatDateTime(license.created_at) }}</dd>
                </div>
                <div class="py-2.5">
                  <dt class="text-ui-muted mb-0.5">{{ $t("common.labels.notes") }}</dt>
                  <dd class="text-ui-ink whitespace-pre-line break-words">{{ license.notes || "—" }}</dd>
                </div>
                <div v-if="can('license-manager-edit')" class="flex items-center justify-between gap-4 py-3">
                  <dt class="text-ui-h3 text-ui-ink">{{ $t("licenses.detail.licenseStatus") }}</dt>
                  <dd><LicenseStatusSwitch :model-value="!!license.is_active" :disabled="toggling" @update:model-value="toggleActive" /></dd>
                </div>
              </dl>
            </section>

            <!-- Certificate: download or share, for the licensee or one key -->
            <section v-if="can('license-manager-view')" class="order-4 lg:order-none bg-ui-surface border border-ui-line rounded-ui-card p-5 min-w-0" :class="onTab('overview')">
              <h3 class="text-ui-h2 text-ui-ink mb-3">{{ $t("licenses.detail.certificate") }}</h3>
              <UiSelect
                v-if="certKeyOptions.length"
                id="cert-key"
                v-model="certKeyId"
                :label="$t('licenses.share.certificateFor')"
                :options="certSelectOptions"
                :hint="certKey ? $t('licenses.share.hintOneKey') : $t('licenses.share.hintAllKeys')"
              />
              <UiButton block size="lg" :icon="Download" :loading="downloading && downloadingKeyId === (certKey?.id ?? null)" :disabled="downloading" class="mt-4" @click="downloadPdf()">
                {{
                  downloading && downloadingKeyId === (certKey?.id ?? null)
                    ? $t("licenses.create.preparingPdf")
                    : certKey
                      ? $t("licenses.detail.downloadKeyPdf", { n: certKey.position })
                      : $t("licenses.create.downloadPdf")
                }}
              </UiButton>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <UiButton variant="secondary" size="lg" :icon="Mail" :title="$t('licenses.detail.shareEmail')" @click="openShare('email')">{{ $t("common.labels.email") }}</UiButton>
                <UiButton variant="secondary" size="lg" :icon="MessageCircle" :title="$t('licenses.detail.shareWhatsapp')" @click="openShare('whatsapp')">WhatsApp</UiButton>
              </div>
            </section>

            <!-- Devices -->
            <section class="order-3 lg:order-none bg-ui-surface border border-ui-line rounded-ui-card px-5 pt-5 pb-2 min-w-0" :class="onTab('devices')">
              <div class="flex items-center gap-3 mb-1">
                <h3 class="text-ui-h2 text-ui-ink flex-1">{{ $t("licenses.detail.devices") }}</h3>
                <span class="text-ui-small text-ui-muted tabular-nums">{{ $t("licenses.form.doneOf", { done: activations.length, total: totalMaxDevices }) }}</span>
              </div>

              <ul v-if="activations.length" class="divide-y divide-ui-line">
                <li v-for="activation in activations" :key="activation.id" class="flex items-start gap-3 py-3.5">
                  <Laptop v-if="isMac(activation.platform)" class="w-[18px] h-[18px] text-ui-muted shrink-0 mt-0.5" />
                  <Tablet v-else class="w-[18px] h-[18px] text-ui-muted shrink-0 mt-0.5" />
                  <div class="min-w-0 flex-1">
                    <p class="flex items-center gap-1.5 min-w-0">
                      <span class="text-ui-h3 text-ui-ink truncate">{{ activation.device_name || $t("licenses.detail.unnamedDevice") }}</span>
                      <span
                        v-if="isBundle"
                        class="text-ui-cap font-medium px-1.5 rounded-ui-control border border-ui-line text-ui-text shrink-0"
                      >{{ activationOwner(activation).label }}</span>
                    </p>
                    <p v-if="keyOfActivation(activation)" class="font-mono text-ui-cap text-ui-muted truncate">
                      {{ $t("licenses.detail.keyN", { n: keyOfActivation(activation).position }) }} &middot; {{ keyOfActivation(activation).key }}
                    </p>
                    <p class="text-ui-cap text-ui-muted">
                      {{ platformLabel(activation.platform) }}<template v-if="activation.app_version"> &middot; v{{ activation.app_version }}</template>
                    </p>
                    <p class="font-mono text-ui-cap text-ui-faint truncate" :title="activation.device_id">{{ activation.device_id }}</p>
                    <p class="text-ui-cap text-ui-muted" :title="formatDateTime(activation.last_seen_at)">
                      {{ $t("licenses.detail.seen", { time: relativeTime(activation.last_seen_at) }) }} &middot;
                      {{ $t("licenses.detail.sinceDate", { date: formatDate(activation.activated_at) }) }}
                    </p>
                  </div>
                  <UiButton
                    v-if="can('license-manager-edit')"
                    variant="ghost"
                    size="sm"
                    :icon="Unplug"
                    :loading="releasingId === activation.id"
                    @click="releaseDevice(activation)"
                  >
                    {{ releasingId === activation.id ? $t("licenses.detail.releasing") : $t("licenses.detail.release") }}
                  </UiButton>
                </li>
              </ul>
              <UiEmpty
                v-else
                compact
                :icon="MonitorSmartphone"
                :title="$t('licenses.detail.noDevices')"
                :message="perDevice ? $t('licenses.detail.noDevicesPerDevice', { product: productName }) : $t('licenses.detail.noDevicesShared', { product: productName })"
                class="pb-3"
              />
            </section>
          </aside>
        </div>
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
