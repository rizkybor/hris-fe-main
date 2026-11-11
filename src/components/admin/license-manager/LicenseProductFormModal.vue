<script setup>
// Add / edit a License Manager product in a modal: name, code (read-only on
// edit), key prefix, description, active, and the app icon (upload with
// preview, replace, remove). Emits "saved" with the product from the API.
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Trash2, Save, ImagePlus, RefreshCw, ScrollText, Eye, Code2 } from "lucide-vue-next";
import { renderMarkdown } from "@/components/admin/license-manager/markdown";
import Alert from "@/components/common/Alert.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import LicenseStatusSwitch from "@/components/admin/license-manager/LicenseStatusSwitch.vue";
import LicenseFormField from "@/components/admin/license-manager/LicenseFormField.vue";
import { UiModal, UiButton } from "@/components/ui";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { can } from "@/helpers/permissionHelper";
import { errorMessage } from "@/helpers/errorHelper";
import { validationErrors, keyPreview } from "@/components/admin/license-manager/licenseHelpers";

const props = defineProps({
  show: { type: Boolean, default: false },
  // null = add a new product; otherwise the product to edit.
  product: { type: Object, default: null },
});
const emit = defineEmits(["close", "saved"]);

const store = useLicenseManagerStore();

const CODE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PREFIX_RE = /^[A-Z]{1,6}$/;
// App icon upload: png / jpg / webp up to 1 MB (same as the API).
const ICON_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ICON_MAX_BYTES = 1024 * 1024;

const isEdit = computed(() => !!props.product);
// Adding needs license-manager-create, editing license-manager-edit.
const allowed = computed(() => can(isEdit.value ? "license-manager-edit" : "license-manager-create"));
const form = ref({});
const errors = ref({});
const error = ref("");
const saving = ref(false);
const iconFile = ref(null);
const iconPreview = ref(null);
const removeIcon = ref(false);
const iconInput = ref(null);

const clearIconSelection = () => {
  if (iconPreview.value) URL.revokeObjectURL(iconPreview.value);
  iconFile.value = null;
  iconPreview.value = null;
};
onBeforeUnmount(clearIconSelection);

const termsPreview = ref(false);

// Fresh state every time the modal opens.
watch(
  () => props.show,
  (show) => {
    if (!show) return;
    errors.value = {};
    error.value = "";
    clearIconSelection();
    removeIcon.value = false;
    form.value = props.product
      ? {
          ...props.product,
          description: props.product.description || "",
          terms: props.product.terms || "",
          terms_version: props.product.terms_version || "",
          terms_effective_at: props.product.terms_effective_at || "",
        }
      : { code: "", name: "", key_prefix: "", description: "", is_active: true, icon_url: null, terms: "", terms_version: "", terms_effective_at: "" };
    termsPreview.value = false;
  },
  { immediate: true }
);

// Terms & Conditions (Markdown) with a rendered preview. Changing the text
// needs a new version (licenses keep the version they were issued under).
const termsHtml = computed(() => renderMarkdown(form.value.terms));
const normalizeTerms = (text) => String(text || "").replace(/\r\n/g, "\n").trim();
const termsChanged = computed(() => normalizeTerms(form.value.terms) !== normalizeTerms(props.product?.terms));
const VERSION_RE = /^[0-9]+(\.[0-9]+){0,2}$/;

// What the form shows: the picked file, nothing (removed), or the current icon.
const previewProduct = computed(() => ({
  name: form.value.name || form.value.code || "?",
  icon_url: iconPreview.value || (removeIcon.value ? null : form.value.icon_url || null),
}));
const hasIcon = computed(() => !!previewProduct.value.icon_url);

const fieldError = (field) => {
  const v = errors.value?.[field];
  return Array.isArray(v) ? v[0] : v || "";
};

