<script setup>
import { computed, onMounted, ref } from "vue";
import {
  ArrowLeft, RefreshCw, Plus, Pencil, Trash2, X, Loader2, ChevronDown, ChevronUp, Save, RotateCcw, Braces, ArrowUp, ArrowDown,
} from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { useAlertModalStore } from "@/stores/alertModal";
import { formatRupiah } from "@/utils/formatUtils";
import { PRICE_UNIT, PRICING_MODE } from "@/utils/screening";
import { UiPageHeader, UiButton, UiBadge, UiTable, UiEmpty, UiModal, UiSelect, UiSwitch } from "@/components/ui";
import Spinner from "@/components/common/skeleton/Spinner.vue";

// Settings > Client Screening: the service catalog (synced from the Rate
// Card in Notion) and the questionnaire the website and the team use.
const alertModal = useAlertModalStore();
const tab = ref("catalog");

// ===== Catalog =====
const items = ref([]);
const hourlyRate = ref(0);
const lastSynced = ref(null);
const loadingCatalog = ref(true);
const loadCatalog = async () => {
  loadingCatalog.value = true;
  try {
    const { data } = await axiosInstance.get("/service-catalog");
    items.value = data.data.items;
    hourlyRate.value = data.data.hourly_rate;
    lastSynced.value = data.data.last_synced_at;
  } finally {
    loadingCatalog.value = false;
  }
};

const syncing = ref(false);
const syncMessage = ref("");
const sync = async () => {
  syncing.value = true;
  syncMessage.value = "";
  try {
    const { data } = await axiosInstance.post("/service-catalog/sync");
    syncMessage.value = data.message;
    await loadCatalog();
  } catch (e) {
    syncMessage.value = e?.response?.data?.message || "Sync failed.";
  } finally {
    syncing.value = false;
  }
};

const priceText = (i) => {
  if (i.availability !== "available") return "Not available yet";
  if (i.pricing_mode === "by_quote") return "By quote";
  if (i.pricing_mode === "hourly") {
    const h = Number(i.default_hours || 0);
    return hourlyRate.value ? `${formatRupiah(h * hourlyRate.value)} (${h} h)` : `${h} h × rate`;
  }
  return i.price_from !== null ? `From ${formatRupiah(i.price_from)}${PRICE_UNIT[i.price_unit]}` : "-";
};

const editing = ref(null);
const itemErrors = ref({});
const savingItem = ref(false);
const blankItem = () => ({ code: "", name: "", category: "", description: "", pricing_mode: "rate_card", price_from: null, price_unit: "once", default_hours: null, duration_text: "", availability: "available", is_active: true, sort_order: 0 });
const openItem = (i) => {
  itemErrors.value = {};
  editing.value = i ? { ...i, price_from: i.price_from !== null ? Number(i.price_from) : null, default_hours: i.default_hours !== null ? Number(i.default_hours) : null } : blankItem();
};
const saveItem = async () => {
  savingItem.value = true;
  itemErrors.value = {};
  try {
    const payload = { ...editing.value };
    if (payload.id) await axiosInstance.put(`/service-catalog/${payload.id}`, payload);
    else await axiosInstance.post("/service-catalog", payload);
    editing.value = null;
    await loadCatalog();
  } catch (e) {
    itemErrors.value = e?.response?.data?.errors || {};
  } finally {
    savingItem.value = false;
  }
};
const deleteItem = async (i) => {
  if (!(await alertModal.confirm(`Delete "${i.name}" from the catalog? Questions that recommend it will skip it.`, { type: "danger", confirmText: "Delete" }))) return;
  await axiosInstance.delete(`/service-catalog/${i.id}`);
  await loadCatalog();
};

// ===== Questionnaire =====
const definition = ref(null);
const itemCodes = ref({});
const loadingTemplate = ref(true);
const templateDirty = ref(false);
const templateError = ref("");
const savingTemplate = ref(false);
const openSection = ref(null);
const jsonMode = ref(false);
const jsonText = ref("");

