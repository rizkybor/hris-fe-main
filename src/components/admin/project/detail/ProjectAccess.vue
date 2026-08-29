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

const COLOR_CLASSES = {
  blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
  gray: "bg-gray-100 text-gray-600 group-hover:bg-gray-200",
  pink: "bg-pink-50 text-pink-600 group-hover:bg-pink-100",
  indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
};
</script>

<template>
  <div v-if="links.length > 0" class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5 sm:p-6">
    <div class="flex items-center gap-3 mb-5">
      <div class="w-9 h-9 sm:w-10 sm:h-10 bg-violet-50 rounded-[10px] flex items-center justify-center shrink-0">
        <Link2 class="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
      </div>
      <div>
        <h3 class="text-brand-dark text-base sm:text-lg font-bold">Project Access</h3>
        <p class="text-brand-light text-xs font-normal">Optional — quick links for this project</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <a
        v-for="(link, index) in links"
        :key="index"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="bg-white group flex items-center gap-2.5 pl-3 pr-4 py-2.5 border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:shadow-sm transition-all max-w-full"
      >
        <div :class="['w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 transition-colors', COLOR_CLASSES[link.color]]">
          <component :is="link.icon" class="w-4 h-4" />
        </div>
        <span class="text-brand-dark text-sm font-semibold truncate max-w-[200px]">{{ link.name }}</span>
        <ExternalLink class="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </a>
    </div>
  </div>
</template>
