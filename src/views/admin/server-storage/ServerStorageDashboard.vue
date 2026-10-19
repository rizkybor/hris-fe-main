<script setup>
import { ref } from "vue";
import { HardDrive, Server, AppWindow } from "lucide-vue-next";
import VpsMonitor from "@/components/admin/server-storage/VpsMonitor.vue";
import AppServerStorage from "@/components/admin/server-storage/AppServerStorage.vue";

const tabs = [
  { key: "vps", label: "VPS", icon: Server },
  { key: "app", label: "Server Aplikasi HRIS", icon: AppWindow },
];
const tab = ref("vps");
</script>

<template>
  <div class="px-4 py-4">
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 mb-5">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
          <HardDrive class="w-6 h-6 text-blue-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">Server Storage</h3>
          <p class="text-brand-light text-xs font-normal">Pemantauan disk, RAM, dan CPU setiap VPS yang Anda kelola</p>
        </div>
      </div>

      <div class="flex gap-1 mt-4 border-b border-[#DCDEDD] -mb-5 -mx-5 px-5">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="px-3.5 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5 border-b-2 -mb-px transition-colors"
          :class="tab === t.key ? 'border-[#0C51D9] text-[#0C51D9]' : 'border-transparent text-brand-light hover:text-brand-dark'"
          @click="tab = t.key"
        >
          <component :is="t.icon" class="w-4 h-4" />
          {{ t.label }}
        </button>
      </div>
    </div>

    <VpsMonitor v-if="tab === 'vps'" />
    <AppServerStorage v-else />
  </div>
</template>
