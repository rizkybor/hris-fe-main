<script setup>
import { HardDrive } from "lucide-vue-next";
import VpsMonitor from "@/components/admin/server-storage/VpsMonitor.vue";
</script>

<template>
  <!-- The admin layout already pads the page, so phones get little extra. -->
  <div class="px-0.5 py-1 sm:px-4 sm:py-4">
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5 mb-4 sm:mb-5">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
          <HardDrive class="w-6 h-6 text-blue-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">Server Lists</h3>
          <p class="text-brand-light text-xs font-normal">Pemantauan disk, RAM, CPU, dan website setiap VPS yang Anda kelola</p>
        </div>
      </div>
    </div>

    <VpsMonitor />
  </div>
</template>
