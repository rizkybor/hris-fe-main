<script setup>
import { HardDrive } from "lucide-vue-next";
import VpsMonitor from "@/components/admin/server-storage/VpsMonitor.vue";
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
          <p class="text-brand-light text-xs font-normal">Pemantauan disk, RAM, CPU, dan website setiap VPS yang Anda kelola</p>
        </div>
      </div>
    </div>

    <VpsMonitor />
  </div>
</template>