const loadTemplate = async () => {
  loadingTemplate.value = true;
  try {
    const { data } = await axiosInstance.get("/screening-template");
    definition.value = structuredClone(data.data.template?.definition || { sections: [] });
    itemCodes.value = data.data.item_codes || {};
    templateDirty.value = false;
  } finally {
    loadingTemplate.value = false;
  }
};
onMounted(() => {
  loadCatalog();
  loadTemplate();
});

const dirty = () => (templateDirty.value = true);
const needsOptions = computed(() => definition.value?.sections?.flatMap((s) => s.questions).find((q) => q.key === "needs")?.options || []);
const slug = (text, prefix) => (text || prefix).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || prefix;
const uniqueKey = (base) => {
  const used = new Set(definition.value.sections.flatMap((s) => [s.key, ...s.questions.map((q) => q.key)]));
  let key = base;
  let n = 2;
  while (used.has(key)) key = `${base}_${n++}`;
  return key;
};

const hasOptions = (q) => ["single", "multi", "boolean"].includes(q.type);
const addSection = () => {
  const key = uniqueKey("section");
  definition.value.sections.push({ key, title: { id: "Bagian baru", en: "New section" }, questions: [] });
  openSection.value = key;
  dirty();
};
const addQuestion = (section) => {
  section.questions.push({ key: uniqueKey("question"), type: "single", required: false, label: { id: "", en: "" }, options: [] });
  dirty();
};
const addOption = (q) => {
  q.options = q.options || [];
  q.options.push({ value: `option_${q.options.length + 1}`, label: { id: "", en: "" } });
  dirty();
};
const move = (list, idx, dir) => {
  const to = idx + dir;
  if (to < 0 || to >= list.length) return;
  [list[idx], list[to]] = [list[to], list[idx]];
  dirty();
};
const remove = (list, idx) => {
  list.splice(idx, 1);
  dirty();
};
const onType = (q) => {
  if (q.type === "boolean" && !q.options?.length) q.options = [{ value: "yes", label: { id: "Ya", en: "Yes" } }, { value: "no", label: { id: "Tidak", en: "No" } }];
  if (!hasOptions(q)) delete q.options;
  dirty();
};

// The first "add" effect is editable here; other effects stay (JSON mode).
const primaryAdd = (o) => (o.add && o.add[0]) || null;
const setPrimaryItem = (o, code) => {
  const rest = (o.add || []).slice(1);
  if (!code) o.add = rest.length ? rest : undefined;
  else o.add = [{ ...(primaryAdd(o) || {}), item: code }, ...rest];
  if (!o.add) delete o.add;
  dirty();
};
const setPrimaryHours = (o, hours) => {
  if (!primaryAdd(o)) return;
  o.add[0] = { ...o.add[0], hours: hours === "" ? undefined : Number(hours) };
  dirty();
};
const extraRules = (o) => {
  const parts = [];
  if ((o.add || []).length > 1) parts.push(`+${o.add.length - 1} item`);
  if (o.replace?.length) parts.push("upgrade rule");
  if (o.flags?.length) parts.push("team note");
  if (o.tags?.length) parts.push(`system: ${o.tags.join(", ")}`);
  if (o.min !== undefined || o.max !== undefined) parts.push("budget range");
  return parts;
};

const sectionNeeds = (s) => (s.show_if?.question === "needs" ? [].concat(s.show_if.includes || []) : []);
const toggleSectionNeed = (s, value) => {
  const current = sectionNeeds(s);
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  if (next.length) s.show_if = { question: "needs", includes: next };
  else delete s.show_if;
  dirty();
};

const toggleJson = () => {
  if (!jsonMode.value) {
    jsonText.value = JSON.stringify(definition.value, null, 2);
    jsonMode.value = true;
    return;
  }
  try {
    definition.value = JSON.parse(jsonText.value);
    jsonMode.value = false;
    templateError.value = "";
    dirty();
  } catch (e) {
    templateError.value = `Invalid JSON: ${e.message}`;
  }
};

