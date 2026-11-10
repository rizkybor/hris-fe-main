<script setup>
// Versions of one product's app: what is on sale, which versions the apps
// report, and the release history (changelog) with its installers.
// Permissions (own module): license-release-menu / -list / -view (page),
// -create (new version), -edit (edit, publish, installer), -delete,
// -download (installer).
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
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
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
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
  PUBLISH_NEEDS_FILE,
  releasePlatformLabel,
  changeCountsLine,
  groupChanges,
  formatReleaseDate,
  todayInput,
  needsFile,
} from "@/components/admin/license-manager/releaseHelpers";

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
    error.value = errorMessage(err, "Failed to load the versions.");
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
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
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
  flash(wasEdit ? `Version ${saved.version} saved.` : `Version ${saved.version} added.`);
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
    publishError.value = "Pick the release date.";
    return;
  }
  publishSaving.value = true;
  publishError.value = "";
  try {
    const updated = await store.updateRelease(publishing.value.id, { status: "published", released_at: publishDate.value });
    flash(`Version ${updated.version} published.`);
    publishing.value = null;
    load();
  } catch (err) {
    const errors = validationErrors(err);
    const first = Object.values(errors).flat()[0];
    publishError.value = first || errorMessage(err, "Failed to publish the version.");
  } finally {
    publishSaving.value = false;
  }
};

/* ---------- Delete ---------- */
const handleDelete = async (release) => {
  const ok = await alertModal.confirm(
    `Delete version ${release.version}${release.file ? " and its installer" : ""}? This action cannot be undone.`,
    { title: "Delete Version", type: "danger", confirmText: "Delete" }
  );
  if (!ok) return;
  try {
    await store.deleteRelease(release.id);
    flash(`Version ${release.version} deleted.`);
    load();
  } catch (err) {
    await alertModal.alert(errorMessage(err, "Failed to delete the version."), { type: "danger" });
  }
};

const primaryBtn =
  "rounded-[12px] border border-violet-800 hover:brightness-110 focus:ring-2 focus:ring-violet-500 transition-all duration-300 px-4 py-2.5 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-700 shadow-[inset_-2px_2px_1px_0_rgba(167,139,250,0.55),inset_2px_2px_1px_0_rgba(167,139,250,0.35)] text-white text-sm font-semibold";
const secondaryBtn =
  "rounded-[12px] border border-[#DCDEDD] bg-white hover:border-violet-400 hover:bg-violet-50/40 transition-all duration-300 px-4 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-brand-dark shadow-sm";
const iconBtn =
  "flex justify-center items-center w-8 h-8 border border-[#DCDEDD] bg-white rounded-lg hover:border-violet-400 hover:ring-2 hover:ring-violet-400/30 transition-all disabled:opacity-40 disabled:hover:ring-0 disabled:hover:border-[#DCDEDD]";
const pill = (active) =>
  active ? "bg-white text-brand-dark shadow-sm" : "text-brand-light hover:text-brand-dark";
</script>

