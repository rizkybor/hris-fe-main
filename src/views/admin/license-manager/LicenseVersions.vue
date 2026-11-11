<script setup>
// Versions of one product's app: what is on sale, which versions the apps
// report, and the release history (changelog) with its installers.
// Permissions (own module): license-release-menu / -list / -view (page),
// -create (new version), -edit (edit, publish, installer), -delete,
// -download (installer).
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { debounce } from "lodash-es";
import {
  Plus,
  Search,
  SearchX,
  X,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Send,
  History,
  KeyRound,
  Monitor,
  Laptop,
  Tablet,
  AlertTriangle,
  CalendarDays,
  Link2,
  FileText,
  CalendarCheck,
  Tag,
  Infinity as InfinityIcon,
  Layers,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiBadge, UiChips, UiEmpty, UiInput, UiModal, UiStat } from "@/components/ui";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import LicenseProductGate from "@/components/admin/license-manager/LicenseProductGate.vue";
import ReleaseFormModal from "@/components/admin/license-manager/ReleaseFormModal.vue";
import ReleaseInstaller from "@/components/admin/license-manager/ReleaseInstaller.vue";
import { useLicenseProduct, onProductReady } from "@/components/admin/license-manager/useLicenseProduct";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { platformLabel, platformChipClass, validationErrors } from "@/components/admin/license-manager/licenseHelpers";
import {
  RELEASE_STATUS_CHIP,
  KIND_BADGES,
  KIND_CHIP,
  publishNeedsFileMessage,
  releasePlatformLabel,
  changeCountsLine,
  groupChanges,
  formatReleaseDate,
  todayInput,
  needsFile,
} from "@/components/admin/license-manager/releaseHelpers";

const { t } = useI18n();
const store = useLicenseManagerStore();
const { code: productCode, product, productName, state: productState } = useLicenseProduct();
const { releases, releasesInfo, releasesLoading } = storeToRefs(store);
const alertModal = useAlertModalStore();

const canCreate = computed(() => can("license-release-create"));
const canEdit = computed(() => can("license-release-edit"));
const canDelete = computed(() => can("license-release-delete"));
// The page links back to the licenses only with license-manager-list.
const canListLicenses = computed(() => can("license-manager-list"));

const filters = ref({ status: "", platform: "", search: "" });
const loadedOnce = ref(false);
const success = ref("");
const error = ref("");
const expanded = ref({});

const load = async () => {
  try {
    await store.fetchReleases(filters.value);
  } catch (err) {
    error.value = errorMessage(err, t("licenses.versions.loadFailed"));
  } finally {
    loadedOnce.value = true;
  }
};

onProductReady(
  productState,
  () => {
    loadedOnce.value = false;
    expanded.value = {};
    load();
  },
  () => productCode.value
);

watch(filters, debounce(load, 300), { deep: true });

const hasFilters = computed(() => !!(filters.value.status || filters.value.platform || filters.value.search));
const clearFilters = () => (filters.value = { status: "", platform: "", search: "" });

const flash = (message) => {
  success.value = message;
  setTimeout(() => {
    if (success.value === message) success.value = "";
  }, 3000);
};

/* ---------- Header ---------- */
const latestVersion = computed(() => releasesInfo.value.latest_version || product.value?.latest_version || null);
const currentMajor = computed(() => releasesInfo.value.current_major ?? product.value?.current_major ?? null);

// Versions the apps report: "1.1.0 · macOS · 3 devices", newest first.
const compareVersions = (a, b) => {
  const pa = String(a || "").split(".").map(Number);
  const pb = String(b || "").split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  return 0;
};
const versionsInUse = computed(() => [...(releasesInfo.value.versions_in_use || [])].sort((a, b) => compareVersions(a.version, b.version)));
const isIpadPlatform = (platform) => /ip(ad|hone)|ios/i.test(String(platform || ""));

/* ---------- Rows ---------- */
const sortedReleases = computed(() =>
  [...releases.value].sort((a, b) => compareVersions(a.version, b.version) || (b.id || 0) - (a.id || 0))
);
const areas = computed(() => {
  const set = new Set();
  for (const r of releases.value) for (const c of r.changes || []) if (c.area) set.add(c.area);
  return [...set];
});
const toggle = (id) => (expanded.value = { ...expanded.value, [id]: !expanded.value[id] });
// "3 devices" / "1 license" (word: device | license).
const plural = (n, word) => t(`licenses.versions.count.${word}`, { n }, n);
const canPublish = (release) => !needsFile(release) || !!release.file;

