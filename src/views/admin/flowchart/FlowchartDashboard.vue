<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { useRouter } from "vue-router";
import { Workflow, Plus, Search, SearchX, Eye, Pencil, Trash2, Shapes, Spline, ImageOff } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { useFlowchartStore } from "@/stores/flowchart";
import { useAlertModalStore } from "@/stores/alertModal";
import { useToastStore } from "@/stores/toast";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import { UiPageHeader, UiButton, UiInput, UiEmpty, UiPagination, UiSpinner, rowNumber } from "@/components/ui";

const { t } = useI18n();
const store = useFlowchartStore();
const alertModal = useAlertModalStore();
const router = useRouter();
const toast = useToastStore();
const { flowcharts, meta } = storeToRefs(store);

const list = useListState("flowcharts", { q: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));

const params = computed(() => ({ search: list.q || undefined, page: list.page, row_per_page: 10 }));
const { loading, refreshing, refresh } = useStaleFetch(() => store.fetchFlowcharts(params.value), {
  key: () => ["flowchart-list", params.value],
  hasData: () => store.listKey !== null,
});
const QUIET_DELETE = "!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft";
// A card click opens the flowchart (read-only view; Edit is its own button).
const openFlowchart = (flowchart) => router.push({ name: "admin.flowchart.detail", params: { id: flowchart.id } });


const formatDate = (value) =>
  value ? new Date(value).toLocaleString(localeTag(), { dateStyle: "medium", timeStyle: "short" }) : "-";

