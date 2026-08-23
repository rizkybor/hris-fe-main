<script setup>
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Laptop, Plus, X, UserPlus, Undo2, Pencil, Trash2 } from "lucide-vue-next";
import { useAssetStore } from "@/stores/asset";
import { useEmployeeStore } from "@/stores/employee";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useAssetStore();
const alertModal = useAlertModalStore();
const { assets, statistics, loading } = storeToRefs(store);

const employeeStore = useEmployeeStore();
const { employees } = storeToRefs(employeeStore);

const filters = ref({ search: "", category: "", status: "" });

const categoryOptions = [
  { value: "laptop", label: "Laptop" },
  { value: "phone", label: "Phone" },
  { value: "vehicle", label: "Vehicle" },
  { value: "furniture", label: "Furniture" },
  { value: "other", label: "Other" },
];

const statusLabels = {
  available: { label: "Available", class: "bg-green-100 text-green-700" },
  assigned: { label: "In Use", class: "bg-blue-100 text-blue-700" },
  maintenance: { label: "Maintenance", class: "bg-yellow-100 text-yellow-700" },
  retired: { label: "Retired", class: "bg-gray-100 text-gray-600" },
  lost: { label: "Lost", class: "bg-red-100 text-red-700" },
};

const showFormModal = ref(false);
const editingId = ref(null);
const form = ref({
  asset_code: "",
  name: "",
  category: "laptop",
  brand: "",
  model: "",
  serial_number: "",
  purchase_date: "",
  purchase_price: "",
  condition: "good",
  notes: "",
});
const submitting = ref(false);
const errorMessage = ref("");

const showAssignModal = ref(false);
const assigningAsset = ref(null);
const assignForm = ref({ employee_id: "", condition_at_assignment: "good", notes: "" });

const fetchData = async () => {
  await store.fetchAssets(filters.value);
};

const openCreateModal = () => {
  editingId.value = null;
  form.value = { asset_code: "", name: "", category: "laptop", brand: "", model: "", serial_number: "", purchase_date: "", purchase_price: "", condition: "good", notes: "" };
  errorMessage.value = "";
  showFormModal.value = true;
};

const openEditModal = (asset) => {
  editingId.value = asset.id;
  form.value = {
    asset_code: asset.asset_code,
    name: asset.name,
    category: asset.category,
    brand: asset.brand ?? "",
    model: asset.model ?? "",
    serial_number: asset.serial_number ?? "",
    purchase_date: asset.purchase_date ?? "",
    purchase_price: asset.purchase_price ?? "",
    condition: asset.condition,
    notes: asset.notes ?? "",
  };
  errorMessage.value = "";
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
};

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    if (editingId.value) {
      await store.updateAsset(editingId.value, form.value);
    } else {
      await store.createAsset(form.value);
    }
    showFormModal.value = false;
    await Promise.all([fetchData(), store.fetchStatistics()]);
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Failed to save asset.");
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (id) => {
  if (!(await alertModal.confirm("Delete this asset?"))) return;
  try {
    await store.deleteAsset(id);
    await store.fetchStatistics();
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to delete asset.", { type: "danger" });
  }
};

const openAssignModal = async (asset) => {
  assigningAsset.value = asset;
  assignForm.value = { employee_id: "", condition_at_assignment: asset.condition, notes: "" };
  if (employees.value.length === 0) {
    await employeeStore.fetchEmployees({ limit: 200 });
  }
  showAssignModal.value = true;
};

const closeAssignModal = () => {
  showAssignModal.value = false;
  assigningAsset.value = null;
};

const handleAssign = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    await store.assignAsset(assigningAsset.value.id, assignForm.value);
    showAssignModal.value = false;
    await Promise.all([fetchData(), store.fetchStatistics()]);
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to assign asset.", { type: "danger" });
  } finally {
    submitting.value = false;
  }
};

const handleReturn = async (asset) => {
  if (!(await alertModal.confirm(`Mark "${asset.name}" as returned?`))) return;
  try {
    await store.returnAsset(asset.id, { condition_at_return: asset.condition });
    await Promise.all([fetchData(), store.fetchStatistics()]);
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to process asset return.", { type: "danger" });
  }
};

onMounted(async () => {
  await Promise.all([fetchData(), store.fetchStatistics()]);
});
</script>