const replaceRelease = (updated) => {
  if (!updated) return;
  store.releases = store.releases.map((r) => (r.id === updated.id ? updated : r));
};

/* ---------- Create / edit ---------- */
const showForm = ref(false);
const editing = ref(null);
const openCreate = () => {
  editing.value = null;
  showForm.value = true;
};
const openEdit = (release) => {
  editing.value = release;
  showForm.value = true;
};
const onSaved = (saved) => {
  const wasEdit = !!editing.value;
  showForm.value = false;
  editing.value = null;
  flash(wasEdit ? t("licenses.versions.saved", { version: saved.version }) : t("licenses.versions.added", { version: saved.version }));
  load();
};
// A failed installer upload may still have saved the version.
const onFormClose = () => {
  showForm.value = false;
  editing.value = null;
  load();
};

/* ---------- Publish ---------- */
const publishing = ref(null);
const publishDate = ref("");
const publishError = ref("");
const publishSaving = ref(false);
const openPublish = (release) => {
  publishing.value = release;
  publishDate.value = release.released_at || todayInput();
  publishError.value = "";
};
const confirmPublish = async () => {
  if (!publishDate.value) {
    publishError.value = t("licenses.versions.pickDate");
    return;
  }
  publishSaving.value = true;
  publishError.value = "";
  try {
    const updated = await store.updateRelease(publishing.value.id, { status: "published", released_at: publishDate.value });
    flash(t("licenses.versions.published", { version: updated.version }));
    publishing.value = null;
    load();
  } catch (err) {
    const errors = validationErrors(err);
    const first = Object.values(errors).flat()[0];
    publishError.value = first || errorMessage(err, t("licenses.versions.publishFailed"));
  } finally {
    publishSaving.value = false;
  }
};

/* ---------- Delete ---------- */
const handleDelete = async (release) => {
  const ok = await alertModal.confirm(
    release.file
      ? t("licenses.versions.deleteConfirmFile", { version: release.version })
      : t("licenses.versions.deleteConfirm", { version: release.version }),
    { title: t("licenses.versions.deleteTitle"), type: "danger", confirmText: t("common.actions.delete") }
  );
  if (!ok) return;
  try {
    await store.deleteRelease(release.id);
    flash(t("licenses.versions.deleted", { version: release.version }));
    load();
  } catch (err) {
    await alertModal.alert(errorMessage(err, t("licenses.versions.deleteFailed")), { type: "danger" });
  }
};

