<script setup>
// Wraps a per-product License Manager page: shows a skeleton while the
// products load, a not-found or inactive state, else the page itself.
import { PackageX, PowerOff, ArrowLeft } from "lucide-vue-next";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { can } from "@/helpers/permissionHelper";
import { UiButton } from "@/components/ui";

defineProps({
  state: { type: String, required: true },
  code: { type: String, default: "" },
  productName: { type: String, default: "" },
});
</script>

<template>
  <div v-if="state === 'loading'" class="bg-ui-surface border border-ui-line rounded-ui-card p-6 space-y-4">
    <Skeleton width="40%" height="24px" />
    <Skeleton height="80px" rounded="12px" />
    <Skeleton height="200px" rounded="12px" />
  </div>

  <div
    v-else-if="state === 'missing' || state === 'inactive'"
    class="max-w-xl mx-auto text-center py-14 px-6 bg-ui-surface border border-dashed border-ui-line-strong rounded-ui-card"
  >
    <div class="w-12 h-12 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center mx-auto mb-4">
      <component :is="state === 'missing' ? PackageX : PowerOff" class="w-6 h-6" />
    </div>
    <h3 class="text-ui-h2 text-ui-ink mb-1.5">
      {{ state === "missing" ? $t("licenses.gate.notFoundTitle") : $t("licenses.gate.inactiveTitle", { name: productName }) }}
    </h3>
    <p class="text-ui-small text-ui-muted mb-6">
      <template v-if="state === 'missing'">
        <i18n-t keypath="licenses.gate.notFoundMessage" tag="span" scope="global">
          <template #code><span class="font-mono font-medium text-ui-ink">{{ code }}</span></template>
        </i18n-t>
      </template>
      <template v-else>
        {{ $t("licenses.gate.inactiveMessage") }}
      </template>
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-2">
      <UiButton variant="secondary" :icon="ArrowLeft" :to="{ name: 'admin.license-manager.overview' }">{{ $t("licenses.title") }}</UiButton>
      <UiButton v-if="can('license-manager-edit')" :to="{ name: 'admin.license-manager.overview' }">{{ $t("licenses.gate.manageProducts") }}</UiButton>
    </div>
  </div>

  <slot v-else />
</template>
