<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Briefcase, Save, User, Phone, Mail, MapPin, Tag, Layers, FileText, Building2, ScrollText, CheckCircle2, Circle, AlertCircle } from "lucide-vue-next";
import { UiPageHeader, UiButton, UiInput, UiBadge, UiEmpty } from "@/components/ui";
import Alert from "@/components/common/Alert.vue";
import { useClientStore } from "@/stores/client";
import { useLookupStore } from "@/stores/lookups";
import { invalidate } from "@/composables/useStaleFetch";
import { errorMessage } from "@/helpers/errorHelper";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const router = useRouter();
const clientsStore = useClientStore();
const lookups = useLookupStore();

const loading = ref(false);
const error = ref("");
const success = ref("");

onMounted(() => {
  if (!clientsStore.statistics && !clientsStore.loadingStatistics) clientsStore.fetchClientStatistics();
});

const uniqueValues = (key) =>
  [...new Set((clientsStore.statistics?.[`by_${key}`] || []).map((c) => c[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

const clientTypeOptions = computed(() => uniqueValues("type"));
const clientFieldOptions = computed(() => uniqueValues("field"));

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

const submit = async () => {
  error.value = "";
  success.value = "";

  if (!form.value.name || !form.value.pic_name || !form.value.pic_phone) {
    error.value = t("clients.form.required");
    return;
  }

  loading.value = true;
  try {
    clientsStore.error = null;
    const saved = await clientsStore.createClient(form.value);
    if (!saved) {
      // The store keeps the error instead of throwing.
      const e = clientsStore.error;
      error.value = (typeof e === "string" && e) || (e && typeof e === "object" && Object.values(e).flat().join(" ")) || t("clients.form.saveFailed");
      return;
    }
    // Pickers and filters elsewhere pick the change up without a reload:
    // the store patched clientsStore.clients; mark the cached lists stale.
    lookups.invalidate("clients");
    invalidate("clients");
    success.value = t("clients.form.saved");

    setTimeout(() => {
      router.push({ name: "admin.clients.dashboard" });
    }, 1200);
  } catch (err) {
    error.value = errorMessage(err, t("clients.form.saveFailed"));
  } finally {
    loading.value = false;
  }
};

// Presentation only: live summary + required-field checklist for the side panel.
const fieldClass =
  "w-full h-[38px] pl-9 pr-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
const requiredChecks = computed(() => [
  { label: t("clients.fields.name"), done: !!form.value.name },
  { label: t("clients.fields.picName"), done: !!form.value.pic_name },
  { label: t("clients.fields.picPhone"), done: !!form.value.pic_phone },
]);
const requiredDone = computed(() => requiredChecks.value.filter((c) => c.done).length);
const initials = computed(() =>
  (form.value.name || "").replace(/^(PT|CV)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "—"
);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('clients.form.createTitle')" :subtitle="$t('clients.form.createSubtitle')">
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" @click="$router.back()">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" form="client-form" :icon="Save" :loading="loading" :disabled="loading">
            {{ loading ? $t("common.actions.saving") : $t("clients.form.save") }}
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

    <!-- Form -->
    <form id="client-form" class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start" @submit.prevent="submit">
      <div class="lg:col-span-2 space-y-5 ui-stagger min-w-0">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
            <header class="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-ui-line">
              <div class="w-9 h-9 rounded-ui-control border border-ui-line bg-ui-surface text-ui-muted flex items-center justify-center shrink-0">
                <Building2 class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <h2 class="text-ui-h3 text-ui-ink">{{ $t("clients.form.sections.company") }}</h2>
              </div>
            </header>
            <div class="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <UiInput v-model="form.name" :label="$t('clients.fields.name') + ' *'" :icon="Briefcase" :placeholder="$t('clients.form.placeholders.name')" class="md:col-span-2" />
              <div class="min-w-0">
                <label :for="'client-type-options-input'" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("clients.fields.type") }}</label>
                <div class="relative">
                  <Tag class="absolute left-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
                  <input
                    id="client-type-options-input"
                    v-model="form.type"
                    type="text"
                    list="client-type-options"
                    autocomplete="off" :placeholder="$t('clients.form.placeholders.type')"
                    :class="fieldClass"
                  />
                  <datalist id="client-type-options">
                    <option v-for="opt in clientTypeOptions" :key="opt" :value="opt" />
                  </datalist>
                </div>
              </div>
              <div class="min-w-0">
                <label :for="'client-field-options-input'" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("clients.fields.field") }}</label>
                <div class="relative">
                  <Layers class="absolute left-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
                  <input
                    id="client-field-options-input"
                    v-model="form.field"
                    type="text"
                    list="client-field-options"
                    autocomplete="off" :placeholder="$t('clients.form.placeholders.field')"
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
                <h2 class="text-ui-h3 text-ui-ink">{{ $t("clients.form.sections.pic") }}</h2>
              </div>
            </header>
            <div class="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <UiInput v-model="form.pic_name" :label="$t('clients.fields.picName') + ' *'" :icon="User" :placeholder="$t('clients.form.placeholders.picName')" />
              <UiInput v-model="form.pic_phone" :label="$t('clients.fields.picPhone') + ' *'" :icon="Phone" placeholder="+62..." />
              <UiInput v-model="form.email" :label="$t('common.labels.email')" type="email" :icon="Mail" placeholder="client@company.com" class="md:col-span-2" />
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
            <header class="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-ui-line">
              <div class="w-9 h-9 rounded-ui-control border border-ui-line bg-ui-surface text-ui-muted flex items-center justify-center shrink-0">
                <ScrollText class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <h2 class="text-ui-h3 text-ui-ink">{{ $t("clients.form.sections.legal") }}</h2>
              <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("clients.form.sections.legalHint") }}</p>
              </div>
            </header>
            <div class="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <UiInput v-model="form.npwp" :label="$t('clients.fields.npwp')" placeholder="00.000.000.0-000.000" mono />
              <UiInput v-model="form.siup_number" :label="$t('clients.fields.siup')" :placeholder="$t('clients.form.placeholders.siup')" />
              <UiInput v-model="form.nib_number" :label="$t('clients.fields.nib')" :placeholder="$t('clients.form.placeholders.nib')" />
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
            <header class="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-ui-line">
              <div class="w-9 h-9 rounded-ui-control border border-ui-line bg-ui-surface text-ui-muted flex items-center justify-center shrink-0">
                <MapPin class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <h2 class="text-ui-h3 text-ui-ink">{{ $t("clients.form.sections.additional") }}</h2>
              </div>
            </header>
            <div class="p-5 sm:p-6 grid grid-cols-1 gap-4">
              <UiInput v-model="form.address" :label="$t('common.labels.address')" :icon="MapPin" :placeholder="$t('clients.form.placeholders.address')" />
              <UiInput v-model="form.notes" :label="$t('common.labels.notes')" :rows="4" :placeholder="$t('clients.form.placeholders.notes')" />
            </div>
          </section>
      </div>

      <!-- Side panel: live summary + required fields -->
      <aside class="space-y-4 lg:sticky lg:top-4 min-w-0">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <div class="flex items-center gap-3 pb-4 border-b border-ui-line">
            <div class="w-10 h-10 rounded-full bg-ui-accent-soft text-ui-accent text-ui-small font-semibold flex items-center justify-center shrink-0">{{ initials }}</div>
            <div class="min-w-0">
              <p class="text-ui-cap text-ui-muted">{{ $t("clients.form.summary") }}</p>
              <p class="text-ui-h3 text-ui-ink truncate">{{ form.name || $t("clients.form.newClient") }}</p>
            </div>
          </div>
          <dl class="divide-y divide-ui-line text-ui-small">
            <div v-for="row in [
              { label: $t('clients.fields.type'), value: form.type },
              { label: $t('clients.fields.field'), value: form.field },
              { label: $t('clients.fields.picName'), value: form.pic_name },
              { label: $t('clients.fields.picPhone'), value: form.pic_phone },
              { label: $t('common.labels.email'), value: form.email },
            ]" :key="row.label" class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-ui-muted shrink-0">{{ row.label }}</dt>
              <dd class="text-ui-ink truncate text-right">{{ row.value || "—" }}</dd>
            </div>
          </dl>
        </section>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-ui-h3 text-ui-ink">{{ $t("clients.form.requiredFields") }}</h3>
            <UiBadge :tone="requiredDone === requiredChecks.length ? 'ok' : 'warn'">{{ $t("clients.form.requiredCount", { done: requiredDone, total: requiredChecks.length }) }}</UiBadge>
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
          <UiButton type="submit" size="lg" block :icon="Save" :loading="loading" :disabled="loading">
            {{ loading ? $t("common.actions.saving") : $t("clients.form.save") }}
          </UiButton>
          <UiButton variant="secondary" size="lg" block class="sm:hidden" @click="$router.back()">{{ $t("common.actions.cancel") }}</UiButton>
        </div>
      </aside>
    </form>
  </div>
</template>
