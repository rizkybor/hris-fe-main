<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import { ClipboardCheck, Plus, Search, Inbox, X, Loader2, PenLine, Send, Settings2 } from "lucide-vue-next";
import { useScreeningStore } from "@/stores/screening";
import { can } from "@/helpers/permissionHelper";
import { SCREENING_STATUS, SCREENING_SOURCE, COMPLEXITY } from "@/utils/screening";
import Pagination from "@/components/common/Pagination.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const router = useRouter();
const store = useScreeningStore();
const { screenings, meta, statusCounts, loading, saving } = storeToRefs(store);

const status = ref("");
const search = ref("");
const load = (page = 1) =>
  store.fetchScreenings({ page, status: status.value || undefined, search: search.value.trim() || undefined, row_per_page: meta.value.per_page || 15 });
onMounted(() => load());
watch(status, () => load());
watch(search, debounce(() => load(), 300));

const TABS = ["", "new", "in_review", "reviewed", "invited", "draft", "won", "lost"];
const total = computed(() => Object.values(statusCounts.value || {}).reduce((a, b) => a + Number(b), 0));
const tabLabel = (key) => (key ? SCREENING_STATUS[key].label : "All");
const tabCount = (key) => (key ? Number(statusCounts.value?.[key] || 0) : total.value);

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-");
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
</script>

