<script setup>
// Full-width create / edit layout for a license: header row with actions,
// the form sections on the left (8/12 on lg) and a sticky live "License
// summary" on the right (4/12). Below lg everything stacks and a sticky
// bottom bar carries the primary button. The parent owns submission.
import { computed, nextTick, ref, watch } from "vue";
import {
  IdCard,
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Building2,
  Link2,
  Receipt,
  Contact,
  CalendarClock,
  Infinity as InfinityIcon,
  FileText,
  Power,
  KeyRound,
  Minus,
  Plus,
  Circle,
  Laptop,
  Tablet,
  Lock,
  Layers,
  Check,
  ShieldCheck,
  ChevronDown,
} from "lucide-vue-next";
import { UiPageHeader, UiButton } from "@/components/ui";
import LicenseStatusSwitch from "@/components/admin/license-manager/LicenseStatusSwitch.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import LicenseFormField from "@/components/admin/license-manager/LicenseFormField.vue";
import CopyKeyButton from "@/components/admin/license-manager/CopyKeyButton.vue";
import LicenseLocationFields from "@/components/admin/license-manager/LicenseLocationFields.vue";
import {
  PLAN_OPTIONS,
  PLATFORM_OPTIONS,
  PLATFORM_CHOICES,
  platformsOf,
  planGroupsFor,
  planAllowedOn,
  ORGANIZATION_TYPE_OPTIONS,
  KEY_MODE_OPTIONS,
  requiredFields,
  requiredFieldLabel,
  formatAddress,
  keyPreview as buildKeyPreview,
  categoryOfPlan,
  categoryLabel,
  otherCategoryFields,
  isRequiredField,
  planType,
  durationOptionsFor,
  defaultDurationFor,
  planDefaultMaxDevices,
  periodPreview,
  validateLicenseForm,
} from "@/components/admin/license-manager/licenseHelpers";

// v-model'd form object; the parent owns submission and the API call.
const form = defineModel({ type: Object, required: true });

const props = defineProps({
  loading: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
  submitLabel: { type: String, default: "Save License" },
  isEdit: { type: Boolean, default: false },
  // The product comes from the URL; shown read-only.
  product: { type: Object, default: null },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  // Edit: the current key, shown next to the title.
  licenseKey: { type: String, default: "" },
  // Edit: the plan saved now (a different plan gets a new key).
  originalPlan: { type: String, default: "" },
});

const emit = defineEmits(["submit", "cancel"]);

const formEl = ref(null);

const fieldError = (field) => {
  const value = props.errors?.[field];
  return Array.isArray(value) ? value[0] : value || "";
};

const category = computed(() => categoryOfPlan(form.value.plan));
const isOrganization = computed(() => category.value === "organization");
const isLifetimePlan = computed(() => planType(form.value.plan) === "lifetime");
// iPad has no Trial, so its picker shows one card less.
const planGroups = computed(() => planGroupsFor(form.value.platform));
const individualCount = computed(() => planGroups.value.find((g) => g.label === "Individual")?.plans.length || 0);
// Create offers Mac, iPad, or both at once; edit shows the fixed platform.
const platformChoices = computed(() => (props.isEdit ? PLATFORM_OPTIONS : PLATFORM_CHOICES));
const platformInfo = computed(() => PLATFORM_CHOICES.find((p) => p.value === form.value.platform) || null);
const platformIcon = (value) => (value === "ipad" ? Tablet : value === "both" ? Layers : Laptop);
const durations = computed(() => durationOptionsFor(form.value.plan));
const required = (field) => isRequiredField(category.value, field, form.value.country);
const fullAddress = computed(() => formatAddress(form.value));

const minCustomDate = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
});

// Max devices last filled in from a plan default. On create, picking a plan
// only replaces the value while it still equals that default, so a number
// the user typed is kept.
const autoMaxDevices = ref(props.isEdit ? null : form.value.max_devices);

const selectPlan = (plan) => {
  const previousCategory = category.value;
  form.value.plan = plan;

  // The type always follows the plan (Lifetime plan = lifetime, others term).
  form.value.type = planType(plan);

  // A custom date is kept; otherwise use the plan's main preset (on edit,
  // only when the current preset is not offered for the new plan).
  const { primary, secondary } = durationOptionsFor(plan);
  const offered = [...primary, ...secondary].map((d) => d.value);
  if (form.value.duration !== "custom" && (!props.isEdit || !offered.includes(form.value.duration))) {
    form.value.duration = defaultDurationFor(plan);
  }

  if (props.isEdit) return;

  // Switching category on create: shared values (name, email, phone and the
  // whole location) stay, the old category's own fields are cleared.
  if (previousCategory !== categoryOfPlan(plan)) {
    for (const field of otherCategoryFields(categoryOfPlan(plan))) form.value[field] = "";
  }

  const current = form.value.max_devices;
  if (current === autoMaxDevices.value || current === "" || current == null) {
    form.value.max_devices = planDefaultMaxDevices(plan);
    autoMaxDevices.value = form.value.max_devices;
  }

  if (plan === "lifetime") form.value.type = "lifetime";
  if (plan === "professional") form.value.type = "term";
  if (plan === "trial") {
    form.value.type = "term";
    form.value.duration = "14_days";
  }
};

