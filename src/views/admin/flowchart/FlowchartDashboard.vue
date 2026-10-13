<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Workflow, Plus, Search, Eye, Pencil, Trash2, Shapes, Spline } from "lucide-vue-next";
import { useFlowchartStore } from "@/stores/flowchart";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";

const store = useFlowchartStore();
const alertModal = useAlertModalStore();
const { flowcharts, meta, loading } = storeToRefs(store);

const search = ref("");

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
  <div class="px-4 py-4">
    <!-- Header -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
            <Workflow class="w-6 h-6 text-blue-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold">Flowchart</h3>
            <p class="text-brand-light text-xs font-normal">
              Design process flows with standard flowchart symbols and export them as JPG or PDF
            </p>
          </div>
        </div>

        <RouterLink
          v-if="can('flowchart-create')"
          :to="{ name: 'admin.flowchart.create' }"
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
        >
          <Plus class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">New Flowchart</span>
        </RouterLink>
      </div>

      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search class="h-5 w-5 text-gray-400" />
        </div>
        <input
          v-model="search"
          type="text"
          class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
          placeholder="Search by name or description..."
          @input="onSearchInput"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
      <SkeletonTable v-if="loading" />

      <div v-else-if="flowcharts.length === 0" class="text-center py-12">
        <Workflow class="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
        <p class="text-brand-dark text-sm font-semibold">{{ search ? "No flowcharts match your search" : "No flowcharts yet" }}</p>
        <p v-if="!search" class="text-brand-light text-xs mt-1">Create your first flowchart to map out a process.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">No</th>
              <th class="py-3 pr-4 font-semibold">Name</th>
              <th class="py-3 pr-4 font-semibold">Contents</th>
              <th class="py-3 pr-4 font-semibold">Created By</th>
              <th class="py-3 pr-4 font-semibold">Last Updated</th>
              <th class="py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(flowchart, index) in flowcharts" :key="flowchart.id" class="border-b border-[#F1F1F1] hover:bg-gray-50">
              <td class="py-3 pr-4 text-brand-light align-top">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4 align-top" style="min-width: 220px; max-width: 380px">
                <RouterLink
                  :to="{ name: 'admin.flowchart.detail', params: { id: flowchart.id } }"
                  class="font-semibold text-brand-dark hover:text-[#0C51D9] transition-colors"
                >
                  {{ flowchart.name }}
                </RouterLink>
                <p v-if="flowchart.description" class="text-brand-light text-xs mt-0.5 line-clamp-2">{{ flowchart.description }}</p>
              </td>
              <td class="py-3 pr-4 align-top whitespace-nowrap">
                <span class="inline-flex items-center gap-1 text-xs text-brand-dark mr-2.5">
                  <Shapes class="w-3.5 h-3.5 text-blue-600" /> {{ flowchart.node_count }} shapes
                </span>
                <span class="inline-flex items-center gap-1 text-xs text-brand-dark">
                  <Spline class="w-3.5 h-3.5 text-violet-600" /> {{ flowchart.edge_count }} connectors
                </span>
              </td>
              <td class="py-3 pr-4 align-top text-brand-dark whitespace-nowrap">{{ flowchart.creator?.name || "-" }}</td>
              <td class="py-3 pr-4 align-top whitespace-nowrap">
                <p class="text-brand-dark">{{ formatDate(flowchart.updated_at) }}</p>
                <p v-if="flowchart.updater?.name" class="text-brand-light text-xs">by {{ flowchart.updater.name }}</p>
              </td>
              <td class="py-3 align-top">
                <div class="flex items-center justify-end gap-1.5">
                  <RouterLink
                    :to="{ name: 'admin.flowchart.detail', params: { id: flowchart.id } }"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
                    title="View"
                  >
                    <Eye class="w-4 h-4 text-gray-600" />
                  </RouterLink>
                  <RouterLink
                    v-if="can('flowchart-edit')"
                    :to="{ name: 'admin.flowchart.edit', params: { id: flowchart.id } }"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
                    title="Edit"
                  >
                    <Pencil class="w-4 h-4 text-gray-600" />
                  </RouterLink>
                  <button
                    v-if="can('flowchart-delete')"
                    type="button"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-red-500 hover:ring-2 hover:ring-red-500/30 hover:bg-red-50 group transition-all"
                    title="Delete"
                    @click="handleDelete(flowchart)"
                  >
                    <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && flowcharts.length > 0" class="pt-3.5 border-t border-[#DCDEDD] mt-4">
        <Pagination :meta="meta" :loading="loading" item-label="flowcharts" @page-change="fetchPage" />
      </div>
    </div>
  </div>
</template>
