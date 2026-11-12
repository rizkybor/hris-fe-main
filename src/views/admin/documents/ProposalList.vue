<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { FileText, Plus, Search, SearchX, Copy, Trash2, Share2, ArrowLeft } from "lucide-vue-next";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiSelect, UiChips, UiTable, UiEmpty, UiModal, UiPagination, UiSpinner } from "@/components/ui";
import ShareProposalModal from "@/components/admin/documents/ShareProposalModal.vue";
import { useProposalStore } from "@/stores/proposal";
import { useLookupStore } from "@/stores/lookups";
import { useAlertModalStore } from "@/stores/alertModal";
import { useToastStore } from "@/stores/toast";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { PROPOSAL_STATUSES, proposalStatus } from "@/utils/proposalStatus";

const { t } = useI18n();
const router = useRouter();
const store = useProposalStore();
const lookups = useLookupStore();
const alertModal = useAlertModalStore();
const toast = useToastStore();
const { proposals, meta, saving } = storeToRefs(store);
const clients = computed(() => lookups.clients);

// Search, status and page live in the URL and are remembered, so coming
// back from the editor restores the same view; the list shows what the
// store already has and refreshes quietly.
const list = useListState("proposals", { q: "", status: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));
const statusFilter = computed({ get: () => list.status, set: (v) => (list.status = v) });

const params = computed(() => ({ search: list.q || undefined, status: list.status || undefined, page: list.page, row_per_page: 10 }));
const { loading, refreshing, refresh } = useStaleFetch(() => store.fetchProposals(params.value), {
  key: () => ["proposals-list", params.value],
  hasData: () => store.listKey !== null,
});

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" }) : "-";

// ===== New proposal =====
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const blankForm = () => ({ title: "", client_id: "", client_name: "", recipient: "", proposal_date: today(), letter_number: "" });
const showCreate = ref(false);
const form = ref(blankForm());
const formErrors = ref({});

const openCreate = () => {
  form.value = blankForm();
  formErrors.value = {};
  showCreate.value = true;
  // The client picker comes from the shared cache (loads once).
  lookups.ensure("clients").catch(() => {});
};

// Picking a client fills in its name; the name stays editable (and a
// prospect that isn't a client record yet can just be typed in).
const onClientPicked = () => {
  const client = clients.value.find((c) => String(c.id) === String(form.value.client_id));
  if (client) {
    form.value.client_name = client.name;
    if (!form.value.recipient && client.pic_name) form.value.recipient = client.pic_name;
  }
};

const createProposal = async () => {
  formErrors.value = {};
  try {
    const created = await store.createProposal({ ...form.value, client_id: form.value.client_id || null });
    showCreate.value = false;
    router.push({ name: "admin.proposals.edit", params: { id: created.id } });
  } catch (error) {
    if (error?.response?.status === 422) formErrors.value = error.response.data.errors ?? {};
    else await alertModal.alert(errorMessage(error, t("documents.proposal.list.errors.create")), { type: "danger" });
  }
};

// ===== Row actions =====
const busyId = ref(null);

// store.viewPdf opens the tab synchronously, inside this click.
const viewPdf = async (proposal) => {
  busyId.value = `pdf-${proposal.id}`;
  try {
    await store.viewPdf(proposal.id);
  } catch (error) {
    toast.error(t("documents.shared.pdfFailed"));
  } finally {
    busyId.value = null;
  }
};

const duplicate = async (proposal) => {
  const ok = await alertModal.confirm(t("documents.proposal.list.duplicateConfirm", { title: proposal.title }), {
    confirmText: t("common.actions.duplicate"),
  });
  if (!ok) return;
  busyId.value = `dup-${proposal.id}`;
  try {
    const copy = await store.duplicateProposal(proposal.id);
    router.push({ name: "admin.proposals.edit", params: { id: copy.id } });
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.list.errors.duplicate")), { type: "danger" });
  } finally {
    busyId.value = null;
  }
};

// The row leaves the page in place (no reload); an emptied later page
// steps back one.
const handleDelete = async (proposal) => {
  const ok = await alertModal.confirm(t("documents.proposal.list.deleteConfirm", { title: proposal.title }), {
    type: "danger",
    confirmText: t("common.actions.delete"),
  });
  if (!ok) return;
  try {
    await store.deleteProposal(proposal.id);
    toast.success(t("documents.proposal.list.toast.deleted"), proposal.title);
    if (!proposals.value.length) {
      if (list.page > 1) list.page -= 1;
      else if (meta.value?.total) refresh({ force: true });
    }
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.list.errors.delete")), { type: "danger" });
  }
};

const canCreate = computed(() => can("proposal-create"));
// The row opens the editor; without that right, the PDF.
const openProposal = (proposal) => (can("proposal-edit") ? router.push({ name: "admin.proposals.edit", params: { id: proposal.id } }) : viewPdf(proposal));

