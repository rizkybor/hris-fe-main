<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useOptionStore } from "@/stores/option";
import {
  User,
  Phone,
  MapPin,
  FileText,
  ChevronRight,
  Globe,
  Mail,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-vue-next";
import { Input, TextArea, Select } from "@/components/common/form";
import RightSidebarStep3 from "@/components/admin/employee/create/RightSidebarStep3.vue";
import EmployeeFiles from "@/components/admin/employee/EmployeeFiles.vue";

interface Props {
  modelValue: {
    emergency_contact_name: string;
    emergency_contact_relationship: string;
    emergency_contact_phone: string;
    emergency_contact_email: string;
    additional_notes: string;
    preferred_language: string;
    documents?: File[];
    document_names?: string[];
  };
  errors?: any;
  isEditing?: boolean;
  employeeId?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
});
const emit = defineEmits(["update:modelValue"]);

const form = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Create mode only: queue files client-side, uploaded right after the
// employee record is created (there's no employee id to attach them to yet).
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const pickerError = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);

const queuedDocuments = computed(() => form.value.documents || []);
const queuedDocumentNames = computed(() => form.value.document_names || []);

const stripExtension = (filename: string) => filename.replace(/\.[^/.]+$/, "");

const handlePickFiles = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const selected = Array.from(target.files || []);
  pickerError.value = "";

  const invalid = selected.find(
    (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE
  );
  if (invalid) {
    pickerError.value = `"${invalid.name}" is not allowed. Only PDF, PNG, or JPEG files up to 2MB are supported.`;
    if (fileInputRef.value) fileInputRef.value.value = "";
    return;
  }

  form.value = {
    ...form.value,
    documents: [...queuedDocuments.value, ...selected],
    document_names: [...queuedDocumentNames.value, ...selected.map((f) => stripExtension(f.name))],
  };
  if (fileInputRef.value) fileInputRef.value.value = "";
};

const updateQueuedDocumentName = (index: number, name: string) => {
  const next = [...queuedDocumentNames.value];
  next[index] = name;
  form.value = { ...form.value, document_names: next };
};

const removeQueuedDocument = (index: number) => {
  const nextFiles = [...queuedDocuments.value];
  nextFiles.splice(index, 1);
  const nextNames = [...queuedDocumentNames.value];
  nextNames.splice(index, 1);
  form.value = { ...form.value, documents: nextFiles, document_names: nextNames };
};

const isImage = (file: File) => file.type.startsWith("image/");

const optionStore = useOptionStore();
const { preferredLanguages } = storeToRefs(optionStore);

