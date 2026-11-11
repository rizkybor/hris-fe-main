<script setup>
import { computed, ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { Users2Icon, Plus, Trash2, ArrowLeft } from "lucide-vue-next";
import { useSdmFieldStore } from "@/stores/sdmField";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiButton, UiEmpty, UiInput, UiPageHeader, UiTable } from "@/components/ui";

const { t } = useI18n();
const store = useSdmFieldStore();
const alertModal = useAlertModalStore();
const { fields, loading } = storeToRefs(store);

const newField = ref("");
const errorMessage = ref("");

onMounted(() => store.fetchFields());

// Presentation only.
const fieldColumns = computed(() => [
  { key: "name", label: t("settings.sdmFields.fieldNameColumn") },
  { key: "actions", label: "", align: "right", width: 64 },
]);

const handleAdd = async () => {
  errorMessage.value = "";
  if (!newField.value.trim()) return;
  try {
    await store.createField({ name: newField.value.trim() });
    newField.value = "";
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || t("settings.sdmFields.addFailed");
  }
};

const handleDelete = async (field) => {
  if (!(await alertModal.confirm(t("settings.sdmFields.deleteConfirm", { name: field.name })))) return;
  try {
    await store.deleteField(field.id);
  } catch (error) {
    await alertModal.alert(t("settings.sdmFields.deleteFailed"), { type: "danger" });
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('settings.sdmFields.title')" :subtitle="$t('settings.sdmFields.subtitle')">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" :aria-label="$t('settings.backToSettings')" :title="$t('settings.backToSettings')">
          <ArrowLeft class="w-4 h-4" /> {{ $t("settings.settings") }}
        </router-link>
      </template>
    </UiPageHeader>

    <p v-if="errorMessage" class="text-ui-small text-ui-bad">{{ errorMessage }}</p>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <div class="px-4 sm:px-5 pt-4 pb-4 border-b border-ui-line flex flex-col md:flex-row md:items-end gap-3">
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink">{{ $t("settings.sdmFields.listTitle") }}</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">{{ $t("settings.sdmFields.count", { n: fields.length }, fields.length) }}</p>
        </div>
        <form @submit.prevent="handleAdd" class="flex items-end gap-2 md:w-[420px]">
          <UiInput v-model="newField" :label="$t('settings.sdmFields.fieldName')" :placeholder="$t('settings.sdmFields.placeholder')" class="flex-1" />
          <UiButton type="submit" :icon="Plus">{{ $t("common.actions.add") }}</UiButton>
        </form>
      </div>

      <UiTable :columns="fieldColumns" :rows="fields" :loading="loading" :skeleton-rows="4">
        <template #cell-name="{ row }">
          <span class="text-ui-ink font-medium">{{ row.name }}</span>
        </template>
        <template #cell-actions="{ row }">
          <UiButton variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('settings.sdmFields.deleteAria')" @click="handleDelete(row)" />
        </template>
        <template #mobile="{ row, number }">
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
            <span class="flex-1 min-w-0 text-ui-body font-medium text-ui-ink truncate">{{ row.name }}</span>
            <UiButton variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('settings.sdmFields.deleteAria')" @click="handleDelete(row)" />
          </div>
        </template>
        <template #empty>
          <UiEmpty :icon="Users2Icon" :title="$t('settings.sdmFields.empty')" compact />
        </template>
      </UiTable>
    </section>
  </div>
</template>
