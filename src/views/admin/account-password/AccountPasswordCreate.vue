<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  Globe,
  FileText,
  Key,
  Tag,
  User,
  IdCard,
  Lock,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useAccountPasswordStore } from "@/stores/accountPassword";
import { errorMessage } from "@/helpers/errorHelper";

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

// Purely visual guidance -- the vault stores arbitrary third-party
// passwords, so strength isn't enforced here, just hinted at.
const passwordStrength = computed(() => {
  const value = form.value.password || "";
  if (!value) return { score: 0, label: "", color: "" };

  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  if (score <= 1) return { score: 1, label: "Lemah", color: "bg-red-500" };
  if (score <= 3) return { score: 2, label: "Cukup", color: "bg-amber-500" };
  return { score: 3, label: "Kuat", color: "bg-emerald-500" };
});

const submit = async () => {
  error.value = "";
  success.value = "";

  if (
    !form.value.label_password ||
    !form.value.username_email ||
    !form.value.password
  ) {
    error.value = "Password Label, Username/Email, and Password are required.";
    return;
  }

  loading.value = true;
  try {
    await passwordStore.createAccount(form.value);

    success.value = "Credential saved successfully.";

    setTimeout(() => {
      router.push({ name: "admin.account-password.dashboard" });
    }, 1200);
  } catch (err) {
    error.value = errorMessage(err, "Failed to save credential.");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 bg-violet-50 rounded-[12px] flex items-center justify-center"
        >
          <ShieldCheck class="w-6 h-6 text-violet-600" />
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

    <div class="mb-6">
      <Transition name="fade">
        <Alert
          v-if="error"
          type="danger"
          :title="error"
          message=""
          :show="!!error"
          @close="error = ''"
        />
      </Transition>
      <Transition name="fade">
        <Alert v-if="success" type="success" :title="success" message="" :show="!!success" />
      </Transition>
    </div>

    <form @submit.prevent="submit" class="space-y-6">
      <!-- Account Detail -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-violet-50 rounded-[10px] flex items-center justify-center shrink-0">
            <IdCard class="w-4.5 h-4.5 text-violet-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Detail Akun</h4>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="md:col-span-2">
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">Password Label *</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Tag class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.label_password"
                type="text"
                placeholder="e.g. ERP Finance Admin, VPN Office"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">Username / Email *</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.username_email"
                type="text"
                placeholder="e.g. admin@company.com / admin.erp"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">Website (Optional)</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Globe class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.website"
                type="url"
                placeholder="https://example.com"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-300 font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Password -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-violet-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Lock class="w-4.5 h-4.5 text-violet-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Password</h4>
        </div>

        <label class="block text-brand-dark text-sm font-semibold mb-1.5">Password *</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Key class="w-5 h-5 text-gray-400" />
          </div>

          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter secure password"
            class="w-full pl-12 pr-12 py-3 border border-[#DCDEDD] rounded-[12px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-300 font-mono"
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

        <div v-if="form.password" class="flex items-center gap-2 mt-2.5">
          <div class="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden flex gap-0.5">
            <div
              v-for="i in 3"
              :key="i"
              class="flex-1 h-full rounded-full transition-colors"
              :class="i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-100'"
            ></div>
          </div>
          <span class="text-xs font-semibold shrink-0" :class="{
            'text-red-600': passwordStrength.score === 1,
            'text-amber-600': passwordStrength.score === 2,
            'text-emerald-600': passwordStrength.score === 3,
          }">{{ passwordStrength.label }}</span>
        </div>
      </div>

      <!-- Notes -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-gray-100 rounded-[10px] flex items-center justify-center shrink-0">
            <FileText class="w-4.5 h-4.5 text-gray-500" />
          </div>
          <h4 class="text-brand-dark font-bold">Catatan</h4>
        </div>

        <label class="block text-brand-dark text-sm font-semibold mb-1.5">Notes (Optional)</label>
        <div class="relative">
          <div class="absolute top-3 left-4 pointer-events-none">
            <FileText class="w-5 h-5 text-gray-400" />
          </div>
          <textarea
            v-model="form.notes"
            rows="4"
            placeholder="Additional notes or instructions..."
            class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-300 font-normal resize-none"
          ></textarea>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          @click="$router.back()"
          class="w-full sm:w-auto border border-[#DCDEDD] rounded-[12px] hover:border-violet-400 hover:bg-violet-50/30 transition-all duration-300 px-6 py-3 text-brand-dark font-semibold"
        >
          Cancel
        </button>

        <button
          type="submit"
          :disabled="loading"
          class="w-full sm:w-auto btn-primary rounded-[12px] border border-violet-800 hover:brightness-110 focus:ring-2 focus:ring-violet-500 transition-all duration-300 bg-gradient-to-r from-violet-600 to-indigo-700 shadow-[inset_-2px_2px_1px_0_rgba(167,139,250,0.55),inset_2px_2px_1px_0_rgba(167,139,250,0.35)] px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">
            {{ loading ? "Saving..." : "Save Credential" }}
          </span>
        </button>
      </div>
    </form>
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
