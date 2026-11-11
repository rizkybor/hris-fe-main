<script setup>
import { SIGNATORIES } from "@/utils/signatories";

// Opt-in for stamping the signatory's scanned signature onto the exported
// PDF. The backend only has signatures on file for SIGNATORIES; any other
// signatory name renders the usual blank space even when this is checked.
const model = defineModel({ type: Boolean, default: false });

defineProps({
  hint: { type: String, default: "" },
});
</script>

<template>
  <div>
    <label class="flex items-center gap-2.5 cursor-pointer w-fit">
      <input type="checkbox" v-model="model" class="w-4 h-4 rounded border-ui-line-strong accent-[rgb(var(--ui-ink))]" />
      <span class="text-ui-small font-medium text-ui-ink">Use Signature (TTD)</span>
    </label>
    <p class="text-ui-cap text-ui-muted mt-1">
      {{ hint || "Stamps the signatory's signature onto the PDF." }}
      Available for: {{ SIGNATORIES.join(", ") }}.
    </p>
  </div>
</template>
