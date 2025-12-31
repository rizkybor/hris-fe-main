<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Shield,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  ArrowLeft,
  Clock,
  Key,
  Globe,
  FileText,
  Tag,
  User,
} from "lucide-vue-next";
import { useAccountPasswordStore } from "@/stores/accountPassword";

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
          class="border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all px-4 py-2 flex items-center gap-2"
        >
          <Pencil class="w-4 h-4 text-gray-600" />
          <span class="text-brand-dark font-semibold text-sm">Edit</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-20 text-gray-500">
      Loading credential detail...
    </div>

    <!-- Content -->
    <div
      v-if="account && !loading"
      class="bg-white border border-[#DCDEDD] rounded-[20px] p-6 space-y-6"
    >
      <!-- Label -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Label Password
        </label>
        <div class="flex items-center gap-3">
          <Tag class="w-5 h-5 text-gray-400" />
          <p class="text-brand-dark font-semibold">
            {{ account.label_password || account.label }}
          </p>
        </div>
      </div>

      <!-- Username / Email -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Username / Email
        </label>
        <div class="flex items-center gap-3">
          <User class="w-5 h-5 text-gray-400" />
          <p class="text-brand-dark font-mono font-semibold">
            {{ account.username_email || account.username || "—" }}
          </p>
        </div>
      </div>

      <!-- Password -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Password
        </label>

        <div
          class="flex items-center gap-3 px-4 py-3 border border-[#DCDEDD] rounded-[16px]"
        >
          <Key class="w-5 h-5 text-gray-400" />

          <span class="font-mono tracking-widest flex-1">
            {{ showPassword ? account.password : "••••••••••••" }}
          </span>

          <button
            @click="togglePassword"
            class="w-9 h-9 rounded-[10px] hover:bg-gray-100 flex items-center justify-center"
          >
            <Eye v-if="!showPassword" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>

          <button
            @click="copyPassword"
            class="w-9 h-9 rounded-[10px] hover:bg-gray-100 flex items-center justify-center"
          >
            <Copy class="w-4 h-4" />
          </button>
        </div>

        <p v-if="copied" class="text-xs text-success mt-1">
          Password copied to clipboard
        </p>
      </div>

      <!-- Website -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Website
        </label>
        <div class="flex items-center gap-3">
          <Globe class="w-5 h-5 text-gray-400" />
          <a
            v-if="account.website"
            :href="account.website"
            target="_blank"
            class="text-[#0C51D9] font-semibold hover:underline"
          >
            {{ account.website }}
          </a>
          <span v-else class="text-gray-400">—</span>
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">
          Notes
        </label>
        <div
          class="flex items-start gap-3 px-4 py-3 border border-[#DCDEDD] rounded-[16px] bg-gray-50"
        >
          <FileText class="w-5 h-5 text-gray-400 mt-0.5" />
          <p class="text-brand-dark whitespace-pre-line">
            {{ account.notes || "—" }}
          </p>
        </div>
      </div>

      <!-- Meta -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#DCDEDD]"
      >
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
</template>
