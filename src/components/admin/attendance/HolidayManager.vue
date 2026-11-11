<script setup>
import { onMounted, ref, watch } from "vue";
import { CalendarOff, Plus, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiBadge, UiButton, UiTable } from "@/components/ui";

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
// Presentation only.
const holidayColumns = [
  { key: "date", label: "Date", width: 150 },
  { key: "name", label: "Holiday" },
  { key: "actions", label: "", align: "right", width: 56 },
];
const isWeekend = (d) => [0, 6].includes(new Date(`${d}T00:00:00`).getDay());
</script>

<template>
  <section class="bg-ui-surface border border-ui-line rounded-ui-card ui-anim-fade-up">
    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4 lg:gap-10 p-4 sm:p-5 lg:p-6">
      <div>
        <div class="flex items-center gap-2">
          <CalendarOff class="w-4 h-4 text-ui-muted" />
          <h2 class="text-ui-h2 text-ui-ink">Holidays (Hari Libur)</h2>
        </div>
        <p class="text-ui-small text-ui-muted mt-1">
          Public holidays and collective leave (cuti bersama). Weekdays listed here aren't working days, so the Staff Raport
          doesn't count them as "no check-in".
        </p>
      </div>

      <div class="min-w-0 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-ui-small font-medium text-ui-ink">Year</p>
          <div class="flex items-center gap-1 border border-ui-line rounded-ui-control p-0.5">
            <button type="button" class="w-7 h-7 rounded-[6px] hover:bg-ui-hover text-ui-muted hover:text-ui-ink flex items-center justify-center" aria-label="Previous year" @click="year--">
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="text-ui-small font-medium text-ui-ink tabular-nums w-10 text-center">{{ year }}</span>
            <button type="button" class="w-7 h-7 rounded-[6px] hover:bg-ui-hover text-ui-muted hover:text-ui-ink flex items-center justify-center" aria-label="Next year" @click="year++">
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <form v-if="canEdit" class="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2" @submit.prevent="add">
          <input v-model="form.date" type="date" required aria-label="Date" class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus" />
          <input v-model="form.name" type="text" required maxlength="150" placeholder="e.g. Hari Kemerdekaan" aria-label="Holiday name" class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus" />
          <UiButton type="submit" :icon="Plus" :loading="saving" :disabled="saving">Add</UiButton>
        </form>
        <p v-if="error" class="text-ui-cap text-ui-bad">{{ error }}</p>

        <div class="border border-ui-line rounded-ui-card overflow-hidden max-h-[420px] overflow-y-auto">
          <UiTable :columns="holidayColumns" :rows="holidays" :loading="loading" :skeleton-rows="3" :empty-text="`No holidays set for ${year}.`">
            <template #cell-date="{ row }">
              <span class="text-ui-muted tabular-nums whitespace-nowrap">{{ formatDate(row.date) }}</span>
            </template>
            <template #cell-name="{ row }">
              <span class="text-ui-ink font-medium">{{ row.name }}</span>
              <UiBadge v-if="isWeekend(row.date)" tone="outline" class="ml-2">weekend</UiBadge>
            </template>
            <template #cell-actions="{ row }">
              <UiButton v-if="canEdit" variant="ghost" size="sm" :icon="Trash2" :aria-label="`Remove ${row.name}`" @click="remove(row)" />
            </template>
            <template #mobile="{ row, number }">
              <div class="flex items-center gap-3 px-3 py-2.5">
                <span class="text-ui-cap text-ui-faint tabular-nums w-5">{{ number }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-ui-small font-medium text-ui-ink truncate">{{ row.name }}</p>
                  <p class="text-ui-cap text-ui-muted tabular-nums">
                    {{ formatDate(row.date) }}<span v-if="isWeekend(row.date)"> · weekend</span>
                  </p>
                </div>
                <UiButton v-if="canEdit" variant="ghost" size="sm" :icon="Trash2" :aria-label="`Remove ${row.name}`" @click="remove(row)" />
              </div>
            </template>
          </UiTable>
        </div>
      </div>
    </div>
  </section>
</template>
