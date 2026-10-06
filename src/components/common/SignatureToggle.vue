<script setup>
// Opt-in for stamping the signatory's scanned signature onto the exported
// PDF. The backend only has signatures on file for the names below (see
// hris-api App\Support\SignatureImage); any other signatory name renders
// the usual blank space even when this is checked.
const model = defineModel({ type: Boolean, default: false });

defineProps({
  hint: { type: String, default: "" },
});

const SIGNERS = ["Aldi PP, S.Ikom", "Andy Saputra, S.T.", "Rizky Ajie Kurniawan, S.Kom"];
</script>

<template>
  <div>
    <label class="flex items-center gap-2 cursor-pointer w-fit">
      <input type="checkbox" v-model="model" class="w-4 h-4" />
      <span class="text-sm font-semibold text-brand-dark">Use Signature (TTD)</span>
    </label>
    <p class="text-xs text-gray-400 mt-1">
      {{ hint || "Stamps the signatory's signature onto the PDF." }}
      Available for: {{ SIGNERS.join(", ") }}.
    </p>
  </div>
</template>
