<script setup>
import { useCompanyAboutStore } from "@/stores/companyAbout";
import { ref, reactive, computed, onMounted } from "vue";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiModal, UiInput, UiEmpty, UiBadge } from "@/components/ui";
import { can } from "@/helpers/permissionHelper";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import {
  Building2,
  Pencil,
  Plus,
  Target,
  Flag,
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  Network,
  Type,
  FileText,
  Save,
  Hash,
} from "lucide-vue-next";

// Pinia store
const { t } = useI18n();
const companyStore = useCompanyAboutStore();
const { company, loading, success, error } = storeToRefs(companyStore);

// Fetch company on mount
onMounted(() => companyStore.fetchCompany());

// --- Clean mission jadi array
const cleanedMission = computed(() => {
  const mission = company.value?.mission;
  if (!mission) return [];

  let missionArray = [];
  try {
    missionArray = Array.isArray(mission) ? mission : JSON.parse(mission);
  } catch {
    missionArray = [mission];
  }

  return missionArray.map((m) => String(m).replace(/\s+/g, " ").trim());
});

// --- Clean branches jadi array
const cleanedBranches = computed(() => {
  const branches = company.value?.branches;
  if (!branches) return [];

  let branchesArray = [];
  try {
    branchesArray = Array.isArray(branches) ? branches : JSON.parse(branches);
  } catch {
    branchesArray = [branches];
  }

  return branchesArray.map((b) => String(b).replace(/\s+/g, " ").trim());
});

