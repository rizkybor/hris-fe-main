<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { Award, Plus, Download, Trash2, Search, SearchX, Layers, CalendarDays, Settings, ArrowLeft } from "lucide-vue-next";
import { useCertificateStore } from "@/stores/certificate";
import { can } from "@/helpers/permissionHelper";
import Pagination from "@/components/common/Pagination.vue";
import { UiPageHeader, UiButton, UiInput, UiChips, UiTable, UiBadge, UiEmpty, UiStat, UiConfirmDialog } from "@/components/ui";
import { useAlertModalStore } from "@/stores/alertModal";

const { t } = useI18n();
const store = useCertificateStore();
const alertModal = useAlertModalStore();
const { certificates, meta, statistics, loading } = storeToRefs(store);

const search = ref("");
const typeFilter = ref("");
const isDeleteModalOpen = ref(false);
const certificateToDelete = ref(null);
const downloadingId = ref(null);

const load = (page = 1) => {
  store.fetchCertificates({
    search: search.value || undefined,
    type: typeFilter.value || undefined,
    page,
  });
};

onMounted(() => {
  load();
  store.fetchStatistics();
});

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const handleDownload = async (certificate) => {
  downloadingId.value = certificate.id;
  try {
    await store.downloadCertificate(certificate.id, certificate.certificate_number);
  } finally {
    downloadingId.value = null;
  }
};

const confirmDelete = (certificate) => {
  certificateToDelete.value = certificate;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!certificateToDelete.value) return;
  await store.deleteCertificate(certificateToDelete.value.id);
  isDeleteModalOpen.value = false;
  certificateToDelete.value = null;
};