// The platform is fixed once the license exists (it is part of the key).
// Switching to iPad while Trial is picked moves to Professional.
const selectPlatform = (platform) => {
  if (props.isEdit) return;
  form.value.platform = platform;
  if (!planAllowedOn(platform, form.value.plan)) selectPlan("professional");
};

// Edit: picking another plan replaces the key.
const planChanged = computed(() => props.isEdit && !!props.originalPlan && form.value.plan !== props.originalPlan);

// One key per device vs one shared key; fixed after create.
const perDevice = computed(() => form.value.key_mode === "per_device");
const keyModeIcon = (value) => (value === "per_device" ? KeyRound : Users);
const selectKeyMode = (mode) => {
  if (!props.isEdit) form.value.key_mode = mode;
};

// Max devices stepper (1-100).
const stepDevices = (delta) => {
  const current = Number(form.value.max_devices) || 0;
  form.value.max_devices = Math.min(100, Math.max(1, current + delta));
};

// After a submit with errors (client or server 422), bring the first
// invalid field into view, in page order.
watch(
  () => props.errors,
  async (errors) => {
    if (!errors || !Object.keys(errors).length) return;
    await nextTick();
    const fields = formEl.value?.querySelectorAll("[data-field]") || [];
    const first = [...fields].find((el) => errors[el.dataset.field]);
    if (!first) return;
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    first.querySelector("input, select, textarea")?.focus({ preventScroll: true });
  }
);

/* ---------------- Live summary ---------------- */

const planInfo = computed(() => PLAN_OPTIONS.find((p) => p.value === form.value.plan) || null);
const period = computed(() => periodPreview(form.value));
// One preview per key: "Mac + iPad" generates two.
const keyPreviews = computed(() =>
  props.licenseKey
    ? [props.licenseKey]
    : platformsOf(form.value.platform).map((platform) =>
        buildKeyPreview(props.product?.key_prefix, form.value.plan, props.product?.next_sequences?.[platform], platform)
      )
);

// Required-fields checklist, using the same client rules as the submit.
const liveErrors = computed(() => validateLicenseForm(form.value));
const checklist = computed(() => {
  const items = requiredFields(category.value, form.value.country).map((field) => ({
    field,
    label: requiredFieldLabel(field, category.value),
    done: !liveErrors.value[field],
  }));
  if (!isLifetimePlan.value) {
    items.push({
      field: "duration",
      label: "Duration",
      done: !liveErrors.value.duration && !liveErrors.value.expires_at,
    });
  }
  items.push({ field: "max_devices", label: "Max devices", done: !liveErrors.value.max_devices });
  return items;
});
const doneCount = computed(() => checklist.value.filter((i) => i.done).length);
const allDone = computed(() => doneCount.value === checklist.value.length);

const display = (value) => (value === null || value === undefined || String(value).trim() === "" ? "—" : value);

// Token field style; also used by LicenseLocationFields (inputs + textarea).
const inputClass = (field, withIcon = true) => [
  "w-full pr-3 py-2 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border rounded-ui-control transition-shadow",
  "focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-muted",
  withIcon ? "pl-9" : "pl-3",
  fieldError(field) ? "border-ui-bad/50" : "border-ui-line-strong",
];

// Presentation only: section cards and the selectable option cards.
const optionCard = (selected) => [
  "relative flex text-left rounded-ui-card border bg-ui-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
  selected ? "border-ui-ink ring-1 ring-ui-ink" : "border-ui-line hover:border-ui-line-strong hover:bg-ui-subtle/60",
];
const sections = {
  plan: { icon: ShieldCheck, title: "Platform & plan", subtitle: "The platform is part of the key and cannot change later." },
  licensee: { icon: IdCard, title: "Licensee", subtitle: "Shown on the certificate." },
  location: { icon: MapPin, title: "Location", subtitle: "Indonesian addresses use the region list." },
  organization: { icon: Building2, title: "Organization", subtitle: "Shown on the certificate." },
  contact: { icon: Contact, title: "Contact Person", subtitle: "Receives the certificate and renewal reminders." },
  address: { icon: MapPin, title: "Address", subtitle: "Indonesian addresses use the region list." },
  terms: { icon: CalendarClock, title: "License Terms", subtitle: "Duration, devices and how keys are handed out." },
  notes: { icon: FileText, title: "Notes", subtitle: "Internal only, not on the certificate." },
};
</script>

