<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Tags, Plus, Trash2, FileText, Building2Icon } from "lucide-vue-next";
import { useLetterStore } from "@/stores/letter";
import { useAlertModalStore } from "@/stores/alertModal";
import Pagination from "@/components/common/Pagination.vue";

const PER_PAGE = 10;

const store = useLetterStore();
const alertModal = useAlertModalStore();
const { letterCodes, divisionCodes } = storeToRefs(store);

const newLetterCode = ref({ code: "", name: "" });
const newDivisionCode = ref({ code: "", name: "" });
const errorMessage = ref("");

// Both lists are short enough (fetched in full already for the Letter
// Create dropdowns) that paginating them client-side, rather than adding
// a second paginated endpoint, keeps this simple.
const letterCodePage = ref(1);
const divisionCodePage = ref(1);

const paginate = (items, page) => ({
  items: items.slice((page - 1) * PER_PAGE, page * PER_PAGE),
  meta: {
    current_page: page,
    last_page: Math.max(1, Math.ceil(items.length / PER_PAGE)),
    per_page: PER_PAGE,
    total: items.length,
    from: items.length === 0 ? 0 : (page - 1) * PER_PAGE + 1,
    to: Math.min(page * PER_PAGE, items.length),
  },
});

const paginatedLetterCodes = computed(() => paginate(letterCodes.value, letterCodePage.value));
const paginatedDivisionCodes = computed(() => paginate(divisionCodes.value, divisionCodePage.value));

onMounted(async () => {
  await Promise.all([store.fetchLetterCodes(), store.fetchDivisionCodes()]);
});

const handleAddLetterCode = async () => {
  errorMessage.value = "";
  if (!newLetterCode.value.code || !newLetterCode.value.name) return;
  try {
    await store.createLetterCode({
      code: newLetterCode.value.code.toUpperCase(),
      name: newLetterCode.value.name,
    });
    newLetterCode.value = { code: "", name: "" };
    // New codes are appended at the end of the list, so jump forward to
    // wherever it actually landed instead of back to page 1.
    letterCodePage.value = paginatedLetterCodes.value.meta.last_page;
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Failed to add letter code.";
  }
};

const handleDeleteLetterCode = async (id) => {
  if (!(await alertModal.confirm("Delete this letter code?"))) return;
  await store.deleteLetterCode(id);
  if (letterCodePage.value > paginatedLetterCodes.value.meta.last_page) {
    letterCodePage.value = paginatedLetterCodes.value.meta.last_page;
  }
};

const handleAddDivisionCode = async () => {
  errorMessage.value = "";
  if (!newDivisionCode.value.code || !newDivisionCode.value.name) return;
  try {
    await store.createDivisionCode({
      code: newDivisionCode.value.code.toUpperCase(),
      name: newDivisionCode.value.name,
    });
    newDivisionCode.value = { code: "", name: "" };
    // New codes are appended at the end of the list, so jump forward to
    // wherever it actually landed instead of back to page 1.
    divisionCodePage.value = paginatedDivisionCodes.value.meta.last_page;
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Failed to add division code.";
  }
};

const handleDeleteDivisionCode = async (id) => {
  if (!(await alertModal.confirm("Delete this division code?"))) return;
  await store.deleteDivisionCode(id);
  if (divisionCodePage.value > paginatedDivisionCodes.value.meta.last_page) {
    divisionCodePage.value = paginatedDivisionCodes.value.meta.last_page;
  }
};
</script>

<template>
  <div class="px-4 py-4">
    <div class="bg-white mb-5">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Tags class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Letter & Division Codes</h3>
          <p class="text-brand-light text-sm">Reference codes used in Letters numbering</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-red-500 text-sm mb-4">{{ errorMessage }}</p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <FileText class="w-5 h-5 text-[#0C51D9]" />
          <h4 class="text-brand-dark font-bold">Letter Code</h4>
        </div>

        <form @submit.prevent="handleAddLetterCode" class="flex items-end gap-2 mb-4">
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">Code</label>
            <input v-model="newLetterCode.code" type="text" placeholder="e.g. SPK" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm uppercase" />
          </div>
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">Name</label>
            <input v-model="newLetterCode.name" type="text" placeholder="e.g. Work Order Letter" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
          <button type="submit" class="p-2 bg-[#0C51D9] text-white rounded-lg shrink-0">
            <Plus class="w-4 h-4" />
          </button>
        </form>

        <div class="space-y-2">
          <div v-for="code in paginatedLetterCodes.items" :key="code.id" class="flex items-center justify-between p-3 border border-[#DCDEDD] rounded-lg">
            <div>
              <span class="font-mono font-bold text-brand-dark text-sm">{{ code.code }}</span>
              <span class="text-brand-light text-sm ml-2">{{ code.name }}</span>
            </div>
            <button @click="handleDeleteLetterCode(code.id)" class="text-gray-400 hover:text-red-600">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <div v-if="letterCodes.length === 0" class="text-center py-6 text-sm text-gray-400">
            No letter codes yet
          </div>
        </div>

        <Pagination
          :meta="paginatedLetterCodes.meta"
          item-label="letter codes"
          @page-change="(page) => (letterCodePage = page)"
        />
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <Building2Icon class="w-5 h-5 text-[#0C51D9]" />
          <h4 class="text-brand-dark font-bold">Division Code</h4>
        </div>

        <form @submit.prevent="handleAddDivisionCode" class="flex items-end gap-2 mb-4">
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">Code</label>
            <input v-model="newDivisionCode.code" type="text" placeholder="e.g. BD" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm uppercase" />
          </div>
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">Name</label>
            <input v-model="newDivisionCode.name" type="text" placeholder="e.g. Business Development" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
          <button type="submit" class="p-2 bg-[#0C51D9] text-white rounded-lg shrink-0">
            <Plus class="w-4 h-4" />
          </button>
        </form>

        <div class="space-y-2">
          <div v-for="code in paginatedDivisionCodes.items" :key="code.id" class="flex items-center justify-between p-3 border border-[#DCDEDD] rounded-lg">
            <div>
              <span class="font-mono font-bold text-brand-dark text-sm">{{ code.code }}</span>
              <span class="text-brand-light text-sm ml-2">{{ code.name }}</span>
            </div>
            <button @click="handleDeleteDivisionCode(code.id)" class="text-gray-400 hover:text-red-600">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <div v-if="divisionCodes.length === 0" class="text-center py-6 text-sm text-gray-400">
            No division codes yet
          </div>
        </div>

        <Pagination
          :meta="paginatedDivisionCodes.meta"
          item-label="division codes"
          @page-change="(page) => (divisionCodePage = page)"
        />
      </div>
    </div>
  </div>
</template>
