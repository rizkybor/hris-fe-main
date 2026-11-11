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
import { UiInput, UiSelect } from "@/components/ui";
import RightSidebarStep3 from "@/components/admin/employee/create/RightSidebarStep3.vue";
import EmployeeFiles from "@/components/admin/employee/EmployeeFiles.vue";
import { useI18n } from "vue-i18n";

const { t, te } = useI18n();

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
    pickerError.value = t("employees.files.notAllowed", { name: invalid.name });
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

// Presentation only: keep a blank, re-selectable first option.
const languageOptions = computed(() => [
  { value: "", label: t("employees.form.fields.preferredLanguagePlaceholder") },
  ...(preferredLanguages.value || []).map((o: any) => {
    const key = `employees.enums.language.${o.value}`;
    return te(key) ? { ...o, label: t(key) } : o;
  }),
]);
</script>

<template>
  <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
    <div class="min-w-0 space-y-5 ui-stagger">
      <!-- Emergency Contact Section -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
        <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
          <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
            <Phone class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.form.emergency.title") }}</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.form.emergency.subtitle") }}</p>
          </div>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <!-- Emergency Contact Name -->
          <UiInput
            v-model="form.emergency_contact_name"
            :label="$t('employees.form.fields.contactName')"
            :placeholder="$t('employees.form.fields.contactNamePlaceholder')"
            :icon="User"
            :error="props.errors?.['emergency_contacts.0.full_name']?.join(', ')"
          />

          <!-- Emergency Contact Relationship -->
          <UiInput
            v-model="form.emergency_contact_relationship"
            :label="$t('employees.form.fields.relationship')"
            :placeholder="$t('employees.form.fields.relationshipPlaceholder')"
            :icon="User"
            :error="props.errors?.['emergency_contacts.0.relationship']?.join(', ')"
          />

          <!-- Emergency Contact Phone -->
          <UiInput
            v-model="form.emergency_contact_phone"
            :label="$t('employees.form.fields.contactPhone')"
            placeholder="+62 812-3456-7890"
            :icon="Phone"
            :error="props.errors?.['emergency_contacts.0.phone']?.join(', ')"
          />

          <!-- Emergency Contact Email -->
          <UiInput
            v-model="form.emergency_contact_email"
            :label="$t('employees.form.fields.email')"
            placeholder="emergency@email.com"
            type="email"
            :icon="Mail"
            :error="props.errors?.['emergency_contacts.0.email']?.join(', ')"
          />
        </div>
      </section>

      <!-- Additional Information Section -->
      <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
        <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
          <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
            <FileText class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.form.additional.title") }}</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.form.additional.subtitle") }}</p>
          </div>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <!-- Preferred Language -->
          <UiSelect
            v-model="form.preferred_language"
            :label="$t('employees.form.fields.preferredLanguage')"
            :error="props.errors?.preferred_language?.join(', ')"
            :options="languageOptions"
          />

          <!-- Additional Notes -->
          <div class="md:col-span-2 min-w-0">
            <UiInput
              v-model="form.additional_notes"
              :label="$t('employees.form.fields.additionalNotes')"
              :placeholder="$t('employees.form.fields.additionalNotesPlaceholder')"
              :icon="FileText"
              :error="props.errors?.additional_notes?.join(', ')"
              :rows="4"
            />
          </div>
        </div>
      </section>

      <!-- Documents Section -->
      <EmployeeFiles v-if="isEditing && employeeId" :employee-id="employeeId" />

      <section v-else class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
        <header class="flex items-start gap-3 pb-4 mb-5 border-b border-ui-line">
          <span class="w-8 h-8 shrink-0 rounded-ui-control border border-ui-line bg-ui-surface text-ui-text flex items-center justify-center">
            <FileText class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <h3 class="text-ui-h2 text-ui-ink">{{ $t("employees.form.documents.title") }}</h3>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ $t("employees.form.documents.subtitle") }}</p>
          </div>
        </header>
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
          class="w-full border border-dashed border-ui-line-strong rounded-ui-card bg-ui-subtle/50 hover:bg-ui-subtle hover:border-ui-accent transition-colors duration-ui-base px-4 py-6 flex flex-col items-center justify-center gap-1.5 focus:outline-none focus-visible:shadow-ui-focus"
        >
          <span class="w-9 h-9 rounded-ui-control bg-ui-surface border border-ui-line text-ui-text flex items-center justify-center">
            <Upload class="w-4 h-4" />
          </span>
          <span class="text-ui-small font-medium text-ui-ink">{{ $t("employees.form.documents.choose") }}</span>
          <span class="text-ui-cap text-ui-muted">{{ $t("employees.form.documents.rules") }}</span>
        </button>

        <p v-if="pickerError" class="text-ui-cap text-ui-bad mt-1.5">{{ pickerError }}</p>

        <TransitionGroup v-if="queuedDocuments.length" name="ui-list" tag="ul" class="space-y-2 mt-4">
          <li
            v-for="(file, index) in queuedDocuments"
            :key="`${file.name}-${index}`"
            class="flex items-center gap-3 p-2.5 border border-ui-line rounded-ui-control bg-ui-surface"
          >
            <span class="w-9 h-9 shrink-0 rounded-ui-control bg-ui-subtle text-ui-text flex items-center justify-center">
              <ImageIcon v-if="isImage(file)" class="w-4 h-4" />
              <FileText v-else class="w-4 h-4" />
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-ui-cap text-ui-muted truncate mb-1">{{ file.name }} &middot; <span class="tabular-nums">{{ (file.size / 1024).toFixed(0) }} KB</span></p>
              <input
                :value="queuedDocumentNames[index]"
                @input="updateQueuedDocumentName(index, ($event.target as HTMLInputElement).value)"
                type="text"
                required
                :placeholder="$t('employees.form.documents.namePlaceholder')"
                class="w-full h-8 px-2.5 bg-ui-surface text-ui-small text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
              />
            </div>
            <button
              type="button"
              @click="removeQueuedDocument(index)"
              class="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
              :aria-label="$t('employees.form.documents.remove')"
            >
              <X class="w-4 h-4" />
            </button>
          </li>
        </TransitionGroup>
      </section>
    </div>

    <RightSidebarStep3 />
  </div>
</template>
