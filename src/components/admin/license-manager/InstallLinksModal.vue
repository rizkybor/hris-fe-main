<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Link2, Plus, Copy, Check, Ban, AlertTriangle, KeyRound, Tablet } from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SearchSelect from "@/components/admin/license-manager/SearchSelect.vue";
import { UiBadge, UiButton, UiInput, UiModal, UiSelect } from "@/components/ui";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { formatDateTime, validationErrors } from "@/components/admin/license-manager/licenseHelpers";
import { INSTALL_LINK_TONE } from "@/components/admin/license-manager/releaseHelpers";

// Single-use over-the-air install links for a version's iPad installer:
// one link installs the app on one iPad; another iPad needs a new link.
const props = defineProps({
  release: { type: Object, default: null },
  productName: { type: String, default: "" },
});
const emit = defineEmits(["close", "changed"]);

const { t } = useI18n();
const store = useLicenseManagerStore();
const alertModal = useAlertModalStore();

const canEdit = computed(() => can("license-release-edit"));
// The license picker reads the license list.
const canPickLicense = computed(() => can("license-manager-list"));

const open = computed({
  get: () => !!props.release,
  set: (value) => {
    if (!value) emit("close");
  },
});

const links = ref([]);
const info = ref({ app_url_https: true, default_days: 7, max_days: 30 });
const loading = ref(false);
const error = ref("");

const licenses = ref([]);
const licensesLoaded = ref(false);
const form = ref({ license_id: "", device_name: "", note: "", expires_in_days: 7 });
const errors = ref({});
const creating = ref(false);
const created = ref(null); // the link just made (URL shown on top)
const revoking = ref(null);

const EXPIRY_DAYS = [1, 3, 7, 14, 30];
const expiryOptions = computed(() =>
  EXPIRY_DAYS.filter((d) => d <= (info.value.max_days || 30)).map((d) => ({ value: d, label: t("licenses.installLinks.days", { n: d }, d) }))
);
const licenseOptions = computed(() => [
  { value: "", label: t("licenses.installLinks.noLicense") },
  ...licenses.value
    .filter((l) => l.is_active && l.status !== "expired")
    .map((l) => ({ value: l.id, label: `${l.licensee_name || "—"} · ${l.key}`, hint: l.key })),
]);

const load = async () => {
  if (!props.release) return;
  loading.value = true;
  error.value = "";
  try {
    const data = await store.fetchInstallLinks(props.release.id);
    links.value = data.links || [];
    info.value = { app_url_https: data.app_url_https, default_days: data.default_days, max_days: data.max_days };
  } catch (err) {
    error.value = errorMessage(err, t("licenses.installLinks.loadFailed"));
  } finally {
    loading.value = false;
  }
};

const loadLicenses = async () => {
  if (licensesLoaded.value || !canPickLicense.value) return;
  try {
    licenses.value = await store.fetchIpadLicenses();
  } catch {
    licenses.value = [];
  } finally {
    licensesLoaded.value = true;
  }
};

watch(
  () => props.release?.id,
  (id) => {
    created.value = null;
    errors.value = {};
    links.value = [];
    form.value = { license_id: "", device_name: "", note: "", expires_in_days: 7 };
    if (id) {
      load();
      if (canEdit.value) loadLicenses();
    }
  },
  { immediate: true }
);

const create = async () => {
  creating.value = true;
  errors.value = {};
  error.value = "";
  try {
    const payload = {
      license_id: form.value.license_id === "" ? null : Number(form.value.license_id),
      device_name: form.value.device_name.trim() || null,
      note: form.value.note.trim() || null,
      expires_in_days: Number(form.value.expires_in_days) || info.value.default_days,
    };
    created.value = await store.createInstallLink(props.release.id, payload);
    form.value = { ...form.value, license_id: "", device_name: "", note: "" };
    emit("changed");
    load();
  } catch (err) {
    const fieldErrors = validationErrors(err);
    errors.value = Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
    if (!Object.keys(fieldErrors).length) error.value = errorMessage(err, t("licenses.installLinks.createFailed"));
    else if (errors.value.release) error.value = errors.value.release;
  } finally {
    creating.value = false;
  }
};

