<script setup>
import { ref, watch } from "vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";

// Props: archive yang ingin diedit
const props = defineProps({
  archive: {
    type: Object,
    required: true,
  },
});

const archiveStore = useFilesCompanyStore();

// Form reactive, diisi dari props.archive
const form = ref({
  file_name: props.archive?.file_name || "",
  description: props.archive?.description || "",
});

const submitting = ref(false);

// Watch props.archive jika berubah, update form
watch(
  () => props.archive,
  (newArchive) => {
    form.value.file_name = newArchive?.file_name || "";
    form.value.description = newArchive?.description || "";
  },
  { immediate: true }
);

// Submit update
const submit = async () => {
  if (!form.value.file_name) {
    alert("File name is required!");
    return;
  }

  submitting.value = true;
  try {
    await archiveStore.updateArchive(props.archive.id, {
      document_name: form.value.file_name,
      description: form.value.description,
    });
    alert("Archive updated successfully!");
  } catch (err) {
    console.error(err);
    alert("Failed to update archive.");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-[20px] p-6 max-w-2xl shadow-lg mx-auto my-10">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Edit Archive Metadata</h2>

    <div class="space-y-5">
      <!-- File Name -->
      <div>
        <label class="block text-gray-700 font-semibold mb-1">
          File Name <span class="text-red-600">*</span>
        </label>
        <input
          v-model="form.file_name"
          class="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Enter file name"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-gray-700 font-semibold mb-1">Description</label>
        <textarea
          v-model="form.description"
          class="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          rows="4"
          placeholder="Enter description"
        ></textarea>
      </div>

      <!-- Submit Button -->
      <button
        @click="submit"
        :disabled="submitting"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
      >
        {{ submitting ? "Saving..." : "Save Changes" }}
      </button>
    </div>
  </div>
</template>
