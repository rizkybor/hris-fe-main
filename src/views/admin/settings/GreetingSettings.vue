<script setup>
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { CalendarHeart, Plus, PartyPopper, Cake, CalendarClock, Sparkles, Pencil, Trash2, X, Repeat, ArrowLeft, ChevronDown } from "lucide-vue-next";
import { useGreetingStore } from "@/stores/greeting";
import { can } from "@/helpers/permissionHelper";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import Pagination from "@/components/common/Pagination.vue";
import { useAlertModalStore } from "@/stores/alertModal";
import { UiBadge, UiButton, UiEmpty, UiInput, UiModal, UiPageHeader, UiSelect, UiSwitch, UiTable } from "@/components/ui";

const store = useGreetingStore();
const alertModal = useAlertModalStore();
const { greetings, meta, loading } = storeToRefs(store);

const showModal = ref(false);
const editingId = ref(null);
const emptyForm = () => ({
  title: "",
  message: "",
  greeting_date: "",
  is_recurring_yearly: false,
  type: "custom",
  audience: "all",
  is_active: true,
});
const form = ref(emptyForm());
const submitting = ref(false);
const errorMessage = ref("");

const typeOptions = [
  { value: "holiday", label: "Holiday", icon: PartyPopper },
  { value: "birthday", label: "Birthday", icon: Cake },
  { value: "meeting", label: "Meeting / Event", icon: CalendarClock },
  { value: "custom", label: "Custom", icon: Sparkles },
];
const typeIcon = (value) => typeOptions.find((o) => o.value === value)?.icon ?? Sparkles;
const typeLabel = (value) => typeOptions.find((o) => o.value === value)?.label ?? value;

const audienceOptions = [
  { value: "all", label: "All Roles" },
  { value: "manager", label: "Manager" },
  { value: "operational_director", label: "Operational Director" },
  { value: "hr", label: "Hr" },
  { value: "finance", label: "Finance Manager" },
  { value: "staff", label: "Staff" },
];
const audienceLabel = (value) => audienceOptions.find((o) => o.value === value)?.label ?? value;

const load = (page = 1) => store.fetchGreetings({ page });

onMounted(() => load());

const openCreateModal = () => {
  editingId.value = null;
  form.value = emptyForm();
  errorMessage.value = "";
  showModal.value = true;
};

