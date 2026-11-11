<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { Tags, Plus, Trash2, FileText, Building2Icon, ArrowLeft } from "lucide-vue-next";
import { useLetterStore } from "@/stores/letter";
import { useAlertModalStore } from "@/stores/alertModal";
import Pagination from "@/components/common/Pagination.vue";
import { UiButton, UiEmpty, UiInput, UiPageHeader, UiTable } from "@/components/ui";

const PER_PAGE = 10;

const { t } = useI18n();
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

// Presentation only.
const codeColumns = computed(() => [
  { key: "code", label: t("settings.documentCodes.code"), width: 110 },
  { key: "name", label: t("common.labels.name") },
  { key: "actions", label: "", align: "right", width: 64 },
]);

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
    errorMessage.value = error?.response?.data?.message || t("settings.documentCodes.letter.addFailed");
  }
};

const handleDeleteLetterCode = async (id) => {
  if (!(await alertModal.confirm(t("settings.documentCodes.letter.deleteConfirm")))) return;
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
    errorMessage.value = error?.response?.data?.message || t("settings.documentCodes.division.addFailed");
  }
};

const handleDeleteDivisionCode = async (id) => {
  if (!(await alertModal.confirm(t("settings.documentCodes.division.deleteConfirm")))) return;
  await store.deleteDivisionCode(id);
  if (divisionCodePage.value > paginatedDivisionCodes.value.meta.last_page) {
    divisionCodePage.value = paginatedDivisionCodes.value.meta.last_page;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('settings.documentCodes.title')" :subtitle="$t('settings.documentCodes.subtitle')">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" :aria-label="$t('settings.backToSettings')" :title="$t('settings.backToSettings')">
          <ArrowLeft class="w-4 h-4" /> {{ $t("settings.settings") }}
        </router-link>
      </template>
    </UiPageHeader>

    <p v-if="errorMessage" class="text-ui-small text-ui-bad">{{ errorMessage }}</p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
        <div class="px-4 sm:px-5 pt-4 pb-4 border-b border-ui-line">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-ui-control bg-ui-subtle text-ui-text flex items-center justify-center shrink-0"><FileText class="w-4 h-4" /></span>
            <div class="min-w-0">
              <h2 class="text-ui-h2 text-ui-ink">{{ $t("settings.documentCodes.letter.title") }}</h2>
              <p class="text-ui-cap text-ui-muted tabular-nums">{{ $t("settings.documentCodes.count", { n: letterCodes.length }, letterCodes.length) }}</p>
            </div>
          </div>
          <form @submit.prevent="handleAddLetterCode" class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-end gap-2 mt-4">
            <UiInput v-model="newLetterCode.code" :label="$t('settings.documentCodes.code')" :placeholder="$t('settings.documentCodes.letter.codePlaceholder')" mono class="[&_input]:uppercase" />
            <UiInput v-model="newLetterCode.name" :label="$t('common.labels.name')" :placeholder="$t('settings.documentCodes.letter.namePlaceholder')" />
            <UiButton type="submit" :icon="Plus" :aria-label="$t('common.actions.add')">{{ $t("common.actions.add") }}</UiButton>
          </form>
        </div>

        <UiTable :columns="codeColumns" :rows="paginatedLetterCodes.items" :meta="paginatedLetterCodes.meta">
          <template #cell-code="{ row }">
            <code class="font-mono text-ui-small font-semibold text-ui-ink">{{ row.code }}</code>
          </template>
          <template #cell-actions="{ row }">
            <UiButton variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('common.actions.delete')" @click="handleDeleteLetterCode(row.id)" />
          </template>
          <template #mobile="{ row, number }">
            <div class="flex items-center gap-3 px-4 py-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
              <code class="font-mono text-ui-small font-semibold text-ui-ink w-14 shrink-0">{{ row.code }}</code>
              <span class="flex-1 min-w-0 text-ui-small text-ui-text truncate">{{ row.name }}</span>
              <UiButton variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('common.actions.delete')" @click="handleDeleteLetterCode(row.id)" />
            </div>
          </template>
          <template #empty>
            <UiEmpty :icon="FileText" :title="$t('settings.documentCodes.letter.empty')" compact />
          </template>
        </UiTable>

        <div v-if="paginatedLetterCodes.meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
          <Pagination
            :meta="paginatedLetterCodes.meta"
            :item-label="$t('settings.documentCodes.letter.itemLabel')"
            @page-change="(page) => (letterCodePage = page)"
          />
        </div>
      </section>
      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
        <div class="px-4 sm:px-5 pt-4 pb-4 border-b border-ui-line">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-ui-control bg-ui-subtle text-ui-text flex items-center justify-center shrink-0"><Building2Icon class="w-4 h-4" /></span>
            <div class="min-w-0">
              <h2 class="text-ui-h2 text-ui-ink">{{ $t("settings.documentCodes.division.title") }}</h2>
              <p class="text-ui-cap text-ui-muted tabular-nums">{{ $t("settings.documentCodes.count", { n: divisionCodes.length }, divisionCodes.length) }}</p>
            </div>
          </div>
          <form @submit.prevent="handleAddDivisionCode" class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-end gap-2 mt-4">
            <UiInput v-model="newDivisionCode.code" :label="$t('settings.documentCodes.code')" :placeholder="$t('settings.documentCodes.division.codePlaceholder')" mono class="[&_input]:uppercase" />
            <UiInput v-model="newDivisionCode.name" :label="$t('common.labels.name')" :placeholder="$t('settings.documentCodes.division.namePlaceholder')" />
            <UiButton type="submit" :icon="Plus" :aria-label="$t('common.actions.add')">{{ $t("common.actions.add") }}</UiButton>
          </form>
        </div>

        <UiTable :columns="codeColumns" :rows="paginatedDivisionCodes.items" :meta="paginatedDivisionCodes.meta">
          <template #cell-code="{ row }">
            <code class="font-mono text-ui-small font-semibold text-ui-ink">{{ row.code }}</code>
          </template>
          <template #cell-actions="{ row }">
            <UiButton variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('common.actions.delete')" @click="handleDeleteDivisionCode(row.id)" />
          </template>
          <template #mobile="{ row, number }">
            <div class="flex items-center gap-3 px-4 py-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
              <code class="font-mono text-ui-small font-semibold text-ui-ink w-14 shrink-0">{{ row.code }}</code>
              <span class="flex-1 min-w-0 text-ui-small text-ui-text truncate">{{ row.name }}</span>
              <UiButton variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('common.actions.delete')" @click="handleDeleteDivisionCode(row.id)" />
            </div>
          </template>
          <template #empty>
            <UiEmpty :icon="Building2Icon" :title="$t('settings.documentCodes.division.empty')" compact />
          </template>
        </UiTable>

        <div v-if="paginatedDivisionCodes.meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
          <Pagination
            :meta="paginatedDivisionCodes.meta"
            :item-label="$t('settings.documentCodes.division.itemLabel')"
            @page-change="(page) => (divisionCodePage = page)"
          />
        </div>
      </section>
    </div>
  </div>
</template>
