<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { Award, Plus, Download, FileText, Trash2, Search, SearchX, Layers, CalendarDays, Settings, ArrowLeft } from "lucide-vue-next";
import { useCertificateStore } from "@/stores/certificate";
import { useToastStore } from "@/stores/toast";
import { can } from "@/helpers/permissionHelper";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import Pagination from "@/components/common/Pagination.vue";
import { UiPageHeader, UiButton, UiInput, UiChips, UiTable, UiBadge, UiEmpty, UiStat, UiSpinner, UiConfirmDialog } from "@/components/ui";

const { t } = useI18n();
const store = useCertificateStore();
const toast = useToastStore();
const { certificates, meta, statistics } = storeToRefs(store);

// Search, type and page live in the URL and are remembered; the list shows
// what the store has and refreshes quietly.
const list = useListState("certificates", { q: "", type: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));

const params = computed(() => ({ search: list.q || undefined, type: list.type || undefined, page: list.page }));
const { loading, refreshing } = useStaleFetch(() => store.fetchCertificates(params.value), {
  key: () => ["certificates", params.value],
  hasData: () => store.listKey !== null,
});
// The counters don't depend on the filters.
const { refresh: refreshStats } = useStaleFetch(() => store.fetchStatistics(), {
  key: () => "certificates-statistics",
  hasData: () => store.statisticsLoaded,
});
const goToPage = (page) => (list.page = page);

const isDeleteModalOpen = ref(false);
const certificateToDelete = ref(null);
const downloadingId = ref(null);
const viewingId = ref(null);

const handleDownload = async (certificate) => {
  downloadingId.value = certificate.id;
  try {
    await store.downloadCertificate(certificate.id, certificate.certificate_number);
  } catch {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    downloadingId.value = null;
  }
};

// Called straight from the click (no await before it) so the new tab
// isn't treated as a popup. A row click opens it too.
const handleViewPdf = async (certificate) => {
  viewingId.value = certificate.id;
  try {
    await store.viewPdf(certificate.id);
  } catch {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    viewingId.value = null;
  }
};

const confirmDelete = (certificate) => {
  certificateToDelete.value = certificate;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  const certificate = certificateToDelete.value;
  if (!certificate) return;
  try {
    // Removes the row and lowers the total in the store.
    await store.deleteCertificate(certificate.id);
    toast.success(t("documents.certificate.list.toast.deleted"), certificate.certificate_number);
    refreshStats({ force: true });
    if (!certificates.value.length && list.page > 1) list.page -= 1;
  } catch (err) {
    toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  } finally {
    isDeleteModalOpen.value = false;
    certificateToDelete.value = null;
  }
};

