<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Laptop, Plus, UserPlus, Undo2, Pencil, Trash2, RotateCw, Eye, ShieldCheck, ShieldAlert, Wrench, Search, CheckCircle2, Users, Wallet } from "lucide-vue-next";
import { useAssetStore } from "@/stores/asset";
import { useEmployeeStore } from "@/stores/employee";
import { useSupplierStore } from "@/stores/supplier";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiPageHeader, UiButton, UiBadge, UiStat, UiModal, UiInput, UiSelect, UiTable, UiAlert, UiSpinner } from "@/components/ui";

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

// --- Presentation helpers (redesign) ---
const STATUS_TONES = { available: "ok", assigned: "info", maintenance: "warn", retired: "neutral", lost: "bad" };
const statusTone = (status) => STATUS_TONES[status] || "neutral";
const categoryLabel = (value) => categoryOptions.find((c) => c.value === value)?.label ?? value;
const categoryFilterOptions = [{ value: "", label: "All Categories" }, ...categoryOptions.map((o) => ({ value: o.value, label: o.label }))];
const statusFilterOptions = [{ value: "", label: "All Statuses" }, ...Object.entries(statusLabels).map(([value, cfg]) => ({ value, label: cfg.label }))];
const categoryFormOptions = categoryOptions.map((o) => ({ value: o.value, label: `${o.value} — ${o.label}` }));
const conditionOptions = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "damaged", label: "Damaged" },
];
const supplierOptions = computed(() => [{ value: "", label: "-- Tidak ditentukan --" }, ...suppliers.value.map((s) => ({ value: s.id, label: s.name }))]);
const employeeOptions = computed(() => employees.value.map((emp) => ({ value: emp.id, label: `${emp.user?.name} (${emp.code})` })));
const columns = [
  { key: "name", label: "Asset" },
  { key: "category", label: "Category" },
  { key: "status", label: "Status" },
  { key: "warranty", label: "Warranty" },
  { key: "book_value", label: "Nilai Buku", align: "right" },
  { key: "actions", label: "", align: "right" },
];
const fieldClass =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const iconBtn =
  "ui-press w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink";

