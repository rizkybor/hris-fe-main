<script setup>
import { Check, ChevronRight, Lightbulb, Users, Zap } from "lucide-vue-next";

defineEmits(["browse-employees"]);

// Static copy for the tips card.
const tips = [
  {
    title: "Choose a Clear Name",
    text: "Pick a descriptive name that reflects the team's purpose and function.",
  },
  {
    title: "Select Right Lead",
    text: "Choose someone with leadership experience and domain expertise.",
  },
  {
    title: "Define Clear Goals",
    text: "Write a clear description of what the team will achieve.",
  },
  {
    title: "Plan for Growth",
    text: "Consider how the team will scale and evolve over time.",
  },
];
</script>

<template>
  <!-- Right Sidebar -->
  <div class="hidden md:block space-y-4 sm:space-y-5 lg:sticky lg:top-5">
    <!-- Tips Section -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
      <div class="flex items-start gap-3 mb-4">
        <Lightbulb class="w-4 h-4 text-ui-faint mt-0.5 shrink-0" />
        <div>
          <h3 class="text-ui-h3 text-ui-ink">Team Creation Tips</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">
            Best practices for setting up teams
          </p>
        </div>
      </div>

      <ul class="space-y-3.5">
        <li v-for="tip in tips" :key="tip.title" class="flex items-start gap-2.5">
          <span
            class="w-5 h-5 shrink-0 mt-px rounded-full bg-ui-ok-soft text-ui-ok flex items-center justify-center"
          >
            <Check class="w-3 h-3" />
          </span>
          <div class="min-w-0">
            <p class="text-ui-small font-medium text-ui-ink">{{ tip.title }}</p>
            <p class="text-ui-cap text-ui-muted mt-0.5">{{ tip.text }}</p>
          </div>
        </li>
      </ul>
    </section>

    <!-- Quick Actions Section -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
      <div class="flex items-start gap-3 mb-4">
        <Zap class="w-4 h-4 text-ui-faint mt-0.5 shrink-0" />
        <div>
          <h3 class="text-ui-h3 text-ui-ink">Quick Actions</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">Common team setup tasks</p>
        </div>
      </div>

      <button
        type="button"
        @click="$emit('browse-employees')"
        class="ui-press w-full border border-ui-line rounded-ui-control hover:bg-ui-hover hover:border-ui-line-strong transition-colors px-3.5 py-2.5 flex items-center gap-3 text-left focus:outline-none focus-visible:shadow-ui-focus"
      >
        <Users class="w-4 h-4 text-ui-muted shrink-0" />
        <div class="flex-1 min-w-0">
          <h4 class="text-ui-small font-medium text-ui-ink">Browse Employees</h4>
          <p class="text-ui-cap text-ui-muted">Find potential team members</p>
        </div>
        <ChevronRight class="w-4 h-4 text-ui-faint shrink-0" />
      </button>
    </section>
  </div>
</template>
