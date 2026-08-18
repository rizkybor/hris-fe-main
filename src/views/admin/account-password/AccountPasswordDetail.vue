<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  ArrowLeft,
  Clock,
  Key,
  Globe,
  FileText,
  User,
  Lock,
} from "lucide-vue-next";
import { useAccountPasswordStore } from "@/stores/accountPassword";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const route = useRoute();
const router = useRouter();
const store = useAccountPasswordStore();

const account = ref(null);
const loading = ref(true);
const error = ref("");
const showPassword = ref(false);
const copied = ref(false);

const formatDate = (date) =>
  new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const copyPassword = async () => {
  await navigator.clipboard.writeText(account.value.password);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
};

onMounted(async () => {
  try {
    await store.fetchAccount(route.params.id);
    account.value = store.currentAccount;
  } catch (err) {
    error.value = "Credential data not found.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <button
          @click="router.back()"
          class="w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-violet-400 hover:border-2 transition-all"
          aria-label="Back"
        >
          <ArrowLeft class="w-5 h-5 text-gray-600" />
        </button>

        <div
          class="w-12 h-12 bg-violet-50 rounded-[12px] flex items-center justify-center"
        >
          <ShieldCheck class="w-6 h-6 text-violet-600" />
        </div>

        <div class="flex-1">
          <h1 class="text-brand-dark text-xl font-bold">
            Account Credential Detail
          </h1>
          <p class="text-brand-light text-sm">
            Informasi credential (read-only)
          </p>
        </div>

        <button
          @click="
            router.push({
              name: 'admin.account-password.edit',
              params: { id: account?.id },
            })
          "
          class="btn-primary rounded-[12px] border border-violet-800 hover:brightness-110 focus:ring-2 focus:ring-violet-500 transition-all duration-300 bg-gradient-to-r from-violet-600 to-indigo-700 shadow-[inset_-2px_2px_1px_0_rgba(167,139,250,0.55),inset_2px_2px_1px_0_rgba(167,139,250,0.35)] px-4 py-2.5 flex items-center gap-2"
        >
          <Pencil class="w-4 h-4 text-white" />
          <span class="text-brand-white font-semibold text-sm">Edit</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 space-y-6">
      <Skeleton width="40%" height="18px" />
      <Skeleton width="60%" height="18px" />
      <Skeleton height="52px" rounded="16px" />
      <Skeleton width="50%" height="18px" />
      <Skeleton height="80px" rounded="16px" />
    </div>

    <!-- Content -->
    <div v-if="account && !loading" class="space-y-6">
      <!-- Vault hero -->
      <div class="bg-gradient-to-br from-[#1e1147] via-[#150c33] to-[#0f0a24] rounded-[14px] p-6 relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/20 rounded-full blur-2xl"></div>
        <div class="relative z-10 flex items-start gap-4">
          <div class="w-14 h-14 bg-white/10 border border-white/10 rounded-[14px] flex items-center justify-center shrink-0">
            <ShieldCheck class="w-7 h-7 text-violet-300" />
          </div>
          <div class="min-w-0">
            <h2 class="text-white text-2xl font-extrabold truncate">
              {{ account.label_password || account.label }}
            </h2>
            <div class="flex items-center gap-2 mt-2 text-violet-200">
              <User class="w-4 h-4 shrink-0" />
              <p class="font-mono text-sm truncate">{{ account.username_email || account.username || "—" }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Password -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-violet-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Lock class="w-4.5 h-4.5 text-violet-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Password</h4>
        </div>

        <div class="flex items-center gap-3 px-4 py-3 border border-[#DCDEDD] rounded-[12px]">
          <Key class="w-5 h-5 text-violet-400" />

          <span class="font-mono tracking-widest flex-1">
            {{ showPassword ? account.password : "••••••••••••" }}
          </span>

          <button
            @click="togglePassword"
            class="w-9 h-9 rounded-[10px] hover:bg-violet-50 hover:text-violet-600 flex items-center justify-center transition-colors"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
          >
            <Eye v-if="!showPassword" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>

          <button
            @click="copyPassword"
            class="w-9 h-9 rounded-[10px] hover:bg-violet-50 hover:text-violet-600 flex items-center justify-center transition-colors"
            aria-label="Copy password"
          >
            <Copy class="w-4 h-4" />
          </button>
        </div>

        <p v-if="copied" class="text-xs text-success mt-2">
          Password copied to clipboard
        </p>
      </div>

      <!-- Website & Notes -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-gray-100 rounded-[10px] flex items-center justify-center shrink-0">
            <FileText class="w-4.5 h-4.5 text-gray-500" />
          </div>
          <h4 class="text-brand-dark font-bold">Detail Tambahan</h4>
        </div>

        <div class="space-y-5">
          <div>
            <p class="text-xs text-gray-500 mb-1">Website</p>
            <div class="flex items-center gap-3">
              <Globe class="w-5 h-5 text-gray-400 shrink-0" />
              <a
                v-if="account.website"
                :href="account.website"
                target="_blank"
                class="text-violet-600 font-semibold hover:underline truncate"
              >
                {{ account.website }}
              </a>
              <span v-else class="text-gray-400">—</span>
            </div>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Notes</p>
            <div class="flex items-start gap-3 px-4 py-3 border border-[#DCDEDD] rounded-[12px] bg-gray-50">
              <FileText class="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <p class="text-brand-dark whitespace-pre-line">
                {{ account.notes || "—" }}
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 mt-5 border-t border-[#DCDEDD]">
          <div class="flex items-center gap-3">
            <Clock class="w-5 h-5 text-gray-400" />
            <div>
              <p class="text-xs text-gray-500">Created At</p>
              <p class="text-sm font-semibold">
                {{ formatDate(account.created_at) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <Clock class="w-5 h-5 text-gray-400" />
            <div>
              <p class="text-xs text-gray-500">Last Updated</p>
              <p class="text-sm font-semibold">
                {{ formatDate(account.updated_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
