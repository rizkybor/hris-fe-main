<script setup>
import { computed, reactive, watch } from "vue";
import { X } from "lucide-vue-next";
import BaseInput from "@/components/common/form/Input.vue";
import BaseSelect from "@/components/common/form/Select.vue";

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

const submit = () => {
  emit("submit", {
    mode: props.mode,
    id: props.data?.id,
    payload: { ...form },
  });
};
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
        <div>
          <h3 class="text-brand-dark text-lg font-bold">{{ title }}</h3>
          <p class="text-brand-light text-xs mt-0.5">
            Sources sharing the same Category are grouped together on the Analytics page.
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="w-9 h-9 rounded-full border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] shrink-0"
        >
          <X class="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div class="p-5 space-y-4">
        <div>
          <BaseInput
            id="analytics-name"
            label="Name"
            placeholder="e.g. Landing Page PostHog"
            v-model="form.name"
            required
          />
          <p v-if="errors.name" class="text-red-500 text-sm mt-1">{{ errors.name.join(", ") }}</p>
        </div>

        <div>
          <BaseInput
            id="analytics-website-url"
            label="Website URL (optional)"
            placeholder="https://example.com"
            v-model="form.website_url"
          />
          <p v-if="errors.website_url" class="text-red-500 text-sm mt-1">{{ errors.website_url.join(", ") }}</p>
        </div>

        <div>
          <BaseSelect
            id="analytics-type"
            label="Type"
            placeholder="Select a source type"
            v-model="form.type"
            :options="TYPE_OPTIONS"
            required
          />
          <p v-if="errors.type" class="text-red-500 text-sm mt-1">{{ errors.type.join(", ") }}</p>
        </div>

        <div>
          <label class="block text-brand-dark text-sm font-semibold mb-1"
            >Category <span class="text-red-600">*</span></label
          >
          <input
            list="analytics-category-suggestions"
            v-model="form.category"
            placeholder="e.g. Landing Page Jendela Cakra Digital Analytics"
            class="w-full border rounded-[12px] transition-all duration-300 hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white border-[#DCDEDD] px-3.5 py-3"
          />
          <datalist id="analytics-category-suggestions">
            <option v-for="c in categorySuggestions" :key="c" :value="c" />
          </datalist>
          <p v-if="errors.category" class="text-red-500 text-sm mt-1">{{ errors.category.join(", ") }}</p>
        </div>

        <div>
          <label class="block text-brand-dark text-sm font-semibold mb-1"
            >Embed URL <span class="text-red-600">*</span></label
          >
          <textarea
            v-model="form.embed_url"
            rows="3"
            placeholder="https://us.posthog.com/embedded/... or a Looker Studio /embed/ report URL"
            class="w-full border rounded-[12px] transition-all duration-300 hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white border-[#DCDEDD] px-3.5 py-3 text-sm"
          ></textarea>
          <p class="text-brand-light text-xs mt-1">
            PostHog: use its own "Embed" share link. Google Analytics 4 / Search Console don't offer a direct embed
            link -- connect them to a Looker Studio report instead, share it as "Anyone with the link", and paste
            that report's Embed URL here.
          </p>
          <p v-if="errors.embed_url" class="text-red-500 text-sm mt-1">{{ errors.embed_url.join(", ") }}</p>
        </div>
      </div>

      <div class="p-5 border-t border-[#DCDEDD] flex justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2.5 border border-[#DCDEDD] rounded-[10px] text-sm font-semibold hover:border-[#0C51D9] transition-colors"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-primary rounded-[8px] border border-[#2151A0] hover:brightness-110 blue-gradient blue-btn-shadow px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="loading"
          @click="submit"
        >
          {{ loading ? "Saving..." : "Save" }}
        </button>
      </div>
    </div>
  </div>
</template>
