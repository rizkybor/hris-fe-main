<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Shield, Key, Users, Clock, Eye, Copy, Pencil } from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useAccountPasswordStore } from "@/stores/accountPassword";

const passwordStore = useAccountPasswordStore();
const { accounts, statistics, loading, success } = storeToRefs(passwordStore);

onMounted(async () => {
  await passwordStore.fetchStatistics();
  await passwordStore.fetchAccounts();
});

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
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

          <div class="flex items-center justify-between mb-4">
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

      <!-- Total Systems -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Systems</p>
            <p class="text-brand-dark text-3xl font-extrabold my-2">
              {{ loading ? "..." : statistics.total_systems }}
            </p>
            <p class="text-success text-sm font-medium">Active</p>
          </div>
          <div
            class="w-12 h-12 bg-blue-50 rounded-[16px] flex items-center justify-center"
          >
            <Shield class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <!-- Total Users -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Users</p>
            <p class="text-brand-dark text-3xl font-extrabold my-2">
              {{ loading ? "..." : statistics.total_users }}
            </p>
            <p class="text-purple-600 text-sm font-medium">Assigned</p>
          </div>
          <div
            class="w-12 h-12 bg-purple-50 rounded-[16px] flex items-center justify-center"
          >
            <Users class="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      <!-- Last Updated -->
      <div
        class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Last Update</p>
            <p class="text-brand-dark text-lg font-bold my-2">
              {{ statistics.last_updated }}
            </p>
            <p class="text-brand-light text-sm">Latest credential change</p>
          </div>
          <div
            class="w-12 h-12 bg-green-50 rounded-[16px] flex items-center justify-center"
          >
            <Clock class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
    </div>

    <Alert type="success" :title="success" :show="success" />

    <!-- ================= ACCOUNT LIST ================= -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-brand-dark text-lg font-bold">
          Stored Account Credentials
        </h3>

        <router-link
          :to="{ name: 'admin.account-password.create' }"
          class="px-4 py-2 rounded-xl bg-[#0C51D9] text-white text-sm font-semibold hover:hover:bg-[#0A45BF] transition"
        >
          + Add Credential
        </router-link>
      </div>

      <div class="space-y-4">
        <div
          v-for="account in accounts"
          :key="account.id"
          class="flex items-center gap-4 p-4 border border-[#DCDEDD] rounded-[16px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300"
        >
          <!-- Icon -->
          <div
            class="w-16 h-16 relative flex items-center justify-center rounded-[12px] overflow-hidden"
          >
            <div
              class="w-full h-full absolute bg-gradient-to-br from-primary-500 to-primary-600"
            ></div>
            <Key class="w-8 h-8 text-white relative z-10" />
          </div>

          <!-- Info -->
          <div class="flex-1">
            <!-- Label -->
            <p class="text-brand-dark text-lg font-bold">
              {{ account.label_password || account.label }}
            </p>

            <!-- Username -->
            <p class="text-brand-dark text-sm font-mono">
              {{ account.username_email || account.username }}
            </p>

            <!-- Badges -->
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

            <!-- Meta -->
            <p class="text-brand-light text-xs mt-1">
              Updated on {{ formatDate(account.updated_at) }}
            </p>
          </div>

          <!-- Password -->
          <div class="font-mono tracking-widest text-brand-dark">••••••••</div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <!-- Detail -->
            <router-link
              :to="{
                name: 'admin.account-password.detail',
                params: { id: account.id },
              }"
              class="border border-[#DCDEDD] rounded-xl p-2 hover:ring-2 hover:ring-[#0C51D9]"
            >
              <Eye class="w-4 h-4 text-gray-600" />
            </router-link>

            <!-- Edit -->
            <router-link
              :to="{
                name: 'admin.account-password.edit',
                params: { id: account.id },
              }"
              class="border border-[#DCDEDD] rounded-xl p-2 hover:ring-2 hover:ring-[#0C51D9]"
            >
              <Pencil class="w-4 h-4 text-gray-600" />
            </router-link>

            <!-- Copy -->
            <button
              @click="copyPassword(account.password)"
              class="border border-[#DCDEDD] rounded-xl p-2 hover:ring-2 hover:ring-[#0C51D9]"
            >
              <Copy class="w-4 h-4 text-gray-600" />
            </button>
          </div>
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
</template>
