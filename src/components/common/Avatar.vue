<script setup>
import { computed } from "vue";
import { User } from "lucide-vue-next";

const props = defineProps({
  src: { type: String, default: null },
  alt: { type: String, default: "" },
  size: { type: String, default: "w-12 h-12" },
  iconSize: { type: String, default: "w-5 h-5" },
  rounded: { type: String, default: "rounded-full" },
});

const PALETTE = [
  { bg: "bg-ui-accent-soft", text: "text-ui-accent" },
  { bg: "bg-ui-info-soft", text: "text-ui-info" },
  { bg: "bg-ui-ok-soft", text: "text-ui-ok" },
  { bg: "bg-ui-warn-soft", text: "text-ui-warn" },
  { bg: "bg-ui-subtle", text: "text-ui-text" },
];

const initials = computed(() => {
  const raw = props.alt?.trim();
  if (!raw) return "";

  // Degrees/titles are conventionally appended after a comma in this app's
  // data (e.g. "Rizky AK, S.Kom." -> only "Rizky AK" counts).
  const namePart = raw.split(",")[0].trim();
  if (!namePart) return "";

  const words = namePart.split(/\s+/).filter(Boolean);

  // First and last word only, so long names stay two letters ("RK").
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return picked
    .map((word) => word[0])
    .join("")
    .toUpperCase();
});

const colors = computed(() => {
  const name = props.alt?.trim();
  if (!name) return PALETTE[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return PALETTE[Math.abs(hash) % PALETTE.length];
});

const initialsFontSize = computed(() => {
  const arbitrary = props.size.match(/w-\[(\d+)px\]/);
  if (arbitrary) {
    return `${Math.max(Number(arbitrary[1]) * 0.36, 10)}px`;
  }

  const scale = props.size.match(/w-(\d+(?:\.\d+)?)/);
  const units = scale ? Number(scale[1]) : 12;
  const px = units * 4;

  return `${Math.max(px * 0.36, 10)}px`;
});
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="alt"
    :title="alt"
    :class="[size, rounded, 'object-cover shrink-0']"
  />
  <div
    v-else-if="initials"
    :title="alt"
    :class="[size, rounded, colors.bg, colors.text, 'flex items-center justify-center shrink-0 font-semibold select-none']"
  >
    <span class="leading-none" :style="{ fontSize: initialsFontSize }">{{ initials }}</span>
  </div>
  <div
    v-else
    :title="alt"
    :class="[size, rounded, 'bg-ui-subtle flex items-center justify-center shrink-0']"
  >
    <User :class="[iconSize, 'text-ui-faint']" />
  </div>
</template>