<template>
  <form ref="formEl" novalidate class="space-y-5" @submit.prevent="emit('submit')">
    <!-- ===================== Header ===================== -->
    <UiPageHeader :title="title" class="ui-anim-fade-up">
      <template #subtitle>
        <span class="flex flex-wrap items-center gap-2">
          <span v-if="subtitle">{{ subtitle }}</span>
          <span v-if="licenseKey" class="inline-flex items-center gap-1 bg-ui-subtle border border-ui-line rounded-ui-control pl-2.5 pr-0.5 py-0.5">
            <span class="font-mono text-ui-cap font-medium tracking-wide text-ui-ink">{{ licenseKey }}</span>
            <CopyKeyButton :value="licenseKey" class="!w-6 !h-6 !border-0 !bg-transparent" />
          </span>
        </span>
      </template>
      <template #actions>
        <UiButton variant="secondary" @click="emit('cancel')">Cancel</UiButton>
        <UiButton type="submit" :icon="Check" :loading="loading">{{ loading ? "Saving..." : submitLabel }}</UiButton>
      </template>
    </UiPageHeader>

    <slot name="alerts" />

    <!-- ===================== Body ===================== -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <!-- Form sections -->
      <div class="lg:col-span-8 space-y-5 min-w-0 ui-stagger">
        <!-- 1. Platform & plan -->
        <section data-field="plan" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
          <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
            <div class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center shrink-0">
              <component :is="sections.plan.icon" class="w-4 h-4 text-ui-muted" />
            </div>
            <div class="min-w-0">
              <h3 class="text-ui-h2 text-ui-ink">{{ sections.plan.title }} <span class="text-ui-bad">*</span></h3>
              <p class="text-ui-cap text-ui-muted">{{ sections.plan.subtitle }}</p>
            </div>
          </div>

          <!-- Platform: Mac, iPad or both; fixed after create -->
          <div data-field="platform" class="mb-4">
            <div class="flex p-1 bg-ui-subtle border border-ui-line rounded-ui-card" role="radiogroup" aria-label="Platform">
              <button
                v-for="option in platformChoices"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="form.platform === option.value"
                :disabled="isEdit && form.platform !== option.value"
                :title="option.note"
                @click="selectPlatform(option.value)"
                class="flex-1 h-9 inline-flex items-center justify-center gap-2 rounded-ui-control text-ui-small font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :class="form.platform === option.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
              >
                <component :is="platformIcon(option.value)" class="w-4 h-4 shrink-0" />
                {{ option.label }}
                <Lock v-if="isEdit && form.platform === option.value" class="w-3.5 h-3.5 text-ui-muted shrink-0" />
              </button>
            </div>
            <p class="text-ui-cap text-ui-muted mt-2">
              <template v-if="isEdit">The platform is part of the key, so it cannot be changed.</template>
              <template v-else-if="platformInfo">{{ platformInfo.label }}: {{ platformInfo.note }}</template>
            </p>
            <p v-if="fieldError('platform')" class="text-ui-cap text-ui-bad mt-1.5">{{ fieldError("platform") }}</p>
          </div>

          <!-- Group labels above their cards (md and up) -->
          <div class="hidden md:grid gap-3 mb-2" :class="individualCount === 3 ? 'grid-cols-4' : 'grid-cols-3'">
            <p class="text-ui-over uppercase text-ui-muted" :class="individualCount === 3 ? 'col-span-3' : 'col-span-2'">Individual</p>
            <p class="text-ui-over uppercase text-ui-muted">Organization</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" :class="individualCount === 3 ? 'md:grid-cols-4' : 'md:grid-cols-3'">
            <template v-for="group in planGroups" :key="group.label">
              <button
                v-for="plan in group.plans"
                :key="plan.value"
                type="button"
                @click="selectPlan(plan.value)"
                :class="[optionCard(form.plan === plan.value), 'flex-col items-start gap-1 p-3.5 h-full']"
                :aria-pressed="form.plan === plan.value"
              >
                <span class="flex items-center gap-2 w-full">
                  <span class="text-ui-h3 text-ui-ink flex-1">{{ plan.label }}</span>
                  <Check v-if="form.plan === plan.value" class="w-4 h-4 text-ui-ink shrink-0" />
                </span>
                <span class="text-ui-cap text-ui-muted leading-snug">{{ plan.note }}</span>
              </button>
            </template>
          </div>
          <p v-if="fieldError('plan')" class="text-ui-cap text-ui-bad mt-2">{{ fieldError("plan") }}</p>
          <div v-if="planChanged" class="mt-3 flex items-start gap-2.5 p-3 rounded-ui-card border border-ui-warn/20 bg-ui-warn-soft text-ui-warn">
            <KeyRound class="w-4 h-4 shrink-0 mt-0.5" />
            <p class="text-ui-cap">
              <span class="font-semibold">A new license key will be generated.</span>
              The current key{{ perDevice ? "s" : "" }} stop working and every device has to activate again with the new key.
              Send the licensee the new certificate after saving.
            </p>
          </div>
        </section>

        <!-- 2-3. Individual: Licensee + Location -->
        <template v-if="!isOrganization">
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
            <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <div class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center shrink-0">
                <component :is="sections.licensee.icon" class="w-4 h-4 text-ui-muted" />
              </div>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">{{ sections.licensee.title }}</h3>
                <p class="text-ui-cap text-ui-muted">{{ sections.licensee.subtitle }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
              <LicenseFormField field="licensee_name" label="Full Name" :required="required('licensee_name')" :error="fieldError('licensee_name')" :icon="User" v-slot="{ id }">
                <input :id="id" v-model="form.licensee_name" type="text" autocomplete="name" placeholder="e.g. Jane Orienteer" :class="inputClass('licensee_name')" />
              </LicenseFormField>
              <LicenseFormField field="licensee_email" label="Email" :required="required('licensee_email')" :error="fieldError('licensee_email')" :icon="Mail" v-slot="{ id }">
                <input :id="id" v-model="form.licensee_email" type="email" autocomplete="email" placeholder="name@example.com" :class="inputClass('licensee_email')" />
              </LicenseFormField>
              <LicenseFormField field="phone" label="Phone / WhatsApp" :required="required('phone')" :error="fieldError('phone')" :icon="Phone" v-slot="{ id }">
                <input :id="id" v-model="form.phone" type="tel" autocomplete="tel" placeholder="+62 812-3456-7890" :class="inputClass('phone')" />
              </LicenseFormField>
              <LicenseFormField field="occupation" label="Occupation" :required="required('occupation')" :error="fieldError('occupation')" :icon="Briefcase" hint="e.g. Mapper, Course setter, Coach" v-slot="{ id }">
                <input :id="id" v-model="form.occupation" type="text" placeholder="Mapper" :class="inputClass('occupation')" />
              </LicenseFormField>
              <LicenseFormField field="affiliation" label="Affiliation" :required="required('affiliation')" :error="fieldError('affiliation')" :icon="GraduationCap" hint="Club or school" wide v-slot="{ id }">
                <input :id="id" v-model="form.affiliation" type="text" placeholder="e.g. Jakarta Orienteering Club" :class="inputClass('affiliation')" />
              </LicenseFormField>
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
            <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <div class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center shrink-0">
                <component :is="sections.location.icon" class="w-4 h-4 text-ui-muted" />
              </div>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">{{ sections.location.title }}</h3>
                <p class="text-ui-cap text-ui-muted">{{ sections.location.subtitle }}</p>
              </div>
            </div>
            <LicenseLocationFields v-model="form" :category="category" :errors="errors" :input-class="inputClass" />
          </section>
        </template>

        <!-- 2-3. Organization: Organization + Contact person + Address -->
        <template v-else>
          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
            <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <div class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center shrink-0">
                <component :is="sections.organization.icon" class="w-4 h-4 text-ui-muted" />
              </div>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">{{ sections.organization.title }}</h3>
                <p class="text-ui-cap text-ui-muted">{{ sections.organization.subtitle }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5">
              <LicenseFormField field="licensee_name" label="Organization Name" :required="required('licensee_name')" :error="fieldError('licensee_name')" :icon="Building2" class="md:col-span-3" v-slot="{ id }">
                <input :id="id" v-model="form.licensee_name" type="text" autocomplete="organization" placeholder="e.g. Jakarta Orienteering Club" :class="inputClass('licensee_name')" />
              </LicenseFormField>

              <LicenseFormField field="organization_type" label="Type" :required="required('organization_type')" :error="fieldError('organization_type')" v-slot="{ id }">
                <select :id="id" v-model="form.organization_type" :class="[inputClass('organization_type', false), 'appearance-none pr-9', form.organization_type ? '' : 'text-ui-faint']">
                  <option value="" disabled>Choose a type</option>
                  <option v-for="opt in ORGANIZATION_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <ChevronDown class="absolute right-3 top-[11px] w-4 h-4 text-ui-faint pointer-events-none" />
              </LicenseFormField>
              <LicenseFormField field="member_count" label="Member Count" :required="required('member_count')" :error="fieldError('member_count')" :icon="Users" v-slot="{ id }">
                <input :id="id" v-model.number="form.member_count" type="number" min="1" step="1" placeholder="e.g. 120" :class="[inputClass('member_count'), 'tabular-nums']" />
              </LicenseFormField>
              <LicenseFormField field="website" label="Website" :required="required('website')" :error="fieldError('website')" :icon="Link2" v-slot="{ id }">
                <input :id="id" v-model="form.website" type="url" placeholder="https://example.org" :class="inputClass('website')" />
              </LicenseFormField>
              <LicenseFormField field="tax_id" label="Tax ID (NPWP)" :required="required('tax_id')" :error="fieldError('tax_id')" :icon="Receipt" v-slot="{ id }">
                <input :id="id" v-model="form.tax_id" type="text" placeholder="00.000.000.0-000.000" :class="inputClass('tax_id')" />
              </LicenseFormField>
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
            <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <div class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center shrink-0">
                <component :is="sections.contact.icon" class="w-4 h-4 text-ui-muted" />
              </div>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">{{ sections.contact.title }}</h3>
                <p class="text-ui-cap text-ui-muted">{{ sections.contact.subtitle }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
              <LicenseFormField field="contact_name" label="Name" :required="required('contact_name')" :error="fieldError('contact_name')" :icon="User" v-slot="{ id }">
                <input :id="id" v-model="form.contact_name" type="text" autocomplete="name" placeholder="e.g. Budi Santoso" :class="inputClass('contact_name')" />
              </LicenseFormField>
              <LicenseFormField field="contact_position" label="Position" :required="required('contact_position')" :error="fieldError('contact_position')" :icon="Briefcase" v-slot="{ id }">
                <input :id="id" v-model="form.contact_position" type="text" placeholder="e.g. Secretary" :class="inputClass('contact_position')" />
              </LicenseFormField>
              <LicenseFormField field="licensee_email" label="Email" :required="required('licensee_email')" :error="fieldError('licensee_email')" :icon="Mail" v-slot="{ id }">
                <input :id="id" v-model="form.licensee_email" type="email" autocomplete="email" placeholder="contact@example.org" :class="inputClass('licensee_email')" />
              </LicenseFormField>
              <LicenseFormField field="phone" label="Phone / WhatsApp" :required="required('phone')" :error="fieldError('phone')" :icon="Phone" v-slot="{ id }">
                <input :id="id" v-model="form.phone" type="tel" autocomplete="tel" placeholder="+62 812-3456-7890" :class="inputClass('phone')" />
              </LicenseFormField>
            </div>
          </section>

          <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
            <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
              <div class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center shrink-0">
                <component :is="sections.address.icon" class="w-4 h-4 text-ui-muted" />
              </div>
              <div class="min-w-0">
                <h3 class="text-ui-h2 text-ui-ink">{{ sections.address.title }}</h3>
                <p class="text-ui-cap text-ui-muted">{{ sections.address.subtitle }}</p>
              </div>
            </div>
            <LicenseLocationFields v-model="form" :category="category" :errors="errors" :input-class="inputClass" />
          </section>
        </template>

        <!-- 4. License terms -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
          <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
            <div class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center shrink-0">
              <component :is="sections.terms.icon" class="w-4 h-4 text-ui-muted" />
            </div>
            <div class="min-w-0">
              <h3 class="text-ui-h2 text-ui-ink">{{ sections.terms.title }}</h3>
              <p class="text-ui-cap text-ui-muted">{{ sections.terms.subtitle }}</p>
            </div>
          </div>

          <div v-if="isLifetimePlan" data-field="type" class="flex items-center gap-3 p-3.5 mb-5 rounded-ui-card border border-ui-accent/20 bg-ui-accent-soft">
            <InfinityIcon class="w-5 h-5 text-ui-accent shrink-0" />
            <div>
              <p class="text-ui-h3 text-ui-ink">Lifetime &middot; never expires</p>
              <p class="text-ui-cap text-ui-muted">One-time payment; no duration or expiry date.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5 mb-5">
            <div v-if="isLifetimePlan">
              <LicenseFormField
                field="updates_major"
                label="Covers Major Version"
                :error="fieldError('updates_major')"
                hint="Lifetime covers one major version and its updates; raise it after a paid upgrade."
                v-slot="{ id }"
              >
                <input
                  :id="id"
                  v-model.number="form.updates_major"
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  :placeholder="product?.current_major ? String(product.current_major) : '1'"
                  :class="[inputClass('updates_major', false), 'tabular-nums']"
                />
              </LicenseFormField>
            </div>

            <div v-else data-field="duration" class="min-w-0">
              <p class="block text-ui-small font-medium text-ui-ink mb-1.5">Duration <span class="text-ui-bad">*</span></p>
              <!-- Segmented control: the plan's main presets -->
              <div class="flex p-1 bg-ui-subtle border border-ui-line rounded-ui-card" role="radiogroup" aria-label="Duration">
                <button
                  v-for="opt in durations.primary"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="form.duration === opt.value"
                  @click="form.duration = opt.value"
                  class="flex-1 h-8 px-3 rounded-ui-control text-ui-small font-medium whitespace-nowrap transition-colors"
                  :class="form.duration === opt.value ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
                >
                  {{ opt.label }}
                </button>
              </div>
              <div v-if="durations.secondary.length" class="flex items-center gap-1.5 mt-2">
                <span class="text-ui-cap text-ui-muted">or</span>
                <button
                  v-for="opt in durations.secondary"
                  :key="opt.value"
                  type="button"
                  @click="form.duration = opt.value"
                  class="h-7 px-2.5 rounded-full border text-ui-cap font-medium transition-colors"
                  :class="form.duration === opt.value ? 'bg-ui-ink border-ui-ink text-white' : 'bg-ui-surface border-ui-line text-ui-text hover:bg-ui-hover'"
                  :aria-pressed="form.duration === opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>

              <p v-if="period.end && form.duration !== 'custom'" class="text-ui-cap text-ui-muted mt-2">
                {{ isEdit ? "New expiry" : "Expires" }} on approximately
                <span class="font-medium text-ui-ink">{{ period.end }}</span> (counted from today).
              </p>

              <div v-if="form.duration === 'custom'" data-field="expires_at" class="mt-3">
                <label for="license-expires_at" class="block text-ui-small font-medium text-ui-ink mb-1.5">
                  Expiry Date <span class="text-ui-bad">*</span>
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <CalendarClock class="w-4 h-4 text-ui-faint" />
                  </div>
                  <input
                    id="license-expires_at"
                    v-model="form.expires_at"
                    type="date"
                    :min="isEdit ? undefined : minCustomDate"
                    :class="inputClass('expires_at')"
                  />
                </div>
              </div>
              <p v-if="fieldError('duration')" class="text-ui-cap text-ui-bad mt-1.5">{{ fieldError("duration") }}</p>
              <p v-if="fieldError('expires_at')" class="text-ui-cap text-ui-bad mt-1.5">{{ fieldError("expires_at") }}</p>
            </div>

            <div data-field="max_devices">
              <label for="license-max_devices" class="block text-ui-small font-medium text-ui-ink mb-1.5">
                Max Devices <span class="text-ui-bad">*</span>
              </label>
              <div
                class="inline-flex items-center border rounded-ui-control bg-ui-surface overflow-hidden"
                :class="fieldError('max_devices') ? 'border-ui-bad/50' : 'border-ui-line-strong'"
              >
                <button
                  type="button"
                  @click="stepDevices(-1)"
                  :disabled="Number(form.max_devices) <= 1"
                  class="w-10 h-[38px] flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink disabled:opacity-40"
                  aria-label="One device fewer"
                >
                  <Minus class="w-4 h-4" />
                </button>
                <input
                  id="license-max_devices"
                  v-model.number="form.max_devices"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  class="w-14 h-[38px] text-center text-ui-body font-semibold text-ui-ink tabular-nums bg-ui-surface border-x border-ui-line focus:outline-none focus:shadow-ui-focus [appearance:textfield]"
                />
                <button
                  type="button"
                  @click="stepDevices(1)"
                  :disabled="Number(form.max_devices) >= 100"
                  class="w-10 h-[38px] flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink disabled:opacity-40"
                  aria-label="One device more"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>
              <p v-if="!fieldError('max_devices')" class="text-ui-cap text-ui-muted mt-1.5">
                {{
                  perDevice
                    ? isEdit
                      ? "One key per device; raising it adds keys."
                      : `${Number(form.max_devices) || 0} unique key(s) are generated, one per device.`
                    : "Devices that can use this key at once."
                }}
              </p>
              <p v-else class="text-ui-cap text-ui-bad mt-1.5">{{ fieldError("max_devices") }}</p>
            </div>
          </div>
          <p v-if="fieldError('type')" class="text-ui-cap text-ui-bad -mt-3 mb-5">{{ fieldError("type") }}</p>

          <!-- Key mode: one key per device or one shared key -->
          <div data-field="key_mode" class="mb-4">
            <p class="block text-ui-small font-medium text-ui-ink mb-1.5">Keys</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                v-for="option in KEY_MODE_OPTIONS"
                :key="option.value"
                type="button"
                :disabled="isEdit && form.key_mode !== option.value"
                @click="selectKeyMode(option.value)"
                :class="[optionCard(form.key_mode === option.value), 'items-start gap-3 px-3.5 py-3']"
                :aria-pressed="form.key_mode === option.value"
              >
                <component :is="keyModeIcon(option.value)" class="w-4 h-4 text-ui-muted shrink-0 mt-0.5" />
                <span class="flex-1 min-w-0">
                  <span class="block text-ui-h3 text-ui-ink">{{ option.label }}</span>
                  <span class="block text-ui-cap text-ui-muted">{{ option.note }}</span>
                </span>
                <Lock v-if="isEdit && form.key_mode === option.value" class="w-4 h-4 text-ui-muted shrink-0" />
                <Check v-else-if="form.key_mode === option.value" class="w-4 h-4 text-ui-ink shrink-0" />
              </button>
            </div>
            <p v-if="isEdit" class="text-ui-cap text-ui-muted mt-2">The key mode is set when the license is created.</p>
            <p v-if="fieldError('key_mode')" class="text-ui-cap text-ui-bad mt-2">{{ fieldError("key_mode") }}</p>
          </div>

          <div data-field="is_active" class="flex items-center justify-between gap-4 px-3.5 py-3 border border-ui-line rounded-ui-card">
            <div class="flex items-center gap-3 min-w-0">
              <Power class="w-4 h-4 text-ui-muted shrink-0" />
              <div class="min-w-0">
                <p class="text-ui-h3 text-ui-ink">{{ form.is_active ? "Active" : "Inactive" }}</p>
                <p class="text-ui-cap text-ui-muted">Inactive keys are rejected on the next check.</p>
              </div>
            </div>
            <LicenseStatusSwitch v-model="form.is_active" :label="null" />
          </div>
        </section>

        <!-- 5. Notes -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
          <div class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
            <div class="w-8 h-8 rounded-ui-control border border-ui-line flex items-center justify-center shrink-0">
              <component :is="sections.notes.icon" class="w-4 h-4 text-ui-muted" />
            </div>
            <div class="min-w-0">
              <h3 class="text-ui-h2 text-ui-ink">{{ sections.notes.title }}</h3>
              <p class="text-ui-cap text-ui-muted">{{ sections.notes.subtitle }}</p>
            </div>
          </div>
          <LicenseFormField field="notes" label="Internal Notes" :error="fieldError('notes')" v-slot="{ id }">
            <textarea
              :id="id"
              v-model="form.notes"
              rows="3"
              placeholder="Invoice number, event, payment..."
              :class="[inputClass('notes', false), 'resize-y']"
            ></textarea>
          </LicenseFormField>
        </section>
      </div>

      <!-- ===================== Summary (sticky on lg) ===================== -->
      <aside class="lg:col-span-4 lg:sticky lg:top-3 space-y-5 min-w-0 ui-anim-fade-up">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card px-5 pt-5 pb-4 min-w-0">
          <div class="flex items-center gap-3 mb-2">
            <ProductIcon :product="product" :size="32" />
            <div class="min-w-0">
              <p class="text-ui-cap text-ui-muted">Summary</p>
              <p class="text-ui-h3 text-ui-ink truncate">{{ product?.name || "—" }}</p>
            </div>
          </div>

          <dl class="divide-y divide-ui-line text-ui-small">
            <div class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-ui-muted">Platform</dt>
              <dd class="text-ui-ink">{{ platformInfo?.label || "—" }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-ui-muted">Plan</dt>
              <dd class="text-ui-ink text-right">
                {{ planInfo?.label || "—" }}<span v-if="!isOrganization" class="text-ui-muted"> &middot; {{ categoryLabel({ plan: form.plan }) }}</span>
              </dd>
            </div>
            <div class="flex items-start justify-between gap-3 py-2.5">
              <dt class="text-ui-muted shrink-0">{{ isOrganization ? "Organization" : "Licensee" }}</dt>
              <dd class="text-right min-w-0 break-words" :class="form.licensee_name ? 'text-ui-ink' : 'text-ui-faint'">{{ display(form.licensee_name) }}</dd>
            </div>
            <div class="flex items-start justify-between gap-3 py-2.5">
              <dt class="text-ui-muted shrink-0">Email</dt>
              <dd class="text-right min-w-0 break-all" :class="form.licensee_email ? 'text-ui-ink' : 'text-ui-faint'">{{ display(form.licensee_email) }}</dd>
            </div>
            <div class="flex items-start justify-between gap-3 py-2.5">
              <dt class="text-ui-muted shrink-0">Phone</dt>
              <dd class="text-right min-w-0" :class="form.phone ? 'text-ui-ink' : 'text-ui-faint'">{{ display(form.phone) }}</dd>
            </div>
            <div class="flex items-start justify-between gap-3 py-2.5">
              <dt class="text-ui-muted shrink-0">Address</dt>
              <dd class="text-right min-w-0 break-words" :class="fullAddress ? 'text-ui-ink' : 'text-ui-faint'">{{ display(fullAddress) }}</dd>
            </div>
            <div class="flex items-start justify-between gap-3 py-2.5">
              <dt class="text-ui-muted shrink-0">Active period</dt>
              <dd v-if="period.lifetime" class="text-ui-ink text-right">Lifetime &middot; never expires</dd>
              <dd v-else class="text-ui-ink text-right tabular-nums">
                {{ period.start }} &rarr;
                <template v-if="period.end">{{ period.end }}</template>
                <span v-else class="text-ui-faint">pick a date</span>
                <span v-if="period.days !== null" class="block text-ui-cap text-ui-muted">{{ period.days }} days</span>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-ui-muted">Max devices</dt>
              <dd class="text-ui-ink tabular-nums">{{ display(form.max_devices) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-ui-muted">Keys</dt>
              <dd class="text-ui-ink text-right">{{ perDevice ? `${display(form.max_devices)}, one per device` : "One shared key" }}</dd>
            </div>
          </dl>

          <div class="pt-3 border-t border-ui-line">
            <p class="text-ui-over uppercase text-ui-muted mb-1.5">
              {{ licenseKey ? (perDevice ? "Key 1" : "Key") : keyPreviews.length > 1 ? "Key previews (2 platforms)" : perDevice ? "Key 1 preview" : "Key preview" }}
            </p>
            <div class="space-y-1.5">
              <p
                v-for="preview in keyPreviews"
                :key="preview"
                class="font-mono text-ui-cap font-medium tracking-wide text-ui-ink bg-ui-subtle border border-dashed border-ui-line-strong rounded-ui-control px-3 py-2 break-all"
              >
                {{ preview }}
              </p>
            </div>
            <p v-if="perDevice && !licenseKey && Number(form.max_devices) > 1" class="text-ui-cap text-ui-muted mt-1.5">
              + {{ Number(form.max_devices) - 1 }} more key(s){{ keyPreviews.length > 1 ? " per platform" : "" }} with the same number.
            </p>
          </div>
        </section>

        <!-- Required fields -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-2.5">
            <h3 class="text-ui-h3 text-ui-ink">Required fields</h3>
            <span class="text-ui-cap font-medium px-2 py-0.5 rounded-full tabular-nums" :class="allDone ? 'bg-ui-ok-soft text-ui-ok' : 'bg-ui-warn-soft text-ui-warn'">
              {{ doneCount }} of {{ checklist.length }}
            </span>
          </div>
          <div class="h-1 w-full bg-ui-subtle rounded-full overflow-hidden mb-3" role="progressbar" :aria-valuenow="doneCount" aria-valuemin="0" :aria-valuemax="checklist.length" aria-label="Required fields complete">
            <div class="h-full rounded-full transition-all duration-ui-slow" :class="allDone ? 'bg-ui-ok' : 'bg-ui-ink'" :style="{ width: `${(doneCount / checklist.length) * 100}%` }"></div>
          </div>
          <ul class="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <li v-for="item in checklist" :key="item.field" class="flex items-center gap-1.5 text-ui-cap min-w-0">
              <Check v-if="item.done" class="w-3.5 h-3.5 text-ui-ok shrink-0" />
              <Circle v-else class="w-3.5 h-3.5 text-ui-line-strong shrink-0" />
              <span class="truncate" :class="item.done ? 'text-ui-text' : 'text-ui-faint'">{{ item.label }}</span>
            </li>
          </ul>
        </section>

        <UiButton type="submit" size="lg" block :icon="Check" :loading="loading">{{ loading ? "Saving..." : submitLabel }}</UiButton>
      </aside>
    </div>
  </form>
</template>
