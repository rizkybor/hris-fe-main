<script setup>
// "Tentang Perusahaan": the company's profile page. A brand hero (logo,
// name, what it does, a few facts), the vision as a quote, the mission as
// numbered cards, and a contact card where every detail can be used
// directly (mail, call, open the map, copy). Editing is a modal; missions
// and branches are edited as rows. Saving shows the saved record at once.
import { useCompanyAboutStore } from "@/stores/companyAbout";
import { ref, reactive, computed, onMounted } from "vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import ListEditor from "@/components/admin/company-about/ListEditor.vue";
import { UiPageHeader, UiButton, UiModal, UiInput, UiEmpty } from "@/components/ui";
import { can } from "@/helpers/permissionHelper";
import { useToastStore } from "@/stores/toast";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { Building2, Pencil, Plus, Target, Flag, MapPin, Mail, Phone, CalendarDays, Network, Type, Save, Hash, Copy, Check, Quote, ExternalLink, Sparkles } from "lucide-vue-next";

const { t } = useI18n();
const toast = useToastStore();
const companyStore = useCompanyAboutStore();
const { company, loading } = storeToRefs(companyStore);

onMounted(() => companyStore.fetchCompany({ quiet: true }));

// Mission / branches may arrive as an array or a JSON string.
const asList = (value) => {
  if (!value) return [];
  let list;
  try {
    list = Array.isArray(value) ? value : JSON.parse(value);
  } catch {
    list = [value];
  }
  return (Array.isArray(list) ? list : [list]).map((v) => String(v).replace(/\s+/g, " ").trim()).filter(Boolean);
};
const missions = computed(() => asList(company.value?.mission));
const branches = computed(() => asList(company.value?.branches));

const established = computed(() => (company.value?.established_date ? new Date(company.value.established_date) : null));
const establishedLabel = computed(() =>
  established.value ? established.value.toLocaleDateString(localeTag(), { year: "numeric", month: "long", day: "numeric" }) : ""
);
// Whole years since it was founded.
const years = computed(() => {
  if (!established.value) return 0;
  const now = new Date();
  let y = now.getFullYear() - established.value.getFullYear();
  if (now < new Date(now.getFullYear(), established.value.getMonth(), established.value.getDate())) y--;
  return Math.max(0, y);
});

