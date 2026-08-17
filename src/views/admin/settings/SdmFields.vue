<script setup>
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Users2Icon, Plus, Trash2 } from "lucide-vue-next";
import { useSdmFieldStore } from "@/stores/sdmField";
import { useAlertModalStore } from "@/stores/alertModal";

const store = useSdmFieldStore();
const alertModal = useAlertModalStore();
const { fields, loading } = storeToRefs(store);

const newField = ref("");
const errorMessage = ref("");

onMounted(() => store.fetchFields());

const handleAdd = async () => {
  errorMessage.value = "";
  if (!newField.value.trim()) return;
  try {
    await store.createField({ name: newField.value.trim() });
    newField.value = "";
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || "Gagal menambah bidang.";
  }
};

const handleDelete = async (field) => {
  if (!(await alertModal.confirm(`Hapus bidang "${field.name}"?`))) return;
  try {
    await store.deleteField(field.id);
  } catch (error) {
    await alertModal.alert("Gagal menghapus bidang. Mungkin masih dipakai oleh SDM Resource.", { type: "danger" });
  }
};
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Users2Icon class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Bidang SDM</h3>
          <p class="text-brand-light text-sm">
            Daftar bidang/role yang bisa dipilih saat menambah SDM Resource di Operational Cost
          </p>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="text-red-500 text-sm mb-4">{{ errorMessage }}</p>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 max-w-lg">
      <form @submit.prevent="handleAdd" class="flex items-end gap-2 mb-4">
        <div class="flex-1">
          <label class="text-xs text-gray-500 mb-1 block">Nama Bidang</label>
          <input
            v-model="newField"
            type="text"
            placeholder="cth. Backend Developer"
            class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <button type="submit" class="p-2 bg-[#0C51D9] text-white rounded-lg shrink-0">
          <Plus class="w-4 h-4" />
        </button>
      </form>

      <div v-if="loading" class="text-center py-6 text-sm text-gray-400">Memuat...</div>
      <div v-else class="space-y-2">
        <div
          v-for="field in fields"
          :key="field.id"
          class="flex items-center justify-between p-3 border border-[#DCDEDD] rounded-lg"
        >
          <span class="text-brand-dark text-sm font-semibold">{{ field.name }}</span>
          <button @click="handleDelete(field)" class="text-gray-400 hover:text-red-600">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
        <div v-if="fields.length === 0" class="text-center py-6 text-sm text-gray-400">
          Belum ada bidang SDM
        </div>
      </div>
    </div>
  </div>
</template>
