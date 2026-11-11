<script setup>
// Self-service profile: account (name, password, photo) plus the employee
// details an employee may change themselves -- personal data, address,
// emergency contacts and preferences (PUT /me, see UpdateMyProfileRequest
// in hris-api-main). Identity number, NPWP, employee code, job, salary and
// bank details stay with HR. Users without an employee profile (e.g. a
// system admin account) only see the account sections.
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useEmployeeStore } from "@/stores/employee";
import { useOptionStore } from "@/stores/option";
import { storeToRefs } from "pinia";
import Avatar from "@/components/common/Avatar.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import {
  User as UserIcon,
  Mail,
  Lock,
  Camera,
  ArrowLeft,
  Save,
  Phone,
  MapPin,
  Calendar,
  HeartHandshake,
  Plus,
  Trash2,

  IdCard,
} from "lucide-vue-next";
import { UiAlert, UiButton, UiCard, UiInput, UiPageHeader, UiSelect, UiSwitch } from "@/components/ui";
import { displayName } from "@/utils/personName";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const router = useRouter();
const authStore = useAuthStore();
const { user, loading, error, success } = storeToRefs(authStore);
const { updateProfile, checkAuth } = authStore;
const employeeStore = useEmployeeStore();
const optionStore = useOptionStore();
const { preferredLanguages } = storeToRefs(optionStore);

const form = ref({
  name: "",
  show_degree: false,
  password: "",
  password_confirmation: "",
  profile_photo: null,
  profile_photo_url: "",
});

// Employee details (only when the account has an employee profile).
const hasEmployee = ref(false);
const profileLoading = ref(true);
const employee = ref({
  phone: "",
  date_of_birth: "",
  place_of_birth: "",
  gender: "",
  hobby: "",
  address: "",
  city: "",
  postal_code: "",
  preferred_language: "",
  additional_notes: "",
});
const contacts = ref([]);
// Read-only facts shown for reference (changed by HR).
const hrOnly = ref({ code: "", identity_number: "", job_title: "" });

const photoInput = ref(null);
let tempPreviewURL = null;

const GENDER_OPTIONS = computed(() => [
  { value: "", label: t("profile.edit.selectGender") },
  { value: "male", label: t("profile.enums.gender.male") },
  { value: "female", label: t("profile.enums.gender.female") },
]);
const languageOptions = computed(() => [{ value: "", label: t("profile.edit.selectLanguage") }, ...(preferredLanguages.value || [])]);
const today = new Date().toISOString().slice(0, 10);

const blankContact = () => ({ id: null, full_name: "", relationship: "", phone: "", email: "" });

const init = async () => {
  if (!user.value) {
    await checkAuth();
  }
  // The form edits the full name (titles/degrees included); `name` from the
  // API is only how it is shown.
  form.value.name = user.value?.full_name || user.value?.name || "";
  form.value.show_degree = !!user.value?.show_degree;
  form.value.profile_photo_url = user.value?.profile_photo || "";
  form.value.profile_photo = null;

  optionStore.fetchPreferredLanguages();
  try {
    // The profile page already loaded it into the store: fill the form from
    // there (no request, no skeleton); fetch only when it isn't cached.
    const cached = employeeStore.myProfile;
    const profile = cached && cached.user?.id === user.value?.id ? cached : await employeeStore.fetchMyProfile();
    if (profile?.id) {
      hasEmployee.value = true;
      Object.keys(employee.value).forEach((key) => {
        employee.value[key] = profile[key] ?? "";
      });
      contacts.value = (profile.emergency_contacts || []).map((c) => ({
        id: c.id,
        full_name: c.full_name || "",
        relationship: c.relationship || "",
        phone: c.phone || "",
        email: c.email || "",
      }));
      hrOnly.value = {
        code: profile.code || "",
        identity_number: profile.identity_number || "",
        job_title: profile.job_information?.job_title || "",
      };
    }
  } catch {
    // No employee profile for this account: account sections only.
    hasEmployee.value = false;
  } finally {
    profileLoading.value = false;
  }
};

