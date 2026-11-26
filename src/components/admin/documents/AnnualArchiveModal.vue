<script setup>
import { computed, ref, watch } from "vue";
import { Download, CheckSquare, Square } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { useToastStore } from "@/stores/toast";
import { UiAlert, UiButton, UiModal, UiSelect } from "@/components/ui";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useI18n } from "vue-i18n";

// Annual archive for the yearly report: pick a year and document types;
// each type becomes one PDF (cover + table of contents + every document).
// One type downloads as a PDF, several as a ZIP.
const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(["update:open"]);

const { t } = useI18n();
const toast = useToastStore();

const loading = ref(false);
const exporting = ref(false);
const error = ref("");
const year = ref(null);
const years = ref([]);
const types = ref([]);
const selected = ref([]);

const yearOptions = computed(() => years.value.map((y) => ({ value: y, label: String(y) })));
const withDocuments = computed(() => types.value.filter((type) => type.count > 0));
const totalSelected = computed(() => types.value.filter((type) => selected.value.includes(type.key)).reduce((sum, type) => sum + type.count, 0));
const allSelected = computed(() => withDocuments.value.length > 0 && withDocuments.value.every((type) => selected.value.includes(type.key)));

const close = () => emit("update:open", false);

const load = async (forYear = null) => {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await axiosInstance.get("/annual-archive/options", { params: forYear ? { year: forYear } : {} });
    years.value = data.data.years;
    year.value = data.data.year;
    types.value = data.data.types;
    // Keep what was picked when it still has documents in the new year.
    const keep = selected.value.filter((key) => types.value.some((type) => type.key === key && type.count > 0));
    selected.value = keep.length ? keep : types.value.filter((type) => type.count > 0).map((type) => type.key);
  } catch {
    error.value = t("documents.annualArchive.loadFailed");
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  (open) => open && load(),
  { immediate: true }
);

const changeYear = (value) => load(Number(value));
const toggle = (key) => {
  selected.value = selected.value.includes(key) ? selected.value.filter((k) => k !== key) : [...selected.value, key];
};
const toggleAll = () => {
  selected.value = allSelected.value ? [] : withDocuments.value.map((type) => type.key);
};

const readError = async (err) => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text());
      return (json.errors && Object.values(json.errors).flat()[0]) || json.message;
    } catch {
      return null;
    }
  }
  return data?.message;
};

const submit = async () => {
  if (!selected.value.length) {
    error.value = t("documents.annualArchive.pickOne");
    return;
  }
  exporting.value = true;
  error.value = "";
  try {
    const response = await axiosInstance.post("/annual-archive/export", { year: year.value, types: selected.value }, { responseType: "blob", timeout: 0 });
    const single = selected.value.length === 1;
    const label = single ? types.value.find((type) => type.key === selected.value[0])?.label : null;
    const filename = single ? `Arsip-${year.value}-${(label || "Dokumen").replace(/\s+/g, "-")}.pdf` : `Arsip-Dokumen-${year.value}.zip`;
    const url = window.URL.createObjectURL(new Blob([response.data], { type: single ? "application/pdf" : "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success(t("documents.annualArchive.done"), filename);
    close();
  } catch (err) {
    error.value = (await readError(err)) || t("documents.annualArchive.failed");
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <UiModal :open="open" :title="$t('documents.annualArchive.title')" :description="$t('documents.annualArchive.description')" size="md" @update:open="(value) => !value && close()">
    <div class="space-y-4">
      <UiSelect :model-value="year" :options="yearOptions" :label="$t('documents.annualArchive.year')" :disabled="loading || exporting" @update:model-value="changeYear" />

      <div v-if="loading" class="space-y-2" aria-busy="true">
        <Skeleton v-for="i in 5" :key="i" height="40px" />
      </div>

      <template v-else-if="types.length">
        <div class="flex items-center justify-between">
          <p class="text-ui-small font-medium text-ui-ink">{{ $t("documents.annualArchive.types") }}</p>
          <button type="button" class="text-ui-cap font-medium text-ui-accent hover:underline disabled:opacity-50" :disabled="!withDocuments.length" @click="toggleAll">
            {{ allSelected ? $t("documents.annualArchive.selectNone") : $t("documents.annualArchive.selectAll") }}
          </button>
        </div>
        <ul class="rounded-ui-control border border-ui-line divide-y divide-ui-line" role="group" :aria-label="$t('documents.annualArchive.types')">
          <li v-for="type in types" :key="type.key">
            <button
              type="button"
              role="checkbox"
              :aria-checked="selected.includes(type.key)"
              :disabled="type.count === 0"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-ui-subtle disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              @click="toggle(type.key)"
            >
              <component :is="selected.includes(type.key) ? CheckSquare : Square" class="w-4 h-4 shrink-0" :class="selected.includes(type.key) ? 'text-ui-accent' : 'text-ui-faint'" />
              <span class="flex-1 text-ui-small text-ui-ink">{{ type.label }}</span>
              <span class="text-ui-cap tabular-nums" :class="type.count ? 'text-ui-muted' : 'text-ui-faint'">{{ $t("documents.annualArchive.count", { n: type.count }, type.count) }}</span>
            </button>
          </li>
        </ul>
        <p class="text-ui-cap text-ui-muted">
          {{ selected.length > 1 ? $t("documents.annualArchive.zipHint", { n: selected.length }) : $t("documents.annualArchive.pdfHint") }}
          {{ $t("documents.annualArchive.excluded") }}
        </p>
      </template>

      <UiAlert v-if="exporting" tone="info">{{ $t("documents.annualArchive.working", { n: totalSelected }) }}</UiAlert>
      <p v-if="error" class="text-ui-cap text-ui-bad">{{ error }}</p>
    </div>

    <template #footer>
      <UiButton variant="secondary" class="flex-1 sm:flex-none" :disabled="exporting" @click="close">{{ $t("common.actions.cancel") }}</UiButton>
      <UiButton :icon="Download" :loading="exporting" :disabled="loading || !selected.length" class="flex-1 sm:flex-none" @click="submit">
        {{ selected.length > 1 ? $t("documents.annualArchive.downloadZip") : $t("documents.annualArchive.downloadPdf") }}
      </UiButton>
    </template>
  </UiModal>
</template>
