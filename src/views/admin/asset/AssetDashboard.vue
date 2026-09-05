<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Laptop, Plus, X, UserPlus, Undo2, Pencil, Trash2, RotateCw, ChevronDown, Eye, ShieldCheck, ShieldAlert, Wrench } from "lucide-vue-next";
import { useAssetStore } from "@/stores/asset";
import { useEmployeeStore } from "@/stores/employee";
import { useSupplierStore } from "@/stores/supplier";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useAssetStore();
const alertModal = useAlertModalStore();
const { assets, statistics, loading } = storeToRefs(store);

const employeeStore = useEmployeeStore();
const { employees } = storeToRefs(employeeStore);

const supplierStore = useSupplierStore();
const { suppliers } = storeToRefs(supplierStore);

const showAddSupplier = ref(false);
const newSupplierName = ref("");
const addingSupplier = ref(false);
const handleAddSupplier = async () => {
  if (!newSupplierName.value.trim()) return;
  addingSupplier.value = true;
  try {
    const supplier = await supplierStore.createSupplier({ name: newSupplierName.value.trim() });
    form.value.supplier_id = supplier.id;
    newSupplierName.value = "";
    showAddSupplier.value = false;
  } catch (error) {
    await alertModal.alert("Failed to add supplier.", { type: "danger" });
  } finally {
    addingSupplier.value = false;
  }
};

const filters = ref({ search: "", category: "", status: "" });

const categoryOptions = [
  { value: "IT-HW", label: "Hardware / Perangkat IT", examples: "Laptop, PC Desktop, Monitor, Server, Router, Switch" },
  { value: "IT-SW", label: "Software / Lisensi", examples: "Lisensi OS, Software SaaS Enterprise, Domain, SSL" },
  { value: "OF-EQ", label: "Peralatan Kantor (Office Equipment)", examples: "Printer, Scanner, Projector, AC, TV Display" },
  { value: "OF-FN", label: "Furnitur Kantor (Furniture)", examples: "Meja Kerja, Kursi Kantor, Lemari Arsip, Papan Tulis" },
  { value: "M-VEH", label: "Kendaraan Operasional (Vehicle)", examples: "Mobil Dinas, Sepeda Motor" },
  { value: "M-MISC", label: "Aset Pendukung Lainnya", examples: "Kamera, Drone, Alat Live Streaming, Smart Lock" },
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
  category: "IT-HW",
  brand: "",
  model: "",
  serial_number: "",
  purchase_date: "",
  purchase_price: "",
  warranty_expiry_date: "",
  useful_life_months: "",
  supplier_id: "",
  condition: "good",
  notes: "",
});
const submitting = ref(false);
const errorMessage = ref("");
const generatingCode = ref(false);
// True while asset_code still reflects the last auto-generated suggestion --
// as soon as the user types into the field directly, this flips false so
// changing category/purchase date afterwards won't silently overwrite
// whatever they typed.
const codeAutoFilled = ref(true);

const selectedCategoryExamples = computed(
  () => categoryOptions.find((c) => c.value === form.value.category)?.examples
);

const generateCode = async () => {
  generatingCode.value = true;
  try {
    form.value.asset_code = await store.fetchNextCode({
      category: form.value.category,
      purchase_date: form.value.purchase_date,
    });
    codeAutoFilled.value = true;
  } catch {
    // Suggestion is a convenience only -- if it fails, the user can still
    // type the asset code manually.
  } finally {
    generatingCode.value = false;
  }
};

const handleAssetCodeInput = () => {
  codeAutoFilled.value = false;
};

watch([() => form.value.category, () => form.value.purchase_date], () => {
  if (showFormModal.value && !editingId.value && codeAutoFilled.value) {
    generateCode();
  }
});

const showAssignModal = ref(false);
const assigningAsset = ref(null);
const assignForm = ref({ employee_id: "", condition_at_assignment: "good", notes: "" });

const fetchData = async () => {
  await store.fetchAssets(filters.value);
};

const openCreateModal = async () => {
  editingId.value = null;
  form.value = { asset_code: "", name: "", category: "IT-HW", brand: "", model: "", serial_number: "", purchase_date: "", purchase_price: "", warranty_expiry_date: "", useful_life_months: "", supplier_id: "", condition: "good", notes: "" };
  errorMessage.value = "";
  codeAutoFilled.value = true;
  showFormModal.value = true;
  if (suppliers.value.length === 0) await supplierStore.fetchAllSuppliers();
  await generateCode();
};

