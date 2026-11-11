<script setup>
import { computed, reactive, watch } from "vue";
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

const title = computed(() => (props.mode === "edit" ? "Edit Analytics Source" : "Add Analytics Source"));

const EMBED_HINT =
  'PostHog: use its own "Embed" share link. Google Analytics 4 / Search Console don\'t offer a direct embed link -- connect them to a Looker Studio report instead, share it as "Anyone with the link", and paste that report\'s Embed URL here.';

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
    description="Sources sharing the same Category are grouped together on the Analytics page."
    @close="$emit('close')"
  >
    <div class="space-y-4">
      <UiInput
        id="analytics-name"
        v-model="form.name"
        label="Name"
        placeholder="e.g. Landing Page PostHog"
        required
        :error="fieldError('name')"
      />

      <UiInput
        id="analytics-website-url"
        v-model="form.website_url"
        label="Website URL (optional)"
        placeholder="https://example.com"
        :error="fieldError('website_url')"
      />

      <UiSelect
        id="analytics-type"
        v-model="form.type"
        label="Type"
        placeholder="Select a source type"
        :options="TYPE_OPTIONS"
        required
        :error="fieldError('type')"
      />

      <div class="min-w-0">
        <label for="analytics-category" class="block text-ui-small font-medium text-ui-ink mb-1.5">
          Category<span class="text-ui-bad"> *</span>
        </label>
        <input
          id="analytics-category"
          v-model="form.category"
          list="analytics-category-suggestions"
          placeholder="e.g. Landing Page Jendela Cakra Digital Analytics"
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
        label="Embed URL"
        :rows="3"
        required
        placeholder="https://us.posthog.com/embedded/... or a Looker Studio /embed/ report URL"
        :error="fieldError('embed_url')"
        :hint="EMBED_HINT"
      />
      <p v-if="fieldError('embed_url')" class="text-ui-cap text-ui-muted -mt-2">{{ EMBED_HINT }}</p>
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="$emit('close')">Cancel</UiButton>
      <UiButton :loading="loading" @click="submit">{{ loading ? "Saving..." : "Save" }}</UiButton>
    </template>
  </UiModal>
</template>