onMounted(init);
onBeforeUnmount(() => {
  if (tempPreviewURL) URL.revokeObjectURL(tempPreviewURL);
});

const handlePhotoSelect = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    form.value.profile_photo = file;
    if (tempPreviewURL) URL.revokeObjectURL(tempPreviewURL);
    tempPreviewURL = URL.createObjectURL(file);
    form.value.profile_photo_url = tempPreviewURL;
  }
};

const namePreview = computed(() => displayName(form.value.name, form.value.show_degree));

const addContact = () => contacts.value.push(blankContact());
const removeContact = (index) => contacts.value.splice(index, 1);

// Field error from the API's 422 payload (e.g. "emergency_contacts.0.phone").
const fieldError = (key) => {
  const list = error.value && typeof error.value === "object" ? error.value[key] : null;
  return Array.isArray(list) ? list.join(", ") : "";
};

const handleSubmit = async () => {
  const payload = { ...form.value };
  delete payload.profile_photo_url;
  if (!payload.password) {
    delete payload.password;
    delete payload.password_confirmation;
  }
  if (!payload.profile_photo) delete payload.profile_photo;

  if (hasEmployee.value) {
    Object.assign(payload, employee.value);
    // Rows left completely empty are dropped instead of failing validation.
    payload.emergency_contacts = contacts.value
      .filter((c) => c.full_name || c.relationship || c.phone || c.email)
      .map((c) => ({ ...(c.id ? { id: c.id } : {}), full_name: c.full_name, relationship: c.relationship, phone: c.phone, email: c.email || null }));
  }

  const saved = await updateProfile(payload);
  if (saved) {
    form.value.password = "";
    form.value.password_confirmation = "";
    form.value.profile_photo = null;
    // Keep My Profile in step without refetching it: PUT /me returns the
    // user (name, photo), the employee fields are what was just saved.
    const sentContacts = payload.emergency_contacts;
    const cached = employeeStore.myProfile;
    if (cached) {
      employeeStore.patchMyProfile({
        ...(hasEmployee.value ? { ...employee.value } : {}),
        ...(hasEmployee.value && sentContacts && sentContacts.every((c) => c.id)
          ? { emergency_contacts: sentContacts.map((c) => ({ ...(cached.emergency_contacts || []).find((o) => o.id === c.id), ...c })) }
          : {}),
        user: { ...cached.user, name: saved.name ?? cached.user?.name, email: saved.email ?? cached.user?.email, profile_photo: saved.profile_photo ?? cached.user?.profile_photo },
      });
    }
    // New contacts only get their ids from the server, so only then is the
    // profile fetched again (which also refreshes the store).
    if (hasEmployee.value && sentContacts?.some((c) => !c.id)) {
      const profile = await employeeStore.fetchMyProfile().catch(() => null);
      if (profile) {
        contacts.value = (profile.emergency_contacts || []).map((c) => ({ id: c.id, full_name: c.full_name || "", relationship: c.relationship || "", phone: c.phone || "", email: c.email || "" }));
      }
    } else if (hasEmployee.value) {
      // Rows left empty were dropped from the request: drop them here too.
      contacts.value = contacts.value.filter((c) => c.full_name || c.relationship || c.phone || c.email);
    }
  }
};
</script>

