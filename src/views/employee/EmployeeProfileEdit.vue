<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import Input from "@/components/common/form/Input.vue";
import Alert from "@/components/common/Alert.vue";
import { User as UserIcon, Mail, Lock, Camera, ArrowLeft } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const { user, loading, error, success } = storeToRefs(authStore);
const { updateProfile, checkAuth } = authStore;

const form = ref({
  name: "",
  password: "",
  password_confirmation: "",
  profile_photo: null,
  profile_photo_url: "",
});

const photoInput = ref(null);
let tempPreviewURL = null;

const init = async () => {
  if (!user.value) {
    await checkAuth();
  }
  form.value.name = user.value?.name || "";

  form.value.profile_photo_url = user.value?.profile_photo || "";
  form.value.profile_photo = null;
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

const handleSubmit = async () => {
  await updateProfile(form.value);
};
</script>

<template>
  <div class="p-5">
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 mb-6">
      <div class="flex items-center gap-3 mb-6">
        <button
          type="button"
          @click="router.back()"
          class="w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all"
          aria-label="Back"
        >
          <ArrowLeft class="w-5 h-5 text-gray-600" />
        </button>
        <div
          class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <UserIcon class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg sm:text-xl font-bold">Edit Profile</h3>
          <p class="text-brand-light text-sm">
            Update your personal information
          </p>
        </div>
      </div>

      <div class="mb-6">
        <Transition name="fade">
          <Alert
            v-if="typeof error === 'string' && error"
            type="danger"
            :title="error"
            message=""
            :show="!!error"
          />
        </Transition>
        <Transition name="fade">
          <Alert
            v-if="success"
            type="success"
            :title="success"
            message=""
            :show="!!success"
          />
        </Transition>
      </div>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="mb-4">
            <Input
              id="name"
              name="name"
              type="text"
              v-model="form.name"
              label="Full Name"
              placeholder="Enter full name"
              :error="error?.name?.join(', ')"
              required
            >
              <template #icon>
                <UserIcon class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <div class="mb-4">
            <label class="block text-brand-dark text-base font-semibold mb-1">
              Email Address
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail class="h-5 w-5 text-gray-400" />
              </div>
              <input
                :value="user?.email"
                type="email"
                readonly
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <p class="text-brand-light text-xs mt-1">
              Email cannot be changed. Contact HR if this needs to be updated.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="mb-4">
            <Input
              id="password"
              name="password"
              type="password"
              v-model="form.password"
              label="New Password"
              placeholder="Enter new password (optional)"
              :error="error?.password?.join(', ')"
            >
              <template #icon>
                <Lock class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
            <p class="text-xs text-gray-400 mt-1">
              Min. 8 karakter, kombinasi huruf besar/kecil, angka, dan simbol. Tidak boleh password yang pernah bocor di data breach.
            </p>
          </div>

          <div class="mb-4">
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              v-model="form.password_confirmation"
              label="Confirm Password"
              placeholder="Confirm new password"
              :error="error?.password_confirmation?.join(', ')"
            >
              <template #icon>
                <Lock class="h-5 w-5 text-gray-400" />
              </template>
            </Input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="mb-4 md:col-span-2">
            <label class="block text-brand-dark text-base font-semibold mb-1"
              >Profile Photo</label
            >
            <div class="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                class="hidden"
                ref="photoInput"
                @change="handlePhotoSelect"
              />
              <button
                type="button"
                class="relative w-32 h-32 rounded-full shrink-0 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0C51D9] focus:ring-offset-2"
                @click="photoInput?.click()"
                aria-label="Change profile photo"
              >
                <div
                  class="w-32 h-32 absolute bg-gradient-to-br from-primary-500 to-primary-600 rounded-full"
                ></div>
                <div
                  class="w-32 h-32 relative z-10 flex items-center justify-center"
                >
                  <img
                    :src="form.profile_photo_url"
                    alt="Profile Photo"
                    class="w-32 h-32 object-cover rounded-full"
                    v-if="form.profile_photo_url"
                  />
                  <div class="w-32 h-32 rounded-full bg-gray-100" v-else></div>
                </div>
                <!-- Hover overlay -->
                <div
                  class="absolute inset-0 z-20 rounded-full bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center"
                >
                  <Camera
                    class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <!-- Camera badge -->
                <div
                  class="absolute bottom-1 right-1 z-30 w-9 h-9 bg-[#0C51D9] border-4 border-white rounded-full flex items-center justify-center group-hover:brightness-110 transition-all duration-300"
                >
                  <Camera class="w-4 h-4 text-white" />
                </div>
              </button>
              <p class="text-brand-light text-xs">
                JPG, PNG up to 2MB<br />Recommended: 400x400px
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <button
            type="button"
            @click="router.back()"
            class="border border-[#DCDEDD] rounded-[8px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 text-brand-dark font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 disabled:opacity-50"
          >
            <span class="text-brand-white text-base font-semibold">{{
              loading ? "Saving..." : "Save Changes"
            }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
