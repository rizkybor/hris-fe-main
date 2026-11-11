<template>
  <Transition name="ui-fade">
    <div
      v-if="visible"
      class="mb-6 flex items-start gap-3 rounded-ui-card border px-4 py-3"
      :class="type === 'danger' ? 'bg-ui-bad-soft border-ui-bad/25' : 'bg-ui-ok-soft border-ui-ok/25'"
      :role="type === 'danger' ? 'alert' : 'status'"
    >
      <component :is="type === 'danger' ? XCircle : CheckCircle2" class="w-5 h-5 shrink-0 mt-px" :class="type === 'danger' ? 'text-ui-bad' : 'text-ui-ok'" />
      <div class="flex-1 min-w-0">
        <p v-if="title" class="text-ui-h3 text-ui-ink">{{ title }}</p>
        <p v-if="message" class="text-ui-small text-ui-text mt-0.5">{{ message }}</p>
      </div>
      <button @click="close" type="button" :aria-label="$t('common.a11y.close')" class="w-7 h-7 -mr-1 -mt-0.5 rounded-md flex items-center justify-center text-ui-muted hover:text-ui-ink hover:bg-black/5">
        <X class="w-4 h-4" />
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import { CheckCircle2, X, XCircle } from "lucide-vue-next";

const props = defineProps({
  type: { type: String, default: "success" }, // success | danger
  title: { type: String, default: "" },
  message: { type: String, default: "" },
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

</script>
