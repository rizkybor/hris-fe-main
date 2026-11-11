<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, LayoutDashboard } from "lucide-vue-next";
import { UiButton } from "@/components/ui";

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
    class="flex items-center justify-center px-4 font-sans"
    :class="props.standalone ? 'min-h-screen bg-ui-bg' : 'py-16'"
  >
    <div class="w-full max-w-md text-center ui-anim-fade-up">
      <p class="text-[72px] leading-[80px] font-semibold tracking-[-0.04em] text-ui-line-strong tabular-nums">404</p>
      <h1 class="text-ui-h1 text-ui-ink mt-2">Halaman tidak ditemukan</h1>
      <p class="text-ui-small text-ui-muted mt-2">Alamat yang Anda buka tidak tersedia, sudah dipindahkan, atau Anda tidak memiliki akses.</p>
      <p class="font-mono text-ui-cap text-ui-faint mt-2 break-all">{{ path }}</p>
      <div class="flex flex-col sm:flex-row gap-2.5 justify-center mt-7">
        <UiButton variant="secondary" :icon="ArrowLeft" @click="goBack">Kembali</UiButton>
        <UiButton to="/admin/dashboard" :icon="LayoutDashboard">Ke Dashboard</UiButton>
      </div>
    </div>
  </div>
</template>
