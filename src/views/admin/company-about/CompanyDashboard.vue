<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useCompanyAboutStore } from "@/stores/companyAbout";
import Alert from "@/components/common/Alert.vue";
import { Briefcase } from "lucide-vue-next";

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

// // --- Clean branches jadi array
const cleanedBranches = computed(() => {
  const branches = company.value?.branches;
  console.log(branches,'<< cek')
  if (!branches) return [];

  let branchesArray = [];

  try {
    branchesArray = Array.isArray(branches) ? branches : JSON.parse(branches);
  } catch {
    branchesArray = [mission];
  }

  return branchesArray.map((m) => String(m).replace(/\s+/g, " ").trim());
});

// Format tanggal
const formattedDate = computed(() =>
  company.value?.established_date
    ? new Date(company.value.established_date).toLocaleDateString()
    : "-"
);

// --- Modal state
const showModal = ref(false);
const isEditing = ref(false);

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
    // Reset form
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
    name: form.name,
    description: form.description,
    vision: form.vision,
    mission: form.mission
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean),
    established_date: form.established_date,
    address: form.address,
    email: form.email,
    phone: form.phone,
    branches: form.branches
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean),
  };

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
  }
};
</script>

<template>
  <!-- Alerts -->
  <Alert type="success" :title="success" :show="success" />
  <Alert type="error" :title="error" :show="error" />

  <div class="bg-white border border-[#DCDEDD] rounded-2xl p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-brand-dark text-xl font-bold">Company Info</h3>

      <button
        @click="openModal(!!company)"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
      >
        <span class="text-brand-white text-sm font-semibold">
          {{ company ? "Edit Company Information" : "Add Company Information" }}
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-brand-light text-sm">Loading company info...</p>
    </div>

    <!-- Company Card -->
    <div
      v-else-if="company"
      class="max-w-full md:max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300"
    >
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <div
          class="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center"
        >
          <img
            src="/images/jcd-only-color.png"
            alt="Company Logo"
            class="w-10 h-10 object-contain"
          />
        </div>
        <h2 class="text-xl md:text-2xl font-bold text-gray-900">
          {{ company.name || "-" }}
        </h2>
      </div>

      <!-- Established & Contact Info -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 text-sm md:text-base text-gray-600"
      >
        <div>
          <span class="font-semibold text-gray-800">Established:</span>
          {{ formattedDate }}
        </div>
        <div>
          <span class="font-semibold text-gray-800">Address:</span>
          {{ company.address || "-" }}
        </div>
        <div>
          <span class="font-semibold text-gray-800">Email:</span>
          {{ company.email || "-" }}
        </div>
        <div>
          <span class="font-semibold text-gray-800">Phone:</span>
          {{ company.phone || "-" }}
        </div>
      </div>

      <!-- Vision -->
      <div class="mb-4 p-4 bg-blue-50 rounded-xl">
        <h3 class="font-semibold text-blue-700 mb-1">Vision :</h3>
        <p class="text-gray-600 text-sm md:text-base">
          {{ company.vision || "-" }}
        </p>
      </div>

      <!-- Mission -->
      <div v-if="cleanedMission.length" class="mb-4 p-4 bg-blue-50 rounded-xl">
        <h3 class="font-semibold text-blue-700 mb-2">Mission :</h3>
        <ul
          class="list-decimal list-inside text-gray-700 text-sm md:text-base space-y-1"
        >
          <li v-for="(m, index) in cleanedMission" :key="index">{{ m }}</li>
        </ul>
      </div>

      <!-- Description -->
      <p class="text-gray-400 text-xs md:text-base p-2 italic">
        {{ company.description || "-" }}
      </p>

      <br />

      <!-- Branches -->
      <div v-if="cleanedBranches.length" class="p-4">
        <h3 class="font-semibold text-gray-700 mb-2 text-sm">Sub Company :</h3>
        <ul
          class="list-decimal list-inside text-gray-700 text-sm md:text-base space-y-1"
        >
          <li v-for="(m, index) in cleanedBranches" :key="index">{{ m }}</li>
        </ul>
      </div>

    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <h4 class="text-brand-dark text-lg font-semibold mb-2">
        No company data found
      </h4>
      <p class="text-brand-light text-sm">
        Click “Add Company Information” button above to add your company info
      </p>
    </div>
  </div>

  <!-- Modal Create/Edit -->
  <div
    v-if="showModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
  >
    <div
      class="bg-white rounded-xl w-full max-w-md md:max-w-lg shadow-lg relative flex flex-col"
      style="max-height: 70vh"
    >
      <!-- Header -->
      <h3
        class="text-lg md:text-xl font-semibold mb-4 p-4 border-b border-gray-200 text-gray-800"
      >
        {{ isEditing ? "Edit Company Information" : "Add Company Information" }}
      </h3>

      <!-- Form Content -->
      <div
        class="flex-1 overflow-y-auto p-4 space-y-3"
        style="scrollbar-gutter: stable"
      >
        <div>
          <label class="block font-medium text-gray-700 mb-1 text-sm"
            >Name</label
          >
          <input
            v-model="form.name"
            type="text"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block font-medium text-gray-700 mb-1 text-sm"
            >Description</label
          >
          <textarea
            v-model="form.description"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            rows="2"
          ></textarea>
        </div>

        <div>
          <label class="block font-medium text-gray-700 mb-1 text-sm"
            >Vision</label
          >
          <textarea
            v-model="form.vision"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            rows="2"
          ></textarea>
        </div>

        <div>
          <label class="block font-medium text-gray-700 mb-1 text-sm"
            >Mission (one per line)</label
          >
          <textarea
            v-model="form.mission"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            placeholder="Enter one mission per line"
          ></textarea>
        </div>

        <div>
          <label class="block font-medium text-gray-700 mb-1 text-sm"
            >Established Date</label
          >
          <input
            v-model="form.established_date"
            type="date"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block font-medium text-gray-700 mb-1 text-sm"
            >Address</label
          >
          <input
            v-model="form.address"
            type="text"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block font-medium text-gray-700 mb-1 text-sm"
            >Email</label
          >
          <input
            v-model="form.email"
            type="email"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block font-medium text-gray-700 mb-1 text-sm"
            >Phone</label
          >
          <input
            v-model="form.phone"
            type="text"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block font-medium text-gray-700 mb-1 text-sm"
            >Branches (one per line)</label
          >
          <textarea
            v-model="form.branches"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            placeholder="Enter one branch per line"
          ></textarea>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
        <button
          @click="showModal = false"
          class="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          @click="saveCompany"
          class="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>
