<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { ClipboardCheck, Plus, Search, SearchX, Inbox, X, Loader2, PenLine, Send, Settings2 } from "lucide-vue-next";
import { useScreeningStore } from "@/stores/screening";
import { can } from "@/helpers/permissionHelper";
import { SCREENING_STATUS, SCREENING_SOURCE, COMPLEXITY } from "@/utils/screening";
import Pagination from "@/components/common/Pagination.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiInput, UiChips, UiTable, UiBadge, UiEmpty, UiModal, UiStat } from "@/components/ui";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";

const { t } = useI18n();

const router = useRouter();
const store = useScreeningStore();
const { screenings, meta, statusCounts, loading, saving } = storeToRefs(store);

const list = useListState("screening", { q: "", status: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));
const params = computed(() => ({ page: list.page, status: list.status || undefined, search: list.q || undefined, row_per_page: 15 }));
const { refreshing } = useStaleFetch(() => store.fetchScreenings(params.value), {
  key: () => ["screening-list", params.value],
  hasData: () => screenings.value.length > 0,
});
const status = computed({ get: () => list.status, set: (v) => (list.status = v) });
const toggleStatus = (key) => (list.status = list.status === key ? "" : key);
const load = (page = 1) => (list.page = page);

const TABS = ["", "new", "in_review", "reviewed", "invited", "draft", "won", "lost"];
const total = computed(() => Object.values(statusCounts.value || {}).reduce((a, b) => a + Number(b), 0));
const tabLabel = (key) => (key ? SCREENING_STATUS[key].label : t("common.labels.all"));
const tabCount = (key) => (key ? Number(statusCounts.value?.[key] || 0) : total.value);

