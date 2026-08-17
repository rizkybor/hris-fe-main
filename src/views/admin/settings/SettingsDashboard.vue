<script setup>
import { SettingsIcon, ShieldCheck, KeyRound, UserCog, ChevronRight, Tags, DatabaseBackup, Users2Icon } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";
import { useBackupStore } from "@/stores/backup";
import { storeToRefs } from "pinia";
import Alert from "@/components/common/Alert.vue";

const backupStore = useBackupStore();
const { loading: backupLoading, error: backupError } = storeToRefs(backupStore);

const handleBackup = async () => {
  try {
    await backupStore.downloadBackup();
  } catch (e) {
    // error state is already surfaced via backupError
  }
};

const links = [
  {
    to: { name: "admin.settings.roles" },
    icon: ShieldCheck,
    title: "Roles & Permissions",
    description: "Manage user roles and control access to each module",
    permission: "role-menu",
  },
  {
    to: { name: "admin.settings.document-codes" },
    icon: Tags,
    title: "Kode Surat & Divisi",
    description: "Manage the letter code and division code reference lists",
    permission: "letter-menu",
  },
  {
    to: { name: "admin.account-password.dashboard" },
    icon: KeyRound,
    title: "Account & Credentials",
    description: "Manage stored company account credentials",
    permission: "credential-account-menu",
  },
  {
    to: { name: "admin.settings.sdm-fields" },
    icon: Users2Icon,
    title: "Bidang SDM",
    description: "Manage the role/field list used by SDM Resource in Operational Cost",
    permission: "sdm-field-menu",
  },
  {
    to: { name: "employee.profile" },
    icon: UserCog,
    title: "My Profile",
    description: "Update your personal profile information",
    permission: null,
  },
];
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <SettingsIcon class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Settings</h3>
          <p class="text-brand-light text-sm">
            Manage roles, permissions, and account preferences
          </p>
        </div>
      </div>
    </div>

    <div class="mb-6">
      <Alert
        v-if="backupError"
        type="danger"
        :title="typeof backupError === 'string' ? backupError : 'Failed to generate backup'"
        message=""
        :show="!!backupError"
        @close="backupError = null"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <template v-for="link in links" :key="link.title">
        <router-link
          v-if="!link.permission || can(link.permission)"
          :to="link.to"
          class="bg-white border border-[#DCDEDD] rounded-[12px] p-5 flex items-start gap-4 hover:border-[#0C51D9] hover:shadow-sm transition-all"
        >
          <div
            class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0"
          >
            <component :is="link.icon" class="w-6 h-6 text-[#0C51D9]" />
          </div>
          <div class="flex-1">
            <p class="text-brand-dark text-base font-bold">{{ link.title }}</p>
            <p class="text-brand-light text-sm mt-1">{{ link.description }}</p>
          </div>
          <ChevronRight class="w-5 h-5 text-gray-400 shrink-0 mt-1" />
        </router-link>
      </template>

      <button
        v-if="can('backup-create')"
        type="button"
        @click="handleBackup"
        :disabled="backupLoading"
        class="bg-white border border-[#DCDEDD] rounded-[12px] p-5 flex items-start gap-4 hover:border-[#0C51D9] hover:shadow-sm transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div
          class="w-12 h-12 bg-red-50 rounded-[12px] flex items-center justify-center shrink-0"
        >
          <span
            v-if="backupLoading"
            class="w-5 h-5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"
          ></span>
          <DatabaseBackup v-else class="w-6 h-6 text-red-600" />
        </div>
        <div class="flex-1">
          <p class="text-brand-dark text-base font-bold">
            {{ backupLoading ? "Preparing backup..." : "Backup Database" }}
          </p>
          <p class="text-brand-light text-sm mt-1">
            Download a full SQL backup of every table in the database
          </p>
        </div>
      </button>
    </div>
  </div>
</template>