const openEditModal = (greeting) => {
  editingId.value = greeting.id;
  form.value = {
    title: greeting.title,
    message: greeting.message,
    greeting_date: greeting.greeting_date,
    is_recurring_yearly: greeting.is_recurring_yearly,
    type: greeting.type,
    audience: greeting.audience,
    is_active: greeting.is_active,
  };
  errorMessage.value = "";
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    if (editingId.value) {
      await store.updateGreeting(editingId.value, form.value);
    } else {
      await store.createGreeting(form.value);
    }
    showModal.value = false;
    await store.fetchGreetings();
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Failed to save greeting.");
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (greeting) => {
  if (!(await alertModal.confirm(`Delete "${greeting.title}"?`))) return;
  try {
    await store.deleteGreeting(greeting.id);
  } catch (error) {
    await alertModal.alert(error?.response?.data?.message || "Failed to delete greeting.", { type: "danger" });
  }
};

// Presentation only.
const greetingColumns = [
  { key: "title", label: "Greeting" },
  { key: "greeting_date", label: "Date", width: 190 },
  { key: "type", label: "Type", width: 150 },
  { key: "audience", label: "Audience", width: 170 },
  { key: "actions", label: "", align: "right", width: 100 },
];

const formatDate = (value, recurring) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", recurring ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Calendar Greetings" subtitle="Holidays, birthdays, meetings, and other reminders shown on the dashboard">
      <template #eyebrow>
        <router-link :to="{ name: 'admin.settings.dashboard' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" aria-label="Back to Settings" title="Back to Settings">
          <ArrowLeft class="w-4 h-4" /> Settings
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('greeting-create')" :icon="Plus" @click="openCreateModal">Add Greeting</UiButton>
      </template>
    </UiPageHeader>

    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden ui-anim-fade-up">
      <div class="px-4 sm:px-5 pt-4 pb-3 border-b border-ui-line">
        <h2 class="text-ui-h2 text-ui-ink">Greetings</h2>
        <p class="text-ui-cap text-ui-muted tabular-nums">{{ meta?.total ?? greetings.length }} greetings</p>
      </div>

      <UiTable :columns="greetingColumns" :rows="greetings" :meta="meta" :loading="loading" :skeleton-rows="3">
        <template #cell-title="{ row }">
          <div class="flex items-start gap-3 min-w-0 py-2">
            <span class="w-8 h-8 rounded-full bg-ui-subtle text-ui-text flex items-center justify-center shrink-0">
              <component :is="typeIcon(row.type)" class="w-4 h-4" />
            </span>
            <div class="min-w-0">
              <p class="flex items-center gap-2 text-ui-body font-medium text-ui-ink">
                <span class="truncate">{{ row.title }}</span>
                <UiBadge v-if="!row.is_active" tone="bad">Inactive</UiBadge>
              </p>
              <p class="text-ui-cap text-ui-muted line-clamp-2">{{ row.message }}</p>
            </div>
          </div>
        </template>
        <template #cell-greeting_date="{ row }">
          <span class="inline-flex items-center gap-1 text-ui-text tabular-nums">
            <Repeat v-if="row.is_recurring_yearly" class="w-3 h-3 text-ui-faint" />
            {{ formatDate(row.greeting_date, row.is_recurring_yearly) }}
          </span>
          <span v-if="row.is_recurring_yearly" class="block text-ui-cap text-ui-muted">(every year)</span>
        </template>
        <template #cell-type="{ row }">
          <UiBadge>{{ typeLabel(row.type) }}</UiBadge>
        </template>
        <template #cell-audience="{ row }">
          <UiBadge tone="info">{{ audienceLabel(row.audience) }}</UiBadge>
        </template>
        <template #cell-actions="{ row }">
          <div v-if="can('greeting-edit') || can('greeting-delete')" class="flex items-center justify-end gap-1">
            <UiButton v-if="can('greeting-edit')" variant="ghost" size="sm" :icon="Pencil" aria-label="Edit greeting" @click="openEditModal(row)" />
            <UiButton v-if="can('greeting-delete')" variant="ghost" size="sm" :icon="Trash2" aria-label="Delete greeting" @click="handleDelete(row)" />
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-1">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink">{{ row.title }}</p>
              <p class="text-ui-cap text-ui-muted line-clamp-2">{{ row.message }}</p>
              <p class="text-ui-cap text-ui-muted mt-1 flex items-center gap-1 tabular-nums">
                <Repeat v-if="row.is_recurring_yearly" class="w-3 h-3" />
                {{ formatDate(row.greeting_date, row.is_recurring_yearly) }}
                <span v-if="row.is_recurring_yearly">(every year)</span>
              </p>
              <div class="flex flex-wrap items-center gap-1.5 mt-2">
                <UiBadge>{{ typeLabel(row.type) }}</UiBadge>
                <UiBadge tone="info">{{ audienceLabel(row.audience) }}</UiBadge>
                <UiBadge v-if="!row.is_active" tone="bad">Inactive</UiBadge>
              </div>
            </div>
            <div v-if="can('greeting-edit') || can('greeting-delete')" class="flex items-center gap-0.5 shrink-0">
              <UiButton v-if="can('greeting-edit')" variant="ghost" size="sm" :icon="Pencil" aria-label="Edit greeting" @click="openEditModal(row)" />
              <UiButton v-if="can('greeting-delete')" variant="ghost" size="sm" :icon="Trash2" aria-label="Delete greeting" @click="handleDelete(row)" />
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty :icon="CalendarHeart" title="No greetings configured yet." compact />
        </template>
      </UiTable>

      <div v-if="meta?.total" class="px-4 sm:px-5 pb-4 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" item-label="greeting" @page-change="load" />
      </div>
    </section>

    <!-- Create/Edit Modal -->
    <UiModal v-model:open="showModal" :title="editingId ? 'Edit Greeting' : 'Add Greeting'">
      <form id="greeting-form" @submit.prevent="handleSubmit" class="space-y-4">
        <UiInput v-model="form.title" label="Title" required placeholder="e.g. Independence Day, Aldy's Birthday, Sprint Review" />
        <UiInput v-model="form.message" label="Greeting Message" :rows="2" required placeholder="e.g. Happy Independence Day! 🇮🇩" />

        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="form.greeting_date" type="date" label="Date" required />
          <UiSelect v-model="form.type" label="Type" :options="typeOptions" />
        </div>

        <div class="rounded-ui-card border border-ui-line px-3.5 py-3">
          <UiSwitch
            v-model="form.is_recurring_yearly"
            label="Repeats every year"
            description="Use this for holidays and birthdays -- only the day and month matter, the year above is ignored. Leave unchecked for a one-time date, like a specific meeting."
          />
        </div>

        <UiSelect v-model="form.audience" label="Audience" :options="audienceOptions" />

        <div class="rounded-ui-card border border-ui-line px-3.5 py-3">
          <UiSwitch v-model="form.is_active" label="Active" />
        </div>

        <p v-if="errorMessage" class="text-ui-small text-ui-bad">{{ errorMessage }}</p>
      </form>

      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="closeModal">Cancel</UiButton>
        <UiButton type="submit" form="greeting-form" class="flex-1 sm:flex-none" :loading="submitting" :disabled="submitting">
          {{ submitting ? "Saving..." : "Save" }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