// Presentation only: type chips, table columns, icon button style.
const TYPE_OPTIONS = computed(() => [
  { value: "", label: t("documents.certificate.list.allTypes") },
  { value: "individual", label: t("documents.certificate.types.individual") },
  { value: "batch", label: t("documents.certificate.types.batch") },
]);
const COLUMNS = computed(() => [
  { key: "certificate_number", label: t("documents.certificate.list.columns.number") },
  { key: "title", label: t("documents.certificate.list.columns.title") },
  { key: "recipient_name", label: t("documents.certificate.list.columns.recipient") },
  { key: "created_at", label: t("common.labels.date") },
  { key: "creator", label: t("common.labels.createdBy") },
  { key: "actions", label: "", align: "right" },
]);
const iconBtn =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink disabled:opacity-50 focus:outline-none focus-visible:shadow-ui-focus";

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString(localeTag(), { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>


<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('documents.certificate.list.title')" :subtitle="$t('documents.certificate.list.subtitle')" class="ui-anim-fade-up">
      <template #eyebrow>
        <router-link
          :to="{ name: 'admin.documents.dashboard' }"
          class="ui-press inline-flex items-center gap-1 mb-1.5 text-ui-small font-medium text-ui-accent hover:underline"
          :aria-label="$t('documents.shared.backToDocuments')"
          :title="$t('documents.shared.backToDocuments')"
        >
          <ArrowLeft class="w-4 h-4" />{{ $t("documents.shared.documents") }}
        </router-link>
      </template>
      <template #actions>
        <UiButton
          v-if="can('certificate-menu')"
          variant="secondary"
          :icon="Settings"
          :to="{ name: 'admin.settings.certificate-settings' }"
          :title="$t('documents.certificate.list.settings')"
          :aria-label="$t('documents.certificate.list.settings')"
          class="!px-2.5"
        />
        <UiButton v-if="can('certificate-create')" :to="{ name: 'admin.certificates.create' }" :icon="Plus" class="flex-1 sm:flex-none">{{ $t("documents.certificate.list.generate") }}</UiButton>
      </template>
    </UiPageHeader>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 ui-stagger">
      <UiStat :label="$t('documents.certificate.list.stats.total')" :value="statistics.total_certificates" :icon="Award" />
      <UiStat :label="$t('documents.certificate.list.stats.batches')" :value="statistics.total_batches" :icon="Layers" />
      <UiStat :label="$t('documents.certificate.list.stats.thisMonth')" :value="statistics.this_month" :icon="CalendarDays" />
    </div>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <!-- Toolbar -->
      <div class="px-4 sm:px-5 py-3.5 border-b border-ui-line flex flex-col md:flex-row md:items-center gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          :placeholder="$t('documents.certificate.list.searchPlaceholder')"
          class="md:w-[340px]"
          @keyup.enter="handleSearch"
        />
        <UiChips v-model="typeFilter" :options="TYPE_OPTIONS" @update:model-value="handleFilterChange" />
      </div>

      <UiTable :columns="COLUMNS" :rows="certificates" :meta="meta" :loading="loading" :skeleton-rows="6">
        <template #cell-certificate_number="{ row }">
          <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span class="font-mono text-ui-cap text-ui-ink">{{ row.certificate_number }}</span>
            <UiBadge v-if="row.batch_id" tone="info">BATCH</UiBadge>
          </span>
        </template>
        <template #cell-title="{ row }">
          <span class="block max-w-[300px] truncate text-ui-ink" :title="row.title">{{ row.title }}</span>
        </template>
        <template #cell-created_at="{ row }">
          <span class="tabular-nums whitespace-nowrap">{{ formatDate(row.created_at) }}</span>
        </template>
        <template #cell-creator="{ row }">{{ row.creator || "-" }}</template>
        <template #cell-actions="{ row }">
          <div class="inline-flex items-center gap-0.5">
            <button type="button" :class="iconBtn" :disabled="downloadingId === row.id" :title="$t('common.actions.downloadPdf')" :aria-label="$t('documents.shared.downloadPdfItem', { number: row.certificate_number })" @click="handleDownload(row)">
              <Download class="w-4 h-4" />
            </button>
            <button
              v-if="can('certificate-delete')"
              type="button"
              :class="[iconBtn, 'hover:!bg-ui-bad-soft hover:!text-ui-bad']"
              :title="$t('common.actions.delete')"
              :aria-label="$t('documents.shared.deleteItem', { number: row.certificate_number })"
              @click="confirmDelete(row)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- Phones: one card per certificate -->
        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="w-5 pt-0.5 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 min-w-0">
                <p class="font-mono text-ui-cap text-ui-muted truncate">{{ row.certificate_number }}</p>
                <UiBadge v-if="row.batch_id" tone="info" class="shrink-0">BATCH</UiBadge>
              </div>
              <p class="text-ui-body font-medium text-ui-ink mt-0.5 break-words">{{ row.recipient_name }}</p>
              <p class="text-ui-cap text-ui-muted mt-0.5 break-words">{{ row.title }}</p>
              <p class="text-ui-cap text-ui-muted mt-0.5">
                <span class="tabular-nums">{{ formatDate(row.created_at) }}</span> · {{ row.creator || "-" }}
              </p>
            </div>
            <div class="flex flex-col items-center gap-1 shrink-0 -mr-1.5 -mt-1">
              <button type="button" :class="iconBtn" class="!w-9 !h-9" :disabled="downloadingId === row.id" :aria-label="$t('documents.shared.downloadPdfItem', { number: row.certificate_number })" @click="handleDownload(row)">
                <Download class="w-4 h-4" />
              </button>
              <button v-if="can('certificate-delete')" type="button" :class="iconBtn" class="!w-9 !h-9" :aria-label="$t('documents.shared.deleteItem', { number: row.certificate_number })" @click="confirmDelete(row)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="search || typeFilter" :icon="SearchX" :title="$t('documents.certificate.list.noMatchTitle')" :message="$t('documents.certificate.list.noMatchMessage')" compact />
          <UiEmpty v-else :icon="Award" :title="$t('documents.certificate.list.emptyTitle')" compact>
            <UiButton v-if="can('certificate-create')" variant="secondary" size="sm" :icon="Plus" :to="{ name: 'admin.certificates.create' }">{{ $t("documents.certificate.list.generate") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div class="px-4 sm:px-5 pb-4">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('documents.certificate.list.itemLabel')" @page-change="load" />
      </div>
    </section>

    <UiConfirmDialog
      v-model:open="isDeleteModalOpen"
      type="danger"
      :title="$t('documents.certificate.list.deleteTitle')"
      :message="$t('documents.certificate.list.deleteMessage', { number: certificateToDelete?.certificate_number })"
      :confirm-text="$t('documents.shared.yesDelete')"
      @confirm="handleDelete"
    />
  </div>
</template>