<template>
  <div class="px-0.5 py-1 sm:px-4 sm:py-4">
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5 mb-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 bg-teal-50 rounded-[12px] flex items-center justify-center shrink-0">
            <ClipboardCheck class="w-5 h-5 text-teal-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-brand-dark text-base font-bold">Client Screening</h3>
            <p class="text-brand-light text-xs">Needs questionnaires from the website, invite links and the team</p>
          </div>
        </div>
        <div class="flex gap-2">
          <RouterLink
            v-if="can('screening-settings')"
            :to="{ name: 'admin.settings.client-screening' }"
            class="rounded-[8px] border border-[#DCDEDD] hover:border-[#0C51D9] px-3 py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-dark flex-1 sm:flex-none"
          >
            <Settings2 class="w-4 h-4" /> Catalog & Questions
          </RouterLink>
          <button
            v-if="can('screening-create')"
            type="button"
            class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-3.5 py-2.5 flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
            @click="openNew"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">New Screening</span>
          </button>
        </div>
      </div>

      <div class="relative">
        <Search class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="search"
          type="text"
          placeholder="Search code, name, company or email..."
          class="w-full pl-10 pr-3 py-2.5 border border-[#DCDEDD] rounded-[12px] text-sm bg-white focus:outline-none focus:border-[#0C51D9]"
        />
      </div>
    </div>

    <div class="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-0.5 px-0.5">
      <button
        v-for="key in TABS"
        :key="key || 'all'"
        type="button"
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
        :class="status === key ? 'bg-[#0C51D9] border-[#0C51D9] text-white' : 'bg-white border-[#DCDEDD] text-brand-dark hover:border-[#0C51D9]'"
        @click="status = key"
      >
        {{ tabLabel(key) }}
        <span class="ml-1 opacity-75">{{ tabCount(key) }}</span>
      </button>
    </div>

    <div v-if="loading && !screenings.length" class="space-y-2">
      <Skeleton v-for="i in 4" :key="i" height="64px" rounded="12px" />
    </div>

    <div v-else-if="!screenings.length" class="text-center py-14 rounded-[14px] border border-dashed border-[#DCDEDD] bg-gray-50/60">
      <Inbox class="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p class="text-sm font-semibold text-brand-dark">No screenings yet</p>
      <p class="text-xs text-brand-light">Submissions from the website form appear here automatically.</p>
    </div>

    <template v-else>
      <!-- Desktop table -->
      <div class="hidden md:block bg-white border border-[#DCDEDD] rounded-[14px] overflow-hidden">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-left text-brand-light">
            <tr>
              <th class="py-3 px-4 font-semibold w-12">No</th>
              <th class="py-3 pr-4 font-semibold">Client</th>
              <th class="py-3 pr-4 font-semibold">Needs</th>
              <th class="py-3 pr-4 font-semibold">Size</th>
              <th class="py-3 pr-4 font-semibold">Source</th>
              <th class="py-3 pr-4 font-semibold">Date</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in screenings" :key="s.id" class="border-t border-[#F1F1F1] hover:bg-gray-50 cursor-pointer" @click="open(s)">
              <td class="py-3 px-4 text-brand-light">{{ rowNo(i) }}</td>
              <td class="py-3 pr-4">
                <p class="font-semibold text-brand-dark">{{ s.company || s.contact_name || "Unnamed" }}</p>
                <p class="text-xs text-gray-400">{{ s.code }}<template v-if="s.company && s.contact_name"> · {{ s.contact_name }}</template></p>
              </td>
              <td class="py-3 pr-4 text-xs max-w-[280px]">
                <span class="line-clamp-2">{{ s.needs.join(", ") || "-" }}</span>
              </td>
              <td class="py-3 pr-4">
                <span v-if="s.complexity" class="px-2 py-0.5 rounded-md text-xs font-semibold" :class="COMPLEXITY[s.complexity]?.class">{{ s.complexity }}</span>
                <span v-else class="text-gray-300">-</span>
              </td>
              <td class="py-3 pr-4 text-xs text-brand-light whitespace-nowrap">{{ SCREENING_SOURCE[s.source] }}</td>
              <td class="py-3 pr-4 text-xs whitespace-nowrap">{{ formatDate(s.submitted_at || s.created_at) }}</td>
              <td class="py-3 pr-4">
                <span class="px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap" :class="SCREENING_STATUS[s.status]?.class">{{ SCREENING_STATUS[s.status]?.label }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div class="md:hidden space-y-2">
        <button
          v-for="(s, i) in screenings"
          :key="s.id"
          type="button"
          class="w-full text-left bg-white border border-[#DCDEDD] rounded-[12px] p-3.5 hover:border-[#0C51D9]"
          @click="open(s)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-brand-dark truncate"><span class="text-gray-400 font-normal">{{ rowNo(i) }}.</span> {{ s.company || s.contact_name || "Unnamed" }}</p>
              <p class="text-[11px] text-gray-400">{{ s.code }} · {{ formatDate(s.submitted_at || s.created_at) }} · {{ SCREENING_SOURCE[s.source] }}</p>
            </div>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0" :class="SCREENING_STATUS[s.status]?.class">{{ SCREENING_STATUS[s.status]?.label }}</span>
          </div>
          <p v-if="s.needs.length" class="text-xs text-brand-light mt-1.5 line-clamp-2">{{ s.needs.join(", ") }}</p>
        </button>
      </div>

      <Pagination :meta="meta" :loading="loading" item-label="screenings" @page-change="load" />
    </template>

    <!-- New screening -->
    <div v-if="showNew" class="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="showNew = false">
      <form class="bg-white w-full sm:max-w-lg rounded-t-[16px] sm:rounded-[14px] border border-[#DCDEDD] max-h-[92vh] overflow-y-auto" @submit.prevent="create">
        <div class="p-4 sm:p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-brand-dark text-base font-bold">New Screening</h3>
          <button type="button" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Close" @click="showNew = false">
            <X class="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div class="p-4 sm:p-5 space-y-4">
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="m in [
                { key: 'internal', icon: PenLine, title: 'Fill in now', text: 'The team fills it in, e.g. during a meeting' },
                { key: 'invite', icon: Send, title: 'Send to client', text: 'Get a link the client fills in on the website' },
              ]"
              :key="m.key"
              class="border rounded-[12px] p-3 cursor-pointer transition-colors"
              :class="form.mode === m.key ? 'border-[#0C51D9] bg-blue-50/60' : 'border-[#DCDEDD] hover:border-[#0C51D9]'"
            >
              <input v-model="form.mode" type="radio" :value="m.key" class="sr-only" />
              <component :is="m.icon" class="w-4 h-4 text-[#0C51D9] mb-1" />
              <p class="text-sm font-semibold text-brand-dark">{{ m.title }}</p>
              <p class="text-[11px] text-brand-light leading-snug">{{ m.text }}</p>
            </label>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-brand-dark mb-1">Contact name</label>
              <input v-model="form.contact_name" type="text" maxlength="120" class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-brand-dark mb-1">Company</label>
              <input v-model="form.company" type="text" maxlength="150" class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-brand-dark mb-1">Email</label>
              <input v-model="form.email" type="email" maxlength="150" class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]" />
              <p v-if="errors.email" class="text-xs text-red-500 mt-1">{{ errors.email[0] }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-brand-dark mb-1">Phone / WhatsApp</label>
              <input v-model="form.phone" type="text" maxlength="40" class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]" />
            </div>
          </div>
          <div v-if="form.mode === 'invite'">
            <label class="block text-xs font-semibold text-brand-dark mb-1">Form language for the client</label>
            <div class="flex gap-2">
              <button
                v-for="l in [{ k: 'id', t: 'Bahasa Indonesia' }, { k: 'en', t: 'English' }]"
                :key="l.k"
                type="button"
                class="border rounded-[10px] px-3 py-1.5 text-sm"
                :class="form.lang === l.k ? 'border-[#0C51D9] bg-blue-50 text-[#0C51D9] font-semibold' : 'border-[#DCDEDD]'"
                @click="form.lang = l.k"
              >{{ l.t }}</button>
            </div>
          </div>
        </div>
        <div class="p-4 sm:p-5 border-t border-[#DCDEDD] grid grid-cols-2 gap-2.5">
          <button type="button" class="rounded-[10px] border border-[#DCDEDD] px-4 py-2.5 text-sm font-semibold" @click="showNew = false">Cancel</button>
          <button type="submit" :disabled="saving" class="blue-gradient blue-btn-shadow border border-[#2151A0] rounded-[10px] px-4 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Loader2 v-if="saving" class="w-4 h-4 text-white animate-spin" />
            <span class="text-white text-sm font-semibold">{{ form.mode === "invite" ? "Create link" : "Start" }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
