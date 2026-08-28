<template>
  <div
    v-if="visible"
    class="rounded-[8px] p-4 mb-6 flex items-center gap-3"
    :class="bgClass"
    :style="{ border: `1px solid ${borderColor}` }"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="iconColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <template v-if="type === 'danger'">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </template>
      <template v-else>
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 11 14 15 10" />
      </template>
    </svg>
    <div class="flex-1">
      <h4
        :style="{
          color: textColor,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: '14px',
          fontWeight: 600,
          margin: 0,
        }"
      >
        {{ title }}
      </h4>
      <p
        :style="{
          color: textColor,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: '14px',
          fontWeight: 400,
          margin: 0,
        }"
      >
        {{ message }}
      </p>
    </div>
    <button
      @click="close"
      class="ml-2 p-1 rounded hover:bg-black/10 transition"
      aria-label="Close"
      type="button"
      :style="{ color: iconColor }"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        :stroke="iconColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="5" y1="5" x2="15" y2="15" />
        <line x1="15" y1="5" x2="5" y2="15" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  type: { type: String, default: "success" }, // success | danger
  title: { type: String, required: true },
  message: { type: String, required: true },
  show: { type: Boolean, default: true },
  autoClose: { type: Boolean, default: true },
  duration: { type: Number, default: 4000 },
});

const emit = defineEmits(["close"]);

const visible = ref(props.show);
let autoCloseTimer = null;

const clearAutoCloseTimer = () => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
};

const startAutoCloseTimer = () => {
  clearAutoCloseTimer();
  if (props.autoClose) {
    autoCloseTimer = setTimeout(close, props.duration);
  }
};

const close = () => {
  clearAutoCloseTimer();
  visible.value = false;
  emit("close");
};

watch(
  () => props.show,
  (val) => {
    visible.value = val;
    if (val) {
      startAutoCloseTimer();
    } else {
      clearAutoCloseTimer();
    }
  },
  { immediate: true }
);

onBeforeUnmount(clearAutoCloseTimer);

const bgClass = computed(() =>
  props.type === "danger" ? "bg-red-100" : "bg-green-100"
);

const borderColor = computed(() =>
  props.type === "danger" ? "#f87171" : "#4ade80"
);

const iconColor = computed(() =>
  props.type === "danger" ? "#DC2626" : "#16A34A"
);

const textColor = computed(() =>
  props.type === "danger" ? "#DC2626" : "#16A34A"
);
</script>
