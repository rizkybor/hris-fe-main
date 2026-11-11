<script setup>
// Full-width create / edit layout for a license: header row with actions,
// the form sections on the left (8/12 on lg) and a sticky live "License
// summary" on the right (4/12). Below lg everything stacks and a sticky
// bottom bar carries the primary button. The parent owns submission.
import { computed, nextTick, ref, watch } from "vue";
import {
  ArrowLeft,
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
  CalendarRange,
  Infinity as InfinityIcon,
  MonitorSmartphone,
  FileText,
  Save,
  Power,
  BadgeCheck,
  KeyRound,
  Minus,
  Plus,
  CheckCircle2,
  Circle,
  ListChecks,
  Laptop,
  Tablet,
  Lock,
  Layers,
} from "lucide-vue-next";
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
  platformChipClass,
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
  planChipClass,
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

const inputClass = (field, withIcon = true) => [
  "w-full pr-4 py-3 border rounded-[12px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-300 font-semibold bg-white",
  withIcon ? "pl-12" : "pl-4",
  fieldError(field) ? "border-red-500" : "border-[#DCDEDD]",
];

const card = "bg-white border border-[#DCDEDD] rounded-[16px] p-5 sm:p-6";
const cardHeader = "flex items-center gap-2.5 mb-5";
const cardIcon = "w-9 h-9 bg-violet-50 rounded-[10px] flex items-center justify-center shrink-0";
const primaryBtn =
  "btn-primary rounded-[12px] border border-violet-800 hover:brightness-110 focus:ring-2 focus:ring-violet-500 transition-all duration-300 bg-gradient-to-r from-violet-600 to-indigo-700 shadow-[inset_-2px_2px_1px_0_rgba(167,139,250,0.55),inset_2px_2px_1px_0_rgba(167,139,250,0.35)] px-5 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50";
const secondaryBtn =
  "border border-[#DCDEDD] bg-white rounded-[12px] hover:border-violet-400 hover:bg-violet-50/30 transition-all duration-300 px-5 py-2.5 text-sm text-brand-dark font-semibold";
</script>

