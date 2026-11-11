<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import Alert from "@/components/common/Alert.vue";
import Avatar from "@/components/common/Avatar.vue";
import { User as UserIcon, Mail, Lock, Camera, ArrowLeft, Save } from "lucide-vue-next";
import { UiAlert, UiButton, UiCard, UiInput, UiPageHeader } from "@/components/ui";

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
  const payload = { ...form.value };
  if (!payload.password) {
    delete payload.password;
    delete payload.password_confirmation;
  }
  await updateProfile(payload);
};
</script>

<template>
  <form class="px-1 py-2 sm:px-4 sm:py-4 lg:px-5 ui-anim-fade-up" @submit.prevent="handleSubmit">
    <UiPageHeader title="Edit Profile" subtitle="Update your personal information">
      <template #eyebrow>
        <button
          type="button"
          @click="router.back()"
          class="inline-flex items-center gap-1 text-ui-small font-medium text-ui-accent hover:underline mb-1"
          aria-label="Back"
        >
          <ArrowLeft class="w-4 h-4" />
          Back
        </button>
      </template>
      <template #actions>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" @click="router.back()">Cancel</UiButton>
          <UiButton type="submit" :icon="Save" :loading="loading">
            {{ loading ? "Saving..." : "Save Changes" }}
          </UiButton>
        </div>
      </template>
    </UiPageHeader>

    <div class="mt-5 space-y-3" v-if="(typeof error === 'string' && error) || success">
      <Transition name="ui-fade">
        <UiAlert v-if="typeof error === 'string' && error" tone="bad" :title="error" />
      </Transition>
      <Transition name="ui-fade">
        <UiAlert v-if="success" tone="ok" :title="success" />
      </Transition>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mt-5 sm:mt-6 items-start">
      <div class="lg:col-span-2 space-y-4 sm:space-y-5 ui-stagger">
        <UiCard title="Account">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <UiInput
              id="name"
              name="name"
              type="text"
              v-model="form.name"
              label="Full Name"
              placeholder="Enter full name"
              :icon="UserIcon"
              :error="error?.name?.join(', ')"
              required
            />
            <UiInput
              :model-value="user?.email"
              type="email"
              label="Email Address"
              :icon="Mail"
              readonly
              disabled
              hint="Email cannot be changed. Contact HR if this needs to be updated."
            />
          </div>
        </UiCard>

        <UiCard title="Password">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <UiInput
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              v-model="form.password"
              label="New Password"
              placeholder="Enter new password (optional)"
              :icon="Lock"
              :error="error?.password?.join(', ')"
              hint="Min. 8 karakter, kombinasi huruf besar/kecil, angka, dan simbol. Tidak boleh password yang pernah bocor di data breach."
            />
            <UiInput
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              autocomplete="new-password"
              v-model="form.password_confirmation"
              label="Confirm Password"
              placeholder="Confirm new password"
              :icon="Lock"
              :error="error?.password_confirmation?.join(', ')"
            />
          </div>
        </UiCard>
      </div>

      <UiCard title="Profile Photo" class="ui-anim-fade-up">
        <div class="flex flex-row lg:flex-col items-center gap-5 lg:gap-4 lg:text-center">
          <input
            type="file"
            accept="image/*"
            class="hidden"
            ref="photoInput"
            @change="handlePhotoSelect"
          />
          <button
            type="button"
            class="relative w-24 h-24 rounded-full shrink-0 group cursor-pointer focus:outline-none focus-visible:shadow-ui-focus"
            @click="photoInput?.click()"
            aria-label="Change profile photo"
          >
            <Avatar :src="form.profile_photo_url" :alt="form.name" size="w-24 h-24" />
            <!-- Hover overlay -->
            <div
              class="absolute inset-0 rounded-full bg-ui-ink/0 group-hover:bg-ui-ink/40 transition-colors duration-ui-base ease-ui-out flex items-center justify-center"
            >
              <Camera class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-ui-base" />
            </div>
            <!-- Camera badge -->
            <div
              class="absolute bottom-0.5 right-0.5 w-8 h-8 bg-ui-ink border-[3px] border-ui-surface rounded-full flex items-center justify-center"
            >
              <Camera class="w-3.5 h-3.5 text-white" />
            </div>
          </button>
          <div class="min-w-0">
            <p class="text-ui-cap text-ui-muted">
              JPG, PNG up to 2MB<br />Recommended: 400x400px
            </p>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Phones: actions at the end of the form, full width -->
    <div class="sm:hidden mt-5 flex flex-col gap-2">
      <UiButton type="submit" size="lg" block :icon="Save" :loading="loading">
        {{ loading ? "Saving..." : "Save Changes" }}
      </UiButton>
      <UiButton variant="ghost" size="lg" block @click="router.back()">Cancel</UiButton>
    </div>
  </form>
</template>
