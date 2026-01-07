<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Shield,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowLeft,
  Key,
  Globe,
  FileText,
  Tag,
  User,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useAccountPasswordStore } from "@/stores/accountPassword";

const route = useRoute();
const router = useRouter();
const store = useAccountPasswordStore();

const loading = ref(true);
const submitting = ref(false);
const error = ref("");
const success = ref("");

const showPassword = ref(false);
const rotatePassword = ref(false);

const form = ref({
  label_password: "",
  username_email: "",
  website: "",
  password: "",
  notes: "",
});

/* =====================
 * UI helpers
 * ===================== */
const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

/* =====================
 * Submit update
 * ===================== */
const submit = async () => {
  error.value = "";
  success.value = "";

  if (!form.value.label_password || !form.value.username_email) {
    error.value = "Label Password dan Username / Email wajib diisi.";
    return;
  }

  if (rotatePassword.value && !form.value.password) {
    error.value = "Password baru wajib diisi jika rotasi diaktifkan.";
    return;
  }

  const payload = {
    label_password: form.value.label_password,
    username_email: form.value.username_email,
    website: form.value.website || null,
    notes: form.value.notes || null,
    ...(rotatePassword.value && { password: form.value.password }),
  };

  submitting.value = true;

  try {
    // 🔥 updateAccount SUDAH fetch ulang di store
    await store.updateAccount(route.params.id, payload);

    success.value = "Credential berhasil diperbarui.";

    // reset field sensitif
    form.value.password = "";
    rotatePassword.value = false;

    setTimeout(() => {
      router.push({
        name: "admin.account-password.detail",
        params: { id: route.params.id },
      });
    }, 1200);
  } catch (e) {
    error.value = e?.message || "Gagal memperbarui credential.";
  } finally {
    submitting.value = false;
  }
};

/* =====================
 * Fetch initial data
 * ===================== */
const loadData = async () => {
  loading.value = true;
  error.value = "";

  try {
    await store.fetchAccount(route.params.id);
  } catch {
    error.value = "Data credential tidak ditemukan.";
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

/* =====================
 * Sync store → form
 * (aman saat fetch ulang)
 * ===================== */
watch(
  () => store.currentAccount,
  (data) => {
    if (!data) return;

    form.value.label_password = data.label_password ?? data.label ?? "";
    form.value.username_email = data.username_email ?? data.username ?? "";
    form.value.website = data.website ?? "";
    form.value.notes = data.notes ?? "";
  },
  { immediate: true }
);
</script>


<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <button
          @click="router.back()"
          class="w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all"
        >
          <ArrowLeft class="w-5 h-5 text-gray-600" />
        </button>

        <div
          class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <Shield class="w-6 h-6 text-blue-600" />
        </div>

        <div>
          <h1 class="text-brand-dark text-xl font-bold">
            Edit Account Credential
          </h1>
          <p class="text-brand-light text-sm">
            Update credential metadata atau rotasi password
          </p>
        </div>
      </div>
    </div>

    <template>
  <div class="max-w-4xl mx-auto">
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5 mb-6">
      </div>

    <div class="mb-6">
      <Transition name="fade">
        <Alert 
          v-if="error" 
          type="error" 
          :title="error" 
          :show="!!error" 
          @close="error = ''" 
        />
      </Transition>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6 space-y-6">
       </div>
  </div>
</template>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-20 text-gray-500">
      Loading credential data...
    </div>

    <!-- Form -->
    <div
      v-if="!loading"
      class="bg-white border border-[#DCDEDD] rounded-[20px] p-6 space-y-6"
    >
      <!-- Label -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Label Password *
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center">
            <Tag class="w-5 h-5 text-gray-400" />
          </div>
          <input
            v-model="form.label_password"
            type="text"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all font-semibold"
          />
        </div>
      </div>

      <!-- Username / Email -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Username / Email *
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center">
            <User class="w-5 h-5 text-gray-400" />
          </div>
          <input
            v-model="form.username_email"
            type="text"
            placeholder="e.g. admin@company.com / admin.erp"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all font-semibold"
          />
        </div>
      </div>

      <!-- Rotate Password -->
      <div class="border-t pt-4 space-y-4">
        <label class="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            v-model="rotatePassword"
            class="rounded border-gray-300"
          />
          Rotate Password
        </label>

        <div v-if="rotatePassword" class="space-y-3">
          <div
            class="flex items-start gap-3 p-4 rounded-[16px] bg-yellow-50 border border-yellow-300"
          >
            <AlertTriangle class="w-5 h-5 text-yellow-600 mt-0.5" />
            <p class="text-sm text-yellow-800">
              Password lama akan digantikan. Pastikan sistem target sudah
              diperbarui.
            </p>
          </div>

          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center">
              <Key class="w-5 h-5 text-gray-400" />
            </div>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="New password"
              class="w-full pl-12 pr-12 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all font-mono"
            />
            <button
              type="button"
              @click="togglePassword"
              class="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <Eye v-if="!showPassword" class="w-5 h-5 text-gray-500" />
              <EyeOff v-else class="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <!-- Website -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Website (Optional)
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center">
            <Globe class="w-5 h-5 text-gray-400" />
          </div>
          <input
            v-model="form.website"
            type="url"
            placeholder="https://example.com"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all font-semibold"
          />
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Notes (Optional)
        </label>
        <div class="relative">
          <div class="absolute top-3 left-4">
            <FileText class="w-5 h-5 text-gray-400" />
          </div>
          <textarea
            v-model="form.notes"
            rows="4"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all resize-none"
          ></textarea>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="button"
          @click="router.back()"
          class="w-full sm:w-auto border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all px-6 py-3 font-semibold"
        >
          Cancel
        </button>

        <button
          type="button"
          @click="submit"
          :disabled="submitting"
          class="w-full sm:w-auto rounded-[12px] bg-[#0C51D9] hover:bg-[#0A45BF] text-white font-semibold px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          <Save class="w-4 h-4" />
          {{ submitting ? "Updating..." : "Update Credential" }}
        </button>
      </div>
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