onMounted(() => {
  optionStore.fetchPreferredLanguages();
});
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-4 items-start lg:pr-4">
    <div class="flex-1 w-full space-y-5">
      <!-- Emergency Contact Section -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div
            class="w-9 h-9 bg-red-50 rounded-[12px] flex items-center justify-center"
          >
            <Phone class="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base font-bold">Emergency Contact</h3>
            <p class="text-brand-light text-sm font-normal">
              Optional -- person to contact in case of emergency. Leave blank if not available yet.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Emergency Contact Name -->
          <div class="mb-3.5">
            <Input
              v-model="form.emergency_contact_name"
              label="Full Name (optional)"
              placeholder="Emergency contact name"
              :error="
                props.errors?.['emergency_contacts.0.full_name']?.join(', ')
              "
            >
              <template #icon>
                <User class="w-5 h-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <!-- Emergency Contact Relationship -->
          <div class="mb-3.5">
            <Input
              v-model="form.emergency_contact_relationship"
              label="Relationship (optional)"
              placeholder="e.g., Spouse, Parent, Sibling"
              :error="
                props.errors?.['emergency_contacts.0.relationship']?.join(', ')
              "
            >
              <template #icon>
                <User class="w-5 h-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <!-- Emergency Contact Phone -->
          <div class="mb-3.5">
            <Input
              v-model="form.emergency_contact_phone"
              label="Phone Number (optional)"
              placeholder="+62 812-3456-7890"
              :error="props.errors?.['emergency_contacts.0.phone']?.join(', ')"
            >
              <template #icon>
                <Phone class="w-5 h-5 text-gray-400" />
              </template>
            </Input>
          </div>

          <!-- Emergency Contact Email -->
          <div class="mb-3.5">
            <Input
              v-model="form.emergency_contact_email"
              label="Email Address"
              placeholder="emergency@email.com"
              type="email"
              :error="props.errors?.['emergency_contacts.0.email']?.join(', ')"
            >
              <template #icon>
                <Mail class="w-5 h-5 text-gray-400" />
              </template>
            </Input>
          </div>
        </div>
      </div>

      <!-- Additional Information Section -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div
            class="w-9 h-9 bg-orange-50 rounded-[12px] flex items-center justify-center"
          >
            <FileText class="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base font-bold">
              Additional Information
            </h3>
            <p class="text-brand-light text-sm font-normal">
              Optional details and preferences
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Preferred Language -->
          <div class="mb-3.5">
            <Select
              v-model="form.preferred_language"
              label="Preferred Language"
              placeholder="Select language"
              :error="props.errors?.preferred_language?.join(', ')"
              :options="preferredLanguages"
            >
              <template #icon>
                <Globe class="w-5 h-5 text-gray-400" />
              </template>
            </Select>
          </div>

          <!-- Additional Notes -->
          <div class="md:col-span-2 mb-3.5">
            <TextArea
              v-model="form.additional_notes"
              label="Additional Notes"
              placeholder="Any additional information about the employee..."
              :error="props.errors?.additional_notes?.join(', ')"
              rows="4"
            >
              <template #icon>
                <FileText class="w-5 h-5 text-gray-400" />
              </template>
            </TextArea>
          </div>
        </div>
      </div>

      <!-- Documents Section -->
      <EmployeeFiles v-if="isEditing && employeeId" :employee-id="employeeId" />

      <div v-else class="bg-white border border-[#DCDEDD] rounded-[14px] p-3.5 sm:p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div
            class="w-9 h-9 bg-indigo-50 rounded-[12px] flex items-center justify-center"
          >
            <FileText class="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-base font-bold">Documents</h3>
            <p class="text-brand-light text-sm font-normal">
              Optional -- PDF, PNG, or JPEG, up to 2MB each. Uploaded once the employee is created.
            </p>
          </div>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg"
          class="hidden"
          @change="handlePickFiles"
        />

        <button
          type="button"
          @click="fileInputRef?.click()"
          class="w-full border-2 border-dashed border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:bg-gray-50 transition-all duration-300 px-3.5 py-5 flex flex-col items-center justify-center gap-1"
        >
          <div class="w-9 h-9 bg-blue-50 rounded-[10px] flex items-center justify-center">
            <Upload class="w-4 h-4 text-blue-600" />
          </div>
          <span class="text-brand-dark text-sm font-semibold">Choose Files</span>
          <span class="text-brand-light text-xs">PDF, PNG, or JPEG up to 2MB each</span>
        </button>

        <p v-if="pickerError" class="text-red-500 text-xs mt-1.5">{{ pickerError }}</p>

        <div v-if="queuedDocuments.length" class="space-y-1.5 mt-3.5">
          <div
            v-for="(file, index) in queuedDocuments"
            :key="`${file.name}-${index}`"
            class="flex items-center gap-2.5 p-2.5 border border-[#DCDEDD] rounded-[10px]"
          >
            <div class="w-9 h-9 bg-indigo-50 rounded-[8px] flex items-center justify-center shrink-0">
              <ImageIcon v-if="isImage(file)" class="w-4 h-4 text-indigo-600" />
              <FileText v-else class="w-4 h-4 text-indigo-600" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-brand-light text-xs truncate mb-1">{{ file.name }} &middot; {{ (file.size / 1024).toFixed(0) }} KB</p>
              <input
                :value="queuedDocumentNames[index]"
                @input="updateQueuedDocumentName(index, ($event.target as HTMLInputElement).value)"
                type="text"
                required
                placeholder="Document name (required)"
                class="w-full px-2 py-1 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:border-2 outline-none"
              />
            </div>
            <button
              type="button"
              @click="removeQueuedDocument(index)"
              class="text-gray-400 hover:text-red-600 transition-colors shrink-0"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <RightSidebarStep3 />
  </div>
</template>
