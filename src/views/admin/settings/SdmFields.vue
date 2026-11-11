<script setup>
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Users2Icon, Plus, Trash2, ArrowLeft } from "lucide-vue-next";
import { useSdmFieldStore } from "@/stores/sdmField";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiButton, UiEmpty, UiInput, UiPageHeader, UiTable } from "@/components/ui";

const store = useSdmFieldStore();
const alertModal = useAlertModalStore();
const { fields, loading } = storeToRefs(store);

const newField = ref("");
const errorMessage = ref("");

onMounted(() => store.fetchFields());

// Presentation only.
const fieldColumns = [
  { key: "name", label: "Field name" },
  { key: "actions", label: "", align: "right", width: 64 },
];

const handleAdd = async () => {
  errorMessage.value = "";
  if (!newField.value.trim()) return;
  try {
    await store.createField({ name: newField.value.trim() });
    newField.value = "";
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || "Failed to add field.";
  }
};

const handleDelete = async (field) => {
  if (!(await alertModal.confirm(`Delete field "${field.name}"?`))) return;
  try {
    await store.deleteField(field.id);
  } catch (error) {
    await alertModal.alert("Failed to delete field. It may still be in use by SDM Resource.", { type: "danger" });
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="SDM Field" subtitle="List of fields/roles selectable when adding an SDM Resource in Operational Cost">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" aria-label="Back to Settings" title="Back to Settings">
          <ArrowLeft class="w-4 h-4" /> Settings
        </router-link>
      </template>
    </UiPageHeader>

    <p v-if="errorMessage" class="text-ui-small text-ui-bad">{{ errorMessage }}</p>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <div class="px-4 sm:px-5 pt-4 pb-4 border-b border-ui-line flex flex-col md:flex-row md:items-end gap-3">
        <div class="flex-1 min-w-0">
          <h2 class="text-ui-h2 text-ui-ink">Fields</h2>
          <p class="text-ui-cap text-ui-muted tabular-nums">{{ fields.length }} fields</p>
        </div>
        <form @submit.prevent="handleAdd" class="flex items-end gap-2 md:w-[420px]">
          <UiInput v-model="newField" label="Field Name" placeholder="e.g. Backend Developer" class="flex-1" />
          <UiButton type="submit" :icon="Plus">Add</UiButton>
        </form>
      </div>

      <UiTable :columns="fieldColumns" :rows="fields" :loading="loading" :skeleton-rows="4">
        <template #cell-name="{ row }">
          <span class="text-ui-ink font-medium">{{ row.name }}</span>
        </template>
        <template #cell-actions="{ row }">
          <UiButton variant="ghost" size="sm" :icon="Trash2" aria-label="Delete field" @click="handleDelete(row)" />
        </template>
        <template #mobile="{ row, number }">
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
            <span class="flex-1 min-w-0 text-ui-body font-medium text-ui-ink truncate">{{ row.name }}</span>
            <UiButton variant="ghost" size="sm" :icon="Trash2" aria-label="Delete field" @click="handleDelete(row)" />
          </div>
        </template>
        <template #empty>
          <UiEmpty :icon="Users2Icon" title="No SDM fields yet" compact />
        </template>
      </UiTable>
    </section>
  </div>
</template>
