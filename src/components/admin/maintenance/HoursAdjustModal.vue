<script setup>
import { ref, watch } from "vue";
import { UiModal, UiButton } from "@/components/ui";
import { formatHours } from "@/utils/maintenance";

// Add (+) or subtract (-) hours with a reason: a month's quota or the
// development balance.
const props = defineProps({
  show: Boolean,
  loading: Boolean,
  title: { type: String, default: "Adjust hours" },
  description: { type: String, default: "" },
  // For the balance: deductions can't exceed it.
  maxDeduct: { type: Number, default: null },
  errors: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["submit", "close"]);

const direction = ref("add");
const hours = ref(1);
const reason = ref("");
watch(
  () => props.show,
  (open) => {
    if (open) {
      direction.value = "add";
      hours.value = 1;
      reason.value = "";
    }
  }
);

const submit = () => emit("submit", { hours: (direction.value === "add" ? 1 : -1) * Number(hours.value), reason: reason.value });
const err = (field) => props.errors?.[field]?.[0];

// Presentation only: token classes for the native fields.
const LABEL = "block text-ui-small font-medium text-ui-ink mb-1.5";
const FIELD =
  "w-full min-h-[38px] px-3 py-2 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control transition-shadow focus:outline-none focus:border-ui-accent focus:shadow-ui-focus disabled:bg-ui-subtle disabled:text-ui-muted";
const ERR = "text-ui-cap text-ui-bad mt-1.5";
const HINT = "text-ui-cap text-ui-muted mt-1.5";

</script>

<template>
  <UiModal :open="show" size="sm" :title="title" :description="description" :z-index="110" @close="emit('close')">
    <form id="maintenance-hours-form" class="space-y-4" @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-1 p-1 bg-ui-subtle rounded-ui-control" role="radiogroup">
        <button
          type="button"
          role="radio"
          :aria-checked="direction === 'add'"
          class="ui-press h-8 rounded-[6px] text-ui-small font-medium"
          :class="direction === 'add' ? 'bg-ui-surface text-ui-ok shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
          @click="direction = 'add'"
        >+ Add hours</button>
        <button
          type="button"
          role="radio"
          :aria-checked="direction === 'sub'"
          class="ui-press h-8 rounded-[6px] text-ui-small font-medium"
          :class="direction === 'sub' ? 'bg-ui-surface text-ui-bad shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
          @click="direction = 'sub'"
        >− Subtract hours</button>
      </div>
      <div>
        <label for="ha-hours" :class="LABEL">Hours<span class="text-ui-bad"> *</span></label>
        <input id="ha-hours" v-model="hours" type="number" min="0.1" step="any" :class="[FIELD, 'tabular-nums']" required />
        <p v-if="direction === 'sub' && maxDeduct !== null" :class="HINT">Available: {{ formatHours(maxDeduct) }}</p>
        <p v-if="err('hours')" :class="ERR">{{ err("hours") }}</p>
      </div>
      <div>
        <label for="ha-reason" :class="LABEL">Reason<span class="text-ui-bad"> *</span></label>
        <input id="ha-reason" v-model="reason" :class="FIELD" maxlength="500" placeholder="e.g. Extra package purchased, correction..." required />
        <p v-if="err('reason')" :class="ERR">{{ err("reason") }}</p>
      </div>
    </form>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">Cancel</UiButton>
      <UiButton type="submit" form="maintenance-hours-form" :loading="loading">Save</UiButton>
    </template>
  </UiModal>
</template>