const revoke = async (link) => {
  const ok = await alertModal.confirm(t("licenses.installLinks.revokeConfirm"), {
    title: t("licenses.installLinks.revokeTitle"),
    type: "danger",
    confirmText: t("licenses.installLinks.revoke"),
  });
  if (!ok) return;
  revoking.value = link.id;
  try {
    await store.revokeInstallLink(props.release.id, link.id);
    if (created.value?.id === link.id) created.value = null;
    emit("changed");
    await load();
  } catch (err) {
    error.value = errorMessage(err, t("licenses.installLinks.revokeFailed"));
  } finally {
    revoking.value = null;
  }
};

/* ---------- Copy ---------- */
const copiedId = ref(null);
let copyTimer = null;
const copy = async (id, url) => {
  try {
    await navigator.clipboard.writeText(url);
    copiedId.value = id;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copiedId.value = null), 1500);
  } catch (e) {
    console.error(e);
  }
};
onBeforeUnmount(() => clearTimeout(copyTimer));

const statusText = (link) => {
  if (link.status === "used") return t("licenses.installLinks.usedAt", { date: formatDateTime(link.used_at) });
  if (link.status === "revoked") return t("licenses.installLinks.revokedAt", { date: formatDateTime(link.revoked_at) });
  if (link.status === "expired") return t("licenses.installLinks.expiredAt", { date: formatDateTime(link.expires_at) });
  return t("licenses.installLinks.status.active");
};
</script>

