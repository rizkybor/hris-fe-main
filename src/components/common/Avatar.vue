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

// Consistent color per person -- same name always lands on the same swatch,
// so a given teammate reads as "the same person" across the app even
// without a photo.
const PALETTE = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-red-100", text: "text-red-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
];

const initials = computed(() => {
  const name = props.alt?.trim();
  if (!name) return "";

  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";

  return (first + last).toUpperCase();
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

// Tailwind's default spacing scale is linear (n * 0.25rem), so the "w-N"
// class in `size` is enough to derive a proportional font size for the
// initials -- keeps them readable whether the avatar is w-8 or w-32.
const initialsFontSize = computed(() => {
  const arbitrary = props.size.match(/w-\[(\d+)px\]/);
  if (arbitrary) {
    return `${Math.max(Number(arbitrary[1]) * 0.4, 10)}px`;
  }

  const scale = props.size.match(/w-(\d+(?:\.\d+)?)/);
  const units = scale ? Number(scale[1]) : 12;
  const px = units * 4;

  return `${Math.max(px * 0.4, 10)}px`;
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
    :class="[size, rounded, colors.bg, colors.text, 'flex items-center justify-center shrink-0 font-bold select-none']"
  >
    <span class="leading-none" :style="{ fontSize: initialsFontSize }">{{ initials }}</span>
  </div>
  <div
    v-else
    :title="alt"
    :class="[size, rounded, 'bg-gray-100 flex items-center justify-center shrink-0']"
  >
    <User :class="[iconSize, 'text-gray-400']" />
  </div>
</template>
