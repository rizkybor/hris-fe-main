<script setup>
import { ref } from "vue";

const form = ref({
  file_name: "",
  description: "",
  file: null,
});

const submit = () => {
  console.log(form.value);
};
</script>

<template>
  <div class="bg-white border rounded-[20px] p-6 max-w-2xl">
    <h2 class="text-lg font-bold mb-4">Upload File Archive</h2>

    <div class="space-y-4">
      <input v-model="form.file_name" class="input" placeholder="File Name" />
      <textarea
        v-model="form.description"
        class="input"
        placeholder="Archive Description"
      />
      <input type="file" @change="e => (form.file = e.target.files[0])" />

      <button
        @click="submit"
        class="px-4 py-2 bg-[#0C51D9] text-white rounded-xl"
      >
        Upload Archive
      </button>
    </div>
  </div>
</template>
