<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Tags, Plus, Trash2, FileText, Building2Icon } from "lucide-vue-next";
import { useLetterStore } from "@/stores/letter";

const store = useLetterStore();
const { letterCodes, divisionCodes } = storeToRefs(store);

const newLetterCode = ref({ code: "", name: "" });
const newDivisionCode = ref({ code: "", name: "" });
const errorMessage = ref("");

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
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Gagal menambah kode surat.";
  }
};

const handleDeleteLetterCode = async (id) => {
  if (!confirm("Hapus kode surat ini?")) return;
  await store.deleteLetterCode(id);
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
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Gagal menambah kode divisi.";
  }
};

const handleDeleteDivisionCode = async (id) => {
  if (!confirm("Hapus kode divisi ini?")) return;
  await store.deleteDivisionCode(id);
};
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Tags class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Kode Surat & Divisi</h3>
          <p class="text-brand-light text-sm">Referensi kode yang dipakai pada penomoran Surat-Surat</p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-red-500 text-sm mb-4">{{ errorMessage }}</p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <FileText class="w-5 h-5 text-[#0C51D9]" />
          <h4 class="text-brand-dark font-bold">Kode Surat</h4>
        </div>

        <form @submit.prevent="handleAddLetterCode" class="flex items-end gap-2 mb-4">
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">Kode</label>
            <input v-model="newLetterCode.code" type="text" placeholder="e.g. SPK" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm uppercase" />
          </div>
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">Nama</label>
            <input v-model="newLetterCode.name" type="text" placeholder="e.g. Surat Perintah Kerja" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
          <button type="submit" class="p-2 bg-[#0C51D9] text-white rounded-lg shrink-0">
            <Plus class="w-4 h-4" />
          </button>
        </form>

        <div class="space-y-2">
          <div v-for="code in letterCodes" :key="code.id" class="flex items-center justify-between p-3 border border-[#DCDEDD] rounded-lg">
            <div>
              <span class="font-mono font-bold text-brand-dark text-sm">{{ code.code }}</span>
              <span class="text-brand-light text-sm ml-2">{{ code.name }}</span>
            </div>
            <button @click="handleDeleteLetterCode(code.id)" class="text-gray-400 hover:text-red-600">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <div v-if="letterCodes.length === 0" class="text-center py-6 text-sm text-gray-400">
            Belum ada kode surat
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <Building2Icon class="w-5 h-5 text-[#0C51D9]" />
          <h4 class="text-brand-dark font-bold">Kode Divisi</h4>
        </div>

        <form @submit.prevent="handleAddDivisionCode" class="flex items-end gap-2 mb-4">
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">Kode</label>
            <input v-model="newDivisionCode.code" type="text" placeholder="e.g. BD" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm uppercase" />
          </div>
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">Nama</label>
            <input v-model="newDivisionCode.name" type="text" placeholder="e.g. Business Development" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
          <button type="submit" class="p-2 bg-[#0C51D9] text-white rounded-lg shrink-0">
            <Plus class="w-4 h-4" />
          </button>
        </form>

        <div class="space-y-2">
          <div v-for="code in divisionCodes" :key="code.id" class="flex items-center justify-between p-3 border border-[#DCDEDD] rounded-lg">
            <div>
              <span class="font-mono font-bold text-brand-dark text-sm">{{ code.code }}</span>
              <span class="text-brand-light text-sm ml-2">{{ code.name }}</span>
            </div>
            <button @click="handleDeleteDivisionCode(code.id)" class="text-gray-400 hover:text-red-600">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <div v-if="divisionCodes.length === 0" class="text-center py-6 text-sm text-gray-400">
            Belum ada kode divisi
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