const pickIcon = (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  errors.value = { ...errors.value, icon: "" };
  if (!ICON_TYPES.includes(file.type)) {
    errors.value = { ...errors.value, icon: "Use a PNG, JPG or WebP image." };
    return;
  }
  if (file.size > ICON_MAX_BYTES) {
    errors.value = { ...errors.value, icon: "The icon may not be larger than 1 MB." };
    return;
  }
  clearIconSelection();
  iconFile.value = file;
  iconPreview.value = URL.createObjectURL(file);
  removeIcon.value = false;
};

const dropIcon = () => {
  clearIconSelection();
  removeIcon.value = !!form.value.icon_url;
};

const validate = () => {
  const e = {};
  if (!isEdit.value) {
    if (!form.value.code) e.code = "Code is required.";
    else if (!CODE_RE.test(form.value.code)) e.code = "Lowercase letters, digits and single hyphens only (e.g. map-tools-2).";
  }
  if (!String(form.value.name || "").trim()) e.name = "Name is required.";
  if (!PREFIX_RE.test(String(form.value.key_prefix || "").toUpperCase())) e.key_prefix = "1-6 uppercase letters (e.g. OC).";
  const version = String(form.value.terms_version || "").trim();
  if (normalizeTerms(form.value.terms)) {
    if (!version) e.terms_version = "Give the terms a version, e.g. 1.0.";
    else if (!VERSION_RE.test(version)) e.terms_version = "Use a version like 1.0 or 1.1.";
    else if (isEdit.value && termsChanged.value && props.product?.terms && version === props.product.terms_version)
      e.terms_version = `The terms changed: give them a new version (now ${props.product.terms_version}).`;
  }
  return e;
};

const save = async () => {
  if (!allowed.value) return;
  errors.value = validate();
  if (Object.keys(errors.value).length) return;

  saving.value = true;
  error.value = "";
  const payload = {
    name: form.value.name.trim(),
    key_prefix: String(form.value.key_prefix).toUpperCase(),
    description: form.value.description?.trim() || null,
    is_active: !!form.value.is_active,
  };
  // Terms only travel when they changed (or are new).
  if (!isEdit.value ? normalizeTerms(form.value.terms) : termsChanged.value) {
    payload.terms = normalizeTerms(form.value.terms) || null;
  }
  if (normalizeTerms(form.value.terms)) {
    payload.terms_version = String(form.value.terms_version || "").trim() || null;
    payload.terms_effective_at = form.value.terms_effective_at || null;
  }
  if (iconFile.value) payload.icon = iconFile.value;
  else if (removeIcon.value && isEdit.value) payload.remove_icon = true;

  try {
    const saved = isEdit.value
      ? await store.updateProduct(props.product.code, payload)
      : await store.createProduct({ ...payload, code: form.value.code });
    clearIconSelection();
    emit("saved", saved);
  } catch (err) {
    errors.value = validationErrors(err);
    error.value = errorMessage(err, "Failed to save the product.");
  } finally {
    saving.value = false;
  }
};

const inputClass = (field) => [
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus",
  fieldError(field) ? "border-ui-bad/50" : "border-ui-line-strong",
];
// UiModal open state follows `show`; closing asks the parent.
const onOpenChange = (value) => {
  if (!value) emit("close");
};
</script>