// The API returns dates as full ISO timestamps (e.g.
// "2027-02-28T00:00:00.000000Z") -- a native <input type="date"> only
// accepts a bare "YYYY-MM-DD" and silently renders blank on anything else,
// so this trims it down before it reaches a form field.
const toDateInputValue = (dateString) => (dateString ? dateString.slice(0, 10) : "");

const openEditModal = async (asset) => {
  editingId.value = asset.id;
  form.value = {
    asset_code: asset.asset_code,
    name: asset.name,
    category: asset.category,
    brand: asset.brand ?? "",
    model: asset.model ?? "",
    serial_number: asset.serial_number ?? "",
    purchase_date: toDateInputValue(asset.purchase_date),
    purchase_price: asset.purchase_price ?? "",
    warranty_expiry_date: toDateInputValue(asset.warranty_expiry_date),
    useful_life_months: asset.useful_life_months ?? "",
    supplier_id: asset.supplier_id ?? "",
    condition: asset.condition,
    notes: asset.notes ?? "",
  };
  errorMessage.value = "";
  // Editing an existing asset: keep its real code as-is; don't auto-refresh
  // just because the category select re-renders with the current value.
  codeAutoFilled.value = false;
  showFormModal.value = true;
  if (suppliers.value.length === 0) await supplierStore.fetchAllSuppliers();
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

// Detail modal (specs + maintenance log history)
const showDetailModal = ref(false);
const detailAsset = ref(null);
const maintenanceLogs = ref([]);
const maintenanceLoading = ref(false);
const showMaintenanceForm = ref(false);
const maintenanceForm = ref({ performed_at: "", description: "", cost: "", next_due_date: "" });
const submittingMaintenance = ref(false);

const supplierName = (asset) => suppliers.value.find((v) => v.id === asset.supplier_id)?.name;

// The API returns dates as full ISO timestamps (e.g.
// "2027-02-28T00:00:00.000000Z") even for date-only columns -- this trims
// that down to a compact "28 Feb 2027" for display.
const fmtDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const warrantyStatus = (asset) => {
  if (!asset.warranty_expiry_date) return null;
  return asset.is_under_warranty
    ? { label: `Garansi s/d ${fmtDate(asset.warranty_expiry_date)}`, class: "bg-emerald-100 text-emerald-700", icon: ShieldCheck }
    : { label: "Garansi Habis", class: "bg-red-100 text-red-700", icon: ShieldAlert };
};

const loadMaintenanceLogs = async (assetId) => {
  maintenanceLoading.value = true;
  try {
    maintenanceLogs.value = await store.fetchMaintenanceLogs(assetId);
  } catch {
    maintenanceLogs.value = [];
  } finally {
    maintenanceLoading.value = false;
  }
};

const openDetailModal = async (asset) => {
  detailAsset.value = asset;
  showDetailModal.value = true;
  showMaintenanceForm.value = false;
  if (suppliers.value.length === 0) await supplierStore.fetchAllSuppliers();
  await loadMaintenanceLogs(asset.id);
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  detailAsset.value = null;
  maintenanceLogs.value = [];
};

const openMaintenanceForm = () => {
  maintenanceForm.value = { performed_at: new Date().toISOString().split("T")[0], description: "", cost: "", next_due_date: "" };
  showMaintenanceForm.value = true;
};

const submitMaintenanceLog = async () => {
  submittingMaintenance.value = true;
  try {
    await store.createMaintenanceLog({ asset_id: detailAsset.value.id, ...maintenanceForm.value });
    showMaintenanceForm.value = false;
    await loadMaintenanceLogs(detailAsset.value.id);
    await fetchData();
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to save maintenance log.", { type: "danger" });
  } finally {
    submittingMaintenance.value = false;
  }
};

const deleteMaintenanceLogHandler = async (log) => {
  if (!(await alertModal.confirm("Delete this maintenance log?"))) return;
  try {
    await store.deleteMaintenanceLog(log.id);
    await loadMaintenanceLogs(detailAsset.value.id);
    await fetchData();
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to delete maintenance log.", { type: "danger" });
  }
};

onMounted(async () => {
  await Promise.all([fetchData(), store.fetchStatistics()]);
});
</script>

<template>
  <div class="px-4 py-4">
    <div class="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
          <Laptop class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">Company Assets</h3>
          <p class="text-brand-light text-xs">Manage and track assets loaned to employees</p>
        </div>
      </div>
      <button
        v-if="can('asset-create')"
        @click="openCreateModal"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Add Asset</span>
      </button>
    </div>

    <div v-if="statistics" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-light text-xs">Total Assets</p>
        <p class="text-brand-dark text-2xl font-bold mt-1">{{ statistics.total }}</p>
      </div>
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-light text-xs">Available</p>
        <p class="text-green-600 text-2xl font-bold mt-1">{{ statistics.available }}</p>
      </div>
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-light text-xs">In Use</p>
        <p class="text-blue-600 text-2xl font-bold mt-1">{{ statistics.assigned }}</p>
      </div>
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-light text-xs">Total Asset Value</p>
        <p class="text-brand-dark text-lg font-bold mt-1">{{ formatRupiah(statistics.total_value) }}</p>
      </div>
    </div>

    <div class="mb-6 flex flex-wrap gap-3">
      <input
        v-model="filters.search"
        @input="fetchData"
        type="text"
        placeholder="Search name, code, or serial number..."
        class="flex-1 min-w-[200px] px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm"
      />
      <div class="relative">
        <select v-model="filters.category" @change="fetchData" class="select-soft">
          <option value="">All Categories</option>
          <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <ChevronDown
          class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
        />
      </div>
      <div class="relative">
        <select v-model="filters.status" @change="fetchData" class="select-soft">
          <option value="">All Statuses</option>
          <option v-for="(cfg, key) in statusLabels" :key="key" :value="key">{{ cfg.label }}</option>
        </select>
        <ChevronDown
          class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
        />
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 4" :key="i" height="80px" rounded="16px" />
    </div>

    <div v-else class="space-y-3">
      <div v-for="asset in assets" :key="asset.id" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <h4 class="text-brand-dark font-bold">{{ asset.name }}</h4>
              <span class="text-xs text-gray-400">{{ asset.asset_code }}</span>
              <span :class="['px-2 py-0.5 rounded-full text-xs font-semibold', statusLabels[asset.status]?.class]">
                {{ statusLabels[asset.status]?.label ?? asset.status }}
              </span>
              <span
                v-if="warrantyStatus(asset)"
                :class="['px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1', warrantyStatus(asset).class]"
              >
                <component :is="warrantyStatus(asset).icon" class="w-3 h-3" />
                {{ warrantyStatus(asset).label }}
              </span>
            </div>
            <p class="text-brand-light text-sm">
              {{ categoryOptions.find(c => c.value === asset.category)?.label ?? asset.category }}
              <span v-if="asset.brand"> • {{ asset.brand }}</span>
              <span v-if="asset.serial_number"> • SN: {{ asset.serial_number }}</span>
              <span v-if="asset.current_book_value != null"> • Nilai Buku: {{ formatRupiah(asset.current_book_value) }}</span>
            </p>
            <p v-if="asset.assignee" class="text-xs text-blue-700 mt-1">
              Dipakai oleh {{ asset.assignee.name }}
            </p>
            <p v-if="asset.next_maintenance_due_date" class="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <Wrench class="w-3 h-3" /> Jadwal maintenance berikutnya: {{ fmtDate(asset.next_maintenance_due_date) }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="openDetailModal(asset)"
              title="View detail & maintenance history"
              class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] transition-colors"
            >
              <Eye class="w-3.5 h-3.5 text-gray-600" />
            </button>
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

      <div v-if="assets.length === 0" class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-10 text-center">
        <Laptop class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-brand-light text-xs">No assets yet.</p>
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
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Asset Code<span class="text-red-600 ml-1">*</span></label>
              <div class="flex gap-2">
                <input
                  v-model="form.asset_code"
                  @input="handleAssetCodeInput"
                  type="text"
                  required
                  placeholder="JCD-IT-HW-26-0001"
                  class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm font-mono"
                />
                <button
                  type="button"
                  @click="generateCode"
                  :disabled="generatingCode"
                  title="Generate next code for this category"
                  class="shrink-0 w-[38px] h-[38px] rounded-xl border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] transition-colors disabled:opacity-50"
                >
                  <RotateCw class="w-4 h-4 text-gray-600" :class="{ 'animate-spin': generatingCode }" />
                </button>
              </div>
              <p class="text-xs text-brand-light mt-1">Format: JCD-{Kategori}-{Tahun}-{No. Urut}</p>
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Category<span class="text-red-600 ml-1">*</span></label>
              <div class="relative">
                <select v-model="form.category" required class="select-soft">
                  <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.value }} — {{ opt.label }}</option>
                </select>
                <ChevronDown
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                />
              </div>
              <p v-if="selectedCategoryExamples" class="text-xs text-brand-light mt-1">Contoh: {{ selectedCategoryExamples }}</p>
            </div>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Asset Name<span class="text-red-600 ml-1">*</span></label>
            <input v-model="form.name" type="text" required placeholder="e.g. MacBook Pro 14" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Purchase Date</label>
              <input
                v-model="form.purchase_date"
                type="date"
                class="w-full h-[42px] px-3 py-2 border border-[#DCDEDD] rounded-xl text-base sm:text-sm appearance-none"
              />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Harga Beli (Rp)</label>
              <input v-model.number="form.purchase_price" type="number" min="0" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Warranty s/d</label>
              <input
                v-model="form.warranty_expiry_date"
                type="date"
                class="w-full h-[42px] px-3 py-2 border border-[#DCDEDD] rounded-xl text-base sm:text-sm appearance-none"
              />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Masa Pakai (bulan)</label>
              <input
                v-model.number="form.useful_life_months"
                type="number"
                min="1"
                placeholder="e.g. 36"
                class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm"
              />
              <p class="text-xs text-brand-light mt-1">Untuk menghitung depresiasi nilai aset.</p>
            </div>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Supplier</label>
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <select v-model="form.supplier_id" class="select-soft">
                  <option value="">-- Tidak ditentukan --</option>
                  <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
                <ChevronDown
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                />
              </div>
              <button
                type="button"
                @click="showAddSupplier = true"
                title="Add new supplier"
                class="w-9 h-9 shrink-0 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300"
              >
                <Plus class="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <!-- Quick-add: suppliers aren't a managed module of their own,
                 just a name to remember who an asset was bought from -- no
                 need to leave this form to add one. -->
            <div v-if="showAddSupplier" class="flex items-center gap-2 mt-2">
              <input
                v-model="newSupplierName"
                type="text"
                placeholder="Supplier name"
                class="flex-1 px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm"
                @keyup.enter="handleAddSupplier"
              />
              <button
                type="button"
                @click="handleAddSupplier"
                :disabled="addingSupplier || !newSupplierName.trim()"
                class="px-3 py-2 rounded-[8px] text-xs font-semibold text-white bg-[#0C51D9] hover:brightness-110 disabled:opacity-50 transition-all duration-300"
              >
                {{ addingSupplier ? "Saving..." : "Save" }}
              </button>
              <button
                type="button"
                @click="showAddSupplier = false; newSupplierName = ''"
                class="px-3 py-2 rounded-[8px] text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Condition</label>
            <div class="relative">
              <select v-model="form.condition" class="select-soft">
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="damaged">Damaged</option>
              </select>
              <ChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              />
            </div>
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
            <div class="relative">
              <select v-model="assignForm.employee_id" required class="select-soft">
                <option value="" disabled>Select employee</option>
                <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.user?.name }} ({{ emp.code }})</option>
              </select>
              <ChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Condition at Handover</label>
            <div class="relative">
              <select v-model="assignForm.condition_at_assignment" class="select-soft">
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="damaged">Damaged</option>
              </select>
              <ChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              />
            </div>
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

    <!-- Detail Modal (specs + maintenance history) -->
    <div v-if="showDetailModal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closeDetailModal">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <div>
            <h3 class="text-brand-dark text-lg font-bold">{{ detailAsset?.name }}</h3>
            <p class="text-brand-light text-xs">{{ detailAsset?.asset_code }}</p>
          </div>
          <button @click="closeDetailModal" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div class="p-5 space-y-5" v-if="detailAsset">
          <!-- Specs -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-slate-50 border border-[#DCDEDD] rounded-xl px-3 py-2.5">
              <p class="text-xs text-gray-500">Harga Beli</p>
              <p class="text-brand-dark text-sm font-semibold">{{ detailAsset.purchase_price != null ? formatRupiah(detailAsset.purchase_price) : "-" }}</p>
            </div>
            <div class="bg-slate-50 border border-[#DCDEDD] rounded-xl px-3 py-2.5">
              <p class="text-xs text-gray-500">Nilai Buku Saat Ini</p>
              <p class="text-brand-dark text-sm font-semibold">{{ detailAsset.current_book_value != null ? formatRupiah(detailAsset.current_book_value) : "-" }}</p>
            </div>
            <div class="bg-slate-50 border border-[#DCDEDD] rounded-xl px-3 py-2.5">
              <p class="text-xs text-gray-500">Warranty</p>
              <p class="text-brand-dark text-sm font-semibold">
                {{ detailAsset.warranty_expiry_date ? fmtDate(detailAsset.warranty_expiry_date) : "-" }}
                <span v-if="detailAsset.warranty_expiry_date" :class="detailAsset.is_under_warranty ? 'text-emerald-600' : 'text-red-600'">
                  ({{ detailAsset.is_under_warranty ? "Aktif" : "Habis" }})
                </span>
              </p>
            </div>
            <div class="bg-slate-50 border border-[#DCDEDD] rounded-xl px-3 py-2.5">
              <p class="text-xs text-gray-500">Supplier</p>
              <p class="text-brand-dark text-sm font-semibold">{{ supplierName(detailAsset) || "-" }}</p>
            </div>
          </div>

          <!-- Maintenance Log -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-1.5">
                <Wrench class="w-4 h-4 text-amber-600" />
                <h4 class="text-brand-dark font-bold text-sm">Riwayat Maintenance</h4>
              </div>
              <button
                v-if="can('asset-maintenance-create') && !showMaintenanceForm"
                @click="openMaintenanceForm"
                class="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
              >
                <Plus class="w-3.5 h-3.5" /> Tambah Log
              </button>
            </div>

            <!-- Add log form -->
            <form v-if="showMaintenanceForm" @submit.prevent="submitMaintenanceLog" class="bg-slate-50 border border-[#DCDEDD] rounded-xl p-4 space-y-3 mb-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-semibold text-brand-dark mb-1 block">Tanggal Servis<span class="text-red-600 ml-1">*</span></label>
                  <input v-model="maintenanceForm.performed_at" type="date" required class="w-full px-2.5 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
                </div>
                <div>
                  <label class="text-xs font-semibold text-brand-dark mb-1 block">Jadwal Berikutnya</label>
                  <input v-model="maintenanceForm.next_due_date" type="date" class="w-full px-2.5 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label class="text-xs font-semibold text-brand-dark mb-1 block">Deskripsi<span class="text-red-600 ml-1">*</span></label>
                <textarea v-model="maintenanceForm.description" required rows="2" class="w-full px-2.5 py-2 border border-[#DCDEDD] rounded-lg text-sm resize-none"></textarea>
              </div>
              <div>
                <label class="text-xs font-semibold text-brand-dark mb-1 block">Biaya (Rp)</label>
                <input v-model.number="maintenanceForm.cost" type="number" min="0" class="w-full px-2.5 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
              </div>
              <div class="flex items-center gap-2">
                <button type="submit" :disabled="submittingMaintenance" class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2 text-xs font-semibold text-brand-white disabled:opacity-50">
                  {{ submittingMaintenance ? "Saving..." : "Save Log" }}
                </button>
                <button type="button" @click="showMaintenanceForm = false" class="px-4 py-2 rounded-lg border border-[#DCDEDD] text-brand-dark text-xs font-semibold hover:bg-gray-50">Cancel</button>
              </div>
            </form>

            <div v-if="maintenanceLoading" class="text-center py-4 text-gray-400 text-sm">Loading...</div>
            <div v-else-if="maintenanceLogs.length === 0" class="text-center py-6 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-[#DCDEDD] text-sm">
              Belum ada riwayat maintenance
            </div>
            <div v-else class="space-y-2">
              <div v-for="log in maintenanceLogs" :key="log.id" class="border border-[#DCDEDD] rounded-xl p-3 flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-brand-dark text-sm font-semibold">{{ fmtDate(log.performed_at) }}</p>
                  <p class="text-brand-dark text-sm">{{ log.description }}</p>
                  <p class="text-xs text-brand-light mt-0.5">
                    <span v-if="log.cost">{{ formatRupiah(log.cost) }} • </span>
                    <span v-if="log.next_due_date">Jadwal berikutnya: {{ fmtDate(log.next_due_date) }}</span>
                  </p>
                </div>
                <button
                  v-if="can('asset-maintenance-delete')"
                  @click="deleteMaintenanceLogHandler(log)"
                  class="w-7 h-7 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-red-400 shrink-0"
                >
                  <Trash2 class="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
