<script setup>
import { onMounted, ref } from "vue";
import { X, Search, Loader2, Workflow, ImageOff } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { errorMessage } from "@/helpers/errorHelper";

// Pick a flowchart (from the Flowchart module) to insert into a document.
// Only flowcharts with a saved snapshot can be inserted; older ones get one
// the next time they're saved in the Flowchart editor.
const emit = defineEmits(["select", "close"]);

const flowcharts = ref([]);
const loading = ref(true);
const error = ref("");
const search = ref("");

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await axiosInstance.get("/flowcharts", { params: { search: search.value || undefined, row_per_page: 60 } });
    flowcharts.value = data.data.data;
  } catch (e) {
    error.value = errorMessage(e, "Daftar flowchart tidak bisa dimuat.");
  } finally {
    loading.value = false;
  }
};

let timer;
const onSearch = () => {
  clearTimeout(timer);
  timer = setTimeout(load, 300);
};

onMounted(load);

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
</script>

<template>
  <div class="fixed inset-0 backdrop-blur-sm bg-black/30 z-[95] flex items-center justify-center p-3.5" @click.self="emit('close')">
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
      <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between gap-3 flex-shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
            <Workflow class="w-5 h-5 text-blue-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold">Sisipkan Flowchart</h3>
            <p class="text-brand-light text-xs">Pilih flowchart dari menu Flowchart. Perubahan di flowchart ikut tampil di PDF proposal.</p>
          </div>
        </div>
        <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0" @click="emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="px-5 pt-4 flex-shrink-0">
        <div class="relative">
          <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari nama flowchart..."
            class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-[10px] text-sm outline-none focus:border-[#0C51D9]"
            @input="onSearch"
          />
        </div>
      </div>

      <div class="p-5 overflow-y-auto">
        <div v-if="loading" class="py-14 flex justify-center"><Loader2 class="w-6 h-6 text-[#0C51D9] animate-spin" /></div>
        <p v-else-if="error" class="text-center text-sm text-red-600 py-10">{{ error }}</p>
        <div v-else-if="flowcharts.length === 0" class="text-center py-12">
          <Workflow class="w-9 h-9 text-gray-300 mx-auto mb-2" />
          <p class="text-brand-dark text-sm font-semibold">{{ search ? "Tidak ada flowchart yang cocok" : "Belum ada flowchart" }}</p>
          <p class="text-brand-light text-xs mt-1">Buat flowchart di menu Tools → Flowchart terlebih dahulu.</p>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            v-for="fc in flowcharts"
            :key="fc.id"
            type="button"
            class="text-left border rounded-[12px] overflow-hidden transition-all"
            :class="fc.preview_url ? 'border-[#DCDEDD] hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/20' : 'border-[#EEF0F2] cursor-not-allowed opacity-70'"
            :disabled="!fc.preview_url"
            :title="fc.preview_url ? `Sisipkan ${fc.name}` : 'Belum ada pratinjau. Buka flowchart ini di menu Flowchart lalu simpan ulang.'"
            @click="emit('select', { id: fc.id, name: fc.name, url: fc.preview_url })"
          >
            <div class="bg-gray-50 border-b border-[#EEF0F2] flex items-center justify-center" style="height: 120px">
              <img v-if="fc.preview_url" :src="fc.preview_url" :alt="fc.name" class="max-w-full max-h-full object-contain" style="padding: 6px" />
              <div v-else class="text-center text-gray-400 px-3">
                <ImageOff class="w-5 h-5 mx-auto mb-1" />
                <p class="text-[11px] leading-snug">Belum ada pratinjau — simpan ulang di menu Flowchart</p>
              </div>
            </div>
            <div class="p-2.5">
              <p class="text-brand-dark text-sm font-semibold truncate">{{ fc.name }}</p>
              <p class="text-brand-light text-xs">{{ fc.node_count }} bentuk · {{ formatDate(fc.updated_at) }}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