const saveTemplate = async () => {
  templateError.value = "";
  if (jsonMode.value) {
    try {
      definition.value = JSON.parse(jsonText.value);
    } catch (e) {
      templateError.value = `Invalid JSON: ${e.message}`;
      return;
    }
  }
  savingTemplate.value = true;
  try {
    await axiosInstance.put("/screening-template", { definition: definition.value });
    templateDirty.value = false;
    jsonMode.value = false;
    await loadTemplate();
  } catch (e) {
    const d = e?.response?.data;
    templateError.value = d?.errors ? "Fill in every section title, question and option label in both languages." : d?.message || "Failed to save.";
  } finally {
    savingTemplate.value = false;
  }
};
const resetTemplate = async () => {
  if (!(await alertModal.confirm("Restore the built-in questionnaire? Your changes to the questions are replaced. Existing screenings are not affected.", { confirmText: "Restore" }))) return;
  await axiosInstance.post("/screening-template/reset");
  await loadTemplate();
};

const formatDate = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "never");
const TYPES = { single: "Single choice", multi: "Checklist", boolean: "Yes / No", text: "Short text", textarea: "Long text", number: "Number" };

// Presentation only: table columns, select options, field styles.
const catalogColumns = [
  { key: "name", label: "Service" },
  { key: "category", label: "Category" },
  { key: "pricing_mode", label: "Pricing" },
  { key: "price", label: "Price", align: "right" },
  { key: "duration_text", label: "Duration" },
  { key: "actions", label: "", align: "right", width: 96 },
];
const pricingOptions = Object.entries(PRICING_MODE).map(([value, label]) => ({ value, label }));
const billedOptions = [{ value: "once", label: "Once" }, { value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }];
const availabilityOptions = [{ value: "available", label: "Available" }, { value: "preparation", label: "In preparation" }];
const field = "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const cell = "h-8 px-2 bg-ui-surface text-ui-small text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-faint";
const iconBtn = "ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink shrink-0 disabled:opacity-40";
const iconBtnBad = "ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad shrink-0";
const label = "block text-ui-small font-medium text-ui-ink mb-1.5";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Catalog & Questions" subtitle="The service catalog (synced from the Rate Card in Notion) and the questionnaire the website and the team use.">
      <template #eyebrow>
        <RouterLink :to="{ name: 'admin.screening.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" aria-label="Back">
          <ArrowLeft class="w-4 h-4" /> Client Screening
        </RouterLink>
      </template>
      <template #actions>
        <template v-if="tab === 'catalog'">
          <UiButton variant="secondary" :icon="RefreshCw" :loading="syncing" :disabled="syncing" @click="sync">Sync from Rate Card</UiButton>
          <UiButton :icon="Plus" @click="openItem(null)">Add item</UiButton>
        </template>
        <template v-else>
          <UiButton variant="ghost" :icon="RotateCcw" @click="resetTemplate">Restore default</UiButton>
          <UiButton variant="secondary" :icon="Braces" @click="toggleJson">{{ jsonMode ? "Back to editor" : "Advanced (JSON)" }}</UiButton>
          <UiButton :icon="Save" :loading="savingTemplate" :disabled="(!templateDirty && !jsonMode) || savingTemplate" @click="saveTemplate">Save questionnaire</UiButton>
        </template>
      </template>
    </UiPageHeader>

    <!-- Tabs -->
    <div class="overflow-x-auto [scrollbar-width:none] sm:border-b sm:border-ui-line">
      <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
        <button
          v-for="t in [{ k: 'catalog', l: 'Service Catalog' }, { k: 'template', l: 'Questionnaire' }]"
          :key="t.k"
          type="button"
          role="tab"
          :aria-selected="tab === t.k"
          :class="[
            'ui-press shrink-0 inline-flex items-center gap-2 whitespace-nowrap font-medium focus:outline-none focus-visible:shadow-ui-focus',
            'h-8 px-3 rounded-full border text-ui-small',
            'sm:h-auto sm:px-0.5 sm:pt-1 sm:pb-3 sm:rounded-none sm:border-0 sm:border-b-2 sm:-mb-px sm:text-ui-body',
            tab === t.k
              ? 'bg-ui-ink text-white border-ui-ink sm:bg-transparent sm:text-ui-ink sm:border-ui-ink'
              : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover sm:bg-transparent sm:text-ui-muted sm:border-transparent sm:hover:bg-transparent sm:hover:text-ui-ink',
          ]"
          @click="tab = t.k"
        >{{ t.l }}</button>
      </div>
    </div>

    <!-- ===== Catalog ===== -->
    <div v-if="tab === 'catalog'" class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 ui-stagger">
        <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 min-w-0">
          <p class="text-ui-small text-ui-muted flex items-center gap-2"><RefreshCw class="w-4 h-4 text-ui-faint" /> Rate Card sync</p>
          <p class="text-ui-h3 text-ui-ink mt-1.5">last {{ formatDate(lastSynced) }}</p>
          <p class="text-ui-cap text-ui-muted mt-1">updates names, prices, durations and availability from the Notion Rate Card.</p>
          <p v-if="syncMessage" class="text-ui-cap text-ui-accent font-medium mt-1.5">{{ syncMessage }}</p>
        </div>
        <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 min-w-0">
          <p class="text-ui-small text-ui-muted">Hourly rate</p>
          <p class="text-ui-h3 mt-1.5 tabular-nums" :class="hourlyRate ? 'text-ui-ink' : 'text-ui-warn'">{{ hourlyRate ? `${formatRupiah(hourlyRate)} / hour` : "not set" }}</p>
          <p class="text-ui-cap text-ui-muted mt-1">(from Project Calculator → Team Rate Setup), used for hourly items.</p>
        </div>
      </div>

      <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
        <UiTable :columns="catalogColumns" :rows="items" :loading="loadingCatalog" :skeleton-rows="5">
          <template #cell-name="{ row }">
            <div :class="{ 'opacity-50': !row.is_active }">
              <p class="text-ui-body font-medium text-ui-ink">{{ row.name }}</p>
              <p class="text-ui-cap text-ui-muted"><span class="font-mono">{{ row.code }}</span><template v-if="row.rate_card_ref"> · Rate Card</template><template v-if="!row.is_active"> · inactive</template></p>
            </div>
          </template>
          <template #cell-category="{ row }">
            <span :class="{ 'opacity-50': !row.is_active }">{{ row.category }}</span>
          </template>
          <template #cell-pricing_mode="{ row }">
            <span class="text-ui-muted" :class="{ 'opacity-50': !row.is_active }">{{ PRICING_MODE[row.pricing_mode] }}</span>
          </template>
          <template #cell-price="{ row }">
            <UiBadge v-if="row.availability !== 'available'" tone="warn" :class="{ 'opacity-50': !row.is_active }">{{ priceText(row) }}</UiBadge>
            <span v-else class="whitespace-nowrap tabular-nums text-ui-ink" :class="{ 'opacity-50': !row.is_active }">{{ priceText(row) }}</span>
          </template>
          <template #cell-duration_text="{ row }">
            <span :class="{ 'opacity-50': !row.is_active }">{{ row.duration_text || "-" }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="flex items-center justify-end gap-0.5">
              <button type="button" :class="iconBtn" aria-label="Edit" @click="openItem(row)"><Pencil class="w-4 h-4" /></button>
              <button type="button" :class="iconBtnBad" aria-label="Delete" @click="deleteItem(row)"><Trash2 class="w-4 h-4" /></button>
            </div>
          </template>

          <template #mobile="{ row, number }">
            <div class="flex items-start gap-3 px-4 py-3.5">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0" :class="{ 'opacity-50': !row.is_active }">
                <p class="text-ui-body font-medium text-ui-ink">{{ row.name }}</p>
                <p class="text-ui-cap text-ui-muted"><span class="font-mono">{{ row.code }}</span> · {{ row.category }}<template v-if="!row.is_active"> · inactive</template></p>
                <p class="text-ui-cap text-ui-muted mt-1">{{ PRICING_MODE[row.pricing_mode] }}<template v-if="row.duration_text"> · {{ row.duration_text }}</template></p>
                <p class="text-ui-small font-medium tabular-nums mt-1" :class="row.availability !== 'available' ? 'text-ui-warn' : 'text-ui-ink'">{{ priceText(row) }}</p>
              </div>
              <div class="flex items-center gap-0.5 -mr-1.5 shrink-0">
                <button type="button" :class="iconBtn" aria-label="Edit" @click="openItem(row)"><Pencil class="w-4 h-4" /></button>
                <button type="button" :class="iconBtnBad" aria-label="Delete" @click="deleteItem(row)"><Trash2 class="w-4 h-4" /></button>
              </div>
            </div>
          </template>
        </UiTable>
      </section>
    </div>

    <!-- ===== Questionnaire ===== -->
    <div v-else class="space-y-4">
      <p class="text-ui-small text-ui-muted">
        Used by the website form (Indonesian & English) and by the team. Each answer option can recommend a catalog item. Changes apply to new screenings; existing ones keep the questions they were answered on.
      </p>
      <div v-if="templateError" class="bg-ui-bad-soft border border-ui-bad/20 rounded-ui-control px-3.5 py-2.5 text-ui-small text-ui-bad" role="alert">{{ templateError }}</div>

      <div v-if="loadingTemplate" class="bg-ui-surface border border-ui-line rounded-ui-card"><Spinner label="Loading…" /></div>

      <textarea
        v-else-if="jsonMode"
        v-model="jsonText"
        rows="28"
        spellcheck="false"
        aria-label="Questionnaire JSON"
        class="w-full font-mono text-ui-cap text-ui-ink bg-ui-surface border border-ui-line-strong rounded-ui-card p-4 focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
      ></textarea>

      <template v-else-if="definition">
        <section
          v-for="(section, si) in definition.sections"
          :key="section.key"
          class="bg-ui-surface border rounded-ui-card min-w-0 transition-colors"
          :class="openSection === section.key ? 'border-ui-line-strong' : 'border-ui-line'"
        >
          <div class="flex items-center gap-2 px-4 sm:px-5 py-3.5">
            <button type="button" class="flex-1 min-w-0 text-left flex items-center gap-3" :aria-expanded="openSection === section.key" @click="openSection = openSection === section.key ? null : section.key">
              <component :is="openSection === section.key ? ChevronUp : ChevronDown" class="w-4 h-4 text-ui-faint shrink-0" />
              <span class="text-ui-over uppercase text-ui-muted shrink-0">Section {{ si + 1 }}</span>
              <span class="text-ui-h3 text-ui-ink truncate">{{ section.title.id || "(untitled)" }}</span>
              <span class="text-ui-cap text-ui-faint shrink-0 tabular-nums hidden sm:inline">{{ section.questions.length }} question(s)</span>
              <UiBadge v-if="section.show_if" tone="accent" class="hidden sm:inline-flex shrink-0">conditional</UiBadge>
            </button>
            <button type="button" :class="iconBtn" aria-label="Move up" :disabled="si === 0" @click="move(definition.sections, si, -1)"><ArrowUp class="w-4 h-4" /></button>
            <button type="button" :class="iconBtn" aria-label="Move down" :disabled="si === definition.sections.length - 1" @click="move(definition.sections, si, 1)"><ArrowDown class="w-4 h-4" /></button>
            <button v-if="section.key !== 'needs'" type="button" :class="iconBtnBad" aria-label="Delete section" @click="remove(definition.sections, si)"><Trash2 class="w-4 h-4" /></button>
          </div>

          <div v-if="openSection === section.key" class="border-t border-ui-line px-4 sm:px-5 py-4 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label :for="`st-id-${section.key}`" :class="label">Judul bagian (ID)</label>
                <input :id="`st-id-${section.key}`" v-model="section.title.id" placeholder="Judul bagian (ID)" :class="field" @input="dirty" />
              </div>
              <div>
                <label :for="`st-en-${section.key}`" :class="label">Section title (EN)</label>
                <input :id="`st-en-${section.key}`" v-model="section.title.en" placeholder="Section title (EN)" :class="field" @input="dirty" />
              </div>
            </div>
            <div v-if="section.key !== 'needs'">
              <p class="text-ui-cap text-ui-muted mb-1.5">Show this section only when the client picks (leave empty to always show):</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="o in needsOptions"
                  :key="o.value"
                  type="button"
                  :aria-pressed="sectionNeeds(section).includes(o.value)"
                  class="ui-press h-7 px-2.5 rounded-full border text-ui-cap font-medium"
                  :class="sectionNeeds(section).includes(o.value) ? 'bg-ui-ink text-white border-ui-ink' : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover'"
                  @click="toggleSectionNeed(section, o.value)"
                >{{ o.label.id }}</button>
              </div>
            </div>

            <div v-for="(q, qi) in section.questions" :key="q.key" class="border border-ui-line rounded-ui-card p-3 sm:p-4 space-y-3 bg-ui-subtle/40">
              <div class="flex flex-wrap items-center gap-2">
                <div class="relative">
                  <select v-model="q.type" aria-label="Type" :class="[cell, 'pr-7 appearance-none']" :disabled="q.key === 'needs'" @change="onType(q)">
                    <option v-for="(lbl, t) in TYPES" :key="t" :value="t">{{ lbl }}</option>
                  </select>
                  <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ui-faint pointer-events-none" />
                </div>
                <label class="text-ui-small text-ui-text flex items-center gap-1.5"><input v-model="q.required" type="checkbox" class="accent-ui-ink" @change="dirty" /> Required</label>
                <span class="text-ui-cap text-ui-faint font-mono">key: {{ q.key }}</span>
                <UiBadge v-if="q.show_if" tone="accent">conditional</UiBadge>
                <span class="flex-1"></span>
                <button type="button" :class="iconBtn" aria-label="Move up" :disabled="qi === 0" @click="move(section.questions, qi, -1)"><ArrowUp class="w-3.5 h-3.5" /></button>
                <button type="button" :class="iconBtn" aria-label="Move down" :disabled="qi === section.questions.length - 1" @click="move(section.questions, qi, 1)"><ArrowDown class="w-3.5 h-3.5" /></button>
                <button v-if="q.key !== 'needs'" type="button" :class="iconBtnBad" aria-label="Delete question" @click="remove(section.questions, qi)"><Trash2 class="w-3.5 h-3.5" /></button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input v-model="q.label.id" placeholder="Pertanyaan (ID)" aria-label="Pertanyaan (ID)" :class="field" @input="dirty" />
                <input v-model="q.label.en" placeholder="Question (EN)" aria-label="Question (EN)" :class="field" @input="dirty" />
              </div>

              <div v-if="hasOptions(q)" class="space-y-2">
                <div class="hidden lg:grid grid-cols-[1fr_1fr_200px_80px_92px] gap-2 text-ui-cap text-ui-muted px-0.5">
                  <span>Opsi (ID)</span><span>Option (EN)</span><span>Recommend this service</span><span>Extra hours</span><span>Points</span>
                </div>
                <div v-for="(o, oi) in q.options" :key="oi" class="grid grid-cols-2 lg:grid-cols-[1fr_1fr_200px_80px_92px] gap-2 items-center pb-2 lg:pb-0 border-b border-ui-line lg:border-0 last:border-0">
                  <input v-model="o.label.id" placeholder="Opsi (ID)" aria-label="Opsi (ID)" :class="[cell, 'w-full']" @input="dirty" />
                  <input v-model="o.label.en" placeholder="Option (EN)" aria-label="Option (EN)" :class="[cell, 'w-full']" @input="dirty" />
                  <select :value="primaryAdd(o)?.item || ''" :class="[cell, 'w-full px-1.5 col-span-2 lg:col-span-1']" title="Recommend this service" aria-label="Recommend this service" @change="setPrimaryItem(o, $event.target.value)">
                    <option value="">No recommendation</option>
                    <option v-for="(name, code) in itemCodes" :key="code" :value="code">{{ name }}</option>
                  </select>
                  <input :value="primaryAdd(o)?.hours ?? ''" :disabled="!primaryAdd(o)" type="number" min="0" placeholder="hours" :class="[cell, 'w-full tabular-nums']" title="Extra hours (hourly items)" aria-label="Extra hours" @input="setPrimaryHours(o, $event.target.value)" />
                  <div class="flex items-center gap-1">
                    <input v-model.number="o.points" type="number" min="0" placeholder="pts" :class="[cell, 'w-full min-w-0 tabular-nums']" title="Complexity points" aria-label="Complexity points" @input="dirty" />
                    <button type="button" :class="iconBtnBad" aria-label="Delete option" @click="remove(q.options, oi)"><X class="w-3.5 h-3.5" /></button>
                  </div>
                  <p v-if="extraRules(o).length" class="col-span-2 lg:col-span-5 text-ui-cap text-ui-faint -mt-1">Also: {{ extraRules(o).join(" · ") }} (edit in Advanced)</p>
                </div>
                <button type="button" class="ui-press inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-dashed border-ui-line-strong text-ui-cap font-medium text-ui-accent hover:bg-ui-accent-soft" @click="addOption(q)"><Plus class="w-3.5 h-3.5" /> Add option</button>
              </div>
            </div>
            <UiButton variant="ghost" size="sm" :icon="Plus" @click="addQuestion(section)">Add question</UiButton>
          </div>
        </section>
        <button
          type="button"
          class="ui-press w-full h-12 rounded-ui-card border border-dashed border-ui-line-strong text-ui-small font-medium text-ui-muted hover:bg-ui-surface hover:text-ui-ink flex items-center justify-center gap-1.5"
          @click="addSection"
        >
          <Plus class="w-4 h-4" /> Add section
        </button>
      </template>
    </div>

    <!-- Catalog item modal -->
    <UiModal :open="!!editing" :title="editing?.id ? 'Edit service' : 'Add service'" @update:open="(v) => !v && (editing = null)">
      <form v-if="editing" id="catalog-item-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="saveItem">
        <div class="sm:col-span-2">
          <label for="ci-name" :class="label">Name</label>
          <input id="ci-name" v-model="editing.name" required maxlength="255" :class="field" />
        </div>
        <div>
          <label for="ci-code" :class="label">Code</label>
          <input id="ci-code" v-model="editing.code" required maxlength="60" pattern="[a-z0-9-]+" :class="[field, 'font-mono text-ui-small']" />
          <p v-if="itemErrors.code" class="text-ui-cap text-ui-bad mt-1.5">{{ itemErrors.code[0] }}</p>
        </div>
        <div>
          <label for="ci-category" :class="label">Category</label>
          <input id="ci-category" v-model="editing.category" required maxlength="60" :class="field" />
        </div>
        <div class="sm:col-span-2">
          <label for="ci-desc" :class="label">Description</label>
          <textarea id="ci-desc" v-model="editing.description" rows="2" maxlength="2000" :class="[field, 'h-auto py-2.5 resize-y']"></textarea>
        </div>
        <UiSelect v-model="editing.pricing_mode" label="Pricing" :options="pricingOptions" />
        <UiSelect v-model="editing.price_unit" label="Billed" :options="billedOptions" />
        <div v-if="editing.pricing_mode === 'rate_card'">
          <label for="ci-price" :class="label">Price from (Rp)</label>
          <input id="ci-price" v-model.number="editing.price_from" type="number" min="0" :class="[field, 'tabular-nums']" />
        </div>
        <div v-if="editing.pricing_mode === 'hourly'">
          <label for="ci-hours" :class="label">Default hours</label>
          <input id="ci-hours" v-model.number="editing.default_hours" type="number" min="0" :class="[field, 'tabular-nums']" />
        </div>
        <div>
          <label for="ci-duration" :class="label">Duration</label>
          <input id="ci-duration" v-model="editing.duration_text" maxlength="100" placeholder="e.g. 2-3 minggu" :class="field" />
        </div>
        <UiSelect v-model="editing.availability" label="Availability" :options="availabilityOptions" />
        <div class="sm:col-span-2 border border-ui-line rounded-ui-control px-3.5 py-3">
          <UiSwitch v-model="editing.is_active" label="Active (used for recommendations)" />
        </div>
      </form>
      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="editing = null">Cancel</UiButton>
        <UiButton type="submit" form="catalog-item-form" class="flex-1 sm:flex-none" :loading="savingItem" :disabled="savingItem">Save</UiButton>
      </template>
    </UiModal>
  </div>
</template>
