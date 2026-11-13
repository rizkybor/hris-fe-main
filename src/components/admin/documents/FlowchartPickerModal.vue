<script setup>
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { Search, Workflow, ImageOff, SearchX } from "lucide-vue-next";
import { UiModal, UiInput, UiEmpty, UiAlert, UiSpinner } from "@/components/ui";
import { axiosInstance } from "@/plugins/axios";
import { errorMessage } from "@/helpers/errorHelper";

const emit = defineEmits(["select", "close"]);
const { t } = useI18n();

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
    error.value = errorMessage(e, t("documents.flowchartPicker.loadError"));
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
  value ? new Date(value).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" }) : "";
</script>

<template>
  <UiModal
    :open="true"
    size="lg"
    :title="$t('documents.flowchartPicker.title')"
    :description="$t('documents.flowchartPicker.description')"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <UiInput v-model="search" :icon="Search" :placeholder="$t('documents.flowchartPicker.searchPlaceholder')" @input="onSearch" />

      <UiSpinner v-if="loading" />
      <UiAlert v-else-if="error" tone="bad" :message="error" />
      <UiEmpty
        v-else-if="flowcharts.length === 0"
        :icon="search ? SearchX : Workflow"
        :title="search ? $t('documents.flowchartPicker.noMatch') : $t('documents.flowchartPicker.empty')"
        :message="$t('documents.flowchartPicker.emptyMessage')"
      />
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ui-stagger">
        <button
          v-for="fc in flowcharts"
          :key="fc.id"
          type="button"
          class="text-left bg-ui-surface border rounded-ui-card overflow-hidden transition-colors focus:outline-none focus-visible:shadow-ui-focus"
          :class="fc.preview_url ? 'ui-lift border-ui-line hover:border-ui-accent' : 'border-ui-line cursor-not-allowed opacity-60'"
          :disabled="!fc.preview_url"
          :title="fc.preview_url ? $t('documents.flowchartPicker.insertItem', { name: fc.name }) : $t('documents.flowchartPicker.noPreviewHint')"
          @click="emit('select', { id: fc.id, name: fc.name, url: fc.preview_url })"
        >
          <div class="h-[120px] bg-ui-subtle border-b border-ui-line flex items-center justify-center p-1.5">
            <img v-if="fc.preview_url" :src="fc.preview_url" :alt="fc.name" class="max-w-full max-h-full object-contain" />
            <div v-else class="text-center text-ui-faint px-3">
              <ImageOff class="w-5 h-5 mx-auto mb-1" />
              <p class="text-ui-cap">{{ $t("documents.flowchartPicker.noPreview") }}</p>
            </div>
          </div>
          <div class="p-3">
            <p class="text-ui-small font-medium text-ui-ink truncate">{{ fc.name }}</p>
            <p class="text-ui-cap text-ui-muted tabular-nums">{{ $t("documents.flowchartPicker.shapes", { n: fc.node_count }, fc.node_count) }} · {{ formatDate(fc.updated_at) }}</p>
          </div>
        </button>
      </div>
    </div>
  </UiModal>
</template>