// Presentation only: type chips, table columns.
const TYPE_OPTIONS = computed(() => [
  { value: "", label: t("documents.certificate.list.allTypes") },
  { value: "individual", label: t("documents.certificate.types.individual") },
  { value: "batch", label: t("documents.certificate.types.batch") },
]);
const COLUMNS = computed(() => [
  { key: "recipient_name", label: t("documents.certificate.list.columns.certificate") },
  { key: "title", label: t("documents.certificate.list.columns.title") },
  { key: "created_at", label: t("documents.certificate.list.columns.issued") },
  { key: "actions", label: "", align: "right", width: 152 },
]);
const quietDanger = "!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft";

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
      <!-- Toolbar: search · type, one line on desktop -->
      <div class="px-4 sm:px-5 py-3 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <UiInput
          v-model="search"
          :icon="Search"
          :placeholder="$t('documents.certificate.list.searchPlaceholder')"
          :aria-label="$t('documents.certificate.list.searchPlaceholder')"
          class="lg:w-[320px]"
        />
        <UiChips v-model="list.type" :options="TYPE_OPTIONS" size="sm" class="min-w-0 lg:flex-1" />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("documents.shared.refreshing") }}
        </span>
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="certificates"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        clickable
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        @row-click="handleViewPdf"
      >
        <template #cell-recipient_name="{ row }">
          <div class="min-w-0 max-w-[360px] py-2.5">
            <div class="flex items-center gap-1.5 min-w-0">
              <p class="text-ui-ink font-medium truncate" :title="row.recipient_name">{{ row.recipient_name }}</p>
              <UiBadge v-if="row.batch_id" tone="info" class="shrink-0">{{ $t("documents.certificate.list.batch") }}</UiBadge>
            </div>
            <p class="mt-0.5 font-mono text-ui-cap text-ui-muted truncate" :title="row.certificate_number">{{ row.certificate_number }}</p>
          </div>
        </template>
        <template #cell-title="{ row }">
          <span class="block max-w-[300px] truncate text-ui-text" :title="row.title">{{ row.title }}</span>
        </template>
        <template #cell-created_at="{ row }">
          <p class="tabular-nums whitespace-nowrap text-ui-text">{{ formatDate(row.created_at) }}</p>
          <p v-if="row.creator" class="text-ui-cap text-ui-muted truncate max-w-[160px]">{{ row.creator }}</p>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <UiButton
              variant="ghost"
              size="sm"
              :icon="Download"
              :loading="downloadingId === row.id"
              :title="$t('common.actions.downloadPdf')"
              :aria-label="$t('documents.shared.downloadPdfItem', { number: row.certificate_number })"
              @click="handleDownload(row)"
            />
            <UiButton
              variant="secondary"
              size="sm"
              :icon="FileText"
              :loading="viewingId === row.id"
              :aria-label="$t('documents.shared.viewPdfItem', { number: row.certificate_number })"
              @click="handleViewPdf(row)"
            >{{ $t("documents.shared.pdf") }}</UiButton>
            <UiButton
              v-if="can('certificate-delete')"
              variant="ghost"
              size="sm"
              :icon="Trash2"
              :class="quietDanger"
              :title="$t('common.actions.delete')"
              :aria-label="$t('documents.shared.deleteItem', { number: row.certificate_number })"
              @click="confirmDelete(row)"
            />
          </div>
        </template>

        <!-- Phones: the same simplified row as a card -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5">
            <div class="flex items-start gap-3">
              <span class="w-5 pt-0.5 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink break-words">{{ row.recipient_name }}</p>
                <p class="text-ui-cap text-ui-muted truncate mt-0.5">{{ row.title }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 pl-8">
              <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <UiBadge v-if="row.batch_id" tone="info">{{ $t("documents.certificate.list.batch") }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">{{ formatDate(row.created_at) }}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0" @click.stop>
                <UiButton
                  variant="secondary"
                  size="sm"
                  :icon="FileText"
                  :loading="viewingId === row.id"
                  :aria-label="$t('documents.shared.viewPdfItem', { number: row.certificate_number })"
                  @click="handleViewPdf(row)"
                >{{ $t("documents.shared.pdf") }}</UiButton>
                <UiButton
                  v-if="can('certificate-delete')"
                  variant="ghost"
                  size="sm"
                  :icon="Trash2"
                  :class="quietDanger"
                  :aria-label="$t('documents.shared.deleteItem', { number: row.certificate_number })"
                  @click="confirmDelete(row)"
                />
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="list.isDirty" :icon="SearchX" :title="$t('documents.certificate.list.noMatchTitle')" :message="$t('documents.certificate.list.noMatchMessage')" compact>
            <UiButton variant="secondary" size="sm" @click="(search = ''), list.reset()">{{ $t("common.actions.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty v-else :icon="Award" :title="$t('documents.certificate.list.emptyTitle')" compact>
            <UiButton v-if="can('certificate-create')" variant="secondary" size="sm" :icon="Plus" :to="{ name: 'admin.certificates.create' }">{{ $t("documents.certificate.list.generate") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <div v-if="meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('documents.certificate.list.itemLabel')" @page-change="goToPage" />
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