<template>
  <form ref="formEl" novalidate @submit.prevent="emit('submit')">
    <!-- ===================== Header row ===================== -->
    <div class="bg-white border border-[#DCDEDD] rounded-[16px] px-4 py-4 sm:px-5 mb-5">
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          @click="emit('cancel')"
          class="bg-white w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-violet-400 transition-all shrink-0"
          aria-label="Back"
        >
          <ArrowLeft class="w-5 h-5 text-gray-600" />
        </button>
        <ProductIcon :product="product" :size="40" />
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-brand-dark text-xl font-bold">{{ title }}</h1>
            <span
              v-if="licenseKey"
              class="inline-flex items-center gap-1.5 bg-slate-50 border border-[#DCDEDD] rounded-[10px] pl-3 pr-1 py-0.5"
            >
              <span class="font-mono text-xs font-bold tracking-wider text-brand-dark">{{ licenseKey }}</span>
              <CopyKeyButton :value="licenseKey" />
            </span>
          </div>
          <p v-if="subtitle" class="text-brand-light text-sm">{{ subtitle }}</p>
        </div>
        <div class="hidden sm:flex items-center gap-2">
          <button type="button" @click="emit('cancel')" :class="secondaryBtn">Cancel</button>
          <button type="submit" :disabled="loading" :class="primaryBtn">
            <Save class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">{{ loading ? "Saving..." : submitLabel }}</span>
          </button>
        </div>
      </div>
    </div>

    <slot name="alerts" />

    <!-- ===================== Body ===================== -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <!-- Form sections -->
      <div class="lg:col-span-8 space-y-5 min-w-0">
        <!-- 1. Plan -->
        <section data-field="plan" :class="card">
          <div :class="cardHeader">
            <div :class="cardIcon"><BadgeCheck class="w-[18px] h-[18px] text-violet-600" /></div>
            <h4 class="text-brand-dark font-bold">Plan <span class="text-red-500">*</span></h4>
          </div>

          <!-- Platform: Mac or iPad, fixed after create -->
          <div data-field="platform" class="mb-4">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-brand-light mb-2">Platform</p>
            <div class="grid gap-3" :class="isEdit ? 'grid-cols-2 sm:max-w-md' : 'grid-cols-1 sm:grid-cols-3'">
              <button
                v-for="option in platformChoices"
                :key="option.value"
                type="button"
                :disabled="isEdit && form.platform !== option.value"
                @click="selectPlatform(option.value)"
                class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] border-2 bg-white text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                :class="form.platform === option.value ? 'border-violet-500 ring-2 ring-violet-500/20 bg-violet-50/40' : 'border-[#DCDEDD] hover:border-violet-300'"
                :aria-pressed="form.platform === option.value"
              >
                <component :is="platformIcon(option.value)" class="w-[18px] h-[18px] text-violet-600 shrink-0" />
                <span class="flex-1 min-w-0">
                  <span class="block text-sm font-bold text-brand-dark">{{ option.label }}</span>
                  <span class="block text-xs text-brand-light">{{ option.note }}</span>
                </span>
                <Lock v-if="isEdit && form.platform === option.value" class="w-4 h-4 text-brand-light shrink-0" />
                <CheckCircle2 v-else-if="form.platform === option.value" class="w-[18px] h-[18px] text-violet-600 shrink-0" />
              </button>
            </div>
            <p v-if="isEdit" class="text-xs text-brand-light mt-2">The platform is part of the key, so it cannot be changed.</p>
            <p v-if="fieldError('platform')" class="text-xs text-red-600 mt-2">{{ fieldError("platform") }}</p>
          </div>

          <!-- Group labels above their cards (md and up) -->
          <div class="hidden md:grid gap-3 mb-2" :class="individualCount === 3 ? 'grid-cols-4' : 'grid-cols-3'">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-brand-light" :class="individualCount === 3 ? 'col-span-3' : 'col-span-2'">
              Individual
            </p>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-brand-light">Organization</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" :class="individualCount === 3 ? 'md:grid-cols-4' : 'md:grid-cols-3'">
            <template v-for="group in planGroups" :key="group.label">
              <button
                v-for="plan in group.plans"
                :key="plan.value"
                type="button"
                @click="selectPlan(plan.value)"
                class="relative flex flex-col items-start gap-2 p-4 rounded-[12px] border-2 bg-white text-left transition-all h-full"
                :class="form.plan === plan.value ? 'border-violet-500 ring-2 ring-violet-500/20 bg-violet-50/40' : 'border-[#DCDEDD] hover:border-violet-300'"
                :aria-pressed="form.plan === plan.value"
              >
                <div class="flex items-center gap-2 w-full">
                  <component :is="plan.category === 'organization' ? Building2 : User" class="w-[18px] h-[18px] text-violet-600 shrink-0" />
                  <p class="text-sm font-bold text-brand-dark flex-1">{{ plan.label }}</p>
                  <CheckCircle2 v-if="form.plan === plan.value" class="w-[18px] h-[18px] text-violet-600 shrink-0" />
                </div>
                <p class="text-xs text-brand-light leading-snug">{{ plan.note }}</p>
              </button>
            </template>
          </div>
          <p v-if="fieldError('plan')" class="text-xs text-red-600 mt-2">{{ fieldError("plan") }}</p>
          <div
            v-if="planChanged"
            class="mt-3 flex items-start gap-2.5 p-3 rounded-[12px] border border-amber-200 bg-amber-50 text-amber-800"
          >
            <KeyRound class="w-4 h-4 shrink-0 mt-0.5" />
            <p class="text-xs leading-relaxed">
              <span class="font-semibold">A new license key will be generated.</span>
              The current key{{ perDevice ? "s" : "" }} stop working and every device has to activate again with the new key.
              Send the licensee the new certificate after saving.
            </p>
          </div>
        </section>

        <!-- 2-3. Individual: Licensee + Location -->
        <template v-if="!isOrganization">
          <section :class="card">
            <div :class="cardHeader">
              <div :class="cardIcon"><IdCard class="w-[18px] h-[18px] text-violet-600" /></div>
              <h4 class="text-brand-dark font-bold">Licensee</h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          <section :class="card">
            <div :class="cardHeader">
              <div :class="cardIcon"><MapPin class="w-[18px] h-[18px] text-violet-600" /></div>
              <h4 class="text-brand-dark font-bold">Location</h4>
            </div>
            <LicenseLocationFields v-model="form" :category="category" :errors="errors" :input-class="inputClass" />
          </section>
        </template>

        <!-- 2-3. Organization: Organization + Contact person + Address -->
        <template v-else>
          <section :class="card">
            <div :class="cardHeader">
              <div :class="cardIcon"><Building2 class="w-[18px] h-[18px] text-violet-600" /></div>
              <h4 class="text-brand-dark font-bold">Organization</h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <LicenseFormField field="licensee_name" label="Organization Name" :required="required('licensee_name')" :error="fieldError('licensee_name')" :icon="Building2" wide v-slot="{ id }">
                <input :id="id" v-model="form.licensee_name" type="text" autocomplete="organization" placeholder="e.g. Jakarta Orienteering Club" :class="inputClass('licensee_name')" />
              </LicenseFormField>

              <div data-field="organization_type" class="md:col-span-2">
                <p class="block text-brand-dark text-sm font-semibold mb-1.5">
                  Type <span v-if="required('organization_type')" class="text-red-500">*</span>
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    v-for="opt in ORGANIZATION_TYPE_OPTIONS"
                    :key="opt.value"
                    type="button"
                    @click="form.organization_type = opt.value"
                    class="px-4 py-2.5 rounded-[12px] border-2 text-sm font-semibold bg-white transition-all"
                    :class="
                      form.organization_type === opt.value
                        ? 'border-violet-500 ring-2 ring-violet-500/20 text-violet-700'
                        : fieldError('organization_type')
                          ? 'border-red-300 text-brand-dark'
                          : 'border-[#DCDEDD] text-brand-dark hover:border-violet-300'
                    "
                    :aria-pressed="form.organization_type === opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <p v-if="fieldError('organization_type')" class="text-xs text-red-600 mt-1.5">{{ fieldError("organization_type") }}</p>
              </div>

              <LicenseFormField field="member_count" label="Member Count" :required="required('member_count')" :error="fieldError('member_count')" :icon="Users" v-slot="{ id }">
                <input :id="id" v-model.number="form.member_count" type="number" min="1" step="1" placeholder="e.g. 120" :class="inputClass('member_count')" />
              </LicenseFormField>
              <LicenseFormField field="website" label="Website" :required="required('website')" :error="fieldError('website')" :icon="Link2" v-slot="{ id }">
                <input :id="id" v-model="form.website" type="url" placeholder="https://example.org" :class="inputClass('website')" />
              </LicenseFormField>
              <LicenseFormField field="tax_id" label="Tax ID (NPWP)" :required="required('tax_id')" :error="fieldError('tax_id')" :icon="Receipt" v-slot="{ id }">
                <input :id="id" v-model="form.tax_id" type="text" placeholder="00.000.000.0-000.000" :class="inputClass('tax_id')" />
              </LicenseFormField>
            </div>
          </section>

          <section :class="card">
            <div :class="cardHeader">
              <div :class="cardIcon"><Contact class="w-[18px] h-[18px] text-violet-600" /></div>
              <h4 class="text-brand-dark font-bold">Contact Person</h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          <section :class="card">
            <div :class="cardHeader">
              <div :class="cardIcon"><MapPin class="w-[18px] h-[18px] text-violet-600" /></div>
              <h4 class="text-brand-dark font-bold">Address</h4>
            </div>
            <LicenseLocationFields v-model="form" :category="category" :errors="errors" :input-class="inputClass" />
          </section>
        </template>

        <!-- 4. License terms -->
        <section :class="card">
          <div :class="cardHeader">
            <div :class="cardIcon"><CalendarClock class="w-[18px] h-[18px] text-violet-600" /></div>
            <h4 class="text-brand-dark font-bold">License Terms</h4>
          </div>

          <div
            v-if="isLifetimePlan"
            data-field="type"
            class="flex items-center gap-3 p-4 mb-5 rounded-[12px] border border-violet-200 bg-violet-50/60"
          >
            <InfinityIcon class="w-5 h-5 text-violet-600 shrink-0" />
            <div>
              <p class="text-sm font-bold text-brand-dark">Lifetime &middot; never expires</p>
              <p class="text-xs text-brand-light">One-time payment; no duration or expiry date.</p>
            </div>
          </div>

          <div v-if="isLifetimePlan" class="mb-5 max-w-xs">
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
                :class="inputClass('updates_major', false)"
              />
            </LicenseFormField>
          </div>

          <div v-else data-field="duration" class="mb-5">
            <p class="block text-brand-dark text-sm font-semibold mb-1.5">Duration <span class="text-red-500">*</span></p>
            <div class="flex flex-wrap items-center gap-3">
              <!-- Segmented control: the plan's main presets -->
              <div class="inline-flex p-1 bg-slate-100 border border-[#DCDEDD] rounded-[12px]" role="radiogroup" aria-label="Duration">
                <button
                  v-for="opt in durations.primary"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="form.duration === opt.value"
                  @click="form.duration = opt.value"
                  class="px-4 py-2 rounded-[9px] text-sm font-semibold transition-all"
                  :class="form.duration === opt.value ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-200' : 'text-brand-light hover:text-brand-dark'"
                >
                  {{ opt.label }}
                </button>
              </div>
              <div v-if="durations.secondary.length" class="flex items-center gap-1.5">
                <span class="text-xs text-brand-light">or</span>
                <button
                  v-for="opt in durations.secondary"
                  :key="opt.value"
                  type="button"
                  @click="form.duration = opt.value"
                  class="px-3 py-1.5 rounded-full border text-xs font-semibold transition-all"
                  :class="form.duration === opt.value ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-[#DCDEDD] text-brand-light hover:border-violet-400'"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <p v-if="period.end && form.duration !== 'custom'" class="text-xs text-brand-light mt-2">
              {{ isEdit ? "New expiry" : "Expires" }} on approximately
              <span class="font-semibold text-brand-dark">{{ period.end }}</span> (counted from today).
            </p>

            <div v-if="form.duration === 'custom'" data-field="expires_at" class="mt-4 max-w-xs">
              <label for="license-expires_at" class="block text-brand-dark text-sm font-semibold mb-1.5">
                Expiry Date <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <CalendarClock class="w-5 h-5 text-gray-400" />
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
            <p v-if="fieldError('duration')" class="text-xs text-red-600 mt-1.5">{{ fieldError("duration") }}</p>
            <p v-if="fieldError('expires_at')" class="text-xs text-red-600 mt-1.5">{{ fieldError("expires_at") }}</p>
          </div>
          <p v-if="fieldError('type')" class="text-xs text-red-600 -mt-3 mb-5">{{ fieldError("type") }}</p>

          <!-- Key mode: one key per device or one shared key -->
          <div data-field="key_mode" class="mb-5">
            <p class="block text-brand-dark text-sm font-semibold mb-1.5">Keys</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                v-for="option in KEY_MODE_OPTIONS"
                :key="option.value"
                type="button"
                :disabled="isEdit && form.key_mode !== option.value"
                @click="selectKeyMode(option.value)"
                class="flex items-start gap-2.5 px-3.5 py-3 rounded-[12px] border-2 bg-white text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                :class="form.key_mode === option.value ? 'border-violet-500 ring-2 ring-violet-500/20 bg-violet-50/40' : 'border-[#DCDEDD] hover:border-violet-300'"
                :aria-pressed="form.key_mode === option.value"
              >
                <component :is="keyModeIcon(option.value)" class="w-[18px] h-[18px] text-violet-600 shrink-0 mt-0.5" />
                <span class="flex-1 min-w-0">
                  <span class="block text-sm font-bold text-brand-dark">{{ option.label }}</span>
                  <span class="block text-xs text-brand-light leading-snug">{{ option.note }}</span>
                </span>
                <Lock v-if="isEdit && form.key_mode === option.value" class="w-4 h-4 text-brand-light shrink-0" />
                <CheckCircle2 v-else-if="form.key_mode === option.value" class="w-[18px] h-[18px] text-violet-600 shrink-0" />
              </button>
            </div>
            <p v-if="isEdit" class="text-xs text-brand-light mt-2">The key mode is set when the license is created.</p>
            <p v-if="fieldError('key_mode')" class="text-xs text-red-600 mt-2">{{ fieldError("key_mode") }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div data-field="max_devices">
              <label for="license-max_devices" class="block text-brand-dark text-sm font-semibold mb-1.5">
                Max Devices <span class="text-red-500">*</span>
              </label>
              <div
                class="inline-flex items-center border rounded-[12px] bg-white overflow-hidden"
                :class="fieldError('max_devices') ? 'border-red-500' : 'border-[#DCDEDD]'"
              >
                <button
                  type="button"
                  @click="stepDevices(-1)"
                  :disabled="Number(form.max_devices) <= 1"
                  class="w-11 h-12 flex items-center justify-center text-gray-600 hover:bg-violet-50 disabled:opacity-40"
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
                  class="w-16 h-12 text-center font-bold text-brand-dark border-x border-[#DCDEDD] focus:outline-none focus:ring-1 focus:ring-violet-500 [appearance:textfield]"
                />
                <button
                  type="button"
                  @click="stepDevices(1)"
                  :disabled="Number(form.max_devices) >= 100"
                  class="w-11 h-12 flex items-center justify-center text-gray-600 hover:bg-violet-50 disabled:opacity-40"
                  aria-label="One device more"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>
              <p v-if="!fieldError('max_devices')" class="text-xs text-brand-light mt-1.5">
                {{
                  perDevice
                    ? isEdit
                      ? "One key per device; raising it adds keys."
                      : `${Number(form.max_devices) || 0} unique key(s) are generated, one per device.`
                    : "Devices that can use this key at once."
                }}
              </p>
              <p v-else class="text-xs text-red-600 mt-1.5">{{ fieldError("max_devices") }}</p>
            </div>

            <div data-field="is_active">
              <p class="block text-brand-dark text-sm font-semibold mb-1.5">Status</p>
              <div class="flex items-center justify-between gap-4 p-3 bg-white border border-[#DCDEDD] rounded-[12px]">
                <div class="flex items-center gap-3">
                  <Power class="w-5 h-5 text-gray-400" />
                  <div>
                    <p class="text-sm font-semibold text-brand-dark">{{ form.is_active ? "Active" : "Inactive" }}</p>
                    <p class="text-xs text-brand-light">Inactive keys are rejected on the next check.</p>
                  </div>
                </div>
                <LicenseStatusSwitch v-model="form.is_active" />
              </div>
            </div>
          </div>
        </section>

        <!-- 5. Notes -->
        <section :class="card">
          <div :class="cardHeader">
            <div class="w-9 h-9 bg-gray-100 rounded-[10px] flex items-center justify-center shrink-0">
              <FileText class="w-[18px] h-[18px] text-gray-500" />
            </div>
            <h4 class="text-brand-dark font-bold">Notes</h4>
          </div>
          <LicenseFormField field="notes" label="Internal Notes" :error="fieldError('notes')" :icon="FileText" v-slot="{ id }">
            <textarea
              :id="id"
              v-model="form.notes"
              rows="3"
              placeholder="Invoice number, event, payment..."
              :class="[inputClass('notes'), 'font-normal resize-none']"
            ></textarea>
          </LicenseFormField>
        </section>
      </div>

      <!-- ===================== License summary (sticky on lg) ===================== -->
      <aside class="lg:col-span-4 lg:sticky lg:top-3 min-w-0">
        <div class="bg-white border border-[#DCDEDD] rounded-[16px] overflow-hidden">
          <div class="flex items-center gap-3 px-5 py-4 bg-gradient-to-br from-violet-50 to-white border-b border-[#DCDEDD]">
            <ProductIcon :product="product" :size="40" />
            <div class="min-w-0">
              <p class="text-xs text-brand-light">License summary</p>
              <p class="text-brand-dark font-bold truncate">{{ product?.name || "—" }}</p>
            </div>
          </div>

          <dl class="px-5 py-4 space-y-3.5 text-sm">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-brand-light">Platform</dt>
              <dd>
                <span v-if="platformInfo" class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="platformChipClass(form.platform)">
                  {{ platformInfo.label }}
                </span>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-brand-light">Plan</dt>
              <dd class="flex items-center gap-1.5 min-w-0">
                <span v-if="planInfo" class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="planChipClass(form.plan)">
                  {{ planInfo.label }}
                </span>
                <span v-if="!isOrganization" class="text-xs text-brand-light">{{ categoryLabel({ plan: form.plan }) }}</span>
              </dd>
            </div>
            <div class="flex items-start justify-between gap-3">
              <dt class="text-brand-light shrink-0">{{ isOrganization ? "Organization" : "Licensee" }}</dt>
              <dd class="text-right font-semibold min-w-0 break-words" :class="form.licensee_name ? 'text-brand-dark' : 'text-gray-300'">
                {{ display(form.licensee_name) }}
              </dd>
            </div>
            <div class="flex items-start justify-between gap-3">
              <dt class="text-brand-light shrink-0">Email</dt>
              <dd class="text-right min-w-0 break-all" :class="form.licensee_email ? 'text-brand-dark' : 'text-gray-300'">
                {{ display(form.licensee_email) }}
              </dd>
            </div>
            <div class="flex items-start justify-between gap-3">
              <dt class="text-brand-light shrink-0">Phone</dt>
              <dd class="text-right min-w-0" :class="form.phone ? 'text-brand-dark' : 'text-gray-300'">{{ display(form.phone) }}</dd>
            </div>
            <div class="flex items-start justify-between gap-3">
              <dt class="text-brand-light shrink-0">Address</dt>
              <dd class="text-right min-w-0 break-words" :class="fullAddress ? 'text-brand-dark' : 'text-gray-300'">{{ display(fullAddress) }}</dd>
            </div>

            <div class="pt-3.5 border-t border-[#F1F1F1]">
              <dt class="flex items-center gap-1.5 text-brand-light mb-1.5"><CalendarRange class="w-4 h-4" /> Active period</dt>
              <dd v-if="period.lifetime" class="flex items-center gap-1.5 font-semibold text-violet-700">
                <InfinityIcon class="w-4 h-4" /> Lifetime &middot; never expires
              </dd>
              <dd v-else class="text-brand-dark">
                <span class="font-semibold">{{ period.start }}</span>
                <span class="text-gray-400 mx-1">&rarr;</span>
                <span v-if="period.end" class="font-semibold">{{ period.end }}</span>
                <span v-else class="text-gray-300">pick a date</span>
                <span v-if="period.days !== null" class="block text-xs text-brand-light mt-0.5">{{ period.days }} days</span>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="flex items-center gap-1.5 text-brand-light"><MonitorSmartphone class="w-4 h-4" /> Max devices</dt>
              <dd class="font-semibold text-brand-dark">{{ display(form.max_devices) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="flex items-center gap-1.5 text-brand-light"><KeyRound class="w-4 h-4" /> Keys</dt>
              <dd class="font-semibold text-brand-dark text-right">
                {{ perDevice ? `${display(form.max_devices)} · one per device` : "One shared key" }}
              </dd>
            </div>
            <div class="pt-3.5 border-t border-[#F1F1F1]">
              <dt class="flex items-center gap-1.5 text-brand-light mb-1.5">
                <KeyRound class="w-4 h-4" />
                {{ licenseKey ? (perDevice ? "Key 1" : "Key") : keyPreviews.length > 1 ? "Key previews (2 platforms)" : perDevice ? "Key 1 preview" : "Key preview" }}
              </dt>
              <dd class="space-y-1.5">
                <p
                  v-for="preview in keyPreviews"
                  :key="preview"
                  class="font-mono text-xs font-bold tracking-wider text-brand-dark bg-slate-50 border border-dashed border-[#DCDEDD] rounded-[10px] px-3 py-2 break-all"
                >
                  {{ preview }}
                </p>
                <p v-if="perDevice && !licenseKey && Number(form.max_devices) > 1" class="text-[11px] text-brand-light">
                  + {{ Number(form.max_devices) - 1 }} more key(s){{ keyPreviews.length > 1 ? " per platform" : "" }} with the same number.
                </p>
              </dd>
            </div>

            <!-- Required fields -->
            <div class="pt-3.5 border-t border-[#F1F1F1]">
              <dt class="flex items-center justify-between gap-2 mb-2">
                <span class="flex items-center gap-1.5 text-brand-light"><ListChecks class="w-4 h-4" /> Required fields</span>
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  :class="allDone ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
                >
                  {{ doneCount }} of {{ checklist.length }} complete
                </span>
              </dt>
              <dd>
                <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2.5">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="allDone ? 'bg-emerald-500' : 'bg-amber-400'"
                    :style="{ width: `${(doneCount / checklist.length) * 100}%` }"
                  ></div>
                </div>
                <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-3 gap-y-1">
                  <li v-for="item in checklist" :key="item.field" class="flex items-center gap-1.5 text-xs">
                    <CheckCircle2 v-if="item.done" class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <Circle v-else class="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span :class="item.done ? 'text-brand-dark' : 'text-brand-light'">{{ item.label }}</span>
                  </li>
                </ul>
              </dd>
            </div>
          </dl>

          <div class="hidden lg:flex flex-col gap-2 px-5 pb-5">
            <button type="submit" :disabled="loading" :class="[primaryBtn, 'w-full py-3']">
              <Save class="w-4 h-4 text-white" />
              <span class="text-brand-white text-sm font-semibold">{{ loading ? "Saving..." : submitLabel }}</span>
            </button>
            <button type="button" @click="emit('cancel')" :class="[secondaryBtn, 'w-full']">Cancel</button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Sticky bottom bar below lg -->
    <div class="lg:hidden sticky bottom-0 z-20 -mx-3 mt-5 px-3 py-3 bg-white/95 backdrop-blur border-t border-[#DCDEDD] flex items-center gap-3">
      <span
        class="text-xs font-semibold px-2 py-1 rounded-full shrink-0"
        :class="allDone ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
      >
        {{ doneCount }}/{{ checklist.length }}
      </span>
      <button type="button" @click="emit('cancel')" :class="[secondaryBtn, 'hidden sm:block']">Cancel</button>
      <button type="submit" :disabled="loading" :class="[primaryBtn, 'flex-1 py-3']">
        <Save class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">{{ loading ? "Saving..." : submitLabel }}</span>
      </button>
    </div>
  </form>
</template>
