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
  Type,
  FileText,
  Save,
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
  <div class="px-4 py-4">
  <!-- Alerts -->
  <Alert type="success" :title="success" :show="!!success" />
  <Alert type="error" :title="error" :show="!!error" />

  <!-- Page Header -->
  <div class="bg-white mb-5 flex items-center justify-between">
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
      v-if="can('company-about-edit') && company"
      @click="openModal(true)"
      class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 shrink-0"
    >
      <Pencil class="w-4 h-4 text-white" />
      <span class="text-brand-white text-sm font-semibold">Edit</span>
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
  <div v-else-if="company" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- Overview -->
    <div class="main-card rounded-[14px] p-5 lg:col-span-2 relative overflow-hidden">
      <div class="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl"></div>
      <div class="relative z-10 mb-5">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 bg-white border border-white/10 rounded-[12px] flex items-center justify-center shrink-0">
            <img src="/images/jcd-only-color.png" alt="Company Logo" class="w-9 h-9 object-contain" />
          </div>
          <div class="min-w-0">
            <h2 class="text-white text-lg font-bold truncate">{{ company.name || "-" }}</h2>
            <p v-if="company.legal_name" class="text-brand-white-70 text-sm truncate">{{ company.legal_name }}</p>
          </div>
        </div>
        <p
          v-if="company.description"
          :title="company.description"
          class="text-brand-white-70 text-sm leading-relaxed mt-3.5 pt-3.5 border-t border-white/10 line-clamp-2"
        >
          {{ company.description }}
        </p>
      </div>

      <div class="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-white/10 border border-white/10 rounded-[10px] flex items-center justify-center shrink-0">
            <CalendarDays class="w-4 h-4 text-blue-300" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-white-70 text-xs">Established</p>
            <p class="text-white text-sm font-semibold truncate">{{ formattedDate }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-white/10 border border-white/10 rounded-[10px] flex items-center justify-center shrink-0">
            <MapPin class="w-4 h-4 text-blue-300" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-white-70 text-xs">Address</p>
            <p class="text-white text-sm font-semibold truncate">{{ company.address || "-" }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-white/10 border border-white/10 rounded-[10px] flex items-center justify-center shrink-0">
            <Mail class="w-4 h-4 text-blue-300" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-white-70 text-xs">Email</p>
            <p class="text-white text-sm font-semibold truncate">{{ company.email || "-" }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-white/10 border border-white/10 rounded-[10px] flex items-center justify-center shrink-0">
            <Phone class="w-4 h-4 text-blue-300" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-white-70 text-xs">Phone</p>
            <p class="text-white text-sm font-semibold truncate">{{ company.phone || "-" }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-white/10 border border-white/10 rounded-[10px] flex items-center justify-center shrink-0">
            <FileText class="w-4 h-4 text-blue-300" />
          </div>
          <div class="min-w-0">
            <p class="text-brand-white-70 text-xs">NPWP</p>
            <p class="text-white text-sm font-semibold truncate">{{ company.npwp || "-" }}</p>
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
    <div v-if="cleanedMission.length" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
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
    <div v-if="cleanedBranches.length" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 lg:col-span-2">
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
      class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-5 py-2.5 w-fit mx-auto"
    >
      <Plus class="w-4 h-4 text-white" />
      <span class="text-brand-white text-sm font-semibold">Add Company Information</span>
    </button>
  </div>

  <!-- Create/Edit Modal -->
  <Transition name="fade">
    <div
      v-if="showModal"
      class="fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="showModal = false"
    >
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
              <Building2 class="w-5 h-5 text-[#0C51D9]" />
            </div>
            <h3 class="text-brand-dark text-lg font-bold">
              {{ isEditing ? "Edit Company Information" : "Add Company Information" }}
            </h3>
          </div>
          <button @click="showModal = false" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors duration-150">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="saveCompany" class="flex-1 overflow-y-auto p-5 space-y-6">
          <!-- Identity -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-50 rounded-[9px] flex items-center justify-center shrink-0">
                <Type class="w-4 h-4 text-blue-600" />
              </div>
              <h4 class="text-brand-dark text-sm font-bold">Identitas Perusahaan</h4>
            </div>
            <div class="space-y-4">
              <div>
                <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Name</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Building2 class="w-4 h-4 text-gray-400" />
                  </div>
                  <input v-model="form.name" type="text" class="w-full pl-10 pr-3 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all" />
                </div>
              </div>
              <div>
                <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Description</label>
                <textarea v-model="form.description" rows="2" class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all resize-none"></textarea>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Legal Name (optional)</label>
                  <input v-model="form.legal_name" type="text" placeholder="PT ..." class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all" />
                </div>
                <div>
                  <label class="text-sm font-semibold text-brand-dark mb-1.5 block">NPWP (optional)</label>
                  <input v-model="form.npwp" type="text" placeholder="00.000.000.0-000.000" class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all" />
                </div>
              </div>
            </div>
          </div>

          <!-- Vision & Mission -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-50 rounded-[9px] flex items-center justify-center shrink-0">
                <Target class="w-4 h-4 text-blue-600" />
              </div>
              <h4 class="text-brand-dark text-sm font-bold">Visi &amp; Misi</h4>
            </div>
            <div class="space-y-4">
              <div>
                <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Vision</label>
                <textarea v-model="form.vision" rows="2" class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all resize-none"></textarea>
              </div>
              <div>
                <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Mission (one per line)</label>
                <textarea v-model="form.mission" rows="3" placeholder="Enter one mission per line" class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all resize-none"></textarea>
              </div>
            </div>
          </div>

          <!-- Contact -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-emerald-50 rounded-[9px] flex items-center justify-center shrink-0">
                <Phone class="w-4 h-4 text-emerald-600" />
              </div>
              <h4 class="text-brand-dark text-sm font-bold">Kontak &amp; Lokasi</h4>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Established Date</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <CalendarDays class="w-4 h-4 text-gray-400" />
                  </div>
                  <input v-model="form.established_date" type="date" class="w-full pl-10 pr-3 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all" />
                </div>
              </div>
              <div>
                <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Phone</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone class="w-4 h-4 text-gray-400" />
                  </div>
                  <input v-model="form.phone" type="text" class="w-full pl-10 pr-3 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all" />
                </div>
              </div>
              <div class="sm:col-span-2">
                <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Address</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <MapPin class="w-4 h-4 text-gray-400" />
                  </div>
                  <input v-model="form.address" type="text" class="w-full pl-10 pr-3 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all" />
                </div>
              </div>
              <div class="sm:col-span-2">
                <label class="text-sm font-semibold text-brand-dark mb-1.5 block">Email</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail class="w-4 h-4 text-gray-400" />
                  </div>
                  <input v-model="form.email" type="email" class="w-full pl-10 pr-3 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all" />
                </div>
              </div>
            </div>
          </div>

          <!-- Branches -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-gray-100 rounded-[9px] flex items-center justify-center shrink-0">
                <Network class="w-4 h-4 text-gray-500" />
              </div>
              <h4 class="text-brand-dark text-sm font-bold">Sub-companies / Branches</h4>
            </div>
            <textarea v-model="form.branches" rows="3" placeholder="Enter one branch per line" class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all resize-none"></textarea>
          </div>
        </form>

        <div class="flex items-center gap-3 p-5 border-t border-[#DCDEDD] shrink-0">
          <button
            @click="saveCompany"
            :disabled="saving"
            class="btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
          >
            <Save class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">{{ saving ? "Saving..." : "Save" }}</span>
          </button>
          <button @click="showModal = false" class="px-6 py-2.5 rounded-[12px] border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
