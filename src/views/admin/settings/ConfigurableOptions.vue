<script setup>
import { computed, ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { ListChecks, Plus, Trash2, Pencil, X, Check, ChevronRight, ArrowLeft } from "lucide-vue-next";
import { useConfigurableOptionStore } from "@/stores/configurableOption";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { useScrollFade } from "@/composables/useScrollFade";
import { UiBadge, UiButton, UiChips, UiEmpty, UiInput, UiPageHeader, UiTable } from "@/components/ui";

const { t } = useI18n();
const store = useConfigurableOptionStore();
const alertModal = useAlertModalStore();
const { options, loading } = storeToRefs(store);

const categories = [
  { key: "employment_type", labelKey: "employmentType" },
  { key: "ptkp_status", labelKey: "ptkpStatus" },
  { key: "bank_name", labelKey: "bankName" },
  { key: "preferred_language", labelKey: "preferredLanguage" },
  { key: "subscription_service_type", labelKey: "subscriptionServiceType" },
];

const activeCategory = ref(categories[0].key);
const { scrollRef: tabScrollRef, showLeftFade: showTabLeftFade, showRightFade: showTabRightFade, updateFade: updateTabFade } = useScrollFade();

// Presentation only.
const categoryChips = computed(() => categories.map((c) => ({ value: c.key, label: t(`settings.options.categories.${c.labelKey}`) })));
const optionColumns = computed(() => [
  { key: "label", label: t("settings.options.columns.label") },
  { key: "value", label: t("settings.options.columns.value") },
  { key: "is_active", label: t("common.labels.status"), width: 120 },
  { key: "actions", label: "", align: "right", width: 120 },
]);

const newValue = ref("");
const newLabel = ref("");
const formError = ref("");

const editingId = ref(null);
const editValue = ref("");
const editLabel = ref("");

const load = () => store.fetchByCategory(activeCategory.value);

onMounted(load);
watch(activeCategory, load);

const handleAdd = async () => {
  formError.value = "";
  if (!newValue.value.trim() || !newLabel.value.trim()) {
    formError.value = t("settings.options.required");
    return;
  }
  try {
    await store.createOption({
      category: activeCategory.value,
      value: newValue.value.trim(),
      label: newLabel.value.trim(),
    });
    newValue.value = "";
    newLabel.value = "";
  } catch (error) {
    formError.value = error?.response?.data?.message || t("settings.options.addFailed");
  }
};

const startEdit = (option) => {
  editingId.value = option.id;
  editValue.value = option.value;
  editLabel.value = option.label;
};

const cancelEdit = () => {
  editingId.value = null;
};

const saveEdit = async (option) => {
  try {
    await store.updateOption(option.id, { value: editValue.value.trim(), label: editLabel.value.trim() });
    editingId.value = null;
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || t("settings.options.updateFailed"), { type: "danger" });
  }
};

const toggleActive = async (option) => {
  try {
    await store.updateOption(option.id, { is_active: !option.is_active });
  } catch (error) {
    await alertModal.alert(t("settings.options.updateFailed"), { type: "danger" });
  }
};

