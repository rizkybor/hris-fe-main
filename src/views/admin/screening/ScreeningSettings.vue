<script setup>
import { computed, onMounted, ref } from "vue";
import {
  ArrowLeft, RefreshCw, Plus, Pencil, Trash2, X, Loader2, ChevronDown, ChevronUp, Save, RotateCcw, Braces, ArrowUp, ArrowDown,
} from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { useAlertModalStore } from "@/stores/alertModal";
import { formatRupiah } from "@/utils/formatUtils";
import { PRICE_UNIT, PRICING_MODE } from "@/utils/screening";

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
</script>

<template>
  <div class="px-0.5 py-1 sm:px-4 sm:py-4">
    <div class="flex items-center gap-3 mb-4">
      <RouterLink :to="{ name: 'admin.screening.dashboard' }" class="w-9 h-9 rounded-[10px] bg-white border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]" aria-label="Back">
        <ArrowLeft class="w-4 h-4 text-gray-600" />
      </RouterLink>
      <div class="inline-grid grid-cols-2 bg-gray-100 rounded-[10px] p-1">
        <button v-for="t in [{ k: 'catalog', l: 'Service Catalog' }, { k: 'template', l: 'Questionnaire' }]" :key="t.k" type="button" class="px-4 py-1.5 rounded-[8px] text-sm font-semibold" :class="tab === t.k ? 'bg-white text-brand-dark shadow-sm' : 'text-brand-light'" @click="tab = t.k">{{ t.l }}</button>
      </div>
    </div>

    <!-- ===== Catalog ===== -->
    <div v-if="tab === 'catalog'" class="space-y-3">
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="text-xs text-brand-light space-y-0.5">
          <p><strong class="text-brand-dark">Rate Card sync:</strong> last {{ formatDate(lastSynced) }} — updates names, prices, durations and availability from the Notion Rate Card.</p>
          <p><strong class="text-brand-dark">Hourly rate:</strong> {{ hourlyRate ? `${formatRupiah(hourlyRate)} / hour` : "not set" }} (from Project Calculator → Team Rate Setup), used for hourly items.</p>
          <p v-if="syncMessage" class="text-[#0C51D9] font-semibold">{{ syncMessage }}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button type="button" class="rounded-[8px] border border-[#DCDEDD] bg-white px-3 py-2 text-xs font-semibold flex items-center gap-1.5 hover:border-[#0C51D9] disabled:opacity-50" :disabled="syncing" @click="sync">
            <Loader2 v-if="syncing" class="w-3.5 h-3.5 animate-spin" /><RefreshCw v-else class="w-3.5 h-3.5" /> Sync from Rate Card
          </button>
          <button type="button" class="blue-gradient border border-[#2151A0] rounded-[8px] px-3 py-2 text-xs font-semibold text-white flex items-center gap-1.5" @click="openItem(null)">
            <Plus class="w-3.5 h-3.5" /> Add item
          </button>
        </div>
      </div>

      <div v-if="loadingCatalog" class="text-sm text-brand-light py-6 text-center">Loading…</div>
      <div v-else class="bg-white border border-[#DCDEDD] rounded-[14px] overflow-x-auto">
        <table class="min-w-[760px] w-full text-sm">
          <thead class="bg-slate-50 text-left text-brand-light text-xs">
            <tr>
              <th class="py-2.5 px-4">Service</th>
              <th class="py-2.5 pr-3">Category</th>
              <th class="py-2.5 pr-3">Pricing</th>
              <th class="py-2.5 pr-3">Price</th>
              <th class="py-2.5 pr-3">Duration</th>
              <th class="py-2.5 pr-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in items" :key="i.id" class="border-t border-[#F1F1F1]" :class="{ 'opacity-50': !i.is_active }">
              <td class="py-2.5 px-4">
                <p class="font-semibold text-brand-dark">{{ i.name }}</p>
                <p class="text-[11px] text-gray-400">{{ i.code }}<template v-if="i.rate_card_ref"> · Rate Card</template><template v-if="!i.is_active"> · inactive</template></p>
              </td>
              <td class="py-2.5 pr-3 text-xs">{{ i.category }}</td>
              <td class="py-2.5 pr-3 text-xs">{{ PRICING_MODE[i.pricing_mode] }}</td>
              <td class="py-2.5 pr-3 text-xs whitespace-nowrap" :class="{ 'text-amber-700': i.availability !== 'available' }">{{ priceText(i) }}</td>
              <td class="py-2.5 pr-3 text-xs">{{ i.duration_text || "-" }}</td>
              <td class="py-2.5 pr-3 text-right whitespace-nowrap">
                <button type="button" class="w-7 h-7 rounded-full hover:bg-gray-100 inline-flex items-center justify-center" aria-label="Edit" @click="openItem(i)"><Pencil class="w-3.5 h-3.5 text-gray-500" /></button>
                <button type="button" class="w-7 h-7 rounded-full hover:bg-red-50 inline-flex items-center justify-center" aria-label="Delete" @click="deleteItem(i)"><Trash2 class="w-3.5 h-3.5 text-gray-500" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== Questionnaire ===== -->
    <div v-else class="space-y-3">
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p class="text-xs text-brand-light max-w-2xl">
          Used by the website form (Indonesian & English) and by the team. Each answer option can recommend a catalog item. Changes apply to new screenings; existing ones keep the questions they were answered on.
        </p>
        <div class="flex flex-wrap gap-2 shrink-0">
          <button type="button" class="rounded-[8px] border border-[#DCDEDD] bg-white px-3 py-2 text-xs font-semibold flex items-center gap-1.5" @click="resetTemplate"><RotateCcw class="w-3.5 h-3.5" /> Restore default</button>
          <button type="button" class="rounded-[8px] border border-[#DCDEDD] bg-white px-3 py-2 text-xs font-semibold flex items-center gap-1.5" @click="toggleJson"><Braces class="w-3.5 h-3.5" /> {{ jsonMode ? "Back to editor" : "Advanced (JSON)" }}</button>
          <button type="button" class="blue-gradient border border-[#2151A0] rounded-[8px] px-3 py-2 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50" :disabled="(!templateDirty && !jsonMode) || savingTemplate" @click="saveTemplate">
            <Loader2 v-if="savingTemplate" class="w-3.5 h-3.5 animate-spin" /><Save v-else class="w-3.5 h-3.5" /> Save questionnaire
          </button>
        </div>
      </div>
      <p v-if="templateError" class="text-xs text-red-500">{{ templateError }}</p>

      <div v-if="loadingTemplate" class="text-sm text-brand-light py-6 text-center">Loading…</div>

      <textarea v-else-if="jsonMode" v-model="jsonText" rows="28" spellcheck="false" class="w-full font-mono text-xs border border-[#DCDEDD] rounded-[12px] p-3 focus:outline-none focus:border-[#0C51D9]"></textarea>

      <template v-else-if="definition">
        <div v-for="(section, si) in definition.sections" :key="section.key" class="bg-white border border-[#DCDEDD] rounded-[14px]">
          <div class="flex items-center gap-2 p-3.5">
            <button type="button" class="flex-1 min-w-0 text-left flex items-center gap-2" @click="openSection = openSection === section.key ? null : section.key">
              <component :is="openSection === section.key ? ChevronUp : ChevronDown" class="w-4 h-4 text-gray-400 shrink-0" />
              <span class="text-sm font-bold text-brand-dark truncate">{{ si + 1 }}. {{ section.title.id || "(untitled)" }}</span>
              <span class="text-[11px] text-gray-400 shrink-0">{{ section.questions.length }} question(s)</span>
              <span v-if="section.show_if" class="text-[11px] text-[#0C51D9] shrink-0 hidden sm:inline">conditional</span>
            </button>
            <button type="button" class="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Move up" @click="move(definition.sections, si, -1)"><ArrowUp class="w-3.5 h-3.5 text-gray-500" /></button>
            <button type="button" class="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Move down" @click="move(definition.sections, si, 1)"><ArrowDown class="w-3.5 h-3.5 text-gray-500" /></button>
            <button v-if="section.key !== 'needs'" type="button" class="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center" aria-label="Delete section" @click="remove(definition.sections, si)"><Trash2 class="w-3.5 h-3.5 text-gray-500" /></button>
          </div>

          <div v-if="openSection === section.key" class="border-t border-[#EEF1F5] p-3.5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input v-model="section.title.id" placeholder="Judul bagian (ID)" class="border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5 text-sm" @input="dirty" />
              <input v-model="section.title.en" placeholder="Section title (EN)" class="border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5 text-sm" @input="dirty" />
            </div>
            <div v-if="section.key !== 'needs'" class="text-xs">
              <p class="text-brand-light mb-1">Show this section only when the client picks (leave empty to always show):</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="o in needsOptions"
                  :key="o.value"
                  type="button"
                  class="px-2 py-1 rounded-full border"
                  :class="sectionNeeds(section).includes(o.value) ? 'border-[#0C51D9] bg-blue-50 text-[#0C51D9] font-semibold' : 'border-[#DCDEDD]'"
                  @click="toggleSectionNeed(section, o.value)"
                >{{ o.label.id }}</button>
              </div>
            </div>

            <div v-for="(q, qi) in section.questions" :key="q.key" class="border border-[#EEF1F5] rounded-[10px] p-3 space-y-2 bg-slate-50/50">
              <div class="flex flex-wrap items-center gap-2">
                <select v-model="q.type" class="border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-xs bg-white" :disabled="q.key === 'needs'" @change="onType(q)">
                  <option v-for="(label, t) in TYPES" :key="t" :value="t">{{ label }}</option>
                </select>
                <label class="text-xs flex items-center gap-1"><input v-model="q.required" type="checkbox" class="accent-[#0C51D9]" @change="dirty" /> Required</label>
                <span class="text-[11px] text-gray-400">key: {{ q.key }}</span>
                <span v-if="q.show_if" class="text-[11px] text-[#0C51D9]">conditional</span>
                <span class="flex-1"></span>
                <button type="button" class="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Move up" @click="move(section.questions, qi, -1)"><ArrowUp class="w-3 h-3 text-gray-500" /></button>
                <button type="button" class="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Move down" @click="move(section.questions, qi, 1)"><ArrowDown class="w-3 h-3 text-gray-500" /></button>
                <button v-if="q.key !== 'needs'" type="button" class="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center" aria-label="Delete question" @click="remove(section.questions, qi)"><Trash2 class="w-3 h-3 text-gray-500" /></button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input v-model="q.label.id" placeholder="Pertanyaan (ID)" class="border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5 text-sm bg-white" @input="dirty" />
                <input v-model="q.label.en" placeholder="Question (EN)" class="border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5 text-sm bg-white" @input="dirty" />
              </div>

              <div v-if="hasOptions(q)" class="space-y-1.5">
                <div v-for="(o, oi) in q.options" :key="oi" class="grid grid-cols-1 lg:grid-cols-[1fr_1fr_180px_70px_auto] gap-1.5 items-center">
                  <input v-model="o.label.id" placeholder="Opsi (ID)" class="border border-[#DCDEDD] rounded-[6px] px-2 py-1 text-xs bg-white" @input="dirty" />
                  <input v-model="o.label.en" placeholder="Option (EN)" class="border border-[#DCDEDD] rounded-[6px] px-2 py-1 text-xs bg-white" @input="dirty" />
                  <select :value="primaryAdd(o)?.item || ''" class="border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-xs bg-white" title="Recommend this service" @change="setPrimaryItem(o, $event.target.value)">
                    <option value="">No recommendation</option>
                    <option v-for="(name, code) in itemCodes" :key="code" :value="code">{{ name }}</option>
                  </select>
                  <input :value="primaryAdd(o)?.hours ?? ''" :disabled="!primaryAdd(o)" type="number" min="0" placeholder="hours" class="border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-xs bg-white disabled:bg-gray-50" title="Extra hours (hourly items)" @input="setPrimaryHours(o, $event.target.value)" />
                  <div class="flex items-center gap-1">
                    <input v-model.number="o.points" type="number" min="0" placeholder="pts" class="w-14 border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-xs bg-white" title="Complexity points" @input="dirty" />
                    <button type="button" class="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center" aria-label="Delete option" @click="remove(q.options, oi)"><X class="w-3 h-3 text-gray-500" /></button>
                  </div>
                  <p v-if="extraRules(o).length" class="lg:col-span-5 text-[10px] text-gray-400 -mt-1">Also: {{ extraRules(o).join(" · ") }} (edit in Advanced)</p>
                </div>
                <button type="button" class="text-xs font-semibold text-[#0C51D9] flex items-center gap-1" @click="addOption(q)"><Plus class="w-3 h-3" /> Add option</button>
              </div>
            </div>
            <button type="button" class="text-xs font-semibold text-[#0C51D9] flex items-center gap-1" @click="addQuestion(section)"><Plus class="w-3.5 h-3.5" /> Add question</button>
          </div>
        </div>
        <button type="button" class="rounded-[10px] border border-dashed border-[#DCDEDD] w-full py-3 text-sm font-semibold text-brand-light hover:border-[#0C51D9] hover:text-[#0C51D9] flex items-center justify-center gap-1.5" @click="addSection">
          <Plus class="w-4 h-4" /> Add section
        </button>
      </template>
    </div>

    <!-- Catalog item modal -->
    <div v-if="editing" class="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="editing = null">
      <form class="bg-white w-full sm:max-w-xl rounded-t-[16px] sm:rounded-[14px] border border-[#DCDEDD] max-h-[92vh] overflow-y-auto" @submit.prevent="saveItem">
        <div class="p-4 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-base font-bold text-brand-dark">{{ editing.id ? "Edit service" : "Add service" }}</h3>
          <button type="button" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Close" @click="editing = null"><X class="w-5 h-5 text-gray-500" /></button>
        </div>
        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <label class="sm:col-span-2"><span class="block text-xs font-semibold mb-1">Name</span><input v-model="editing.name" required maxlength="255" class="w-full border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5" /></label>
          <label><span class="block text-xs font-semibold mb-1">Code</span><input v-model="editing.code" required maxlength="60" pattern="[a-z0-9-]+" class="w-full border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5" /><span v-if="itemErrors.code" class="text-xs text-red-500">{{ itemErrors.code[0] }}</span></label>
          <label><span class="block text-xs font-semibold mb-1">Category</span><input v-model="editing.category" required maxlength="60" class="w-full border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5" /></label>
          <label class="sm:col-span-2"><span class="block text-xs font-semibold mb-1">Description</span><textarea v-model="editing.description" rows="2" maxlength="2000" class="w-full border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5"></textarea></label>
          <label><span class="block text-xs font-semibold mb-1">Pricing</span>
            <select v-model="editing.pricing_mode" class="select-soft"><option v-for="(l, k) in PRICING_MODE" :key="k" :value="k">{{ l }}</option></select>
          </label>
          <label><span class="block text-xs font-semibold mb-1">Billed</span>
            <select v-model="editing.price_unit" class="select-soft"><option value="once">Once</option><option value="month">Monthly</option><option value="year">Yearly</option></select>
          </label>
          <label v-if="editing.pricing_mode === 'rate_card'"><span class="block text-xs font-semibold mb-1">Price from (Rp)</span><input v-model.number="editing.price_from" type="number" min="0" class="w-full border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5" /></label>
          <label v-if="editing.pricing_mode === 'hourly'"><span class="block text-xs font-semibold mb-1">Default hours</span><input v-model.number="editing.default_hours" type="number" min="0" class="w-full border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5" /></label>
          <label><span class="block text-xs font-semibold mb-1">Duration</span><input v-model="editing.duration_text" maxlength="100" placeholder="e.g. 2-3 minggu" class="w-full border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5" /></label>
          <label><span class="block text-xs font-semibold mb-1">Availability</span>
            <select v-model="editing.availability" class="select-soft"><option value="available">Available</option><option value="preparation">In preparation</option></select>
          </label>
          <label class="flex items-center gap-2 text-xs"><input v-model="editing.is_active" type="checkbox" class="accent-[#0C51D9]" /> Active (used for recommendations)</label>
        </div>
        <div class="p-4 border-t border-[#DCDEDD] grid grid-cols-2 gap-2">
          <button type="button" class="rounded-[10px] border border-[#DCDEDD] px-4 py-2 text-sm font-semibold" @click="editing = null">Cancel</button>
          <button type="submit" :disabled="savingItem" class="blue-gradient border border-[#2151A0] rounded-[10px] px-4 py-2 text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Loader2 v-if="savingItem" class="w-4 h-4 animate-spin" /> Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
