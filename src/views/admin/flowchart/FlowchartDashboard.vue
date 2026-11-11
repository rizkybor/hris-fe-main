<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Workflow, Plus, Search, SearchX, Eye, Pencil, Trash2, Shapes, Spline, ImageOff } from "lucide-vue-next";
import { useFlowchartStore } from "@/stores/flowchart";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import SkeletonCardGrid from "@/components/common/skeleton/SkeletonCardGrid.vue";
import { UiPageHeader, UiButton, UiInput, UiEmpty, rowNumber } from "@/components/ui";
import Pagination from "@/components/common/Pagination.vue";

const store = useFlowchartStore();
const alertModal = useAlertModalStore();
const { flowcharts, meta, loading } = storeToRefs(store);

const search = ref("");
const ICON_BTN =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted transition-colors hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus";

const fetchPage = (page = 1) =>
  store.fetchFlowcharts({ search: search.value || undefined, page, row_per_page: 10 });

onMounted(() => fetchPage());

let searchTimeout;
const onSearchInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchPage(1), 350);
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

const handleDelete = async (flowchart) => {
  const ok = await alertModal.confirm(`Delete flowchart "${flowchart.name}"? This action cannot be undone.`, {
    type: "danger",
    confirmText: "Delete",
  });
  if (!ok) return;
  try {
    await store.deleteFlowchart(flowchart.id);
    // Step back a page when the last row of a page was just removed.
    const page = flowcharts.value.length === 0 && meta.value.current_page > 1 ? meta.value.current_page - 1 : meta.value.current_page;
    await fetchPage(page);
  } catch (error) {
    await alertModal.alert(errorMessage(error, "Failed to delete flowchart."), { type: "danger" });
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Flowchart" subtitle="Design process flows with standard flowchart symbols and export them as JPG or PDF">
      <template #actions>
        <UiButton v-if="can('flowchart-create')" :icon="Plus" :to="{ name: 'admin.flowchart.create' }">New Flowchart</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Toolbar -->
      <div class="px-4 sm:px-5 py-3.5 flex flex-col md:flex-row md:items-center gap-3 border-b border-ui-line">
        <UiInput
          v-model="search"
          :icon="Search"
          placeholder="Search by name or description..."
          class="w-full md:w-[320px]"
          @input="onSearchInput"
        />
        <p v-if="!loading && flowcharts.length" class="md:ml-auto text-ui-cap text-ui-muted tabular-nums">
          {{ meta.total }} flowcharts
        </p>
      </div>

      <div class="p-3 sm:p-5">
        <SkeletonCardGrid v-if="loading" :count="6" />

        <UiEmpty
          v-else-if="flowcharts.length === 0"
          :icon="search ? SearchX : Workflow"
          :title="search ? 'No flowcharts match your search' : 'No flowcharts yet'"
          :message="search ? '' : 'Create your first flowchart to map out a process.'"
        >
          <UiButton v-if="!search && can('flowchart-create')" variant="secondary" :icon="Plus" :to="{ name: 'admin.flowchart.create' }">
            New Flowchart
          </UiButton>
        </UiEmpty>

        <ul v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 ui-stagger">
          <li
            v-for="(flowchart, index) in flowcharts"
            :key="flowchart.id"
            class="group relative bg-ui-surface border border-ui-line rounded-ui-card overflow-hidden flex flex-col ui-lift hover:border-ui-line-strong transition-colors"
          >
            <!-- Preview -->
            <RouterLink
              :to="{ name: 'admin.flowchart.detail', params: { id: flowchart.id } }"
              class="hidden sm:flex shrink-0 h-[140px] bg-ui-subtle border-b border-ui-line items-center justify-center p-2"
              :aria-label="`Open ${flowchart.name}`"
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
                  >
                    {{ flowchart.name }}
                  </RouterLink>
                  <p v-if="flowchart.description" class="text-ui-cap text-ui-muted mt-0.5 line-clamp-2">{{ flowchart.description }}</p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-ui-cap text-ui-text">
                <span class="inline-flex items-center gap-1 tabular-nums"><Shapes class="w-3.5 h-3.5 text-ui-faint" /> {{ flowchart.node_count }} shapes</span>
                <span class="inline-flex items-center gap-1 tabular-nums"><Spline class="w-3.5 h-3.5 text-ui-faint" /> {{ flowchart.edge_count }} connectors</span>
              </div>

              <div class="mt-auto pt-3 sm:mt-3 sm:border-t sm:border-ui-line flex items-end justify-between gap-2">
                <div class="min-w-0 text-ui-cap">
                  <p class="text-ui-muted truncate">{{ flowchart.creator?.name || "-" }}</p>
                  <p class="text-ui-faint truncate tabular-nums">
                    {{ formatDate(flowchart.updated_at) }}<template v-if="flowchart.updater?.name"> · by {{ flowchart.updater.name }}</template>
                  </p>
                </div>
                <div class="flex items-center gap-0.5 shrink-0">
                  <RouterLink
                    :to="{ name: 'admin.flowchart.detail', params: { id: flowchart.id } }"
                    :class="ICON_BTN"
                    title="View"
                    aria-label="View"
                  >
                    <Eye class="w-4 h-4" />
                  </RouterLink>
                  <RouterLink
                    v-if="can('flowchart-edit')"
                    :to="{ name: 'admin.flowchart.edit', params: { id: flowchart.id } }"
                    :class="ICON_BTN"
                    title="Edit"
                    aria-label="Edit"
                  >
                    <Pencil class="w-4 h-4" />
                  </RouterLink>
                  <button
                    v-if="can('flowchart-delete')"
                    type="button"
                    :class="[ICON_BTN, 'hover:!text-ui-bad hover:!bg-ui-bad-soft']"
                    title="Delete"
                    aria-label="Delete"
                    @click="handleDelete(flowchart)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="!loading && flowcharts.length > 0" class="px-4 sm:px-5 py-3 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" item-label="flowcharts" @page-change="fetchPage" />
      </div>
    </section>
  </div>
</template>
