<script setup>
import { ref } from "vue";

const form = ref({
  file_name: "Kontrak Vendor.pdf",
  description: "Kontrak kerja sama vendor",
});
</script>

<template>
  <div class="bg-white border rounded-[20px] p-6 max-w-2xl">
    <h2 class="text-lg font-bold mb-4">Edit Archive Metadata</h2>

    <div class="space-y-4">
      <input v-model="form.file_name" class="input" />
      <textarea v-model="form.description" class="input" />

      <button class="px-4 py-2 bg-[#0C51D9] text-white rounded-xl">
        Save Changes
      </button>
    </div>
  </div>
</template>