onMounted(async () => {
  await Promise.all([fetchData(), store.fetchStatistics()]);
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Company Assets" subtitle="Manage and track assets loaned to employees">
      <template #actions>
        <UiButton v-if="can('asset-create')" :icon="Plus" class="w-full sm:w-auto" @click="openCreateModal">Add Asset</UiButton>
      </template>
    </UiPageHeader>

    <div v-if="statistics" class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ui-stagger">
      <UiStat label="Total Assets" :value="statistics.total" :icon="Laptop" />
      <UiStat label="Available" :value="statistics.available" tone="ok" :icon="CheckCircle2" />
      <UiStat label="In Use" :value="statistics.assigned" tone="accent" :icon="Users" />
      <UiStat label="Total Asset Value" :value="formatRupiah(statistics.total_value)" :icon="Wallet" class="col-span-2 lg:col-span-1 tabular-nums" />
    </div>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-2.5 border-b border-ui-line">
        <UiInput
          v-model="filters.search"
          :icon="Search"
          placeholder="Search name, code, or serial number..."
          class="md:flex-1 md:max-w-[360px]"
          @input="fetchData"
        />
        <div class="grid grid-cols-2 md:flex gap-2 md:ml-auto">
          <UiSelect v-model="filters.category" :options="categoryFilterOptions" class="md:w-[230px]" aria-label="Category" @change="fetchData" />
          <UiSelect v-model="filters.status" :options="statusFilterOptions" class="md:w-[160px]" aria-label="Status" @change="fetchData" />
        </div>
      </div>

      <UiTable :columns="columns" :rows="assets" :loading="loading" :skeleton-rows="4" empty-text="No assets yet.">
        <template #cell-name="{ row }">
          <div class="min-w-0 max-w-[240px] py-2">
            <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.name }}</p>
            <p class="text-ui-cap text-ui-muted font-mono truncate">{{ row.asset_code }}</p>
            <p v-if="row.next_maintenance_due_date" class="text-ui-cap text-ui-warn flex items-start gap-1 mt-0.5">
              <Wrench class="w-3 h-3 shrink-0 mt-0.5" />Jadwal maintenance berikutnya: {{ fmtDate(row.next_maintenance_due_date) }}
            </p>
          </div>
        </template>
        <template #cell-category="{ row }">
          <p class="text-ui-small text-ui-text max-w-[190px] truncate" :title="categoryLabel(row.category)">{{ categoryLabel(row.category) }}</p>
          <p class="text-ui-cap text-ui-muted truncate max-w-[190px]">
            <span v-if="row.brand">{{ row.brand }}</span><span v-if="row.brand && row.serial_number"> · </span><span v-if="row.serial_number">SN: {{ row.serial_number }}</span>
          </p>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabels[row.status]?.label ?? row.status }}</UiBadge>
          <p v-if="row.assignee" class="text-ui-cap text-ui-muted mt-1 max-w-[160px] truncate" :title="`Dipakai oleh ${row.assignee.name}`">Dipakai oleh {{ row.assignee.name }}</p>
        </template>
        <template #cell-warranty="{ row }">
          <UiBadge v-if="warrantyStatus(row)" :tone="row.is_under_warranty ? 'ok' : 'bad'" class="whitespace-nowrap">
            <component :is="warrantyStatus(row).icon" class="w-3 h-3" />{{ warrantyStatus(row).label }}
          </UiBadge>
          <span v-else class="text-ui-small text-ui-faint">—</span>
        </template>
        <template #cell-book_value="{ row }">
          <span class="tabular-nums text-ui-body text-ui-ink whitespace-nowrap">{{ row.current_book_value != null ? formatRupiah(row.current_book_value) : "—" }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5">
            <button type="button" :class="iconBtn" title="View detail & maintenance history" aria-label="View detail" @click="openDetailModal(row)">
              <Eye class="w-4 h-4" />
            </button>
            <button v-if="can('asset-assign') && row.status === 'available'" type="button" :class="iconBtn" title="Assign to employee" aria-label="Assign to employee" @click="openAssignModal(row)">
              <UserPlus class="w-4 h-4" />
            </button>
            <button v-if="can('asset-assign') && row.status === 'assigned'" type="button" :class="iconBtn" title="Return" aria-label="Return" @click="handleReturn(row)">
              <Undo2 class="w-4 h-4" />
            </button>
            <button v-if="can('asset-edit')" type="button" :class="iconBtn" title="Edit" aria-label="Edit" @click="openEditModal(row)">
              <Pencil class="w-4 h-4" />
            </button>
            <button
              v-if="can('asset-delete')"
              type="button"
              class="ui-press w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
              title="Delete"
              aria-label="Delete"
              @click="handleDelete(row.id)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5">
            <div class="flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.name }}</p>
                <p class="text-ui-cap text-ui-muted font-mono truncate">{{ row.asset_code }}</p>
                <p class="text-ui-cap text-ui-muted mt-1 truncate">
                  {{ categoryLabel(row.category) }}<span v-if="row.brand"> · {{ row.brand }}</span><span v-if="row.serial_number"> · SN: {{ row.serial_number }}</span>
                </p>
                <div class="flex flex-wrap items-center gap-1.5 mt-2">
                  <UiBadge :tone="statusTone(row.status)" dot>{{ statusLabels[row.status]?.label ?? row.status }}</UiBadge>
                  <UiBadge v-if="warrantyStatus(row)" :tone="row.is_under_warranty ? 'ok' : 'bad'">
                    <component :is="warrantyStatus(row).icon" class="w-3 h-3" />{{ warrantyStatus(row).label }}
                  </UiBadge>
                </div>
                <p v-if="row.assignee" class="text-ui-cap text-ui-text mt-1.5">Dipakai oleh {{ row.assignee.name }}</p>
                <p v-if="row.next_maintenance_due_date" class="text-ui-cap text-ui-warn flex items-center gap-1 mt-1">
                  <Wrench class="w-3 h-3" />Jadwal maintenance berikutnya: {{ fmtDate(row.next_maintenance_due_date) }}
                </p>
              </div>
              <p v-if="row.current_book_value != null" class="text-ui-small font-medium text-ui-ink tabular-nums text-right shrink-0">
                {{ formatRupiah(row.current_book_value) }}
              </p>
            </div>
            <div class="flex items-center justify-end gap-0.5 mt-2 -mr-1.5">
              <button type="button" :class="iconBtn" title="View detail & maintenance history" aria-label="View detail" @click="openDetailModal(row)">
                <Eye class="w-4 h-4" />
              </button>
              <button v-if="can('asset-assign') && row.status === 'available'" type="button" :class="iconBtn" title="Assign to employee" aria-label="Assign to employee" @click="openAssignModal(row)">
                <UserPlus class="w-4 h-4" />
              </button>
              <button v-if="can('asset-assign') && row.status === 'assigned'" type="button" :class="iconBtn" title="Return" aria-label="Return" @click="handleReturn(row)">
                <Undo2 class="w-4 h-4" />
              </button>
              <button v-if="can('asset-edit')" type="button" :class="iconBtn" title="Edit" aria-label="Edit" @click="openEditModal(row)">
                <Pencil class="w-4 h-4" />
              </button>
              <button
                v-if="can('asset-delete')"
                type="button"
                class="ui-press w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                title="Delete"
                aria-label="Delete"
                @click="handleDelete(row.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center py-4">
            <div class="w-10 h-10 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center mb-3">
              <Laptop class="w-5 h-5" />
            </div>
            <p class="text-ui-small text-ui-muted">No assets yet.</p>
          </div>
        </template>
      </UiTable>
    </section>

    <!-- Create/Edit Modal -->
    <UiModal v-model:open="showFormModal" :title="editingId ? 'Edit Asset' : 'Add Asset'" size="lg">
      <form id="asset-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
        <div class="min-w-0">
          <label for="asset-code" class="block text-ui-small font-medium text-ui-ink mb-1.5">Asset Code<span class="text-ui-bad"> *</span></label>
          <div class="flex gap-2">
            <input
              id="asset-code"
              v-model="form.asset_code"
              @input="handleAssetCodeInput"
              type="text"
              required
              placeholder="JCD-IT-HW-26-0001"
              :class="[fieldClass, 'font-mono text-ui-small']"
            />
            <button
              type="button"
              @click="generateCode"
              :disabled="generatingCode"
              title="Generate next code for this category"
              aria-label="Generate next code for this category"
              class="ui-press shrink-0 w-[38px] h-[38px] rounded-ui-control border border-ui-line-strong bg-ui-surface flex items-center justify-center text-ui-muted hover:bg-ui-subtle hover:text-ui-ink disabled:opacity-50"
            >
              <UiSpinner v-if="generatingCode" size="16px" :center="false" />
              <RotateCw v-else class="w-4 h-4" />
            </button>
          </div>
          <p class="text-ui-cap text-ui-muted mt-1.5">Format: JCD-{Kategori}-{Tahun}-{No. Urut}</p>
        </div>
        <UiSelect
          v-model="form.category"
          label="Category"
          required
          :options="categoryFormOptions"
          :hint="selectedCategoryExamples ? `Contoh: ${selectedCategoryExamples}` : ''"
        />
        <UiInput v-model="form.name" label="Asset Name" required placeholder="e.g. MacBook Pro 14" />
        <UiInput v-model="form.serial_number" label="Serial Number" />
        <UiInput v-model="form.brand" label="Merek" />
        <UiInput v-model="form.model" label="Model" />
        <UiInput v-model="form.purchase_date" type="date" label="Purchase Date" />
        <div class="min-w-0">
          <label for="asset-price" class="block text-ui-small font-medium text-ui-ink mb-1.5">Harga Beli (Rp)</label>
          <input id="asset-price" v-model.number="form.purchase_price" type="number" min="0" :class="[fieldClass, 'tabular-nums']" />
        </div>
        <UiInput v-model="form.warranty_expiry_date" type="date" label="Warranty s/d" />
        <div class="min-w-0">
          <label for="asset-life" class="block text-ui-small font-medium text-ui-ink mb-1.5">Masa Pakai (bulan)</label>
          <input id="asset-life" v-model.number="form.useful_life_months" type="number" min="1" placeholder="e.g. 36" :class="[fieldClass, 'tabular-nums']" />
          <p class="text-ui-cap text-ui-muted mt-1.5">Untuk menghitung depresiasi nilai aset.</p>
        </div>

        <div class="min-w-0">
          <div class="flex items-end gap-2">
            <UiSelect v-model="form.supplier_id" label="Supplier" :options="supplierOptions" class="flex-1" />
            <button
              type="button"
              @click="showAddSupplier = true"
              title="Add new supplier"
              aria-label="Add new supplier"
              class="ui-press w-[38px] h-[38px] shrink-0 flex items-center justify-center border border-ui-line-strong bg-ui-surface rounded-ui-control text-ui-muted hover:bg-ui-subtle hover:text-ui-ink"
            >
              <Plus class="w-4 h-4" />
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
              aria-label="Supplier name"
              :class="[fieldClass, 'flex-1']"
              @keyup.enter="handleAddSupplier"
            />
            <UiButton size="sm" :loading="addingSupplier" :disabled="addingSupplier || !newSupplierName.trim()" @click="handleAddSupplier">
              {{ addingSupplier ? "Saving..." : "Save" }}
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="showAddSupplier = false; newSupplierName = ''">Cancel</UiButton>
          </div>
        </div>
        <UiSelect v-model="form.condition" label="Condition" :options="conditionOptions" />
        <UiInput v-model="form.notes" label="Notes" :rows="2" class="sm:col-span-2" />

        <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" class="sm:col-span-2" />
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="closeFormModal">Cancel</UiButton>
        <UiButton type="submit" form="asset-form" :loading="submitting">{{ submitting ? "Saving..." : "Save" }}</UiButton>
      </template>
    </UiModal>

    <!-- Assign Modal -->
    <UiModal
      v-model:open="showAssignModal"
      title="Assign Asset"
      :description="`${assigningAsset?.name ?? ''} (${assigningAsset?.asset_code ?? ''})`"
      size="sm"
      @close="closeAssignModal"
    >
      <form id="asset-assign-form" class="space-y-4" @submit.prevent="handleAssign">
        <UiSelect v-model="assignForm.employee_id" label="Employee" required placeholder="Select employee" :options="employeeOptions" />
        <UiSelect v-model="assignForm.condition_at_assignment" label="Condition at Handover" :options="conditionOptions" />
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="closeAssignModal">Cancel</UiButton>
        <UiButton type="submit" form="asset-assign-form" :icon="UserPlus" :loading="submitting">{{ submitting ? "Assigning..." : "Assign" }}</UiButton>
      </template>
    </UiModal>

    <!-- Detail Modal (specs + maintenance history) -->
    <UiModal
      v-model:open="showDetailModal"
      :title="detailAsset?.name ?? ''"
      :description="detailAsset?.asset_code ?? ''"
      size="lg"
      @close="closeDetailModal"
    >
      <div v-if="detailAsset" class="space-y-6">
        <!-- Specs -->
        <dl class="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt class="text-ui-cap text-ui-muted">Harga Beli</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums">{{ detailAsset.purchase_price != null ? formatRupiah(detailAsset.purchase_price) : "-" }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Nilai Buku Saat Ini</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums">{{ detailAsset.current_book_value != null ? formatRupiah(detailAsset.current_book_value) : "-" }}</dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Warranty</dt>
            <dd class="text-ui-body font-medium text-ui-ink flex flex-wrap items-center gap-1.5">
              {{ detailAsset.warranty_expiry_date ? fmtDate(detailAsset.warranty_expiry_date) : "-" }}
              <UiBadge v-if="detailAsset.warranty_expiry_date" :tone="detailAsset.is_under_warranty ? 'ok' : 'bad'">
                {{ detailAsset.is_under_warranty ? "Aktif" : "Habis" }}
              </UiBadge>
            </dd>
          </div>
          <div>
            <dt class="text-ui-cap text-ui-muted">Supplier</dt>
            <dd class="text-ui-body font-medium text-ui-ink">{{ supplierName(detailAsset) || "-" }}</dd>
          </div>
        </dl>

        <!-- Maintenance Log -->
        <div class="pt-5 border-t border-ui-line">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Wrench class="w-4 h-4 text-ui-muted" />
              <h4 class="text-ui-h3 text-ui-ink">Riwayat Maintenance</h4>
            </div>
            <UiButton
              v-if="can('asset-maintenance-create') && !showMaintenanceForm"
              variant="ghost"
              size="sm"
              :icon="Plus"
              @click="openMaintenanceForm"
            >
              Tambah Log
            </UiButton>
          </div>

          <!-- Add log form -->
          <form
            v-if="showMaintenanceForm"
            class="bg-ui-subtle border border-ui-line rounded-ui-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3"
            @submit.prevent="submitMaintenanceLog"
          >
            <UiInput v-model="maintenanceForm.performed_at" type="date" label="Tanggal Servis" required />
            <UiInput v-model="maintenanceForm.next_due_date" type="date" label="Jadwal Berikutnya" />
            <UiInput v-model="maintenanceForm.description" label="Deskripsi" required :rows="2" class="sm:col-span-2" />
            <div class="min-w-0 sm:col-span-2">
              <label for="maintenance-cost" class="block text-ui-small font-medium text-ui-ink mb-1.5">Biaya (Rp)</label>
              <input id="maintenance-cost" v-model.number="maintenanceForm.cost" type="number" min="0" :class="[fieldClass, 'tabular-nums']" />
            </div>
            <div class="flex items-center gap-2 sm:col-span-2">
              <UiButton type="submit" size="sm" :loading="submittingMaintenance">{{ submittingMaintenance ? "Saving..." : "Save Log" }}</UiButton>
              <UiButton size="sm" variant="secondary" @click="showMaintenanceForm = false">Cancel</UiButton>
            </div>
          </form>

          <UiSpinner v-if="maintenanceLoading" label="Loading..." class="!py-6" />
          <div v-else-if="maintenanceLogs.length === 0" class="text-center py-6 text-ui-small text-ui-muted bg-ui-subtle rounded-ui-card border border-dashed border-ui-line">
            Belum ada riwayat maintenance
          </div>
          <ul v-else class="divide-y divide-ui-line border border-ui-line rounded-ui-card">
            <li v-for="log in maintenanceLogs" :key="log.id" class="px-4 py-3 flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-ui-cap text-ui-muted">{{ fmtDate(log.performed_at) }}</p>
                <p class="text-ui-body text-ui-ink">{{ log.description }}</p>
                <p class="text-ui-cap text-ui-muted mt-0.5">
                  <span v-if="log.cost" class="tabular-nums">{{ formatRupiah(log.cost) }} · </span>
                  <span v-if="log.next_due_date">Jadwal berikutnya: {{ fmtDate(log.next_due_date) }}</span>
                </p>
              </div>
              <button
                v-if="can('asset-maintenance-delete')"
                type="button"
                class="ui-press w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad shrink-0"
                title="Delete"
                aria-label="Delete maintenance log"
                @click="deleteMaintenanceLogHandler(log)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </UiModal>
  </div>
</template>
