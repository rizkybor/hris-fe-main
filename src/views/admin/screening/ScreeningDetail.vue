<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  ArrowLeft, Download, FileLock2, Link2, Copy, Check, RefreshCw, Trash2, Plus, Save, Loader2, AlertTriangle,
  Sparkles, Clock, Wallet, Layers, Pencil, X, Send,
} from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { useScreeningStore } from "@/stores/screening";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";
import { copyText } from "@/utils/serverMetrics";
import { SCREENING_STATUS, SCREENING_SOURCE, COMPLEXITY, PRICE_UNIT } from "@/utils/screening";
import ScreeningFormFields from "@/components/admin/screening/ScreeningFormFields.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const route = useRoute();
const router = useRouter();
const store = useScreeningStore();
const alertModal = useAlertModalStore();
const { screening: s, saving } = storeToRefs(store);
const loading = ref(true);
const canEdit = computed(() => can("screening-edit"));

const tab = ref("recommendation");
const load = async () => {
  loading.value = true;
  try {
    await store.fetchScreening(route.params.id);
    // Nothing answered yet: go straight to the questions.
    tab.value = s.value?.submitted_at ? "recommendation" : "answers";
    editingAnswers.value = !s.value?.submitted_at && s.value?.source === "internal" && canEdit.value;
    resetDrafts();
  } finally {
    loading.value = false;
  }
};
onMounted(load);
watch(() => route.params.id, (id) => id && load());

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
const money = (v) => formatRupiah(v ?? 0);

// ----- Status, notes, contact -----
const setStatus = (status) => store.updateScreening(s.value.id, { status });
const notes = ref("");
const contact = ref({});
const editingContact = ref(false);
const resetDrafts = () => {
  notes.value = s.value?.internal_notes || "";
  contact.value = { contact_name: s.value?.contact_name || "", company: s.value?.company || "", email: s.value?.email || "", phone: s.value?.phone || "" };
  answers.value = { ...(s.value?.answers || {}) };
  items.value = (s.value?.items || []).map((i) => ({ ...i }));
  itemsDirty.value = false;
};
const saveNotes = () => store.updateScreening(s.value.id, { internal_notes: notes.value });
const contactErrors = ref({});
const saveContact = async () => {
  contactErrors.value = {};
  try {
    await store.updateScreening(s.value.id, contact.value);
    editingContact.value = false;
  } catch (e) {
    contactErrors.value = e?.response?.data?.errors || {};
  }
};

// ----- Answers -----
const answers = ref({});
const answerErrors = ref({});
const editingAnswers = ref(false);
const saveAnswers = async (submit) => {
  answerErrors.value = {};
  try {
    await store.updateScreening(s.value.id, { answers: answers.value, submit });
    resetDrafts();
    if (submit) {
      editingAnswers.value = false;
      tab.value = "recommendation";
    }
  } catch (e) {
    answerErrors.value = e?.response?.data?.data || e?.response?.data?.errors || {};
  }
};

// ----- Invite link -----
const copied = ref(false);
const copyLink = async () => {
  await copyText(s.value.invite_url);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
};
const makeInvite = async (lang) => {
  if (s.value.invite_url && !(await alertModal.confirm("Create a new link? The current link will stop working."))) return;
  await store.createInvite(s.value.id, lang || s.value.lang);
};

// ----- Items -----
const items = ref([]);
const itemsDirty = ref(false);
const catalog = ref([]);
const hourlyRate = ref(0);
const loadCatalog = async () => {
  if (catalog.value.length || !canEdit.value) return;
  const { data } = await axiosInstance.get("/service-catalog");
  catalog.value = data.data.items.filter((i) => i.is_active);
  hourlyRate.value = data.data.hourly_rate;
};
watch(tab, (t) => t === "recommendation" && loadCatalog(), { immediate: true });

