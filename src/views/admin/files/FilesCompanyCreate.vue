<script setup>
import { ref } from "vue";
import BaseInput from "@/components/common/form/Input.vue";
import TextArea from "@/components/common/form/TextArea.vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";

const archiveStore = useFilesCompanyStore();

// Form state
const form = ref({
  file_name: "",
  description: "",
  file: null,
});

// Error state
const fileError = ref(false);
const nameError = ref(false);

// Submit function
const submit = async () => {
  // Reset errors
  fileError.value = false;
  nameError.value = false;

  // Validation
  if (!form.value.file_name) nameError.value = true;
  if (!form.value.file) fileError.value = true;

  if (nameError.value || fileError.value) return;

  // Prepare FormData
  const payload = new FormData();
  payload.append("document_name", form.value.file_name);
  payload.append("description", form.value.description || "");
  payload.append("document_path", form.value.file);
  payload.append("type_file", form.value.file.type);
  payload.append("size_file", form.value.file.size);

  try {
    await archiveStore.createArchive(payload);
    alert("File uploaded successfully!");
    form.value.file_name = "";
    form.value.description = "";
    form.value.file = null;

    router.push("/admin/files-company");
  } catch (err) {
    console.error(err);
    alert("Failed to upload file.");
  }
};
</script>

<template>
  <div class="w-full min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <div class="bg-white border border-gray-200 rounded-[20px] p-8 w-full max-w-4xl shadow-lg">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">Upload File</h2>

      <div class="space-y-5">
        <!-- File Name -->
        <BaseInput
          id="file_name"
          label="File Name"
          placeholder="Enter file name"
          v-model="form.file_name"
          :class="{ 'border-red-600': nameError }"
          required
        />
        <p v-if="nameError" class="text-red-600 text-[14px]">File name is required.</p>

        <!-- Description -->
        <TextArea
          id="description"
          label="Archive Description"
          placeholder="Enter a description"
          v-model="form.description"
          rows="5"
        />

        <!-- File Upload -->
        <div>
          <label class="block mb-2 text-gray-700 font-semibold font-jakarta text-[14px]">
            Upload File<span class="text-red-600 ml-1">*</span>
          </label>
          <input
            type="file"
            @change="e => { form.file = e.target.files[0]; fileError.value = false }"
            class="w-full text-gray-700 file:border file:border-gray-300 file:rounded-lg file:px-4 file:py-2 file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200 cursor-pointer"
          />
          <p v-if="fileError" class="mt-2 text-red-600 text-[14px]">File is required.</p>
        </div>

        <!-- Submit Button -->
        <button
          @click="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl transition-all duration-200"
        >
          Upload Archive
        </button>
      </div>
    </div>
  </div>
</template>