/* ---------- Presentation ---------- */
const STATUS_FILTERS = computed(() => [
  { value: "", label: t("common.labels.all") },
  { value: "published", label: t("licenses.releases.status.published") },
  { value: "draft", label: t("licenses.releases.status.draft") },
]);
const PLATFORM_FILTERS = computed(() => [
  { value: "", label: t("licenses.dashboard.allPlatforms") },
  { value: "mac", label: "Mac" },
  { value: "ipad", label: "iPad" },
]);
const devicesReporting = computed(() => versionsInUse.value.reduce((sum, item) => sum + (Number(item.devices) || 0), 0));
// The publish modal's open state follows `publishing`.
const onPublishOpenChange = (value) => {
  if (!value && !publishSaving.value) publishing.value = null;
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <div class="space-y-5">
        <Alert v-if="success" type="success" :title="success" message="" :show="!!success" @close="success = ''" />
        <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />

        <!-- Header -->
        <UiPageHeader :title="$t('licenses.versions.title', { product: productName })">
          <template #eyebrow>
            <div class="flex items-center gap-2 mb-2">
              <ProductIcon :product="product" :size="24" />
              <RouterLink :to="{ name: 'admin.license-manager.overview' }" class="text-ui-small text-ui-muted hover:text-ui-ink">{{ $t("licenses.title") }}</RouterLink>
              <span class="text-ui-faint">/</span>
              <span class="text-ui-small text-ui-ink font-medium truncate">{{ productName }}</span>
            </div>
          </template>
          <template #subtitle>
            {{ $t("licenses.versions.onSale") }}:
            <span class="font-mono font-medium text-ui-ink">{{ latestVersion || "—" }}</span>
            <span class="text-ui-faint mx-1">·</span>
            {{ $t("licenses.versions.lifetimeCoverNow") }}
            <span class="font-medium text-ui-ink">{{ productName }} {{ currentMajor ?? "—" }}.x</span>
          </template>
          <template #actions>
            <UiButton
              v-if="canListLicenses"
              variant="secondary"
              :icon="KeyRound"
              :to="{ name: 'admin.license-manager.licenses.dashboard', params: { product: productCode } }"
              class="flex-1 sm:flex-none"
            >
              {{ $t("licenses.licenses") }}
            </UiButton>
            <UiButton v-if="canCreate" :icon="Plus" class="flex-1 sm:flex-none" @click="openCreate">{{ $t("licenses.versions.new") }}</UiButton>
          </template>
        </UiPageHeader>

        <!-- KPI tiles -->
        <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 ui-stagger">
          <UiStat :label="$t('licenses.versions.onSale')" :value="latestVersion || '—'" :icon="Tag" :loading="!loadedOnce" />
          <UiStat :label="$t('licenses.versions.lifetimeCover')" :value="`${currentMajor ?? '—'}.x`" :icon="InfinityIcon" :loading="!loadedOnce" />
          <UiStat :label="$t('licenses.dashboard.versions')" :value="sortedReleases.length" :icon="Layers" :loading="!loadedOnce" />
          <UiStat :label="$t('licenses.versions.devicesReporting')" :value="plural(devicesReporting, 'device')" :hint="$t('licenses.versions.asReported')" :icon="Monitor" :loading="!loadedOnce" />
        </div>

        <!-- Versions in use -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2">
              <Monitor class="w-4 h-4 text-ui-faint" />
              <h2 class="text-ui-h3 text-ui-ink">{{ $t("licenses.versions.inUse") }}</h2>
            </div>
            <span class="text-ui-cap text-ui-muted">{{ $t("licenses.versions.asReported") }}</span>
          </div>
          <div v-if="!loadedOnce" class="flex flex-wrap gap-2">
            <Skeleton v-for="i in 3" :key="i" width="160px" height="30px" rounded="8px" />
          </div>
          <p v-else-if="!versionsInUse.length" class="text-ui-cap text-ui-muted">{{ $t("licenses.versions.noneReported") }}</p>
          <div v-else class="flex flex-wrap gap-2">
            <span
              v-for="item in versionsInUse"
              :key="`${item.version}-${item.platform}`"
              class="inline-flex items-center gap-1.5 h-8 px-3 rounded-ui-control border border-ui-line bg-ui-subtle/60 text-ui-cap"
            >
              <component :is="isIpadPlatform(item.platform) ? Tablet : Laptop" class="w-3.5 h-3.5 text-ui-faint" />
              <span class="font-mono font-medium text-ui-ink">{{ item.version }}</span>
              <span class="text-ui-faint">·</span>
              <span class="text-ui-muted">{{ platformLabel(item.platform) }}</span>
              <span class="text-ui-faint">·</span>
              <span class="font-medium text-ui-ink tabular-nums">{{ plural(item.devices ?? 0, "device") }}</span>
            </span>
          </div>
        </section>

        <!-- Filters + list -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
          <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-3">
            <div class="relative lg:w-[300px] shrink-0">
              <UiInput v-model="filters.search" :icon="Search" :placeholder="$t('licenses.versions.searchPlaceholder')" :aria-label="$t('licenses.versions.searchLabel')" />
              <button
                v-if="filters.search"
                type="button"
                @click="filters.search = ''"
                class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-hover hover:text-ui-ink"
                :aria-label="$t('licenses.dashboard.clearSearch')"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
            <div class="flex items-center gap-2 min-w-0 overflow-x-auto [scrollbar-width:none]">
              <UiChips v-model="filters.status" :options="STATUS_FILTERS" class="shrink-0" :aria-label="$t('licenses.dashboard.filterStatus')" />
              <div class="inline-flex items-center p-0.5 rounded-ui-control bg-ui-subtle shrink-0" role="tablist" :aria-label="$t('licenses.dashboard.filterPlatform')">
                <button
                  v-for="opt in PLATFORM_FILTERS"
                  :key="opt.value || 'all'"
                  type="button"
                  role="tab"
                  @click="filters.platform = opt.value"
                  class="h-7 px-3 rounded-[6px] text-ui-small font-medium whitespace-nowrap transition-colors"
                  :class="filters.platform === opt.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
                  :aria-selected="filters.platform === opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <button v-if="hasFilters" type="button" @click="clearFilters" class="lg:ml-auto self-start lg:self-auto text-ui-cap font-medium text-ui-accent hover:underline">
              {{ $t("common.actions.clearFilters") }}
            </button>
          </div>

          <!-- Loading -->
          <div v-if="!loadedOnce" class="divide-y divide-ui-line">
            <div v-for="i in 4" :key="i" class="px-5 py-4 space-y-2">
              <Skeleton width="30%" height="14px" />
              <Skeleton width="55%" height="10px" />
              <Skeleton width="40%" height="10px" />
            </div>
          </div>

          <!-- Empty -->
          <UiEmpty
            v-else-if="!sortedReleases.length"
            :icon="hasFilters ? SearchX : History"
            :title="hasFilters ? $t('licenses.versions.emptyFilteredTitle') : $t('licenses.versions.emptyTitle')"
            :message="hasFilters ? $t('licenses.dashboard.emptyFilteredMessage') : $t('licenses.versions.emptyMessage', { product: productName })"
          >
            <UiButton v-if="hasFilters" variant="secondary" :icon="X" @click="clearFilters">{{ $t("common.actions.clearFilters") }}</UiButton>
            <UiButton v-else-if="canCreate" :icon="Plus" @click="openCreate">{{ $t("licenses.versions.new") }}</UiButton>
          </UiEmpty>

          <!-- Numbered release list (newest first) -->
          <ol v-else class="divide-y divide-ui-line ui-stagger transition-opacity" :class="{ 'opacity-60': releasesLoading }">
            <li v-for="(release, index) in sortedReleases" :key="release.id" class="flex gap-3 px-4 sm:px-5 py-4">
              <span class="w-6 pt-1 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ index + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex flex-col md:flex-row md:items-start gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="font-mono text-ui-h3 text-ui-ink mr-0.5">{{ release.version }}</span>
                      <span v-if="release.build !== null && release.build !== undefined" class="text-ui-cap text-ui-muted font-mono mr-1">
                        ({{ release.build }})
                      </span>
                      <span class="inline-flex items-center h-[22px] px-2 rounded-md text-ui-cap font-medium" :class="KIND_CHIP[release.kind] || 'bg-ui-subtle text-ui-text'">
                        {{ KIND_BADGES[release.kind] || release.kind_label }}
                      </span>
                      <UiBadge :tone="release.status === 'published' ? 'ok' : 'neutral'" dot>
                        {{ release.status === "published" ? $t("licenses.releases.status.published") : $t("licenses.releases.status.draft") }}
                      </UiBadge>
                      <UiBadge v-if="release.is_critical" tone="bad"><AlertTriangle class="w-3 h-3" /> {{ $t("licenses.versions.critical") }}</UiBadge>
                      <span class="inline-flex items-center h-[22px] px-2 rounded-md text-ui-cap font-medium" :class="platformChipClass(release.platforms)">
                        {{ releasePlatformLabel(release.platforms) }}
                      </span>
                      <span class="inline-flex items-center gap-1 text-ui-cap text-ui-muted ml-1">
                        <CalendarDays class="w-3.5 h-3.5" />
                        {{ release.released_at ? formatReleaseDate(release.released_at) : $t("licenses.versions.unreleased") }}
                      </span>
                    </div>
                    <p v-if="release.title" class="text-ui-small font-medium text-ui-ink mt-1.5">{{ release.title }}</p>

                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-ui-cap text-ui-muted">
                      <span v-if="changeCountsLine(release.change_counts)">{{ changeCountsLine(release.change_counts) }}</span>
                      <span v-else class="text-ui-faint">{{ $t("licenses.versions.noChanges") }}</span>
                      <span class="tabular-nums">{{ $t("licenses.versions.covers", { count: plural(release.licenses_covered ?? 0, "license") }) }}</span>
                      <span v-if="release.licenses_needing_upgrade > 0" class="tabular-nums font-medium text-ui-warn">
                        {{ $t("licenses.versions.needUpgrade", { n: release.licenses_needing_upgrade }, release.licenses_needing_upgrade) }}
                      </span>
                      <span class="tabular-nums">{{ $t("licenses.versions.onThisVersion", { count: plural(release.devices_on_version ?? 0, "device") }) }}</span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-1 shrink-0">
                    <UiButton
                      v-if="canEdit && release.status === 'draft'"
                      variant="secondary"
                      size="sm"
                      :icon="Send"
                      :disabled="!canPublish(release)"
                      :title="canPublish(release) ? $t('licenses.versions.publishVersion') : publishNeedsFileMessage()"
                      @click="openPublish(release)"
                    >
                      {{ $t("licenses.versions.publish") }}
                    </UiButton>
                    <button
                      v-if="canEdit"
                      type="button"
                      @click="openEdit(release)"
                      class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-subtle hover:text-ui-ink"
                      :title="$t('licenses.versions.editVersion')"
                      :aria-label="$t('licenses.versions.editVersion')"
                    >
                      <Pencil class="w-4 h-4" />
                    </button>
                    <button
                      v-if="canDelete"
                      type="button"
                      @click="handleDelete(release)"
                      class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                      :title="$t('licenses.versions.deleteVersion')"
                      :aria-label="$t('licenses.versions.deleteVersion')"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p v-if="canEdit && release.status === 'draft' && !canPublish(release)" class="text-ui-cap text-ui-warn mt-1.5">
                  {{ publishNeedsFileMessage() }}
                </p>

                <!-- Installer -->
                <ReleaseInstaller :release="release" class="mt-3" @updated="replaceRelease" />

                <!-- Changes -->
                <button
                  v-if="release.changes?.length || release.notes || release.download_url"
                  type="button"
                  @click="toggle(release.id)"
                  class="mt-3 inline-flex items-center gap-1 text-ui-cap font-medium text-ui-accent hover:underline"
                  :aria-expanded="!!expanded[release.id]"
                >
                  <component :is="expanded[release.id] ? ChevronDown : ChevronRight" class="w-3.5 h-3.5" />
                  {{ expanded[release.id] ? $t("licenses.timeline.hideChanges") : $t("licenses.timeline.showChanges") }}
                </button>
                <div v-if="expanded[release.id]" class="mt-2 space-y-3 ui-anim-fade-up">
                  <div v-for="group in groupChanges(release.changes)" :key="group.value">
                    <p class="text-ui-over uppercase text-ui-muted mb-1.5">{{ group.label }}</p>
                    <ul class="space-y-1">
                      <li v-for="(change, i) in group.items" :key="i" class="flex items-start gap-2 text-ui-small text-ui-text">
                        <span class="mt-px shrink-0 inline-flex items-center h-5 px-1.5 rounded-md text-ui-cap font-medium" :class="group.chip">{{ group.label }}</span>
                        <span class="min-w-0">
                          <span v-if="change.area" class="text-ui-cap font-medium text-ui-muted mr-1">{{ change.area }}:</span>{{ change.text }}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div v-if="release.download_url || release.notes" class="space-y-1.5 text-ui-cap text-ui-muted border-t border-ui-line pt-2">
                    <p v-if="release.download_url" class="flex items-center gap-1.5 min-w-0">
                      <Link2 class="w-3.5 h-3.5 shrink-0" />
                      <a :href="release.download_url" target="_blank" rel="noopener noreferrer" class="text-ui-accent hover:underline truncate">{{ release.download_url }}</a>
                    </p>
                    <p v-if="release.notes" class="flex items-start gap-1.5">
                      <FileText class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span class="whitespace-pre-line"><span class="font-medium text-ui-text">{{ $t("licenses.versions.internal") }}</span> {{ release.notes }}</span>
                    </p>
                  </div>
                </div>
              </div>
            </li>
          </ol>
        </section>
      </div>

      <ReleaseFormModal
        :show="showForm"
        :release="editing"
        :product-name="productName"
        :areas="areas"
        @close="onFormClose"
        @saved="onSaved"
      />

      <!-- Publish: pick the release date -->
      <UiModal
        :open="!!publishing"
        size="sm"
        :persistent="publishSaving"
        :title="publishing ? $t('licenses.versions.publishTitle', { product: productName, version: publishing.version }) : ''"
        :description="$t('licenses.versions.publishDescription')"
        @update:open="onPublishOpenChange"
      >
        <form id="publish-form" novalidate @submit.prevent="confirmPublish" :aria-label="publishing ? $t('licenses.versions.publishAria', { version: publishing.version }) : undefined">
          <label for="publish-date" class="block text-ui-small font-medium text-ui-ink mb-1.5">
            {{ $t("licenses.releaseForm.releaseDate") }} <span class="text-ui-bad">*</span>
          </label>
          <div class="relative">
            <input
              id="publish-date"
              v-model="publishDate"
              type="date"
              class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
              :class="publishError ? 'border-ui-bad/50' : 'border-ui-line-strong'"
            />
          </div>
          <p v-if="publishError" class="text-ui-cap text-ui-bad mt-1.5">{{ publishError }}</p>
        </form>
        <template #footer>
          <UiButton variant="secondary" :disabled="publishSaving" class="flex-1 sm:flex-none" @click="publishing = null">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="publish-form" :icon="Send" :loading="publishSaving" class="flex-1 sm:flex-none">
            {{ publishSaving ? $t("licenses.versions.publishing") : $t("licenses.versions.publish") }}
          </UiButton>
        </template>
      </UiModal>
    </LicenseProductGate>
  </div>
</template>
