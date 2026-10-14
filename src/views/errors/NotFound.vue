<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FileQuestion, ArrowLeft, LayoutDashboard } from "lucide-vue-next";

// Shown for any unknown URL: inside the admin layout (sidebar stays) for
// /admin/..., or as a standalone page elsewhere.
const props = defineProps({
  standalone: { type: Boolean, default: false },
});

const route = useRoute();
const router = useRouter();
const path = computed(() => route.fullPath);

const goBack = () => (window.history.length > 1 ? router.back() : router.push("/admin/dashboard"));
</script>

<template>
  <div
    class="flex items-center justify-center px-4"
    :class="props.standalone ? 'min-h-screen bg-slate-50' : 'py-16'"
  >
    <div class="w-full max-w-md bg-white border border-[#DCDEDD] rounded-[14px] p-8 text-center">
      <div class="w-14 h-14 rounded-[14px] bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <FileQuestion class="w-7 h-7 text-[#0C51D9]" />
      </div>
      <p class="text-xs font-bold tracking-widest text-[#0C51D9] mb-1">404</p>
      <h1 class="text-brand-dark text-xl font-bold mb-2">Halaman tidak ditemukan</h1>
      <p class="text-brand-light text-sm mb-1">Alamat yang Anda buka tidak tersedia, sudah dipindahkan, atau Anda tidak memiliki akses.</p>
      <p class="text-gray-400 text-xs mb-6 break-all">{{ path }}</p>
      <div class="flex flex-col sm:flex-row gap-2.5 justify-center">
        <button
          type="button"
          class="rounded-[10px] border border-[#DCDEDD] bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-colors inline-flex items-center justify-center gap-1.5"
          @click="goBack"
        >
          <ArrowLeft class="w-4 h-4" /> Kembali
        </button>
        <RouterLink
          to="/admin/dashboard"
          class="btn-primary rounded-[10px] border border-[#2151A0] blue-gradient blue-btn-shadow px-4 py-2.5 inline-flex items-center justify-center gap-1.5"
        >
          <LayoutDashboard class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Ke Dashboard</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
