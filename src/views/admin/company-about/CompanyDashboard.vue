<script setup>
import { useCompanyAboutStore } from "@/stores/companyAbout";
import { ref, reactive, computed, onMounted } from "vue";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { can } from "@/helpers/permissionHelper";
import { storeToRefs } from "pinia";
import {
  Building2,
  Pencil,
  Plus,
  X,
  Target,
  Flag,
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  Network,
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
  <!-- Alerts -->
  <Alert type="success" :title="success" :show="!!success" />
  <Alert type="error" :title="error" :show="!!error" />

  <!-- Page Header -->
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
        <Building2 class="w-5 h-5 text-[#0C51D9]" />
      </div>
      <div>
        <h3 class="text-brand-dark text-lg font-bold">Company About</h3>
        <p class="text-brand-light text-sm">Company profile shown across the system</p>
      </div>
    </div>
    <button
      v-if="can('company-about-edit')"
      @click="openModal(!!company)"
      class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 shrink-0"
    >
      <Pencil v-if="company" class="w-4 h-4 text-white" />
      <Plus v-else class="w-4 h-4 text-white" />
      <span class="text-brand-white text-sm font-semibold">
        {{ company ? "Edit" : "Add Company Info" }}
      </span>
    </button>
  </div>

  <!-- Loading State -->
  <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 lg:col-span-2 space-y-3">
      <Skeleton width="64px" height="64px" rounded="12px" />
      <Skeleton width="60%" height="20px" />
      <Skeleton width="100%" height="14px" />
      <Skeleton width="90%" height="14px" />
    </div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-3">
      <Skeleton width="100%" height="14px" />
      <Skeleton width="80%" height="14px" />
      <Skeleton width="70%" height="14px" />
    </div>
  </div>

  <!-- Company Content -->
  <div v-else-if="company" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <!-- Overview -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 lg:col-span-2">
      <div class="flex items-center gap-4 mb-5">
        <div class="w-14 h-14 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
          <img src="/images/jcd-only-color.png" alt="Company Logo" class="w-9 h-9 object-contain" />
        </div>
        <div class="min-w-0">
          <h2 class="text-brand-dark text-lg font-bold truncate">{{ company.name || "-" }}</h2>
          <p v-if="company.description" class="text-brand-light text-sm truncate">{{ company.description }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-gray-50 rounded-[10px] flex items-center justify-center shrink-0">
            <CalendarDays class="w-4 h-4 text-gray-500" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-light text-xs">Established</p>
            <p class="text-brand-dark text-sm font-semibold truncate">{{ formattedDate }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-gray-50 rounded-[10px] flex items-center justify-center shrink-0">
            <MapPin class="w-4 h-4 text-gray-500" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-light text-xs">Address</p>
            <p class="text-brand-dark text-sm font-semibold truncate">{{ company.address || "-" }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-gray-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Mail class="w-4 h-4 text-gray-500" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-light text-xs">Email</p>
            <p class="text-brand-dark text-sm font-semibold truncate">{{ company.email || "-" }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-gray-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Phone class="w-4 h-4 text-gray-500" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-light text-xs">Phone</p>
            <p class="text-brand-dark text-sm font-semibold truncate">{{ company.phone || "-" }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Vision -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-9 h-9 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
          <Target class="w-4 h-4 text-blue-600" />
        </div>
        <h4 class="text-brand-dark text-sm font-bold">Vision</h4>
      </div>
      <p class="text-brand-light text-sm leading-relaxed">{{ company.vision || "-" }}</p>
    </div>

    <!-- Mission -->
    <div v-if="cleanedMission.length" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 lg:col-span-2">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-9 h-9 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
          <Flag class="w-4 h-4 text-blue-600" />
        </div>
        <h4 class="text-brand-dark text-sm font-bold">Mission</h4>
      </div>
      <ul class="space-y-2">
        <li v-for="(m, index) in cleanedMission" :key="index" class="flex gap-2.5 text-sm text-brand-light">
          <span class="text-blue-500 font-semibold shrink-0">{{ index + 1 }}.</span>
          {{ m }}
        </li>
      </ul>
    </div>

    <!-- Branches -->
    <div v-if="cleanedBranches.length" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-9 h-9 bg-gray-50 rounded-[10px] flex items-center justify-center shrink-0">
          <Network class="w-4 h-4 text-gray-500" />
        </div>
        <h4 class="text-brand-dark text-sm font-bold">Sub-companies / Branches</h4>
      </div>
      <ul class="space-y-2">
        <li v-for="(b, index) in cleanedBranches" :key="index" class="text-sm text-brand-light border-l-2 border-gray-200 pl-3">
          {{ b }}
        </li>
      </ul>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else class="bg-white border border-[#DCDEDD] rounded-[14px] p-12 text-center">
    <Building2 class="w-10 h-10 text-gray-300 mx-auto mb-3" />
    <h4 class="text-brand-dark text-base font-semibold mb-1">No company data yet</h4>
    <p class="text-brand-light text-sm mb-5">Add your company profile so it appears across the system.</p>
    <button
      v-if="can('company-about-edit')"
      @click="openModal(false)"
      class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-5 py-2.5 inline-flex items-center gap-2"
    >
      <Plus class="w-4 h-4 text-white" />
      <span class="text-brand-white text-sm font-semibold">Add Company Information</span>
    </button>
  </div>

  <!-- Create/Edit Modal -->
  <div
    v-if="showModal"
    class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click.self="showModal = false"
  >
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
      <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between shrink-0">
        <h3 class="text-brand-dark text-lg font-bold">
          {{ isEditing ? "Edit Company Information" : "Add Company Information" }}
        </h3>
        <button @click="showModal = false" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150">
          <X class="w-4 h-4" />
        </button>
      </div>

      <form @submit.prevent="saveCompany" class="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Name</label>
          <input v-model="form.name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Description</label>
          <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Vision</label>
          <textarea v-model="form.vision" rows="2" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Mission (one per line)</label>
          <textarea v-model="form.mission" rows="3" placeholder="Enter one mission per line" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Established Date</label>
            <input v-model="form.established_date" type="date" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Phone</label>
            <input v-model="form.phone" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Address</label>
          <input v-model="form.address" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Email</label>
          <input v-model="form.email" type="email" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Branches (one per line)</label>
          <textarea v-model="form.branches" rows="3" placeholder="Enter one branch per line" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
        </div>
      </form>

      <div class="flex items-center gap-3 p-5 border-t border-[#DCDEDD] shrink-0">
        <button
          @click="saveCompany"
          :disabled="saving"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
        >
          <span class="text-brand-white text-sm font-semibold">{{ saving ? "Saving..." : "Save" }}</span>
        </button>
        <button @click="showModal = false" class="px-6 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