<template>
  <form class="p-1 sm:p-3 lg:p-5 space-y-5" @submit.prevent="handleSubmit">
    <UiPageHeader :title="$t('profile.view.editProfile')" :subtitle="$t('profile.edit.subtitle')">
      <template #eyebrow>
        <RouterLink :to="{ name: 'employee.profile' }" class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1">
          <ArrowLeft class="w-4 h-4" />
          {{ $t("profile.edit.myProfile") }}
        </RouterLink>
      </template>
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" :to="{ name: 'employee.profile' }">{{ $t("common.actions.cancel") }}</UiButton>
          <UiButton type="submit" :icon="Save" :loading="loading">
            {{ loading ? $t("common.actions.saving") : $t("common.actions.saveChanges") }}
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <div class="space-y-3" v-if="(typeof error === 'string' && error) || success">
      <Transition name="ui-fade">
        <UiAlert v-if="typeof error === 'string' && error" tone="bad" :title="error" />
      </Transition>
      <Transition name="ui-fade">
        <UiAlert v-if="success" tone="ok" :title="success" />
      </Transition>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <div class="lg:col-span-2 space-y-5 min-w-0">
        <!-- Account -->
        <UiCard :title="$t('profile.edit.account.title')" :subtitle="$t('profile.edit.account.subtitle')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            <UiInput
              id="name"
              name="name"
              type="text"
              v-model="form.name"
              :label="$t('profile.fields.fullName')"
              :placeholder="$t('profile.edit.account.namePlaceholder')"
              :icon="UserIcon"
              :error="fieldError('name')"
              :hint="$t('profile.edit.account.nameHint')"
              required
            />
            <UiInput
              :model-value="user?.email"
              type="email"
              :label="$t('profile.edit.account.email')"
              :icon="Mail"
              readonly
              disabled
              :hint="$t('profile.edit.account.emailHint')"
            />
            <div class="md:col-span-2 rounded-ui-control border border-ui-line px-4 py-3">
              <UiSwitch v-model="form.show_degree" :label="$t('profile.edit.account.showDegree')" :description="$t('profile.edit.account.showDegreeHint')" />
              <p class="text-ui-cap text-ui-muted mt-2">
                {{ $t("profile.edit.account.shownAs") }} <span class="font-medium text-ui-ink">{{ namePreview || "—" }}</span>
              </p>
            </div>
          </div>
        </UiCard>

        <template v-if="profileLoading">
          <UiCard v-for="i in 2" :key="i">
            <div class="space-y-3">
              <Skeleton width="30%" height="18px" />
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton v-for="j in 4" :key="j" height="40px" rounded="8px" />
              </div>
            </div>
          </UiCard>
        </template>

        <template v-else-if="hasEmployee">
          <!-- Personal details -->
          <UiCard :title="$t('profile.edit.personal.title')" :subtitle="$t('profile.edit.personal.subtitle')">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              <UiInput v-model="employee.phone" :label="$t('profile.fields.phoneNumber')" placeholder="+62 812 3456 7890" :icon="Phone" :error="fieldError('phone')" required />
              <UiSelect v-model="employee.gender" :label="$t('profile.fields.gender')" :options="GENDER_OPTIONS" :error="fieldError('gender')" required />
              <UiInput v-model="employee.place_of_birth" :label="$t('profile.fields.placeOfBirth')" :placeholder="$t('profile.edit.cityPlaceholder')" :icon="MapPin" :error="fieldError('place_of_birth')" required />
              <div class="min-w-0">
                <label for="date_of_birth" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("profile.fields.dateOfBirth") }} <span class="text-ui-bad">*</span></label>
                <div class="relative">
                  <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
                  <input
                    id="date_of_birth"
                    v-model="employee.date_of_birth"
                    type="date"
                    :max="today"
                    class="w-full h-10 pl-9 pr-3 bg-ui-surface border rounded-ui-control text-ui-body text-ui-ink focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
                    :class="fieldError('date_of_birth') ? 'border-ui-bad' : 'border-ui-line-strong'"
                  />
                </div>
                <p v-if="fieldError('date_of_birth')" class="text-ui-cap text-ui-bad mt-1.5">{{ fieldError("date_of_birth") }}</p>
              </div>
              <div class="md:col-span-2">
                <UiInput v-model="employee.hobby" :label="$t('profile.edit.personal.hobby')" :placeholder="$t('profile.edit.personal.hobbyPlaceholder')" :error="fieldError('hobby')" />
              </div>
            </div>
          </UiCard>

          <!-- Address -->
          <UiCard :title="$t('common.labels.address')" :subtitle="$t('profile.edit.address.subtitle')">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              <div class="md:col-span-2">
                <UiInput v-model="employee.address" :label="$t('profile.edit.address.street')" :placeholder="$t('profile.edit.address.streetPlaceholder')" :rows="2" :error="fieldError('address')" required />
              </div>
              <UiInput v-model="employee.city" :label="$t('common.labels.city')" :placeholder="$t('profile.edit.cityPlaceholder')" :error="fieldError('city')" required />
              <UiInput v-model="employee.postal_code" :label="$t('profile.fields.postCode')" placeholder="40111" :error="fieldError('postal_code')" required />
            </div>
          </UiCard>

          <!-- Emergency contacts -->
          <UiCard :title="$t('profile.edit.contacts.title')" :subtitle="$t('profile.edit.contacts.subtitle')">
            <template #actions>
              <UiButton variant="secondary" size="sm" :icon="Plus" @click="addContact">{{ $t("profile.edit.contacts.add") }}</UiButton>
            </template>
            <div v-if="!contacts.length" class="rounded-ui-card border border-dashed border-ui-line-strong px-4 py-6 text-center">
              <HeartHandshake class="w-5 h-5 text-ui-faint mx-auto mb-2" />
              <p class="text-ui-small text-ui-muted">{{ $t("profile.edit.contacts.empty") }}</p>
              <UiButton variant="ghost" size="sm" :icon="Plus" class="mt-2" @click="addContact">{{ $t("profile.edit.contacts.add") }}</UiButton>
            </div>
            <TransitionGroup v-else name="ui-list" tag="div" class="space-y-3">
              <div v-for="(contact, index) in contacts" :key="contact.id || `new-${index}`" class="rounded-ui-card border border-ui-line bg-ui-subtle/50 p-4">
                <div class="flex items-center justify-between gap-2 mb-3">
                  <p class="text-ui-h3 text-ui-ink">{{ $t("profile.edit.contacts.contactN", { n: index + 1 }) }}</p>
                  <button
                    type="button"
                    class="w-8 h-8 -my-1 rounded-ui-control flex items-center justify-center text-ui-muted hover:text-ui-bad hover:bg-ui-bad-soft transition-colors"
                    :aria-label="$t('profile.edit.contacts.remove', { n: index + 1 })"
                    @click="removeContact(index)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <UiInput v-model="contact.full_name" :label="$t('profile.fields.fullName')" :placeholder="$t('profile.edit.contacts.namePlaceholder')" :error="fieldError(`emergency_contacts.${index}.full_name`)" required />
                  <UiInput v-model="contact.relationship" :label="$t('profile.fields.relationship')" :placeholder="$t('profile.edit.contacts.relationshipPlaceholder')" :error="fieldError(`emergency_contacts.${index}.relationship`)" required />
                  <UiInput v-model="contact.phone" :label="$t('profile.fields.phoneNumber')" placeholder="+62 812 3456 7890" :icon="Phone" :error="fieldError(`emergency_contacts.${index}.phone`)" required />
                  <UiInput v-model="contact.email" type="email" :label="$t('common.labels.email')" placeholder="name@example.com" :icon="Mail" :error="fieldError(`emergency_contacts.${index}.email`)" />
                </div>
              </div>
            </TransitionGroup>
          </UiCard>

          <!-- Preferences -->
          <UiCard :title="$t('profile.edit.preferences.title')" :subtitle="$t('profile.edit.preferences.subtitle')">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              <UiSelect v-model="employee.preferred_language" :label="$t('profile.edit.preferences.language')" :options="languageOptions" :error="fieldError('preferred_language')" />
              <div class="md:col-span-2">
                <UiInput v-model="employee.additional_notes" :label="$t('profile.edit.preferences.notes')" :placeholder="$t('profile.edit.preferences.notesPlaceholder')" :rows="3" :error="fieldError('additional_notes')" />
              </div>
            </div>
          </UiCard>
        </template>

        <!-- Password -->
        <UiCard :title="$t('profile.edit.password.title')" :subtitle="$t('profile.edit.password.subtitle')">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            <UiInput
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              v-model="form.password"
              :label="$t('profile.edit.password.new')"
              :placeholder="$t('profile.edit.password.newPlaceholder')"
              :icon="Lock"
              :error="fieldError('password')"
              :hint="$t('profile.edit.password.hint')"
            />
            <UiInput
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              autocomplete="new-password"
              v-model="form.password_confirmation"
              :label="$t('profile.edit.password.confirm')"
              :placeholder="$t('profile.edit.password.confirmPlaceholder')"
              :icon="Lock"
              :error="fieldError('password_confirmation')"
            />
          </div>
        </UiCard>
      </div>

      <div class="space-y-5 lg:sticky lg:top-0">
        <UiCard :title="$t('profile.edit.photo.title')">
          <div class="flex flex-row lg:flex-col items-center gap-5 lg:gap-4 lg:text-center">
            <input type="file" accept="image/*" class="hidden" ref="photoInput" @change="handlePhotoSelect" />
            <button
              type="button"
              class="relative w-24 h-24 rounded-full shrink-0 group cursor-pointer focus:outline-none focus-visible:shadow-ui-focus"
              @click="photoInput?.click()"
              :aria-label="$t('profile.edit.photo.change')"
            >
              <Avatar :src="form.profile_photo_url" :alt="form.name" size="w-24 h-24" />
              <div class="absolute inset-0 rounded-full bg-ui-scrim/0 group-hover:bg-ui-scrim/40 transition-colors duration-ui-base ease-ui-out flex items-center justify-center">
                <Camera class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-ui-base" />
              </div>
              <div class="absolute bottom-0.5 right-0.5 w-8 h-8 bg-ui-ink border-[3px] border-ui-surface rounded-full flex items-center justify-center">
                <Camera class="w-3.5 h-3.5 text-white" />
              </div>
            </button>
            <div class="min-w-0">
              <p class="text-ui-cap text-ui-muted">{{ $t("profile.edit.photo.formats") }}<br />{{ $t("profile.edit.photo.recommended") }}</p>
              <p v-if="fieldError('profile_photo')" class="text-ui-cap text-ui-bad mt-1">{{ fieldError("profile_photo") }}</p>
            </div>
          </div>
        </UiCard>

        <!-- What HR manages, for reference -->
        <UiCard v-if="hasEmployee" :title="$t('profile.edit.hr.title')" :subtitle="$t('profile.edit.hr.subtitle')">
          <dl class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-ui-small text-ui-muted flex items-center gap-1.5"><IdCard class="w-4 h-4 text-ui-faint" /> {{ $t("profile.fields.employeeId") }}</dt>
              <dd class="text-ui-small font-medium text-ui-ink font-mono">{{ hrOnly.code || "-" }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-ui-small text-ui-muted">{{ $t("profile.edit.hr.identityNumber") }}</dt>
              <dd class="text-ui-small font-medium text-ui-ink font-mono">{{ hrOnly.identity_number || "-" }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-ui-small text-ui-muted">{{ $t("profile.fields.jobTitle") }}</dt>
              <dd class="text-ui-small font-medium text-ui-ink truncate">{{ hrOnly.job_title || "-" }}</dd>
            </div>
          </dl>
          <p class="text-ui-cap text-ui-muted mt-3 flex items-start gap-1.5">
            <Lock class="w-3.5 h-3.5 shrink-0 mt-px" /> {{ $t("profile.edit.hr.note") }}
          </p>
        </UiCard>
      </div>
    </div>

    <!-- Phones: actions at the end of the form, full width -->
    <div class="sm:hidden flex flex-col gap-2">
      <UiButton type="submit" size="lg" block :icon="Save" :loading="loading">
        {{ loading ? $t("common.actions.saving") : $t("common.actions.saveChanges") }}
      </UiButton>
      <UiButton variant="ghost" size="lg" block :to="{ name: 'employee.profile' }">{{ $t("common.actions.cancel") }}</UiButton>
    </div>
  </form>
</template>
