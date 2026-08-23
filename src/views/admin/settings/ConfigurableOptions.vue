<script setup>
import { ref, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { ListChecks, Plus, Trash2, Pencil, X, Check, ChevronRight } from "lucide-vue-next";
import { useConfigurableOptionStore } from "@/stores/configurableOption";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { useScrollFade } from "@/composables/useScrollFade";

const store = useConfigurableOptionStore();
const alertModal = useAlertModalStore();
const { options, loading } = storeToRefs(store);

const categories = [
  { key: "employment_type", label: "Employment Type" },
  { key: "ptkp_status", label: "PTKP Status (PPh21)" },
  { key: "bank_name", label: "Bank Name" },
  { key: "preferred_language", label: "Preferred Language" },
];

const activeCategory = ref(categories[0].key);
const { scrollRef: tabScrollRef, showLeftFade: showTabLeftFade, showRightFade: showTabRightFade, updateFade: updateTabFade } = useScrollFade();

const newValue = ref("");
const newLabel = ref("");
const formError = ref("");

const editingId = ref(null);
const editValue = ref("");
const editLabel = ref("");

const load = () => store.fetchByCategory(activeCategory.value);

onMounted(load);
watch(activeCategory, load);

const handleAdd = async () => {
  formError.value = "";
  if (!newValue.value.trim() || !newLabel.value.trim()) {
    formError.value = "Value and label are both required.";
    return;
  }
  try {
    await store.createOption({
      category: activeCategory.value,
      value: newValue.value.trim(),
      label: newLabel.value.trim(),
    });
    newValue.value = "";
    newLabel.value = "";
  } catch (error) {
    formError.value = error?.response?.data?.message || "Failed to add option.";
  }
};

const startEdit = (option) => {
  editingId.value = option.id;
  editValue.value = option.value;
  editLabel.value = option.label;
};

const cancelEdit = () => {
  editingId.value = null;
};

const saveEdit = async (option) => {
  try {
    await store.updateOption(option.id, { value: editValue.value.trim(), label: editLabel.value.trim() });
    editingId.value = null;
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to update option.", { type: "danger" });
  }
};

const toggleActive = async (option) => {
  try {
    await store.updateOption(option.id, { is_active: !option.is_active });
  } catch (error) {
    await alertModal.alert("Failed to update option.", { type: "danger" });
  }
};

const handleDelete = async (option) => {
  if (!(await alertModal.confirm(`Delete "${option.label}"? Employees already using this value keep it, but it won't be selectable anymore.`))) return;
  try {
    await store.deleteOption(option.id);
  } catch (error) {
    await alertModal.alert("Failed to delete option.", { type: "danger" });
  }
};
</script>

<template>
  <div class="px-4 py-4">
    <div class="bg-white mb-5">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <ListChecks class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Dropdown Options</h3>
          <p class="text-brand-light text-sm">
            Add or remove the values employees can pick from on the Create/Edit Employee form
          </p>
        </div>
      </div>
    </div>

    <!-- Category Tabs -->
    <div class="relative mb-6">
      <div
        ref="tabScrollRef"
        @scroll="updateTabFade"
        class="bg-white border border-[#DCDEDD] rounded-[14px] p-2 overflow-x-auto"
      >
        <div class="flex items-center gap-1 min-w-max">
          <button
            v-for="category in categories"
            :key="category.key"
            @click="activeCategory = category.key"
            :class="[
              'px-4 py-2.5 rounded-[10px] text-sm font-semibold transition-all duration-200 whitespace-nowrap',
              activeCategory === category.key
                ? 'blue-gradient blue-btn-shadow text-white'
                : 'text-brand-light hover:bg-gray-50 hover:text-brand-dark',
            ]"
          >
            {{ category.label }}
          </button>
        </div>
      </div>
      <Transition name="fade">
        <div
          v-if="showTabRightFade"
          class="sm:hidden pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[14px] bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-end pr-1"
        >
          <ChevronRight class="w-4 h-4 text-[#0C51D9] scroll-hint-nudge" />
        </div>
      </Transition>
      <Transition name="fade">
        <div
          v-if="showTabLeftFade"
          class="sm:hidden pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-[14px] bg-gradient-to-r from-white via-white/80 to-transparent"
        ></div>
      </Transition>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 max-w-2xl">
      <!-- Add Form -->
      <form v-if="can('option-create')" @submit.prevent="handleAdd" class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mb-5">
        <input
          v-model="newValue"
          type="text"
          placeholder="Value (e.g. gopay)"
          class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        />
        <input
          v-model="newLabel"
          type="text"
          placeholder="Label (e.g. GoPay)"
          class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        />
        <button type="submit" class="p-2 bg-[#0C51D9] text-white rounded-lg shrink-0 flex items-center justify-center">
          <Plus class="w-4 h-4" />
        </button>
      </form>

      <p v-if="formError" class="text-red-500 text-sm mb-4">{{ formError }}</p>

      <div v-if="loading" class="text-center py-6 text-sm text-gray-400">Loading...</div>
      <div v-else class="space-y-2">
        <div
          v-for="option in options"
          :key="option.id"
          class="flex items-center gap-3 p-3 border border-[#DCDEDD] rounded-lg"
        >
          <template v-if="editingId === option.id">
            <input v-model="editValue" class="flex-1 px-2 py-1.5 border border-[#DCDEDD] rounded-md text-sm" />
            <input v-model="editLabel" class="flex-1 px-2 py-1.5 border border-[#DCDEDD] rounded-md text-sm" />
            <button @click="saveEdit(option)" class="text-green-600 hover:text-green-700 shrink-0">
              <Check class="w-4 h-4" />
            </button>
            <button @click="cancelEdit" class="text-gray-400 hover:text-gray-600 shrink-0">
              <X class="w-4 h-4" />
            </button>
          </template>
          <template v-else>
            <div class="flex-1 min-w-0">
              <p class="text-brand-dark text-sm font-semibold truncate">{{ option.label }}</p>
              <p class="text-gray-400 text-xs truncate">value: {{ option.value }}</p>
            </div>
            <button
              v-if="can('option-edit')"
              @click="toggleActive(option)"
              :class="[
                'px-2.5 py-1 rounded-full text-xs font-semibold shrink-0',
                option.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
              ]"
            >
              {{ option.is_active ? "Active" : "Hidden" }}
            </button>
            <button v-if="can('option-edit')" @click="startEdit(option)" class="text-gray-400 hover:text-[#0C51D9] shrink-0">
              <Pencil class="w-4 h-4" />
            </button>
            <button v-if="can('option-delete')" @click="handleDelete(option)" class="text-gray-400 hover:text-red-600 shrink-0">
              <Trash2 class="w-4 h-4" />
            </button>
          </template>
        </div>
        <div v-if="options.length === 0" class="text-center py-6 text-sm text-gray-400">
          No options in this category yet.
        </div>
      </div>
    </div>
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
