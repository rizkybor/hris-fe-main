<script setup>
import { ref, computed, onMounted } from "vue";
import BaseInput from "@/components/common/form/Input.vue";
import TextArea from "@/components/common/form/TextArea.vue";
import { useFilesCompanyStore } from "@/stores/filesCompany";
import { useRoute, useRouter } from "vue-router";

const archiveStore = useFilesCompanyStore();
const route = useRoute();
const router = useRouter();
const archiveId = route.params.id;

// States
const loading = ref(true);
const error = ref(null);
const form = ref({
  document_name: "",
  description: "",
  new_file: null,
  remove_file: false,
});
const submitting = ref(false);
const fileNameError = ref(false);

// Format tanggal
const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Cek apakah file image
const isImage = (type) => type?.startsWith("image/");

// Fetch archive by ID
const fetchArchive = async () => {
  loading.value = true;
  try {
    await archiveStore.fetchArchiveById(archiveId);
    const archive = archiveStore.currentArchive;
    if (!archive) {
      error.value = "Archive not found.";
      return;
    }
    form.value.document_name = archive.document_name || "";
    form.value.description = archive.description || "";
    form.value.new_file = null;
    form.value.remove_file = false;
  } catch (err) {
    console.error(err);
    error.value = "Failed to load archive.";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchArchive();
});

// Pilih file baru
const onFileChange = (event) => {
  if (!event.target.files.length) return;
  form.value.new_file = event.target.files[0];
  form.value.remove_file = false;
};

// Hapus file lama
const removeFile = () => {
  const archive = archiveStore.currentArchive;
  if (!archive?.document_path) {
    alert("No file to remove.");
    return;
  }
  form.value.remove_file = true;
  form.value.new_file = null;
  alert(
    "Old file marked for deletion. You need to click 'Save Changes' to confirm."
  );
};

// Submit update
const submit = async () => {
  fileNameError.value = false;

  if (!form.value.document_name) {
    fileNameError.value = true;
    alert("File name is required!");
    return;
  }

  if (form.value.remove_file && !form.value.new_file) {
    const confirmDelete = confirm(
      "You marked the old file for deletion but did not upload a new file. Are you sure you want to proceed?"
    );
    if (!confirmDelete) return;
  }

  submitting.value = true;
  try {
    const formData = new FormData();
    formData.append("document_name", form.value.document_name);
    formData.append("description", form.value.description);

    if (form.value.new_file) {
      formData.append("document_path", form.value.new_file);
    }

    if (form.value.remove_file) {
      formData.append("remove_file", "1");
    }

    await archiveStore.updateArchive(archiveId, formData);
    alert("Archive updated successfully!");
    fetchArchive(); // refresh data
  } catch (err) {
    console.error(err);
    alert("Failed to update archive.");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div
    class="w-full min-h-screen flex items-center justify-center bg-gray-100 p-6"
  >
    <div
      class="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-4xl shadow-lg space-y-6"
    >
      <!-- Button Back -->
      <div class="flex items-center mb-4">
        <button
          @click="router.back()"
          type="button"
          class="flex items-center bg-gray-200 text-gray-700 hover:bg-blue-600 hover:text-white font-medium px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm transition-colors duration-200 text-sm focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>

      <h2 class="text-xl font-bold text-gray-800 border-b pb-3 mb-6">
        Edit Archive
      </h2>

      <!-- Loading/Error -->
      <div v-if="loading" class="text-center text-gray-500 py-20">
        Loading archive...
      </div>
      <div v-else-if="error" class="text-center text-red-600 py-20">
        {{ error }}
      </div>

      <!-- Form -->
      <div v-else>
        <div class="space-y-4">
          <BaseInput
            id="document_name"
            label="File Name"
            placeholder="Enter file name"
            v-model="form.document_name"
            required
          />
          <p v-if="fileNameError" class="text-red-600 text-sm">
            File name is required.
          </p>

          <TextArea
            id="description"
            label="Description"
            placeholder="Enter a description"
            v-model="form.description"
            rows="5"
          />
        </div>

        <!-- Current File -->
        <div v-if="archiveStore.currentArchive?.document_path" class="mt-4">
          <span class="font-semibold text-gray-800">Current File:</span>
          <div class="flex items-center space-x-4 mt-2 mb-2">
            <a
              :href="archiveStore.currentArchive.document_path"
              target="_blank"
              class="text-blue-600 hover:underline"
            >
              {{ archiveStore.currentArchive.document_name }}
            </a>
            <button
              @click="removeFile"
              class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              Remove
            </button>
          </div>

          <!-- Preview -->
          <div v-if="!form.remove_file">
            <div
              v-if="isImage(archiveStore.currentArchive.type_file)"
              class="mt-2 w-full max-h-[400px] overflow-auto border border-gray-200 rounded-lg shadow-sm p-1"
            >
              <img
                :src="archiveStore.currentArchive.document_path"
                alt="File Preview"
                class="w-full object-contain"
              />
            </div>

            <div
              v-else-if="
                archiveStore.currentArchive.type_file === 'application/pdf'
              "
              class="mt-2 w-full max-h-[400px] overflow-auto border border-gray-200 rounded-lg"
            >
              <iframe
                :src="archiveStore.currentArchive.document_path"
                class="w-full h-[400px]"
              ></iframe>
            </div>
          </div>
        </div>

        <!-- Upload New File -->
        <div
          v-if="!archiveStore.currentArchive?.document_path || form.remove_file"
          class="mt-4"
        >
          <span class="font-semibold text-gray-800"
            >Upload New File (Optional):</span
          >
          <input
            type="file"
            class="mt-2"
            @change="onFileChange"
            :disabled="
              form.remove_file && !archiveStore.currentArchive?.document_path
            "
          />
          <p v-if="form.new_file" class="text-gray-600 text-sm mt-1">
            Selected file: {{ form.new_file.name }}
          </p>
        </div>

        <!-- Save Button -->
        <div class="mt-6 flex space-x-4">
          <button
            @click="submit"
            :disabled="submitting"
            class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 flex-1"
          >
            {{ submitting ? "Saving..." : "Save Changes" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
