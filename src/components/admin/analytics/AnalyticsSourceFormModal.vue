<script setup>
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import { UiModal, UiInput, UiSelect, UiButton } from "@/components/ui";

const props = defineProps({
  show: Boolean,
  loading: Boolean,
  mode: { type: String, default: "add" }, // "add" | "edit"
  data: { type: Object, default: () => ({}) },
  // Existing category names, offered as datalist suggestions so a typo
  // doesn't accidentally split one category into two.
  categorySuggestions: { type: Array, default: () => [] },
  errors: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["submit", "close"]);
const { t } = useI18n();

const TYPE_OPTIONS = [
  { value: "posthog", label: "PostHog" },
  { value: "google_analytics_4", label: "Google Analytics 4" },
  { value: "google_search_console", label: "Google Search Console" },
];

const emptyForm = () => ({
  name: "",
  website_url: "",
  type: "",
  category: "",
  embed_url: "",
});

const form = reactive(emptyForm());

watch(
  () => [props.show, props.mode, props.data],
  ([show]) => {
    if (!show) return;
    if (props.mode === "edit") {
      Object.assign(form, {
        name: props.data.name ?? "",
        website_url: props.data.website_url ?? "",
        type: props.data.type ?? "",
        category: props.data.category ?? "",
        embed_url: props.data.embed_url ?? "",
      });
    } else {
      Object.assign(form, emptyForm());
    }
  },
  { immediate: true }
);

const title = computed(() => (props.mode === "edit" ? t("analytics.form.editTitle") : t("analytics.form.addTitle")));

const EMBED_HINT = computed(() => t("analytics.form.embedHint"));

const fieldError = (key) => (props.errors?.[key] ? [].concat(props.errors[key]).join(", ") : "");

const submit = () => {
  emit("submit", {
    mode: props.mode,
    id: props.data?.id,
    payload: { ...form },
  });
};
</script>

<template>
  <UiModal
    :open="show"
    :title="title"
    :description="$t('analytics.form.description')"
    @close="$emit('close')"
  >
    <div class="space-y-4">
      <UiInput
        id="analytics-name"
        v-model="form.name"
        :label="$t('common.labels.name')"
        :placeholder="$t('analytics.form.namePlaceholder')"
        required
        :error="fieldError('name')"
      />

      <UiInput
        id="analytics-website-url"
        v-model="form.website_url"
        :label="$t('analytics.form.websiteUrl')"
        placeholder="https://example.com"
        :error="fieldError('website_url')"
      />

      <UiSelect
        id="analytics-type"
        v-model="form.type"
        :label="$t('common.labels.type')"
        :placeholder="$t('analytics.form.typePlaceholder')"
        :options="TYPE_OPTIONS"
        required
        :error="fieldError('type')"
      />

      <div class="min-w-0">
        <label for="analytics-category" class="block text-ui-small font-medium text-ui-ink mb-1.5">
          {{ $t("common.labels.category") }}<span class="text-ui-bad"> *</span>
        </label>
        <input
          id="analytics-category"
          v-model="form.category"
          list="analytics-category-suggestions"
          :placeholder="$t('analytics.form.categoryPlaceholder')"
          class="w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
          :class="fieldError('category') ? 'border-ui-bad/50' : 'border-ui-line-strong'"
        />
        <datalist id="analytics-category-suggestions">
          <option v-for="c in categorySuggestions" :key="c" :value="c" />
        </datalist>
        <p v-if="fieldError('category')" class="text-ui-cap text-ui-bad mt-1.5">{{ fieldError("category") }}</p>
      </div>

      <UiInput
        id="analytics-embed-url"
        v-model="form.embed_url"
        :label="$t('analytics.form.embedUrl')"
        :rows="3"
        required
        :placeholder="$t('analytics.form.embedUrlPlaceholder')"
        :error="fieldError('embed_url')"
        :hint="EMBED_HINT"
      />
      <p v-if="fieldError('embed_url')" class="text-ui-cap text-ui-muted -mt-2">{{ EMBED_HINT }}</p>
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="$emit('close')">{{ $t("common.actions.cancel") }}</UiButton>
      <UiButton :loading="loading" @click="submit">{{ loading ? $t("common.actions.saving") : $t("common.actions.save") }}</UiButton>
    </template>
  </UiModal>
</template>