const sharingId = ref(null);

// ===== Presentation only =====
const STATUS_TONE = { draft: "neutral", sent: "info", accepted: "ok", rejected: "bad" };
const STATUS_OPTIONS = computed(() => [
  { value: "", label: t("common.labels.all") },
  ...PROPOSAL_STATUSES.map((s) => ({ value: s.value, label: s.label })),
].map((o) => ({ ...o, count: o.value === list.status && !loading.value && !refreshing.value ? meta.value?.total : undefined })));
const clientOptions = computed(() => clients.value.map((c) => ({ value: c.id, label: c.name })));
const COLUMNS = computed(() => [
  { key: "title", label: t("documents.proposal.list.columns.proposal") },
  { key: "proposal_date", label: t("common.labels.date") },
  { key: "status", label: t("common.labels.status") },
  { key: "updated_at", label: t("common.labels.updatedAt") },
  { key: "actions", label: "", align: "right" },
]);
// One muted line under the title: client · section count.
const subline = (row) => [row.client_name, t("documents.proposal.list.sectionCount", { n: row.section_count ?? 0 }, row.section_count ?? 0)].filter(Boolean).join(" · ");
const quietDelete = "!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft";

// Reflect a status change (e.g. Draft -> Terkirim after emailing) in the row.
const onShared = (updated) => store.patchRow(updated.id, { status: updated.status });
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="$t('documents.hub.links.proposal.title')"
      :subtitle="$t('documents.proposal.list.subtitle')"
    >
      <template #eyebrow>
        <router-link :to="{ name: 'admin.documents.dashboard' }" class="inline-flex items-center gap-1 text-ui-small text-ui-accent hover:underline mb-1.5">
          <ArrowLeft class="w-3.5 h-3.5" />
          {{ $t("documents.shared.documents") }}
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="canCreate" :icon="Plus" class="w-full sm:w-auto" @click="openCreate">{{ $t("documents.proposal.list.create") }}</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Toolbar: search · status chips, one line on desktop -->
      <div class="px-4 sm:px-5 py-3 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <UiInput
          v-model="search"
          type="search"
          :icon="Search"
          :placeholder="$t('documents.proposal.list.searchPlaceholder')"
          :aria-label="$t('documents.proposal.list.searchPlaceholder')"
          class="w-full lg:w-[320px] shrink-0"
        />
        <UiChips v-model="statusFilter" :options="STATUS_OPTIONS" size="sm" class="min-w-0 lg:flex-1" />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("documents.shared.refreshing") }}
        </span>
      </div>

      <UiTable
        :columns="COLUMNS"
        :rows="proposals"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        :clickable="true"
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        @row-click="openProposal"
      >
        <template #cell-title="{ row }">
          <div class="min-w-[220px] max-w-[420px] py-2">
            <RouterLink
              v-if="can('proposal-edit')"
              :to="{ name: 'admin.proposals.edit', params: { id: row.id } }"
              class="block font-medium text-ui-ink truncate hover:underline underline-offset-2"
              :title="row.title"
              @click.stop
            >{{ row.title }}</RouterLink>
            <p v-else class="font-medium text-ui-ink truncate" :title="row.title">{{ row.title }}</p>
            <p class="mt-0.5 text-ui-cap text-ui-muted truncate" :title="subline(row)">{{ subline(row) }}</p>
          </div>
        </template>
        <template #cell-proposal_date="{ row }">
          <p class="text-ui-small text-ui-text whitespace-nowrap tabular-nums">{{ formatDate(row.proposal_date) }}</p>
          <p v-if="row.letter_number" class="font-mono text-ui-cap text-ui-muted whitespace-nowrap">{{ row.letter_number }}</p>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot>{{ proposalStatus(row.status).label }}</UiBadge>
        </template>
        <template #cell-updated_at="{ row }">
          <p class="text-ui-small text-ui-text whitespace-nowrap tabular-nums">{{ formatDate(row.updated_at) }}</p>
          <p v-if="row.updater?.name" class="text-ui-cap text-ui-muted whitespace-nowrap">{{ $t("documents.proposal.list.byName", { name: row.updater.name }) }}</p>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <UiButton variant="secondary" size="sm" :icon="FileText" :loading="busyId === `pdf-${row.id}`" :title="$t('documents.shared.viewPdf')" :aria-label="$t('documents.shared.viewPdfItem', { number: row.title })" @click="viewPdf(row)">{{ $t("documents.shared.pdf") }}</UiButton>
            <UiButton v-if="can('proposal-edit')" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Share2" :title="$t('documents.proposal.list.shareHint')" :aria-label="$t('common.actions.share')" @click="sharingId = row.id" />
            <UiButton v-if="canCreate" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Copy" :loading="busyId === `dup-${row.id}`" :title="$t('common.actions.duplicate')" :aria-label="$t('common.actions.duplicate')" @click="duplicate(row)" />
            <UiButton v-if="can('proposal-delete')" variant="ghost" size="sm" :class="['w-[30px] !px-0', quietDelete]" :icon="Trash2" :title="$t('common.actions.delete')" :aria-label="$t('documents.shared.deleteItem', { number: row.title })" @click="handleDelete(row)" />
          </div>
        </template>

        <!-- Phones: the same row as a card -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5">
            <div class="flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 shrink-0 pt-0.5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink line-clamp-2 break-words">{{ row.title }}</p>
                <p class="text-ui-cap text-ui-muted truncate mt-0.5">{{ subline(row) }}</p>
              </div>
              <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot class="shrink-0">{{ proposalStatus(row.status).label }}</UiBadge>
            </div>
            <p class="text-ui-cap text-ui-muted mt-1.5 pl-8 tabular-nums truncate">
              {{ formatDate(row.proposal_date) }}<template v-if="row.letter_number"> · <span class="font-mono">{{ row.letter_number }}</span></template>
            </p>
            <div class="flex items-center gap-1 mt-2 pl-8" @click.stop>
              <UiButton variant="secondary" size="sm" :icon="FileText" :loading="busyId === `pdf-${row.id}`" :aria-label="$t('documents.shared.viewPdfItem', { number: row.title })" @click="viewPdf(row)">{{ $t("documents.shared.pdf") }}</UiButton>
              <UiButton v-if="can('proposal-edit')" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Share2" :aria-label="$t('common.actions.share')" @click="sharingId = row.id" />
              <UiButton v-if="canCreate" variant="ghost" size="sm" class="w-[30px] !px-0" :icon="Copy" :loading="busyId === `dup-${row.id}`" :aria-label="$t('common.actions.duplicate')" @click="duplicate(row)" />
              <UiButton v-if="can('proposal-delete')" variant="ghost" size="sm" :class="['w-[30px] !px-0 ml-auto', quietDelete]" :icon="Trash2" :aria-label="$t('documents.shared.deleteItem', { number: row.title })" @click="handleDelete(row)" />
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="list.isDirty" :icon="SearchX" :title="$t('documents.proposal.list.noMatchTitle')" :message="$t('documents.shared.noMatchHint')" compact>
            <UiButton variant="secondary" @click="(search = ''), list.reset()">{{ $t("common.actions.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty v-else :icon="FileText" :title="$t('documents.proposal.list.emptyTitle')" :message="$t('documents.proposal.list.emptyMessage')" compact>
            <UiButton v-if="canCreate" variant="secondary" size="sm" :icon="Plus" @click="openCreate">{{ $t("documents.proposal.list.create") }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <UiPagination v-if="meta?.total" :meta="meta" :item-label="$t('documents.proposal.list.itemLabel')" :disabled="loading" @change="(p) => (list.page = p)" />
    </section>

    <ShareProposalModal v-if="sharingId" :proposal-id="sharingId" @close="sharingId = null" @updated="onShared" />

    <!-- New proposal modal -->
    <UiModal
      v-model:open="showCreate"
      :title="$t('documents.proposal.list.create')"
      :description="$t('documents.proposal.create.description')"
    >
      <form id="proposal-create-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="createProposal">
        <UiInput
          v-model="form.title"
          :label="$t('documents.proposal.create.title')"
          required
          :placeholder="$t('documents.proposal.create.titlePlaceholder')"
          :error="formErrors.title?.[0] || ''"
          class="sm:col-span-2"
        />
        <UiSelect
          v-model="form.client_id"
          :label="$t('documents.proposal.create.pickClient')"
          :options="[{ value: '', label: $t('documents.proposal.create.newClient') }, ...clientOptions]"
          class="sm:col-span-2"
          @change="onClientPicked"
        />
        <UiInput
          v-model="form.client_name"
          :label="$t('documents.shared.clientName')"
          required
          :placeholder="$t('documents.proposal.create.clientPlaceholder')"
          :error="formErrors.client_name?.[0] || ''"
          class="sm:col-span-2"
        />
        <UiInput
          v-model="form.recipient"
          :label="$t('documents.proposal.create.recipient')"
          :placeholder="$t('documents.proposal.create.recipientPlaceholder')"
          :hint="$t('documents.proposal.create.recipientHint')"
          class="sm:col-span-2"
        />
        <UiInput v-model="form.proposal_date" type="date" :label="$t('common.labels.date')" required />
        <UiInput v-model="form.letter_number" :label="$t('documents.proposal.create.letterNumber')" :placeholder="$t('documents.proposal.create.letterNumberPlaceholder')" />
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="showCreate = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="proposal-create-form" :loading="saving">{{ $t("documents.proposal.create.submit") }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>
