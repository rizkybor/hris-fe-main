<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  Shield,
  Eye,
  EyeOff,
  Save,
  Globe,
  FileText,
  Key,
  Tag,
  User,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useAccountPasswordStore } from "@/stores/accountPassword";

const router = useRouter();
const passwordStore = useAccountPasswordStore();

const loading = ref(false);
const showPassword = ref(false);
const error = ref("");
const success = ref("");

const form = ref({
  label_password: "",
  username_email: "",
  website: "",
  password: "",
  notes: "",
});

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const submit = async () => {
  error.value = "";
  success.value = "";

  if (!form.value.label_password || !form.value.username_email || !form.value.password) {
    error.value = "Label Password, Username/Email, dan Password wajib diisi.";
    return;
  }

  loading.value = true;
  try {
    await passwordStore.createAccount(form.value);

    success.value = "Credential berhasil disimpan.";

    setTimeout(() => {
      router.push({ name: "admin.account-password.dashboard" });
    }, 1200);
  } catch (err) {
    error.value = err?.message || "Gagal menyimpan credential.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <Shield class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-brand-dark text-xl font-bold">
            Create Credential Account
          </h1>
          <p class="text-brand-light text-sm">
            Save system or internal service password credentials
          </p>
        </div>
      </div>
    </div>

    <!-- <Alert type="success" :title="success" :show="success" /> -->
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

    <!-- Form Card -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-6 space-y-6">
      <!-- Label Password -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Label Password *
        </label>
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <Tag class="w-5 h-5 text-gray-400" />
          </div>
          <input
            v-model="form.label_password"
            type="text"
            placeholder="e.g. ERP Finance Admin, VPN Office"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
          />
        </div>
      </div>

      <!-- Username / Email -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Username / Email *
        </label>
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <User class="w-5 h-5 text-gray-400" />
          </div>
          <input
            v-model="form.username_email"
            type="text"
            placeholder="e.g. admin@company.com / admin.erp"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
          />
        </div>
      </div>

      <!-- Password -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Password *
        </label>
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <Key class="w-5 h-5 text-gray-400" />
          </div>

          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter secure password"
            class="w-full pl-12 pr-12 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-mono"
          />

          <button
            type="button"
            @click="togglePassword"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            <Eye v-if="!showPassword" class="w-5 h-5" />
            <EyeOff v-else class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Website -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Website (Optional)
        </label>
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
          >
            <Globe class="w-5 h-5 text-gray-400" />
          </div>
          <input
            v-model="form.website"
            type="url"
            placeholder="https://example.com"
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
          />
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Notes (Optional)
        </label>
        <div class="relative">
          <div class="absolute top-3 left-4 pointer-events-none">
            <FileText class="w-5 h-5 text-gray-400" />
          </div>
          <textarea
            v-model="form.notes"
            rows="4"
            placeholder="Additional notes or instructions..."
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-normal resize-none"
          ></textarea>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="button"
          @click="$router.back()"
          class="w-full sm:w-auto border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 text-brand-dark font-semibold"
        >
          Cancel
        </button>

        <button
          type="button"
          @click="submit"
          :disabled="loading"
          class="w-full sm:w-auto rounded-[12px] bg-[#0C51D9] hover:bg-[#0A45BF] text-white font-semibold transition-all duration-300 px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save class="w-4 h-4" />
          {{ loading ? "Saving..." : "Save Credential" }}
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