const formatDate = (d) => (d ? new Date(d).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" }) : "-");
const rowNo = (i) => (meta.value.current_page - 1) * meta.value.per_page + i + 1;
const open = (s) => router.push({ name: "admin.screening.detail", params: { id: s.id } });

// ----- New screening -----
const showNew = ref(false);
const form = ref({});
const errors = ref({});
const openNew = () => {
  form.value = { mode: "internal", contact_name: "", company: "", email: "", phone: "", lang: "id" };
  errors.value = {};
  showNew.value = true;
};
const create = async () => {
  errors.value = {};
  try {
    const created = await store.createScreening(form.value);
    showNew.value = false;
    router.push({ name: "admin.screening.detail", params: { id: created.id } });
  } catch (e) {
    errors.value = e?.response?.data?.errors || {};
  }
};

// Presentation only: badge tones, chips, table columns.
const STATUS_TONE = { draft: "neutral", invited: "outline", new: "info", in_review: "warn", reviewed: "accent", won: "ok", lost: "bad" };
const SIZE_TONE = { S: "ok", M: "info", L: "warn", XL: "bad" };
const chipOptions = computed(() => TABS.map((key) => ({ value: key, label: tabLabel(key), count: tabCount(key) })));
const columns = computed(() => [
  { key: "client", label: t("common.labels.client") },
  { key: "needs", label: t("screening.list.columns.needs") },
  { key: "complexity", label: t("screening.list.columns.size") },
  { key: "source", label: t("screening.list.columns.source") },
  { key: "date", label: t("common.labels.date") },
  { key: "status", label: t("common.labels.status") },
]);
const fieldClass = "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('screening.list.title')" :subtitle="$t('screening.list.subtitle')">
      <template #actions>
        <div class="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <UiButton v-if="can('screening-settings')" variant="secondary" :icon="Settings2" :to="{ name: 'admin.settings.client-screening' }">{{ $t("screening.list.catalog") }}</UiButton>
          <UiButton v-if="can('screening-create')" :icon="Plus" @click="openNew">{{ $t("screening.list.new") }}</UiButton>
        </div>
      </template>
    </UiPageHeader>

    <!-- KPIs from the status counts -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
      <UiStat :label="$t('common.labels.all')" :value="total" :icon="ClipboardCheck" :loading="loading && !screenings.length" selectable :active="!list.status" @select="list.status = ''" />
      <UiStat :label="SCREENING_STATUS.new.label" :value="tabCount('new')" :tone="tabCount('new') ? 'accent' : ''" :loading="loading && !screenings.length" selectable :active="list.status === 'new'" @select="toggleStatus('new')" />
      <UiStat :label="SCREENING_STATUS.in_review.label" :value="tabCount('in_review')" :tone="tabCount('in_review') ? 'warn' : ''" :loading="loading && !screenings.length" selectable :active="list.status === 'in_review'" @select="toggleStatus('in_review')" />
      <UiStat :label="SCREENING_STATUS.won.label" :value="tabCount('won')" :tone="tabCount('won') ? 'ok' : ''" :loading="loading && !screenings.length" selectable :active="list.status === 'won'" @select="toggleStatus('won')" />
    </div>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-ui-line">
        <UiInput v-model="search" :icon="Search" :placeholder="$t('screening.list.searchPlaceholder')" class="lg:w-[320px] shrink-0" />
        <UiChips v-model="status" :options="chipOptions" class="min-w-0" />
      </div>

      <UiTable
        :columns="columns"
        :rows="screenings"
        :meta="meta"
        :loading="loading && !screenings.length"
        :skeleton-rows="4"
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        clickable
        @row-click="open"
      >
        <template #cell-client="{ row }">
          <p class="text-ui-body font-medium text-ui-ink truncate max-w-[260px]">{{ row.company || row.contact_name || $t("screening.unnamed") }}</p>
          <p class="text-ui-cap text-ui-muted truncate max-w-[260px]"><span class="font-mono">{{ row.code }}</span><template v-if="row.company && row.contact_name"> · {{ row.contact_name }}</template></p>
        </template>
        <template #cell-needs="{ row }">
          <span class="line-clamp-2 max-w-[280px] text-ui-small text-ui-text">{{ row.needs.join(", ") || "-" }}</span>
        </template>
        <template #cell-complexity="{ row }">
          <UiBadge v-if="row.complexity" :tone="SIZE_TONE[row.complexity] || 'neutral'" :title="COMPLEXITY[row.complexity]?.label">{{ row.complexity }}</UiBadge>
          <span v-else class="text-ui-faint">-</span>
        </template>
        <template #cell-source="{ row }">
          <span class="text-ui-small text-ui-muted whitespace-nowrap">{{ SCREENING_SOURCE[row.source] }}</span>
        </template>
        <template #cell-date="{ row }">
          <span class="text-ui-small whitespace-nowrap tabular-nums">{{ formatDate(row.submitted_at || row.created_at) }}</span>
        </template>
        <template #cell-status="{ row }">
          <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot>{{ SCREENING_STATUS[row.status]?.label }}</UiBadge>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.company || row.contact_name || $t("screening.unnamed") }}</p>
              <p class="text-ui-cap text-ui-muted truncate"><span class="font-mono">{{ row.code }}</span> · {{ formatDate(row.submitted_at || row.created_at) }} · {{ SCREENING_SOURCE[row.source] }}</p>
              <p v-if="row.needs.length" class="text-ui-cap text-ui-text mt-1 line-clamp-2">{{ row.needs.join(", ") }}</p>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <UiBadge :tone="STATUS_TONE[row.status] || 'neutral'" dot>{{ SCREENING_STATUS[row.status]?.label }}</UiBadge>
              <UiBadge v-if="row.complexity" :tone="SIZE_TONE[row.complexity] || 'neutral'">{{ row.complexity }}</UiBadge>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="list.isDirty" :icon="SearchX" :title="$t('screening.list.emptyFilteredTitle')" :message="$t('screening.list.emptyFilteredHint')" compact>
            <UiButton variant="secondary" @click="(search = ''), list.reset()">{{ $t("screening.list.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty v-else :icon="Inbox" :title="$t('screening.list.emptyTitle')" :message="$t('screening.list.emptyHint')" compact />
        </template>
      </UiTable>

      <div v-if="screenings.length" class="border-t border-ui-line px-4 sm:px-5 py-3">
        <Pagination :meta="meta" :loading="loading" :item-label="$t('screening.list.itemLabel')" @page-change="load" />
      </div>
    </section>

    <!-- New screening -->
    <UiModal v-model:open="showNew" :title="$t('screening.list.new')">
      <form id="screening-new-form" class="space-y-4" @submit.prevent="create">
        <div class="grid grid-cols-2 gap-2" role="radiogroup">
          <label
            v-for="m in [
              { key: 'internal', icon: PenLine, title: $t('screening.list.modal.fillNow'), text: $t('screening.list.modal.fillNowText') },
              { key: 'invite', icon: Send, title: $t('screening.list.modal.sendToClient'), text: $t('screening.list.modal.sendToClientText') },
            ]"
            :key="m.key"
            class="ui-press border rounded-ui-card p-3 cursor-pointer transition-colors has-[:focus-visible]:shadow-ui-focus"
            :class="form.mode === m.key ? 'border-ui-ink bg-ui-subtle' : 'border-ui-line hover:bg-ui-hover'"
          >
            <input v-model="form.mode" type="radio" :value="m.key" class="sr-only" />
            <component :is="m.icon" class="w-4 h-4 mb-1.5" :class="form.mode === m.key ? 'text-ui-ink' : 'text-ui-muted'" />
            <p class="text-ui-small font-medium text-ui-ink">{{ m.title }}</p>
            <p class="text-ui-cap text-ui-muted">{{ m.text }}</p>
          </label>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="sn-contact" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("screening.list.modal.contactName") }}</label>
            <input id="sn-contact" v-model="form.contact_name" type="text" maxlength="120" :class="fieldClass" />
          </div>
          <div>
            <label for="sn-company" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("screening.list.modal.company") }}</label>
            <input id="sn-company" v-model="form.company" type="text" maxlength="150" :class="fieldClass" />
          </div>
          <div>
            <label for="sn-email" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("common.labels.email") }}</label>
            <input id="sn-email" v-model="form.email" type="email" maxlength="150" :class="fieldClass" />
            <p v-if="errors.email" class="text-ui-cap text-ui-bad mt-1.5">{{ errors.email[0] }}</p>
          </div>
          <div>
            <label for="sn-phone" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("screening.list.modal.phone") }}</label>
            <input id="sn-phone" v-model="form.phone" type="text" maxlength="40" :class="fieldClass" />
          </div>
        </div>
        <div v-if="form.mode === 'invite'">
          <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("screening.list.modal.formLanguage") }}</p>
          <UiChips v-model="form.lang" :options="[{ value: 'id', label: $t('screening.langId') }, { value: 'en', label: $t('screening.langEn') }]" />
        </div>
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="showNew = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton type="submit" form="screening-new-form" class="flex-1 sm:flex-none" :loading="saving" :disabled="saving">
          {{ form.mode === "invite" ? $t("screening.list.modal.createLink") : $t("screening.list.modal.start") }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
