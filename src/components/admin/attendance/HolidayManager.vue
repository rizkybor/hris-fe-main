<script setup>
import { onMounted, ref, watch } from "vue";
import { CalendarOff, Plus, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";

// Public holidays / cuti bersama. Weekdays listed here aren't working days,
// so the Staff Raport doesn't count a missing check-in on them.
const alertModal = useAlertModalStore();
const canEdit = can("attendance-setting-edit");

const year = ref(new Date().getFullYear());
const holidays = ref([]);
const loading = ref(false);
const form = ref({ date: "", name: "" });
const saving = ref(false);
const error = ref("");

const load = async () => {
  loading.value = true;
  try {
    holidays.value = (await axiosInstance.get("/holidays", { params: { year: year.value } })).data.data;
  } finally {
    loading.value = false;
  }
};
onMounted(load);
watch(year, load);

const add = async () => {
  error.value = "";
  saving.value = true;
  try {
    await axiosInstance.post("/holidays", form.value);
    const added = form.value.date;
    form.value = { date: "", name: "" };
    if (Number(added.slice(0, 4)) !== year.value) year.value = Number(added.slice(0, 4));
    else await load();
  } catch (e) {
    const d = e?.response?.data;
    error.value = d?.errors ? Object.values(d.errors).flat()[0] : d?.message || "Failed to add holiday.";
  } finally {
    saving.value = false;
  }
};

const remove = async (h) => {
  if (!(await alertModal.confirm(`Remove "${h.name}" (${formatDate(h.date)}) from holidays?`))) return;
  await axiosInstance.delete(`/holidays/${h.id}`);
  await load();
};

const formatDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const isWeekend = (d) => [0, 6].includes(new Date(`${d}T00:00:00`).getDay());
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 max-w-xl mt-5">
    <div class="flex items-center justify-between gap-2 mb-1">
      <div class="flex items-center gap-2">
        <CalendarOff class="w-4 h-4 text-indigo-600" />
        <p class="text-brand-dark text-sm font-semibold">Holidays (Hari Libur)</p>
      </div>
      <div class="flex items-center gap-1">
        <button type="button" class="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Previous year" @click="year--">
          <ChevronLeft class="w-4 h-4 text-gray-500" />
        </button>
        <span class="text-sm font-semibold text-brand-dark tabular-nums w-10 text-center">{{ year }}</span>
        <button type="button" class="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Next year" @click="year++">
          <ChevronRight class="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
    <p class="text-brand-light text-xs mb-4">
      Public holidays and collective leave (cuti bersama). Weekdays listed here aren't working days, so the Staff Raport
      doesn't count them as "no check-in".
    </p>

    <form v-if="canEdit" class="grid grid-cols-1 sm:grid-cols-[150px_1fr_auto] gap-2 mb-3" @submit.prevent="add">
      <input v-model="form.date" type="date" required class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]" />
      <input v-model="form.name" type="text" required maxlength="150" placeholder="e.g. Hari Kemerdekaan" class="w-full border border-[#DCDEDD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-[#0C51D9]" />
      <button type="submit" :disabled="saving" class="blue-gradient blue-btn-shadow border border-[#2151A0] rounded-[10px] px-3.5 py-2 flex items-center justify-center gap-1.5 disabled:opacity-50">
        <Loader2 v-if="saving" class="w-4 h-4 text-white animate-spin" />
        <Plus v-else class="w-4 h-4 text-white" />
        <span class="text-brand-white text-xs font-semibold">Add</span>
      </button>
    </form>
    <p v-if="error" class="text-red-500 text-xs mb-3">{{ error }}</p>

    <div v-if="loading" class="text-brand-light text-sm py-3">Loading...</div>
    <p v-else-if="!holidays.length" class="text-brand-light text-sm py-3 text-center border border-dashed border-[#DCDEDD] rounded-[10px]">No holidays set for {{ year }}.</p>
    <ul v-else class="border border-[#DCDEDD] rounded-[10px] divide-y divide-[#EEF1F5] max-h-72 overflow-y-auto">
      <li v-for="h in holidays" :key="h.id" class="flex items-center gap-3 px-3 py-2 text-sm">
        <span class="text-brand-light text-[11px] sm:text-xs w-[92px] sm:w-28 shrink-0 tabular-nums">{{ formatDate(h.date) }}</span>
        <span class="text-brand-dark font-medium flex-1 min-w-0 truncate">{{ h.name }}</span>
        <span v-if="isWeekend(h.date)" class="text-[10px] text-gray-400 shrink-0">weekend</span>
        <button v-if="canEdit" type="button" class="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center shrink-0" :aria-label="`Remove ${h.name}`" @click="remove(h)">
          <Trash2 class="w-3.5 h-3.5 text-gray-400 hover:text-red-600" />
        </button>
      </li>
    </ul>
  </div>
</template>