<template>
  <UiModal
    :open="show"
    size="lg"
    :title="isEdit ? `Edit ${product?.name}` : 'Add Product'"
    @update:open="onOpenChange"
  >
    <form id="license-product-form" novalidate @submit.prevent="save" class="space-y-5" :aria-label="isEdit ? `Edit ${product?.name}` : 'Add product'">
      <Alert v-if="error" type="danger" :title="error" message="" :show="!!error" @close="error = ''" />

      <!-- Icon -->
      <div data-field="icon">
        <p class="block text-ui-small font-medium text-ui-ink mb-1.5">
          App Icon <span class="text-ui-faint font-normal">(Optional)</span>
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <ProductIcon :product="previewProduct" :size="64" />
          <div class="flex flex-wrap items-center gap-2">
            <input ref="iconInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="pickIcon" />
            <UiButton variant="secondary" size="sm" :icon="hasIcon ? RefreshCw : ImagePlus" @click="iconInput?.click()">
              {{ hasIcon ? "Replace" : "Upload icon" }}
            </UiButton>
            <UiButton v-if="hasIcon" variant="danger" size="sm" :icon="Trash2" @click="dropIcon">Remove</UiButton>
            <button v-else-if="removeIcon" type="button" @click="removeIcon = false" class="text-ui-cap font-medium text-ui-accent hover:underline">
              Undo remove
            </button>
          </div>
        </div>
        <p v-if="!fieldError('icon')" class="text-ui-cap text-ui-muted mt-1.5">
          PNG, JPG or WebP, up to 1 MB. A square image (e.g. 256 × 256) looks best.
          <template v-if="removeIcon"> The icon is removed when you save.</template>
        </p>
        <p v-else class="text-ui-cap text-ui-bad mt-1.5">{{ fieldError("icon") }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LicenseFormField field="name" label="Name" required :error="fieldError('name')" v-slot="{ id }">
          <input :id="id" v-model="form.name" type="text" placeholder="e.g. OCCA" :class="inputClass('name')" />
        </LicenseFormField>
        <LicenseFormField
          field="code"
          label="Code"
          required
          :error="fieldError('code')"
          :hint="isEdit ? 'The code cannot change: it is compiled into the app.' : 'Used in URLs and the public API path; it cannot change later.'"
          v-slot="{ id }"
        >
          <input
            :id="id"
            v-model.trim="form.code"
            type="text"
            :readonly="isEdit"
            placeholder="e.g. map-tools-2"
            :class="[inputClass('code'), 'font-mono', isEdit ? '!bg-ui-subtle text-ui-muted cursor-not-allowed' : '']"
            @input="form.code = String(form.code || '').toLowerCase()"
          />
        </LicenseFormField>
        <LicenseFormField
          field="key_prefix"
          label="Key Prefix"
          required
          :error="fieldError('key_prefix')"
          :hint="`New keys look like ${keyPreview(form.key_prefix || 'XX', 'professional', product?.next_sequences?.mac || 1)} (Mac 31 Trial · 32 Professional · 33 Lifetime · 34 Organization; iPad 52 · 53 · 54)`"
          v-slot="{ id }"
        >
          <input :id="id" v-model.trim="form.key_prefix" type="text" maxlength="6" placeholder="OC" :class="[inputClass('key_prefix'), 'font-mono uppercase']" />
        </LicenseFormField>
        <div>
          <p class="block text-ui-small font-medium text-ui-ink mb-1.5">Status</p>
          <div class="flex items-center justify-between gap-4 h-[38px] px-3 border border-ui-line-strong rounded-ui-control">
            <p class="text-ui-small text-ui-muted truncate">{{ form.is_active ? "Active: keys can be activated" : "Inactive: activation is refused" }}</p>
            <LicenseStatusSwitch v-model="form.is_active" />
          </div>
        </div>
        <LicenseFormField field="description" label="Description" :error="fieldError('description')" wide v-slot="{ id }">
          <textarea :id="id" v-model="form.description" rows="2" :class="[inputClass('description'), '!h-auto py-2.5 resize-none']"></textarea>
        </LicenseFormField>
      </div>

      <!-- Terms & Conditions -->
      <div class="border-t border-ui-line pt-5" data-field="terms">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2 flex-wrap">
            <ScrollText class="w-4 h-4 text-ui-faint" />
            <h4 class="text-ui-h3 text-ui-ink">Terms &amp; Conditions</h4>
            <span class="text-ui-cap text-ui-muted">Appendix A of the license PDF (Markdown)</span>
          </div>
          <div class="inline-flex p-0.5 bg-ui-subtle rounded-ui-control" role="tablist">
            <button
              type="button"
              role="tab"
              @click="termsPreview = false"
              class="h-7 px-2.5 rounded-[6px] text-ui-cap font-medium flex items-center gap-1.5"
              :class="!termsPreview ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted'"
              :aria-selected="!termsPreview"
            >
              <Code2 class="w-3.5 h-3.5" /> Markdown
            </button>
            <button
              type="button"
              role="tab"
              @click="termsPreview = true"
              class="h-7 px-2.5 rounded-[6px] text-ui-cap font-medium flex items-center gap-1.5"
              :class="termsPreview ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted'"
              :aria-selected="termsPreview"
            >
              <Eye class="w-3.5 h-3.5" /> Preview
            </button>
          </div>
        </div>

        <textarea
          v-if="!termsPreview"
          v-model="form.terms"
          rows="14"
          spellcheck="false"
          placeholder="# Product — License Terms and Conditions&#10;&#10;## 1. ..."
          class="w-full px-3 py-2.5 border rounded-ui-control font-mono text-ui-cap bg-ui-surface text-ui-ink focus:outline-none focus:border-ui-accent focus:shadow-ui-focus resize-y"
          :class="fieldError('terms') ? 'border-ui-bad/50' : 'border-ui-line-strong'"
        ></textarea>
        <div
          v-else
          class="terms-preview h-[320px] overflow-y-auto px-5 py-4 border border-ui-line rounded-ui-control bg-ui-subtle text-ui-small text-ui-ink"
          v-html="termsHtml || '<p class=&quot;text-ui-faint&quot;>No terms yet.</p>'"
        ></div>
        <p v-if="fieldError('terms')" class="text-ui-cap text-ui-bad mt-1.5">{{ fieldError("terms") }}</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <LicenseFormField
            field="terms_version"
            label="Terms Version"
            :required="!!form.terms?.trim()"
            :error="fieldError('terms_version')"
            :hint="isEdit && product?.terms_version ? `Current: v${product.terms_version}${termsChanged ? ' — the text changed, give it a new version' : ''}` : 'e.g. 1.0'"
            v-slot="{ id }"
          >
            <input :id="id" v-model.trim="form.terms_version" type="text" maxlength="20" placeholder="1.0" :class="[inputClass('terms_version'), 'font-mono']" />
          </LicenseFormField>
          <LicenseFormField field="terms_effective_at" label="Effective Date" :error="fieldError('terms_effective_at')" hint="Defaults to today when the terms change." v-slot="{ id }">
            <input :id="id" v-model="form.terms_effective_at" type="date" :class="inputClass('terms_effective_at')" />
          </LicenseFormField>
        </div>
      </div>
    </form>

    <template #footer>
      <UiButton variant="secondary" class="flex-1 sm:flex-none" @click="emit('close')">Cancel</UiButton>
      <UiButton
        type="submit"
        form="license-product-form"
        :icon="Save"
        :loading="saving"
        :disabled="!allowed"
        :title="allowed ? undefined : 'You do not have permission to do this.'"
        class="flex-1 sm:flex-none"
      >
        {{ saving ? "Saving..." : isEdit ? "Save Product" : "Add Product" }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.terms-preview :deep(h1) { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem; }
.terms-preview :deep(h2) { font-size: 0.95rem; font-weight: 600; margin: 1rem 0 0.4rem; padding-bottom: 0.2rem; border-bottom: 1px solid rgb(var(--ui-line)); }
.terms-preview :deep(h3) { font-size: 0.875rem; font-weight: 600; margin: 0.75rem 0 0.3rem; }
.terms-preview :deep(p) { margin: 0 0 0.5rem; line-height: 1.55; }
.terms-preview :deep(ul) { list-style: disc; padding-left: 1.25rem; margin: 0 0 0.5rem; }
.terms-preview :deep(ol) { list-style: decimal; padding-left: 1.25rem; margin: 0 0 0.5rem; }
.terms-preview :deep(li) { margin-bottom: 0.2rem; }
.terms-preview :deep(code) { font-family: ui-monospace, monospace; font-size: 0.8em; background: rgb(var(--ui-line)); padding: 0 0.25rem; border-radius: 4px; }
.terms-preview :deep(a) { color: rgb(var(--ui-accent)); text-decoration: underline; }
.terms-preview :deep(hr) { border: none; border-top: 1px solid rgb(var(--ui-line)); margin: 0.75rem 0; }
</style>
