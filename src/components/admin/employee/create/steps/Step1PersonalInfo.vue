<script setup lang="ts">
import { UiInput, UiButton } from "@/components/ui";
import {
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  Heart,
  MapPin,
  Hash,
  Building2,
  Camera,
  FolderOpen,
  X,
} from "lucide-vue-next";
import { ref, computed } from "vue";

interface Props {
  modelValue: any;
  errors?: any;
  isEditing?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
});
const emit = defineEmits(["update:modelValue"]);

const form = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Profile photo handling
const profilePhotoInput = ref<HTMLInputElement | null>(null);

const handlePhotoSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    form.value.profile_photo = file;
    form.value.profile_photo_url = URL.createObjectURL(file);
  }
};

const deletePhoto = () => {
  form.value.profile_photo = null;
  form.value.profile_photo_url = "";
  if (profilePhotoInput.value) {
    profilePhotoInput.value.value = "";
  }
};

</script>

<template>
  <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
    <!-- Profile Photo Card (top on small screens, right column on wide) -->
    <section class="xl:col-start-2 xl:row-start-1 xl:sticky xl:top-0 bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 ui-anim-fade-up">
        <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
          <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
            <Camera class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">Profile Photo</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">Upload employee photo</p>
          </div>
        </header>
      <div class="flex flex-row xl:flex-col items-center gap-5 xl:gap-4 xl:text-center">
        <!-- Photo / placeholder -->
        <div class="relative w-24 h-24 shrink-0">
          <div
            v-if="!form.profile_photo_url"
            class="w-24 h-24 rounded-full bg-ui-subtle border border-dashed border-ui-line-strong flex items-center justify-center"
          >
            <Camera class="w-6 h-6 text-ui-faint" />
          </div>
          <template v-else>
            <img
              :src="form.profile_photo_url"
              alt="Profile"
              class="w-24 h-24 rounded-full object-cover border border-ui-line"
            />
            <button
              type="button"
              @click="deletePhoto"
              class="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-ui-surface border border-ui-line-strong text-ui-bad hover:bg-ui-bad-soft flex items-center justify-center focus:outline-none focus-visible:shadow-ui-focus"
              aria-label="Remove photo"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </template>
        </div>

        <div class="flex flex-col gap-2 items-start xl:items-center min-w-0">
          <input
            type="file"
            accept="image/*"
            class="hidden"
            ref="profilePhotoInput"
            @change="handlePhotoSelect"
          />
          <UiButton variant="secondary" :icon="FolderOpen" @click="profilePhotoInput?.click()">
            Browse Photo
          </UiButton>
          <p class="text-ui-cap text-ui-muted">
            JPG, PNG up to 2MB<br />Recommended: 400x400px
          </p>
        </div>
      </div>
    </section>

    <!-- Form Section -->
    <div class="xl:col-start-1 xl:row-start-1 min-w-0 space-y-5 ui-stagger">
      <!-- Account Credentials Section -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
        <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
          <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
            <Lock class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">Account Credentials</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">Login information and account details</p>
          </div>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <UiInput
            id="name"
            name="name"
            type="text"
            v-model="form.name"
            label="Full Name"
            placeholder="Enter full name"
            :icon="User"
            :error="errors?.name?.join(', ')"
            required
          />
          <UiInput
            id="email"
            name="email"
            type="email"
            v-model="form.email"
            label="Email Address"
            placeholder="employee@company.com"
            :icon="Mail"
            :error="errors?.email?.join(', ')"
            required
          />
          <UiInput
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            v-model="form.password"
            :label="isEditing ? 'New Password (optional)' : 'Password'"
            :placeholder="isEditing ? 'Leave blank to keep current password' : 'Enter password'"
            :icon="Lock"
            :error="errors?.password?.join(', ')"
            hint="Min. 8 characters, a mix of upper/lowercase letters, numbers, and symbols. Must not be a password exposed in a known data breach."
            :required="!isEditing"
          />
          <UiInput
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            autocomplete="new-password"
            v-model="form.password_confirmation"
            :label="isEditing ? 'Confirm New Password' : 'Confirm Password'"
            placeholder="Confirm password"
            :icon="Lock"
            :error="errors?.password_confirmation?.join(', ')"
            :required="!isEditing"
          />
          <UiInput
            id="identity_number"
            name="identity_number"
            type="text"
            v-model="form.identity_number"
            label="Identity Number (NIK/KTP)"
            placeholder="Enter identity number"
            :icon="Hash"
            :error="errors?.identity_number?.join(', ')"
            required
          />
          <UiInput
            id="npwp"
            name="npwp"
            type="text"
            v-model="form.npwp"
            label="NPWP (optional)"
            placeholder="00.000.000.0-000.000"
            :icon="Hash"
            :error="errors?.npwp?.join(', ')"
          />
        </div>
      </section>

      <!-- Personal Information Section -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
        <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
          <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
            <User class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">Personal Information</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">Basic employee details and contact information</p>
          </div>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <UiInput
            id="phone"
            name="phone"
            type="tel"
            v-model="form.phone"
            label="Phone Number"
            placeholder="+62 812-3456-7890"
            :icon="Phone"
            :error="errors?.phone?.join(', ')"
            required
          />
          <UiInput
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            v-model="form.date_of_birth"
            label="Date of Birth"
            :icon="Calendar"
            :error="errors?.date_of_birth?.join(', ')"
            required
          />
          <UiInput
            id="hobby"
            name="hobby"
            type="text"
            v-model="form.hobby"
            label="Hobby"
            placeholder="e.g. Reading, Swimming, Gaming"
            :icon="Heart"
            :error="errors?.hobby?.join(', ')"
          />
          <UiInput
            id="place_of_birth"
            name="place_of_birth"
            type="text"
            v-model="form.place_of_birth"
            label="Place of Birth"
            placeholder="e.g. Jakarta, Indonesia"
            :icon="MapPin"
            :error="errors?.place_of_birth?.join(', ')"
            required
          />

          <!-- Gender (Full Width) -->
          <fieldset class="md:col-span-2 min-w-0">
            <legend class="block text-ui-small font-medium text-ui-ink mb-1.5">Gender<span class="text-ui-bad"> *</span></legend>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              class="group relative flex items-center justify-between gap-3 w-full min-h-[56px] rounded-ui-card bg-ui-surface border border-ui-line-strong px-3.5 py-3 cursor-pointer transition-colors duration-ui-base hover:bg-ui-subtle has-[:checked]:border-ui-accent has-[:checked]:bg-ui-accent-soft/40 has-[:focus-visible]:shadow-ui-focus"
            >
              <span class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-ui-control bg-ui-subtle text-ui-text flex items-center justify-center">
                  <User class="w-4 h-4" />
                </span>
                <span class="text-ui-body font-medium text-ui-ink">Male</span>
              </span>
              <span class="flex items-center gap-1.5 h-7 shrink-0 rounded-full border border-ui-line px-2.5 bg-ui-surface">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  class="sr-only"
                  v-model="form.gender"
                />
                <span
                  class="flex size-4 rounded-full border border-ui-line-strong group-has-[:checked]:border-[5px] group-has-[:checked]:border-ui-accent transition-all duration-ui-base"
                ></span>
                <span
                  class="text-ui-cap font-medium text-ui-muted group-has-[:checked]:text-ui-accent after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                ></span>
              </span>
            </label>
            <label
              class="group relative flex items-center justify-between gap-3 w-full min-h-[56px] rounded-ui-card bg-ui-surface border border-ui-line-strong px-3.5 py-3 cursor-pointer transition-colors duration-ui-base hover:bg-ui-subtle has-[:checked]:border-ui-accent has-[:checked]:bg-ui-accent-soft/40 has-[:focus-visible]:shadow-ui-focus"
            >
              <span class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-ui-control bg-ui-subtle text-ui-text flex items-center justify-center">
                  <User class="w-4 h-4" />
                </span>
                <span class="text-ui-body font-medium text-ui-ink">Female</span>
              </span>
              <span class="flex items-center gap-1.5 h-7 shrink-0 rounded-full border border-ui-line px-2.5 bg-ui-surface">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  class="sr-only"
                  v-model="form.gender"
                />
                <span
                  class="flex size-4 rounded-full border border-ui-line-strong group-has-[:checked]:border-[5px] group-has-[:checked]:border-ui-accent transition-all duration-ui-base"
                ></span>
                <span
                  class="text-ui-cap font-medium text-ui-muted group-has-[:checked]:text-ui-accent after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                ></span>
              </span>
            </label>
            </div>
            <p v-if="errors?.gender" class="text-ui-cap text-ui-bad mt-1.5">{{ errors?.gender?.join(', ') }}</p>
          </fieldset>

          <!-- Address -->
          <UiInput
            id="address"
            name="address"
            v-model="form.address"
            label="Address"
            placeholder="Enter full address"
            :icon="MapPin"
            :error="errors?.address?.join(', ')"
            :rows="5"
            required
          />

          <!-- City and Post Code -->
          <div class="space-y-4 min-w-0">
          <UiInput
            id="city"
            name="city"
            type="text"
            v-model="form.city"
            label="City"
            placeholder="e.g. Jakarta"
            :icon="Building2"
            :error="errors?.city?.join(', ')"
            required
          />
          <UiInput
            id="postal_code"
            name="postal_code"
            type="text"
            v-model="form.postal_code"
            label="Postal Code"
            placeholder="e.g. 12345"
            :icon="Hash"
            :error="errors?.postal_code?.join(', ')"
            required
          />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
