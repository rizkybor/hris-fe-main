<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Briefcase, Save, ArrowLeft, User, Phone, Mail, MapPin, Tag, Layers, FileText, Building2, ScrollText, CheckCircle2, Circle, AlertCircle } from "lucide-vue-next";
import { UiPageHeader, UiButton, UiInput, UiBadge, UiEmpty } from "@/components/ui";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useClientStore } from "@/stores/client";
import { errorMessage } from "@/helpers/errorHelper";

const route = useRoute();
const router = useRouter();
const clientsStore = useClientStore();

const initialLoading = ref(true);
const submitting = ref(false);
const loadError = ref("");
const error = ref("");
const success = ref("");

const form = ref({
  name: "",
  type: "",
  field: "",
  pic_name: "",
  pic_phone: "",
  email: "",
  address: "",
  npwp: "",
  siup_number: "",
  nib_number: "",
  notes: "",
});

const loadClient = async () => {
  try {
    const client = await clientsStore.fetchClientById(route.params.id);
    if (!client) {
      loadError.value = "Client not found.";
      return;
    }
    form.value = {
      name: client.name || "",
      type: client.type || "",
      field: client.field || "",
      pic_name: client.pic_name || "",
      pic_phone: client.pic_phone || "",
      email: client.email || "",
      address: client.address || "",
      npwp: client.npwp || "",
      siup_number: client.siup_number || "",
      nib_number: client.nib_number || "",
      notes: client.notes || "",
    };
  } catch (err) {
    loadError.value = "Failed to load client data.";
  } finally {
    initialLoading.value = false;
  }
};

onMounted(() => {
  loadClient();
  if (clientsStore.clients.length === 0) clientsStore.fetchAllClient();
});