const handleDelete = async (flowchart) => {
  const ok = await alertModal.confirm(t("flowchart.list.deleteConfirm", { name: flowchart.name }), {
    type: "danger",
    confirmText: t("common.actions.delete"),
  });
  if (!ok) return;
  try {
    await store.deleteFlowchart(flowchart.id);
    toast.success(t("flowchart.list.deleted"), flowchart.name);
    // The card leaves in place; an emptied later page steps back one.
    if (!flowcharts.value.length) {
      if (list.page > 1) list.page -= 1;
      else if (meta.value.total) refresh({ force: true });
    }
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("flowchart.list.deleteFailed")), { type: "danger" });
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('flowchart.title')" :subtitle="$t('flowchart.subtitle')">
      <template #actions>
        <UiButton v-if="can('flowchart-create')" :icon="Plus" :to="{ name: 'admin.flowchart.create' }">{{ $t("flowchart.new") }}</UiButton>
      </template>
    </UiPageHeader>

    <!-- Toolbar, cards and pagination straight on the page (no frame). -->
    <section class="space-y-4 min-w-0">
      <!-- Toolbar -->
      <div class="flex flex-col md:flex-row md:items-center gap-2.5 md:gap-3">
        <UiInput
          v-model="search"
          type="search"
          :icon="Search"
          :placeholder="$t('flowchart.list.search')"
          :aria-label="$t('flowchart.list.search')"
          class="w-full md:w-[320px]"
        />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("flowchart.list.refreshing") }}
        </span>
        <p v-if="!loading && flowcharts.length" class="md:ml-auto text-ui-cap text-ui-muted tabular-nums">
          {{ $t("flowchart.list.count", { n: meta.total }, meta.total) }}
        </p>
      </div>

      <div class="transition-opacity" :class="{ 'opacity-60': refreshing }" :aria-busy="refreshing || undefined">
        <SkeletonCardGrid v-if="loading" :count="6" />

        <UiEmpty
          v-else-if="flowcharts.length === 0"
          :icon="list.q ? SearchX : Workflow"
          :title="list.q ? $t('flowchart.list.noMatch') : $t('flowchart.list.empty')"
          :message="list.q ? '' : $t('flowchart.list.emptyHint')"
        >
          <UiButton v-if="list.q" variant="secondary" @click="(search = ''), list.reset()">{{ $t("common.actions.clearFilters") }}</UiButton>
          <UiButton v-else-if="can('flowchart-create')" variant="secondary" :icon="Plus" :to="{ name: 'admin.flowchart.create' }">
            {{ $t("flowchart.new") }}
          </UiButton>
        </UiEmpty>

        <ul v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 ui-stagger">
          <li
            v-for="(flowchart, index) in flowcharts"
            :key="flowchart.id"
            class="group relative bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden flex flex-col ui-lift hover:border-ui-line-strong transition-colors cursor-pointer"
            @click="openFlowchart(flowchart)"
          >
            <!-- Preview -->
            <RouterLink
              :to="{ name: 'admin.flowchart.detail', params: { id: flowchart.id } }"
              class="hidden sm:flex shrink-0 h-[140px] bg-ui-subtle border-b border-ui-line items-center justify-center p-2"
              :aria-label="$t('flowchart.list.open', { name: flowchart.name })"
              @click.stop
            >
              <img
                v-if="flowchart.preview_url"
                :src="flowchart.preview_url"
                :alt="flowchart.name"
                class="max-w-full max-h-full object-contain"
                loading="lazy"
              />
              <ImageOff v-else class="w-5 h-5 text-ui-faint" />
            </RouterLink>

            <div class="flex-1 min-w-0 p-3.5 sm:p-4 flex flex-col">
              <div class="flex items-start gap-2">
                <span class="text-ui-cap text-ui-faint tabular-nums pt-px">{{ rowNumber(index, meta) }}</span>
                <div class="flex-1 min-w-0">
                  <RouterLink
                    :to="{ name: 'admin.flowchart.detail', params: { id: flowchart.id } }"
                    class="block text-ui-h3 text-ui-ink truncate hover:text-ui-accent transition-colors"
                    @click.stop
                  >
                    {{ flowchart.name }}
                  </RouterLink>
                  <p v-if="flowchart.description" class="text-ui-cap text-ui-muted mt-0.5 line-clamp-2">{{ flowchart.description }}</p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-ui-cap text-ui-text">
                <span class="inline-flex items-center gap-1 tabular-nums"><Shapes class="w-3.5 h-3.5 text-ui-faint" /> {{ $t("flowchart.counts.shapes", { n: flowchart.node_count }, flowchart.node_count) }}</span>
                <span class="inline-flex items-center gap-1 tabular-nums"><Spline class="w-3.5 h-3.5 text-ui-faint" /> {{ $t("flowchart.counts.connectors", { n: flowchart.edge_count }, flowchart.edge_count) }}</span>
              </div>

              <div class="mt-auto pt-3 sm:mt-3 sm:border-t sm:border-ui-line flex items-end justify-between gap-2">
                <div class="min-w-0 text-ui-cap">
                  <p class="text-ui-muted truncate">{{ flowchart.creator?.name || "-" }}</p>
                  <p class="text-ui-faint truncate tabular-nums">
                    {{ formatDate(flowchart.updated_at) }}<template v-if="flowchart.updater?.name"> · {{ $t("flowchart.list.by", { name: flowchart.updater.name }) }}</template>
                  </p>
                </div>
                <!-- Optional edit icon · View · quiet delete -->
                <div class="flex items-center gap-0.5 shrink-0" @click.stop>
                  <UiButton
                    v-if="can('flowchart-edit')"
                    variant="ghost"
                    size="sm"
                    class="w-[30px] !px-0"
                    :icon="Pencil"
                    :to="{ name: 'admin.flowchart.edit', params: { id: flowchart.id } }"
                    :title="$t('common.actions.edit')"
                    :aria-label="$t('flowchart.list.editItem', { name: flowchart.name })"
                  />
                  <UiButton
                    variant="secondary"
                    size="sm"
                    :icon="Eye"
                    :to="{ name: 'admin.flowchart.detail', params: { id: flowchart.id } }"
                    :aria-label="$t('flowchart.list.open', { name: flowchart.name })"
                  >
                    {{ $t("common.actions.view") }}
                  </UiButton>
                  <UiButton
                    v-if="can('flowchart-delete')"
                    variant="ghost"
                    size="sm"
                    :class="['w-[30px] !px-0', QUIET_DELETE]"
                    :icon="Trash2"
                    :title="$t('common.actions.delete')"
                    :aria-label="$t('flowchart.list.deleteItem', { name: flowchart.name })"
                    @click="handleDelete(flowchart)"
                  />
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <UiPagination v-if="meta.total" flat :meta="meta" :item-label="$t('flowchart.list.itemLabel')" :disabled="loading" @change="(p) => (list.page = p)" />
    </section>
  </div>
</template>
