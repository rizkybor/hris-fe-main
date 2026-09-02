<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import {
  LineChart,
  Plus,
  Search,
  SearchX,
  FolderOpen,
  Edit,
  Trash2,
  ExternalLink,
  Globe,
} from "lucide-vue-next";
import { useAnalyticsSourceStore } from "@/stores/analyticsSource";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import AnalyticsSourceFormModal from "@/components/admin/analytics/AnalyticsSourceFormModal.vue";

const store = useAnalyticsSourceStore();
const { categories, loading, error, success } = storeToRefs(store);
const alertModal = useAlertModalStore();

const search = ref("");

const fetchData = () => store.fetchSources(search.value);

onMounted(fetchData);

watch(
  search,
  debounce(() => fetchData(), 300)
);

const TYPE_ICON_BG = {
  posthog: "bg-orange-50 text-orange-600",
  google_analytics_4: "bg-blue-50 text-blue-600",
  google_search_console: "bg-green-50 text-green-600",
};

const categorySuggestions = computed(() => categories.value.map((c) => c.category));
const totalSources = computed(() => categories.value.reduce((sum, c) => sum + c.sources.length, 0));

// ===== Add / Edit modal =====
const showModal = ref(false);
const modalMode = ref("add");
const editingSource = ref({});
const modalLoading = ref(false);
const formErrors = ref({});

const openAdd = () => {
  modalMode.value = "add";
  editingSource.value = {};
  formErrors.value = {};
  showModal.value = true;
};

const openEdit = (source) => {
  modalMode.value = "edit";
  editingSource.value = source;
  formErrors.value = {};
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const handleSubmit = async ({ mode, id, payload }) => {
  modalLoading.value = true;
  formErrors.value = {};
  try {
    if (mode === "edit") {
      await store.updateSource(id, payload);
    } else {
      await store.createSource(payload);
    }
    showModal.value = false;
  } catch (err) {
    formErrors.value = typeof store.error === "object" && store.error ? store.error : {};
  } finally {
    modalLoading.value = false;
  }
};

const handleDelete = async (source) => {
  const ok = await alertModal.confirm(`Delete analytics source "${source.name}"? This action cannot be undone.`, {
    type: "danger",
    confirmText: "Delete",
  });
  if (!ok) return;

  try {
    await store.deleteSource(source.id);
  } catch (err) {
    await alertModal.alert("Failed to delete analytics source.", { type: "danger" });
  }
};
</script>

<template>
  <div class="px-4 py-4">
    <!-- Header -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 bg-violet-50 rounded-[12px] flex items-center justify-center shrink-0">
            <LineChart class="w-6 h-6 text-violet-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold">Analytics</h3>
            <p class="text-brand-light text-xs font-normal">
              Website traffic and behavior across every tracked site, grouped by category
            </p>
          </div>
        </div>

        <div v-if="can('analytics-create')" class="flex items-center gap-3.5">
          <button
            type="button"
            @click="openAdd"
            class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Add Source</span>
          </button>
        </div>
      </div>

      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search class="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          v-model="search"
          class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white transition-all duration-300 font-semibold"
          placeholder="Search by source name, category, or website..."
        />
      </div>
    </div>

    <Alert type="success" :title="success" :show="!!success" />
    <Alert type="error" :title="typeof error === 'string' ? error : ''" :show="!!error && typeof error === 'string'" />

    <!-- Loading -->
    <div v-if="loading" class="space-y-5">
      <div v-for="i in 2" :key="i" class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <Skeleton width="240px" height="20px" class="mb-4" />
        <Skeleton height="420px" rounded="12px" />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="totalSources === 0"
      class="flex flex-col items-center justify-center text-center py-16 rounded-[14px] border border-dashed border-[#DCDEDD] bg-gray-50/60"
    >
      <template v-if="search">
        <SearchX class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No sources match your search</h4>
        <p class="text-brand-light text-xs">Try a different name, category, or website</p>
      </template>
      <template v-else>
        <FolderOpen class="w-10 h-10 text-gray-300 mb-3" />
        <h4 class="text-brand-dark text-sm font-semibold mb-1">No analytics sources yet</h4>
        <p class="text-brand-light text-xs mb-4">
          Add a PostHog, Google Analytics 4, or Search Console embed to start monitoring a website here.
        </p>
        <button
          v-if="can('analytics-create')"
          type="button"
          @click="openAdd"
          class="px-4 py-2.5 rounded-[8px] border border-[#DCDEDD] text-sm font-semibold text-brand-dark hover:border-[#0C51D9] hover:bg-white transition-colors duration-200"
        >
          Add your first source
        </button>
      </template>
    </div>

    <!-- Categories -->
    <div v-else class="space-y-5">
      <div
        v-for="group in categories"
        :key="group.category"
        class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5"
      >
        <h3 class="text-brand-dark text-base font-bold mb-4">{{ group.category }}</h3>

        <div class="space-y-5">
          <div
            v-for="source in group.sources"
            :key="source.id"
            class="border border-[#DCDEDD] rounded-[12px] overflow-hidden"
          >
            <div class="flex items-center justify-between gap-3 p-3.5 bg-slate-50 border-b border-[#DCDEDD]">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                  :class="TYPE_ICON_BG[source.type] || 'bg-gray-100 text-gray-600'"
                >
                  <LineChart class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <p class="text-brand-dark text-sm font-semibold truncate">{{ source.name }}</p>
                  <div class="flex items-center gap-1.5 text-xs text-brand-light">
                    <span>{{ source.type_label }}</span>
                    <template v-if="source.website_url">
                      <span>&middot;</span>
                      <a
                        :href="source.website_url"
                        target="_blank"
                        rel="noopener"
                        class="inline-flex items-center gap-1 hover:text-[#0C51D9] hover:underline truncate"
                      >
                        <Globe class="w-3 h-3 shrink-0" />
                        <span class="truncate">{{ source.website_url }}</span>
                      </a>
                    </template>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <a
                  :href="source.embed_url"
                  target="_blank"
                  rel="noopener"
                  title="Open in new tab"
                  class="w-8 h-8 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:bg-white transition-all duration-300"
                >
                  <ExternalLink class="w-3.5 h-3.5 text-gray-600" />
                </a>
                <button
                  v-if="can('analytics-edit')"
                  type="button"
                  @click="openEdit(source)"
                  title="Edit"
                  class="w-8 h-8 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:bg-white transition-all duration-300"
                >
                  <Edit class="w-3.5 h-3.5 text-gray-600" />
                </button>
                <button
                  v-if="can('analytics-delete')"
                  type="button"
                  @click="handleDelete(source)"
                  title="Delete"
                  class="w-8 h-8 flex items-center justify-center border border-[#DCDEDD] rounded-[8px] hover:border-red-400 hover:bg-red-50 group/delete transition-all duration-300"
                >
                  <Trash2 class="w-3.5 h-3.5 text-gray-500 group-hover/delete:text-red-600" />
                </button>
              </div>
            </div>

            <iframe
              :src="source.embed_url"
              width="100%"
              height="400"
              frameborder="0"
              allowfullscreen
              sandbox="allow-scripts allow-same-origin allow-popups"
              :title="source.name"
              class="block p-4 sm:p-5 w-full h-[400px] border-none rounded-b-[12px] bg-white"
            ></iframe>
          </div>
        </div>
      </div>
    </div>

    <AnalyticsSourceFormModal
      :show="showModal"
      :loading="modalLoading"
      :mode="modalMode"
      :data="editingSource"
      :category-suggestions="categorySuggestions"
      :errors="formErrors"
      @submit="handleSubmit"
      @close="closeModal"
    />
  </div>
</template>
