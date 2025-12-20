<script setup>
import { ref, onMounted } from "vue";
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
  label: "",
  username: "",
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

  if (!form.value.label || !form.value.username) {
    error.value = "Label Password dan Username / Email wajib diisi.";
    return;
  }

  if (rotatePassword.value && !form.value.password) {
    error.value = "Password baru wajib diisi jika rotasi diaktifkan.";
    return;
  }

  const payload = {
    label: form.value.label,
    username: form.value.username,
    website: form.value.website,
    notes: form.value.notes,
  };

  if (rotatePassword.value) {
    payload.password = form.value.password;
  }

  submitting.value = true;
  try {
    await store.updateAccount(route.params.id, payload);
    success.value = "Credential berhasil diperbarui.";

    setTimeout(() => {
      router.push({
        name: "admin.account-password.detail",
        params: { id: route.params.id },
      });
    }, 1200);
  } catch (err) {
    error.value = err?.message || "Gagal memperbarui credential.";
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  try {
    await store.fetchAccountById(route.params.id);
    const data = store.currentAccount;

    form.value.label = data.label;
    form.value.username = data.username;
    form.value.website = data.website;
    form.value.notes = data.notes;
  } catch (err) {
    error.value = "Data credential tidak ditemukan.";
  } finally {
    loading.value = false;
  }
});
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

    <Alert type="success" :title="success" :show="success" />
    <Alert type="error" :title="error" :show="error" />

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
            v-model="form.label"
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
            v-model="form.username"
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