<template>
  <UiModal
    v-model:open="open"
    size="lg"
    :title="release ? $t('licenses.installLinks.title', { product: productName, version: release.version }) : ''"
    :description="$t('licenses.installLinks.description')"
  >
    <div class="space-y-5">
      <p v-if="!info.app_url_https" class="flex items-start gap-2 rounded-ui-control bg-ui-bad-soft text-ui-bad text-ui-cap px-3 py-2">
        <AlertTriangle class="w-4 h-4 shrink-0 mt-px" /> {{ $t("licenses.installLinks.notHttps") }}
      </p>
      <p v-if="error" class="text-ui-cap text-ui-bad">{{ error }}</p>

      <!-- The link just made -->
      <div v-if="created?.url" class="rounded-ui-control border border-ui-ok/30 bg-ui-ok-soft px-3.5 py-3 space-y-2">
        <p class="text-ui-small font-semibold text-ui-ok">{{ $t("licenses.installLinks.created") }}</p>
        <div class="flex items-center gap-2 min-w-0">
          <span class="flex-1 min-w-0 truncate font-mono text-ui-cap text-ui-ink bg-ui-surface border border-ui-line rounded-ui-control px-2.5 py-1.5" :title="created.url">{{ created.url }}</span>
          <UiButton size="sm" :icon="copiedId === created.id ? Check : Copy" @click="copy(created.id, created.url)">
            {{ copiedId === created.id ? $t("common.actions.copied") : $t("common.actions.copy") }}
          </UiButton>
        </div>
        <p class="text-ui-cap text-ui-text">{{ $t("licenses.installLinks.sendHint") }}</p>
      </div>

      <!-- New link -->
      <form v-if="canEdit && release?.ipa" novalidate class="rounded-ui-control border border-ui-line px-3.5 py-3 space-y-3" @submit.prevent="create">
        <div class="grid sm:grid-cols-2 gap-3">
          <div v-if="canPickLicense" class="sm:col-span-2">
            <label for="install-link-license" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("licenses.installLinks.license") }}</label>
            <SearchSelect
              id="install-link-license"
              v-model="form.license_id"
              :options="licenseOptions"
              :icon="KeyRound"
              :loading="!licensesLoaded"
              :invalid="!!errors.license_id"
              :placeholder="$t('licenses.installLinks.noLicense')"
              :search-placeholder="$t('licenses.installLinks.searchLicense')"
            />
            <p v-if="errors.license_id" class="text-ui-cap text-ui-bad mt-1">{{ errors.license_id }}</p>
            <p v-else class="text-ui-cap text-ui-muted mt-1">{{ $t("licenses.installLinks.licenseHint") }}</p>
          </div>
          <UiInput v-model="form.device_name" :label="$t('licenses.installLinks.deviceName')" :placeholder="$t('licenses.installLinks.deviceNamePlaceholder')" :error="errors.device_name" />
          <UiSelect v-model="form.expires_in_days" :options="expiryOptions" :label="$t('licenses.installLinks.expiresIn')" :error="errors.expires_in_days" />
          <div class="sm:col-span-2">
            <UiInput v-model="form.note" :label="$t('licenses.installLinks.note')" :placeholder="$t('licenses.installLinks.notePlaceholder')" :error="errors.note" />
          </div>
        </div>
        <div class="flex justify-end">
          <UiButton type="submit" :icon="Plus" :loading="creating">{{ $t("licenses.installLinks.create") }}</UiButton>
        </div>
      </form>
      <p v-else-if="!release?.ipa" class="text-ui-cap text-ui-warn">{{ $t("licenses.installLinks.needsIpa") }}</p>

      <!-- Links -->
      <section>
        <h4 class="text-ui-h3 text-ui-ink mb-2">{{ $t("licenses.installLinks.list") }}</h4>
        <div v-if="loading && !links.length" class="space-y-2">
          <Skeleton v-for="i in 2" :key="i" width="100%" height="44px" rounded="8px" />
        </div>
        <p v-else-if="!links.length" class="text-ui-cap text-ui-muted">{{ $t("licenses.installLinks.empty") }}</p>
        <ul v-else class="divide-y divide-ui-line border border-ui-line rounded-ui-control">
          <li v-for="link in links" :key="link.id" class="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
            <div class="flex-1 min-w-0 space-y-0.5">
              <div class="flex flex-wrap items-center gap-1.5">
                <UiBadge :tone="INSTALL_LINK_TONE[link.status] || 'neutral'" dot>{{ statusText(link) }}</UiBadge>
                <span v-if="link.device_name" class="inline-flex items-center gap-1 text-ui-small text-ui-ink font-medium">
                  <Tablet class="w-3.5 h-3.5 text-ui-faint" /> {{ link.device_name }}
                </span>
                <span v-if="link.license" class="text-ui-cap text-ui-muted">
                  {{ link.license.licensee_name }} · <span class="font-mono">{{ link.license.key }}</span>
                </span>
              </div>
              <p class="text-ui-cap text-ui-muted">
                {{ $t("licenses.installLinks.createdBy", { date: formatDateTime(link.created_at), name: link.created_by?.name || "—" }) }}
                <template v-if="link.status === 'active'"> · {{ $t("licenses.installLinks.expiresAt", { date: formatDateTime(link.expires_at) }) }}</template>
                <template v-if="link.status === 'used' && link.used_ip"> · {{ link.used_ip }}</template>
              </p>
              <p v-if="link.note" class="text-ui-cap text-ui-text">{{ link.note }}</p>
              <p v-if="link.status === 'active' && link.url" class="font-mono text-ui-cap text-ui-muted truncate" :title="link.url">{{ link.url }}</p>
            </div>
            <div v-if="link.status === 'active'" class="flex items-center gap-1.5 shrink-0">
              <UiButton v-if="link.url" variant="secondary" size="sm" :icon="copiedId === link.id ? Check : Link2" @click="copy(link.id, link.url)">
                {{ copiedId === link.id ? $t("common.actions.copied") : $t("common.actions.copy") }}
              </UiButton>
              <UiButton v-if="canEdit" variant="danger" size="sm" :icon="Ban" :loading="revoking === link.id" @click="revoke(link)">
                {{ $t("licenses.installLinks.revoke") }}
              </UiButton>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </UiModal>
</template>