<template>
  <div class="px-4 py-4">
    <LicenseProductGate :state="productState" :code="productCode" :product-name="productName">
      <Transition name="fade">
        <Alert v-if="success" type="success" :title="success" message="" :show="!!success" @close="success = ''" />
      </Transition>
      <Transition name="fade">
        <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />
      </Transition>

      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="flex items-center gap-3.5 min-w-0">
            <ProductIcon :product="product" :size="48" class="shadow-sm" />
            <div class="min-w-0">
              <h1 class="text-brand-dark text-xl font-bold leading-tight truncate">{{ productName }} Versions</h1>
              <p class="text-brand-light text-sm mt-0.5">
                Current version on sale:
                <span class="font-mono font-semibold text-brand-dark">{{ latestVersion || "—" }}</span>
                <span class="text-gray-300 mx-1">·</span>
                Lifetime licenses sold now cover
                <span class="font-semibold text-brand-dark">{{ productName }} {{ currentMajor ?? "—" }}.x</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2.5 w-full md:w-auto">
            <RouterLink
              v-if="canListLicenses"
              :to="{ name: 'admin.license-manager.licenses.dashboard', params: { product: productCode } }"
              :class="[secondaryBtn, 'flex-1 md:flex-none']"
            >
              <KeyRound class="w-4 h-4 text-gray-500" />
              Licenses
            </RouterLink>
            <button v-if="canCreate" type="button" @click="openCreate" :class="[primaryBtn, 'flex-1 md:flex-none']">
              <Plus class="w-4 h-4" />
              New version
            </button>
          </div>
        </div>

        <!-- Versions in use -->
        <div class="bg-white border border-[#DCDEDD] rounded-[16px] shadow-sm px-5 py-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2">
              <Monitor class="w-4 h-4 text-violet-500" />
              <h2 class="text-sm font-bold text-brand-dark">Versions in use</h2>
            </div>
            <span class="text-xs text-brand-light">As reported by the apps</span>
          </div>
          <div v-if="!loadedOnce" class="flex flex-wrap gap-2">
            <Skeleton v-for="i in 3" :key="i" width="160px" height="30px" rounded="999px" />
          </div>
          <p v-else-if="!versionsInUse.length" class="text-xs text-brand-light">No device has reported a version yet.</p>
          <div v-else class="flex flex-wrap gap-2">
            <span
              v-for="item in versionsInUse"
              :key="`${item.version}-${item.platform}`"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#DCDEDD] bg-slate-50 text-xs"
            >
              <component :is="isIpadPlatform(item.platform) ? Tablet : Laptop" class="w-3.5 h-3.5 text-gray-500" />
              <span class="font-mono font-bold text-brand-dark">{{ item.version }}</span>
              <span class="text-gray-300">·</span>
              <span class="text-brand-light">{{ platformLabel(item.platform) }}</span>
              <span class="text-gray-300">·</span>
              <span class="font-semibold text-brand-dark tabular-nums">{{ plural(item.devices ?? 0, "device") }}</span>
            </span>
          </div>
        </div>

        <!-- Filters + list -->
        <div class="bg-white border border-[#DCDEDD] rounded-[16px] shadow-sm">
          <div class="p-4 sm:p-5 border-b border-[#F1F1F1] flex flex-col lg:flex-row lg:items-center gap-3">
            <div class="relative flex-1 min-w-0">
              <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 pointer-events-none" />
              <input
                v-model="filters.search"
                type="text"
                placeholder="Search version, title or change..."
                class="w-full pl-11 pr-9 py-2.5 text-sm border border-[#DCDEDD] rounded-[12px] hover:border-violet-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all duration-300 font-medium"
              />
              <button
                v-if="filters.search"
                type="button"
                @click="filters.search = ''"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100"
                aria-label="Clear search"
              >
                <X class="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-1 p-0.5 rounded-full bg-slate-100" role="group" aria-label="Filter by status">
                <button
                  v-for="opt in [{ value: '', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]"
                  :key="opt.value || 'all'"
                  type="button"
                  @click="filters.status = opt.value"
                  class="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  :class="pill(filters.status === opt.value)"
                  :aria-pressed="filters.status === opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
              <div class="flex items-center gap-1 p-0.5 rounded-full bg-slate-100" role="group" aria-label="Filter by platform">
                <button
                  v-for="opt in [{ value: '', label: 'All platforms' }, { value: 'mac', label: 'Mac' }, { value: 'ipad', label: 'iPad' }]"
                  :key="opt.value || 'all'"
                  type="button"
                  @click="filters.platform = opt.value"
                  class="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  :class="pill(filters.platform === opt.value)"
                  :aria-pressed="filters.platform === opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
              <button v-if="hasFilters" type="button" @click="clearFilters" class="text-xs font-semibold text-violet-600 hover:text-violet-700 px-1">
                Clear filters
              </button>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="!loadedOnce" class="divide-y divide-[#F1F1F1]">
            <div v-for="i in 4" :key="i" class="px-5 py-4 space-y-2">
              <Skeleton width="30%" height="14px" />
              <Skeleton width="55%" height="10px" />
              <Skeleton width="40%" height="10px" />
            </div>
          </div>

          <!-- Empty -->
          <div v-else-if="!sortedReleases.length" class="text-center px-6 py-16">
            <div class="relative w-20 h-20 mx-auto mb-5">
              <div class="absolute inset-0 rounded-[24px] bg-gradient-to-br from-violet-100 to-indigo-50 rotate-6"></div>
              <div class="absolute inset-0 rounded-[24px] bg-white border border-[#DCDEDD] shadow-sm flex items-center justify-center">
                <component :is="hasFilters ? SearchX : History" class="w-9 h-9 text-violet-500" />
              </div>
            </div>
            <h3 class="text-brand-dark text-base font-bold mb-1">{{ hasFilters ? "No matching versions" : "No versions yet" }}</h3>
            <p class="text-brand-light text-sm mb-5">
              {{ hasFilters ? "Try another search term or clear the filters." : `Add the first ${productName} version and its release notes.` }}
            </p>
            <button v-if="hasFilters" type="button" @click="clearFilters" :class="secondaryBtn">
              <X class="w-4 h-4" /> Clear filters
            </button>
            <button v-else-if="canCreate" type="button" @click="openCreate" :class="primaryBtn">
              <Plus class="w-4 h-4" /> New version
            </button>
          </div>

          <!-- Timeline -->
          <ol v-else class="divide-y divide-[#F1F1F1]" :class="{ 'opacity-60': releasesLoading }">
            <li v-for="release in sortedReleases" :key="release.id" class="px-4 sm:px-5 py-4">
              <div class="flex flex-col md:flex-row md:items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-mono text-base font-bold text-brand-dark mr-1">{{ release.version }}</span>
                    <span v-if="release.build !== null && release.build !== undefined" class="text-[11px] text-brand-light font-mono mr-1">
                      ({{ release.build }})
                    </span>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="KIND_CHIP[release.kind] || 'bg-gray-100 text-gray-600'">
                      {{ KIND_BADGES[release.kind] || release.kind_label }}
                    </span>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="RELEASE_STATUS_CHIP[release.status]">
                      {{ release.status === "published" ? "Published" : "Draft" }}
                    </span>
                    <span v-if="release.is_critical" class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                      <AlertTriangle class="w-3 h-3" /> Critical
                    </span>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full" :class="platformChipClass(release.platforms)">
                      {{ releasePlatformLabel(release.platforms) }}
                    </span>
                    <span class="inline-flex items-center gap-1 text-xs text-brand-light ml-1">
                      <CalendarDays class="w-3.5 h-3.5" />
                      {{ release.released_at ? formatReleaseDate(release.released_at) : "Unreleased" }}
                    </span>
                  </div>
                  <p v-if="release.title" class="text-sm font-semibold text-brand-dark mt-1.5">{{ release.title }}</p>

                  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-brand-light">
                    <span v-if="changeCountsLine(release.change_counts)">{{ changeCountsLine(release.change_counts) }}</span>
                    <span v-else class="text-gray-400">No changes listed</span>
                    <span class="tabular-nums">Covers {{ plural(release.licenses_covered ?? 0, "license") }}</span>
                    <span v-if="release.licenses_needing_upgrade > 0" class="tabular-nums font-semibold text-amber-700">
                      {{ release.licenses_needing_upgrade }} Lifetime license{{ release.licenses_needing_upgrade === 1 ? " needs" : "s need" }} an upgrade
                    </span>
                    <span class="tabular-nums">{{ plural(release.devices_on_version ?? 0, "device") }} on this version</span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    v-if="canEdit && release.status === 'draft'"
                    type="button"
                    @click="openPublish(release)"
                    :disabled="!canPublish(release)"
                    :title="canPublish(release) ? 'Publish version' : PUBLISH_NEEDS_FILE"
                    class="inline-flex items-center gap-1.5 h-8 px-3 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:border-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-emerald-200"
                  >
                    <Send class="w-3.5 h-3.5" /> Publish
                  </button>
                  <button v-if="canEdit" type="button" @click="openEdit(release)" :class="iconBtn" title="Edit version" aria-label="Edit version">
                    <Pencil class="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    v-if="canDelete"
                    type="button"
                    @click="handleDelete(release)"
                    :class="iconBtn"
                    class="hover:bg-red-50 group/del"
                    title="Delete version"
                    aria-label="Delete version"
                  >
                    <Trash2 class="w-4 h-4 text-gray-600 group-hover/del:text-red-600" />
                  </button>
                </div>
              </div>

              <p
                v-if="canEdit && release.status === 'draft' && !canPublish(release)"
                class="text-[11px] text-amber-700 mt-1.5"
              >
                {{ PUBLISH_NEEDS_FILE }}
              </p>

              <!-- Installer -->
              <ReleaseInstaller :release="release" class="mt-3" @updated="replaceRelease" />

              <!-- Changes -->
              <button
                v-if="release.changes?.length || release.notes || release.download_url"
                type="button"
                @click="toggle(release.id)"
                class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
                :aria-expanded="!!expanded[release.id]"
              >
                <component :is="expanded[release.id] ? ChevronDown : ChevronRight" class="w-3.5 h-3.5" />
                {{ expanded[release.id] ? "Hide changes" : "Show changes" }}
              </button>
              <div v-if="expanded[release.id]" class="mt-2 space-y-3">
                <div v-for="group in groupChanges(release.changes)" :key="group.value">
                  <p class="text-[11px] font-bold uppercase tracking-wide text-brand-light mb-1.5">{{ group.label }}</p>
                  <ul class="space-y-1">
                    <li v-for="(change, i) in group.items" :key="i" class="flex items-start gap-2 text-sm text-brand-dark">
                      <span class="mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" :class="group.chip">{{ group.label }}</span>
                      <span class="min-w-0">
                        <span v-if="change.area" class="text-xs font-semibold text-brand-light mr-1">{{ change.area }}:</span>{{ change.text }}
                      </span>
                    </li>
                  </ul>
                </div>
                <div v-if="release.download_url || release.notes" class="space-y-1.5 text-xs text-brand-light border-t border-[#F1F1F1] pt-2">
                  <p v-if="release.download_url" class="flex items-center gap-1.5 min-w-0">
                    <Link2 class="w-3.5 h-3.5 shrink-0" />
                    <a :href="release.download_url" target="_blank" rel="noopener noreferrer" class="text-violet-700 hover:underline truncate">{{ release.download_url }}</a>
                  </p>
                  <p v-if="release.notes" class="flex items-start gap-1.5">
                    <FileText class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span class="whitespace-pre-line"><span class="font-semibold">Internal:</span> {{ release.notes }}</span>
                  </p>
                </div>
              </div>
            </li>
          </ol>
        </div>
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
      <Teleport to="body">
        <div
          v-if="publishing"
          class="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4"
          @click.self="!publishSaving && (publishing = null)"
        >
          <form
            novalidate
            @submit.prevent="confirmPublish"
            class="bg-white rounded-[16px] border border-[#DCDEDD] w-full max-w-md overflow-hidden"
            role="dialog"
            aria-modal="true"
            :aria-label="`Publish version ${publishing.version}`"
          >
            <div class="flex items-center gap-3 px-6 py-4 border-b border-[#DCDEDD]">
              <div class="w-10 h-10 bg-emerald-50 rounded-[12px] flex items-center justify-center">
                <CalendarCheck class="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 class="text-brand-dark text-lg font-bold leading-tight">Publish {{ productName }} {{ publishing.version }}</h3>
                <p class="text-xs text-brand-light">The apps will see it in their version history.</p>
              </div>
            </div>
            <div class="px-6 py-5">
              <label for="publish-date" class="block text-brand-dark text-sm font-semibold mb-1.5">
                Release Date <span class="text-red-500">*</span>
              </label>
              <div>
                <input
                  id="publish-date"
                  v-model="publishDate"
                  type="date"
                  class="w-full px-4 py-3 border rounded-[12px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-semibold bg-white"
                  :class="publishError ? 'border-red-500' : 'border-[#DCDEDD]'"
                />
              </div>
              <p v-if="publishError" class="text-xs text-red-600 mt-1.5">{{ publishError }}</p>
            </div>
            <div class="flex justify-end gap-3 px-6 py-4 border-t border-[#DCDEDD] bg-slate-50">
              <button
                type="button"
                @click="publishing = null"
                :disabled="publishSaving"
                class="border border-[#DCDEDD] bg-white rounded-[12px] px-5 py-2.5 text-sm font-semibold text-brand-dark hover:border-violet-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="publishSaving"
                class="rounded-[12px] border border-violet-800 bg-gradient-to-r from-violet-600 to-indigo-700 px-5 py-2.5 flex items-center gap-2 disabled:opacity-50"
              >
                <Send class="w-4 h-4 text-white" />
                <span class="text-white text-sm font-semibold">{{ publishSaving ? "Publishing..." : "Publish" }}</span>
              </button>
            </div>
          </form>
        </div>
      </Teleport>
    </LicenseProductGate>
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
