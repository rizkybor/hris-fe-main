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
import { storeToRefs } from "pinia";
import { useTeamStore } from "@/stores/team";
import { getRoleLabel } from "@/utils/badgeUtils";

interface Props {
  step1Data: any;
  step2Data: any;
  step3Data: any;
}

const props = defineProps<Props>();

// Format date to readable format
const formatDate = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
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

// Presentation only: show the team's name (teams are already loaded by the
// Job step) instead of its raw id, and the role's display label.
const { teams } = storeToRefs(useTeamStore());
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
          <h3 class="text-ui-h2 text-ui-ink">Review Employee Information</h3>
          <p class="text-ui-small text-ui-muted mt-0.5">
            Please review all information before submitting
          </p>
        </div>
      </div>
      <!-- Profile Photo + identity -->
      <div class="mt-5 flex items-center gap-4 p-4 rounded-ui-control bg-ui-subtle border border-ui-line">
        <Avatar :src="step1Data.profile_photo_url" :alt="step1Data.name" size="w-14 h-14" />
        <div class="min-w-0">
          <p class="text-ui-cap text-ui-muted">Profile Photo</p>
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
          <h3 class="text-ui-h2 text-ui-ink">Personal Information</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">Employee basic details</p>
        </div>
      </header>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Full Name</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.name || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Email Address</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.email || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Identity Number</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ step1Data.identity_number || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Phone Number</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ step1Data.phone || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Gender</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatText(step1Data.gender) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Date of Birth</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatDate(step1Data.date_of_birth) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Place of Birth</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.place_of_birth || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Hobby</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.hobby || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line sm:col-span-2">
            <dt class="text-ui-cap text-ui-muted">Address</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.address || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">City</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step1Data.city || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Postal Code</dt>
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
          <h3 class="text-ui-h2 text-ui-ink">Job Information</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">Position and employment details</p>
        </div>
      </header>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Job Title</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step2Data.job_title || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Role</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ roleLabel }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Team</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ teamLabel }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Years of Experience</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step2Data.years_experience ? `${step2Data.years_experience} years` : "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Status</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatText(step2Data.status) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Employment Type</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatText(step2Data.employment_type) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Work Location</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatText(step2Data.work_location) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Start Date</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatDate(step2Data.start_date) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Monthly Salary</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ formatCurrency(step2Data.monthly_salary) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Skill Level</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatText(step2Data.skill_level) }}</dd>
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
          <h3 class="text-ui-h2 text-ui-ink">Bank Information</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">Banking details for payroll</p>
        </div>
      </header>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Bank Name</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatText(step2Data.bank_name) }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Account Number</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ step2Data.account_number || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Account Holder Name</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step2Data.account_holder_name || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Bank Branch</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step2Data.bank_branch || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Account Type</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ formatText(step2Data.account_type) }}</dd>
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
          <h3 class="text-ui-h2 text-ui-ink">Emergency Contact</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">Person to contact in emergency</p>
        </div>
      </header>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Full Name</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.emergency_contact_name || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Relationship</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.emergency_contact_relationship || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Phone Number</dt>
            <dd class="text-ui-body text-ui-ink break-words tabular-nums mt-0.5">{{ step3Data.emergency_contact_phone || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Email Address</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.emergency_contact_email || "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line">
            <dt class="text-ui-cap text-ui-muted">Preferred Language</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.preferred_language ? formatText(step3Data.preferred_language) : "-" }}</dd>
          </div>
          <div class="min-w-0 py-3 border-b border-ui-line sm:col-span-2" v-if="step3Data.additional_notes">
            <dt class="text-ui-cap text-ui-muted">Additional Notes</dt>
            <dd class="text-ui-body text-ui-ink break-words mt-0.5">{{ step3Data.additional_notes }}</dd>
          </div>
      </dl>
    </section>
    </div>
  </div>
</template>
