<script setup lang="ts">
import { Input, TextArea } from "@/components/common/form";
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
  <div class="flex flex-col lg:flex-row gap-5 items-start p-5">
    <!-- Profile Photo Card -->
    <div class="w-full lg:w-80">
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div
            class="w-9 h-9 bg-purple-50 rounded-[12px] flex items-center justify-center"
          >
            <Camera class="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base font-bold">Profile Photo</h3>
            <p class="text-brand-light text-sm font-normal">Upload employee photo</p>
          </div>
        </div>

        <div class="flex flex-col items-center">
          <!-- Photo Placeholder -->
          <div
            v-if="!form.profile_photo_url"
            class="w-32 h-32 bg-gray-100 border-2 border-dashed border-[#DCDEDD] rounded-full flex items-center justify-center mb-3.5"
          >
            <Camera class="w-7 h-7 text-gray-400" />
          </div>

          <!-- Selected Photo Container -->
          <div v-else class="mb-3.5">
            <div class="relative w-32 h-32">
              <img
                :src="form.profile_photo_url"
                alt="Profile"
                class="w-32 h-32 rounded-full object-cover border-2 border-[#DCDEDD]"
              />
              <button
                type="button"
                @click="deletePhoto"
                class="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-2.5 items-center">
            <input
              type="file"
              accept="image/*"
              class="hidden"
              ref="profilePhotoInput"
              @change="handlePhotoSelect"
            />
            <button
              type="button"
              @click="profilePhotoInput?.click()"
              class="bg-white border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-3.5 py-2 sm:px-5 sm:py-2.5 flex items-center gap-1.5"
            >
              <FolderOpen class="w-4 h-4 text-gray-600" />
              <span class="text-brand-dark text-sm sm:text-sm font-semibold">Browse Photo</span>
            </button>
            <p class="text-brand-light text-xs text-center">
              JPG, PNG up to 2MB<br />Recommended: 400x400px
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Section -->
    <div class="flex-1">
      <!-- Account Credentials Section -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5 mb-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div
            class="w-9 h-9 bg-purple-50 rounded-[12px] flex items-center justify-center"
          >
            <Lock class="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base font-bold">Account Credentials</h3>
            <p class="text-brand-light text-sm font-normal">
              Login information and account details
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="mb-3.5">
            <Input
              id="name"
              name="name"
              type="text"
              v-model="form.name"
              label="Full Name"
              placeholder="Enter full name"
              :error="errors?.name?.join(', ')"
              required
            >
              <template #icon>
                <User class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="email"
              name="email"
              type="email"
              v-model="form.email"
              label="Email Address"
              placeholder="employee@company.com"
              :error="errors?.email?.join(', ')"
              required
            >
              <template #icon>
                <Mail class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="password"
              name="password"
              type="password"
              v-model="form.password"
              :label="isEditing ? 'New Password (optional)' : 'Password *'"
              :placeholder="isEditing ? 'Leave blank to keep current password' : 'Enter password'"
              :error="errors?.password?.join(', ')"
              :required="!isEditing"
            >
              <template #icon>
                <Lock class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
            <p class="text-xs text-gray-400 mt-1">
              Min. 8 characters, a mix of upper/lowercase letters, numbers, and symbols. Must not be a password exposed in a known data breach.
            </p>
          </div>

          <div class="mb-3.5">
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              v-model="form.password_confirmation"
              :label="isEditing ? 'Confirm New Password' : 'Confirm Password *'"
              placeholder="Confirm password"
              :error="errors?.password_confirmation?.join(', ')"
              :required="!isEditing"
            >
              <template #icon>
                <Lock class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="identity_number"
              name="identity_number"
              type="text"
              v-model="form.identity_number"
              label="Identity Number (NIK/KTP)"
              placeholder="Enter identity number"
              :error="errors?.identity_number?.join(', ')"
              required
            >
              <template #icon>
                <Hash class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="npwp"
              name="npwp"
              type="text"
              v-model="form.npwp"
              label="NPWP (optional)"
              placeholder="00.000.000.0-000.000"
              :error="errors?.npwp?.join(', ')"
            >
              <template #icon>
                <Hash class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>
        </div>
      </div>

      <!-- Personal Information Section -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div
            class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center"
          >
            <User class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base font-bold">Personal Information</h3>
            <p class="text-brand-light text-sm font-normal">
              Basic employee details and contact information
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="mb-3.5">
            <Input
              id="phone"
              name="phone"
              type="tel"
              v-model="form.phone"
              label="Phone Number"
              placeholder="+62 812-3456-7890"
              :error="errors?.phone?.join(', ')"
              required
            >
              <template #icon>
                <Phone class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              v-model="form.date_of_birth"
              label="Date of Birth"
              :error="errors?.date_of_birth?.join(', ')"
              required
            >
              <template #icon>
                <Calendar class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="hobby"
              name="hobby"
              type="text"
              v-model="form.hobby"
              label="Hobby"
              placeholder="e.g. Reading, Swimming, Gaming"
              :error="errors?.hobby?.join(', ')"
            >
              <template #icon>
                <Heart class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-3.5">
            <Input
              id="place_of_birth"
              name="place_of_birth"
              type="text"
              v-model="form.place_of_birth"
              label="Place of Birth"
              placeholder="e.g. Jakarta, Indonesia"
              :error="errors?.place_of_birth?.join(', ')"
              required
            >
              <template #icon>
                <MapPin class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <!-- Gender (Full Width) -->
          <div class="md:col-span-2 mb-3.5">
            <label class="block text-brand-dark text-sm font-semibold mb-1">Gender<span class="text-red-600 ml-1">*</span></label>
            <div class="flex flex-col sm:flex-row gap-3.5">
              <!-- Male Option -->
              <label
                class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] bg-white border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
              >
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-10 h-10 bg-blue-50 rounded-[12px] flex items-center justify-center"
                  >
                    <User class="w-5 h-5 text-blue-600" />
                  </div>
                  <div class="flex flex-col">
                    <p class="text-brand-dark text-sm font-semibold">Male</p>
                  </div>
                </div>
                <div
                  class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                >
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    class="hidden"
                    v-model="form.gender"
                  />
                  <div
                    class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                  ></div>
                  <p
                    class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                  ></p>
                </div>
              </label>

              <!-- Female Option -->
              <label
                class="group card flex items-center justify-between w-full min-h-[60px] rounded-[12px] bg-white border border-[#DCDEDD] p-3.5 has-[:checked]:ring-2 has-[:checked]:ring-[#0C51D9] has-[:checked]:ring-offset-2 transition-all duration-300 cursor-pointer"
              >
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-10 h-10 bg-pink-50 rounded-[12px] flex items-center justify-center"
                  >
                    <User class="w-5 h-5 text-pink-600" />
                  </div>
                  <div class="flex flex-col">
                    <p class="text-brand-dark text-sm font-semibold">Female</p>
                  </div>
                </div>
                <div
                  class="relative flex items-center justify-center w-fit h-8 shrink-0 rounded-xl border border-[#DCDEDD] py-1.5 px-2.5 gap-1.5"
                >
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    class="hidden"
                    v-model="form.gender"
                  />
                  <div
                    class="flex size-[18px] rounded-full shadow-sm border border-[#DCDEDD] group-has-[:checked]:border-[5px] group-has-[:checked]:border-[#0C51D9] transition-all duration-300"
                  ></div>
                  <p
                    class="text-xs font-semibold after:content-['Select'] group-has-[:checked]:after:content-['Selected']"
                  ></p>
                </div>
              </label>
            </div>
          </div>

          <!-- Address -->
          <div class="mb-3.5">
            <TextArea
              id="address"
              name="address"
              v-model="form.address"
              label="Address"
              placeholder="Enter full address"
              :error="errors?.address?.join(', ')"
              rows="5"
              required
            >
              <template #icon>
                <MapPin class="h-5 w-5 text-gray-400" />
              </template>
            </TextArea>
          </div>

          <!-- City and Post Code -->
          <div class="mb-3.5">
            <!-- City -->
            <div class="mb-3.5">
              <Input
                id="city"
                name="city"
                type="text"
                v-model="form.city"
                label="City"
                placeholder="e.g. Jakarta"
                :error="errors?.city?.join(', ')"
                required
              >
                <template #icon>
                  <Building2 class="h-5 w-5 text-gray-400" />
                </template>
              </Input>
            </div>

            <!-- Postal Code -->
            <div class="mb-3.5">
              <Input
                id="postal_code"
                name="postal_code"
                type="text"
                v-model="form.postal_code"
                label="Postal Code"
                placeholder="e.g. 12345"
                :error="errors?.postal_code?.join(', ')"
                required
              >
                <template #icon>
                  <Hash class="h-5 w-5 text-gray-400" />
                </template>
              </Input>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