<template>
  <div>
    <div class="bg-white p-5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Laptop class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Company Assets</h3>
          <p class="text-brand-light text-sm">Manage and track assets loaned to employees</p>
        </div>
      </div>
      <button
        v-if="can('asset-create')"
        @click="openCreateModal"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 shrink-0"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Add Asset</span>
      </button>
    </div>

    <div v-if="statistics" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-light text-xs">Total Assets</p>
        <p class="text-brand-dark text-2xl font-bold mt-1">{{ statistics.total }}</p>
      </div>
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-light text-xs">Available</p>
        <p class="text-green-600 text-2xl font-bold mt-1">{{ statistics.available }}</p>
      </div>
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-light text-xs">In Use</p>
        <p class="text-blue-600 text-2xl font-bold mt-1">{{ statistics.assigned }}</p>
      </div>
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-light text-xs">Total Asset Value</p>
        <p class="text-brand-dark text-lg font-bold mt-1">{{ formatRupiah(statistics.total_value) }}</p>
      </div>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex flex-wrap gap-3">
      <input
        v-model="filters.search"
        @input="fetchData"
        type="text"
        placeholder="Search name, code, or serial number..."
        class="flex-1 min-w-[200px] px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm"
      />
      <select v-model="filters.category" @change="fetchData" class="px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
        <option value="">All Categories</option>
        <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select v-model="filters.status" @change="fetchData" class="px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
        <option value="">All Statuses</option>
        <option v-for="(cfg, key) in statusLabels" :key="key" :value="key">{{ cfg.label }}</option>
      </select>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 4" :key="i" height="80px" rounded="16px" />
    </div>

    <div v-else class="space-y-3">
      <div v-for="asset in assets" :key="asset.id" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <h4 class="text-brand-dark font-bold">{{ asset.name }}</h4>
              <span class="text-xs text-gray-400">{{ asset.asset_code }}</span>
              <span :class="['px-2 py-0.5 rounded-full text-xs font-semibold', statusLabels[asset.status]?.class]">
                {{ statusLabels[asset.status]?.label ?? asset.status }}
              </span>
            </div>
            <p class="text-brand-light text-sm">
              {{ categoryOptions.find(c => c.value === asset.category)?.label ?? asset.category }}
              <span v-if="asset.brand"> • {{ asset.brand }}</span>
              <span v-if="asset.serial_number"> • SN: {{ asset.serial_number }}</span>
            </p>
            <p v-if="asset.assignee" class="text-xs text-blue-700 mt-1">
              Dipakai oleh {{ asset.assignee.name }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="can('asset-assign') && asset.status === 'available'"
              @click="openAssignModal(asset)"
              title="Assign to employee"
              class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] transition-colors"
            >
              <UserPlus class="w-3.5 h-3.5 text-gray-600" />
            </button>
            <button
              v-if="can('asset-assign') && asset.status === 'assigned'"
              @click="handleReturn(asset)"
              title="Return"
              class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] transition-colors"
            >
              <Undo2 class="w-3.5 h-3.5 text-gray-600" />
            </button>
            <button
              v-if="can('asset-edit')"
              @click="openEditModal(asset)"
              class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] transition-colors"
            >
              <Pencil class="w-3.5 h-3.5 text-gray-600" />
            </button>
            <button
              v-if="can('asset-delete')"
              @click="handleDelete(asset.id)"
              class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-red-400 transition-colors"
            >
              <Trash2 class="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="assets.length === 0" class="bg-white border border-[#DCDEDD] rounded-[14px] p-10 text-center">
        <Laptop class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-brand-light text-sm">No assets yet.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showFormModal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closeFormModal">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-brand-dark text-lg font-bold">{{ editingId ? 'Edit Asset' : 'Add Asset' }}</h3>
          <button @click="closeFormModal" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Asset Code</label>
              <input v-model="form.asset_code" type="text" required placeholder="AST-001" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Category</label>
              <select v-model="form.category" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
                <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Asset Name</label>
            <input v-model="form.name" type="text" required placeholder="e.g. MacBook Pro 14" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Merek</label>
              <input v-model="form.brand" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Model</label>
              <input v-model="form.model" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Serial Number</label>
            <input v-model="form.serial_number" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Purchase Date</label>
              <input v-model="form.purchase_date" type="date" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Harga Beli (Rp)</label>
              <input v-model.number="form.purchase_price" type="number" min="0" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Condition</label>
            <select v-model="form.condition" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Notes</label>
            <textarea v-model="form.notes" rows="2" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>

          <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

          <div class="flex items-center gap-3 pt-2">
            <button type="submit" :disabled="submitting" class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-2.5 flex items-center gap-2 disabled:opacity-50">
              <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Saving..." : "Save" }}</span>
            </button>
            <button type="button" @click="closeFormModal" class="px-6 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Assign Modal -->
    <div v-if="showAssignModal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closeAssignModal">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-md">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-brand-dark text-lg font-bold">Assign Asset</h3>
          <button @click="closeAssignModal" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <form @submit.prevent="handleAssign" class="p-5 space-y-4">
          <p class="text-sm text-brand-light">{{ assigningAsset?.name }} ({{ assigningAsset?.asset_code }})</p>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Employee</label>
            <select v-model="assignForm.employee_id" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="" disabled>Select employee</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.user?.name }} ({{ emp.code }})</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Condition at Handover</label>
            <select v-model="assignForm.condition_at_assignment" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>
          <div class="flex items-center gap-3 pt-2">
            <button type="submit" :disabled="submitting" class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-2.5 flex items-center gap-2 disabled:opacity-50">
              <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Assigning..." : "Assign" }}</span>
            </button>
            <button type="button" @click="closeAssignModal" class="px-6 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
