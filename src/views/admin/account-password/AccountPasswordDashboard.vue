<script setup>
import { onMounted, watch, ref, computed } from "vue";
import { storeToRefs } from "pinia";
import {
  Shield,
  Key,
  Trash2,
  AlertTriangle,
  Eye,
  Copy,
  Pencil,
  Search,
} from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useAccountPasswordStore } from "@/stores/accountPassword";

const passwordStore = useAccountPasswordStore();
const { accounts, statistics, loading, success } = storeToRefs(passwordStore);
const searchQuery = ref("");
const isDeleteModalOpen = ref(false);
const accountToDelete = ref(null);
const isDeleting = ref(false);

// Fungsi filter pencarian
const filteredAccounts = computed(() => {
  if (!searchQuery.value) return accounts.value;

  const query = searchQuery.value.toLowerCase();
  return accounts.value.filter((account) => {
    const label = (account.label_password || account.label || "").toLowerCase();
    const username = (
      account.username_email ||
      account.username ||
      ""
    ).toLowerCase();
    return label.includes(query) || username.includes(query);
  });
});

watch(success, (newValue) => {
  if (newValue) {
    setTimeout(() => {
      passwordStore.$patch({ success: null });
    }, 3000);
  }
});

onMounted(async () => {
  // await passwordStore.fetchStatistics();
  await passwordStore.fetchAccounts();
});

const confirmDelete = (account) => {
  accountToDelete.value = account;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!accountToDelete.value) return;

  isDeleting.value = true;
  try {
    await passwordStore.deleteAccount(accountToDelete.value.id);
    isDeleteModalOpen.value = false;
    accountToDelete.value = null;
  } catch (err) {
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
};