// Suggests values already used by other clients (via a <datalist>, so the
// browser's native "pick one or just keep typing" behavior handles the
// "recommend but allow a new value" requirement for free).
const uniqueValues = (key) =>
  [...new Set(clientsStore.clients.map((c) => c[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const clientTypeOptions = computed(() => uniqueValues("type"));
const clientFieldOptions = computed(() => uniqueValues("field"));

const submit = async () => {
  error.value = "";
  success.value = "";

  if (!form.value.name || !form.value.pic_name || !form.value.pic_phone) {
    error.value = "Client Name, PIC Name, and PIC Phone are required.";
    return;
  }

  submitting.value = true;
  try {
    await clientsStore.updateClient(route.params.id, form.value);
    success.value = "Client updated successfully.";

    setTimeout(() => {
      router.push({ name: "admin.clients.dashboard" });
    }, 1200);
  } catch (err) {
    error.value = errorMessage(err, "Failed to update client.");
  } finally {
    submitting.value = false;
  }
};

// Presentation only: live summary + required-field checklist for the side panel.
const fieldClass =
  "w-full h-[38px] pl-9 pr-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const requiredChecks = computed(() => [
  { label: "Client Name", done: !!form.value.name },
  { label: "PIC Name", done: !!form.value.pic_name },
  { label: "PIC Phone", done: !!form.value.pic_phone },
]);
const requiredDone = computed(() => requiredChecks.value.filter((c) => c.done).length);
const initials = computed(() =>
  (form.value.name || "").replace(/^(PT|CV)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "—"
);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Edit Client" subtitle="Update client information">
      <template #eyebrow>
        <button type="button" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1" aria-label="Back" @click="router.back()">
          <ArrowLeft class="w-4 h-4" /> Back
        </button>
      </template>
      <template #actions>
        <div v-if="!initialLoading && !loadError" class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" @click="router.back()">Cancel</UiButton>
          <UiButton type="submit" form="client-form" :icon="Save" :loading="submitting" :disabled="submitting">
            {{ submitting ? "Saving..." : "Save Changes" }}
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <Transition name="ui-fade">
      <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />
    </Transition>
    <Transition name="ui-fade">
      <Alert v-if="success" type="success" :title="success" message="" :show="!!success" />
    </Transition>

    <!-- Loading -->
    <div v-if="initialLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <div class="lg:col-span-2 bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 space-y-4">
        <Skeleton width="200px" height="20px" />
        <Skeleton height="38px" rounded="8px" />
        <Skeleton height="38px" rounded="8px" />
        <Skeleton height="90px" rounded="8px" />
      </div>
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5 space-y-3">
        <Skeleton width="120px" height="16px" />
        <Skeleton height="60px" rounded="8px" />
      </div>
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="AlertCircle" :title="loadError" />
    </div>

    <!-- Form -->
    <form v-else id="client-form" class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start" @submit.prevent="submit">
      <div class="lg:col-span-2 space-y-5 ui-stagger min-w-0">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
            <header class="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-ui-line">
              <div class="w-9 h-9 rounded-ui-control border border-ui-line bg-ui-surface text-ui-muted flex items-center justify-center shrink-0">
                <Building2 class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <h2 class="text-ui-h3 text-ui-ink">Informasi Perusahaan</h2>
              </div>
            </header>
            <div class="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <UiInput v-model="form.name" label="Client Name *" :icon="Briefcase" class="md:col-span-2" />
              <div class="min-w-0">
                <label :for="'client-type-options-input'" class="block text-ui-small font-medium text-ui-ink mb-1.5">Client Type</label>
                <div class="relative">
                  <Tag class="absolute left-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
                  <input
                    id="client-type-options-input"
                    v-model="form.type"
                    type="text"
                    list="client-type-options"
                    autocomplete="off"
                    :class="fieldClass"
                  />
                  <datalist id="client-type-options">
                    <option v-for="opt in clientTypeOptions" :key="opt" :value="opt" />
                  </datalist>
                </div>
              </div>
              <div class="min-w-0">
                <label :for="'client-field-options-input'" class="block text-ui-small font-medium text-ui-ink mb-1.5">Client Field</label>
                <div class="relative">
                  <Layers class="absolute left-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
                  <input
                    id="client-field-options-input"
                    v-model="form.field"
                    type="text"
                    list="client-field-options"
                    autocomplete="off"
                    :class="fieldClass"
                  />
                  <datalist id="client-field-options">
                    <option v-for="opt in clientFieldOptions" :key="opt" :value="opt" />
                  </datalist>
                </div>
              </div>
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
            <header class="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-ui-line">
              <div class="w-9 h-9 rounded-ui-control border border-ui-line bg-ui-surface text-ui-muted flex items-center justify-center shrink-0">
                <User class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <h2 class="text-ui-h3 text-ui-ink">Kontak PIC (Person in Charge)</h2>
              </div>
            </header>
            <div class="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <UiInput v-model="form.pic_name" label="PIC Name *" :icon="User" />
              <UiInput v-model="form.pic_phone" label="PIC Phone *" :icon="Phone" />
              <UiInput v-model="form.email" label="Email" type="email" :icon="Mail" class="md:col-span-2" />
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
            <header class="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-ui-line">
              <div class="w-9 h-9 rounded-ui-control border border-ui-line bg-ui-surface text-ui-muted flex items-center justify-center shrink-0">
                <ScrollText class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <h2 class="text-ui-h3 text-ui-ink">Legalitas (Opsional)</h2>
              <p class="text-ui-cap text-ui-muted mt-0.5">Kosongkan jika client merupakan perorangan, bukan badan usaha terdaftar.</p>
              </div>
            </header>
            <div class="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <UiInput v-model="form.npwp" label="NPWP" placeholder="00.000.000.0-000.000" mono />
              <UiInput v-model="form.siup_number" label="Nomor SIUP" placeholder="e.g. SIUP-123/2020" />
              <UiInput v-model="form.nib_number" label="Nomor NIB" placeholder="e.g. 1234567890123" />
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
            <header class="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-ui-line">
              <div class="w-9 h-9 rounded-ui-control border border-ui-line bg-ui-surface text-ui-muted flex items-center justify-center shrink-0">
                <MapPin class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <h2 class="text-ui-h3 text-ui-ink">Detail Tambahan</h2>
              </div>
            </header>
            <div class="p-5 sm:p-6 grid grid-cols-1 gap-4">
              <UiInput v-model="form.address" label="Address" :icon="MapPin" />
              <UiInput v-model="form.notes" label="Notes" :rows="4" />
            </div>
          </section>
      </div>

      <!-- Side panel: live summary + required fields -->
      <aside class="space-y-4 lg:sticky lg:top-4 min-w-0">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <div class="flex items-center gap-3 pb-4 border-b border-ui-line">
            <div class="w-10 h-10 rounded-full bg-ui-accent-soft text-ui-accent text-ui-small font-semibold flex items-center justify-center shrink-0">{{ initials }}</div>
            <div class="min-w-0">
              <p class="text-ui-cap text-ui-muted">Summary</p>
              <p class="text-ui-h3 text-ui-ink truncate">{{ form.name || "Client" }}</p>
            </div>
          </div>
          <dl class="divide-y divide-ui-line text-ui-small">
            <div v-for="row in [
              { label: 'Client Type', value: form.type },
              { label: 'Client Field', value: form.field },
              { label: 'PIC Name', value: form.pic_name },
              { label: 'PIC Phone', value: form.pic_phone },
              { label: 'Email', value: form.email },
            ]" :key="row.label" class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-ui-muted shrink-0">{{ row.label }}</dt>
              <dd class="text-ui-ink truncate text-right">{{ row.value || "—" }}</dd>
            </div>
          </dl>
        </section>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-ui-h3 text-ui-ink">Required fields</h3>
            <UiBadge :tone="requiredDone === requiredChecks.length ? 'ok' : 'warn'">{{ requiredDone }} of {{ requiredChecks.length }}</UiBadge>
          </div>
          <div class="h-1 rounded-full bg-ui-subtle mt-3 overflow-hidden">
            <div class="h-full bg-ui-ink transition-all duration-ui-base" :style="{ width: `${(requiredDone / requiredChecks.length) * 100}%` }"></div>
          </div>
          <ul class="mt-3 space-y-1.5">
            <li v-for="c in requiredChecks" :key="c.label" class="flex items-center gap-2 text-ui-small" :class="c.done ? 'text-ui-ink' : 'text-ui-faint'">
              <CheckCircle2 v-if="c.done" class="w-4 h-4 text-ui-ok" />
              <Circle v-else class="w-4 h-4" />
              {{ c.label }}
            </li>
          </ul>
        </section>

        <!-- Actions (always visible on phones; repeats the header on desktop) -->
        <div class="flex flex-col gap-2">
          <UiButton type="submit" size="lg" block :icon="Save" :loading="submitting" :disabled="submitting">
            {{ submitting ? "Saving..." : "Save Changes" }}
          </UiButton>
          <UiButton variant="secondary" size="lg" block class="sm:hidden" @click="router.back()">Cancel</UiButton>
        </div>
      </aside>
    </form>
  </div>
</template>