const mapsUrl = computed(() => (company.value?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.value.address)}` : ""));
const telHref = computed(() => (company.value?.phone ? `tel:${company.value.phone.replace(/[^\d+]/g, "")}` : ""));

const contacts = computed(() => [
  { key: "email", icon: Mail, label: t("common.labels.email"), value: company.value?.email, href: company.value?.email ? `mailto:${company.value.email}` : "" },
  { key: "phone", icon: Phone, label: t("common.labels.phone"), value: company.value?.phone, href: telHref.value },
  { key: "address", icon: MapPin, label: t("common.labels.address"), value: company.value?.address, href: "" },
  { key: "npwp", icon: Hash, label: t("company.fields.npwp"), value: company.value?.npwp, href: "", mono: true },
]);

// Copy a contact detail; the button shows a check for a moment.
const copiedKey = ref(null);
let copiedTimer = 0;
const copy = async (item) => {
  try {
    await navigator.clipboard.writeText(item.value);
    copiedKey.value = item.key;
    window.clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => (copiedKey.value = null), 1600);
    toast.success(t("company.copiedLabel", { label: item.label }));
  } catch {
    toast.error(t("common.toast.error"));
  }
};

// ---- Edit / create ----
const showModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const form = reactive({
  name: "",
  legal_name: "",
  npwp: "",
  description: "",
  vision: "",
  missions: [],
  established_date: "",
  address: "",
  email: "",
  phone: "",
  branches: [],
});

const openModal = (edit = false) => {
  isEditing.value = edit && !!company.value;
  const c = isEditing.value ? company.value : {};
  Object.assign(form, {
    name: c.name || "",
    legal_name: c.legal_name || "",
    npwp: c.npwp || "",
    description: c.description || "",
    vision: c.vision || "",
    missions: isEditing.value ? [...missions.value] : [""],
    established_date: c.established_date ? String(c.established_date).slice(0, 10) : "",
    address: c.address || "",
    email: c.email || "",
    phone: c.phone || "",
    branches: isEditing.value ? [...branches.value] : [],
  });
  showModal.value = true;
};

const saveCompany = async () => {
  const clean = (list) => list.map((v) => v.trim()).filter(Boolean);
  const payload = {
    name: form.name || null,
    legal_name: form.legal_name || null,
    npwp: form.npwp || null,
    description: form.description || null,
    vision: form.vision || null,
    mission: clean(form.missions),
    branches: clean(form.branches),
    established_date: form.established_date || null,
    address: form.address || null,
    email: form.email || null,
    phone: form.phone || null,
  };

  saving.value = true;
  try {
    if (isEditing.value) await companyStore.updateCompany(company.value.id, payload);
    else await companyStore.createCompany(payload);
    showModal.value = false;
    toast.success(t(isEditing.value ? "company.toast.saved" : "company.toast.created"));
  } catch (err) {
    // Keep the form open with what was typed.
    toast.error(t("common.toast.error"), err?.response?.data?.message || "");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('company.title')" :subtitle="$t('company.subtitle')">
      <template #actions>
        <UiButton v-if="can('company-about-edit') && company" :icon="Pencil" class="w-full sm:w-auto" @click="openModal(true)">
          {{ $t("common.actions.edit") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <div v-if="loading && !company" class="space-y-4 lg:space-y-5">
      <Skeleton width="100%" height="220px" rounded="16px" />
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <Skeleton class="lg:col-span-2" width="100%" height="260px" rounded="12px" />
        <Skeleton width="100%" height="260px" rounded="12px" />
      </div>
    </div>

    <template v-else-if="company">
      <!-- Hero: the company at a glance, on the brand navy. -->
      <section class="company-hero relative overflow-hidden rounded-ui-card bg-ui-brand text-white ui-anim-fade-up">
        <div class="company-hero__glow absolute inset-0" aria-hidden="true"></div>
        <div class="relative p-5 sm:p-8 flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
          <div class="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-[18px] bg-white shadow-ui-overlay flex items-center justify-center">
            <img src="/images/jcd-only-color.png" :alt="$t('company.logoAlt')" class="w-11 h-11 sm:w-14 sm:h-14 object-contain" />
          </div>
          <div class="min-w-0 flex-1">
            <p v-if="company.legal_name" class="text-ui-over uppercase tracking-wider text-white/60">{{ company.legal_name }}</p>
            <h2 class="text-[26px] sm:text-[32px] leading-tight font-semibold tracking-tight mt-1 break-words">{{ company.name || "-" }}</h2>
            <p v-if="company.description" class="text-ui-body text-white/80 mt-3 max-w-3xl">{{ company.description }}</p>

            <ul class="flex flex-wrap gap-2 mt-5">
              <li v-if="establishedLabel" class="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/10 ring-1 ring-white/15 text-ui-small">
                <CalendarDays class="w-4 h-4 text-white/70" />{{ $t("company.hero.since", { date: establishedLabel }) }}
              </li>
              <li v-if="established && years > 0" class="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/10 ring-1 ring-white/15 text-ui-small">
                <Sparkles class="w-4 h-4 text-white/70" /><span v-count-up>{{ $t("company.hero.years", { n: years }, years) }}</span>
              </li>
              <li v-if="branches.length" class="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/10 ring-1 ring-white/15 text-ui-small">
                <Network class="w-4 h-4 text-white/70" />{{ $t("company.hero.branches", { n: branches.length }, branches.length) }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-start">
        <div class="lg:col-span-2 space-y-4 lg:space-y-5 min-w-0">
          <!-- Vision: the one sentence that matters most, as a quote. -->
          <section class="relative bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 overflow-hidden">
            <span class="absolute inset-y-0 left-0 w-1 bg-ui-accent" aria-hidden="true"></span>
            <div class="flex items-center gap-2.5 mb-3">
              <Target class="w-4 h-4 text-ui-accent" />
              <h3 class="text-ui-over uppercase tracking-wider text-ui-muted">{{ $t("company.vision") }}</h3>
            </div>
            <div class="flex gap-3">
              <Quote class="w-7 h-7 shrink-0 text-ui-accent/25 -mt-1" aria-hidden="true" />
              <p class="text-[19px] sm:text-[21px] leading-snug font-medium text-ui-ink whitespace-pre-line">{{ company.vision || "-" }}</p>
            </div>
          </section>

          <!-- Mission: numbered cards. -->
          <section v-if="missions.length" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
            <div class="flex items-center gap-2.5 mb-4">
              <Flag class="w-4 h-4 text-ui-accent" />
              <h3 class="text-ui-over uppercase tracking-wider text-ui-muted">{{ $t("company.mission") }}</h3>
            </div>
            <ol class="grid grid-cols-1 sm:grid-cols-2 gap-3 ui-stagger">
              <li v-for="(m, index) in missions" :key="index" class="flex gap-3 p-4 rounded-ui-control bg-ui-subtle/70 border border-ui-line min-w-0">
                <span class="w-7 h-7 shrink-0 rounded-full bg-ui-accent-soft text-ui-accent text-ui-small font-semibold tabular-nums inline-flex items-center justify-center">{{ index + 1 }}</span>
                <span class="min-w-0 text-ui-body text-ui-text pt-0.5">{{ m }}</span>
              </li>
            </ol>
          </section>
        </div>

        <div class="space-y-4 lg:space-y-5 min-w-0">
          <!-- Contact: every detail usable as is. -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card">
            <h3 class="px-5 pt-5 pb-2 text-ui-over uppercase tracking-wider text-ui-muted">{{ $t("company.contact") }}</h3>
            <dl class="divide-y divide-ui-line">
              <div v-for="item in contacts" :key="item.key" class="group flex items-start gap-3 px-5 py-3.5 min-w-0">
                <span class="w-8 h-8 shrink-0 rounded-ui-control bg-ui-subtle text-ui-muted inline-flex items-center justify-center">
                  <component :is="item.icon" class="w-4 h-4" />
                </span>
                <div class="min-w-0 flex-1">
                  <dt class="text-ui-cap text-ui-muted">{{ item.label }}</dt>
                  <dd class="text-ui-body text-ui-ink break-words" :class="item.mono ? 'tabular-nums' : ''">
                    <a v-if="item.value && item.href" :href="item.href" class="hover:text-ui-accent hover:underline">{{ item.value }}</a>
                    <template v-else>{{ item.value || "-" }}</template>
                  </dd>
                  <a
                    v-if="item.key === 'address' && mapsUrl"
                    :href="mapsUrl"
                    target="_blank"
                    rel="noopener"
                    class="inline-flex items-center gap-1 mt-1 text-ui-cap font-medium text-ui-accent hover:underline"
                  >
                    {{ $t("company.openMaps") }}<ExternalLink class="w-3 h-3" />
                  </a>
                </div>
                <button
                  v-if="item.value"
                  type="button"
                  class="ui-press w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-faint hover:text-ui-ink hover:bg-ui-hover focus:outline-none focus-visible:shadow-ui-focus"
                  :aria-label="`${$t('common.actions.copy')} ${item.label}`"
                  :title="$t('common.actions.copy')"
                  @click="copy(item)"
                >
                  <Check v-if="copiedKey === item.key" class="w-4 h-4 text-ui-ok" />
                  <Copy v-else class="w-4 h-4" />
                </button>
              </div>
            </dl>
          </section>

          <!-- Branches -->
          <section v-if="branches.length" class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
            <div class="flex items-center gap-2.5 mb-3">
              <Network class="w-4 h-4 text-ui-accent" />
              <h3 class="text-ui-over uppercase tracking-wider text-ui-muted">{{ $t("company.branches") }}</h3>
            </div>
            <ul class="space-y-2">
              <li v-for="(b, index) in branches" :key="index" class="flex items-center gap-3 p-3 rounded-ui-control border border-ui-line min-w-0">
                <span class="w-8 h-8 shrink-0 rounded-ui-control bg-ui-accent-soft text-ui-accent inline-flex items-center justify-center">
                  <Building2 class="w-4 h-4" />
                </span>
                <span class="min-w-0 text-ui-body text-ui-ink break-words">{{ b }}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="Building2" :title="$t('company.empty.title')" :message="$t('company.empty.message')">
        <UiButton v-if="can('company-about-edit')" :icon="Plus" @click="openModal(false)">{{ $t("company.modal.addTitle") }}</UiButton>
      </UiEmpty>
    </div>

    <!-- Create / edit -->
    <UiModal v-model:open="showModal" size="lg" :title="isEditing ? $t('company.modal.editTitle') : $t('company.modal.addTitle')">
      <form id="company-about-form" class="space-y-6" @submit.prevent="saveCompany">
        <fieldset class="space-y-4">
          <legend class="sr-only">{{ $t("company.modal.identity") }}</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted"><Type class="w-3.5 h-3.5" />{{ $t("company.modal.identity") }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.name" :label="$t('common.labels.name')" :icon="Building2" class="sm:col-span-2" />
            <UiInput v-model="form.description" :label="$t('common.labels.description')" :rows="3" class="sm:col-span-2" />
            <UiInput v-model="form.legal_name" :label="$t('company.fields.legalNameOptional')" placeholder="PT ..." />
            <UiInput v-model="form.npwp" :label="$t('company.fields.npwpOptional')" placeholder="00.000.000.0-000.000" />
            <UiInput v-model="form.established_date" type="date" :label="$t('company.fields.establishedDate')" :icon="CalendarDays" />
          </div>
        </fieldset>

        <fieldset class="space-y-4 pt-5 border-t border-ui-line">
          <legend class="sr-only">{{ $t("company.modal.visionMission") }}</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted"><Target class="w-3.5 h-3.5" />{{ $t("company.modal.visionMission") }}</p>
          <UiInput v-model="form.vision" :label="$t('company.vision')" :rows="2" />
          <div>
            <p class="text-ui-small font-medium text-ui-ink mb-2">{{ $t("company.mission") }}</p>
            <ListEditor v-model="form.missions" numbered :label="$t('company.mission')" :add-label="$t('company.modal.addMission')" :placeholder="$t('company.fields.missionPlaceholder')" />
          </div>
        </fieldset>

        <fieldset class="space-y-4 pt-5 border-t border-ui-line">
          <legend class="sr-only">{{ $t("company.modal.contact") }}</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted"><Phone class="w-3.5 h-3.5" />{{ $t("company.modal.contact") }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="form.email" type="email" :label="$t('common.labels.email')" :icon="Mail" />
            <UiInput v-model="form.phone" :label="$t('common.labels.phone')" :icon="Phone" />
            <UiInput v-model="form.address" :label="$t('common.labels.address')" :icon="MapPin" :rows="2" class="sm:col-span-2" />
          </div>
        </fieldset>

        <fieldset class="space-y-3 pt-5 border-t border-ui-line">
          <legend class="sr-only">{{ $t("company.branches") }}</legend>
          <p class="flex items-center gap-2 text-ui-over uppercase text-ui-muted"><Network class="w-3.5 h-3.5" />{{ $t("company.branches") }}</p>
          <ListEditor v-model="form.branches" :label="$t('company.branches')" :add-label="$t('company.modal.addBranch')" :placeholder="$t('company.fields.branchesPlaceholder')" />
        </fieldset>
      </form>

      <template #footer>
        <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="showModal = false">{{ $t("common.actions.cancel") }}</UiButton>
        <UiButton :icon="Save" class="flex-1 sm:flex-none" :loading="saving" @click="saveCompany">{{ saving ? $t("common.actions.saving") : $t("common.actions.save") }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
/* Soft brand light on the navy hero (static, like the sign-in fallback). */
.company-hero__glow {
  background:
    radial-gradient(55% 80% at 100% 0%, rgb(82 184 250 / 0.22), transparent 70%),
    radial-gradient(45% 70% at 0% 100%, rgb(31 91 216 / 0.35), transparent 70%),
    linear-gradient(118deg, transparent 45%, rgb(31 91 216 / 0.12) 60%, transparent 75%);
}
</style>
