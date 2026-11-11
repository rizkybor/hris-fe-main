<script setup>
import { useCompanyAboutStore } from "@/stores/companyAbout";
import { ref, reactive, computed, onMounted } from "vue";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiModal, UiInput, UiEmpty, UiBadge } from "@/components/ui";
import { can } from "@/helpers/permissionHelper";
import { storeToRefs } from "pinia";
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
    ? new Date(company.value.established_date).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-"
);

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
    <UiPageHeader title="Company About" subtitle="Company profile shown across the system">
      <template #actions>
        <UiButton v-if="can('company-about-edit') && company" :icon="Pencil" class="w-full sm:w-auto" @click="openModal(true)">
          Edit
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
            <img src="/images/jcd-only-color.png" alt="Company Logo" class="w-9 h-9 object-contain" />
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
          <div v-for="item in [
              { icon: CalendarDays, label: 'Established', value: formattedDate },
              { icon: Hash, label: 'NPWP', value: company.npwp },
              { icon: Mail, label: 'Email', value: company.email },
              { icon: Phone, label: 'Phone', value: company.phone },
              { icon: MapPin, label: 'Address', value: company.address, wide: true },
            ]"
            :key="item.label"
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
          <h3 class="text-ui-h3 text-ui-ink">Vision</h3>
        </div>
        <p class="text-ui-body text-ui-text whitespace-pre-line">{{ company.vision || "-" }}</p>
      </section>

      <!-- Mission -->
      <section v-if="cleanedMission.length" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 lg:col-span-2 min-w-0">
        <div class="flex items-center gap-2.5 mb-3">
          <Flag class="w-4 h-4 text-ui-muted" />
          <h3 class="text-ui-h3 text-ui-ink">Mission</h3>
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
          <h3 class="text-ui-h3 text-ui-ink">Sub-companies / Branches</h3>
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
      <UiEmpty :icon="Building2" title="No company data yet" message="Add your company profile so it appears across the system.">
        <UiButton v-if="can('company-about-edit')" :icon="Plus" @click="openModal(false)">Add Company Information</UiButton>
      </UiEmpty>
    </div>

    <!-- Create/Edit Modal -->
    <UiModal
      v-model:open="showModal"
      size="lg"
      :title="isEditing ? 'Edit Company Information' : 'Add Company Information'"
    >
      <form id="company-about-form" class="space-y-6" @submit.prevent="saveCompany">
        <!-- Identity -->
        <fieldset class="space-y-4">
          <legend class="sr-only">Identitas Perusahaan</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted">
            <Type class="w-3.5 h-3.5" />Identitas Perusahaan
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.name" label="Name" :icon="Building2" class="sm:col-span-2" />
            <UiInput v-model="form.description" label="Description" :rows="2" class="sm:col-span-2" />
            <UiInput v-model="form.legal_name" label="Legal Name (optional)" placeholder="PT ..." />
            <UiInput v-model="form.npwp" label="NPWP (optional)" placeholder="00.000.000.0-000.000" />
          </div>
        </fieldset>

        <!-- Vision & Mission -->
        <fieldset class="space-y-4 pt-5 border-t border-ui-line">
          <legend class="sr-only">Visi &amp; Misi</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted">
            <Target class="w-3.5 h-3.5" />Visi &amp; Misi
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.vision" label="Vision" :rows="3" />
            <UiInput v-model="form.mission" label="Mission (one per line)" :rows="3" placeholder="Enter one mission per line" />
          </div>
        </fieldset>

        <!-- Contact -->
        <fieldset class="space-y-4 pt-5 border-t border-ui-line">
          <legend class="sr-only">Kontak &amp; Lokasi</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted">
            <Phone class="w-3.5 h-3.5" />Kontak &amp; Lokasi
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.established_date" type="date" label="Established Date" :icon="CalendarDays" />
            <UiInput v-model="form.phone" label="Phone" :icon="Phone" />
            <UiInput v-model="form.address" label="Address" :icon="MapPin" class="sm:col-span-2" />
            <UiInput v-model="form.email" type="email" label="Email" :icon="Mail" class="sm:col-span-2" />
          </div>
        </fieldset>

        <!-- Branches -->
        <fieldset class="space-y-4 pt-5 border-t border-ui-line">
          <legend class="sr-only">Sub-companies / Branches</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted">
            <Network class="w-3.5 h-3.5" />Sub-companies / Branches
          </p>
          <UiInput v-model="form.branches" :rows="3" placeholder="Enter one branch per line" aria-label="Sub-companies / Branches" />
        </fieldset>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="showModal = false">Cancel</UiButton>
        <UiButton :icon="Save" :loading="saving" @click="saveCompany">{{ saving ? "Saving..." : "Save" }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>
