<script setup>
// Wraps a per-product License Manager page: shows a skeleton while the
// products load, a not-found or inactive state, else the page itself.
import { PackageX, PowerOff, ArrowLeft } from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { can } from "@/helpers/permissionHelper";

defineProps({
  state: { type: String, required: true },
  code: { type: String, default: "" },
  productName: { type: String, default: "" },
});
</script>

<template>
  <div v-if="state === 'loading'" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 space-y-4">
    <Skeleton width="40%" height="24px" />
    <Skeleton height="80px" rounded="14px" />
    <Skeleton height="200px" rounded="14px" />
  </div>

  <div
    v-else-if="state === 'missing' || state === 'inactive'"
    class="max-w-xl mx-auto text-center py-14 px-6 bg-white border border-dashed border-[#DCDEDD] rounded-[14px]"
  >
    <component :is="state === 'missing' ? PackageX : PowerOff" class="w-10 h-10 text-gray-300 mx-auto mb-4" />
    <h3 class="text-brand-dark text-base font-bold mb-1.5">
      {{ state === "missing" ? "Product not found" : `${productName} is inactive` }}
    </h3>
    <p class="text-brand-light text-sm mb-6">
      <template v-if="state === 'missing'">
        There is no product with the code <span class="font-mono font-semibold text-brand-dark">{{ code }}</span>.
      </template>
      <template v-else>
        This product is switched off: its keys cannot be activated. Switch it on in the License Manager overview to manage its licenses.
      </template>
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <RouterLink
        :to="{ name: 'admin.license-manager.overview' }"
        class="inline-flex items-center gap-2 border border-[#DCDEDD] rounded-[12px] px-4 py-2.5 text-sm font-semibold text-brand-dark hover:border-violet-400"
      >
        <ArrowLeft class="w-4 h-4" /> License Manager
      </RouterLink>
      <RouterLink
        v-if="can('license-manager-edit')"
        :to="{ name: 'admin.license-manager.overview' }"
        class="inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-700"
      >
        Manage products
      </RouterLink>
    </div>
  </div>

  <slot v-else />
</template>