const handleDelete = async (option) => {
  if (!(await alertModal.confirm(t("settings.options.deleteConfirm", { label: option.label })))) return;
  try {
    await store.deleteOption(option.id);
  } catch (error) {
    await alertModal.alert(t("settings.options.deleteFailed"), { type: "danger" });
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('settings.options.title')" :subtitle="$t('settings.options.subtitle')">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" :aria-label="$t('settings.backToSettings')" :title="$t('settings.backToSettings')">
          <ArrowLeft class="w-4 h-4" /> {{ $t("settings.settings") }}
        </router-link>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <div class="px-4 sm:px-5 pt-4 pb-3 border-b border-ui-line space-y-3">
        <UiChips v-model="activeCategory" :options="categoryChips" />

        <!-- Add Form -->
        <form v-if="can('option-create')" @submit.prevent="handleAdd" class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <UiInput v-model="newValue" :placeholder="$t('settings.options.valuePlaceholder')" :aria-label="$t('settings.options.columns.value')" />
          <UiInput v-model="newLabel" :placeholder="$t('settings.options.labelPlaceholder')" :aria-label="$t('settings.options.columns.label')" />
          <UiButton type="submit" :icon="Plus">{{ $t("common.actions.add") }}</UiButton>
        </form>
        <p v-if="formError" class="text-ui-small text-ui-bad">{{ formError }}</p>
      </div>

      <UiTable :columns="optionColumns" :rows="options" :loading="loading" :skeleton-rows="4">
        <template #cell-label="{ row }">
          <UiInput v-if="editingId === row.id" v-model="editLabel" :aria-label="$t('settings.options.columns.label')" />
          <span v-else class="text-ui-ink font-medium">{{ row.label }}</span>
        </template>
        <template #cell-value="{ row }">
          <UiInput v-if="editingId === row.id" v-model="editValue" mono :aria-label="$t('settings.options.columns.value')" />
          <code v-else class="font-mono text-ui-cap text-ui-muted">{{ row.value }}</code>
        </template>
        <template #cell-is_active="{ row }">
          <button
            v-if="can('option-edit') && editingId !== row.id"
            type="button"
            class="ui-press"
            :title="row.is_active ? $t('settings.options.clickToHide') : $t('settings.options.clickToActivate')"
            @click="toggleActive(row)"
          >
            <UiBadge :tone="row.is_active ? 'ok' : 'neutral'" dot>{{ row.is_active ? $t("common.labels.active") : $t("settings.options.hidden") }}</UiBadge>
          </button>
          <UiBadge v-else :tone="row.is_active ? 'ok' : 'neutral'" dot>{{ row.is_active ? $t("common.labels.active") : $t("settings.options.hidden") }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div v-if="editingId === row.id" class="flex items-center justify-end gap-1">
            <UiButton size="sm" :icon="Check" :aria-label="$t('common.actions.save')" @click="saveEdit(row)" />
            <UiButton variant="ghost" size="sm" :icon="X" :aria-label="$t('common.actions.cancel')" @click="cancelEdit" />
          </div>
          <div v-else class="flex items-center justify-end gap-1">
            <UiButton v-if="can('option-edit')" variant="ghost" size="sm" :icon="Pencil" :aria-label="$t('common.actions.edit')" @click="startEdit(row)" />
            <UiButton v-if="can('option-delete')" variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('common.actions.delete')" @click="handleDelete(row)" />
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div v-if="editingId === row.id" class="px-4 py-3.5 space-y-2">
            <UiInput v-model="editValue" mono :aria-label="$t('settings.options.columns.value')" />
            <UiInput v-model="editLabel" :aria-label="$t('settings.options.columns.label')" />
            <div class="flex justify-end gap-2">
              <UiButton variant="secondary" size="sm" :icon="X" @click="cancelEdit">{{ $t("common.actions.cancel") }}</UiButton>
              <UiButton size="sm" :icon="Check" @click="saveEdit(row)">{{ $t("common.actions.save") }}</UiButton>
            </div>
          </div>
          <div v-else class="flex items-center gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.label }}</p>
              <p class="text-ui-cap text-ui-muted truncate font-mono">{{ row.value }}</p>
            </div>
            <button v-if="can('option-edit')" type="button" class="ui-press shrink-0" @click="toggleActive(row)">
              <UiBadge :tone="row.is_active ? 'ok' : 'neutral'" dot>{{ row.is_active ? $t("common.labels.active") : $t("settings.options.hidden") }}</UiBadge>
            </button>
            <UiBadge v-else :tone="row.is_active ? 'ok' : 'neutral'" dot class="shrink-0">{{ row.is_active ? $t("common.labels.active") : $t("settings.options.hidden") }}</UiBadge>
            <UiButton v-if="can('option-edit')" variant="ghost" size="sm" :icon="Pencil" :aria-label="$t('common.actions.edit')" @click="startEdit(row)" />
            <UiButton v-if="can('option-delete')" variant="ghost" size="sm" :icon="Trash2" :aria-label="$t('common.actions.delete')" @click="handleDelete(row)" />
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="ListChecks" :title="$t('settings.options.empty')" compact />
        </template>
      </UiTable>
    </section>
  </div>
</template>
