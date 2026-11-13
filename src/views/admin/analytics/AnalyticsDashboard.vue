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
  PlayCircle,
  Layers,
} from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { useAnalyticsSourceStore } from "@/stores/analyticsSource";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiButton, UiInput, UiEmpty, UiStat } from "@/components/ui";
import AnalyticsSourceFormModal from "@/components/admin/analytics/AnalyticsSourceFormModal.vue";

const { t } = useI18n();
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

// Categorical source-type marks, in the shared order: accent, ink, ok.
const TYPE_ICON_BG = {
  posthog: "bg-ui-accent-soft text-ui-accent",
  google_analytics_4: "bg-ui-subtle text-ui-ink",
  google_search_console: "bg-ui-ok-soft text-ui-ok",
};
const ICON_BTN =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted transition-colors hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus";

const categorySuggestions = computed(() => categories.value.map((c) => c.category));
const totalSources = computed(() => categories.value.reduce((sum, c) => sum + c.sources.length, 0));

const loadedSourceIds = ref(new Set());
const loadSource = (id) => loadedSourceIds.value.add(id);
const isLoaded = (id) => loadedSourceIds.value.has(id);

watch(categories, () => {
  loadedSourceIds.value = new Set();
});

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
  const ok = await alertModal.confirm(t("analytics.delete.confirm", { name: source.name }), {
    type: "danger",
    confirmText: t("common.actions.delete"),
  });
  if (!ok) return;

  try {
    await store.deleteSource(source.id);
  } catch (err) {
    await alertModal.alert(t("analytics.delete.failed"), { type: "danger" });
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('analytics.title')" :subtitle="$t('analytics.subtitle')">
      <template #actions>
        <UiButton v-if="can('analytics-create')" :icon="Plus" @click="openAdd">{{ $t("analytics.addSource") }}</UiButton>
      </template>
    </UiPageHeader>

    <div class="grid grid-cols-2 gap-3 ui-stagger">
      <UiStat :label="$t('analytics.stats.sources')" :value="totalSources" :icon="LineChart" :loading="loading" />
      <UiStat :label="$t('analytics.stats.categories')" :value="categories.length" :icon="Layers" :loading="loading" />
    </div>

    <Alert type="success" :title="success" :show="!!success" @close="store.clearMessages()" />
    <Alert type="error" :title="typeof error === 'string' ? error : ''" :show="!!error && typeof error === 'string'" @close="store.clearMessages()" />

    <!-- Toolbar -->
    <div class="bg-ui-surface border border-ui-line rounded-ui-card px-4 sm:px-5 py-3.5">
      <UiInput v-model="search" :icon="Search" :placeholder="$t('analytics.search')" class="w-full md:max-w-[420px]" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-5">
      <div v-for="i in 2" :key="i" class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
        <Skeleton width="240px" height="20px" class="mb-4" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="j in 2" :key="j" class="border border-ui-line rounded-ui-card overflow-hidden">
            <div class="flex items-center gap-2.5 p-3.5 border-b border-ui-line">
              <Skeleton width="32px" height="32px" rounded="8px" />
              <div class="flex-1 min-w-0">
                <Skeleton width="140px" height="14px" class="mb-1.5" />
                <Skeleton width="180px" height="11px" />
              </div>
            </div>
            <Skeleton height="520px" rounded="0" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="totalSources === 0" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty v-if="search" :icon="SearchX" :title="$t('analytics.empty.noMatch')" :message="$t('analytics.empty.noMatchHint')" />
      <UiEmpty
        v-else
        :icon="FolderOpen"
        :title="$t('analytics.empty.title')"
        :message="$t('analytics.empty.message')"
      >
        <UiButton v-if="can('analytics-create')" variant="secondary" :icon="Plus" @click="openAdd">{{ $t("analytics.empty.addFirst") }}</UiButton>
      </UiEmpty>
    </div>

    <!-- Categories -->
    <div v-else class="space-y-5">
      <section
        v-for="group in categories"
        :key="group.category"
        class="bg-ui-surface border border-ui-line rounded-ui-card p-3 sm:p-5 ui-anim-fade-up"
      >
        <div class="flex items-center gap-2 mb-4">
          <h2 class="text-ui-h2 text-ui-ink min-w-0 truncate">{{ group.category }}</h2>
          <span class="text-ui-cap text-ui-faint tabular-nums shrink-0">{{ group.sources.length }}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article
            v-for="source in group.sources"
            :key="source.id"
            class="border border-ui-line rounded-ui-card overflow-hidden min-w-0"
          >
            <div class="flex items-center justify-between gap-3 px-3.5 py-3 border-b border-ui-line">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-ui-control flex items-center justify-center shrink-0"
                  :class="TYPE_ICON_BG[source.type] || 'bg-ui-subtle text-ui-muted'"
                >
                  <LineChart class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <p class="text-ui-h3 text-ui-ink truncate">{{ source.name }}</p>
                  <div class="flex items-center gap-1.5 text-ui-cap text-ui-muted min-w-0">
                    <span class="shrink-0">{{ source.type_label }}</span>
                    <template v-if="source.website_url">
                      <span class="shrink-0">&middot;</span>
                      <a
                        :href="source.website_url"
                        target="_blank"
                        rel="noopener"
                        class="inline-flex items-center gap-1 min-w-0 text-ui-accent hover:underline"
                      >
                        <Globe class="w-3 h-3 shrink-0" />
                        <span class="truncate">{{ source.website_url }}</span>
                      </a>
                    </template>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-0.5 shrink-0">
                <a :href="source.embed_url" target="_blank" rel="noopener" :title="$t('analytics.openInNewTab')" :aria-label="$t('analytics.openInNewTab')" :class="ICON_BTN">
                  <ExternalLink class="w-4 h-4" />
                </a>
                <button v-if="can('analytics-edit')" type="button" :title="$t('common.actions.edit')" :aria-label="$t('common.actions.edit')" :class="ICON_BTN" @click="openEdit(source)">
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  v-if="can('analytics-delete')"
                  type="button"
                  :title="$t('common.actions.delete')"
                  :aria-label="$t('common.actions.delete')"
                  :class="[ICON_BTN, 'hover:!text-ui-bad hover:!bg-ui-bad-soft']"
                  @click="handleDelete(source)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              v-if="!isLoaded(source.id)"
              type="button"
              class="flex flex-col items-center justify-center gap-2 w-full h-[520px] sm:h-[620px] lg:h-[720px] bg-ui-subtle hover:bg-ui-hover transition-colors text-ui-muted hover:text-ui-accent"
              @click="loadSource(source.id)"
            >
              <span class="w-12 h-12 rounded-full bg-ui-surface border border-ui-line flex items-center justify-center">
                <PlayCircle class="w-6 h-6" />
              </span>
              <span class="text-ui-small font-medium text-ui-ink">{{ $t("analytics.clickToLoad", { type: source.type_label }) }}</span>
              <span class="text-ui-cap text-ui-faint">{{ $t("analytics.clickToLoadHint") }}</span>
            </button>

            <iframe
              v-else
              :src="source.embed_url"
              frameborder="0"
              allowfullscreen
              sandbox="allow-scripts allow-same-origin allow-popups"
              :title="source.name"
              class="block w-full h-[520px] sm:h-[620px] lg:h-[720px] border-none bg-ui-surface"
            ></iframe>
          </article>
        </div>
      </section>
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