// Format tanggal
const formattedDate = computed(() =>
  company.value?.established_date
    ? new Date(company.value.established_date).toLocaleDateString(localeTag(), {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-"
);

const overviewItems = computed(() => [
  { key: "established", icon: CalendarDays, label: t("company.fields.established"), value: formattedDate.value },
  { key: "npwp", icon: Hash, label: t("company.fields.npwp"), value: company.value?.npwp },
  { key: "email", icon: Mail, label: t("common.labels.email"), value: company.value?.email },
  { key: "phone", icon: Phone, label: t("common.labels.phone"), value: company.value?.phone },
  { key: "address", icon: MapPin, label: t("common.labels.address"), value: company.value?.address, wide: true },
]);

// --- Modal state
const showModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);

// Form reactive
const form = reactive({
  name: "",
  legal_name: "",
  npwp: "",
  description: "",
  vision: "",
  mission: "",
  established_date: "",
  address: "",
  email: "",
  phone: "",
  branches: "",
});

// --- Open modal create/edit
const openModal = (edit = false) => {
  isEditing.value = edit;

  if (edit && company.value) {
    form.name = company.value.name || "";
    form.legal_name = company.value.legal_name || "";
    form.npwp = company.value.npwp || "";
    form.description = company.value.description || "";
    form.vision = company.value.vision || "";
    form.mission = Array.isArray(company.value.mission)
      ? company.value.mission.join("\n")
      : company.value.mission || "";
    form.established_date = company.value.established_date || "";
    form.address = company.value.address || "";
    form.email = company.value.email || "";
    form.phone = company.value.phone || "";
    form.branches = Array.isArray(company.value.branches)
      ? company.value.branches.join("\n")
      : company.value.branches || "";
  } else {
    form.name = "";
    form.legal_name = "";
    form.npwp = "";
    form.description = "";
    form.vision = "";
    form.mission = "";
    form.established_date = "";
    form.address = "";
    form.email = "";
    form.phone = "";
    form.branches = "";
  }

  showModal.value = true;
};

// --- Save company
const saveCompany = async () => {
  const payload = {
    name: form.name || null,
    legal_name: form.legal_name || null,
    npwp: form.npwp || null,
    description: form.description || null,
    vision: form.vision || null,
    mission: form.mission
      ? form.mission.split("\n").map((m) => m.trim()).filter(Boolean)
      : [],
    branches: form.branches
      ? form.branches.split("\n").map((b) => b.trim()).filter(Boolean)
      : [],
    established_date: form.established_date || null,
    address: form.address || null,
    email: form.email || null,
    phone: form.phone || null,
  };

  saving.value = true;
  try {
    if (isEditing.value && company.value) {
      await companyStore.updateCompany(company.value.id, payload);
    } else {
      await companyStore.createCompany(payload);
    }
    showModal.value = false;
    await companyStore.fetchCompany();
  } catch (err) {
    console.error(err);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <!-- Alerts -->
    <Alert type="success" :title="success" :show="!!success" />
    <Alert type="error" :title="error" :show="!!error" />

    <!-- Page Header -->
    <UiPageHeader :title="$t('company.title')" :subtitle="$t('company.subtitle')">
      <template #actions>
        <UiButton v-if="can('company-about-edit') && company" :icon="Pencil" class="w-full sm:w-auto" @click="openModal(true)">
          {{ $t("common.actions.edit") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 lg:col-span-2 space-y-3">
        <div class="flex items-center gap-4">
          <Skeleton width="56px" height="56px" rounded="12px" />
          <div class="flex-1 space-y-2">
            <Skeleton width="50%" height="18px" />
            <Skeleton width="30%" height="12px" />
          </div>
        </div>
        <Skeleton width="100%" height="12px" />
        <Skeleton width="85%" height="12px" />
      </div>
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 space-y-3">
        <Skeleton width="40%" height="14px" />
        <Skeleton width="100%" height="12px" />
        <Skeleton width="80%" height="12px" />
        <Skeleton width="70%" height="12px" />
      </div>
    </div>

    <!-- Company Content -->
    <div v-else-if="company" class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-start ui-stagger">
      <!-- Overview -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card lg:col-span-2 min-w-0">
        <div class="p-5 sm:p-6 flex items-start gap-4">
          <div class="w-14 h-14 bg-ui-surface border border-ui-line rounded-ui-card flex items-center justify-center shrink-0">
            <img src="/images/jcd-only-color.png" :alt="$t('company.logoAlt')" class="w-9 h-9 object-contain" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-ui-h1 text-ui-ink truncate">{{ company.name || "-" }}</h2>
            <p v-if="company.legal_name" class="text-ui-small text-ui-muted truncate mt-0.5">{{ company.legal_name }}</p>
            <p
              v-if="company.description"
              :title="company.description"
              class="text-ui-body text-ui-text mt-3 line-clamp-3"
            >
              {{ company.description }}
            </p>
          </div>
        </div>

        <dl class="border-t border-ui-line px-5 sm:px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div v-for="item in overviewItems"
            :key="item.key"
            class="flex items-start gap-3 min-w-0"
            :class="item.wide ? 'sm:col-span-2' : ''"
          >
            <div class="w-8 h-8 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0">
              <component :is="item.icon" class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <dt class="text-ui-cap text-ui-muted">{{ item.label }}</dt>
              <dd class="text-ui-body text-ui-ink break-words">{{ item.value || "-" }}</dd>
            </div>
          </div>
        </dl>
      </section>

      <!-- Vision -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
        <div class="flex items-center gap-2.5 mb-3">
          <Target class="w-4 h-4 text-ui-muted" />
          <h3 class="text-ui-h3 text-ui-ink">{{ $t("company.vision") }}</h3>
        </div>
        <p class="text-ui-body text-ui-text whitespace-pre-line">{{ company.vision || "-" }}</p>
      </section>

      <!-- Mission -->
      <section v-if="cleanedMission.length" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 lg:col-span-2 min-w-0">
        <div class="flex items-center gap-2.5 mb-3">
          <Flag class="w-4 h-4 text-ui-muted" />
          <h3 class="text-ui-h3 text-ui-ink">{{ $t("company.mission") }}</h3>
          <UiBadge class="ml-auto">{{ cleanedMission.length }}</UiBadge>
        </div>
        <ol class="divide-y divide-ui-line">
          <li v-for="(m, index) in cleanedMission" :key="index" class="flex gap-3 py-2.5 first:pt-0 last:pb-0 text-ui-body text-ui-text">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 shrink-0 pt-0.5">{{ index + 1 }}</span>
            <span class="min-w-0">{{ m }}</span>
          </li>
        </ol>
      </section>

      <!-- Branches -->
      <section v-if="cleanedBranches.length" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0" :class="cleanedMission.length ? '' : 'lg:col-span-2'">
        <div class="flex items-center gap-2.5 mb-3">
          <Network class="w-4 h-4 text-ui-muted" />
          <h3 class="text-ui-h3 text-ui-ink">{{ $t("company.branches") }}</h3>
          <UiBadge class="ml-auto">{{ cleanedBranches.length }}</UiBadge>
        </div>
        <ul class="divide-y divide-ui-line">
          <li v-for="(b, index) in cleanedBranches" :key="index" class="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0 text-ui-body text-ui-text">
            <Building2 class="w-4 h-4 text-ui-faint shrink-0 mt-0.5" />
            <span class="min-w-0">{{ b }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="Building2" :title="$t('company.empty.title')" :message="$t('company.empty.message')">
        <UiButton v-if="can('company-about-edit')" :icon="Plus" @click="openModal(false)">{{ $t("company.modal.addTitle") }}</UiButton>
      </UiEmpty>
    </div>

    <!-- Create/Edit Modal -->
    <UiModal
      v-model:open="showModal"
      size="lg"
      :title="isEditing ? $t('company.modal.editTitle') : $t('company.modal.addTitle')"
    >
      <form id="company-about-form" class="space-y-6" @submit.prevent="saveCompany">
        <!-- Identity -->
        <fieldset class="space-y-4">
          <legend class="sr-only">{{ $t("company.modal.identity") }}</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted">
            <Type class="w-3.5 h-3.5" />{{ $t("company.modal.identity") }}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.name" :label="$t('common.labels.name')" :icon="Building2" class="sm:col-span-2" />
            <UiInput v-model="form.description" :label="$t('common.labels.description')" :rows="2" class="sm:col-span-2" />
            <UiInput v-model="form.legal_name" :label="$t('company.fields.legalNameOptional')" placeholder="PT ..." />
            <UiInput v-model="form.npwp" :label="$t('company.fields.npwpOptional')" placeholder="00.000.000.0-000.000" />
          </div>
        </fieldset>

        <!-- Vision & Mission -->
        <fieldset class="space-y-4 pt-5 border-t border-ui-line">
          <legend class="sr-only">{{ $t("company.modal.visionMission") }}</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted">
            <Target class="w-3.5 h-3.5" />{{ $t("company.modal.visionMission") }}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.vision" :label="$t('company.vision')" :rows="3" />
            <UiInput v-model="form.mission" :label="$t('company.fields.missionPerLine')" :rows="3" :placeholder="$t('company.fields.missionPlaceholder')" />
          </div>
        </fieldset>

        <!-- Contact -->
        <fieldset class="space-y-4 pt-5 border-t border-ui-line">
          <legend class="sr-only">{{ $t("company.modal.contact") }}</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted">
            <Phone class="w-3.5 h-3.5" />{{ $t("company.modal.contact") }}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.established_date" type="date" :label="$t('company.fields.establishedDate')" :icon="CalendarDays" />
            <UiInput v-model="form.phone" :label="$t('common.labels.phone')" :icon="Phone" />
            <UiInput v-model="form.address" :label="$t('common.labels.address')" :icon="MapPin" class="sm:col-span-2" />
            <UiInput v-model="form.email" type="email" :label="$t('common.labels.email')" :icon="Mail" class="sm:col-span-2" />
          </div>
        </fieldset>

        <!-- Branches -->
        <fieldset class="space-y-4 pt-5 border-t border-ui-line">
          <legend class="sr-only">{{ $t("company.branches") }}</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted">
            <Network class="w-3.5 h-3.5" />{{ $t("company.branches") }}
          </p>
          <UiInput v-model="form.branches" :rows="3" :placeholder="$t('company.fields.branchesPlaceholder')" :aria-label="$t('company.branches')" />
        </fieldset>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="showModal = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton :icon="Save" :loading="saving" @click="saveCompany">{{ saving ? $t("common.actions.saving") : $t("common.actions.save") }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>
