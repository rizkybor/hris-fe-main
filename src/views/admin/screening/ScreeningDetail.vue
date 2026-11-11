<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  ArrowLeft, Download, FileLock2, Link2, Copy, Check, RefreshCw, Trash2, Plus, Save, Loader2, AlertTriangle,
  Sparkles, Clock, Wallet, Layers, Pencil, X, Send, ChevronDown,
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
import { UiButton, UiBadge, UiEmpty, UiAlert, UiInput } from "@/components/ui";

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

// Presentation only: badge tones and field styles.
const STATUS_TONE = { draft: "neutral", invited: "outline", new: "info", in_review: "warn", reviewed: "accent", won: "ok", lost: "bad" };
const SIZE_TONE = { S: "ok", M: "info", L: "warn", XL: "bad" };
const FIT_TONE = { fit: "ok", over: "bad", unknown: "neutral" };
const cell = "h-8 px-2 bg-ui-surface text-ui-small text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle";
const iconBtn = "ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad shrink-0";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <div v-if="loading && !s" class="space-y-4">
      <Skeleton height="96px" rounded="12px" />
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Skeleton v-for="i in 4" :key="i" height="88px" rounded="12px" />
      </div>
      <Skeleton height="320px" rounded="12px" />
    </div>

    <template v-else-if="s">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-start gap-4">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <UiButton variant="secondary" :icon="ArrowLeft" :to="{ name: 'admin.screening.dashboard' }" aria-label="Back" class="!px-0 w-9 shrink-0" />
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-ui-h1 text-ui-ink truncate">{{ s.company || s.contact_name || "Unnamed client" }}</h1>
              <UiBadge :tone="STATUS_TONE[s.status] || 'neutral'" dot>{{ SCREENING_STATUS[s.status]?.label }}</UiBadge>
            </div>
            <p class="text-ui-small text-ui-muted mt-0.5">
              <span class="font-mono">{{ s.code }}</span> · {{ SCREENING_SOURCE[s.source] }} · {{ s.lang === "en" ? "English" : "Bahasa Indonesia" }}
              · {{ s.submitted_at ? `Submitted ${formatDate(s.submitted_at)}` : `Created ${formatDate(s.created_at)}` }}
            </p>
            <p class="text-ui-small text-ui-text mt-1">
              {{ s.contact_name || "-" }}<template v-if="s.email"> · {{ s.email }}</template><template v-if="s.phone"> · {{ s.phone }}</template>
              <button v-if="canEdit" type="button" class="ml-1.5 text-ui-accent font-medium inline-flex items-center gap-1 hover:underline" @click="editingContact = !editingContact">
                <Pencil class="w-3 h-3" /> Edit
              </button>
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <div v-if="canEdit" class="relative">
            <select
              :value="s.status"
              aria-label="Status"
              class="h-9 pl-3 pr-8 appearance-none bg-ui-surface text-ui-small font-medium text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
              @change="setStatus($event.target.value)"
            >
              <option v-for="(v, k) in SCREENING_STATUS" :key="k" :value="k">{{ v.label }}</option>
            </select>
            <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
          </div>
          <UiButton variant="secondary" :icon="Download" :loading="pdfBusy === 'client'" :disabled="!!pdfBusy" @click="pdf(false)">PDF for client</UiButton>
          <UiButton variant="secondary" :icon="FileLock2" :loading="pdfBusy === 'internal'" :disabled="!!pdfBusy" @click="pdf(true)">PDF with prices</UiButton>
          <UiButton v-if="can('screening-delete')" variant="danger" :icon="Trash2" aria-label="Delete" class="!px-0 w-9" @click="remove" />
        </div>
      </div>

      <!-- Contact edit -->
      <form v-if="editingContact" class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end ui-anim-fade-up" @submit.prevent="saveContact">
        <UiInput v-model="contact.contact_name" placeholder="Contact name" aria-label="Contact name" />
        <UiInput v-model="contact.company" placeholder="Company" aria-label="Company" />
        <UiInput v-model="contact.email" type="email" placeholder="Email" aria-label="Email" :error="contactErrors.email?.[0] || ''" />
        <UiInput v-model="contact.phone" placeholder="Phone" aria-label="Phone" />
        <UiButton type="submit" :loading="saving">Save</UiButton>
      </form>

      <!-- Invite link -->
      <section v-if="s.invite_url" class="bg-ui-info-soft border border-ui-info/20 rounded-ui-card p-4">
        <p class="text-ui-small font-medium text-ui-info flex items-center gap-1.5"><Link2 class="w-4 h-4" /> Link for the client — open until {{ formatDate(s.token_expires_at) }}</p>
        <div class="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            :value="s.invite_url"
            readonly
            aria-label="Invite link"
            class="w-full sm:flex-1 min-w-0 h-9 shrink-0 px-3 bg-ui-surface font-mono text-ui-cap text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            @focus="$event.target.select()"
          />
          <div class="flex gap-2">
            <UiButton variant="secondary" :icon="copied ? Check : Copy" class="flex-1 sm:flex-none" @click="copyLink">{{ copied ? "Copied" : "Copy" }}</UiButton>
            <UiButton v-if="can('screening-share')" variant="secondary" :icon="RefreshCw" class="flex-1 sm:flex-none" @click="makeInvite()">New link</UiButton>
          </div>
        </div>
        <p class="text-ui-cap text-ui-muted mt-2">The client sees only the questions — no prices. Their answers save as they go; you'll get an email when they submit.</p>
      </section>
      <div v-else-if="!s.submitted_at && can('screening-share')" class="flex flex-wrap items-center gap-2">
        <span class="text-ui-small text-ui-muted">Let the client fill it in themselves:</span>
        <UiButton variant="secondary" size="sm" :icon="Send" @click="makeInvite('id')">Link (ID)</UiButton>
        <UiButton variant="secondary" size="sm" :icon="Send" @click="makeInvite('en')">Link (EN)</UiButton>
      </div>

      <!-- Tabs -->
      <div class="overflow-x-auto [scrollbar-width:none] sm:border-b sm:border-ui-line">
        <div class="flex items-center gap-1.5 sm:gap-6 min-w-max" role="tablist">
          <button
            v-for="t in [{ k: 'recommendation', l: 'Recommendation' }, { k: 'answers', l: 'Answers' }]"
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

      <!-- Recommendation -->
      <div v-if="tab === 'recommendation'" class="space-y-5">
        <div v-if="!s.result" class="bg-ui-surface border border-ui-line rounded-ui-card">
          <UiEmpty :icon="Sparkles" title="No recommendation yet" :message="`It's prepared once the questionnaire is submitted${canEdit ? ' — or fill it in on the Answers tab' : ''}.`" />
        </div>

        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 ui-stagger">
            <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 xl:col-span-2 min-w-0">
              <p class="text-ui-small text-ui-muted flex items-center gap-2"><Layers class="w-4 h-4 text-ui-faint" /> Recommended system</p>
              <p class="text-ui-h2 text-ui-ink mt-1.5">{{ s.result.system_types?.join(", ") || "Needs a conversation" }}</p>
              <UiBadge v-if="s.result.complexity" :tone="SIZE_TONE[s.result.complexity] || 'neutral'" class="mt-2">{{ COMPLEXITY[s.result.complexity]?.label }}</UiBadge>
            </div>
            <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 min-w-0">
              <p class="text-ui-small text-ui-muted flex items-center gap-2"><Wallet class="w-4 h-4 text-ui-faint" /> Estimate (from)</p>
              <p class="text-ui-h1 text-ui-ink tabular-nums mt-1.5">{{ money(est.one_time) }}</p>
              <p v-if="est.monthly" class="text-ui-cap text-ui-text tabular-nums">+ {{ money(est.monthly) }} / month</p>
              <p v-if="est.yearly" class="text-ui-cap text-ui-text tabular-nums">+ {{ money(est.yearly) }} / year</p>
              <p v-if="est.by_quote?.length" class="text-ui-cap text-ui-faint mt-1">{{ est.by_quote.length }} item(s) by quote</p>
            </div>
            <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 min-w-0">
              <p class="text-ui-small text-ui-muted flex items-center gap-2"><Clock class="w-4 h-4 text-ui-faint" /> Timeline & budget</p>
              <p class="text-ui-h3 text-ui-ink mt-1.5">{{ est.longest_duration || "-" }}<span v-if="est.extra_weeks" class="font-normal text-ui-cap text-ui-muted"> + ~{{ est.extra_weeks }} wk add-ons</span></p>
              <p class="text-ui-cap text-ui-text mt-1">{{ s.result.budget?.label || "No budget given" }}</p>
              <UiBadge :tone="FIT_TONE[est.budget_fit] || 'neutral'" dot class="mt-1.5">{{ FIT[est.budget_fit]?.label }}</UiBadge>
              <p v-if="est.deferrable?.length" class="text-ui-cap text-ui-warn mt-1.5">Could move to phase 2: {{ est.deferrable.join(", ") }}</p>
            </div>
          </div>

          <div v-if="s.result.flags?.length" class="bg-ui-warn-soft border border-ui-warn/20 rounded-ui-card px-4 py-3.5">
            <p class="text-ui-small font-semibold text-ui-warn flex items-center gap-1.5 mb-1"><AlertTriangle class="w-4 h-4" /> Notes for the team</p>
            <ul class="list-disc pl-5 text-ui-small text-ui-text space-y-0.5">
              <li v-for="f in s.result.flags" :key="f">{{ f }}</li>
            </ul>
          </div>

          <!-- Items -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
            <header class="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4 border-b border-ui-line">
              <div class="flex-1 min-w-0">
                <h2 class="text-ui-h2 text-ui-ink">Services to offer</h2>
                <p class="text-ui-cap text-ui-muted">Prices from the Rate Card, or hours × the Project Calculator rate. Untick to leave a service out of the summary.</p>
              </div>
              <div v-if="canEdit" class="grid grid-cols-2 sm:flex gap-2 shrink-0">
                <UiButton variant="secondary" :icon="RefreshCw" :disabled="saving" @click="recalculate">Recalculate</UiButton>
                <UiButton :icon="Save" :loading="saving" :disabled="!itemsDirty || saving" @click="saveItems">Save changes</UiButton>
              </div>
            </header>
            <div v-if="(canEdit && !hourlyRate && catalog.length) || itemErrors" class="px-4 sm:px-5 pt-3 space-y-1">
              <p v-if="canEdit && !hourlyRate && catalog.length" class="text-ui-cap text-ui-warn">The Project Calculator hourly rate isn't set, so hourly items show no price.</p>
              <p v-if="itemErrors" class="text-ui-cap text-ui-bad">{{ itemErrors }}</p>
            </div>

            <!-- Phones: one card per service -->
            <ul class="md:hidden divide-y divide-ui-line">
              <li v-for="(i, idx) in items" :key="i.id ?? `m-${idx}`" class="px-4 py-3.5" :class="{ 'opacity-50': !i.is_selected }">
                <div class="flex items-start gap-2.5">
                  <span class="text-ui-cap text-ui-faint tabular-nums w-4 pt-2 shrink-0">{{ idx + 1 }}</span>
                  <input v-model="i.is_selected" type="checkbox" class="mt-2.5 accent-ui-ink" :disabled="!canEdit" aria-label="Include" @change="markDirty" />
                  <div class="flex-1 min-w-0">
                    <input v-if="canEdit" v-model="i.name" aria-label="Service" :class="[cell, 'w-full font-medium']" @input="markDirty" />
                    <p v-else class="text-ui-body font-medium text-ui-ink pt-1">{{ i.name }}</p>
                    <p class="text-ui-cap text-ui-muted mt-1">
                      <span v-if="i.source === 'manual'" class="text-ui-accent font-medium">Added · </span>
                      <span v-if="i.availability === 'preparation'" class="text-ui-warn font-medium">Not available yet · </span>{{ i.reason }}
                    </p>
                  </div>
                  <button v-if="canEdit" type="button" :class="iconBtn" aria-label="Remove" @click="removeItem(idx)">
                    <X class="w-4 h-4" />
                  </button>
                </div>
                <div v-if="canEdit" class="grid grid-cols-[1fr_1fr_2fr_1.3fr] gap-1.5 mt-2.5 pl-[42px] text-ui-cap text-ui-muted">
                  <label>Hours<input v-if="i.hours !== null" v-model.number="i.hours" type="number" min="0" :class="[cell, 'w-full mt-0.5 tabular-nums']" @input="onHours(i)" /><span v-else class="block h-8 leading-8 text-ui-faint">-</span></label>
                  <label>Qty<input v-model.number="i.qty" type="number" min="0" step="any" :class="[cell, 'w-full mt-0.5 tabular-nums']" @input="markDirty" /></label>
                  <label>Unit price<input v-model.number="i.unit_price" type="number" min="0" placeholder="By quote" :class="[cell, 'w-full mt-0.5 tabular-nums']" @input="markDirty" /></label>
                  <label>Per<select v-model="i.price_unit" :class="[cell, 'w-full mt-0.5 px-1']" @change="markDirty"><option value="once">once</option><option value="month">month</option><option value="year">year</option></select></label>
                </div>
                <p class="text-right text-ui-body font-medium text-ui-ink tabular-nums mt-2">
                  <template v-if="lineTotal(i) === null"><span class="text-ui-cap text-ui-faint font-normal">By quote</span></template>
                  <template v-else>{{ money(lineTotal(i)) }}<span class="text-ui-cap font-normal text-ui-faint">{{ PRICE_UNIT[i.price_unit] }}</span></template>
                </p>
              </li>
            </ul>

            <div class="hidden md:block overflow-x-auto">
              <table class="min-w-[800px] w-full border-collapse">
                <thead>
                  <tr class="text-left text-ui-cap font-medium text-ui-muted">
                    <th class="w-11 pl-4 pr-0 h-10 border-b border-ui-line font-medium">#</th>
                    <th class="w-8 px-2 h-10 border-b border-ui-line"><span class="sr-only">Include</span></th>
                    <th class="px-3 h-10 border-b border-ui-line font-medium">Service</th>
                    <th class="px-3 h-10 border-b border-ui-line font-medium w-24 text-right">Hours</th>
                    <th class="px-3 h-10 border-b border-ui-line font-medium w-20 text-right">Qty</th>
                    <th class="px-3 h-10 border-b border-ui-line font-medium w-40 text-right">Unit price</th>
                    <th class="px-3 h-10 border-b border-ui-line font-medium w-28">Per</th>
                    <th class="px-3 h-10 border-b border-ui-line font-medium w-36 text-right">Total</th>
                    <th v-if="canEdit" class="w-12 h-10 border-b border-ui-line"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(i, idx) in items" :key="i.id ?? `new-${idx}`" class="align-top hover:bg-ui-subtle/60 transition-colors" :class="{ 'opacity-50': !i.is_selected }">
                    <td class="pl-4 pr-0 py-3 text-ui-cap text-ui-faint tabular-nums border-b border-ui-line"><span class="inline-block pt-1.5">{{ idx + 1 }}</span></td>
                    <td class="px-2 py-3 border-b border-ui-line"><input v-model="i.is_selected" type="checkbox" class="mt-2 accent-ui-ink" :disabled="!canEdit" aria-label="Include" @change="markDirty" /></td>
                    <td class="px-3 py-3 border-b border-ui-line">
                      <input v-if="canEdit" v-model="i.name" aria-label="Service" :class="[cell, 'w-full font-medium border-transparent hover:border-ui-line-strong']" @input="markDirty" />
                      <p v-else class="text-ui-body font-medium text-ui-ink py-1.5">{{ i.name }}</p>
                      <p class="text-ui-cap text-ui-muted px-2 mt-0.5">
                        <span v-if="i.source === 'manual'" class="text-ui-accent font-medium">Added · </span>
                        <span v-if="i.availability === 'preparation'" class="text-ui-warn font-medium">Not available yet · </span>
                        {{ i.reason }}
                      </p>
                    </td>
                    <td class="px-3 py-3 text-right border-b border-ui-line">
                      <input v-if="canEdit && i.hours !== null" v-model.number="i.hours" type="number" min="0" aria-label="Hours" :class="[cell, 'w-20 text-right tabular-nums']" @input="onHours(i)" />
                      <span v-else class="inline-block pt-1.5 text-ui-faint">-</span>
                    </td>
                    <td class="px-3 py-3 text-right border-b border-ui-line text-ui-small tabular-nums">
                      <input v-if="canEdit" v-model.number="i.qty" type="number" min="0" step="any" aria-label="Qty" :class="[cell, 'w-16 text-right tabular-nums']" @input="markDirty" />
                      <span v-else class="inline-block pt-1.5">{{ i.qty }}</span>
                    </td>
                    <td class="px-3 py-3 text-right border-b border-ui-line text-ui-small tabular-nums">
                      <input v-if="canEdit" v-model.number="i.unit_price" type="number" min="0" placeholder="By quote" aria-label="Unit price" :class="[cell, 'w-36 text-right tabular-nums']" @input="markDirty" />
                      <span v-else class="inline-block pt-1.5">{{ i.unit_price === null ? "By quote" : money(i.unit_price) }}</span>
                    </td>
                    <td class="px-3 py-3 border-b border-ui-line">
                      <select v-if="canEdit" v-model="i.price_unit" aria-label="Per" :class="[cell, 'px-1.5']" @change="markDirty">
                        <option value="once">once</option><option value="month">month</option><option value="year">year</option>
                      </select>
                      <span v-else class="inline-block pt-1.5 text-ui-small">{{ i.price_unit }}</span>
                    </td>
                    <td class="px-3 py-3 text-right whitespace-nowrap border-b border-ui-line text-ui-small font-medium text-ui-ink tabular-nums">
                      <span class="inline-block pt-1.5">
                        <template v-if="lineTotal(i) === null"><span class="text-ui-cap text-ui-faint font-normal">By quote</span></template>
                        <template v-else>{{ money(lineTotal(i)) }}<span class="text-ui-cap font-normal text-ui-faint">{{ PRICE_UNIT[i.price_unit] }}</span></template>
                      </span>
                    </td>
                    <td v-if="canEdit" class="py-3 pr-3 border-b border-ui-line">
                      <button type="button" :class="iconBtn" aria-label="Remove" @click="removeItem(idx)">
                        <X class="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <UiEmpty v-if="!items.length" title="No services yet." compact />

            <div v-if="canEdit" class="flex flex-col sm:flex-row gap-2 px-4 sm:px-5 py-4 border-t border-ui-line bg-ui-subtle/40 rounded-b-ui-card">
              <div class="relative sm:w-[360px]">
                <select
                  v-model="addPick"
                  aria-label="Add a service"
                  class="w-full h-9 pl-3 pr-9 appearance-none bg-ui-surface text-ui-body border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
                  :class="addPick ? 'text-ui-ink' : 'text-ui-muted'"
                >
                  <option value="">Add a service…</option>
                  <option value="__custom">Custom item</option>
                  <option v-for="c in catalog" :key="c.id" :value="String(c.id)">{{ c.name }}{{ c.availability !== "available" ? " (not available yet)" : "" }}</option>
                </select>
                <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
              </div>
              <UiButton variant="secondary" :icon="Plus" :disabled="!addPick" @click="addItem">Add</UiButton>
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5">
            <h2 class="text-ui-h3 text-ui-ink mb-2">Internal notes</h2>
            <textarea
              v-model="notes"
              rows="3"
              maxlength="5000"
              :readonly="!canEdit"
              aria-label="Internal notes"
              class="w-full px-3 py-2.5 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus read-only:bg-ui-subtle"
              placeholder="Follow-up, what the client said in the meeting, etc."
            ></textarea>
            <UiButton v-if="canEdit" variant="secondary" size="sm" class="mt-2" :disabled="notes === (s.internal_notes || '') || saving" @click="saveNotes">Save notes</UiButton>
          </section>
        </template>
      </div>

      <!-- Answers -->
      <div v-else class="space-y-5">
        <div v-if="canEdit" class="flex flex-wrap items-center gap-2 justify-end">
          <template v-if="editingAnswers">
            <UiButton variant="ghost" @click="(editingAnswers = false), resetDrafts()">Cancel</UiButton>
            <UiButton variant="secondary" :disabled="saving" @click="saveAnswers(false)">Save draft</UiButton>
            <UiButton :icon="Sparkles" :loading="saving" :disabled="saving" @click="saveAnswers(true)">Save & analyse</UiButton>
          </template>
          <UiButton v-else variant="secondary" :icon="Pencil" @click="editingAnswers = true">{{ s.submitted_at ? "Edit answers" : "Fill in" }}</UiButton>
        </div>
        <UiAlert v-if="Object.keys(answerErrors).length" tone="bad" message="Some required questions are still empty." />

        <ScreeningFormFields v-if="editingAnswers" v-model="answers" :form="s.form" :errors="answerErrors" />

        <template v-else>
          <div v-if="!s.readable_answers?.length" class="bg-ui-surface border border-ui-line rounded-ui-card">
            <UiEmpty title="No answers yet." compact />
          </div>
          <section v-for="section in s.readable_answers" :key="section.key" class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
            <h2 class="text-ui-h2 text-ui-ink px-5 sm:px-6 pt-4 pb-3 border-b border-ui-line">{{ section.title }}</h2>
            <dl class="divide-y divide-ui-line px-5 sm:px-6">
              <div v-for="a in section.answers" :key="a.key" class="py-3 grid grid-cols-1 sm:grid-cols-[40%_1fr] gap-x-6 gap-y-0.5">
                <dt class="text-ui-small text-ui-muted">{{ a.question }}</dt>
                <dd class="text-ui-body text-ui-ink whitespace-pre-line">{{ a.answer }}</dd>
              </div>
            </dl>
          </section>
        </template>
      </div>
    </template>
  </div>
</template>