const markDirty = () => (itemsDirty.value = true);
const lineTotal = (i) => (i.unit_price === null || i.unit_price === "" ? null : Number(i.qty || 0) * Number(i.unit_price));
const addPick = ref("");
const addItem = () => {
  const pick = addPick.value;
  if (!pick) return;
  if (pick === "__custom") {
    items.value.push({ name: "", category: null, qty: 1, hours: null, unit_price: null, price_unit: "once", duration_text: null, reason: null, is_selected: true, source: "manual" });
  } else {
    const c = catalog.value.find((x) => String(x.id) === pick);
    const hours = c.pricing_mode === "hourly" ? Number(c.default_hours || 0) : null;
    const price =
      c.availability !== "available" ? null
      : c.pricing_mode === "rate_card" ? (c.price_from !== null ? Number(c.price_from) : null)
      : c.pricing_mode === "hourly" && hourlyRate.value ? Math.round((hours * hourlyRate.value) / 1000) * 1000
      : null;
    items.value.push({ service_item_id: c.id, name: c.name, category: c.category, qty: 1, hours, unit_price: price, price_unit: c.price_unit, duration_text: c.duration_text, reason: "Added by the team", is_selected: true, source: "manual", pricing_mode: c.pricing_mode });
  }
  addPick.value = "";
  markDirty();
};
const removeItem = (idx) => {
  items.value.splice(idx, 1);
  markDirty();
};
// Hours drive the price of hourly items.
const onHours = (i) => {
  if (i.pricing_mode === "hourly" && hourlyRate.value) i.unit_price = Math.round((Number(i.hours || 0) * hourlyRate.value) / 1000) * 1000;
  markDirty();
};
const itemErrors = ref("");
const saveItems = async () => {
  itemErrors.value = "";
  try {
    await store.saveItems(
      s.value.id,
      items.value.map((i) => ({
        id: i.id ?? null,
        service_item_id: i.service_item_id ?? null,
        name: i.name,
        category: i.category,
        qty: Number(i.qty || 0),
        hours: i.hours === "" || i.hours === null ? null : Number(i.hours),
        unit_price: i.unit_price === "" || i.unit_price === null ? null : Number(i.unit_price),
        price_unit: i.price_unit,
        duration_text: i.duration_text,
        reason: i.reason,
        is_selected: !!i.is_selected,
      }))
    );
    resetDrafts();
  } catch (e) {
    itemErrors.value = e?.response?.data?.message || "Failed to save the items.";
  }
};
const recalculate = async () => {
  if (!(await alertModal.confirm("Rebuild the recommendations from the answers? Recommended items are replaced (your edits to them are lost); items you added yourself stay."))) return;
  await store.recalculate(s.value.id);
  resetDrafts();
};

const est = computed(() => s.value?.estimate || {});
const FIT = {
  fit: { label: "Within budget", class: "bg-green-50 text-green-700" },
  over: { label: "Over budget", class: "bg-red-50 text-red-600" },
  unknown: { label: "Budget not given", class: "bg-gray-100 text-gray-500" },
};

const pdfBusy = ref(null);
const pdf = async (withPrices) => {
  pdfBusy.value = withPrices ? "internal" : "client";
  try {
    await store.downloadPdf(s.value, withPrices);
  } finally {
    pdfBusy.value = null;
  }
};

const remove = async () => {
  if (!(await alertModal.confirm("Delete this screening?", { type: "danger", confirmText: "Delete" }))) return;
  await store.deleteScreening(s.value.id);
  router.push({ name: "admin.screening.dashboard" });
};
</script>

