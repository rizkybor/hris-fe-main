<script setup>
import { SIGNATORIES } from "@/utils/signatories";

const model = defineModel({ type: Boolean, default: false });

defineProps({
  hint: { type: String, default: "" },
});
</script>

<template>
  <div>
    <label class="flex items-center gap-2.5 cursor-pointer w-fit">
      <input type="checkbox" v-model="model" class="w-4 h-4 rounded border-ui-line-strong accent-[rgb(var(--ui-ink))]" />
      <span class="text-ui-small font-medium text-ui-ink">{{ $t("common.signature.label") }}</span>
    </label>
    <p class="text-ui-cap text-ui-muted mt-1">
      {{ hint || $t("common.signature.hint") }}
      {{ $t("common.signature.availableFor", { names: SIGNATORIES.join(", ") }) }}
    </p>
  </div>
</template>