const copyPassword = (password) => {
  navigator.clipboard.writeText(password);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
</script>

<template>
  <div>
    <!-- ================= STATS LAYOUT ================= -->
    <div class="gap-4 mb-6">
      <!-- Main Card -->
      <div
        class="main-card lg:row-span-2 rounded-[20px] border border-[#0B1042] relative overflow-hidden p-5"
      >
        <div class="flex flex-col justify-center h-full relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <div
              class="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm"
            >
              <Shield class="w-3 h-3 text-white" />
              <span class="text-brand-white text-xs font-semibold">
                Credential Vault
              </span>
            </div>
          </div>

          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4"
          >
            <div class="flex-1 min-w-0 pr-2">
              <p class="text-brand-white-90 text-sm font-medium">
                Stored Accounts
              </p>
              <p
                class="text-brand-white text-4xl lg:text-5xl font-extrabold leading-none my-4"
              >
                {{ loading ? "..." : statistics.total_accounts }}
              </p>
              <p class="text-brand-white-80 text-base font-normal">
                Internal systems & services
              </p>
            </div>
            <div
              class="w-16 h-16 bg-white/20 rounded-[20px] flex items-center justify-center"
            >
              <Key class="w-8 h-8 text-white" />
            </div>
          </div>

          <div class="flex items-center gap-3 mt-auto">
            <span class="text-brand-white-70 text-xs"> Restricted Access </span>
          </div>
        </div>
      </div>
    </div>

    <div class="mb-6">
      <Transition name="fade">
        <Alert
          v-if="success"
          type="success"
          :title="success"
          :show="!!success"
        />
      </Transition>
    </div>

    <!-- ================= ACCOUNT LIST ================= -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5">
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4"
      >
        <h3 class="text-brand-dark text-lg font-bold">
          Stored Account Credentials
        </h3>

        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <!-- SEARCH -->
          <div class="relative w-full sm:w-auto flex-1 sm:flex-none">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
  <Search class="w-4 h-4 text-blue-400" />
</div>


            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name or email..."
              class="relative w-full sm:w-64 pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            />
          </div>

          <router-link
            :to="{ name: 'admin.account-password.create' }"
            class="w-full sm:w-auto text-center px-4 py-2 rounded-xl bg-[#0C51D9] text-white text-sm font-semibold hover:bg-[#0A45BF] transition"
          >
            + Add Credential
          </router-link>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-for="account in filteredAccounts"
          :key="account.id"
          class="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:shadow-sm transition-all"
        >
          <div
            class="w-16 h-16 relative flex items-center justify-center rounded-[12px] overflow-hidden"
          >
            <!-- ICON -->
            <div
              class="w-12 h-12 sm:w-16 sm:h-16 relative flex items-center justify-center rounded-lg sm:rounded-[12px] overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600"
            >
              <Key class="w-6 h-6 sm:w-8 sm:h-8 text-white relative z-10" />
            </div>
          </div>

          <div class="flex-1">
            <p class="text-brand-dark text-lg font-bold">
              {{ account.label_password || account.label }}
            </p>

            <p class="text-brand-dark text-sm font-mono">
              {{ account.username_email || account.username }}
            </p>

            <div class="flex items-center gap-2 mt-1">
              <span
                v-if="account.website"
                class="text-xs px-2 py-1 rounded-md bg-green-50 text-green-700 font-semibold"
              >
                Has Website
              </span>

              <span
                v-if="account.notes"
                class="text-xs px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 font-semibold"
              >
                Has Notes
              </span>
            </div>

            <p class="text-brand-light text-xs mt-1">
              Updated on {{ formatDate(account.updated_at) }}
            </p>
          </div>

          <div
            class="hidden sm:block font-mono tracking-widest text-brand-dark text-xs"
          >
            ••••••••
          </div>
          <div
            class="grid grid-cols-4 sm:flex items-center gap-2 w-full sm:w-auto"
          >
            <router-link
              :to="{
                name: 'admin.account-password.detail',
                params: { id: account.id },
              }"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:ring-2 hover:ring-[#0C51D9]"
            >
              <Eye class="w-4 h-4 text-gray-600" />
            </router-link>

            <router-link
              :to="{
                name: 'admin.account-password.edit',
                params: { id: account.id },
              }"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:ring-2 hover:ring-[#0C51D9]"
            >
              <Pencil class="w-4 h-4 text-gray-600" />
            </router-link>

            <button
              @click="confirmDelete(account)"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group transition-all"
              title="Delete Account"
            >
              <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
            </button>

            <button
              @click="copyPassword(account.password)"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:ring-2 hover:ring-[#0C51D9]"
            >
              <Copy class="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div
          v-if="!loading && filteredAccounts.length === 0"
          class="text-center py-12 text-gray-500 bg-gray-50 rounded-[16px] border border-dashed border-[#DCDEDD]"
        >
          <Search class="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p class="text-lg font-semibold">No results found</p>
          <p class="text-sm text-gray-400">
            Try searching with a different keyword for "{{ searchQuery }}"
          </p>
        </div>

        <div
          v-if="!loading && accounts.length === 0"
          class="text-center py-12 text-gray-500"
        >
          <p class="text-lg font-semibold">No account data found</p>
          <p class="text-sm">No stored credentials available</p>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL  -->
  <Transition name="fade">
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-[99] flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
        @click="isDeleteModalOpen = false"
      ></div>

      <div
        class="bg-white rounded-[24px] p-6 w-full max-w-sm relative z-10 shadow-2xl transform transition-all"
        style="max-width: 40vw; border-radius: 10px"
      >
        <button
          @click="isDeleteModalOpen = false"
          class="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X class="w-5 h-5" />
        </button>

        <div class="text-center">
          <div
            class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <AlertTriangle class="w-8 h-8 text-red-500" />
          </div>

          <h3 class="text-xl font-bold text-brand-dark mb-2">
            Delete Credential?
          </h3>
          <p class="text-gray-500 text-sm mb-6">
            Are you sure you want to delete
            <span class="font-bold text-brand-dark"
              >"{{
                accountToDelete?.label_password || accountToDelete?.label
              }}"</span
            >? This action cannot be undone.
          </p>

          <div class="grid grid-cols-2 gap-3">
            <button
              @click="isDeleteModalOpen = false"
              class="px-4 py-3 rounded-xl border border-[#DCDEDD] font-semibold text-brand-dark hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              @click="handleDelete"
              :disabled="isDeleting"
              class="px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Trash2 v-if="!isDeleting" class="w-4 h-4" />
              {{ isDeleting ? "Deleting..." : "Yes, Delete" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Animasi Scale untuk Modal Content */
.fade-enter-active .bg-white {
  animation: modal-in 0.3s ease-out;
}
.fade-leave-active .bg-white {
  animation: modal-in 0.2s ease-in reverse;
}

@keyframes modal-in {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
