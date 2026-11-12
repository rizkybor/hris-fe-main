<script setup lang="ts">
import {
  User,
  Briefcase,
  Phone,
  CreditCard,
  CheckCircle,
} from "lucide-vue-next";
import Avatar from "@/components/common/Avatar.vue";
import { computed } from "vue";
import { useLookupStore } from "@/stores/lookups";
import { getRoleLabel } from "@/utils/badgeUtils";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t, te } = useI18n();

interface Props {
  step1Data: any;
  step2Data: any;
  step3Data: any;
}

const props = defineProps<Props>();

// Format date to readable format
const formatDate = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(localeTag(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatCurrency = (amount: string) => {
  if (!amount) return "-";
  const digits = String(amount).replace(/[^0-9]/g, "");
  if (!digits) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(parseInt(digits));
};

// Format text with capitalization
const formatText = (text: string) => {
  if (!text) return "-";
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/-/g, " ");
};

// Known enum values get a translated label; anything else keeps formatText.
const enumText = (group: string, value: string) => {
  const key = `employees.enums.${group}.${value}`;
  return value && te(key) ? t(key) : formatText(value);
};

// Presentation only: show the team's name (from the lookups cache the wizard
// loads) instead of its raw id, and the role's display label.
const lookups = useLookupStore();
const teams = computed<any[]>(() => lookups.teams);
const teamLabel = computed(() => {
  const id = props.step2Data.team_id;
  if (!id) return "-";
  const team = (teams.value || []).find((t: any) => String(t.id) === String(id));
  return team?.name || id;
});
const roleLabel = computed(() => (props.step2Data.role ? getRoleLabel(props.step2Data.role) : "-"));
</script>

<template>
  <div class="space-y-5 ui-stagger">
    <!-- Preview Header -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
      <div class="flex items-start gap-3">
        <span class="w-8 h-8 shrink-0 rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center">
          <CheckCircle class="w-4 h-4" />
        </span>
        <div class="min-w-0">
          <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.review.title") }}</h3>
          <p class="text-ui-small text-ui-muted mt-0.5">
            {{ $t("employees.review.subtitle") }}
          </p>
        </div>
      </div>
      <!-- Profile Photo + identity -->
      <div class="mt-5 flex items-center gap-4 p-4 rounded-ui-control bg-ui-subtle border border-ui-line">
        <Avatar :src="step1Data.profile_photo_url" :alt="step1Data.name" size="w-14 h-14" />
        <div class="min-w-0">
          <p class="text-ui-cap text-ui-muted">{{ $t("employees.review.profilePhoto") }}</p>
          <p class="text-ui-h3 text-ui-ink truncate">{{ step1Data.name || "-" }}</p>
          <p class="text-ui-small text-ui-muted truncate">
            {{ step2Data.job_title || "-" }} &middot; {{ step1Data.email || "-" }}
          </p>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
      <!-- Personal Information -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
      <header class="flex items-start gap-3 pb-1">
        <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
          <User class="w-4 h-4" />
        </span>
        <div class="min-w-0">
          <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.review.personal.title") }}</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.review.personal.subtitle") }}</p>
        </div>
      </header>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.fullName") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.name || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.email") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.email || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.identityNumber") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ step1Data.identity_number || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.phone") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ step1Data.phone || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.gender") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ enumText("gender", step1Data.gender) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.dateOfBirth") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatDate(step1Data.date_of_birth) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.placeOfBirth") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.place_of_birth || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.hobby") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.hobby || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line sm:col-span-2">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.address") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.address || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.city") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.city || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.postalCode") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ step1Data.postal_code || "-" }}</dd>
          </div>
      </dl>
    </section>

      <!-- Job Information -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
      <header class="flex items-start gap-3 pb-1">
        <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
          <Briefcase class="w-4 h-4" />
        </span>
        <div class="min-w-0">
          <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.review.job.title") }}</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.review.job.subtitle") }}</p>
        </div>
      </header>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.jobTitle") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step2Data.job_title || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.role") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ roleLabel }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.team") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ teamLabel }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.detail.fields.yearsExperience") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step2Data.years_experience ? $t("employees.review.years", { n: step2Data.years_experience }, Number(step2Data.years_experience) || 0) : "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.status") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ enumText("jobStatus", step2Data.status) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.employmentType") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ enumText("employmentType", step2Data.employment_type) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.workLocation") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ enumText("workLocation", step2Data.work_location) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.startDate") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatDate(step2Data.start_date) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.detail.fields.monthlySalary") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ formatCurrency(step2Data.monthly_salary) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.skillLevel") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ enumText("skillLevel", step2Data.skill_level) }}</dd>
          </div>
      </dl>
    </section>

      <!-- Bank Information -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
      <header class="flex items-start gap-3 pb-1">
        <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
          <CreditCard class="w-4 h-4" />
        </span>
        <div class="min-w-0">
          <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.review.bank.title") }}</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.review.bank.subtitle") }}</p>
        </div>
      </header>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.detail.fields.bankName") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatText(step2Data.bank_name) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.detail.fields.accountNumber") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ step2Data.account_number || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.accountHolder") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step2Data.account_holder_name || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.bankBranch") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step2Data.bank_branch || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.detail.fields.accountType") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ enumText("accountType", step2Data.account_type) }}</dd>
          </div>
      </dl>
    </section>

      <!-- Emergency Contact -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
      <header class="flex items-start gap-3 pb-1">
        <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
          <Phone class="w-4 h-4" />
        </span>
        <div class="min-w-0">
          <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.review.emergency.title") }}</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.review.emergency.subtitle") }}</p>
        </div>
      </header>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.fullName") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.emergency_contact_name || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.relationship") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.emergency_contact_relationship || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.phone") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ step3Data.emergency_contact_phone || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.review.email") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.emergency_contact_email || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.preferredLanguage") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.preferred_language ? enumText("language", step3Data.preferred_language) : "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line sm:col-span-2" v-if="step3Data.additional_notes">
            <dt class="text-ui-cap text-ui-muted">{{ $t("employees.form.fields.additionalNotes") }}</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.additional_notes }}</dd>
          </div>
      </dl>
    </section>
    </div>
  </div>
</template>
