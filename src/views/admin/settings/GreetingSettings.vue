<script setup>
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { CalendarHeart, Plus, PartyPopper, Cake, CalendarClock, Sparkles, Pencil, Trash2, X, Repeat, ArrowLeft, ChevronDown } from "lucide-vue-next";
import { useGreetingStore } from "@/stores/greeting";
import { can } from "@/helpers/permissionHelper";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import Pagination from "@/components/common/Pagination.vue";
import { useAlertModalStore } from "@/stores/alertModal";

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

const formatDate = (value, recurring) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", recurring ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
};
</script>

<template>
  <div class="px-4 py-4">
    <div class="bg-white mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <router-link
          :to="{ name: 'admin.settings.dashboard' }"
          class="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all duration-300 shrink-0"
          aria-label="Back to Settings"
          title="Back to Settings"
        >
          <ArrowLeft class="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
        </router-link>
        <div class="w-11 h-11 bg-pink-50 rounded-[12px] flex items-center justify-center">
          <CalendarHeart class="w-5 h-5 text-pink-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Calendar Greetings</h3>
          <p class="text-brand-light text-sm">Holidays, birthdays, meetings, and other reminders shown on the dashboard</p>
        </div>
      </div>
      <button
        v-if="can('greeting-create')"
        @click="openCreateModal"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-2 shrink-0"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Add Greeting</span>
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 3" :key="i" height="80px" rounded="16px" />
    </div>

    <div v-else class="bg-white border border-[#DCDEDD] rounded-[14px] overflow-hidden">
      <div v-if="greetings.length === 0" class="p-10 text-center">
        <CalendarHeart class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-brand-light text-sm">No greetings configured yet.</p>
      </div>

      <div v-for="greeting in greetings" :key="greeting.id" class="p-5 border-b border-[#F1F1F1] last:border-b-0 flex items-start gap-4">
        <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
          <component :is="typeIcon(greeting.type)" class="w-4.5 h-4.5 text-gray-500" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <h4 class="text-brand-dark font-bold">{{ greeting.title }}</h4>
            <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">{{ typeLabel(greeting.type) }}</span>
            <span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">{{ audienceLabel(greeting.audience) }}</span>
            <span v-if="!greeting.is_active" class="px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-xs font-semibold">Inactive</span>
          </div>
          <p class="text-brand-light text-sm">{{ greeting.message }}</p>
          <p class="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <Repeat v-if="greeting.is_recurring_yearly" class="w-3 h-3" />
            {{ formatDate(greeting.greeting_date, greeting.is_recurring_yearly) }}
            <span v-if="greeting.is_recurring_yearly">(every year)</span>
          </p>
        </div>
        <div v-if="can('greeting-edit') || can('greeting-delete')" class="flex items-center gap-2 shrink-0">
          <button
            v-if="can('greeting-edit')"
            @click="openEditModal(greeting)"
            class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] transition-colors"
          >
            <Pencil class="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button
            v-if="can('greeting-delete')"
            @click="handleDelete(greeting)"
            class="w-8 h-8 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-red-400 transition-colors"
          >
            <Trash2 class="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      <div class="p-4 border-t border-[#F1F1F1]">
        <Pagination :meta="meta" :loading="loading" item-label="greeting" @page-change="load" />
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="closeModal">
      <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
          <h3 class="text-brand-dark text-lg font-bold">{{ editingId ? "Edit Greeting" : "Add Greeting" }}</h3>
          <button @click="closeModal" class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9]">
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Title</label>
            <input v-model="form.title" type="text" required placeholder="e.g. Independence Day, Aldy's Birthday, Sprint Review" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Greeting Message</label>
            <textarea v-model="form.message" rows="2" required placeholder="e.g. Happy Independence Day! 🇮🇩" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Date</label>
              <input v-model="form.greeting_date" type="date" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Type</label>
              <div class="relative">
                <select v-model="form.type" class="select-soft">
                  <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <ChevronDown
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          <label class="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_recurring_yearly" class="w-4 h-4 mt-0.5" />
            <span class="text-sm text-brand-dark">
              Repeats every year
              <span class="block text-xs text-brand-light font-normal">Use this for holidays and birthdays -- only the day and month matter, the year above is ignored. Leave unchecked for a one-time date, like a specific meeting.</span>
            </span>
          </label>

          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Audience</label>
            <div class="relative">
              <select v-model="form.audience" class="select-soft">
                <option v-for="opt in audienceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <ChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_active" class="w-4 h-4" />
            <span class="text-sm text-brand-dark">Active</span>
          </label>

          <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              :disabled="submitting"
              class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
            >
              <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Saving..." : "Save" }}</span>
            </button>
            <button type="button" @click="closeModal" class="px-6 py-2.5 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
