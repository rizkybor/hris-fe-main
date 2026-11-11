<script setup>
import { onMounted, ref } from "vue";
import { Search, Workflow, ImageOff, SearchX } from "lucide-vue-next";
import { UiModal, UiInput, UiEmpty, UiAlert, UiSpinner } from "@/components/ui";
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
  <UiModal
    :open="true"
    size="lg"
    title="Sisipkan Flowchart"
    description="Pilih flowchart dari menu Flowchart. Perubahan di flowchart ikut tampil di PDF proposal."
    @close="emit('close')"
  >
    <div class="space-y-4">
      <UiInput v-model="search" :icon="Search" placeholder="Cari nama flowchart..." @input="onSearch" />

      <UiSpinner v-if="loading" />
      <UiAlert v-else-if="error" tone="bad" :message="error" />
      <UiEmpty
        v-else-if="flowcharts.length === 0"
        :icon="search ? SearchX : Workflow"
        :title="search ? 'Tidak ada flowchart yang cocok' : 'Belum ada flowchart'"
        message="Buat flowchart di menu Tools → Flowchart terlebih dahulu."
      />
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ui-stagger">
        <button
          v-for="fc in flowcharts"
          :key="fc.id"
          type="button"
          class="text-left bg-ui-surface border rounded-ui-card overflow-hidden transition-colors focus:outline-none focus-visible:shadow-ui-focus"
          :class="fc.preview_url ? 'ui-lift border-ui-line hover:border-ui-accent' : 'border-ui-line cursor-not-allowed opacity-60'"
          :disabled="!fc.preview_url"
          :title="fc.preview_url ? `Sisipkan ${fc.name}` : 'Belum ada pratinjau. Buka flowchart ini di menu Flowchart lalu simpan ulang.'"
          @click="emit('select', { id: fc.id, name: fc.name, url: fc.preview_url })"
        >
          <div class="h-[120px] bg-ui-subtle border-b border-ui-line flex items-center justify-center p-1.5">
            <img v-if="fc.preview_url" :src="fc.preview_url" :alt="fc.name" class="max-w-full max-h-full object-contain" />
            <div v-else class="text-center text-ui-faint px-3">
              <ImageOff class="w-5 h-5 mx-auto mb-1" />
              <p class="text-ui-cap">Belum ada pratinjau — simpan ulang di menu Flowchart</p>
            </div>
          </div>
          <div class="p-3">
            <p class="text-ui-small font-medium text-ui-ink truncate">{{ fc.name }}</p>
            <p class="text-ui-cap text-ui-muted tabular-nums">{{ fc.node_count }} bentuk · {{ formatDate(fc.updated_at) }}</p>
          </div>
        </button>
      </div>
    </div>
  </UiModal>
</template>
