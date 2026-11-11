<script setup>
import { computed } from "vue";
import { Link2, ExternalLink, FolderGit2, Figma, Globe } from "lucide-vue-next";

const props = defineProps({
  accessProjectName: { type: String, default: "" },
  accessProjectUrl: { type: String, default: "" },
  accessGithubName: { type: String, default: "" },
  accessGithubUrl: { type: String, default: "" },
  accessFigmaName: { type: String, default: "" },
  accessFigmaUrl: { type: String, default: "" },
  additionalAccess: { type: Array, default: () => [] },
});

// Each fixed slot only renders once it actually has a link -- a name with
// no url (or vice versa) is treated as not-set rather than a broken link.
const links = computed(() => {
  const fixed = [
    { name: props.accessProjectName, url: props.accessProjectUrl, icon: Globe, color: "blue" },
    { name: props.accessGithubName, url: props.accessGithubUrl, icon: FolderGit2, color: "gray" },
    { name: props.accessFigmaName, url: props.accessFigmaUrl, icon: Figma, color: "pink" },
  ].filter((link) => link.name && link.url);

  const additional = (props.additionalAccess || [])
    .filter((link) => link?.name && link?.url)
    .map((link) => ({ name: link.name, url: link.url, icon: Link2, color: "indigo" }));

  return [...fixed, ...additional];
});

// Presentation only: one quiet icon tile for every link kind.
const COLOR_CLASSES = {
  blue: "bg-ui-accent-soft text-ui-accent",
  gray: "bg-ui-subtle text-ui-text",
  pink: "bg-ui-subtle text-ui-text",
  indigo: "bg-ui-subtle text-ui-text",
};
</script>

<template>
  <section v-if="links.length > 0" class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6">
    <div class="mb-4">
      <h3 class="text-ui-h2 text-ui-ink">Project Access</h3>
      <p class="text-ui-cap text-ui-muted mt-0.5">Optional — quick links for this project</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 ui-stagger">
      <a
        v-for="(link, index) in links"
        :key="index"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="ui-press group flex items-center gap-3 px-3 py-2.5 bg-ui-surface border border-ui-line rounded-ui-control hover:border-ui-line-strong hover:bg-ui-subtle min-w-0"
      >
        <span :class="['w-8 h-8 rounded-ui-control flex items-center justify-center shrink-0', COLOR_CLASSES[link.color]]">
          <component :is="link.icon" class="w-4 h-4" />
        </span>
        <span class="flex-1 min-w-0">
          <span class="block text-ui-small font-medium text-ui-ink truncate">{{ link.name }}</span>
          <span class="block text-ui-cap text-ui-muted truncate">{{ link.url }}</span>
        </span>
        <ExternalLink class="w-4 h-4 text-ui-faint group-hover:text-ui-accent shrink-0" />
      </a>
    </div>
  </section>
</template>