<template>
  <div class="px-0.5 py-1 sm:px-4 sm:py-4">
    <div v-if="loading && !s" class="space-y-3">
      <Skeleton height="120px" rounded="14px" />
      <Skeleton height="320px" rounded="14px" />
    </div>

    <template v-else-if="s">
      <!-- Header -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5 mb-4">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <RouterLink :to="{ name: 'admin.screening.dashboard' }" class="w-9 h-9 rounded-[10px] bg-white border border-[#DCDEDD] flex items-center justify-center shrink-0 hover:border-[#0C51D9]" aria-label="Back">
              <ArrowLeft class="w-4 h-4 text-gray-600" />
            </RouterLink>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-brand-dark text-lg font-bold">{{ s.company || s.contact_name || "Unnamed client" }}</h3>
                <span class="px-2 py-0.5 rounded-md text-xs font-semibold" :class="SCREENING_STATUS[s.status]?.class">{{ SCREENING_STATUS[s.status]?.label }}</span>
              </div>
              <p class="text-xs text-brand-light mt-0.5">
                {{ s.code }} · {{ SCREENING_SOURCE[s.source] }} · {{ s.lang === "en" ? "English" : "Bahasa Indonesia" }}
                · {{ s.submitted_at ? `Submitted ${formatDate(s.submitted_at)}` : `Created ${formatDate(s.created_at)}` }}
              </p>
              <p class="text-xs text-brand-dark mt-1">
                {{ s.contact_name || "-" }}<template v-if="s.email"> · {{ s.email }}</template><template v-if="s.phone"> · {{ s.phone }}</template>
                <button v-if="canEdit" type="button" class="ml-1 text-[#0C51D9] inline-flex items-center gap-0.5 font-semibold" @click="editingContact = !editingContact">
                  <Pencil class="w-3 h-3" /> Edit
                </button>
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0">
            <select v-if="canEdit" :value="s.status" class="select-soft !w-auto" aria-label="Status" @change="setStatus($event.target.value)">
              <option v-for="(v, k) in SCREENING_STATUS" :key="k" :value="k">{{ v.label }}</option>
            </select>
            <button type="button" class="rounded-[8px] border border-[#DCDEDD] bg-white hover:border-[#0C51D9] px-3 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50" :disabled="!!pdfBusy" @click="pdf(false)">
              <Loader2 v-if="pdfBusy === 'client'" class="w-3.5 h-3.5 animate-spin" /><Download v-else class="w-3.5 h-3.5" /> PDF for client
            </button>
            <button type="button" class="rounded-[8px] border border-[#DCDEDD] bg-white hover:border-[#0C51D9] px-3 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50" :disabled="!!pdfBusy" @click="pdf(true)">
              <Loader2 v-if="pdfBusy === 'internal'" class="w-3.5 h-3.5 animate-spin" /><FileLock2 v-else class="w-3.5 h-3.5" /> PDF with prices
            </button>
            <button v-if="can('screening-delete')" type="button" class="w-9 h-9 rounded-[8px] border border-[#DCDEDD] bg-white hover:border-red-400 hover:bg-red-50 flex items-center justify-center" aria-label="Delete" @click="remove">
              <Trash2 class="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <form v-if="editingContact" class="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2" @submit.prevent="saveContact">
          <input v-model="contact.contact_name" placeholder="Contact name" maxlength="120" class="border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm bg-white" />
          <input v-model="contact.company" placeholder="Company" maxlength="150" class="border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm bg-white" />
          <input v-model="contact.email" type="email" placeholder="Email" maxlength="150" class="border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm bg-white" />
          <div class="flex gap-2">
            <input v-model="contact.phone" placeholder="Phone" maxlength="40" class="flex-1 min-w-0 border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm bg-white" />
            <button type="submit" class="blue-gradient border border-[#2151A0] rounded-[10px] px-3 text-white text-xs font-semibold">Save</button>
          </div>
          <p v-if="contactErrors.email" class="text-xs text-red-500 sm:col-span-4">{{ contactErrors.email[0] }}</p>
        </form>

        <!-- Invite link -->
        <div v-if="s.invite_url" class="mt-3 bg-white border border-sky-200 rounded-[10px] p-3">
          <p class="text-xs font-semibold text-sky-800 flex items-center gap-1.5"><Link2 class="w-3.5 h-3.5" /> Link for the client — open until {{ formatDate(s.token_expires_at) }}</p>
          <div class="flex flex-col sm:flex-row gap-2 mt-1.5">
            <input :value="s.invite_url" readonly class="flex-1 min-w-0 border border-[#DCDEDD] rounded-[8px] px-2.5 py-1.5 text-xs bg-gray-50" @focus="$event.target.select()" />
            <div class="flex gap-2">
              <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-3 py-1.5 text-xs font-semibold flex items-center gap-1" @click="copyLink">
                <Check v-if="copied" class="w-3.5 h-3.5 text-green-600" /><Copy v-else class="w-3.5 h-3.5" /> {{ copied ? "Copied" : "Copy" }}
              </button>
              <button v-if="can('screening-share')" type="button" class="rounded-[8px] border border-[#DCDEDD] px-3 py-1.5 text-xs font-semibold flex items-center gap-1" @click="makeInvite()">
                <RefreshCw class="w-3.5 h-3.5" /> New link
              </button>
            </div>
          </div>
          <p class="text-[11px] text-brand-light mt-1.5">The client sees only the questions — no prices. Their answers save as they go; you'll get an email when they submit.</p>
        </div>
        <div v-else-if="!s.submitted_at && can('screening-share')" class="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span class="text-brand-light">Let the client fill it in themselves:</span>
          <button type="button" class="rounded-[8px] border border-[#DCDEDD] bg-white px-3 py-1.5 font-semibold flex items-center gap-1 hover:border-[#0C51D9]" @click="makeInvite('id')"><Send class="w-3.5 h-3.5" /> Link (ID)</button>
          <button type="button" class="rounded-[8px] border border-[#DCDEDD] bg-white px-3 py-1.5 font-semibold flex items-center gap-1 hover:border-[#0C51D9]" @click="makeInvite('en')"><Send class="w-3.5 h-3.5" /> Link (EN)</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="inline-grid grid-cols-2 bg-gray-100 rounded-[10px] p-1 mb-4 w-full sm:w-auto">
        <button
          v-for="t in [{ k: 'recommendation', l: 'Recommendation' }, { k: 'answers', l: 'Answers' }]"
          :key="t.k"
          type="button"
          class="px-4 py-1.5 rounded-[8px] text-sm font-semibold"
          :class="tab === t.k ? 'bg-white text-brand-dark shadow-sm' : 'text-brand-light hover:text-brand-dark'"
          @click="tab = t.k"
        >{{ t.l }}</button>
      </div>

      <!-- Recommendation -->
      <div v-if="tab === 'recommendation'" class="space-y-4">
        <div v-if="!s.result" class="text-center py-12 rounded-[14px] border border-dashed border-[#DCDEDD] bg-gray-50/60">
          <Sparkles class="w-9 h-9 text-gray-300 mx-auto mb-2" />
          <p class="text-sm font-semibold text-brand-dark">No recommendation yet</p>
          <p class="text-xs text-brand-light">It's prepared once the questionnaire is submitted{{ canEdit ? " — or fill it in on the Answers tab" : "" }}.</p>
        </div>

        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div class="bg-white border border-[#DCDEDD] rounded-[12px] p-4 xl:col-span-2">
              <p class="text-xs text-brand-light flex items-center gap-1.5"><Layers class="w-3.5 h-3.5" /> Recommended system</p>
              <p class="text-sm font-bold text-brand-dark mt-1">{{ s.result.system_types?.join(", ") || "Needs a conversation" }}</p>
              <span v-if="s.result.complexity" class="inline-block mt-2 px-2 py-0.5 rounded-md text-xs font-semibold" :class="COMPLEXITY[s.result.complexity]?.class">{{ COMPLEXITY[s.result.complexity]?.label }}</span>
            </div>
            <div class="bg-white border border-[#DCDEDD] rounded-[12px] p-4">
              <p class="text-xs text-brand-light flex items-center gap-1.5"><Wallet class="w-3.5 h-3.5" /> Estimate (from)</p>
              <p class="text-lg font-extrabold text-brand-dark mt-1">{{ money(est.one_time) }}</p>
              <p v-if="est.monthly" class="text-xs text-brand-dark">+ {{ money(est.monthly) }} / month</p>
              <p v-if="est.yearly" class="text-xs text-brand-dark">+ {{ money(est.yearly) }} / year</p>
              <p v-if="est.by_quote?.length" class="text-[11px] text-gray-400 mt-1">{{ est.by_quote.length }} item(s) by quote</p>
            </div>
            <div class="bg-white border border-[#DCDEDD] rounded-[12px] p-4">
              <p class="text-xs text-brand-light flex items-center gap-1.5"><Clock class="w-3.5 h-3.5" /> Timeline & budget</p>
              <p class="text-sm font-bold text-brand-dark mt-1">{{ est.longest_duration || "-" }}<span v-if="est.extra_weeks" class="font-normal text-xs"> + ~{{ est.extra_weeks }} wk add-ons</span></p>
              <p class="text-xs text-brand-dark mt-1">{{ s.result.budget?.label || "No budget given" }}</p>
              <span class="inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold" :class="FIT[est.budget_fit]?.class">{{ FIT[est.budget_fit]?.label }}</span>
              <p v-if="est.deferrable?.length" class="text-[11px] text-amber-700 mt-1">Could move to phase 2: {{ est.deferrable.join(", ") }}</p>
            </div>
          </div>

          <div v-if="s.result.flags?.length" class="bg-amber-50 border border-amber-200 rounded-[12px] p-3.5">
            <p class="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1"><AlertTriangle class="w-3.5 h-3.5" /> Notes for the team</p>
            <ul class="list-disc pl-5 text-xs text-amber-900 space-y-0.5">
              <li v-for="f in s.result.flags" :key="f">{{ f }}</li>
            </ul>
          </div>

          <!-- Items -->
          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <p class="text-sm font-bold text-brand-dark">Services to offer</p>
                <p class="text-xs text-brand-light">Prices from the Rate Card, or hours × the Project Calculator rate. Untick to leave a service out of the summary.</p>
              </div>
              <div v-if="canEdit" class="flex gap-2 shrink-0">
                <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-3 py-2 text-xs font-semibold flex items-center gap-1.5 hover:border-[#0C51D9]" :disabled="saving" @click="recalculate">
                  <RefreshCw class="w-3.5 h-3.5" /> Recalculate
                </button>
                <button type="button" class="blue-gradient border border-[#2151A0] rounded-[8px] px-3 py-2 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50" :disabled="!itemsDirty || saving" @click="saveItems">
                  <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" /><Save v-else class="w-3.5 h-3.5" /> Save changes
                </button>
              </div>
            </div>
            <p v-if="canEdit && !hourlyRate && catalog.length" class="text-[11px] text-amber-700 mb-2">The Project Calculator hourly rate isn't set, so hourly items show no price.</p>
            <p v-if="itemErrors" class="text-xs text-red-500 mb-2">{{ itemErrors }}</p>

            <!-- Phones: one card per service -->
            <div class="md:hidden space-y-2">
              <div v-for="(i, idx) in items" :key="i.id ?? `m-${idx}`" class="border border-[#EEF1F5] rounded-[10px] p-3" :class="{ 'opacity-50': !i.is_selected }">
                <div class="flex items-start gap-2">
                  <input v-model="i.is_selected" type="checkbox" class="mt-1 accent-[#0C51D9]" :disabled="!canEdit" @change="markDirty" />
                  <div class="flex-1 min-w-0">
                    <input v-if="canEdit" v-model="i.name" class="w-full border border-[#DCDEDD] rounded-[6px] px-2 py-1 text-sm font-medium text-brand-dark" @input="markDirty" />
                    <p v-else class="text-sm font-medium text-brand-dark">{{ i.name }}</p>
                    <p class="text-[11px] text-gray-400 mt-0.5">
                      <span v-if="i.source === 'manual'" class="text-[#0C51D9] font-semibold">Added · </span>
                      <span v-if="i.availability === 'preparation'" class="text-amber-700 font-semibold">Not available yet · </span>{{ i.reason }}
                    </p>
                  </div>
                  <button v-if="canEdit" type="button" class="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center shrink-0" aria-label="Remove" @click="removeItem(idx)">
                    <X class="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
                <div v-if="canEdit" class="grid grid-cols-[1fr_1fr_2fr_1.3fr] gap-1.5 mt-2 text-[11px] text-brand-light">
                  <label>Hours<input v-if="i.hours !== null" v-model.number="i.hours" type="number" min="0" class="w-full border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-xs text-brand-dark" @input="onHours(i)" /><span v-else class="block py-1 text-gray-300">-</span></label>
                  <label>Qty<input v-model.number="i.qty" type="number" min="0" step="any" class="w-full border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-xs text-brand-dark" @input="markDirty" /></label>
                  <label>Unit price<input v-model.number="i.unit_price" type="number" min="0" placeholder="By quote" class="w-full border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-xs text-brand-dark" @input="markDirty" /></label>
                  <label>Per<select v-model="i.price_unit" class="w-full border border-[#DCDEDD] rounded-[6px] px-1 py-1 text-xs text-brand-dark" @change="markDirty"><option value="once">once</option><option value="month">month</option><option value="year">year</option></select></label>
                </div>
                <p class="text-right text-sm font-semibold mt-1.5">
                  <template v-if="lineTotal(i) === null"><span class="text-xs text-gray-400 font-normal">By quote</span></template>
                  <template v-else>{{ money(lineTotal(i)) }}<span class="text-[11px] font-normal text-gray-400">{{ PRICE_UNIT[i.price_unit] }}</span></template>
                </p>
              </div>
            </div>

            <div class="hidden md:block overflow-x-auto -mx-4 px-4">
              <table class="min-w-[760px] w-full text-sm">
                <thead class="text-left text-brand-light text-xs">
                  <tr class="border-b border-[#EEF1F5]">
                    <th class="py-2 pr-2 w-8"></th>
                    <th class="py-2 pr-3">Service</th>
                    <th class="py-2 pr-3 w-20 text-right">Hours</th>
                    <th class="py-2 pr-3 w-16 text-right">Qty</th>
                    <th class="py-2 pr-3 w-36 text-right">Unit price</th>
                    <th class="py-2 pr-3 w-24">Per</th>
                    <th class="py-2 pr-3 w-32 text-right">Total</th>
                    <th v-if="canEdit" class="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(i, idx) in items" :key="i.id ?? `new-${idx}`" class="border-b border-[#F4F5F7] align-top" :class="{ 'opacity-50': !i.is_selected }">
                    <td class="py-2 pr-2"><input v-model="i.is_selected" type="checkbox" class="mt-2 accent-[#0C51D9]" :disabled="!canEdit" @change="markDirty" /></td>
                    <td class="py-2 pr-3">
                      <input v-if="canEdit" v-model="i.name" class="w-full border border-transparent hover:border-[#DCDEDD] focus:border-[#0C51D9] rounded-[6px] px-1.5 py-1 font-medium text-brand-dark" @input="markDirty" />
                      <p v-else class="font-medium text-brand-dark py-1">{{ i.name }}</p>
                      <p class="text-[11px] text-gray-400 px-1.5">
                        <span v-if="i.source === 'manual'" class="text-[#0C51D9] font-semibold">Added · </span>
                        <span v-if="i.availability === 'preparation'" class="text-amber-700 font-semibold">Not available yet · </span>
                        {{ i.reason }}
                      </p>
                    </td>
                    <td class="py-2 pr-3 text-right">
                      <input v-if="canEdit && i.hours !== null" v-model.number="i.hours" type="number" min="0" class="w-16 border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-right" @input="onHours(i)" />
                      <span v-else class="text-gray-300">-</span>
                    </td>
                    <td class="py-2 pr-3 text-right">
                      <input v-if="canEdit" v-model.number="i.qty" type="number" min="0" step="any" class="w-14 border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-right" @input="markDirty" />
                      <span v-else>{{ i.qty }}</span>
                    </td>
                    <td class="py-2 pr-3 text-right">
                      <input v-if="canEdit" v-model.number="i.unit_price" type="number" min="0" placeholder="By quote" class="w-32 border border-[#DCDEDD] rounded-[6px] px-1.5 py-1 text-right" @input="markDirty" />
                      <span v-else>{{ i.unit_price === null ? "By quote" : money(i.unit_price) }}</span>
                    </td>
                    <td class="py-2 pr-3">
                      <select v-if="canEdit" v-model="i.price_unit" class="border border-[#DCDEDD] rounded-[6px] px-1 py-1 text-xs" @change="markDirty">
                        <option value="once">once</option><option value="month">month</option><option value="year">year</option>
                      </select>
                      <span v-else class="text-xs">{{ i.price_unit }}</span>
                    </td>
                    <td class="py-2 pr-3 text-right whitespace-nowrap font-semibold">
                      <template v-if="lineTotal(i) === null"><span class="text-xs text-gray-400 font-normal">By quote</span></template>
                      <template v-else>{{ money(lineTotal(i)) }}<span class="text-[11px] font-normal text-gray-400">{{ PRICE_UNIT[i.price_unit] }}</span></template>
                    </td>
                    <td v-if="canEdit" class="py-2">
                      <button type="button" class="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center" aria-label="Remove" @click="removeItem(idx)">
                        <X class="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="!items.length" class="text-sm text-gray-400 text-center py-6">No services yet.</p>

            <div v-if="canEdit" class="flex flex-col sm:flex-row gap-2 mt-3">
              <select v-model="addPick" class="select-soft sm:max-w-sm" aria-label="Add a service">
                <option value="">Add a service…</option>
                <option value="__custom">Custom item</option>
                <option v-for="c in catalog" :key="c.id" :value="String(c.id)">{{ c.name }}{{ c.availability !== "available" ? " (not available yet)" : "" }}</option>
              </select>
              <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1 hover:border-[#0C51D9] disabled:opacity-50" :disabled="!addPick" @click="addItem">
                <Plus class="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
            <p class="text-sm font-bold text-brand-dark mb-1">Internal notes</p>
            <textarea v-model="notes" rows="3" maxlength="5000" :readonly="!canEdit" class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]" placeholder="Follow-up, what the client said in the meeting, etc."></textarea>
            <button v-if="canEdit" type="button" class="mt-2 rounded-[8px] border border-[#DCDEDD] px-3 py-1.5 text-xs font-semibold hover:border-[#0C51D9] disabled:opacity-50" :disabled="notes === (s.internal_notes || '') || saving" @click="saveNotes">Save notes</button>
          </div>
        </template>
      </div>

      <!-- Answers -->
      <div v-else class="space-y-4">
        <div v-if="canEdit" class="flex flex-wrap gap-2 justify-end">
          <template v-if="editingAnswers">
            <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-3 py-2 text-xs font-semibold" @click="(editingAnswers = false), resetDrafts()">Cancel</button>
            <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-3 py-2 text-xs font-semibold disabled:opacity-50" :disabled="saving" @click="saveAnswers(false)">Save draft</button>
            <button type="button" class="blue-gradient border border-[#2151A0] rounded-[8px] px-3 py-2 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50" :disabled="saving" @click="saveAnswers(true)">
              <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" /><Sparkles v-else class="w-3.5 h-3.5" /> Save & analyse
            </button>
          </template>
          <button v-else type="button" class="rounded-[8px] border border-[#DCDEDD] px-3 py-2 text-xs font-semibold flex items-center gap-1.5 hover:border-[#0C51D9]" @click="editingAnswers = true">
            <Pencil class="w-3.5 h-3.5" /> {{ s.submitted_at ? "Edit answers" : "Fill in" }}
          </button>
        </div>
        <p v-if="Object.keys(answerErrors).length" class="text-xs text-red-500 text-right">Some required questions are still empty.</p>

        <ScreeningFormFields v-if="editingAnswers" v-model="answers" :form="s.form" :errors="answerErrors" />

        <template v-else>
          <div v-if="!s.readable_answers?.length" class="text-center py-12 rounded-[14px] border border-dashed border-[#DCDEDD] bg-gray-50/60 text-sm text-brand-light">No answers yet.</div>
          <div v-for="section in s.readable_answers" :key="section.key" class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
            <p class="text-sm font-bold text-brand-dark mb-2">{{ section.title }}</p>
            <dl class="divide-y divide-[#F1F3F7]">
              <div v-for="a in section.answers" :key="a.key" class="py-2 grid grid-cols-1 sm:grid-cols-[40%_1fr] gap-x-4 gap-y-0.5 text-sm">
                <dt class="text-brand-light">{{ a.question }}</dt>
                <dd class="text-brand-dark whitespace-pre-line">{{ a.answer }}</dd>
              </div>
            </dl>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
